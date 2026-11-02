import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { API_URL } from "./config";
import {
  Gift,
  Heart,
  Sparkles,
  Calendar,
  Share2,
  Copy,
  ExternalLink,
  Download,
  Check,
  Wand2,
  X,
  Clock,
  Send,
} from "lucide-react";
import type { Product, MemoryBox } from "./types";
import "./MemoryBoxModal.css";

interface MemoryBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
  initialOccasion?: string;
  initialRelationship?: string;
  token?: string | null;
  onOpenViewer?: (shareCode: string) => void;
}

const THEMES = [
  {
    id: "romantic",
    name: "Hồng Lãng Mạn",
    icon: "💖",
    gradient: "linear-gradient(135deg, #fff0f3 0%, #ffd1dc 50%, #fecdd3 100%)",
    headerBg: "linear-gradient(135deg, #e11d48, #be123c)",
    accent: "#e11d48",
    tag: "Tình yêu / Valentine",
  },
  {
    id: "birthday",
    name: "Sinh Nhật Rực Rỡ",
    icon: "🎂",
    gradient: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fdba74 100%)",
    headerBg: "linear-gradient(135deg, #ea580c, #c2410c)",
    accent: "#ea580c",
    tag: "Sinh nhật",
  },
  {
    id: "luxury",
    name: "Hoàng Gia & Đêm Sao",
    icon: "👑",
    gradient: "linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)",
    headerBg: "linear-gradient(135deg, #f59e0b, #d97706)",
    accent: "#facc15",
    tag: "Sang trọng / Kỷ niệm",
  },
  {
    id: "festive",
    name: "Giáng Sinh & Năm Mới",
    icon: "🎄",
    gradient: "linear-gradient(145deg, #881337 0%, #4c0519 50%, #1c1917 100%)",
    headerBg: "linear-gradient(135deg, #dc2626, #991b1b)",
    accent: "#fde047",
    tag: "Lễ hội",
  },
  {
    id: "emerald",
    name: "Hoa Lá Tinh Khôi",
    icon: "🌿",
    gradient: "linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 50%, #86efac 100%)",
    headerBg: "linear-gradient(135deg, #059669, #047857)",
    accent: "#10b981",
    tag: "Tự nhiên / Tươi mới",
  },
];

const OCCASIONS = [
  "Kỷ niệm ngày yêu nhau",
  "Sinh nhật",
  "Kỷ niệm ngày cưới",
  "Valentine 14/2",
  "Phụ nữ 20/10",
  "Quốc tế Phụ nữ 8/3",
  "Giáng sinh & Năm mới",
  "Tốt nghiệp & Cột mốc mới",
  "Lời cảm ơn & Tri ân",
  "Dịp đặc biệt của hai ta",
];

const TONES = [
  "Sâu sắc & Lãng mạn",
  "Hài hước & Đáng yêu",
  "Chân thành & Ấm áp",
  "Thơ ca & Bay bổng",
];

export function MemoryBoxModal({
  isOpen,
  onClose,
  initialProduct,
  initialOccasion,
  initialRelationship,
  token,
  onOpenViewer,
}: MemoryBoxModalProps) {
  const storyCardRef = useRef<HTMLDivElement | null>(null);

  // Form states
  const [occasion, setOccasion] = useState(initialOccasion || "Kỷ niệm ngày yêu nhau");
  const [senderName, setSenderName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [milestoneType, setMilestoneType] = useState<"countup" | "countdown" | "none">("countup");
  const [milestoneDate, setMilestoneDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [tone, setTone] = useState("Sâu sắc & Lãng mạn");
  const [letterContent, setLetterContent] = useState("");
  const [boxTitle, setBoxTitle] = useState("");
  const [theme, setTheme] = useState<"romantic" | "birthday" | "luxury" | "festive" | "emerald">("romantic");

  // Product inside the box
  const [productName, setProductName] = useState(initialProduct?.name || "");
  const [productPrice, setProductPrice] = useState<number | null>(initialProduct?.price ?? null);
  const [productImage, setProductImage] = useState<string | null>(initialProduct?.image ?? null);
  const [productUrl, setProductUrl] = useState<string | null>(initialProduct?.url ?? null);

  // Async states
  const [aiGenerating, setAiGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingStory, setDownloadingStory] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Result state
  const [createdBox, setCreatedBox] = useState<MemoryBox | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialProduct) {
      setProductName(initialProduct.name);
      setProductPrice(initialProduct.price ?? null);
      setProductImage(initialProduct.image ?? null);
      setProductUrl(initialProduct.url ?? null);
    }

    if (initialRelationship && !recipientName) {
      setRecipientName(initialRelationship);
    }

    if (initialOccasion) {
      setOccasion(initialOccasion);
      const lower = initialOccasion.toLowerCase();
      if (lower.includes("sinh nhật")) {
        setTheme("birthday");
        setMilestoneType("countdown");
        const nextBday = new Date();
        nextBday.setDate(nextBday.getDate() + 7);
        setMilestoneDate(nextBday.toISOString().split("T")[0]);
      } else if (lower.includes("giáng sinh") || lower.includes("noel")) {
        setTheme("festive");
        setMilestoneType("countdown");
      } else {
        setTheme("romantic");
        setMilestoneType("countup");
      }
    }

    // Auto-generate sample letter if empty
    if (!letterContent) {
      handleGenerateAILetter(initialOccasion || occasion);
    }
  }, [isOpen, initialProduct, initialOccasion]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Calculate day difference
  const calculateDays = () => {
    if (!milestoneDate) return 0;
    const target = new Date(milestoneDate).getTime();
    const now = new Date().getTime();
    const diff = Math.floor(Math.abs(now - target) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleGenerateAILetter = async (customOccasion = occasion) => {
    setAiGenerating(true);
    try {
      const days = calculateDays();
      const res = await fetch(`${API_URL}/api/memory-box/generate-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: customOccasion,
          senderName: senderName || "Người thương",
          recipientName: recipientName || "Bạn thân yêu",
          milestoneDays: days,
          milestoneType,
          tone,
          giftName: productName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.title && !boxTitle) setBoxTitle(data.title);
        if (data.letter) setLetterContent(data.letter);
        showToast("✨ AI đã viết xong tâm thư kỷ niệm đầy cảm xúc!");
      }
    } catch (err) {
      console.error(err);
      showToast("⚠️ Không thể kết nối AI, đang dùng tâm thư gợi ý mẫu.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateBox = async () => {
    if (!senderName.trim()) {
      showToast("⚠️ Vui lòng nhập tên người gửi!");
      return;
    }
    if (!recipientName.trim()) {
      showToast("⚠️ Vui lòng nhập tên người nhận!");
      return;
    }
    if (!letterContent.trim()) {
      showToast("⚠️ Vui lòng nhập bức tâm thư / lời chúc kỷ niệm!");
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/memory-box/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: boxTitle || `Kỷ Niệm Cùng ${recipientName} ❤️`,
          occasion,
          senderName,
          recipientName,
          milestoneType,
          milestoneDate: milestoneType !== "none" ? milestoneDate : null,
          letterContent,
          theme,
          productName,
          productPrice,
          productImage,
          productUrl,
        }),
      });

      const data = await res.json();
      if (data.success && data.box) {
        setCreatedBox(data.box);
        showToast("🎉 Hộp quà kỷ niệm đã được tạo thành công! Hãy chia sẻ ngay.");
      } else {
        showToast(`⚠️ ${data.message || "Không thể tạo hộp quà."}`);
      }
    } catch (err) {
      console.error(err);
      showToast("⚠️ Lỗi kết nối máy chủ. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  const getShareUrl = () => {
    if (!createdBox) return window.location.href;
    const origin = window.location.origin;
    return `${origin}/?box=${createdBox.share_code}`;
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast("📋 Đã sao chép liên kết hộp quà!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCaption = () => {
    const url = getShareUrl();
    const caption = `🎁 Dành tặng ${createdBox?.recipient_name || "người thương"} một hộp quà kỷ niệm bất ngờ! Chạm vào đây để mở hộp quà nhé: ${url} ❤️✨`;
    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    showToast("📋 Đã sao chép caption kèm liên kết!");
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=600,height=500");
  };

  const handleShareZalo = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://zalo.me/share?url=${url}`, "_blank", "width=600,height=500");
  };

  const handleDownloadStoryCard = async () => {
    if (!storyCardRef.current) return;
    setDownloadingStory(true);
    try {
      const canvas = await html2canvas(storyCardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement("a");
      const name = (createdBox?.recipient_name || "Ky-Niem").trim().replace(/\s+/g, "-");
      link.download = `Story-Hop-Qua-Ky-Niem-${name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("📸 Đã tải thẻ ảnh Story 9:16 thành công!");
    } catch (err) {
      console.error(err);
      showToast("⚠️ Có lỗi khi tạo ảnh Story.");
    } finally {
      setDownloadingStory(false);
    }
  };

  const handleCopyStoryImage = async () => {
    if (!storyCardRef.current) return;
    try {
      const canvas = await html2canvas(storyCardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          showToast("📋 Đã sao chép ảnh Story vào bộ nhớ tạm!");
        } else {
          showToast("⚠️ Trình duyệt chưa hỗ trợ sao chép ảnh, vui lòng bấm Tải ảnh.");
        }
      });
    } catch (err) {
      console.error(err);
      showToast("⚠️ Không thể sao chép ảnh.");
    }
  };

  if (!isOpen) return null;

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
  const daysDiff = calculateDays();

  return (
    <div className="memory-box-overlay" onClick={onClose}>
      <div className="memory-box-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="memory-box-header">
          <div className="header-title-wrap">
            <div className="header-icon-badge">
              <Gift className="icon-main" />
            </div>
            <div>
              <div className="header-tag">
                <Sparkles size={13} className="sparkle-anim" /> TÍNH NĂNG MỚI ĐỘC QUYỀN
              </div>
              <h2 className="header-title">Hộp Quà Kỷ Niệm Ảo & Đếm Ngược</h2>
              <p className="header-subtitle">
                Tạo trang mở quà 3D bất ngờ, đếm ngày kỷ niệm & xuất ảnh Story chia sẻ mạng xã hội
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* TOAST ALERT */}
        {toastMessage && <div className="memory-box-toast">{toastMessage}</div>}

        <div className="memory-box-body">
          {/* ========================================================= */}
          {/* PHẦN 1: KHI ĐÃ TẠO XONG -> MÀN HÌNH CHIA SẺ MẠNG XÃ HỘI */}
          {/* ========================================================= */}
          {createdBox ? (
            <div className="share-success-view">
              <div className="success-banner">
                <div className="success-icon-wrap">🎁</div>
                <div>
                  <h3 className="success-title">Hộp Quà Kỷ Niệm Của Bạn Đã Sẵn Sàng!</h3>
                  <p className="success-desc">
                    Người nhận sẽ được trải nghiệm mở hộp quà 3D, đếm ngược ngày kỷ niệm và bức tâm thư cảm động.
                  </p>
                </div>
              </div>

              {/* ACTION LINKS & SOCIAL SHARE */}
              <div className="share-links-card">
                <label className="share-label">🔗 Liên kết mở hộp quà online bí mật:</label>
                <div className="link-input-group">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl()}
                    className="share-url-input"
                  />
                  <button className="copy-url-btn" onClick={handleCopyLink}>
                    {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                    {copiedLink ? "Đã chép" : "Sao chép link"}
                  </button>
                  <button
                    className="preview-unbox-btn"
                    onClick={() => {
                      if (onOpenViewer) onOpenViewer(createdBox.share_code);
                    }}
                  >
                    <ExternalLink size={16} /> Mở thử ngay
                  </button>
                </div>

                <div className="social-buttons-grid">
                  <button className="social-btn facebook-btn" onClick={handleShareFacebook}>
                    <Share2 size={18} /> Chia sẻ lên Facebook
                  </button>
                  <button className="social-btn zalo-btn" onClick={handleShareZalo}>
                    <Send size={18} /> Gửi qua Zalo
                  </button>
                  <button className="social-btn caption-btn" onClick={handleCopyCaption}>
                    {copiedCaption ? <Check size={18} /> : <Copy size={18} />}
                    {copiedCaption ? "Đã chép caption" : "Chép Caption mẫu"}
                  </button>
                </div>
              </div>

              {/* STORY CARD PREVIEW & EXPORT (9:16) */}
              <div className="story-export-section">
                <div className="story-section-header">
                  <div>
                    <h4 className="story-section-title">📱 Xuất Thẻ Ảnh Story 9:16 (Instagram / Facebook / TikTok)</h4>
                    <p className="story-section-desc">
                      Ảnh chuẩn tỷ lệ Story thời thượng kèm mã QR để bạn bè quét mở hộp quà trực tiếp!
                    </p>
                  </div>
                  <div className="story-btn-group">
                    <button
                      className="download-story-btn"
                      onClick={handleDownloadStoryCard}
                      disabled={downloadingStory}
                    >
                      <Download size={16} /> {downloadingStory ? "Đang tạo ảnh..." : "Tải ảnh Story (PNG)"}
                    </button>
                    <button className="copy-story-btn" onClick={handleCopyStoryImage}>
                      <Copy size={16} /> Sao chép ảnh
                    </button>
                  </div>
                </div>

                {/* THE 9:16 STORY CARD RENDER ELEMENT */}
                <div className="story-card-container">
                  <div
                    ref={storyCardRef}
                    className={`story-card-canvas theme-${createdBox.theme}`}
                  >
                    <div className="story-badge-pill">
                      <Sparkles size={14} /> {createdBox.occasion}
                    </div>

                    <div className="story-title-area">
                      <h3 className="story-main-title">{createdBox.title}</h3>
                      <p className="story-names-line">
                        Từ <strong>{createdBox.sender_name}</strong> gửi đến <strong>{createdBox.recipient_name}</strong>
                      </p>
                    </div>

                    {/* Milestone Counter */}
                    {createdBox.milestone_type !== "none" && (
                      <div className="story-milestone-box">
                        <div className="milestone-icon">
                          {createdBox.milestone_type === "countup" ? "❤️" : "⏳"}
                        </div>
                        <div className="milestone-info">
                          <span className="milestone-label">
                            {createdBox.milestone_type === "countup" ? "Đã đồng hành cùng nhau" : "Đếm ngược ngày kỷ niệm"}
                          </span>
                          <span className="milestone-number">
                            {daysDiff} <small>NGÀY</small>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 3D Gift Box Visual Graphic */}
                    <div className="story-gift-visual">
                      <div className="story-3d-box">🎁</div>
                      <div className="story-gift-badge">
                        Món quà bí mật đang chờ bạn mở...
                      </div>
                    </div>

                    {/* Letter excerpt */}
                    <div className="story-letter-preview">
                      <p className="story-letter-text">
                        "{createdBox.letter_content.slice(0, 140)}..."
                      </p>
                    </div>

                    {/* QR Code Scan Area */}
                    <div className="story-qr-footer">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          getShareUrl()
                        )}&color=000000&bgcolor=ffffff`}
                        alt="QR Code mở hộp quà"
                        crossOrigin="anonymous"
                        className="story-qr-img"
                      />
                      <div className="story-qr-text">
                        <strong>Quét mã để mở quà</strong>
                        <span>GiftAI Celebration Box</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-bottom-actions">
                <button
                  className="secondary-btn"
                  onClick={() => setCreatedBox(null)}
                >
                  Tạo hộp quà mới
                </button>
                <button className="primary-btn" onClick={onClose}>
                  Hoàn tất
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* PHẦN 2: FORM THIẾT KẾ HỘP QUÀ KỶ NIỆM                     */
            /* ========================================================= */
            <div className="create-box-grid">
              {/* CỘT TRÁI: CẤU HÌNH & THÔNG TIN */}
              <div className="form-column">
                <div className="form-card">
                  <h3 className="section-heading">1. Thông Tin Dịp Kỷ Niệm</h3>

                  <div className="form-group">
                    <label>Dịp kỷ niệm:</label>
                    <div className="occasion-chip-list">
                      {OCCASIONS.slice(0, 6).map((occ) => (
                        <button
                          key={occ}
                          type="button"
                          className={`chip-btn ${occasion === occ ? "active" : ""}`}
                          onClick={() => setOccasion(occ)}
                        >
                          {occ}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Người gửi:</label>
                      <input
                        type="text"
                        placeholder="VD: Anh Nam, Mình..."
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="std-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Người nhận:</label>
                      <input
                        type="text"
                        placeholder="VD: Bé Trang, Vợ yêu..."
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="std-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tiêu đề hộp quà (tùy chọn):</label>
                    <input
                      type="text"
                      placeholder="VD: Kỷ Niệm 1 Năm Yêu Nhau Đong Đầy ❤️"
                      value={boxTitle}
                      onChange={(e) => setBoxTitle(e.target.value)}
                      className="std-input"
                    />
                  </div>
                </div>

                <div className="form-card">
                  <h3 className="section-heading">2. Đồng Hồ Cột Mốc Thời Gian</h3>

                  <div className="milestone-type-selector">
                    <button
                      type="button"
                      className={`type-tab ${milestoneType === "countup" ? "active" : ""}`}
                      onClick={() => setMilestoneType("countup")}
                    >
                      <Heart size={16} /> Đã bên nhau (Count up)
                    </button>
                    <button
                      type="button"
                      className={`type-tab ${milestoneType === "countdown" ? "active" : ""}`}
                      onClick={() => setMilestoneType("countdown")}
                    >
                      <Clock size={16} /> Đếm ngược đến ngày (Count down)
                    </button>
                    <button
                      type="button"
                      className={`type-tab ${milestoneType === "none" ? "active" : ""}`}
                      onClick={() => setMilestoneType("none")}
                    >
                      Không đếm ngày
                    </button>
                  </div>

                  {milestoneType !== "none" && (
                    <div className="milestone-date-picker">
                      <label>
                        <Calendar size={15} />{" "}
                        {milestoneType === "countup"
                          ? "Chọn ngày bắt đầu quen / yêu nhau:"
                          : "Chọn ngày kỷ niệm / sinh nhật sắp tới:"}
                      </label>
                      <input
                        type="date"
                        value={milestoneDate}
                        onChange={(e) => setMilestoneDate(e.target.value)}
                        className="std-input date-input"
                      />
                      <div className="milestone-live-stat">
                        ✨ Hiện tại:{" "}
                        <strong>
                          {milestoneType === "countup"
                            ? `Đã cùng nhau đi qua ${daysDiff} ngày yêu thương ❤️`
                            : `Còn ${daysDiff} ngày nữa là đến cột mốc này ⏳`}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-card">
                  <div className="letter-header-row">
                    <h3 className="section-heading">3. Bức Tâm Thư Kỷ Niệm</h3>
                    <button
                      type="button"
                      className="ai-write-btn"
                      onClick={() => handleGenerateAILetter()}
                      disabled={aiGenerating}
                    >
                      <Wand2 size={15} /> {aiGenerating ? "AI đang viết..." : "AI Viết Tâm Thư"}
                    </button>
                  </div>

                  <div className="tone-selector">
                    <span className="tone-label">Tông giọng:</span>
                    {TONES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`tone-chip ${tone === t ? "active" : ""}`}
                        onClick={() => setTone(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={letterContent}
                    onChange={(e) => setLetterContent(e.target.value)}
                    placeholder="Viết những lời yêu thương, kỷ niệm đáng nhớ dành tặng người ấy..."
                    className="std-textarea"
                  />
                </div>

                <div className="form-card">
                  <h3 className="section-heading">4. Món Quà Bí Mật Đính Kèm</h3>
                  <div className="gift-attach-box">
                    {productImage && (
                      <img src={productImage} alt={productName} className="gift-thumb-img" />
                    )}
                    <div className="gift-attach-fields">
                      <input
                        type="text"
                        placeholder="Tên món quà (VD: Vòng tay bạc lấp lánh)"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="std-input"
                      />
                      {productPrice && (
                        <div className="gift-price-tag">
                          Giá trị: {productPrice.toLocaleString("vi-VN")} đ
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-card">
                  <h3 className="section-heading">5. Chọn Phong Cách (Theme)</h3>
                  <div className="theme-grid">
                    {THEMES.map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        className={`theme-card-btn ${theme === th.id ? "active" : ""}`}
                        onClick={() => setTheme(th.id as any)}
                      >
                        <span className="theme-icon">{th.icon}</span>
                        <div className="theme-name">{th.name}</div>
                        <div className="theme-tag">{th.tag}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: XEM TRƯỚC SỐNG ĐỘNG (LIVE PREVIEW) */}
              <div className="preview-column">
                <div className="preview-sticky-wrap">
                  <div className="preview-label">
                    <Sparkles size={15} /> Xem trước trải nghiệm người nhận
                  </div>

                  <div className={`mock-unbox-preview theme-${theme}`}>
                    <div className="mock-card-glow" />
                    <div className="mock-header">
                      <div className="mock-badge">{currentTheme.icon} {occasion}</div>
                      <h4 className="mock-title">
                        {boxTitle || `Kỷ Niệm Cùng ${recipientName || "Người Thương"} ❤️`}
                      </h4>
                      <p className="mock-sender">
                        Từ {senderName || "Người gửi"} dành cho {recipientName || "Người nhận"}
                      </p>
                    </div>

                    {/* Milestone pill */}
                    {milestoneType !== "none" && (
                      <div className="mock-milestone-pill">
                        <span className="mock-milestone-days">{daysDiff} NGÀY</span>
                        <span className="mock-milestone-desc">
                          {milestoneType === "countup" ? "Gắn kết bên nhau" : "Đếm ngược đến ngày đặc biệt"}
                        </span>
                      </div>
                    )}

                    {/* 3D Gift Box Animation Preview */}
                    <div className="mock-3d-box-wrap">
                      <div className="mock-gift-box">🎁</div>
                      <div className="mock-tap-hint">Chạm để mở quà...</div>
                    </div>

                    {/* Letter Preview */}
                    <div className="mock-letter-card">
                      <p className="mock-letter-content">
                        {letterContent || "Bức tâm thư yêu thương sẽ xuất hiện ở đây sau khi người nhận chạm mở hộp quà..."}
                      </p>
                    </div>

                    {productName && (
                      <div className="mock-gift-preview">
                        {productImage && (
                          <img src={productImage} alt={productName} className="mock-gift-img" />
                        )}
                        <div className="mock-gift-meta">
                          <span className="mock-gift-name">{productName}</span>
                          {productPrice && (
                            <span className="mock-gift-price">
                              {productPrice.toLocaleString("vi-VN")} đ
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    className="create-submit-btn"
                    onClick={handleCreateBox}
                    disabled={submitting}
                  >
                    <Gift size={20} />
                    {submitting ? "Đang tạo hộp quà..." : "TẠO HỘP QUÀ & LẤY LINK CHIA SẺ"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemoryBoxModal;
