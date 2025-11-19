<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../Models/PromotionRepository.php';

/**
 * API quản lý khuyến mãi (chỉ dành cho admin).
 */
class PromotionController
{
    private PromotionRepository $promotions;

    public function __construct(PromotionRepository $promotions)
    {
        $this->promotions = $promotions;
    }

    /**
     * Liệt kê tất cả khuyến mãi.
     */
    public function index(): void
    {
        $data = $this->promotions->all();

        respond_json([
            'status' => 'ok',
            'data' => $data,
        ]);
    }

    /**
     * Tạo khuyến mãi mới.
     */
    public function store(): void
    {
        $payload = $this->getJsonPayload();

        if (!isset($payload['code'], $payload['discount_percent'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Thiếu thông tin bắt buộc: code, discount_percent.',
            ], 422);
        }

        $code = trim((string) $payload['code']);
        $discountPercent = (float) $payload['discount_percent'];

        if (empty($code)) {
            respond_json([
                'status' => 'error',
                'message' => 'Mã khuyến mãi không được để trống.',
            ], 422);
        }

        if ($discountPercent < 0 || $discountPercent > 100) {
            respond_json([
                'status' => 'error',
                'message' => 'Phần trăm giảm giá phải từ 0 đến 100.',
            ], 422);
        }

        // Kiểm tra code đã tồn tại chưa
        $existing = $this->promotions->findByCode($code);
        if ($existing !== null) {
            respond_json([
                'status' => 'error',
                'message' => 'Mã khuyến mãi đã tồn tại.',
            ], 409);
        }

        try {
            $promo = $this->promotions->create([
                'code' => $code,
                'description' => $payload['description'] ?? null,
                'discount_percent' => $discountPercent,
                'status' => $payload['status'] ?? 'active',
                'valid_from' => $payload['valid_from'] ?? null,
                'valid_until' => $payload['valid_until'] ?? null,
            ]);

            respond_json([
                'status' => 'ok',
                'data' => $promo,
            ], 201);
        } catch (Exception $e) {
            respond_json([
                'status' => 'error',
                'message' => 'Không thể tạo khuyến mãi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cập nhật khuyến mãi.
     */
    public function update(int $id): void
    {
        $promo = $this->promotions->find($id);
        if ($promo === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Khuyến mãi không tồn tại.',
            ], 404);
        }

        $payload = $this->getJsonPayload();

        // Validate discount_percent nếu có
        if (isset($payload['discount_percent'])) {
            $discountPercent = (float) $payload['discount_percent'];
            if ($discountPercent < 0 || $discountPercent > 100) {
                respond_json([
                    'status' => 'error',
                    'message' => 'Phần trăm giảm giá phải từ 0 đến 100.',
                ], 422);
            }
        }

        // Kiểm tra code trùng nếu có thay đổi
        if (isset($payload['code']) && $payload['code'] !== $promo['code']) {
            $code = trim((string) $payload['code']);
            $existing = $this->promotions->findByCode($code);
            if ($existing !== null && $existing['id'] !== $id) {
                respond_json([
                    'status' => 'error',
                    'message' => 'Mã khuyến mãi đã tồn tại.',
                ], 409);
            }
        }

        try {
            $updated = $this->promotions->update($id, $payload);

            respond_json([
                'status' => 'ok',
                'data' => $updated,
            ]);
        } catch (Exception $e) {
            respond_json([
                'status' => 'error',
                'message' => 'Không thể cập nhật khuyến mãi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Xóa khuyến mãi.
     */
    public function destroy(int $id): void
    {
        $promo = $this->promotions->find($id);
        if ($promo === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Khuyến mãi không tồn tại.',
            ], 404);
        }

        $deleted = $this->promotions->delete($id);
        if (!$deleted) {
            respond_json([
                'status' => 'error',
                'message' => 'Không thể xóa khuyến mãi.',
            ], 500);
        }

        respond_json([
            'status' => 'ok',
            'message' => 'Đã xóa khuyến mãi thành công.',
        ]);
    }

    /**
     * Lấy JSON payload từ request body.
     *
     * @return array<string, mixed>
     */
    private function getJsonPayload(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!is_array($data)) {
            return [];
        }

        return $data;
    }
}

