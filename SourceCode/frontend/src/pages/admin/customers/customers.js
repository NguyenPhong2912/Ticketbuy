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

    const tableBody = document.getElementById('customersTableBody');
    const modal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    const addBtn = document.getElementById('addCustomerBtn');
    const cancelBtn = document.getElementById('cancelCustomerBtn');
    let editingId = null;

    const loadCustomers = async () => {
        try {
            const response = await api.request('/admin/customers');
            const customers = Array.isArray(response.data) ? response.data : [];

            if (customers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-text">Chưa có khách hàng nào</div></td></tr>';
                return;
            }

            tableBody.innerHTML = customers.map(customer => `
                <tr>
                    <td>${customer.id}</td>
                    <td>${customer.name}</td>
                    <td>${customer.email}</td>
                    <td>${customer.phone || '—'}</td>
                    <td><span class="badge ${customer.role === 'admin' ? 'badge-info' : 'badge-success'}">${customer.role === 'admin' ? 'Admin' : 'Khách hàng'}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-secondary" onclick="editCustomer(${customer.id}, '${customer.name.replace(/'/g, "\\'")}', '${customer.email.replace(/'/g, "\\'")}', '${(customer.phone || '').replace(/'/g, "\\'")}', '${customer.role}')">Sửa</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})">Xóa</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Lỗi khi tải customers:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-text">Không thể tải danh sách khách hàng</div></td></tr>';
        }
    };

    const showModal = (isEdit = false) => {
        document.getElementById('modalTitle').textContent = isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng';
        editingId = isEdit ? editingId : null;
        if (!isEdit) form.reset();
        modal.style.display = 'flex';
    };

    const hideModal = () => {
        modal.style.display = 'none';
        form.reset();
        editingId = null;
    };

    window.editCustomer = (id, name, email, phone, role) => {
        editingId = id;
        document.getElementById('customerName').value = name;
        document.getElementById('customerEmail').value = email;
        document.getElementById('customerPhone').value = phone;
        document.getElementById('customerRole').value = role;
        document.getElementById('customerPassword').required = false;
        showModal(true);
    };

    window.deleteCustomer = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
        try {
            await api.request(`/admin/users/${id}`, { method: 'DELETE' });
            await loadCustomers();
        } catch (error) {
            alert(error.message || 'Không thể xóa khách hàng');
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const password = document.getElementById('customerPassword').value;
        const role = document.getElementById('customerRole').value;

        if (!name || !email) {
            alert('Vui lòng điền đầy đủ thông tin');
            return;
        }

        try {
            if (editingId) {
                const payload = { name, email, role };
                if (phone) payload.phone = phone;
                if (password) payload.password = password;
                await api.request(`/admin/users/${editingId}`, {
                    method: 'PUT',
                    json: payload
                });
            } else {
                if (!password) {
                    alert('Vui lòng nhập mật khẩu');
                    return;
                }
                await api.request('/admin/users', {
                    method: 'POST',
                    json: { name, email, phone, password, role }
                });
            }
            hideModal();
            await loadCustomers();
        } catch (error) {
            alert(error.message || 'Có lỗi xảy ra');
        }
    });

    addBtn.addEventListener('click', () => {
        document.getElementById('customerPassword').required = true;
        showModal(false);
    });
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

    await loadCustomers();
});

