'use strict';

(function attachGreenBusApi(global) {
    if (global.GreenBusAPI) {
        return;
    }

    const resolveApiBaseUrl = () => {
        try {
            const { origin, pathname } = window.location;
            const [projectRoot] = pathname.split('/frontend/');
            return `${origin}${projectRoot}/backend/public`;
        } catch (error) {
            console.warn('Không thể xác định API base URL, fallback localhost.', error);
            return `${window.location.origin}/backend/public`;
        }
    };

    const API_BASE_URL = resolveApiBaseUrl();

    const formatUrl = (path) => {
        if (!path) {
            return API_BASE_URL;
        }

        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        if (!path.startsWith('/')) {
            return `${API_BASE_URL}/${path}`;
        }

        return `${API_BASE_URL}${path}`;
    };

    const safeJsonParse = (value) => {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    };

    const getAuthToken = () => {
        try {
            return localStorage.getItem('authToken') || '';
        } catch (error) {
            console.warn('Không đọc được authToken từ localStorage.', error);
            return '';
        }
    };

    const getCurrentUser = () => {
        try {
            const raw = localStorage.getItem('currentUser');
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('Không đọc được currentUser từ localStorage.', error);
            return null;
        }
    };

    const request = async (path, options = {}) => {
        const url = formatUrl(path);
        const headers = Object.assign({}, options.headers || {});
        const token = getAuthToken();

        if (options.json !== undefined) {
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        }

        if (!options.skipAuth && token && !headers.Authorization) {
            headers.Authorization = `Bearer ${token}`;
        }

        const fetchOptions = {
            method: options.method || 'GET',
            headers,
            body: options.body,
        };

        if (options.json !== undefined) {
            fetchOptions.body = JSON.stringify(options.json);
        }

        if (options.signal) {
            fetchOptions.signal = options.signal;
        }

        const response = await fetch(url, fetchOptions);
        const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
        let payload;

        if (contentType.includes('application/json')) {
            payload = await response.json();
        } else {
            payload = await response.text();
        }

        if (!response.ok) {
            const message = payload && payload.message
                ? payload.message
                : (typeof payload === 'string' && payload.trim().length
                    ? payload
                    : 'Yêu cầu tới máy chủ thất bại.');

            const error = new Error(message);
            error.response = response;
            error.payload = payload;
            throw error;
        }

        return payload;
    };

    const requireAuth = (options = {}) => {
        const { roles = [], redirectTo } = options;
        const user = getCurrentUser();

        if (!user) {
            if (redirectTo) {
                window.location.href = redirectTo;
            }
            throw new Error('Bạn cần đăng nhập để tiếp tục.');
        }

        if (roles.length && !roles.includes(user.role)) {
            if (redirectTo) {
                window.location.href = redirectTo;
            }
            throw new Error('Tài khoản không có quyền truy cập trang này.');
        }

        return user;
    };

    const formatCurrency = (value) => {
        const number = Number(value) || 0;
        return new Intl.NumberFormat('vi-VN').format(number);
    };

    global.GreenBusAPI = {
        baseUrl: API_BASE_URL,
        request,
        getAuthToken,
        getCurrentUser,
        requireAuth,
        formatCurrency,
        safeJsonParse,
    };
})(window);


