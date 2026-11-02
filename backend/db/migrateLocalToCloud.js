const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function migrate() {
  console.log("=====================================================");
  console.log("🚀 BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU TỪ MYSQL LOCAL LÊN TIDB CLOUD");
  console.log("=====================================================");

  // 1. Kết nối CSDL Local (XAMPP MySQL)
  console.log("1. Đang kết nối tới MySQL Local (localhost:3306)...");
  const localPool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "giftfinder",
    port: 3306,
    waitForConnections: true,
    connectionLimit: 5,
  });

  // 2. Kết nối CSDL TiDB Cloud
  console.log("2. Đang kết nối tới TiDB Cloud (gateway01.ap-southeast-1.prod.aws.tidbcloud.com)...");
  const cloudPool = mysql.createPool({
    host: process.env.DB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
    user: process.env.DB_USER || "fM11x4bxN3QzB3N.root",
    password: process.env.DB_PASSWORD || "fXgAIrxCYYnAG0dq",
    database: process.env.DB_NAME || "test",
    port: Number(process.env.DB_PORT || 4000),
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    // =========================================================
    // MIGRATION 1: BẢNG SCRAPED_PRODUCTS (1,400+ sản phẩm)
    // =========================================================
    console.log("\n📦 Đang đọc dữ liệu bảng `scraped_products` từ Local...");
    const [products] = await localPool.query("SELECT * FROM scraped_products ORDER BY id ASC");
    console.log(`-> Tìm thấy ${products.length} sản phẩm ở Local. Bắt đầu đẩy lên TiDB Cloud...`);

    const BATCH_SIZE = 100;
    let insertedProducts = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = batch
        .map((p) => {
          values.push(
            p.product_key || `key_${p.id}_${Date.now()}`,
            p.platform || "Lazada",
            p.name,
            p.price,
            p.currency || "VND",
            p.image,
            p.url,
            p.condition_name || "New",
            p.category || "Product",
            p.location || "Vietnam",
            p.search_keyword || "",
            p.score || 0,
            p.reason || "",
            p.created_at || new Date(),
            p.updated_at || new Date()
          );
          return "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        })
        .join(", ");

      const sql = `
        INSERT INTO scraped_products 
        (product_key, platform, name, price, currency, image, url, condition_name, category, location, search_keyword, score, reason, created_at, updated_at)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
          price = IF(VALUES(price) IS NOT NULL AND VALUES(price) > 0, VALUES(price), price),
          image = IF(VALUES(image) IS NOT NULL AND VALUES(image) != '' AND VALUES(image) NOT LIKE 'data:%', VALUES(image), image),
          url = VALUES(url),
          category = IF(VALUES(category) IS NOT NULL AND VALUES(category) NOT IN ('Product', 'Lazada Product'), VALUES(category), category),
          search_keyword = VALUES(search_keyword),
          updated_at = NOW()
      `;

      await cloudPool.query(sql, values);
      insertedProducts += batch.length;
      console.log(`   + Đã đẩy: ${insertedProducts} / ${products.length} sản phẩm...`);
    }

    console.log(`✅ Hoàn thành bảng scraped_products: Đã đồng bộ ${insertedProducts} sản phẩm!`);

    // =========================================================
    // MIGRATION 2: BẢNG USERS
    // =========================================================
    try {
      console.log("\n👤 Đang đọc bảng `users`...");
      const [users] = await localPool.query("SELECT * FROM users");
      if (users.length > 0) {
        for (const u of users) {
          await cloudPool.query(
            `INSERT INTO users (id, email, password_hash, full_name, role, avatar_url, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               full_name = VALUES(full_name),
               avatar_url = VALUES(avatar_url),
               role = VALUES(role)`,
            [u.id, u.email, u.password_hash, u.full_name, u.role || "user", u.avatar_url, u.created_at, u.updated_at]
          );
        }
        console.log(`✅ Hoàn thành bảng users: Đã đồng bộ ${users.length} tài khoản!`);
      }
    } catch (err) {
      console.warn("Lưu ý bảng users:", err.message);
    }

    // =========================================================
    // MIGRATION 3: BẢNG USER_FAVORITES
    // =========================================================
    try {
      console.log("\n❤️ Đang đọc bảng `user_favorites`...");
      const [favs] = await localPool.query("SELECT * FROM user_favorites");
      if (favs.length > 0) {
        for (const f of favs) {
          await cloudPool.query(
            `INSERT INTO user_favorites (user_id, product_name, product_price, product_image, product_url, platform, score, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE created_at = VALUES(created_at)`,
            [f.user_id, f.product_name, f.product_price, f.product_image, f.product_url, f.platform, f.score, f.created_at]
          );
        }
        console.log(`✅ Hoàn thành bảng user_favorites: Đã đồng bộ ${favs.length} món quà yêu thích!`);
      }
    } catch (err) {
      console.warn("Lưu ý bảng user_favorites:", err.message);
    }

    // =========================================================
    // MIGRATION 4: BẢNG SEARCH_HISTORY
    // =========================================================
    try {
      console.log("\n📜 Đang đọc bảng `search_history`...");
      const [history] = await localPool.query("SELECT * FROM search_history");
      if (history.length > 0) {
        for (const h of history) {
          await cloudPool.query(
            `INSERT INTO search_history 
             (id, user_id, query_text, relationship, gender, age_range, occasion, budget, interests, ai_summary, ai_keywords, ai_items, products_snapshot, total_products, ip_address, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE query_text = VALUES(query_text)`,
            [
              h.id,
              h.user_id,
              h.query_text,
              h.relationship,
              h.gender,
              h.age_range,
              h.occasion,
              h.budget,
              typeof h.interests === "string" ? h.interests : JSON.stringify(h.interests || []),
              h.ai_summary,
              typeof h.ai_keywords === "string" ? h.ai_keywords : JSON.stringify(h.ai_keywords || []),
              typeof h.ai_items === "string" ? h.ai_items : JSON.stringify(h.ai_items || []),
              typeof h.products_snapshot === "string" ? h.products_snapshot : JSON.stringify(h.products_snapshot || []),
              h.total_products || 0,
              h.ip_address,
              h.created_at,
            ]
          );
        }
        console.log(`✅ Hoàn thành bảng search_history: Đã đồng bộ ${history.length} lượt tìm kiếm!`);
      }
    } catch (err) {
      console.warn("Lưu ý bảng search_history:", err.message);
    }

    // Kiểm tra tổng số sản phẩm hiện tại trên TiDB Cloud
    const [[{ totalOnCloud }]] = await cloudPool.query("SELECT COUNT(*) as totalOnCloud FROM scraped_products");
    console.log("\n=====================================================");
    console.log(`🎉 ĐỒNG BỘ THÀNH CÔNG RỰC RỠ!`);
    console.log(`📊 Tổng số sản phẩm hiện có trên TiDB Cloud: ${totalOnCloud} sản phẩm`);
    console.log("=====================================================");
  } catch (error) {
    console.error("❌ Lỗi trong quá trình đồng bộ:", error);
  } finally {
    await localPool.end();
    await cloudPool.end();
  }
}

if (require.main === module) {
  migrate().catch(console.error);
}

module.exports = { migrate };
