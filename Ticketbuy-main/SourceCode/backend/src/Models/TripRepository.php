<?php

declare(strict_types=1);

/**
 * Repository quản lý dữ liệu chuyến xe (trips).
 */
class TripRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Lấy danh sách chuyến xe theo ngày.
     *
     * @return array<int, array<string, mixed>>
     */
    public function findByDate(string $date): array
    {
        // Kiểm tra xem bảng có cột departure_date hay departure_at
        $stmt = $this->pdo->query("SHOW COLUMNS FROM trips LIKE 'departure_date'");
        $hasDepartureDate = $stmt->rowCount() > 0;
        
        if ($hasDepartureDate) {
            // Cấu trúc mới: có departure_date và departure_time
            $stmt = $this->pdo->prepare(
                'SELECT t.id,
                        t.route_id,
                        t.departure_date,
                        t.departure_time,
                        t.total_seats,
                        t.available_seats,
                        t.status,
                        r.name AS route_name,
                        r.details AS route_details,
                        r.price AS route_price
                 FROM trips t
                 INNER JOIN routes r ON r.id = t.route_id
                 WHERE DATE(t.departure_date) = :date
                   AND t.status = "active"
                 ORDER BY t.departure_time ASC, r.name ASC'
            );
        } else {
            // Cấu trúc cũ: có departure_at (datetime)
            $stmt = $this->pdo->prepare(
                'SELECT t.id,
                        t.route_id,
                        DATE(t.departure_at) AS departure_date,
                        TIME(t.departure_at) AS departure_time,
                        t.seats AS total_seats,
                        t.seats AS available_seats,
                        "active" AS status,
                        CONCAT(t.origin, " → ", t.destination) AS route_name,
                        t.route_label AS route_details,
                        t.price AS route_price
                 FROM trips t
                 WHERE DATE(t.departure_at) = :date
                 ORDER BY t.departure_at ASC'
            );
        }

        $stmt->execute([':date' => $date]);
        return $stmt->fetchAll();
    }

    /**
     * Tìm một chuyến xe theo ID.
     */
    public function find(int $id): ?array
    {
        // Kiểm tra xem bảng có cột departure_date hay departure_at
        $checkStmt = $this->pdo->query("SHOW COLUMNS FROM trips LIKE 'departure_date'");
        $hasDepartureDate = $checkStmt->rowCount() > 0;
        
        if ($hasDepartureDate) {
            // Cấu trúc mới: có departure_date và departure_time
            $stmt = $this->pdo->prepare(
                'SELECT t.id,
                        t.route_id,
                        t.departure_date,
                        t.departure_time,
                        t.total_seats,
                        t.available_seats,
                        t.status,
                        r.name AS route_name,
                        r.details AS route_details,
                        r.price AS route_price
                 FROM trips t
                 INNER JOIN routes r ON r.id = t.route_id
                 WHERE t.id = :id
                 LIMIT 1'
            );
        } else {
            // Cấu trúc cũ: có departure_at (datetime)
            $stmt = $this->pdo->prepare(
                'SELECT t.id,
                        t.route_id,
                        DATE(t.departure_at) AS departure_date,
                        TIME(t.departure_at) AS departure_time,
                        t.seats AS total_seats,
                        t.seats AS available_seats,
                        "active" AS status,
                        CONCAT(t.origin, " → ", t.destination) AS route_name,
                        t.route_label AS route_details,
                        t.price AS route_price
                 FROM trips t
                 WHERE t.id = :id
                 LIMIT 1'
            );
        }

        $stmt->execute([':id' => $id]);
        $trip = $stmt->fetch();

        return $trip ?: null;
    }

    /**
     * Cập nhật số ghế còn trống sau khi đặt vé.
     */
    public function updateAvailableSeats(int $tripId, int $seatsBooked): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE trips 
             SET available_seats = available_seats - :seats_booked,
                 updated_at = NOW()
             WHERE id = :id 
               AND available_seats >= :seats_booked'
        );

        return $stmt->execute([
            ':id' => $tripId,
            ':seats_booked' => $seatsBooked,
        ]);
    }
}

