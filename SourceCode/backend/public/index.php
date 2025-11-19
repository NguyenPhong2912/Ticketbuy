<?php

declare(strict_types=1);

// Ensure output buffering is active
if (!ob_get_level()) {
    ob_start();
}

require_once __DIR__ . '/../src/Controllers/RouteController.php';
require_once __DIR__ . '/../src/Controllers/AuthController.php';
require_once __DIR__ . '/../src/Controllers/ProfileController.php';
require_once __DIR__ . '/../src/Controllers/BookingController.php';
require_once __DIR__ . '/../src/Controllers/PromotionController.php';
require_once __DIR__ . '/../src/Controllers/QRCodeController.php';
require_once __DIR__ . '/../src/Controllers/AdminController.php';
require_once __DIR__ . '/../src/Models/UserRepository.php';
require_once __DIR__ . '/../src/Models/AuthTokenRepository.php';
require_once __DIR__ . '/../src/Models/RouteRepository.php';
require_once __DIR__ . '/../src/Models/BookingRepository.php';
require_once __DIR__ . '/../src/Models/TripRepository.php';
require_once __DIR__ . '/../src/Models/PromotionRepository.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uri = rtrim($uri, '/');

$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');

if ($basePath !== '' && str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath)) ?: '';
}

$pdo = app_db();

$userRepository = new UserRepository($pdo);
$tokenRepository = new AuthTokenRepository($pdo);
$routeRepository = new RouteRepository($pdo);
$bookingRepository = new BookingRepository($pdo);
$tripRepository = new TripRepository($pdo);

$routeController = new RouteController($routeRepository);
$authController = new AuthController($userRepository, $tokenRepository);
$profileController = new ProfileController($userRepository);
$bookingController = new BookingController($bookingRepository, $routeRepository, $promotionRepository, $tripRepository);
$promotionRepository = new PromotionRepository($pdo);
$promotionController = new PromotionController($promotionRepository);
$qrCodeController = new QRCodeController($bookingRepository, $userRepository);
$adminController = new AdminController($bookingRepository, $routeRepository, $userRepository, $promotionRepository, $tripRepository);

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
$rawToken = null;
$currentUser = null;

if (is_string($authHeader) && preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches) === 1) {
    $rawToken = $matches[1];
    $tokenRecord = $tokenRepository->findValidToken($rawToken);

    if ($tokenRecord !== null) {
        $currentUser = $userRepository->findById((int) $tokenRecord['user_id']);
        if ($currentUser === null) {
            $tokenRepository->revokeByRawToken($rawToken);
            $rawToken = null;
        }
    }
}

$ensureAuthenticated = static function (?array $user): array {
    if ($user === null) {
        respond_json([
            'status' => 'error',
            'message' => 'Vui lòng đăng nhập để tiếp tục.',
        ], 401);
    }

    return $user;
};

$ensureRole = static function (array $user, array $roles): void {
    if (!in_array($user['role'], $roles, true)) {
        respond_json([
            'status' => 'error',
            'message' => 'Bạn không có quyền truy cập tài nguyên này.',
        ], 403);
    }
};

if ($uri === '' || $uri === '/index.php') {
    respond_json([
        'status' => 'ok',
        'message' => 'Backend API đang chạy',
    ]);
}

if ($uri === '/auth/login' && $method === 'POST') {
    $authController->login();
}

if ($uri === '/auth/register' && $method === 'POST') {
    $authController->register();
}

if ($uri === '/auth/logout' && $method === 'POST') {
    $user = $ensureAuthenticated($currentUser);
    $authController->logout($user, (string) $rawToken);
}

if ($uri === '/auth/forgot-password' && $method === 'POST') {
    $authController->forgotPassword();
}

if ($uri === '/me' && $method === 'GET') {
    $user = $ensureAuthenticated($currentUser);
    $profileController->show($user);
}

if ($uri === '/me' && in_array($method, ['PUT', 'PATCH'], true)) {
    $user = $ensureAuthenticated($currentUser);
    $profileController->update($user);
}

if ($uri === '/bookings' && $method === 'GET') {
    $user = $ensureAuthenticated($currentUser);
    $bookingController->index($user);
}

if ($uri === '/bookings' && $method === 'POST') {
    $user = $ensureAuthenticated($currentUser);
    $bookingController->store($user);
}

if (preg_match('#^/bookings/([0-9]+)$#', $uri, $matches) === 1) {
    $bookingId = (int) $matches[1];
    if ($method === 'PUT' || $method === 'PATCH') {
        $user = $ensureAuthenticated($currentUser);
        $bookingController->update($user, $bookingId);
    }

    if ($method === 'DELETE') {
        $user = $ensureAuthenticated($currentUser);
        $bookingController->destroy($user, $bookingId);
    }
}

if ($uri === '/routes' && $method === 'GET') {
    $routeController->index();
}

if ($uri === '/routes/locations' && $method === 'GET') {
    $locations = $routeRepository->getUniqueLocations();
    respond_json([
        'status' => 'ok',
        'data' => $locations,
    ]);
}

if ($uri === '/trips' && $method === 'GET') {
    $date = $_GET['date'] ?? '';
    
    if (empty($date)) {
        respond_json([
            'status' => 'error',
            'message' => 'Thiếu tham số date.',
        ], 422);
    }
    
    // Validate date format
    $dateObj = DateTime::createFromFormat('Y-m-d', $date);
    if (!$dateObj || $dateObj->format('Y-m-d') !== $date) {
        respond_json([
            'status' => 'error',
            'message' => 'Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD.',
        ], 422);
    }
    
    $trips = $tripRepository->findByDate($date);
    
    respond_json([
        'status' => 'ok',
        'data' => $trips,
    ]);
}

if ($uri === '/routes' && $method === 'POST') {
    $user = $ensureAuthenticated($currentUser);
    $ensureRole($user, ['admin']);
    $routeController->store();
}

if (preg_match('#^/routes/([0-9]+)$#', $uri, $matches) === 1) {
    $routeId = (int) $matches[1];

    if ($method === 'GET') {
        $route = $routeRepository->find($routeId);
        if (!$route) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy tuyến xe.',
            ], 404);
        } else {
            respond_json([
                'status' => 'ok',
                'data' => $route,
            ]);
        }
    }

    if ($method === 'DELETE') {
        $user = $ensureAuthenticated($currentUser);
        $ensureRole($user, ['admin']);
        $routeController->destroy($routeId);
    }

    if ($method === 'PUT' || $method === 'PATCH') {
        $user = $ensureAuthenticated($currentUser);
        $ensureRole($user, ['admin']);
        $routeController->update($routeId);
    }
}

// Promotions API endpoints
if ($uri === '/promotions' && $method === 'GET') {
    $promotionController->index();
}

if ($uri === '/promotions/validate' && $method === 'POST') {
    // Allow both authenticated and unauthenticated users to validate
    $payload = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!isset($payload['code']) || empty(trim($payload['code']))) {
        respond_json([
            'status' => 'error',
            'message' => 'Vui lòng nhập mã khuyến mãi.',
        ], 422);
        exit;
    }
    
    // Nếu có check_usage = true và có user, thì check usage
    // Nếu không, chỉ validate code (không check usage)
    $checkUsage = isset($payload['check_usage']) && $payload['check_usage'] === true;
    $userId = $currentUser ? (int) $currentUser['id'] : null;
    
    // Nếu yêu cầu check usage nhưng không có user, trả về lỗi
    if ($checkUsage && !$userId) {
        respond_json([
            'status' => 'error',
            'message' => 'Vui lòng đăng nhập để sử dụng mã khuyến mãi.',
        ], 401);
        exit;
    }
    
    // Validate code với checkUsage tùy theo yêu cầu
    $result = $promotionRepository->validateCode(trim($payload['code']), $userId, $checkUsage);
    
    respond_json([
        'status' => $result['valid'] ? 'ok' : 'error',
        'message' => $result['message'],
        'data' => $result['promotion'],
    ], $result['valid'] ? 200 : 400);
    exit;
}

if ($uri === '/promotions' && $method === 'POST') {
    $user = $ensureAuthenticated($currentUser);
    $ensureRole($user, ['admin']);
    $promotionController->store();
}

if (preg_match('#^/promotions/([0-9]+)$#', $uri, $matches) === 1) {
    $promoId = (int) $matches[1];

    if ($method === 'PUT' || $method === 'PATCH') {
        $user = $ensureAuthenticated($currentUser);
        $ensureRole($user, ['admin']);
        $promotionController->update($promoId);
    }

    if ($method === 'DELETE') {
        $user = $ensureAuthenticated($currentUser);
        $ensureRole($user, ['admin']);
        $promotionController->destroy($promoId);
    }
}

// Admin API endpoints
if ($uri === '/admin/stats' && $method === 'GET') {
    $user = $ensureAuthenticated($currentUser);
    $ensureRole($user, ['admin']);
    $adminController->stats();
}

if ($uri === '/admin/bookings/stats' && $method === 'GET') {
    $user = $ensureAuthenticated($currentUser);
    $ensureRole($user, ['admin']);
    $adminController->bookingsStats();
}

if ($uri === '/admin/revenue' && $method === 'GET') {
    $user = $ensureAuthenticated($currentUser);
    $ensureRole($user, ['admin']);
    $adminController->revenue();
}

if ($uri === '/admin/customers' && $method === 'GET') {
    $user = $ensureAuthenticated($currentUser);
    $ensureRole($user, ['admin']);
    $adminController->users();
}

if ($uri === '/admin/users' && $method === 'POST') {
    $user = $ensureAuthenticated($currentUser);
    $ensureRole($user, ['admin']);
    $adminController->createUser();
}

if (preg_match('#^/admin/users/([0-9]+)$#', $uri, $matches) === 1) {
    $userId = (int) $matches[1];
    $user = $ensureAuthenticated($currentUser);
    $ensureRole($user, ['admin']);

    if ($method === 'PUT' || $method === 'PATCH') {
        $adminController->updateUser($userId);
    }

    if ($method === 'DELETE') {
        $adminController->deleteUser($userId);
    }
}

// Generate QR code for bookings
if ($uri === '/bookings/qr-code' && $method === 'POST') {
    $user = $ensureAuthenticated($currentUser);
    $qrCodeController->download($user);
}

// Get booked seats for a route and date
if ($uri === '/bookings/seats' && $method === 'GET') {
    $routeId = isset($_GET['route_id']) ? (int) $_GET['route_id'] : 0;
    $departureDate = $_GET['departure_date'] ?? '';
    
    if ($routeId <= 0 || empty($departureDate)) {
        respond_json([
            'status' => 'error',
            'message' => 'Thiếu tham số route_id hoặc departure_date.',
        ], 422);
    }
    
    // Validate date format
    $dateObj = DateTime::createFromFormat('Y-m-d', $departureDate);
    if (!$dateObj || $dateObj->format('Y-m-d') !== $departureDate) {
        respond_json([
            'status' => 'error',
            'message' => 'Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD.',
        ], 422);
    }
    
    // Lấy trip_id và departure_time nếu có
    $tripId = isset($_GET['trip_id']) ? (int) $_GET['trip_id'] : null;
    $departureTime = isset($_GET['departure_time']) ? trim($_GET['departure_time']) : null;
    
    // Nếu có trip_id, lấy departure_time từ trips table
    if ($tripId !== null && $departureTime === null) {
        $pdo = getDatabaseConnection(false);
        $tripStmt = $pdo->prepare('SELECT departure_time FROM trips WHERE id = :trip_id LIMIT 1');
        $tripStmt->execute([':trip_id' => $tripId]);
        $trip = $tripStmt->fetch();
        if ($trip && isset($trip['departure_time'])) {
            $departureTime = $trip['departure_time'];
        }
    }
    
    $bookedSeats = $bookingRepository->getBookedSeats($routeId, $departureDate, $tripId, $departureTime);
    
    respond_json([
        'status' => 'ok',
        'data' => $bookedSeats,
    ]);
}

respond_json([
    'status' => 'error',
    'message' => 'Endpoint không tồn tại.',
], 404);

