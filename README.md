# README - ĐỒ ÁN LẬP TRÌNH ỨNG DỤNG WEB

====================================

**NHÓM:** 4 - FITLAB

**HỌC PHẦN:** Lập Trình Ứng Dụng Web

**Giảng viên:** ThS. Ngô Thị Ngọc Thắm

---

## I. THÔNG TIN THÀNH VIÊN

- 2474802010304 – Nguyễn Thành Phong – Backend/API - Database - Triển Khai

- 2474802010002 – Nguyễn Lê Vĩnh An – Frontend/Admin - Word - Slide

- 2474802010206 – Lê Tấn Kiệt – Frontend/User - Word - Slide

---

## II. MÔ TẢ ĐỀ TÀI

**Tên đề tài:** Nghiên cứu và xây dựng website bán vé xe

**Mô tả ngắn:**

Website mô phỏng hệ thống quản lý đặt vé xe buýt trực tuyến sử dụng HTML5, CSS3, JavaScript (ES6+), PHP (PDO) và MySQL. Hệ thống hỗ trợ các chức năng:

- **Người dùng:**
  - Đăng ký/Đăng nhập tài khoản
  - Tìm kiếm tuyến xe theo điểm đi, điểm đến và ngày khởi hành
  - Xem danh sách chuyến xe có sẵn với thông tin chi tiết (giờ khởi hành, giá vé, số ghế trống)
  - Chọn ghế ngồi trực quan (sơ đồ ghế 2 tầng)
  - Áp dụng mã khuyến mãi khi thanh toán
  - Thanh toán qua nhiều phương thức (Thẻ, VietQR, MoMo)
  - Xem lịch sử đặt vé và quản lý thông tin cá nhân
  - Hủy vé đã đặt

- **Quản trị viên:**
  - Quản lý tuyến xe (thêm/sửa/xóa)
  - Quản lý chuyến xe (tạo chuyến theo ngày)
  - Quản lý mã khuyến mãi
  - Quản lý đơn đặt vé (xem, cập nhật trạng thái, hủy)
  - Thống kê doanh thu, số lượng vé, khách hàng
  - Dashboard với các chỉ số tổng quan

**Công nghệ sử dụng:**
- Frontend: HTML5, CSS3, JavaScript (Vanilla JS, ES6+), Responsive Design
- Backend: PHP 8.0+, PDO (PHP Data Objects)
- Database: MySQL 5.7+ / MariaDB
- Server: Apache (XAMPP)
- API: RESTful API với JSON

---

## III. CÁCH CÀI ĐẶT & CHẠY DỰ ÁN (LOCALHOST - XAMPP)

### Yêu cầu hệ thống:
- XAMPP (PHP 8.0+ và MySQL 5.7+)
- Trình duyệt hiện đại (Chrome, Firefox, Edge)

### Các bước cài đặt:

1. **Cài đặt XAMPP**
   - Tải và cài đặt XAMPP từ: https://www.apachefriends.org/
   - Đảm bảo đã cài đặt Apache và MySQL

2. **Copy dự án vào thư mục htdocs**
   ```
   Copy toàn bộ thư mục Ticketbuy-main vào:
   C:\xampp\htdocs\Ticketbuy-main\
   ```

3. **Khởi động Apache và MySQL**
   - Mở XAMPP Control Panel
   - Start Apache và MySQL

4. **Import Database:**
   - Mở phpMyAdmin: http://localhost/phpmyadmin
   - Tạo database mới: `bus_booking_db`
   - Import file SQL:
     - Vào tab "Import"
     - Chọn file: `SourceCode/database/db_connection.php` (nếu có file SQL riêng)
     - Hoặc chạy script SQL trực tiếp trong phpMyAdmin
   - **Lưu ý:** Nếu database đã có sẵn, có thể sử dụng file `db_connection.php` để kết nối

5. **Cấu hình kết nối Database (nếu cần):**
   - Mở file: `SourceCode/database/db_connection.php`
   - chạy File db_connection.php ( tự động cấu hình )

6. **Chạy dự án:**
   - Frontend: http://localhost/Ticketbuy-main/SourceCode/frontend/src/pages/user/routes/index.html
   - Backend API: http://localhost/Ticketbuy-main/SourceCode/backend/public/
   - Admin Dashboard: http://localhost/Ticketbuy-main/SourceCode/frontend/src/pages/admin/dashboard/dashboard.html

---

## IV. TÀI KHOẢN ĐĂNG NHẬP

### Tài khoản Admin:
- **Email:** xampleadmin@greenbus.vn
- **Password:** 1532006
- **Quyền:** Quản lý toàn bộ hệ thống
- **Nếu password không đúng:** có thể dùng chức năng quên mật khẩu để reset password về ( đây chỉ là demo nên cố định

### Tài khoản User (mẫu):
- **Email:** xample@gmail.com
- **Password:** 123456
- **Quyền:** Đặt vé, xem lịch sử đặt vé

**Lưu ý:** Các tài khoản này cần được tạo trong database. Nếu chưa có, có thể đăng ký tài khoản mới hoặc import dữ liệu mẫu.

---

## V. LINK TRIỂN KHAI ONLINE (FREE HOST)

**URL:** https://thanhphong.fun/Ticketbuy-main/SourceCode/frontend/src/pages/auth/login.html

**Hosting:** Hostinger

**Database:** Hostinger

---

## VI. LINK GITHUB (BẮT BUỘC)

**Repo chính (public):** 
https://github.com/NguyenPhong2912/Ticketbuy
---

## VII. CẤU TRÚC THƯ MỤC BÀI NỘP

```
Ticketbuy-main/
│
├── SourceCode/
│   ├── frontend/
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── user/          # Trang người dùng
│   │       │   │   ├── routes/    # Tuyến phổ biến
│   │       │   │   ├── booking/   # Đặt vé
│   │       │   │   └── account/   # Tài khoản
│   │       │   └── admin/         # Trang quản trị
│   │       │       └── dashboard/  # Dashboard admin
│   │       ├── assets/            # CSS, JS, images
│   │       └── components/        # Components dùng chung
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── Controllers/       # Controllers xử lý request
│   │   │   ├── Models/            # Repositories (Data Access Layer)
│   │   │   └── config/            # Cấu hình (bootstrap, database)
│   │   └── public/
│   │       └── index.php          # Entry point API
│   │
│   └── database/
│       └── db_connection.php      # File kết nối database
│
├── Database/
│   └── database.sql               # Script tạo bảng & dữ liệu mẫu
│
├── Documents/
│   ├── BaoCao_DoAn_WebApp.pdf
│   └── PhanCongThanhVien.pdf      # (hoặc nằm trong báo cáo)
│
├── Slides/
│   └── SlideThuyetTrinh.pdf       # hoặc .pptx
│
├── Video/                          # (tùy chọn - khuyến khích)
│   └── Demo_DoAn.mp4
│
└── README.md                       # File này
```

### Mô tả cấu trúc:

**Frontend:**
- Sử dụng Vanilla JavaScript (không framework)
- Responsive design với CSS3
- API calls sử dụng Fetch API
- Local Storage để quản lý session

**Backend:**
- RESTful API với PHP
- PDO để tương tác database (an toàn, tránh SQL Injection)
- JSON response format
- Authentication với token-based

**Database:**
- MySQL với các bảng chính:
  - `users` - Người dùng
  - `routes` - Tuyến xe
  - `trips` - Chuyến xe
  - `bookings` - Đơn đặt vé
  - `promotions` - Mã khuyến mãi
  - `user_tokens` - Token đăng nhập

---

## VIII. CÁC CHỨC NĂNG CHÍNH

### 1. Người dùng (User)
- ✅ Đăng ký/Đăng nhập
- ✅ Tìm kiếm tuyến xe
- ✅ Xem danh sách chuyến xe
- ✅ Chọn ghế ngồi (sơ đồ ghế 2 tầng)
- ✅ Áp dụng mã khuyến mãi
- ✅ Thanh toán (Thẻ, VietQR, MoMo)
- ✅ Xem lịch sử đặt vé
- ✅ Hủy vé
- ✅ Quản lý thông tin cá nhân

### 2. Quản trị viên (Admin)
- ✅ Dashboard thống kê
- ✅ Quản lý tuyến xe (CRUD)
- ✅ Quản lý chuyến xe (CRUD)
- ✅ Quản lý mã khuyến mãi (CRUD)
- ✅ Quản lý đơn đặt vé (Xem, cập nhật trạng thái)
- ✅ Thống kê doanh thu, số lượng vé

---

## IX. GHI CHÚ QUAN TRỌNG

### Yêu cầu bắt buộc:
- ✅ Website phải chạy trên XAMPP và free host
- ✅ Database phải import được không lỗi
- ✅ Mã nguồn phải có comment, đặt tên rõ ràng
- ✅ Báo cáo 10–15 trang kèm sơ đồ chức năng + ERD
- ✅ Slide thuyết trình chuẩn bị đúng hạn
- ✅ Đảm bảo mỗi thành viên hiểu phần mình làm

### Lưu ý kỹ thuật:
- **Database:** File SQL phải không chứa stored procedures, triggers, hoặc DEFINER clauses để tránh lỗi khi import vào hosting
- **API:** Tất cả API endpoints trả về JSON format
- **Security:** Sử dụng PDO prepared statements để tránh SQL Injection
- **Responsive:** Website phải responsive trên mobile, tablet, desktop

### Troubleshooting:

**Lỗi kết nối database:**
- Kiểm tra Apache và MySQL đã start chưa
- Kiểm tra thông tin trong `db_connection.php`
- Kiểm tra database đã được tạo chưa

**Lỗi 404 khi truy cập:**
- Kiểm tra đường dẫn file có đúng không
- Kiểm tra `.htaccess` (nếu có)
- Kiểm tra cấu hình Apache

**Lỗi CORS:**
- Đảm bảo frontend và backend chạy trên cùng domain hoặc cấu hình CORS headers

---

## X. THÔNG TIN LIÊN HỆ

Nếu có thắc mắc hoặc gặp vấn đề, vui lòng liên hệ:
- **Email nhóm:** phong.2474802010304@vanlanguni.vn
- **GitHub Issues:** https://github.com/NguyenPhong2912

---

**Chúc các bạn hoàn thành đồ án tốt! 🚀**

