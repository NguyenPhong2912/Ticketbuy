<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';
require_once __DIR__ . '/../Models/BookingRepository.php';
require_once __DIR__ . '/../Models/RouteRepository.php';
require_once __DIR__ . '/../Models/UserRepository.php';
require_once __DIR__ . '/../Models/PromotionRepository.php';
require_once __DIR__ . '/../Models/TripRepository.php';

/**
 * Controller xử lý các API dành riêng cho admin.
 */
class AdminController
{
    private BookingRepository $bookings;
    private RouteRepository $routes;
    private UserRepository $users;
    private PromotionRepository $promotions;
    private TripRepository $trips;

    public function __construct(
        BookingRepository $bookings,
        RouteRepository $routes,
        UserRepository $users,
        PromotionRepository $promotions,
        TripRepository $trips
    ) {
        $this->bookings = $bookings;
        $this->routes = $routes;
        $this->users = $users;
        $this->promotions = $promotions;
        $this->trips = $trips;
    }

    /**
     * Thống kê tổng quan cho dashboard.
     */
    public function stats(): void
    {
        $totalRoutes = $this->routes->count();
        $totalPromotions = $this->promotions->count();
        $ticketsToday = $this->bookings->countToday();
        $ticketsYesterday = $this->bookings->countYesterday();
        $totalCustomers = $this->users->countCustomers();
        
        // Đếm tổng số chuyến từ bảng trips
        $pdo = getDatabaseConnection(false);
        $totalTrips = (int) $pdo->query("SELECT COUNT(*) FROM trips")->fetchColumn();

        // Tính % tăng trưởng vé hôm nay so với hôm qua
        $ticketGrowth = 0;
        if ($ticketsYesterday > 0) {
            $ticketGrowth = round((($ticketsToday - $ticketsYesterday) / $ticketsYesterday) * 100, 1);
        } elseif ($ticketsToday > 0) {
            $ticketGrowth = 100; // Tăng 100% nếu hôm qua = 0 và hôm nay > 0
        }

        respond_json([
            'status' => 'ok',
            'data' => [
                'total_routes' => $totalRoutes,
                'total_promotions' => $totalPromotions,
                'total_trips' => $totalTrips,
                'tickets_today' => $ticketsToday,
                'tickets_yesterday' => $ticketsYesterday,
                'ticket_growth_percent' => $ticketGrowth,
                'total_customers' => $totalCustomers,
            ],
        ]);
    }

    /**
     * Thống kê chi tiết về bookings.
     */
    public function bookingsStats(): void
    {
        $allBookings = $this->bookings->all();
        
        // Thống kê theo trạng thái
        $statusCounts = [
            'pending' => 0,
            'confirmed' => 0,
            'cancelled' => 0,
            'completed' => 0,
        ];
        
        // Thống kê theo tháng (7 tháng gần nhất)
        $monthlyStats = [];
        $currentMonth = (int) date('n');
        $currentYear = (int) date('Y');
        
        for ($i = 6; $i >= 0; $i--) {
            $month = $currentMonth - $i;
            $year = $currentYear;
            
            if ($month <= 0) {
                $month += 12;
                $year--;
            }
            
            $monthKey = sprintf('%04d-%02d', $year, $month);
            $monthlyStats[$monthKey] = [
                'month' => $monthKey,
                'count' => 0,
                'revenue' => 0,
            ];
        }
        
        // Tính toán thống kê
        $totalRevenue = 0;
        $todayCount = 0;
        $today = date('Y-m-d');
        
        foreach ($allBookings as $booking) {
            // Đếm theo trạng thái
            $status = $booking['status'] ?? 'pending';
            if (isset($statusCounts[$status])) {
                $statusCounts[$status]++;
            }
            
            // Tính doanh thu (chỉ booking confirmed hoặc completed)
            if (in_array($status, ['confirmed', 'completed'], true)) {
                $routePrice = (float) ($booking['route_price'] ?? 0);
                $seatQuantity = (int) ($booking['seat_quantity'] ?? 0);
                $revenue = $routePrice * $seatQuantity;
                $totalRevenue += $revenue;
                
                // Thống kê theo tháng
                $createdAt = $booking['created_at'] ?? '';
                if (!empty($createdAt)) {
                    $createdDate = new DateTime($createdAt);
                    $monthKey = $createdDate->format('Y-m');
                    if (isset($monthlyStats[$monthKey])) {
                        $monthlyStats[$monthKey]['count']++;
                        $monthlyStats[$monthKey]['revenue'] += $revenue;
                    }
                }
            }
            
            // Đếm booking hôm nay
            $departureDate = $booking['departure_date'] ?? '';
            if ($departureDate === $today) {
                $todayCount++;
            }
        }
        
        // Tuyến phổ biến nhất (top 5)
        $routeCounts = [];
        foreach ($allBookings as $booking) {
            $routeName = $booking['route_name'] ?? 'Không xác định';
            if (!isset($routeCounts[$routeName])) {
                $routeCounts[$routeName] = 0;
            }
            $routeCounts[$routeName]++;
        }
        arsort($routeCounts);
        $topRoutes = array_slice($routeCounts, 0, 5, true);
        
        respond_json([
            'status' => 'ok',
            'data' => [
                'status_counts' => $statusCounts,
                'total_revenue' => round($totalRevenue, 2),
                'today_count' => $todayCount,
                'monthly_stats' => array_values($monthlyStats),
                'top_routes' => array_map(function ($name, $count) {
                    return ['name' => $name, 'count' => $count];
                }, array_keys($topRoutes), $topRoutes),
            ],
        ]);
    }

    /**
     * Thống kê doanh thu.
     */
    public function revenue(): void
    {
        $allBookings = $this->bookings->all();
        
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $thisMonth = date('Y-m');
        $lastMonth = date('Y-m', strtotime('-1 month'));
        
        $revenueToday = 0;
        $revenueYesterday = 0;
        $revenueThisMonth = 0;
        $revenueLastMonth = 0;
        $totalRevenue = 0;
        
        foreach ($allBookings as $booking) {
            $status = $booking['status'] ?? 'pending';
            if (!in_array($status, ['confirmed', 'completed'], true)) {
                continue;
            }
            
            $routePrice = (float) ($booking['route_price'] ?? 0);
            $seatQuantity = (int) ($booking['seat_quantity'] ?? 0);
            $revenue = $routePrice * $seatQuantity;
            
            $departureDate = $booking['departure_date'] ?? '';
            $createdAt = $booking['created_at'] ?? '';
            
            // Doanh thu hôm nay
            if ($departureDate === $today) {
                $revenueToday += $revenue;
            }
            
            // Doanh thu hôm qua
            if ($departureDate === $yesterday) {
                $revenueYesterday += $revenue;
            }
            
            // Doanh thu tháng này
            if (!empty($createdAt)) {
                $createdDate = new DateTime($createdAt);
                $createdMonth = $createdDate->format('Y-m');
                
                if ($createdMonth === $thisMonth) {
                    $revenueThisMonth += $revenue;
                }
                
                if ($createdMonth === $lastMonth) {
                    $revenueLastMonth += $revenue;
                }
            }
            
            $totalRevenue += $revenue;
        }
        
        // Tính % tăng trưởng
        $growthToday = 0;
        if ($revenueYesterday > 0) {
            $growthToday = round((($revenueToday - $revenueYesterday) / $revenueYesterday) * 100, 1);
        } elseif ($revenueToday > 0) {
            $growthToday = 100;
        }
        
        $growthMonth = 0;
        if ($revenueLastMonth > 0) {
            $growthMonth = round((($revenueThisMonth - $revenueLastMonth) / $revenueLastMonth) * 100, 1);
        } elseif ($revenueThisMonth > 0) {
            $growthMonth = 100;
        }
        
        respond_json([
            'status' => 'ok',
            'data' => [
                'revenue_today' => round($revenueToday, 2),
                'revenue_yesterday' => round($revenueYesterday, 2),
                'revenue_this_month' => round($revenueThisMonth, 2),
                'revenue_last_month' => round($revenueLastMonth, 2),
                'total_revenue' => round($totalRevenue, 2),
                'growth_today_percent' => $growthToday,
                'growth_month_percent' => $growthMonth,
            ],
        ]);
    }

    /**
     * Lấy danh sách tất cả users (chỉ admin).
     */
    public function users(): void
    {
        $allUsers = $this->users->all();
        
        // Loại bỏ password_hash
        $sanitizedUsers = array_map(function ($user) {
            unset($user['password_hash']);
            return $user;
        }, $allUsers);
        
        respond_json([
            'status' => 'ok',
            'data' => $sanitizedUsers,
        ]);
    }

    /**
     * Tạo user mới (admin only).
     */
    public function createUser(): void
    {
        $payload = $this->getJsonPayload();
        
        if (!isset($payload['name'], $payload['email'], $payload['password'])) {
            respond_json([
                'status' => 'error',
                'message' => 'Thiếu thông tin bắt buộc: name, email, password.',
            ], 422);
        }
        
        $name = trim((string) $payload['name']);
        $email = trim((string) $payload['email']);
        $password = (string) $payload['password'];
        $phone = isset($payload['phone']) ? trim((string) $payload['phone']) : null;
        $role = isset($payload['role']) && $payload['role'] === 'admin' ? 'admin' : 'user';
        
        if (empty($name) || empty($email) || empty($password)) {
            respond_json([
                'status' => 'error',
                'message' => 'Tên, email và mật khẩu không được để trống.',
            ], 422);
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond_json([
                'status' => 'error',
                'message' => 'Email không hợp lệ.',
            ], 422);
        }
        
        // Kiểm tra email đã tồn tại
        if ($this->users->findByEmail($email) !== null) {
            respond_json([
                'status' => 'error',
                'message' => 'Email này đã được sử dụng.',
            ], 409);
        }
        
        $user = $this->users->create([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'role' => $role,
            'avatar_url' => $payload['avatar_url'] ?? null,
        ]);
        
        unset($user['password_hash']);
        
        respond_json([
            'status' => 'ok',
            'message' => 'Tạo người dùng thành công.',
            'data' => $user,
        ], 201);
    }

    /**
     * Cập nhật user (admin only).
     */
    public function updateUser(int $userId): void
    {
        $user = $this->users->findById($userId);
        if ($user === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy người dùng.',
            ], 404);
        }
        
        $payload = $this->getJsonPayload();
        $fields = [];
        
        if (isset($payload['name'])) {
            $fields['name'] = trim((string) $payload['name']);
        }
        
        if (isset($payload['email'])) {
            $email = trim((string) $payload['email']);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                respond_json([
                    'status' => 'error',
                    'message' => 'Email không hợp lệ.',
                ], 422);
            }
            
            // Kiểm tra email trùng (trừ chính user này)
            $existingUser = $this->users->findByEmail($email);
            if ($existingUser !== null && (int) $existingUser['id'] !== $userId) {
                respond_json([
                    'status' => 'error',
                    'message' => 'Email này đã được sử dụng.',
                ], 409);
            }
            
            $fields['email'] = $email;
        }
        
        if (isset($payload['phone'])) {
            $fields['phone'] = trim((string) $payload['phone']) ?: null;
        }
        
        if (isset($payload['password']) && !empty($payload['password'])) {
            $fields['password_hash'] = password_hash((string) $payload['password'], PASSWORD_DEFAULT);
        }
        
        if (isset($payload['role']) && in_array($payload['role'], ['user', 'admin'], true)) {
            $fields['role'] = $payload['role'];
        }
        
        if (isset($payload['avatar_url'])) {
            $fields['avatar_url'] = trim((string) $payload['avatar_url']) ?: null;
        }
        
        if (empty($fields)) {
            respond_json([
                'status' => 'error',
                'message' => 'Không có trường nào để cập nhật.',
            ], 422);
        }
        
        $updatedUser = $this->users->update($userId, $fields);
        unset($updatedUser['password_hash']);
        
        respond_json([
            'status' => 'ok',
            'message' => 'Cập nhật người dùng thành công.',
            'data' => $updatedUser,
        ]);
    }

    /**
     * Xóa user (admin only).
     */
    public function deleteUser(int $userId): void
    {
        $user = $this->users->findById($userId);
        if ($user === null) {
            respond_json([
                'status' => 'error',
                'message' => 'Không tìm thấy người dùng.',
            ], 404);
        }
        
        // Không cho phép xóa chính mình
        // (Có thể thêm logic này nếu cần)
        
        $deleted = $this->users->delete($userId);
        
        if (!$deleted) {
            respond_json([
                'status' => 'error',
                'message' => 'Không thể xóa người dùng.',
            ], 500);
        }
        
        respond_json([
            'status' => 'ok',
            'message' => 'Đã xóa người dùng thành công.',
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

