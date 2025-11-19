<?php

declare(strict_types=1);

/**
 * Repository truy cập dữ liệu người dùng.
 */
class UserRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Tìm người dùng theo ID.
     *
     * @return array<string, mixed>|null
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, name, email, phone, role, avatar_url, created_at, updated_at
             FROM users
             WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);

        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Lấy thông tin phục vụ xác thực bằng email hoặc số điện thoại.
     *
     * @return array<string, mixed>|null
     */
    public function findAuthByIdentifier(string $identifier): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, name, email, phone, password_hash, role, avatar_url
             FROM users
             WHERE (LOWER(email) = LOWER(:identifier_email) OR phone = :identifier_phone)
             LIMIT 1'
        );
        $stmt->execute([
            ':identifier_email' => $identifier,
            ':identifier_phone' => $identifier,
        ]);

        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Kiểm tra tồn tại email.
     */
    public function existsByEmail(string $email): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
        $stmt->execute([':email' => $email]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * Kiểm tra tồn tại số điện thoại.
     */
    public function existsByPhone(string $phone): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM users WHERE phone = :phone LIMIT 1');
        $stmt->execute([':phone' => $phone]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * Tạo người dùng mới.
     *
     * @param array{name:string,email:string,phone:string,password_hash:string,role:string,avatar_url:?string} $data
     *
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users (name, email, phone, password_hash, role, avatar_url, created_at, updated_at)
             VALUES (:name, :email, :phone, :password_hash, :role, :avatar_url, NOW(), NOW())'
        );

        $stmt->execute([
            ':name' => $data['name'],
            ':email' => $data['email'],
            ':phone' => $data['phone'],
            ':password_hash' => $data['password_hash'],
            ':role' => $data['role'],
            ':avatar_url' => $data['avatar_url'],
        ]);

        $id = (int) $this->pdo->lastInsertId();
        $user = $this->findById($id);

        if ($user === null) {
            throw new RuntimeException('Không thể lấy thông tin người dùng vừa tạo.');
        }

        return $user;
    }

    /**
     * Cập nhật hồ sơ cá nhân.
     *
     * @param array<string, mixed> $data
     */
    public function updateProfile(int $id, array $data): array
    {
        $fields = [];
        $params = [':id' => $id];

        if (isset($data['name'])) {
            $fields[] = 'name = :name';
            $params[':name'] = $data['name'];
        }

        if (isset($data['phone'])) {
            $fields[] = 'phone = :phone';
            $params[':phone'] = $data['phone'];
        }

        if (array_key_exists('avatar_url', $data)) {
            $fields[] = 'avatar_url = :avatar_url';
            $params[':avatar_url'] = $data['avatar_url'];
        }

        if (empty($fields)) {
            return $this->findById($id) ?? [];
        }

        $fields[] = 'updated_at = NOW()';

        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        $user = $this->findById($id);
        if ($user === null) {
            throw new RuntimeException('Không tìm thấy người dùng sau khi cập nhật.');
        }

        return $user;
    }

    /**
     * Lấy danh sách khách hàng (dành cho admin).
     *
     * @return array<int, array<string, mixed>>
     */
    public function allCustomers(): array
    {
        $stmt = $this->pdo->query(
            "SELECT id, name, email, phone, role, avatar_url, created_at
             FROM users
             WHERE role = 'user'
             ORDER BY created_at DESC"
        );

        return $stmt->fetchAll();
    }

    /**
     * Đếm tổng số khách hàng (users có role = 'user').
     */
    public function countCustomers(): int
    {
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM users WHERE role = 'user'");
        return (int) $stmt->fetchColumn();
    }

    /**
     * Lấy tất cả users (dành cho admin).
     *
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        $stmt = $this->pdo->query(
            'SELECT id, name, email, phone, role, avatar_url, created_at, updated_at
             FROM users
             ORDER BY created_at DESC'
        );

        return $stmt->fetchAll();
    }

    /**
     * Tìm user theo email.
     *
     * @return array<string, mixed>|null
     */
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, name, email, phone, role, avatar_url, created_at, updated_at
             FROM users
             WHERE LOWER(email) = LOWER(:email) LIMIT 1'
        );
        $stmt->execute([':email' => $email]);

        $user = $stmt->fetch();
        return $user ?: null;
    }

    /**
     * Cập nhật user (admin only).
     *
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    public function update(int $id, array $data): array
    {
        $fields = [];
        $params = [':id' => $id];

        if (isset($data['name'])) {
            $fields[] = 'name = :name';
            $params[':name'] = $data['name'];
        }

        if (isset($data['email'])) {
            $fields[] = 'email = :email';
            $params[':email'] = $data['email'];
        }

        if (isset($data['phone'])) {
            $fields[] = 'phone = :phone';
            $params[':phone'] = $data['phone'];
        }

        if (isset($data['password_hash'])) {
            $fields[] = 'password_hash = :password_hash';
            $params[':password_hash'] = $data['password_hash'];
        }

        if (isset($data['role'])) {
            $fields[] = 'role = :role';
            $params[':role'] = $data['role'];
        }

        if (array_key_exists('avatar_url', $data)) {
            $fields[] = 'avatar_url = :avatar_url';
            $params[':avatar_url'] = $data['avatar_url'];
        }

        if (empty($fields)) {
            return $this->findById($id) ?? [];
        }

        $fields[] = 'updated_at = NOW()';

        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        $user = $this->findById($id);
        if ($user === null) {
            throw new RuntimeException('Không tìm thấy người dùng sau khi cập nhật.');
        }

        return $user;
    }

    /**
     * Xóa user (admin only).
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Reset mật khẩu cho user theo email.
     * 
     * @return array<string, mixed>|null Trả về thông tin user nếu thành công, null nếu không tìm thấy
     */
    public function resetPasswordByEmail(string $email, string $newPasswordHash): ?array
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users 
             SET password_hash = :password_hash, updated_at = NOW() 
             WHERE LOWER(email) = LOWER(:email)'
        );
        
        $stmt->execute([
            ':email' => $email,
            ':password_hash' => $newPasswordHash,
        ]);

        if ($stmt->rowCount() === 0) {
            return null;
        }

        return $this->findByEmail($email);
    }
}


