'use strict';

/* global GreenBusAPI, QRCode */

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
  const LOGIN_PATH = '../../auth/login.html';
  
  let api;
  try {
    api = await waitForGreenBusAPI();
  } catch (error) {
    console.error('GreenBusAPI chưa được khởi tạo:', error);
    window.location.href = LOGIN_PATH;
    return;
  }

  let sessionUser = null;
  try {
    sessionUser = api.requireAuth({ redirectTo: LOGIN_PATH });
  } catch (error) {
    console.warn(error.message);
    return;
  }

  const authToken = typeof api.getAuthToken === 'function'
    ? api.getAuthToken()
    : localStorage.getItem('authToken');

  if (!authToken) {
    window.location.href = LOGIN_PATH;
    return;
  }

  const authLink = document.getElementById('navAuthLink');
  const userToggle = document.getElementById('userMenuToggle');
  const userDropdown = document.getElementById('userDropdown');
  const userNav = document.getElementById('userNav');
  const logoutBtn = document.getElementById('logoutBtn');
  const toastStack = document.getElementById('toastStack');

  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profilePhone = document.getElementById('profilePhone');
  const profileRole = document.getElementById('profileRole');
  const profileJoin = document.getElementById('profileJoin');
  const accountGreeting = document.getElementById('accountGreeting');
  const roleBadge = document.getElementById('roleBadge');
  const adminPanelButton = document.getElementById('adminPanelButton');

  const statTotalTickets = document.getElementById('statTotalTickets');
  const statPendingTickets = document.getElementById('statPendingTickets');
  const statPaymentMethods = document.getElementById('statPaymentMethods');

  const bookingRows = document.getElementById('bookingRows');
  const refreshBookingsBtn = document.getElementById('refreshBookingsBtn');
  const generateQRBtn = document.getElementById('generateQRBtn');
  const qrModalOverlay = document.getElementById('qrModalOverlay');
  const closeQRModalBtn = document.getElementById('closeQRModal');
  const cancelQRModal = document.getElementById('cancelQRModal');
  const generateQRSubmit = document.getElementById('generateQRSubmit');
  const bookingSelection = document.getElementById('bookingSelection');

  const paymentList = document.getElementById('paymentList');
  const paymentForm = document.getElementById('paymentForm');
  const paymentMethod = document.getElementById('paymentMethod');
  const paymentLabel = document.getElementById('paymentLabel');
  const paymentBrand = document.getElementById('paymentBrand');
  const paymentLast4 = document.getElementById('paymentLast4');
  const cardExpiry = document.getElementById('cardExpiry');
  const cardCVV = document.getElementById('cardCVV');
  const cardName = document.getElementById('cardName');
  const vietqrLabel = document.getElementById('vietqrLabel');
  const momoLabel = document.getElementById('momoLabel');
  const momoPhone = document.getElementById('momoPhone');
  const paymentDefault = document.getElementById('paymentDefault');
  const togglePaymentForm = document.getElementById('togglePaymentForm');
  const cancelPaymentForm = document.getElementById('cancelPaymentForm');
  
  const cardFields = document.getElementById('cardFields');
  const vietqrFields = document.getElementById('vietqrFields');
  const momoFields = document.getElementById('momoFields');

  let unauthorizedRedirectPending = false;

  const showToast = (message, type = 'info') => {
    if (!toastStack || unauthorizedRedirectPending) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastStack.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const closeDropdown = () => {
    userDropdown?.classList.add('hidden');
    userToggle?.classList.remove('open');
  };

  const handleUnauthorized = () => {
    if (unauthorizedRedirectPending) {
      return;
    }
    unauthorizedRedirectPending = true;
    showToast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'error');
    setTimeout(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      window.location.href = LOGIN_PATH;
    }, 900);
  };

  const hydrateNavbar = (user) => {
    if (authLink) {
      authLink.textContent = 'Hồ sơ & Vé';
      authLink.href = 'index.html';
    }

    if (!user) {
      userToggle?.classList.add('hidden');
      closeDropdown();
      return;
    }

    const displayName = user.name || user.email || 'GreenBus User';
    const userNameEl = document.getElementById('userMenuName');
    const dropdownName = document.getElementById('userDropdownName');
    const dropdownEmail = document.getElementById('userDropdownEmail');
    const userRoleEl = document.getElementById('userMenuRole');

    if (userNameEl) userNameEl.textContent = displayName;
    if (dropdownName) dropdownName.textContent = displayName;
    if (dropdownEmail) dropdownEmail.textContent = user.email || '';
    if (userRoleEl) userRoleEl.textContent = user.role === 'admin' ? 'Quản trị' : 'Khách';

    userToggle?.classList.remove('hidden');
  };

  if (userToggle) {
    userToggle.addEventListener('click', () => {
      userDropdown?.classList.toggle('hidden');
      userToggle.classList.toggle('open');
    });
  }

  document.addEventListener('click', (event) => {
    if (!userNav) return;
    if (!userNav.contains(event.target)) {
      closeDropdown();
    }
  });

  const handleLogout = async () => {
    closeDropdown();
    try {
      await api.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Không thể gọi API logout.', error);
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = LOGIN_PATH;
  };

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  const renderProfile = (user) => {
    if (!user) return;

    const displayName = user.name || 'Khách GreenBus';

    accountGreeting.textContent = `Xin chào, ${displayName}!`;
    roleBadge.textContent = user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng';
    
    // Hiển thị button quản lý cho admin
    if (adminPanelButton) {
      if (user.role === 'admin') {
        adminPanelButton.classList.remove('hidden');
      } else {
        adminPanelButton.classList.add('hidden');
      }
    }

    profileName.textContent = displayName;
    profileEmail.textContent = user.email || 'Chưa cập nhật';
    profilePhone.textContent = user.phone || 'Chưa cập nhật';
    profileRole.textContent = user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng';
    profileJoin.textContent = user.created_at
      ? new Date(user.created_at).toLocaleDateString('vi-VN')
      : '—';
  };

  const formatStatus = (status) => {
    const map = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      cancelled: 'Đã huỷ',
      completed: 'Hoàn tất',
    };
    return map[status] || status;
  };

  const formatSeatNumbers = (seats) => {
    if (!Array.isArray(seats) || seats.length === 0) {
      return '—';
    }
    return seats.join(', ');
  };

  const renderBookings = (bookings) => {
    bookingRows.innerHTML = '';

    if (!bookings.length) {
      bookingRows.innerHTML = '<tr><td colspan="6" class="muted">Bạn chưa có vé nào.</td></tr>';
      return;
    }

    bookings.forEach((booking) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>GB-${String(booking.id).padStart(4, '0')}</td>
        <td>${booking.route_name || '—'}</td>
        <td>${booking.departure_date || '—'}</td>
        <td>${booking.seat_quantity || 0}</td>
        <td>${formatSeatNumbers(booking.seat_numbers)}</td>
        <td><span class="status-chip ${booking.status}">${formatStatus(booking.status)}</span></td>
      `;
      bookingRows.appendChild(tr);
    });
  };

  const renderStats = (bookings, paymentMethods) => {
    statTotalTickets.textContent = bookings.length.toString();
    statPendingTickets.textContent = bookings.filter((b) => b.status === 'pending').length.toString();
    statPaymentMethods.textContent = paymentMethods.length.toString();
  };

  const getPaymentMethods = () => {
    try {
      const raw = localStorage.getItem('paymentMethods');
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn('Không đọc được paymentMethods.', error);
      return [];
    }
  };

  const savePaymentMethods = (list) => {
    localStorage.setItem('paymentMethods', JSON.stringify(list));
  };

  const renderPayments = () => {
    const list = getPaymentMethods();
    paymentList.innerHTML = '';

    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'Chưa có phương thức nào.';
      paymentList.appendChild(li);
      return;
    }

    list.forEach((method, index) => {
      const li = document.createElement('li');
      li.className = 'payment-item';
      
      // Hiển thị thông tin theo từng phương thức
      let methodInfo = '';
      if (method.method === 'card') {
        methodInfo = `${method.brand?.toUpperCase() || 'CARD'} · •••• ${method.last4 || '****'}`;
        if (method.expiry) methodInfo += ` · ${method.expiry}`;
      } else if (method.method === 'vietqr') {
        methodInfo = 'VietQR · Quét mã QR';
      } else if (method.method === 'momo') {
        methodInfo = `MoMo · ${method.phone || '••••••••'}`;
      } else {
        // Fallback cho dữ liệu cũ
        methodInfo = `${method.brand?.toUpperCase() || 'PAYMENT'} · •••• ${method.last4 || '****'}`;
      }
      
      li.innerHTML = `
        <div class="payment-meta">
          <span>${method.label || 'Phương thức thanh toán'}</span>
          <small>${methodInfo}</small>
        </div>
        <div class="payment-actions">
          ${method.default ? '<span class="status-pill online">Mặc định</span>' : ''}
          <button class="ghost-btn" data-action="remove" data-index="${index}">Xoá</button>
        </div>
      `;
      paymentList.appendChild(li);
    });

    paymentList.querySelectorAll('button[data-action="remove"]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        const next = getPaymentMethods().filter((_, itemIndex) => itemIndex !== idx);
        savePaymentMethods(next);
        renderPayments();
        updateStats();
        showToast('Đã xoá phương thức thanh toán', 'info');
      })
    );
  };

  // Toggle payment method fields based on selection
  const togglePaymentMethodFields = (method) => {
    if (!cardFields || !vietqrFields || !momoFields) return;
    
    // Hide all fields
    cardFields.classList.add('hidden');
    vietqrFields.classList.add('hidden');
    momoFields.classList.add('hidden');
    
    // Show relevant fields
    if (method === 'card') {
      cardFields.classList.remove('hidden');
      // Make card fields required
      if (paymentLabel) paymentLabel.required = true;
      if (paymentLast4) paymentLast4.required = true;
      if (cardExpiry) cardExpiry.required = false;
      if (cardCVV) cardCVV.required = false;
      if (cardName) cardName.required = false;
    } else if (method === 'vietqr') {
      vietqrFields.classList.remove('hidden');
      if (vietqrLabel) vietqrLabel.required = true;
    } else if (method === 'momo') {
      momoFields.classList.remove('hidden');
      if (momoLabel) momoLabel.required = true;
      if (momoPhone) momoPhone.required = true;
    }
  };

  // Handle payment method selection change
  if (paymentMethod) {
    paymentMethod.addEventListener('change', (e) => {
      togglePaymentMethodFields(e.target.value);
    });
  }

  const togglePaymentFormVisibility = (show) => {
    paymentForm?.classList.toggle('hidden', !show);
    if (show && paymentMethod) {
      // Reset to card method when opening form
      paymentMethod.value = 'card';
      togglePaymentMethodFields('card');
    }
  };

  if (togglePaymentForm) {
    togglePaymentForm.addEventListener('click', () => togglePaymentFormVisibility(true));
  }

  if (cancelPaymentForm) {
    cancelPaymentForm.addEventListener('click', () => {
      togglePaymentFormVisibility(false);
      paymentForm?.reset();
      if (paymentMethod) {
        paymentMethod.value = 'card';
        togglePaymentMethodFields('card');
      }
    });
  }

  // Card expiry formatting (same as booking)
  if (cardExpiry) {
    cardExpiry.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      e.target.value = value;
    });
  }

  // Card number formatting (for last4)
  if (paymentLast4) {
    paymentLast4.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
  }

  // CVV formatting
  if (cardCVV) {
    cardCVV.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    });
  }

  if (paymentForm) {
    paymentForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const method = paymentMethod?.value || 'card';
      const isDefault = paymentDefault.value === 'yes';
      let newMethod = { method, default: isDefault };

      // Validate and collect data based on payment method
      if (method === 'card') {
        const label = paymentLabel?.value.trim() || '';
        const brand = paymentBrand?.value || 'visa';
        const last4 = paymentLast4?.value.trim() || '';
        const expiry = cardExpiry?.value.trim() || '';
        const cvv = cardCVV?.value.trim() || '';
        const name = cardName?.value.trim() || '';

        if (!label) {
          showToast('Vui lòng nhập tên hiển thị.', 'error');
          return;
        }

        if (last4.length !== 4 || Number.isNaN(Number(last4))) {
          showToast('Vui lòng nhập 4 số cuối hợp lệ.', 'error');
          return;
        }

        newMethod = {
          ...newMethod,
          label,
          brand,
          last4,
          expiry: expiry || undefined,
          cvv: cvv || undefined,
          name: name || undefined,
        };
      } else if (method === 'vietqr') {
        const label = vietqrLabel?.value.trim() || '';
        if (!label) {
          showToast('Vui lòng nhập tên hiển thị.', 'error');
          return;
        }
        newMethod = { ...newMethod, label };
      } else if (method === 'momo') {
        const label = momoLabel?.value.trim() || '';
        const phone = momoPhone?.value.trim() || '';
        if (!label) {
          showToast('Vui lòng nhập tên hiển thị.', 'error');
          return;
        }
        if (!phone || phone.length < 9) {
          showToast('Vui lòng nhập số điện thoại MoMo hợp lệ.', 'error');
          return;
        }
        newMethod = { ...newMethod, label, phone };
      }

      const current = getPaymentMethods();
      const nextList = isDefault
        ? current.map((item) => ({ ...item, default: false }))
        : current.slice();
      nextList.push(newMethod);
      savePaymentMethods(nextList);

      paymentForm.reset();
      if (paymentMethod) {
        paymentMethod.value = 'card';
        togglePaymentMethodFields('card');
      }
      togglePaymentFormVisibility(false);
      renderPayments();
      updateStats();
      showToast('Đã lưu phương thức thanh toán mới.', 'success');
    });
  }

  let cachedBookings = [];

  const fetchBookings = async () => {
    bookingRows.innerHTML = '<tr><td colspan="6" class="muted">Đang tải dữ liệu…</td></tr>';
    try {
      const response = await api.request('/bookings');
      cachedBookings = Array.isArray(response.data) ? response.data : [];
      renderBookings(cachedBookings);
      updateStats();
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      bookingRows.innerHTML = `<tr><td colspan="6" class="muted">${error.message || 'Không thể tải vé.'}</td></tr>`;
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await api.request('/me');
      const user = response.data;
      sessionUser = user;
      renderProfile(user);
      hydrateNavbar(user);

      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      showToast('Không thể tải thông tin cá nhân.', 'error');
    }
  };

  const updateStats = () => {
    const payments = getPaymentMethods();
    statPaymentMethods.textContent = payments.length.toString();
    statTotalTickets.textContent = cachedBookings.length.toString();
    statPendingTickets.textContent = cachedBookings.filter((b) => b.status === 'pending').length.toString();
  };

  if (refreshBookingsBtn) {
    refreshBookingsBtn.addEventListener('click', fetchBookings);
  }

  // Mở modal chọn vé để tạo QR
  const openQRModal = () => {
    if (!cachedBookings || cachedBookings.length === 0) {
      showToast('Bạn chưa có vé nào để tạo QR code.', 'error');
      return;
    }

    // Lọc chỉ lấy vé đã xác nhận (confirmed)
    const confirmedBookings = cachedBookings.filter(
      (booking) => booking.status === 'confirmed'
    );

    if (confirmedBookings.length === 0) {
      showToast('Bạn chưa có vé nào đã được xác nhận.', 'error');
      return;
    }

    // Render danh sách vé để chọn
    bookingSelection.innerHTML = '';
    confirmedBookings.forEach((booking) => {
      const bookingItem = document.createElement('div');
      bookingItem.className = 'booking-item';
      bookingItem.innerHTML = `
        <input type="checkbox" id="booking-${booking.id}" value="${booking.id}" />
        <label for="booking-${booking.id}" class="booking-item-info">
          <div class="booking-item-code">GB-${String(booking.id).padStart(4, '0')}</div>
          <div class="booking-item-details">
            ${booking.route_name || '—'} · ${booking.departure_date || '—'} · 
            Ghế: ${formatSeatNumbers(booking.seat_numbers)}
          </div>
        </label>
        <span class="booking-item-status">Đã xác nhận</span>
      `;
      bookingSelection.appendChild(bookingItem);
    });

    // Thêm event listener cho các checkbox
    bookingSelection.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        updateGenerateButtonState();
        // Toggle selected class cho booking item
        const item = checkbox.closest('.booking-item');
        if (checkbox.checked) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
    });

    // Hiển thị modal
    qrModalOverlay?.classList.remove('hidden');
    updateGenerateButtonState();
  };

  // Cập nhật trạng thái nút "Tạo QR"
  const updateGenerateButtonState = () => {
    const checkedBoxes = bookingSelection.querySelectorAll('input[type="checkbox"]:checked');
    if (generateQRSubmit) {
      generateQRSubmit.disabled = checkedBoxes.length === 0;
    }
  };

  // Đóng modal
  const closeQRModal = () => {
    qrModalOverlay?.classList.add('hidden');
    bookingSelection.innerHTML = '';
  };

  // Tạo và tải QR code cho các vé đã chọn (sử dụng backend)
  const generateAndDownloadQR = async () => {
    const checkedBoxes = bookingSelection.querySelectorAll('input[type="checkbox"]:checked');
    
    if (checkedBoxes.length === 0) {
      showToast('Vui lòng chọn ít nhất một vé để tạo QR code.', 'error');
      return;
    }

    const selectedBookingIds = Array.from(checkedBoxes).map((cb) => parseInt(cb.value));

    try {
      showToast('Đang tạo QR code...', 'info');

      // Gọi API backend để tạo QR code
      const response = await api.request('/bookings/qr-code', {
        method: 'POST',
        json: {
          booking_ids: selectedBookingIds,
        },
      });

      if (response.status !== 'ok' || !response.data?.image_data_url) {
        throw new Error(response.message || 'Không thể tạo QR code.');
      }

      // Tải image từ base64
      const imageDataUrl = response.data.image_data_url;
      const bookingCodes = selectedBookingIds
        .map((id) => {
          const booking = cachedBookings.find((b) => b.id === id);
          return booking ? `GB-${String(booking.id).padStart(4, '0')}` : '';
        })
        .filter(Boolean)
        .join('-');

      // Tạo link download
      const link = document.createElement('a');
      link.href = imageDataUrl;
      link.download = `GreenBus-QR-${bookingCodes}-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Đã tải QR code thành công!', 'success');
      closeQRModal();
    } catch (error) {
      console.error('Lỗi khi tạo QR code:', error);
      showToast(error.message || 'Không thể tạo QR code. Vui lòng thử lại.', 'error');
    }
  };

  // Event listeners cho modal
  if (generateQRBtn) {
    generateQRBtn.addEventListener('click', openQRModal);
  }

  if (closeQRModalBtn) {
    closeQRModalBtn.addEventListener('click', closeQRModal);
  }

  if (cancelQRModal) {
    cancelQRModal.addEventListener('click', closeQRModal);
  }

  if (generateQRSubmit) {
    generateQRSubmit.addEventListener('click', generateAndDownloadQR);
  }

  // Đóng modal khi click vào overlay
  if (qrModalOverlay) {
    qrModalOverlay.addEventListener('click', (e) => {
      if (e.target === qrModalOverlay) {
        closeQRModal();
      }
    });
  }

  const bootstrap = async () => {
    hydrateNavbar(sessionUser);
    renderProfile(sessionUser);
    renderPayments();
    await fetchProfile();
    if (!unauthorizedRedirectPending) {
      fetchBookings();
    }
    
    // Initialize payment form with card method
    if (paymentMethod) {
      paymentMethod.value = 'card';
      togglePaymentMethodFields('card');
    }
  };

  bootstrap();
});


