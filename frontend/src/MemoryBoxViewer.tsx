import { useState, useEffect } from "react";
import {
  Gift,
  Heart,
  Sparkles,
  Send,
  ExternalLink,
  ArrowLeft,
  MessageCircleHeart,
} from "lucide-react";
import type { MemoryBox, MemoryBoxReaction } from "./types";
import { API_URL } from "./config";
import ConfettiEffect from "./ConfettiEffect";
import "./MemoryBoxViewer.css";

interface MemoryBoxViewerProps {
  shareCode: string;
  onClose?: () => void;
  onCreateNew?: () => void;
}

export function MemoryBoxViewer({
  shareCode,
  onClose,
  onCreateNew,
}: MemoryBoxViewerProps) {
  const [box, setBox] = useState<MemoryBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Unboxing interactive state
  const [isUnboxed, setIsUnboxed] = useState(false);
  const [unboxingAnim, setUnboxingAnim] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  // Heart state
  const [heartsCount, setHeartsCount] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; x: number }>>([]);

  // Reaction feedback state
  const [fromName, setFromName] = useState("");
  const [reactionText, setReactionText] = useState("");
  const [submittingReaction, setSubmittingReaction] = useState(false);
  const [reactions, setReactions] = useState<MemoryBoxReaction[]>([]);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    if (!shareCode) return;
    const fetchBox = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/api/memory-box/${shareCode}`);
        const data = await res.json();
        if (data.success && data.box) {
          setBox(data.box);
          setHeartsCount(data.box.hearts_count || 0);
          setReactions(data.box.reactions || []);
        } else {
          setError(data.message || "Không tìm thấy hộp quà kỷ niệm.");
        }
      } catch (err: any) {
        console.error(err);
        setError("Lỗi kết nối khi tải hộp quà.");
      } finally {
        setLoading(false);
      }
    };
    fetchBox();
  }, [shareCode]);

  const handleUnbox = async () => {
    if (isUnboxed || unboxingAnim) return;

    setUnboxingAnim(true);

    // Trigger celebration effects
    setTimeout(() => {
      setIsUnboxed(true);
      setConfettiActive(true);
      setUnboxingAnim(false);
    }, 900);

    // Call API to register unboxing
    try {
      fetch(`${API_URL}/api/memory-box/${shareCode}/unbox`, {
        method: "POST",
      });
    } catch {}
  };

  const handleHeartClick = async () => {
    setHeartsCount((prev) => prev + 1);
    const newHeart = {
      id: Date.now(),
      x: 30 + Math.random() * 40,
    };
    setFloatingHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);

    try {
      await fetch(`${API_URL}/api/memory-box/${shareCode}/heart`, {
        method: "POST",
      });
    } catch {}
  };

  const handleSendReaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactionText.trim()) return;

    setSubmittingReaction(true);
    try {
      const res = await fetch(`${API_URL}/api/memory-box/${shareCode}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromName: fromName.trim() || box?.recipient_name || "Người nhận",
          text: reactionText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.reactions) {
        setReactions(data.reactions);
        setReactionText("");
        showToast("💌 Đã gửi lời cảm ơn thành công!");
      }
    } catch {
      showToast("⚠️ Không thể gửi phản hồi lúc này.");
    } finally {
      setSubmittingReaction(false);
    }
  };

  const calculateDays = () => {
    if (!box?.milestone_date) return 0;
    const target = new Date(box.milestone_date).getTime();
    const now = new Date().getTime();
    return Math.floor(Math.abs(now - target) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="viewer-backdrop">
        <div className="viewer-loading-card">
          <div className="viewer-spinner" />
          <p>Đang chuẩn bị hộp quà kỷ niệm diệu kỳ...</p>
        </div>
      </div>
    );
  }

  if (error || !box) {
    return (
      <div className="viewer-backdrop">
        <div className="viewer-error-card">
          <div className="error-icon">🥀</div>
          <h3>Không tìm thấy hộp quà</h3>
          <p>{error || "Liên kết hộp quà không hợp lệ hoặc đã hết hạn."}</p>
          {onClose && (
            <button className="viewer-back-btn" onClick={onClose}>
              <ArrowLeft size={16} /> Quay lại trang chủ
            </button>
          )}
        </div>
      </div>
    );
  }

  const daysDiff = calculateDays();
  const themeClass = `viewer-theme-${box.theme || "romantic"}`;

  return (
    <div className={`viewer-backdrop ${themeClass}`}>
      <ConfettiEffect active={confettiActive} durationMs={5000} />

      {/* FLOATING HEARTS */}
      {floatingHearts.map((h) => (
        <div
          key={h.id}
          className="floating-heart"
          style={{ left: `${h.x}%` }}
        >
          ❤️
        </div>
      ))}

      {/* TOAST */}
      {toastMsg && <div className="viewer-toast">{toastMsg}</div>}

      {/* TOP NAV BAR */}
      <div className="viewer-top-bar">
        {onClose && (
          <button className="top-nav-btn" onClick={onClose} title="Quay lại">
            <ArrowLeft size={18} /> Về trang chủ
          </button>
        )}
        <div className="viewer-brand">
          <Sparkles size={16} /> GiftAI Memory Box
        </div>
        {onCreateNew && (
          <button className="top-nav-btn create-btn" onClick={onCreateNew}>
            <Gift size={16} /> Tự tạo hộp quà
          </button>
        )}
      </div>

      <div className="viewer-content-container">
        {/* ========================================================= */}
        {/* MÀN HÌNH 1: HỘP QUÀ CHƯA MỞ (THE UNOPENED BOX)          */}
        {/* ========================================================= */}
        {!isUnboxed ? (
          <div className="unopened-stage">
            <div className="unopened-badge">
              <Sparkles size={14} className="sparkle-icon" /> {box.occasion}
            </div>

            <h1 className="unopened-headline">{box.title}</h1>

            <p className="unopened-teaser-names">
              Một món quà bất ngờ từ <strong>{box.sender_name}</strong> dành tặng cho{" "}
              <strong>{box.recipient_name}</strong>
            </p>

            {/* MILESTONE TEASER */}
            {box.milestone_type !== "none" && (
              <div className="unopened-milestone-banner">
                <span className="milestone-badge-icon">
                  {box.milestone_type === "countup" ? "❤️" : "⏳"}
                </span>
                <span>
                  {box.milestone_type === "countup"
                    ? `Đã cùng nhau đi qua ${daysDiff} ngày yêu thương`
                    : `Chỉ còn ${daysDiff} ngày nữa là đến cột mốc đặc biệt`}
                </span>
              </div>
            )}

            {/* 3D GIFT BOX WITH INTERACTION */}
            <div
              className={`box-3d-wrap ${unboxingAnim ? "is-opening" : ""}`}
              onClick={handleUnbox}
            >
              <div className="box-glow-ring" />
              <div className="box-lid">🎀</div>
              <div className="box-body">🎁</div>
              <div className="box-shadow-bottom" />
            </div>

            <button
              className="open-box-cta-btn"
              onClick={handleUnbox}
              disabled={unboxingAnim}
            >
              <Gift size={22} className="gift-pulse-icon" />
              {unboxingAnim ? "Đang mở hộp quà..." : "CHẠM ĐỂ MỞ HỘP QUÀ BẤT NGỜ"}
            </button>

            <p className="open-box-hint">
              ✨ Hãy chạm vào chiếc hộp để khám phá điều kỳ diệu bên trong
            </p>
          </div>
        ) : (
          /* ========================================================= */
          /* MÀN HÌNH 2: KHOẢNH KHẮC SAU KHI MỞ HỘP (UNBOXED STATE)    */
          /* ========================================================= */
          <div className="unboxed-stage">
            {/* HERO CELEBRATION HEADER */}
            <div className="celebration-hero-card">
              <div className="celebration-badge">
                🎉 Món Quà Kỷ Niệm Từ {box.sender_name}
              </div>
              <h1 className="celebration-title">{box.title}</h1>
              <p className="celebration-subtitle">
                Gửi trọn tình cảm và những lời chúc ý nghĩa nhất tới{" "}
                <strong>{box.recipient_name}</strong>
              </p>

              {/* MILESTONE COUNTER DISPLAY */}
              {box.milestone_type !== "none" && (
                <div className="milestone-counter-display">
                  <div className="counter-icon-wrap">
                    {box.milestone_type === "countup" ? "❤️" : "⏳"}
                  </div>
                  <div className="counter-data">
                    <div className="counter-digits">{daysDiff}</div>
                    <div className="counter-unit">
                      {box.milestone_type === "countup"
                        ? "NGÀY ĐỒNG HÀNH BÊN NHAU"
                        : "NGÀY ĐẾM NGƯỢC ĐẾN THỜI KHẮC ĐẶC BIỆT"}
                    </div>
                  </div>
                  <div className="counter-love-note">
                    {box.milestone_type === "countup"
                      ? `~ ${Math.floor(daysDiff / 30)} tháng • ${Math.floor(
                          daysDiff * 24
                        ).toLocaleString()} giờ tràn ngập kỷ niệm đẹp`
                      : "Khoảnh khắc thiêng liêng đang đến rất gần ✨"}
                  </div>
                </div>
              )}
            </div>

            {/* HEARTFELT LETTER */}
            <div className="letter-parchment-card">
              <div className="letter-wax-seal">💌</div>
              <div className="letter-greeting">
                Thương gửi <strong>{box.recipient_name}</strong>,
              </div>
              <p className="letter-body-text">{box.letter_content}</p>
              <div className="letter-signature">
                Mãi yêu thương & trân trọng,
                <br />
                <strong>{box.sender_name}</strong>
              </div>
            </div>

            {/* ATTACHED SECRET GIFT */}
            {box.product_name && (
              <div className="unboxed-gift-card">
                <div className="gift-card-badge">
                  <Gift size={16} /> Món Quà Bí Mật Đính Kèm
                </div>
                <div className="gift-card-body">
                  {box.product_image && (
                    <img
                      src={box.product_image}
                      alt={box.product_name}
                      className="gift-card-image"
                    />
                  )}
                  <div className="gift-card-info">
                    <h3 className="gift-card-name">{box.product_name}</h3>
                    {box.product_price && (
                      <div className="gift-card-price">
                        {Number(box.product_price).toLocaleString("vi-VN")} đ
                      </div>
                    )}
                    {box.product_url && (
                      <a
                        href={box.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="gift-card-shop-link"
                      >
                        <ExternalLink size={15} /> Xem chi tiết món quà này
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* INTERACTIVE LOVE & REACTION BAR */}
            <div className="interaction-section">
              <div className="hearts-love-card">
                <button className="heart-burst-btn" onClick={handleHeartClick}>
                  <Heart className="heart-pulse-icon" /> Thả tim ({heartsCount})
                </button>
                <span className="hearts-hint">
                  Bấm để gửi ngàn yêu thương tới {box.sender_name}!
                </span>
              </div>

              {/* REACTION FORM */}
              <div className="reaction-box-card">
                <h4 className="reaction-heading">
                  <MessageCircleHeart size={18} /> Gửi lời cảm ơn đến {box.sender_name}
                </h4>
                <form onSubmit={handleSendReaction} className="reaction-form">
                  <input
                    type="text"
                    placeholder="Tên của bạn (VD: Em Trang)..."
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="reaction-name-input"
                  />
                  <div className="reaction-input-wrap">
                    <input
                      type="text"
                      placeholder="Viết lời nhắn gửi lại..."
                      value={reactionText}
                      onChange={(e) => setReactionText(e.target.value)}
                      className="reaction-text-input"
                    />
                    <button
                      type="submit"
                      disabled={submittingReaction || !reactionText.trim()}
                      className="reaction-submit-btn"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>

                {/* REACTIONS LIST */}
                {reactions.length > 0 && (
                  <div className="reactions-feed">
                    {reactions.map((r) => (
                      <div key={r.id} className="reaction-bubble">
                        <strong className="reaction-author">{r.from}:</strong>{" "}
                        <span className="reaction-content">{r.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* VIRAL SHARE FOOTER */}
            <div className="viewer-viral-footer">
              <p>Bạn cũng muốn tạo một hộp quà kỷ niệm diệu kỳ như thế này?</p>
              <button
                className="create-own-box-btn"
                onClick={() => {
                  if (onCreateNew) onCreateNew();
                  else if (onClose) onClose();
                }}
              >
                <Gift size={18} /> Tạo Hộp Quà Kỷ Niệm Của Riêng Bạn
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemoryBoxViewer;
