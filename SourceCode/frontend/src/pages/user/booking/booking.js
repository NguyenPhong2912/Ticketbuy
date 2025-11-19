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
  let api;
  try {
    api = await waitForGreenBusAPI();
  } catch (error) {
    console.error('GreenBusAPI chưa được khởi tạo:', error);
    return;
  }

  let currentUser;
  try {
    currentUser = api.requireAuth({ redirectTo: '../../auth/login.html' });
  } catch (error) {
    console.warn(error.message);
    return;
  }

  const authToken = typeof api.getAuthToken === 'function'
    ? api.getAuthToken()
    : localStorage.getItem('authToken');

  if (!authToken) {
    window.location.href = '../../auth/login.html';
    return;
  }

  const state = {
    trips: [],
    selectedRoute: null,
    selectedSeats: new Set(),
    selectedDate: null,
    bookingData: null,
    currentPaymentMethod: 'card',
  };

  const fromLocationInput = document.getElementById('fromLocation');
  const toLocationInput = document.getElementById('toLocation');
  const dateInput = document.getElementById('date');
  const seatsInput = document.getElementById('seats');
  const searchTripsBtn = document.getElementById('searchTripsBtn');
  const results = document.getElementById('searchResults');
  const resultsTitle = document.getElementById('resultsTitle');
  const resultsLegend = document.getElementById('resultsLegend');
  const decreaseSeatsBtn = document.getElementById('decreaseSeats');
  const increaseSeatsBtn = document.getElementById('increaseSeats');

  const seatModal = document.getElementById('seatModal');
  const closeSeatModalBtn = document.getElementById('closeSeatModal');
  const seatMap = document.getElementById('seatMap');
  const selectedRouteName = document.getElementById('selectedRouteName');
  const selectedRouteMeta = document.getElementById('selectedRouteMeta');
  const confirmSeat = document.getElementById('confirmSeat');
  const cancelSeat = document.getElementById('cancelSeat');
  const modalDepartureDate = document.getElementById('modalDepartureDate');
  const tripAvailability = document.getElementById('tripAvailability');
  const toastStack = document.getElementById('toastStack');

  const paymentModal = document.getElementById('paymentModal');
  const closePaymentModalBtn = document.getElementById('closePaymentModal');
  const paymentRouteName = document.getElementById('paymentRouteName');
  const paymentSummary = document.getElementById('paymentSummary');
  const backToSeat = document.getElementById('backToSeat');
  const confirmPayment = document.getElementById('confirmPayment');
  const paymentTabs = document.querySelectorAll('.payment-tab');
  const paymentPanels = document.querySelectorAll('.payment-panel');

  const userToggle = document.getElementById('userMenuToggle');
  const userDropdown = document.getElementById('userDropdown');
  const userNav = document.getElementById('userNav');
  const logoutBtn = document.getElementById('logoutBtn');
  const authLink = document.getElementById('navAuthLink');

  const showToast = (message, variant = 'info') => {
    if (!toastStack || unauthorizedRedirectPending) return;
    const toast = document.createElement('div');
    toast.className = `toast ${variant}`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  let unauthorizedRedirectPending = false;

  const handleUnauthorized = () => {
    if (unauthorizedRedirectPending) {
      return;
    }
    unauthorizedRedirectPending = true;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showToast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'error');
    setTimeout(() => {
      window.location.href = '../../auth/login.html';
    }, 1000);
  };

  const hydrateNavbar = (user) => {
    if (!user) return;
    const userNameEl = document.getElementById('userMenuName');
    const dropdownName = document.getElementById('userDropdownName');
    const dropdownEmail = document.getElementById('userDropdownEmail');
    const userRoleEl = document.getElementById('userMenuRole');

    const displayName = user.name || user.email || 'GreenBus User';
    if (userNameEl) userNameEl.textContent = displayName;
    if (dropdownName) dropdownName.textContent = displayName;
    if (dropdownEmail) dropdownEmail.textContent = user.email || '';
    if (userRoleEl) userRoleEl.textContent = user.role === 'admin' ? 'Quản trị' : 'Khách';
    if (authLink) {
      authLink.textContent = 'Hồ sơ & Vé';
      authLink.href = '../account/index.html';
      authLink.classList.add('hidden');
    }
    userToggle?.classList.remove('hidden');
  };

  const refreshSession = async () => {
    try {
      const response = await api.request('/me');
      currentUser = response.data;
      hydrateNavbar(currentUser);
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        handleUnauthorized();
      } else {
        console.warn('Không thể xác thực phiên làm việc:', error);
      }
      return false;
    }
  };

  // Autocomplete locations
  let allLocations = [];
  let fromSuggestions = [];
  let toSuggestions = [];
  let activeSuggestionIndex = -1;
  let activeInput = null;

  const loadLocations = async () => {
    try {
      const response = await api.request('/routes/locations', { skipAuth: true });
      allLocations = Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn('Không thể tải danh sách địa điểm:', error);
      // Fallback to default locations
      allLocations = [
        'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
        'Nha Trang', 'Huế', 'Vũng Tàu', 'Đà Lạt', 'Quy Nhon'
      ];
    }
  };

  const filterSuggestions = (query, inputType) => {
    if (!query || query.trim() === '') {
      return [];
    }
    const lowerQuery = query.toLowerCase().trim();
    return allLocations.filter(loc => 
      loc.toLowerCase().includes(lowerQuery)
    ).slice(0, 8); // Limit to 8 suggestions
  };

  const createSuggestionsDropdown = (input, suggestions) => {
    // Remove existing dropdown
    const existing = document.getElementById(`${input.id}Suggestions`);
    if (existing) {
      existing.remove();
    }

    if (suggestions.length === 0) {
      return;
    }

    const dropdown = document.createElement('div');
    dropdown.id = `${input.id}Suggestions`;
    dropdown.className = 'location-suggestions';
    
    suggestions.forEach((location, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      if (index === activeSuggestionIndex) {
        item.classList.add('active');
      }
      item.textContent = location;
      item.addEventListener('click', () => {
        input.value = location;
        closeSuggestions(input);
        if (input === fromLocationInput) {
          fromSuggestions = [];
        } else {
          toSuggestions = [];
        }
      });
      dropdown.appendChild(item);
    });

    input.parentElement.appendChild(dropdown);
  };

  const closeSuggestions = (input) => {
    const dropdown = document.getElementById(`${input.id}Suggestions`);
    if (dropdown) {
      dropdown.remove();
    }
    activeSuggestionIndex = -1;
    activeInput = null;
  };

  const setupAutocomplete = (input) => {
    input.addEventListener('input', (e) => {
      const query = e.target.value;
      if (input === fromLocationInput) {
        fromSuggestions = filterSuggestions(query, 'from');
        createSuggestionsDropdown(input, fromSuggestions);
      } else {
        toSuggestions = filterSuggestions(query, 'to');
        createSuggestionsDropdown(input, toSuggestions);
      }
      activeSuggestionIndex = -1;
    });

    input.addEventListener('keydown', (e) => {
      const suggestions = input === fromLocationInput ? fromSuggestions : toSuggestions;
      const dropdown = document.getElementById(`${input.id}Suggestions`);
      
      if (!dropdown || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
        updateSuggestionHighlight(dropdown, activeSuggestionIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSuggestionIndex = activeSuggestionIndex <= 0 
          ? suggestions.length - 1 
          : activeSuggestionIndex - 1;
        updateSuggestionHighlight(dropdown, activeSuggestionIndex);
      } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
        e.preventDefault();
        input.value = suggestions[activeSuggestionIndex];
        closeSuggestions(input);
      } else if (e.key === 'Escape') {
        closeSuggestions(input);
      }
    });

    input.addEventListener('blur', () => {
      // Delay to allow click on suggestion
      setTimeout(() => closeSuggestions(input), 200);
    });

    input.addEventListener('focus', () => {
      const query = input.value;
      if (query) {
        const suggestions = filterSuggestions(query, input === fromLocationInput ? 'from' : 'to');
        if (input === fromLocationInput) {
          fromSuggestions = suggestions;
        } else {
          toSuggestions = suggestions;
        }
        createSuggestionsDropdown(input, suggestions);
      }
    });
  };

  const updateSuggestionHighlight = (dropdown, index) => {
    const items = dropdown.querySelectorAll('.suggestion-item');
    items.forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
  };

  // Parse route name to extract origin and destination
  const parseRouteName = (routeName) => {
    if (!routeName) return { origin: '', destination: '' };
    
    // Format: "TP. HCM → Đà Lạt" hoặc "TP. HCM - Đà Lạt"
    const match = routeName.match(/^(.+?)\s*[→-]\s*(.+)$/);
    if (match) {
      return {
        origin: match[1].trim(),
        destination: match[2].trim()
      };
    }
    
    return { origin: '', destination: '' };
  };

  // Load route info by ID and fill form
  const loadRouteAndFillForm = async (routeId, date = null) => {
    try {
      console.log('Loading route:', routeId, 'with date:', date);
      
      const response = await api.request(`/routes/${routeId}`, { skipAuth: true });
      const route = response.data;
      
      console.log('Route data received:', route);
      
      // Determine which date to use: URL param > route.departure_date > null
      let dateToUse = date;
      if (!dateToUse && route && route.departure_date) {
        dateToUse = route.departure_date;
        console.log('Using departure_date from route:', dateToUse);
      }
      
      // Fill date FIRST if we have one
      if (dateToUse && dateInput) {
        dateInput.value = dateToUse;
        console.log('Filled date:', dateToUse);
      }
      
      if (route && route.name) {
        const { origin, destination } = parseRouteName(route.name);
        
        console.log('Parsed locations:', { origin, destination });
        
        if (origin && fromLocationInput) {
          fromLocationInput.value = origin;
          console.log('Filled fromLocation:', origin);
        }
        if (destination && toLocationInput) {
          toLocationInput.value = destination;
          console.log('Filled toLocation:', destination);
        }
      }
      
      // Auto search trips if we have date and locations
      if (dateToUse && dateInput && dateInput.value) {
        if (fromLocationInput?.value && toLocationInput?.value) {
          console.log('Auto searching trips with locations and date');
          await fetchTripsByDate(dateInput.value, fromLocationInput.value, toLocationInput.value);
        } else {
          // If only date, still search trips
          console.log('Auto searching trips with date only');
          await fetchTripsByDate(dateInput.value, '', '');
        }
      } else if (fromLocationInput?.value && toLocationInput?.value && !dateToUse) {
        // If we have locations but no date, wait for user to select date
        console.log('Locations filled, waiting for date selection');
      }
    } catch (error) {
      console.error('Không thể tải thông tin tuyến:', error);
      // Still fill date if provided
      if (date && dateInput) {
        dateInput.value = date;
        await fetchTripsByDate(date, '', '');
      }
    }
  };

  const bootstrap = async () => {
    // Check URL params FIRST, before any other initialization
    const urlParams = new URLSearchParams(window.location.search);
    const routeIdParam = urlParams.get('route_id');
    const dateParam = urlParams.get('date');
    
    console.log('URL params:', { routeIdParam, dateParam });
    console.log('Current URL:', window.location.href);
    console.log('Full search string:', window.location.search);
    
    hydrateNavbar(currentUser);
    const sessionOk = await refreshSession();
    if (!sessionOk) {
      return;
    }
    
    // Load locations for autocomplete
    await loadLocations();
    
    // Setup autocomplete for both inputs
    if (fromLocationInput) setupAutocomplete(fromLocationInput);
    if (toLocationInput) setupAutocomplete(toLocationInput);
    
    // If route_id is provided in URL, load route and fill form
    if (routeIdParam) {
      console.log('Route ID found in URL, loading route...');
      // Pass dateParam (can be null or empty string)
      await loadRouteAndFillForm(routeIdParam, dateParam || null);
    } else if (dateParam && dateInput) {
      // If only date is provided, fill it and search
      console.log('Date found in URL (no route_id), filling date...');
      dateInput.value = dateParam;
      await fetchTripsByDate(dateParam, '', '');
    }
  };

  bootstrap();

  if (userToggle) {
    userToggle.addEventListener('click', () => {
      userDropdown?.classList.toggle('hidden');
      userToggle.classList.toggle('open');
    });
  }

  document.addEventListener('click', (event) => {
    if (!userNav) return;
    if (!userNav.contains(event.target)) {
      userDropdown?.classList.add('hidden');
      userToggle?.classList.remove('open');
    }
  });

  const handleLogout = async () => {
    try {
      await api.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Không thể logout qua API:', error);
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '../../auth/login.html';
  };

  logoutBtn?.addEventListener('click', handleLogout);

  const setResultsStatus = (message, isError = false) => {
    results.innerHTML = `<div class="route-status ${isError ? 'error' : ''}">${message}</div>`;
  };

  const renderTrips = (tripsToRender) => {
    let trips = tripsToRender || state.trips;
    
    if (!trips.length) {
      setResultsStatus('Không có chuyến nào khả dụng vào ngày đã chọn. Vui lòng chọn ngày khác.', true);
      resultsLegend.style.display = 'none';
      return;
    }

    resultsLegend.style.display = 'flex';
    
    const selectedDate = dateInput.value;
    const dateObj = new Date(selectedDate);
    const dateStr = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    resultsTitle.textContent = `${trips.length} chuyến có sẵn - ${dateStr}`;

    results.innerHTML = trips
      .map(
        (trip) => {
          const timeStr = trip.departure_time ? trip.departure_time.substring(0, 5) : '--:--';
          // Đảm bảo available_seats là số nguyên
          const availableSeats = parseInt(trip.available_seats) || 0;
          const seatsInfo = availableSeats > 0 
            ? `${availableSeats} ghế trống`
            : 'Hết chỗ';
          const seatsClass = availableSeats > 0 ? 'seats-available' : 'seats-full';
          
          // Format ngày khởi hành
          let dateDisplay = '';
          if (trip.departure_date) {
            const tripDate = new Date(trip.departure_date);
            dateDisplay = tripDate.toLocaleDateString('vi-VN', { 
              weekday: 'short', 
              day: '2-digit', 
              month: '2-digit',
              year: 'numeric'
            });
          }
          
          return `
        <article class="route-card trip-card">
          <div class="trip-header">
            <h3>${trip.route_name}</h3>
            <div class="trip-meta">
              <div class="trip-time">🕐 ${timeStr}</div>
              ${dateDisplay ? `<div class="trip-date">📅 ${dateDisplay}</div>` : ''}
            </div>
          </div>
          <p class="trip-details">${trip.route_details || 'Đang cập nhật quãng đường'}</p>
          <div class="trip-footer">
            <div class="trip-info">
              <p class="price">${api.formatCurrency(trip.route_price)}₫</p>
              <p class="${seatsClass}">${seatsInfo}</p>
            </div>
            <button class="btn-primary select-route" data-route-id="${trip.route_id}" data-trip-id="${trip.id}" ${availableSeats === 0 ? 'disabled' : ''}>
              ${availableSeats > 0 ? 'Chọn ghế' : 'Hết chỗ'}
            </button>
          </div>
        </article>
      `;
        }
      )
      .join('');
  };

  // Function để cập nhật số ghế trống cho một trip cụ thể
  const updateTripAvailableSeats = (routeId, tripId, seatsChange) => {
    const trip = state.trips.find((t) => 
      Number(t.route_id) === Number(routeId) && 
      (!tripId || Number(t.id) === Number(tripId))
    );
    
    if (trip && trip.available_seats !== undefined) {
      trip.available_seats = Math.max(0, parseInt(trip.available_seats) + seatsChange);
      // Re-render trips để cập nhật UI
      renderTrips(state.trips);
    }
  };

  // Helper: Shuffle array and get random items
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchTripsByDate = async (date, fromLocation = '', toLocation = '') => {
    if (!date) {
      results.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚌</div>
          <p class="empty-text">Vui lòng chọn ngày khởi hành để xem các chuyến có sẵn</p>
        </div>
      `;
      resultsTitle.textContent = 'Chọn ngày để xem chuyến';
      resultsLegend.style.display = 'none';
      return;
    }

    setResultsStatus('Đang tải chuyến xe...');
    
    try {
      // Gọi API để lấy trips theo ngày
      const response = await api.request(`/trips?date=${date}`, { skipAuth: true });
      let trips = Array.isArray(response.data) ? response.data : [];
      
      // Lọc chỉ lấy chuyến active và còn ghế
      trips = trips.filter(trip => 
        trip.status === 'active' && 
        trip.available_seats > 0
      );
      
      // QUAN TRỌNG: Group trips theo route_id + departure_date + departure_time
      // Để tránh hiển thị trùng lặp (có thể có nhiều trips cùng route+date+time)
      const tripMap = new Map();
      trips.forEach(trip => {
        const key = `${trip.route_id}_${trip.departure_date}_${trip.departure_time}`;
        if (!tripMap.has(key)) {
          tripMap.set(key, trip);
        } else {
          // Nếu đã có, giữ trip có available_seats thấp hơn (thực tế hơn)
          const existing = tripMap.get(key);
          if (trip.available_seats < existing.available_seats) {
            tripMap.set(key, trip);
          }
        }
      });
      trips = Array.from(tripMap.values());

      // Lọc theo điểm đi và điểm đến nếu có
      if (fromLocation || toLocation) {
        trips = trips.filter(trip => {
          const routeName = (trip.route_name || '').trim();
          
          // Parse route name: "TP. HCM → Đà Lạt" hoặc "TP. HCM - Đà Lạt"
          const routeMatch = routeName.match(/^(.+?)\s*[→-]\s*(.+)$/);
          if (!routeMatch) {
            // Nếu không match format, fallback về cách cũ
            const fullRouteText = `${routeName} ${trip.route_details || ''}`.toLowerCase();
            const fromMatch = !fromLocation || fullRouteText.includes(fromLocation.toLowerCase());
            const toMatch = !toLocation || fullRouteText.includes(toLocation.toLowerCase());
            return fromMatch && toMatch;
          }
          
          const routeOrigin = routeMatch[1].trim();
          const routeDestination = routeMatch[2].trim();
          
          // Normalize locations để so sánh (loại bỏ dấu, lowercase, xử lý viết tắt)
          const normalizeLocation = (loc) => {
            if (!loc) return '';
            return loc
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
              .replace(/\./g, '') // Loại bỏ dấu chấm
              .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
              .trim();
          };
          
          const normalizedFrom = normalizeLocation(fromLocation);
          const normalizedTo = normalizeLocation(toLocation);
          const normalizedRouteOrigin = normalizeLocation(routeOrigin);
          const normalizedRouteDestination = normalizeLocation(routeDestination);
          
          // Mapping các biến thể tên địa điểm
          const locationVariants = {
            'tp hcm': ['tp ho chi minh', 'ho chi minh', 'sai gon', 'sài gòn', 'thanh pho ho chi minh'],
            'ha noi': ['hà nội', 'ha noi', 'hanoi'],
            'da nang': ['đà nẵng', 'da nang'],
            'da lat': ['đà lạt', 'da lat', 'dalat'],
            'can tho': ['cần thơ', 'can tho'],
            'nha trang': ['nha trang'],
            'hue': ['huế', 'hue'],
            'vung tau': ['vũng tàu', 'vung tau'],
            'quy nhon': ['quy nhon', 'quy nhơn'],
          };
          
          // Kiểm tra match với các biến thể
          const checkLocationMatch = (input, target) => {
            if (!input) return true; // Nếu không có input thì match
            if (!target) return false;
            
            const normalizedInput = normalizeLocation(input);
            const normalizedTarget = normalizeLocation(target);
            
            // Exact match sau khi normalize
            if (normalizedInput === normalizedTarget) return true;
            
            // Kiểm tra contains
            if (normalizedTarget.includes(normalizedInput) || normalizedInput.includes(normalizedTarget)) {
              return true;
            }
            
            // Kiểm tra variants
            for (const [key, variants] of Object.entries(locationVariants)) {
              if (normalizedInput === key || variants.includes(normalizedInput)) {
                if (normalizedTarget === key || variants.includes(normalizedTarget)) {
                  return true;
                }
              }
            }
            
            return false;
          };
          
          const fromMatch = checkLocationMatch(fromLocation, routeOrigin);
          const toMatch = checkLocationMatch(toLocation, routeDestination);
          
          return fromMatch && toMatch;
        });
      }

      if (trips.length === 0) {
        const searchInfo = [];
        if (fromLocation) searchInfo.push(`từ ${fromLocation}`);
        if (toLocation) searchInfo.push(`đến ${toLocation}`);
        const searchText = searchInfo.length > 0 ? ` ${searchInfo.join(' ')}` : '';
        setResultsStatus(`Không có chuyến nào khả dụng${searchText} vào ngày đã chọn. Vui lòng thử lại với tiêu chí khác.`, true);
        resultsLegend.style.display = 'none';
        return;
      }

      // Shuffle và lấy 10-20 chuyến ngẫu nhiên cho kết quả tìm kiếm
      const shuffled = shuffleArray(trips);
      const count = Math.min(shuffled.length, Math.floor(Math.random() * 11) + 10); // 10-20 chuyến
      state.trips = shuffled.slice(0, count);
      
      renderTrips(state.trips);
    } catch (error) {
      console.error(error);
      // Fallback: dùng logic demo nếu API chưa có
      await fetchTripsDemo(date, fromLocation, toLocation);
    }
  };

  // Fallback demo logic nếu API chưa có
  const fetchTripsDemo = async (date, fromLocation = '', toLocation = '') => {
    setResultsStatus('Đang kiểm tra chuyến có sẵn...');
    
    try {
      // Thử lấy trips từ API /trips trước
      try {
        const tripsResponse = await api.request(`/trips?date=${date}`, { skipAuth: true });
        if (tripsResponse.status === 'ok' && Array.isArray(tripsResponse.data) && tripsResponse.data.length > 0) {
          // Có data từ API, sử dụng nó
          let trips = tripsResponse.data.map(trip => ({
            id: trip.id,
            route_id: trip.route_id,
            route_name: trip.route_name,
            route_details: trip.route_details,
            route_price: trip.route_price,
            departure_time: trip.departure_time,
            available_seats: parseInt(trip.available_seats) || 0, // Lấy từ database
            status: trip.status || 'active',
          }));
          
          // Lọc theo điểm đi và điểm đến nếu có
          if (fromLocation || toLocation) {
            const normalizeLocation = (loc) => {
              if (!loc) return '';
              return loc
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\./g, '')
                .replace(/\s+/g, ' ')
                .trim();
            };
            
            const checkLocationMatch = (searchLoc, routeLoc) => {
              if (!searchLoc) return true;
              const normalizedSearch = normalizeLocation(searchLoc);
              const normalizedRoute = normalizeLocation(routeLoc);
              
              if (normalizedSearch === normalizedRoute) return true;
              if (normalizedRoute.includes(normalizedSearch)) return true;
              if (normalizedSearch.includes(normalizedRoute)) return true;
              
              return false;
            };
            
            trips = trips.filter(trip => {
              const routeName = trip.route_name || '';
              const parts = routeName.split('→').map(p => p.trim());
              const routeOrigin = parts[0] || '';
              const routeDestination = parts[1] || '';
              
              const fromMatch = checkLocationMatch(fromLocation, routeOrigin);
              const toMatch = checkLocationMatch(toLocation, routeDestination);
              
              return fromMatch && toMatch;
            });
          }
          
          if (trips.length === 0) {
            const searchInfo = [];
            if (fromLocation) searchInfo.push(`từ ${fromLocation}`);
            if (toLocation) searchInfo.push(`đến ${toLocation}`);
            const searchText = searchInfo.length > 0 ? ` ${searchInfo.join(' ')}` : '';
            setResultsStatus(`Không có chuyến nào khả dụng${searchText} vào ngày đã chọn. Vui lòng thử lại với tiêu chí khác.`, true);
            resultsLegend.style.display = 'none';
            return;
          }
          
          const shuffled = shuffleArray(trips);
          const count = Math.min(shuffled.length, Math.floor(Math.random() * 11) + 10);
          state.trips = shuffled.slice(0, count);
          renderTrips(state.trips);
          return;
        }
      } catch (tripsError) {
        console.warn('Không thể lấy trips từ API, dùng fallback:', tripsError);
      }
      
      // Fallback: Lấy tất cả routes và check availability
      const routesResponse = await api.request('/routes', { skipAuth: true });
      const routes = Array.isArray(routesResponse.data) ? routesResponse.data : [];
      
      // Kiểm tra availability cho mỗi route
      const availabilityChecks = routes.map(route => 
        checkTripAvailability(route.id, date).then(availability => ({
          ...route,
          available: availability.available,
          departure_time: availability.departureTime || '08:00',
          available_seats: availability.available ? 40 : 0, // Fallback: hardcode nếu không có API
        }))
      );
      
      const results = await Promise.all(availabilityChecks);
      let availableTrips = results
        .filter(result => result.available)
        .map(result => ({
          id: result.id,
          route_id: result.id,
          route_name: result.name,
          route_details: result.details,
          route_price: result.price,
          departure_time: result.departure_time,
          available_seats: result.available_seats,
          status: 'active',
        }));

      // Lọc theo điểm đi và điểm đến nếu có với logic matching thông minh
      if (fromLocation || toLocation) {
        // Helper function để normalize location
        const normalizeLocation = (loc) => {
          if (!loc) return '';
          return loc
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\./g, '')
            .replace(/\s+/g, ' ')
            .trim();
        };
        
        // Mapping các biến thể tên địa điểm
        const locationVariants = {
          'tp hcm': ['tp ho chi minh', 'ho chi minh', 'sai gon', 'sài gòn', 'thanh pho ho chi minh'],
          'ha noi': ['hà nội', 'ha noi', 'hanoi'],
          'da nang': ['đà nẵng', 'da nang'],
          'da lat': ['đà lạt', 'da lat', 'dalat'],
          'can tho': ['cần thơ', 'can tho'],
          'nha trang': ['nha trang'],
          'hue': ['huế', 'hue'],
          'vung tau': ['vũng tàu', 'vung tau'],
          'quy nhon': ['quy nhon', 'quy nhơn'],
        };
        
        // Kiểm tra match với các biến thể
        const checkLocationMatch = (input, target) => {
          if (!input) return true;
          if (!target) return false;
          
          const normalizedInput = normalizeLocation(input);
          const normalizedTarget = normalizeLocation(target);
          
          if (normalizedInput === normalizedTarget) return true;
          if (normalizedTarget.includes(normalizedInput) || normalizedInput.includes(normalizedTarget)) {
            return true;
          }
          
          for (const [key, variants] of Object.entries(locationVariants)) {
            if (normalizedInput === key || variants.includes(normalizedInput)) {
              if (normalizedTarget === key || variants.includes(normalizedTarget)) {
                return true;
              }
            }
          }
          
          return false;
        };
        
        availableTrips = availableTrips.filter(trip => {
          const routeName = (trip.route_name || '').trim();
          
          // Parse route name: "TP. HCM → Đà Lạt" hoặc "TP. HCM - Đà Lạt"
          const routeMatch = routeName.match(/^(.+?)\s*[→-]\s*(.+)$/);
          if (!routeMatch) {
            // Nếu không match format, fallback về cách cũ
            const fullRouteText = `${routeName} ${trip.route_details || ''}`.toLowerCase();
            const fromMatch = !fromLocation || fullRouteText.includes(fromLocation.toLowerCase());
            const toMatch = !toLocation || fullRouteText.includes(toLocation.toLowerCase());
            return fromMatch && toMatch;
          }
          
          const routeOrigin = routeMatch[1].trim();
          const routeDestination = routeMatch[2].trim();
          
          const fromMatch = checkLocationMatch(fromLocation, routeOrigin);
          const toMatch = checkLocationMatch(toLocation, routeDestination);
          
          return fromMatch && toMatch;
        });
      }

      if (availableTrips.length === 0) {
        const searchInfo = [];
        if (fromLocation) searchInfo.push(`từ ${fromLocation}`);
        if (toLocation) searchInfo.push(`đến ${toLocation}`);
        const searchText = searchInfo.length > 0 ? ` ${searchInfo.join(' ')}` : '';
        setResultsStatus(`Không có chuyến nào khả dụng${searchText} vào ngày đã chọn. Vui lòng thử lại với tiêu chí khác.`, true);
        resultsLegend.style.display = 'none';
        return;
      }

      // Shuffle và lấy 10-20 chuyến ngẫu nhiên cho kết quả tìm kiếm
      const shuffled = shuffleArray(availableTrips);
      const count = Math.min(shuffled.length, Math.floor(Math.random() * 11) + 10);
      state.trips = shuffled.slice(0, count);
      
      renderTrips(state.trips);
    } catch (error) {
      console.error(error);
      setResultsStatus(error.message || 'Không thể tải chuyến xe.', true);
    }
  };

  // Demo: Kiểm tra chuyến có tồn tại không
  const checkTripAvailability = async (routeId, date) => {
    // Validate date
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);

    if (selectedDateOnly < today) {
      return { available: false, message: 'Ngày đã chọn không hợp lệ. Vui lòng chọn ngày trong tương lai.' };
    }

    try {
      // Kiểm tra từ database thực tế
      const response = await api.request(`/trips?date=${date}`, { skipAuth: true });
      let trips = Array.isArray(response.data) ? response.data : [];
      
      // Lọc trips cho route_id và status active
      trips = trips.filter(trip => 
        Number(trip.route_id) === Number(routeId) && 
        trip.status === 'active' && 
        trip.available_seats > 0
      );

      if (trips.length === 0) {
        return { 
          available: false, 
          message: 'Không có chuyến vào ngày này. Vui lòng chọn ngày khác.' 
        };
      }

      // Lấy giờ khởi hành đầu tiên (hoặc có thể hiển thị tất cả)
      const firstTrip = trips[0];
      const timeStr = firstTrip.departure_time ? firstTrip.departure_time.substring(0, 5) : '--:--';
      const tripCount = trips.length;

      return { 
        available: true, 
        message: `Có ${tripCount} chuyến vào ngày này. Giờ khởi hành: ${timeStr}${tripCount > 1 ? ' và các giờ khác' : ''}`,
        departureTime: timeStr,
        trips: trips // Trả về danh sách trips để có thể sử dụng sau
      };
    } catch (error) {
      console.error('Lỗi khi kiểm tra chuyến:', error);
      // Fallback về logic demo nếu API lỗi
      const dayOfMonth = selectedDate.getDate();
      const hasTrip = dayOfMonth % 2 === 0 || dayOfMonth % 3 === 0;
      
      if (!hasTrip) {
        return { 
          available: false, 
          message: 'Không có chuyến vào ngày này. Vui lòng chọn ngày khác.' 
        };
      }
      
      const hours = ['08:00', '10:30', '14:00', '18:00'];
      const randomHour = hours[dayOfMonth % hours.length];
      
      return { 
        available: true, 
        message: `Có chuyến vào ngày này. Giờ khởi hành: ${randomHour}`,
        departureTime: randomHour
      };
    }
  };

  // Date change handler (defined once to avoid duplicates)
  let dateChangeHandler = null;

  const openSeatModal = (route) => {
    state.selectedRoute = route;
    state.selectedSeats = new Set();
    
    // Nếu có tripId và departureDate từ trip card, sử dụng luôn
    const initialDate = route.departureDate || dateInput.value;
    state.selectedDate = initialDate;
    
    selectedRouteName.textContent = route.name;
    selectedRouteMeta.textContent = route.details || 'Chọn ngày và số ghế mong muốn.';
    seatMap.innerHTML = '';
    tripAvailability.innerHTML = '';
    confirmSeat.disabled = true;

    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    modalDepartureDate.min = today;
    modalDepartureDate.value = initialDate || today;

    // Remove old listener if exists
    if (dateChangeHandler) {
      modalDepartureDate.removeEventListener('change', dateChangeHandler);
    }

    // Create new date change handler
    dateChangeHandler = async () => {
      const selectedDate = modalDepartureDate.value;
      if (!selectedDate) {
        tripAvailability.innerHTML = '';
        confirmSeat.disabled = true;
        seatMap.innerHTML = '';
        return;
      }

      tripAvailability.innerHTML = '<div class="loading">Đang kiểm tra chuyến...</div>';
      const result = await checkTripAvailability(route.id, selectedDate);
      updateTripAvailability(result);
      
      // Load booked seats from database
      if (result.available) {
        // Nếu có trips từ result, lấy trip đầu tiên
        const tripId = result.trips && result.trips.length > 0 ? result.trips[0].id : null;
        const departureTime = result.departureTime || null;
        await loadAndRenderSeats(route.id, selectedDate, tripId, departureTime);
      }
    };

    // Add listener
    modalDepartureDate.addEventListener('change', dateChangeHandler);

    // Check initial date if set - nếu đã có tripId thì không cần check lại
    if (route.tripId && route.departureDate) {
      // Đã có trip cụ thể, hiển thị luôn là có chuyến
      const timeStr = route.departureTime ? route.departureTime.substring(0, 5) : '--:--';
      tripAvailability.innerHTML = `<div class="trip-available">✓ Có chuyến vào ngày này. Giờ khởi hành: ${timeStr}</div>`;
      confirmSeat.disabled = false;
      // Load seats ngay lập tức với tripId và departureTime cụ thể
      loadAndRenderSeats(route.id, route.departureDate, route.tripId, route.departureTime);
    } else if (initialDate) {
      // Chưa có trip cụ thể, check từ database
      checkTripAvailability(route.id, initialDate).then(async result => {
        updateTripAvailability(result);
        if (result.available) {
          // Nếu có trips từ result, lấy trip đầu tiên
          const tripId = result.trips && result.trips.length > 0 ? result.trips[0].id : null;
          const departureTime = result.departureTime || null;
          await loadAndRenderSeats(route.id, initialDate, tripId, departureTime);
        }
      });
    } else {
      // Render empty seat map if no date selected
      seatMap.innerHTML = '<div class="empty-state"><p>Vui lòng chọn ngày khởi hành để xem sơ đồ ghế</p></div>';
    }

    seatModal.classList.remove('hidden');
  };

  // Load booked seats from database and render seat map
  const loadAndRenderSeats = async (routeId, departureDate, tripId = null, departureTime = null) => {
    try {
      // Fetch booked seats from API - cần lọc theo trip cụ thể nếu có tripId
      let url = `/bookings/seats?route_id=${routeId}&departure_date=${departureDate}`;
      if (tripId) {
        url += `&trip_id=${tripId}`;
      }
      
      const response = await api.request(url, { skipAuth: true });
      let bookedSeats = Array.isArray(response.data) ? response.data : [];
      
      // Normalize booked seats: đảm bảo tất cả là string và uppercase
      bookedSeats = bookedSeats.map(seat => String(seat).trim().toUpperCase()).filter(seat => seat.length > 0);
      
      console.log('Booked seats for route', routeId, 'trip', tripId, 'on', departureDate, ':', bookedSeats);
      
      // KHÔNG cập nhật available_seats từ booked seats nữa!
      // Vì:
      // 1. available_seats đã có sẵn trong bảng trips (từ database)
      // 2. Backend đã cập nhật available_seats khi tạo booking
      // 3. Frontend chỉ cần hiển thị giá trị từ database, không cần tính lại
      // 4. Booked seats chỉ dùng để hiển thị ghế nào đã đặt trong seat map
      
      // Nếu cần refresh available_seats, nên reload lại trips từ API thay vì tính từ booked seats
      
      // Generate seat map với layout Tầng dưới và Tầng trên
      const totalSeats = 40; // Tổng số ghế
      
      // Tạo container cho 2 tầng
      seatMap.innerHTML = `
        <div class="seat-floor">
          <h4 class="floor-title">Tầng dưới</h4>
          <div class="floor-seats" id="lowerFloorSeats"></div>
        </div>
        <div class="seat-floor">
          <h4 class="floor-title">Tầng trên</h4>
          <div class="floor-seats" id="upperFloorSeats"></div>
        </div>
      `;
      
      const lowerFloor = document.getElementById('lowerFloorSeats');
      const upperFloor = document.getElementById('upperFloorSeats');
      
      // Layout cho Tầng dưới: A01-A17 (17 ghế)
      const lowerSeats = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17'];
      // Layout cho Tầng trên: B01-B17 (17 ghế) - B02 ở trên cùng, sau đó B04-B17
      const upperSeats = ['B02', 'B01', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B17'];
      
      // Render Tầng dưới
      lowerSeats.forEach((seatNum) => {
        const seat = document.createElement('button');
        seat.type = 'button';
        seat.className = 'seat';
        seat.textContent = seatNum;
        seat.dataset.seatNumber = seatNum;
        
        // Kiểm tra ghế đã được đặt từ database (normalize để so sánh)
        const normalizedBookedSeats = bookedSeats.map(s => String(s).trim().toUpperCase());
        const isBooked = normalizedBookedSeats.includes(seatNum.trim().toUpperCase());
        
        if (isBooked) {
          seat.classList.add('taken');
          seat.disabled = true;
          seat.setAttribute('aria-label', `Ghế ${seatNum} đã được đặt`);
        }
        
        seat.addEventListener('click', () => {
          // Double check: không cho click nếu đã đặt hoặc disabled
          if (seat.classList.contains('taken') || seat.disabled) {
            showToast('Ghế này đã được đặt, vui lòng chọn ghế khác.', 'error');
            return;
          }
          const wasSelected = seat.classList.contains('selected');
          seat.classList.toggle('selected');
          const seatNumber = seat.dataset.seatNumber;
          if (seat.classList.contains('selected')) {
            state.selectedSeats.add(seatNumber);
            // Giảm số ghế trống trong card route
            if (state.selectedRoute) {
              updateTripAvailableSeats(state.selectedRoute.id, state.selectedRoute.tripId, -1);
            }
          } else {
            state.selectedSeats.delete(seatNumber);
            // Tăng lại số ghế trống trong card route
            if (state.selectedRoute) {
              updateTripAvailableSeats(state.selectedRoute.id, state.selectedRoute.tripId, 1);
            }
          }
          updateConfirmButton();
        });
        
        lowerFloor.appendChild(seat);
      });
      
      // Render Tầng trên
      upperSeats.forEach((seatNum) => {
        const seat = document.createElement('button');
        seat.type = 'button';
        seat.className = 'seat';
        seat.textContent = seatNum;
        seat.dataset.seatNumber = seatNum;
        
        // Kiểm tra ghế đã được đặt từ database (normalize để so sánh)
        const normalizedBookedSeats = bookedSeats.map(s => String(s).trim().toUpperCase());
        const isBooked = normalizedBookedSeats.includes(seatNum.trim().toUpperCase());
        
        if (isBooked) {
          seat.classList.add('taken');
          seat.disabled = true;
          seat.setAttribute('aria-label', `Ghế ${seatNum} đã được đặt`);
        }
        
        seat.addEventListener('click', () => {
          // Double check: không cho click nếu đã đặt hoặc disabled
          if (seat.classList.contains('taken') || seat.disabled) {
            showToast('Ghế này đã được đặt, vui lòng chọn ghế khác.', 'error');
            return;
          }
          const wasSelected = seat.classList.contains('selected');
          seat.classList.toggle('selected');
          const seatNumber = seat.dataset.seatNumber;
          if (seat.classList.contains('selected')) {
            state.selectedSeats.add(seatNumber);
            // Giảm số ghế trống trong card route
            if (state.selectedRoute) {
              updateTripAvailableSeats(state.selectedRoute.id, state.selectedRoute.tripId, -1);
            }
          } else {
            state.selectedSeats.delete(seatNumber);
            // Tăng lại số ghế trống trong card route
            if (state.selectedRoute) {
              updateTripAvailableSeats(state.selectedRoute.id, state.selectedRoute.tripId, 1);
            }
          }
          updateConfirmButton();
        });
        
        upperFloor.appendChild(seat);
      });
    } catch (error) {
      console.error('Error loading booked seats:', error);
      // Fallback: render với demo data nếu API lỗi
      renderSeatMapDemo();
    }
  };

  // Fallback: render seat map với demo data
  const renderSeatMapDemo = () => {
    seatMap.innerHTML = `
      <div class="seat-floor">
        <h4 class="floor-title">Tầng dưới</h4>
        <div class="floor-seats" id="lowerFloorSeats"></div>
      </div>
      <div class="seat-floor">
        <h4 class="floor-title">Tầng trên</h4>
        <div class="floor-seats" id="upperFloorSeats"></div>
      </div>
    `;
    
    const lowerFloor = document.getElementById('lowerFloorSeats');
    const upperFloor = document.getElementById('upperFloorSeats');
    
    const lowerSeats = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17'];
    const upperSeats = ['B02', 'B01', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B17'];
    
    lowerSeats.forEach((seatNum, index) => {
      const seat = document.createElement('button');
      seat.type = 'button';
      seat.className = 'seat';
      seat.textContent = seatNum;
      seat.dataset.seatNumber = seatNum;
      
      if (index % 7 === 0 || index % 11 === 0) {
        seat.classList.add('taken');
        seat.disabled = true;
        seat.setAttribute('aria-label', `Ghế ${seatNum} đã được đặt`);
      }
      
      seat.addEventListener('click', () => {
        if (seat.classList.contains('taken') || seat.disabled) {
          showToast('Ghế này đã được đặt, vui lòng chọn ghế khác.', 'error');
          return;
        }
        seat.classList.toggle('selected');
        const seatNumber = seat.dataset.seatNumber;
        if (seat.classList.contains('selected')) {
          state.selectedSeats.add(seatNumber);
          // Giảm số ghế trống trong card route
          if (state.selectedRoute) {
            updateTripAvailableSeats(state.selectedRoute.id, state.selectedRoute.tripId, -1);
          }
        } else {
          state.selectedSeats.delete(seatNumber);
          // Tăng lại số ghế trống trong card route
          if (state.selectedRoute) {
            updateTripAvailableSeats(state.selectedRoute.id, state.selectedRoute.tripId, 1);
          }
        }
        updateConfirmButton();
      });
      
      lowerFloor.appendChild(seat);
    });
    
    upperSeats.forEach((seatNum, index) => {
      const seat = document.createElement('button');
      seat.type = 'button';
      seat.className = 'seat';
      seat.textContent = seatNum;
      seat.dataset.seatNumber = seatNum;
      
      if ((index + 1) % 6 === 0 || (index + 1) % 9 === 0) {
        seat.classList.add('taken');
        seat.disabled = true;
        seat.setAttribute('aria-label', `Ghế ${seatNum} đã được đặt`);
      }
      
      seat.addEventListener('click', () => {
        if (seat.classList.contains('taken') || seat.disabled) {
          showToast('Ghế này đã được đặt, vui lòng chọn ghế khác.', 'error');
          return;
        }
        seat.classList.toggle('selected');
        const seatNumber = seat.dataset.seatNumber;
        if (seat.classList.contains('selected')) {
          state.selectedSeats.add(seatNumber);
        } else {
          state.selectedSeats.delete(seatNumber);
        }
        updateConfirmButton();
      });
      
      upperFloor.appendChild(seat);
    });
  };

  const updateTripAvailability = (result) => {
    if (result.available) {
      tripAvailability.innerHTML = `<div class="trip-available">✓ ${result.message}</div>`;
      state.selectedDate = modalDepartureDate.value;
    } else {
      tripAvailability.innerHTML = `<div class="trip-unavailable">${result.message}</div>`;
      state.selectedDate = null;
      seatMap.innerHTML = '';
    }
    updateConfirmButton();
  };

  const updateConfirmButton = () => {
    const hasDate = state.selectedDate !== null;
    const hasSeats = state.selectedSeats.size > 0;
    confirmSeat.disabled = !(hasDate && hasSeats);
  };

  const closeSeatModal = () => {
    // Khôi phục số ghế trống khi đóng modal (nếu đã chọn ghế nhưng chưa thanh toán)
    // Chỉ cập nhật tạm thời trong UI, không ảnh hưởng database
    if (state.selectedRoute && state.selectedRoute.tripId && state.selectedSeats.size > 0) {
      const seatsCount = state.selectedSeats.size;
      updateTripAvailableSeats(state.selectedRoute.id, state.selectedRoute.tripId, seatsCount);
    }
    
    seatModal.classList.add('hidden');
    state.selectedRoute = null;
    state.selectedSeats.clear();
    state.selectedDate = null;
  };

  const openPaymentModal = () => {
    if (!state.selectedRoute || !state.selectedDate || state.selectedSeats.size === 0) {
      showToast('Vui lòng chọn đầy đủ thông tin.', 'error');
      return;
    }

    const seatNumbers = Array.from(state.selectedSeats);
    const basePrice = state.selectedRoute.price * seatNumbers.length;

    state.bookingData = {
      route: state.selectedRoute,
      date: state.selectedDate,
      seats: seatNumbers,
      basePrice: basePrice,
    };
    
    // Reset validated promotion khi mở modal mới
    validatedPromotion = null;

    updatePaymentSummary();
    
    // Reset promotion code fields when opening payment modal
    const promotionCodeInput = document.getElementById('promotionCode');
    const promoMessage = document.getElementById('promoMessage');
    const promoDiscount = document.getElementById('promoDiscount');
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    if (promotionCodeInput) {
      promotionCodeInput.value = '';
      promotionCodeInput.disabled = false;
      promotionCodeInput.style.backgroundColor = '';
    }
    if (promoMessage) promoMessage.textContent = '';
    if (promoDiscount) {
      promoDiscount.style.display = 'none';
      promoDiscount.textContent = '';
    }
    if (applyPromoBtn) {
      applyPromoBtn.disabled = false;
      applyPromoBtn.textContent = 'Kiểm tra';
      applyPromoBtn.style.backgroundColor = '';
      applyPromoBtn.style.color = '';
    }

    seatModal.classList.add('hidden');
    paymentModal.classList.remove('hidden');
  };

  const updatePaymentSummary = () => {
    if (!state.bookingData) return;
    
    const seatNumbers = state.bookingData.seats;
    // Sử dụng totalPrice nếu đã có (đã áp dụng promotion), nếu không dùng basePrice
    const totalPrice = state.bookingData.totalPrice !== undefined 
      ? state.bookingData.totalPrice 
      : state.bookingData.basePrice;
    const basePrice = state.bookingData.basePrice;
    
    // Hiển thị total price (đã trừ promotion nếu có)
    let summaryText = `${seatNumbers.length} ghế · ${state.bookingData.date} · Tổng: ${api.formatCurrency(totalPrice)}₫`;
    
    // Nếu có promotion đã áp dụng, hiển thị discount
    if (validatedPromotion && state.bookingData.discountAmount > 0) {
      summaryText += ` (Đã giảm ${api.formatCurrency(state.bookingData.discountAmount)}₫)`;
    }
    
    paymentSummary.textContent = summaryText;
    // Hiển thị total price đã trừ promotion
    document.getElementById('vietqrAmount').textContent = `${api.formatCurrency(totalPrice)}₫`;
  };

  const closePaymentModal = () => {
    paymentModal.classList.add('hidden');
    state.bookingData = null;
    validatedPromotion = null; // Reset validated promotion
    
    // Reset promotion code fields
    const promotionCodeInput = document.getElementById('promotionCode');
    const promoMessage = document.getElementById('promoMessage');
    const promoDiscount = document.getElementById('promoDiscount');
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    if (promotionCodeInput) {
      promotionCodeInput.value = '';
      promotionCodeInput.disabled = false;
      promotionCodeInput.style.backgroundColor = '';
    }
    if (promoMessage) promoMessage.textContent = '';
    if (promoDiscount) {
      promoDiscount.style.display = 'none';
      promoDiscount.textContent = '';
    }
    if (applyPromoBtn) {
      applyPromoBtn.disabled = false;
      applyPromoBtn.textContent = 'Kiểm tra';
      applyPromoBtn.style.backgroundColor = '';
      applyPromoBtn.style.color = '';
    }
  };

  confirmSeat.addEventListener('click', () => {
    if (!state.selectedRoute) {
      showToast('Vui lòng chọn tuyến xe trước.', 'error');
      return;
    }

    // Lấy ngày từ modal hoặc từ state
    const selectedDate = modalDepartureDate?.value || state.selectedDate;
    if (!selectedDate) {
      showToast('Vui lòng chọn ngày khởi hành và đảm bảo có chuyến.', 'error');
      return;
    }
    state.selectedDate = selectedDate;

    if (state.selectedSeats.size === 0) {
      showToast('Vui lòng chọn ít nhất một ghế.', 'error');
      return;
    }

    openPaymentModal();
  });

  // Payment tab switching
  paymentTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const method = tab.dataset.method;
      state.currentPaymentMethod = method;

      paymentTabs.forEach(t => t.classList.remove('active'));
      paymentPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      
      // Map method names to panel IDs
      const panelIdMap = {
        'card': 'paymentCard',
        'vietqr': 'paymentVietQR',
        'momo': 'paymentMoMo'
      };
      
      const panelId = panelIdMap[method] || `payment${method.charAt(0).toUpperCase() + method.slice(1)}`;
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.classList.add('active');
      } else {
        console.warn(`Payment panel not found: ${panelId}`);
      }
    });
  });

  // Card number formatting
  const cardNumberInput = document.getElementById('cardNumber');
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s/g, '');
      value = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = value;
    });
  }

  // Card expiry formatting
  const cardExpiryInput = document.getElementById('cardExpiry');
  if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      e.target.value = value;
    });
  }

  // Promotion code validation (chỉ kiểm tra, không áp dụng)
  const applyPromoBtn = document.getElementById('applyPromoBtn');
  const promotionCodeInput = document.getElementById('promotionCode');
  const promoMessage = document.getElementById('promoMessage');
  const promoDiscount = document.getElementById('promoDiscount');
  
  // Lưu thông tin promotion đã validate (chưa áp dụng)
  let validatedPromotion = null;
  
  if (applyPromoBtn && promotionCodeInput) {
    applyPromoBtn.addEventListener('click', async () => {
      const code = promotionCodeInput.value.trim();
      if (!code) {
        if (promoMessage) {
          promoMessage.textContent = 'Vui lòng nhập mã khuyến mãi.';
          promoMessage.style.color = '#dc3545';
        }
        validatedPromotion = null;
        return;
      }

      try {
        applyPromoBtn.disabled = true;
        applyPromoBtn.textContent = 'Đang kiểm tra...';
        
        // Validate promotion code với check usage (nếu có user)
        const response = await api.request('/promotions/validate', {
          method: 'POST',
          json: { code: code, check_usage: true }, // Yêu cầu check usage
          skipAuth: false, // Cần auth để check usage
        });

        if (response.status === 'ok' && response.data) {
          // Lưu thông tin promotion đã validate và ÁP DỤNG discount ngay
          validatedPromotion = {
            code: code,
            promotion: response.data,
            discountPercent: parseFloat(response.data.discount_percent),
            validated: true, // Đánh dấu đã validate và check usage
          };
          
          // Tính toán discount và total price ngay khi kiểm tra
          if (state.bookingData) {
            const discountAmount = Math.round((state.bookingData.basePrice * validatedPromotion.discountPercent) / 100);
            const totalPrice = state.bookingData.basePrice - discountAmount;
            
            // Cập nhật bookingData với total price đã trừ promotion
            state.bookingData.totalPrice = totalPrice;
            state.bookingData.discountAmount = discountAmount;
            state.bookingData.promotionCode = code;
            
            // Cập nhật UI ngay lập tức
            updatePaymentSummary();
            
            if (promoMessage) {
              promoMessage.textContent = `✓ ${response.message} - Đã áp dụng giảm ${validatedPromotion.discountPercent}%`;
              promoMessage.style.color = '#28a745';
            }
            if (promoDiscount) {
              promoDiscount.textContent = `Giảm ${validatedPromotion.discountPercent}% (${api.formatCurrency(discountAmount)}₫) - Tổng còn: ${api.formatCurrency(totalPrice)}₫`;
              promoDiscount.style.display = 'block';
            }
            
            // Disable input và button sau khi apply thành công
            if (promotionCodeInput) {
              promotionCodeInput.disabled = true;
              promotionCodeInput.style.backgroundColor = '#e9ecef';
            }
            applyPromoBtn.textContent = 'Đã áp dụng';
            applyPromoBtn.disabled = true;
            applyPromoBtn.style.backgroundColor = '#28a745';
            applyPromoBtn.style.color = '#fff';
          } else {
            // Nếu chưa có bookingData, chỉ hiển thị thông báo
            if (promoMessage) {
              promoMessage.textContent = `✓ ${response.message} - Mã hợp lệ`;
              promoMessage.style.color = '#28a745';
            }
            applyPromoBtn.disabled = false;
            applyPromoBtn.textContent = 'Kiểm tra';
          }
        } else {
          // Validation failed
          validatedPromotion = null;
          
          if (promoMessage) {
            promoMessage.textContent = response.message || 'Mã khuyến mãi không hợp lệ.';
            promoMessage.style.color = '#dc3545';
          }
          if (promoDiscount) {
            promoDiscount.style.display = 'none';
          }
          
          // Reset button
          applyPromoBtn.disabled = false;
          applyPromoBtn.textContent = 'Kiểm tra';
        }
      } catch (error) {
        console.error('Error validating promotion code:', error);
        validatedPromotion = null;
        
        if (promoMessage) {
          promoMessage.textContent = error.message || 'Không thể kiểm tra mã khuyến mãi.';
          promoMessage.style.color = '#dc3545';
        }
        if (promoDiscount) {
          promoDiscount.style.display = 'none';
        }
        
        // Reset button
        applyPromoBtn.disabled = false;
        applyPromoBtn.textContent = 'Kiểm tra';
      }
    });
  }

  // Helper function để xử lý thanh toán
  const handlePaymentConfirmation = async (paymentMethod) => {
    if (!state.bookingData) {
      showToast('Thông tin đặt vé không hợp lệ.', 'error');
      return;
    }

    // Validate payment method
    let paymentValid = false;
    if (paymentMethod === 'card') {
      const cardNumber = document.getElementById('cardNumber')?.value.trim();
      const cardExpiry = document.getElementById('cardExpiry')?.value.trim();
      const cardCVV = document.getElementById('cardCVV')?.value.trim();
      const cardName = document.getElementById('cardName')?.value.trim();
      
      if (cardNumber && cardExpiry && cardCVV && cardName) {
        paymentValid = true;
      } else {
        showToast('Vui lòng điền đầy đủ thông tin thẻ.', 'error');
        return;
      }
    } else if (paymentMethod === 'vietqr') {
      paymentValid = true; // VietQR doesn't need input
    } else if (paymentMethod === 'momo') {
      const momoPhone = document.getElementById('momoPhone')?.value.trim();
      const momoOTP = document.getElementById('momoOTP')?.value.trim();
      
      if (momoPhone && momoOTP) {
        // Demo: OTP must be 123456
        if (momoOTP === '123456') {
          paymentValid = true;
        } else {
          showToast('Mã OTP không đúng. Mã demo: 123456', 'error');
          return;
        }
      } else {
        showToast('Vui lòng điền đầy đủ thông tin.', 'error');
        return;
      }
    }

    if (!paymentValid) {
      return;
    }

    // Show loading
    const loadingButtons = [
      confirmPayment,
      document.getElementById('confirmVietQRPayment'),
      document.getElementById('confirmMoMoPayment')
    ].filter(btn => btn);
    
    loadingButtons.forEach(btn => {
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.dataset.originalText = originalText;
      btn.textContent = 'Đang xử lý...';
    });

    try {
      // Create booking
      const seatNumbers = state.bookingData.seats;
      const bookingPayload = {
        route_id: state.bookingData.route.id,
        seat_quantity: seatNumbers.length,
        seat_numbers: seatNumbers,
        departure_date: state.bookingData.date,
        status: 'confirmed', // Auto confirm for demo
      };
      
      // QUAN TRỌNG: Luôn gửi trip_id để backend cập nhật đúng trip cụ thể
      // Mỗi trip có số ghế trống riêng (cùng route nhưng khác giờ khởi hành)
      if (state.selectedRoute && state.selectedRoute.tripId) {
        bookingPayload.trip_id = state.selectedRoute.tripId;
      } else {
        console.warn('Booking: tripId not found in selectedRoute, backend may update wrong trip');
      }
      
      // Áp dụng promotion code nếu đã validate thành công
      // Gửi flag promotion_validated để backend biết đã check usage ở frontend
      if (validatedPromotion && validatedPromotion.code && validatedPromotion.validated) {
        bookingPayload.promotion_code = validatedPromotion.code;
        bookingPayload.promotion_validated = true; // Đánh dấu đã validate và check usage ở frontend
        
        // Gửi total_price và discount_amount từ frontend (đã tính sẵn)
        if (state.bookingData.totalPrice !== undefined) {
          bookingPayload.total_price = state.bookingData.totalPrice;
        }
        if (state.bookingData.discountAmount !== undefined) {
          bookingPayload.discount_amount = state.bookingData.discountAmount;
        }
      }
      
      const response = await api.request('/bookings', {
        method: 'POST',
        json: bookingPayload,
      });

      showToast('Thanh toán thành công! Đặt vé hoàn tất.', 'success');
      closePaymentModal();
      closeSeatModal();
      
      // Reload lại danh sách trips để cập nhật số ghế trống
      if (state.selectedDate) {
        const fromLocation = fromLocationInput?.value || '';
        const toLocation = toLocationInput?.value || '';
        await fetchTripsByDate(state.selectedDate, fromLocation, toLocation);
      }
      
      // Reset form sau 2 giây
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error(error);
      if (error.response && error.response.status === 401) {
        handleUnauthorized();
        return;
      }
      
      // Xử lý lỗi ghế đã được đặt (409 Conflict)
      if (error.response && error.response.status === 409) {
        showToast(error.message || 'Một hoặc nhiều ghế đã được đặt. Vui lòng chọn ghế khác.', 'error');
        // Quay lại modal chọn ghế để người dùng chọn lại
        setTimeout(() => {
          paymentModal.classList.add('hidden');
          seatModal.classList.remove('hidden');
          // Reload lại danh sách ghế đã đặt
          if (state.selectedRoute && state.selectedDate) {
            loadAndRenderSeats(state.selectedRoute.id, state.selectedDate);
          }
        }, 1500);
        return;
      }
      
      showToast(error.message || 'Không thể hoàn tất thanh toán, thử lại sau.', 'error');
      
      // Restore buttons
      loadingButtons.forEach(btn => {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || 'Xác nhận thanh toán';
      });
    }
  };

  // Handle payment confirmation from main button
  confirmPayment.addEventListener('click', async () => {
    await handlePaymentConfirmation(state.currentPaymentMethod);
  });

  // Handle VietQR payment confirmation
  const confirmVietQRPayment = document.getElementById('confirmVietQRPayment');
  if (confirmVietQRPayment) {
    confirmVietQRPayment.addEventListener('click', async () => {
      state.currentPaymentMethod = 'vietqr';
      await handlePaymentConfirmation('vietqr');
    });
  }

  // Handle MoMo payment confirmation
  const confirmMoMoPayment = document.getElementById('confirmMoMoPayment');
  if (confirmMoMoPayment) {
    confirmMoMoPayment.addEventListener('click', async () => {
      state.currentPaymentMethod = 'momo';
      // Validate MoMo inputs first
      const momoPhone = document.getElementById('momoPhone')?.value.trim();
      const momoOTP = document.getElementById('momoOTP')?.value.trim();
      
      if (!momoPhone || !momoOTP) {
        showToast('Vui lòng điền đầy đủ số điện thoại và mã OTP.', 'error');
        return;
      }
      
      if (momoOTP !== '123456') {
        showToast('Mã OTP không đúng. Mã demo: 123456', 'error');
        return;
      }
      
      await handlePaymentConfirmation('momo');
    });
  }

  backToSeat.addEventListener('click', () => {
    paymentModal.classList.add('hidden');
    seatModal.classList.remove('hidden');
  });

  cancelSeat.addEventListener('click', closeSeatModal);
  closeSeatModalBtn.addEventListener('click', closeSeatModal);
  closePaymentModalBtn.addEventListener('click', closePaymentModal);

  // Handle search button click
  const handleSearch = async () => {
    const selectedDate = dateInput.value;
    if (!selectedDate) {
      showToast('Vui lòng chọn ngày khởi hành.', 'error');
      dateInput.focus();
      return;
    }
    
    const fromLocation = fromLocationInput ? fromLocationInput.value.trim() : '';
    const toLocation = toLocationInput ? toLocationInput.value.trim() : '';
    
    
    await fetchTripsByDate(selectedDate, fromLocation, toLocation);
  };

  // Handle search button
  if (searchTripsBtn) {
    searchTripsBtn.addEventListener('click', handleSearch);
  }

  // Handle Enter key on inputs
  [fromLocationInput, toLocationInput, dateInput].forEach(input => {
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSearch();
        }
      });
    }
  });

  // Handle date change - auto load trips (optional, can be removed if only want manual search)
  dateInput.addEventListener('change', async () => {
    const selectedDate = dateInput.value;
    if (!selectedDate) {
      results.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚌</div>
          <p class="empty-text">Vui lòng chọn ngày khởi hành để xem các chuyến có sẵn</p>
        </div>
      `;
      resultsTitle.textContent = 'Chọn ngày để xem chuyến';
      resultsLegend.style.display = 'none';
      return;
    }
    const fromLocation = fromLocationInput ? fromLocationInput.value.trim() : '';
    const toLocation = toLocationInput ? toLocationInput.value.trim() : '';
    await fetchTripsByDate(selectedDate, fromLocation, toLocation);
  });


  // Handle seats increment/decrement
  decreaseSeatsBtn.addEventListener('click', () => {
    const current = Number(seatsInput.value) || 1;
    if (current > 1) {
      seatsInput.value = current - 1;
    }
  });

  increaseSeatsBtn.addEventListener('click', () => {
    const current = Number(seatsInput.value) || 1;
    seatsInput.value = current + 1;
  });

  // Handle route selection from results
  results.addEventListener('click', (event) => {
    const button = event.target.closest('.select-route');
    if (!button || button.disabled) return;
    
    const routeId = Number(button.dataset.routeId);
    const tripId = button.dataset.tripId ? Number(button.dataset.tripId) : null;
    const trip = state.trips.find((t) => Number(t.route_id) === routeId && (!tripId || Number(t.id) === tripId));
    
    if (!trip) {
      // Fallback: tạo route data cơ bản nếu không tìm thấy trip
      const routeData = {
        id: routeId,
        name: 'Tuyến xe',
        details: '',
        price: 0,
        departureDate: dateInput.value, // Sử dụng ngày từ form
      };
      openSeatModal(routeData);
      return;
    }
    
    // Tạo route object từ trip với thông tin đầy đủ
    const routeData = {
      id: trip.route_id,
      tripId: tripId || trip.id, // Lưu tripId để có thể update available_seats sau
      name: trip.route_name,
      details: trip.route_details,
      price: trip.route_price,
      tripId: trip.id, // Lưu trip ID để biết chính xác trip nào
      departureDate: trip.departure_date || dateInput.value, // Lưu ngày khởi hành
      departureTime: trip.departure_time, // Lưu giờ khởi hành
    };
    
    openSeatModal(routeData);
  });

  // Set min date to today (only if dateInput exists and hasn't been set from URL)
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    
    // Only set default date if no date was provided in URL
    const urlParamsCheck = new URLSearchParams(window.location.search);
    const dateFromUrl = urlParamsCheck.get('date');
    if (!dateFromUrl && !dateInput.value) {
      // No date in URL and no value set, keep it empty or set to today based on your preference
      // dateInput.value = today; // Uncomment if you want to default to today
    }
  }

});
