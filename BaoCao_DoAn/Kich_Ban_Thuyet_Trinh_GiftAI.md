# 🎙️ KỊCH BẢN THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN GIFTAI

> **Đề tài:** Hệ Thống Gợi Ý Quà Tặng Thông Minh Ứng Dụng Trí Tuệ Nhân Tạo (GiftAI)  
> **Sinh viên thực hiện:** Nguyễn Thiện Quân & Nguyễn Việt Quang (Lớp 23CT2)  
> **Giảng viên hướng dẫn:** ThS. Đỗ Phúc Hảo  
> **Tổng thời lượng:** 10 - 12 phút (18 slides, trung bình 35 - 45 giây / slide)  
> **Tệp trình chiếu PowerPoint:** [`Slide_ThuyetTrinh_GiftAI.pptx`](./Slide_ThuyetTrinh_GiftAI.pptx)

---

## 📑 MỤC LỤC BÀI THUYẾT TRÌNH
1. **Slide 1:** Trang bìa báo cáo & Giới thiệu thành viên
2. **Slide 2:** Bối cảnh thực tiễn & 3 thách thức lớn khi chọn quà
3. **Slide 3:** Mục tiêu đề tài & Triết lý giải pháp Hybrid
4. **Slide 4:** Kiến trúc phân tầng tổng thể Cloud-Native (4 tầng)
5. **Slide 5:** Ngăn xếp công nghệ cốt lõi (Full Tech Stack)
6. **Slide 6:** Thiết kế CSDL phân tán (TiDB Cloud 6 bảng chuẩn 3NF)
7. **Slide 7:** Mô hình hóa 10 ca sử dụng trọng tâm (Use Cases)
8. **Slide 8:** Quy trình Prompt Engineering hai pha (Two-Phase)
9. **Slide 9:** Kiến trúc vận hành 4 tầng của AI Engine (Chịu lỗi cao)
10. **Slide 10:** Hiện thực hóa tính giải thích được (Explainable AI - XAI)
11. **Slide 11:** Giao diện khảo sát ngữ cảnh 4 bước (Survey Wizard)
12. **Slide 12:** Màn hình hiển thị gợi ý quà & Hộp thoại lý giải AI
13. **Slide 13:** Phân hệ sáng tạo thiệp chúc mừng điện tử bằng AI
14. **Slide 14:** Hộp kỷ niệm ảo (Memory Box) & Ứng dụng Android APK
15. **Slide 15:** Kết quả kiểm thử chức năng, độ trễ và chịu tải
16. **Slide 16:** Đánh giá thực nghiệm màng lọc AI & Thang đo chuẩn SUS
17. **Slide 17:** So sánh đối chuẩn (Benchmarking) & Tiềm năng thương mại hóa
18. **Slide 18:** Tổng kết đóng góp đề tài, lời cảm ơn & Q&A

---

## 🎤 CHI TIẾT KỊCH BẢN TỪNG SLIDE

### 📌 SLIDE 1: TRANG BÌA BÁO CÁO (40 giây)
* **Slide hiển thị:** Logo trường, tên đề tài "GiftAI", thông tin GVHD và 2 sinh viên thực hiện.
* **Lời thoại thuyết trình:**
> "Kính thưa Thầy ThS. Đỗ Phúc Hảo cùng toàn thể quý Thầy Cô trong Hội đồng chấm đồ án tốt nghiệp.  
> Hôm nay, nhóm chúng em gồm hai thành viên: Nguyễn Thiện Quân và Nguyễn Việt Quang, sinh viên lớp 23CT2, xin phép được báo cáo đồ án học phần Trí tuệ Nhân tạo với đề tài:  
> **'Xây dựng hệ thống tìm quà tặng cho người thân yêu - GiftAI'**.  
> Đề tài ra đời nhằm giải quyết bài toán nan giải trong đời sống: làm sao chọn được món quà chuẩn gu, đúng tâm lý và sát ngân sách cho từng đối tượng trong vô vàn dịp đặc biệt, bằng cách kết hợp sức mạnh suy luận của LLM cùng kho dữ liệu thực tế hơn **2.390 sản phẩm**. Sau đây em xin bắt đầu phần trình bày."

---

### 📌 SLIDE 2: BỐI CẢNH THỰC TIỄN & 3 THÁCH THỨC KHI CHỌN QUÀ (45 giây)
* **Slide hiển thị:** 3 cột thách thức: Quá tải thông tin, Nghịch lý mua ≠ thụ hưởng, Đa ràng buộc phức tạp.
* **Lời thoại thuyết trình:**
> "Thưa Thầy Cô, khi chọn quà, người tiêu dùng hiện đại đối mặt với 3 thách thức lớn:  
> * **Thứ nhất là Quá tải thông tin:** Các sàn TMĐT có hàng triệu món hàng nhưng công cụ tìm kiếm chỉ so khớp từ khóa cơ học, hoàn toàn vô cảm với cảm xúc và ngữ cảnh.  
> * **Thứ hai là Nghịch lý người mua không phải người thụ hưởng:** Người tặng mua cho bố mẹ, bạn bè hay người yêu - những người có gu khác biệt, khiến lịch sử mua sắm cá nhân bị vô hiệu hóa, thuật toán lọc cộng tác truyền thống bị tê liệt trước bài toán Cold-Start.  
> * **Thứ ba là Đa ràng buộc phức tạp:** Phải dung hòa cùng lúc Đối tượng (từ Bố, Mẹ, Anh Chị Em, Người yêu, đến cả Người yêu cũ), Dịp tặng, Ngân sách và Sở thích. Đó chính là lý do GiftAI ra đời."

---

### 📌 SLIDE 3: MỤC TIÊU ĐỀ TÀI & TRIẾT LÝ GIẢI PHÁP HYBRID (45 giây)
* **Slide hiển thị:** Triết lý Hybrid và 6 mục tiêu kỹ thuật cốt lõi (Bảng 6.1).
* **Lời thoại thuyết trình:**
> "Để giải quyết triệt để 3 thách thức trên, GiftAI được xây dựng theo **Triết lý Hybrid** độc đáo:  
> Chúng em không để AI tự 'bịa' ra sản phẩm vì dễ gặp ảo giác Hallucination tạo link hỏng. Thay vào đó, AI đóng vai trò 'Bộ não tư vấn tâm lý' và 'Màng lọc ngữ nghĩa' cho kho sản phẩm thật.  
> Đồ án xác định 6 mục tiêu kỹ thuật rõ ràng:  
> 1. Trích xuất ý định người dùng thành JSON chuẩn.  
> 2. Quản trị kho **2.390+ sản phẩm thật** trên TiDB Cloud.  
> 3. Tái xếp hạng đạt độ chính xác **94.2%**.  
> 4. Vận hành chịu lỗi cao với kiến trúc 4 tầng.  
> 5. Cung cấp tiện ích thiệp AI & Hộp kỷ niệm ảo.  
> 6. Đóng gói triển khai đa nền tảng Web & Android Native."

---

### 📌 SLIDE 4: KIẾN TRÚC PHÂN TẦNG CLOUD-NATIVE (40 giây)
* **Slide hiển thị:** Sơ đồ 4 tầng phân tán: Presentation, Application, AI & Crawler, Data Tier.
* **Lời thoại thuyết trình:**
> "Về mặt kiến trúc, GiftAI được thiết kế theo mô hình 4 tầng phân tán hoàn toàn trên nền tảng Cloud-native:  
> * **Tầng 1 - Presentation:** Web React 19 chạy trên Vercel Edge và ứng dụng Android gốc đóng gói file APK.  
> * **Tầng 2 - Application:** Máy chủ Node.js Express trên Render, xử lý định tuyến RESTful, xác thực JWT và bộ đệm In-Memory Semantic Cache.  
> * **Tầng 3 - AI Engine:** Tích hợp Google Gemini 3.8 Flash làm bộ não chính, kết hợp Groq LPU dự phòng tức thời và module cào dữ liệu tự động.  
> * **Tầng 4 - Data Tier:** CSDL phân tán TiDB Cloud tại Singapore kết nối qua cổng bảo mật SSL/TLSv1.2, đảm bảo toàn vẹn dữ liệu và độ trễ thấp."

---

### 📌 SLIDE 5: NGĂN XẾP CÔNG NGHỆ CỐT LÕI (40 giây)
* **Slide hiển thị:** 6 khối công nghệ: React 19, Android Java, Node.js Express, TiDB Cloud, Google Gemini + Groq, Selenium Crawler.
* **Lời thoại thuyết trình:**
> "Toàn bộ ngăn xếp công nghệ được chọn lọc khắt khe:  
> Ở Frontend, nhóm ứng dụng React 19, TypeScript và Vite, tối ưu tốc độ tải trang dưới 0.8 giây; phía Mobile là container Android Native WebView chuẩn Edge-to-Edge.  
> Ở Backend, Node.js kết hợp TiDB Cloud Serverless tương thích MySQL 8.0 qua connection pool 10 luồng.  
> Đặc biệt ở tầng AI, nhóm kết hợp **Google Gemini 3.8 Flash** cùng **Groq LPU** siêu tốc (200+ token/giây) và bộ cào dữ liệu tự động thu thập hơn **2.390 sản phẩm thực tế** từ Tiki, Shopee và Lazada."

---

### 📌 SLIDE 6: THIẾT KẾ CƠ SỞ DỮ LIỆU PHÂN TÁN (45 giây)
* **Slide hiển thị:** Lược đồ quan hệ thực thể ERD và thông số 6 bảng CSDL.
* **Lời thoại thuyết trình:**
> "Cơ sở dữ liệu của GiftAI gồm 6 bảng chính đạt chuẩn 3NF trên TiDB Cloud:  
> * Bảng `scraped_products` lưu hơn 2.390 sản phẩm với khóa UNIQUE hash URL chống trùng lặp, đánh index đa chiều theo category và search_keyword.  
> * Bảng `users` bảo mật mật khẩu với thuật toán bcrypt 10 vòng, phân quyền user và admin rõ ràng.  
> * Bảng `search_history` lưu vết phiên tìm kiếm kèm snapshot JSON, giúp người dùng xem lại mà không cần JOIN bảng nặng nề.  
> * Cùng các bảng `product_recommendation_stats` đo lường CTR, `user_favorites` lưu quà yêu thích, và `memory_boxes` quản lý hộp kỷ niệm ảo với mã chia sẻ độc bản MEM-XXXXXX."

---

### 📌 SLIDE 7: MÔ HÌNH HÓA 10 CA SỬ DỤNG TRỌNG TÂM (40 giây)
* **Slide hiển thị:** Sơ đồ Use Case giữa Khách vãng lai, Người dùng đã đăng nhập và Quản trị viên.
* **Lời thoại thuyết trình:**
> "Hệ thống được quy chuẩn thành 10 ca sử dụng trọng tâm:  
> * **8 ca sử dụng phía Người dùng:** Tìm kiếm quà tặng đa tiêu chí mở tự do cho khách vãng lai; khi người dùng muốn lưu quà yêu thích, xem lại lịch sử cá nhân hay tạo hộp kỷ niệm thì hệ thống kích hoạt xác thực JWT an toàn.  
> * **2 ca sử dụng phía Quản trị viên:** Bảng điều khiển Admin Dashboard trực quan theo dõi số lượt tìm kiếm, biểu đồ tỷ lệ nhấp chuột CTR thời gian thực và giám sát trạng thái kho sản phẩm."

---

### 📌 SLIDE 8: QUY TRÌNH PROMPT ENGINEERING HAI PHA (45 giây)
* **Slide hiển thị:** Sơ đồ Two-Phase: Intent Extraction (Pha 1) -> DB Query -> Semantic Re-Ranking (Pha 2).
* **Lời thoại thuyết trình:**
> "Trọng tâm giải pháp AI của GiftAI là **Quy trình Prompt Engineering hai pha (Two-Phase)**:  
> * **Pha 1 - Intent Extraction:** AI tiếp nhận hồ sơ người nhận, phân tích tâm lý sâu sắc và bóc tách thành từ khóa tìm kiếm mục tiêu. Điểm đặc biệt là AI hiểu rõ từng đối tượng: với Bố Mẹ sẽ ưu tiên sức khỏe, với Em trai sẽ ưu tiên gaming/lego, và với **Người yêu cũ** sẽ ưu tiên quà chữa lành/tinh tế, tuyệt đối cấm quà lãng mạn.  
> * **Cầu nối dữ liệu:** Backend dùng từ khóa của Pha 1 query kho 2.390+ sản phẩm thật từ TiDB Cloud.  
> * **Pha 2 - Semantic Re-ranking:** AI duyệt qua danh sách ứng viên, loại bỏ hoàn toàn hàng rác/phụ kiện và sinh lời giải thích vì sao món quà này đáng mua."

---

### 📌 SLIDE 9: KIẾN TRÚC VẬN HÀNH 4 TẦNG CHỊU LỖI CAO CỦA AI ENGINE (45 giây)
* **Slide hiển thị:** 4 tầng: Semantic Memory Cache -> Multi-Key Modulo -> Multi-AI Fallback -> Rule-based Fallback.
* **Lời thoại thuyết trình:**
> "Để giải quyết bài toán nghẽn hạn mức API miễn phí (Rate Limit 429), nhóm đã xây dựng kiến trúc AI Engine 4 tầng chịu lỗi cao:  
> * **Tầng 1 - Semantic Memory Cache:** Lưu phản hồi trong RAM với thời gian sống TTL 30 phút, phản hồi tức thì dưới 10 mili-giây cho các truy vấn lặp lại.  
> * **Tầng 2 - Multi-Key Rotation:** Tự động xoay vòng danh sách API key theo thuật toán Modulo, nhân gấp 4 lần hạn mức xử lý.  
> * **Tầng 3 - Multi-AI Fallback:** Tự động chuyển mạch sang Groq LPU (Llama 3.3) hoặc OpenRouter nếu toàn bộ key Gemini chạm ngưỡng quá tải.  
> * **Tầng 4 - Rule-based Fallback:** Cơ chế dự phòng bằng thuật toán luật cứng, đảm bảo hệ thống không bao giờ trả về trang trắng."

---

### 📌 SLIDE 10: HIỆN THỰC HÓA TÍNH GIẢI THÍCH ĐƯỢC (EXPLAINABLE AI - XAI) (40 giây)
* **Slide hiển thị:** XAI ở 2 cấp độ: Macro Summary và Micro Reasoning Callout.
* **Lời thoại thuyết trình:**
> "Trong GiftAI, chúng em hiện thực hóa nguyên lý Explainable AI (XAI) ở 2 cấp độ:  
> * **Cấp độ vĩ mô:** Đoạn tóm tắt tâm lý chung ngay đầu trang, phân tích lý do vì sao người nhận ở độ tuổi và mối quan hệ đó lại cần những nhóm quà tặng này.  
> * **Cấp độ vi mô:** Mỗi sản phẩm đều được gắn một hộp thoại AI Reasoning Callout màu tím nổi bật, chỉ rõ tại sao món quà này khớp với sở thích và ngân sách.  
> Khảo sát thực tế cho thấy **86.7% người dùng** đánh giá cao tính năng này vì nó mang lại sự an tâm và lý do thuyết phục trước khi quyết định chi tiền."

---

### 📌 SLIDE 11: GIAO DIỆN KHẢO SÁT NGỮ CẢNH 4 BƯỚC (SURVEY WIZARD) (45 giây)
* **Slide hiển thị:** Ảnh chụp thực tế màn hình Web GiftAI và 4 bước nhập liệu trực quan.
* **Lời thoại thuyết trình:**
> "Chuyển sang Chương V về sản phẩm thực tế, hình bên phải là ảnh chụp màn hình ứng dụng Web GiftAI đang chạy trực tiếp trên Vercel:  
> Giao diện Wizard 4 bước được thiết kế tối giản nhận thức (Cognitive Ease):  
> * **Bước 1** hỗ trợ đầy đủ mọi đối tượng: Bố, Mẹ, Anh trai, Em trai, Chị gái, Em gái, Bạn gái, Bạn trai, Vợ, Chồng và cả Người yêu cũ.  
> * **Bước 2** bao quát các dịp lễ: từ 20/10, 8/3, Valentine 14/2 & 14/3, Ngày của Mẹ/Cha đến Tết, Giáng sinh, Tốt nghiệp, Khai trương, 1/6.  
> * **Bước 3** là thẻ sở thích chọn nhanh.  
> * **Bước 4** là thanh chọn ngân sách linh hoạt. Toàn bộ thao tác hoàn thành chỉ trong dưới 30 giây."

---

### 📌 SLIDE 12: MÀN HÌNH HIỂN THỊ GỢI Ý QUÀ & HỘP THOẠI LÝ GIẢI AI (40 giây)
* **Slide hiển thị:** Smart Card sản phẩm, nhãn sàn TMĐT, khối AI Reasoning Callout, nút Mua hàng.
* **Lời thoại thuyết trình:**
> "Sau khi AI hoàn tất suy luận và tái xếp hạng từ TiDB Cloud, màn hình hiển thị danh sách quà tặng trực quan:  
> Mỗi thẻ quà tặng gồm hình ảnh sắc nét, tên sản phẩm chuẩn hóa, giá tiền thực tế và logo xuất xứ sàn TMĐT.  
> Ngay dưới mỗi sản phẩm là hộp thoại AI Reasoning Callout màu tím hoàng gia, giải thích cặn kẽ tại sao món quà này lại đúng tâm lý người nhận.  
> Người dùng có thể bấm nút 'Thả tim' để lưu vào danh sách yêu thích, hoặc nhấp 'Mua hàng' để chuyển thẳng tới sàn thương mại điện tử chính chủ."

---

### 📌 SLIDE 13: PHÂN HỆ SÁNG TẠO THIỆP CHÚC MỪNG ĐIỆN TỬ BẰNG AI (40 giây)
* **Slide hiển thị:** Giao diện live preview thiệp chúc mừng, các style thiệp và tông giọng AI.
* **Lời thoại thuyết trình:**
> "Bên cạnh tìm quà, GiftAI cung cấp tiện ích gia tăng cảm xúc: Phân hệ tạo thiệp chúc mừng điện tử bằng AI.  
> Người dùng có thể chọn các tông giọng: Chân thành, Lãng mạn, Hài hước hoặc Thơ 4 câu ý nghĩa. AI sinh lời chúc độc bản chỉ trong 1.5 giây dựa trên ngữ cảnh người nhận.  
> Khi mở liên kết thiệp, hệ thống kích hoạt hiệu ứng pháo hoa bung nở cùng giao diện thiệp sang trọng, cho phép người dùng tải ảnh thiệp chất lượng cao hoặc sao chép lời chúc dễ dàng."

---

### 📌 SLIDE 14: HỘP KỶ NIỆM ẢO (MEMORY BOX) & ỨNG DỤNG ANDROID APK (40 giây)
* **Slide hiển thị:** Tính năng Memory Box, mã chia sẻ MEM-XXXXXX và ảnh chụp ứng dụng Android APK.
* **Lời thoại thuyết trình:**
> "Một tính năng rất độc đáo của đồ án là Hộp kỷ niệm ảo (Memory Box). Người dùng có thể tạo một hộp quà trực tuyến gồm tâm thư, món quà kèm đồng hồ đếm xuôi ngày yêu nhau hoặc đếm ngược đến dịp kỷ niệm.  
> Hệ thống cấp mã định danh độc bản như MEM-9K2F7A để chia sẻ nhanh qua Zalo, Messenger mà người nhận không cần cài đặt phức tạp.  
> Song song đó, nhóm đã hoàn thiện ứng dụng Android gốc (tệp APK GiftAI_v1.0), hiển thị mượt mà trên mọi thiết bị di động như hình bên phải."

---

### 📌 SLIDE 15: KẾT QUẢ KIỂM THỬ CHỨC NĂNG, ĐỘ TRỄ VÀ CHỊU TẢI (45 giây)
* **Slide hiển thị:** Biểu đồ độ trễ và tỷ lệ chịu tải RPS.
* **Lời thoại thuyết trình:**
> "Về kết quả kiểm thử thực nghiệm:  
> * **Kiểm thử chức năng:** Toàn bộ 8 ca kiểm thử trọng yếu từ đăng ký, lọc ngân sách, gọi API AI đến xoay vòng khóa đều đạt **100% PASS**.  
> * **Thời gian đáp ứng:** Khi trúng Cache RAM, hệ thống phản hồi siêu tốc chỉ **3-8 mili-giây**. Khi gọi Gemini kết hợp truy vấn TiDB, thời gian trung bình là 2.42 giây; và chỉ 1.78 giây qua Groq LPU.  
> * **Kiểm thử tải:** Với 1 API key duy nhất, hệ thống gặp lỗi quá tải 38% ở mức 15 req/phút. Nhưng khi kích hoạt Multi-Key Rotation kết hợp Fallback, hệ thống chịu tải mượt mà **55 req/phút** với độ tin cậy đạt **99.8%**."

---

### 📌 SLIDE 16: ĐÁNH GIÁ THỰC NGHIỆM MÀNG LỌC AI & THANG ĐO CHUẨN SUS (45 giây)
* **Slide hiển thị:** Biểu đồ tỷ lệ lọc rác (46.8% rác -> 94.2% chuẩn) và điểm SUS đạt 84.6/100 (Grade A) theo Bảng 6.1.
* **Lời thoại thuyết trình:**
> "Để chứng minh giá trị thực sự của AI, chúng em đã làm thực nghiệm đối chứng:  
> Nếu chỉ lấy dữ liệu thô cào từ sàn TMĐT thì có tới gần một nửa (46.8%) là hàng rác, ốp lưng, phụ kiện do người bán nhồi từ khóa. Sau khi đưa qua màng lọc ngữ nghĩa Pha 2 của Gemini, độ chính xác quà tặng tăng vọt lên **94.2%**.  
> Về trải nghiệm người dùng, nhóm khảo sát 30 người dùng thực tế theo thang đo chuẩn quốc tế SUS (System Usability Scale). Kết quả đạt **84.6/100 điểm**, thuộc Grade A - Mức xuất sắc, vượt xa chuẩn trung bình ngành là 68 điểm."

---

### 📌 SLIDE 17: SO SÁNH ĐỐI CHUẨN & TIỀM NĂNG THƯƠNG MẠI HÓA (40 giây)
* **Slide hiển thị:** Bảng so sánh GiftAI vs TMĐT vs Chatbot vs Blog, và 3 trụ cột doanh thu.
* **Lời thoại thuyết trình:**
> "So sánh với các giải pháp hiện nay:  
> Sàn TMĐT thì tìm kiếm máy móc thiếu cảm xúc. Chatbot thì hay bịa link ảo 404. Bài viết blog thì cũ kỹ không cập nhật giá. GiftAI chính là mảnh ghép dung hòa cả hai: vừa thấu hiểu tâm lý, vừa cung cấp link mua và giá bán chính xác 100%.  
> Về tiềm năng kinh doanh, đồ án có lộ trình thương mại hóa rõ ràng: Doanh thu tiếp thị liên kết Affiliate 3-12% từ các sàn TMĐT, gói tài khoản VIP tự động nhắc ngày lễ qua Zalo, và hợp tác với các thương hiệu quà tặng thủ công handmade."

---

### 📌 SLIDE 18: TỔNG KẾT ĐÓNG GÓP ĐỀ TÀI, LỜI CẢM ƠN & Q&A (45 giây)
* **Slide hiển thị:** 3 đóng góp lớn: Kỹ thuật, Thực tiễn, Nhân văn. Lời cảm ơn Thầy Cô.
* **Lời thoại thuyết trình:**
> "Để kết luận bài báo cáo: Đề tài GiftAI là minh chứng rõ nét cho thấy Trí tuệ Nhân tạo có thể ứng dụng hiệu quả vào đời sống, biến sự lúng túng khi chọn quà thành trải nghiệm ấm áp và giàu cảm xúc.  
> Đồ án đã hoàn thành 100% mục tiêu với sản phẩm chạy thực tế 24/7 trên Cloud và ứng dụng Android APK.  
> Chúng em xin gửi lời cảm ơn chân thành và sâu sắc nhất đến Thầy ThS. Đỗ Phúc Hảo đã tận tình hướng dẫn, cùng quý Thầy Cô trong Hội đồng đã dành thời gian theo dõi bài báo cáo.  
> Chúng em xin sẵn sàng lắng nghe những ý kiến đóng góp quý báu và trả lời các câu hỏi từ quý Thầy Cô! Em xin trân trọng cảm ơn!"

---

## 💡 MẸO THUYẾT TRÌNH DÀNH CHO NHÓM (PRESENTATION TIPS)
1. **Phân chia lượt nói giữa 2 bạn:**
   * **Bạn 1 (Ví dụ: Nguyễn Thiện Quân):** Trình bày từ **Slide 1 đến Slide 9** (Bối cảnh, Mục tiêu, Kiến trúc hệ thống, Công nghệ, CSDL và Giải pháp AI).
   * **Bạn 2 (Ví dụ: Nguyễn Việt Quang):** Trình bày từ **Slide 10 đến Slide 18** (Hiện thực giao diện, Thiệp AI, Memory Box, Kết quả kiểm thử, Đánh giá thực nghiệm và Kết luận).
2. **Phong thái tự tin & Tương tác:**
   * Không nhìn chăm chăm vào màn hình đọc chữ, hãy nhìn thẳng vào Thầy Cô trong Hội đồng.
   * Các con số then chốt cần nhấn mạnh to, rõ ràng: **2.390+ sản phẩm**, **94.2% độ chính xác**, **84.6 điểm SUS**, **55 req/phút**, **99.8% thành công**.
3. **Phần Demo trực tiếp (nếu Thầy Cô yêu cầu):**
   * Mở sẵn link Web: [https://gift-ai-gilt.vercel.app/](https://gift-ai-gilt.vercel.app/)
   * Thử ngay 2 ca thú vị:
     1. Tìm quà cho **Mẹ** nhân **Ngày của Mẹ** -> Ra ngay máy massage và yến sào cao cấp.
     2. Tìm quà cho **Người yêu cũ** -> Ra ngay sách chữa lành *Hiểu về trái tim* và nến thơm tinh dầu thư giãn.
