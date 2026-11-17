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

def set_speaker_notes(slide, notes_content):
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = notes_content

# ==============================================================================
# SLIDE 1: TRANG BÌA (DARK THEME)
# ==============================================================================
s1 = prs.slides.add_slide(blank_layout)
add_base_background(s1, is_dark=True)

tb_tag = s1.shapes.add_textbox(Inches(1.0), Inches(0.8), Inches(11.333), Inches(0.4))
tf_tag = tb_tag.text_frame
p_tag = tf_tag.paragraphs[0]
p_tag.text = "TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG • KHOA CÔNG NGHỆ THÔNG TIN"
p_tag.font.name = "Segoe UI"
p_tag.font.size = Pt(13)
p_tag.font.bold = True
p_tag.font.color.rgb = C_ACCENT_PINK

tb_title = s1.shapes.add_textbox(Inches(1.0), Inches(1.3), Inches(11.333), Inches(1.8))
tf_title = tb_title.text_frame
tf_title.word_wrap = True
p_title = tf_title.paragraphs[0]
p_title.text = "BÁO CÁO ĐỒ ÁN TRÍ TUỆ NHÂN TẠO\nXÂY DỰNG HỆ THỐNG TÌM QUÀ TẶNG CHO NGƯỜI THÂN YÊU (GIFTAI)"
p_title.font.name = "Segoe UI"
p_title.font.size = Pt(27)
p_title.font.bold = True
p_title.font.color.rgb = C_WHITE

p_sub = tf_title.add_paragraph()
p_sub.text = "Nền tảng tư vấn và cá nhân hóa quà tặng thông minh ứng dụng Mô hình Ngôn ngữ Lớn (LLM) & CSDL TiDB Cloud"
p_sub.font.name = "Segoe UI"
p_sub.font.size = Pt(14)
p_sub.font.color.rgb = C_TEXT_LIGHT_MUTED
p_sub.space_before = Pt(8)

c_info1 = add_card(s1, Inches(1.0), Inches(3.4), Inches(5.4), Inches(3.1), bg_color=C_DARK_CARD, border_color=C_DARK_CARD_BORDER)
tf1 = c_info1.text_frame
tf1.word_wrap = True
tf1.margin_left = tf1.margin_right = Inches(0.3)
tf1.margin_top = Inches(0.25)
p = tf1.paragraphs[0]
p.text = "👨‍🏫 GIẢNG VIÊN HƯỚNG DẪN"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

p = tf1.add_paragraph()
p.text = "TS. ĐỖ PHÚC HẢO"
p.font.name = "Segoe UI"
p.font.size = Pt(20)
p.font.bold = True
p.font.color.rgb = C_WHITE
p.space_before = Pt(8)

p = tf1.add_paragraph()
p.text = "Khoa Công nghệ Thông tin\nTrường Đại học Kiến trúc Đà Nẵng"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.color.rgb = C_TEXT_LIGHT_MUTED
p.space_before = Pt(4)

p = tf1.add_paragraph()
p.text = "📍 Thời gian báo cáo: Năm 2026"
p.font.name = "Segoe UI"
p.font.size = Pt(11)
p.font.color.rgb = C_PRIMARY_LIGHT
p.space_before = Pt(14)

c_info2 = add_card(s1, Inches(6.8), Inches(3.4), Inches(5.533), Inches(3.1), bg_color=C_DARK_CARD, border_color=C_PRIMARY)
tf2 = c_info2.text_frame
tf2.word_wrap = True
tf2.margin_left = tf2.margin_right = Inches(0.3)
tf2.margin_top = Inches(0.25)
p = tf2.paragraphs[0]
p.text = "👥 SINH VIÊN THỰC HIỆN"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY_LIGHT

students = [
    ("NGUYỄN THIỆN QUÂN", "Mã SV: 2351220231 • Lớp 23CT2"),
    ("NGUYỄN VIỆT QUANG", "Mã SV: 2351220268 • Lớp 23CT2")
]
for name, meta in students:
    p = tf2.add_paragraph()
    p.text = name
    p.font.name = "Segoe UI"
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.space_before = Pt(8)
    
    p2 = tf2.add_paragraph()
    p2.text = meta
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11.5)
    p2.font.color.rgb = C_TEXT_LIGHT_MUTED
    p2.space_before = Pt(1)

add_footer(s1, 1, is_dark=True)
set_speaker_notes(s1, """[Thời lượng: 40 giây]
Kính thưa Thầy TS. Đỗ Phúc Hảo cùng toàn thể quý Thầy Cô trong Hội đồng phản biện đồ án.
Hôm nay, nhóm chúng em gồm hai thành viên: Nguyễn Thiện Quân và Nguyễn Việt Quang, sinh viên lớp 23CT2, Khoa Công nghệ Thông tin - Trường Đại học Kiến trúc Đà Nẵng, xin phép được báo cáo đồ án với đề tài:
"Xây dựng hệ thống tìm quà tặng cho người thân yêu (GiftAI)".
Đề tài ra đời nhằm giải quyết bài toán nan giải trong đời sống thực tế: Làm sao chọn được món quà chuẩn gu, đúng tâm lý, đúng dịp và sát ngân sách bằng việc kết hợp trí tuệ nhân tạo hiện đại cùng kho dữ liệu sản phẩm thực tế. Sau đây em xin phép được bắt đầu phần trình bày.""")

# ==============================================================================
# SLIDE 2: BỐI CẢNH BÀI TOÁN & 3 THÁCH THỨC CỐT LÕI (CHƯƠNG I)
# ==============================================================================
s2 = prs.slides.add_slide(blank_layout)
add_base_background(s2)
add_header(s2, "Chương I: Mở Đầu", "Bối Cảnh Bài Toán & 3 Thách Thức Cốt Lõi Khi Chọn Quà", "Khoảng trống giữa công cụ tìm kiếm truyền thống và nhu cầu thấu hiểu tâm lý người nhận quà")

s2_challenges = [
    ("1. Quá Tải Thông Tin & Tìm Kiếm Cơ Học", [
        ("So khớp từ khóa thô sơ:", "Các sàn TMĐT chỉ tìm xâu ký tự cứng nhắc, hoàn toàn không hiểu ngữ cảnh cảm xúc."),
        ("Nhiễu loạn từ khóa SEO:", "Người bán nhồi nhét phụ kiện (ốp lưng, dây đeo) khiến kết quả lẫn tạp phẩm."),
        ("Mất thời gian đắn đo:", "Người dùng tốn hàng giờ lướt web vô định giữa hàng triệu mặt hàng mà vẫn bế tắc.")
    ], C_PRIMARY),
    ("2. Nghịch Lý Người Mua ≠ Người Thụ Hưởng", [
        ("Khoảng cách thấu hiểu (Gap):", "Bản chất việc tặng quà là mua cho người khác (bố mẹ, bạn bè, người yêu, sếp...)."),
        ("Vô hiệu hóa lịch sử cá nhân:", "Thuật toán gợi ý cá nhân hóa truyền thống dựa trên hành vi người mua bị tê liệt."),
        ("Thách thức Cold-Start tuyệt đối:", "Hệ thống không có bất kỳ vector hành vi nào trong quá khứ của người nhận.")
    ], C_ACCENT_PINK),
    ("3. Đa Ràng Buộc Đa Chiều Phức Tạp", [
        ("Dung hòa 5 chiều đồng thời:", "Mối quan hệ, Dịp lễ kỷ niệm, Độ tuổi/Giới tính, Sở thích/Tính cách, và Ngân sách cứng."),
        ("Đa dạng đối tượng & bối cảnh:", "Từ bố mẹ, người yêu, bạn thân đến đồng nghiệp, các dịp kỷ niệm đặc thù."),
        ("Áp lực tâm lý khi tặng quà:", "Luôn thường trực nỗi lo món quà bị 'lệch gu' hoặc gây khó xử cho người nhận.")
    ], C_BLUE)
]

col_w = Inches(3.7)
gap = Inches(0.3)
start_x = Inches(0.8)

for i, (title, points, color) in enumerate(s2_challenges):
    x = start_x + i * (col_w + gap)
    card = add_card(s2, x, Inches(1.8), col_w, Inches(4.9), bg_color=C_WHITE, border_color=color)
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.2)
    tf.margin_top = Inches(0.2)
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = color
    
    for h, d in points:
        p = tf.add_paragraph()
        p.text = f"• {h} "
        p.font.name = "Segoe UI"
        p.font.size = Pt(11.5)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(10)
        
        run = p.add_run()
        run.text = d
        run.font.bold = False
        run.font.color.rgb = C_TEXT_MUTED

add_footer(s2, 2)
set_speaker_notes(s2, """[Thời lượng: 45 giây]
Kính thưa Thầy Cô, xuất phát điểm của đề tài đến từ 3 thách thức thực tế rất lớn:
Thứ nhất là Quá tải thông tin nhưng thiếu thông minh: Các sàn thương mại điện tử có hàng triệu mặt hàng nhưng công cụ tìm kiếm chỉ so khớp từ khóa cơ học, bị nhiễu loạn bởi từ khóa SEO của người bán.
Thứ hai là Nghịch lý người mua không phải người thụ hưởng (Buyer vs. Consumer Gap): Người tặng mua cho bố mẹ, bạn bè, người yêu - những người có độ tuổi và sở thích khác biệt. Lịch sử mua sắm cá nhân hoàn toàn mất tác dụng, dẫn đến bài toán Cold-Start tuyệt đối.
Thứ ba là Đa ràng buộc phức tạp: Món quà tối ưu phải là giao điểm của 5 chiều: Quan hệ, Dịp lễ, Độ tuổi, Sở thích và Ngân sách. Giải quyết trọn vẹn 3 bài toán này chính là sứ mệnh của GiftAI.""")

# ==============================================================================
# SLIDE 3: MỤC TIÊU ĐỀ TÀI & TRIẾT LÝ GIẢI PHÁP HYBRID (CHƯƠNG I)
# ==============================================================================
s3 = prs.slides.add_slide(blank_layout)
add_base_background(s3)
add_header(s3, "Chương I: Mở Đầu", "Mục Tiêu Đề Tài & Triết Lý Giải Pháp Hybrid Của GiftAI", "Kết hợp sức mạnh suy luận ngữ cảnh của LLM với độ tin cậy của kho dữ liệu thực tế")

c3_left = add_card(s3, Inches(0.8), Inches(1.8), Inches(6.2), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c3_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🎯 6 MỤC TIÊU KỸ THUẬT CỐT LÕI (BẢNG 6.1)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

targets = [
    ("MT-01: Thu thập ngữ cảnh 7D:", "Xây dựng Wizard khảo sát trực quan chuẩn hóa dữ liệu đầu vào."),
    ("MT-02: Trích xuất ý định bằng LLM:", "Hiện thực hóa Prompt Pha 1 trích xuất Intent ra cấu trúc JSON."),
    ("MT-03: Tái xếp hạng sản phẩm thật:", "Semantic Re-ranking từ kho 2.390+ sản phẩm thực tế trên TiDB Cloud."),
    ("MT-04: AI Engine chịu lỗi cao:", "Kiến trúc 4 tầng: Cache RAM, xoay vòng API Keys, Fallback Cascade."),
    ("MT-05: Tiện ích cảm xúc sáng tạo:", "Sinh thiệp mừng AI 4 tone cảm xúc & Hộp kỷ niệm ảo (Memory Box)."),
    ("MT-06: Đóng gói đa nền tảng:", "Triển khai Cloud Serverless (Vercel, Render) & Ứng dụng Android APK.")
]
for code, desc in targets:
    p = tf.add_paragraph()
    p.text = f"• {code} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    run = p.add_run()
    run.text = desc
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

c3_right = add_card(s3, Inches(7.3), Inches(1.8), Inches(5.233), Inches(4.9), bg_color=C_WHITE, border_color=C_AMBER)
tf_r = c3_right.text_frame
tf_r.word_wrap = True
tf_r.margin_left = tf_r.margin_right = Inches(0.25)
tf_r.margin_top = Inches(0.2)
p = tf_r.paragraphs[0]
p.text = "💡 TRIẾT LÝ GIẢI PHÁP HYBRID ĐỘC ĐÁO"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_AMBER

phil_points = [
    ("AI Không Tự 'Bịa' Sản Phẩm:", "Khắc phục triệt để ảo giác (Hallucination) của các Chatbot thông thường – vốn hay sinh ra đường link hỏng hoặc sản phẩm không có thực."),
    ("Bộ Não Phân Tích Tâm Lý:", "Google Gemini 3.8 Flash đóng vai trò 'Chuyên gia tư vấn' giải mã tâm lý và lọc ngữ nghĩa sản phẩm phù hợp."),
    ("Kho Dữ Liệu Thực Tế 100%:", "TiDB Cloud đóng vai trò 'Kho hàng thực' lưu trữ 2.390+ sản phẩm thật kèm giá bán, hình ảnh và link mua hàng chính thống từ Tiki, Shopee, Lazada."),
    ("Đồng Hành Cảm Xúc Toàn Diện:", "Không dừng lại ở việc gợi ý vật chất mà còn hỗ trợ tạo thiệp chúc và lưu giữ cột mốc yêu thương qua Hộp kỷ niệm ảo.")
]
for pt, pd in phil_points:
    p = tf_r.add_paragraph()
    p.text = f"✓ {pt} "
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    run = p.add_run()
    run.text = pd
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

add_footer(s3, 3)
set_speaker_notes(s3, """[Thời lượng: 45 giây]
Để giải quyết bài toán đặt ra, nhóm đề ra 6 mục tiêu kỹ thuật cụ thể từ MT-01 đến MT-06, bám sát toàn bộ các chương trong Báo cáo.
Điểm nhấn học thuật và kỹ thuật lớn nhất của GiftAI là Triết lý giải pháp Hybrid:
Chúng em không để AI tự 'bịa' ra sản phẩm vì LLM rất dễ gặp hiện tượng ảo giác (Hallucination), tạo ra link hỏng và giá ảo.
Thay vào đó, nhóm kết hợp hai thế mạnh:
- AI đóng vai trò 'Bộ não tư vấn tâm lý' và 'Màng lọc ngữ nghĩa tái xếp hạng'.
- Hệ thống TiDB Cloud đóng vai trò 'Kho hàng thực tế 100%' với hơn 2.390 sản phẩm thật. Nhờ đó, gợi ý vừa mang tính tâm lý sâu sắc vừa có thể bấm mua ngay lập tức.""")

# ==============================================================================
# SLIDE 4: KIẾN TRÚC PHÂN TẦNG CLOUD-NATIVE (CHƯƠNG III)
# ==============================================================================
s4 = prs.slides.add_slide(blank_layout)
add_base_background(s4)
add_header(s4, "Chương III: Thiết Kế Hệ Thống", "Kiến Trúc Phân Tầng Tổng Thể Trên Môi Trường Cloud", "Mô hình kiến trúc phân tầng phân tán đảm bảo tính độc lập, độ mở rộng và tính sẵn sàng cao")

c4_left = add_card(s4, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c4_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🏛️ MÔ HÌNH KIẾN TRÚC 4 TẦNG CLOUD"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

arch_tiers = [
    ("1. Tầng Trình Diễn (Presentation Tier):", "Web SPA (React 19, TypeScript, Tailwind) trên Vercel Edge & Ứng dụng Android Native WebView độc lập."),
    ("2. Tầng Điều Phối (Application Tier):", "Node.js & Express RESTful API trên Render Cloud; xử lý nghiệp vụ, xác thực JWT, phân quyền và bảo mật Helmet/CORS."),
    ("3. Tầng Xử Lý AI (AI Engine Tier):", "Bộ đệm In-Memory Cache, xoay vòng 4 API Keys Gemini 3.8 Flash, Fallback sang Groq LPU & OpenAI."),
    ("4. Tầng Dữ Liệu (Data Tier):", "TiDB Cloud Serverless (MySQL 8.0 protocol) phân tán địa lý, SSL/TLSv1.2, kết nối tối ưu qua Connection Pooling.")
]
for t_t, t_d in arch_tiers:
    p = tf.add_paragraph()
    p.text = t_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = t_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_image_box(s4, "scratch/assets/diagram_architecture.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 3.1: Sơ đồ kiến trúc phân tầng hệ sinh thái GiftAI trên Cloud")

add_footer(s4, 4)
set_speaker_notes(s4, """[Thời lượng: 40 giây]
Về mặt kiến trúc, hệ thống được thiết kế theo mô hình phân tầng Cloud-Native gồm 4 tầng độc lập:
Tầng 1 - Trình diễn: Ứng dụng Web Single Page App xây dựng bằng React 19, Vite, Tailwind CSS triển khai trên Vercel; đồng thời đóng gói thành ứng dụng di động Android Native WebView container.
Tầng 2 - Ứng dụng: Node.js Express API triển khai trên Render Cloud, quản lý toàn bộ nghiệp vụ, phân quyền và xác thực JWT.
Tầng 3 - AI Engine: Tích hợp Google Gemini 3.8 Flash với cơ chế Cache RAM và chuyển mạch dự phòng Groq/OpenAI.
Tầng 4 - CSDL: Sử dụng TiDB Cloud Serverless phân tán, tương thích chuẩn MySQL 8.0, kết nối bảo mật qua SSL.""")

# ==============================================================================
# SLIDE 5: NGĂN XẾP CÔNG NGHỆ CỐT LÕI (CHƯƠNG II & V)
# ==============================================================================
s5 = prs.slides.add_slide(blank_layout)
add_base_background(s5)
add_header(s5, "Chương II & V: Công Nghệ Sử Dụng", "Ngăn Xếp Công Nghệ Cốt Lõi Của Hệ Sinh Thái GiftAI", "Đặc tả chi tiết công nghệ bám sát thực tiễn hiện thực hóa trong Báo cáo (Bảng 5.1)")

stacks = [
    ("🌐 FRONTEND & MOBILE", [
        ("React 19 + TypeScript:", "Giao diện SPA hiện đại, Type-safe chặt chẽ."),
        ("Vite 6 + Tailwind CSS:", "Build siêu tốc, tối ưu hóa giao diện responsive."),
        ("Lucide React Icons:", "Hệ thống biểu tượng trực quan, tinh gọn."),
        ("Android Native Container:", "Chromium WebView, Java 17, Gradle 8.4.")
    ], C_PRIMARY, Inches(0.8), Inches(1.8)),
    
    ("⚙️ BACKEND & APIS", [
        ("Node.js v20 LTS:", "Nền tảng runtime bất đồng bộ hiệu năng cao."),
        ("Express.js Framework:", "RESTful APIs chuẩn mực, bảo mật Helmet/CORS."),
        ("JWT & Bcrypt:", "Xác thực phiên làm việc, mã hóa an toàn 10 rounds."),
        ("Web Crawlers:", "Cheerio, Axios, Puppeteer thu thập dữ liệu TMĐT.")
    ], C_BLUE, Inches(6.8), Inches(1.8)),
    
    ("🧠 TRÍ TUỆ NHÂN TẠO", [
        ("Google Gemini 3.8 Flash:", "LLM chủ lực với tốc độ phản hồi và suy luận cao."),
        ("Groq SDK (Llama 3.3 70B):", "Fallback LPU siêu tốc khi dịch vụ chính quá tải."),
        ("OpenAI GPT API:", "Tầng dự phòng cấp 3 đảm bảo tính liên tục."),
        ("Prompt Engineering 2 Pha:", "Phân tách rõ ràng giữa Intent và Re-ranking.")
    ], C_ACCENT_PINK, Inches(0.8), Inches(4.35)),
    
    ("☁️ CƠ SỞ DỮ LIỆU & CLOUD", [
        ("TiDB Cloud Serverless:", "CSDL quan hệ phân tán MySQL 8.0, SSL v1.2."),
        ("Vercel Edge Network:", "Hosting Frontend CDN toàn cầu, tự động CI/CD."),
        ("Render Cloud Platform:", "Hosting Backend API Container bền bỉ 24/7."),
        ("In-Memory RAM Cache:", "Giảm độ trễ truy vấn lặp xuống dưới 10ms.")
    ], C_EMERALD, Inches(6.8), Inches(4.35))
]

for title, items, color, left, top in stacks:
    card = add_card(s5, left, top, Inches(5.733), Inches(2.45), bg_color=C_WHITE, border_color=color)
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.25)
    tf.margin_top = Inches(0.18)
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = color
    
    for tech, desc in items:
        p = tf.add_paragraph()
        p.text = f"• {tech} "
        p.font.name = "Segoe UI"
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(3)
        run = p.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_TEXT_MUTED

add_footer(s5, 5)
set_speaker_notes(s5, """[Thời lượng: 40 giây]
Toàn bộ ngăn xếp công nghệ được lựa chọn cẩn thận nhằm đảm bảo tính ổn định và hiện đại:
Frontend sử dụng React 19 kết hợp TypeScript và Vite để đảm bảo giao diện phản hồi nhanh và kiểm soát lỗi chặt chẽ.
Phía di động được đóng gói thành ứng dụng Android Native hoàn chỉnh thông qua WebView Container.
Backend xây dựng trên Node.js v20 LTS với Express, xác thực JWT và mã hóa mật khẩu bcrypt.
Về AI, mô hình chủ lực là Google Gemini 3.8 Flash với khả năng xử lý tiếng Việt rất tự nhiên, kết hợp Groq SDK trên chip LPU để dự phòng.
Cơ sở dữ liệu được đặt trên TiDB Cloud Serverless có khả năng co giãn linh hoạt.""")

# ==============================================================================
# SLIDE 6: THIẾT KẾ CSDL PHÂN TÁN (CHƯƠNG III)
# ==============================================================================
s6 = prs.slides.add_slide(blank_layout)
add_base_background(s6)
add_header(s6, "Chương III: Thiết Kế Hệ Thống", "Thiết Kế Cơ Sở Dữ Liệu Phân Tán (TiDB Cloud 6 Bảng Chuẩn 3NF)", "Lược đồ cơ sở dữ liệu quan hệ kết hợp các trường JSON động tối ưu hiệu năng truy vấn")

c6_left = add_card(s6, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c6_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🗄️ ĐẶC TẢ 6 BẢNG DỮ LIỆU CỐT LÕI"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

tables = [
    ("1. users:", "Quản lý tài khoản, mật khẩu băm bcrypt 10 rounds, phân quyền role ('user', 'admin')."),
    ("2. scraped_products:", "Kho 2.390+ sản phẩm thật, product_key chống trùng lặp, giá bán, platform, hình ảnh, link mua."),
    ("3. search_history:", "Lưu vết 7 chiều ngữ cảnh tìm kiếm và snapshot kết quả gợi ý AI dưới dạng JSON."),
    ("4. product_recommendation_stats:", "Ghi nhận số lượt hiển thị, click tracking và đo lường tỷ lệ tương tác quà tặng."),
    ("5. user_favorites:", "Danh mục quà tặng yêu thích được người dùng thả tim lưu trữ theo từng tài khoản."),
    ("6. memory_boxes:", "Quản lý hộp quà kỷ niệm ảo, mã share_code độc bản, mật mã bảo vệ, đếm ngược ngày mở.")
]
for tb_t, tb_d in tables:
    p = tf.add_paragraph()
    p.text = tb_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    run = p.add_run()
    run.text = f" {tb_d}"
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

add_image_box(s6, "scratch/assets/diagram_erd.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 3.2: Lược đồ quan hệ thực thể (ERD) hệ thống GiftAI trên TiDB Cloud")

add_footer(s6, 6)
set_speaker_notes(s6, """[Thời lượng: 45 giây]
Cơ sở dữ liệu của GiftAI được thiết kế chuẩn hóa 3NF trên nền tảng TiDB Cloud với 6 bảng dữ liệu cốt lõi:
Bảng users quản lý người dùng và phân quyền admin.
Bảng scraped_products lưu trữ kho hơn 2.390 sản phẩm thật đã được cào và làm sạch từ Tiki, Shopee, Lazada.
Bảng search_history lưu lại vết tìm kiếm cùng snapshot JSON kết quả mà AI trả về.
Bảng product_recommendation_stats ghi nhận tương tác nhấp chuột để theo dõi độ quan tâm.
Bảng user_favorites lưu danh sách quà người dùng thả tim.
Và bảng memory_boxes quản lý các hộp quà kỷ niệm với mã độc bản share_code. Toàn bộ các bảng đều được đánh index tối ưu.""")

# ==============================================================================
# SLIDE 7: MÔ HÌNH HÓA CA SỬ DỤNG (CHƯƠNG III)
# ==============================================================================
s7 = prs.slides.add_slide(blank_layout)
add_base_background(s7)
add_header(s7, "Chương III: Thiết Kế Hệ Thống", "Mô Hình Hóa 10 Ca Sử Dụng & Luồng Tuần Tự (Use Cases & Sequence)", "Bao phủ toàn diện trải nghiệm người dùng, nghiệp vụ bảo mật và quản trị hệ thống")

c7_left = add_card(s7, Inches(0.8), Inches(1.8), Inches(5.7), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c7_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "📋 MA TRẬN 10 CA SỬ DỤNG TRỌNG TÂM"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

use_cases = [
    ("Nhóm Người Dùng (End-User):", [
        ("UC-01:", "Gợi ý quà tặng thông minh (Wizard 4 bước + Tái xếp hạng)."),
        ("UC-02:", "Sinh thiệp chúc mừng tự động bằng AI (4 tone cảm xúc)."),
        ("UC-03 & UC-04:", "Khởi tạo và Mở khóa Hộp kỷ niệm ảo (Mã MEM-XXXXXX)."),
        ("UC-05 & UC-06:", "Quản lý Quà yêu thích (Thả tim) & Lịch sử tìm kiếm.")
    ]),
    ("Nhóm Xác Thực & Quản Trị (Auth & Admin):", [
        ("UC-07 & UC-08:", "Đăng ký, Đăng nhập và Xác thực bảo mật phiên JWT."),
        ("UC-09 & UC-10:", "Thống kê tương tác sản phẩm & Giám sát vận hành API.")
    ])
]
for grp_t, ucs in use_cases:
    p = tf.add_paragraph()
    p.text = grp_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_BLUE
    p.space_before = Pt(8)
    for u_code, u_desc in ucs:
        p = tf.add_paragraph()
        p.text = f"• {u_code} "
        p.font.name = "Segoe UI"
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(3)
        run = p.add_run()
        run.text = u_desc
        run.font.bold = False
        run.font.color.rgb = C_TEXT_MUTED

c7_right = add_card(s7, Inches(6.8), Inches(1.8), Inches(5.733), Inches(4.9), bg_color=C_WHITE, border_color=C_BLUE)
tf_seq = c7_right.text_frame
tf_seq.word_wrap = True
tf_seq.margin_left = tf_seq.margin_right = Inches(0.25)
tf_seq.margin_top = Inches(0.2)
p = tf_seq.paragraphs[0]
p.text = "🔄 LUỒNG HOẠT ĐỘNG TUẦN TỰ (SEQUENCE FLOW)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_BLUE

seq_steps = [
    ("Bước 1: Tiếp Nhận Ngữ Cảnh:", "Client gửi payload khảo sát 7 chiều tới Endpoint API."),
    ("Bước 2: Kiểm Tra Cache RAM:", "Backend kiểm tra In-Memory Cache; nếu Hit trả kết quả tức thì."),
    ("Bước 3: AI Phân Tích Ý Định (Pha 1):", "Nếu Cache Miss, Gemini phân tích tâm lý và trích xuất Intent."),
    ("Bước 4: Truy Vấn Kho Sản Phẩm:", "Backend chạy SQL lấy tập ứng viên từ TiDB theo ngân sách."),
    ("Bước 5: AI Tái Xếp Hạng (Pha 2):", "Gemini loại bỏ sản phẩm không phù hợp và sinh lời lý giải tâm lý."),
    ("Bước 6: Trả Về & Lưu Snapshot:", "Gửi kết quả về giao diện người dùng và lưu vết vào CSDL.")
]
for st_t, st_d in seq_steps:
    p = tf_seq.add_paragraph()
    p.text = st_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    run = p.add_run()
    run.text = f" {st_d}"
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

add_footer(s7, 7)
set_speaker_notes(s7, """[Thời lượng: 45 giây]
Hệ thống được thiết kế xoay quanh 10 ca sử dụng trọng tâm, phân thành 2 nhóm:
Nhóm Người dùng bao gồm: Gợi ý quà thông minh, Sinh thiệp chúc AI, Tạo và Mở Hộp kỷ niệm ảo, Quản lý quà yêu thích và Lịch sử tìm kiếm.
Nhóm Xác thực & Quản trị bao gồm: Đăng ký, Đăng nhập phiên JWT, Thống kê tương tác click và Giám sát trạng thái API.
Ở bên phải là Biểu đồ tuần tự ca sử dụng cốt lõi UC-01:
Khi người dùng gửi yêu cầu, hệ thống kiểm tra Cache RAM trước. Nếu chưa có, Pha 1 của AI sẽ phân tích tâm lý để lấy từ khóa truy vấn kho TiDB Cloud, sau đó Pha 2 tái xếp hạng và tạo lời giải thích trước khi trả về cho Client.""")

# ==============================================================================
# SLIDE 8: QUY TRÌNH PROMPT 2 PHA (CHƯƠNG IV)
# ==============================================================================
s8 = prs.slides.add_slide(blank_layout)
add_base_background(s8)
add_header(s8, "Chương IV: Đặc Thù & Giải Pháp AI", "Quy Trình Prompt Engineering Hai Pha (Two-Phase)", "Phân rã bài toán gợi ý quà tặng thành hai pha độc lập nhằm triệt tiêu hoàn toàn ảo giác (Hallucination)")

c8_left = add_card(s8, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c8_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "⚡ HAI PHA XỬ LÝ NGÔN NGỮ ĐỘC LẬP"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

prompt_phases = [
    ("Pha 1: Trích Xuất Ý Định (Intent Parsing):", "• Đầu vào: 7 chiều ngữ cảnh (Quan hệ, Tuổi, Dịp, Sở thích, Ngân sách).\n• Nhiệm vụ: Giải mã tâm lý người nhận, sinh từ khóa tìm kiếm tiếng Việt chuẩn hóa.\n• Ràng buộc: Ép kiểu đầu ra thành cấu trúc JSON nghiêm ngặt."),
    ("Pha 2: Tái Xếp Hạng & Lý Giải (Re-ranking & XAI):", "• Đầu vào: Ý định từ Pha 1 + Danh sách sản phẩm thực từ TiDB Cloud.\n• Nhiệm vụ: Loại bỏ tạp phẩm không phù hợp, xếp hạng ưu tiên và sinh lời giải thích (Reasoning) thuyết phục."),
    ("Prompt Chuyên Biệt Sinh Thiệp Chúc Mừng:", "Tự động phân tích người nhận và dịp tặng để sáng tác lời chúc theo 4 sắc thái cảm xúc: Chân thành, Hài hước, Lãng mạn và Trang trọng.")
]
for pp_t, pp_d in prompt_phases:
    p = tf.add_paragraph()
    p.text = pp_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = pp_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_image_box(s8, "scratch/assets/diagram_prompt_2phase.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 4.1: Luồng xử lý Prompt Engineering hai pha (Two-Phase Prompting)")

add_footer(s8, 8)
set_speaker_notes(s8, """[Thời lượng: 45 giây]
Để triệt tiêu hiện tượng ảo giác của LLM, chúng em đề xuất Quy trình Prompt Engineering 2 pha độc lập:
Ở Pha 1 - Trích xuất ý định: Mô hình nhận 7 chiều ngữ cảnh và đóng vai trò chuyên gia tâm lý để phân tích người nhận, xuất ra các từ khóa tìm kiếm theo định dạng JSON chuẩn.
Ở Pha 2 - Tái xếp hạng sản phẩm: Mô hình nhận danh sách sản phẩm thật lấy từ TiDB Cloud. Nhiệm vụ của AI lúc này là màng lọc ngữ nghĩa: loại bỏ hoàn toàn các phụ kiện rác do người bán nhồi từ khóa, chọn ra những món quà xuất sắc nhất và viết lời giải thích vì sao món quà đó phù hợp.
Ngoài ra, nhóm còn thiết kế Prompt chuyên biệt để sinh thiệp chúc mừng theo 4 phong cách.""")

# ==============================================================================
# SLIDE 9: KIẾN TRÚC AI 4 TẦNG (CHƯƠNG IV)
# ==============================================================================
s9 = prs.slides.add_slide(blank_layout)
add_base_background(s9)
add_header(s9, "Chương IV: Đặc Thù & Giải Pháp AI", "Kiến Trúc Vận Hành 4 Tầng Của AI Engine (Chịu Lỗi Cao)", "Đảm bảo hệ sinh thái AI luôn sẵn sàng 24/7, loại bỏ triệt để điểm nghẽn HTTP 429 và quá tải")

c9_left = add_card(s9, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c9_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🛡️ 4 LỚP BẢO VỆ & DỰ PHÒNG CHUYÊN SÂU"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

ai_engine_layers = [
    ("Tầng 1: Bộ Đệm RAM Thông Minh (In-Memory Cache):", "Băm ngữ cảnh khảo sát làm khóa đệm Cache Key. Phản hồi tức thì (< 10ms) cho các yêu cầu tương đồng, tiết kiệm tài nguyên API."),
    ("Tầng 2: Thuật Toán Xoay Vòng Đa Khóa (Multi-Key Rotation):", "Tích hợp cụm 4 API Keys Gemini hoạt động song song. Khi gặp lỗi hạn ngạch HTTP 429, hệ thống tự động chuyển sang khóa kế tiếp."),
    ("Tầng 3: Cơ Chế Thử Lại Tự Động (Exponential Backoff):", "Thử lại tối đa 3 lần với thời gian chờ hàm mũ (1s, 2s, 4s) khi gặp sự cố chập chờn kết nối mạng."),
    ("Tầng 4: Chuyển Mạch Dự Phòng Đa Hãng (Fallback Cascade):", "Nếu toàn bộ khóa Gemini gián đoạn: Chuyển mạch tức thì sang Groq LPU (Llama 3.3 70B) và lùi về OpenAI GPT làm chốt chặn cuối cùng.")
]
for al_t, al_d in ai_engine_layers:
    p = tf.add_paragraph()
    p.text = al_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    
    p2 = tf.add_paragraph()
    p2.text = al_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_image_box(s9, "scratch/assets/diagram_4tier_ai.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 4.2: Kiến trúc vận hành 4 tầng đảm bảo tính sẵn sàng cao và tối ưu độ trễ")

add_footer(s9, 9)
set_speaker_notes(s9, """[Thời lượng: 45 giây]
Để hệ thống vận hành bền bỉ 24/7 mà không phụ thuộc vào một kết nối duy nhất, chúng em xây dựng Kiến trúc AI Engine 4 tầng:
Tầng 1 là Cache RAM: Lưu lại kết quả truy vấn, giúp phản hồi tức thì dưới 10 mili-giây và tiết kiệm chi phí gọi API.
Tầng 2 là Thuật toán xoay vòng đa khóa (Multi-Key Rotation): Khi 1 API Key bị chạm ngưỡng rate limit HTTP 429, hệ thống tự động chuyển ngay sang khóa tiếp theo.
Tầng 3 là Cơ chế thử lại với thời gian chờ hàm mũ.
Tầng 4 là Chuỗi chuyển mạch dự phòng đa nhà cung cấp (Fallback Cascade): Nếu Gemini gặp sự cố, hệ thống tự động chuyển mạch sang Groq LPU siêu tốc, và cuối cùng là OpenAI GPT. Nhờ vậy, trải nghiệm người dùng luôn liên tục.""")

# ==============================================================================
# SLIDE 10: TÍNH GIẢI THÍCH ĐƯỢC (CHƯƠNG IV)
# ==============================================================================
s10 = prs.slides.add_slide(blank_layout)
add_base_background(s10)
add_header(s10, "Chương IV: Đặc Thù & Giải Pháp AI", "Hiện Thực Hóa Tính Giải Thích Được (Explainable AI - XAI)", "Chuyển đổi AI từ 'Hộp đen' khó hiểu thành 'Chuyên gia tư vấn' truyền cảm hứng và củng cố niềm tin")

s10_cards = [
    ("🔍 TẠI SAO CẦN XAI KHI CHỌN QUÀ?", [
        ("Nỗi lo 'lệch gu':", "Người tặng thường lo lắng không biết món quà mình chọn có làm người nhận thực sự vui vẻ hay không."),
        ("Thiếu sót của sàn TMĐT:", "Các trang thương mại điện tử chỉ hiển thị sản phẩm trơ trọi, hoàn toàn không có lý giải."),
        ("Củng cố niềm tin:", "XAI cung cấp lý do thuyết phục, giúp người mua an tâm và tự tin khi trao gửi món quà.")
    ], C_PRIMARY, Inches(0.8)),
    
    ("🧩 CẤU TRÚC LỜI LÝ GIẢI AI 3 THÀNH PHẦN", [
        ("1. Phân tích sự tương thích:", "Lý giải vì sao món quà này đánh trúng sở thích, tính cách đặc thù của người nhận."),
        ("2. Ý nghĩa dịp tặng:", "Nêu bật giá trị biểu tượng của món quà đối với ngày lễ hoặc cột mốc kỷ niệm."),
        ("3. Tính thực tiễn & ngân sách:", "Đánh giá công năng sử dụng hằng ngày và tính hợp lý trong khoảng tài chính.")
    ], C_BLUE, Inches(4.8)),
    
    ("💡 HIỆN DIỆN TRỰC QUAN TRÊN GIAO DIỆN", [
        ("Biểu tượng bóng đèn:", "Mỗi thẻ sản phẩm đều tích hợp nút xem 'Lý do AI chọn món quà này'."),
        ("Hộp thoại XAI chuyên sâu:", "Khi nhấp vào, giao diện mở Modal giải thích chi tiết với câu từ tự nhiên, ấm áp."),
        ("Nâng tầm trải nghiệm:", "Biến việc mua sắm cơ học thành một hành trình kết nối cảm xúc chân thành.")
    ], C_EMERALD, Inches(8.8))
]

for title, points, color, left in s10_cards:
    card = add_card(s10, left, Inches(1.8), Inches(3.733), Inches(4.9), bg_color=C_WHITE, border_color=color)
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.2)
    tf.margin_top = Inches(0.2)
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(13.5)
    p.font.bold = True
    p.font.color.rgb = color
    
    for h, d in points:
        p = tf.add_paragraph()
        p.text = f"• {h} "
        p.font.name = "Segoe UI"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(10)
        
        run = p.add_run()
        run.text = d
        run.font.bold = False
        run.font.color.rgb = C_TEXT_MUTED

add_footer(s10, 10)
set_speaker_notes(s10, """[Thời lượng: 40 giây]
Một đóng góp quan trọng của đề tài là Hiện thực hóa tính giải thích được (Explainable AI - XAI):
Khi chọn quà, tâm lý lớn nhất của người mua là sự đắn đo: 'Tại sao lại là món này? Món này có đúng gu không?'. Các sàn TMĐT hiện nay hoàn toàn không trả lời được câu hỏi đó.
GiftAI giải quyết bằng cách: Ở mỗi món quà được gợi ý, hệ thống đều đi kèm một Hộp thoại lý giải AI gồm 3 thành phần:
Thứ nhất: Phân tích sự tương thích tâm lý và tính cách.
Thứ hai: Nêu bật ý nghĩa của món quà trong dịp kỷ niệm cụ thể.
Thứ ba: Đánh giá tính hữu dụng thực tế và tính tối ưu ngân sách.
Nhờ XAI, người tặng hiểu sâu sắc giá trị món quà và tự tin khi trao tặng.""")

# ==============================================================================
# SLIDE 11: GIAO DIỆN KHẢO SÁT WIZARD (CHÈN ẢNH SCREENSHOT THẬT)
# ==============================================================================
s11 = prs.slides.add_slide(blank_layout)
add_base_background(s11)
add_header(s11, "Chương V: Cài Đặt & Thực Nghiệm", "Giao Diện Khảo Sát Ngữ Cảnh 4 Bước (Survey Wizard)", "Hiện thực hóa trải nghiệm thu thập thông tin trực quan, tối ưu hành vi người dùng trên Web & Mobile")

c11_left = add_card(s11, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c11_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🧭 4 BƯỚC KHẢO SÁT NGỮ CẢNH TRỰC QUAN"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

steps = [
    ("Bước 1: Đối Tượng Nhận Quà:", "Chọn avatar đại diện (Người yêu, Bố mẹ, Bạn thân, Sếp...), nhập tuổi và chọn giới tính."),
    ("Bước 2: Dịp Tặng Quà:", "Phân loại trực quan các dịp đặc biệt (Sinh nhật, Valentine 14/2, Kỷ niệm ngày yêu, Giáng sinh, 8/3 - 20/10, Tân gia)."),
    ("Bước 3: Sở Thích & Tính Cách:", "Thẻ từ khóa chọn nhanh (Công nghệ, Thể thao, Nấu ăn, Nghệ thuật...) kèm ô nhập văn bản tự do."),
    ("Bước 4: Khoảng Ngân Sách:", "Thanh trượt kép thông minh (Dual Range Slider) từ 50.000đ đến 20.000.000đ hiển thị số tiền tức thì.")
]
for s_t, s_d in steps:
    p = tf.add_paragraph()
    p.text = s_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = s_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_image_box(s11, "scratch/screen1.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 5.1: Giao diện Wizard khảo sát ngữ cảnh tặng quà trên ứng dụng GiftAI")

add_footer(s11, 11)
set_speaker_notes(s11, """[Thời lượng: 40 giây]
Bước sang Chương V - Cài đặt và thực nghiệm:
Đây là Giao diện Wizard khảo sát ngữ cảnh 4 bước được hiện thực hóa thực tế trên ứng dụng:
Bước 1: Người dùng chọn đối tượng nhận quà bằng các avatar trực quan, nhập tuổi và giới tính.
Bước 2: Chọn dịp kỷ niệm như Sinh nhật, Valentine, Giáng sinh hay Tân gia.
Bước 3: Chọn các thẻ sở thích nhanh như Thích công nghệ, Nấu ăn, Thể thao hoặc gõ tự do mô tả tính cách.
Bước 4: Thiết lập khoảng ngân sách bằng thanh trượt kép Dual Range Slider rất trực quan.
Giao diện có hiệu ứng chuyển bước mượt mà và lưu tạm trạng thái để người dùng có thể quay lại chỉnh sửa bất cứ lúc nào.""")

# ==============================================================================
# SLIDE 12: KẾT QUẢ GỢI Ý & LÝ GIẢI AI (CHƯƠNG V)
# ==============================================================================
s12 = prs.slides.add_slide(blank_layout)
add_base_background(s12)
add_header(s12, "Chương V: Cài Đặt & Thực Nghiệm", "Màn Hình Hiển Thị Gợi Ý Quà & Hộp Thoại Lý Giải AI", "Trình diễn danh sách quà tặng thực tế kèm cơ chế giải thích thuyết phục và các tiện ích tương tác")

s12_features = [
    ("🛍️ DANH SÁCH QUÀ TẶNG THỰC TẾ", [
        ("Thẻ quà tặng hiện đại:", "Hiển thị đầy đủ hình ảnh sản phẩm, tên chi tiết, giá tiền đã format VNĐ và nhãn sàn thương mại điện tử (Tiki, Shopee, Lazada)."),
        ("Sản phẩm thật 100%:", "Dữ liệu được truy vấn trực tiếp từ kho TiDB Cloud, đảm bảo không có link hỏng hay giá ảo."),
        ("Mua ngay tiện lợi:", "Tích hợp nút 'Xem gian hàng' dẫn thẳng đến trang thanh toán chính thức của sản phẩm.")
    ], C_PRIMARY, Inches(0.8)),
    
    ("💬 HỘP THOẠI LÝ GIẢI AI (XAI)", [
        ("Nút 'Tại sao AI gợi ý?':", "Tích hợp icon bóng đèn trên từng thẻ quà để người dùng mở hộp thoại lý giải."),
        ("Phân tích tâm lý sâu sắc:", "Trình bày mạch lạc lý do món quà mang lại niềm vui, phù hợp dịp lễ và sở thích người nhận."),
        ("Gia tăng sự tin cậy:", "Giúp người tặng hoàn toàn yên tâm trước khi quyết định chi tiêu.")
    ], C_ACCENT_PINK, Inches(4.8)),
    
    ("❤️ TIỆN ÍCH TƯƠNG TÁC ĐI KÈM", [
        ("Thả tim yêu thích (Favorite):", "Lưu nhanh các món quà tâm đắc vào danh sách cá nhân để xem lại sau."),
        ("Tạo thiệp chúc đi kèm:", "Một nút bấm chuyển thẳng món quà sang phân hệ Thiết kế thiệp chúc mừng điện tử AI."),
        ("Lưu vết tìm kiếm:", "Tự động lưu lịch sử tìm kiếm có snapshot để tra cứu thuận tiện.")
    ], C_BLUE, Inches(8.8))
]

for title, points, color, left in s12_features:
    card = add_card(s12, left, Inches(1.8), Inches(3.733), Inches(4.9), bg_color=C_WHITE, border_color=color)
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.2)
    tf.margin_top = Inches(0.2)
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = color
    
    for h, d in points:
        p = tf.add_paragraph()
        p.text = f"• {h} "
        p.font.name = "Segoe UI"
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(8)
        
        run = p.add_run()
        run.text = d
        run.font.bold = False
        run.font.color.rgb = C_TEXT_MUTED

add_footer(s12, 12)
set_speaker_notes(s12, """[Thời lượng: 40 giây]
Sau khi bấm 'Tìm quà ngay', màn hình hiển thị danh sách quà tặng xuất hiện với 3 điểm nổi bật:
Thứ nhất: Toàn bộ sản phẩm đều là hàng thật 100% từ kho TiDB Cloud, có hình ảnh, giá bán chính xác và nút bấm dẫn thẳng tới gian hàng TMĐT chính thức.
Thứ hai: Hộp thoại lý giải AI (XAI) tích hợp ngay trên mỗi món quà, giải thích cặn kẽ tại sao món quà này lại hoàn hảo cho người nhận trong dịp lễ này.
Thứ ba: Các tiện ích đi kèm như nút Thả tim lưu vào bộ sưu tập yêu thích, và nút Tạo thiệp chúc mừng kết nối trực tiếp sang phân hệ sáng tạo thiệp.""")

# ==============================================================================
# SLIDE 13: THIỆP CHÚC MỪNG ĐIỆN TỬ AI (CHƯƠNG V)
# ==============================================================================
s13 = prs.slides.add_slide(blank_layout)
add_base_background(s13)
add_header(s13, "Chương V: Cài Đặt & Thực Nghiệm", "Phân Hệ Sáng Tạo Thiệp Chúc Mừng Điện Tử Bằng AI", "Kết hợp trí tuệ tạo sinh (Generative AI) và hiệu ứng thị giác tương tác để trao gửi trọn vẹn cảm xúc")

c13_left = add_card(s13, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_ACCENT_PINK)
tf = c13_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "💌 SÁNG TÁO LỜI CHÚC CÁ NHÂN HÓA"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

card_features = [
    ("4 Tone Giọng Cảm Xúc Linh Hoạt:", "• Chân thành & Ấm áp: Dành cho Bố Mẹ, Thầy Cô, Tri ân.\n• Hài hước & Dí dỏm: Dành cho Bạn thân, Đồng nghiệp.\n• Lãng mạn & Ngọt ngào: Dành cho Người yêu, Ngày kỷ niệm.\n• Trang trọng & Lịch thiệp: Dành cho Cấp trên, Đối tác."),
    ("Tùy Biến Trực Quan & Nhanh Chóng:", "Người dùng có thể bấm 'Sinh lại lời chúc' để AI viết phương án khác, hoặc trực tiếp gõ chỉnh sửa văn bản ngay trên khung thiệp."),
    ("Gắn Kết Món Quà Đi Kèm:", "Lời chúc được tự động liên kết với món quà đã chọn, tạo nên một gói quà hoàn chỉnh cả về vật chất lẫn tinh thần.")
]
for cf_t, cf_d in card_features:
    p = tf.add_paragraph()
    p.text = cf_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = cf_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

c13_right = add_card(s13, Inches(6.8), Inches(1.8), Inches(5.733), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf_r = c13_right.text_frame
tf_r.word_wrap = True
tf_r.margin_left = tf_r.margin_right = Inches(0.25)
tf_r.margin_top = Inches(0.2)
p = tf_r.paragraphs[0]
p.text = "🎆 TRẢI NGHIỆM THỊ GIÁC & TƯƠNG TÁC"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

visual_features = [
    ("Hiệu Ứng Pháo Hoa Mở Thiệp (Confetti):", "Khi người nhận bấm mở bức thiệp số, hiệu ứng pháo hoa tương tác bùng nổ trên màn hình, mang lại trải nghiệm mở quà xúc động và bất ngờ."),
    ("Trình Diễn Thiệp 3D Sống Động:", "Thiết kế thiệp với khung viền lãng mạn, hoa văn tinh tế mô phỏng thiệp giấy truyền thống trên nền tảng kỹ thuật số."),
    ("Chia Sẻ Đa Nền Tảng Dễ Dàng:", "• Sao chép nội dung lời chúc chỉ với 1 click.\n• Chia sẻ nhanh qua Zalo, Facebook Messenger hoặc tin nhắn SMS.\n• Lưu trữ vĩnh viễn trên đám mây.")
]
for vf_t, vf_d in visual_features:
    p = tf_r.add_paragraph()
    p.text = vf_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf_r.add_paragraph()
    p2.text = vf_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_footer(s13, 13)
set_speaker_notes(s13, """[Thời lượng: 40 giây]
Bên cạnh việc tìm quà, điểm nhân văn đặc biệt của GiftAI là Phân hệ Sáng tạo Thiệp chúc mừng điện tử bằng Generative AI:
AI tự động viết lời chúc dựa trên bối cảnh và 4 tone cảm xúc tùy chọn: từ Chân thành, Hài hước, Lãng mạn đến Trang trọng.
Người dùng có thể tự do chỉnh sửa câu từ theo ý muốn.
Đặc biệt, hệ thống tích hợp hiệu ứng pháo hoa ConfettiEffect khi mở thiệp, mô phỏng trải nghiệm bóc quà sống động. Người dùng có thể sao chép lời chúc hoặc chia sẻ đường link thiệp trực tiếp qua Zalo, Messenger.""")

# ==============================================================================
# SLIDE 14: HỘP KỶ NIỆM & APP ANDROID (CHÈN ẢNH MOBILE SCREENSHOT THẬT)
# ==============================================================================
s14 = prs.slides.add_slide(blank_layout)
add_base_background(s14)
add_header(s14, "Chương V: Cài Đặt & Thực Nghiệm", "Hộp Kỷ Niệm Ảo (Memory Box) & Ứng Dụng Android Native", "Không gian số lưu trữ kỷ niệm tình cảm và phiên bản ứng dụng di động độc lập đóng gói hoàn chỉnh")

c14_left = add_card(s14, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c14_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🎁 PHÂN HỆ HỘP KỶ NIỆM ẢO (VIRTUAL MEMORY BOX)"
p.font.name = "Segoe UI"
p.font.size = Pt(13.5)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

mbox_points = [
    ("Mã Chia Sẻ Độc Bản (MEM-XXXXXX):", "Mỗi Hộp quà kỷ niệm được cấp một mã duy nhất để gửi cho người thương mở trực tuyến."),
    ("Đếm Ngược Thời Gian Mở Quà (Time-Lock):", "Người tặng cài đặt ngày mở; trước giờ hẹn, hộp quà ở trạng thái khóa bí mật kèm đồng hồ đếm ngược từng giây."),
    ("Tích Hợp Đa Phương Tiện Cảm Xúc:", "Lưu trữ tâm thư bí mật, album hình ảnh kỷ niệm chung và đính kèm món quà đã chọn."),
    ("Ứng Dụng Android Đóng Gói Hoàn Chỉnh:", "• Biên dịch thành công tệp tin GiftAI_v1.0.apk.\n• Container WebView Chromium Native mượt mà, hỗ trợ thao tác chạm vuốt tối ưu cho thiết bị di động.")
]
for mb_t, mb_d in mbox_points:
    p = tf.add_paragraph()
    p.text = mb_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(6)
    
    p2 = tf.add_paragraph()
    p2.text = mb_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(1)

add_image_box(s14, "scratch/screen_mobile.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 5.4: Giao diện Hộp kỷ niệm ảo & Ứng dụng Android Native GiftAI")

add_footer(s14, 14)
set_speaker_notes(s14, """[Thời lượng: 40 giây]
Một tính năng rất được yêu thích khác là Hộp kỷ niệm ảo (Virtual Memory Box) và Ứng dụng di động Android:
Memory Box cho phép người dùng tạo một không gian số bí mật với mã chia sẻ độc bản định dạng MEM-XXXXXX. Người tặng có thể đặt lịch hẹn ngày mở với đồng hồ đếm ngược kịch tính, khóa bằng mật mã và gửi kèm tâm thư cùng ảnh kỷ niệm.
Đồng thời, nhóm đã biên dịch thành công ứng dụng di động độc lập GiftAI_v1.0.apk trên nền tảng Android SDK 34, mang lại trải nghiệm vuốt chạm mượt mà trên smartphone.""")

# ==============================================================================
# SLIDE 15: KIỂM THỬ CHỨC NĂNG HỆ THỐNG (CHÈN HÌNH DIAGRAM TEST MATRIX)
# ==============================================================================
s15 = prs.slides.add_slide(blank_layout)
add_base_background(s15)
add_header(s15, "Chương V: Cài Đặt & Thực Nghiệm", "Kịch Bản Kiểm Thử Chức Năng Hệ Thống (TC-01 Đến TC-08)", "Minh chứng thực nghiệm toàn diện về sự hoàn thiện, tính ổn định và mức độ sẵn sàng của các phân hệ")

c15_left = add_card(s15, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c15_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🧪 NGHIỆM THU KIỂM THỬ CHỨC NĂNG (100% PASS)"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

test_summary = [
    ("Phạm Vi Kiểm Thử Toàn Diện:", "Xây dựng và thực thi 8 bộ kịch bản kiểm thử (TC-01 đến TC-08) bao phủ toàn bộ luồng nghiệp vụ từ Frontend, Backend, AI Engine đến CSDL TiDB Cloud."),
    ("Tính Ổn Định Của Engine AI:", "Kiểm thử nghiêm ngặt cơ chế In-Memory Cache RAM, xoay vòng 4 API Keys khi chạm hạn ngạch và tự động chuyển mạch sang Groq/OpenAI khi có sự cố."),
    ("Bảo Mật & Phân Quyền:", "Kiểm thử mã hóa mật khẩu bcrypt, bảo vệ endpoint bằng JSON Web Token (JWT) và kiểm soát phân quyền người dùng / quản trị viên."),
    ("Đồng Bộ Đa Nền Tảng:", "Kiểm thử tương thích trên cả Web SPA (Vercel) và tệp cài đặt Android APK trên thiết bị di động thật.")
]
for ts_t, ts_d in test_summary:
    p = tf.add_paragraph()
    p.text = ts_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = ts_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MUTED
    p2.space_before = Pt(2)

add_image_box(s15, "scratch/assets/diagram_test_matrix.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 5.5: Ma trận kiểm thử chức năng hệ thống (TC-01 đến TC-08)")

add_footer(s15, 15)
set_speaker_notes(s15, """[Thời lượng: 40 giây]
Về mặt kiểm thử hệ thống tại Mục 5.3 của Báo cáo:
Nhóm đã xây dựng và thực thi 8 kịch bản kiểm thử chức năng cốt lõi từ TC-01 đến TC-08, bao phủ toàn bộ vòng đời hoạt động của ứng dụng:
- TC-01 và TC-02: Kiểm tra khả năng trích xuất ý định AI và lọc sản phẩm theo đúng ngân sách từ TiDB Cloud.
- TC-03 và TC-04: Kiểm thử cơ chế Cache RAM, xoay vòng API Keys và chuyển mạch dự phòng sang Groq.
- TC-05 và TC-06: Kiểm thử sinh thiệp chúc mừng và quy trình khóa/mở Hộp kỷ niệm ảo.
- TC-07 và TC-08: Kiểm thử xác thực bảo mật JWT và vận hành trên ứng dụng Android APK.
Kết quả: Toàn bộ 8/8 kịch bản kiểm thử đều đạt trạng thái PASSED 100%.""")

# ==============================================================================
# SLIDE 16: ĐÁNH GIÁ MỨC ĐỘ HOÀN THÀNH & SO SÁNH ĐỐI CHUẨN (CHƯƠNG VI)
# ==============================================================================
s16 = prs.slides.add_slide(blank_layout)
add_base_background(s16)
add_header(s16, "Chương VI: Kết Quả & Đánh Giá", "Đánh Giá Mức Độ Hoàn Thành & So Sánh Đối Chuẩn (Benchmarking)", "Khẳng định mức độ hoàn thiện đề tài so với mục tiêu ban đầu và ưu thế cạnh tranh vượt trội của GiftAI")

c16_left = add_card(s16, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_WHITE, border_color=C_PRIMARY)
tf = c16_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🎯 ĐỐI CHIẾU MỨC ĐỘ HOÀN THÀNH (BẢNG 6.1)"
p.font.name = "Segoe UI"
p.font.size = Pt(13.5)
p.font.bold = True
p.font.color.rgb = C_PRIMARY

targets_eval = [
    ("MT-01 (Ngữ Cảnh 7D):", "Xây dựng thành công Wizard 4 bước trực quan, chuẩn hóa vector ngữ cảnh đầu vào -> HOÀN THÀNH 100%."),
    ("MT-02 (Trích Xuất Ý Định):", "Quy trình Prompt Pha 1 ép kiểu JSON qua Gemini 3.8 Flash -> HOÀN THÀNH 100%."),
    ("MT-03 (Tái Xếp Hạng):", "Màng lọc ngữ nghĩa Pha 2 kết hợp kho 2.390+ sản phẩm thật TiDB -> HOÀN THÀNH 100%."),
    ("MT-04 (Kiến Trúc AI 4 Tầng):", "Vận hành bền bỉ với Cache RAM, 4 Keys xoay vòng & Fallback -> HOÀN THÀNH 100%."),
    ("MT-05 (Tiện Ích Cảm Xúc):", "Sinh thiệp AI 4 tone cảm xúc & Hộp kỷ niệm ảo đếm ngược -> HOÀN THÀNH 100%."),
    ("MT-06 (Triển Khai Đa Nền Tảng):", "Vận hành đồng bộ trên Vercel, Render và Android APK -> HOÀN THÀNH 100%.")
]
for te_t, te_d in targets_eval:
    p = tf.add_paragraph()
    p.text = te_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK
    p.space_before = Pt(5)
    run = p.add_run()
    run.text = f" {te_d}"
    run.font.bold = False
    run.font.color.rgb = C_TEXT_MUTED

add_image_box(s16, "scratch/assets/diagram_benchmarking.png", Inches(6.6), Inches(1.8), Inches(5.933), Inches(4.9), caption="Hình 6.1: Bảng so sánh đối chuẩn giữa GiftAI và các giải pháp hiện hữu")

add_footer(s16, 16)
set_speaker_notes(s16, """[Thời lượng: 45 giây]
Tại Chương VI - Kết quả và đánh giá:
Nhóm tiến hành đối chiếu nghiêm túc các kết quả thực tế với 6 mục tiêu đã cam kết ban đầu tại Bảng 6.1 của Báo cáo. Tất cả 6 mục tiêu từ MT-01 đến MT-06 đều đã được hoàn thành 100% đúng đặc tả kỹ thuật.
Đồng thời, khi so sánh đối chuẩn (Benchmarking) với 3 giải pháp phổ biến hiện nay:
- So với tìm kiếm sàn TMĐT: GiftAI vượt trội nhờ hiểu ngữ cảnh cảm xúc đa chiều và loại bỏ tạp phẩm.
- So với Chatbot AI thông thường: GiftAI cung cấp sản phẩm thật 100% có giá bán và link mua chính xác, triệt tiêu ảo giác.
- So với Website/Blog tĩnh: GiftAI tự động cập nhật sản phẩm và cá nhân hóa riêng biệt cho từng người nhận.""")

# ==============================================================================
# SLIDE 17: ƯU ĐIỂM, HẠN CHẾ & HƯỚNG PHÁT TRIỂN (CHƯƠNG VI & VII)
# ==============================================================================
s17 = prs.slides.add_slide(blank_layout)
add_base_background(s17)
add_header(s17, "Chương VI & VII: Đánh Giá & Hướng Phát Triển", "Ưu Điểm Nổi Bật, Hạn Chế Còn Tồn Tại & Lộ Trình Nâng Cấp", "Nhìn nhận khách quan kết quả nghiên cứu và định hướng phát triển thực tiễn trong tương lai")

c17_cards = [
    ("⭐ ƯU ĐIỂM NỔI BẬT (STRENGTHS)", [
        ("Kiến trúc 4 tầng bền vững:", "Hệ thống vận hành chịu lỗi cao, xoay vòng API Keys và Fallback thông minh, không bao giờ sập nguồn."),
        ("Triết lý Hybrid độc đáo:", "Kết hợp hoàn hảo giữa năng lực suy luận của AI và kho 2.390+ sản phẩm thật trên TiDB Cloud."),
        ("Tính giải thích minh bạch (XAI):", "Tạo niềm tin và sự an tâm tuyệt đối cho người tặng bằng lý lẽ thuyết phục."),
        ("Đa nền tảng Web & Mobile:", "Đồng bộ trải nghiệm liền mạch trên cả trình duyệt Web và ứng dụng Android APK.")
    ], C_EMERALD, Inches(0.8)),
    
    ("⚠️ HẠN CHẾ CÒN TỒN TẠI (LIMITATIONS)", [
        ("Phương thức nhập liệu:", "Hiện tại mới hỗ trợ nhập liệu qua văn bản và form khảo sát, chưa có tìm kiếm bằng giọng nói hay hình ảnh."),
        ("Phụ thuộc API bên ngoài:", "Độ trễ xử lý trong trường hợp Cache Miss vẫn phụ thuộc vào đường truyền kết nối của các nhà cung cấp LLM."),
        ("Tính biến động sản phẩm:", "Kho dữ liệu cào tự động cần định kỳ quét lại để cập nhật tình trạng tồn kho từ các sàn thương mại.")
    ], C_AMBER, Inches(4.8)),
    
    ("🚀 HƯỚNG PHÁT TRIỂN (ROADMAP)", [
        ("Ngắn hạn (3 - 6 tháng):", "• Tích hợp Multimodal Vision AI: Phân tích ảnh đại diện người nhận để suy đoán gu thẩm mỹ.\n• Tự động gửi thông báo SMS/Zalo nhắc trước ngày kỷ niệm 3 ngày."),
        ("Dài hạn (6 - 12 tháng):", "• Xây dựng bộ dữ liệu và Fine-tune mô hình LLM chuyên sâu về văn hóa quà tặng người Việt.\n• Mở cổng kết nối API trực tiếp cho các xưởng quà thủ công Handmade đăng ký gian hàng.")
    ], C_BLUE, Inches(8.8))
]

for title, points, color, left in c17_cards:
    card = add_card(s17, left, Inches(1.8), Inches(3.733), Inches(4.9), bg_color=C_WHITE, border_color=color)
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.2)
    tf.margin_top = Inches(0.2)
    
    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = color
    
    for h, d in points:
        p = tf.add_paragraph()
        p.text = f"• {h} "
        p.font.name = "Segoe UI"
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK
        p.space_before = Pt(8)
        
        run = p.add_run()
        run.text = d
        run.font.bold = False
        run.font.color.rgb = C_TEXT_MUTED

add_footer(s17, 17)
set_speaker_notes(s17, """[Thời lượng: 45 giây]
Nhìn nhận một cách khoa học và khách quan về đề tài:
Về ưu điểm: GiftAI sở hữu kiến trúc Cloud 4 tầng bền bỉ, giải pháp Hybrid chống ảo giác triệt để, tính giải thích XAI minh bạch và đóng gói trọn vẹn cả Web lẫn ứng dụng Android.
Về hạn chế: Hệ thống hiện tại chủ yếu tiếp nhận thông tin qua form văn bản và còn phụ thuộc vào đường truyền mạng khi gọi API ngoài.
Về lộ trình nâng cấp:
Trong ngắn hạn, nhóm dự kiến tích hợp Multimodal Vision AI để người dùng có thể tải ảnh người nhận lên cho AI phân tích gu thời trang, đồng thời bổ sung tính năng tự động gửi SMS/Zalo nhắc trước ngày lễ.
Trong dài hạn, nhóm hướng tới Fine-tune một mô hình ngôn ngữ chuyên biệt am hiểu sâu sắc văn hóa quà tặng Việt Nam.""")

# ==============================================================================
# SLIDE 18: TỔNG KẾT & LỜI CẢM ƠN (CHƯƠNG VII - DARK THEME)
# ==============================================================================
s18 = prs.slides.add_slide(blank_layout)
add_base_background(s18, is_dark=True)
add_header(s18, "Chương VII: Kết Luận", "Tổng Kết Đóng Góp Của Đề Tài & Lời Cảm Ơn", "GiftAI - Nền tảng trao gửi yêu thương và gắn kết cảm xúc trong kỷ nguyên Trí tuệ Nhân tạo", is_dark=True)

c18_left = add_card(s18, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9), bg_color=C_DARK_CARD, border_color=C_PRIMARY)
tf = c18_left.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = Inches(0.25)
tf.margin_top = Inches(0.2)
p = tf.paragraphs[0]
p.text = "🏆 ĐÓNG GÓP NỔI BẬT CỦA ĐỒ ÁN"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_PRIMARY_LIGHT

contributions = [
    ("Về Mặt Khoa Học & Mô Hình Hóa:", "Mô hình hóa thành công bài toán 'Nghịch lý người mua không phải người thụ hưởng' (Buyer vs. Consumer Gap) dưới dạng không gian ràng buộc 7 chiều, giải quyết triệt để vấn đề Cold-Start."),
    ("Về Mặt Kỹ Thuật & Kiến Trúc Phần Mềm:", "Hiện thực hóa hoàn chỉnh quy trình Prompt Engineering hai pha, kết hợp màng lọc Re-ranking ngữ nghĩa và kiến trúc AI 4 tầng chịu lỗi cao vận hành 24/7."),
    ("Về Mặt Ứng Dụng Thực Tiễn:", "Xây dựng hoàn chỉnh hệ sinh thái Full-Stack: Web Single Page App trên Vercel, Backend API trên Render, CSDL TiDB Cloud và đóng gói ứng dụng di động Android APK (GiftAI_v1.0.apk) thực tế.")
]
for c_t, c_d in contributions:
    p = tf.add_paragraph()
    p.text = c_t
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.space_before = Pt(8)
    
    p2 = tf.add_paragraph()
    p2.text = c_d
    p2.font.name = "Segoe UI"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_LIGHT_MUTED
    p2.space_before = Pt(2)

c18_right = add_card(s18, Inches(6.8), Inches(1.8), Inches(5.733), Inches(4.9), bg_color=C_DARK_CARD, border_color=C_ACCENT_PINK)
tf_r = c18_right.text_frame
tf_r.word_wrap = True
tf_r.margin_left = tf_r.margin_right = Inches(0.25)
tf_r.margin_top = Inches(0.2)
p = tf_r.paragraphs[0]
p.text = "🙏 LỜI TRI ÂN & PHIÊN HỎI ĐÁP (Q&A)"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = C_ACCENT_PINK

p = tf_r.add_paragraph()
p.text = "Lời cảm ơn chân thành:"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = C_WHITE
p.space_before = Pt(8)

p2 = tf_r.add_paragraph()
p2.text = "Nhóm chúng em xin bày tỏ lòng biết ơn sâu sắc nhất đến Thầy TS. Đỗ Phúc Hảo đã tận tình định hướng, chia sẻ kiến thức chuyên môn và chỉ dẫn nhóm trong suốt quá trình nghiên cứu và hoàn thành đồ án.\n\nChúng em cũng xin trân trọng cảm ơn quý Thầy Cô trong Khoa Công nghệ Thông tin - Trường Đại học Kiến trúc Đà Nẵng đã truyền đạt nền tảng kiến thức quý báu và tạo điều kiện thuận lợi nhất cho chúng em."
p2.font.name = "Segoe UI"
p2.font.size = Pt(11)
p2.font.color.rgb = C_TEXT_LIGHT_MUTED
p2.space_before = Pt(3)

p3 = tf_r.add_paragraph()
p3.text = "✨ KÍNH MỜI QUÝ THẦY CÔ ĐẶT CÂU HỎI ✨"
p3.alignment = PP_ALIGN.CENTER
p3.font.name = "Segoe UI"
p3.font.size = Pt(14)
p3.font.bold = True
p3.font.color.rgb = C_PRIMARY_LIGHT
p3.space_before = Pt(18)

add_footer(s18, 18, is_dark=True)
set_speaker_notes(s18, """[Thời lượng: 40 giây]
Kính thưa Thầy TS. Đỗ Phúc Hảo cùng toàn thể quý Thầy Cô trong Hội đồng.
Tổng kết lại, đồ án GiftAI đã hoàn thành trọn vẹn cả về mặt học thuật mô hình hóa lẫn hiện thực hóa kỹ thuật thực tế với hệ sinh thái đầy đủ từ Web, Cloud API đến Ứng dụng di động Android.
Nhóm chúng em xin gửi lời cảm ơn chân thành và sâu sắc nhất đến Thầy TS. Đỗ Phúc Hảo cùng quý Thầy Cô trong Khoa Công nghệ Thông tin đã tận tình chỉ dạy và định hướng cho chúng em.
Chúng em xin chân thành cảm ơn quý Thầy Cô đã lắng nghe và rất mong nhận được những câu hỏi, ý kiến đóng góp quý báu từ Hội đồng! Nhóm xin trân trọng cảm ơn.""")

# Save Presentation
output_path = "BaoCao_DoAn/Slide_ThuyetTrinh_GiftAI.pptx"
prs.save(output_path)
print(f"Presentation saved successfully to: {output_path}")
