# 📦 Thư mục Models (Backend)

Thư mục này định nghĩa cấu trúc dữ liệu của các đối tượng trong ứng dụng VÀ/HOẶC chứa logic truy vấn CSDL.

## 💡 Trách nhiệm (Tùy theo kiến trúc)

* **Cách 1 (Data Object):** File `User.php` chỉ định nghĩa lớp `User` với các thuộc tính (`id`, `username`, `email`) và các phương thức getter/setter.
* **Cách 2 (Active Record):** File `User.php` (lớp `User`) chứa cả các phương thức để tương tác CSDL, ví dụ: `User::find(1)` (tìm user có id=1), `$user->save()`.
* **Cách 3 (Repository - Phổ biến):** Thư mục này có thể đổi tên thành `Repositories` (ví dụ: `UserRepository.php`). Lớp này sẽ chứa TOÀN BỘ các câu lệnh `SQL` liên quan đến User.

**Mục tiêu chính:** Tách biệt logic truy vấn CSDL (SQL) ra khỏi `Controllers`.

## ✅ Các repository đang sử dụng

| Repository                | Chức năng chính                                                                                                  | Bảng liên quan                |
|---------------------------|-------------------------------------------------------------------------------------------------------------------|-------------------------------|
| `UserRepository`          | Đăng ký tài khoản, tra cứu thông tin đăng nhập, cập nhật hồ sơ, liệt kê khách hàng (admin).                      | `users`                       |
| `AuthTokenRepository`     | Tạo, kiểm tra và thu hồi Bearer token cho cơ chế đăng nhập an toàn.                                              | `user_tokens`                 |
| `RouteRepository`         | CRUD dữ liệu tuyến xe hiển thị cho khách hàng và quản trị viên.                                                  | `routes`                      |
| `BookingRepository`       | Đặt vé, cập nhật trạng thái, liệt kê vé của khách hàng hoặc toàn bộ vé (admin).                                  | `bookings`, `routes`, `users` |

> 💡 Các repository này đều nhận cùng một kết nối `PDO` từ `config/bootstrap.php`.

## 🗄️ Gợi ý cấu trúc bảng

### Bảng `users`
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    avatar_url VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Bảng `user_tokens`
```sql
CREATE TABLE user_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    user_agent VARCHAR(255) DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    last_used_at DATETIME DEFAULT NULL,
    CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Bảng `bookings`
```sql
CREATE TABLE bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    route_id INT NOT NULL,
    seat_quantity INT NOT NULL DEFAULT 1,
    status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
    departure_date DATE NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_bookings_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Các bảng `routes`, `bookings` và `user_tokens` được sử dụng xuyên suốt trong các repository ở trên. Hãy đảm bảo tạo index phù hợp nếu dữ liệu lớn.

