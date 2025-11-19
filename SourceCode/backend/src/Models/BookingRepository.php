<?php

declare(strict_types=1);

/**
 * Repository thao tác dữ liệu đặt vé.
 */
class BookingRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Lấy danh sách vé theo người dùng.
     *
     * @return array<int, array<string, mixed>>
     */
    public function forUser(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT b.id,
                    b.user_id,
                    b.route_id,
                    b.seat_quantity,
                    b.seat_numbers,
                    b.status,
                    b.departure_date,
                    b.created_at,
                    b.updated_at,
                    r.name AS route_name,
                    r.details AS route_details,
                    r.price AS route_price
             FROM bookings b
             INNER JOIN routes r ON r.id = b.route_id
             WHERE b.user_id = :user_id
             ORDER BY b.departure_date DESC, b.id DESC'
        );
        $stmt->execute([':user_id' => $userId]);

        $rows = $stmt->fetchAll();
        return $this->decodeSeatCollections($rows);
    }

    /**
     * Lấy toàn bộ vé (dành cho admin).
     *
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        $stmt = $this->pdo->query(
            'SELECT b.id,
                    b.user_id,
                    u.name AS customer_name,
                    u.email AS customer_email,
                    u.phone AS customer_phone,
                    b.route_id,
                    r.name AS route_name,
                    r.details AS route_details,
                    r.price AS route_price,
                    b.seat_quantity,
                    b.seat_numbers,
                    b.status,
                    b.departure_date,
                    b.created_at,
                    b.updated_at
             FROM bookings b
             INNER JOIN users u ON u.id = b.user_id
             INNER JOIN routes r ON r.id = b.route_id
             ORDER BY b.created_at DESC'
        );

        $rows = $stmt->fetchAll();
        return $this->decodeSeatCollections($rows);
    }

    /**
     * Tạo vé mới.
     *
     * @param array{user_id:int,route_id:int,seat_quantity:int,departure_date:string,status?:string} $data
     *
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        $status = $data['status'] ?? 'pending';
        $seatNumbers = $data['seat_numbers'] ?? [];
        $promotionCode = $data['promotion_code'] ?? null;
        
        // Get total_price - MUST be provided from BookingController
        if (!isset($data['total_price']) || $data['total_price'] === null || $data['total_price'] === '') {
            throw new InvalidArgumentException('total_price is required but not provided');
        }
        $totalPrice = (float) $data['total_price'];
        
        // Get discount_amount - MUST be provided from BookingController (can be 0.0)
        if (!isset($data['discount_amount'])) {
            $discountAmount = 0.0;
        } else {
            $discountAmount = (float) $data['discount_amount'];
        }
        
        // Ensure values are never null
        if ($totalPrice === null) {
            throw new InvalidArgumentException('total_price cannot be null');
        }

        // Get trip_id if provided
        $tripId = $data['trip_id'] ?? null;
        
        $stmt = $this->pdo->prepare(
            'INSERT INTO bookings (user_id, route_id, trip_id, seat_quantity, seat_numbers, status, departure_date, promotion_code, total_price, discount_amount, created_at, updated_at)
             VALUES (:user_id, :route_id, :trip_id, :seat_quantity, :seat_numbers, :status, :departure_date, :promotion_code, :total_price, :discount_amount, NOW(), NOW())'
        );

        // Ensure all values are properly formatted and validate required fields
        if (!isset($data['user_id']) || !isset($data['route_id']) || !isset($data['seat_quantity']) || !isset($data['departure_date'])) {
            throw new InvalidArgumentException('Missing required fields: user_id, route_id, seat_quantity, or departure_date');
        }
        
        $params = [
            ':user_id' => (int) $data['user_id'],
            ':route_id' => (int) $data['route_id'],
            ':trip_id' => ($tripId !== null) ? (int) $tripId : null,
            ':seat_quantity' => (int) $data['seat_quantity'],
            ':seat_numbers' => $this->encodeSeatNumbers($seatNumbers),
            ':status' => (string) $status,
            ':departure_date' => (string) $data['departure_date'],
            ':promotion_code' => ($promotionCode !== null && trim($promotionCode) !== '') ? (string) $promotionCode : null,
            ':total_price' => $totalPrice, // Always float, never null
            ':discount_amount' => $discountAmount, // Always float
        ];
        
        // Verify parameter count matches SQL placeholders
        // Count only named placeholders (not functions like NOW())
        preg_match_all('/:(\w+)/', $stmt->queryString, $matches);
        $sqlPlaceholders = count($matches[0]);
        $paramCount = count($params);
        if ($sqlPlaceholders !== $paramCount) {
            error_log("SQL Parameter mismatch: SQL has $sqlPlaceholders placeholders, but $paramCount parameters provided");
            error_log("SQL: " . $stmt->queryString);
            error_log("SQL Placeholders: " . json_encode($matches[0]));
            error_log("Provided Params: " . json_encode(array_keys($params)));
            error_log("Param Values: " . json_encode($params, JSON_PARTIAL_OUTPUT_ON_ERROR));
            throw new RuntimeException("SQL parameter count mismatch: expected $sqlPlaceholders, got $paramCount");
        }

        try {
            $stmt->execute($params);
        } catch (PDOException $e) {
            error_log("PDO Error during booking insert: " . $e->getMessage());
            error_log("SQL: " . $stmt->queryString);
            error_log("Params: " . json_encode($params, JSON_PARTIAL_OUTPUT_ON_ERROR));
            throw $e;
        }

        $id = (int) $this->pdo->lastInsertId();
        return $this->find($id);
    }

    /**
     * Cập nhật trạng thái hoặc số lượng vé (dành cho admin).
     *
     * @param array<string, mixed> $data
     */
    public function update(int $id, array $data): ?array
    {
        $fields = [];
        $params = [':id' => $id];

        if (isset($data['status'])) {
            $fields[] = 'status = :status';
            $params[':status'] = $data['status'];
        }

        if (isset($data['seat_quantity'])) {
            $fields[] = 'seat_quantity = :seat_quantity';
            $params[':seat_quantity'] = $data['seat_quantity'];
        }

        if (isset($data['seat_numbers'])) {
            $fields[] = 'seat_numbers = :seat_numbers';
            $params[':seat_numbers'] = $this->encodeSeatNumbers($data['seat_numbers']);
        }

        if (isset($data['departure_date'])) {
            $fields[] = 'departure_date = :departure_date';
            $params[':departure_date'] = $data['departure_date'];
        }

        if (empty($fields)) {
            return $this->find($id);
        }

        $fields[] = 'updated_at = NOW()';

        $sql = 'UPDATE bookings SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $this->find($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM bookings WHERE id = :id');
        return $stmt->execute([':id' => $id]);
    }

    /**
     * Tìm vé theo ID.
     *
     * @return array<string, mixed>|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT b.id,
                    b.user_id,
                    u.name AS customer_name,
                    u.email AS customer_email,
                    u.phone AS customer_phone,
                    b.route_id,
                    b.trip_id,
                    r.name AS route_name,
                    r.details AS route_details,
                    r.price AS route_price,
                    b.seat_quantity,
                    b.seat_numbers,
                    b.status,
                    b.departure_date,
                    b.promotion_code,
                    b.total_price,
                    b.discount_amount,
                    b.created_at,
                    b.updated_at
             FROM bookings b
             INNER JOIN users u ON u.id = b.user_id
             INNER JOIN routes r ON r.id = b.route_id
             WHERE b.id = :id
             LIMIT 1'
        );
        
        try {
            $stmt->execute([':id' => $id]);
        } catch (PDOException $e) {
            error_log("PDO Error in BookingRepository::find: " . $e->getMessage());
            error_log("Booking ID: " . $id);
            throw $e;
        }

        $booking = $stmt->fetch();
        if (!$booking) {
            return null;
        }

        $booking['seat_numbers'] = $this->decodeSeatNumbers($booking['seat_numbers'] ?? null);
        return $booking;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     *
     * @return array<int, array<string, mixed>>
     */
    private function decodeSeatCollections(array $rows): array
    {
        foreach ($rows as &$row) {
            $row['seat_numbers'] = $this->decodeSeatNumbers($row['seat_numbers'] ?? null);
        }

        return $rows;
    }

    /**
     * Lấy danh sách ghế đã đặt cho một route và ngày cụ thể.
     * Nếu có trip_id, chỉ lấy ghế đã đặt cho trip cụ thể đó (CHÍNH XÁC).
     * Chỉ lấy các booking có status 'confirmed' hoặc 'pending'.
     *
     * @param int|null $tripId Nếu có, chỉ lấy ghế đã đặt cho trip này
     * @param string|null $departureTime Không sử dụng, giữ để tương thích
     * @return array<int, string> Danh sách mã ghế đã đặt
     */
    public function getBookedSeats(int $routeId, string $departureDate, ?int $tripId = null, ?string $departureTime = null): array
    {
        // Nếu có trip_id, chỉ lấy ghế đã đặt cho trip cụ thể đó (CHÍNH XÁC)
        // Nếu không có trip_id, lấy tất cả bookings cho route+date (fallback)
        if ($tripId !== null) {
            $stmt = $this->pdo->prepare(
                'SELECT seat_numbers
                 FROM bookings
                 WHERE trip_id = :trip_id
                   AND status IN ("confirmed", "pending")
                   AND seat_numbers IS NOT NULL'
            );
            try {
                $stmt->execute([':trip_id' => $tripId]);
            } catch (PDOException $e) {
                error_log("PDO Error in getBookedSeats (with trip_id): " . $e->getMessage());
                error_log("trip_id: " . $tripId);
                throw $e;
            }
        } else {
            // Fallback: lấy theo route_id + departure_date (không chính xác 100%)
            $stmt = $this->pdo->prepare(
                'SELECT seat_numbers
                 FROM bookings
                 WHERE route_id = :route_id
                   AND departure_date = :departure_date
                   AND status IN ("confirmed", "pending")
                   AND seat_numbers IS NOT NULL'
            );
            try {
                $stmt->execute([':route_id' => $routeId, ':departure_date' => $departureDate]);
            } catch (PDOException $e) {
                error_log("PDO Error in getBookedSeats (without trip_id): " . $e->getMessage());
                error_log("route_id: $routeId, departure_date: $departureDate");
                throw $e;
            }
        }

        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $bookedSeats = [];

        foreach ($rows as $seatNumbersJson) {
            if ($seatNumbersJson === null) {
                continue;
            }

            $decoded = $this->decodeSeatNumbers($seatNumbersJson);
            if (is_array($decoded)) {
                $bookedSeats = array_merge($bookedSeats, $decoded);
            }
        }

        return array_unique($bookedSeats);
    }

    /**
     * @param array<int|string>|null $seatNumbers
     */
    private function encodeSeatNumbers($seatNumbers): ?string
    {
        if ($seatNumbers === null) {
            return null;
        }

        if (!is_array($seatNumbers)) {
            $seatNumbers = [$seatNumbers];
        }

        $normalized = array_values(array_filter(array_map('strval', $seatNumbers), static function ($seat) {
            return $seat !== '';
        }));

        return $normalized ? json_encode($normalized, JSON_UNESCAPED_UNICODE) : null;
    }

    /**
     * @return array<int, string>
     */
    private function decodeSeatNumbers($value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        $decoded = json_decode((string) $value, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Đếm số vé được đặt trong ngày hôm nay.
     */
    public function countToday(): int
    {
        $stmt = $this->pdo->query(
            "SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = CURDATE()"
        );
        return (int) $stmt->fetchColumn();
    }

    /**
     * Đếm số vé được đặt hôm qua (để tính % tăng trưởng).
     */
    public function countYesterday(): int
    {
        $stmt = $this->pdo->query(
            "SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"
        );
        return (int) $stmt->fetchColumn();
    }
}


