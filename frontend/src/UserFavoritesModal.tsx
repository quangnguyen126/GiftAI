import { useState, useEffect, useCallback } from "react";
import type { FavoriteItem } from "./types";
import { API_URL } from "./config";
import "./UserFavoritesModal.css";

interface UserFavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  apiUrl?: string;
}

export default function UserFavoritesModal({
  isOpen,
  onClose,
  token,
  apiUrl = API_URL,
}: UserFavoritesModalProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedToast, setCopiedToast] = useState(false);

  const handleShareWishlist = () => {
    if (favorites.length === 0) return;
    const itemsText = favorites
      .slice(0, 5)
      .map(
        (item, idx) =>
          `✨ ${idx + 1}. ${item.product_name} (${formatPrice(item.product_price)})`
      )
      .join("\n");

    const message = `Gửi người thương của em/anh! ❤️✨\nEm/Anh vừa chọn được mấy món quà siêu ưng ý này trên GiftAI nè:\n\n${itemsText}\n\nNgười ấy xem thử có món nào hợp ý không nha, sắp đến ngày đặc biệt rồi đó! 😉🎁💖\n🔗 Khám phá thêm tại GiftAI: http://localhost:5173/`;

    navigator.clipboard.writeText(message).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 4500);
    });
  };

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/api/user/favorites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể tải danh sách yêu thích.");
      }
      setFavorites(data.favorites || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Lỗi tải quà yêu thích.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  useEffect(() => {
    if (isOpen && token) {
      fetchFavorites();
    }
  }, [isOpen, token, fetchFavorites]);

  if (!isOpen) return null;

  const handleRemove = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/user/favorites/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setFavorites((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatPrice = (price?: number | null) => {
    if (!price) return "Đang cập nhật";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="fav-modal-overlay" onClick={onClose}>
      <div className="fav-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="fav-header">
          <div className="fav-header-left">
            <div className="fav-icon-badge">❤️</div>
            <div>
              <h2 className="fav-title">Quà tặng yêu thích đã lưu</h2>
              <p className="fav-subtitle">
                Bộ sưu tập những món quà bạn ưng ý nhất để cân nhắc hoặc gợi ý cho người ấy
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {favorites.length > 0 && (
              <button
                className="fav-share-btn"
                onClick={handleShareWishlist}
                title="Sao chép tin nhắn đòi quà ngọt ngào để gửi qua Zalo / Messenger"
              >
                💌 Gợi ý đòi quà người yêu
              </button>
            )}
            <button className="fav-close-btn" onClick={onClose} title="Đóng">
              ✕
            </button>
          </div>
        </div>

        {copiedToast && (
          <div className="fav-copied-toast">
            🎉 <b>Đã sao chép tin nhắn đòi quà cực khéo!</b> Bạn hãy mở Zalo / Messenger và dán (Ctrl + V) gửi ngay cho người ấy nhé! 😉🎁
          </div>
        )}

        <div className="fav-content">
          {loading && (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              ⏳ Đang tải quà yêu thích...
            </div>
          )}

          {error && (
            <div className="auth-error" style={{ margin: "10px 0" }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && favorites.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎁</div>
              <h3 style={{ fontSize: "18px", color: "#1e293b", margin: "0 0 6px" }}>
                Chưa có món quà nào trong danh sách
              </h3>
              <p>
                Khi xem kết quả gợi ý quà, bạn có thể bấm nút trái tim ❤️ để lưu lại vào đây!
              </p>
            </div>
          )}

          {!loading && favorites.length > 0 && (
            <div className="fav-grid">
              {favorites.map((item) => (
                <div key={item.id} className="fav-card">
                  <div className="fav-thumb-wrap">
                    <img
                      src={
                        item.product_image
                          ? `${apiUrl}/api/image-proxy?url=${encodeURIComponent(item.product_image)}`
                          : "https://via.placeholder.com/150?text=Gift"
                      }
                      alt={item.product_name}
                      className="fav-thumb"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://via.placeholder.com/150?text=Gift";
                      }}
                    />
                    <button
                      className="fav-remove-btn"
                      onClick={() => handleRemove(item.id)}
                      title="Xóa khỏi yêu thích"
                    >
                      ❤️
                    </button>
                  </div>

                  <div className="fav-card-body">
                    <h4 className="fav-product-name" title={item.product_name}>
                      {item.product_name}
                    </h4>

                    <div className="fav-card-footer">
                      <div className="fav-price">{formatPrice(item.product_price)}</div>
                      {item.product_url && (
                        <a
                          href={item.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fav-link-btn"
                        >
                          Mua ngay ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
