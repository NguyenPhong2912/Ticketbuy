# ⚙️ Thư mục Config

Thư mục này chứa các file cấu hình **cứng** của ứng dụng Frontend.

Đây là nơi để định nghĩa các giá trị không thay đổi khi ứng dụng đang chạy, nhưng có thể thay đổi giữa các môi trường (development vs. production).

## ✅ Ví dụ

* `api.js`: Định nghĩa URL gốc của API Backend (ví dụ: `export const API_URL = 'http://localhost:8000/api';`).
* `firebase.js`: Thông tin cấu hình kết nối Firebase (nếu có).
* `theme.js`: Cấu hình màu sắc, phông chữ... cho toàn bộ ứng dụng (nếu dùng thư viện UI như Material-UI hay Chakra-UI).