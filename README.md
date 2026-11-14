# 🎁 GiftAI - Hệ Thống Gợi Ý Quà Tặng Thông Minh Ứng Dụng AI

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Web%20%7C%20Android-pink?style=for-the-badge&logo=android" alt="Platform" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green?style=for-the-badge&logo=nodedotjs" alt="Node" />
  <img src="https://img.shields.io/badge/Database-TiDB%20Cloud%20(MySQL)-orange?style=for-the-badge&logo=mysql" alt="Database" />
  <img src="https://img.shields.io/badge/AI-Google%20Gemini%203.8%20Flash-purple?style=for-the-badge&logo=google" alt="Gemini" />
</p>

---

## 🌐 Đường dẫn trực tiếp (Live Links)

* 🚀 **Trải nghiệm ứng dụng Web (24/7):** [https://gift-ai-gilt.vercel.app/](https://gift-ai-gilt.vercel.app/)
* ⚙️ **Máy chủ Backend API (Render):** [https://giftai-964g.onrender.com](https://giftai-964g.onrender.com)
* 📄 **Thư mục Báo cáo & Tài liệu đồ án:** [👉 Bấm vào đây để xem thư mục BaoCao_DoAn](./BaoCao_DoAn/)

---

## 📖 Giới thiệu đề tài
**GiftAI** là giải pháp gợi ý quà tặng thông minh ứng dụng Trí tuệ nhân tạo (AI) giúp người dùng giải quyết vấn đề nan giải trong việc lựa chọn quà tặng phù hợp cho người thân, bạn bè, đồng nghiệp vào các dịp đặc biệt.

Hệ thống kết hợp giữa **mô hình ngôn ngữ lớn (LLM - Google Gemini 3.8 Flash)** cùng **kho dữ liệu quà tặng thực tế (1.400+ sản phẩm)** được cào tự động từ các sàn thương mại điện tử (Tiki, Shopee, Lazada), đem lại những gợi ý thực tế, sát ngân sách và đúng tâm lý người nhận.

---

## 🌟 Các tính năng nổi bật

### 1. Tư vấn quà tặng thông minh bằng AI
* Lựa chọn đa tiêu chí: Dịp lễ (Sinh nhật, Valentine, 20/10, Giáng sinh, Kỷ niệm...), đối tượng nhận quà (Người yêu, Bố mẹ, Đồng nghiệp, Bạn thân...), độ tuổi, giới tính và khoảng ngân sách.
* AI phân tích tâm lý người nhận, đưa ra lời giải thích thuyết phục vì sao nên chọn từng món quà và sắp xếp theo độ ưu tiên.
* **Cơ chế chống nghẽn đa AI (Multi-AI Fallback):** Ưu tiên **Google Gemini 3.8 Flash**, tự động chuyển đổi sang **Groq AI (Qwen)** hoặc **OpenRouter** khi bị quá tải hạn mức.

### 2. Hộp Quà Kỷ Niệm Ảo & Đếm Ngược Ngày Đặc Biệt (Memory Box)
* Tự thiết kế thiệp chúc mừng điện tử kèm quà tặng với mã chia sẻ độc quyền (`MEM-XXXXXX`).
* Chế độ đếm thời gian linh hoạt: Đếm xuôi ngày yêu nhau (*count-up*) hoặc đếm ngược đến ngày kỷ niệm sắp tới (*count-down*).
* Người nhận có thể mở hộp quà, xem tâm thư, thả tim và gửi tương tác cảm xúc trực tuyến.

### 3. Quản lý tài khoản & Cá nhân hóa
* Đăng ký, đăng nhập tài khoản an toàn (mã hóa mật khẩu với **bcrypt**, xác thực bằng **JWT Token**).
* Lưu trữ danh sách món quà yêu thích cá nhân và xem lại toàn bộ lịch sử tư vấn quà tặng.

### 4. Bảng điều khiển Quản trị viên (Admin Dashboard)
* Biểu đồ theo dõi lượt tìm kiếm theo ngày / tuần / tháng.
* Thống kê tỷ lệ chuyển đổi và số lượt click (`clicks`) vào từng sản phẩm.
* Quản lý kho quà tặng và tài khoản người dùng trên hệ thống.

### 5. Hỗ trợ đa nền tảng
* **Web Responsive:** Tối ưu hóa mượt mà cho mọi kích cỡ màn hình (Điện thoại, Máy tính bảng, Desktop).
* **Android Native App:** Ứng dụng Android (Java WebView Container) với cơ chế xử lý viền màn hình (Edge-to-Edge Safe Insets), hỗ trợ tải tệp APK và cài đặt trực tiếp.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

| Thành phần | Công nghệ / Nền tảng |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, CSS Modules, Lucide Icons, Canvas Confetti |
| **Mobile App** | Android Studio (Java, Android SDK, WebView) |
| **Backend** | Node.js, Express.js, RESTful API |
| **Cơ sở dữ liệu** | TiDB Cloud (MySQL Serverless phân tán trên nền tảng AWS Singapore), SSL TLSv1.2, `mysql2/promise` connection pool |
| **Trí tuệ nhân tạo** | Google Gemini API (`@google/genai`), Groq SDK, OpenRouter |
| **Crawler & Cào dữ liệu** | Selenium WebDriver, Cheerio, ChromeDriver |
| **Triển khai (Deploy)** | Vercel (Frontend), Render (Backend), TiDB Cloud (Database) |

---

## 🗄️ Cấu trúc Cơ sở dữ liệu (Database Schema)

Hệ thống lưu trữ trên đám mây TiDB Cloud với 6 bảng chính:
* `users`: Lưu tài khoản người dùng, quản trị viên, mật khẩu mã hóa bcrypt.
* `scraped_products`: Kho hơn 1.400+ sản phẩm quà tặng thực tế, giá cả, hình ảnh và link mua hàng.
* `search_history`: Lưu vết các phiên tìm kiếm, tóm tắt tâm lý của AI và snapshot danh sách quà tặng.
* `product_recommendation_stats`: Thống kê tần suất đề xuất và số lượt click của người dùng.
* `user_favorites`: Danh sách món quà yêu thích được từng tài khoản lưu lại.
* `memory_boxes`: Lưu thông tin thiệp điện tử, mã chia sẻ `share_code`, mốc thời gian kỷ niệm và tương tác.

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy dự án dưới Local

### 1. Yêu cầu tiên quyết
* Đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).
* Đã cài đặt [Git](https://git-scm.com/).

### 2. Cài đặt Backend
```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt các gói phụ thuộc
npm install

# Khởi chạy server
npm start
```
*Server Backend sẽ chạy tại: `http://localhost:5000`*

### 3. Cài đặt Frontend
```bash
# Mở một terminal mới và di chuyển vào thư mục frontend
cd frontend

# Cài đặt các gói phụ thuộc
npm install

# Chạy môi trường phát triển
npm run dev
```
*Giao diện Web sẽ chạy tại: `http://localhost:5173`*

### 4. Ứng dụng Android (Tùy chọn)
* Mở thư mục gốc đồ án bằng **Android Studio**.
* Đợi Gradle đồng bộ xong các thư viện cần thiết.
* Nhấn **Run (Shift + F10)** để chạy trên máy ảo hoặc điện thoại Android thật.

---

## 🔑 Tài khoản thử nghiệm (Demo Accounts)

| Phân quyền | Email đăng nhập | Mật khẩu | Chức năng thử nghiệm |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@giftfinder.com` | `admin123` | Vào mục Quản trị xem Dashboard & biểu đồ phân tích |
| **Người dùng (User)** | `user@giftfinder.com` | `user123` | Tìm quà, lưu quà yêu thích, xem lịch sử cá nhân |

---

## 📁 Cấu trúc thư mục dự án

```text
GiftAI/
├── BaoCao_DoAn/          # Thư mục lưu trữ file Báo cáo đồ án & Slide thuyết trình
├── app/                  # Mã nguồn ứng dụng Android Studio (Native WebView)
├── backend/              # Mã nguồn máy chủ Node.js & Express API
│   ├── crawlers/         # Các script tự động cào dữ liệu từ sàn TMĐT
│   ├── db/               # Cấu hình kết nối MySQL và khởi tạo bảng
│   ├── routes/           # Các router API (Auth, User, Admin, MemoryBox)
│   └── server.js         # Entrypoint máy chủ Backend
├── frontend/             # Mã nguồn ứng dụng giao diện React + Vite + TypeScript
│   ├── src/              # Các components, modals và giao diện người dùng
│   └── dist/             # Bản build production triển khai lên Vercel
├── .gitignore            # Cấu hình bỏ qua các tệp tạm thời
└── README.md             # Tài liệu giới thiệu và hướng dẫn tổng quan đồ án
```

---

## 👥 Thông tin tác giả & Đồ án

* **Sinh viên thực hiện:
Nguyễn Việt Quang MSSV: 2351220268
Nguyễn Thiện Quân MSSV: 2351220231
* **Lớp:** 23CT2
* **Giảng viên hướng dẫn: Đỗ Phúc Hảo
