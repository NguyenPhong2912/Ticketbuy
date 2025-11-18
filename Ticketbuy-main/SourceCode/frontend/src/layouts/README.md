# 📐 Thư mục Layouts

Thư mục này định nghĩa các **bố cục (bộ khung)** chung cho các trang.

Một layout chịu trách nhiệm cho cấu trúc bên ngoài của trang, ví dụ như hiển thị Header, Footer, hoặc Sidebar, và cung cấp một khu vực để nội dung của trang (`/pages`) được chèn vào.

## ✅ Ví dụ

* `UserLayout.js`: Dùng cho các trang người dùng. Sẽ hiển thị `Navbar` ở trên, `Footer` ở dưới, và nội dung trang ở giữa.
* `AdminLayout.js`: Dùng cho trang quản trị. Sẽ hiển thị `AdminSidebar` ở bên trái, `AdminHeader` ở trên, và nội dung trang quản trị ở khu vực chính.
* `AuthLayout.js`: Dùng cho trang Đăng nhập/Đăng ký. Thường chỉ có nội dung ở giữa màn hình, không có Header hay Footer.