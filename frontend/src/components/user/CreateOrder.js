import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/ModernDashboard.css';
import '../../utils/mapIcons';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';
const HANOI_CENTER = [21.0285, 105.8542];

// Component để chọn vị trí trên bản đồ
function LocationPicker({ position, onPositionChange, onAddressFound, onGeocodingStart, onGeocodingEnd }) {
    useMapEvents({
        click(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            onPositionChange([lat, lng]);
            
            // Gọi API reverse geocode để lấy địa chỉ
            if (onAddressFound) {
                if (onGeocodingStart) onGeocodingStart();
                
                fetch(
                    `https://nominatim.openstreetmap.org/reverse?` +
                    `format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
                )
                .then(res => res.json())
                .then(data => {
                    const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    console.log('📍 Reverse geocoded:', address);
                    onAddressFound(address);
                })
                .catch(err => {
                    console.error('Reverse geocode error:', err);
                    onAddressFound(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                })
                .finally(() => {
                    if (onGeocodingEnd) onGeocodingEnd();
                });
            }
        }
    });
    return position ? <Marker position={position} /> : null;
}

function CreateOrder() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const [formData, setFormData] = useState({
        pickupAddress: '',
        deliveryAddress: '',
        pickup: null,  // [lat, lng]
        delivery: null,  // [lat, lng]
        receiverPhone: '',  // Số điện thoại người nhận
        weight: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPickupMap, setShowPickupMap] = useState(false);
    const [showDeliveryMap, setShowDeliveryMap] = useState(false);
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [deliverySuggestions, setDeliverySuggestions] = useState([]);
    const [pickupSearching, setPickupSearching] = useState(false);
    const [deliverySearching, setDeliverySearching] = useState(false);
    const [pickupGeocoding, setPickupGeocoding] = useState(false);
    const [deliveryGeocoding, setDeliveryGeocoding] = useState(false);

    // Debounce timer
    useEffect(() => {
        if (formData.pickupAddress.length > 3) {
            setPickupSearching(true);
            const timer = setTimeout(() => {
                searchAddress(formData.pickupAddress, 'pickup');
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setPickupSuggestions([]);
        }
    }, [formData.pickupAddress]);

    useEffect(() => {
        if (formData.deliveryAddress.length > 3) {
            setDeliverySearching(true);
            const timer = setTimeout(() => {
                searchAddress(formData.deliveryAddress, 'delivery');
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setDeliverySuggestions([]);
        }
    }, [formData.deliveryAddress]);

    // Tìm kiếm địa chỉ với Nominatim API
    const searchAddress = async (query, type) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `format=json&q=${encodeURIComponent(query)}, Hanoi, Vietnam&limit=5`
            );
            const data = await response.json();
            
            if (type === 'pickup') {
                setPickupSuggestions(data);
                setPickupSearching(false);
            } else {
                setDeliverySuggestions(data);
                setDeliverySearching(false);
            }
        } catch (error) {
            console.error('Error searching address:', error);
            if (type === 'pickup') {
                setPickupSearching(false);
            } else {
                setDeliverySearching(false);
            }
        }
    };

    // Reverse geocode: chuyển tọa độ thành địa chỉ
    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?` +
                `format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        } catch (error) {
            console.error('Error reverse geocoding:', error);
            return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
    };

    // Chọn địa chỉ từ gợi ý
    const selectSuggestion = (suggestion, type) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);
        
        if (type === 'pickup') {
            setFormData(prev => ({
                ...prev,
                pickupAddress: suggestion.display_name,
                pickup: [lat, lng]
            }));
            setPickupSuggestions([]);
        } else {
            setFormData(prev => ({
                ...prev,
                deliveryAddress: suggestion.display_name,
                delivery: [lat, lng]
            }));
            setDeliverySuggestions([]);
        }
    };

    // Tìm hoặc tạo user theo số điện thoại
    const findOrCreateReceiverByPhone = async (phone) => {
        try {
            // Tìm user theo số điện thoại
            const response = await fetch(`${API_BASE_URL}/api/users`);
            if (!response.ok) throw new Error('Không thể lấy danh sách người dùng');
            
            const users = await response.json();
            const existingUser = users.find(u => u.phone === phone);
            
            if (existingUser) {
                console.log('Đã tìm thấy user:', existingUser);
                return existingUser.id;
            }
            
            // Nếu không tìm thấy, tạo guest user mới
            console.log('Tạo guest user mới cho sđt:', phone);
            
            // Tạo ID mới (lấy ID lớn nhất hiện tại + 1)
            const maxId = users.reduce((max, u) => Math.max(max, u.id || 0), 0);
            const newId = maxId + 1;
            
            const createResponse = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: newId,
                    username: `guest_${phone}`,
                    name: `Guest ${phone.slice(-4)}`,
                    email: `guest_${phone}@temp.com`,
                    phone: phone,
                    password: 'temp123',
                    role: 'user'
                })
            });
            
            if (!createResponse.ok) throw new Error('Không thể tạo người dùng mới');
            
            const newUser = await createResponse.json();
            console.log('Đã tạo guest user:', newUser);
            return newUser.id;
        } catch (error) {
            console.error('Lỗi khi tìm/tạo user:', error);
            throw error;
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.receiverPhone || !formData.pickupAddress || !formData.deliveryAddress || !formData.weight) {
            setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
            return;
        }

        // Validate số điện thoại
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(formData.receiverPhone)) {
            setMessage({ type: 'error', text: 'Số điện thoại không hợp lệ (10-11 số)' });
            return;
        }

        if (!formData.pickup || !formData.delivery) {
            setMessage({ type: 'error', text: 'Vui lòng chọn vị trí trên bản đồ hoặc chọn từ gợi ý' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Tìm hoặc tạo receiver
            const receiverId = await findOrCreateReceiverByPhone(formData.receiverPhone);
            
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    senderId: currentUser.id,
                    receiverId: receiverId,
                    pickupAddress: formData.pickupAddress,
                    deliveryAddress: formData.deliveryAddress,
                    pickup: formData.pickup,
                    delivery: formData.delivery,
                    weight: parseFloat(formData.weight),
                    notes: formData.notes,
                    status: 'pending'
                })
            });

            if (response.ok) {
                const result = await response.json();
                setMessage({ type: 'success', text: `Tạo đơn hàng thành công! Mã đơn hàng: ${result.id}` });
                setFormData({
                    pickupAddress: '',
                    deliveryAddress: '',
                    pickup: null,
                    delivery: null,
                    receiverPhone: '',
                    weight: '',
                    notes: ''
                });
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Không thể kết nối đến server' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="main-content">
            <div className="top-header">
                <div className="header-left">
                    <h1>Tạo đơn hàng mới</h1>
                    <p>Điền thông tin để tạo đơn hàng giao hàng</p>
                </div>
            </div>

            <div className="content-body">
                <div className="form-container" style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    background: 'white',
                    padding: '30px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    {message.text && (
                        <div style={{
                            padding: '12px 20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
                            color: message.type === 'success' ? '#155724' : '#721c24',
                            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                        }}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Địa chỉ lấy hàng */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#333'
                            }}>
                                📍 Địa chỉ lấy hàng <span style={{ color: 'red' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    name="pickupAddress"
                                    value={formData.pickupAddress}
                                    onChange={handleChange}
                                    placeholder="Nhập địa chỉ lấy hàng để tìm kiếm..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (formData.pickupAddress && formData.pickupAddress.length >= 3) {
                                                searchAddress(formData.pickupAddress, 'pickup');
                                            }
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        paddingRight: '84px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    gap: '4px'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (formData.pickupAddress && formData.pickupAddress.length >= 3) {
                                                setPickupSearching(true);
                                                searchAddress(formData.pickupAddress, 'pickup');
                                            }
                                        }}
                                        disabled={!formData.pickupAddress || formData.pickupAddress.length < 3}
                                        title="Tìm kiếm địa chỉ"
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            padding: '0',
                                            background: formData.pickupAddress && formData.pickupAddress.length >= 3 ? '#10b981' : '#e5e7eb',
                                            color: formData.pickupAddress && formData.pickupAddress.length >= 3 ? 'white' : '#9ca3af',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: formData.pickupAddress && formData.pickupAddress.length >= 3 ? 'pointer' : 'not-allowed',
                                            fontSize: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        🔍
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowPickupMap(!showPickupMap)}
                                        title="Chọn trên bản đồ"
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            padding: '0',
                                            background: showPickupMap ? '#3b82f6' : '#e5e7eb',
                                            color: showPickupMap ? 'white' : '#6b7280',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        📍
                                    </button>
                                </div>
                                
                                {/* Gợi ý địa chỉ */}
                                {pickupSearching && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'white',
                                        border: '1px solid #ddd',
                                        borderTop: 'none',
                                        borderRadius: '0 0 8px 8px',
                                        padding: '8px',
                                        zIndex: 10
                                    }}>
                                        ⏳ Đang tìm kiếm...
                                    </div>
                                )}
                                {!pickupSearching && pickupSuggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'white',
                                        border: '1px solid #ddd',
                                        borderTop: 'none',
                                        borderRadius: '0 0 8px 8px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 10,
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}>
                                        {pickupSuggestions.map((suggestion, index) => (
                                            <div
                                                key={index}
                                                onClick={() => selectSuggestion(suggestion, 'pickup')}
                                                style={{
                                                    padding: '10px',
                                                    cursor: 'pointer',
                                                    borderBottom: index < pickupSuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                                                    fontSize: '13px'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                                                onMouseLeave={(e) => e.target.style.background = 'white'}
                                            >
                                                📍 {suggestion.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Hiển thị tọa độ và địa chỉ đã chọn */}
                            {formData.pickup && (
                                <div style={{
                                    marginTop: '8px',
                                    padding: '10px 12px',
                                    background: '#e0f2fe',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#0369a1',
                                    border: '1px solid #bae6fd'
                                }}>
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                        {pickupGeocoding ? '⏳' : '✅'} Vị trí đã chọn:
                                    </div>
                                    <div style={{ fontSize: '12px' }}>
                                        📍 {pickupGeocoding ? 'Đang tải địa chỉ...' : (formData.pickupAddress || 'Chưa có địa chỉ')}
                                    </div>
                                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                                        Tọa độ: [{formData.pickup[0].toFixed(5)}, {formData.pickup[1].toFixed(5)}]
                                    </div>
                                </div>
                            )}
                            
                            {/* Bản đồ chọn điểm lấy hàng */}
                            {showPickupMap && (
                                <div style={{ marginTop: '12px', height: '300px', border: '2px solid #3b82f6', borderRadius: '8px', overflow: 'hidden' }}>
                                    <MapContainer center={formData.pickup || HANOI_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <LocationPicker 
                                            position={formData.pickup} 
                                            onPositionChange={(pos) => setFormData(prev => ({ ...prev, pickup: pos }))}
                                            onAddressFound={(address) => setFormData(prev => ({ ...prev, pickupAddress: address }))}
                                            onGeocodingStart={() => setPickupGeocoding(true)}
                                            onGeocodingEnd={() => setPickupGeocoding(false)}
                                        />
                                    </MapContainer>
                                </div>
                            )}
                        </div>

                        {/* Số điện thoại người nhận */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#333'
                            }}>
                                📞 Số điện thoại người nhận <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                type="tel"
                                name="receiverPhone"
                                value={formData.receiverPhone || ''}
                                onChange={handleChange}
                                placeholder="Nhập số điện thoại người nhận (10-11 số)"
                                maxLength="11"
                                pattern="[0-9]{10,11}"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                                required
                            />
                            <div style={{
                                marginTop: '6px',
                                fontSize: '12px',
                                color: '#6b7280'
                            }}>
                                ℹ️ Nếu số điện thoại chưa đăng ký, hệ thống sẽ tự động tạo tài khoản khách
                            </div>
                        </div>

                        {/* Địa chỉ giao hàng */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#333'
                            }}>
                                🎯 Địa chỉ giao hàng <span style={{ color: 'red' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    name="deliveryAddress"
                                    value={formData.deliveryAddress}
                                    onChange={handleChange}
                                    placeholder="Nhập địa chỉ giao hàng để tìm kiếm..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (formData.deliveryAddress && formData.deliveryAddress.length >= 3) {
                                                searchAddress(formData.deliveryAddress, 'delivery');
                                            }
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        paddingRight: '84px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'flex',
                                    gap: '4px'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (formData.deliveryAddress && formData.deliveryAddress.length >= 3) {
                                                setDeliverySearching(true);
                                                searchAddress(formData.deliveryAddress, 'delivery');
                                            }
                                        }}
                                        disabled={!formData.deliveryAddress || formData.deliveryAddress.length < 3}
                                        title="Tìm kiếm địa chỉ"
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            padding: '0',
                                            background: formData.deliveryAddress && formData.deliveryAddress.length >= 3 ? '#10b981' : '#e5e7eb',
                                            color: formData.deliveryAddress && formData.deliveryAddress.length >= 3 ? 'white' : '#9ca3af',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: formData.deliveryAddress && formData.deliveryAddress.length >= 3 ? 'pointer' : 'not-allowed',
                                            fontSize: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        🔍
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeliveryMap(!showDeliveryMap)}
                                        title="Chọn trên bản đồ"
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            padding: '0',
                                            background: showDeliveryMap ? '#3b82f6' : '#e5e7eb',
                                            color: showDeliveryMap ? 'white' : '#6b7280',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        📍
                                    </button>
                                </div>
                                
                                {/* Gợi ý địa chỉ */}
                                {deliverySearching && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'white',
                                        border: '1px solid #ddd',
                                        borderTop: 'none',
                                        borderRadius: '0 0 8px 8px',
                                        padding: '8px',
                                        zIndex: 10
                                    }}>
                                        ⏳ Đang tìm kiếm...
                                    </div>
                                )}
                                {!deliverySearching && deliverySuggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'white',
                                        border: '1px solid #ddd',
                                        borderTop: 'none',
                                        borderRadius: '0 0 8px 8px',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 10,
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}>
                                        {deliverySuggestions.map((suggestion, index) => (
                                            <div
                                                key={index}
                                                onClick={() => selectSuggestion(suggestion, 'delivery')}
                                                style={{
                                                    padding: '10px',
                                                    cursor: 'pointer',
                                                    borderBottom: index < deliverySuggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                                                    fontSize: '13px'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                                                onMouseLeave={(e) => e.target.style.background = 'white'}
                                            >
                                                🎯 {suggestion.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Hiển thị tọa độ và địa chỉ đã chọn */}
                            {formData.delivery && (
                                <div style={{
                                    marginTop: '8px',
                                    padding: '10px 12px',
                                    background: '#dcfce7',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0'
                                }}>
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                        {deliveryGeocoding ? '⏳' : '✅'} Vị trí đã chọn:
                                    </div>
                                    <div style={{ fontSize: '12px' }}>
                                        🎯 {deliveryGeocoding ? 'Đang tải địa chỉ...' : (formData.deliveryAddress || 'Chưa có địa chỉ')}
                                    </div>
                                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                                        Tọa độ: [{formData.delivery[0].toFixed(5)}, {formData.delivery[1].toFixed(5)}]
                                    </div>
                                </div>
                            )}
                            
                            {/* Bản đồ chọn điểm giao hàng */}
                            {showDeliveryMap && (
                                <div style={{ marginTop: '12px', height: '300px', border: '2px solid #3b82f6', borderRadius: '8px', overflow: 'hidden' }}>
                                    <MapContainer center={formData.delivery || HANOI_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <LocationPicker 
                                            position={formData.delivery} 
                                            onPositionChange={(pos) => setFormData(prev => ({ ...prev, delivery: pos }))}
                                            onAddressFound={(address) => setFormData(prev => ({ ...prev, deliveryAddress: address }))}
                                            onGeocodingStart={() => setDeliveryGeocoding(true)}
                                            onGeocodingEnd={() => setDeliveryGeocoding(false)}
                                        />
                                    </MapContainer>
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#333'
                            }}>
                                Khối lượng (kg) <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                type="number"
                                name="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                placeholder="Nhập khối lượng"
                                min="0.1"
                                step="0.1"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#333'
                            }}>
                                Ghi chú
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Thêm ghi chú cho đơn hàng (không bắt buộc)"
                                rows="4"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: loading ? '#ccc' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? '⏳ Đang xử lý...' : '✅ Tạo đơn hàng'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CreateOrder;
