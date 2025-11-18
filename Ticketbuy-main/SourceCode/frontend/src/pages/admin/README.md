# 🚌 GreenBus Admin Panel

## 📁 Cấu trúc thư mục

```
admin/
├── admin.css          # CSS chung cho toàn bộ admin panel
├── dashboard/         # Trang Dashboard - Tổng quan hệ thống
│   ├── dashboard.html
│   └── dashboard.js
├── routes/            # Quản lý Tuyến xe
│   ├── routes.html
│   └── routes.js
├── bookings/          # Quản lý Đặt vé
│   ├── bookings.html
│   └── bookings.js
├── customers/         # Quản lý Khách hàng
│   ├── customers.html
│   └── customers.js
└── promotions/        # Quản lý Khuyến mãi
    ├── promotions.html
    └── promotions.js
```

## 🚀 Cách chạy dự án

### 1. Cài đặt XAMPP
- Đảm bảo XAMPP đã được cài đặt và chạy
- Khởi động Apache và MySQL

### 2. Cấu hình Database
1. Mở phpMyAdmin: `http://localhost/phpmyadmin`
2. Import file database:
   - File: `database/schema.sql`
   - Tạo database `bus_booking_db`
3. (Tùy chọn) Tạo admin account:
   - Chạy: `database/create_admin.php` hoặc import `database/create_admin.sql`

### 3. Cấu hình Backend
- Backend API đã sẵn sàng tại: `backend/public/index.php`
- API Base URL sẽ tự động resolve: `http://localhost/Ticketbuy-main/SourceCode/backend/public`

### 4. Truy cập Admin Panel

**Đường dẫn trực tiếp:**
```
http://localhost/Ticketbuy-main/SourceCode/frontend/src/pages/admin/dashboard/dashboard.html
```

**Hoặc từ trang chủ:**
1. Mở: `http://localhost/Ticketbuy-main/SourceCode/frontend/src/pages/user/home page/index.html`
2. Đăng nhập với tài khoản admin
3. Click vào "Vào trang quản lý" (nếu có role admin)

## 📋 Các trang Admin

### Dashboard
- **URL:** `admin/dashboard/dashboard.html`
- **Chức năng:** Hiển thị thống kê tổng quan
- **API:** `GET /admin/stats`

### Quản lý Tuyến xe
- **URL:** `admin/routes/routes.html`
- **Chức năng:** CRUD tuyến xe
- **API:** 
  - `GET /routes`
  - `POST /routes`
  - `PUT /routes/{id}`
  - `DELETE /routes/{id}`

### Quản lý Đặt vé
- **URL:** `admin/bookings/bookings.html`
- **Chức năng:** Xem, cập nhật trạng thái, xóa vé
- **API:**
  - `GET /bookings`
  - `PUT /bookings/{id}`
  - `DELETE /bookings/{id}`

### Quản lý Khách hàng
- **URL:** `admin/customers/customers.html`
- **Chức năng:** CRUD khách hàng
- **API:**
  - `GET /admin/customers`
  - `POST /admin/users`
  - `PUT /admin/users/{id}`
  - `DELETE /admin/users/{id}`

### Quản lý Khuyến mãi
- **URL:** `admin/promotions/promotions.html`
- **Chức năng:** CRUD mã khuyến mãi
- **API:**
  - `GET /promotions`
  - `POST /promotions`
  - `PUT /promotions/{id}`
  - `DELETE /promotions/{id}`

## 🔐 Yêu cầu

- Tất cả các trang admin yêu cầu đăng nhập với role `admin`
- Nếu chưa đăng nhập, sẽ tự động redirect về trang login

## 🛠️ Công nghệ sử dụng

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** PHP (RESTful API)
- **Database:** MySQL
- **Authentication:** Bearer Token (JWT-like)

## 📝 Lưu ý

- File `api.js` phải được load trước các script khác
- Tất cả API calls sử dụng `GreenBusAPI` helper
- Có cơ chế đợi `GreenBusAPI` khởi tạo trước khi sử dụng

