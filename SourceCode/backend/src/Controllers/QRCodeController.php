<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../Models/BookingRepository.php';
require_once __DIR__ . '/../Models/UserRepository.php';

class QRCodeController
{
    private BookingRepository $bookingRepository;
    private UserRepository $userRepository;

    public function __construct(BookingRepository $bookingRepository, UserRepository $userRepository)
    {
        $this->bookingRepository = $bookingRepository;
        $this->userRepository = $userRepository;
    }

    /**
     * Tạo QR code cho các vé đã chọn.
     * 
     * @param array<string, mixed> $currentUser
     */
    public function generate(array $currentUser): void
    {
        $payload = getJsonPayload();

        if (!isset($payload['booking_ids']) || !is_array($payload['booking_ids'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Thiếu thông tin booking_ids.',
            ], 422);
        }

        $bookingIds = array_map('intval', $payload['booking_ids']);
        $userId = (int) $currentUser['id'];

        // Lấy thông tin các vé
        $allBookings = $this->bookingRepository->forUser($userId);
        $selectedBookings = array_filter($allBookings, function ($booking) use ($bookingIds) {
            return in_array((int) $booking['id'], $bookingIds, true);
        });

        if (empty($selectedBookings)) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy vé đã chọn hoặc vé không thuộc về bạn.',
            ], 404);
        }

        // Chỉ lấy vé đã xác nhận
        $confirmedBookings = array_filter($selectedBookings, function ($booking) {
            return $booking['status'] === 'confirmed';
        });

        if (empty($confirmedBookings)) {
            respond_json([
                'status' => 'error',
                'message' => 'Chỉ có thể tạo QR code cho vé đã xác nhận.',
            ], 422);
        }

        // Tạo dữ liệu JSON cho QR code
        $qrData = [
            'user' => [
                'name' => $currentUser['name'] ?? '',
                'email' => $currentUser['email'] ?? '',
            ],
            'bookings' => array_map(function ($booking) {
                return [
                    'id' => $booking['id'],
                    'code' => 'GB-' . str_pad((string) $booking['id'], 4, '0', STR_PAD_LEFT),
                    'route' => $booking['route_name'] ?? '',
                    'departure_date' => $booking['departure_date'] ?? '',
                    'seat_quantity' => $booking['seat_quantity'] ?? 0,
                    'seat_numbers' => $booking['seat_numbers'] ?? [],
                    'status' => $booking['status'] ?? '',
                ];
            }, array_values($confirmedBookings)),
            'generated_at' => date('c'),
        ];

        $qrDataString = json_encode($qrData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        // Tạo QR code sử dụng API công khai
        $qrCodeUrl = $this->generateQRCodeUrl($qrDataString);

        // Trả về URL QR code hoặc base64 image
        respond_json([
            'status' => 'ok',
            'data' => [
                'qr_code_url' => $qrCodeUrl,
                'qr_data' => $qrData,
            ],
        ]);
    }

    /**
     * Tạo URL QR code từ dữ liệu.
     * Sử dụng API công khai để tạo QR code.
     */
    private function generateQRCodeUrl(string $data): string
    {
        // Sử dụng API công khai để tạo QR code
        // Option 1: QR Server API (miễn phí, không cần API key)
        $encodedData = urlencode($data);
        $size = 400;
        
        // QR Server API: https://api.qrserver.com/v1/create-qr-code/
        return "https://api.qrserver.com/v1/create-qr-code/?size={$size}x{$size}&data=" . $encodedData;
    }

    /**
     * Tải QR code image và trả về base64.
     */
    public function download(array $currentUser): void
    {
        $payload = getJsonPayload();

        if (!isset($payload['booking_ids']) || !is_array($payload['booking_ids'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Thiếu thông tin booking_ids.',
            ], 422);
        }

        $bookingIds = array_map('intval', $payload['booking_ids']);
        $userId = (int) $currentUser['id'];

        // Lấy thông tin các vé
        $allBookings = $this->bookingRepository->forUser($userId);
        $selectedBookings = array_filter($allBookings, function ($booking) use ($bookingIds) {
            return in_array((int) $booking['id'], $bookingIds, true);
        });

        if (empty($selectedBookings)) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy vé đã chọn hoặc vé không thuộc về bạn.',
            ], 404);
        }

        // Chỉ lấy vé đã xác nhận
        $confirmedBookings = array_filter($selectedBookings, function ($booking) {
            return $booking['status'] === 'confirmed';
        });

        if (empty($confirmedBookings)) {
            respond_json([
                'status' => 'error',
                'message' => 'Chỉ có thể tạo QR code cho vé đã xác nhận.',
            ], 422);
        }

        // Tạo dữ liệu JSON cho QR code
        $qrData = [
            'user' => [
                'name' => $currentUser['name'] ?? '',
                'email' => $currentUser['email'] ?? '',
            ],
            'bookings' => array_map(function ($booking) {
                return [
                    'id' => $booking['id'],
                    'code' => 'GB-' . str_pad((string) $booking['id'], 4, '0', STR_PAD_LEFT),
                    'route' => $booking['route_name'] ?? '',
                    'departure_date' => $booking['departure_date'] ?? '',
                    'seat_quantity' => $booking['seat_quantity'] ?? 0,
                    'seat_numbers' => $booking['seat_numbers'] ?? [],
                    'status' => $booking['status'] ?? '',
                ];
            }, array_values($confirmedBookings)),
            'generated_at' => date('c'),
        ];

        $qrDataString = json_encode($qrData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        // Tạo QR code URL
        $qrCodeUrl = $this->generateQRCodeUrl($qrDataString);

        // Tải image từ URL
        $imageData = @file_get_contents($qrCodeUrl);
        
        if ($imageData === false) {
            respond_json([
                'status' => 'error',
                'message' => 'Không thể tạo QR code. Vui lòng thử lại.',
            ], 500);
        }

        // Trả về base64 image
        $base64Image = base64_encode($imageData);
        
        respond_json([
            'status' => 'ok',
            'data' => [
                'image_base64' => $base64Image,
                'image_data_url' => 'data:image/png;base64,' . $base64Image,
                'qr_data' => $qrData,
            ],
        ]);
    }
}

