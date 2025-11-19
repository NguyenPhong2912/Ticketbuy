# 📁 Database Configuration

## 🔧 Cấu hình kết nối Database

Hệ thống **TỰ ĐỘNG PHÁT HIỆN** cấu hình database, không cần chỉnh sửa code!

### ✨ Cách hoạt động:

1. **Tự động thử các cấu hình phổ biến:**
   - `root` / password rỗng (XAMPP mặc định)
   - `root` / `admin123`
   - `root` / `root`
   - `root` / `password`
   - Cả `127.0.0.1` và `localhost`

2. **Nếu cần tùy chỉnh:**
   - Copy `db_config.php.example` → `db_config.php`
   - Điền thông tin database của bạn
   - Hệ thống sẽ ưu tiên sử dụng file này

### 📝 Tạo file cấu hình tùy chỉnh:

```bash
# Copy file template
cp db_config.php.example db_config.php
```

Sau đó chỉnh sửa `db_config.php`:

```php
<?php
return [
    'host' => '127.0.0.1',        // hoặc 'localhost'
    'dbname' => 'bus_booking_db',
    'username' => 'root',
    'password' => 'your_password', // Điền password MySQL của bạn
    'charset' => 'utf8mb4',
];
```

### ⚠️ Lưu ý:

- **KHÔNG commit file `db_config.php` vào Git** (thêm vào `.gitignore`)
- File `db_config.php.example` là template, an toàn để commit
- Nếu không tạo `db_config.php`, hệ thống vẫn tự động hoạt động

### 🐛 Troubleshooting:

**Lỗi: "Không thể kết nối database"**

1. ✅ Kiểm tra MySQL đã start chưa (XAMPP Control Panel)
2. ✅ Kiểm tra database `bus_booking_db` đã được tạo chưa
3. ✅ Kiểm tra đã import file SQL chưa (`bus_booking_db.sql`)
4. ✅ Nếu password MySQL khác, tạo file `db_config.php` với password đúng

**Test kết nối:**

Mở trình duyệt và truy cập:
```
http://localhost/Ticketbuy-main/SourceCode/database/db_connection.php
```

Nếu thấy "Kết nối cơ sở dữ liệu thành công" → OK! ✅

