# 🧠 Thư mục Controllers (Backend)

Thư mục này là **bộ não** của Backend. Nó nhận các yêu cầu (requests) từ `index.php` (thông qua router) và trả về phản hồi (responses).

## 💡 Trách nhiệm

1.  **Xác thực yêu cầu**: Kiểm tra dữ liệu đầu vào (validation) - ví dụ: email có đúng định dạng?
2.  **Kiểm tra quyền hạn**: Người dùng này có quyền xóa sản phẩm không?
3.  **Gọi Logic**: Tương tác với `Models` (hoặc `Services`) để thực hiện nghiệp vụ (ví dụ: lấy dữ liệu từ CSDL, tính toán).
4.  **Trả về phản hồi**: Gửi lại dữ liệu (thường là JSON) hoặc thông báo lỗi cho Frontend.

## 🚫 Không chứa

* Controller **KHÔNG** chứa các câu lệnh `SQL` trực tiếp (việc đó của Models hoặc Repositories).
* Controller **KHÔNG** chứa logic kết nối CSDL (việc đó của `database/db_connection.php`).

## 📚 Các controller hiện có

| Controller            | Mục đích chính                                                                                           | Endpoint liên quan                                                                 |
|-----------------------|-----------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| `AuthController`      | Đăng nhập, đăng ký khách hàng, quản lý token đăng nhập (Bearer) cho cả user và admin.                    | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`                      |
| `ProfileController`   | Lấy và cập nhật thông tin hồ sơ cá nhân của người dùng đang đăng nhập.                                   | `GET /me`, `PUT /me`                                                                |
| `RouteController`     | CRUD tuyến xe. Các thao tác thêm/sửa/xóa chỉ dành cho quản trị viên.                                      | `GET /routes`, `POST /routes`, `PUT /routes/{id}`, `DELETE /routes/{id}`            |
| `BookingController`   | Quản lý vé xe. Khách xem/đặt/hủy vé của mình; quản trị viên xem & cập nhật mọi vé.                        | `GET /bookings`, `POST /bookings`, `PUT /bookings/{id}`, `DELETE /bookings/{id}`    |

Ngoài ra, router còn cung cấp `GET /admin/customers` để admin thống kê khách hàng.

## 🔐 Phân quyền & xác thực

* API sử dụng **Bearer token** được cấp khi đăng nhập (`AuthController::login`). Token được lưu trong bảng `user_tokens`.
* Các endpoint nhạy cảm đều gọi helper `ensureAuthenticated()` và `ensureRole()` trong `public/index.php` để chặn truy cập trái phép.
* Người dùng có quyền `admin` mới được thao tác CRUD trên tuyến xe và chỉnh sửa vé của người khác.

## 🧪 Gợi ý kiểm thử nhanh

1. **Đăng ký khách hàng**: `POST /auth/register`
2. **Đăng nhập**: `POST /auth/login` ⇒ nhận token
3. **Lấy hồ sơ**: `GET /me` kèm header `Authorization: Bearer <token>`
4. **Đặt vé**: `POST /bookings`
5. **Admin** (sau khi gán role trong DB): `POST /routes`, `PUT /routes/{id}`, `DELETE /bookings/{id}`