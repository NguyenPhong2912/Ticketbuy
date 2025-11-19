<?php

/**
 * Hàm tự động phát hiện và kết nối database
 * 
 * Ưu tiên:
 * 1. File db_config.php (nếu có) - cho phép tùy chỉnh
 * 2. Tự động thử các cấu hình phổ biến:
 *    - root / password rỗng (XAMPP mặc định)
 *    - root / admin123
 *    - root / root
 *    - root / password
 */
function getDatabaseConnection(bool $outputStatus = true): PDO
{
    $configFile = __DIR__ . '/db_config.php';
    $config = null;
    
    // Bước 1: Thử đọc file config tùy chỉnh (nếu có)
    if (file_exists($configFile)) {
        $config = require $configFile;
        if (is_array($config)) {
            $host = $config['host'] ?? '127.0.0.1';
            $dbname = $config['dbname'] ?? 'bus_booking_db';
            $username = $config['username'] ?? 'root';
            $password = $config['password'] ?? '';
            $charset = $config['charset'] ?? 'utf8mb4';
            
            $pdo = tryConnect($host, $dbname, $username, $password, $charset, $outputStatus);
            if ($pdo !== null) {
                return $pdo;
            }
        }
    }
    
    // Bước 2: Tự động thử các cấu hình phổ biến
    $commonConfigs = [
        // [host, dbname, username, password, charset]
        ['127.0.0.1', 'bus_booking_db', 'root', '', 'utf8mb4'],           // XAMPP mặc định (password rỗng)
        ['localhost', 'bus_booking_db', 'root', '', 'utf8mb4'],         // localhost với password rỗng
        ['127.0.0.1', 'bus_booking_db', 'root', 'admin123', 'utf8mb4'],  // Password admin123
        ['localhost', 'bus_booking_db', 'root', 'admin123', 'utf8mb4'],
        ['127.0.0.1', 'bus_booking_db', 'root', 'root', 'utf8mb4'],      // Password root
        ['localhost', 'bus_booking_db', 'root', 'root', 'utf8mb4'],
        ['127.0.0.1', 'bus_booking_db', 'root', 'password', 'utf8mb4'],  // Password password
        ['localhost', 'bus_booking_db', 'root', 'password', 'utf8mb4'],
    ];
    
    $lastError = null;
    foreach ($commonConfigs as $cfg) {
        [$host, $dbname, $username, $password, $charset] = $cfg;
        $pdo = tryConnect($host, $dbname, $username, $password, $charset, false);
        if ($pdo !== null) {
            if ($outputStatus) {
                echo 'Kết nối cơ sở dữ liệu thành công (tự động phát hiện).';
            }
            return $pdo;
        }
    }
    
    // Nếu tất cả đều thất bại, hiển thị hướng dẫn
    $errorMsg = 'Không thể kết nối database. ';
    if ($lastError) {
        $errorMsg .= 'Lỗi cuối cùng: ' . $lastError;
    }
    $errorMsg .= "\n\nHƯỚNG DẪN KHẮC PHỤC:\n";
    $errorMsg .= "1. Tạo file: SourceCode/database/db_config.php\n";
    $errorMsg .= "2. Copy nội dung từ: SourceCode/database/db_config.php.example\n";
    $errorMsg .= "3. Điền thông tin database của bạn vào file db_config.php\n";
    $errorMsg .= "4. Đảm bảo database 'bus_booking_db' đã được tạo và import dữ liệu\n";
    
    if ($outputStatus) {
        echo $errorMsg;
    }
    throw new \RuntimeException($errorMsg);
}

/**
 * Thử kết nối database với thông tin cho trước
 * 
 * @return PDO|null Trả về PDO nếu thành công, null nếu thất bại
 */
function tryConnect(string $host, string $dbname, string $username, string $password, string $charset, bool $outputStatus): ?PDO
{
    static $lastError = null;
    
    $dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
    
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_TIMEOUT            => 2, // Timeout 2 giây để tránh chờ lâu
    ];
    
    try {
        $pdo = new PDO($dsn, $username, $password, $options);
        // Test connection bằng một query đơn giản
        $pdo->query('SELECT 1');
        $lastError = null;
        return $pdo;
    } catch (\PDOException $e) {
        $lastError = $e->getMessage();
        return null;
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