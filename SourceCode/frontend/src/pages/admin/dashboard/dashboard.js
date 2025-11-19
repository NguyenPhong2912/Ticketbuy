/* global GreenBusAPI */

// Đợi GreenBusAPI được khởi tạo
function waitForGreenBusAPI(maxAttempts = 100, interval = 50) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkAPI = () => {
            if (window.GreenBusAPI && typeof window.GreenBusAPI.request === 'function') {
                resolve(window.GreenBusAPI);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkAPI, interval);
            } else {
                reject(new Error('GreenBusAPI không thể khởi tạo sau nhiều lần thử.'));
            }
        };
        checkAPI();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    let api;
    try {
        api = await waitForGreenBusAPI();
    } catch (error) {
        console.error('GreenBusAPI chưa được khởi tạo:', error);
        document.getElementById('statsGrid').innerHTML = '<div class="empty-state"><div class="empty-state-text">Không thể kết nối API. Vui lòng tải lại trang.</div></div>';
        return;
    }

    const LOGIN_PATH = '../../auth/login.html';

    // Kiểm tra quyền admin
    try {
        api.requireAuth({ roles: ['admin'], redirectTo: LOGIN_PATH });
    } catch (error) {
        console.warn(error.message);
        return;
    }

    // Load dashboard stats
    const loadStats = async () => {
        try {
            const response = await api.request('/admin/stats');
            const stats = response.data || {};

            // Cập nhật stats
            const totalRoutesEl = document.getElementById('statTotalRoutes');
            const totalTripsEl = document.getElementById('statTotalTrips');
            const totalPromotionsEl = document.getElementById('statTotalPromotions');
            const ticketsTodayEl = document.getElementById('statTicketsToday');
            const totalCustomersEl = document.getElementById('statTotalCustomers');
            const growthElement = document.getElementById('statTicketGrowth');

            if (totalRoutesEl) totalRoutesEl.textContent = stats.total_routes || 0;
            if (totalTripsEl) totalTripsEl.textContent = (stats.total_trips || 0).toLocaleString('vi-VN');
            if (totalPromotionsEl) totalPromotionsEl.textContent = stats.total_promotions || 0;
            if (ticketsTodayEl) ticketsTodayEl.textContent = stats.tickets_today || 0;
            if (totalCustomersEl) totalCustomersEl.textContent = (stats.total_customers || 0).toLocaleString('vi-VN');

            // Cập nhật growth
            if (growthElement) {
                const growth = stats.ticket_growth_percent || 0;
                if (growth > 0) {
                    growthElement.textContent = `+${growth}% so với hôm qua`;
                    growthElement.className = 'stat-trend positive';
                } else if (growth < 0) {
                    growthElement.textContent = `${growth}% so với hôm qua`;
                    growthElement.className = 'stat-trend negative';
                } else {
                    growthElement.textContent = 'Không thay đổi';
                    growthElement.className = 'stat-trend neutral';
                }
            }
        } catch (error) {
            console.error('Lỗi khi tải stats:', error);
            // Hiển thị lỗi trên UI
            const statsGrid = document.getElementById('statsGrid');
            if (statsGrid) {
                statsGrid.querySelectorAll('.stat-trend').forEach(el => {
                    el.textContent = 'Lỗi tải dữ liệu';
                    el.className = 'stat-trend negative';
                });
            }
        }
    };

    // Load recent activities
    const loadRecentActivities = async () => {
        const activitiesEl = document.getElementById('recentActivities');
        try {
            const response = await api.request('/bookings');
            const bookings = Array.isArray(response.data) ? response.data.slice(0, 10) : [];

            if (bookings.length === 0) {
                activitiesEl.innerHTML = '<div class="empty-state"><div class="empty-state-text">Chưa có hoạt động nào</div></div>';
                return;
            }

            activitiesEl.innerHTML = '<ul style="list-style: none; padding: 0;">' +
                bookings.map(booking => {
                    const date = new Date(booking.created_at);
                    const dateStr = date.toLocaleDateString('vi-VN', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    return `<li style="padding: 0.75rem 0; border-bottom: 1px solid var(--admin-gray-200);">
                        <strong>${booking.customer_name || 'Khách hàng'}</strong> đặt vé 
                        <strong>${booking.route_name || 'Tuyến xe'}</strong> 
                        <span style="color: var(--admin-gray-500); font-size: 0.875rem;">(${dateStr})</span>
                    </li>`;
                }).join('') +
                '</ul>';
        } catch (error) {
            console.error('Lỗi khi tải activities:', error);
            activitiesEl.innerHTML = '<div class="empty-state"><div class="empty-state-text">Không thể tải hoạt động gần đây</div></div>';
        }
    };

    // Load data
    await Promise.all([loadStats(), loadRecentActivities()]);

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await api.request('/auth/logout', { method: 'POST' });
            } catch (error) {
                console.warn('Logout API error:', error);
            }
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = LOGIN_PATH;
        });
    }
});

