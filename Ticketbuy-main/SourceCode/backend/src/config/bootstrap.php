<?php

declare(strict_types=1);

/**
 * Bootstrap file khởi tạo các thành phần chung cho backend.
 */

require_once __DIR__ . '/../../../database/db_connection.php';

/**
 * Lấy kết nối PDO dùng chung.
 *
 * @throws RuntimeException Khi không kết nối được CSDL.
 */
function app_db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $pdo = getDatabaseConnection(false);
    return $pdo;
}

/**
 * Gửi phản hồi JSON chuẩn hoá.
 *
 * @param mixed $data  Dữ liệu trả về.
 * @param int   $code  HTTP status code.
 */
function respond_json($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Xử lý ngoại lệ chung và trả về phản hồi phù hợp.
 */
set_exception_handler(static function (Throwable $throwable): void {
    $code = (int) $throwable->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 500;
    }

    respond_json([
        'status' => 'error',
        'message' => $throwable->getMessage(),
    ], $code);
});

/**
 * Lấy dữ liệu JSON từ request body.
 *
 * @return array<string, mixed>
 */
function getJsonPayload(): array
{
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false || $rawInput === '') {
        return [];
    }

    $decoded = json_decode($rawInput, true);
    if (!is_array($decoded)) {
        return [];
    }

    return $decoded;
}

/**
 * Xử lý request OPTIONS cho CORS preflight.
 */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    respond_json(['status' => 'ok']);
}

