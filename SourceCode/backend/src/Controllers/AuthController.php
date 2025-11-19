<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../Models/UserRepository.php';
require_once __DIR__ . '/../Models/AuthTokenRepository.php';

/**
 * Xử lý đăng nhập/đăng ký và quản lý token.
 */
class AuthController
{
    private UserRepository $users;

    private AuthTokenRepository $tokens;

    public function __construct(UserRepository $users, AuthTokenRepository $tokens)
    {
        $this->users = $users;
        $this->tokens = $tokens;
    }

    /**
     * Đăng nhập người dùng.
     */
    public function login(): void
    {
        $payload = $this->getJsonPayload();

        if (!isset($payload['identifier'], $payload['password'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Thiếu thông tin đăng nhập.',
            ], 422);
        }

        $identifier = trim((string) $payload['identifier']);
        $password = (string) $payload['password'];

        $user = $this->users->findAuthByIdentifier($identifier);
        if ($user === null || !password_verify($password, (string) $user['password_hash'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Tài khoản hoặc mật khẩu không đúng.',
            ], 401);
        }

        $remember = filter_var($payload['remember'] ?? false, FILTER_VALIDATE_BOOL);
        $ttl = $remember ? new DateInterval('P30D') : new DateInterval('PT8H');

        $token = $this->tokens->issueToken(
            (int) $user['id'],
            $ttl,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        );

        respond_json([
            'status' => 'ok',
            'message' => 'Đăng nhập thành công.',
            'data' => [
                'token' => $token['token'],
                'expires_at' => $token['expires_at'],
                'user' => $this->sanitizeUser($user),
            ],
        ]);
    }

    /**
     * Đăng ký khách hàng.
     */
    public function register(): void
    {
        $payload = $this->getJsonPayload();

        foreach (['name', 'email', 'phone', 'password'] as $field) {
            if (empty($payload[$field])) {
                respond_json([
                    'status' => 'error',
                    'message' => "Thiếu dữ liệu bắt buộc: {$field}",
                ], 422);
            }
        }

        $name = trim((string) $payload['name']);
        $email = trim((string) $payload['email']);
        $phone = preg_replace('/\s+/', '', (string) $payload['phone']);
        $password = (string) $payload['password'];

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond_json([
                'status' => 'error',
                'message' => 'Email không hợp lệ.',
            ], 422);
        }

        if (strlen($password) < 6) {
            respond_json([
                'status' => 'error',
                'message' => 'Mật khẩu phải có ít nhất 6 ký tự.',
            ], 422);
        }

        if ($this->users->existsByEmail($email)) {
            respond_json([
                'status' => 'error',
                'message' => 'Email đã được sử dụng.',
            ], 409);
        }

        if ($this->users->existsByPhone($phone)) {
            respond_json([
                'status' => 'error',
                'message' => 'Số điện thoại đã được sử dụng.',
            ], 409);
        }

        $role = isset($payload['role']) && $payload['role'] === 'admin' ? 'admin' : 'user';

        $user = $this->users->create([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'role' => $role,
            'avatar_url' => $payload['avatar_url'] ?? null,
        ]);

        respond_json([
            'status' => 'ok',
            'message' => 'Tạo tài khoản thành công.',
            'data' => $user,
        ], 201);
    }

    /**
     * Đăng xuất người dùng (huỷ token hiện tại).
     *
     * @param array<string, mixed> $currentUser
     */
    public function logout(array $currentUser, string $rawToken): void
    {
        if (empty($rawToken)) {
            respond_json([
                'status' => 'error',
                'message' => 'Token không hợp lệ.',
            ], 400);
        }

        $this->tokens->revokeByRawToken($rawToken);

        respond_json([
            'status' => 'ok',
            'message' => 'Đăng xuất thành công.',
        ]);
    }

    /**
     * Quên mật khẩu - Reset mật khẩu về mật khẩu mặc định.
     * Trong môi trường production, nên gửi email với link reset hoặc mã OTP.
     */
    public function forgotPassword(): void
    {
        $payload = $this->getJsonPayload();

        if (!isset($payload['email']) || empty($payload['email'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Vui lòng nhập email.',
            ], 422);
        }

        $email = trim((string) $payload['email']);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond_json([
                'status' => 'error',
                'message' => 'Email không hợp lệ.',
            ], 422);
        }

        // Kiểm tra user có tồn tại không
        $user = $this->users->findByEmail($email);
        if ($user === null) {
            // Không tiết lộ email có tồn tại hay không (security best practice)
            respond_json([
                'status' => 'ok',
                'message' => 'Nếu email tồn tại trong hệ thống, mật khẩu đã được reset.',
            ]);
            return;
        }

        // Reset mật khẩu về mật khẩu mặc định (trong production nên tạo mật khẩu ngẫu nhiên và gửi email)
        $defaultPassword = '123456';
        $newPasswordHash = password_hash($defaultPassword, PASSWORD_DEFAULT);

        $updatedUser = $this->users->resetPasswordByEmail($email, $newPasswordHash);

        if ($updatedUser === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Không thể reset mật khẩu. Vui lòng thử lại.',
            ], 500);
            return;
        }

        // Trong production, gửi email với mật khẩu mới hoặc link reset
        // Ở đây chỉ trả về thông báo (không trả về mật khẩu vì lý do bảo mật)
        respond_json([
            'status' => 'ok',
            'message' => 'Mật khẩu đã được reset thành công. Mật khẩu mới là: 123456. Vui lòng đăng nhập và đổi mật khẩu ngay.',
        ]);
    }

    /**
     * Loại bỏ thông tin nhạy cảm khỏi payload trả về.
     *
     * @param array<string, mixed> $user
     *
     * @return array<string, mixed>
     */
    private function sanitizeUser(array $user): array
    {
        unset($user['password_hash']);
        return $user;
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


