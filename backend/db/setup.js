const pool = require("./mysql");
const bcrypt = require("bcryptjs");

async function setupTables() {
  const conn = await pool.getConnection();
  try {
    // 1. Bảng users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        avatar_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Bảng search_history (lưu lịch sử tìm kiếm & gợi ý quà)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        query_text TEXT NULL,
        relationship VARCHAR(100) NULL,
        gender VARCHAR(50) NULL,
        age_range VARCHAR(50) NULL,
        occasion VARCHAR(100) NULL,
        budget VARCHAR(100) NULL,
        interests JSON NULL,
        ai_summary TEXT NULL,
        ai_keywords JSON NULL,
        ai_items JSON NULL,
        products_snapshot JSON NULL,
        total_products INT DEFAULT 0,
        ip_address VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at),
        INDEX idx_occasion (occasion),
        INDEX idx_relationship (relationship)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Bảng product_recommendation_stats (thống kê quà được tìm/gợi ý nhiều nhất & lượt click)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_recommendation_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        search_history_id INT NULL,
        product_name VARCHAR(500) NOT NULL,
        product_price DECIMAL(15,2) NULL,
        product_image TEXT NULL,
        product_url TEXT NULL,
        platform VARCHAR(100) DEFAULT 'lazada',
        score DECIMAL(5,2) DEFAULT 0,
        clicks INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product_name (product_name(100)),
        INDEX idx_platform (platform),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Bảng user_favorites (quà yêu thích đã lưu)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_name VARCHAR(500) NOT NULL,
        product_price DECIMAL(15,2) NULL,
        product_image TEXT NULL,
        product_url TEXT NULL,
        platform VARCHAR(100) NULL,
        score DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_fav (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4.1 Bảng memory_boxes (Hộp Quà Kỷ Niệm Ảo & Đếm Ngược Dịp Đặc Biệt)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS memory_boxes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        share_code VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NULL,
        title VARCHAR(255) NOT NULL,
        occasion VARCHAR(100) NOT NULL,
        sender_name VARCHAR(100) NOT NULL,
        recipient_name VARCHAR(100) NOT NULL,
        milestone_type ENUM('countup', 'countdown', 'none') DEFAULT 'countup',
        milestone_date DATE NULL,
        letter_content TEXT NOT NULL,
        theme VARCHAR(50) DEFAULT 'romantic',
        product_name VARCHAR(500) NULL,
        product_price DECIMAL(15,2) NULL,
        product_image TEXT NULL,
        product_url TEXT NULL,
        unboxed_count INT DEFAULT 0,
        hearts_count INT DEFAULT 0,
        reactions JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_share_code (share_code),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Khởi tạo tài khoản Admin mặc định nếu chưa có
    let adminId = null;
    const [existingAdmin] = await conn.query("SELECT id FROM users WHERE email = ?", [
      "admin@giftfinder.com",
    ]);

    if (existingAdmin.length === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      const [insertAdmin] = await conn.query(
        "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
        ["admin@giftfinder.com", hash, "Quản Trị Viên", "admin"]
      );
      adminId = insertAdmin.insertId;
      console.log("-> Đã tạo tài khoản Admin mặc định: admin@giftfinder.com / admin123");
    } else {
      adminId = existingAdmin[0].id;
    }

    // Tạo thêm 1 tài khoản người dùng demo thường nếu chưa có
    const [existingUser] = await conn.query("SELECT id FROM users WHERE email = ?", [
      "user@giftfinder.com",
    ]);
    let demoUserId = null;
    if (existingUser.length === 0) {
      const userHash = await bcrypt.hash("user123", 10);
      const [insertUser] = await conn.query(
        "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
        ["user@giftfinder.com", userHash, "Nguyễn Văn An", "user"]
      );
      demoUserId = insertUser.insertId;
      console.log("-> Đã tạo tài khoản User demo: user@giftfinder.com / user123");
    } else {
      demoUserId = existingUser[0].id;
    }

    // 5.1 Tự động nạp danh mục sản phẩm quà tặng nếu bảng scraped_products còn trống
    try {
      const [scrapedCount] = await conn.query("SELECT COUNT(*) as c FROM scraped_products");
      if (scrapedCount[0].c === 0) {
        console.log("-> Bảng scraped_products còn trống, đang nạp danh mục quà tặng mẫu...");
        const { SEED_PRODUCTS } = require("./seedProducts");
        for (const item of SEED_PRODUCTS) {
          const key = `seed_${Buffer.from(item.name).toString("base64").substring(0, 40)}`;
          await conn.query(
            `INSERT INTO scraped_products 
             (product_key, platform, name, price, currency, image, url, condition_name, category, location, search_keyword, score, reason, created_at, updated_at)
             VALUES (?, 'lazada', ?, ?, 'VND', ?, ?, 'New', ?, 'Vietnam', ?, 90, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE updated_at = NOW()`,
            [
              key,
              item.name,
              item.price,
              item.image,
              item.url,
              item.category,
              item.tags,
              `Món quà tặng lý tưởng, được nhiều người yêu thích và lựa chọn.`,
            ],
          );
        }
        console.log("-> Đã nạp thành công danh mục quà tặng mẫu vào scraped_products!");
      }
    } catch (seedErr) {
      console.warn("Không thể tự động nạp scraped_products:", seedErr.message);
    }

    // 6. Seed dữ liệu mẫu cho Admin Dashboard nếu bảng search_history chưa có dữ liệu
    const [historyCount] = await conn.query("SELECT COUNT(*) as c FROM search_history");
    if (historyCount[0].c === 0) {
      console.log("-> Đang khởi tạo dữ liệu mẫu cho Admin Analytics và Top Quà Tặng...");

      // Lấy danh sách sản phẩm từ scraped_products
      let productsList = [];
      try {
        const [prods] = await conn.query(
          "SELECT id, name, price, image, url, platform FROM scraped_products ORDER BY id DESC LIMIT 25"
        );
        productsList = prods;
      } catch (err) {}

      const sampleQueries = [
        {
          userId: demoUserId,
          query: "Tìm quà sinh nhật cho bạn gái thích gấu bông dễ thương",
          occasion: "Sinh nhật",
          relationship: "Người yêu",
          gender: "Nữ",
          age: "18-24",
          budget: "200k - 500k",
          summary: "Gợi ý gấu bông lông xù cao cấp và đèn ngủ mini hình thú ngọt ngào.",
          daysAgo: 6,
        },
        {
          userId: null,
          query: "Quà tặng sếp nam nhân dịp thăng chức",
          occasion: "Kỷ niệm / Thăng chức",
          relationship: "Đồng nghiệp",
          gender: "Nam",
          age: "35-50",
          budget: "Trên 1 triệu",
          summary: "Bút ký khắc tên mạ vàng và sổ da cao cấp sang trọng.",
          daysAgo: 5,
        },
        {
          userId: demoUserId,
          query: "Quà Valentine lãng mạn cho người yêu",
          occasion: "Valentine",
          relationship: "Người yêu",
          gender: "Nữ",
          age: "18-24",
          budget: "500k - 1 triệu",
          summary: "Hộp quà hoa hồng sáp kèm dây chuyền bạc tinh tế.",
          daysAgo: 4,
        },
        {
          userId: null,
          query: "Tặng quà tân gia cho bạn thân vừa mua nhà mới",
          occasion: "Tân gia",
          relationship: "Bạn bè",
          gender: "Khác",
          age: "25-34",
          budget: "500k - 1 triệu",
          summary: "Đèn xông tinh dầu gốm sứ và bộ ly thủy tinh cao cấp.",
          daysAgo: 3,
        },
        {
          userId: null,
          query: "Quà sinh nhật cho mẹ 50 tuổi thích trà và sức khỏe",
          occasion: "Sinh nhật",
          relationship: "Bố mẹ",
          gender: "Nữ",
          age: "50+",
          budget: "500k - 1 triệu",
          summary: "Bộ ấm chén gốm Bát Tràng và hộp trà hoa cúc thượng hạng.",
          daysAgo: 2,
        },
        {
          userId: demoUserId,
          query: "Quà 20/10 ý nghĩa tặng chị gái",
          occasion: "Ngày phụ nữ 20/10",
          relationship: "Gia đình",
          gender: "Nữ",
          age: "25-34",
          budget: "200k - 500k",
          summary: "Set son dưỡng môi thiên nhiên và nến thơm thư giãn.",
          daysAgo: 1,
        },
        {
          userId: null,
          query: "Quà giáng sinh ấm áp cho người yêu",
          occasion: "Giáng sinh",
          relationship: "Người yêu",
          gender: "Nữ",
          age: "18-24",
          budget: "Dưới 200k",
          summary: "Khăn len quàng cổ ấm áp và quả cầu tuyết phát nhạc.",
          daysAgo: 0,
        },
        {
          userId: adminId,
          query: "Quà công nghệ cho em trai mê gaming",
          occasion: "Sinh nhật",
          relationship: "Gia đình",
          gender: "Nam",
          age: "18-24",
          budget: "500k - 1 triệu",
          summary: "Tai nghe gaming chống ồn và bàn phím cơ mini LED RGB.",
          daysAgo: 0,
        },
      ];

      for (const item of sampleQueries) {
        const d = new Date();
        d.setDate(d.getDate() - item.daysAgo);
        const dateStr = d.toISOString().slice(0, 19).replace("T", " ");

        // Lấy 3-4 sản phẩm bất kỳ
        const itemProducts = productsList.slice(0, 4).map((p) => ({
          id: String(p.id),
          name: p.name,
          price: p.price,
          image: p.image,
          url: p.url,
          platform: p.platform || "lazada",
          score: Math.floor(Math.random() * 15) + 85,
        }));

        const [histRes] = await conn.query(
          `INSERT INTO search_history 
           (user_id, query_text, relationship, gender, age_range, occasion, budget, interests, 
            ai_summary, ai_keywords, ai_items, products_snapshot, total_products, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.userId,
            item.query,
            item.relationship,
            item.gender,
            item.age,
            item.occasion,
            item.budget,
            JSON.stringify([]),
            item.summary,
            JSON.stringify(["quà tặng", item.occasion, item.relationship]),
            JSON.stringify(["quà"]),
            JSON.stringify(itemProducts),
            itemProducts.length,
            dateStr,
          ]
        );

        const searchId = histRes.insertId;

        // Thêm vào stats
        for (const p of itemProducts) {
          await conn.query(
            `INSERT INTO product_recommendation_stats 
             (search_history_id, product_name, product_price, product_image, product_url, platform, score, clicks, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              searchId,
              p.name,
              p.price,
              p.image,
              p.url,
              p.platform,
              p.score,
              Math.floor(Math.random() * 5),
              dateStr,
            ]
          );
        }
      }

      console.log("-> Đã khởi tạo dữ liệu mẫu cho Admin Analytics thành công!");
    }

    console.log("-> Các bảng MySQL cho người dùng, lịch sử và admin đã sẵn sàng!");
  } finally {
    conn.release();
  }
}

module.exports = { setupTables };

if (require.main === module) {
  setupTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Lỗi khởi tạo bảng:", err);
      process.exit(1);
    });
}
