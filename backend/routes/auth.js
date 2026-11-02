const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/mysql");
const { generateToken, authenticateUser, requireAuth } = require("../middleware/auth");

const router = express.Router();

// =====================================================
// ĐĂNG KÝ (REGISTER)
// =====================================================
router.post("/register", async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu.",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự.",
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email này đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'user')",
      [cleanEmail, passwordHash, String(full_name).trim()]
    );

    const newUserId = result.insertId;
    const token = generateToken(newUserId);

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công!",
      token,
      user: {
        id: newUserId,
        email: cleanEmail,
        full_name: String(full_name).trim(),
        role: "user",
        avatar_url: null,
      },
    });
  } catch (error) {
    console.error("Auth register error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi đăng ký. Vui lòng thử lại sau.",
      error: error.message,
    });
  }
});

// =====================================================
// ĐĂNG NHẬP (LOGIN)
// =====================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu.",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const [users] = await pool.query(
      "SELECT id, email, password_hash, full_name, role, avatar_url FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản hoặc mật khẩu không chính xác.",
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản hoặc mật khẩu không chính xác.",
      });
    }

    const token = generateToken(user.id);

    return res.json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error("Auth login error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi đăng nhập.",
      error: error.message,
    });
  }
});

// =====================================================
// LẤY THÔNG TIN TÀI KHOẢN HIỆN TẠI (GET ME)
// =====================================================
router.get("/me", authenticateUser, requireAuth, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;
