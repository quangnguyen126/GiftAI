const { Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const pool = require("../db/mysql");

function normalizeKeyword(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createProductKey(platform, url, name) {
  const p = normalizeKeyword(platform || "unknown");
  const u = String(url || "").trim();
  const n = normalizeKeyword(name || "");
  if (u) return `${p}|${u}`.slice(0, 480);
  return `${p}|${n}`.slice(0, 480);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createCrawlerDriver() {
  const options = new chrome.Options();
  options.setPageLoadStrategy("eager");
  options.addArguments(
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--window-size=1920,1080",
    "--disable-blink-features=AutomationControlled",
    "--lang=vi-VN"
  );
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
  return driver;
}

const HALLOWEEN_TOPICS = [
  {
    query: "đèn bí ngô halloween",
    subCategory: "Đèn Trang Trí & Phát Sáng",
    tags: "đèn bí ngô halloween quả bí ngô phát sáng đèn lồng cầm tay led trang trí quà tặng bạn gái bạn bè trẻ em",
  },
  {
    query: "đèn lồng bí ngô phát sáng",
    subCategory: "Đèn Trang Trí & Phát Sáng",
    tags: "đèn lồng halloween bí ngô phát sáng đồ chơi lễ hội ma quái quà tặng độc lạ",
  },
  {
    query: "kẹo mút halloween",
    subCategory: "Bánh Kẹo & Ẩm Thực",
    tags: "kẹo mút halloween trick or treat kẹo ma quái kẹo mắt quà tặng bạn bè người yêu học sinh trẻ em",
  },
  {
    query: "kẹo dẻo halloween",
    subCategory: "Bánh Kẹo & Ẩm Thực",
    tags: "kẹo dẻo trolli kẹo halloween kẹo mắt kinh dị ngọt ngào quà tặng lễ hội",
  },
  {
    query: "hộp kẹo halloween",
    subCategory: "Bánh Kẹo & Ẩm Thực",
    tags: "hộp kẹo bí ngô xô kẹo halloween giỏ kẹo trick or treat quà tặng cute",
  },
  {
    query: "mặt nạ hóa trang halloween",
    subCategory: "Mặt Nạ & Hóa Trang",
    tags: "mặt nạ halloween hóa trang ma cà rồng vô diện dạ quang kinh dị tiệc tùng quà tặng bạn trai bạn bè",
  },
  {
    query: "mặt nạ ma cà rồng dạ quang",
    subCategory: "Mặt Nạ & Hóa Trang",
    tags: "mặt nạ dạ quang led phát sáng hacker anonymous kinh dị cosplay quà tặng",
  },
  {
    query: "áo choàng phù thủy halloween",
    subCategory: "Trang Phục Cosplay",
    tags: "áo choàng phù thủy kèm nón nhọn pháp sư cosplay hóa trang quà tặng bạn gái bạn bè trẻ em",
  },
  {
    query: "áo choàng dracula ma cà rồng",
    subCategory: "Trang Phục Cosplay",
    tags: "áo choàng ma cà rồng dracula hai mặt đen đỏ hóa trang halloween quà tặng bạn trai nam",
  },
  {
    query: "cài tóc halloween",
    subCategory: "Phụ Kiện Thời Trang",
    tags: "bờm cài tóc halloween quả bí ngô cánh dơi sừng quỷ cute quà tặng bạn gái nữ",
  },
  {
    query: "bờm cài tóc bí ngô halloween",
    subCategory: "Phụ Kiện Thời Trang",
    tags: "bờm cài tóc dơi nhện bí ngô phụ kiện hóa trang chụp ảnh sống ảo quà bạn gái",
  },
  {
    query: "cốc sứ quả bí ngô",
    subCategory: "Gia Dụng & Đời Sống",
    tags: "cốc sứ bí ngô ly sứ quả bí ngô có nắp decor phòng văn phòng quà tặng người yêu bạn gái bạn bè",
  },
  {
    query: "ly sứ halloween có nắp",
    subCategory: "Gia Dụng & Đời Sống",
    tags: "ly sứ cốc nước ma quái quả bí ngô quà tặng sinh nhật halloween độc lạ",
  },
  {
    query: "gấu bông bí ngô halloween",
    subCategory: "Gấu Bông & Quà Cute",
    tags: "gấu bông bí ngô capybara đội nón phù thủy gấu bông ma cute thú nhồi bông quà tặng bạn gái người yêu",
  },
  {
    query: "gấu bông ma cute halloween",
    subCategory: "Gấu Bông & Quà Cute",
    tags: "thú nhồi bông ma trắng dễ thương bí ngô mềm mịn quà tặng bạn gái bé gái",
  },
  {
    query: "nến thơm bí ngô halloween",
    subCategory: "Nến Thơm & Thư Giãn",
    tags: "nến thơm hình quả bí ngô tinh dầu thơm phòng thư giãn decor quà tặng lãng mạn người yêu bạn gái",
  },
  {
    query: "set quà tặng halloween",
    subCategory: "Set Quà Tặng",
    tags: "set quà halloween hộp quà bí ngô kẹo đồ chơi hóa trang quà tặng bạn bè đồng nghiệp người yêu",
  },
  {
    query: "móc khóa halloween dạ quang",
    subCategory: "Phụ Kiện & Quà Lưu Niệm",
    tags: "móc khóa halloween quả bí ngô phù thủy phát sáng dạ quang quà tặng lưu niệm bạn bè học sinh",
  },
  {
    query: "hình xăm dán halloween",
    subCategory: "Phụ Kiện Hóa Trang",
    tags: "hình xăm dán halloween phát sáng dạ quang hóa trang vết sẹo máu tiệc ma quái",
  },
  {
    query: "đồ chơi halloween phát sáng",
    subCategory: "Đồ Chơi & Quà Độc Lạ",
    tags: "đồ chơi phát sáng kính led halloween kiếm gậy phù thủy nhẫn led quà tặng trẻ em bạn bè",
  },
];

async function fetchProductsViaBrowser(driver, topic, limit = 25) {
  const apiUrl = `https://tiki.vn/api/v2/products?limit=${limit}&q=${encodeURIComponent(
    topic.query
  )}`;

  try {
    const rawItems = await driver.executeAsyncScript(
      `
      const url = arguments[0];
      const callback = arguments[arguments.length - 1];
      fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(r => r.json())
        .then(d => callback(Array.isArray(d && d.data) ? d.data : []))
        .catch(() => callback([]));
      `,
      apiUrl
    );

    if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

    const results = [];
    for (const item of rawItems) {
      if (!item || !item.name || !item.price || item.price < 8000) continue;

      let image = item.thumbnail_url || "";
      if (!image || !image.startsWith("http") || image.includes("placeholder")) {
        continue;
      }
      image = image.replace(/\/cache\/\d+x\d+\//, "/cache/450x450/");

      const productUrl = item.url_path
        ? `https://tiki.vn/${String(item.url_path).replace(/^\//, "")}`
        : "";
      if (!productUrl) continue;

      const lowerName = item.name.toLowerCase();
      if (
        lowerName.includes("án mạng") ||
        lowerName.includes("tiểu thuyết") ||
        lowerName.includes("mạch in") ||
        lowerName.includes("bộ lọc không khí")
      ) {
        continue;
      }

      const enrichedKeyword = normalizeKeyword(
        `${topic.query} | Quà Halloween & Hóa Trang | ${topic.tags} | ${item.name}`
      ).slice(0, 490);

      results.push({
        product_key: createProductKey("Tiki", productUrl, item.name),
        platform: "Tiki",
        name: String(item.name).trim(),
        price: Number(item.price),
        currency: "VND",
        image,
        url: productUrl,
        condition_name: "New",
        category: "Quà Halloween & Hóa Trang",
        location: "Vietnam",
        search_keyword: enrichedKeyword,
        score: item.rating_average ? Math.round(Number(item.rating_average) * 19) : 88,
        reason: `Món quà độc đáo, ấn tượng cho dịp Halloween (${topic.subCategory})`,
      });
    }

    return results;
  } catch (err) {
    console.error(`Fetch error for "${topic.query}":`, err.message);
    return [];
  }
}

async function runHalloweenCrawl() {
  console.log("====================================================");
  console.log("🎃 BẮT ĐẦU CÀO DỮ LIỆU QUÀ TẶNG DỊP HALLOWEEN (CHROME BROWSER)");
  console.log("====================================================");

  const conn = await pool.getConnection();
  let driver = null;
  try {
    driver = await createCrawlerDriver();
    console.log("🌐 Đang khởi tạo trình duyệt Chrome headless để cào Tiki an toàn...");
    await driver.get("https://tiki.vn/");
    await sleep(2500);

    let totalSaved = 0;
    let index = 0;

    for (const topic of HALLOWEEN_TOPICS) {
      index++;
      console.log(`[${index}/${HALLOWEEN_TOPICS.length}] 🕷️ Đang cào: "${topic.query}"...`);
      const products = await fetchProductsViaBrowser(driver, topic, 25);

      if (products.length === 0) {
        console.log(`  ⚠️ 0 sản phẩm phù hợp.`);
        await sleep(400);
        continue;
      }

      let inserted = 0;
      for (const p of products) {
        const [res] = await conn.query(
          `
          INSERT INTO scraped_products (
            product_key, platform, name, price, currency, image, url,
            condition_name, category, location, search_keyword, score, reason,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            price = VALUES(price),
            image = VALUES(image),
            category = VALUES(category),
            search_keyword = VALUES(search_keyword),
            reason = VALUES(reason),
            updated_at = NOW()
          `,
          [
            p.product_key,
            p.platform,
            p.name,
            p.price,
            p.currency,
            p.image,
            p.url,
            p.condition_name,
            p.category,
            p.location,
            p.search_keyword,
            p.score,
            p.reason,
          ]
        );
        if (res.affectedRows > 0) inserted++;
      }

      totalSaved += inserted;
      console.log(`  ✅ Đã lưu/cập nhật ${inserted} sản phẩm quà Halloween.`);
      await sleep(500);
    }

    const [halloweenCount] = await conn.query(
      "SELECT COUNT(*) as c FROM scraped_products WHERE category = 'Quà Halloween & Hóa Trang' OR search_keyword LIKE '%halloween%'"
    );

    console.log("\n====================================================");
    console.log(`🎉 HOÀN TẤT CÀO QUÀ HALLOWEEN!`);
    console.log(`📦 Đã lưu mới / cập nhật: ${totalSaved} lượt sản phẩm`);
    console.log(`🎃 Tổng số quà tặng Halloween trong CSDL hiện tại: ${halloweenCount[0].c} sản phẩm`);
    console.log("====================================================");
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch {}
    }
    conn.release();
  }
}

if (require.main === module) {
  runHalloweenCrawl()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Halloween crawl error:", err);
      process.exit(1);
    });
}

module.exports = { runHalloweenCrawl, HALLOWEEN_TOPICS };
