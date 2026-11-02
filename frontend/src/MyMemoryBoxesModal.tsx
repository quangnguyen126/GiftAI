import { useState, useEffect } from "react";
import {
  Heart,
  Eye,
  Copy,
  ExternalLink,
  Trash2,
  X,
  Plus,
  Check,
} from "lucide-react";
import type { MemoryBox } from "./types";
import { API_URL } from "./config";
import "./MyMemoryBoxesModal.css";

interface MyMemoryBoxesModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onOpenViewer: (shareCode: string) => void;
  onCreateNew: () => void;
}

export function MyMemoryBoxesModal({
  isOpen,
  onClose,
  token,
  onOpenViewer,
  onCreateNew,
}: MyMemoryBoxesModalProps) {
  const [boxes, setBoxes] = useState<MemoryBox[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const fetchBoxes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/memory-box/user/my-boxes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.boxes)) {
        setBoxes(data.boxes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBoxes();
    }
  }, [isOpen, token]);

  const handleCopyLink = (shareCode: string) => {
    const url = `${window.location.origin}/?box=${shareCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(shareCode);
    showToast("📋 Đã sao chép liên kết hộp quà!");
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDeleteBox = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hộp quà kỷ niệm này không?")) return;
    try {
      const res = await fetch(`${API_URL}/api/memory-box/user/my-boxes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBoxes((prev) => prev.filter((b) => b.id !== id));
        showToast("🗑️ Đã xóa hộp quà kỷ niệm.");
      }
    } catch {
      showToast("⚠️ Không thể xóa lúc này.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="my-boxes-overlay" onClick={onClose}>
      <div className="my-boxes-modal" onClick={(e) => e.stopPropagation()}>
        {toastMsg && <div className="my-boxes-toast">{toastMsg}</div>}

        <div className="my-boxes-header">
          <div className="my-boxes-title-group">
            <div className="my-boxes-icon">🎁</div>
            <div>
              <h2 className="my-boxes-title">Hộp Quà Kỷ Niệm Của Tôi</h2>
              <p className="my-boxes-subtitle">
                Quản lý các trang mở quà đã tạo, theo dõi lượt mở và lượt thả tim
              </p>
            </div>
          </div>
          <button className="my-boxes-close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="my-boxes-body">
          <div className="my-boxes-actions-bar">
            <span className="boxes-count-label">
              Tổng số: <strong>{boxes.length}</strong> hộp quà đã tạo
            </span>
            <button
              className="new-box-btn"
              onClick={() => {
                onClose();
                onCreateNew();
              }}
            >
              <Plus size={16} /> Tạo Hộp Quà Mới
            </button>
          </div>

          {loading ? (
            <div className="my-boxes-loading">
              <div className="loading-spinner" />
              <p>Đang tải danh sách hộp quà...</p>
            </div>
          ) : boxes.length === 0 ? (
            <div className="my-boxes-empty">
              <div className="empty-box-icon">🎁</div>
              <h3>Chưa có hộp quà kỷ niệm nào</h3>
              <p>
                Hãy tạo ngay một chiếc hộp quà 3D bất ngờ kèm bức tâm thư yêu thương để chia sẻ tới người thân!
              </p>
              <button
                className="create-first-box-btn"
                onClick={() => {
                  onClose();
                  onCreateNew();
                }}
              >
                <Plus size={18} /> Tạo Hộp Quà Kỷ Niệm Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="boxes-list-grid">
              {boxes.map((b) => (
                <div key={b.id} className="box-item-card">
                  <div className="box-item-header">
                    <span className="box-item-occasion">{b.occasion}</span>
                    <span className="box-item-date">
                      {new Date(b.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>

                  <h3 className="box-item-title">{b.title}</h3>
                  <p className="box-item-names">
                    Gửi tới: <strong>{b.recipient_name}</strong>
                  </p>

                  <div className="box-item-stats">
                    <div className="stat-pill">
                      <Eye size={14} /> {b.unboxed_count} lượt mở
                    </div>
                    <div className="stat-pill hearts-pill">
                      <Heart size={14} /> {b.hearts_count} tim
                    </div>
                  </div>

                  <div className="box-item-actions">
                    <button
                      className="box-action-btn view-btn"
                      onClick={() => {
                        onClose();
                        onOpenViewer(b.share_code);
                      }}
                      title="Mở xem trang quà"
                    >
                      <ExternalLink size={15} /> Mở xem
                    </button>
                    <button
                      className="box-action-btn copy-btn"
                      onClick={() => handleCopyLink(b.share_code)}
                      title="Sao chép link chia sẻ"
                    >
                      {copiedCode === b.share_code ? (
                        <Check size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                      {copiedCode === b.share_code ? "Đã chép" : "Chép link"}
                    </button>
                    <button
                      className="box-action-btn delete-btn"
                      onClick={() => handleDeleteBox(b.id)}
                      title="Xóa hộp quà"
                    >
                      <Trash2 size={15} />
                    </button>
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

export default MyMemoryBoxesModal;
