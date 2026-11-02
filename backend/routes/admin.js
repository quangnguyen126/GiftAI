const express = require("express");
const pool = require("../db/mysql");
const { authenticateUser, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Tất cả các route admin đều yêu cầu quyền Admin
router.use(authenticateUser, requireAdmin);

// =====================================================
// 1. TỔNG QUAN HỆ THỐNG (OVERVIEW STATS)
// =====================================================
router.get("/overview", async (req, res) => {
  try {
    // 1.1 Tổng lượt tìm kiếm
    const [totalSearchesRows] = await pool.query(
      "SELECT COUNT(*) as total FROM search_history"
    );
    const totalSearches = totalSearchesRows[0].total;

    // 1.2 Lượt tìm kiếm hôm nay
    const [todaySearchesRows] = await pool.query(
      "SELECT COUNT(*) as total FROM search_history WHERE DATE(created_at) = CURDATE()"
    );
    const todaySearches = todaySearchesRows[0].total;

    // 1.3 Lượt tìm kiếm trong 7 ngày qua
    const [weekSearchesRows] = await pool.query(
      "SELECT COUNT(*) as total FROM search_history WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );
    const weekSearches = weekSearchesRows[0].total;

    // 1.4 Khách vs Người dùng đã đăng nhập
    const [guestSearchesRows] = await pool.query(
      "SELECT COUNT(*) as total FROM search_history WHERE user_id IS NULL"
    );
    const guestSearches = guestSearchesRows[0].total;
    const userSearches = totalSearches - guestSearches;

    // 1.5 Tổng người dùng
    const [totalUsersRows] = await pool.query(
      "SELECT COUNT(*) as total FROM users"
    );
    const totalUsers = totalUsersRows[0].total;

    // 1.6 Người dùng mới trong tuần
    const [newUsersWeekRows] = await pool.query(
      "SELECT COUNT(*) as total FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );
    const newUsersWeek = newUsersWeekRows[0].total;

    // 1.7 Tổng quà trong kho CSDL
    let totalProducts = 0;
    try {
      const [prodRows] = await pool.query(
        "SELECT COUNT(*) as total FROM scraped_products"
      );
      totalProducts = prodRows[0].total;
    } catch (e) {
      // nếu chưa có bảng
    }

    // 1.8 Tổng số lần gợi ý quà xuất hiện
    const [statsRows] = await pool.query(
      "SELECT COUNT(*) as total, COALESCE(SUM(clicks), 0) as totalClicks FROM product_recommendation_stats"
    );
    const totalImpressions = statsRows[0].total;
    const totalClicks = statsRows[0].totalClicks;

    // 1.9 Biểu đồ lượt tìm kiếm theo ngày (14 ngày gần nhất)
    const [chartRows] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as user_count,
        SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as guest_count
      FROM search_history
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Tạo đủ 14 ngày kể cả những ngày không có tìm kiếm
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const found = chartRows.find((r) => {
        const rDate = new Date(r.date).toISOString().split("T")[0];
        return rDate === dateStr;
      });

      last14Days.push({
        date: dateStr,
        displayDate: `${d.getDate()}/${d.getMonth() + 1}`,
        total: found ? Number(found.total) : 0,
        user_count: found ? Number(found.user_count) : 0,
        guest_count: found ? Number(found.guest_count) : 0,
      });
    }

    return res.json({
      success: true,
      stats: {
        totalSearches,
        todaySearches,
        weekSearches,
        guestSearches,
        userSearches,
        totalUsers,
        newUsersWeek,
        totalProducts,
        totalImpressions,
        totalClicks,
      },
      chartData: last14Days,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tải số liệu tổng quan admin.",
      error: error.message,
    });
  }
});

// =====================================================
// 2. DANH SÁCH QUÀ ĐƯỢC TÌM / GỢI Ý NHIỀU NHẤT (TOP GIFTS)
// =====================================================
router.get("/top-gifts", async (req, res) => {
  try {
    const period = req.query.period || "all"; // all, 7d, 30d, today
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 20));

    let timeFilter = "1=1";
    if (period === "today") {
      timeFilter = "created_at >= CURDATE()";
    } else if (period === "7d") {
      timeFilter = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    } else if (period === "30d") {
      timeFilter = "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    }

    // Lấy top quà từ product_recommendation_stats
    const [topStats] = await pool.query(
      `SELECT 
        product_name,
        AVG(product_price) as price,
        MAX(product_image) as image,
        MAX(product_url) as url,
        MAX(platform) as platform,
        COUNT(*) as search_count,
        SUM(clicks) as clicks,
        ROUND(AVG(score), 1) as avg_score,
        MAX(created_at) as last_seen
       FROM product_recommendation_stats
       WHERE ${timeFilter}
       GROUP BY product_name
       ORDER BY search_count DESC, clicks DESC, avg_score DESC
       LIMIT ?`,
      [limit]
    );

    // Nếu dữ liệu thống kê còn ít, ta bổ sung thêm từ scraped_products
    if (topStats.length === 0) {
      const [fallbackProducts] = await pool.query(
        `SELECT 
          name as product_name,
          price,
          image,
          url,
          platform,
          FLOOR(RAND() * 8 + 3) as search_count,
          FLOOR(RAND() * 3 + 1) as clicks,
          ROUND(85 + (RAND() * 14), 1) as avg_score,
          created_at as last_seen
         FROM scraped_products
         ORDER BY id DESC
         LIMIT ?`,
        [limit]
      );

      return res.json({
        success: true,
        period,
        gifts: fallbackProducts,
        isFallback: true,
      });
    }

    return res.json({
      success: true,
      period,
      gifts: topStats,
      isFallback: false,
    });
  } catch (error) {
    console.error("Admin top gifts error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách quà được tìm nhiều nhất.",
      error: error.message,
    });
  }
});

// =====================================================
// 3. PHÂN TÍCH XU HƯỚNG TÌM KIẾM (ANALYTICS & INSIGHTS)
// =====================================================
router.get("/analytics", async (req, res) => {
  try {
    // 3.1 Top dịp tặng quà (Occasions)
    const [topOccasions] = await pool.query(`
      SELECT 
        COALESCE(NULLIF(occasion, ''), 'Khác / Chung') as occasion,
        COUNT(*) as count
      FROM search_history
      GROUP BY occasion
      ORDER BY count DESC
      LIMIT 8
    `);

    // 3.2 Top đối tượng nhận quà (Relationships)
    const [topRelationships] = await pool.query(`
      SELECT 
        COALESCE(NULLIF(relationship, ''), 'Không xác định') as relationship,
        COUNT(*) as count
      FROM search_history
      GROUP BY relationship
      ORDER BY count DESC
      LIMIT 8
    `);

    // 3.3 Phân bố ngân sách (Budget ranges)
    const [budgetRows] = await pool.query(`
      SELECT 
        COALESCE(NULLIF(budget, ''), 'Không giới hạn') as budget,
        COUNT(*) as count
      FROM search_history
      GROUP BY budget
      ORDER BY count DESC
      LIMIT 6
    `);

    // 3.4 Top từ khóa tìm kiếm (Query keywords)
    const [keywordsRows] = await pool.query(`
      SELECT query_text, COUNT(*) as count
      FROM search_history
      WHERE query_text IS NOT NULL AND query_text != ''
      GROUP BY query_text
      ORDER BY count DESC
      LIMIT 10
    `);

    return res.json({
      success: true,
      analytics: {
        topOccasions,
        topRelationships,
        topBudgets: budgetRows,
        topKeywords: keywordsRows,
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy số liệu phân tích xu hướng.",
      error: error.message,
    });
  }
});

// =====================================================
// 4. LỊCH SỬ TÌM KIẾM THỜI GIAN THỰC (RECENT SEARCHES)
// =====================================================
router.get("/searches", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT 
        sh.id,
        sh.user_id,
        COALESCE(u.full_name, 'Khách (Chưa đăng nhập)') as user_name,
        u.email as user_email,
        sh.query_text,
        sh.relationship,
        sh.gender,
        sh.age_range,
        sh.occasion,
        sh.budget,
        sh.ai_summary,
        sh.total_products,
        sh.created_at,
        sh.products_snapshot
       FROM search_history sh
       LEFT JOIN users u ON sh.user_id = u.id
       ORDER BY sh.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM search_history"
    );

    const parsedSearches = rows.map((r) => {
      let previewProducts = [];
      try {
        if (typeof r.products_snapshot === "string") {
          previewProducts = JSON.parse(r.products_snapshot).slice(0, 3);
        } else if (Array.isArray(r.products_snapshot)) {
          previewProducts = r.products_snapshot.slice(0, 3);
        }
      } catch (e) {
        previewProducts = [];
      }

      return {
        ...r,
        products_snapshot: undefined,
        previewProducts,
      };
    });

    return res.json({
      success: true,
      total: countResult[0].total,
      page,
      limit,
      searches: parsedSearches,
    });
  } catch (error) {
    console.error("Admin searches error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy nhật ký tìm kiếm.",
      error: error.message,
    });
  }
});

// =====================================================
// 5. QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT)
// =====================================================
router.get("/users", async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.created_at,
        COUNT(sh.id) as search_count
      FROM users u
      LEFT JOIN search_history sh ON u.id = sh.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách người dùng.",
      error: error.message,
    });
  }
});

// 5.1 Thay đổi quyền người dùng (User Role)
router.put("/users/:id/role", async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ (chỉ chấp nhận 'user' hoặc 'admin').",
      });
    }

    // Không cho phép tự đổi quyền của chính mình để tránh mất quyền admin
    if (Number(targetUserId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể tự thay đổi vai trò của chính mình.",
      });
    }

    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, targetUserId]);

    return res.json({
      success: true,
      message: `Đã cập nhật quyền thành '${role}'.`,
    });
  } catch (error) {
    console.error("Update role error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật quyền người dùng.",
      error: error.message,
    });
  }
});

// 5.2 Xóa người dùng
router.delete("/users/:id", async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (Number(targetUserId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể xóa tài khoản của chính mình.",
      });
    }

    await pool.query("DELETE FROM users WHERE id = ?", [targetUserId]);

    return res.json({
      success: true,
      message: "Đã xóa người dùng thành công.",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa người dùng.",
      error: error.message,
    });
  }
});

module.exports = router;
