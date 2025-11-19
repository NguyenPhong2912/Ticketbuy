/* global GreenBusAPI */

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
        return;
    }

    const LOGIN_PATH = '../../auth/login.html';

    try {
        api.requireAuth({ roles: ['admin'], redirectTo: LOGIN_PATH });
    } catch (error) {
        console.warn(error.message);
        return;
    }

    const tableBody = document.getElementById('bookingsTableBody');
    const statusMap = {
        pending: { label: 'Chờ xử lý', class: 'badge-warning' },
        confirmed: { label: 'Đã xác nhận', class: 'badge-success' },
        cancelled: { label: 'Đã hủy', class: 'badge-danger' },
        completed: { label: 'Hoàn tất', class: 'badge-info' }
    };

    const loadBookings = async () => {
        try {
            const response = await api.request('/bookings');
            const bookings = Array.isArray(response.data) ? response.data : [];

            if (bookings.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-state-text">Chưa có vé nào</div></td></tr>';
                return;
            }

            tableBody.innerHTML = bookings.map(booking => {
                const status = statusMap[booking.status] || { label: booking.status, class: 'badge-info' };
                const seatNumbers = Array.isArray(booking.seat_numbers) ? booking.seat_numbers.join(', ') : '—';
                return `
                    <tr>
                        <td>GB-${String(booking.id).padStart(4, '0')}</td>
                        <td>${booking.customer_name || '—'}</td>
                        <td>${booking.route_name || '—'}</td>
                        <td>${booking.departure_date || '—'}</td>
                        <td>${booking.seat_quantity || 0}</td>
                        <td>${seatNumbers}</td>
                        <td><span class="badge ${status.class}">${status.label}</span></td>
                        <td>
                            <div class="action-buttons">
                                <select class="form-input" style="width: auto; padding: 0.25rem 0.5rem;" onchange="updateStatus(${booking.id}, this.value)">
                                    <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
                                    <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Đã xác nhận</option>
                                    <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Đã hủy</option>
                                    <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Hoàn tất</option>
                                </select>
                                <button class="btn btn-sm btn-danger" onclick="deleteBooking(${booking.id})">Xóa</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Lỗi khi tải bookings:', error);
            tableBody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-state-text">Không thể tải danh sách vé</div></td></tr>';
        }
    };

    window.updateStatus = async (id, status) => {
        try {
            await api.request(`/bookings/${id}`, {
                method: 'PUT',
                json: { status }
            });
            await loadBookings();
        } catch (error) {
            alert(error.message || 'Không thể cập nhật trạng thái');
            await loadBookings();
        }
    };

    window.deleteBooking = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa vé này?')) return;
        try {
            await api.request(`/bookings/${id}`, { method: 'DELETE' });
            await loadBookings();
        } catch (error) {
            alert(error.message || 'Không thể xóa vé');
        }
    };

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await api.request('/auth/logout', { method: 'POST' });
        } catch (error) {}
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = LOGIN_PATH;
    });

    await loadBookings();
});

