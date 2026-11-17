import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Initialize Presentation with 16:9 Widescreen
prs = Presentation()
prs.slide_width = Inches(13.333333)
prs.slide_height = Inches(7.5)

blank_layout = prs.slide_layouts[6]

# --- COLOR PALETTE ---
C_DARK_BG = RGBColor(11, 15, 25)            # #0B0F19 Deep navy slate
C_DARK_CARD = RGBColor(22, 30, 49)          # #161E31 Dark Slate Card
C_DARK_CARD_BORDER = RGBColor(51, 65, 85)   # #334155
C_LIGHT_BG = RGBColor(248, 250, 252)        # #F8FAFC Clean soft white
C_WHITE = RGBColor(255, 255, 255)           # Pure White
C_BORDER = RGBColor(226, 232, 240)          # #E2E8F0 Soft border
C_PRIMARY = RGBColor(109, 40, 217)          # #6D28D9 Royal Purple
C_PRIMARY_LIGHT = RGBColor(245, 243, 255)   # #F5F3FF Soft Purple Fill
C_ACCENT_PINK = RGBColor(236, 72, 153)      # #EC4899 Rose Pink
C_ACCENT_PINK_BG = RGBColor(253, 242, 248)  # #FDF2F8
C_BLUE = RGBColor(37, 99, 235)              # #2563EB Tech Blue
C_BLUE_LIGHT = RGBColor(239, 246, 255)      # #EFF6FF
C_EMERALD = RGBColor(16, 185, 129)          # #10B981 Success Green
C_EMERALD_LIGHT = RGBColor(236, 253, 245)   # #ECFDF5
C_AMBER = RGBColor(217, 119, 6)             # #D97706 Warning/Highlight
C_AMBER_LIGHT = RGBColor(254, 243, 199)     # #FEF3C7
C_TEXT_DARK = RGBColor(15, 23, 42)          # #0F172A Deep Charcoal
C_TEXT_MUTED = RGBColor(71, 85, 105)        # #475569 Slate Muted Text
C_TEXT_LIGHT = RGBColor(248, 250, 252)
C_TEXT_LIGHT_MUTED = RGBColor(148, 163, 184)
C_PLACEHOLDER_BG = RGBColor(241, 245, 249)  # #F1F5F9
C_PLACEHOLDER_BORDER = RGBColor(168, 85, 247) # #A855F7 Purple accent border

TOTAL_SLIDES = 18

def add_base_background(slide, is_dark=False):
    bg_shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height
    )
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = C_DARK_BG if is_dark else C_LIGHT_BG
    bg_shape.line.fill.background()
    return bg_shape

def add_header(slide, category_tag, title_text, subtitle_text=None, is_dark=False):
    # Top Category Badge / Tag
    tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.38), Inches(11.733), Inches(0.32))
    tf_tag = tag_box.text_frame
    tf_tag.word_wrap = True
    tf_tag.margin_left = tf_tag.margin_top = tf_tag.margin_right = tf_tag.margin_bottom = 0
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = category_tag.upper()
    p_tag.font.name = "Segoe UI"
    p_tag.font.size = Pt(10)
    p_tag.font.bold = True
    p_tag.font.color.rgb = C_ACCENT_PINK if is_dark else C_PRIMARY
    
    # Title Textbox
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.70), Inches(11.733), Inches(0.85))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.name = "Segoe UI"
    p_title.font.size = Pt(21)
    p_title.font.bold = True
    p_title.font.color.rgb = C_TEXT_LIGHT if is_dark else C_TEXT_DARK
    
    if subtitle_text:
        p_sub = tf_title.add_paragraph()
        p_sub.text = subtitle_text
        p_sub.font.name = "Segoe UI"
        p_sub.font.size = Pt(11.5)
        p_sub.font.bold = False
        p_sub.font.color.rgb = C_TEXT_LIGHT_MUTED if is_dark else C_TEXT_MUTED
        p_sub.space_before = Pt(3)

def add_footer(slide, current_idx, is_dark=False):
    footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(11.733), Inches(0.3))
    tf = footer_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = "GiftAI - Báo cáo đồ án Trí tuệ Nhân tạo | Đại học Kiến trúc Đà Nẵng (2026)"
    p.font.name = "Segoe UI"
    p.font.size = Pt(9)
    p.font.color.rgb = C_TEXT_LIGHT_MUTED if is_dark else C_TEXT_MUTED
    
    p2 = tf.add_paragraph()
    p2.text = f"{current_idx} / {TOTAL_SLIDES}"
    p2.alignment = PP_ALIGN.RIGHT
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9)
    p2.font.bold = True
    p2.font.color.rgb = C_ACCENT_PINK if is_dark else C_PRIMARY

def add_card(slide, left, top, width, height, bg_color=C_WHITE, border_color=C_BORDER):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    if border_color:
        card.line.color.rgb = border_color
        card.line.width = Pt(1)
    else:
        card.line.fill.background()
    return card

def add_placeholder(slide, left, top, width, height, title, desc, tag="ẢNH / SƠ ĐỒ THỰC TẾ"):
    box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    box.fill.solid()
    box.fill.fore_color.rgb = C_PLACEHOLDER_BG
    box.line.color.rgb = C_PLACEHOLDER_BORDER
    box.line.width = Pt(1.5)
    
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.2)
    tf.margin_right = Inches(0.2)
    tf.margin_top = Inches(0.15)
    tf.margin_bottom = Inches(0.15)
    
    p0 = tf.paragraphs[0]
    p0.text = f"🖼️ [{tag}]"
    p0.alignment = PP_ALIGN.CENTER
    p0.font.name = "Segoe UI"
    p0.font.size = Pt(11)
    p0.font.bold = True
    p0.font.color.rgb = C_PRIMARY
    
    p1 = tf.add_paragraph()
    p1.text = title
    p1.alignment = PP_ALIGN.CENTER
    p1.font.name = "Segoe UI"
    p1.font.size = Pt(13)
    p1.font.bold = True
    p1.font.color.rgb = C_TEXT_DARK
    p1.space_before = Pt(4)
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.alignment = PP_ALIGN.CENTER
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(4)
    return box

def set_speaker_notes(slide, notes_content):
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = notes_content

# ==========================================
# SLIDE 1: TRANG BÌA (DARK THEME)
# ==========================================
s1 = prs.slides.add_slide(blank_layout)
add_base_background(s1, is_dark=True)

# Top School Badge
t1_box = s1.shapes.add_textbox(Inches(1.0), Inches(0.8), Inches(11.333), Inches(0.5))
tf1_top = t1_box.text_frame
p = tf1_top.paragraphs[0]
p.text = "TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG • KHOA CÔNG NGHỆ THÔNG TIN"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_TEXT_LIGHT_MUTED

# Big Title Badge
t1_tag = s1.shapes.add_textbox(Inches(1.0), Inches(1.4), Inches(11.333), Inches(0.4))
tf1_tag = t1_tag.text_frame
p = tf1_tag.paragraphs[0]
p.text = "BÁO CÁO ĐỒ ÁN HỌC PHẦN TRÍ TUỆ NHÂN TẠO"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

# Title
t1_main = s1.shapes.add_textbox(Inches(1.0), Inches(1.85), Inches(11.333), Inches(1.5))
tf1_main = t1_main.text_frame
tf1_main.word_wrap = True
p = tf1_main.paragraphs[0]
p.text = "XÂY DỰNG HỆ THỐNG TÌM QUÀ TẶNG\nCHO NGƯỜI THÂN YÊU (GIFTAI)"
p.font.name = "Segoe UI"
p.font.size = Pt(32)
p.font.bold = True
p.font.color.rgb = C_TEXT_LIGHT

p_sub = tf1_main.add_paragraph()
p_sub.text = "Giải pháp tư vấn quà tặng thông minh ứng dụng Mô hình Ngôn ngữ Lớn (LLM) & Dữ liệu Thương mại Điện tử thực tế"
p_sub.font.name = "Segoe UI"
p_sub.font.size = Pt(13)
p_sub.font.color.rgb = C_TEXT_LIGHT_MUTED
p_sub.space_before = Pt(8)

# Author & Instructor Cards
c1 = add_card(s1, Inches(1.0), Inches(4.3), Inches(5.4), Inches(2.1), bg_color=C_DARK_CARD, border_color=C_DARK_CARD_BORDER)
tf_c1 = c1.text_frame
tf_c1.word_wrap = True
tf_c1.margin_left = Inches(0.3)
tf_c1.margin_top = Inches(0.2)
p = tf_c1.paragraphs[0]
p.text = "👨‍💻 SINH VIÊN THỰC HIỆN"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

items_sv = [
    ("Nguyễn Thiện Quân", "Mã SV: 2351220231"),
    ("Nguyễn Việt Quang", "Mã SV: 2351220268"),
    ("Lớp chuyên ngành", "23CT2 - Công nghệ Thông tin")
]
for name, detail in items_sv:
    p_item = tf_c1.add_paragraph()
    p_item.text = f"• {name}  ({detail})"
    p_item.font.name = "Segoe UI"
    p_item.font.size = Pt(11)
    p_item.font.color.rgb = C_TEXT_LIGHT
    p_item.space_before = Pt(4)

c2 = add_card(s1, Inches(6.9), Inches(4.3), Inches(5.4), Inches(2.1), bg_color=C_DARK_CARD, border_color=C_DARK_CARD_BORDER)
tf_c2 = c2.text_frame
tf_c2.word_wrap = True
tf_c2.margin_left = Inches(0.3)
tf_c2.margin_top = Inches(0.2)
p = tf_c2.paragraphs[0]
p.text = "🎓 GIẢNG VIÊN HƯỚNG DẪN"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

items_gv = [
    ("TS. Đỗ Phúc Hảo", "Khoa Công nghệ Thông tin"),
    ("Đơn vị đào tạo", "Trường Đại học Kiến trúc Đà Nẵng"),
    ("Thời gian bảo vệ", "Tháng 11 / 2026")
]
for title, detail in items_gv:
    p_item = tf_c2.add_paragraph()
    p_item.text = f"• {title}:  {detail}"
    p_item.font.name = "Segoe UI"
    p_item.font.size = Pt(11)
    p_item.font.color.rgb = C_TEXT_LIGHT
    p_item.space_before = Pt(4)

add_footer(s1, 1, is_dark=True)
set_speaker_notes(s1, """Kính thưa Thầy TS. Đỗ Phúc Hảo cùng toàn thể quý Thầy Cô trong Hội đồng chấm đồ án.
Hôm nay, nhóm chúng em gồm hai thành viên: Nguyễn Thiện Quân và Nguyễn Việt Quang, sinh viên lớp 23CT2, xin phép được báo cáo đồ án học phần Trí tuệ Nhân tạo với đề tài:
"Xây dựng hệ thống tìm quà tặng cho người thân yêu - GiftAI".
Đề tài xuất phát từ bài toán thực tế về sự lúng túng khi chọn quà trong đời sống hiện đại, và giải quyết triệt để vấn đề này bằng việc kết hợp năng lực suy luận sâu sắc của Mô hình Ngôn ngữ Lớn cùng nguồn dữ liệu sản phẩm phong phú từ các sàn thương mại điện tử thực tế. Sau đây em xin bắt đầu phần trình bày.""")

# ==========================================
# SLIDE 2: ĐẶT VẤN ĐỀ (CHƯƠNG I)
# ==========================================
s2 = prs.slides.add_slide(blank_layout)
add_base_background(s2)
add_header(s2, "Chương I: Mở Đầu", "Bối Cảnh Thực Tiễn & 3 Thách Thức Khi Chọn Quà", "Tại sao các công cụ tìm kiếm và sàn TMĐT hiện nay chưa thể giải quyết trọn vẹn bài toán tặng quà?")

# 3 Columns
col_w = Inches(3.64)
col_gap = Inches(0.4)
c2_1 = add_card(s2, Inches(0.8), Inches(1.85), col_w, Inches(4.8), bg_color=C_WHITE)
tf = c2_1.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.25)
p = tf.paragraphs[0]
p.text = "1. Quá Tải Thông Tin TMĐT"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

bullets1 = [
    "Hàng triệu mặt hàng: Các sàn lớn như Shopee, Lazada cung cấp lượng hàng hóa khổng lồ.",
    "Tìm kiếm từ khóa cơ học: Công cụ tìm kiếm hiện tại chỉ dựa vào Lexical / Keyword Matching.",
    "Vô cảm với ngữ cảnh: Máy móc không hiểu được mối quan hệ xã hội (bạn gái, mẹ, sếp) hay cảm xúc của dịp lễ.",
    "Spam từ khóa SEO: Người bán nhồi nhét phụ kiện, ốp lưng vào tên sản phẩm gây nhiễu loạn."
]
for b in bullets1:
    p = tf.add_paragraph()
    p.text = f"• {b}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.color.rgb = C_TEXT_MUTED
    p.space_before = Pt(8)

c2_2 = add_card(s2, Inches(0.8) + col_w + col_gap, Inches(1.85), col_w, Inches(4.8), bg_color=C_WHITE)
tf = c2_2.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.25)
p = tf.paragraphs[0]
p.text = "2. Nghịch Lý Mua ≠ Thụ Hưởng"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

bullets2 = [
    "Buyer vs. Consumer Gap: Người tìm mua là bạn, nhưng đối tượng thụ hưởng là một người khác hoàn toàn.",
    "Lịch sử duyệt web vô hiệu: Thuật toán gợi ý cá nhân hóa truyền thống (Collaborative Filtering) hoàn toàn bị tê liệt.",
    "Bài toán Khởi đầu lạnh (Cold-Start): Hệ thống không có bất kỳ vector hành vi nào trong quá khứ của người nhận.",
    "Thiếu sự thấu hiểu tâm lý: Cần năng lực suy luận Zero-shot tức thời dựa trên ngữ cảnh ngắn gọn."
]
for b in bullets2:
    p = tf.add_paragraph()
    p.text = f"• {b}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.color.rgb = C_TEXT_MUTED
    p.space_before = Pt(8)

c2_3 = add_card(s2, Inches(0.8) + (col_w + col_gap)*2, Inches(1.85), col_w, Inches(4.8), bg_color=C_WHITE)
tf = c2_3.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.25)
p = tf.paragraphs[0]
p.text = "3. Đa Ràng Buộc Phức Tạp"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_BLUE

bullets3 = [
    "Dung hòa đồng thời 5 chiều: Mối quan hệ, Dịp kỷ niệm, Độ tuổi, Sở thích, Ngân sách.",
    "Ràng buộc ngân sách cứng: Món quà bắt buộc phải nằm trong khả năng tài chính thực tế [Bmin, Bmax].",
    "Áp lực tâm lý: Người dùng thường mất 2-3 giờ lướt web vô định nhưng vẫn lo sợ món quà bị 'lệch gu'.",
    "Yêu cầu lời giải thích: Cần lý do thuyết phục tại sao món quà đó mang lại niềm vui cho người nhận."
]
for b in bullets3:
    p = tf.add_paragraph()
    p.text = f"• {b}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.color.rgb = C_TEXT_MUTED
    p.space_before = Pt(8)

add_footer(s2, 2)
set_speaker_notes(s2, """Thưa Thầy Cô, tặng quà là nét văn hóa giàu tính nhân văn nhưng đang gặp 3 rào cản lớn:
Thứ nhất, trên các sàn TMĐT như Shopee hay Lazada, hàng hóa thì bạt ngàn nhưng thanh tìm kiếm chỉ so khớp từ khóa cơ học. Ví dụ gõ tìm quà cho mẹ thì nó chỉ tìm sản phẩm có từ khóa 'mẹ'.
Thứ hai là 'Nghịch lý người mua không phải người dùng'. Bình thường thuật toán gợi ý dựa trên lịch sử mua sắm của chính bạn. Nhưng khi mua quà, bạn mua cho người yêu hay cho sếp, lịch sử của bạn hoàn toàn vô dụng, dẫn tới bài toán Cold-Start.
Thứ ba là bài toán đa ràng buộc: vừa phải hợp túi tiền, vừa phải hợp tuổi, dịp lễ và tính cách. Đó là lý do GiftAI ra đời để giải quyết trọn vẹn nút thắt này.""")

# ==========================================
# SLIDE 3: MỤC TIÊU & GIẢI PHÁP (CHƯƠNG I)
# ==========================================
s3 = prs.slides.add_slide(blank_layout)
add_base_background(s3)
add_header(s3, "Chương I: Mở Đầu", "Mục Tiêu Đề Tài & Định Hướng Giải Pháp GiftAI", "Kết hợp năng lực suy luận của Mô hình Ngôn ngữ Lớn với kho sản phẩm thực tế từ sàn TMĐT")

c3_left = add_card(s3, Inches(0.8), Inches(1.85), Inches(4.5), Inches(4.8), bg_color=C_PRIMARY_LIGHT, border_color=C_PRIMARY)
tf = c3_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.3)
p = tf.paragraphs[0]
p.text = "🎯 MỤC TIÊU TỔNG QUÁT"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

p = tf.add_paragraph()
p.text = "Xây dựng hoàn chỉnh hệ sinh thái ứng dụng Trí tuệ Nhân tạo đa nền tảng (Web SPA và Android Native App) mang tên GiftAI."
p.font.name = "Segoe UI"
p.font.size = Pt(11.5)
p.font.color.rgb = C_TEXT_DARK
p.space_before = Pt(8)

p = tf.add_paragraph()
p.text = "💡 TRIẾT LÝ GIẢI PHÁP HYBRID"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY
p.space_before = Pt(14)

phil_points = [
    "Zero-shot Reasoning: Dùng LLM (Google Gemini 3.8 Flash) hiểu sâu tâm lý và ngữ cảnh người nhận mà không cần lịch sử duyệt web cũ.",
    "Grounding với Dữ liệu thật: Đưa kết quả ánh xạ vào kho 1.400+ sản phẩm tuyển chọn trên TiDB Cloud, loại bỏ 100% ảo giác (Hallucination) link hỏng.",
    "Explainable AI (XAI): Mỗi món quà đều có lời giải thích tâm lý thuyết phục, tăng niềm tin người dùng."
]
for pt in phil_points:
    p = tf.add_paragraph()
    p.text = f"• {pt}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(10.5)
    p.font.color.rgb = C_TEXT_MUTED
    p.space_before = Pt(6)

c3_right = add_card(s3, Inches(5.6), Inches(1.85), Inches(6.933), Inches(4.8), bg_color=C_WHITE)
tf = c3_right.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.25)
p = tf.paragraphs[0]
p.text = "🚀 6 MỤC TIÊU KỸ THUẬT CỤ THỂ"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

goals = [
    ("1. Trích xuất ý định (Intent Parsing)", "Ứng dụng LLM phân rã mô tả tự do và bộ lọc 5 chiều thành cấu trúc JSON chuẩn gồm từ khóa tìm kiếm và ý tưởng quà."),
    ("2. Quản lý kho sản phẩm TMĐT thực tế", "Xây dựng kho 1.400+ sản phẩm chuẩn hóa lưu trên TiDB Cloud Serverless (AWS Singapore) kết hợp cào tự động bằng Selenium & Cheerio."),
    ("3. Tái xếp hạng ngữ nghĩa (Re-ranking)", "Thiết kế Prompt chấm điểm để LLM loại bỏ 94.2% sản phẩm rác/phụ kiện lệch tông, chọn ra danh mục tối ưu kèm lý giải tâm lý."),
    ("4. Điều phối AI chịu lỗi cao (AI Manager)", "Xoay vòng đa khóa API (Multi-Key Rotation), Cascading Fallback (Groq/OpenAI), và bộ đệm RAM Cache phản hồi tức thì < 10ms."),
    ("5. Tiện ích gia tăng cảm xúc", "Tự động sinh thiệp chúc mừng đa cảm xúc (AI Greeting Card) và Hộp quà kỷ niệm ảo (Memory Box) đếm ngày yêu chia sẻ qua share_code."),
    ("6. Triển khai Cloud đa nền tảng", "Phát hành Web SPA trên Vercel, Backend trên Render, CSDL TiDB Cloud và đóng gói ứng dụng di động Android Native WebView APK.")
]
for title, desc in goals:
    p = tf.add_paragraph()
    p.text = f"• {title}: {desc}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(10.5)
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)

add_footer(s3, 3)
set_speaker_notes(s3, """Để giải quyết triệt để các bài toán đó, mục tiêu của GiftAI là xây dựng một hệ sinh thái hoàn chỉnh trên cả Web và Android.
Triết lý cốt lõi của chúng em là mô hình Hybrid: không để AI tự bịa ra sản phẩm và link mua (vì AI hay bị ảo giác tạo ra link 404), mà AI chỉ đóng vai trò 'bộ não tư vấn' phân tích tâm lý và làm màng lọc ngữ nghĩa cho kho sản phẩm thật được cào từ các sàn thương mại điện tử.
Đồ án đặt ra 6 mục tiêu kỹ thuật cụ thể từ trích xuất ý định, kho dữ liệu TiDB Cloud, cơ chế chịu lỗi đa khóa đến các tiện ích nhân văn như thiệp mừng và hộp quà ảo.""")

# ==========================================
# SLIDE 4: KIẾN TRÚC PHÂN TẦNG CLOUD (CHƯƠNG III)
# ==========================================
s4 = prs.slides.add_slide(blank_layout)
add_base_background(s4)
add_header(s4, "Chương III: Thiết Kế Hệ Thống", "Kiến Trúc Phân Tầng Tổng Thể Trên Môi Trường Cloud", "Mô hình kiến trúc phân tán 4 tầng đảm bảo tính sẵn sàng cao, bảo mật và mở rộng độc lập")

# Left text card
c4_left = add_card(s4, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c4_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🏗️ PHÂN TẦNG TRÁCH NHIỆM HỆ THỐNG"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

tiers = [
    ("1. Tầng Giao Diện (Presentation Tier)", "• Web SPA: React 19 + TypeScript phân phối qua mạng biên Vercel Edge.\n• Mobile App: Android Native WebView container, xử lý nút Back phần cứng & Safe-Insets."),
    ("2. Tầng Ứng Dụng (Application Tier)", "• Máy chủ Node.js Express trên Render Cloud.\n• Quản lý xác thực JWT, nhóm kết nối Connection Pool 10 luồng.\n• Bộ nhớ đệm RAM In-Memory Semantic Cache đáp ứng < 10ms."),
    ("3. Tầng Trí Tuệ Nhân Tạo & Crawler", "• Mô hình chính: Google Gemini 3.8 Flash (`@google/generative-ai`).\n• Chuyển mạch dự phòng: Groq LPU (Llama 3 siêu tốc) & OpenAI GPT-4o-mini.\n• Web Scraper ngầm: Selenium WebDriver Chrome Headless + Cheerio."),
    ("4. Tầng Dữ Liệu (Data Tier)", "• TiDB Cloud Serverless (MySQL 8.0 phân tán) tại AWS Singapore.\n• Kết nối bảo mật SSL/TLSv1.2 qua cổng 4000; chuẩn hóa 3NF.")
]
for title, desc in tiers:
    p = tf.add_paragraph()
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

# Right Placeholder
add_placeholder(
    s4, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8),
    "Hình 3.1: Sơ đồ kiến trúc phân tầng hệ thống\n(Struct.drawio.png)",
    "Vị trí chèn sơ đồ luồng dữ liệu giữa Client (Vercel, Android), Backend (Render), AI Engines (Gemini, Groq) và CSDL TiDB Cloud.",
    tag="SƠ ĐỒ KIẾN TRÚC HỆ THỐNG"
)

add_footer(s4, 4)
set_speaker_notes(s4, """Về mặt kiến trúc, hệ thống GiftAI được thiết kế theo mô hình 4 tầng phân tán hoàn toàn trên môi trường Cloud-native:
Tầng 1 là Presentation gồm Web Single Page App viết bằng React 19 chạy trên Vercel Edge và ứng dụng Android gốc.
Tầng 2 là Application Tier chạy trên Render với Node.js Express, quản lý JWT và bộ đệm RAM Cache.
Tầng 3 là AI & Crawler Tier, tích hợp Google Gemini 3.8 Flash làm bộ não chính, kết hợp Groq LPU dự phòng và module cào dữ liệu Selenium.
Tầng 4 là Data Tier sử dụng cơ sở dữ liệu phân tán TiDB Cloud đặt tại Singapore kết nối mã hóa SSL.
Sự phân tách độc lập này giúp hệ thống phản hồi cực nhanh, mở rộng linh hoạt mà không tốn chi phí hạ tầng ở giai đoạn thử nghiệm.""")

# ==========================================
# SLIDE 5: NGĂN XẾP CÔNG NGHỆ (CHƯƠNG II & V)
# ==========================================
s5 = prs.slides.add_slide(blank_layout)
add_base_background(s5)
add_header(s5, "Chương II & V: Công Nghệ & Triển Khai", "Ngăn Xếp Công Nghệ Đa Nền Tảng (Full Tech Stack)", "Sự kết hợp giữa các công nghệ hiện đại nhất đảm bảo tốc độ, bảo mật và trải nghiệm mượt mà")

# 6 Grid Cards (2 rows x 3 cols)
w_grid = Inches(3.64)
h_grid = Inches(2.25)
gap_x = Inches(0.4)
gap_y = Inches(0.3)

tech_blocks = [
    ("🌐 Frontend Web (Client)", "• React 19.x, TypeScript 5.x\n• Vite 6.x (Bundler siêu tốc)\n• Tailwind CSS & Lucide Icons\n• Canvas Confetti (Hiệu ứng mở hộp)\n• Triển khai toàn cầu trên Vercel Edge", C_BLUE_LIGHT, C_BLUE),
    ("📱 Ứng Dụng Di Động (Mobile)", "• Android Studio (Java 17 LTS)\n• Android SDK 34 (Android 14 ready)\n• Native WebView Container Chromium\n• Xử lý viền màn hình (Edge-to-Edge)\n• Xuất bản tệp cài đặt GiftAI_v1.0.apk", C_PRIMARY_LIGHT, C_PRIMARY),
    ("⚙️ Máy Chủ Backend API", "• Node.js v20 LTS & Express.js v4.19\n• mysql2/promise Connection Pool (10 luồng)\n• Bảo mật bcryptjs (10 salt rounds) & JWT\n• RESTful API chuẩn hóa JSON\n• Triển khai đám mây trên Render", C_EMERALD_LIGHT, C_EMERALD),
    ("🗄️ Cơ Sở Dữ Liệu Phân Tán", "• TiDB Cloud Serverless (MySQL 8.0)\n• Data Center: AWS Singapore (ap-southeast-1)\n• Mã hóa đường truyền SSL/TLSv1.2 (Port 4000)\n• Chuẩn hóa 3NF kết hợp trường JSON\n• Tối ưu truy vấn cache chỉ từ 5 - 10ms", C_AMBER_LIGHT, C_AMBER),
    ("🧠 Trí Tuệ Nhân Tạo (AI)", "• Google GenAI SDK: Gemini 3.8 Flash\n• Groq SDK: Mô hình Llama 3 siêu tốc (Fallback)\n• OpenAI SDK: GPT-4o-mini dự phòng cấp 2\n• Kỹ nghệ Prompt hai pha (Intent + Re-rank)\n• Explainable AI (XAI) sinh lý do tâm lý", C_PRIMARY_LIGHT, C_PRIMARY),
    ("🕷️ Tự Động Thu Thập Dữ Liệu", "• Selenium WebDriver v4.18 (Headless Chrome)\n• Cheerio v1.0 bóc tách DOM tốc độ cao\n• Thu thập dữ liệu thực tế: Shopee, Lazada\n• Cơ chế băm URL hash chống trùng lặp\n• Quản lý kho catalog hơn 1.400+ sản phẩm", C_BLUE_LIGHT, C_BLUE)
]

for i, (title, content, bg_col, border_col) in enumerate(tech_blocks):
    row = i // 3
    col = i % 3
    x = Inches(0.8) + col * (w_grid + gap_x)
    y = Inches(1.85) + row * (h_grid + gap_y)
    
    card = add_card(s5, x, y, w_grid, h_grid, bg_color=bg_col, border_color=border_col)
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.2)
    tf.margin_top = Inches(0.15)
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = border_col
    
    p2 = tf.add_paragraph()
    p2.text = content
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = C_TEXT_DARK
    p2.space_before = Pt(4)

add_footer(s5, 5)
set_speaker_notes(s5, """Thưa Thầy Cô, đây là bức tranh tổng thể về công nghệ trong đồ án.
Ở Frontend, nhóm ứng dụng React 19 mới nhất cùng TypeScript để đảm bảo tính an toàn dữ liệu, deploy trên Vercel. Phía Mobile đã build thành công file APK chạy native WebView.
Phía Backend chạy Node.js 20 LTS kết nối với CSDL phân tán TiDB Cloud đặt tại Singapore qua SSL.
Đặc biệt ở tầng AI, nhóm tích hợp Google Gemini 3.8 Flash thông qua SDK chính thức, kèm hệ thống dự phòng Groq LPU và crawler tự động Selenium thu thập hơn 1.400 sản phẩm thực tế từ Shopee và Lazada.""")

# ==========================================
# SLIDE 6: THIẾT KẾ CSDL PHÂN TÁN (CHƯƠNG III)
# ==========================================
s6 = prs.slides.add_slide(blank_layout)
add_base_background(s6)
add_header(s6, "Chương III: Thiết Kế Hệ Thống", "Thiết Kế Cơ Sở Dữ Liệu Phân Tán (TiDB Cloud Schema)", "Chuẩn hóa 3NF kết hợp trường JSON linh hoạt tối ưu hóa tốc độ truy vấn và toàn vẹn dữ liệu")

c6_left = add_card(s6, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c6_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "📊 ĐẶC TẢ 6 BẢNG CSDL CỐT LÕI (3NF)"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

tables = [
    ("1. scraped_products (16 cột)", "Kho 1.400+ món quà; khóa UNIQUE product_key hash URL chống trùng; đánh index search_keyword và updated_at truy vấn dưới 10ms."),
    ("2. users (8 cột)", "Quản lý định danh; mật khẩu băm an toàn bcrypt (10 salt rounds); phân quyền role ('user', 'admin'); đánh index email đăng nhập dưới 5ms."),
    ("3. search_history (16 cột)", "Lưu vết tư vấn cả khách vãng lai và thành viên; lưu trường products_snapshot dạng JSON bảo toàn giá thực tế tại thời điểm tìm."),
    ("4. product_recommendation_stats (10 cột)", "Đo lường số lượt hiển thị và số lượt nhấp chuột (clicks) để tính toán tỷ lệ chuyển đổi CTR phục vụ tinh chỉnh Prompt."),
    ("5. user_favorites (9 cột)", "Danh mục món quà yêu thích cá nhân của thành viên; liên kết khóa ngoại với users; hỗ trợ tải nhanh khi xem trang hồ sơ."),
    ("6. memory_boxes (19 cột)", "Hộp kỷ niệm ảo; mã băm chia sẻ độc bản MEM-XXXXXX (UNIQUE); mốc thời gian đếm xuôi/ngược và dữ liệu quà, tâm thư đính kèm.")
]
for t_title, t_desc in tables:
    p = tf.add_paragraph()
    p.text = f"• {t_title}: {t_desc}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(9.5)
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(4)

add_placeholder(
    s6, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8),
    "Hình 3.2: Lược đồ quan hệ thực thể (ERD)\n(ERD.drawio.png)",
    "Vị trí chèn sơ đồ quan hệ thực thể giữa 6 bảng: USERS (1:N) USER_FAVORITES, SEARCH_HISTORY (1:N) STATS, MEMORY_BOXES và kho SCRAPED_PRODUCTS.",
    tag="SƠ ĐỒ QUAN HỆ THỰC THỂ ERD"
)

add_footer(s6, 6)
set_speaker_notes(s6, """CSDL của GiftAI được triển khai trên TiDB Cloud Serverless tương thích hoàn toàn MySQL 8.0 với 6 bảng chính đạt chuẩn chuẩn hóa 3NF:
Bảng scraped_products lưu hơn 1.400 sản phẩm với khóa URL hash độc nhất chống trùng lặp khi cào dữ liệu.
Bảng users quản lý người dùng với mật khẩu băm bcrypt 10 rounds và phân quyền admin/user.
Bảng search_history lưu lịch sử tìm kiếm kèm cột snapshot JSON giúp người dùng xem lại mà không cần JOIN bảng phức tạp.
Bảng stats đo lường click và CTR. Bảng favorites lưu quà thả tim.
Và bảng memory_boxes phục vụ tính năng Hộp quà kỷ niệm với mã độc bản share_code chia sẻ công khai.""")

# ==========================================
# SLIDE 7: MÔ HÌNH HÓA CA SỬ DỤNG (CHƯƠNG III)
# ==========================================
s7 = prs.slides.add_slide(blank_layout)
add_base_background(s7)
add_header(s7, "Chương III: Thiết Kế Hệ Thống", "Mô Hình Hóa 10 Ca Sử Dụng Trọng Tâm (Use Cases)", "Phân định rõ ràng trách nhiệm giữa Phân hệ Người dùng cuối và Phân hệ Quản trị viên")

# Left Column (User Subsystem)
c7_left = add_card(s7, Inches(0.8), Inches(1.85), Inches(5.6), Inches(4.8), bg_color=C_WHITE)
tf = c7_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "👤 PHÂN HỆ NGƯỜI DÙNG CUỐI (8 USE CASES)"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

user_ucs = [
    ("UC-01: Gợi ý quà tặng thông minh", "Khảo sát ngữ cảnh đa tiêu chí, phân rã ý định qua Gemini và tái xếp hạng sản phẩm kèm lời giải thích tâm lý."),
    ("UC-02: Sinh thiệp chúc mừng AI", "Tự động sáng tác lời chúc theo nhiều tông giọng (Chân thành, Hài hước, Lãng mạn, Thơ lục bát) trong 1.5s."),
    ("UC-03 & 04: Tạo & Mở Hộp kỷ niệm ảo", "Đóng gói tâm thư, quà đính kèm, đếm ngày yêu và chia sẻ qua mã MEM-XXXXXX mở quà kèm pháo hoa."),
    ("UC-05: Quản lý Quà yêu thích", "Thả tim lưu trữ các món quà ưng ý vào bộ sưu tập cá nhân (yêu cầu xác thực JWT)."),
    ("UC-06: Quản lý Lịch sử tìm kiếm", "Xem lại các phiên tư vấn trong quá khứ tức thì thông qua dữ liệu snapshot JSON."),
    ("UC-07 & 08: Đăng ký & Đăng nhập JWT", "Đăng ký an toàn, băm bcrypt và cấp mã JWT bảo vệ các tuyến API nhạy cảm.")
]
for uc_t, uc_d in user_ucs:
    p = tf.add_paragraph()
    p.text = f"• {uc_t}: {uc_d}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(9.5)
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(4)

# Right Column (Admin Subsystem + Placeholder)
c7_right_top = add_card(s7, Inches(6.7), Inches(1.85), Inches(5.833), Inches(1.8), bg_color=C_WHITE)
tf_adm = c7_right_top.text_frame
tf_adm.word_wrap = True
tf_adm.margin_left = tf_adm.margin_right = Inches(0.25)
tf_adm.margin_top = Inches(0.15)
p = tf_adm.paragraphs[0]
p.text = "🛡️ PHÂN HỆ QUẢN TRỊ VIÊN (2 USE CASES)"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

admin_ucs = [
    ("UC-09: Thống kê lượt click & Phân tích CTR", "Ghi nhận biến đếm clicks, tính tỷ lệ CTR = Clicks / Impressions theo danh mục để phân tích xu hướng mua sắm."),
    ("UC-10: Giám sát sản phẩm & Quản trị API", "Theo dõi kho 1.400+ sản phẩm, giám sát trạng thái 4 khóa API Gemini (lỗi 429) và nhật ký kích hoạt Groq Fallback.")
]
for uc_t, uc_d in admin_ucs:
    p = tf_adm.add_paragraph()
    p.text = f"• {uc_t}: {uc_d}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(9.5)
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(3)

# Placeholder below Admin card
add_placeholder(
    s7, Inches(6.7), Inches(3.8), Inches(5.833), Inches(2.85),
    "Hình 3.3 & 3.4: Sơ đồ Ca sử dụng Phân hệ Người dùng & Quản trị",
    "Vị trí chèn biểu đồ Use Case Diagram chuẩn UML thể hiện mối quan hệ giữa Khách vãng lai, Thành viên và Quản trị viên (Admin).",
    tag="BIỂU ĐỒ CA SỬ DỤNG UML"
)

add_footer(s7, 7)
set_speaker_notes(s7, """Hệ thống được mô hình hóa thành 10 ca sử dụng trọng tâm:
8 ca sử dụng thuộc phân hệ Người dùng cuối: Người dùng có thể tìm quà ngay mà không cần đăng nhập; chỉ khi lưu quà yêu thích, xem lại lịch sử hoặc tạo hộp kỷ niệm thì hệ thống mới kích hoạt xác thực JWT.
2 ca sử dụng thuộc phân hệ Quản trị viên (Admin): Admin có màn hình Dashboard riêng để theo dõi biểu đồ tỷ lệ nhấp chuột CTR, cũng như giám sát trạng thái sức khỏe của 4 khóa API Gemini và bộ chuyển mạch dự phòng Groq.""")

# ==========================================
# SLIDE 8: QUY TRÌNH PROMPT 2 PHA (CHƯƠNG IV)
# ==========================================
s8 = prs.slides.add_slide(blank_layout)
add_base_background(s8)
add_header(s8, "Chương IV: Đặc Thù & Giải Pháp AI", "Quy Trình Prompt Engineering Hai Pha (Two-Phase)", "Phân tách rành mạch giữa tư duy tâm lý học và thẩm định ngữ nghĩa sản phẩm thực tế")

c8_left = add_card(s8, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c8_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "⚙️ CHI TIẾT 2 PHA XỬ LÝ LÕI CỦA GIFTAI"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

phases = [
    ("Pha 1: Phân Rã Ý Định (Intent Parsing)", "• Đầu vào: Vector ngữ cảnh 7 chiều: {Quan hệ, Tuổi, Giới tính, Dịp lễ, Sở thích, Tính cách, Ngân sách}.\n• Xử lý: Google Gemini 3.8 Flash phân tích tâm lý người nhận.\n• Đầu ra: Cấu trúc JSON chuẩn gồm tóm tắt tâm lý (summary), danh mục quà gợi ý (items) và từ khóa tìm kiếm TMĐT (keywords)."),
    ("Cầu Nối Dữ Liệu (Database Intermediation)", "• Backend dùng từ khóa từ Pha 1 để truy vấn nhanh kho 1.400+ sản phẩm từ TiDB Cloud (hoặc kích hoạt worker cào bù từ Shopee/Lazada).\n• Tạo ra tập ứng viên sản phẩm thô D = {p1, p2, ..., pN}."),
    ("Pha 2: Tái Xếp Hạng & Lý Giải (Re-ranking & XAI)", "• Đầu vào: Tập ứng viên thô + ngữ cảnh ban đầu.\n• Sàng lọc: Loại bỏ triệt để 100% sản phẩm rác, ốp lưng, linh kiện máy móc hoặc lệch hoàn toàn tầm giá.\n• Sinh lý giải: Với mỗi sản phẩm hợp lệ, Gemini viết 1 câu giải thích ngắn nêu bật lý do người nhận hạnh phúc.\n• Kết quả: Tập Top-K sản phẩm tối ưu gửi về Client.")
]
for p_title, p_desc in phases:
    p = tf.add_paragraph()
    p.text = p_title
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    
    p2 = tf.add_paragraph()
    p2.text = p_desc
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_placeholder(
    s8, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8),
    "Hình 4.1: Quy trình Prompt Engineering hai pha\nkết hợp kho dữ liệu thực tế",
    "Vị trí chèn sơ đồ minh họa luồng xử lý 2 pha: Từ User Context -> Pha 1 (Intent Parsing) -> TiDB Cloud Query -> Pha 2 (Semantic Re-ranking & XAI) -> Top-K Products.",
    tag="QUY TRÌNH PROMPT 2 PHA"
)

add_footer(s8, 8)
set_speaker_notes(s8, """Đây là điểm sáng kỹ thuật quan trọng nhất của đồ án: Quy trình Prompt Engineering hai pha.
Nếu bắt một mô hình LLM vừa tư vấn vừa tự sinh link sản phẩm, mô hình sẽ bị ảo giác và bịa ra link 404 hoặc giá không có thật.
Do đó GiftAI tách làm 2 pha:
Pha 1: Tiếp nhận hồ sơ người nhận, Gemini phân tích tâm lý và trích xuất từ khóa tìm kiếm TMĐT chuẩn xác.
Tầng trung gian dùng từ khóa này để query kho 1.400 sản phẩm thật từ TiDB Cloud.
Pha 2: Đưa danh sách sản phẩm cào được vào lại mô hình Gemini để chấm điểm Re-ranking, loại bỏ đồ rác như ốp lưng, linh kiện máy tính, và viết lời giải thích tâm lý cho từng món quà.""")

# ==========================================
# SLIDE 9: KIẾN TRÚC AI 4 TẦNG CHỊU LỖI (CHƯƠNG IV)
# ==========================================
s9 = prs.slides.add_slide(blank_layout)
add_base_background(s9)
add_header(s9, "Chương IV: Đặc Thù & Giải Pháp AI", "Kiến Trúc Vận Hành 4 Tầng Của AI Engine (Chịu Lỗi Cao)", "Đảm bảo hệ thống vận hành bền bỉ 24/7, không gián đoạn dịch vụ trước giới hạn Rate Limit")

c9_left = add_card(s9, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c9_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🛡️ 4 PHÒNG TUYẾN CHỊU LỖI & TỐI ƯU ĐỘ TRỄ"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

four_tiers = [
    ("Tầng 1: In-Memory Semantic Cache (RAM)", "• Ánh xạ MD5(Context) trong bộ nhớ Map() Node.js.\n• TTL 30 phút, giải phóng FIFO khi vượt 500 mục.\n• Phản hồi tức thì < 10ms (O(1)), tiết kiệm 100% token khi có yêu cầu trùng lặp."),
    ("Tầng 2: Multi-Key Rotation Dispatcher", "• Xoay vòng mảng 4 khóa API Google Gemini theo thuật toán Modulo:\n  Index = (Index + 1) % 4.\n• Tăng dung lượng chịu tải tuyến tính: từ 15 lên 60 req/phút."),
    ("Tầng 3: LLM Inference & Retry Backoff", "• Gọi mô hình chính Google Gemini 3.8 Flash.\n• Khi gặp lỗi mạng tạm thời (500/503), tự động thử lại số mũ kèm nhiễu ngẫu nhiên: dt = t_base * 2^k + jitter."),
    ("Tầng 4: Cascading Fallback Cascade", "• Khi toàn bộ khóa Gemini gặp lỗi 429 (Resource Exhausted), tự động chuyển mạch sang Groq LPU (Llama 3 siêu tốc 1.8s) hoặc OpenAI GPT-4o-mini.\n• Cấp cuối kích hoạt Mock Engine bảo đảm không bao giờ sập app.")
]
for t_name, t_body in four_tiers:
    p = tf.add_paragraph()
    p.text = t_name
    p.font.name = "Segoe UI"
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(5)
    
    p2 = tf.add_paragraph()
    p2.text = t_body
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9.2)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_placeholder(
    s9, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8),
    "Hình 4.2 & 4.4: Sơ đồ kiến trúc 4 tầng AI Engine\n& Cơ chế chuyển mạch Fallback Cascade",
    "Vị trí chèn sơ đồ luồng điều phối: Cache Hit (<10ms) -> Multi-Key Modulo Rotation -> Gemini 3.8 Flash -> Chuyển mạch khẩn cấp Groq LPU / OpenAI khi gặp lỗi HTTP 429.",
    tag="SƠ ĐỒ 4 TẦNG CHỊU LỖI AI"
)

add_footer(s9, 9)
set_speaker_notes(s9, """Khi triển khai thực tế trên Cloud, các gói API miễn phí đều bị giới hạn nghiêm ngặt (15 yêu cầu/phút). Để dịch vụ vận hành 24/7 ổn định, nhóm đã xây dựng kiến trúc AI 4 tầng:
Tầng 1 là In-Memory Cache lưu trên RAM, nếu người dùng tìm câu hỏi tương tự thì nhận kết quả dưới 10ms mà không tốn token.
Tầng 2 là thuật toán Modulo xoay vòng 4 khóa API Gemini, nâng tải từ 15 lên 60 yêu cầu/phút.
Tầng 3 là cơ chế thử lại Retry Exponential Backoff khi chập chờn mạng.
Và Tầng 4 là bộ chuyển mạch Fallback Cascade: nếu Gemini bị quá tải 429, hệ thống tự động gọi sang Groq LPU chạy chip chuyên dụng siêu tốc chỉ 1.78 giây. Người dùng hoàn toàn không cảm nhận được sự cố.""")

# ==========================================
# SLIDE 10: TÍNH GIẢI THÍCH ĐƯỢC (CHƯƠNG IV)
# ==========================================
s10 = prs.slides.add_slide(blank_layout)
add_base_background(s10)
add_header(s10, "Chương IV: Đặc Thù & Giải Pháp AI", "Hiện Thực Hóa Tính Giải Thích Được (Explainable AI - XAI)", "Xóa bỏ rào cản 'hộp đen' để xây dựng niềm tin vững chắc và nâng cao quyết định mua sắm")

# 3 Horizontal / Structured Cards
w_card10 = Inches(11.733)
h_card10 = Inches(1.4)
gap_card10 = Inches(0.2)

c10_1 = add_card(s10, Inches(0.8), Inches(1.85), w_card10, h_card10, bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c10_1.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.15)
p = tf.paragraphs[0]
p.text = "💡 CẤP ĐỘ 1: GIẢI THÍCH Ý TƯỞNG TÂM LÝ (CONCEPT RATIONALE)"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_PRIMARY
p2 = tf.add_paragraph()
p2.text = "Tại Pha 1, mô hình AI giải thích lý do tâm lý học hành vi: tại sao nhóm người ở độ tuổi này, với tính cách và mối quan hệ đó lại cần món đồ này.\nVí dụ: 'Đối với bạn bè thân thiết có tính cách hướng nội và đam mê nghệ thuật, một bộ màu vẽ chuyên nghiệp giúp giải tỏa căng thẳng và thể hiện sự tinh tế của người tặng mà không gây áp lực về mặt xã hội.'"
p2.font.name = "Segoe UI"
p2.font.size = Pt(10)
p2.font.color.rgb = C_TEXT_DARK
p2.space_before = Pt(3)

c10_2 = add_card(s10, Inches(0.8), Inches(1.85) + h_card10 + gap_card10, w_card10, h_card10, bg_color=C_WHITE, border_color=C_ACCENT_PINK)
tf = c10_2.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.15)
p = tf.paragraphs[0]
p.text = "🏷️ CẤP ĐỘ 2: GIẢI THÍCH SẢN PHẨM THỰC TẾ (PRODUCT-LEVEL CONTEXTUAL BADGE)"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK
p2 = tf.add_paragraph()
p2.text = "Tại Pha 2, sau khi lọc sản phẩm từ sàn TMĐT, mỗi thẻ sản phẩm hiển thị kèm một huy hiệu lý do (Contextual Badge) ngắn gọn được đóng khung nổi bật.\nVí dụ: 'Sản phẩm này có giá 320.000đ, nằm trọn vẹn trong ngân sách 500k của bạn, có chứng nhận chính hãng và phù hợp hoàn hảo với sở thích làm bánh của mẹ.'"
p2.font.name = "Segoe UI"
p2.font.size = Pt(10)
p2.font.color.rgb = C_TEXT_DARK
p2.space_before = Pt(3)

c10_3 = add_card(s10, Inches(0.8), Inches(1.85) + (h_card10 + gap_card10)*2, w_card10, Inches(1.5), bg_color=C_EMERALD_LIGHT, border_color=C_EMERALD)
tf = c10_3.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.15)
p = tf.paragraphs[0]
p.text = "📈 GIÁ TRỊ THỰC TIỄN & KẾT QUẢ KHẢO SÁT NGƯỜI DÙNG"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_EMERALD
p2 = tf.add_paragraph()
p2.text = "• Xóa bỏ hoàn toàn hiện tượng 'Hộp đen' (Black-Box): Người dùng không chỉ nhận được kết quả mà còn hiểu rõ nguyên nhân sâu xa.\n• Tăng độ tin cậy và tỷ lệ chuyển đổi: Khảo sát thực tế trên 30 người dùng cho thấy 86.7% người dùng khẳng định lời giải thích tâm lý của AI là yếu tố quyết định giúp họ an tâm và tự tin bấm vào liên kết mua quà trên sàn TMĐT."
p2.font.name = "Segoe UI"
p2.font.size = Pt(10)
p2.font.color.rgb = C_TEXT_DARK
p2.space_before = Pt(3)

add_footer(s10, 10)
set_speaker_notes(s10, """Một trong những điểm yếu lớn nhất của các hệ thống gợi ý hiện nay là tính chất 'Hộp đen' (Black-box), tức là người dùng được đưa cho một sản phẩm nhưng không hiểu vì sao hệ thống lại chọn nó.
Trong GiftAI, chúng em hiện thực hóa nguyên lý Explainable AI (XAI) ở 2 cấp độ:
Cấp độ 1 giải thích tâm lý học hành vi ở mức khái niệm.
Cấp độ 2 gắn trực tiếp thẻ giải thích vào từng sản phẩm thực tế, đối chiếu trực tiếp với ngân sách và sở thích.
Kết quả khảo sát cho thấy 86.7% người dùng đánh giá rất cao tính năng này vì nó cho họ lý do thuyết phục để chi tiền mua quà.""")

# ==========================================
# SLIDE 11: HIỆN THỰC HÓA: KHẢO SÁT 4 BƯỚC (CHƯƠNG V)
# ==========================================
s11 = prs.slides.add_slide(blank_layout)
add_base_background(s11)
add_header(s11, "Chương V: Cài Đặt & Thực Nghiệm", "Giao Diện Khảo Sát Ngữ Cảnh 4 Bước (Survey Wizard)", "Tối ưu hóa theo nguyên lý tối giản nhận thức (Cognitive Ease), tương tác trực quan")

c11_left = add_card(s11, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c11_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "✨ QUY TRÌNH 4 BƯỚC NHẬP LIỆU THÔNG MINH"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

steps = [
    ("Bước 1: Hồ Sơ Người Nhận", "Chọn nhanh qua các biểu tượng đại diện: Người yêu, Bố mẹ, Bạn thân, Đồng nghiệp, Sếp; nhập số tuổi và chọn giới tính."),
    ("Bước 2: Dịp Lễ Tặng Quà", "Phân loại trực quan theo ngày kỷ niệm: Sinh nhật, Valentine 14/2, Kỷ niệm ngày yêu, Giáng sinh, Tân gia, 8/3 - 20/10."),
    ("Bước 3: Sở Thích & Tính Cách", "Tích hợp thẻ từ khóa chọn nhanh (Công nghệ, Thú cưng, Nấu ăn, Thể thao, Thời trang, Nghệ thuật) hoặc nhập tự do mô tả riêng."),
    ("Bước 4: Ràng Buộc Ngân Sách", "Thanh trượt kép thông minh (Dual Range Slider) từ 50.000đ đến 20.000.000đ kèm định dạng tiền tệ VNĐ rõ ràng."),
    ("Tối Ưu Trải Nghiệm (UX)", "Người dùng không cần gõ văn bản dài mệt mỏi; chỉ mất dưới 30 giây để hoàn thành toàn bộ thông số đầu vào cho AI.")
]
for s_title, s_desc in steps:
    p = tf.add_paragraph()
    p.text = f"• {s_title}: {s_desc}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(10)
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)

add_placeholder(
    s11, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8),
    "Hình 5.1: Giao diện khảo sát ngữ cảnh tặng quà\n(Web & Mobile App)",
    "Vị trí chèn ảnh chụp màn hình Giao diện Khảo sát 4 bước: Card Selectors chọn mối quan hệ, dịp lễ, các tag sở thích và thanh trượt Dual Range Slider.",
    tag="GIAO DIỆN KHẢO SÁT WIZARD"
)

add_footer(s11, 11)
set_speaker_notes(s11, """Sang Chương V về hiện thực hóa, đây là giao diện Wizard khảo sát ngữ cảnh tặng quà 4 bước.
Giao diện được thiết kế theo nguyên lý Cognitive Ease: thay vì bắt người dùng gõ văn bản dài dòng gây ngại ngùng, chúng em cung cấp các thẻ chọn trực quan từ đối tượng, dịp tặng đến sở thích.
Ở bước cuối cùng là thanh trượt ngân sách kép, giúp người dùng cố định khoảng tiền sẵn sàng chi trả từ 50 nghìn đến 20 triệu đồng. Toàn bộ thao tác chỉ mất chưa đầy 30 giây.""")

# ==========================================
# SLIDE 12: HIỆN THỰC HÓA: KẾT QUẢ GỢI Ý & LÝ GIẢI (CHƯƠNG V)
# ==========================================
s12 = prs.slides.add_slide(blank_layout)
add_base_background(s12)
add_header(s12, "Chương V: Cài Đặt & Thực Nghiệm", "Màn Hình Hiển Thị Gợi Ý Quà & Hộp Thoại Lý Giải AI", "Trực quan hóa danh mục sản phẩm Shopee/Lazada đã qua màng lọc ngữ nghĩa và gán huy hiệu XAI")

c12_left = add_card(s12, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c12_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🎁 THÀNH PHẦN GIAO DIỆN KẾT QUẢ THÔNG MINH"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

ui_features = [
    ("Thẻ Sản Phẩm Thông Minh (Product Card)", "Hiển thị ảnh đại diện sắc nét từ sàn TMĐT, tên thương mại chuẩn hóa, giá bán thực tế kèm nhãn chênh lệch ngân sách."),
    ("Hộp Thoại Lý Giải AI (Reasoning Callout)", "Khung giải thích tâm lý nổi bật với tone màu tím hoàng gia (Royal Violet), chỉ rõ vì sao món quà làm người nhận xúc động."),
    ("Biểu Tượng Sàn Xuất Xứ (Platform Tag)", "Hiển thị nhãn rõ ràng xuất xứ từ Shopee hay Lazada, tạo sự an tâm và minh bạch về nguồn gốc hàng hóa."),
    ("Nút Mua Hàng Trực Tiếp (Outbound Link)", "Nhấp chuột mở tab mới chuyển hướng trực tiếp tới trang sản phẩm chính chủ trên sàn để tiến hành thanh toán."),
    ("Tương Tác Cá Nhân Hóa (Favorites & Card)", "Nút thả tim lưu nhanh vào bộ sưu tập cá nhân và nút bấm tạo thiệp chúc mừng đính kèm cho món quà đã chọn.")
]
for f_t, f_d in ui_features:
    p = tf.add_paragraph()
    p.text = f"• {f_t}: {f_d}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(10)
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)

add_placeholder(
    s12, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8),
    "Hình 5.2: Kết quả gợi ý quà tặng & Hộp lý giải AI\n(Responsive Grid)",
    "Vị trí chèn ảnh chụp màn hình Danh sách sản phẩm gợi ý: Thẻ sản phẩm Shopee/Lazada, Hộp thoại AI Reasoning Callout màu tím và nút mua hàng trực tiếp.",
    tag="GIAO DIỆN KẾT QUẢ GỢI Ý"
)

add_footer(s12, 12)
set_speaker_notes(s12, """Sau khi AI hoàn tất suy luận và tái xếp hạng từ TiDB Cloud, màn hình kết quả sẽ hiển thị dạng lưới phản hồi:
Mỗi thẻ quà tặng gồm hình ảnh thực tế, giá bán, logo sàn Shopee hoặc Lazada.
Đặc biệt, dưới mỗi sản phẩm là một khối màu tím hoàng gia - đây chính là AI Reasoning Callout giải thích cặn kẽ tại sao món quà này lại hoàn hảo cho đối tượng.
Người dùng có thể bấm thả tim để lưu vào danh sách yêu thích, hoặc nhấp vào nút mua hàng để chuyển thẳng tới sàn thương mại điện tử.""")

# ==========================================
# SLIDE 13: HIỆN THỰC HÓA: THIỆP CHÚC MỪNG AI (CHƯƠNG V)
# ==========================================
s13 = prs.slides.add_slide(blank_layout)
add_base_background(s13)
add_header(s13, "Chương V: Cài Đặt & Thực Nghiệm", "Phân Hệ Sáng Tạo Thiệp Chúc Mừng Điện Tử AI", "Cá nhân hóa lời chúc đa phong cách cảm xúc kết hợp hiệu ứng pháo hoa mở hộp quà tương tác")

c13_left = add_card(s13, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c13_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "💌 TÍNH NĂNG GIAO DIỆN PHÒNG TẠO THIỆP AI"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

card_features = [
    ("Bộ Sinh Lời Chúc AI Tự Động (1.5s)", "Người dùng chọn món quà cụ thể và chọn tông giọng cảm xúc mong muốn (Chân thành, Hài hước, Lãng mạn, Trang trọng, Thơ lục bát). AI tự động sáng tác thông điệp chạm đến trái tim."),
    ("Tùy Biến Visual & Nhạc Nền Đa Dạng", "Tùy chọn các chủ đề giao diện thiệp: Pastel ngọt ngào, Dạ tiệc sang trọng, Giáng sinh ấm áp; kèm phông chữ nghệ thuật tiếng Việt và nhạc nền nhẹ nhàng."),
    ("Hiệu Ứng Mở Nắp Hộp & Pháo Hoa Tương Tác", "Tích hợp thư viện Canvas Confetti tạo hiệu ứng pháo hoa giấy bung nở sinh động khi người nhận bấm nút 'Mở thiệp quà'."),
    ("Chỉnh Sửa Trực Tiếp & Xuất Bản Đa Kênh", "Người dùng có thể gõ chỉnh sửa lại câu chữ trực tiếp trên thiệp 3D, tải ảnh thiệp về máy hoặc đính kèm vào Hộp kỷ niệm ảo.")
]
for c_t, c_d in card_features:
    p = tf.add_paragraph()
    p.text = f"• {c_t}: {c_d}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(10)
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)

add_placeholder(
    s13, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8),
    "Hình 5.3: Phân hệ thiết kế thiệp chúc mừng AI\n(AI Greeting Card Studio)",
    "Vị trí chèn ảnh chụp màn hình Trình soạn thảo thiệp mừng: Bộ chọn tone cảm xúc, khung thiệp 3D, hiệu ứng pháo hoa giấy Canvas Confetti mở nắp hộp.",
    tag="GIAO DIỆN THIỆP CHÚC MỪNG AI"
)

add_footer(s13, 13)
set_speaker_notes(s13, """Bên cạnh việc tìm quà, GiftAI còn cung cấp một tiện ích gia tăng cảm xúc rất ý nghĩa: Phân hệ tạo thiệp chúc mừng điện tử bằng AI.
Người dùng có thể chọn các tông giọng như Chân thành, Lãng mạn, Hài hước hoặc thậm chí là Thơ lục bát 4 câu. AI chỉ mất 1.5 giây để sinh ra lời chúc độc bản.
Khi người nhận mở liên kết thiệp trên điện thoại, hệ thống sẽ kích hoạt bản nhạc du dương cùng hiệu ứng pháo hoa bung nở, biến món quà thành một kỷ niệm khó quên.""")

# ==========================================
# SLIDE 14: HIỆN THỰC HÓA: HỘP KỶ NIỆM & APP ANDROID (CHƯƠNG V)
# ==========================================
s14 = prs.slides.add_slide(blank_layout)
add_base_background(s14)
add_header(s14, "Chương V: Cài Đặt & Thực Nghiệm", "Hộp Kỷ Niệm Ảo (Memory Box) & Ứng Dụng Android", "Không gian lưu giữ ký ức số chia sẻ độc bản và ứng dụng di động tối ưu hiệu năng cao")

# Top Card: Memory Box
c14_top = add_card(s14, Inches(0.8), Inches(1.85), Inches(11.733), Inches(2.2), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c14_top.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.15)
p = tf.paragraphs[0]
p.text = "📦 HỘP KỶ NIỆM ẢO & ĐẾM NGÀY ĐẶC BIỆT (VIRTUAL MEMORY BOX)"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

mem_points = [
    "Đóng gói không gian kỷ niệm: Kết hợp giữa bức tâm thư chân thành, món quà vật lý đính kèm và đồng hồ đếm thời gian linh hoạt (đếm xuôi ngày yêu nhau count-up hoặc đếm ngược tới sinh nhật countdown).",
    "Mã chia sẻ độc bản MEM-XXXXXX: Hệ thống sinh mã băm ngẫu nhiên bằng thư viện crypto. Người gửi chỉ cần sao chép link chia sẻ qua Zalo/Messenger; người nhận mở ngay mà không cần tài khoản.",
    "Tương tác cảm xúc: Người nhận có thể thả tim, xem số lượt mở hộp (unboxed_count) và gửi phản hồi trực tiếp."
]
for pt in mem_points:
    p = tf.add_paragraph()
    p.text = f"• {pt}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(9.5)
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(3)

# Bottom Card: Android App + Placeholder
c14_bot_left = add_card(s14, Inches(0.8), Inches(4.25), Inches(5.8), Inches(2.4), bg_color=C_WHITE, border_color=C_EMERALD)
tf_apk = c14_bot_left.text_frame
tf_apk.word_wrap = True
tf_apk.margin_left = tf_apk.margin_right = Inches(0.25)
tf_apk.margin_top = Inches(0.15)
p = tf_apk.paragraphs[0]
p.text = "📱 ỨNG DỤNG ANDROID NATIVE WEBVIEW"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_EMERALD

apk_points = [
    "Đóng gói file cài đặt APK độc lập (GiftAI_v1.0.apk) phát triển trên Android Studio (Java 17, Android SDK 34).",
    "Tối ưu bộ nhớ đệm: WebSettings cấu hình DomStorageEnabled và LOAD_DEFAULT cho tốc độ mở tức thì.",
    "Xử lý nút Back phần cứng: Bấm nút quay lại trên điện thoại sẽ chuyển lùi trang lịch sử thay vì thoát app đột ngột.",
    "Màn hình chờ (Splash Screen) chuyên nghiệp đồng bộ nhận diện thương hiệu."
]
for pt in apk_points:
    p = tf_apk.add_paragraph()
    p.text = f"• {pt}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(9)
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(3)

add_placeholder(
    s14, Inches(6.9), Inches(4.25), Inches(5.633), Inches(2.4),
    "Ảnh chụp màn hình: Hộp kỷ niệm ảo & App Android\n(GiftAI_v1.0.apk)",
    "Vị trí chèn ảnh giao diện Hộp kỷ niệm đếm ngày và ảnh app GiftAI chạy thực tế trên điện thoại Android.",
    tag="HỘP KỶ NIỆM & ANDROID APP"
)

add_footer(s14, 14)
set_speaker_notes(s14, """Một tính năng rất độc đáo của đồ án là Hộp kỷ niệm ảo (Memory Box). Người dùng có thể đóng gói bức tâm thư, món quà kèm đồng hồ đếm ngày yêu nhau hoặc đếm ngược sinh nhật.
Hệ thống tự động cấp một mã định danh độc bản như MEM-9K2F7A để gửi qua Zalo hay Messenger. Người nhận chỉ cần mở link là xem được ngay mà không cần tạo tài khoản rườm rà.
Song song đó, nhóm đã hoàn thiện ứng dụng Android gốc (GiftAI_v1.0.apk), xử lý nút Back phần cứng và tối ưu bộ nhớ đệm giúp trải nghiệm trên smartphone vô cùng mượt mà.""")

# ==========================================
# SLIDE 15: KIỂM THỬ & ĐO LƯỜNG HIỆU NĂNG (CHƯƠNG V)
# ==========================================
s15 = prs.slides.add_slide(blank_layout)
add_base_background(s15)
add_header(s15, "Chương V: Cài Đặt & Thực Nghiệm", "Kết Quả Kiểm Thử Hệ Thống & Đo Lường Hiệu Năng", "Minh chứng thực nghiệm định lượng về độ trễ đáp ứng, tính chịu lỗi và sức tải đồng thời")

c15_left = add_card(s15, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c15_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🧪 KẾT QUẢ KIỂM THỬ THỰC NGHIỆM"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

test_results = [
    ("Kiểm Thử Chức Năng (Functional Test)", "Toàn bộ 8/8 bộ kịch bản kiểm thử (TC-01 đến TC-08) đều đạt trạng thái thành công xuất sắc: 100% PASS (Đăng ký JWT, lọc ngân sách, Cache RAM, xoay vòng khóa, tạo thiệp, mở hộp quà)."),
    ("Đo Lường Thời Gian Đáp Ứng (Latency)", "• Trạng thái Cache Hit (RAM): 3.2 ms - 8.5 ms (gần như tức thì, < 10ms).\n• Trạng thái Cache Miss (Gemini 3.8 Flash): Trung bình 2.42 giây (truy vấn kho TiDB + lọc AI).\n• Chuyển mạch Fallback (Groq LPU): 1.78 giây (suy luận siêu tốc trên phần cứng LPU)."),
    ("Kiểm Thử Chịu Tải Đồng Thời (Stress Test)", "• Cấu hình 1 API Key đơn lẻ: Khi tải vượt 15 req/phút, hệ thống xuất hiện lỗi HTTP 429 với tỷ lệ lỗi lên tới 38%.\n• Multi-Key Rotation (4 Keys + Fallback): Duy trì tỷ lệ thành công 99.8% ở mức tải 55 req/phút, không làm gián đoạn dịch vụ.")
]
for r_t, r_d in test_results:
    p = tf.add_paragraph()
    p.text = r_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    
    p2 = tf.add_paragraph()
    p2.text = r_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_placeholder(
    s15, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8),
    "Hình 5.4: Biểu đồ so sánh thời gian đáp ứng\nvà kết quả kiểm thử chịu tải đồng thời",
    "Vị trí chèn biểu đồ cột: So sánh Cache Hit (5ms) vs. Gemini 3.8 Flash (2.4s) vs. Fallback Groq (1.8s) và biểu đồ tỷ lệ thành công 99.8% khi chịu tải 55 req/phút.",
    tag="BIỂU ĐỒ ĐO LƯỜNG HIỆU NĂNG"
)

add_footer(s15, 15)
set_speaker_notes(s15, """Về kết quả kiểm thử thực nghiệm:
Về mặt chức năng: Cả 8 test case trọng yếu từ đăng ký, lọc ngân sách, kiểm tra cache đến xoay vòng khóa đều đạt 100% PASS.
Về thời gian đáp ứng: Khi trúng Cache RAM, hệ thống phản hồi siêu tốc chỉ từ 3 đến 8 mili-giây. Khi gọi mô hình Gemini kết hợp truy vấn TiDB, thời gian là 2.42 giây; và nếu chuyển sang Groq chỉ mất 1.78 giây.
Về kiểm thử tải: Với 1 key duy nhất thì tới 15 req/phút đã lỗi 38% do quá hạn ngạch Google. Nhưng khi bật Multi-Key Rotation với 4 key xoay vòng kết hợp Fallback, hệ thống chịu tải mượt mà 55 req/phút với tỷ lệ thành công 99.8%.""")

# ==========================================
# SLIDE 16: HIỆU QUẢ RE-RANKING & ĐÁNH GIÁ UX (CHƯƠNG V & VI)
# ==========================================
s16 = prs.slides.add_slide(blank_layout)
add_base_background(s16)
add_header(s16, "Chương V & VI: Đánh Giá Thực Nghiệm", "Hiệu Quả AI Re-Ranking & Đánh Giá Trải Nghiệm (SUS)", "Chứng minh vai trò quyết định của màng lọc ngữ nghĩa và mức độ hài lòng vượt trội của người dùng")

c16_left = add_card(s16, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c16_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🎯 HIỆU QUẢ LỌC RÁC CỦA AI RE-RANKING"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

eval_points = [
    ("Trước khi có AI (Dữ liệu thô từ sàn TMĐT)", "• Tỉ lệ sản phẩm rác chiếm tới 46.8%: gồm ốp lưng, dây đeo, sách hướng dẫn, linh kiện do người bán cố tình nhồi từ khóa SEO.\n• Chỉ có 53.2% sản phẩm thực sự phù hợp làm quà tặng."),
    ("Sau khi qua AI Re-ranking (Gemini 3.8 Flash)", "• Toàn bộ phụ kiện vô giá trị bị loại bỏ triệt để ngay tại tầng Backend.\n• Tỉ lệ quà tặng chính xác và phù hợp ngữ cảnh đạt 94.2% (chỉ số Precision@5 tăng vọt từ 52% lên 94.2%)."),
    ("Khảo Sát Người Dùng Chuẩn Quốc Tế SUS", "• Khảo sát thực tế trên 30 người dùng đa dạng (sinh viên, văn phòng, phụ huynh).\n• Điểm SUS trung bình: 84.6 / 100 điểm (Xếp loại Grade A - Excellent), vượt xa mức chuẩn trung bình ngành 68 điểm.\n• 90% người dùng đánh giá cao tính năng giải quyết 'bí ý tưởng'.\n• 86.7% tin tưởng lời giải thích AI; 93.3% thích thú với hiệu ứng pháo hoa mở thiệp.")
]
for ep_t, ep_d in eval_points:
    p = tf.add_paragraph()
    p.text = ep_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    
    p2 = tf.add_paragraph()
    p2.text = ep_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_placeholder(
    s16, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8),
    "Hình 5.5 & 6.1: Biểu đồ tỷ lệ lọc rác sản phẩm\n& Phân bổ điểm khảo sát SUS (84.6 điểm)",
    "Vị trí chèn biểu đồ tròn tỷ lệ sạch của dữ liệu (trước: 53.2% quà thật -> sau: 94.2% quà thật) và biểu đồ phân bổ điểm khảo sát SUS đạt mức Hạng A (Xuất sắc).",
    tag="BIỂU ĐỒ RE-RANKING & ĐIỂM SUS"
)

add_footer(s16, 16)
set_speaker_notes(s16, """Để chứng minh giá trị thực sự của AI chứ không phải gắn mác AI cho có, chúng em đã làm thực nghiệm đối chứng:
Nếu lấy dữ liệu thô cào từ sàn TMĐT thì có tới gần một nửa (46.8%) là hàng rác, ốp lưng, phụ kiện do người bán nhồi từ khóa. Nhưng sau khi đưa qua màng lọc ngữ nghĩa Pha 2 của Gemini, độ chính xác quà tặng tăng vọt lên 94.2%.
Về trải nghiệm người dùng, nhóm khảo sát 30 người dùng thực tế theo thang đo chuẩn quốc tế SUS (System Usability Scale). Kết quả đạt 84.6/100 điểm, thuộc Grade A - Mức xuất sắc, vượt xa mức chuẩn trung bình của ngành phần mềm là 68 điểm.""")

# ==========================================
# SLIDE 17: BENCHMARKING & KINH DOANH (CHƯƠNG VI)
# ==========================================
s17 = prs.slides.add_slide(blank_layout)
add_base_background(s17)
add_header(s17, "Chương VI: Kết Quả & Đánh Giá", "So Sánh Đối Chuẩn (Benchmarking) & Tiềm Năng Kinh Doanh", "Khẳng định lợi thế cạnh tranh độc bản và lộ trình thương mại hóa bền vững trong kinh tế số")

c17_left = add_card(s17, Inches(0.8), Inches(1.85), Inches(5.8), Inches(4.8), bg_color=C_WHITE)
tf = c17_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "⚖️ BẢNG SO SÁNH ĐỐI CHUẨN (BENCHMARKING)"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

benchmarks = [
    ("So với Tìm kiếm sàn TMĐT (Shopee/Lazada)", "• Sàn TMĐT: Chỉ so khớp từ khóa cơ học, không hiểu cảm xúc, lẫn nhiều rác.\n• GiftAI: Mô hình hóa ngữ cảnh 7 chiều, loại bỏ 94.2% rác, hiểu sâu tâm lý."),
    ("So với Chatbot AI thông thường (ChatGPT)", "• Chatbot: Thường bị ảo giác (Hallucination), bịa link hỏng hoặc giá sai lệch.\n• GiftAI: Cung cấp sản phẩm thật 100% từ kho TiDB kèm giá và link mua chính xác."),
    ("So với Các Website / Blog gợi ý tĩnh", "• Website tĩnh: Danh sách cố định, bài viết cũ, giá không cập nhật.\n• GiftAI: Tự động hóa cập nhật, cá nhân hóa cho từng cá nhân và ngân sách."),
    ("Kết luận Vị thế Cạnh tranh", "GiftAI đóng vai trò chiếc cầu nối hoàn hảo dung hòa giữa Trí tuệ Nhân tạo hiện đại và Thương mại Điện tử thực tế.")
]
for b_t, b_d in benchmarks:
    p = tf.add_paragraph()
    p.text = b_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(5)
    
    p2 = tf.add_paragraph()
    p2.text = b_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9.2)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

c17_right = add_card(s17, Inches(6.9), Inches(1.85), Inches(5.633), Inches(4.8), bg_color=C_WHITE)
tf_biz = c17_right.text_frame
tf_biz.word_wrap = True
tf_biz.margin_left = tf_biz.margin_right = Inches(0.25)
tf_biz.margin_top = Inches(0.2)
p = tf_biz.paragraphs[0]
p.text = "💰 3 TRỤ CỘT THƯƠNG MẠI HÓA (BUSINESS MODEL)"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

biz_models = [
    ("1. Tiếp Thị Liên Kết (Affiliate Marketing)", "• Đính kèm mã tiếp thị liên kết (Affiliate Deep Link) vào mỗi sản phẩm gợi ý.\n• Nhận hoa hồng 3% - 12% giá trị mỗi đơn hàng thành công trên Shopee, Lazada.\n• Thị trường quà tặng Việt Nam ước tính hàng trăm triệu USD/năm, tạo nguồn doanh thu thụ động bền vững."),
    ("2. Mô Hình Tài Khoản Freemium (GiftAI VIP)", "• Free Tier: Tìm kiếm gợi ý không giới hạn, lưu tối đa 3 ngày kỷ niệm.\n• VIP Tier: Không giới hạn Hộp kỷ niệm, tự động gửi tin nhắn SMS/Zalo nhắc trước ngày lễ 3 ngày, mở khóa mẫu thiệp 3D độc quyền, ưu tiên cụm AI tốc độ cao."),
    ("3. Hợp Tác Thương Hiệu Quà Tặng (Brand Partnerships)", "• Mở cổng kết nối cho các đơn vị kinh doanh đồ thủ công mỹ nghệ (Handmade), hoa tươi, quà khắc tên tiếp cận khách hàng có nhu cầu mua thực tế.")
]
for bm_t, bm_d in biz_models:
    p = tf_biz.add_paragraph()
    p.text = bm_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    
    p2 = tf_biz.add_paragraph()
    p2.text = bm_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(9.2)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_footer(s17, 17)
set_speaker_notes(s17, """So sánh với các giải pháp trên thị trường:
Các sàn TMĐT thì máy móc không hiểu cảm xúc. Chatbot như ChatGPT thì hay bịa ra link ảo 404. Các bài viết blog thì cũ kỹ không cập nhật giá. GiftAI chính là mảnh ghép hoàn hảo dung hòa cả hai thế giới: vừa hiểu tâm lý con người, vừa đưa ra link mua và giá bán chính xác 100%.
Về tiềm năng kinh doanh, đồ án có lộ trình thương mại hóa rõ ràng dựa trên 3 trụ cột: Doanh thu tiếp thị liên kết Affiliate 3-12% từ Shopee/Lazada, gói tài khoản Freemium VIP tự động nhắc ngày lễ qua Zalo, và hợp tác với các thương hiệu quà tặng thủ công handmade.""")

# ==========================================
# SLIDE 18: TỔNG KẾT & LỜI CẢM ƠN (CHƯƠNG VII - DARK THEME)
# ==========================================
s18 = prs.slides.add_slide(blank_layout)
add_base_background(s18, is_dark=True)
add_header(s18, "Chương VII: Kết Luận & Hướng Phát Triển", "Tổng Kết Đóng Góp Của Đề Tài & Lộ Trình Tương Lai", "Hoàn thành toàn diện 100% mục tiêu nghiên cứu và vạch ra chiến lược phát triển dài hạn", is_dark=True)

# 2 Big Cards
w_c18 = Inches(5.6)
c18_left = add_card(s18, Inches(0.8), Inches(1.85), w_c18, Inches(3.6), bg_color=C_DARK_CARD, border_color=C_DARK_CARD_BORDER)
tf = c18_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🏆 ĐÓNG GÓP NỔI BẬT CỦA ĐỀ TÀI"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

contributions = [
    ("Hoàn thành 100% khối lượng đề ra:", "Ứng dụng vận hành thực tế 24/7 trên Cloud (Vercel, Render, TiDB) và đóng gói APK Android hoàn chỉnh."),
    ("Đóng góp khoa học & mô hình hóa:", "Giải quyết 'nghịch lý người mua không phải người dùng' bằng vector 7 chiều, Prompt 2 pha và hiện thực hóa Explainable AI."),
    ("Đóng góp kỹ thuật hệ thống:", "Kiến trúc 4 tầng chịu lỗi cao, bộ đệm RAM Cache < 10ms, thuật toán xoay vòng đa khóa Modulo và Cascading Fallback.")
]
for c_t, c_d in contributions:
    p = tf.add_paragraph()
    p.text = f"• {c_t} {c_d}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(10)
    p.font.color.rgb = C_TEXT_LIGHT
    p.space_before = Pt(6)

c18_right = add_card(s18, Inches(6.9), Inches(1.85), Inches(5.633), Inches(3.6), bg_color=C_DARK_CARD, border_color=C_DARK_CARD_BORDER)
tf_road = c18_right.text_frame
tf_road.word_wrap = True
tf_road.margin_left = tf_road.margin_right = Inches(0.25)
tf_road.margin_top = Inches(0.2)
p = tf_road.paragraphs[0]
p.text = "🔮 LỘ TRÌNH PHÁT TRIỂN TƯƠNG LAI"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

roadmap = [
    ("Kế hoạch ngắn hạn (Short-term):", "Chuyển đổi bộ đệm sang Redis Cluster phân tán đa máy chủ; tích hợp Open API chính thức của Shopee/Lazada; phát triển ứng dụng di động Native có thông báo đẩy Push Notifications."),
    ("Tầm nhìn dài hạn (Long-term):", "Fine-tune mô hình mã nguồn mở cục bộ (Self-hosted SLM: Llama 3 / Gemma 2) giảm chi phí API; ứng dụng Multimodal AI phân tích ảnh phòng/gu ăn mặc để gợi ý quà; tích hợp cổng thanh toán 1 chạm (In-App Checkout).")
]
for r_t, r_d in roadmap:
    p = tf_road.add_paragraph()
    p.text = f"• {r_t} {r_d}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(10)
    p.font.color.rgb = C_TEXT_LIGHT
    p.space_before = Pt(6)

# Bottom Thank You Banner
c18_bot = add_card(s18, Inches(0.8), Inches(5.65), Inches(11.733), Inches(1.2), bg_color=C_DARK_CARD, border_color=C_PRIMARY)
tf_ty = c18_bot.text_frame
tf_ty.word_wrap = True
tf_ty.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf_ty.paragraphs[0]
p.text = "🙏 XIN CHÂN THÀNH CẢM ƠN THẦY TS. ĐỖ PHÚC HẢO & QUÝ THẦY CÔ HỘI ĐỒNG!"
p.alignment = PP_ALIGN.CENTER
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

p2 = tf_ty.add_paragraph()
p2.text = "CHÚNG EM XIN SẴN SÀNG LẮNG NGHE Ý KIẾN ĐÓNG GÓP & TRẢ LỜI CÁC CÂU HỎI (Q&A)"
p2.alignment = PP_ALIGN.CENTER
p2.font.name = "Segoe UI"
p2.font.size = Pt(11)
p2.font.bold = True
p2.font.color.rgb = C_TEXT_LIGHT
p2.space_before = Pt(3)

add_footer(s18, 18, is_dark=True)
set_speaker_notes(s18, """Để kết luận bài báo cáo: Đề tài GiftAI là minh chứng rõ nét cho thấy Trí tuệ Nhân tạo có thể ứng dụng hiệu quả vào đời sống hàng ngày, biến sự lúng túng khi chọn quà thành trải nghiệm ấm áp và giàu cảm xúc.
Đồ án đã hoàn thành 100% mục tiêu với sản phẩm chạy thực tế 24/7 trên Cloud và ứng dụng Android APK.
Chúng em xin gửi lời cảm ơn chân thành và sâu sắc nhất đến thầy TS. Đỗ Phúc Hảo đã tận tình hướng dẫn, cùng quý Thầy Cô trong Hội đồng đã dành thời gian theo dõi bài báo cáo.
Chúng em xin sẵn sàng lắng nghe những ý kiến đóng góp quý báu và trả lời các câu hỏi từ quý Thầy Cô! Em xin trân trọng cảm ơn!""")

# ==========================================
# SAVE PRESENTATION
# ==========================================
output_dir = r"C:\Users\QuangNguyen\GiftAI\BaoCao_DoAn"
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "Slide_ThuyetTrinh_GiftAI.pptx")

prs.save(output_path)
print(f"Presentation successfully created at: {output_path}")
print(f"Total slides generated: {len(prs.slides)}")
