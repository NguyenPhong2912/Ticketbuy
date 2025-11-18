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

    const tableBody = document.getElementById('promotionsTableBody');
    const modal = document.getElementById('promoModal');
    const form = document.getElementById('promoForm');
    const addBtn = document.getElementById('addPromoBtn');
    const cancelBtn = document.getElementById('cancelPromoBtn');
    let editingId = null;

    const loadPromotions = async () => {
        try {
            const response = await api.request('/promotions');
            const promotions = Array.isArray(response.data) ? response.data : [];

            if (promotions.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-text">Chưa có khuyến mãi nào</div></td></tr>';
                return;
            }

            tableBody.innerHTML = promotions.map(promo => `
                <tr>
                    <td>${promo.id}</td>
                    <td><strong>${promo.code}</strong></td>
                    <td>${promo.description || '—'}</td>
                    <td>${promo.discount_percent}%</td>
                    <td><span class="badge ${promo.status === 'active' ? 'badge-success' : 'badge-warning'}">${promo.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-secondary" onclick="editPromo(${promo.id}, '${promo.code.replace(/'/g, "\\'")}', '${(promo.description || '').replace(/'/g, "\\'")}', ${promo.discount_percent})">Sửa</button>
                            <button class="btn btn-sm btn-danger" onclick="deletePromo(${promo.id})">Xóa</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Lỗi khi tải promotions:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-text">Không thể tải danh sách khuyến mãi</div></td></tr>';
        }
    };

    const showModal = (isEdit = false) => {
        document.getElementById('modalTitle').textContent = isEdit ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi';
        editingId = isEdit ? editingId : null;
        if (!isEdit) form.reset();
        modal.style.display = 'flex';
    };

    const hideModal = () => {
        modal.style.display = 'none';
        form.reset();
        editingId = null;
    };

    window.editPromo = (id, code, description, discount) => {
        editingId = id;
        document.getElementById('promoCode').value = code;
        document.getElementById('promoDescription').value = description;
        document.getElementById('promoDiscount').value = discount;
        showModal(true);
    };

    window.deletePromo = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa khuyến mãi này?')) return;
        try {
            await api.request(`/promotions/${id}`, { method: 'DELETE' });
            await loadPromotions();
        } catch (error) {
            alert(error.message || 'Không thể xóa khuyến mãi');
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('promoCode').value.trim();
        const description = document.getElementById('promoDescription').value.trim();
        const discount = parseFloat(document.getElementById('promoDiscount').value);

        if (!code || isNaN(discount) || discount < 0 || discount > 100) {
            alert('Vui lòng điền đầy đủ thông tin hợp lệ (giảm giá từ 0-100%)');
            return;
        }

        try {
            const payload = { code, discount_percent: discount };
            if (description) payload.description = description;

            if (editingId) {
                await api.request(`/promotions/${editingId}`, {
                    method: 'PUT',
                    json: payload
                });
            } else {
                await api.request('/promotions', {
                    method: 'POST',
                    json: payload
                });
            }

            hideModal();
            await loadPromotions();
        } catch (error) {
            alert(error.message || 'Có lỗi xảy ra');
        }
    });

    addBtn.addEventListener('click', () => showModal(false));
    cancelBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await api.request('/auth/logout', { method: 'POST' });
        } catch (error) {}
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = LOGIN_PATH;
    });

    await loadPromotions();
});

