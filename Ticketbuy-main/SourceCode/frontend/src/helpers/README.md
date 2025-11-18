# 🛠️ Thư mục Helpers (Hàm tiện ích)

Thư mục này chứa các hàm tiện ích **nhỏ**, **độc lập** và **tái sử dụng** để xử lý các logic chung.

## 💡 Triết lý

* Một file helper nên chứa các hàm có liên quan đến nhau (ví dụ: `format.js` chứa các hàm định dạng).
* Các hàm này phải là "thuần khiết" (pure functions) - với cùng một đầu vào luôn cho cùng một đầu ra, và không gây ra tác dụng phụ (side effects).

## ✅ Ví dụ

* `format.js`: Chứa hàm `formatCurrency(number)` (định dạng tiền tệ), `formatDate(date)` (định dạng ngày tháng).
* `storage.js`: Chứa hàm `saveToLocalStorage(key, value)`, `getFromLocalStorage(key)`.
* `apiClient.js`: Một file helper đặc biệt để cấu hình (ví dụ: `axios`) và thực hiện các cuộc gọi API, tự động đính kèm token.