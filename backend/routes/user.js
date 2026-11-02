const express = require("express");
const pool = require("../db/mysql");
const { authenticateUser, requireAuth } = require("../middleware/auth");

const router = express.Router();

// Tất cả các route user đều yêu cầu đăng nhập
router.use(authenticateUser, requireAuth);

// =====================================================
// LỊCH SỬ GỢI Ý QUÀ CỦA NGƯỜI DÙNG
// =====================================================

// 1. Lấy danh sách lịch sử gợi ý quà
router.get("/history", async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT id, query_text, relationship, gender, age_range, occasion, 
              budget, interests, ai_summary, ai_keywords, ai_items, 
              products_snapshot, total_products, created_at 
       FROM search_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM search_history WHERE user_id = ?",
      [userId]
    );

    const parsedRows = rows.map((row) => ({
      ...row,
      interests: typeof row.interests === "string" ? JSON.parse(row.interests || "[]") : row.interests || [],
      ai_keywords: typeof row.ai_keywords === "string" ? JSON.parse(row.ai_keywords || "[]") : row.ai_keywords || [],
      ai_items: typeof row.ai_items === "string" ? JSON.parse(row.ai_items || "[]") : row.ai_items || [],
      products: typeof row.products_snapshot === "string" ? JSON.parse(row.products_snapshot || "[]") : row.products_snapshot || [],
    }));

    return res.json({
      success: true,
      total: countResult[0].total,
      page,
      limit,
      history: parsedRows,
    });
  } catch (error) {
    console.error("Get user history error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy lịch sử gợi ý quà.",
      error: error.message,
    });
  }
});

// 2. Xóa 1 mục lịch sử
router.delete("/history/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const historyId = req.params.id;

    await pool.query("DELETE FROM search_history WHERE id = ? AND user_id = ?", [
      historyId,
      userId,
    ]);

    return res.json({
      success: true,
      message: "Đã xóa mục lịch sử.",
    });
  } catch (error) {
    console.error("Delete history error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa lịch sử.",
      error: error.message,
    });
  }
});

// 3. Xóa toàn bộ lịch sử của người dùng
router.delete("/history", async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query("DELETE FROM search_history WHERE user_id = ?", [userId]);

    return res.json({
      success: true,
      message: "Đã xóa toàn bộ lịch sử gợi ý quà.",
    });
  } catch (error) {
    console.error("Clear all history error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa tất cả lịch sử.",
      error: error.message,
    });
  }
});

// =====================================================
// QUÀ YÊU THÍCH (FAVORITES)
// =====================================================

// 1. Lấy danh sách quà yêu thích
router.get("/favorites", async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT id, product_name, product_price, product_image, product_url, 
              platform, score, created_at 
       FROM user_favorites 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      favorites: rows,
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách quà yêu thích.",
      error: error.message,
    });
  }
});

// 2. Thêm quà vào danh sách yêu thích
router.post("/favorites", async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_name, product_price, product_image, product_url, platform, score } = req.body;

    if (!product_name) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin tên món quà.",
      });
    }

    // Kiểm tra đã lưu chưa
    const [existing] = await pool.query(
      "SELECT id FROM user_favorites WHERE user_id = ? AND product_name = ?",
      [userId, product_name]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: "Món quà này đã có trong danh sách yêu thích.",
        id: existing[0].id,
      });
    }

    const [result] = await pool.query(
      `INSERT INTO user_favorites 
       (user_id, product_name, product_price, product_image, product_url, platform, score) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, product_name, product_price || null, product_image || null, product_url || null, platform || "lazada", score || 0]
    );

    return res.json({
      success: true,
      message: "Đã lưu món quà vào danh sách yêu thích!",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lưu quà yêu thích.",
      error: error.message,
    });
  }
});

// 3. Xóa quà khỏi danh sách yêu thích
router.delete("/favorites/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const favId = req.params.id;

    await pool.query("DELETE FROM user_favorites WHERE id = ? AND user_id = ?", [
      favId,
      userId,
    ]);

    return res.json({
      success: true,
      message: "Đã xóa khỏi danh sách yêu thích.",
    });
  } catch (error) {
    console.error("Delete favorite error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa quà yêu thích.",
      error: error.message,
    });
  }
});

module.exports = router;
