import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { API_URL } from "./config";
import "./GreetingCardModal.css";

export interface CardContext {
  occasion?: string;
  relationship?: string;
  gender?: string;
  age?: string;
  interests?: string[];
  description?: string;
  giftName?: string;
  giftPrice?: number | null;
  giftImage?: string | null;
}

interface TemplateOption {
  id: string;
  name: string;
  category: string;
  icon: string;
  background: string;
  border: string;
  primary: string;
  textColor: string;
  subColor: string;
  frameBorder: string;
}

interface AlternativeWish {
  id: string;
  label: string;
  text: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: "blush-love",
    name: "Hồng Lãng Mạn",
    category: "Tình yêu / Valentine",
    icon: "💖",
    background: "linear-gradient(135deg, #fff0f3 0%, #ffe3e8 50%, #ffd1dc 100%)",
    border: "2px solid #fecdd3",
    primary: "#e11d48",
    textColor: "#881337",
    subColor: "#be123c",
    frameBorder: "rgba(225, 29, 72, 0.25)",
  },
  {
    id: "birthday-glow",
    name: "Sinh Nhật Rực Rỡ",
    category: "Sinh nhật",
    icon: "🎂",
    background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)",
    border: "2px solid #fed7aa",
    primary: "#ea580c",
    textColor: "#7c2d12",
    subColor: "#c2410c",
    frameBorder: "rgba(234, 88, 12, 0.25)",
  },
  {
    id: "luxury-gold",
    name: "Hoàng Gia & Vàng Gold",
    category: "Sang trọng",
    icon: "👑",
    background: "linear-gradient(145deg, #090d16 0%, #171b26 50%, #0d111a 100%)",
    border: "2px solid rgba(234, 179, 8, 0.45)",
    primary: "#facc15",
    textColor: "#f8fafc",
    subColor: "#fef08a",
    frameBorder: "rgba(250, 204, 21, 0.3)",
  },
  {
    id: "botanical-spring",
    name: "Hoa Lá Tinh Khôi",
    category: "Tự nhiên",
    icon: "🌿",
    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
    border: "2px solid #86efac",
    primary: "#16a34a",
    textColor: "#14532d",
    subColor: "#15803d",
    frameBorder: "rgba(22, 163, 74, 0.25)",
  },
  {
    id: "cozy-holiday",
    name: "Giáng Sinh & Năm Mới",
    category: "Lễ hội",
    icon: "🎄",
    background: "linear-gradient(145deg, #881337 0%, #9f1239 50%, #4c0519 100%)",
    border: "2px solid rgba(254, 240, 138, 0.45)",
    primary: "#fde047",
    textColor: "#fff1f2",
    subColor: "#fef08a",
    frameBorder: "rgba(254, 240, 138, 0.3)",
  },
  {
    id: "minimal-cafe",
    name: "Tối Giản Hàn Quốc",
    category: "Tối giản",
    icon: "☕",
    background: "linear-gradient(135deg, #fafaf9 0%, #f5f5f4 60%, #e7e5e4 100%)",
    border: "1px solid #d6d3d1",
    primary: "#57534e",
    textColor: "#292524",
    subColor: "#44403c",
    frameBorder: "rgba(87, 83, 78, 0.25)",
  },
  {
    id: "dreamy-lavender",
    name: "Tím Oải Hương",
    category: "Mơ mộng",
    icon: "💜",
    background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)",
    border: "2px solid #d8b4fe",
    primary: "#9333ea",
    textColor: "#581c87",
    subColor: "#7e22ce",
    frameBorder: "rgba(147, 51, 234, 0.25)",
  },
  {
    id: "ocean-breeze",
    name: "Sóng Biển Thanh Mát",
    category: "Tươi mát",
    icon: "🌊",
    background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)",
    border: "2px solid #5eead4",
    primary: "#0d9488",
    textColor: "#134e4a",
    subColor: "#0f766e",
    frameBorder: "rgba(13, 148, 136, 0.25)",
  },
  {
    id: "vintage-parchment",
    name: "Thư Cổ Điển",
    category: "Hoài niệm",
    icon: "📜",
    background: "linear-gradient(135deg, #fefce8 0%, #fef9c3 50%, #fef08a 100%)",
    border: "2px solid #eab308",
    primary: "#854d0e",
    textColor: "#422006",
    subColor: "#713f12",
    frameBorder: "rgba(133, 77, 14, 0.25)",
  },
];

const EMOJI_LIST = ["❤️", "🎂", "🎉", "✨", "🌸", "🎁", "🥂", "💌", "🥰", "🌟", "💐", "💖"];

interface GreetingCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext: CardContext;
}

export function GreetingCardModal({
  isOpen,
  onClose,
  initialContext,
}: GreetingCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Card Content State
  const [templateId, setTemplateId] = useState<string>("blush-love");
  const [occasion, setOccasion] = useState<string>(initialContext.occasion || "Sinh nhật");
  const [relationship, setRelationship] = useState<string>(initialContext.relationship || "Người yêu");
  const [recipientName, setRecipientName] = useState<string>("");
  const [giftName, setGiftName] = useState<string>(initialContext.giftName || "");
  const [showGiftBadge, setShowGiftBadge] = useState<boolean>(true);

  const [title, setTitle] = useState<string>("Chúc Mừng Sinh Nhật! 🎂");
  const [wish, setWish] = useState<string>("");
  const [senderSign, setSenderSign] = useState<string>("Thương mến ❤️");

  // Visual Customization State
  const [fontFamily, setFontFamily] = useState<string>("handwriting");
  const [textAlign, setTextAlign] = useState<"center" | "left" | "right">("center");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [tone, setTone] = useState<string>("Chân thành & Ấm áp");

  // AI & Async State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [aiSuggestions, setAiSuggestions] = useState<AlternativeWish[]>([]);

  // Automatically pick a relevant default template based on occasion
  useEffect(() => {
    if (!isOpen) return;

    const lowerOccasion = (initialContext.occasion || "").toLowerCase();
    let defaultTemplate = "blush-love";
    if (lowerOccasion.includes("sinh nhật")) {
      defaultTemplate = "birthday-glow";
    } else if (lowerOccasion.includes("giáng sinh") || lowerOccasion.includes("noel")) {
      defaultTemplate = "cozy-holiday";
    } else if (lowerOccasion.includes("tốt nghiệp")) {
      defaultTemplate = "luxury-gold";
    }

    setTemplateId(defaultTemplate);
    if (initialContext.occasion) setOccasion(initialContext.occasion);
    if (initialContext.relationship) setRelationship(initialContext.relationship);
    if (initialContext.giftName) setGiftName(initialContext.giftName);

    // Generate initial AI wish if empty
    fetchAIWishes(initialContext.occasion, initialContext.relationship, initialContext.giftName);
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3500);
  };

  const fetchAIWishes = async (
    customOccasion = occasion,
    customRel = relationship,
    customGift = giftName,
    customTone = tone,
  ) => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/card/generate-wishes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: customOccasion,
          relationship: customRel,
          recipientName,
          senderName: senderSign,
          giftName: customGift,
          tone: customTone,
          description: initialContext.description || "",
          interests: initialContext.interests || [],
          gender: initialContext.gender || "",
          age: initialContext.age || "",
        }),
      });

      const data = await res.json();
      if (data.success && data.card) {
        if (data.card.title) setTitle(data.card.title);
        if (data.card.mainWish) setWish(data.card.mainWish);
        if (data.card.senderSign) setSenderSign(data.card.senderSign);
        if (Array.isArray(data.card.alternatives)) {
          setAiSuggestions(data.card.alternatives);
        }
      }
    } catch (err) {
      console.error("AI card generation error:", err);
      showToast("⚠️ Đang sử dụng chế độ tạo lời chúc dự phòng.");
    } finally {
      setAiLoading(false);
    }
  };

  const currentTemplate = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // Allow fonts and styles to render clearly
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement("a");
      const cleanName = (recipientName || occasion || "Thiep-Chuc-Mung")
        .trim()
        .replace(/\s+/g, "-");
      link.download = `Thiep-Chuc-Mung-${cleanName}-${Date.now().toString().slice(-4)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("🎉 Đã tải thiệp thành công! Hãy gửi cho người thân nhé.");
    } catch (error) {
      console.error("Download card error:", error);
      showToast("⚠️ Có lỗi khi tạo ảnh thiệp. Vui lòng thử lại!");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCardImage = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          showToast("📋 Đã sao chép ảnh thiệp! Bạn có thể dán vào Zalo/Messenger ngay.");
        } else {
          showToast("⚠️ Trình duyệt chưa hỗ trợ sao chép ảnh, vui lòng bấm Tải về.");
        }
      });
    } catch (error) {
      console.error("Copy error:", error);
      showToast("⚠️ Không thể sao chép ảnh.");
    }
  };

  const handleClearWish = () => {
    setWish("");
    showToast("🗑️ Đã xóa lời chúc! Bạn có thể tự viết lời chúc của riêng mình.");
  };

  const handleInsertEmoji = (emoji: string) => {
    setWish((prev) => (prev ? prev + " " + emoji : emoji));
  };

  if (!isOpen) return null;

  return (
    <div className="card-modal-overlay" onClick={onClose}>
      <div
        className="card-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="card-modal-header">
          <div className="card-modal-title-group">
            <div className="card-modal-icon">💌</div>
            <div>
              <h2 className="card-modal-title">Tạo Thiệp Chúc Mừng AI</h2>
              <p className="card-modal-subtitle">
                Lời chúc ý nghĩa gửi tặng người thân yêu.
              </p>
            </div>
          </div>
          <button
            className="card-modal-close-btn"
            onClick={onClose}
            title="Đóng modal"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="card-modal-body">
          {/* LEFT: LIVE CARD PREVIEW */}
          <div className="card-preview-area">
            <div className="card-preview-wrapper">
              <div
                ref={cardRef}
                id="greetingCardPreview"
                className="greeting-card-canvas"
                style={{
                  background: currentTemplate.background,
                  borderColor: currentTemplate.border,
                  color: currentTemplate.textColor,
                }}
              >
                {/* Decorative border & corner accents */}
                <div
                  className="card-inner-frame"
                  style={{ borderColor: currentTemplate.frameBorder }}
                />
                <div className="card-corner card-corner-tl" />
                <div className="card-corner card-corner-tr" />
                <div className="card-corner card-corner-bl" />
                <div className="card-corner card-corner-br" />

                {/* Card Header */}
                <div className="card-header-section">
                  <span className="card-badge-icon">
                    {currentTemplate.icon}
                  </span>
                  <h3
                    className={`card-title-text font-${fontFamily}`}
                    style={{ color: currentTemplate.primary }}
                  >
                    {title || "Chúc Mừng Ngày Đặc Biệt!"}
                  </h3>
                  {recipientName && (
                    <div className="card-recipient-text">
                      Thương gửi: <strong>{recipientName}</strong>
                    </div>
                  )}
                </div>

                {/* Card Body / Message */}
                <div className="card-body-section">
                  <p
                    className={`card-message-text font-${fontFamily} size-${fontSize}`}
                    style={{ textAlign }}
                  >
                    {wish || (
                      <span style={{ opacity: 0.5, fontStyle: "italic" }}>
                        (Nhập lời chúc của bạn hoặc nhờ AI viết hộ...)
                      </span>
                    )}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="card-footer-section">
                  {giftName && showGiftBadge && (
                    <div
                      className="card-gift-badge"
                      style={{ color: currentTemplate.primary }}
                    >
                      🎁: {giftName}
                    </div>
                  )}
                  {senderSign && (
                    <div
                      className={`card-signature-text font-${fontFamily}`}
                      style={{ color: currentTemplate.subColor }}
                    >
                      {senderSign}
                    </div>
                  )}
                  <div className="card-watermark">
                    GiftAI • Trao Quà & Gửi Yêu Thương
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Below Card */}
            <div className="card-preview-actions">
              <button
                className="card-action-btn-primary"
                onClick={handleDownloadCard}
                disabled={downloading}
              >
                {downloading ? "⏳ Đang xuất ảnh HD..." : "📥 Tải thiệp về máy (HD)"}
              </button>
              <button
                className="card-action-btn-secondary"
                onClick={handleCopyCardImage}
                title="Sao chép ảnh vào clipboard để dán gửi ngay"
              >
                📋 Sao chép
              </button>
            </div>
          </div>

          {/* RIGHT: EDITOR & CUSTOMIZATION TOOLS */}
          <div className="card-editor-area">
            {/* 1. PRE-MADE BACKGROUNDS */}
            <div className="editor-section">
              <div className="editor-section-title">
                <span>🎨 1. Chọn phông nền có sẵn ({TEMPLATES.length} mẫu)</span>
              </div>
              <div className="templates-carousel">
                {TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={`template-card-choice ${
                      templateId === tmpl.id ? "active" : ""
                    }`}
                    onClick={() => setTemplateId(tmpl.id)}
                  >
                    <div
                      className="template-swatch"
                      style={{ background: tmpl.background }}
                    >
                      {tmpl.icon}
                    </div>
                    <span className="template-name">{tmpl.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. AI WISHES & ALTERNATIVES */}
            <div className="editor-section">
              <div className="ai-wish-header">
                <div className="ai-wish-prompt-row">
                  <div className="ai-wish-title">
                    <span>✨ AI Viết Lời Chúc</span>
                  </div>
                  <button
                    className="ai-generate-btn"
                    onClick={() => fetchAIWishes()}
                    disabled={aiLoading}
                  >
                    {aiLoading ? "⏳ Đang viết..." : "✨ AI viết lại lời chúc"}
                  </button>
                </div>
                {aiSuggestions.length > 0 && (
                  <div className="ai-alternatives-list">
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        fontWeight: 600,
                        marginTop: "4px",
                      }}
                    >
                      💡 Chọn nhanh lời chúc do AI gợi ý theo nhiều phong cách:
                    </span>
                    {aiSuggestions.map((alt) => (
                      <button
                        key={alt.id}
                        type="button"
                        className="ai-alternative-item"
                        onClick={() => {
                          setWish(alt.text);
                          showToast(`✨ Đã áp dụng lời chúc: ${alt.label}`);
                        }}
                      >
                        <span className="ai-alternative-tag">
                          🔖 {alt.label}
                        </span>
                        <span className="ai-alternative-preview">
                          {alt.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. EDIT OR CLEAR WISH */}
              <div className="editor-section-title">
                <span>✏️ 2. Chỉnh sửa hoặc tự viết lời chúc của bạn</span>
              </div>
              <div className="custom-wish-box">
                <textarea
                  className="custom-wish-textarea"
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                  placeholder="Gõ lời chúc của bạn tại đây hoặc để AI viết hộ..."
                />
                <div className="custom-wish-footer">
                  <button
                    type="button"
                    className="clear-wish-btn"
                    onClick={handleClearWish}
                    title="Xóa hết để tự viết lời chúc của riêng bạn"
                  >
                    🗑️ Xóa lời chúc để tự viết
                  </button>
                  <div className="emoji-quick-bar">
                    {EMOJI_LIST.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className="emoji-btn"
                        onClick={() => handleInsertEmoji(em)}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. DETAILS & OCCASION INPUTS */}
            <div className="editor-section">
              <div className="editor-section-title">
                <span>📝 3. Thông tin người nhận & món quà</span>
              </div>
              <div className="card-inputs-grid">
                <div className="card-field">
                  <label>Tiêu đề thiệp</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Happy Birthday! 🎂"
                  />
                </div>

                <div className="card-field">
                  <label>Dịp tặng</label>
                  <select
                    value={occasion}
                    onChange={(e) => {
                      setOccasion(e.target.value);
                      fetchAIWishes(e.target.value, relationship, giftName);
                    }}
                  >
                    <option>Sinh nhật</option>
                    <option>Valentine</option>
                    <option>Kỷ niệm</option>
                    <option>Giáng sinh</option>
                    <option>Tốt nghiệp</option>
                    <option>8/3 & 20/10</option>
                    <option>Năm mới</option>
                    <option>Cảm ơn / Tri ân</option>
                  </select>
                </div>

                <div className="card-field">
                  <label>Gửi đến (Người nhận)</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Ví dụ: Lan yêu dấu, Em yêu, Bạn Thảo..."
                  />
                </div>

                <div className="card-field">
                  <label>Ký tên (Người gửi)</label>
                  <input
                    type="text"
                    value={senderSign}
                    onChange={(e) => setSenderSign(e.target.value)}
                    placeholder="Ví dụ: Yêu em thật nhiều, Quân ❤️"
                  />
                </div>

                <div className="card-field">
                  <label>Món quà đính kèm</label>
                  <input
                    type="text"
                    value={giftName}
                    onChange={(e) => setGiftName(e.target.value)}
                    placeholder="Ví dụ: Bó hoa tulip, Nước hoa, Cốc giữ nhiệt..."
                  />
                </div>

                <div className="card-field">
                  <label>Tông giọng AI</label>
                  <select
                    value={tone}
                    onChange={(e) => {
                      setTone(e.target.value);
                      fetchAIWishes(occasion, relationship, giftName, e.target.value);
                    }}
                  >
                    <option>Chân thành & Ấm áp</option>
                    <option>Ngọt ngào & Lãng mạn</option>
                    <option>Hài hước & Dí dỏm</option>
                    <option>Thơ 4 câu ý nghĩa</option>
                    <option>Trang trọng & Lịch sự</option>
                  </select>
                </div>
              </div>

              {giftName && (
                <div style={{ marginTop: "10px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      cursor: "pointer",
                      color: "#475569",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showGiftBadge}
                      onChange={(e) => setShowGiftBadge(e.target.checked)}
                    />
                    Hiển thị tên món quà trên thiệp
                  </label>
                </div>
              )}
            </div>

            {/* 5. TYPOGRAPHY & ALIGNMENT */}
            <div className="editor-section">
              <div className="editor-section-title">
                <span>🔤 4. Phông chữ & Căn chỉnh</span>
              </div>
              <div className="style-toolbar">
                {/* Font Selector */}
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${
                      fontFamily === "handwriting" ? "active" : ""
                    }`}
                    onClick={() => setFontFamily("handwriting")}
                  >
                    Viết tay ✍️
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${
                      fontFamily === "serif" ? "active" : ""
                    }`}
                    onClick={() => setFontFamily("serif")}
                  >
                    Cổ điển 📜
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${
                      fontFamily === "modern" ? "active" : ""
                    }`}
                    onClick={() => setFontFamily("modern")}
                  >
                    Hiện đại 💎
                  </button>
                </div>

                {/* Alignment */}
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${textAlign === "left" ? "active" : ""}`}
                    onClick={() => setTextAlign("left")}
                    title="Căn trái"
                  >
                    ⬅
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${
                      textAlign === "center" ? "active" : ""
                    }`}
                    onClick={() => setTextAlign("center")}
                    title="Căn giữa"
                  >
                    ↔
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${
                      textAlign === "right" ? "active" : ""
                    }`}
                    onClick={() => setTextAlign("right")}
                    title="Căn phải"
                  >
                    ➡
                  </button>
                </div>

                {/* Font size */}
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segmented-btn ${fontSize === "small" ? "active" : ""}`}
                    onClick={() => setFontSize("small")}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${fontSize === "medium" ? "active" : ""}`}
                    onClick={() => setFontSize("medium")}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${fontSize === "large" ? "active" : ""}`}
                    onClick={() => setFontSize("large")}
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TOAST FEEDBACK */}
        {toastMessage && <div className="card-toast">{toastMessage}</div>}
      </div>
    </div>
  );
}
export default GreetingCardModal;
