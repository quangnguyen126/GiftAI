import { useState, useEffect, type FormEvent } from "react";
import type { User } from "./types";
import { API_URL } from "./config";
import "./AuthModal.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
  onAuthSuccess: (user: User, token: string) => void;
  apiUrl?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = "login",
  onAuthSuccess,
  apiUrl = API_URL,
}: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError("");
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    if (tab === "register") {
      if (!fullName) {
        setError("Vui lòng nhập họ và tên của bạn.");
        return;
      }
      if (password.length < 6) {
        setError("Mật khẩu phải có tối thiểu 6 ký tự.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp.");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint =
        tab === "login" ? `${apiUrl}/api/auth/login` : `${apiUrl}/api/auth/register`;
      const body =
        tab === "login"
          ? { email: email.trim().toLowerCase(), password }
          : {
              email: email.trim().toLowerCase(),
              password,
              full_name: fullName.trim(),
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Đã xảy ra lỗi, vui lòng thử lại.");
      }

      // Lưu vào localStorage
      localStorage.setItem("giftfinder_token", data.token);
      localStorage.setItem("giftfinder_user", JSON.stringify(data.user));

      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Đã xảy ra lỗi kết nối đến máy chủ.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setTab("login");
    setError("");
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} title="Đóng">
          ✕
        </button>

        <div className="auth-header">
          <div className="auth-logo-icon">🎁</div>
          <h2 className="auth-title">
            {tab === "login" ? "Chào mừng trở lại!" : "Tạo tài khoản GiftFinder"}
          </h2>
          <p className="auth-subtitle">
            {tab === "login"
              ? "Đăng nhập để xem lịch sử gợi ý quà và lưu sản phẩm yêu thích"
              : "Đăng ký nhanh chóng để cá nhân hóa trải nghiệm tìm quà"}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${tab === "login" ? "active" : ""}`}
              onClick={() => {
                setTab("login");
                setError("");
              }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${tab === "register" ? "active" : ""}`}
              onClick={() => {
                setTab("register");
                setError("");
              }}
            >
              Đăng ký
            </button>
          </div>
        </div>

        <div className="auth-body">
          {error && <div className="auth-error">⚠️ {error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {tab === "register" && (
              <div className="auth-form-group">
                <label className="auth-label">Họ và tên</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">👤</span>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="auth-form-group">
              <label className="auth-label">Địa chỉ Email</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">✉️</span>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">🔒</span>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {tab === "register" && (
              <div className="auth-form-group">
                <label className="auth-label">Nhập lại mật khẩu</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading
                ? "Đang xử lý..."
                : tab === "login"
                ? "Đăng nhập ngay"
                : "Tạo tài khoản"}
            </button>
          </form>

          {/* Tài khoản mẫu tiện lợi cho việc kiểm thử */}
          <div className="auth-demo-section">
            <div className="auth-demo-title">
              <span>⚡ Tài khoản trải nghiệm nhanh</span>
            </div>
            <div className="auth-demo-buttons">
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => handleQuickLogin("admin@giftfinder.com", "admin123")}
              >
                <span className="auth-demo-btn-role">👑 Quản Trị Viên</span>
                <span className="auth-demo-btn-email">admin@giftfinder.com</span>
              </button>
              <button
                type="button"
                className="auth-demo-btn"
                onClick={() => handleQuickLogin("user@giftfinder.com", "user123")}
              >
                <span className="auth-demo-btn-role">👤 Người Dùng</span>
                <span className="auth-demo-btn-email">user@giftfinder.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
