/**
 * Backend Geocoding Service
 * Xử lý reverse geocoding phía server với caching và rate limiting
 */

const axios = require('axios');

// In-memory cache
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 giờ

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 giây để tôn trọng Nominatim rate limit

/**
 * Delay để tôn trọng rate limit
 */
async function respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    lastRequestTime = Date.now();
}

/**
 * Reverse geocode - Chuyển tọa độ thành địa chỉ
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>}
 */
async function reverseGeocode(lat, lng) {
    // Validate
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return 'Địa chỉ không xác định';
    }

    // Cache key
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`Geocode cache hit: ${cacheKey}`);
        return cached.address;
    }

    try {
        // Rate limiting
        await respectRateLimit();

        const url = `https://nominatim.openstreetmap.org/reverse`;
        const response = await axios.get(url, {
            params: {
                format: 'json',
                lat: lat,
                lon: lng,
                zoom: 18,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'QuanLyDoiXeGiaoHang/1.0',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        const data = response.data;
        let address = '';

        if (data.address) {
            const parts = [];
            
            if (data.address.house_number) parts.push(data.address.house_number);
            if (data.address.road) parts.push(data.address.road);
            if (data.address.suburb || data.address.quarter) {
                parts.push(data.address.suburb || data.address.quarter);
            }
            if (data.address.city_district || data.address.district) {
                parts.push(data.address.city_district || data.address.district);
            }
            if (data.address.city || data.address.province || data.address.state) {
                parts.push(data.address.city || data.address.province || data.address.state);
            }
            if (data.address.country) {
                parts.push(data.address.country);
            }
            
            address = parts.join(', ');
        }

        if (!address && data.display_name) {
            address = data.display_name;
        }

        if (!address) {
            address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }

        // Cache result
        cache.set(cacheKey, {
            address,
            timestamp: Date.now()
        });

        console.log(`Geocoded: [${lat}, ${lng}] -> ${address}`);
        return address;

    } catch (error) {
        console.error('Reverse geocoding error:', error.message);
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

/**
 * Forward geocode - Chuyển địa chỉ thành tọa độ
 * @param {string} address
 * @returns {Promise<Array|null>}
 */
async function forwardGeocode(address) {
    if (!address || address.trim().length < 3) {
        return null;
    }

    try {
        await respectRateLimit();

        const url = `https://nominatim.openstreetmap.org/search`;
        const response = await axios.get(url, {
            params: {
                format: 'json',
                q: address,
                limit: 1
            },
            headers: {
                'User-Agent': 'QuanLyDoiXeGiaoHang/1.0',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        const data = response.data;

        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }

        return null;

    } catch (error) {
        console.error('Forward geocoding error:', error.message);
        return null;
    }
}

/**
 * Batch reverse geocoding
 * @param {Array} coordsArray - [[lat1,lng1], [lat2,lng2], ...]
 * @returns {Promise<Array>}
 */
async function batchReverseGeocode(coordsArray) {
    const results = [];

    for (const coords of coordsArray) {
        if (Array.isArray(coords) && coords.length === 2) {
            const address = await reverseGeocode(coords[0], coords[1]);
            results.push(address);
        } else if (coords && coords.lat && coords.lng) {
            const address = await reverseGeocode(coords.lat, coords.lng);
            results.push(address);
        } else {
            results.push('Địa chỉ không xác định');
        }
    }

    return results;
}

/**
 * Lấy thông tin chi tiết địa chỉ
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>}
 */
async function getAddressDetails(lat, lng) {
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
        return null;
    }

    const cacheKey = `details_${lat.toFixed(5)},${lng.toFixed(5)}`;

    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.details;
    }

    try {
        await respectRateLimit();

        const url = `https://nominatim.openstreetmap.org/reverse`;
        const response = await axios.get(url, {
            params: {
                format: 'json',
                lat: lat,
                lon: lng,
                zoom: 18,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'QuanLyDoiXeGiaoHang/1.0',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        const data = response.data;

        const details = {
            fullAddress: data.display_name || '',
            street: data.address?.road || '',
            district: data.address?.city_district || data.address?.district || '',
            city: data.address?.city || data.address?.province || '',
            country: data.address?.country || '',
            postcode: data.address?.postcode || '',
            coordinates: [lat, lng]
        };

        cache.set(cacheKey, {
            details,
            timestamp: Date.now()
        });

        return details;

    } catch (error) {
        console.error('Get address details error:', error.message);
        return null;
    }
}

/**
 * Clear cache
 */
function clearCache() {
    cache.clear();
    console.log('Geocoding cache cleared');
}

/**
 * Get cache stats
 */
function getCacheStats() {
    return {
        size: cache.size,
        entries: Array.from(cache.keys())
    };
}

module.exports = {
    reverseGeocode,
    forwardGeocode,
    batchReverseGeocode,
    getAddressDetails,
    clearCache,
    getCacheStats
};
