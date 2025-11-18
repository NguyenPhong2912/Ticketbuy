<?php

function getDatabaseConnection(bool $outputStatus = true): PDO
{
    $host = '127.0.0.1';
    $db   = 'bus_booking_db';
    $user = 'root';
    $pass = 'admin123';
    $charset = 'utf8mb4';

    $dsn = "mysql:host=$host;dbname=$db;charset=$charset";

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
        if ($outputStatus) {
            echo 'Kết nối cơ sở dữ liệu thành công.';
        }
        return $pdo;
    } catch (\PDOException $e) {
        if ($outputStatus) {
            echo 'Kết nối cơ sở dữ liệu thất bại: ' . $e->getMessage();
        }
        throw new \RuntimeException('Kết nối cơ sở dữ liệu thất bại: ' . $e->getMessage(), (int) $e->getCode(), $e);
    }
}

if (!debug_backtrace()) {
    try {
        getDatabaseConnection();
    } catch (\Throwable $e) {
        // No hành động bổ sung: thông báo đã được in trong hàm.
    }
}
?>