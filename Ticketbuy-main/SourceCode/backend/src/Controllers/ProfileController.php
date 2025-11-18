<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../Models/UserRepository.php';

/**
 * Quản lý hồ sơ cá nhân của người dùng.
 */
class ProfileController
{
    private UserRepository $users;

    public function __construct(UserRepository $users)
    {
        $this->users = $users;
    }

    /**
     * Trả về hồ sơ người dùng hiện tại.
     *
     * @param array<string, mixed> $currentUser
     */
    public function show(array $currentUser): void
    {
        $profile = $this->users->findById((int) $currentUser['id']);
        if ($profile === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy người dùng.',
            ], 404);
        }

        respond_json([
            'status' => 'ok',
            'data' => $profile,
        ]);
    }

    /**
     * Cập nhật hồ sơ người dùng hiện tại.
     *
     * @param array<string, mixed> $currentUser
     */
    public function update(array $currentUser): void
    {
        $payload = $this->getJsonPayload();

        $updates = [];
        if (isset($payload['name'])) {
            $updates['name'] = trim((string) $payload['name']);
        }

        if (isset($payload['phone'])) {
            $newPhone = preg_replace('/\s+/', '', (string) $payload['phone']);
            if ($newPhone === '') {
                respond_json([
                    'status' => 'error',
                    'message' => 'Số điện thoại không hợp lệ.',
                ], 422);
            }

            if ($newPhone !== $currentUser['phone'] && $this->users->existsByPhone($newPhone)) {
                respond_json([
                    'status' => 'error',
                    'message' => 'Số điện thoại đã được sử dụng.',
                ], 409);
            }

            $updates['phone'] = $newPhone;
        }

        if (array_key_exists('avatar_url', $payload)) {
            $updates['avatar_url'] = $payload['avatar_url'] !== null
                ? trim((string) $payload['avatar_url'])
                : null;
        }

        if (empty($updates)) {
            respond_json([
                'status' => 'ok',
                'message' => 'Không có thay đổi nào được áp dụng.',
                'data' => $this->users->findById((int) $currentUser['id']),
            ]);
        }

        $profile = $this->users->updateProfile((int) $currentUser['id'], $updates);

        respond_json([
            'status' => 'ok',
            'message' => 'Cập nhật hồ sơ thành công.',
            'data' => $profile,
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


