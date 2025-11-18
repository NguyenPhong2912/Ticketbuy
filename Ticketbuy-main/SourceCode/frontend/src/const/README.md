# 📌 Thư mục Const (Hằng số)

Thư mục này chứa các giá trị **hằng số** được sử dụng lặp lại trong mã nguồn.

Mục đích là để tránh "magic strings" (chuỗi ký tự ma) hoặc "magic numbers" (số ma) và giúp việc thay đổi giá trị sau này dễ dàng hơn.

## 💡 Phân biệt với /config

* `/config`: Dành cho cấu hình (thay đổi theo môi trường).
* `/const`: Dành cho hằng số nghiệp vụ (không bao giờ thay đổi).

## ✅ Ví dụ

* `roles.js`: `export const ROLE_ADMIN = 'ADMIN'; export const ROLE_USER = 'USER';`
* `messages.js`: `export const LOGIN_SUCCESS = 'Đăng nhập thành công!';`
* `events.js`: `export const EVENT_LOGOUT = 'logout-event';`