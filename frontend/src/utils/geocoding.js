/**
 * Geocoding utilities - Chuyển đổi giữa tọa độ và địa chỉ
 * Sử dụng Nominatim API (OpenStreetMap) - MIỄN PHÍ
 */

// Cache để tránh gọi API nhiều lần cho cùng tọa độ
const geocodeCache = new Map();
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 giờ

/**
 * Chuyển tọa độ thành địa chỉ (Reverse Geocoding)
 * @param {Array} coords - [latitude, longitude]
 * @returns {Promise<string>} - Địa chỉ đầy đủ
 */
export const reverseGeocode = async (coords) => {
    if (!coords || coords.length !== 2) {
        return 'Địa chỉ không xác định';
    }

    const [lat, lng] = coords;
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return 'Tọa độ không hợp lệ';
    }

    // Tạo cache key (làm tròn đến 5 số thập phân để tránh cache miss vô ích)
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    
    // Check cache
    const cached = geocodeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
        return cached.address;
    }

    try {
        // Sử dụng Nominatim API (OpenStreetMap) - MIỄN PHÍ
        // Lưu ý: Có rate limit 1 request/giây
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'QuanLyDoiXeGiaoHang/1.0' // Nominatim yêu cầu User-Agent
            }
        });

        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Xây dựng địa chỉ từ response
        let address = '';
        if (data.address) {
            const parts = [];
            
            // Số nhà + Đường
            if (data.address.house_number) parts.push(data.address.house_number);
            if (data.address.road) parts.push(data.address.road);
            
            // Phường/Xã
            if (data.address.suburb) {
                parts.push(data.address.suburb);
            } else if (data.address.quarter) {
                parts.push(data.address.quarter);
            }
            
            // Quận/Huyện
            if (data.address.city_district || data.address.district) {
                parts.push(data.address.city_district || data.address.district);
            }
            
            // Thành phố/Tỉnh
            if (data.address.city) {
                parts.push(data.address.city);
            } else if (data.address.province || data.address.state) {
                parts.push(data.address.province || data.address.state);
            }
            
            // Quốc gia
            if (data.address.country) {
                parts.push(data.address.country);
            }
            
            address = parts.join(', ');
        }
        
        // Fallback nếu không có địa chỉ chi tiết
        if (!address && data.display_name) {
            address = data.display_name;
        }
        
        if (!address) {
            address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }

        // Lưu vào cache
        geocodeCache.set(cacheKey, {
            address,
            timestamp: Date.now()
        });

        return address;

    } catch (error) {
        console.error('Reverse geocoding error:', error);
        
        // Fallback: trả về tọa độ nếu không lấy được địa chỉ
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
};

/**
 * Chuyển địa chỉ thành tọa độ (Forward Geocoding)
 * @param {string} address - Địa chỉ cần tìm
 * @returns {Promise<Array|null>} - [latitude, longitude] hoặc null
 */
export const forwardGeocode = async (address) => {
    if (!address || address.trim().length < 3) {
        return null;
    }

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'QuanLyDoiXeGiaoHang/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
        
        return null;

    } catch (error) {
        console.error('Forward geocoding error:', error);
        return null;
    }
};

/**
 * Lấy địa chỉ ngắn gọn (bỏ quốc gia, tỉnh nếu quá dài)
 * @param {Array} coords - [latitude, longitude]
 * @returns {Promise<string>} - Địa chỉ rút gọn
 */
export const getShortAddress = async (coords) => {
    const fullAddress = await reverseGeocode(coords);
    
    if (!fullAddress || fullAddress.includes('không xác định') || fullAddress.includes('không hợp lệ')) {
        return fullAddress;
    }
    
    // Tách địa chỉ và chỉ lấy 3 phần đầu (số nhà, đường, phường/quận)
    const parts = fullAddress.split(',').map(p => p.trim());
    
    if (parts.length <= 3) {
        return fullAddress;
    }
    
    return parts.slice(0, 3).join(', ');
};

/**
 * Batch reverse geocoding với rate limiting
 * @param {Array} coordsArray - Mảng các tọa độ [[lat1,lng1], [lat2,lng2], ...]
 * @param {number} delay - Thời gian chờ giữa các request (ms), default 1000ms
 * @returns {Promise<Array>} - Mảng địa chỉ tương ứng
 */
export const batchReverseGeocode = async (coordsArray, delay = 1100) => {
    const results = [];
    
    for (const coords of coordsArray) {
        const address = await reverseGeocode(coords);
        results.push(address);
        
        // Delay để tôn trọng rate limit của Nominatim (1 req/s)
        if (coordsArray.indexOf(coords) < coordsArray.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    return results;
};

/**
 * Clear geocode cache (dùng khi cần refresh)
 */
export const clearGeocodeCache = () => {
    geocodeCache.clear();
};

/**
 * Lấy thông tin chi tiết về địa chỉ
 * @param {Array} coords - [latitude, longitude]
 * @returns {Promise<Object>} - Chi tiết địa chỉ
 */
export const getAddressDetails = async (coords) => {
    if (!coords || coords.length !== 2) {
        return null;
    }

    const [lat, lng] = coords;
    const cacheKey = `details_${lat.toFixed(5)},${lng.toFixed(5)}`;
    
    const cached = geocodeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
        return cached.details;
    }

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'QuanLyDoiXeGiaoHang/1.0'
            }
        });

        const data = await response.json();
        
        const details = {
            fullAddress: data.display_name || '',
            street: data.address?.road || '',
            district: data.address?.city_district || data.address?.district || '',
            city: data.address?.city || data.address?.province || '',
            country: data.address?.country || '',
            postcode: data.address?.postcode || '',
            coordinates: [lat, lng]
        };

        geocodeCache.set(cacheKey, {
            details,
            timestamp: Date.now()
        });

        return details;

    } catch (error) {
        console.error('Get address details error:', error);
        return null;
    }
};

export default {
    reverseGeocode,
    forwardGeocode,
    getShortAddress,
    batchReverseGeocode,
    clearGeocodeCache,
    getAddressDetails
};
