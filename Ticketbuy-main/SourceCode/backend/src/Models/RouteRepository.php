<?php

declare(strict_types=1);

/**
 * Repository quản lý dữ liệu tuyến xe.
 */
class RouteRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Lấy danh sách tuyến xe.
     *
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        $stmt = $this->pdo->query(
            'SELECT id, name, details, price, departure_date, created_at, updated_at FROM routes ORDER BY id DESC'
        );

        return $stmt->fetchAll();
    }

    /**
     * Tạo tuyến xe mới.
     *
     * @param array{name:string, details:string|null, price:float, departure_date?:string|null} $data
     *
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO routes (name, details, price, departure_date, created_at, updated_at) VALUES (:name, :details, :price, :departure_date, NOW(), NOW())'
        );

        $stmt->execute([
            ':name' => $data['name'],
            ':details' => $data['details'],
            ':price' => $data['price'],
            ':departure_date' => $data['departure_date'] ?? null,
        ]);

        $id = (int) $this->pdo->lastInsertId();

        return $this->find($id);
    }

    /**
     * Cập nhật tuyến xe.
     *
     * @param array{name?:string, details?:string|null, price?:float, departure_date?:string|null} $data
     */
    public function update(int $id, array $data): ?array
    {
        $fields = [];
        $params = [':id' => $id];

        if (isset($data['name'])) {
            $fields[] = 'name = :name';
            $params[':name'] = $data['name'];
        }

        if (array_key_exists('details', $data)) {
            $fields[] = 'details = :details';
            $params[':details'] = $data['details'];
        }

        if (isset($data['price'])) {
            $fields[] = 'price = :price';
            $params[':price'] = $data['price'];
        }

        if (array_key_exists('departure_date', $data)) {
            $fields[] = 'departure_date = :departure_date';
            $params[':departure_date'] = $data['departure_date'] ?: null;
        }

        if (empty($fields)) {
            return $this->find($id);
        }

        $fields[] = 'updated_at = NOW()';

        $sql = 'UPDATE routes SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $this->find($id);
    }

    /**
     * Tìm một tuyến xe theo ID.
     */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, name, details, price, departure_date, created_at, updated_at FROM routes WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $id]);

        $route = $stmt->fetch();

        return $route ?: null;
    }

    /**
     * Xoá tuyến xe theo ID.
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM routes WHERE id = :id');
        return $stmt->execute([':id' => $id]);
    }

    /**
     * Đếm tổng số tuyến xe.
     */
    public function count(): int
    {
        $stmt = $this->pdo->query('SELECT COUNT(*) FROM routes');
        return (int) $stmt->fetchColumn();
    }

    /**
     * Lấy danh sách các địa điểm duy nhất từ routes.
     * Parse route name (format: "Origin → Destination") để extract locations.
     *
     * @return array<int, string>
     */
    public function getUniqueLocations(): array
    {
        $stmt = $this->pdo->query('SELECT DISTINCT name FROM routes ORDER BY name ASC');
        $routes = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $locations = [];
        foreach ($routes as $routeName) {
            // Parse format: "TP. HCM → Đà Lạt" hoặc "Hà Nội → TP. HCM"
            if (preg_match('/^(.+?)\s*→\s*(.+)$/u', $routeName, $matches)) {
                $origin = trim($matches[1]);
                $destination = trim($matches[2]);
                
                if (!in_array($origin, $locations, true)) {
                    $locations[] = $origin;
                }
                if (!in_array($destination, $locations, true)) {
                    $locations[] = $destination;
                }
            }
        }
        
        // Sort alphabetically
        sort($locations);
        
        return $locations;
    }
}

