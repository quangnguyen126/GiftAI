const jwt = require("jsonwebtoken");
const pool = require("../db/mysql");

const JWT_SECRET = process.env.JWT_SECRET || "giftfinder_jwt_secret_key_2026";

// Middleware trích xuất user nếu có token (dành cho cả khách và user đăng nhập)
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const [rows] = await pool.query(
        "SELECT id, email, full_name, role, avatar_url FROM users WHERE id = ?",
        [decoded.userId]
      );

      if (rows.length > 0) {
        req.user = rows[0];
      } else {
        req.user = null;
      }
    } catch (err) {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

// Bắt buộc phải đăng nhập
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để tiếp tục.",
    });
  }
  next;
  next();
}

// Bắt buộc quyền Admin
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập với tài khoản Admin.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền truy cập trang quản trị Admin.",
    });
  }

  next();
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

module.exports = {
  authenticateUser,
  requireAuth,
  requireAdmin,
  generateToken,
};
