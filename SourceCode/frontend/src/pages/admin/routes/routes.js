/* global GreenBusAPI, VIETNAM_CITIES, calculateDistance, calculateDuration, generateRouteName, generateRouteDetails, findCity */

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

    const tableBody = document.getElementById('routesTableBody');
    const modal = document.getElementById('routeModal');
    const form = document.getElementById('routeForm');
    const addBtn = document.getElementById('addRouteBtn');
    const cancelBtn = document.getElementById('cancelRouteBtn');
    const routeFrom = document.getElementById('routeFrom');
    const routeTo = document.getElementById('routeTo');
    const routeName = document.getElementById('routeName');
    const routeDetails = document.getElementById('routeDetails');
    const routePrice = document.getElementById('routePrice');
    const routeDate = document.getElementById('routeDate');
    let editingId = null;

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    routeDate.min = today;

    // Populate city dropdowns
    const populateCityDropdowns = () => {
        if (!VIETNAM_CITIES) {
            console.error('VIETNAM_CITIES không được load');
            return;
        }

        const fromSelect = routeFrom;
        const toSelect = routeTo;

        // Clear existing options (except first option)
        fromSelect.innerHTML = '<option value="">-- Chọn điểm đi --</option>';
        toSelect.innerHTML = '<option value="">-- Chọn điểm đến --</option>';

        // Add cities
        VIETNAM_CITIES.forEach(city => {
            const fromOption = document.createElement('option');
            fromOption.value = city.name;
            fromOption.textContent = city.name;
            fromSelect.appendChild(fromOption);

            const toOption = document.createElement('option');
            toOption.value = city.name;
            toOption.textContent = city.name;
            toSelect.appendChild(toOption);
        });
    };

    // Calculate and update route info
    const updateRouteInfo = () => {
        const fromCityName = routeFrom.value;
        const toCityName = routeTo.value;

        if (!fromCityName || !toCityName) {
            routeName.value = '';
            routeDetails.value = '';
            return;
        }

        if (fromCityName === toCityName) {
            alert('Điểm đi và điểm đến không thể giống nhau');
            routeTo.value = '';
            routeName.value = '';
            routeDetails.value = '';
            return;
        }

        const fromCity = findCity(fromCityName);
        const toCity = findCity(toCityName);

        if (!fromCity || !toCity) {
            console.error('Không tìm thấy thành phố');
            return;
        }

        // Calculate distance and duration
        const distance = calculateDistance(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng);
        const duration = calculateDuration(distance);

        // Auto-fill route name and details
        routeName.value = generateRouteName(fromCity, toCity);
        routeDetails.value = generateRouteDetails(distance, duration);
    };

    // Parse route name to extract from/to cities
    const parseRouteName = (name) => {
        const match = name.match(/^(.+?)\s*→\s*(.+)$/);
        if (match) {
            return {
                from: match[1].trim(),
                to: match[2].trim()
            };
        }
        return null;
    };

    // Load routes
    const loadRoutes = async () => {
        try {
            const response = await api.request('/routes');
            const routes = Array.isArray(response.data) ? response.data : [];
            
            if (routes.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-text">Chưa có tuyến nào</div></td></tr>';
                return;
            }

            // Format date from database (YYYY-MM-DD) to display (DD/MM/YYYY)
            const formatDateForDisplay = (dateStr) => {
                if (!dateStr) return '—';
                try {
                    const [year, month, day] = dateStr.split('-');
                    return `${day}/${month}/${year}`;
                } catch {
                    return dateStr;
                }
            };

            tableBody.innerHTML = routes.map(route => {
                const routeDate = formatDateForDisplay(route.departure_date);
                return `
                <tr>
                    <td>${route.id}</td>
                    <td>${route.name}</td>
                    <td>${route.details || '—'}</td>
                    <td>${routeDate}</td>
                    <td>${api.formatCurrency(route.price)}₫</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-secondary" onclick="editRoute(${route.id}, '${route.name.replace(/'/g, "\\'")}', '${(route.details || '').replace(/'/g, "\\'")}', ${route.price}, '${route.departure_date || ''}')">Sửa</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteRoute(${route.id})">Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
            }).join('');
        } catch (error) {
            console.error('Lỗi khi tải routes:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-text">Không thể tải danh sách tuyến</div></td></tr>';
        }
    };

    // Show modal
    const showModal = (isEdit = false) => {
        document.getElementById('modalTitle').textContent = isEdit ? 'Sửa tuyến' : 'Thêm tuyến mới';
        editingId = isEdit ? editingId : null;
        if (!isEdit) {
            form.reset();
            // Set default date to today
            routeDate.value = today;
        }
        modal.style.display = 'flex';
    };

    // Hide modal
    const hideModal = () => {
        modal.style.display = 'none';
        form.reset();
        // Reset date to today
        routeDate.value = today;
        editingId = null;
    };

    // Edit route
    window.editRoute = (id, name, details, price, departureDate = '') => {
        editingId = id;
        
        // Parse route name to get from/to
        const parsed = parseRouteName(name);
        if (parsed) {
            routeFrom.value = parsed.from;
            routeTo.value = parsed.to;
            updateRouteInfo();
        } else {
            // Fallback: use name directly
            routeName.value = name;
        }
        
        routeDetails.value = details || '';
        routePrice.value = price;
        
        // Set date from database (YYYY-MM-DD format)
        routeDate.value = departureDate || today;
        
        showModal(true);
    };

    // Delete route
    window.deleteRoute = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa tuyến này?')) return;
        
        try {
            await api.request(`/routes/${id}`, { method: 'DELETE' });
            await loadRoutes();
        } catch (error) {
            alert(error.message || 'Không thể xóa tuyến');
        }
    };

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = routeName.value.trim();
        const details = routeDetails.value.trim();
        const price = parseFloat(routePrice.value);
        const selectedDate = routeDate.value;

        if (!name || isNaN(price) || price < 0 || !selectedDate) {
            alert('Vui lòng điền đầy đủ thông tin hợp lệ (bao gồm ngày đi)');
            return;
        }

        try {
            const payload = { 
                name, 
                price,
                details: details
            };
            
            // Add departure_date separately (not in details)
            if (selectedDate) {
                payload.departure_date = selectedDate; // YYYY-MM-DD format
            }

            if (editingId) {
                await api.request(`/routes/${editingId}`, {
                    method: 'PUT',
                    json: payload
                });
            } else {
                await api.request('/routes', {
                    method: 'POST',
                    json: payload
                });
            }

            hideModal();
            await loadRoutes();
        } catch (error) {
            alert(error.message || 'Có lỗi xảy ra');
        }
    });

    // Event listeners for city selection
    routeFrom.addEventListener('change', updateRouteInfo);
    routeTo.addEventListener('change', updateRouteInfo);

    addBtn.addEventListener('click', () => showModal(false));
    cancelBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await api.request('/auth/logout', { method: 'POST' });
        } catch (error) {}
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = LOGIN_PATH;
    });

    // Initialize
    populateCityDropdowns();
    await loadRoutes();
});
