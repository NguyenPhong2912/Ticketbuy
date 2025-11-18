<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../Models/BookingRepository.php';
require_once __DIR__ . '/../Models/RouteRepository.php';

/**
 * API đặt vé cho khách hàng và quản trị viên.
 */
class BookingController
{
    private BookingRepository $bookings;

    private RouteRepository $routes;

    public function __construct(BookingRepository $bookings, RouteRepository $routes)
    {
        $this->bookings = $bookings;
        $this->routes = $routes;
    }

    /**
     * Liệt kê vé dựa trên vai trò.
     *
     * @param array<string, mixed> $currentUser
     */
    public function index(array $currentUser): void
    {
        $data = $currentUser['role'] === 'admin'
            ? $this->bookings->all()
            : $this->bookings->forUser((int) $currentUser['id']);

        respond_json([
            'status' => 'ok',
            'data' => $data,
        ]);
    }

    /**
     * Tạo vé mới.
     *
     * @param array<string, mixed> $currentUser
     */
    public function store(array $currentUser): void
    {
        $payload = $this->getJsonPayload();

        if (!isset($payload['route_id'], $payload['seat_quantity'], $payload['departure_date'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Thiếu thông tin bắt buộc: route_id, seat_quantity, departure_date.',
            ], 422);
        }

        $routeId = (int) $payload['route_id'];
        $route = $this->routes->find($routeId);
        if ($route === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Tuyến xe không tồn tại.',
            ], 404);
        }

        $seatQuantity = max(1, (int) $payload['seat_quantity']);
        $departureDate = trim((string) $payload['departure_date']);

        if (!isset($payload['seat_numbers']) || !is_array($payload['seat_numbers'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Danh sách ghế không hợp lệ.',
            ], 422);
        }

        $seatNumbers = array_values(array_map(static function ($seat) {
            return trim((string) $seat);
        }, $payload['seat_numbers']));

        $seatNumbers = array_filter($seatNumbers, static fn ($seat) => $seat !== '');

        if (empty($seatNumbers)) {
            respond_json([
                'status' => 'error',
                'message' => 'Vui lòng chọn ít nhất một ghế.',
            ], 422);
        }

        if (count($seatNumbers) !== $seatQuantity) {
            respond_json([
                'status' => 'error',
                'message' => 'Số lượng ghế không khớp với danh sách ghế đã chọn.',
            ], 422);
        }

        // Kiểm tra ghế đã được đặt chưa
        $bookedSeats = $this->bookings->getBookedSeats($routeId, $departureDate);
        $normalizedBookedSeats = array_map(static fn ($seat) => strtoupper(trim((string) $seat)), $bookedSeats);
        $normalizedSelectedSeats = array_map(static fn ($seat) => strtoupper(trim((string) $seat)), $seatNumbers);
        
        $conflictingSeats = array_intersect($normalizedBookedSeats, $normalizedSelectedSeats);
        if (!empty($conflictingSeats)) {
            respond_json([
                'status' => 'error',
                'message' => 'Một hoặc nhiều ghế đã được đặt: ' . implode(', ', $conflictingSeats) . '. Vui lòng chọn ghế khác.',
            ], 409); // 409 Conflict
        }

        $userId = (int) $currentUser['id'];
        if ($currentUser['role'] === 'admin' && isset($payload['user_id'])) {
            $userId = (int) $payload['user_id'];
        }

        $booking = $this->bookings->create([
            'user_id' => $userId,
            'route_id' => $routeId,
            'seat_quantity' => $seatQuantity,
            'seat_numbers' => $seatNumbers,
            'departure_date' => $departureDate,
            'status' => $payload['status'] ?? 'pending',
        ]);

        respond_json([
            'status' => 'ok',
            'message' => 'Tạo vé thành công.',
            'data' => $booking,
        ], 201);
    }

    /**
     * Cập nhật vé - chỉ dành cho admin.
     *
     * @param array<string, mixed> $currentUser
     */
    public function update(array $currentUser, int $bookingId): void
    {
        if ($currentUser['role'] !== 'admin') {
            respond_json([
                'status' => 'error',
                'message' => 'Bạn không có quyền chỉnh sửa vé.',
            ], 403);
        }

        $payload = $this->getJsonPayload();
        $fields = array_intersect_key($payload, array_flip(['status', 'seat_quantity', 'departure_date', 'seat_numbers']));

        if (empty($fields)) {
            respond_json([
                'status' => 'error',
                'message' => 'Không có trường dữ liệu hợp lệ để cập nhật.',
            ], 422);
        }

        $booking = $this->bookings->update($bookingId, $fields);
        if ($booking === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy vé.',
            ], 404);
        }

        respond_json([
            'status' => 'ok',
            'message' => 'Cập nhật vé thành công.',
            'data' => $booking,
        ]);
    }

    /**
     * Huỷ vé - khách chỉ được huỷ vé của chính mình.
     *
     * @param array<string, mixed> $currentUser
     */
    public function destroy(array $currentUser, int $bookingId): void
    {
        $booking = $this->bookings->find($bookingId);
        if ($booking === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy vé.',
            ], 404);
        }

        $isOwner = (int) $booking['user_id'] === (int) $currentUser['id'];
        $isAdmin = $currentUser['role'] === 'admin';

        if (!$isOwner && !$isAdmin) {
            respond_json([
                'status' => 'error',
                'message' => 'Bạn không có quyền huỷ vé này.',
            ], 403);
        }

        $deleted = $this->bookings->delete($bookingId);
        if (!$deleted) {
            respond_json([
                'status' => 'error',
                'message' => 'Không thể huỷ vé, thử lại sau.',
            ], 500);
        }

        respond_json([
            'status' => 'ok',
            'message' => 'Đã huỷ vé thành công.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function getJsonPayload(): array
    {
        $content = file_get_contents('php://input') ?: '';
        $decoded = json_decode($content, true);

        if (!is_array($decoded)) {
            respond_json([
                'status' => 'error',
                'message' => 'Payload không hợp lệ hoặc không phải JSON.',
            ], 400);
        }

        return $decoded;
    }
}


