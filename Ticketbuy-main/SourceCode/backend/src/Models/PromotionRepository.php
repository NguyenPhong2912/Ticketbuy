<?php

declare(strict_types=1);

/**
 * Repository truy cập dữ liệu khuyến mãi.
 */
class PromotionRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Lấy tất cả khuyến mãi.
     *
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        $stmt = $this->pdo->query(
            'SELECT id, code, description, discount_percent, status, valid_from, valid_until, created_at, updated_at
             FROM promotions
             ORDER BY created_at DESC'
        );

        return $stmt->fetchAll();
    }

    /**
     * Tìm khuyến mãi theo ID.
     *
     * @return array<string, mixed>|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, code, description, discount_percent, status, valid_from, valid_until, created_at, updated_at
             FROM promotions
             WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);

        $promo = $stmt->fetch();
        return $promo ?: null;
    }

    /**
     * Tìm khuyến mãi theo code.
     *
     * @return array<string, mixed>|null
     */
    public function findByCode(string $code): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, code, description, discount_percent, status, valid_from, valid_until, created_at, updated_at
             FROM promotions
             WHERE code = :code LIMIT 1'
        );
        $stmt->execute([':code' => $code]);

        $promo = $stmt->fetch();
        return $promo ?: null;
    }

    /**
     * Tạo khuyến mãi mới.
     *
     * @param array{code:string,description:?string,discount_percent:float|int,status:?string,valid_from:?string,valid_until:?string} $data
     *
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO promotions (code, description, discount_percent, status, valid_from, valid_until, created_at, updated_at)
             VALUES (:code, :description, :discount_percent, :status, :valid_from, :valid_until, NOW(), NOW())'
        );

        $stmt->execute([
            ':code' => $data['code'],
            ':description' => $data['description'] ?? null,
            ':discount_percent' => $data['discount_percent'],
            ':status' => $data['status'] ?? 'active',
            ':valid_from' => $data['valid_from'] ?? null,
            ':valid_until' => $data['valid_until'] ?? null,
        ]);

        $id = (int) $this->pdo->lastInsertId();
        $promo = $this->find($id);

        if ($promo === null) {
            throw new RuntimeException('Không thể lấy thông tin khuyến mãi vừa tạo.');
        }

        return $promo;
    }

    /**
     * Cập nhật khuyến mãi.
     *
     * @param array<string, mixed> $data
     */
    public function update(int $id, array $data): array
    {
        $fields = [];
        $params = [':id' => $id];

        if (isset($data['code'])) {
            $fields[] = 'code = :code';
            $params[':code'] = $data['code'];
        }

        if (isset($data['description'])) {
            $fields[] = 'description = :description';
            $params[':description'] = $data['description'];
        }

        if (isset($data['discount_percent'])) {
            $fields[] = 'discount_percent = :discount_percent';
            $params[':discount_percent'] = $data['discount_percent'];
        }

        if (isset($data['status'])) {
            $fields[] = 'status = :status';
            $params[':status'] = $data['status'];
        }

        if (isset($data['valid_from'])) {
            $fields[] = 'valid_from = :valid_from';
            $params[':valid_from'] = $data['valid_from'];
        }

        if (isset($data['valid_until'])) {
            $fields[] = 'valid_until = :valid_until';
            $params[':valid_until'] = $data['valid_until'];
        }

        if (empty($fields)) {
            return $this->find($id) ?? [];
        }

        $fields[] = 'updated_at = NOW()';
        $sql = 'UPDATE promotions SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        $promo = $this->find($id);
        return $promo ?? [];
    }

    /**
     * Xóa khuyến mãi.
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM promotions WHERE id = :id');
        $stmt->execute([':id' => $id]);

        return $stmt->rowCount() > 0;
    }

    /**
     * Đếm tổng số khuyến mãi.
     */
    public function count(): int
    {
        $stmt = $this->pdo->query('SELECT COUNT(*) FROM promotions WHERE status = "active"');
        return (int) $stmt->fetchColumn();
    }
}

