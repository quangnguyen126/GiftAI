import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image

# Initialize Presentation with 16:9 Widescreen
prs = Presentation()
prs.slide_width = Inches(13.333333)
prs.slide_height = Inches(7.5)

blank_layout = prs.slide_layouts[6]

# --- REFINED COLOR PALETTE ---
C_DARK_BG = RGBColor(11, 15, 25)            # #0B0F19 Deep navy slate
C_DARK_CARD = RGBColor(22, 30, 49)          # #161E31 Dark Slate Card
C_DARK_CARD_BORDER = RGBColor(51, 65, 85)   # #334155
C_LIGHT_BG = RGBColor(248, 250, 252)        # #F8FAFC Clean soft white
C_WHITE = RGBColor(255, 255, 255)           # Pure White
C_BORDER = RGBColor(203, 213, 225)          # #CBD5E1 Clearer border
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
    # Top Category Badge / Tag (LARGER & CLEARER)
    tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.35), Inches(11.733), Inches(0.35))
    tf_tag = tag_box.text_frame
    tf_tag.word_wrap = True
    tf_tag.margin_left = tf_tag.margin_top = tf_tag.margin_right = tf_tag.margin_bottom = 0
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = category_tag.upper()
    p_tag.font.name = "Segoe UI"
    p_tag.font.size = Pt(11)
    p_tag.font.bold = True
    p_tag.font.color.rgb = C_ACCENT_PINK if is_dark else C_PRIMARY
    
    # Title Textbox (ENLARGED to 23-25pt)
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.68), Inches(11.733), Inches(0.95))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.name = "Segoe UI"
    p_title.font.size = Pt(24)
    p_title.font.bold = True
    p_title.font.color.rgb = C_TEXT_LIGHT if is_dark else C_TEXT_DARK
    
    if subtitle_text:
        p_sub = tf_title.add_paragraph()
        p_sub.text = subtitle_text
        p_sub.font.name = "Segoe UI"
        p_sub.font.size = Pt(13)
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
    p.font.size = Pt(9.5)
    p.font.color.rgb = C_TEXT_LIGHT_MUTED if is_dark else C_TEXT_MUTED
    
    p2 = tf.add_paragraph()
    p2.text = f"{current_idx} / {TOTAL_SLIDES}"
    p2.alignment = PP_ALIGN.RIGHT
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(10)
    p2.font.bold = True
    p2.font.color.rgb = C_ACCENT_PINK if is_dark else C_PRIMARY

def add_card(slide, left, top, width, height, bg_color=C_WHITE, border_color=C_BORDER):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    if border_color:
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)
    else:
        card.line.fill.background()
    return card

def add_image_box(slide, image_path, left, top, max_width, max_height, caption=None):
    if not os.path.exists(image_path):
        return None
    im = Image.open(image_path)
    im_w, im_h = im.size
    aspect = im_w / im_h
    
    # Fit into box while maintaining aspect ratio
    target_w = max_width
    target_h = target_w / aspect
    if target_h > max_height:
        target_h = max_height
        target_w = target_h * aspect
        
    pos_x = left + (max_width - target_w) / 2
    pos_y = top + (max_height - target_h) / 2
    
    pic = slide.shapes.add_picture(image_path, pos_x, pos_y, width=target_w, height=target_h)
    
    if caption:
        cap_box = slide.shapes.add_textbox(left, pos_y + target_h + Inches(0.05), max_width, Inches(0.3))
        tf = cap_box.text_frame
        tf.word_wrap = True
        tf.margin_top = tf.margin_bottom = tf.margin_left = tf.margin_right = 0
        p = tf.paragraphs[0]
        p.text = caption
        p.alignment = PP_ALIGN.CENTER
        p.font.name = "Segoe UI"
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_MUTED
    return pic

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
    p0.font.size = Pt(12)
    p0.font.bold = True
    p0.font.color.rgb = C_PRIMARY
    
    p1 = tf.add_paragraph()
    p1.text = title
    p1.alignment = PP_ALIGN.CENTER
    p1.font.name = "Segoe UI"
    p1.font.size = Pt(14)
    p1.font.bold = True
    p1.font.color.rgb = C_TEXT_DARK
    p1.space_before = Pt(4)
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.alignment = PP_ALIGN.CENTER
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(4)
    return box

def set_speaker_notes(slide, notes_content):
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = notes_content

# ==============================================================================
# SLIDE 1: TRANG BÌA (DARK THEME - ENLARGED)
# ==============================================================================
s1 = prs.slides.add_slide(blank_layout)
add_base_background(s1, is_dark=True)

t1_box = s1.shapes.add_textbox(Inches(1.0), Inches(0.7), Inches(11.333), Inches(0.5))
tf = t1_box.text_frame
p = tf.paragraphs[0]
p.text = "TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG • KHOA CÔNG NGHỆ THÔNG TIN"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = C_TEXT_LIGHT_MUTED

t1_tag = s1.shapes.add_textbox(Inches(1.0), Inches(1.3), Inches(11.333), Inches(0.4))
tf = t1_tag.text_frame
p = tf.paragraphs[0]
p.text = "BÁO CÁO ĐỒ ÁN HỌC PHẦN TRÍ TUỆ NHÂN TẠO"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

t1_main = s1.shapes.add_textbox(Inches(1.0), Inches(1.8), Inches(11.333), Inches(1.8))
tf = t1_main.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = "XÂY DỰNG HỆ THỐNG TÌM QUÀ TẶNG\nCHO NGƯỜI THÂN YÊU (GIFTAI)"
p.font.name = "Segoe UI"
p.font.size = Pt(34)
p.font.bold = True
p.font.color.rgb = C_TEXT_LIGHT

p_sub = tf.add_paragraph()
p_sub.text = "Nền tảng tư vấn quà tặng ứng dụng Mô hình Ngôn ngữ Lớn (LLM) & Dữ liệu Thương mại Điện tử thực tế"
p_sub.font.name = "Segoe UI"
p_sub.font.size = Pt(15)
p_sub.font.color.rgb = C_TEXT_LIGHT_MUTED
p_sub.space_before = Pt(8)

# Cards for Authors and Supervisor
c1 = add_card(s1, Inches(1.0), Inches(4.3), Inches(5.4), Inches(2.2), bg_color=C_DARK_CARD, border_color=C_DARK_CARD_BORDER)
tf_c1 = c1.text_frame
tf_c1.word_wrap = True
tf_c1.margin_left = Inches(0.3)
tf_c1.margin_top = Inches(0.2)
p = tf_c1.paragraphs[0]
p.text = "👨‍💻 SINH VIÊN THỰC HIỆN"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
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
    p_item.font.size = Pt(12)
    p_item.font.color.rgb = C_TEXT_LIGHT
    p_item.space_before = Pt(4)

c2 = add_card(s1, Inches(6.9), Inches(4.3), Inches(5.4), Inches(2.2), bg_color=C_DARK_CARD, border_color=C_DARK_CARD_BORDER)
tf_c2 = c2.text_frame
tf_c2.word_wrap = True
tf_c2.margin_left = Inches(0.3)
tf_c2.margin_top = Inches(0.2)
p = tf_c2.paragraphs[0]
p.text = "🎓 GIẢNG VIÊN HƯỚNG DẪN"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
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
    p_item.font.size = Pt(12)
    p_item.font.color.rgb = C_TEXT_LIGHT
    p_item.space_before = Pt(4)

add_footer(s1, 1, is_dark=True)
set_speaker_notes(s1, """[Thời lượng: 40 giây]
Kính thưa Thầy TS. Đỗ Phúc Hảo cùng quý Thầy Cô trong Hội đồng chấm đồ án tốt nghiệp.
Hôm nay, nhóm sinh viên lớp 23CT2 gồm hai thành viên: Nguyễn Thiện Quân và Nguyễn Việt Quang, xin phép được báo cáo đồ án học phần Trí tuệ Nhân tạo:
"Hệ thống gợi ý quà tặng thông minh ứng dụng AI - GiftAI".
Đề tài ra đời nhằm giải quyết bài toán nan giải trong đời sống: làm sao chọn được món quà chuẩn gu, đúng tâm lý và sát ngân sách cho từng đối tượng trong vô vàn dịp đặc biệt, bằng cách kết hợp sức mạnh suy luận của LLM cùng kho dữ liệu thực tế hơn 2.390 sản phẩm. Sau đây em xin bắt đầu phần trình bày.""")

# ==============================================================================
# SLIDE 2: ĐẶT VẤN ĐỀ (CHƯƠNG I - FONT TO, DỄ NHÌN)
# ==============================================================================
s2 = prs.slides.add_slide(blank_layout)
add_base_background(s2)
add_header(s2, "Chương I: Mở Đầu", "Bối Cảnh Thực Tiễn & 3 Thách Thức Khi Chọn Quà", "Tại sao các công cụ tìm kiếm và sàn TMĐT hiện nay chưa thể giải quyết trọn vẹn bài toán tặng quà?")

col_w = Inches(3.64)
col_gap = Inches(0.4)

challenges = [
    ("1. Quá Tải Thông Tin TMĐT", [
        ("Hàng triệu sản phẩm:", "Tiki, Shopee, Lazada cung cấp lượng hàng hóa khổng lồ nhưng khó chọn lọc."),
        ("Tìm kiếm cơ học:", "Chỉ so khớp từ khóa chính xác (Lexical Matching), vô cảm với ngữ cảnh."),
        ("Nhiễu loạn rác & SEO:", "Người bán cố tình nhồi nhét phụ kiện, ốp lưng vào tên sản phẩm.")
    ], C_PRIMARY),
    
    ("2. Nghịch Lý Mua ≠ Thụ Hưởng", [
        ("Buyer vs Consumer Gap:", "Người mua là bạn, nhưng người dùng là người thân có gu hoàn toàn khác."),
        ("Lịch sử duyệt web vô hiệu:", "Thuật toán gợi ý truyền thống (Collaborative Filtering) bị tê liệt."),
        ("Bài toán Cold-Start:", "Không có vector hành vi nào trong quá khứ của người nhận.")
    ], C_ACCENT_PINK),
    
    ("3. Đa Ràng Buộc Phức Tạp", [
        ("Đa dạng đối tượng & dịp:", "Từ Bố Mẹ, Anh Chị Em, Người yêu, Người yêu cũ đến Sếp, Thầy cô, Trẻ em vào hàng chục dịp lễ khác nhau."),
        ("Áp lực tâm lý:", "Mất hàng giờ lướt web vô định nhưng vẫn lo sợ món quà bị 'lệch gu' hoặc gây khó xử."),
        ("Thiếu tính giải thích:", "Người mua cần lý do tâm lý thuyết phục vì sao món quà này thực sự phù hợp.")
    ], C_BLUE)
]

for i, (title, items, border_c) in enumerate(challenges):
    x = Inches(0.8) + i * (col_w + col_gap)
    card = add_card(s2, x, Inches(1.8), col_w, Inches(4.9), bg_color=C_WHITE, border_color=border_c)
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.25)
    tf.margin_top = Inches(0.25)
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = border_c
    
    for lead, detail in items:
        p_item = tf.add_paragraph()
        p_item.text = f"• {lead} "
        p_item.font.name = "Segoe UI"
        p_item.font.size = Pt(12.5)
        p_item.font.bold = True
        p_item.font.color.rgb = C_TEXT_DARK
        p_item.space_before = Pt(10)
        
        # Append detail
        run = p_item.add_run()
        run.text = detail
        run.font.bold = False
        run.font.color.rgb = C_TEXT_MUTED

add_footer(s2, 2)
set_speaker_notes(s2, """[Thời lượng: 45 giây]
Thưa Thầy Cô, khi chọn quà, người tiêu dùng hiện đại đối mặt với 3 thách thức lớn:
Thứ nhất là Quá tải thông tin: Các sàn TMĐT có hàng triệu món hàng nhưng công cụ tìm kiếm chỉ so khớp từ khóa cơ học, hoàn toàn vô cảm với cảm xúc và ngữ cảnh.
Thứ hai là Nghịch lý người mua không phải người thụ hưởng: Người tặng mua cho bố mẹ, bạn bè hay người yêu - những người có gu khác biệt, khiến lịch sử mua sắm cá nhân bị vô hiệu hóa, thuật toán truyền thống bị tê liệt trước bài toán Cold-Start.
Thứ ba là Đa ràng buộc phức tạp: Phải dung hòa cùng lúc Đối tượng (Bố, Mẹ, Anh Chị Em, Người yêu, hay cả Người yêu cũ), Dịp tặng, Ngân sách và Sở thích. Đó chính là lý do GiftAI ra đời.""")

# ==============================================================================
# SLIDE 3: MỤC TIÊU & GIẢI PHÁP (CHƯƠNG I - FONT TO)
# ==============================================================================
s3 = prs.slides.add_slide(blank_layout)
add_base_background(s3)
add_header(s3, "Chương I: Mở Đầu", "Mục Tiêu Đề Tài & Định Hướng Giải Pháp GiftAI", "Kết hợp năng lực suy luận của Mô hình Ngôn ngữ Lớn với kho sản phẩm thực tế từ sàn TMĐT")

c3_left = add_card(s3, Inches(0.8), Inches(1.8), Inches(5.3), Inches(4.9), bg_color=C_PRIMARY_LIGHT, border_color=C_PRIMARY)
tf = c3_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.25)

p = tf.paragraphs[0]
p.text = "🎯 MỤC TIÊU TỔNG QUÁT"
p.font.name = "Segoe UI"
p.font.size = Pt(16)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

p = tf.add_paragraph()
p.text = "Xây dựng hoàn chỉnh hệ sinh thái Trí tuệ Nhân tạo đa nền tảng (Web SPA & Android Native) mang tên GiftAI."
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.color.rgb = C_TEXT_DARK
p.space_before = Pt(8)

p = tf.add_paragraph()
p.text = "💡 TRIẾT LÝ GIẢI PHÁP HYBRID"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY
p.space_before = Pt(16)

hybrids = [
    ("Suy luận Zero-shot:", "Dùng LLM (Google Gemini 3.8 Flash) hiểu sâu tâm lý người nhận mà không cần lịch sử duyệt web cũ."),
    ("Dữ liệu thực tế 100%:", "Khớp trực tiếp với kho 2.390+ sản phẩm TiDB Cloud, triệt tiêu ảo giác (Hallucination) link hỏng."),
    ("AI Giải thích được (XAI):", "Mỗi món quà đều có lời giải thích tâm lý thuyết phục, gia tăng độ tin cậy.")
]
for h_title, h_desc in hybrids:
    p = tf.add_paragraph()
    p.text = f"• {h_title} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    run = p.add_run()
    run.text = h_desc
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

c3_right = add_card(s3, Inches(6.4), Inches(1.8), Inches(6.133), Inches(4.9), bg_color=C_WHITE, border_color=C_BORDER)
tf = c3_right.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.25)

p = tf.paragraphs[0]
p.text = "🚀 6 MỤC TIÊU KỸ THUẬT CỐT LÕI"
p.font.name = "Segoe UI"
p.font.size = Pt(16)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

goals = [
    ("1. Trích xuất ý định:", "Phân rã mô tả tự do thành cấu trúc JSON chuẩn gồm từ khóa và ý tưởng quà."),
    ("2. Kho sản phẩm thực tế:", "Quản lý 2.390+ sản phẩm trên TiDB Cloud Serverless (AWS Singapore, SSL)."),
    ("3. Tái xếp hạng ngữ nghĩa:", "Dùng LLM lọc rác/phụ kiện, đạt độ chính xác quà tặng 94.2%."),
    ("4. Điều phối AI chịu lỗi cao:", "Cache RAM < 10ms, Modulo Multi-Key xoay vòng 4 khóa, Groq Fallback."),
    ("5. Tiện ích giàu cảm xúc:", "Sinh thiệp chúc mừng AI và Hộp quà kỷ niệm ảo đếm ngày (Memory Box)."),
    ("6. Triển khai đa nền tảng:", "Web SPA trên Vercel Edge, Backend trên Render và ứng dụng Android APK.")
]
for g_title, g_desc in goals:
    p = tf.add_paragraph()
    p.text = f"• {g_title} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(7)
    run = p.add_run()
    run.text = g_desc
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

add_footer(s3, 3)
set_speaker_notes(s3, """[Thời lượng: 45 giây]
Để giải quyết triệt để 3 thách thức trên, GiftAI được xây dựng theo Triết lý Hybrid độc đáo:
Chúng em không để AI tự 'bịa' ra sản phẩm vì dễ gặp ảo giác Hallucination tạo link hỏng. Thay vào đó, AI đóng vai trò 'Bộ não tư vấn tâm lý' và 'Màng lọc ngữ nghĩa' cho kho sản phẩm thật.
Đồ án xác định 6 mục tiêu kỹ thuật rõ ràng: Trích xuất ý định người dùng; Quản trị kho 2.390+ sản phẩm thật trên TiDB Cloud; Tái xếp hạng đạt độ chính xác 94.2%; Vận hành chịu lỗi 4 tầng; Cung cấp tiện ích thiệp AI & Hộp kỷ niệm ảo; và Đóng gói triển khai đa nền tảng Web & Android Native.""")

# ==============================================================================
# SLIDE 4: KIẾN TRÚC PHÂN TẦNG CLOUD (CHÈN HÌNH DIAGRAM 1)
# ==============================================================================
s4 = prs.slides.add_slide(blank_layout)
add_base_background(s4)
add_header(s4, "Chương III: Thiết Kế Hệ Thống", "Kiến Trúc Phân Tầng Tổng Thể Trên Môi Trường Cloud", "Mô hình kiến trúc phân tán 4 tầng đảm bảo tính sẵn sàng cao, bảo mật và mở rộng độc lập")

# Left text card (Font size 12-13pt)
c4_left = add_card(s4, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c4_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🏗️ ĐẶC TẢ 4 TẦNG TRÁCH NHIỆM"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

tiers = [
    ("1. Tầng Giao Diện (Presentation):", "Web SPA React 19 trên Vercel Edge và ứng dụng di động Android Native WebView container."),
    ("2. Tầng Điều Phối (Application):", "Node.js Express trên Render Cloud, quản lý JWT, Connection Pool 10 luồng, In-Memory RAM Cache."),
    ("3. Tầng AI & Crawler (Intelligence):", "Google Gemini 3.8 Flash, Groq LPU (Llama 3) Fallback, Selenium + Cheerio cào tự động."),
    ("4. Tầng Dữ Liệu (Data Tier):", "TiDB Cloud Serverless (MySQL 8.0) tại AWS Singapore, kết nối SSL/TLSv1.2 (Port 4000).")
]
for t_title, t_desc in tiers:
    p = tf.add_paragraph()
    p.text = t_title
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = t_desc
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

# Right: Insert generated architecture diagram!
add_image_box(s4, "scratch/assets/diagram_architecture.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 3.1: Kiến trúc phân tầng tổng thể hệ thống GiftAI")

add_footer(s4, 4)
set_speaker_notes(s4, """[Thời lượng: 40 giây]
Về mặt kiến trúc, GiftAI được thiết kế theo mô hình 4 tầng phân tán hoàn toàn trên nền tảng Cloud-native:
Tầng 1 - Presentation: Web React 19 chạy trên Vercel Edge và ứng dụng Android gốc đóng gói file APK.
Tầng 2 - Application: Máy chủ Node.js Express trên Render, xử lý định tuyến RESTful, xác thực JWT và bộ đệm In-Memory Semantic Cache.
Tầng 3 - AI Engine: Tích hợp Google Gemini 3.8 Flash làm bộ não chính, kết hợp Groq LPU dự phòng tức thời và module cào dữ liệu tự động.
Tầng 4 - Data Tier: CSDL phân tán TiDB Cloud tại Singapore kết nối qua cổng bảo mật SSL/TLSv1.2, đảm bảo toàn vẹn dữ liệu và độ trễ thấp.""")

# ==============================================================================
# SLIDE 5: NGĂN XẾP CÔNG NGHỆ (CHƯƠNG II & V - FONT TO, RÕ RÀNG)
# ==============================================================================
s5 = prs.slides.add_slide(blank_layout)
add_base_background(s5)
add_header(s5, "Chương II & V: Công Nghệ & Triển Khai", "Ngăn Xếp Công Nghệ Cốt Lõi (Full Tech Stack)", "Sự kết hợp giữa các công nghệ hiện đại nhất đảm bảo tốc độ, bảo mật và trải nghiệm mượt mà")

w_grid = Inches(3.64)
h_grid = Inches(2.3)
gap_x = Inches(0.4)
gap_y = Inches(0.25)

tech_blocks = [
    ("🌐 Frontend Web (Client)", [
        "React 19.x & TypeScript 5.x",
        "Vite 6.x (Bundler siêu tốc)",
        "Tailwind CSS & Lucide Icons",
        "Triển khai mạng biên Vercel Edge"
    ], C_BLUE_LIGHT, C_BLUE),
    
    ("📱 Ứng Dụng Di Động (Mobile)", [
        "Android Studio (Java 17 LTS)",
        "Android SDK 34 (Android 14)",
        "Native WebView Chromium Container",
        "Đóng gói tệp GiftAI_v1.0.apk"
    ], C_PRIMARY_LIGHT, C_PRIMARY),
    
    ("⚙️ Máy Chủ Backend API", [
        "Node.js v20 LTS & Express 4.19",
        "mysql2 Connection Pool (10 luồng)",
        "Bảo mật bcrypt (10 rounds) & JWT",
        "Triển khai đám mây trên Render"
    ], C_EMERALD_LIGHT, C_EMERALD),
    
    ("🗄️ CSDL Phân Tán TiDB Cloud", [
        "TiDB Cloud Serverless (MySQL 8.0)",
        "Cụm máy chủ AWS Singapore",
        "Mã hóa SSL/TLSv1.2 (Port 4000)",
        "Truy vấn cache siêu tốc 5 - 10ms"
    ], C_AMBER_LIGHT, C_AMBER),
    
    ("🧠 Trí Tuệ Nhân Tạo (AI)", [
        "Google GenAI SDK (Gemini 3.8 Flash)",
        "Groq LPU SDK: Llama 3 (Fallback)",
        "Kỹ nghệ Prompt hai pha (XAI)",
        "Xoay vòng đa khóa Modulo Dispatcher"
    ], C_PRIMARY_LIGHT, C_PRIMARY),
    
    ("🕷️ Tự Động Thu Thập Dữ Liệu", [
        "Selenium WebDriver (Headless Chrome)",
        "Cheerio v1.0 bóc tách DOM tốc độ cao",
        "Cào dữ liệu thực tế Tiki, Shopee, Lazada",
        "Quản lý kho hơn 2.390+ sản phẩm"
    ], C_BLUE_LIGHT, C_BLUE)
]

for i, (title, items, bg_col, border_col) in enumerate(tech_blocks):
    row = i // 3
    col = i % 3
    x = Inches(0.8) + col * (w_grid + gap_x)
    y = Inches(1.8) + row * (h_grid + gap_y)
    
    card = add_card(s5, x, y, w_grid, h_grid, bg_color=bg_col, border_color=border_col)
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.25)
    tf.margin_top = Inches(0.2)
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = border_col
    
    for item in items:
        p2 = tf.add_paragraph()
        p2.text = f"• {item}"
        p2.font.name = "Segoe UI"
        p2.font.size = Pt(11)
        p2.font.color.rgb = C_TEXT_DARK
        p2.space_before = Pt(3)

add_footer(s5, 5)
set_speaker_notes(s5, """[Thời lượng: 40 giây]
Toàn bộ ngăn xếp công nghệ được chọn lọc khắt khe:
Ở Frontend, nhóm ứng dụng React 19, TypeScript và Vite, tối ưu tốc độ tải trang dưới 0.8 giây; phía Mobile là container Android Native WebView chuẩn Edge-to-Edge.
Ở Backend, Node.js kết hợp TiDB Cloud Serverless tương thích MySQL 8.0 qua connection pool 10 luồng.
Đặc biệt ở tầng AI, nhóm kết hợp Google Gemini 3.8 Flash cùng Groq LPU siêu tốc (200+ token/giây) và bộ cào dữ liệu tự động Selenium thu thập hơn 2.390 sản phẩm thực tế từ Tiki, Shopee và Lazada.""")

# ==============================================================================
# SLIDE 6: THIẾT KẾ CSDL PHÂN TÁN (CHÈN HÌNH DIAGRAM 2 - ERD)
# ==============================================================================
s6 = prs.slides.add_slide(blank_layout)
add_base_background(s6)
add_header(s6, "Chương III: Thiết Kế Hệ Thống", "Thiết Kế Cơ Sở Dữ Liệu Phân Tán (TiDB Cloud Schema)", "Chuẩn hóa 3NF kết hợp trường JSON linh hoạt tối ưu hóa tốc độ truy vấn và toàn vẹn dữ liệu")

c6_left = add_card(s6, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c6_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "📊 6 BẢNG CSDL CỐT LÕI (CHUẨN 3NF)"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

tables = [
    ("scraped_products (16 cột):", "Kho 2.390+ món quà; khóa UNIQUE product_key hash URL chống trùng lặp; index search_keyword."),
    ("users (8 cột):", "Mật khẩu băm an toàn bcrypt (10 rounds); phân quyền 'user' và 'admin'; index email truy vấn < 5ms."),
    ("search_history (16 cột):", "Lưu vết mọi phiên tìm kiếm; lưu products_snapshot dạng JSON bảo toàn giá thực tế tại thời điểm tìm."),
    ("product_recommendation_stats:", "Thống kê lượt hiển thị và clicks để tính tỷ lệ CTR theo thời gian thực."),
    ("user_favorites (9 cột):", "Danh mục món quà yêu thích cá nhân của người dùng đã đăng nhập."),
    ("memory_boxes (19 cột):", "Hộp kỷ niệm ảo; mã chia sẻ độc bản MEM-XXXXXX (UNIQUE); mốc thời gian đếm xuôi/ngược.")
]
for t_title, t_desc in tables:
    p = tf.add_paragraph()
    p.text = f"• {t_title} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(5)
    run = p.add_run()
    run.text = t_desc
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

# Right: Insert generated ERD diagram!
add_image_box(s6, "scratch/assets/diagram_erd.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 3.2: Lược đồ quan hệ thực thể (ERD) 6 bảng CSDL")

add_footer(s6, 6)
set_speaker_notes(s6, """[Thời lượng: 45 giây]
Cơ sở dữ liệu của GiftAI gồm 6 bảng chính đạt chuẩn 3NF trên TiDB Cloud:
Bảng scraped_products lưu hơn 2.390 sản phẩm với khóa UNIQUE hash URL chống trùng lặp, đánh index đa chiều theo category và search_keyword.
Bảng users bảo mật mật khẩu với thuật toán bcrypt 10 vòng, phân quyền user và admin rõ ràng.
Bảng search_history lưu vết phiên tìm kiếm kèm snapshot JSON, giúp người dùng xem lại mà không cần JOIN bảng nặng nề.
Cùng các bảng stats đo lường CTR, favorites lưu quà yêu thích, và memory_boxes quản lý hộp kỷ niệm ảo với mã chia sẻ độc bản MEM-XXXXXX.""")

# ==========================================
# SLIDE 7: MÔ HÌNH HÓA CA SỬ DỤNG (CHƯƠNG III - FONT TO)
# ==========================================
s7 = prs.slides.add_slide(blank_layout)
add_base_background(s7)
add_header(s7, "Chương III: Thiết Kế Hệ Thống", "Mô Hình Hóa 10 Ca Sử Dụng Trọng Tâm (Use Cases)", "Phân định rõ ràng trách nhiệm giữa Phân hệ Người dùng cuối và Phân hệ Quản trị viên")

c7_left = add_card(s7, Inches(0.8), Inches(1.8), Inches(5.8), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c7_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "👤 PHÂN HỆ NGƯỜI DÙNG CUỐI (8 USE CASES)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

user_ucs = [
    ("UC-01: Gợi ý quà thông minh:", "Khảo sát ngữ cảnh, phân rã ý định qua Gemini và tái xếp hạng sản phẩm kèm lời giải thích tâm lý."),
    ("UC-02: Sinh thiệp mừng AI:", "Sáng tác lời chúc tự động theo nhiều tông giọng (Chân thành, Hài hước, Lãng mạn, Thơ lục bát) trong 1.5s."),
    ("UC-03 & 04: Tạo & Mở Hộp kỷ niệm:", "Đóng gói tâm thư, quà đính kèm, đếm ngày yêu và chia sẻ qua mã MEM-XXXXXX mở quà kèm pháo hoa."),
    ("UC-05: Quản lý Quà yêu thích:", "Thả tim lưu trữ các món quà ưng ý vào bộ sưu tập cá nhân (xác thực JWT)."),
    ("UC-06: Lịch sử tìm kiếm:", "Xem lại các phiên tư vấn trong quá khứ tức thì qua dữ liệu snapshot JSON."),
    ("UC-07 & 08: Đăng ký & Đăng nhập:", "Xác thực an toàn, băm bcrypt và cấp mã JWT bảo vệ các API.")
]
for uc_t, uc_d in user_ucs:
    p = tf.add_paragraph()
    p.text = f"• {uc_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(5)
    run = p.add_run()
    run.text = uc_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

# Right Column (Admin + Placeholder)
c7_right = add_card(s7, Inches(6.8), Inches(1.8), Inches(5.733), Inches(2.2), bg_color=C_WHITE, border_color=C_ACCENT_PINK)
tf_adm = c7_right.text_frame
tf_adm.word_wrap = True
tf_adm.margin_left = tf_adm.margin_right = Inches(0.25)
tf_adm.margin_top = Inches(0.2)
p = tf_adm.paragraphs[0]
p.text = "🛡️ PHÂN HỆ QUẢN TRỊ VIÊN (2 USE CASES)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

admin_ucs = [
    ("UC-09: Thống kê click & Phân tích CTR:", "Đo lường biến đếm clicks, tính tỷ lệ CTR = Clicks / Impressions theo danh mục để nhận diện xu hướng."),
    ("UC-10: Giám sát sản phẩm & Quản trị API:", "Theo dõi kho 2.390+ sản phẩm, giám sát trạng thái 4 khóa API Gemini (lỗi 429) và nhật ký kích hoạt Groq Fallback.")
]
for uc_t, uc_d in admin_ucs:
    p = tf_adm.add_paragraph()
    p.text = f"• {uc_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(4)
    run = p.add_run()
    run.text = uc_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

add_placeholder(
    s7, Inches(6.8), Inches(4.2), Inches(5.733), Inches(2.5),
    "Hình 3.3 & 3.4: Sơ đồ Ca sử dụng Phân hệ Người dùng & Quản trị",
    "Biểu đồ Use Case Diagram chuẩn UML thể hiện mối quan hệ giữa Khách vãng lai, Thành viên và Quản trị viên (Admin).",
    tag="BIỂU ĐỒ CA SỬ DỤNG UML"
)

add_footer(s7, 7)
set_speaker_notes(s7, """[Thời lượng: 40 giây]
Hệ thống được quy chuẩn thành 10 ca sử dụng trọng tâm:
8 ca sử dụng phía Người dùng: Tìm kiếm quà tặng đa tiêu chí mở tự do cho khách vãng lai; khi người dùng muốn lưu quà yêu thích, xem lại lịch sử cá nhân hay tạo hộp kỷ niệm thì hệ thống kích hoạt xác thực JWT an toàn.
2 ca sử dụng phía Quản trị viên: Bảng điều khiển Admin Dashboard trực quan theo dõi số lượt tìm kiếm, biểu đồ tỷ lệ nhấp chuột CTR thời gian thực và giám sát trạng thái kho sản phẩm.""")

# ==============================================================================
# SLIDE 8: QUY TRÌNH PROMPT 2 PHA (CHÈN HÌNH DIAGRAM 3)
# ==============================================================================
s8 = prs.slides.add_slide(blank_layout)
add_base_background(s8)
add_header(s8, "Chương IV: Đặc Thù & Giải Pháp AI", "Quy Trình Prompt Engineering Hai Pha (Two-Phase)", "Phân tách rành mạch giữa tư duy tâm lý học và thẩm định ngữ nghĩa sản phẩm thực tế")

c8_left = add_card(s8, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c8_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "⚙️ BẢN CHẤT 2 PHA XỬ LÝ LÕI"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

phases = [
    ("Pha 1: Phân Rã Ý Định (Intent Parsing):", "• Input: Vector ngữ cảnh 7 chiều (Quan hệ, Tuổi, Dịp, Sở thích, Ngân sách).\n• Gemini 3.8 Flash phân tích tâm lý người nhận.\n• Output: JSON chuẩn gồm từ khóa tìm kiếm TMĐT tinh gọn và các nhóm quà tiềm năng."),
    ("Cầu Nối Dữ Liệu (TiDB Cloud):", "• Backend dùng từ khóa từ Pha 1 để query kho 2.390+ sản phẩm thật (hoặc cào bù nếu thiếu), tạo tập ứng viên D = {p1, p2, ..., pN}."),
    ("Pha 2: Tái Xếp Hạng & Lý Giải (XAI):", "• Đưa tập ứng viên thô vào lại Gemini 3.8 Flash.\n• Loại bỏ 100% linh kiện/phụ kiện lệch tông.\n• Chấm điểm phù hợp và viết lý do tâm lý cho Top-K.")
]
for p_title, p_desc in phases:
    p = tf.add_paragraph()
    p.text = p_title
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = p_desc
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

# Right: Insert generated prompt 2-phase diagram!
add_image_box(s8, "scratch/assets/diagram_prompt_2phase.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 4.1: Quy trình Prompt Engineering hai pha kết hợp dữ liệu thực tế")

add_footer(s8, 8)
set_speaker_notes(s8, """[Thời lượng: 45 giây]
Trọng tâm giải pháp AI của GiftAI là Quy trình Prompt Engineering hai pha (Two-Phase):
Pha 1 - Intent Extraction: AI tiếp nhận hồ sơ người nhận, phân tích tâm lý sâu sắc và bóc tách thành từ khóa tìm kiếm mục tiêu. Điểm đặc biệt là AI hiểu rõ từng đối tượng: với Bố Mẹ sẽ ưu tiên sức khỏe, với Em trai sẽ ưu tiên gaming/lego, và với Người yêu cũ sẽ ưu tiên quà chữa lành/tinh tế, tuyệt đối cấm quà lãng mạn.
Cầu nối dữ liệu: Backend dùng từ khóa của Pha 1 query kho 2.390+ sản phẩm thật từ TiDB Cloud.
Pha 2 - Semantic Re-ranking: AI duyệt qua danh sách ứng viên, loại bỏ hoàn toàn hàng rác/phụ kiện và sinh lời giải thích vì sao món quà này đáng mua.""")

# ==============================================================================
# SLIDE 9: KIẾN TRÚC AI 4 TẦNG (CHÈN HÌNH DIAGRAM 4)
# ==============================================================================
s9 = prs.slides.add_slide(blank_layout)
add_base_background(s9)
add_header(s9, "Chương IV: Đặc Thù & Giải Pháp AI", "Kiến Trúc Vận Hành 4 Tầng Của AI Engine (Chịu Lỗi Cao)", "Đảm bảo hệ thống vận hành bền bỉ 24/7, không gián đoạn dịch vụ trước giới hạn Rate Limit")

c9_left = add_card(s9, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c9_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🛡️ 4 PHÒNG TUYẾN CHỊU LỖI ĐA TẦNG"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

four_tiers = [
    ("Tầng 1: Bộ Đệm RAM Semantic Cache", "Cấu trúc Map() lưu trong RAM Node.js, ánh xạ MD5(Context). TTL 30 phút, FIFO eviction. Phản hồi tức thì < 10ms (O(1))."),
    ("Tầng 2: Multi-Key Rotation Dispatcher", "Thuật toán Modulo xoay vòng 4 khóa API Google Gemini: Index = (Index + 1) % 4. Tăng tải từ 15 lên 60 req/phút."),
    ("Tầng 3: LLM Inference & Retry Backoff", "Gọi Gemini 3.8 Flash. Áp dụng Exponential Backoff + Jitter khi gặp sự cố gián đoạn mạng tạm thời."),
    ("Tầng 4: Cascading Fallback Cascade", "Khi cụm khóa Gemini cạn hạn ngạch (HTTP 429), tự động chuyển mạch sang Groq LPU (Llama 3 siêu tốc 1.8s) hoặc OpenAI.")
]
for t_name, t_body in four_tiers:
    p = tf.add_paragraph()
    p.text = f"• {t_name}: "
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    run = p.add_run()
    run.text = t_body
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

# Right: Insert generated 4-tier diagram!
add_image_box(s9, "scratch/assets/diagram_4tier_ai.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 4.2 & 4.4: Kiến trúc 4 tầng AI Engine và cơ chế Fallback")

add_footer(s9, 9)
set_speaker_notes(s9, """[Thời lượng: 45 giây]
Để giải quyết bài toán nghẽn hạn mức API miễn phí (Rate Limit 429), nhóm đã xây dựng kiến trúc AI Engine 4 tầng chịu lỗi cao:
Tầng 1 - Semantic Memory Cache: Lưu phản hồi trong RAM với thời gian sống TTL 30 phút, phản hồi tức thì dưới 10 mili-giây cho các truy vấn lặp lại.
Tầng 2 - Multi-Key Rotation: Tự động xoay vòng danh sách API key theo thuật toán Modulo, nhân gấp 4 lần hạn mức xử lý.
Tầng 3 - Multi-AI Fallback: Tự động chuyển mạch sang Groq LPU (Llama 3.3) hoặc OpenRouter nếu toàn bộ key Gemini chạm ngưỡng quá tải.
Tầng 4 - Rule-based Fallback: Cơ chế dự phòng bằng thuật toán luật cứng, đảm bảo hệ thống không bao giờ trả về trang trắng.""")

# ==========================================
# SLIDE 10: TÍNH GIẢI THÍCH ĐƯỢC (CHƯƠNG IV - FONT TO)
# ==========================================
s10 = prs.slides.add_slide(blank_layout)
add_base_background(s10)
add_header(s10, "Chương IV: Đặc Thù & Giải Pháp AI", "Hiện Thực Hóa Tính Giải Thích Được (Explainable AI - XAI)", "Xóa bỏ rào cản 'hộp đen' để xây dựng niềm tin vững chắc và nâng cao quyết định mua sắm")

w_card10 = Inches(11.733)
h_card10 = Inches(1.45)
gap_card10 = Inches(0.2)

c10_1 = add_card(s10, Inches(0.8), Inches(1.8), w_card10, h_card10, bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c10_1.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.15)
p = tf.paragraphs[0]
p.text = "💡 CẤP ĐỘ 1: GIẢI THÍCH Ý TƯỞNG TÂM LÝ (CONCEPT RATIONALE)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY
p2 = tf.add_paragraph()
p2.text = "Tại Pha 1, AI giải thích tâm lý học hành vi: tại sao nhóm người ở độ tuổi này, với tính cách và mối quan hệ đó lại cần món đồ này.\nVí dụ: 'Đối với bạn bè thân thiết có tính cách hướng nội và đam mê nghệ thuật, một bộ màu vẽ chuyên nghiệp giúp giải tỏa căng thẳng và thể hiện sự tinh tế của người tặng mà không gây áp lực về mặt xã hội.'"
p2.font.name = "Segoe UI"
p2.font.size = Pt(11.5)
p2.font.color.rgb = C_TEXT_DARK
p2.space_before = Pt(4)

c10_2 = add_card(s10, Inches(0.8), Inches(1.8) + h_card10 + gap_card10, w_card10, h_card10, bg_color=C_WHITE, border_color=C_ACCENT_PINK)
tf = c10_2.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.15)
p = tf.paragraphs[0]
p.text = "🏷️ CẤP ĐỘ 2: GIẢI THÍCH SẢN PHẨM THỰC TẾ (CONTEXTUAL BADGE)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK
p2 = tf.add_paragraph()
p2.text = "Tại Pha 2, mỗi thẻ sản phẩm từ sàn TMĐT hiển thị kèm một huy hiệu lý do (Contextual Badge) được đóng khung nổi bật.\nVí dụ: 'Sản phẩm này có giá 320.000đ, nằm trọn vẹn trong ngân sách 500k của bạn, có chứng nhận chính hãng và phù hợp hoàn hảo với sở thích làm bánh của mẹ.'"
p2.font.name = "Segoe UI"
p2.font.size = Pt(11.5)
p2.font.color.rgb = C_TEXT_DARK
p2.space_before = Pt(4)

c10_3 = add_card(s10, Inches(0.8), Inches(1.8) + (h_card10 + gap_card10)*2, w_card10, Inches(1.5), bg_color=C_EMERALD_LIGHT, border_color=C_EMERALD)
tf = c10_3.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.3)
tf.margin_top = Inches(0.15)
p = tf.paragraphs[0]
p.text = "📈 GIÁ TRỊ THỰC TIỄN & TÁC ĐỘNG TỚI NGƯỜI DÙNG"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_EMERALD
p2 = tf.add_paragraph()
p2.text = "• Xóa bỏ hoàn toàn hiện tượng 'Hộp đen' (Black-Box): Người dùng hiểu rõ nguyên nhân sâu xa vì sao món quà được gợi ý.\n• Khảo sát thực tế trên 30 người dùng cho thấy: 86.7% người dùng khẳng định lời giải thích tâm lý của AI là yếu tố quyết định giúp họ an tâm và tự tin bấm vào liên kết mua quà trên sàn TMĐT."
p2.font.name = "Segoe UI"
p2.font.size = Pt(11.5)
p2.font.color.rgb = C_TEXT_DARK
p2.space_before = Pt(4)

add_footer(s10, 10)
set_speaker_notes(s10, """[Thời lượng: 40 giây]
Trong GiftAI, chúng em hiện thực hóa nguyên lý Explainable AI (XAI) ở 2 cấp độ:
Cấp độ vĩ mô: Đoạn tóm tắt tâm lý chung ngay đầu trang, phân tích lý do vì sao người nhận ở độ tuổi và mối quan hệ đó lại cần những nhóm quà tặng này.
Cấp độ vi mô: Mỗi sản phẩm đều được gắn một hộp thoại AI Reasoning Callout màu tím nổi bật, chỉ rõ tại sao món quà này khớp với sở thích và ngân sách.
Khảo sát thực tế cho thấy 86.7% người dùng đánh giá cao tính năng này vì nó mang lại sự an tâm và lý do thuyết phục trước khi quyết định chi tiền.""")

# ==============================================================================
# SLIDE 11: GIAO DIỆN KHẢO SÁT WIZARD (CHÈN ẢNH SCREENSHOT THẬT CỦA WEB APP)
# ==============================================================================
s11 = prs.slides.add_slide(blank_layout)
add_base_background(s11)
add_header(s11, "Chương V: Cài Đặt & Thực Nghiệm", "Giao Diện Khảo Sát Ngữ Cảnh 4 Bước (Survey Wizard)", "Tối ưu hóa theo nguyên lý tối giản nhận thức (Cognitive Ease), tương tác trực quan")

c11_left = add_card(s11, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c11_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "✨ QUY TRÌNH 4 BƯỚC NHẬP LIỆU NHANH"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

steps = [
    ("Bước 1: Hồ Sơ Người Nhận:", "Hỗ trợ toàn diện: Bố, Mẹ, Anh/Chị/Em ruột, Người yêu, Vợ/Chồng, Bạn bè, Sếp, Thầy cô và cả Người yêu cũ (Ex - quà chữa lành/tinh tế)."),
    ("Bước 2: Dịp Lễ Kỷ Niệm:", "Bao quát mọi dịp: Sinh nhật, 20/10, 8/3, Valentine 14/2 & 14/3, Ngày của Mẹ/Cha, 20/11, Noel, Tết, Khai trương, 1/6 & Trung Thu, Hòa giải."),
    ("Bước 3: Sở Thích & Tính Cách:", "Thẻ từ khóa chọn nhanh (Công nghệ, Thú cưng, Nấu ăn, Thể thao, Thời trang) hoặc gõ tự do."),
    ("Bước 4: Ràng Buộc Ngân Sách:", "Thanh trượt kép thông minh (Dual Range Slider) từ 50.000đ đến 20.000.000đ VNĐ."),
    ("Tối Ưu Trải Nghiệm (UX):", "Hoàn thành toàn bộ thông số đầu vào chỉ trong dưới 30 giây mà không cần gõ văn bản dài.")
]
for s_title, s_desc in steps:
    p = tf.add_paragraph()
    p.text = f"• {s_title} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    run = p.add_run()
    run.text = s_desc
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

# Right: Insert REAL screenshot of the live web app!
add_image_box(s11, "scratch/screen1.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 5.1: Giao diện ứng dụng GiftAI chạy thực tế trên Vercel")

add_footer(s11, 11)
set_speaker_notes(s11, """[Thời lượng: 45 giây]
Chuyển sang Chương V về sản phẩm thực tế, hình bên phải là ảnh chụp màn hình ứng dụng Web GiftAI đang chạy trực tiếp trên Vercel:
Giao diện Wizard 4 bước được thiết kế tối giản nhận thức (Cognitive Ease):
Bước 1 hỗ trợ đầy đủ mọi đối tượng: Bố, Mẹ, Anh trai, Em trai, Chị gái, Em gái, Bạn gái, Bạn trai, Vợ, Chồng và cả Người yêu cũ.
Bước 2 bao quát các dịp lễ: từ 20/10, 8/3, Valentine 14/2 & 14/3, Ngày của Mẹ/Cha đến Tết, Giáng sinh, Tốt nghiệp, Khai trương.
Bước 3 là thẻ sở thích chọn nhanh. Bước 4 là thanh chọn ngân sách linh hoạt. Toàn bộ thao tác hoàn thành chỉ trong dưới 30 giây.""")

# ==============================================================================
# SLIDE 12: KẾT QUẢ GỢI Ý & LÝ GIẢI AI (CHƯƠNG V)
# ==============================================================================
s12 = prs.slides.add_slide(blank_layout)
add_base_background(s12)
add_header(s12, "Chương V: Cài Đặt & Thực Nghiệm", "Màn Hình Hiển Thị Gợi Ý Quà & Hộp Thoại Lý Giải AI", "Trực quan hóa danh mục sản phẩm Shopee/Lazada đã qua màng lọc ngữ nghĩa và gán huy hiệu XAI")

c12_left = add_card(s12, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c12_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🎁 THÀNH PHẦN GIAO DIỆN THÔNG MINH"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

ui_features = [
    ("Thẻ Sản Phẩm (Smart Card):", "Hiển thị ảnh đại diện sắc nét từ sàn TMĐT, tên chuẩn hóa, giá bán thực tế kèm nhãn chênh lệch ngân sách."),
    ("Hộp Thoại Lý Giải AI:", "Đóng khung nổi bật với tone màu tím hoàng gia, nêu bật lý do vì sao người nhận sẽ xúc động khi nhận món quà này."),
    ("Biểu Tượng Sàn Xuất Xứ:", "Hiển thị nhãn rõ ràng xuất xứ từ Shopee hay Lazada, tạo sự an tâm và minh bạch về nguồn hàng."),
    ("Nút Mua Hàng Trực Tiếp:", "Nhấp chuột mở tab mới chuyển hướng trực tiếp tới trang sản phẩm chính chủ trên sàn để thanh toán."),
    ("Tương Tác Cá Nhân Hóa:", "Thả tim lưu vào bộ sưu tập yêu thích và nút bấm tạo thiệp chúc mừng đính kèm.")
]
for f_t, f_d in ui_features:
    p = tf.add_paragraph()
    p.text = f"• {f_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    run = p.add_run()
    run.text = f_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

add_placeholder(
    s12, Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9),
    "Hình 5.2: Kết quả gợi ý quà tặng & Hộp lý giải AI\n(Responsive Grid)",
    "Vị trí chèn ảnh chụp màn hình Danh sách sản phẩm gợi ý: Thẻ sản phẩm Shopee/Lazada, Hộp thoại AI Reasoning Callout màu tím và nút mua hàng trực tiếp.",
    tag="GIAO DIỆN KẾT QUẢ GỢI Ý"
)

add_footer(s12, 12)
set_speaker_notes(s12, """[Thời lượng: 40 giây]
Sau khi AI hoàn tất suy luận và tái xếp hạng từ TiDB Cloud, màn hình hiển thị danh sách quà tặng trực quan:
Mỗi thẻ quà tặng gồm hình ảnh sắc nét, tên sản phẩm chuẩn hóa, giá tiền thực tế và logo xuất xứ sàn TMĐT.
Ngay dưới mỗi sản phẩm là hộp thoại AI Reasoning Callout màu tím hoàng gia, giải thích cặn kẽ tại sao món quà này lại đúng tâm lý người nhận.
Người dùng có thể bấm nút 'Thả tim' để lưu vào danh sách yêu thích, hoặc nhấp 'Mua hàng' để chuyển thẳng tới sàn thương mại điện tử chính chủ.""")

# ==============================================================================
# SLIDE 13: THIỆP CHÚC MỪNG ĐIỆN TỬ AI (CHƯƠNG V)
# ==============================================================================
s13 = prs.slides.add_slide(blank_layout)
add_base_background(s13)
add_header(s13, "Chương V: Cài Đặt & Thực Nghiệm", "Phân Hệ Sáng Tạo Thiệp Chúc Mừng Điện Tử AI", "Cá nhân hóa lời chúc đa phong cách cảm xúc kết hợp hiệu ứng pháo hoa mở hộp quà tương tác")

c13_left = add_card(s13, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_ACCENT_PINK)
tf = c13_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "💌 TÍNH NĂNG PHÒNG TẠO THIỆP AI"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

card_features = [
    ("Sinh Lời Chúc AI Tức Thì (1.5s):", "Người dùng chọn món quà và chọn phong cách (Chân thành, Hài hước, Lãng mạn, Trang trọng, Thơ lục bát). AI sáng tác thông điệp độc bản."),
    ("Tùy Biến Visual & Nhạc Nền:", "Tùy chọn chủ đề giao diện: Pastel ngọt ngào, Dạ tiệc sang trọng, Giáng sinh ấm áp; kèm font chữ nghệ thuật tiếng Việt và nhạc nền nhẹ nhàng."),
    ("Hiệu Ứng Mở Thiệp Pháo Hoa:", "Tích hợp Canvas Confetti tạo hiệu ứng pháo hoa giấy bung nở sinh động khi người nhận bấm nút mở thiệp."),
    ("Chỉnh Sửa & Đính Kèm Hộp Quà:", "Người dùng có thể gõ chỉnh sửa lại câu chữ trực tiếp trên thiệp 3D, tải ảnh thiệp về máy hoặc đính kèm vào Hộp kỷ niệm ảo.")
]
for c_t, c_d in card_features:
    p = tf.add_paragraph()
    p.text = f"• {c_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(7)
    run = p.add_run()
    run.text = c_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

add_placeholder(
    s13, Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9),
    "Hình 5.3: Phân hệ thiết kế thiệp chúc mừng AI\n(AI Greeting Card Studio)",
    "Vị trí chèn ảnh chụp màn hình Trình soạn thảo thiệp mừng: Bộ chọn tone cảm xúc, khung thiệp 3D, hiệu ứng pháo hoa giấy Canvas Confetti mở nắp hộp.",
    tag="GIAO DIỆN THIỆP CHÚC MỪNG AI"
)

add_footer(s13, 13)
set_speaker_notes(s13, """[Thời lượng: 40 giây]
Bên cạnh tìm quà, GiftAI cung cấp tiện ích gia tăng cảm xúc: Phân hệ tạo thiệp chúc mừng điện tử bằng AI.
Người dùng có thể chọn các tông giọng: Chân thành, Lãng mạn, Hài hước hoặc Thơ 4 câu ý nghĩa. AI sinh lời chúc độc bản chỉ trong 1.5 giây dựa trên ngữ cảnh người nhận.
Khi mở liên kết thiệp, hệ thống kích hoạt hiệu ứng pháo hoa bung nở cùng giao diện thiệp sang trọng, cho phép người dùng tải ảnh thiệp chất lượng cao hoặc sao chép lời chúc dễ dàng.""")

# ==============================================================================
# SLIDE 14: HỘP KỶ NIỆM & APP ANDROID (CHÈN ẢNH MOBILE SCREENSHOT THẬT)
# ==============================================================================
s14 = prs.slides.add_slide(blank_layout)
add_base_background(s14)
add_header(s14, "Chương V: Cài Đặt & Thực Nghiệm", "Hộp Kỷ Niệm Ảo (Memory Box) & Ứng Dụng Android", "Không gian lưu giữ ký ức số chia sẻ độc bản và ứng dụng di động tối ưu hiệu năng cao")

# Left Column (Memory Box + Android spec)
c14_left = add_card(s14, Inches(0.8), Inches(1.8), Inches(7.5), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c14_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)

p = tf.paragraphs[0]
p.text = "📦 HỘP KỶ NIỆM ẢO & ĐẾM NGÀY (MEMORY BOX)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

mem_points = [
    ("Đóng gói không gian số:", "Tâm thư chân thành + Món quà đính kèm + Đồng hồ đếm xuôi ngày yêu hoặc đếm ngược sinh nhật."),
    ("Mã chia sẻ MEM-XXXXXX:", "Hệ thống sinh mã băm ngẫu nhiên bằng crypto. Người nhận mở link qua Zalo/Messenger không cần tài khoản."),
    ("Tương tác cảm xúc:", "Người nhận có thể thả tim, xem số lượt mở hộp (unboxed_count) và gửi phản hồi trực tiếp.")
]
for pt_t, pt_d in mem_points:
    p = tf.add_paragraph()
    p.text = f"• {pt_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(4)
    run = p.add_run()
    run.text = pt_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

p = tf.add_paragraph()
p.text = "📱 ỨNG DỤNG ANDROID NATIVE WEBVIEW (APK)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_EMERALD
p.space_before = Pt(12)

apk_points = [
    ("Đóng gói tệp GiftAI_v1.0.apk:", "Xây dựng trên Android Studio (Java 17 LTS, Android SDK 34)."),
    ("Xử lý nút Back phần cứng:", "WebView.canGoBack() chuyển trang lịch sử mượt mà thay vì tắt app đột ngột."),
    ("Tối ưu bộ nhớ đệm:", "Cấu hình WebSettings lưu đệm, khởi động Splash Screen đồng bộ thương hiệu.")
]
for pt_t, pt_d in apk_points:
    p = tf.add_paragraph()
    p.text = f"• {pt_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(4)
    run = p.add_run()
    run.text = pt_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

# Right: Insert REAL Mobile Viewport Screenshot!
add_image_box(s14, "scratch/screen_mobile.png", Inches(8.6), Inches(1.8), Inches(3.933), Inches(4.9), caption="Ảnh chụp thực tế: GiftAI trên thiết bị di động")

add_footer(s14, 14)
set_speaker_notes(s14, """[Thời lượng: 40 giây]
Một tính năng rất độc đáo của đồ án là Hộp kỷ niệm ảo (Memory Box). Người dùng có thể tạo một hộp quà trực tuyến gồm tâm thư, món quà kèm đồng hồ đếm xuôi ngày yêu nhau hoặc đếm ngược đến dịp kỷ niệm.
Hệ thống cấp mã định danh độc bản như MEM-9K2F7A để chia sẻ nhanh qua Zalo, Messenger mà người nhận không cần cài đặt phức tạp.
Song song đó, nhóm đã hoàn thiện ứng dụng Android gốc (tệp APK GiftAI_v1.0), hiển thị mượt mà trên mọi thiết bị di động như hình bên phải.""")

# ==============================================================================
# SLIDE 15: KIỂM THỬ & ĐO LƯỜNG HIỆU NĂNG (CHÈN HÌNH BIỂU ĐỒ 5)
# ==============================================================================
s15 = prs.slides.add_slide(blank_layout)
add_base_background(s15)
add_header(s15, "Chương V: Cài Đặt & Thực Nghiệm", "Kết Quả Kiểm Thử Hệ Thống & Đo Lường Hiệu Năng", "Minh chứng thực nghiệm định lượng về độ trễ đáp ứng, tính chịu lỗi và sức tải đồng thời")

c15_left = add_card(s15, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c15_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🧪 KẾT QUẢ ĐO LƯỜNG THỰC NGHIỆM"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

test_results = [
    ("Kiểm Thử Chức Năng (100% PASS):", "8/8 bộ kịch bản kiểm thử (TC-01 đến TC-08) đều vượt qua thành công: Đăng ký JWT, lọc ngân sách, Cache RAM, xoay vòng khóa, tạo thiệp, mở hộp quà."),
    ("Đo Lường Độ Trễ Đáp Ứng:", "• Cache Hit (RAM): 3.2 ms - 8.5 ms (< 10ms, phản hồi tức thì).\n• Gemini 3.8 Flash: 2.42 giây (truy vấn kho TiDB + lọc AI).\n• Groq LPU Fallback: 1.78 giây (suy luận siêu tốc trên chip)."),
    ("Kiểm Thử Chịu Tải Đồng Thời:", "• 1 API Key đơn lẻ: Lỗi HTTP 429 tới 38% khi vượt 15 req/m.\n• Multi-Key Rotation (4 Keys + Fallback): Duy trì tỷ lệ thành công 99.8% ở mức tải 55 req/phút.")
]
for r_t, r_d in test_results:
    p = tf.add_paragraph()
    p.text = r_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = r_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

# Right: Insert generated latency & load test chart!
add_image_box(s15, "scratch/assets/chart_latency_load.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 5.4: Biểu đồ đo lường độ trễ và tỷ lệ thành công khi chịu tải")

add_footer(s15, 15)
set_speaker_notes(s15, """[Thời lượng: 45 giây]
Về kết quả kiểm thử thực nghiệm:
Kiểm thử chức năng: Toàn bộ 8 ca kiểm thử trọng yếu từ đăng ký, lọc ngân sách, gọi API AI đến xoay vòng khóa đều đạt 100% PASS.
Thời gian đáp ứng: Khi trúng Cache RAM, hệ thống phản hồi siêu tốc chỉ 3-8 mili-giây. Khi gọi Gemini kết hợp truy vấn TiDB, thời gian trung bình là 2.42 giây; và chỉ 1.78 giây qua Groq LPU.
Kiểm thử tải: Với 1 API key duy nhất, hệ thống gặp lỗi quá tải 38% ở mức 15 req/phút. Nhưng khi kích hoạt Multi-Key Rotation kết hợp Fallback, hệ thống chịu tải mượt mà 55 req/phút với độ tin cậy đạt 99.8%.""")

# ==============================================================================
# SLIDE 16: HIỆU QUẢ RE-RANKING & ĐÁNH GIÁ UX (CHÈN HÌNH BIỂU ĐỒ 6)
# ==============================================================================
s16 = prs.slides.add_slide(blank_layout)
add_base_background(s16)
add_header(s16, "Chương V & VI: Đánh Giá Thực Nghiệm", "Hiệu Quả AI Re-Ranking & Đánh Giá Trải Nghiệm (SUS)", "Chứng minh vai trò quyết định của màng lọc ngữ nghĩa và mức độ hài lòng vượt trội của người dùng")

c16_left = add_card(s16, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c16_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🎯 ĐÁNH GIÁ ĐỊNH LƯỢNG KHOA HỌC"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

eval_points = [
    ("Dữ Liệu Thô Trước Khi Có AI:", "Tỉ lệ sản phẩm rác chiếm tới 46.8%: gồm ốp lưng, dây đeo, sách hướng dẫn do người bán nhồi từ khóa SEO. Chỉ 53.2% là quà thật."),
    ("Sau Màng Lọc AI Re-Ranking:", "Toàn bộ phụ kiện vô giá trị bị loại bỏ triệt để. Tỉ lệ quà tặng chuẩn xác tăng vọt lên 94.2% (chỉ số Precision@5)."),
    ("Khảo Sát Người Dùng (SUS):", "• Khảo sát thực tế trên 30 người dùng đa dạng.\n• Điểm SUS trung bình: 84.6 / 100 điểm (Xếp hạng Grade A - Xuất sắc), vượt xa chuẩn trung bình ngành 68 điểm.\n• 90% giải quyết 'bí ý tưởng', 86.7% tin tưởng lời giải thích AI.")
]
for ep_t, ep_d in eval_points:
    p = tf.add_paragraph()
    p.text = ep_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = ep_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

# Right: Insert generated re-ranking & SUS chart!
add_image_box(s16, "scratch/assets/chart_rerank_sus.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 5.5 & 6.1: Hiệu quả lọc rác của AI và phân bổ điểm khảo sát SUS")

add_footer(s16, 16)
set_speaker_notes(s16, """[Thời lượng: 45 giây]
Để chứng minh giá trị thực sự của AI, chúng em đã làm thực nghiệm đối chứng:
Nếu chỉ lấy dữ liệu thô cào từ sàn TMĐT thì có tới gần một nửa (46.8%) là hàng rác, ốp lưng, phụ kiện do người bán nhồi từ khóa. Sau khi đưa qua màng lọc ngữ nghĩa Pha 2 của Gemini, độ chính xác quà tặng tăng vọt lên 94.2%.
Về trải nghiệm người dùng, nhóm khảo sát 30 người dùng thực tế theo thang đo chuẩn quốc tế SUS (System Usability Scale). Kết quả đạt 84.6/100 điểm, thuộc Grade A - Mức xuất sắc, vượt xa chuẩn trung bình ngành là 68 điểm.""")

# ==========================================
# SLIDE 17: BENCHMARKING & KINH DOANH (CHƯƠNG VI - FONT TO)
# ==========================================
s17 = prs.slides.add_slide(blank_layout)
add_base_background(s17)
add_header(s17, "Chương VI: Kết Quả & Đánh Giá", "So Sánh Đối Chuẩn (Benchmarking) & Tiềm Năng Kinh Doanh", "Khẳng định lợi thế cạnh tranh độc bản và lộ trình thương mại hóa bền vững trong kinh tế số")

c17_left = add_card(s17, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c17_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "⚖️ SO SÁNH ĐỐI CHUẨN (BENCHMARKING)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

benchmarks = [
    ("So với Tìm kiếm sàn TMĐT:", "Sàn TMĐT chỉ so khớp từ khóa cơ học, không hiểu cảm xúc, lẫn nhiều rác. GiftAI hiểu sâu ngữ cảnh 7 chiều và loại bỏ 94.2% rác."),
    ("So với Chatbot AI (ChatGPT):", "Chatbot thường bị ảo giác (Hallucination) ra link hỏng, giá sai. GiftAI cung cấp sản phẩm thật 100% từ kho TiDB kèm giá chính xác."),
    ("So với Website / Blog tĩnh:", "Blog tĩnh danh sách cố định, bài viết cũ, giá không cập nhật. GiftAI tự động cập nhật và cá nhân hóa theo từng người nhận."),
    ("Kết Luận Vị Thế Cạnh Tranh:", "GiftAI đóng vai trò chiếc cầu nối hoàn hảo dung hòa Trí tuệ Nhân tạo hiện đại và Thương mại Điện tử thực tế.")
]
for b_t, b_d in benchmarks:
    p = tf.add_paragraph()
    p.text = f"• {b_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    run = p.add_run()
    run.text = b_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

c17_right = add_card(s17, Inches(6.8), Inches(1.8), Inches(5.733), Inches(4.9), bg_color=C_WHITE, border_color=C_ACCENT_PINK)
tf_biz = c17_right.text_frame
tf_biz.word_wrap = True
tf_biz.margin_left = tf_biz.margin_right = Inches(0.25)
tf_biz.margin_top = Inches(0.2)
p = tf_biz.paragraphs[0]
p.text = "💰 3 TRỤ CỘT THƯƠNG MẠI HÓA BỀN VỮNG"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

biz_models = [
    ("1. Tiếp Thị Liên Kết (Affiliate):", "Đính kèm Affiliate Deep Link vào mỗi món quà. Nhận hoa hồng 3% - 12% mỗi đơn hàng thành công trên Tiki, Shopee, Lazada. Tạo nguồn doanh thu thụ động lâu dài."),
    ("2. Mô Hình Freemium (GiftAI VIP):", "• Free Tier: Tìm quà không giới hạn, lưu 3 ngày kỷ niệm.\n• VIP Tier: Lưu trữ Hộp kỷ niệm không giới hạn, tự động gửi SMS/Zalo nhắc trước ngày lễ 3 ngày, mở khóa mẫu thiệp 3D độc quyền."),
    ("3. Hợp Tác Thương Hiệu (Brand Partnerships):", "Cổng kết nối các xưởng Handmade, hoa tươi, quà khắc tên cá nhân hóa tiếp cận khách hàng có nhu cầu mua thực tế.")
]
for bm_t, bm_d in biz_models:
    p = tf_biz.add_paragraph()
    p.text = f"• {bm_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(7)
    run = p.add_run()
    run.text = bm_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

add_footer(s17, 17)
set_speaker_notes(s17, """[Thời lượng: 40 giây]
So sánh với các giải pháp hiện nay:
Sàn TMĐT thì tìm kiếm máy móc thiếu cảm xúc. Chatbot thì hay bịa link ảo 404. Bài viết blog thì cũ kỹ không cập nhật giá. GiftAI chính là mảnh ghép dung hòa cả hai: vừa thấu hiểu tâm lý, vừa cung cấp link mua và giá bán chính xác 100%.
Về tiềm năng kinh doanh, đồ án có lộ trình thương mại hóa rõ ràng: Doanh thu tiếp thị liên kết Affiliate 3-12% từ các sàn TMĐT, gói tài khoản VIP tự động nhắc ngày lễ qua Zalo, và hợp tác với các thương hiệu quà tặng thủ công handmade.""")

# ==============================================================================
# SLIDE 18: TỔNG KẾT & LỜI CẢM ƠN (CHƯƠNG VII - DARK THEME - ENLARGED)
# ==============================================================================
s18 = prs.slides.add_slide(blank_layout)
add_base_background(s18, is_dark=True)
add_header(s18, "Chương VII: Kết Luận & Hướng Phát Triển", "Tổng Kết Đóng Góp Của Đề Tài & Lộ Trình Tương Lai", "Hoàn thành toàn diện 100% mục tiêu nghiên cứu và vạch ra chiến lược phát triển dài hạn", is_dark=True)

w_c18 = Inches(5.6)
c18_left = add_card(s18, Inches(0.8), Inches(1.8), w_c18, Inches(3.6), bg_color=C_DARK_CARD, border_color=C_DARK_CARD_BORDER)
tf = c18_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🏆 ĐÓNG GÓP NỔI BẬT CỦA ĐỀ TÀI"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

contributions = [
    ("Hoàn thành 100% mục tiêu:", "Hệ thống vận hành thực tế 24/7 trên Cloud (Vercel, Render, TiDB) và đóng gói APK Android hoàn chỉnh."),
    ("Đóng góp khoa học:", "Giải quyết 'nghịch lý người mua không phải người dùng' bằng vector 7 chiều, Prompt 2 pha và hiện thực hóa Explainable AI."),
    ("Đóng góp kỹ thuật:", "Kiến trúc 4 tầng chịu lỗi cao, Cache RAM < 10ms, xoay vòng đa khóa Modulo và Cascading Fallback.")
]
for c_t, c_d in contributions:
    p = tf.add_paragraph()
    p.text = f"• {c_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_LIGHT
    p.space_before = Pt(6)
    run = p.add_run()
    run.text = c_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_LIGHT_MUTED

c18_right = add_card(s18, Inches(6.9), Inches(1.8), Inches(5.633), Inches(3.6), bg_color=C_DARK_CARD, border_color=C_DARK_CARD_BORDER)
tf_road = c18_right.text_frame
tf_road.word_wrap = True
tf_road.margin_left = tf_road.margin_right = Inches(0.25)
tf_road.margin_top = Inches(0.2)
p = tf_road.paragraphs[0]
p.text = "🔮 LỘ TRÌNH PHÁT TRIỂN TƯƠNG LAI"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

roadmap = [
    ("Ngắn hạn (Short-term):", "Chuyển đổi bộ đệm sang Redis Cluster phân tán đa máy chủ; tích hợp Open API chính thức của Shopee/Lazada; app Native có Push Notifications nhắc mua quà."),
    ("Dài hạn (Long-term):", "Fine-tune mô hình mã nguồn mở cục bộ (Self-hosted SLM: Llama 3 / Gemma 2) giảm chi phí API; ứng dụng Multimodal AI phân tích ảnh phòng/gu ăn mặc; thanh toán 1 chạm (In-App Checkout).")
]
for r_t, r_d in roadmap:
    p = tf_road.add_paragraph()
    p.text = f"• {r_t} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_LIGHT
    p.space_before = Pt(7)
    run = p.add_run()
    run.text = r_d
    run.font.bold = False
    run.font.color.rgb = C_TEXT_LIGHT_MUTED

# Bottom Thank You Banner
c18_bot = add_card(s18, Inches(0.8), Inches(5.6), Inches(11.733), Inches(1.25), bg_color=C_DARK_CARD, border_color=C_PRIMARY)
tf_ty = c18_bot.text_frame
tf_ty.word_wrap = True
tf_ty.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf_ty.paragraphs[0]
p.text = "🙏 XIN CHÂN THÀNH CẢM ƠN THẦY TS. ĐỖ PHÚC HẢO & QUÝ THẦY CÔ HỘI ĐỒNG!"
p.alignment = PP_ALIGN.CENTER
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

p2 = tf_ty.add_paragraph()
p2.text = "CHÚNG EM XIN SẴN SÀNG LẮNG NGHE Ý KIẾN ĐÓNG GÓP & TRẢ LỜI CÁC CÂU HỎI (Q&A)"
p2.alignment = PP_ALIGN.CENTER
p2.font.name = "Segoe UI"
p2.font.size = Pt(12)
p2.font.bold = True
p2.font.color.rgb = C_TEXT_LIGHT
p2.space_before = Pt(4)

add_footer(s18, 18, is_dark=True)
set_speaker_notes(s18, """[Thời lượng: 45 giây]
Để kết luận bài báo cáo: Đề tài GiftAI là minh chứng rõ nét cho thấy Trí tuệ Nhân tạo có thể ứng dụng hiệu quả vào đời sống, biến sự lúng túng khi chọn quà thành trải nghiệm ấm áp và giàu cảm xúc.
Đồ án đã hoàn thành 100% mục tiêu với sản phẩm chạy thực tế 24/7 trên Cloud và ứng dụng Android APK.
Chúng em xin gửi lời cảm ơn chân thành và sâu sắc nhất đến Thầy TS. Đỗ Phúc Hảo đã tận tình hướng dẫn, cùng quý Thầy Cô trong Hội đồng đã dành thời gian theo dõi bài báo cáo.
Chúng em xin sẵn sàng lắng nghe những ý kiến đóng góp quý báu và trả lời các câu hỏi từ quý Thầy Cô! Em xin trân trọng cảm ơn!""")

# ==========================================
# SAVE PRESENTATION
# ==========================================
output_dir = r"C:\Users\QuangNguyen\GiftAI\BaoCao_DoAn"
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "Slide_ThuyetTrinh_GiftAI.pptx")

prs.save(output_path)
print(f"Presentation successfully updated at: {output_path}")
