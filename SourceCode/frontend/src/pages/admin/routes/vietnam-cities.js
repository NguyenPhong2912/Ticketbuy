/**
 * Danh sách các thành phố/tỉnh thành Việt Nam với tọa độ địa lý
 * Sử dụng để tính khoảng cách và thời gian di chuyển
 */

const VIETNAM_CITIES = [
    { name: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
    { name: 'TP. Hồ Chí Minh', lat: 10.8231, lng: 106.6297 },
    { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
    { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881 },
    { name: 'Cần Thơ', lat: 10.0452, lng: 105.7469 },
    { name: 'An Giang', lat: 10.5216, lng: 105.1259 },
    { name: 'Bà Rịa - Vũng Tàu', lat: 10.5417, lng: 107.2420 },
    { name: 'Bạc Liêu', lat: 9.2942, lng: 105.7278 },
    { name: 'Bắc Giang', lat: 21.2731, lng: 106.1946 },
    { name: 'Bắc Kạn', lat: 22.1470, lng: 105.8348 },
    { name: 'Bắc Ninh', lat: 21.1861, lng: 106.0763 },
    { name: 'Bến Tre', lat: 10.2414, lng: 106.3759 },
    { name: 'Bình Định', lat: 13.7750, lng: 109.2233 },
    { name: 'Bình Dương', lat: 11.3254, lng: 106.4770 },
    { name: 'Bình Phước', lat: 11.6471, lng: 106.6056 },
    { name: 'Bình Thuận', lat: 10.9289, lng: 108.1021 },
    { name: 'Cà Mau', lat: 9.1769, lng: 105.1520 },
    { name: 'Cao Bằng', lat: 22.6657, lng: 106.2570 },
    { name: 'Đắk Lắk', lat: 12.7104, lng: 108.2378 },
    { name: 'Đắk Nông', lat: 12.0046, lng: 107.6871 },
    { name: 'Điện Biên', lat: 21.4064, lng: 103.0082 },
    { name: 'Đồng Nai', lat: 10.9574, lng: 106.8429 },
    { name: 'Đồng Tháp', lat: 10.4930, lng: 105.6881 },
    { name: 'Gia Lai', lat: 13.9837, lng: 108.0005 },
    { name: 'Hà Giang', lat: 22.8233, lng: 104.9833 },
    { name: 'Hà Nam', lat: 20.5433, lng: 105.9229 },
    { name: 'Hà Tĩnh', lat: 18.3428, lng: 105.9058 },
    { name: 'Hải Dương', lat: 20.9373, lng: 106.3145 },
    { name: 'Hậu Giang', lat: 9.7849, lng: 105.4706 },
    { name: 'Hòa Bình', lat: 20.8136, lng: 105.3383 },
    { name: 'Hưng Yên', lat: 20.6464, lng: 106.0512 },
    { name: 'Khánh Hòa', lat: 12.2388, lng: 109.1967 },
    { name: 'Kiên Giang', lat: 9.9580, lng: 105.1323 },
    { name: 'Kon Tum', lat: 14.3545, lng: 108.0076 },
    { name: 'Lai Châu', lat: 22.3864, lng: 103.4702 },
    { name: 'Lâm Đồng', lat: 11.9404, lng: 108.4583 },
    { name: 'Lạng Sơn', lat: 21.8537, lng: 106.7612 },
    { name: 'Lào Cai', lat: 22.4856, lng: 103.9706 },
    { name: 'Long An', lat: 10.6599, lng: 106.2019 },
    { name: 'Nam Định', lat: 20.4201, lng: 106.1683 },
    { name: 'Nghệ An', lat: 18.6796, lng: 105.6813 },
    { name: 'Ninh Bình', lat: 20.2506, lng: 105.9744 },
    { name: 'Ninh Thuận', lat: 11.5640, lng: 108.9885 },
    { name: 'Phú Thọ', lat: 21.3087, lng: 105.3131 },
    { name: 'Phú Yên', lat: 13.0884, lng: 109.0929 },
    { name: 'Quảng Bình', lat: 17.4680, lng: 106.6227 },
    { name: 'Quảng Nam', lat: 15.8801, lng: 108.3380 },
    { name: 'Quảng Ngãi', lat: 15.1167, lng: 108.8000 },
    { name: 'Quảng Ninh', lat: 21.0064, lng: 107.2925 },
    { name: 'Quảng Trị', lat: 16.7500, lng: 107.2000 },
    { name: 'Sóc Trăng', lat: 9.6025, lng: 105.9739 },
    { name: 'Sơn La', lat: 21.3257, lng: 103.9160 },
    { name: 'Tây Ninh', lat: 11.3131, lng: 106.0963 },
    { name: 'Thái Bình', lat: 20.4465, lng: 106.3366 },
    { name: 'Thái Nguyên', lat: 21.5942, lng: 105.8481 },
    { name: 'Thanh Hóa', lat: 19.8076, lng: 105.7767 },
    { name: 'Thừa Thiên Huế', lat: 16.4637, lng: 107.5909 },
    { name: 'Tiền Giang', lat: 10.3600, lng: 106.3600 },
    { name: 'Trà Vinh', lat: 9.9347, lng: 106.3453 },
    { name: 'Tuyên Quang', lat: 21.8180, lng: 105.2119 },
    { name: 'Vĩnh Long', lat: 10.2534, lng: 105.9722 },
    { name: 'Vĩnh Phúc', lat: 21.3087, lng: 105.5974 },
    { name: 'Yên Bái', lat: 21.7051, lng: 104.8720 },
];

/**
 * Tính khoảng cách giữa 2 điểm (km) sử dụng công thức Haversine
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

/**
 * Tính thời gian di chuyển (giờ) dựa trên khoảng cách
 * Tốc độ trung bình: 60-70 km/h cho xe bus đường dài
 */
function calculateDuration(distanceKm) {
    const averageSpeed = 65; // km/h
    const hours = distanceKm / averageSpeed;
    return Math.round(hours * 10) / 10; // Làm tròn 1 chữ số thập phân
}

/**
 * Tìm thành phố theo tên
 */
function findCity(cityName) {
    return VIETNAM_CITIES.find(city => 
        city.name.toLowerCase().includes(cityName.toLowerCase()) ||
        cityName.toLowerCase().includes(city.name.toLowerCase())
    );
}

/**
 * Tạo tên tuyến từ điểm đi và điểm đến
 */
function generateRouteName(fromCity, toCity) {
    if (!fromCity || !toCity) return '';
    return `${fromCity.name} → ${toCity.name}`;
}

/**
 * Tạo chi tiết tuyến (khoảng cách và thời gian)
 */
function generateRouteDetails(distanceKm, durationHours) {
    if (!distanceKm || !durationHours) return '';
    return `${distanceKm} km · ${durationHours} giờ`;
}

