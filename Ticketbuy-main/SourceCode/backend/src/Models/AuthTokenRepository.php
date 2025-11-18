<?php

declare(strict_types=1);

/**
 * Repository quản lý token đăng nhập.
 */
class AuthTokenRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Phát hành token mới.
     *
     * @return array{token:string, expires_at:string}
     */
    public function issueToken(int $userId, DateInterval $ttl, ?string $userAgent = null): array
    {
        $rawToken = bin2hex(random_bytes(32));
        $expiresAt = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->add($ttl);

        $stmt = $this->pdo->prepare(
            'INSERT INTO user_tokens (user_id, token_hash, user_agent, expires_at, created_at, last_used_at)
             VALUES (:user_id, :token_hash, :user_agent, :expires_at, NOW(), NOW())'
        );

        $stmt->execute([
            ':user_id' => $userId,
            ':token_hash' => self::hashToken($rawToken),
            ':user_agent' => $userAgent,
            ':expires_at' => $expiresAt->format('Y-m-d H:i:s'),
        ]);

        return [
            'token' => $rawToken,
            'expires_at' => $expiresAt->format(DateTimeInterface::ATOM),
        ];
    }

    /**
     * Tìm token hợp lệ.
     *
     * @return array<string, mixed>|null
     */
    public function findValidToken(string $rawToken): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, expires_at
             FROM user_tokens
             WHERE token_hash = :token_hash
             LIMIT 1'
        );
        $stmt->execute([':token_hash' => self::hashToken($rawToken)]);

        $token = $stmt->fetch();
        if (!$token) {
            return null;
        }

        $expiresAt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $token['expires_at'], new DateTimeZone('UTC'));
        if ($expiresAt instanceof DateTimeImmutable && $expiresAt < new DateTimeImmutable('now', new DateTimeZone('UTC'))) {
            $this->revokeById((int) $token['id']);
            return null;
        }

        $this->touch((int) $token['id']);
        return $token;
    }

    /**
     * Huỷ token hiện tại.
     */
    public function revokeByRawToken(string $rawToken): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM user_tokens WHERE token_hash = :token_hash');
        $stmt->execute([':token_hash' => self::hashToken($rawToken)]);
    }

    /**
     * Huỷ toàn bộ token của người dùng.
     */
    public function revokeAllForUser(int $userId): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM user_tokens WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
    }

    private function revokeById(int $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM user_tokens WHERE id = :id');
        $stmt->execute([':id' => $id]);
    }

    private function touch(int $id): void
    {
        $stmt = $this->pdo->prepare('UPDATE user_tokens SET last_used_at = NOW() WHERE id = :id');
        $stmt->execute([':id' => $id]);
    }

    private static function hashToken(string $rawToken): string
    {
        return hash('sha256', $rawToken);
    }
}


