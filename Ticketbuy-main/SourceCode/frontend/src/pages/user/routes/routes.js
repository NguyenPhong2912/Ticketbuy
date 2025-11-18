'use strict';

/* global GreenBusAPI */

// Đợi GreenBusAPI được khởi tạo
function waitForGreenBusAPI(maxAttempts = 50, interval = 100) {
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
    const grid = document.getElementById('routeGrid');
    const dateFilterForm = document.getElementById('dateFilterForm');
    const filterDateInput = document.getElementById('filterDate');
    const clearFilterBtn = document.getElementById('clearFilter');
    const filterStatus = document.getElementById('filterStatus');

    if (!grid) {
        return;
    }

    let api;
    try {
        api = await waitForGreenBusAPI();
    } catch (error) {
        console.error('GreenBusAPI chưa được khởi tạo:', error);
        setStatus('Không tìm thấy cấu hình API.', 'error');
        return;
    }

    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    if (filterDateInput) {
        filterDateInput.min = today;
    }

    const assets = window.GreenBusAssets;
    const fallbackImages = [
        assets?.resolve('images/HCM DALAT.png') ?? '../../../assets/images/HCM DALAT.png',
        assets?.resolve('images/DA NANG NHA TRANG.png') ?? '../../../assets/images/DA NANG NHA TRANG.png',
        assets?.resolve('images/CANTHO HCM.png') ?? '../../../assets/images/CANTHO HCM.png',
        assets?.resolve('images/đặt sớm giá rẻ.png') ?? '../../../assets/images/đặt sớm giá rẻ.png',
    ];

    const pickImage = (index) => fallbackImages[index % fallbackImages.length];

    const setStatus = (message, variant = '') => {
        grid.innerHTML = `<div class="route-status ${variant}">${message}</div>`;
    };

    const setFilterStatus = (message, variant = '') => {
        if (!filterStatus) return;
        if (message) {
            filterStatus.textContent = message;
            filterStatus.className = `filter-status ${variant}`;
        } else {
            filterStatus.textContent = '';
            filterStatus.className = 'filter-status';
        }
    };

    const renderRoutes = (routes, limit = 10) => {
        if (!routes.length) {
            setStatus('Chưa có tuyến nào được mở. Hãy quay lại sau nhé!');
            return;
        }

        // Giới hạn chỉ hiển thị 10 tuyến đầu tiên
        const limitedRoutes = routes.slice(0, limit);

        const cards = limitedRoutes.map((route, index) => {
            const price = api?.formatCurrency ? api.formatCurrency(route.price) : Number(route.price).toLocaleString();
            const details = route.details ?? 'Đang cập nhật quãng đường';
            const imageSrc = pickImage(index);

            return `
                <article class="route-card">
                    <img src="${imageSrc}" alt="Hình minh hoạ tuyến ${route.name}">
                    <div class="card-body">
                        <h3>${route.name}</h3>
                        <p>${details} · <strong>${price}₫</strong></p>
                        <a href="../booking/index.html?route_id=${route.id}" class="btn-book">Đặt vé</a>
                    </div>
                </article>
            `;
        });

        grid.innerHTML = cards.join('');
        
        // Hiển thị thông báo nếu có nhiều hơn 10 tuyến
        if (routes.length > limit) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'route-info';
            infoDiv.textContent = `Hiển thị ${limit} tuyến đầu tiên trong tổng số ${routes.length} tuyến. Sử dụng bộ lọc ngày để xem thêm.`;
            grid.appendChild(infoDiv);
        }
    };

    const fetchRoutes = async (filterDate = null) => {
        setStatus('Đang tải dữ liệu tuyến xe...');
        setFilterStatus('');

        try {
            const response = await api.request('/routes', { skipAuth: true });
            let routes = Array.isArray(response.data) ? response.data : [];
            
            // Nếu có filter theo ngày, lọc routes có trips trong ngày đó
            if (filterDate) {
                try {
                    // Lấy danh sách trips trong ngày
                    const tripsResponse = await api.request(`/trips?date=${filterDate}`, { skipAuth: true });
                    const trips = Array.isArray(tripsResponse.data) ? tripsResponse.data : [];
                    
                    // Lấy danh sách route_id từ trips
                    const availableRouteIds = new Set(
                        trips
                            .filter(trip => trip.status === 'active' && trip.available_seats > 0)
                            .map(trip => trip.route_id)
                    );
                    
                    // Lọc routes chỉ giữ lại những route có trips trong ngày
                    routes = routes.filter(route => availableRouteIds.has(route.id));
                    
                    if (routes.length > 0) {
                        setFilterStatus(`Tìm thấy ${routes.length} tuyến có chuyến vào ngày ${new Date(filterDate).toLocaleDateString('vi-VN')}`, 'success');
                    } else {
                        setFilterStatus(`Không có tuyến nào có chuyến vào ngày ${new Date(filterDate).toLocaleDateString('vi-VN')}`, 'warning');
                    }
                } catch (tripsError) {
                    console.warn('Không thể lọc theo ngày:', tripsError);
                    setFilterStatus('Không thể kiểm tra chuyến theo ngày. Hiển thị tất cả tuyến.', 'warning');
                }
            }
            
            renderRoutes(routes);
        } catch (error) {
            console.error(error);
            setStatus(error.message || 'Không thể tải dữ liệu tuyến xe.', 'error');
        }
    };

    // Handle date filter form
    if (dateFilterForm) {
        dateFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const selectedDate = filterDateInput?.value;
            if (selectedDate) {
                fetchRoutes(selectedDate);
            }
        });
    }

    // Handle clear filter button
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            if (filterDateInput) {
                filterDateInput.value = '';
            }
            setFilterStatus('');
            fetchRoutes();
        });
    }

    // Load routes on page load (without filter)
    fetchRoutes();
});


