README - ĐỒ ÁN LẬP TRÌNH ỨNG DỤNG WEB

====================================

NHÓM: FITLAB

HỌC PHẦN: Lập Trình Ứng Dụng Web

Giảng viên: Ngô Thị Ngọc Thắm

----------------------------------------------------------------------

I. THÔNG TIN THÀNH VIÊN

----------------------------------------------------------------------

- 2474802010304 – Nguyễn Thành Phong – Backend/API - Database - Triển Khai

- 2474802010002 – Nguyễn Lê Vĩnh An – Frontend/Admin - Word - Slide

- 2474802010206 – Lê Tấn Kiệt – Frontend/User - Word - Slide


----------------------------------------------------------------------

II. MÔ TẢ ĐỀ TÀI

----------------------------------------------------------------------

Tên đề tài: Nghiên cứu và xây dựng website bán vé xe

Mô tả ngắn:

Website mô phỏng hệ thống quản lý đặt vé xe bus trực tuyến sử dụng HTML5, CSS3, JavaScript (Vanilla), PHP và MySQL. Hệ thống hỗ trợ hai phân quyền: người dùng (user) và quản trị viên (admin). 

Chức năng chính:
- Đăng ký/Đăng nhập/Quên mật khẩu
- Tìm kiếm và đặt vé xe bus theo tuyến và ngày
- Quản lý thông tin cá nhân và lịch sử đặt vé
- Dashboard quản trị với thống kê tổng quan
- Quản lý tuyến xe, đặt vé, khách hàng, khuyến mãi
- Tự động tính toán khoảng cách và thời gian di chuyển dựa trên bản đồ địa lý Việt Nam

Công nghệ sử dụng:
- Frontend: HTML5, CSS3, JavaScript (Vanilla)
- Backend: PHP 7.4+ (PDO, RESTful API)
- Database: MySQL/MariaDB
- Server: Apache (XAMPP)

----------------------------------------------------------------------

III. CÁCH CÀI ĐẶT & CHẠY DỰ ÁN (LOCALHOST - XAMPP)

----------------------------------------------------------------------

1. Cài đặt XAMPP
   - Tải và cài đặt XAMPP từ: https://www.apachefriends.org/
   - Đảm bảo phiên bản PHP >= 7.4

2. Copy toàn bộ thư mục SourceCode vào:
   C:\xampp\htdocs\Ticketbuy-main\SourceCode\

3. Khởi động Apache và MySQL từ XAMPP Control Panel

4. Import Database:
   - Mở phpMyAdmin: http://localhost/phpmyadmin
   - Tạo database mới: bus_booking_db
   - Import file database từ phpMyAdmin:
     + Export database từ phpMyAdmin (chọn database bus_booking_db > Export)
     + Hoặc import file SQL đã export sẵn (nếu có)

5. Cấu hình kết nối Database (nếu cần):
   - File: database/db_connection.php
   - Mặc định:
     * Host: 127.0.0.1
     * Database: bus_booking_db
     * User: root
     * Password: admin123

6. Chạy dự án:

   Trang chủ (User):
   http://localhost/Ticketbuy-main/SourceCode/frontend/src/pages/user/home%20page/index.html

   Trang đăng nhập:
   http://localhost/Ticketbuy-main/SourceCode/frontend/src/pages/auth/login.html

   Admin Panel:
   http://localhost/Ticketbuy-main/SourceCode/frontend/src/pages/admin/dashboard/dashboard.html

   Backend API:
   http://localhost/Ticketbuy-main/SourceCode/backend/public/

----------------------------------------------------------------------

IV. TÀI KHOẢN ĐĂNG NHẬP

----------------------------------------------------------------------

Tài khoản Admin:
- Email: admin@greenbus.vn
- Password: admin123

Hoặc tạo tài khoản admin mới:
- Chạy script: http://localhost/Ticketbuy-main/SourceCode/database/create_admin.php
- Hoặc đăng ký tài khoản mới và cập nhật role = 'admin' trong database

Tài khoản User:
- Đăng ký tài khoản mới từ trang đăng ký
- Hoặc sử dụng email/password đã tạo trong database

Lưu ý: Sau khi reset mật khẩu (quên mật khẩu), mật khẩu mới sẽ là: 123456 ( đây là tính năng cố định vì là freehost không có bussiness mail để gửi OTP )

----------------------------------------------------------------------

V. LINK TRIỂN KHAI ONLINE (FREE HOST)

----------------------------------------------------------------------

URL: https://thanhphong.fun/frontend/src/pages/auth/login.html

----------------------------------------------------------------------

VI. LINK GITHUB (BẮT BUỘC)

----------------------------------------------------------------------

Repo chính (public): 

https://github.com/________________________________

Nhánh từng sinh viên (BẮT BUỘC):

- SV1: https://github.com/.../tree/<branch_sv1>

- SV2: https://github.com/.../tree/<branch_sv2>

- SV3: https://github.com/.../tree/<branch_sv3>

Ghi chú:

=> Mỗi thành viên phải có log commit rõ ràng xuyên suốt 3 tuần.

=> Không có log = không đạt đồ án (theo yêu cầu học phần).

----------------------------------------------------------------------

VII. CẤU TRÚC THƯ MỤC BÀI NỘP

----------------------------------------------------------------------

/Ticketbuy-main
    /SourceCode (hoặc /Ticketbuy-main)

        /backend
            /public
                index.php (Entry point API)
            /src
                /Controllers (AuthController, RouteController, BookingController, ...)
                /Models (UserRepository, RouteRepository, ...)
                /config
        
        /frontend
            /src
                /pages
                    /admin (Dashboard, Routes, Bookings, Customers, Promotions)
                    /user (Home, Routes, Booking, Account)
                    /auth (Login, Register)
                /helpers
                    api.js (GreenBusAPI helper)
                /components (UI components)
                /assets (Images, Videos)
        
        /database
            db_connection.php (File kết nối database)
            README.md (Hướng dẫn export database)

    /Database

        database.sql (Export từ phpMyAdmin - chứa toàn bộ cấu trúc và dữ liệu)

    /Documents

        BaoCao_DoAn_WebApp.pdf

        PhanCongThanhVien.pdf (hoặc nằm trong báo cáo)

    /Slides

        SlideThuyetTrinh.pdf hoặc .pptx

    /Video (tùy chọn - khuyến khích)

    /README.txt hoặc README.md

----------------------------------------------------------------------

VIII. API ENDPOINTS

----------------------------------------------------------------------

Authentication:
- POST /auth/login - Đăng nhập
- POST /auth/register - Đăng ký
- POST /auth/logout - Đăng xuất
- POST /auth/forgot-password - Quên mật khẩu

User:
- GET /me - Lấy thông tin user hiện tại
- PUT /me - Cập nhật thông tin user

Routes:
- GET /routes - Lấy danh sách tuyến
- POST /routes - Tạo tuyến mới (admin)
- PUT /routes/{id} - Cập nhật tuyến (admin)
- DELETE /routes/{id} - Xóa tuyến (admin)

Bookings:
- GET /bookings - Lấy danh sách vé
- POST /bookings - Đặt vé mới
- PUT /bookings/{id} - Cập nhật vé
- DELETE /bookings/{id} - Xóa vé
- GET /bookings/seats - Lấy danh sách ghế đã đặt

Admin:
- GET /admin/stats - Thống kê tổng quan
- GET /admin/customers - Danh sách khách hàng
- GET /admin/bookings/stats - Thống kê đặt vé
- GET /admin/revenue - Thống kê doanh thu

Promotions:
- GET /promotions - Lấy danh sách khuyến mãi
- POST /promotions - Tạo khuyến mãi (admin)
- PUT /promotions/{id} - Cập nhật khuyến mãi (admin)
- DELETE /promotions/{id} - Xóa khuyến mãi (admin)

----------------------------------------------------------------------

IX. GHI CHÚ QUAN TRỌNG

----------------------------------------------------------------------

- Website phải chạy trên XAMPP và free host.

- Database phải import được không lỗi (export từ phpMyAdmin).

- Mã nguồn phải có comment, đặt tên rõ ràng.

- Báo cáo 10–15 trang kèm sơ đồ chức năng + ERD.

- Slide thuyết trình chuẩn bị đúng hạn.

- Đảm bảo mỗi thành viên hiểu phần mình làm.

- Backend API sử dụng Bearer Token authentication.

- Frontend sử dụng GreenBusAPI helper để gọi API.

- Đảm bảo Apache mod_rewrite đã được bật.

- Kiểm tra console browser (F12) để debug lỗi JavaScript.

- Kiểm tra Network tab để debug lỗi API.

----------------------------------------------------------------------

X. TROUBLESHOOTING

----------------------------------------------------------------------

Lỗi "GreenBusAPI chưa được khởi tạo":
- Đảm bảo file api.js được load trước các script khác
- Kiểm tra đường dẫn đến api.js có đúng không
- Xóa cache trình duyệt (Ctrl + F5)

Lỗi kết nối database:
- Kiểm tra MySQL đã chạy chưa
- Kiểm tra thông tin kết nối trong database/db_connection.php

Lỗi 404 khi gọi API:
- Kiểm tra URL API trong console browser
- Đảm bảo Apache mod_rewrite đã được bật
- Kiểm tra file .htaccess trong backend/public/

Không thể đăng nhập:
- Database chưa có user hoặc thông tin đăng nhập sai
- Tạo user mới từ trang register
- Hoặc tạo admin từ script create_admin.php

----------------------------------------------------------------------
