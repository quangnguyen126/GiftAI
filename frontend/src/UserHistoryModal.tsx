import { useState, useEffect, useCallback } from "react";
import type { SearchHistoryItem } from "./types";
import { API_URL } from "./config";
import "./UserHistoryModal.css";

interface UserHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  apiUrl?: string;
  onRerunSearch: (item: SearchHistoryItem) => void;
}

export default function UserHistoryModal({
  isOpen,
  onClose,
  token,
  apiUrl = API_URL,
  onRerunSearch,
}: UserHistoryModalProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/api/user/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể tải lịch sử tìm kiếm.");
      }
      setHistory(data.history || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Lỗi tải lịch sử.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  useEffect(() => {
    if (isOpen && token) {
      fetchHistory();
    }
  }, [isOpen, token, fetchHistory]);

  if (!isOpen) return null;

  const handleDeleteItem = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/user/history/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    if (!token) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử gợi ý quà?")) {
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/user/history`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setHistory([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Đang cập nhật";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <div className="history-header-left">
            <div className="history-icon-badge">📜</div>
            <div>
              <h2 className="history-title">Lịch sử gợi ý quà tặng</h2>
              <p className="history-subtitle">
                Xem lại các lần tìm kiếm và gợi ý quà thông minh mà AI đã tư vấn cho bạn
              </p>
            </div>
          </div>

          <div className="history-header-actions">
            {history.length > 0 && (
              <button className="history-clear-all-btn" onClick={handleClearAll}>
                🗑️ Xóa tất cả
              </button>
            )}
            <button className="history-close-btn" onClick={onClose} title="Đóng">
              ✕
            </button>
          </div>
        </div>

        <div className="history-content">
          {loading && (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              ⏳ Đang tải lịch sử gợi ý quà...
            </div>
          )}

          {error && (
            <div className="auth-error" style={{ margin: "10px 0" }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="history-empty-state">
              <div className="history-empty-icon">🎁</div>
              <div className="history-empty-title">Chưa có lịch sử tìm kiếm nào</div>
              <p>
                Mỗi khi bạn tìm kiếm quà tặng trong tài khoản, AI sẽ tự động lưu lại các gợi ý
                phù hợp để bạn có thể xem lại bất kỳ lúc nào!
              </p>
            </div>
          )}

          {!loading &&
            history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-item-top">
                  <div>
                    <h3 className="history-query-text">
                      {item.query_text || "Tìm kiếm quà tặng phù hợp"}
                    </h3>
                    <div className="history-meta-badges">
                      <span className="history-tag">🕒 {formatDate(item.created_at)}</span>
                      {item.occasion && (
                        <span className="history-tag highlight">🎉 {item.occasion}</span>
                      )}
                      {item.relationship && (
                        <span className="history-tag">👥 {item.relationship}</span>
                      )}
                      {item.budget && (
                        <span className="history-tag">💰 {item.budget}</span>
                      )}
                      {item.gender && (
                        <span className="history-tag">⚧ {item.gender}</span>
                      )}
                    </div>
                  </div>

                  <div className="history-item-actions">
                    <button
                      className="history-rerun-btn"
                      onClick={() => {
                        onRerunSearch(item);
                        onClose();
                      }}
                      title="Tìm kiếm lại với các thông tin này"
                    >
                      🔄 Tìm lại
                    </button>
                    <button
                      className="history-delete-btn"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Xóa mục này"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {item.ai_summary && (
                  <div className="history-ai-summary">
                    💡 <strong>Gợi ý AI:</strong> {item.ai_summary}
                  </div>
                )}

                {item.products && item.products.length > 0 && (
                  <div>
                    <div className="history-products-title">
                      Các món quà được gợi ý ({item.products.length} sản phẩm):
                    </div>
                    <div className="history-products-grid">
                      {item.products.slice(0, 4).map((prod, idx) => (
                        <a
                          key={idx}
                          href={prod.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="history-product-card"
                        >
                          <img
                            src={
                              prod.image
                                ? `${apiUrl}/api/image-proxy?url=${encodeURIComponent(prod.image)}`
                                : "https://via.placeholder.com/150?text=Gift"
                            }
                            alt={prod.name}
                            className="history-product-thumb"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://via.placeholder.com/150?text=Gift";
                            }}
                          />
                          <div className="history-product-name" title={prod.name}>
                            {prod.name}
                          </div>
                          <div className="history-product-price">
                            {formatPrice(prod.price)}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
