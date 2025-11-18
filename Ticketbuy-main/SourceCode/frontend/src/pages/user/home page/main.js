'use strict';

// main.js - interactions for GreenBus demo
// Đợi GreenBusAPI được khởi tạo (tùy chọn)
function waitForGreenBusAPI(maxAttempts = 50, interval = 100) {
    return new Promise((resolve) => {
        let attempts = 0;
        const checkAPI = () => {
            if (window.GreenBusAPI && typeof window.GreenBusAPI.request === 'function') {
                resolve(window.GreenBusAPI);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkAPI, interval);
            } else {
                resolve(null); // Không bắt buộc phải có API cho trang chủ
            }
        };
        checkAPI();
    });
}

document.addEventListener('DOMContentLoaded', async function () {
  const api = await waitForGreenBusAPI();

  const parseUser = () => {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Không đọc được currentUser.', error);
      return null;
    }
  };

  const authLink = document.getElementById('navAuthLink');
  const userToggle = document.getElementById('userMenuToggle');
  const userDropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');
  const userNameEls = [
    document.getElementById('userMenuName'),
    document.getElementById('userDropdownName'),
  ];
  const userEmailEl = document.getElementById('userDropdownEmail');
  const userRoleEl = document.getElementById('userMenuRole');
  const userNav = document.getElementById('userNav');

  const closeDropdown = () => {
    userDropdown?.classList.add('hidden');
    userToggle?.classList.remove('open');
  };

  const hydrateNavbar = () => {
    const user = parseUser();

    if (!user) {
      if (authLink) {
        authLink.textContent = 'Đăng nhập / Đăng ký';
        authLink.href = '../../auth/login.html';
        authLink.setAttribute('data-role', 'guest');
      }
      userToggle?.classList.add('hidden');
      closeDropdown();
      return;
    }

    const displayName = user.name || user.email || 'GreenBus User';
    userNameEls.forEach((el) => {
      if (el) {
        el.textContent = displayName;
      }
    });

    if (userEmailEl) {
      userEmailEl.textContent = user.email || '';
    }

    if (userRoleEl) {
      userRoleEl.textContent = user.role === 'admin' ? 'Quản trị' : 'Khách';
    }

    if (authLink) {
      authLink.textContent = 'Hồ sơ & Vé';
      authLink.href = '../account/index.html';
      authLink.setAttribute('data-role', 'member');
    }
    userToggle?.classList.remove('hidden');
  };

  if (userToggle) {
    userToggle.addEventListener('click', (event) => {
      event.preventDefault();
      userDropdown?.classList.toggle('hidden');
      userToggle.classList.toggle('open');
    });
  }

  document.addEventListener('click', (event) => {
    if (!userNav || !userDropdown || !userToggle) {
      return;
    }
    if (!userNav.contains(event.target)) {
      closeDropdown();
    }
  });

  const handleLogout = async () => {
    closeDropdown();

    try {
      if (api) {
        await api.request('/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      console.warn('Không thể gọi API đăng xuất.', error);
    }

    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    hydrateNavbar();
    window.location.href = '../../auth/login.html';
  };

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  hydrateNavbar();
  // Quick search redirect if form exists
  const quickSearch = document.getElementById('quickSearch');
  if (quickSearch) {
    quickSearch.addEventListener('submit', function (e) {
      e.preventDefault();
      const f = document.getElementById('qFrom')?.value || '';
      const t = document.getElementById('qTo')?.value || '';
      const d = document.getElementById('qDate')?.value || '';
      const s = document.getElementById('qSeats')?.value || '1';
      const qs = new URLSearchParams({from: f, to: t, date: d, seats: s}).toString();
      window.location.href = '../booking/index.html?' + qs;
    });
  }

  // Booking page logic
  const bookingForm = document.getElementById('bookingForm');
  const resultsEl = document.getElementById('searchResults');
  const seatModal = document.getElementById('seatModal');
  const seatMap = document.getElementById('seatMap');
  let selectedSeats = [];

  const sampleTrips = [
    {id:'GB-01', company:'GreenBus', from:'TP. HCM', to:'Đà Lạt', depart:'08:00', arrive:'12:30', price:180000, seats:12},
    {id:'GB-02', company:'GreenBus', from:'TP. HCM', to:'Đà Lạt', depart:'10:30', arrive:'15:00', price:200000, seats:8}
  ];

  function renderTrips(trips) {
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    if (!trips.length) {
      resultsEl.innerHTML = '<p>Không tìm thấy chuyến nào.</p>';
      return;
    }
    trips.forEach(trip => {
      const div = document.createElement('div');
      div.className = 'trip-card';
      div.innerHTML = '<div><strong>' + trip.company + '</strong><div>' + trip.from + ' → ' + trip.to + '</div><div>Khởi hành: ' + trip.depart + ' · Giá: ' + trip.price.toLocaleString('vi-VN') + '₫</div></div><div><button class="btn selectSeat">Chọn ghế</button></div>';
      resultsEl.appendChild(div);
    });
    document.querySelectorAll('.selectSeat').forEach(btn => btn.addEventListener('click', openSeatPicker));
  }

  function openSeatPicker() {
    selectedSeats = [];
    if (!seatModal || !seatMap) return;
    seatMap.innerHTML = '';
    for (let i = 1; i <= 32; i++) {
      const s = document.createElement('div');
      s.className = 'seat';
      s.textContent = i;
      if (i % 7 === 0) { s.classList.add('taken'); s.style.background = '#f3f3f3'; s.style.color = '#999'; s.style.cursor = 'not-allowed'; }
      s.addEventListener('click', function () {
        if (this.classList.contains('taken')) return;
        this.classList.toggle('selected');
        if (this.classList.contains('selected')) {
          selectedSeats.push(this.textContent);
        } else {
          selectedSeats = selectedSeats.filter(x => x !== this.textContent);
        }
      });
      seatMap.appendChild(s);
    }
    seatModal.style.display = 'flex';
    document.getElementById('cancelSeat').onclick = () => seatModal.style.display = 'none';
    document.getElementById('confirmSeat').onclick = () => {
      seatModal.style.display = 'none';
      alert('Ghế đã chọn: ' + (selectedSeats.length ? selectedSeats.join(', ') : '(chưa chọn)'));
    };
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const f = document.getElementById('from').value.trim().toLowerCase();
      const t = document.getElementById('to').value.trim().toLowerCase();
      const found = sampleTrips.filter(trip => (f ? trip.from.toLowerCase().includes(f) : true) && (t ? trip.to.toLowerCase().includes(t) : true));
      renderTrips(found);
    });

    // auto-fill from query params if present
    const params = new URLSearchParams(window.location.search);
    if (params.has('from')) {
      document.getElementById('from').value = params.get('from') || '';
      document.getElementById('to').value = params.get('to') || '';
      if (params.get('date')) document.getElementById('date').value = params.get('date');
      document.getElementById('seats').value = params.get('seats') || '1';
      bookingForm.dispatchEvent(new Event('submit'));
    }
  }

  // auth demo handlers
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', e => { e.preventDefault(); alert('Đăng nhập demo (no backend)'); });

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', e => { e.preventDefault(); alert('Đăng ký demo (no backend)'); });
});
