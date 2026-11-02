const express = require("express");
const crypto = require("crypto");
const pool = require("../db/mysql");
const { authenticateUser, requireAuth } = require("../middleware/auth");
const { askAI } = require("../services/aiManager");

const router = express.Router();

function generateShareCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MEM-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// =====================================================
// 1. TẠO HỘP QUÀ KỶ NIỆM MỚI
// =====================================================
router.post("/create", async (req, res) => {
  try {
    const {
      title,
      occasion,
      senderName,
      recipientName,
      milestoneType = "countup",
      milestoneDate = null,
      letterContent,
      theme = "romantic",
      productName = "",
      productPrice = null,
      productImage = null,
      productUrl = null,
    } = req.body;

    if (!senderName || !recipientName || !letterContent) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ tên người gửi, người nhận và lời chúc kỷ niệm.",
      });
    }

    const userId = req.user ? req.user.id : null;
    let shareCode = generateShareCode();

    // Đảm bảo mã chia sẻ không bị trùng
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await pool.query(
        "SELECT id FROM memory_boxes WHERE share_code = ?",
        [shareCode]
      );
      if (existing.length === 0) break;
      shareCode = generateShareCode();
      attempts++;
    }

    const boxTitle =
      title ||
      (milestoneType === "countup"
        ? `Kỷ Niệm Đẹp Cùng ${recipientName} ❤️`
        : `Món Quà Bất Ngờ Cho ${recipientName} 🎁`);

    const formattedMilestoneDate = milestoneDate ? milestoneDate : null;

    const [result] = await pool.query(
      `INSERT INTO memory_boxes (
        share_code, user_id, title, occasion, sender_name, recipient_name,
        milestone_type, milestone_date, letter_content, theme,
        product_name, product_price, product_image, product_url,
        unboxed_count, hearts_count, reactions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '[]')`,
      [
        shareCode,
        userId,
        boxTitle,
        occasion || "Kỷ niệm đặc biệt",
        senderName.trim(),
        recipientName.trim(),
        milestoneType,
        formattedMilestoneDate,
        letterContent.trim(),
        theme || "romantic",
        productName || null,
        productPrice || null,
        productImage || null,
        productUrl || null,
      ]
    );

    const [createdRows] = await pool.query(
      "SELECT * FROM memory_boxes WHERE id = ?",
      [result.insertId]
    );

    return res.json({
      success: true,
      shareCode,
      box: createdRows[0],
      message: "Tạo hộp quà kỷ niệm thành công!",
    });
  } catch (error) {
    console.error("Create memory box error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo hộp quà kỷ niệm.",
      error: error.message,
    });
  }
});

// =====================================================
// 2. LẤY CHI TIẾT HỘP QUÀ THEO SHARE CODE (CHO NGƯỜI NHẬN)
// =====================================================
router.get("/:shareCode", async (req, res) => {
  try {
    const { shareCode } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM memory_boxes WHERE share_code = ?",
      [shareCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hộp quà kỷ niệm này hoặc liên kết đã hết hạn.",
      });
    }

    const box = rows[0];
    let reactions = [];
    try {
      reactions =
        typeof box.reactions === "string"
          ? JSON.parse(box.reactions || "[]")
          : box.reactions || [];
    } catch {
      reactions = [];
    }

    return res.json({
      success: true,
      box: {
        ...box,
        reactions,
      },
    });
  } catch (error) {
    console.error("Get memory box error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi tải hộp quà kỷ niệm.",
      error: error.message,
    });
  }
});

// =====================================================
// 3. GHI NHẬN MỞ HỘP QUÀ (UNBOX)
// =====================================================
router.post("/:shareCode/unbox", async (req, res) => {
  try {
    const { shareCode } = req.params;
    await pool.query(
      "UPDATE memory_boxes SET unboxed_count = unboxed_count + 1 WHERE share_code = ?",
      [shareCode]
    );

    const [rows] = await pool.query(
      "SELECT unboxed_count FROM memory_boxes WHERE share_code = ?",
      [shareCode]
    );

    return res.json({
      success: true,
      unboxedCount: rows[0] ? rows[0].unboxed_count : 1,
    });
  } catch (error) {
    console.error("Unbox error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 4. THẢ TIM CHO HỘP QUÀ
// =====================================================
router.post("/:shareCode/heart", async (req, res) => {
  try {
    const { shareCode } = req.params;
    await pool.query(
      "UPDATE memory_boxes SET hearts_count = hearts_count + 1 WHERE share_code = ?",
      [shareCode]
    );

    const [rows] = await pool.query(
      "SELECT hearts_count FROM memory_boxes WHERE share_code = ?",
      [shareCode]
    );

    return res.json({
      success: true,
      heartsCount: rows[0] ? rows[0].hearts_count : 1,
    });
  } catch (error) {
    console.error("Heart error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 5. NGƯỜI NHẬN GỬI LỜI CẢM ƠN / PHẢN HỒI (REACTION)
// =====================================================
router.post("/:shareCode/reaction", async (req, res) => {
  try {
    const { shareCode } = req.params;
    const { fromName, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nội dung phản hồi không được để trống.",
      });
    }

    const [rows] = await pool.query(
      "SELECT reactions FROM memory_boxes WHERE share_code = ?",
      [shareCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Hộp quà không tồn tại." });
    }

    let reactions = [];
    try {
      reactions =
        typeof rows[0].reactions === "string"
          ? JSON.parse(rows[0].reactions || "[]")
          : rows[0].reactions || [];
    } catch {
      reactions = [];
    }

    const newReaction = {
      id: Date.now(),
      from: fromName ? fromName.trim() : "Người nhận",
      text: text.trim(),
      created_at: new Date().toISOString(),
    };

    reactions.push(newReaction);

    await pool.query(
      "UPDATE memory_boxes SET reactions = ? WHERE share_code = ?",
      [JSON.stringify(reactions), shareCode]
    );

    return res.json({
      success: true,
      reactions,
      message: "Đã gửi lời nhắn cảm ơn thành công! ❤️",
    });
  } catch (error) {
    console.error("Add reaction error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// 6. AI TẠO TÂM THƯ KỶ NIỆM TỰ ĐỘNG
// =====================================================
router.post("/generate-letter", async (req, res) => {
  try {
    const {
      occasion = "Kỷ niệm ngày yêu",
      senderName = "Anh",
      recipientName = "Em",
      milestoneDays = null,
      milestoneType = "countup",
      tone = "Sâu sắc & Lãng mạn",
      giftName = "",
      specialMemories = "",
    } = req.body;

    const prompt = `Bạn là một nhà văn và chuyên gia sáng tạo lời chúc, tâm thư kỷ niệm hàng đầu.
Hãy viết một bức tâm thư kỷ niệm (Memory Celebration Letter) thật chân thành, cảm xúc, chạm đến trái tim người nhận với thông tin sau:
- Dịp kỷ niệm: ${occasion}
- Người gửi: ${senderName}
- Người nhận: ${recipientName}
- Cột mốc: ${
      milestoneDays
        ? `${milestoneType === "countup" ? `Đã đồng hành cùng nhau ${milestoneDays} ngày` : `Còn ${milestoneDays} ngày nữa là đến cột mốc đặc biệt`}`
        : "Cột mốc đặc biệt"
    }
- Tông giọng: ${tone}
${giftName ? `- Món quà gửi kèm: ${giftName}` : ""}
${specialMemories ? `- Kỷ niệm hoặc chi tiết đặc biệt cần nhắc: ${specialMemories}` : ""}

Yêu cầu:
1. Độ dài khoảng 3 - 5 câu văn giàu cảm xúc (80 - 150 từ), không sáo rỗng, tự nhiên và ngọt ngào.
2. Thể hiện được sự trân trọng thời gian bên nhau và mong ước tương lai hạnh phúc.
3. Thêm emoji phù hợp một cách tinh tế.
4. Trả về định dạng JSON thuần túy (không kèm markdown \`\`\`json):
{
  "title": "Tiêu đề thư gợi ý",
  "letter": "Nội dung bức tâm thư..."
}`;

    let letterData = null;
    try {
      const aiResponse = await askAI(prompt);
      const cleaned = aiResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      letterData = JSON.parse(cleaned);
    } catch (aiErr) {
      console.warn("AI Letter generation failed, using rich template fallback:", aiErr.message);
    }

    if (!letterData || !letterData.letter) {
      // Fallback thông minh dựa trên dịp
      if (occasion.toLowerCase().includes("yêu") || occasion.toLowerCase().includes("valentine")) {
        letterData = {
          title: `Gửi ${recipientName} thương yêu của ${senderName} ❤️`,
          letter: `Cảm ơn định mệnh đã mang ${recipientName} đến bên cuộc đời ${senderName}. Từng ngày trôi qua bên nhau đều là những khoảnh khắc tuyệt vời và đáng nhớ nhất. Mong rằng chặng đường phía trước của chúng mình sẽ luôn ngập tràn tiếng cười, thấu hiểu và hạnh phúc đong đầy! Yêu thương ${recipientName} rất nhiều. ✨`,
        };
      } else if (occasion.toLowerCase().includes("sinh nhật")) {
        letterData = {
          title: `Chúc Mừng Sinh Nhật ${recipientName} Rực Rỡ! 🎂`,
          letter: `Chúc ${recipientName} một tuổi mới thật rực rỡ, luôn giữ nụ cười tỏa nắng và gặt hái được mọi ước mơ trong cuộc sống! Cảm ơn vì đã luôn là một mảnh ghép thật đặc biệt. Mong ${recipientName} sẽ luôn được bao bọc trong tình yêu thương và những điều ngọt ngào nhất thế gian! 🎉`,
        };
      } else {
        letterData = {
          title: `Dành Tặng ${recipientName} Nhân Dịp ${occasion} ✨`,
          letter: `Nhân dịp ${occasion} đặc biệt này, chúc ${recipientName} luôn ngập tràn niềm vui, bình an và hạnh phúc! Món quà nhỏ này là tất cả tình cảm và sự trân trọng chân thành nhất mà ${senderName} muốn gửi gắm đến ${recipientName}. Mong bạn sẽ luôn mỉm cười và tỏa sáng! 🎁`,
        };
      }
    }

    return res.json({
      success: true,
      title: letterData.title,
      letter: letterData.letter,
    });
  } catch (error) {
    console.error("Generate letter error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tạo tâm thư kỷ niệm.",
      error: error.message,
    });
  }
});

// =====================================================
// 7. LẤY DANH SÁCH HỘP QUÀ CỦA TÔI (CHO NGƯỜI DÙNG ĐĂNG NHẬP)
// =====================================================
router.get("/user/my-boxes", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT id, share_code, title, occasion, sender_name, recipient_name,
              milestone_type, milestone_date, theme, product_name, product_price,
              product_image, unboxed_count, hearts_count, created_at
       FROM memory_boxes
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      boxes: rows,
    });
  } catch (error) {
    console.error("Get user memory boxes error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách hộp quà kỷ niệm của bạn.",
      error: error.message,
    });
  }
});

// =====================================================
// 8. XÓA HỘP QUÀ CỦA NGƯỜI DÙNG
// =====================================================
router.delete("/user/my-boxes/:id", authenticateUser, requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const boxId = req.params.id;

    const [result] = await pool.query(
      "DELETE FROM memory_boxes WHERE id = ? AND user_id = ?",
      [boxId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hộp quà hoặc bạn không có quyền xóa.",
      });
    }

    return res.json({
      success: true,
      message: "Đã xóa hộp quà kỷ niệm.",
    });
  } catch (error) {
    console.error("Delete user memory box error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi xóa hộp quà.",
      error: error.message,
    });
  }
});

module.exports = router;
