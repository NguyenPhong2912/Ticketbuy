<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../Models/BookingRepository.php';
require_once __DIR__ . '/../Models/RouteRepository.php';
require_once __DIR__ . '/../Models/PromotionRepository.php';
require_once __DIR__ . '/../Models/TripRepository.php';

/**
 * API đặt vé cho khách hàng và quản trị viên.
 */
class BookingController
{
    private BookingRepository $bookings;

    private RouteRepository $routes;

    private PromotionRepository $promotions;

    private TripRepository $trips;

    public function __construct(BookingRepository $bookings, RouteRepository $routes, PromotionRepository $promotions = null, TripRepository $trips = null)
    {
        $this->bookings = $bookings;
        $this->routes = $routes;
        $this->promotions = $promotions ?? new PromotionRepository(getDatabaseConnection(false));
        $this->trips = $trips ?? new TripRepository(getDatabaseConnection(false));
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
        // Nếu có trip_id trong payload, chỉ kiểm tra ghế đã đặt cho trip cụ thể đó
        $tripId = isset($payload['trip_id']) ? (int) $payload['trip_id'] : null;
        $bookedSeats = $this->bookings->getBookedSeats($routeId, $departureDate, $tripId);
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

        // Calculate base price
        $basePrice = (float) $route['price'] * $seatQuantity;
        $promotionCode = null;
        $discountAmount = 0.0;
        $totalPrice = $basePrice;

        // Validate and apply promotion code if provided
        // Nếu promotion code đã được validate ở frontend (đã check usage), chỉ cần validate lại code (không check usage)
        if (isset($payload['promotion_code']) && !empty(trim($payload['promotion_code']))) {
            $promoCode = trim($payload['promotion_code']);
            
            // Nếu có flag promotion_validated, chỉ validate code (không check usage) vì đã check ở frontend
            $checkUsage = !isset($payload['promotion_validated']) || $payload['promotion_validated'] !== true;
            
            // Validate code (có thể check usage hoặc không tùy theo flag)
            $validation = $this->promotions->validateCode($promoCode, $userId, $checkUsage);
            
            if (!$validation['valid']) {
                respond_json([
                    'status' => 'error',
                    'message' => $validation['message'],
                ], 400);
                return;
            }

            $promotion = $validation['promotion'];
            $promotionCode = $promotion['code'];
            
            // Nếu frontend đã gửi total_price và discount_amount, sử dụng chúng
            // Nếu không, tính toán từ promotion
            if (isset($payload['total_price']) && isset($payload['discount_amount'])) {
                $totalPrice = (float) $payload['total_price'];
                $discountAmount = (float) $payload['discount_amount'];
            } else {
                $discountPercent = (float) $promotion['discount_percent'];
                $discountAmount = round(($basePrice * $discountPercent) / 100.0, 2);
                $totalPrice = round($basePrice - $discountAmount, 2);
            }
            
            // Ensure total_price is never negative (can be 0 for 100% discount)
            if ($totalPrice < 0) {
                $totalPrice = 0.0;
            }
        } else {
            // KHÔNG có promotion code
            // Nếu frontend có gửi total_price và discount_amount, sử dụng chúng (trường hợp không có promotion nhưng frontend vẫn gửi)
            if (isset($payload['total_price']) && $payload['total_price'] !== null && $payload['total_price'] !== '') {
                $totalPrice = (float) $payload['total_price'];
            } else {
                $totalPrice = $basePrice; // Mặc định = basePrice
            }
            
            if (isset($payload['discount_amount']) && $payload['discount_amount'] !== null && $payload['discount_amount'] !== '') {
                $discountAmount = (float) $payload['discount_amount'];
            } else {
                $discountAmount = 0.0; // Mặc định = 0
            }
        }
        
        // Ensure total_price is never null (fallback cuối cùng)
        if ($totalPrice === null || $totalPrice === '') {
            $totalPrice = $basePrice;
        }
        
        // Ensure values are properly formatted (allow 0 for 100% discount)
        $totalPrice = (float) $totalPrice;
        $discountAmount = (float) $discountAmount;
        
        // Ensure promotion_code is null if empty string
        if ($promotionCode !== null && trim($promotionCode) === '') {
            $promotionCode = null;
        }

        try {
            $booking = $this->bookings->create([
                'user_id' => $userId,
                'route_id' => $routeId,
                'trip_id' => $tripId, // QUAN TRỌNG: Lưu trip_id để link chính xác
                'seat_quantity' => $seatQuantity,
                'seat_numbers' => $seatNumbers,
                'departure_date' => $departureDate,
                'status' => $payload['status'] ?? 'pending',
                'promotion_code' => $promotionCode ?: null,
                'total_price' => $totalPrice,
                'discount_amount' => $discountAmount,
            ]);
        } catch (Exception $e) {
            error_log("BookingController::store - Error creating booking: " . $e->getMessage());
            error_log("Trace: " . $e->getTraceAsString());
            respond_json([
                'status' => 'error',
                'message' => 'Không thể tạo vé: ' . $e->getMessage(),
            ], 500);
            return;
        }

        // Update available seats in trips table
        // QUAN TRỌNG: Phải tìm ĐÚNG trip cụ thể dựa trên trip_id hoặc route_id + departure_date + departure_time
        $matchingTrip = null;
        
        // Nếu có trip_id trong payload, sử dụng trực tiếp (chính xác nhất)
        if ($tripId !== null) {
            try {
                $matchingTrip = $this->trips->find($tripId);
            } catch (Exception $e) {
                error_log("BookingController::store - Error finding trip: " . $e->getMessage());
            }
        } else {
            // Nếu không có trip_id, tìm theo route_id + departure_date
            // LƯU Ý: Có thể có nhiều trips cùng route+date nhưng khác giờ, nên chỉ lấy trip đầu tiên
            // Tốt nhất là frontend nên gửi trip_id
            try {
                $trips = $this->trips->findByDate($departureDate);
                foreach ($trips as $trip) {
                    if ((int) $trip['route_id'] === $routeId) {
                        $matchingTrip = $trip;
                        break; // Lấy trip đầu tiên tìm thấy
                    }
                }
            } catch (Exception $e) {
                error_log("BookingController::store - Error finding trips by date: " . $e->getMessage());
            }
        }
        
        if ($matchingTrip && isset($matchingTrip['id'])) {
            try {
                $this->trips->updateAvailableSeats((int) $matchingTrip['id'], $seatQuantity);
            } catch (Exception $e) {
                error_log("BookingController::store - Error updating available seats: " . $e->getMessage());
                // Không throw error vì booking đã được tạo thành công
            }
        } else {
            // Log warning nếu không tìm thấy trip
            error_log("BookingController::store: Could not find matching trip for route_id=$routeId, departure_date=$departureDate, trip_id=" . ($tripId ?? 'null'));
        }

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

        // Get current booking to check status change
        $currentBooking = $this->bookings->find($bookingId);
        if ($currentBooking === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy vé.',
            ], 404);
            return;
        }

        $oldStatus = $currentBooking['status'];
        $payload = $this->getJsonPayload();
        $fields = array_intersect_key($payload, array_flip(['status', 'seat_quantity', 'departure_date', 'seat_numbers']));

        if (empty($fields)) {
            respond_json([
                'status' => 'error',
                'message' => 'Không có trường dữ liệu hợp lệ để cập nhật.',
            ], 422);
            return;
        }

        $booking = $this->bookings->update($bookingId, $fields);
        if ($booking === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy vé.',
            ], 404);
            return;
        }

        // Handle seat unlocking when status changes to cancelled
        $newStatus = $fields['status'] ?? $oldStatus;
        if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
            // Unlock seats: restore available_seats in trips
            $seatQuantity = (int) $booking['seat_quantity'];
            
            // Nếu booking có trip_id, restore đúng trip đó (CHÍNH XÁC)
            if (isset($booking['trip_id']) && $booking['trip_id'] !== null) {
                $this->trips->restoreAvailableSeats((int) $booking['trip_id'], $seatQuantity);
            } else {
                // Fallback: tìm trip theo route_id + departure_date
                $routeId = (int) $booking['route_id'];
                $departureDate = $booking['departure_date'];
                $trips = $this->trips->findByDate($departureDate);
                $matchingTrip = null;
                foreach ($trips as $trip) {
                    if ((int) $trip['route_id'] === $routeId) {
                        $matchingTrip = $trip;
                        break;
                    }
                }
                if ($matchingTrip && isset($matchingTrip['id'])) {
                    $this->trips->restoreAvailableSeats((int) $matchingTrip['id'], $seatQuantity);
                }
            }
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
            return;
        }

        $isOwner = (int) $booking['user_id'] === (int) $currentUser['id'];
        $isAdmin = $currentUser['role'] === 'admin';

        if (!$isOwner && !$isAdmin) {
            respond_json([
                'status' => 'error',
                'message' => 'Bạn không có quyền huỷ vé này.',
            ], 403);
            return;
        }

        // Unlock seats before deleting booking
        $seatQuantity = (int) $booking['seat_quantity'];
        $status = $booking['status'];
        
        // Only unlock if booking was confirmed or pending (not already cancelled)
        if ($status !== 'cancelled') {
            // Nếu booking có trip_id, restore đúng trip đó (CHÍNH XÁC)
            if (isset($booking['trip_id']) && $booking['trip_id'] !== null) {
                $this->trips->restoreAvailableSeats((int) $booking['trip_id'], $seatQuantity);
            } else {
                // Fallback: tìm trip theo route_id + departure_date
                $routeId = (int) $booking['route_id'];
                $departureDate = $booking['departure_date'];
                $trips = $this->trips->findByDate($departureDate);
                $matchingTrip = null;
                foreach ($trips as $trip) {
                    if ((int) $trip['route_id'] === $routeId) {
                        $matchingTrip = $trip;
                        break;
                    }
                }
                if ($matchingTrip && isset($matchingTrip['id'])) {
                    $this->trips->restoreAvailableSeats((int) $matchingTrip['id'], $seatQuantity);
                }
            }
        }

        $deleted = $this->bookings->delete($bookingId);
        if (!$deleted) {
            respond_json([
                'status' => 'error',
                'message' => 'Không thể huỷ vé, thử lại sau.',
            ], 500);
            return;
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


