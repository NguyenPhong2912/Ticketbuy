# 🧩 Thư mục Components

Thư mục này chứa các thành phần giao diện (UI) **tái sử dụng** và **đơn lẻ**.

## 💡 Triết lý

* **Tái sử dụng**: Mục tiêu là để sử dụng ở nhiều nơi (ví dụ: `Button.js` dùng ở cả trang `Home` và `Contact`).
* **"Ngu ngốc" (Dumb Components)**: Component chỉ nên nhận `props` (dữ liệu) và hiển thị. Nó không nên tự mình gọi API hay xử lý logic nghiệp vụ phức tạp.

## ✅ Ví dụ

* `Button.js`
* `Modal.js`
* `ProductCard.js` (Hiển thị 1 sản phẩm)
* `Navbar.js`
* `Footer.js`

## 🚫 Không chứa

* Các trang hoàn chỉnh (đặt trong `/pages`).
* Logic gọi API (thường logic này nên nằm trong `/pages` hoặc `/helpers`).