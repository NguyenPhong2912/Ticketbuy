<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../Models/RouteRepository.php';

/**
 * Controller xử lý request liên quan tới tuyến xe.
 */
class RouteController
{
    private RouteRepository $repository;

    public function __construct(RouteRepository $repository)
    {
        $this->repository = $repository;
    }

    public function index(): void
    {
        $routes = $this->repository->all();

        respond_json([
            'status' => 'ok',
            'data' => $routes,
        ]);
    }

    public function store(): void
    {
        $payload = $this->getJsonPayload();

        if (!isset($payload['name'], $payload['price'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Thiếu dữ liệu bắt buộc: name, price',
            ], 422);
        }

        $route = $this->repository->create([
            'name' => trim((string) $payload['name']),
            'details' => isset($payload['details']) ? trim((string) $payload['details']) : null,
            'price' => (float) $payload['price'],
            'departure_date' => isset($payload['departure_date']) && $payload['departure_date'] ? (string) $payload['departure_date'] : null,
        ]);

        respond_json([
            'status' => 'ok',
            'data' => $route,
        ], 201);
    }

    public function destroy(int $id): void
    {
        $deleted = $this->repository->delete($id);

        if (!$deleted) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy tuyến cần xoá',
            ], 404);
        }

        respond_json([
            'status' => 'ok',
            'message' => 'Đã xoá tuyến thành công',
        ]);
    }

    public function update(int $id): void
    {
        $payload = $this->getJsonPayload();
        $fields = array_intersect_key($payload, array_flip(['name', 'details', 'price', 'departure_date']));

        if (empty($fields)) {
            respond_json([
                'status' => 'error',
                'message' => 'Không có dữ liệu hợp lệ để cập nhật.',
            ], 422);
        }

        if (isset($fields['name'])) {
            $fields['name'] = trim((string) $fields['name']);
        }

        if (array_key_exists('details', $fields)) {
            $fields['details'] = $fields['details'] !== null
                ? trim((string) $fields['details'])
                : null;
        }

        if (isset($fields['price'])) {
            $fields['price'] = (float) $fields['price'];
        }

        if (array_key_exists('departure_date', $fields)) {
            $fields['departure_date'] = $fields['departure_date'] ? (string) $fields['departure_date'] : null;
        }

        $route = $this->repository->update($id, $fields);
        if ($route === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy tuyến xe.',
            ], 404);
        }

        respond_json([
            'status' => 'ok',
            'message' => 'Cập nhật tuyến xe thành công.',
            'data' => $route,
        ]);
    }

    /**
     * Lấy dữ liệu JSON từ body.
     *
     * @return array<string, mixed>
     */
    private function getJsonPayload(): array
    {
        $content = file_get_contents('php://input') ?: '';
        $decoded = json_decode($content, true);

        if (!is_array($decoded)) {
            respond_json([
                'status' => 'error',
                'message' => 'Payload không hợp lệ hoặc không phải JSON',
            ], 400);
        }

        return $decoded;
    }
}

