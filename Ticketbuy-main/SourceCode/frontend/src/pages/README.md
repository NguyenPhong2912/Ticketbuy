# 📄 Thư mục Pages

Thư mục này chứa các trang hoàn chỉnh mà người dùng có thể điều hướng tới.

## 💡 Triết lý

* Một file trong `pages` đại diện cho một "màn hình" hoặc một URL (ví dụ: `/home`, `/contact`).
* Đây là nơi "thông minh" (Smart Components): Chúng chịu trách nhiệm **gọi API** (sử dụng helpers), **quản lý trạng thái (state)** của trang, và **kết hợp** các component (từ `/components`) lại với nhau để tạo thành một trang hoàn chỉnh.
* Trang sẽ được bọc bởi một `Layout` (từ `/layouts`).

## 📁 Cấu trúc con

* **/admin**: Chứa các trang chỉ dành cho quản trị viên (Dashboard, Quản lý sản phẩm...).
* **/user**: Chứa các trang cho người dùng thông thường (Trang chủ, Giới thiệu...).