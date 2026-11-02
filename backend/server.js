const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const { GoogleGenAI } = require("@google/genai");

const { Builder, By } = require("selenium-webdriver");

const chrome = require("selenium-webdriver/chrome");
const cheerio = require("cheerio");

const app = express();

const { authenticateUser } = require("./middleware/auth");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");
const memoryBoxRouter = require("./routes/memoryBox");
const { setupTables } = require("./db/setup");
const { askAI } = require("./services/aiManager");

app.use(cors());
app.use(express.json());
app.use(authenticateUser);

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/memory-box", memoryBoxRouter);

app.post("/api/products/click", async (req, res) => {
  try {
    const { productName } = req.body;
    if (productName) {
      await pool.query(
        "UPDATE product_recommendation_stats SET clicks = clicks + 1 WHERE product_name = ? ORDER BY id DESC LIMIT 1",
        [productName]
      );
    }
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false });
  }
});

const PORT = process.env.PORT || 5000;

// =====================================================
// CONFIG
// =====================================================

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const SCRAPE_TIMEOUT = Number(process.env.SCRAPE_TIMEOUT) || 10000;

const CACHE_MINUTES = Number(process.env.CACHE_MINUTES) || 60;

const MAX_PRODUCTS_PER_PLATFORM =
  Number(process.env.MAX_PRODUCTS_PER_PLATFORM) || 5;

const MAX_PRODUCTS_FOR_AI = Number(process.env.MAX_PRODUCTS_FOR_AI) || 18;

const MAX_RECOMMENDATIONS = Number(process.env.MAX_RECOMMENDATIONS) || 8;

// Chỉ mở 1 Chrome tại một thời điểm
const MAX_SCRAPE_CONCURRENCY = 1;

// =====================================================
// GEMINI
// =====================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let gemini = null;

if (GEMINI_API_KEY) {
  gemini = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  console.log("Gemini AI: enabled");
} else {
  console.warn("Gemini AI: disabled - GEMINI_API_KEY is missing");
}

// =====================================================
// MYSQL
// =====================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "giftfinder",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// =====================================================
// UTILITY
// =====================================================

function normalizeKeyword(value) {
  return String(value || "")
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeUrl(value) {
  if (!value) {
    return "";
  }

  let url = String(value).trim();

  if (url.startsWith("//")) {
    url = `https:${url}`;
  }

  if (url.startsWith("/")) {
    url = `https://www.lazada.vn${url}`;
  }

  return url;
}

function normalizeImageUrl(value) {
  if (!value) {
    return "";
  }

  let image = String(value).trim();

  // Loại bỏ base64 placeholder của Lazada lazy load
  if (image.startsWith("data:")) {
    return "";
  }

  if (image.startsWith("//")) {
    image = `https:${image}`;
  }

  if (image.startsWith("/")) {
    image = `https://www.lazada.vn${image}`;
  }

  if (image.includes("placeholder") || image.includes("default-product")) {
    return "";
  }

  // Khắc phục lỗi thiếu đuôi mở rộng khi Lazada resize ảnh (ví dụ: _200x200q80)
  if (image.match(/_[0-9]+x[0-9]+q[0-9]+$/i)) {
    image = `${image}.jpg`;
  }

  return image;
}


function createStableId(platform, url, name) {
  const source = `${platform}|${url || ""}|${name || ""}`;

  return crypto.createHash("sha1").update(source).digest("hex");
}

function createProductKey(product) {
  const platform = normalizeKeyword(product.platform || "unknown");

  const url = normalizeUrl(product.url || "");

  const name = normalizeKeyword(product.name || "");

  if (url) {
    return `${platform}|${url}`;
  }

  return `${platform}|${name}`;
}

// =====================================================
// PRODUCT NORMALIZATION
// =====================================================

function normalizeProduct(product = {}) {
  const platform = product.platform || product.source || "Unknown";

  const name = String(product.name || "Sản phẩm").normalize("NFC").trim();

  let price = product.price;

  if (typeof price === "string") {
    const trimmedPrice = price.trim();
    // Xử lý chuỗi decimal từ MySQL dạng "50000.00"
    if (/^\d+\.\d+$/.test(trimmedPrice)) {
      price = parseFloat(trimmedPrice);
    } else {
      price = parsePrice(trimmedPrice);
    }
  }

  if (typeof price !== "number" || Number.isNaN(price) || price <= 0) {
    price = null;
  } else {
    price = Math.round(price);
  }

  let score = Number(product.score);

  if (Number.isNaN(score) || score < 0) {
    score = 0;
  }

  if (score > 100) {
    score = 100;
  }

  return {
    id: String(product.id || createStableId(platform, product.url, name)),

    name,

    price,

    currency: product.currency || "VND",

    image: normalizeImageUrl(product.image || ""),

    url: normalizeUrl(product.url || ""),

    condition: product.condition || product.condition_name || "New",

    shipping: product.shipping || "",

    shippingCurrency:
      product.shippingCurrency || product.shipping_currency || "VND",

    location: product.location || "Vietnam",

    category: product.category || "Product",

    score,

    reason: product.reason || "",

    platform,

    source: product.source || platform,
  };
}

// =====================================================
// DATABASE
// =====================================================

async function initDatabase() {
  const connection = await pool.getConnection();

  try {
    await connection.query(`
            CREATE TABLE IF NOT EXISTS scraped_products (
                id INT AUTO_INCREMENT PRIMARY KEY,

                product_key VARCHAR(500)
                    NOT NULL UNIQUE,

                platform VARCHAR(100)
                    NOT NULL,

                name VARCHAR(1000)
                    NOT NULL,

                price DECIMAL(15,2)
                    NULL,

                currency VARCHAR(20)
                    DEFAULT 'VND',

                image TEXT
                    NULL,

                url TEXT
                    NULL,

                condition_name VARCHAR(255)
                    DEFAULT 'New',

                category VARCHAR(255)
                    DEFAULT 'Product',

                location VARCHAR(255)
                    DEFAULT 'Vietnam',

                search_keyword VARCHAR(500)
                    NOT NULL,

                score DECIMAL(5,2)
                    DEFAULT 0,

                reason TEXT
                    NULL,

                created_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP,

                updated_at TIMESTAMP
                    DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

                INDEX idx_search_keyword(search_keyword),
                INDEX idx_platform(platform),
                INDEX idx_updated_at(updated_at)
            )
        `);

    await setupTables();

    console.log("MySQL database initialized successfully.");
  } finally {
    connection.release();
  }
}

// =====================================================
// GET CACHE
// =====================================================

async function getCachedProducts(keyword) {
  const normalized = normalizeKeyword(keyword);

  if (!normalized) {
    return [];
  }

  try {
    const [rows] = await pool.query(
      `
                SELECT
                    id,
                    platform,
                    name,
                    price,
                    currency,
                    image,
                    url,
                    condition_name,
                    category,
                    location,
                    search_keyword,
                    created_at,
                    updated_at
                FROM scraped_products
                WHERE search_keyword = ?
                ORDER BY updated_at DESC
                LIMIT 30
                `,
      [normalized],
    );

    if (rows.length > 0) {
      console.log(`Cache hit: "${normalized}" -> ${rows.length} products`);
    } else {
      console.log(`Cache miss: "${normalized}"`);
    }

    return rows.map((row) =>
      normalizeProduct({
        id: row.id,
        platform: row.platform,
        name: row.name,
        price: row.price,
        currency: row.currency,
        image: row.image,
        url: row.url,
        condition: row.condition_name,
        category: row.category,
        location: row.location,
        score: 0,
        reason: "",
      }),
    );
  } catch (error) {
    console.error("MySQL cache read error:", error.message);

    return [];
  }
}

// =====================================================
// GET RELATED CACHED PRODUCTS (FUZZY SEARCH THEO MÓN NHỎ NHẤT)
// =====================================================

const GENERIC_GIFT_STOPWORDS = new Set([
  "quà",
  "quà tặng",
  "món quà",
  "tặng",
  "tặng quà",
  "dịp",
  "nhân dịp",
  "cho",
  "tìm",
  "tìm quà",
  "mua",
  "mua quà",
  "gợi ý",
  "sản phẩm",
  "đồ",
  "món đồ",
  "nhỏ xinh",
  "cute",
  "ý nghĩa",
  "thiết thực",
  "cao cấp",
  "sang trọng",
  "chính hãng",
  "hộp quà",
  "set quà",
]);

function isGenericStopword(term) {
  const norm = normalizeKeyword(term);
  return !norm || norm.length < 2 || GENERIC_GIFT_STOPWORDS.has(norm);
}

// =====================================================
// BỘ PHÂN LOẠI & KIỂM ĐỊNH SẢN PHẨM THEO TÊN THẬT (ĐÚNG QUÀ)
// =====================================================

function classifyGiftProductByTitle(name, price = null) {
  const n = normalizeKeyword(name);
  if (!n || n.length < 4) {
    return { valid: false, reason: "empty_name" };
  }

  const isHalloweenItem =
    n.includes("halloween") ||
    n.includes("bí ngô") ||
    n.includes("hóa trang") ||
    n.includes("ma cà rồng") ||
    n.includes("phù thủy") ||
    n.includes("đầu lâu") ||
    (n.includes("bí ") && (n.includes("đèn") || n.includes("treo") || n.includes("cầm tay")));
  const priceNum = Number(price);
  const minPriceAllowed = isHalloweenItem ? 15000 : 35000;
  if (price !== null && (!Number.isFinite(priceNum) || priceNum < minPriceAllowed)) {
    return { valid: false, reason: "price_too_low" };
  }

  // 1. Chặn hoàn toàn hàng tạp hóa, khử mùi, phụ kiện lẻ, vỏ hộp rỗng, văn phòng phẩm học sinh lô sỉ
  const JUNK_OR_NONGIFT_PATTERNS = [
    "sáp thơm phòng",
    "pure aroma",
    "sáp thơm hando",
    "sáp thơm wiachnn",
    "lọ sáp thơm",
    "sáp khử mùi",
    "khử mùi",
    "xịt phòng",
    "túi thơm",
    "long não",
    "đuổi muỗi",
    "nước giặt",
    "bột giặt",
    "nước xả",
    "lau sàn",
    "rửa chén",
    "giấy vệ sinh",
    "khăn giấy",
    "băng vệ sinh",
    "tã bỉm",
    "đầy tháng",
    "sơ sinh",
    "cho bé",
    "trẻ em",
    "cọ môi",
    "túi giấy",
    "vỏ hộp",
    "hộp rỗng",
    "hộp không",
    "hộp đựng quà",
    "túi đựng quà",
    "dây thay thế",
    "ngòi bút",
    "ruột sổ",
    "ốp lưng",
    "miếng dán",
    "cường lực",
    "cáp sạc",
    "củ sạc",
    "combo 20 bút",
    "combo 10 bút",
    "bút lông bảng",
    "bút xóa",
    "vở học sinh",
    "máy tính khoa học",
    "thức ăn cho",
    "hạt cho chó",
    "hạt cho mèo",
    "cát vệ sinh",
    "quần lót",
    "đồ lót",
    "sịp",
    "vớ ngón",
    "thuốc trừ",
    "phân bón",
    "ốc vít",
    "mũi khoan",
    "cờ lê",
    "tua vít",
    "băng keo",
    "đèn chùm",
    "hoa thơm kiêu hãnh",
    "đi biển",
    "trinh thám",
    "tiểu thuyết",
    "mặt nạ dưỡng da",
    "mặt nạ đất sét",
    "mặt nạ giấy",
    "mặt nạ ngủ",
    "dragon ball",
    "ngọc rồng",
    "làn da",
    "trẻ hóa",
    "nâng cơ",
  ];

  for (const pat of JUNK_OR_NONGIFT_PATTERNS) {
    if (isHalloweenItem && (pat === "cho bé" || pat === "trẻ em")) continue;
    if (n.includes(pat)) {
      return { valid: false, reason: `junk:${pat}` };
    }
  }

  // 2. Nhóm Đèn ngủ / Đèn bàn / Đèn LED -> tách riêng vào 'Đèn Decor & Gaming'
  if (
    n.includes("đèn ngủ") ||
    n.includes("đèn bàn") ||
    n.includes("đèn học") ||
    n.includes("đèn led") ||
    n.includes("thanh đèn") ||
    n.includes("bóng đèn") ||
    n.includes("đèn kẹp") ||
    n.includes("đèn đọc sách") ||
    n.includes("đèn trang trí") ||
    n.includes("đèn decor") ||
    n.includes("đèn neon") ||
    n.includes("đèn lồng") ||
    n.includes("nến điện tử") ||
    n.includes("đèn pixar") ||
    n.includes("đèn tre")
  ) {
    return {
      valid: true,
      category: "Đèn Decor & Gaming",
      tags: "đèn ngủ đèn bàn đèn led decor",
    };
  }

  // 3. Nhóm Gaming / Mô hình / Blindbox
  if (
    n.includes("minecraft") ||
    n.includes("blindbox") ||
    n.includes("blind box") ||
    n.includes("pop mart") ||
    n.includes("genshin") ||
    n.includes("honkai") ||
    n.includes("mô hình") ||
    n.includes("standee") ||
    n.includes("máy chơi game") ||
    n.includes("tay cầm chơi game") ||
    n.includes("chuột gaming") ||
    n.includes("chuột không dây gaming") ||
    n.includes("bàn phím cơ") ||
    n.includes("bàn phím gaming") ||
    n.includes("tai nghe gaming") ||
    n.includes("lót chuột")
  ) {
    return {
      valid: true,
      category: "Gaming & Công Nghệ",
      tags: "gaming công nghệ bàn phím cơ chuột gaming tay cầm chơi game mô hình",
    };
  }

  // 4. Quà Sức Khỏe Cao Cấp & Gia Đình (Yến sào, Hồng sâm, Máy massage, Bồn ngâm chân, Máy đo huyết áp)
  if (
    n.includes("yến sào") ||
    n.includes("yến chưng") ||
    n.includes("tổ yến") ||
    n.includes("hồng sâm") ||
    n.includes("nhân sâm") ||
    n.includes("đông trùng hạ thảo") ||
    n.includes("linh chi") ||
    n.includes("bổ khí")
  ) {
    return {
      valid: true,
      category: "Quà Sức Khỏe Cao Cấp",
      tags: "yến sào hồng sâm nhân sâm sức khỏe biếu bố mẹ ông bà sếp tết 20/10 8/3",
    };
  }

  if (
    n.includes("máy massage") ||
    n.includes("gối massage") ||
    n.includes("đai massage") ||
    n.includes("đai mát xa") ||
    n.includes("mát xa cổ") ||
    n.includes("massage cổ") ||
    n.includes("bồn ngâm chân") ||
    n.includes("chậu ngâm chân") ||
    n.includes("máy đo huyết áp") ||
    n.includes("súng massage")
  ) {
    return {
      valid: true,
      category: "Sức Khỏe & Gia Đình",
      tags: "máy massage cổ vai gáy bồn ngâm chân máy đo huyết áp sức khỏe bố mẹ ông bà gia đình",
    };
  }

  if (n.includes("túi chườm") || n.includes("đai chườm") || n.includes("sưởi ấm bụng")) {
    return {
      valid: true,
      category: "Chăm Sóc Sức Khỏe",
      tags: "túi chườm ấm bụng bạn gái người yêu nữ chăm sóc sức khỏe",
    };
  }

  // 5. Hoa, Quà Tốt Nghiệp, Socola Valentine
  if (
    n.includes("tốt nghiệp") ||
    n.includes("cử nhân") ||
    (n.includes("hướng dương") && (n.includes("hoa") || n.includes("bó")))
  ) {
    return {
      valid: true,
      category: "Quà Tốt Nghiệp",
      tags: "hoa hướng dương gấu cử nhân quà tốt nghiệp ra trường bạn bè",
    };
  }

  if (n.includes("socola") || n.includes("chocolate")) {
    return {
      valid: true,
      category: "Quà Valentine & Kỷ Niệm",
      tags: "socola valentine 14/2 quà tặng bạn gái bạn trai người yêu kỷ niệm",
    };
  }

  if (
    n.includes("hoa hồng sáp") ||
    n.includes("hoa sáp") ||
    n.includes("bó hoa") ||
    n.includes("hoa hồng mạ vàng") ||
    n.includes("hoa hồng dát vàng") ||
    n.includes("hộp hoa") ||
    n.includes("hoa len") ||
    n.includes("hoa lụa") ||
    n.includes("hoa khô")
  ) {
    return {
      valid: true,
      category: "Hoa & Quà Lãng Mạn",
      tags: "hoa hồng sáp bó hoa hộp quà lãng mạn bạn gái người yêu vợ 20/10 8/3 valentine sinh nhật kỷ niệm",
    };
  }

  // 6. Nến thơm & Tinh dầu thư giãn
  if (
    n.includes("nến thơm") ||
    n.includes("tinh dầu") ||
    n.includes("máy xông") ||
    n.includes("khuếch tán")
  ) {
    return {
      valid: true,
      category: "Nến Thơm & Thư Giãn",
      tags: "nến thơm tinh dầu thư giãn quà tặng bạn gái người yêu nữ 20/10 8/3 sinh nhật tân gia",
    };
  }

  // 7. Gấu bông & Thú nhồi bông
  if (
    n.includes("gấu bông") ||
    n.includes("thú nhồi bông") ||
    n.includes("thú bông") ||
    n.includes("capybara") ||
    n.includes("gối ôm")
  ) {
    return {
      valid: true,
      category: "Gấu Bông & Quà Cute",
      tags: "gấu bông thú nhồi bông capybara quà tặng bạn gái người yêu sinh nhật valentine 20/10 8/3",
    };
  }

  // 8. Nước hoa (Nam vs Nữ)
  if (n.includes("nước hoa")) {
    if (
      n.includes("nam") ||
      n.includes("men") ||
      n.includes("bạn trai") ||
      n.includes("phái mạnh") ||
      n.includes("auvage") ||
      n.includes("gentleman")
    ) {
      return {
        valid: true,
        category: "Nước Hoa Nam",
        tags: "nước hoa nam lịch lãm bạn trai chồng nam giới sinh nhật kỷ niệm",
      };
    }
    return {
      valid: true,
      category: "Nước Hoa & Làm Đẹp",
      tags: "nước hoa nữ thơm lâu bạn gái người yêu vợ 20/10 8/3 valentine sinh nhật",
    };
  }

  // 9. Mỹ phẩm & Làm đẹp
  if (
    n.includes("son môi") ||
    n.includes("son kem") ||
    n.includes("son lì") ||
    n.includes("son thỏi") ||
    n.includes("son dưỡng") ||
    n.includes("son bóng") ||
    n.includes("son tint") ||
    n.includes("bộ son") ||
    n.includes("set son") ||
    n.includes("lipstick") ||
    n.includes("phấn mắt") ||
    n.includes("phấn nước") ||
    n.includes("cushion") ||
    n.includes("trang điểm") ||
    n.includes("makeup") ||
    n.includes("máy rửa mặt") ||
    n.includes("máy sấy tóc") ||
    n.includes("kem dưỡng") ||
    n.includes("dưỡng da") ||
    n.includes("skincare") ||
    n.includes("mặt nạ") ||
    n.includes("serum") ||
    n.includes("sữa tắm") ||
    n.includes("gel tắm")
  ) {
    return {
      valid: true,
      category: "Mỹ Phẩm & Làm Đẹp",
      tags: "son môi mỹ phẩm làm đẹp dưỡng da quà tặng bạn gái người yêu vợ nữ 20/10 8/3 valentine sinh nhật",
    };
  }

  // 10. Thời trang & Quà tặng Mẹ / Trung niên
  if (
    n.includes("cài áo") ||
    (n.includes("khăn lụa") &&
      (n.includes("mẹ") ||
        n.includes("trung niên") ||
        n.includes("bà") ||
        n.includes("quàng cổ") ||
        n.includes("choàng cổ"))) ||
    (n.includes("túi xách") && (n.includes("mẹ") || n.includes("trung niên")))
  ) {
    return {
      valid: true,
      category: "Thời Trang & Quà Mẹ",
      tags: "khăn choàng lụa cài áo túi xách tặng mẹ trung niên cô giáo 20/10 8/3 20/11 sinh nhật",
    };
  }

  // 11. Trang sức & Phụ kiện Nữ
  if (
    n.includes("dây chuyền") ||
    n.includes("vòng cổ") ||
    n.includes("lắc tay") ||
    n.includes("lắc chân") ||
    n.includes("vòng tay") ||
    n.includes("bông tai") ||
    n.includes("hoa tai") ||
    n.includes("khuyên tai") ||
    n.includes("nhẫn") ||
    n.includes("trang sức") ||
    n.includes("kẹp tóc") ||
    n.includes("cài tóc") ||
    n.includes("bờm tóc") ||
    (n.includes("đồng hồ") && n.includes("nữ") && !n.includes("nam"))
  ) {
    return {
      valid: true,
      category: "Trang Sức & Phụ Kiện Nữ",
      tags: "dây chuyền bạc lắc tay bông tai nhẫn trang sức nữ đồng hồ nữ bạn gái người yêu vợ 20/10 8/3 valentine sinh nhật",
    };
  }

  // 12. Túi xách & Ví nữ
  if (
    (n.includes("túi xách") ||
      n.includes("túi đeo chéo") ||
      n.includes("ví nữ") ||
      n.includes("ví cầm tay nữ") ||
      n.includes("ví dài cầm tay nữ")) &&
    !n.includes("nam")
  ) {
    return {
      valid: true,
      category: "Thời Trang Nữ",
      tags: "túi xách nữ ví nữ thời trang nữ quà tặng bạn gái vợ 20/10 8/3 sinh nhật",
    };
  }

  // 13. Quà tặng Nam giới (Phụ kiện, Đồng hồ, Cạo râu, Áo Polo)
  if (n.includes("cạo râu") || n.includes("tông đơ")) {
    return {
      valid: true,
      category: "Chăm Sóc Nam Giới",
      tags: "máy cạo râu chăm sóc nam giới bạn trai chồng bố sinh nhật",
    };
  }

  if (
    n.includes("đồng hồ nam") ||
    n.includes("đồng hồ đeo tay nam") ||
    n.includes("kính mát nam") ||
    n.includes("kính râm nam")
  ) {
    return {
      valid: true,
      category: "Đồng Hồ & Phụ Kiện Nam",
      tags: "đồng hồ nam kính mát nam lịch lãm bạn trai chồng nam giới sinh nhật kỷ niệm",
    };
  }

  if (
    n.includes("ví da") ||
    n.includes("ví nam") ||
    n.includes("bóp da") ||
    n.includes("bóp nam") ||
    n.includes("thắt lưng") ||
    n.includes("dây nịt") ||
    n.includes("cà vạt")
  ) {
    return {
      valid: true,
      category: "Phụ Kiện Nam",
      tags: "ví da nam thắt lưng da cà vạt phụ kiện nam bạn trai chồng bố sếp sinh nhật",
    };
  }

  if (
    n.includes("áo polo") ||
    n.includes("áo sơ mi nam") ||
    (n.includes("áo sơ mi") && !n.includes("nữ"))
  ) {
    return {
      valid: true,
      category: "Thời Trang Nam",
      tags: "áo polo nam áo sơ mi nam thời trang nam bạn trai chồng bố sinh nhật",
    };
  }

  // 14. Công nghệ & Âm thanh
  if (
    n.includes("đồng hồ thông minh") ||
    n.includes("smartwatch") ||
    n.includes("vòng đeo tay thông minh")
  ) {
    return {
      valid: true,
      category: "Công Nghệ & Thể Thao",
      tags: "đồng hồ thông minh smartwatch công nghệ thể thao bạn trai bạn gái sinh nhật",
    };
  }

  if (
    n.includes("tai nghe") ||
    n.includes("loa bluetooth") ||
    n.includes("loa không dây") ||
    n.includes("loa mini")
  ) {
    return {
      valid: true,
      category: "Công Nghệ & Âm Thanh",
      tags: "tai nghe bluetooth loa bluetooth âm nhạc công nghệ bạn trai bạn gái sinh nhật",
    };
  }

  if (n.includes("sạc dự phòng") || n.includes("pin dự phòng")) {
    return {
      valid: true,
      category: "Công Nghệ & Phụ Kiện",
      tags: "sạc dự phòng công nghệ thiết thực bạn trai bạn bè sinh nhật",
    };
  }

  if (n.includes("máy ảnh") || n.includes("camera") || n.includes("instax")) {
    return {
      valid: true,
      category: "Công Nghệ & Nhiếp Ảnh",
      tags: "máy ảnh chụp lấy liền kỷ niệm du lịch bạn gái bạn trai sinh nhật",
    };
  }

  // 15. Quà Công sở, Thầy cô, Văn phòng
  if (
    n.includes("bút ký") ||
    n.includes("sổ tay") ||
    n.includes("cặp da") ||
    n.includes("cặp công sở")
  ) {
    return {
      valid: true,
      category: "Quà Công Sở & Tri Ân",
      tags: "bút ký cao cấp sổ tay bìa da cặp da công sở quà tặng thầy cô 20/11 sếp đồng nghiệp",
    };
  }

  if (
    n.includes("bình giữ nhiệt") ||
    n.includes("ly giữ nhiệt") ||
    n.includes("gối tựa lưng") ||
    n.includes("đệm ngồi")
  ) {
    return {
      valid: true,
      category: "Văn Phòng & Đời Sống",
      tags: "bình giữ nhiệt gối tựa lưng văn phòng quà tặng đồng nghiệp thầy cô 20/11 bạn bè",
    };
  }

  if (
    n.includes("cốc sứ") ||
    n.includes("ly sứ") ||
    n.includes("hâm nóng") ||
    n.includes("cà phê") ||
    n.includes("coffee") ||
    n.includes("pha cà phê")
  ) {
    return {
      valid: true,
      category: "Văn Phòng & Cafe",
      tags: "cốc sứ giữ nhiệt đế hâm nóng cà phê văn phòng bạn bè đồng nghiệp",
    };
  }

  // 16. Trà đạo & Tân gia
  if (n.includes("ấm chén") || n.includes("bộ trà") || n.includes("ấm pha trà")) {
    return {
      valid: true,
      category: "Gia Dụng & Trà Đạo",
      tags: "bộ ấm chén trà gốm sứ quà tặng bố ông sếp tân gia tết",
    };
  }

  if (n.includes("trà ") || n.startsWith("trà") || n.includes("hộp trà") || n.includes("set trà")) {
    return {
      valid: true,
      category: "Trà & Sức Khỏe",
      tags: "trà hoa thảo mộc trà ô long quà biếu bố mẹ ông bà thầy cô sếp tết",
    };
  }

  if (
    n.includes("bát đĩa") ||
    n.includes("chén dĩa") ||
    n.includes("bát sứ") ||
    n.includes("bình cốc thủy tinh") ||
    n.includes("bộ bình ly")
  ) {
    return {
      valid: true,
      category: "Quà Tân Gia & Gia Dụng",
      tags: "bộ bát đĩa gốm sứ bình cốc thủy tinh quà tân gia nhà mới gia đình",
    };
  }

  // 17. Sách, Thể thao, Lưu niệm
  if (
    n.includes("sách") ||
    n.includes("nhà giả kim") ||
    n.includes("đắc nhân tâm") ||
    n.includes("cây cam ngọt") ||
    n.includes("muôn kiếp nhân sinh")
  ) {
    return {
      valid: true,
      category: "Sách & Tri Thức",
      tags: "sách hay tri thức quà tặng bạn bè thầy cô sinh nhật",
    };
  }

  if (
    n.includes("yoga") ||
    n.includes("cầu lông") ||
    n.includes("tập gym") ||
    n.includes("thể thao")
  ) {
    return {
      valid: true,
      category: "Thể Thao & Sức Khỏe",
      tags: "thảm tập yoga vợt cầu lông túi thể thao tập gym sức khỏe",
    };
  }

  if (n.includes("balo")) {
    return {
      valid: true,
      category: "Thời Trang & Phụ Kiện",
      tags: "balo laptop thời trang bạn trai bạn bè tốt nghiệp sinh nhật",
    };
  }

  if (n.includes("quả cầu tuyết") || n.includes("giáng sinh") || n.includes("noel")) {
    return {
      valid: true,
      category: "Quà Giáng Sinh & Lưu Niệm",
      tags: "quả cầu tuyết giáng sinh noel lưu niệm",
    };
  }

  if (
    n.includes("halloween") ||
    n.includes("hóa trang") ||
    (n.includes("bí ngô") && !n.includes("hạt giống") && !n.includes("kế hoạch")) ||
    (n.includes("bí ") && (n.includes("đèn") || n.includes("treo") || n.includes("cầm tay"))) ||
    n.includes("ma cà rồng") ||
    n.includes("phù thủy") ||
    n.includes("đầu lâu") ||
    n.includes("nhện giả") ||
    n.includes("kẹo mút") ||
    n.includes("kẹo dẻo")
  ) {
    return {
      valid: true,
      category: "Quà Halloween & Hóa Trang",
      tags: "quà halloween bí ngô hóa trang mặt nạ áo choàng kẹo quà tặng độc lạ",
    };
  }

  if (n.includes("khăn len") || n.includes("khăn choàng") || n.includes("khăn quàng")) {
    return {
      valid: true,
      category: "Thời Trang & Quà Mẹ",
      tags: "khăn choàng cổ ấm áp tặng mẹ bạn gái cô giáo 20/10 8/3 giáng sinh",
    };
  }

  if (
    n.includes("khung ảnh") ||
    n.includes("khung hình") ||
    n.includes("album") ||
    n.includes("hộp nhạc")
  ) {
    return {
      valid: true,
      category: "Quà Lưu Niệm & Kỷ Niệm",
      tags: "khung ảnh kỷ niệm hộp nhạc quà lưu niệm sinh nhật tốt nghiệp",
    };
  }

  if (
    (n.includes("set quà") || n.includes("hộp quà") || n.includes("bộ quà")) &&
    (n.includes("20/10") ||
      n.includes("8/3") ||
      n.includes("bạn gái") ||
      n.includes("phụ nữ") ||
      n.includes("nữ"))
  ) {
    return {
      valid: true,
      category: "Quà 20/10 & 8/3",
      tags: "set quà 20/10 hộp quà 8/3 quà tặng bạn gái người yêu vợ phụ nữ",
    };
  }

  return { valid: false, reason: "unclassified_product" };
}

function matchesItemKeyword(text, item) {
  if (!text || !item) return false;
  const t = normalizeKeyword(text);
  const it = normalizeKeyword(item);
  if (t.includes(it)) return true;

  if (it === "son môi" || it === "son") {
    return (
      t.includes("son ") ||
      t.startsWith("son ") ||
      t.includes("lipstick") ||
      t.includes("lip balm") ||
      t.includes("lip tint") ||
      t.includes("lip glow") ||
      t.includes("lip oil") ||
      t.includes("son lì") ||
      t.includes("son kem") ||
      t.includes("son dưỡng")
    );
  }
  if (it === "nước hoa") {
    return (
      t.includes("nước hoa") ||
      t.includes("perfume") ||
      t.includes("eau de") ||
      t.includes("charme")
    );
  }
  if (it === "dây chuyền") {
    return (
      t.includes("dây chuyền") ||
      t.includes("vòng cổ") ||
      t.includes("necklace")
    );
  }
  if (it === "vòng tay" || it === "lắc tay") {
    return (
      t.includes("vòng tay") ||
      t.includes("lắc tay") ||
      t.includes("bracelet")
    );
  }
  if (it === "ví da" || it === "ví" || it === "bóp") {
    return (
      t.includes("ví da") ||
      t.includes("bóp da") ||
      t.includes("ví cầm tay") ||
      t.includes("bóp nam") ||
      t.includes("ví nam") ||
      t.includes("ví nữ")
    );
  }
  if (it === "đồng hồ") {
    return (
      t.includes("đồng hồ") ||
      t.includes("watch")
    );
  }
  if (it === "gấu bông") {
    return (
      t.includes("gấu bông") ||
      t.includes("thú nhồi bông") ||
      t.includes("thú bông") ||
      t.includes("capybara") ||
      t.includes("teddy")
    );
  }
  if (it === "bình giữ nhiệt" || it === "ly giữ nhiệt") {
    return (
      t.includes("bình giữ nhiệt") ||
      t.includes("ly giữ nhiệt") ||
      t.includes("cốc giữ nhiệt")
    );
  }
  if (it === "khăn choàng" || it === "khăn len") {
    return (
      t.includes("khăn lụa") ||
      t.includes("khăn choàng") ||
      t.includes("khăn quàng") ||
      t.includes("khăn len")
    );
  }
  if (it === "tai nghe") {
    return (
      t.includes("tai nghe") ||
      t.includes("earphone") ||
      t.includes("headphone")
    );
  }
  if (it.includes("đèn bí ngô") || it.includes("đèn phát sáng")) {
    return (
      t.includes("đèn") ||
      t.includes("bí treo") ||
      t.includes("cây phát sáng") ||
      t.includes("đèn cầy")
    );
  }
  if (it.includes("kẹo")) {
    return (
      t.includes("kẹo") ||
      t.includes("trolli") ||
      t.includes("marshmallow") ||
      t.includes("treat")
    );
  }
  if (it.includes("mặt nạ")) {
    return (
      t.includes("mặt nạ") ||
      t.includes("mask")
    );
  }
  if (it.includes("áo choàng")) {
    return (
      t.includes("áo choàng") ||
      t.includes("choàng") ||
      t.includes("cosplay")
    );
  }
  if (it.includes("cài tóc") || it.includes("bờm")) {
    return (
      t.includes("cài tóc") ||
      t.includes("bờm") ||
      t.includes("băng đô") ||
      t.includes("kẹp tóc")
    );
  }
  if (it.includes("cốc sứ") || it.includes("ly sứ")) {
    return (
      t.includes("cốc") ||
      t.includes("ly sứ") ||
      t.includes("ca sứ")
    );
  }
  return false;
}

// =====================================================
// BỘ KIỂM ĐỊNH 3 TRỤ CỘT: ĐÚNG QUÀ - ĐÚNG NGƯỜI - ĐÚNG DỊP
// =====================================================

function evaluateProductForGoals(row, goals = null, cleanItems = [], searchQueries = []) {
  if (!row || !row.name || !row.image || !String(row.image).startsWith("http")) {
    return { suitable: false, reason: "missing_image_or_name" };
  }

  const occasionCode = goals?.occasionCode || "";
  const isHalloween = occasionCode === "halloween";
  const priceNum = Number(row.price);
  const minPriceAllowed = isHalloween ? 15000 : 35000;
  if (!Number.isFinite(priceNum) || priceNum < minPriceAllowed) {
    return { suitable: false, reason: "invalid_price" };
  }

  // Trụ cột 1: ĐÚNG QUÀ (Kiểm định sản phẩm thật dựa trên tên sản phẩm)
  const classified = classifyGiftProductByTitle(row.name, priceNum);
  if (!classified.valid) {
    return { suitable: false, reason: classified.reason };
  }

  const effectiveCategory =
    row.category && row.category !== "Product" && row.category !== "Lazada Product"
      ? row.category
      : classified.category;

  const nameLower = normalizeKeyword(row.name);
  const kwLower = normalizeKeyword(row.search_keyword || classified.tags || "");
  const catLower = normalizeKeyword(effectiveCategory);

  const allowLampOrGaming = Boolean(goals?.allowLampOrGaming);
  if (!allowLampOrGaming && !isHalloween) {
    if (
      effectiveCategory === "Đèn Decor & Gaming" ||
      effectiveCategory === "Gaming & Công Nghệ" ||
      nameLower.includes("đèn ngủ") ||
      nameLower.includes("đèn bàn") ||
      nameLower.includes("đèn led") ||
      nameLower.includes("minecraft") ||
      nameLower.includes("mô hình") ||
      nameLower.includes("blindbox")
    ) {
      return { suitable: false, reason: "lamp_or_gaming_blocked" };
    }
  }

  // Kiểm tra danh sách từ cấm của mục tiêu
  const forbiddenTerms = Array.isArray(goals?.forbiddenTerms)
    ? goals.forbiddenTerms.map((t) => normalizeKeyword(t)).filter(Boolean)
    : [];
  for (const fTerm of forbiddenTerms) {
    if (nameLower.includes(fTerm)) {
      return { suitable: false, reason: `forbidden_term:${fTerm}` };
    }
  }

  // Trụ cột 2: ĐÚNG NGƯỜI (Cách ly nghiêm ngặt theo đối tượng nhận & giới tính)
  const recipientCode = goals?.recipientCode || "";
  const effectiveGender = goals?.effectiveGender || "";

  if (recipientCode === "female_partner" || recipientCode === "female_peer") {
    const blockedCatsForYoungFemale = new Set([
      "Phụ Kiện Nam",
      "Đồng Hồ & Phụ Kiện Nam",
      "Nước Hoa Nam",
      "Chăm Sóc Nam Giới",
      "Thời Trang Nam",
      ...(occasionCode === "christmas" ? [] : ["Thời Trang & Quà Mẹ"]),
      ...(occasionCode === "tet" ? [] : ["Quà Sức Khỏe Cao Cấp", "Sức Khỏe & Gia Đình", "Gia Dụng & Trà Đạo", "Trà & Sức Khỏe"]),
      "Quà Tân Gia & Gia Dụng",
    ]);
    if (
      blockedCatsForYoungFemale.has(effectiveCategory) &&
      (!goals?.explicitItems || goals.explicitItems.length === 0)
    ) {
      return { suitable: false, reason: "wrong_category_for_female_partner" };
    }

    const blockedWordsForFemalePartner = [
      "bạn trai",
      "cho nam",
      "nam giới",
      "phái mạnh",
      "ví nam",
      "bóp nam",
      "bóp da nam",
      "thắt lưng nam",
      "dây nịt nam",
      "đồng hồ nam",
      "nước hoa nam",
      "áo polo",
      "cạo râu",
      "cà vạt",
      "trung niên",
      "cao tuổi",
      "người già",
      "máy đo huyết áp",
      ...(occasionCode === "tet" ? [] : ["yến sào", "yến chưng", "hồng sâm", "bát đĩa", "ấm chén"]),
      ...(occasionCode === "christmas" ? [] : ["tặng mẹ"]),
    ];
    for (const w of blockedWordsForFemalePartner) {
      if (nameLower.includes(w)) {
        return { suitable: false, reason: `wrong_recipient_word:${w}` };
      }
    }
  } else if (recipientCode === "male_partner" || recipientCode === "male_peer" || effectiveGender === "Nam") {
    const blockedCatsForMale = new Set([
      "Quà 20/10 & 8/3",
      "Mỹ Phẩm & Làm Đẹp",
      "Trang Sức & Phụ Kiện Nữ",
      "Nước Hoa & Làm Đẹp",
      "Thời Trang Nữ",
      "Thời Trang & Quà Mẹ",
      "Gấu Bông & Quà Cute",
      "Nến Thơm & Thư Giãn",
      "Chăm Sóc Sức Khỏe",
      "Hoa & Quà Lãng Mạn",
    ]);
    if (
      blockedCatsForMale.has(effectiveCategory) &&
      (!goals?.explicitItems || goals.explicitItems.length === 0)
    ) {
      return { suitable: false, reason: "wrong_category_for_male" };
    }

    const blockedWordsForMale = [
      "bạn gái",
      "cho nữ",
      "phụ nữ",
      "phái đẹp",
      "tặng mẹ",
      "cô giáo",
      "20/10",
      "8/3",
      "son môi",
      "son kem",
      "son dưỡng",
      "son lì",
      "phấn mắt",
      "trang điểm",
      "sữa tắm",
      "gel tắm",
      "dây chuyền nữ",
      "dây chuyền bạc nữ",
      "lắc tay",
      "lắc chân",
      "bông tai",
      "hoa tai",
      "khuyên tai",
      "kẹp tóc",
      "cài tóc",
      "bờm tóc",
      "cài áo",
      "khăn lụa",
      "túi xách nữ",
      "ví nữ",
      "nước hoa nữ",
      "váy",
      "đầm",
      "gấu bông",
      "hoa sáp",
      "hoa hồng sáp",
      "chườm bụng",
    ];
    for (const w of blockedWordsForMale) {
      if (nameLower.includes(w)) {
        return { suitable: false, reason: `wrong_recipient_word_male:${w}` };
      }
    }
  } else if (recipientCode === "mother") {
    const blockedCatsForMother = new Set([
      "Gấu Bông & Quà Cute",
      "Gaming & Công Nghệ",
      "Quà Valentine & Kỷ Niệm",
      "Phụ Kiện Nam",
      "Đồng Hồ & Phụ Kiện Nam",
      "Nước Hoa Nam",
      "Chăm Sóc Nam Giới",
      "Thời Trang Nam",
      "Công Nghệ & Âm Thanh",
      "Công Nghệ & Phụ Kiện",
      "Thể Thao & Sức Khỏe",
      "Quà Tốt Nghiệp",
    ]);
    if (
      blockedCatsForMother.has(effectiveCategory) &&
      (!goals?.explicitItems || goals.explicitItems.length === 0)
    ) {
      return { suitable: false, reason: "wrong_category_for_mother" };
    }

    const blockedWordsForMother = [
      "bạn trai",
      "tình nhân",
      "valentine",
      "nhẫn đôi",
      "gấu bông",
      "thú nhồi bông",
      "capybara",
      "shiba",
      "cosplay",
      "gaming",
      "bàn phím",
      "chuột",
      "tai nghe",
      "loa bluetooth",
      "sạc dự phòng",
      "balo nam",
      "túi trống",
      "cạo râu",
      "bờm tóc",
      "kẹp tóc",
      "chườm bụng kinh",
      "son xăm",
    ];
    for (const w of blockedWordsForMother) {
      if (nameLower.includes(w)) {
        return { suitable: false, reason: `wrong_recipient_word_mother:${w}` };
      }
    }
  } else if (recipientCode === "father" || recipientCode === "parents") {
    const blockedCatsForFather = new Set([
      "Quà 20/10 & 8/3",
      "Hoa & Quà Lãng Mạn",
      "Mỹ Phẩm & Làm Đẹp",
      "Trang Sức & Phụ Kiện Nữ",
      "Nước Hoa & Làm Đẹp",
      "Thời Trang Nữ",
      "Gấu Bông & Quà Cute",
      "Nến Thơm & Thư Giãn",
      "Quà Valentine & Kỷ Niệm",
      "Gaming & Công Nghệ",
      "Quà Tốt Nghiệp",
      "Chăm Sóc Sức Khỏe",
    ]);
    if (
      blockedCatsForFather.has(effectiveCategory) &&
      (!goals?.explicitItems || goals.explicitItems.length === 0)
    ) {
      return { suitable: false, reason: "wrong_category_for_father" };
    }
  } else if (
    recipientCode === "teacher" ||
    recipientCode === "female_teacher" ||
    recipientCode === "boss"
  ) {
    const blockedCatsForFormal = new Set([
      "Gấu Bông & Quà Cute",
      "Quà Valentine & Kỷ Niệm",
      "Gaming & Công Nghệ",
      "Chăm Sóc Nam Giới",
      "Chăm Sóc Sức Khỏe",
    ]);
    if (blockedCatsForFormal.has(effectiveCategory)) {
      return { suitable: false, reason: "wrong_category_for_formal_recipient" };
    }
  }

  // Trụ cột 3: ĐÚNG DỊP (Cách ly các dịp đặc thù như Giáng sinh, Halloween, Tốt nghiệp, 20/11, Tân gia)
  if (occasionCode !== "halloween") {
    if (
      effectiveCategory === "Quà Halloween & Hóa Trang" ||
      nameLower.includes("halloween") ||
      nameLower.includes("hóa trang")
    ) {
      return { suitable: false, reason: "wrong_occasion_halloween" };
    }
  } else {
    // Nếu là dịp Halloween, chỉ chấp nhận sản phẩm mang chủ đề Halloween
    const isThematicHalloween =
      effectiveCategory === "Quà Halloween & Hóa Trang" ||
      nameLower.includes("halloween") ||
      nameLower.includes("bí ngô") ||
      nameLower.includes("bí ") ||
      nameLower.includes("ma ") ||
      nameLower.includes("ma quái") ||
      nameLower.includes("phù thủy") ||
      nameLower.includes("hóa trang") ||
      nameLower.includes("cosplay") ||
      nameLower.includes("mặt nạ") ||
      nameLower.includes("áo choàng") ||
      nameLower.includes("kẹo") ||
      nameLower.includes("dơi") ||
      nameLower.includes("đầu lâu") ||
      nameLower.includes("nhện");

    if (!isThematicHalloween) {
      return { suitable: false, reason: "not_halloween_thematic" };
    }
  }

  if (occasionCode !== "christmas") {
    if (
      effectiveCategory === "Quà Giáng Sinh & Lưu Niệm" ||
      effectiveCategory === "Quà Giáng Sinh & Thời Trang" ||
      nameLower.includes("giáng sinh") ||
      nameLower.includes("noel") ||
      nameLower.includes("quả cầu tuyết")
    ) {
      return { suitable: false, reason: "wrong_occasion_christmas" };
    }
  }

  if (occasionCode !== "graduation") {
    if (
      effectiveCategory === "Quà Tốt Nghiệp" ||
      nameLower.includes("tốt nghiệp") ||
      nameLower.includes("cử nhân")
    ) {
      return { suitable: false, reason: "wrong_occasion_graduation" };
    }
  }

  if (
    occasionCode !== "20/11" &&
    recipientCode !== "teacher" &&
    recipientCode !== "female_teacher"
  ) {
    if (
      (nameLower.includes("20/11") ||
        nameLower.includes("20.11") ||
        nameLower.includes("thầy cô") ||
        nameLower.includes("cô giáo")) &&
      !nameLower.includes("20/10") &&
      !nameLower.includes("8/3") &&
      !nameLower.includes("bạn gái")
    ) {
      return { suitable: false, reason: "wrong_occasion_20_11" };
    }
  }

  if (occasionCode !== "valentine" && occasionCode !== "anniversary") {
    if (nameLower.includes("valentine") && !nameLower.includes("sinh nhật") && !nameLower.includes("20/10") && !nameLower.includes("8/3")) {
      return { suitable: false, reason: "wrong_occasion_valentine_only" };
    }
  }

  // Kiểm tra Ngân sách (Budget)
  if (goals?.minPrice || goals?.maxPrice) {
    const minP = goals.minPrice || 0;
    const maxP = goals.maxPrice || Infinity;
    if (priceNum > maxP * 1.2 || priceNum < minP * 0.5) {
      return { suitable: false, reason: "out_of_budget" };
    }
  }

  // Tính điểm độ khớp (Relevance Score)
  const explicitItems = Array.isArray(goals?.explicitItems)
    ? goals.explicitItems.map((t) => normalizeKeyword(t)).filter(Boolean)
    : [];
  const goalItems = Array.isArray(goals?.goalItems)
    ? goals.goalItems.map((t) => normalizeKeyword(t)).filter((t) => !isGenericStopword(t))
    : [];
  const goalCategories = Array.isArray(goals?.goalCategories)
    ? goals.goalCategories
    : [];

  let relevance = 50;
  const matchedItems = [];
  let matchedExplicit = false;

  // 1. Khớp món đồ người dùng yêu cầu đích danh (Explicit Items)
  for (const expItem of explicitItems) {
    if (matchesItemKeyword(nameLower, expItem)) {
      relevance += 75;
      matchedItems.push(expItem);
      matchedExplicit = true;
    } else if (matchesItemKeyword(kwLower, expItem)) {
      relevance += 40;
      matchedItems.push(expItem);
      matchedExplicit = true;
    }
  }

  // Nếu người dùng đã nêu đích danh món quà cụ thể (ví dụ "mua son môi tặng bạn gái") mà sản phẩm không khớp món đó -> loại
  if (explicitItems.length > 0 && !matchedExplicit) {
    return { suitable: false, reason: "missed_explicit_item" };
  }

  // 2. Khớp danh mục mục tiêu (Goal Category)
  const isGoalCategory =
    goalCategories.length > 0 && goalCategories.includes(effectiveCategory);
  if (isGoalCategory) {
    const catRank = goalCategories.indexOf(effectiveCategory);
    relevance += Math.max(28, 52 - catRank * 3);
  } else if (goalCategories.length > 0 && !matchedExplicit) {
    // Nếu đã có danh mục mục tiêu cho đối tượng/dịp này mà sản phẩm không thuộc danh mục mục tiêu -> loại bỏ để không bao giờ lọt quà lệch tông!
    return { suitable: false, reason: "not_in_goal_categories" };
  }

  // 3. Khớp danh sách món quà gợi ý (cleanItems & goalItems) ngay trong TÊN SẢN PHẨM
  const allTargetItems = Array.from(new Set([...cleanItems, ...goalItems]));
  for (const item of allTargetItems) {
    if (!item) continue;
    if (matchesItemKeyword(nameLower, item)) {
      relevance += 32;
      matchedItems.push(item);
    } else if (matchesItemKeyword(kwLower, item)) {
      relevance += 12;
      matchedItems.push(item);
    }
  }

  // 4. Điểm thưởng khi tên sản phẩm khớp trực tiếp Dịp tặng
  if (goals?.occasionKeywords && goals.occasionKeywords.length > 0) {
    for (const occKw of goals.occasionKeywords) {
      if (nameLower.includes(occKw)) {
        relevance += 20;
      }
    }
  }

  // 5. Điểm thưởng khi tên sản phẩm khớp trực tiếp Đối tượng nhận
  if (goals?.recipientKeywords && goals.recipientKeywords.length > 0) {
    for (const recKw of goals.recipientKeywords) {
      if (nameLower.includes(recKw)) {
        relevance += 18;
      }
    }
  }

  // 6. Điểm thưởng khi khớp searchQueries
  for (const sq of Array.isArray(searchQueries) ? searchQueries : []) {
    const sqLower = normalizeKeyword(sq);
    if (sqLower && nameLower.includes(sqLower)) {
      relevance += 25;
    }
  }

  // 7. Điểm thưởng mức giá quà tặng hoàn chỉnh
  if (goals?.minPrice || goals?.maxPrice) {
    const minP = goals.minPrice || 0;
    const maxP = goals.maxPrice || Infinity;
    if (priceNum >= minP && priceNum <= maxP) {
      relevance += 24;
    }
  } else {
    if (priceNum >= 95000 && priceNum <= 1200000) {
      relevance += 18;
    } else if (priceNum < 65000 || priceNum > 2500000) {
      relevance -= 18;
    }
  }

  const uniqueMatched = Array.from(new Set(matchedItems));
  const displayScore = Math.min(
    98,
    Math.max(75, Math.round(74 + Math.min(24, (relevance - 65) * 0.22))),
  );

  const targetDesc = [];
  if (goals?.recipientLabel) targetDesc.push(`tặng ${goals.recipientLabel.toLowerCase()}`);
  if (goals?.occasionLabel) targetDesc.push(`nhân dịp ${goals.occasionLabel}`);
  const contextPhrase = targetDesc.length > 0 ? targetDesc.join(" ") : "nhu cầu của bạn";

  const reasonText =
    effectiveCategory && effectiveCategory !== "Product"
      ? `Món quà thuộc nhóm "${effectiveCategory}" rất tinh tế và thiết thực, phù hợp để ${contextPhrase}.`
      : `Lựa chọn quà tặng ý nghĩa, phù hợp với ${contextPhrase}.`;

  return {
    suitable: true,
    rawRelevance: relevance,
    displayScore,
    effectiveCategory,
    reasonText,
    matchedExplicit,
    uniqueMatched,
  };
}

function getTitleSignature(name) {
  const words = normalizeKeyword(name)
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !GENERIC_GIFT_STOPWORDS.has(w));
  return words.slice(0, 5).join(" ");
}

async function getRelatedCachedProducts({
  items = [],
  searchQueries = [],
  keywords = [],
  goals = null,
  limit = MAX_RECOMMENDATIONS,
}) {
  const cleanItems = (Array.isArray(items) ? items : [])
    .map((t) => normalizeKeyword(t))
    .filter((t) => !isGenericStopword(t));

  const goalItems = (Array.isArray(goals?.goalItems) ? goals.goalItems : [])
    .map((t) => normalizeKeyword(t))
    .filter((t) => !isGenericStopword(t));

  const explicitItems = (Array.isArray(goals?.explicitItems) ? goals.explicitItems : [])
    .map((t) => normalizeKeyword(t))
    .filter(Boolean);

  const goalCategories = Array.isArray(goals?.goalCategories)
    ? goals.goalCategories
    : [];

  // Chỉ dùng các cụm từ món quà cụ thể (KHÔNG dùng ai.keywords chung chung như "Nam", "Nữ", "Sinh nhật" để tránh LIKE '%nam%' khớp "Việt Nam")
  const searchTerms = [
    ...explicitItems,
    ...cleanItems,
    ...goalItems,
    ...(Array.isArray(searchQueries) ? searchQueries : []),
    ...(Array.isArray(goals?.goalSearchQueries) ? goals.goalSearchQueries : []),
  ]
    .map((t) => normalizeKeyword(t))
    .filter((t) => !isGenericStopword(t));

  const uniqueTerms = Array.from(new Set(searchTerms)).slice(0, 18);

  if (uniqueTerms.length === 0 && goalCategories.length === 0) {
    return [];
  }

  try {
    const conditions = [];
    const params = [];

    for (const cat of goalCategories) {
      conditions.push("category = ?");
      params.push(cat);
    }

    for (const term of uniqueTerms) {
      conditions.push("(name LIKE ? OR search_keyword LIKE ?)");
      params.push(`%${term}%`, `%${term}%`);
    }

    const sql = `
            SELECT
                id,
                platform,
                name,
                price,
                currency,
                image,
                url,
                condition_name,
                category,
                location,
                search_keyword,
                created_at,
                updated_at
            FROM scraped_products
            WHERE ${conditions.join(" OR ")}
            ORDER BY id ASC
            LIMIT 2500
        `;

    const [rows] = await pool.query(sql, params);

    if (!rows || rows.length === 0) {
      console.log(
        `Related DB cache: 0 products found for [${uniqueTerms.slice(0, 5).join(", ")}]`,
      );
      return [];
    }

    const scoredProducts = [];

    for (const row of rows) {
      const evalResult = evaluateProductForGoals(
        row,
        goals,
        cleanItems,
        searchQueries,
      );

      if (!evalResult.suitable) {
        continue;
      }

      scoredProducts.push({
        product: normalizeProduct({
          id: row.id,
          platform: row.platform,
          name: row.name,
          price: row.price,
          currency: row.currency,
          image: row.image,
          url: row.url,
          condition: row.condition_name,
          category: evalResult.effectiveCategory,
          location: row.location,
          score: evalResult.displayScore,
          reason: evalResult.reasonText,
        }),
        rawRelevance: evalResult.rawRelevance,
        bucketKey: (() => {
          if (goals?.occasionCode === "halloween") {
            const n = normalizeKeyword(row.name);
            if (n.includes("đèn") || n.includes("phát sáng") || n.includes("cây phát")) return "Đèn bí ngô & phát sáng";
            if (n.includes("mặt nạ") || n.includes("móng tay") || n.includes("kính")) return "Mặt nạ & Hóa trang";
            if (n.includes("áo choàng") || n.includes("cosplay") || n.includes("đuôi")) return "Áo choàng & Cosplay";
            if (n.includes("kẹo") || n.includes("bánh")) return "Bánh kẹo Halloween";
            if (n.includes("gấu bông") || n.includes("thú nhồi bông") || n.includes("gengar")) return "Gấu bông & Quà cute";
            if (n.includes("băng đô") || n.includes("cài tóc") || n.includes("bờm") || n.includes("móc khóa")) return "Phụ kiện & Cài tóc";
            if (n.includes("cốc") || n.includes("ly") || n.includes("nến")) return "Cốc & Nến bí ngô";
          }
          return evalResult.effectiveCategory || "Chung";
        })(),
      });
    }

    scoredProducts.sort((a, b) => b.rawRelevance - a.rawRelevance);

    // Đa dạng hóa theo danh mục mục tiêu và khử trùng lặp sản phẩm gần giống tên
    const itemBuckets = new Map();
    const seenSignatures = new Set();

    for (const item of scoredProducts) {
      const sig = getTitleSignature(item.product.name);
      if (sig && seenSignatures.has(sig)) {
        continue;
      }
      if (sig) {
        seenSignatures.add(sig);
      }

      const key = item.bucketKey;
      if (!itemBuckets.has(key)) {
        itemBuckets.set(key, []);
      }
      itemBuckets.get(key).push(item.product);
    }

    const diversified = [];
    let added = true;
    while (diversified.length < limit && added) {
      added = false;
      for (const [, bucket] of itemBuckets.entries()) {
        if (bucket.length > 0 && diversified.length < limit) {
          diversified.push(bucket.shift());
          added = true;
        }
      }
    }

    const finalProducts = removeDuplicateProducts(
      diversified.length > 0
        ? diversified
        : scoredProducts.map((s) => s.product),
    ).slice(0, limit);

    console.log(
      `Related DB cache: matched ${rows.length} rows, passed 3-pillar filter: ${scoredProducts.length}, returning ${finalProducts.length} products.`,
    );

    return finalProducts;
  } catch (error) {
    console.error("MySQL related products read error:", error.message);
    return [];
  }
}

// =====================================================
// SAVE CACHE (KIỂM ĐỊNH & GÁN ĐÚNG DANH MỤC TRƯỚC KHI LƯU CSDL)
// =====================================================

async function saveProductsToCache(keyword, products) {
  const normalized = normalizeKeyword(keyword);

  if (!normalized || !Array.isArray(products) || products.length === 0) {
    return;
  }

  const connection = await pool.getConnection();
  let savedCount = 0;

  try {
    await connection.beginTransaction();

    for (const rawProduct of products) {
      const product = normalizeProduct(rawProduct);

      if (!product.name || !product.image || !product.image.startsWith("http")) {
        continue;
      }

      // Kiểm định sản phẩm cào về: nếu là hàng tạp hóa / phụ kiện rác / giá lỗi thì KHÔNG lưu vào CSDL
      const classified = classifyGiftProductByTitle(product.name, product.price);
      if (!classified.valid) {
        continue;
      }

      const finalCategory =
        product.category &&
        product.category !== "Product" &&
        product.category !== "Lazada Product"
          ? product.category
          : classified.category;

      const finalSearchKeyword = classified.tags
        ? `${normalized} | ${classified.tags}`
        : normalized;

      const productKey = createProductKey(product);

      if (!productKey) {
        continue;
      }

      await connection.query(
        `
                INSERT INTO scraped_products (
                    product_key,
                    platform,
                    name,
                    price,
                    currency,
                    image,
                    url,
                    condition_name,
                    category,
                    location,
                    search_keyword,
                    score,
                    reason,
                    created_at,
                    updated_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, 0, '', NOW(), NOW()
                )
                ON DUPLICATE KEY UPDATE
                    platform = VALUES(platform),
                    name = VALUES(name),
                    price = IF(VALUES(price) IS NOT NULL AND VALUES(price) > 0, VALUES(price), price),
                    currency = VALUES(currency),
                    image = IF(VALUES(image) IS NOT NULL AND VALUES(image) != '' AND VALUES(image) NOT LIKE 'data:%', VALUES(image), image),
                    url = VALUES(url),
                    condition_name = VALUES(condition_name),
                    category = IF(VALUES(category) IS NOT NULL AND VALUES(category) NOT IN ('Product', 'Lazada Product'), VALUES(category), category),
                    location = VALUES(location),
                    updated_at = NOW()
                `,
        [
          productKey,
          product.platform,
          product.name,
          product.price,
          product.currency,
          product.image,
          product.url,
          product.condition,
          finalCategory,
          product.location,
          finalSearchKeyword,
        ],
      );
      savedCount++;
    }

    await connection.commit();

    console.log(
      `Saved ${savedCount}/${products.length} verified gift products to MySQL cache for "${normalized}".`,
    );
  } catch (error) {
    await connection.rollback();

    console.error("MySQL cache save error:", error.message);
  } finally {
    connection.release();
  }
}

// =====================================================
// SELENIUM DRIVER
// =====================================================

async function createDriver() {
  const options = new chrome.Options();

  // Không chờ toàn bộ tài nguyên Lazada tải xong
  options.setPageLoadStrategy("eager");

  options.addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--window-size=1920,1080",
    "--disable-notifications",
    "--disable-popup-blocking",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-features=Translate",
    "--disable-features=MediaRouter",
    "--disable-sync",
    "--lang=vi-VN",
  );

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  await driver.manage().setTimeouts({
    pageLoad: SCRAPE_TIMEOUT,
    script: SCRAPE_TIMEOUT,
    implicit: 2000,
  });

  return driver;
}

// =====================================================
// SAFE GET
// =====================================================

async function safeGet(driver, url) {
  try {
    await driver.get(url);

    return true;
  } catch (error) {
    const message = error?.message || String(error);

    const lower = message.toLowerCase();

    console.error("Selenium GET error:", message);

    const isTimeout =
      lower.includes("timeout") ||
      lower.includes("timed out receiving message from renderer");

    if (isTimeout) {
      console.warn("Lazada renderer timeout. Tiếp tục đọc HTML hiện tại...");

      try {
        await driver.executeScript("window.stop();");
      } catch {
        // Ignore
      }

      await sleep(300);

      return true;
    }

    return false;
  }
}

// =====================================================
// PRICE PARSER
// =====================================================

function parsePrice(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  let text = String(value).toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  // Xử lý định dạng k/triệu (ví dụ: "150k", "1.5tr", "1,5 triệu")
  const kMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:k|nghìn|ngàn)\b/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1].replace(/,/g, "."));
    if (!Number.isNaN(num)) return Math.round(num * 1000);
  }

  const trMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:tr|triệu)\b/i);
  if (trMatch) {
    const num = parseFloat(trMatch[1].replace(/,/g, "."));
    if (!Number.isNaN(num)) return Math.round(num * 1000000);
  }

  // Bỏ các từ gây nhiễu phần trăm giảm giá: "30% off", "-25%"
  text = text
    .replace(/-\s*\d+%/g, "")
    .replace(/\d+%\s*off/gi, "")
    .replace(/\d+%/g, "");

  // 1. Nếu có ký hiệu tiền tệ ₫/đ/vnd, tìm số gắn liền với ký hiệu đó
  const attachedCurrencyMatch =
    text.match(/(?:₫|đ|vnd|vnđ)\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)/i) ||
    text.match(/([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)\s*(?:₫|đ|vnd|vnđ)/i);

  if (attachedCurrencyMatch && attachedCurrencyMatch[1]) {
    const cleanNum = attachedCurrencyMatch[1].replace(/[.,]/g, "");
    const number = Number(cleanNum);
    if (!Number.isNaN(number) && number >= 500) {
      return number;
    }
  }

  // 2. Định dạng hàng nghìn có dấu chấm/phẩy (ví dụ: "155.000", "155,000")
  const thousandMatch = text.match(/\b([0-9]{1,3}(?:[.,][0-9]{3})+)\b/);
  if (thousandMatch && thousandMatch[1]) {
    const cleanNum = thousandMatch[1].replace(/[.,]/g, "");
    const number = Number(cleanNum);
    if (!Number.isNaN(number) && number >= 500) {
      return number;
    }
  }

  // 3. Nếu chuỗi chỉ toàn là số nguyên hoặc số thập phân
  const directNumMatch = text.match(/^\s*([0-9]+)(?:\.[0-9]+)?\s*$/);
  if (directNumMatch) {
    const number = Number(directNumMatch[1]);
    if (!Number.isNaN(number) && number >= 500) return number;
  }

  return null;
}

function extractProductPrice(item) {
  if (!item) return null;

  // 1. Selector giá chính thức của Lazada (.ooOxS, [data-qa-locator="product-item-price"], v.v.)
  const priceSelectors = [
    ".ooOxS",
    '[data-qa-locator="product-item-price"]',
    ".item-price",
    ".price",
    '[class*="price"]',
    '[class*="Price"]',
  ];

  for (const sel of priceSelectors) {
    const el = item.find(sel).first();
    if (el && el.length > 0) {
      const parsed = parsePrice(el.text());
      if (parsed && parsed >= 1000) {
        return parsed;
      }
    }
  }

  // 2. Quét tất cả các thẻ con có chứa ₫ hoặc đ
  const currencyEls = item.find("span, div, p").filter((_, el) => {
    const t = item.find(el).text();
    return (
      (t.includes("₫") || t.includes("đ") || t.toLowerCase().includes("vnd")) &&
      t.length < 35
    );
  });

  for (let i = 0; i < currencyEls.length; i++) {
    const parsed = parsePrice(currencyEls.eq(i).text());
    if (parsed && parsed >= 1000) {
      return parsed;
    }
  }

  // 3. Fallback: quét regex tiền tệ trên toàn bộ text của thẻ
  const fullText = item.text().replace(/\s+/g, " ").trim();
  const parsedFromText = parsePrice(fullText);
  if (parsedFromText && parsedFromText >= 1000) {
    return parsedFromText;
  }

  return null;
}

// =====================================================
// IMAGE PARSER
// =====================================================

function getImageFromItem(element) {
  if (!element) {
    return "";
  }

  // Hỗ trợ cả Cheerio wrapper $(...) lẫn raw DOM node
  const node = element[0] || element;
  const attribs =
    node.attribs || (typeof element.attr === "function" ? null : {});

  const attributes = [
    "src",
    "data-src",
    "data-ks-lazyload",
    "data-lazyload",
    "data-lazy-src",
    "data-original",
    "data-original-src",
    "data-image",
    "data-img",
    "data-url",
    "srcset",
  ];

  for (const attr of attributes) {
    const value = attribs ? attribs[attr] : element.attr(attr);

    if (!value) {
      continue;
    }

    if (attr === "srcset") {
      const first = value.split(",")[0]?.trim()?.split(/\s+/)[0];

      if (first) {
        const normalized = normalizeImageUrl(first);

        if (normalized) {
          return normalized;
        }
      }

      continue;
    }

    const normalized = normalizeImageUrl(value);

    if (normalized && !normalized.startsWith("data:")) {
      return normalized;
    }
  }

  const style =
    attribs?.style ||
    (typeof element.attr === "function" ? element.attr("style") : "") ||
    "";

  const styleMatch = style.match(/url\(["']?([^"')]+)["']?\)/i);

  if (styleMatch && styleMatch[1]) {
    const normalized = normalizeImageUrl(styleMatch[1]);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function extractProductImage(item) {
  if (!item) return "";

  // 1. Quét img có type="product" (thẻ ảnh chính của sản phẩm Lazada)
  const productImgs = item.find('img[type="product"]');
  for (let i = 0; i < productImgs.length; i++) {
    const candidate = getImageFromItem(productImgs.eq(i));
    if (candidate && candidate.startsWith("http")) {
      return candidate;
    }
  }

  // 2. Quét tất cả thẻ img khác trong card, bỏ qua ảnh thumbnail 80x80 nếu có ảnh lớn hơn
  const allImgs = item.find("img");
  for (let i = 0; i < allImgs.length; i++) {
    const candidate = getImageFromItem(allImgs.eq(i));
    if (
      candidate &&
      candidate.startsWith("http") &&
      !candidate.includes("80x80")
    ) {
      return candidate;
    }
  }

  // 3. Fallback bất kỳ ảnh http nào tìm được
  for (let i = 0; i < allImgs.length; i++) {
    const candidate = getImageFromItem(allImgs.eq(i));
    if (candidate && candidate.startsWith("http")) {
      return candidate;
    }
  }

  return "";
}

// =====================================================
// LAZADA WAIT
// =====================================================

async function waitForLazada(driver) {
  try {
    await driver.wait(async () => {
      try {
        const elements = await driver.findElements(
          By.css('[data-qa-locator="product-item"]'),
        );

        return elements && elements.length > 0;
      } catch {
        return false;
      }
    }, 5000);

    // Tự động cuộn xuống để kích hoạt lazy loading ảnh sản phẩm của Lazada
    try {
      await driver.executeScript("window.scrollBy(0, 1000);");
      await sleep(600);
      await driver.executeScript("window.scrollBy(0, 1000);");
      await sleep(600);
      await driver.executeScript("window.scrollTo(0, 0);");
    } catch {
      // Ignore scroll errors
    }
  } catch {
    // Không throw
  }

  await sleep(300);
}

// =====================================================
// SCRAPE LAZADA
// =====================================================

async function scrapeLazada(keyword) {
  const driver = await createDriver();

  const products = [];

  try {
    const url = `https://www.lazada.vn/catalog/?q=${encodeURIComponent(keyword)}`;

    console.log(`Lazada scraping: ${keyword}`);

    const success = await safeGet(driver, url);

    if (!success) {
      console.log(`Lazada could not open: "${keyword}"`);

      return [];
    }

    await waitForLazada(driver);

    let currentUrl = "";

    try {
      currentUrl = await driver.getCurrentUrl();
    } catch {
      // Ignore
    }

    console.log("Lazada current URL:", currentUrl);

    let html = "";

    try {
      html = await driver.getPageSource();
    } catch (error) {
      console.error("Lazada pageSource error:", error.message);

      try {
        await driver.executeScript("window.stop();");
      } catch {
        // Ignore
      }

      await sleep(300);

      try {
        html = await driver.getPageSource();
      } catch {
        html = "";
      }
    }

    if (!html) {
      console.log(`Lazada returned empty HTML for "${keyword}"`);

      return [];
    }

    console.log(`Lazada HTML length: ${html.length}`);

    const $ = cheerio.load(html);

    // =================================================
    // PRODUCT ITEMS
    // =================================================

    let items = $('[data-qa-locator="product-item"]');

    console.log(`Found ${items.length} products on Lazada`);

    // =================================================
    // PARSE MAIN ITEMS
    // =================================================

    items.each((index, element) => {
      if (products.length >= MAX_PRODUCTS_PER_PLATFORM) {
        return false;
      }

      try {
        const item = $(element);

        // =====================================
        // PRODUCT LINK
        // =====================================

        const linkElement = item.find('a[href*=".html"]').first();

        let link = linkElement.attr("href");

        if (!link) {
          link = item.find("a").first().attr("href");
        }

        const productUrl = normalizeUrl(link);

        // =====================================
        // PRODUCT NAME
        // =====================================

        let name = item
          .find('[data-qa-locator="product-item-title"]')
          .first()
          .text()
          .trim();

        if (!name) {
          name = linkElement.attr("title") || "";
        }

        if (!name) {
          name = item.find("a[title]").first().attr("title") || "";
        }

        if (!name) {
          name = linkElement.text().replace(/\s+/g, " ").trim();
        }

        if (!name) {
          name = item.find("a").first().text().replace(/\s+/g, " ").trim();
        }

        // =====================================
        // PRICE
        // =====================================

        const price = extractProductPrice(item);

        // =====================================
        // IMAGE
        // =====================================

        const image = extractProductImage(item);

        // =====================================
        // VALIDATE & CLASSIFY BY TITLE
        // =====================================

        if (!name || name.length < 3 || !productUrl || !image || !price) {
          return;
        }

        const classified = classifyGiftProductByTitle(name, price);
        if (!classified.valid) {
          return;
        }

        // Kiểm tra tên sản phẩm cào về có chứa ít nhất 1 từ khóa thực chất của truy vấn tìm kiếm không (loại bỏ quảng cáo tài trợ lệch chủ đề của Lazada)
        const kwTokens = normalizeKeyword(keyword)
          .split(/\s+/)
          .filter(
            (w) =>
              w.length >= 2 &&
              ![
                "quà",
                "tặng",
                "hộp",
                "set",
                "bộ",
                "cho",
                "cao",
                "cấp",
                "chính",
                "hãng",
                "sang",
                "trọng",
                "ý",
                "nghĩa",
              ].includes(w),
          );
        const nameLower = normalizeKeyword(name);
        if (
          kwTokens.length > 0 &&
          !kwTokens.some((tok) => nameLower.includes(tok))
        ) {
          return;
        }

        // =====================================
        // ADD PRODUCT
        // =====================================

        products.push(
          normalizeProduct({
            id: createStableId("Lazada", productUrl, name),

            name,

            price,

            currency: "VND",

            image,

            url: productUrl,

            condition: "New",

            category: classified.category,

            location: "Vietnam",

            platform: "Lazada",

            source: "Lazada",
          }),
        );
      } catch (error) {
        console.error("Lazada item parse error:", error.message);
      }
    });

    // =================================================
    // FALLBACK
    // =================================================

    if (products.length === 0) {
      const fallbackLinks = $('a[href*=".html"]');

      console.log(`Lazada fallback links: ${fallbackLinks.length}`);

      fallbackLinks.each((index, element) => {
        if (products.length >= MAX_PRODUCTS_PER_PLATFORM) {
          return false;
        }

        try {
          const link = $(element);

          const href = link.attr("href");

          const productUrl = normalizeUrl(href);

          if (!productUrl || !productUrl.includes("lazada.vn")) {
            return;
          }

          let name = link.attr("title") || "";

          if (!name) {
            name = link.find("[title]").first().attr("title") || "";
          }

          if (!name) {
            name = link.text().replace(/\s+/g, " ").trim();
          }

          if (!name || name.length < 5) {
            return;
          }

          const image = extractProductImage(link);

          const price =
            extractProductPrice(link.parent()) || extractProductPrice(link);

          if (!image || !price) {
            return;
          }

          const classified = classifyGiftProductByTitle(name, price);
          if (!classified.valid) {
            return;
          }

          products.push(
            normalizeProduct({
              id: createStableId("Lazada", productUrl, name),

              name,

              price,

              currency: "VND",

              image,

              url: productUrl,

              condition: "New",

              category: classified.category,

              location: "Vietnam",

              platform: "Lazada",

              source: "Lazada",
            }),
          );
        } catch (error) {
          console.error("Lazada fallback parse error:", error.message);
        }
      });
    }

    const uniqueProducts = removeDuplicateProducts(products);

    console.log(`Lazada scraper returned ${uniqueProducts.length} products`);

    return uniqueProducts.slice(0, MAX_PRODUCTS_PER_PLATFORM);
  } catch (error) {
    console.error("Lazada scraping error:", error.message);

    return [];
  } finally {
    try {
      await driver.quit();
    } catch {
      // Ignore
    }
  }
}

// =====================================================
// REMOVE DUPLICATES
// =====================================================

function removeDuplicateProducts(products) {
  const map = new Map();

  for (const rawProduct of products) {
    const product = normalizeProduct(rawProduct);

    const key = createProductKey(product);

    if (!key) {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, product);
    }
  }

  return Array.from(map.values());
}

// =====================================================
// SCRAPE WITH CONCURRENCY LIMIT
// =====================================================

async function scrapeQueriesWithLimit(queries) {
  const results = new Array(queries.length);

  let currentIndex = 0;

  async function worker() {
    while (true) {
      const index = currentIndex++;

      if (index >= queries.length) {
        break;
      }

      const keyword = queries[index];

      try {
        const products = await scrapeLazada(keyword);

        results[index] = {
          keyword,
          products,
        };
      } catch (error) {
        console.error(`Scrape error for "${keyword}":`, error.message);

        results[index] = {
          keyword,
          products: [],
        };
      }
    }
  }

  const workerCount = Math.min(MAX_SCRAPE_CONCURRENCY, queries.length);

  console.log(`Starting ${workerCount} Lazada scraper worker(s)...`);

  await Promise.all(
    Array.from(
      {
        length: workerCount,
      },
      () => worker(),
    ),
  );

  return results.filter(Boolean);
}

// =====================================================
// MARKETPLACE SEARCH
// =====================================================

async function searchMarketplaceProducts(keyword) {
  console.log(`Searching Lazada for: "${keyword}"`);

  const products = await scrapeLazada(keyword);

  const uniqueProducts = removeDuplicateProducts(products);

  console.log(`Marketplace search returned ${uniqueProducts.length} products`);

  return uniqueProducts;
}

// =====================================================
// GEMINI REQUEST
// =====================================================

async function askGemini(prompt, maxRetries = 1) {
  try {
    return await askAI(prompt);
  } catch (error) {
    console.error("AI service error:", error.message);
    throw error;
  }
}

// =====================================================
// CLEAN GEMINI JSON
// =====================================================

function cleanGeminiJSON(text) {
  if (!text) {
    return "";
  }

  let cleaned = String(text).trim();

  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  // Kiểm tra ký tự nào xuất hiện trước để phân biệt JSON Object {...} và JSON Array [...]
  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace &&
    (firstBracket === -1 || firstBrace < firstBracket)
  ) {
    return cleaned.substring(firstBrace, lastBrace + 1).trim();
  }

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return cleaned.substring(firstBracket, lastBracket + 1).trim();
  }

  return cleaned;
}

// =====================================================
// NORMALIZE SEARCH QUERIES
// =====================================================

function normalizeSearchQueries(queries) {
  if (!Array.isArray(queries)) {
    return [];
  }

  const result = [];

  for (const query of queries) {
    const value = normalizeKeyword(query);

    if (!value || value.length < 2) {
      continue;
    }

    if (value.split(/\s+/).length > 10) {
      continue;
    }

    if (!result.includes(value)) {
      result.push(value);
    }

    if (result.length >= 4) {
      break;
    }
  }

  return result;
}

// =====================================================
// INTEREST TEXT
// =====================================================

function getInterestText(interests) {
  if (!Array.isArray(interests)) {
    return "";
  }

  return interests.filter(Boolean).join(", ");
}

function hasWholeWord(text, word) {
  if (!text || !word) return false;
  const padded = ` ${String(text).replace(/[.,!?;:()[\]{}"'/\\-]/g, " ").replace(/\s+/g, " ")} `;
  return padded.includes(` ${word} `);
}

// =====================================================
// DETECT GIFT GOALS (PHÂN TÍCH MỤC TIÊU CHÍNH: ĐỐI TƯỢNG + DỊP + NGÂN SÁCH + SỞ THÍCH)
// =====================================================

function detectGiftGoals({
  description = "",
  relationship = "",
  gender = "",
  age = "",
  occasion = "",
  budget = "",
  interests = [],
}) {
  const descNorm = normalizeKeyword(description);
  const relNorm = normalizeKeyword(relationship);
  const genNorm = normalizeKeyword(gender);
  const ageNorm = normalizeKeyword(age);
  const occNorm = normalizeKeyword(occasion);
  const budNorm = normalizeKeyword(budget);
  const intNorm = normalizeKeyword(getInterestText(interests));

  const fullText = [descNorm, relNorm, genNorm, ageNorm, occNorm, budNorm, intNorm]
    .filter(Boolean)
    .join(" ");

  // 1. Nhận diện Dịp tặng quà (Occasion)
  let occasionCode = "";
  let occasionLabel = occasion || "";
  let occasionKeywords = [];
  let impliedGenderFromOccasion = "";

  if (
    fullText.includes("20/10") ||
    fullText.includes("20-10") ||
    fullText.includes("20 tháng 10") ||
    fullText.includes("phụ nữ việt nam")
  ) {
    occasionCode = "20/10";
    occasionLabel = "Ngày Phụ nữ Việt Nam 20/10";
    occasionKeywords = ["20/10", "8/3", "phụ nữ", "bạn gái", "hộp quà", "set quà"];
    impliedGenderFromOccasion = "Nữ";
  } else if (
    fullText.includes("8/3") ||
    fullText.includes("8-3") ||
    fullText.includes("8 tháng 3") ||
    fullText.includes("quốc tế phụ nữ")
  ) {
    occasionCode = "8/3";
    occasionLabel = "Ngày Quốc tế Phụ nữ 8/3";
    occasionKeywords = ["8/3", "20/10", "phụ nữ", "bạn gái", "hộp quà", "set quà"];
    impliedGenderFromOccasion = "Nữ";
  } else if (
    fullText.includes("valentine") ||
    fullText.includes("14/2") ||
    fullText.includes("14-2") ||
    fullText.includes("lễ tình nhân") ||
    fullText.includes("14/3")
  ) {
    occasionCode = "valentine";
    occasionLabel = "Lễ Tình Nhân Valentine";
    occasionKeywords = ["valentine", "14/2", "tình nhân", "socola", "hoa sáp", "người yêu"];
  } else if (
    fullText.includes("20/11") ||
    fullText.includes("20-11") ||
    fullText.includes("nhà giáo") ||
    fullText.includes("thầy cô")
  ) {
    occasionCode = "20/11";
    occasionLabel = "Ngày Nhà Giáo Việt Nam 20/11";
    occasionKeywords = ["20/11", "thầy cô", "cô giáo", "thầy giáo", "tri ân", "hộp quà"];
  } else if (
    fullText.includes("tốt nghiệp") ||
    fullText.includes("graduation") ||
    fullText.includes("ra trường") ||
    fullText.includes("cử nhân")
  ) {
    occasionCode = "graduation";
    occasionLabel = "Lễ tốt nghiệp";
    occasionKeywords = ["tốt nghiệp", "cử nhân", "hướng dương", "ra trường"];
  } else if (
    fullText.includes("tân gia") ||
    fullText.includes("nhà mới")
  ) {
    occasionCode = "housewarming";
    occasionLabel = "Mừng tân gia";
    occasionKeywords = ["tân gia", "gốm sứ", "ấm chén", "bát đĩa", "tinh dầu"];
  } else if (
    fullText.includes("giáng sinh") ||
    fullText.includes("noel") ||
    fullText.includes("christmas")
  ) {
    occasionCode = "christmas";
    occasionLabel = "Lễ Giáng sinh (Noel)";
    occasionKeywords = ["giáng sinh", "noel", "quả cầu tuyết", "khăn len", "tất"];
  } else if (
    fullText.includes("kỷ niệm") ||
    fullText.includes("anniversary") ||
    fullText.includes("ngày cưới")
  ) {
    occasionCode = "anniversary";
    occasionLabel = "Dịp kỷ niệm";
    occasionKeywords = ["kỷ niệm", "tình nhân", "người yêu", "lãng mạn", "hộp quà"];
  } else if (fullText.includes("thăng chức")) {
    occasionCode = "promotion";
    occasionLabel = "Mừng thăng chức";
    occasionKeywords = ["bút ký", "sếp", "công sở", "cao cấp", "sang trọng"];
  } else if (
    hasWholeWord(fullText, "tết") ||
    fullText.includes("năm mới") ||
    hasWholeWord(fullText, "xuân")
  ) {
    occasionCode = "tet";
    occasionLabel = "Lễ Tết / Năm mới";
    occasionKeywords = ["quà tết", "yến sào", "hồng sâm", "trà", "hạt dinh dưỡng"];
  } else if (
    fullText.includes("sinh nhật") ||
    fullText.includes("birthday")
  ) {
    occasionCode = "birthday";
    occasionLabel = "Sinh nhật";
    occasionKeywords = ["sinh nhật", "quà tặng", "hộp quà"];
  } else if (
    fullText.includes("halloween") ||
    fullText.includes("hóa trang") ||
    fullText.includes("bí ngô")
  ) {
    occasionCode = "halloween";
    occasionLabel = "Lễ hội Halloween";
    occasionKeywords = ["halloween", "hóa trang", "bí ngô", "mặt nạ", "kẹo", "đèn bí ngô", "áo choàng"];
  }

  // 2. Nhận diện Đối tượng nhận (Recipient / Relationship) & Giới tính
  let recipientCode = "";
  let recipientLabel = relationship || "";
  let recipientKeywords = [];
  let effectiveGender =
    genNorm.includes("nữ")
      ? "Nữ"
      : genNorm.includes("nam")
      ? "Nam"
      : impliedGenderFromOccasion || "";

  if (
    hasWholeWord(fullText, "mẹ") ||
    hasWholeWord(fullText, "má") ||
    hasWholeWord(fullText, "bà") ||
    fullText.includes("mẫu thân") ||
    (relNorm.includes("bố / mẹ") && effectiveGender === "Nữ" && !hasWholeWord(descNorm, "bố"))
  ) {
    recipientCode = "mother";
    recipientLabel = "Mẹ / Bà";
    effectiveGender = "Nữ";
    recipientKeywords = ["mẹ", "bà", "trung niên", "sức khỏe", "20/10", "8/3"];
  } else if (
    hasWholeWord(fullText, "bố") ||
    hasWholeWord(fullText, "ba") ||
    hasWholeWord(fullText, "cha") ||
    hasWholeWord(fullText, "ông") ||
    (relNorm.includes("bố / mẹ") && effectiveGender === "Nam")
  ) {
    recipientCode = "father";
    recipientLabel = "Bố / Ông";
    effectiveGender = "Nam";
    recipientKeywords = ["bố", "ông", "sức khỏe", "trà", "massage"];
  } else if (
    fullText.includes("bố mẹ") ||
    relNorm.includes("bố / mẹ") ||
    fullText.includes("ông bà") ||
    fullText.includes("gia đình")
  ) {
    recipientCode = "parents";
    recipientLabel = "Bố mẹ / Gia đình";
    recipientKeywords = ["bố mẹ", "sức khỏe", "gia đình", "yến sào", "massage"];
  } else if (
    fullText.includes("bạn gái") ||
    fullText.includes("girlfriend") ||
    hasWholeWord(fullText, "vợ") ||
    fullText.includes("bà xã") ||
    hasWholeWord(fullText, "nàng") ||
    fullText.includes("crush nữ") ||
    ((fullText.includes("người yêu") || fullText.includes("crush") || relNorm.includes("vợ / chồng")) &&
      effectiveGender !== "Nam")
  ) {
    recipientCode = "female_partner";
    recipientLabel = hasWholeWord(fullText, "vợ") ? "Vợ" : "Bạn gái / Người yêu";
    effectiveGender = "Nữ";
    recipientKeywords = ["bạn gái", "người yêu", "nữ", "vợ", "lãng mạn"];
  } else if (
    fullText.includes("bạn trai") ||
    fullText.includes("boyfriend") ||
    hasWholeWord(fullText, "chồng") ||
    fullText.includes("ông xã") ||
    hasWholeWord(fullText, "chàng") ||
    fullText.includes("crush nam") ||
    ((fullText.includes("người yêu") || fullText.includes("crush") || relNorm.includes("vợ / chồng")) &&
      effectiveGender === "Nam")
  ) {
    recipientCode = "male_partner";
    recipientLabel = hasWholeWord(fullText, "chồng") ? "Chồng" : "Bạn trai / Người yêu";
    effectiveGender = "Nam";
    recipientKeywords = ["bạn trai", "nam", "chồng", "lịch lãm"];
  } else if (fullText.includes("cô giáo")) {
    recipientCode = "female_teacher";
    recipientLabel = "Cô giáo";
    effectiveGender = "Nữ";
    recipientKeywords = ["cô giáo", "20/11", "thầy cô", "nữ"];
  } else if (
    fullText.includes("thầy giáo") ||
    fullText.includes("thầy cô") ||
    fullText.includes("giáo viên")
  ) {
    recipientCode = "teacher";
    recipientLabel = "Thầy / Cô giáo";
    recipientKeywords = ["thầy cô", "20/11", "bút ký", "sổ tay"];
  } else if (
    hasWholeWord(fullText, "sếp") ||
    fullText.includes("lãnh đạo") ||
    fullText.includes("đối tác") ||
    fullText.includes("khách hàng")
  ) {
    recipientCode = "boss";
    recipientLabel = "Sếp / Đối tác";
    recipientKeywords = ["sếp", "công sở", "cao cấp", "bút ký", "trà"];
  } else if (
    fullText.includes("chị gái") ||
    fullText.includes("em gái") ||
    fullText.includes("bạn nữ") ||
    fullText.includes("bạn thân nữ") ||
    fullText.includes("đồng nghiệp nữ") ||
    ((fullText.includes("bạn") || fullText.includes("đồng nghiệp") || fullText.includes("anh / chị / em")) &&
      effectiveGender === "Nữ")
  ) {
    recipientCode = "female_peer";
    recipientLabel = fullText.includes("chị")
      ? "Chị gái"
      : fullText.includes("em gái")
      ? "Em gái"
      : "Bạn nữ / Đồng nghiệp nữ";
    effectiveGender = "Nữ";
    recipientKeywords = ["nữ", "bạn gái", "20/10", "8/3", "dễ thương"];
  } else if (
    fullText.includes("anh trai") ||
    fullText.includes("em trai") ||
    fullText.includes("bạn nam") ||
    ((fullText.includes("bạn") || fullText.includes("đồng nghiệp") || fullText.includes("anh / chị / em")) &&
      effectiveGender === "Nam")
  ) {
    recipientCode = "male_peer";
    recipientLabel = fullText.includes("em trai")
      ? "Em trai"
      : fullText.includes("anh trai")
      ? "Anh trai"
      : "Bạn nam / Đồng nghiệp nam";
    effectiveGender = "Nam";
    recipientKeywords = ["nam", "bạn trai", "công nghệ", "thể thao"];
  } else if (
    fullText.includes("bạn") ||
    fullText.includes("đồng nghiệp")
  ) {
    recipientCode = "friend_colleague";
    recipientLabel = "Bạn bè / Đồng nghiệp";
    recipientKeywords = ["bạn bè", "đồng nghiệp", "quà tặng"];
  }

  // Nếu dịp là 20/10 hoặc 8/3 mà chưa rõ người nhận, mặc định là phái nữ / bạn gái
  if (!recipientCode && (occasionCode === "20/10" || occasionCode === "8/3")) {
    recipientCode = "female_partner";
    recipientLabel = "Phái đẹp (Bạn gái / Vợ / Mẹ)";
    effectiveGender = "Nữ";
    recipientKeywords = ["bạn gái", "nữ", "20/10", "8/3", "phụ nữ"];
  }

  // 3. Phân tích Ngân sách (Budget)
  let minPrice = null;
  let maxPrice = null;
  if (budNorm.includes("dưới 100") || fullText.includes("dưới 100k")) {
    maxPrice = 120000;
  } else if (budNorm.includes("100.000đ - 300.000đ") || fullText.includes("dưới 200k") || fullText.includes("dưới 300k")) {
    minPrice = 80000;
    maxPrice = 320000;
  } else if (
    budNorm.includes("300.000đ - 500.000đ") ||
    fullText.includes("dưới 500k") ||
    fullText.includes("under 50")
  ) {
    minPrice = 80000;
    maxPrice = 550000;
  } else if (budNorm.includes("500.000đ - 1.000.000đ") || fullText.includes("500k - 1 triệu") || fullText.includes("dưới 1 triệu")) {
    minPrice = 350000;
    maxPrice = 1100000;
  } else if (budNorm.includes("trên 1.000.000đ") || fullText.includes("trên 1 triệu")) {
    minPrice = 850000;
  }

  // 4. Kiểm tra xem người dùng có thực sự yêu cầu đèn / gaming / mô hình hay không
  const allowLampOrGaming =
    hasWholeWord(fullText, "đèn") ||
    hasWholeWord(fullText, "led") ||
    fullText.includes("pixel") ||
    fullText.includes("minecraft") ||
    hasWholeWord(fullText, "game") ||
    fullText.includes("gaming") ||
    fullText.includes("mô hình");

  // 5. Nhận diện các món đồ cụ thể nếu người dùng có nhắc trực tiếp trong câu mô tả
  const SPECIFIC_PRODUCT_DICTIONARY = [
    "son môi",
    "son kem",
    "son dưỡng",
    "nước hoa",
    "hoa sáp",
    "hoa hồng",
    "bó hoa",
    "dây chuyền",
    "vòng tay",
    "lắc tay",
    "bông tai",
    "nhẫn",
    "trang sức",
    "túi xách",
    "ví da",
    "ví nữ",
    "ví nam",
    "thắt lưng",
    "đồng hồ",
    "nến thơm",
    "tinh dầu",
    "gấu bông",
    "thú bông",
    "capybara",
    "socola",
    "máy rửa mặt",
    "mỹ phẩm",
    "skincare",
    "kem dưỡng",
    "sữa tắm",
    "máy sấy tóc",
    "gương trang điểm",
    "kẹp tóc",
    "túi chườm",
    "máy cạo râu",
    "áo polo",
    "áo sơ mi",
    "cà vạt",
    "tai nghe",
    "loa bluetooth",
    "bàn phím",
    "chuột gaming",
    "tay cầm chơi game",
    "sạc dự phòng",
    "máy ảnh",
    "máy massage",
    "gối massage",
    "bồn ngâm chân",
    "máy đo huyết áp",
    "yến sào",
    "hồng sâm",
    "nhân sâm",
    "trà hoa",
    "trà ô long",
    "ấm chén",
    "khăn choàng",
    "khăn lụa",
    "khăn len",
    "cài áo",
    "bút ký",
    "sổ tay",
    "bình giữ nhiệt",
    "cặp da",
    "cốc sứ",
    "gối tựa lưng",
    "bát đĩa",
    "quả cầu tuyết",
    "hộp nhạc",
    "khung ảnh",
    "cà phê",
    "balo",
    "thảm tập yoga",
    "vợt cầu lông",
    "đèn bàn",
    "đèn ngủ",
    "mô hình",
  ];

  const explicitItems = [];
  for (const prod of SPECIFIC_PRODUCT_DICTIONARY) {
    if (descNorm.includes(prod)) {
      explicitItems.push(prod);
    }
  }
  if (hasWholeWord(descNorm, "son") && !explicitItems.some((x) => x.includes("son"))) {
    explicitItems.push("son môi");
  }
  if (hasWholeWord(descNorm, "sách") && !explicitItems.includes("sách")) {
    explicitItems.push("sách");
  }

  // 6. Ánh xạ Mục tiêu chính (Đối tượng + Dịp + Sở thích) -> Danh sách món quà, danh mục & truy vấn chuẩn xác
  let goalItems = [];
  let goalCategories = [];
  let goalSearchQueries = [];
  let forbiddenTerms = [];

  if (recipientCode === "female_partner") {
    goalCategories = [
      "Quà 20/10 & 8/3",
      "Hoa & Quà Lãng Mạn",
      "Mỹ Phẩm & Làm Đẹp",
      "Trang Sức & Phụ Kiện Nữ",
      "Nước Hoa & Làm Đẹp",
      "Thời Trang Nữ",
      "Nến Thơm & Thư Giãn",
      "Gấu Bông & Quà Cute",
      "Quà Valentine & Kỷ Niệm",
      "Chăm Sóc Sức Khỏe",
    ];
    forbiddenTerms = [
      "ví da bò nam",
      "ví nam",
      "thắt lưng da nam",
      "dây nịt nam",
      "cạo râu",
      "cà vạt",
      "áo polo nam",
      "áo sơ mi nam",
      "nước hoa nam",
      "đồng hồ nam",
      "đồng hồ đeo tay nam",
      "bố mẹ",
      "máy đo huyết áp",
      "trung niên",
      "tặng mẹ",
      "người già",
      "cao tuổi",
      "yến chưng",
    ];

    if (occasionCode === "christmas") {
      goalCategories = [
        "Quà Giáng Sinh & Lưu Niệm",
        "Nến Thơm & Thư Giãn",
        "Thời Trang & Quà Mẹ",
        "Gấu Bông & Quà Cute",
        "Văn Phòng & Cafe",
        "Trang Sức & Phụ Kiện Nữ",
        "Nước Hoa & Làm Đẹp",
        "Mỹ Phẩm & Làm Đẹp",
      ];
      goalItems = [
        "quả cầu tuyết",
        "khăn choàng cổ len",
        "set nến thơm",
        "cốc sứ giữ nhiệt",
        "set tất giáng sinh",
        "gấu bông",
        "dây chuyền bạc",
        "son môi",
      ];
      goalSearchQueries = [
        "quả cầu tuyết phát nhạc noel giáng sinh",
        "khăn choàng cổ len ấm áp hộp quà bạn gái",
        "set nến thơm tinh dầu thư giãn mùa đông",
        "cốc sứ giữ nhiệt họa tiết giáng sinh",
      ];
    } else if (occasionCode === "tet") {
      goalCategories = [
        "Quà Sức Khỏe Cao Cấp",
        "Trà & Sức Khỏe",
        "Trang Sức & Phụ Kiện Nữ",
        "Thời Trang Nữ",
        "Mỹ Phẩm & Làm Đẹp",
        "Gia Dụng & Trà Đạo",
        "Văn Phòng & Cafe",
      ];
      goalItems = [
        "yến sào chưng sẵn",
        "trà hoa thảo mộc",
        "dây chuyền cỏ 4 lá",
        "son môi",
        "túi xách nữ",
        "hồng sâm hàn quốc",
        "bình giữ nhiệt",
      ];
      goalSearchQueries = [
        "hộp quà yến sào cao cấp biếu tết",
        "set trà hoa thảo mộc thanh lọc cao cấp",
        "dây chuyền bạc nữ cỏ 4 lá may mắn",
        "son môi chính hãng quà tặng bạn gái tết",
      ];
    } else if (occasionCode === "birthday") {
      goalCategories = [
        "Mỹ Phẩm & Làm Đẹp",
        "Trang Sức & Phụ Kiện Nữ",
        "Thời Trang Nữ",
        "Nước Hoa & Làm Đẹp",
        "Gấu Bông & Quà Cute",
        "Nến Thơm & Thư Giãn",
        "Công Nghệ & Âm Thanh",
        "Hoa & Quà Lãng Mạn",
      ];
      goalItems = [
        "son môi",
        "dây chuyền bạc",
        "túi xách nữ",
        "nước hoa nữ",
        "gấu bông",
        "nến thơm",
        "tai nghe bluetooth",
        "lắc tay bạc",
      ];
      goalSearchQueries = [
        "son môi chính hãng quà sinh nhật bạn gái",
        "dây chuyền bạc nữ s925 quà sinh nhật",
        "túi xách nữ đeo chéo thời trang",
        "gấu bông teddy mềm mịn cao cấp",
      ];
    } else if (occasionCode === "valentine" || occasionCode === "anniversary") {
      goalCategories = [
        "Quà Valentine & Kỷ Niệm",
        "Trang Sức & Phụ Kiện Nữ",
        "Nước Hoa & Làm Đẹp",
        "Hoa & Quà Lãng Mạn",
        "Mỹ Phẩm & Làm Đẹp",
        "Nến Thơm & Thư Giãn",
        "Quà Lưu Niệm & Kỷ Niệm",
        "Gấu Bông & Quà Cute",
      ];
      goalItems = [
        "socola valentine",
        "nhẫn đôi",
        "dây chuyền bạc",
        "nước hoa nữ",
        "hoa hồng sáp",
        "son môi",
        "khung ảnh kỷ niệm",
        "nến thơm",
      ];
      goalSearchQueries = [
        "hộp quà socola valentine ngọt ngào",
        "dây chuyền bạc nữ s925 mặt cỏ 4 lá",
        "hoa hồng sáp thơm hộp quà tặng bạn gái",
        "nhẫn đôi bạc s925 tình nhân",
      ];
    } else if (occasionCode === "20/10") {
      goalCategories = [
        "Quà 20/10 & 8/3",
        "Hoa & Quà Lãng Mạn",
        "Mỹ Phẩm & Làm Đẹp",
        "Nước Hoa & Làm Đẹp",
        "Trang Sức & Phụ Kiện Nữ",
        "Nến Thơm & Thư Giãn",
        "Thời Trang Nữ",
        "Chăm Sóc Sức Khỏe",
      ];
      goalItems = [
        "set quà 20/10",
        "hoa hồng sáp",
        "son môi",
        "nước hoa nữ",
        "dây chuyền bạc",
        "túi xách nữ",
        "túi chườm nóng",
        "nến thơm",
      ];
      goalSearchQueries = [
        "set quà tặng bạn gái 20/10",
        "hoa hồng sáp thơm hộp quà tặng bạn gái",
        "nước hoa nữ chính hãng thơm lâu",
        "dây chuyền bạc nữ s925 mặt cỏ 4 lá",
      ];
    } else if (occasionCode === "8/3") {
      goalCategories = [
        "Quà 20/10 & 8/3",
        "Hoa & Quà Lãng Mạn",
        "Mỹ Phẩm & Làm Đẹp",
        "Trang Sức & Phụ Kiện Nữ",
        "Nước Hoa & Làm Đẹp",
        "Thời Trang Nữ",
        "Nến Thơm & Thư Giãn",
        "Gấu Bông & Quà Cute",
      ];
      goalItems = [
        "set quà 8/3",
        "hoa hồng sáp",
        "son môi",
        "dây chuyền bạc",
        "nước hoa nữ",
        "lắc tay bạc",
        "túi xách nữ",
        "nến thơm",
      ];
      goalSearchQueries = [
        "set quà tặng 8/3 cho bạn gái",
        "son môi chính hãng quà tặng bạn gái",
        "nước hoa nữ chính hãng thơm lâu",
        "hoa hồng sáp thơm hộp quà tặng bạn gái",
      ];
    } else if (occasionCode === "halloween") {
      goalCategories = [
        "Quà Halloween & Hóa Trang",
        "Gấu Bông & Quà Cute",
        "Nến Thơm & Thư Giãn",
        "Văn Phòng & Cafe",
        "Thời Trang & Phụ Kiện",
      ];
      goalItems = [
        "cốc sứ quả bí ngô",
        "gấu bông bí ngô halloween",
        "băng đô cài tóc bí ngô",
        "kẹo mút halloween",
        "nến thơm hình quả bí ngô",
        "đèn bí ngô phát sáng",
        "móc khóa halloween",
      ];
      goalSearchQueries = [
        "cốc sứ bí ngô halloween",
        "gấu bông bí ngô halloween cute",
        "băng đô cài tóc bí ngô",
        "đèn bí ngô halloween phát sáng",
      ];
    } else {
      goalCategories = [
        "Mỹ Phẩm & Làm Đẹp",
        "Trang Sức & Phụ Kiện Nữ",
        "Nước Hoa & Làm Đẹp",
        "Gấu Bông & Quà Cute",
        "Nến Thơm & Thư Giãn",
        "Thời Trang Nữ",
        "Hoa & Quà Lãng Mạn",
        "Công Nghệ & Âm Thanh",
      ];
      goalItems = [
        "son môi",
        "dây chuyền bạc",
        "nước hoa nữ",
        "gấu bông",
        "nến thơm",
        "túi xách nữ",
        "tai nghe bluetooth",
        "hoa hồng sáp",
      ];
      goalSearchQueries = [
        "son môi chính hãng quà tặng bạn gái",
        "dây chuyền bạc nữ s925 mặt cỏ 4 lá",
        "gấu bông teddy mềm mịn cao cấp",
        "túi xách nữ đeo chéo thời trang",
      ];
    }
  } else if (recipientCode === "male_partner" || recipientCode === "male_peer") {
    if (occasionCode === "christmas") {
      goalCategories = [
        "Thời Trang & Quà Mẹ",
        "Công Nghệ & Âm Thanh",
        "Phụ Kiện Nam",
        "Nước Hoa Nam",
        "Văn Phòng & Cafe",
        "Thời Trang Nam",
      ];
      goalItems = [
        "khăn choàng cổ len nam",
        "tai nghe bluetooth",
        "cốc sứ giữ nhiệt",
        "ví da nam",
        "nước hoa nam",
        "thắt lưng da",
      ];
      goalSearchQueries = [
        "khăn len nam mùa đông ấm áp hộp quà",
        "tai nghe bluetooth không dây chống ồn",
        "cốc sứ giữ nhiệt văn phòng cao cấp",
        "ví da bò nam cao cấp hộp quà tặng",
      ];
    } else if (occasionCode === "tet") {
      goalCategories = [
        "Quà Sức Khỏe Cao Cấp",
        "Phụ Kiện Nam",
        "Trà & Sức Khỏe",
        "Thời Trang Nam",
        "Gia Dụng & Trà Đạo",
      ];
      goalItems = [
        "yến sào",
        "ví da nam",
        "trà ô long",
        "thắt lưng da",
        "bộ ấm chén trà",
        "áo polo nam",
      ];
      goalSearchQueries = [
        "hộp quà yến sào cao cấp biếu tết",
        "ví da bò nam cao cấp đón tết tài lộc",
        "hộp quà trà ô long thượng hạng",
        "thắt lưng da nam cao cấp",
      ];
    } else if (occasionCode === "birthday") {
      goalCategories = [
        "Phụ Kiện Nam",
        "Đồng Hồ & Phụ Kiện Nam",
        "Công Nghệ & Âm Thanh",
        "Chăm Sóc Nam Giới",
        "Nước Hoa Nam",
        "Thời Trang Nam",
        "Gaming & Công Nghệ",
      ];
      goalItems = [
        "ví da nam",
        "đồng hồ nam",
        "thắt lưng da",
        "tai nghe bluetooth",
        "máy cạo râu",
        "nước hoa nam",
        "áo polo nam",
      ];
      goalSearchQueries = [
        "ví da bò nam cao cấp hộp quà tặng",
        "đồng hồ đeo tay nam chính hãng lịch lãm",
        "thắt lưng da nam cao cấp kèm hộp quà",
        "máy cạo râu mini chống nước",
      ];
    } else if (occasionCode === "valentine" || occasionCode === "anniversary") {
      goalCategories = [
        "Phụ Kiện Nam",
        "Đồng Hồ & Phụ Kiện Nam",
        "Nước Hoa Nam",
        "Quà Valentine & Kỷ Niệm",
        "Thời Trang Nam",
        "Công Nghệ & Âm Thanh",
      ];
      goalItems = [
        "ví da nam",
        "nước hoa nam",
        "đồng hồ nam",
        "nhẫn đôi",
        "thắt lưng da",
        "tai nghe bluetooth",
      ];
      goalSearchQueries = [
        "ví da bò nam cao cấp khắc tên",
        "nước hoa nam chính hãng lịch lãm nam tính",
        "đồng hồ đeo tay nam chính hãng",
        "nhẫn đôi bạc s925 tình nhân",
      ];
    } else if (occasionCode === "halloween") {
      goalCategories = [
        "Quà Halloween & Hóa Trang",
        "Thời Trang & Phụ Kiện",
        "Gaming & Công Nghệ",
      ];
      goalItems = [
        "mặt nạ hóa trang halloween",
        "áo choàng ma cà rồng",
        "cốc sứ bí ngô",
        "móc khóa halloween",
        "đèn bí ngô phát sáng",
      ];
      goalSearchQueries = [
        "mặt nạ halloween nam kinh dị",
        "áo choàng phù thủy halloween",
        "quà tặng halloween độc lạ",
      ];
    } else {
      goalCategories = [
        "Phụ Kiện Nam",
        "Đồng Hồ & Phụ Kiện Nam",
        "Nước Hoa Nam",
        "Chăm Sóc Nam Giới",
        "Thời Trang Nam",
        "Công Nghệ & Âm Thanh",
        "Gaming & Công Nghệ",
        "Công Nghệ & Thể Thao",
      ];
      goalItems = [
        "ví da nam",
        "đồng hồ nam",
        "thắt lưng da",
        "nước hoa nam",
        "tai nghe bluetooth",
        "máy cạo râu",
        "áo polo nam",
        "loa bluetooth",
      ];
      goalSearchQueries = [
        "ví da bò nam cao cấp hộp quà tặng",
        "đồng hồ đeo tay nam chính hãng lịch lãm",
        "thắt lưng da nam cao cấp kèm hộp quà",
        "nước hoa nam chính hãng lịch lãm nam tính",
      ];
    }
    forbiddenTerms = [
      "son môi",
      "son kem",
      "son dưỡng",
      "bông tai",
      "kẹp tóc",
      "túi xách nữ",
      "nước hoa nữ",
      "dây chuyền bạc nữ",
      "lắc tay bạc nữ",
      "kinh nguyệt",
      "váy",
      "mỹ phẩm dưỡng da",
    ];
  } else if (recipientCode === "mother") {
    goalCategories = [
      "Sức Khỏe & Gia Đình",
      "Quà Sức Khỏe Cao Cấp",
      "Thời Trang & Quà Mẹ",
      "Trà & Sức Khỏe",
      "Gia Dụng & Trà Đạo",
      "Quà 20/10 & 8/3",
    ];
    forbiddenTerms = [
      "gaming",
      "game thủ",
      "tay cầm chơi game",
      "chuột gaming",
      "bàn phím cơ",
      "nhẫn đôi",
      "bạn trai",
      "cạo râu",
    ];
    goalItems = [
      "máy massage cổ vai gáy",
      "khăn choàng lụa",
      "yến sào",
      "túi xách tặng mẹ",
      "bồn ngâm chân",
      "trà hoa thảo mộc",
      "cài áo hoa",
      "hồng sâm",
    ];
    goalSearchQueries = [
      "máy massage cổ vai gáy hồng ngoại cao cấp",
      "khăn choàng cổ lụa tơ tằm cao cấp hộp quà",
      "hộp quà yến sào chưng sẵn cao cấp biếu tặng",
      "túi xách nữ tặng mẹ trung niên sang trọng",
    ];
  } else if (recipientCode === "father" || recipientCode === "parents") {
    goalCategories = [
      "Sức Khỏe & Gia Đình",
      "Quà Sức Khỏe Cao Cấp",
      "Gia Dụng & Trà Đạo",
      "Trà & Sức Khỏe",
      "Phụ Kiện Nam",
    ];
    forbiddenTerms = [
      "son môi",
      "gấu bông",
      "kẹp tóc",
      "bông tai",
      "túi xách nữ",
      "gaming",
    ];
    goalItems = [
      "máy massage cổ vai gáy",
      "bộ ấm chén trà",
      "hồng sâm hàn quốc",
      "yến sào",
      "máy đo huyết áp",
      "bồn ngâm chân",
      "trà ô long",
      "thắt lưng da",
    ];
    goalSearchQueries = [
      "máy massage cổ vai gáy hồng ngoại cao cấp",
      "bộ ấm chén uống trà gốm sứ cao cấp hộp quà",
      "hộp quà nước hồng sâm hàn quốc cao cấp",
      "máy đo huyết áp điện tử bắp tay chính hãng",
    ];
  } else if (
    recipientCode === "female_teacher" ||
    recipientCode === "teacher" ||
    occasionCode === "20/11"
  ) {
    goalCategories = [
      "Quà Công Sở & Tri Ân",
      "Thời Trang & Quà Mẹ",
      "Văn Phòng & Đời Sống",
      "Trà & Sức Khỏe",
      "Trang Sức & Phụ Kiện Nữ",
    ];
    forbiddenTerms = ["gaming", "chuột gaming", "tay cầm chơi game", "cạo râu"];
    goalItems = [
      "bút ký khắc tên",
      "sổ tay bìa da",
      "bình giữ nhiệt",
      "khăn choàng lụa",
      "cài áo hoa",
      "trà hoa thảo mộc",
      "cặp da công sở",
    ];
    goalSearchQueries = [
      "set quà sổ tay bìa da và bút ký kèm bình giữ nhiệt",
      "bút ký cao cấp khắc tên kèm hộp sang trọng",
      "khăn choàng cổ lụa tơ tằm cao cấp hộp quà",
      "cài áo hoa pha lê cao cấp hộp quà",
    ];
  } else if (recipientCode === "boss" || occasionCode === "promotion") {
    goalCategories = [
      "Quà Công Sở & Tri Ân",
      "Gia Dụng & Trà Đạo",
      "Trà & Sức Khỏe",
      "Quà Sức Khỏe Cao Cấp",
      "Văn Phòng & Cafe",
    ];
    forbiddenTerms = ["gấu bông", "kẹp tóc", "tất vớ", "gaming"];
    goalItems = [
      "bút ký cao cấp",
      "sổ tay bìa da",
      "bộ ấm chén gốm sứ",
      "trà ô long",
      "hồng sâm hàn quốc",
      "cặp da công sở",
      "yến sào",
    ];
    goalSearchQueries = [
      "bút ký cao cấp khắc tên kèm hộp sang trọng",
      "bộ ấm chén uống trà gốm sứ cao cấp hộp quà",
      "hộp quà trà ô long thượng hạng biếu tặng",
      "cặp da công sở đựng laptop cao cấp",
    ];
  } else if (occasionCode === "graduation") {
    goalCategories = [
      "Quà Tốt Nghiệp",
      "Quà Lưu Niệm & Kỷ Niệm",
      "Quà Công Sở & Tri Ân",
      "Thời Trang & Phụ Kiện",
    ];
    goalItems = [
      "hoa hướng dương tốt nghiệp",
      "gấu bông cử nhân",
      "khung ảnh kỷ niệm",
      "bút ký khắc tên",
      "balo laptop",
      "sổ tay",
    ];
    goalSearchQueries = [
      "bó hoa hướng dương len móc thủ công quà tốt nghiệp",
      "album khung ảnh kỷ niệm để bàn",
      "bút ký cao cấp khắc tên kèm hộp sang trọng",
      "balo laptop thời trang chống thấm nước",
    ];
  } else if (occasionCode === "housewarming") {
    goalCategories = [
      "Quà Tân Gia & Gia Dụng",
      "Quà Tân Gia & Thư Giãn",
      "Gia Dụng & Trà Đạo",
      "Nến Thơm & Thư Giãn",
    ];
    goalItems = [
      "bộ bát đĩa gốm sứ",
      "máy xông tinh dầu",
      "bộ ấm chén trà",
      "bộ bình cốc thủy tinh",
      "nến thơm",
    ];
    goalSearchQueries = [
      "bộ bát đĩa gốm sứ cao cấp hộp quà tân gia",
      "máy xông khuếch tán tinh dầu siêu âm vân gỗ",
      "bộ ấm chén uống trà gốm sứ cao cấp hộp quà",
      "bộ bình cốc thủy tinh chịu nhiệt cao cấp",
    ];
  } else if (occasionCode === "christmas") {
    goalCategories = [
      "Quà Giáng Sinh & Lưu Niệm",
      "Quà Giáng Sinh & Thời Trang",
      "Nến Thơm & Thư Giãn",
      "Gấu Bông & Quà Cute",
    ];
    goalItems = [
      "khăn choàng cổ len",
      "set tất giáng sinh",
      "quả cầu tuyết",
      "nến thơm",
      "gấu bông",
      "cốc sứ giữ nhiệt",
    ];
    goalSearchQueries = [
      "khăn choàng cổ len cashmere ấm áp hộp quà",
      "set tất vớ len giáng sinh noel hộp quà",
      "quả cầu tuyết phát nhạc có đèn quà giáng sinh",
      "set nến thơm tinh dầu thư giãn hộp quà",
    ];
  } else if (occasionCode === "halloween") {
    goalCategories = [
      "Quà Halloween & Hóa Trang",
      "Gấu Bông & Quà Cute",
      "Thời Trang & Phụ Kiện",
      "Gia Dụng & Đời Sống",
      "Nến Thơm & Thư Giãn",
    ];
    goalItems = [
      "đèn bí ngô phát sáng",
      "mặt nạ hóa trang halloween",
      "áo choàng phù thủy",
      "kẹo mút halloween",
      "băng đô cài tóc bí ngô",
      "gấu bông bí ngô",
      "cốc sứ quả bí ngô",
      "đồ chơi phát sáng halloween",
      "móc khóa halloween",
    ];
    goalSearchQueries = [
      "đèn bí ngô halloween phát sáng",
      "mặt nạ hóa trang halloween",
      "áo choàng phù thủy halloween",
      "kẹo mút halloween",
    ];
  } else if (recipientCode === "female_peer") {
    goalCategories = [
      "Quà 20/10 & 8/3",
      "Mỹ Phẩm & Làm Đẹp",
      "Trang Sức & Phụ Kiện Nữ",
      "Nến Thơm & Thư Giãn",
      "Gấu Bông & Quà Cute",
      "Thời Trang Nữ",
    ];
    goalItems = [
      "son môi",
      "set nến thơm",
      "kẹp tóc ngọc trai",
      "kem dưỡng da tay",
      "gấu bông",
      "túi xách nữ",
      "bình giữ nhiệt",
    ];
    goalSearchQueries = [
      "set quà tặng 20/10 cho nữ",
      "set nến thơm tinh dầu thư giãn hộp quà",
      "son môi chính hãng quà tặng bạn gái",
      "gấu bông capybara dễ thương",
    ];
  }

  // 7. Bổ sung theo Sở thích (Interests) nếu người dùng chọn
  if (fullText.includes("sách") || fullText.includes("book")) {
    goalItems.unshift("sách hay");
    goalCategories.unshift("Sách & Tri Thức");
    goalSearchQueries.unshift("sách nhà giả kim cây cam ngọt của tôi");
  }
  if (fullText.includes("làm đẹp") || fullText.includes("mỹ phẩm")) {
    goalItems.unshift("son môi", "mỹ phẩm dưỡng da", "nước hoa");
    goalCategories.unshift("Mỹ Phẩm & Làm Đẹp", "Nước Hoa & Làm Đẹp");
  }
  if (fullText.includes("thời trang")) {
    if (effectiveGender === "Nam") {
      goalItems.unshift("áo polo nam", "ví da nam", "đồng hồ nam");
      goalCategories.unshift("Thời Trang Nam", "Phụ Kiện Nam");
    } else {
      goalItems.unshift("túi xách nữ", "khăn choàng", "đồng hồ nữ");
      goalCategories.unshift("Thời Trang Nữ", "Trang Sức & Phụ Kiện Nữ");
    }
  }
  if (fullText.includes("âm nhạc") || fullText.includes("nhạc")) {
    goalItems.unshift("tai nghe bluetooth", "loa bluetooth");
    goalCategories.unshift("Công Nghệ & Âm Thanh");
    goalSearchQueries.unshift("tai nghe bluetooth không dây chống ồn chính hãng");
  }
  if (fullText.includes("công nghệ") || fullText.includes("tech")) {
    goalItems.unshift("tai nghe bluetooth", "đồng hồ thông minh", "sạc dự phòng");
    goalCategories.unshift("Công Nghệ & Âm Thanh", "Công Nghệ & Thể Thao", "Công Nghệ & Phụ Kiện");
  }
  if (fullText.includes("gaming") || fullText.includes("game")) {
    goalItems.unshift("bàn phím cơ", "chuột gaming", "tay cầm chơi game");
    goalCategories.unshift("Gaming & Công Nghệ");
    goalSearchQueries.unshift("bàn phím cơ không dây led rgb gaming");
  }
  if (fullText.includes("cafe") || fullText.includes("cà phê")) {
    goalItems.unshift("cốc sứ giữ nhiệt", "máy pha cà phê", "cà phê đặc sản");
    goalCategories.unshift("Văn Phòng & Cafe");
    goalSearchQueries.unshift("cốc sứ giữ nhiệt kèm đế hâm nóng 55 độ hộp quà");
  }
  if (fullText.includes("thể thao") || fullText.includes("gym") || fullText.includes("yoga")) {
    goalItems.unshift("thảm tập yoga", "túi trống thể thao", "bình giữ nhiệt");
    goalCategories.unshift("Thể Thao & Sức Khỏe");
  }

  // Ưu tiên đưa các món đồ người dùng nêu đích danh lên đầu
  if (explicitItems.length > 0) {
    goalItems = [...explicitItems, ...goalItems];
  }

  goalItems = Array.from(new Set(goalItems)).slice(0, 8);
  goalCategories = Array.from(new Set(goalCategories));
  goalSearchQueries = Array.from(new Set(goalSearchQueries)).slice(0, 4);

  return {
    recipientCode,
    recipientLabel: recipientLabel || "Người thương",
    recipientKeywords,
    effectiveGender,
    occasionCode,
    occasionLabel: occasionLabel || "",
    occasionKeywords,
    minPrice,
    maxPrice,
    allowLampOrGaming,
    explicitItems,
    goalItems,
    goalCategories,
    goalSearchQueries,
    forbiddenTerms,
  };
}

// =====================================================
// FALLBACK SEARCH QUERIES
// =====================================================

function createFallbackSearchQueries(
  description,
  relationship,
  gender,
  age,
  occasion,
  budget,
  interests,
) {
  const goals = detectGiftGoals({
    description,
    relationship,
    gender,
    age,
    occasion,
    budget,
    interests,
  });

  if (goals.goalSearchQueries.length > 0) {
    return goals.goalSearchQueries.slice(0, 3);
  }

  if (goals.explicitItems.length > 0) {
    return goals.explicitItems.slice(0, 3).map((item) => `${item} hộp quà tặng`);
  }

  return [
    "set quà tặng bạn gái 20/10",
    "son môi chính hãng quà tặng bạn gái",
    "bình giữ nhiệt inox 304 hiển thị nhiệt độ hộp quà",
  ];
}

// =====================================================
// EXTRACT ATOMIC ITEMS (MÓN QUÀ CỤ THỂ ĐỂ TÌM TRONG CSDL)
// =====================================================

function extractAtomicItems(
  description,
  relationship,
  occasion,
  interests = [],
  aiItems = [],
  genderOrGoals = "",
  age = "",
  budget = "",
) {
  const goals =
    genderOrGoals &&
    typeof genderOrGoals === "object" &&
    Array.isArray(genderOrGoals.goalItems)
      ? genderOrGoals
      : detectGiftGoals({
          description,
          relationship,
          gender: typeof genderOrGoals === "string" ? genderOrGoals : "",
          age,
          occasion,
          budget,
          interests,
        });

  const extracted = new Set();

  // 1. Ưu tiên cao nhất: món đồ người dùng nêu trực tiếp trong mô tả
  for (const exp of goals.explicitItems) {
    extracted.add(normalizeKeyword(exp));
  }

  // 2. Món đồ gợi ý theo Mục tiêu chính (Đối tượng nhận + Nhân dịp + Sở thích)
  for (const gItem of goals.goalItems) {
    const norm = normalizeKeyword(gItem);
    if (!isGenericStopword(norm)) {
      extracted.add(norm);
    }
  }

  // 3. Các món đồ cụ thể do AI phân tích (loại bỏ từ chung chung như "quà", "quà tặng", và loại bỏ "đèn" nếu người dùng không yêu cầu)
  if (Array.isArray(aiItems)) {
    for (const item of aiItems) {
      const norm = normalizeKeyword(item);
      if (!norm || norm.length < 2 || norm.length > 30) continue;
      if (isGenericStopword(norm)) continue;
      if (
        !goals.allowLampOrGaming &&
        (norm.includes("đèn") || norm.includes("mô hình") || norm.includes("game"))
      ) {
        continue;
      }
      extracted.add(norm);
    }
  }

  const finalList = Array.from(extracted).slice(0, 8);
  return finalList.length > 0
    ? finalList
    : ["son môi", "hoa hồng sáp", "nước hoa", "dây chuyền bạc", "nến thơm"];
}

// =====================================================
// AI ANALYSIS (TẬP TRUNG VÀO MỤC TIÊU CHÍNH: ĐỐI TƯỢNG NHẬN & NHÂN DỊP)
// =====================================================

async function analyzeGiftRequest({
  description,
  relationship,
  gender,
  age,
  occasion,
  budget,
  interests,
}) {
  const goals = detectGiftGoals({
    description,
    relationship,
    gender,
    age,
    occasion,
    budget,
    interests,
  });

  const fallbackQueries = createFallbackSearchQueries(
    description,
    relationship,
    gender,
    age,
    occasion,
    budget,
    interests,
  );

  const fallbackKeywords = [
    goals.recipientLabel,
    goals.effectiveGender,
    age,
    goals.occasionLabel,
    budget,
    ...(Array.isArray(interests) ? interests : []),
  ]
    .filter(Boolean)
    .map((item) => String(item).trim())
    .filter(Boolean);

  if (fallbackKeywords.length < 3) {
    fallbackKeywords.push("Tinh tế", "Ý nghĩa", "Hộp quà sang trọng");
  }

  const fallbackItems = extractAtomicItems(
    description,
    relationship,
    occasion,
    interests,
    goals.goalItems,
    gender,
    age,
    budget,
  );

  const defaultSummaryParts = [];
  if (goals.recipientLabel) {
    defaultSummaryParts.push(`dành tặng ${goals.recipientLabel}`);
  }
  if (goals.occasionLabel) {
    defaultSummaryParts.push(`nhân dịp ${goals.occasionLabel}`);
  }
  if (budget) {
    defaultSummaryParts.push(`với ngân sách ${budget}`);
  }

  const fallbackSummary =
    defaultSummaryParts.length > 0
      ? `Phân tích mục tiêu quà tặng ${defaultSummaryParts.join(" ")}: Ưu tiên các món quà tinh tế, thiết thực và giàu cảm xúc như ${fallbackItems.slice(0, 5).join(", ")}.`
      : `Gợi ý các món quà tinh tế, ý nghĩa và phù hợp nhất với nhu cầu của bạn: ${fallbackItems.slice(0, 5).join(", ")}.`;

  const fallbackAI = {
    summary: fallbackSummary,
    items: fallbackItems,
    keywords: Array.from(new Set(fallbackKeywords)).slice(0, 8),
    searchQueries: fallbackQueries,
    goals,
  };

  try {
    const prompt = `
Bạn là chuyên gia tư vấn quà tặng thông minh hàng đầu tại Việt Nam.

NHIỆM VỤ CỐT LÕI:
Hãy phân tích sâu MỤC TIÊU CHÍNH của người dùng dựa trên:
1. ĐỐI TƯỢNG NHẬN QUÀ (Mối quan hệ: Bạn gái/Người yêu nữ, Bạn trai/Người yêu nam, Vợ, Chồng, Mẹ, Bố, Sếp, Thầy/Cô giáo, Bạn thân, Đồng nghiệp... + Giới tính + Độ tuổi).
2. NHÂN DỊP TẶNG QUÀ (20/10 Ngày Phụ nữ Việt Nam, 8/3 Quốc tế Phụ nữ, Valentine 14/2, Sinh nhật, Kỷ niệm, 20/11 Ngày Nhà giáo, Giáng sinh, Tốt nghiệp, Tân gia, Tết...).
3. SỞ THÍCH & NGÂN SÁCH.

Thông tin yêu cầu của người dùng:
- Mô tả tự nhiên: "${description || ""}"
- Mối quan hệ đã chọn: "${relationship || goals.recipientLabel || ""}"
- Giới tính người nhận: "${gender || goals.effectiveGender || ""}"
- Độ tuổi: "${age || ""}"
- Nhân dịp: "${occasion || goals.occasionLabel || ""}"
- Ngân sách: "${budget || ""}"
- Sở thích: "${getInterestText(interests)}"
- Gợi ý mục tiêu hệ thống đã nhận diện: Đối tượng = "${goals.recipientLabel || "Chưa rõ"}", Dịp = "${goals.occasionLabel || "Chung"}", Nhóm quà phù hợp = [${goals.goalItems.join(", ")}].

QUY TẮC BẮT BUỘC (TUYỆT ĐỐI TUÂN THỦ):
1. Trong "items":
   - Phải là danh sách từ 5 đến 8 TÊN MÓN QUÀ CỤ THỂ, HỢP LÝ NHẤT với đối tượng nhận và dịp tặng.
   - Ví dụ:
     + Quà cho bạn gái / người yêu / vợ dịp 20/10, 8/3, Valentine, Sinh nhật -> ["son môi", "hoa hồng sáp", "nước hoa nữ", "dây chuyền bạc", "túi xách nữ", "nến thơm", "gấu bông", "lắc tay bạc"].
     + Quà cho bạn trai / chồng -> ["ví da nam", "đồng hồ nam", "thắt lưng da", "nước hoa nam", "tai nghe bluetooth", "áo polo nam", "máy cạo râu"].
     + Quà cho mẹ / bố -> ["máy massage cổ vai gáy", "yến sào", "khăn choàng lụa", "bộ ấm chén trà", "hồng sâm", "bồn ngâm chân"].
     + Quà cho thầy cô 20/11 / sếp -> ["bút ký cao cấp", "sổ tay bìa da", "bình giữ nhiệt", "khăn choàng lụa", "trà ô long", "cặp da công sở"].
   - TUYỆT ĐỐI KHÔNG đưa các từ chung chung như "quà", "quà tặng", "món quà", "sản phẩm" vào "items".
   - TUYỆT ĐỐI KHÔNG gợi ý "đèn", "đèn bàn", "mô hình game" trừ khi người dùng nói rõ người nhận thích đèn decor hoặc chơi game!
2. Trong "keywords":
   - Tạo 4 đến 7 nhãn ngắn gọn thể hiện rõ Mục tiêu chính: Đối tượng nhận, Nhân dịp, Phong cách quà (ví dụ: ["Bạn gái", "Dịp 20/10", "Lãng mạn & Tinh tế", "Làm đẹp & Trang sức"]).
3. Trong "searchQueries":
   - Tạo ĐÚNG 3 cụm từ khóa tìm kiếm sản phẩm cụ thể trên sàn TMĐT Việt Nam (3-6 từ mỗi câu, tập trung vào tên sản phẩm quà tặng cụ thể cho đúng đối tượng và dịp).

Trả về JSON OBJECT thuần túy theo đúng cấu trúc:
{
  "summary": "Nhận xét tư vấn ngắn gọn (2-3 câu) tập trung vào đối tượng nhận, dịp tặng và lý do chọn các nhóm quà này.",
  "items": ["món quà cụ thể 1", "món quà cụ thể 2", "món quà cụ thể 3", "món quà cụ thể 4", "món quà cụ thể 5", "món quà cụ thể 6"],
  "keywords": ["Đối tượng...", "Nhân dịp...", "Phong cách..."],
  "searchQueries": ["truy vấn sản phẩm 1", "truy vấn sản phẩm 2", "truy vấn sản phẩm 3"]
}

Chỉ trả về JSON hợp lệ. Không markdown. Không giải thích bên ngoài JSON.
`;

    const raw = await askGemini(prompt, 1);
    const cleaned = cleanGeminiJSON(raw);
    const parsed = JSON.parse(cleaned);

    let searchQueries = normalizeSearchQueries(parsed.searchQueries).slice(0, 3);
    if (searchQueries.length === 0) {
      searchQueries = fallbackQueries;
    }

    const items = extractAtomicItems(
      description,
      relationship,
      occasion,
      interests,
      parsed.items,
      gender,
      age,
      budget,
    );

    const aiKeywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter(Boolean).slice(0, 8)
      : fallbackAI.keywords;

    return {
      summary: parsed.summary || fallbackAI.summary,
      items: items.length > 0 ? items : fallbackAI.items,
      keywords: aiKeywords.length > 0 ? aiKeywords : fallbackAI.keywords,
      searchQueries,
      goals,
    };
  } catch (error) {
    console.error("AI analysis failed or fallback used:", error.message);
    return fallbackAI;
  }
}

// =====================================================
// RANK PRODUCTS WITH GEMINI
// =====================================================

async function rankProductsWithGemini(
  products,
  userRequest,
  maxRecommendations = MAX_RECOMMENDATIONS,
) {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const limitedProducts = products.slice(0, MAX_PRODUCTS_FOR_AI);

  const prompt = `
Bạn là chuyên gia tư vấn quà tặng.

MỤC TIÊU TÌM QUÀ CỦA NGƯỜI DÙNG:
${typeof userRequest === "string" ? userRequest : JSON.stringify(userRequest, null, 2)}

DANH SÁCH ỨNG VIÊN SẢN PHẨM TRONG KHO:
${JSON.stringify(
  limitedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency,
    category: p.category,
    platform: p.platform,
  })),
)}

NHIỆM VỤ:
Hãy chọn ra tối đa ${maxRecommendations} món quà HỢP LÝ NHẤT, ĐA DẠNG NHẤT và ĐÚNG MỤC TIÊU NHẤT từ danh sách trên.

QUY TẮC CHẤM ĐIỂM & LỌC:
1. Ưu tiên tuyệt đối sản phẩm phù hợp với ĐỐI TƯỢNG NHẬN (ví dụ: bạn gái, vợ, mẹ, bạn trai, bố, sếp, cô giáo...) và NHÂN DỊP TẶNG (20/10, 8/3, Valentine, Sinh nhật, 20/11, Tốt nghiệp, Tân gia...).
2. LOẠI BỎ HOÀN TOÀN các sản phẩm lệch tông (ví dụ: tìm quà cho bạn gái dịp 20/10 thì KHÔNG ĐƯỢC chọn đèn LED mạch điện, đồ chơi trẻ em, đồ nam giới, phụ kiện gaming trừ khi được yêu cầu).
3. Đa dạng hóa các loại quà được chọn (ví dụ kết hợp cả set quà/hoa sáp, mỹ phẩm/son môi, trang sức bạc, nước hoa, túi xách, nến thơm... thay vì chọn 8 món giống hệt nhau).
4. "score": điểm độ hợp lý từ 80 đến 99.
5. "reason": viết 1 câu tiếng Việt tự nhiên, thuyết phục giải thích vì sao món quà này rất hợp để tặng cho người nhận trong dịp này.
6. Chỉ được chọn "id" có thực trong danh sách.

Trả về JSON ARRAY thuần túy:
[
  {
    "id": "product_id",
    "score": 96,
    "reason": "Lý do thuyết phục gắn với người nhận và dịp tặng"
  }
]

Không markdown. Không code fence. Không giải thích bên ngoài JSON.
`;

  try {
    const response = await askGemini(prompt, 0);
    const cleaned = cleanGeminiJSON(response);
    const ranking = JSON.parse(cleaned);

    if (!Array.isArray(ranking)) {
      return [];
    }

    const productMap = new Map(
      limitedProducts.map((product) => [String(product.id), product]),
    );

    return ranking
      .slice(0, maxRecommendations)
      .map((item) => {
        const product = productMap.get(String(item.id));
        if (!product) {
          return null;
        }

        return {
          ...product,
          score: Math.max(0, Math.min(100, Number(item.score) || 88)),
          reason:
            typeof item.reason === "string" && item.reason.trim()
              ? item.reason.trim()
              : product.reason,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("AI ranking error:", error?.message || String(error));
    return [];
  }
}

// =====================================================
// FALLBACK CARD WISHES GENERATOR
// =====================================================

function generateFallbackWishes({
  occasion = "",
  relationship = "",
  recipientName = "",
  senderName = "",
  giftName = "",
  tone = "Chân thành & Ấm áp",
  gender = "",
}) {
  const to = recipientName ? recipientName : (relationship || "người thương");
  const giftText = giftName ? ` Cùng với món quà (${giftName}), hy vọng sẽ mang đến thật nhiều niềm vui và nụ cười cho ${to}!` : "";

  let title = "Chúc Mừng Ngày Đặc Biệt! ✨";
  let mainWish = `Gửi tặng ${to} những điều tốt đẹp và bình yên nhất. Mong rằng mọi dự định và ước mơ của bạn sẽ sớm trở thành hiện thực.${giftText}`;
  let senderSign = senderName ? `Thân gửi, ${senderName}` : "Thương mến ❤️";

  const lowerOccasion = (occasion || "").toLowerCase();
  const lowerRel = (relationship || "").toLowerCase();

  if (lowerOccasion.includes("sinh nhật") || lowerOccasion.includes("birthday")) {
    title = `Chúc Mừng Sinh Nhật ${to}! 🎂`;
    if (lowerRel.includes("người yêu") || lowerRel.includes("vợ") || lowerRel.includes("chồng") || lowerRel.includes("crush")) {
      mainWish = `Chúc mừng sinh nhật tình yêu của anh/em! Tuổi mới chúc ${to} luôn xinh đẹp, rạng rỡ và hạnh phúc. Cảm ơn em/anh vì đã luôn là điều ngọt ngào nhất trong cuộc đời này.${giftText}`;
      senderSign = senderName ? `Yêu ${to} thật nhiều, ${senderName}` : "Yêu em/anh nhiều ❤️";
    } else if (lowerRel.includes("bố") || lowerRel.includes("mẹ")) {
      mainWish = `Con chúc ${to} một ngày sinh nhật thật ấm áp, luôn dồi dào sức khỏe, bình an và hạnh phúc bên gia đình. Con cảm ơn ${to} vì tất cả những tình thương bao la đã dành cho con!`;
      senderSign = senderName ? `Con của ${to}, ${senderName}` : `Con thương ${to} nhiều ❤️`;
    } else if (lowerRel.includes("bạn") || lowerRel.includes("đồng nghiệp")) {
      mainWish = `Chúc mừng sinh nhật người bạn tuyệt vời! Chúc ${to} tuổi mới nhiều niềm vui, sức khỏe dồi dào, thăng tiến trong sự nghiệp và luôn giữ được tinh thần lạc quan nhé.${giftText}`;
      senderSign = senderName ? `Bạn của ${to}, ${senderName}` : "Bạn tốt của bạn 🍻";
    } else {
      mainWish = `Chúc ${to} bước sang tuổi mới luôn vui vẻ, rạng ngời, gặt hái thêm nhiều thành công mới và luôn tràn đầy năng lượng tích cực!${giftText}`;
    }
  } else if (lowerOccasion.includes("valentine") || lowerOccasion.includes("kỷ niệm") || lowerOccasion.includes("tình yêu")) {
    title = `Gửi Người Anh/Em Thương Nhất! 💖`;
    mainWish = `Cảm ơn định mệnh đã mang em/anh đến bên cuộc đời anh/em. Mỗi ngày có em/anh đều là một ngày đặc biệt và ý nghĩa. Chúc cho tình yêu của chúng mình mãi luôn bền chặt và ngập tràn hạnh phúc.${giftText}`;
    senderSign = senderName ? `Mãi bên nhau nhé, ${senderName}` : "Yêu thương đong đầy ❤️";
  } else if (lowerOccasion.includes("giáng sinh") || lowerOccasion.includes("noel") || lowerOccasion.includes("christmas")) {
    title = `Merry Christmas & Happy Holidays! 🎄✨`;
    mainWish = `Chúc ${to} một mùa Giáng sinh an lành, ấm áp bên những người thân yêu và đón một năm mới ngập tràn may mắn, hạnh phúc.${giftText}`;
    senderSign = senderName ? `Ấm áp từ, ${senderName}` : "Merry Christmas ❄️";
  } else if (lowerOccasion.includes("tốt nghiệp") || lowerOccasion.includes("graduation")) {
    title = `Chúc Mừng Tốt Nghiệp! 🎓🎉`;
    mainWish = `Chúc mừng ${to} đã hoàn thành xuất sắc một chặng đường tuyệt vời! Chúc bạn tự tin bước tiếp trên con đường tương lai rộng mở, luôn nhiệt huyết và tỏa sáng rực rỡ.${giftText}`;
    senderSign = senderName ? `Tự hào về bạn, ${senderName}` : "Chúc mừng thành công! 🌟";
  } else if (lowerOccasion.includes("8/3") || lowerOccasion.includes("20/10") || lowerOccasion.includes("phụ nữ")) {
    title = `Chúc Mừng Ngày Của Phái Đẹp! 🌸`;
    mainWish = `Chúc ${to} một ngày thật nhiều niềm vui, luôn xinh đẹp, duyên dáng và được yêu thương trọn vẹn mỗi ngày trong năm.${giftText}`;
    senderSign = senderName ? `Thân tặng, ${senderName}` : "Trân trọng & Yêu thương 💐";
  }

  const alternatives = [
    {
      id: "warm",
      label: "Chân thành & Ấm áp",
      text: `Chúc ${to} mỗi ngày trôi qua đều là một ngày ngập tràn tiếng cười, bình an và hạnh phúc bên những người thân thương.${giftText}`,
    },
    {
      id: "cute",
      label: "Hài hước & Đáng yêu",
      text: `Chúc mừng ${to}! Tuổi mới bớt lo âu, tiền đầy túi, tình đầy tim và luôn giữ nụ cười thật tươi nhé! Nhớ mở món quà này ra xem liền nha! 🎁`,
    },
    {
      id: "romantic",
      label: "Ngọt ngào & Tình cảm",
      text: `Có ${to} xuất hiện là món quà tuyệt vời nhất. Chúc cho nụ cười trên môi người tôi thương không bao giờ tắt. Thương ${to} rất nhiều! ❤️`,
    },
    {
      id: "poem",
      label: "Thơ 4 câu ý nghĩa",
      text: `Gửi trọn yêu thương một tấm lòng\nChúc ${to} vạn sự đẹp như mong\nNiềm vui rực rỡ như hoa nở\nHạnh phúc đong đầy trọn ước mong.`,
    },
  ];

  return {
    title,
    mainWish,
    senderSign,
    alternatives,
  };
}

// =====================================================
// GENERATE GREETING CARD WISHES WITH GEMINI
// =====================================================

async function generateCardWishes({
  occasion = "",
  relationship = "",
  gender = "",
  age = "",
  recipientName = "",
  senderName = "",
  giftName = "",
  interests = [],
  description = "",
  tone = "Chân thành & Ấm áp",
}) {
  const fallback = generateFallbackWishes({
    occasion,
    relationship,
    recipientName,
    senderName,
    giftName,
    tone,
    gender,
  });

  if (!gemini) {
    return fallback;
  }

  try {
    const contextLines = [];
    if (occasion) contextLines.push(`- Dịp tặng: ${occasion}`);
    if (relationship) contextLines.push(`- Mối quan hệ: ${relationship}`);
    if (recipientName) contextLines.push(`- Tên người nhận: ${recipientName}`);
    if (senderName) contextLines.push(`- Tên người gửi: ${senderName}`);
    if (gender) contextLines.push(`- Giới tính người nhận: ${gender}`);
    if (age) contextLines.push(`- Độ tuổi người nhận: ${age}`);
    if (giftName) contextLines.push(`- Món quà tặng kèm: ${giftName}`);
    if (description) contextLines.push(`- Yêu cầu / Mô tả tìm quà ban đầu: ${description}`);
    if (interests && (Array.isArray(interests) ? interests.length : interests)) {
      contextLines.push(`- Sở thích: ${Array.isArray(interests) ? interests.join(", ") : interests}`);
    }
    if (tone) contextLines.push(`- Phong cách lời chúc mong muốn: ${tone}`);

    const prompt = `
Bạn là một chuyên gia sáng tạo nội dung và viết thiệp chúc mừng đầy cảm xúc bằng tiếng Việt.
Hãy sáng tác lời chúc mừng thiệp thật hay, ý nghĩa, tự nhiên, truyền cảm và phù hợp nhất với dịp và người nhận.

THÔNG TIN NGƯỜI DÙNG:
${contextLines.join("\n") || "- Dịp chung: Chúc mừng một ngày đặc biệt"}

YÊU CẦU NỘI DUNG:
1. Viết bằng tiếng Việt tự nhiên, ấm áp, văn phong đúng chất người Việt viết tay trong thiệp, tránh máy móc rập khuôn.
2. Phong cách chính: ${tone || "Chân thành & Ấm áp"}.
3. Nếu có món quà tặng kèm (${giftName || ""}), hãy khéo léo lồng ghép ý nghĩa của món quà một cách tinh tế.
4. Trả về đúng 1 lời chúc chính (mainWish) khoảng 2-4 câu, cùng 4 gợi ý thay thế (alternatives) với các tông giọng:
   - "Chân thành & Ấm áp"
   - "Hài hước & Dễ thương"
   - "Ngọt ngào & Lãng mạn"
   - "Thơ 4 câu ý nghĩa" (4 câu thơ lục bát hoặc 7 chữ vần điệu, ngăn cách bằng dấu xuống dòng \\n)

YÊU CẦU ĐẦU RA JSON HỢP LỆ (KHÔNG THÊM BẤT KỲ VĂN BẢN NGOÀI JSON, KHÔNG BỌC CODE BLOCK):
{
  "title": "Tiêu đề thiệp ngắn gọn và bắt mắt kèm icon",
  "mainWish": "Nội dung lời chúc chính truyền cảm...",
  "senderSign": "Ký tên gợi ý ngắn gọn (vd: Thương em nhiều, / Yêu mẹ thật nhiều, / Thân gửi, ...)",
  "alternatives": [
    {
      "id": "warm",
      "label": "Chân thành & Ấm áp",
      "text": "..."
    },
    {
      "id": "cute",
      "label": "Hài hước & Dễ thương",
      "text": "..."
    },
    {
      "id": "romantic",
      "label": "Ngọt ngào & Lãng mạn",
      "text": "..."
    },
    {
      "id": "poem",
      "label": "Thơ 4 câu ý nghĩa",
      "text": "Dòng 1\\nDòng 2\\nDòng 3\\nDòng 4"
    }
  ]
}
`;

    const raw = await askGemini(prompt, 1);
    
    // An toàn trích xuất JSON Object bắt đầu bằng '{' và kết thúc bằng '}'
    let cleaned = String(raw || "").trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim();
    }

    const parsed = JSON.parse(cleaned);

    if (!parsed || !parsed.mainWish) {
      throw new Error("Gemini returned invalid card wishes format");
    }

    return {
      title: parsed.title || fallback.title,
      mainWish: parsed.mainWish,
      senderSign: parsed.senderSign || fallback.senderSign,
      alternatives: Array.isArray(parsed.alternatives) && parsed.alternatives.length > 0
        ? parsed.alternatives
        : fallback.alternatives,
    };
  } catch (error) {
    console.warn("Gemini card wishes failed, using fallback:", error.message);
    return fallback;
  }
}

// =====================================================
// HEALTH
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,

    message: "Gift AI Backend is running!",

    platform: "Lazada",

    cache: "MySQL cache enabled",

    ai: gemini ? "Gemini enabled" : "Gemini disabled",
  });
});

// =====================================================
// IMAGE PROXY (Bảo đảm 100% load được ảnh Lazada/Shopee tránh bị chặn CORS/Referrer)
// =====================================================

app.get("/api/image-proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return res.status(400).send("Invalid image URL");
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return res.status(response.status).send("Failed to proxy image");
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      success: true,

      database: "connected",

      gemini: !!gemini,
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      database: "error",

      message: error.message,
    });
  }
});

// =====================================================
// DIRECT PRODUCT SEARCH
// =====================================================

app.get("/api/products/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        success: false,

        message: "Thiếu từ khóa tìm kiếm.",
      });
    }

    // CACHE TRƯỚC
    const cached = await getCachedProducts(q);

    if (cached.length > 0) {
      return res.json({
        success: true,

        source: "mysql-cache",

        cacheHit: true,

        refreshAvailable: true,

        total: cached.length,

        products: cached,
      });
    }

    // KHÔNG CÓ CACHE -> LAZADA
    const products = await searchMarketplaceProducts(q);

    if (products.length > 0) {
      await saveProductsToCache(q, products);
    }

    return res.json({
      success: true,

      source: "lazada",

      cacheHit: false,

      refreshAvailable: false,

      total: products.length,

      products,
    });
  } catch (error) {
    console.error("/api/products/search error:", error.message);

    res.status(500).json({
      success: false,

      message: "Không thể tìm kiếm sản phẩm.",

      error: error.message,
    });
  }
});

// =====================================================
// CARD WISHES API
// =====================================================

app.post("/api/card/generate-wishes", async (req, res) => {
  try {
    const {
      occasion,
      relationship,
      gender,
      age,
      recipientName,
      senderName,
      giftName,
      interests,
      description,
      tone,
    } = req.body || {};

    const wishes = await generateCardWishes({
      occasion,
      relationship,
      gender,
      age,
      recipientName,
      senderName,
      giftName,
      interests,
      description,
      tone,
    });

    return res.json({
      success: true,
      card: wishes,
    });
  } catch (error) {
    console.error("/api/card/generate-wishes error:", error.message);

    const fallback = generateFallbackWishes(req.body || {});
    return res.json({
      success: true,
      card: fallback,
      fallback: true,
      warning: error.message,
    });
  }
});

// =====================================================
// AI ANALYZE API
// =====================================================

app.post("/api/ai/analyze", async (req, res) => {
  try {
    const {
      description,
      relationship,
      gender,
      age,
      occasion,
      budget,
      interests,
    } = req.body;

    if (!description && !relationship && !occasion && !interests?.length) {
      return res.status(400).json({
        success: false,

        message: "Vui lòng nhập thông tin quà tặng.",
      });
    }

    const ai = await analyzeGiftRequest({
      description,
      relationship,
      gender,
      age,
      occasion,
      budget,
      interests,
    });

    return res.json({
      success: true,

      ai,
    });
  } catch (error) {
    console.error("/api/ai/analyze error:", error.message);

    res.status(500).json({
      success: false,

      message: "Không thể phân tích yêu cầu bằng AI.",

      error: error.message,
    });
  }
});

// =====================================================
// LƯU LỊCH SỬ TÌM KIẾM & THỐNG KÊ QUÀ TẶNG
// =====================================================

async function saveSearchRecord({
  userId,
  queryText,
  relationship,
  gender,
  ageRange,
  occasion,
  budget,
  interests,
  aiSummary,
  aiKeywords,
  aiItems,
  products,
  ipAddress,
  existingHistoryId,
}) {
  try {
    let historyId = existingHistoryId;

    if (historyId) {
      await pool.query(
        `UPDATE search_history 
         SET products_snapshot = ?, total_products = ?, ai_summary = ? 
         WHERE id = ?`,
        [JSON.stringify(products || []), products ? products.length : 0, aiSummary || "", historyId]
      );
    } else {
      const [histResult] = await pool.query(
        `INSERT INTO search_history 
         (user_id, query_text, relationship, gender, age_range, occasion, budget, interests, 
          ai_summary, ai_keywords, ai_items, products_snapshot, total_products, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId || null,
          queryText || "",
          relationship || "",
          gender || "",
          ageRange || "",
          occasion || "",
          budget || "",
          JSON.stringify(interests || []),
          aiSummary || "",
          JSON.stringify(aiKeywords || []),
          JSON.stringify(aiItems || []),
          JSON.stringify(products || []),
          products ? products.length : 0,
          ipAddress || "",
        ]
      );
      historyId = histResult.insertId;
    }

    // Ghi nhận thống kê gợi ý quà
    if (products && products.length > 0) {
      for (const p of products) {
        if (!p || !p.name) continue;
        await pool.query(
          `INSERT INTO product_recommendation_stats 
           (search_history_id, product_name, product_price, product_image, product_url, platform, score)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            historyId,
            p.name,
            p.price || null,
            p.image || null,
            p.url || null,
            p.platform || p.source || "lazada",
            p.score || 0,
          ]
        ).catch(() => {});
      }
    }

    return historyId;
  } catch (err) {
    console.error("Lỗi lưu lịch sử / thống kê:", err.message);
    return null;
  }
}

// =====================================================
// RECOMMEND API
// =====================================================

app.post("/api/recommend", async (req, res) => {
  try {
    const {
      description,
      relationship,
      gender,
      age,
      occasion,
      budget,
      interests,
      mode,
      ai: cachedAI,
      searchQueries: cachedSearchQueries,
      historyId: incomingHistoryId,
    } = req.body;

    if (!description && !relationship && !occasion && !interests?.length) {
      return res.status(400).json({
        success: false,

        message: "Vui lòng nhập thông tin quà tặng.",
      });
    }

    const recommendMode = mode === "refresh" ? "refresh" : "cache";

    console.log(`\n===== RECOMMEND MODE: ${recommendMode.toUpperCase()} =====`);

    // =================================================
    // STEP 1
    // CHUẨN BỊ MỤC TIÊU QUÀ TẶNG + AI + SEARCH QUERIES
    // =================================================

    const baseGoals = detectGiftGoals({
      description,
      relationship,
      gender,
      age,
      occasion,
      budget,
      interests,
    });

    let ai = cachedAI || null;

    let searchQueries = normalizeSearchQueries(cachedSearchQueries);

    // =================================================
    // CACHE MODE
    // =================================================

    if (recommendMode === "cache") {
      let items = [];

      if (
        searchQueries.length > 0 &&
        Array.isArray(cachedAI?.items) &&
        cachedAI.items.length > 0
      ) {
        console.log(
          "CACHE: using searchQueries and atomic items supplied by frontend.",
        );

        items = cachedAI.items;

        ai = {
          summary:
            cachedAI?.summary || "Đang tìm sản phẩm trong cơ sở dữ liệu.",

          items: cachedAI.items,

          keywords: Array.isArray(cachedAI?.keywords) ? cachedAI.keywords : [],

          searchQueries,

          goals: cachedAI?.goals || baseGoals,
        };
      } else {
        /*
         * Lần đầu frontend gửi yêu cầu:
         * Gemini phân tích, tách ra:
         * - goals: đối tượng nhận, dịp tặng, giới tính, ngân sách, danh mục ưu tiên
         * - items: các món quà cụ thể phù hợp
         * - searchQueries: từ khóa tìm kiếm quà tặng
         * - summary & keywords
         */
        console.log(
          "CACHE: analyzing request and extracting gift goals & atomic items with Gemini...",
        );

        ai = await analyzeGiftRequest({
          description,
          relationship,
          gender,
          age,
          occasion,
          budget,
          interests,
        });

        searchQueries = normalizeSearchQueries(ai.searchQueries);
        ai.searchQueries = searchQueries;
        items = Array.isArray(ai.items) ? ai.items : [];
      }

      const activeGoals = ai?.goals || baseGoals;
      ai.goals = activeGoals;

      // Luôn đảm bảo trích xuất các món đồ cốt lõi phù hợp mục tiêu người nhận & dịp tặng
      items = extractAtomicItems(
        description,
        relationship,
        occasion,
        interests,
        items,
        activeGoals,
      );
      ai.items = items;

      if (searchQueries.length === 0) {
        searchQueries = createFallbackSearchQueries(
          description,
          relationship,
          gender,
          age,
          occasion,
          budget,
          interests,
        );
        ai.searchQueries = searchQueries;
      }

      console.log("Gift goals detected:", {
        recipient: activeGoals.recipientLabel,
        occasion: activeGoals.occasionLabel,
        gender: activeGoals.effectiveGender,
        categories: activeGoals.goalCategories,
      });
      console.log("Atomic items for DB search:", items);
      console.log("Search queries:", searchQueries);

      // =================================================
      // TÌM KIẾM TRONG CSDL THEO MỤC TIÊU QUÀ TẶNG & TỪ KHÓA
      // =================================================
      console.log(
        "CACHE: searching MySQL for goal-matched products...",
      );

      const recommendations = await getRelatedCachedProducts({
        items,
        searchQueries,
        keywords: ai.keywords,
        goals: activeGoals,
        limit: MAX_RECOMMENDATIONS,
      });

      console.log(
        `CACHE: returning ${recommendations.length} goal-matched products immediately.`,
      );

      let savedHistoryId = null;
      if (recommendations.length > 0 || description) {
        savedHistoryId = await saveSearchRecord({
          userId: req.user ? req.user.id : null,
          queryText: description,
          relationship,
          gender,
          ageRange: age,
          occasion,
          budget,
          interests,
          aiSummary: ai.summary,
          aiKeywords: ai.keywords,
          aiItems: ai.items,
          products: recommendations,
          ipAddress: req.ip,
          existingHistoryId: null,
        });
      }

      return res.json({
        success: true,
        mode: "cache",
        source: "mysql-cache",
        historyId: savedHistoryId,
        cacheHit: recommendations.length > 0,
        refreshAvailable: true,
        message:
          recommendations.length > 0
            ? `Đã tìm thấy ${recommendations.length} món quà phù hợp${activeGoals.recipientLabel ? ` cho ${activeGoals.recipientLabel}` : ""}${activeGoals.occasionLabel ? ` nhân dịp ${activeGoals.occasionLabel}` : ""}.`
            : "Chưa có sản phẩm trong cơ sở dữ liệu. Đang tìm sản phẩm mới.",
        ai,
        total: recommendations.length,
        products: recommendations,
      });
    }

    // =================================================
    // REFRESH MODE
    // =================================================

    let items = [];
    if (Array.isArray(cachedAI?.items) && cachedAI.items.length > 0) {
      items = cachedAI.items;
    }

    if (searchQueries.length === 0) {
      if (cachedAI && Array.isArray(cachedAI.searchQueries)) {
        searchQueries = normalizeSearchQueries(cachedAI.searchQueries);
      }
    }

    if (searchQueries.length === 0) {
      console.log("REFRESH: searchQueries missing. Generating with Gemini...");

      ai = await analyzeGiftRequest({
        description,
        relationship,
        gender,
        age,
        occasion,
        budget,
        interests,
      });

      searchQueries = normalizeSearchQueries(ai.searchQueries);
      items = Array.isArray(ai.items) ? ai.items : [];
    } else {
      console.log(
        "REFRESH: reusing existing searchQueries and items. Gemini analysis skipped.",
      );

      ai = {
        summary: cachedAI?.summary || "Đang phân tích và xếp hạng quà tặng phù hợp nhất.",

        items,

        keywords: Array.isArray(cachedAI?.keywords) ? cachedAI.keywords : [],

        searchQueries,

        goals: cachedAI?.goals || baseGoals,
      };
    }

    const activeGoals = ai?.goals || baseGoals;
    ai.goals = activeGoals;

    items = extractAtomicItems(
      description,
      relationship,
      occasion,
      interests,
      items,
      activeGoals,
    );
    ai.items = items;

    if (searchQueries.length === 0) {
      searchQueries = createFallbackSearchQueries(
        description,
        relationship,
        gender,
        age,
        occasion,
        budget,
        interests,
      );
      ai.searchQueries = searchQueries;
    }

    console.log("Search queries for REFRESH:", searchQueries);

    const allProducts = [];

    // 1. LẤY CÁC SẢN PHẨM PHÙ HỢP MỤC TIÊU TRONG CSDL ĐỂ LÀM ỨNG VIÊN CHO AI RANKING
    console.log("REFRESH: retrieving goal-matched candidates from MySQL cache...");
    const cachedCandidates = await getRelatedCachedProducts({
      items,
      searchQueries,
      keywords: ai.keywords,
      goals: activeGoals,
      limit: 18,
    });

    if (cachedCandidates.length > 0) {
      allProducts.push(...cachedCandidates);
    }

    // 2. CHỈ CÀO THÊM LAZADA KHI CSDL CÓ ÍT HƠN 8 ỨNG VIÊN PHÙ HỢP
    let freshCount = 0;
    if (cachedCandidates.length < 8) {
      console.log("REFRESH: starting Lazada crawler for queries:", searchQueries);
      const scrapeResults = await scrapeQueriesWithLimit(searchQueries);

      for (const result of scrapeResults) {
        const { keyword, products } = result;

        if (!products || products.length === 0) {
          console.log(`No fresh products for "${keyword}"`);
          continue;
        }

        console.log(`Fresh products for "${keyword}": ${products.length}`);

        await saveProductsToCache(keyword, products);

        // Lọc các sản phẩm mới cào qua Bộ lọc 3 Trụ Cột (Đúng Quà - Đúng Người - Đúng Dịp)
        const filteredFresh = [];
        for (const p of products) {
          const evalRes = evaluateProductForGoals(
            p,
            activeGoals,
            items,
            searchQueries,
          );
          if (evalRes.valid) {
            filteredFresh.push({
              ...p,
              category: evalRes.category || p.category,
              score: evalRes.score,
              reason:
                p.reason ||
                `Món quà phù hợp${activeGoals.recipientLabel ? ` tặng ${activeGoals.recipientLabel}` : ""}${activeGoals.occasionLabel ? ` nhân dịp ${activeGoals.occasionLabel}` : ""}.`,
            });
          }
        }

        allProducts.push(...filteredFresh);
        freshCount += filteredFresh.length;
      }
    } else {
      console.log(
        `REFRESH: found ${cachedCandidates.length} strong candidates in DB, skipping live Lazada scrape and proceeding directly to AI ranking.`,
      );
    }

    // 4. LOẠI BỎ TRÙNG LẶP (CẢ URL/ID VÀ CHỮ KÝ TÊN SẢN PHẨM)
    const rawUniqueProducts = removeDuplicateProducts(allProducts);
    const seenTitleSigs = new Set();
    const uniqueProducts = [];
    for (const prod of rawUniqueProducts) {
      const sig = getTitleSignature(prod.name);
      if (sig && seenTitleSigs.has(sig)) continue;
      if (sig) seenTitleSigs.add(sig);
      uniqueProducts.push(prod);
    }

    console.log(
      `Total products for AI ranking: ${uniqueProducts.length} (Fresh: ${freshCount})`,
    );

    if (uniqueProducts.length === 0) {
      return res.json({
        success: true,
        mode: "refresh",
        source: "lazada",
        cacheHit: false,
        refreshAvailable: false,
        message: "Không tìm thấy sản phẩm phù hợp.",
        ai,
        total: 0,
        products: [],
      });
    }

    // 5. GEMINI XẾP HẠNG THEO MỤC TIÊU QUÀ TẶNG CỦA NGƯỜI DÙNG
    const userRequest = {
      description: description || "",
      relationship: relationship || "",
      gender: gender || "",
      age: age || "",
      occasion: occasion || "",
      budget: budget || "",
      interests: interests || [],
      summary: ai.summary || "",
      items: ai.items || [],
      keywords: ai.keywords || [],
      searchQueries: ai.searchQueries || [],
      goals: activeGoals,
    };

    console.log(
      `REFRESH: sending ${Math.min(
        uniqueProducts.length,
        MAX_PRODUCTS_FOR_AI,
      )} products to Gemini ranking...`,
    );

    const ranking = await rankProductsWithGemini(
      uniqueProducts,
      userRequest,
      MAX_RECOMMENDATIONS,
    );

    let recommendations = [];
    const recIds = new Set();
    const recSigs = new Set();

    if (ranking.length > 0) {
      const sortedRanking = ranking.sort((a, b) => b.score - a.score);
      for (const rItem of sortedRanking) {
        if (recommendations.length >= MAX_RECOMMENDATIONS) break;
        const evalRes = evaluateProductForGoals(
          rItem,
          activeGoals,
          items,
          searchQueries,
        );
        if (!evalRes.valid) continue;
        const sig = getTitleSignature(rItem.name);
        if (recIds.has(String(rItem.id)) || (sig && recSigs.has(sig))) continue;
        recIds.add(String(rItem.id));
        if (sig) recSigs.add(sig);
        recommendations.push({
          ...rItem,
          category: evalRes.category || rItem.category,
        });
      }
    }

    if (recommendations.length < MAX_RECOMMENDATIONS) {
      if (ranking.length === 0) {
        console.log(
          "Gemini ranking unavailable. Using goal-scored products as fallback.",
        );
      }
      for (const product of uniqueProducts) {
        if (recommendations.length >= MAX_RECOMMENDATIONS) break;
        const sig = getTitleSignature(product.name);
        if (recIds.has(String(product.id)) || (sig && recSigs.has(sig))) {
          continue;
        }
        recIds.add(String(product.id));
        if (sig) recSigs.add(sig);
        recommendations.push({
          ...product,
          score: product.score || 82,
          reason:
            product.reason ||
            `Món quà phù hợp${activeGoals.recipientLabel ? ` tặng ${activeGoals.recipientLabel}` : ""}${activeGoals.occasionLabel ? ` nhân dịp ${activeGoals.occasionLabel}` : ""}.`,
        });
      }
    }

    console.log(
      `REFRESH: returning ${recommendations.length} recommendations ranked by AI.`,
    );

    let updatedHistoryId = null;
    if (recommendations.length > 0 || description) {
      updatedHistoryId = await saveSearchRecord({
        userId: req.user ? req.user.id : null,
        queryText: description,
        relationship,
        gender,
        ageRange: age,
        occasion,
        budget,
        interests,
        aiSummary: ai.summary,
        aiKeywords: ai.keywords,
        aiItems: ai.items,
        products: recommendations,
        ipAddress: req.ip,
        existingHistoryId: incomingHistoryId || null,
      });
    }

    return res.json({
      success: true,
      mode: "refresh",
      source: freshCount > 0 ? "lazada" : "ai-ranked-catalog",
      historyId: updatedHistoryId,
      cacheHit: allProducts.length > 0,
      refreshAvailable: false,
      message:
        ranking.length > 0
          ? `AI đã phân tích sâu và chọn lọc ${recommendations.length} món quà phù hợp nhất${activeGoals.recipientLabel ? ` cho ${activeGoals.recipientLabel}` : ""}${activeGoals.occasionLabel ? ` nhân dịp ${activeGoals.occasionLabel}` : ""}.`
          : `Đã lọc và xếp hạng ${recommendations.length} món quà phù hợp nhất với mục tiêu của bạn.`,
      ai,
      total: recommendations.length,
      products: recommendations,
    });
  } catch (error) {
    console.error("/api/recommend error:", error);

    res.status(500).json({
      success: false,

      message: "Không thể tạo gợi ý quà tặng.",

      error: error.message,
    });
  }
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,

    message: "Đã xảy ra lỗi trên server.",

    error: error.message,
  });
});

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log("==========================================");

      console.log(`Gift AI Backend running on http://localhost:${PORT}`);

      console.log(`Gemini model: ${GEMINI_MODEL}`);

      console.log(`Cache duration: ${CACHE_MINUTES} minutes`);

      console.log(`Max products/platform: ${MAX_PRODUCTS_PER_PLATFORM}`);

      console.log(`Max products for AI: ${MAX_PRODUCTS_FOR_AI}`);

      console.log(`Max recommendations: ${MAX_RECOMMENDATIONS}`);

      console.log(`Scrape concurrency: ${MAX_SCRAPE_CONCURRENCY}`);

      console.log("Marketplace: Lazada");

      console.log("==========================================");
    });
  } catch (error) {
    console.error("Failed to start server:", error);

    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  detectGiftGoals,
  evaluateProductForGoals,
  classifyGiftProductByTitle,
};
