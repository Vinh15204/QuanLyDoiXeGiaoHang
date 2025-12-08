import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import signalRService from '../services/signalRService';
import { vehicleIcon, pickupIcon, deliveryIcon } from '../utils/mapIcons';
import "leaflet/dist/leaflet.css";
import '../styles/ModernDashboard.css';

const HANOI_CENTER = [21.0285, 105.8542];
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Component to handle map flying
function MapController({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || 15, {
                duration: 1
            });
        }
    }, [center, zoom, map]);
    return null;
}

function DriverPage() {
    const navigate = useNavigate();
    const [currentDriver] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });
    const [route, setRoute] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [selectedStop, setSelectedStop] = useState(null);
    const [mapCenter, setMapCenter] = useState(null);
    const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
    const [orders, setOrders] = useState([]);

    // Load saved route - ALWAYS fetch from API first for latest data
    useEffect(() => {
        console.log('🚗 Current driver:', currentDriver);
        console.log('🔑 Vehicle ID:', currentDriver?.vehicleId);
        
        const loadRoute = async () => {
            if (!currentDriver?.vehicleId) {
                console.warn('⚠️ No vehicleId found for driver');
                return;
            }

            // ALWAYS fetch from API first to get latest route
            console.log('🌐 Fetching latest route from API...');
            try {
                // Fetch all routes and find the one for this vehicle
                const response = await fetch(`${API_BASE_URL}/api/routes?t=${Date.now()}`);
                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Fetched routes from API:', data);
                        
                        // Find route for current driver's vehicle
                        const routes = data.routes || data || [];
                        const driverRoute = routes.find(r => r.vehicleId === currentDriver.vehicleId);
                        
                        if (driverRoute) {
                            console.log('✅ Found route for vehicle:', driverRoute);
                            console.log('📍 Total stops:', driverRoute.stops?.length);
                            console.log('📍 Stops breakdown:', {
                                depot: driverRoute.stops?.filter(s => s.type === 'depot').length,
                                pickup: driverRoute.stops?.filter(s => s.type === 'pickup').length,
                                delivery: driverRoute.stops?.filter(s => s.type === 'delivery').length
                            });
                            setRoute(driverRoute);
                            // Save to localStorage
                            localStorage.setItem(`driverRoute_${currentDriver.vehicleId}`, JSON.stringify(driverRoute));
                            console.log('💾 Route saved to localStorage');
                        } else {
                            console.log('ℹ️ No route assigned yet for vehicle:', currentDriver.vehicleId);
                        }
                } else {
                    console.error('❌ Error fetching routes:', response.statusText);
                }
            } catch (error) {
                console.error('❌ Error fetching routes:', error);
                // Fallback to localStorage if API fails
                const savedRoute = localStorage.getItem(`driverRoute_${currentDriver.vehicleId}`);
                if (savedRoute) {
                    console.log('⚠️ Using cached route from localStorage');
                    setRoute(JSON.parse(savedRoute));
                }
            }
        };

        loadRoute();
    }, [currentDriver]);

    // Fetch orders assigned to this driver
    useEffect(() => {
        const fetchOrders = async () => {
            if (!currentDriver?.vehicleId) return;
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/orders?driverId=${currentDriver.vehicleId}`);
                if (response.ok) {
                    const data = await response.json();
                    setOrders(data);
                    console.log('✅ Loaded orders:', data.length);
                }
            } catch (error) {
                console.error('Error fetching orders:', error);
            }
        };

        fetchOrders();
        // Refresh orders every 30 seconds
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, [currentDriver]);

    // Auto-refresh when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && currentDriver?.vehicleId) {
                console.log('🔄 Tab visible, checking for route updates...');
                // Clear localStorage cache
                localStorage.removeItem(`driverRoute_${currentDriver.vehicleId}`);
                // Trigger reload by fetching from API
                const fetchRoute = async () => {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/routes`);
                        if (response.ok) {
                            const data = await response.json();
                            const routes = data.routes || data || [];
                            const driverRoute = routes.find(r => r.vehicleId === currentDriver.vehicleId);
                            if (driverRoute) {
                                console.log('✅ Route updated');
                                setRoute(driverRoute);
                                localStorage.setItem(`driverRoute_${currentDriver.vehicleId}`, JSON.stringify(driverRoute));
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching route:', error);
                    }
                };
                fetchRoute();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [currentDriver]);

    // SignalR connection
    useEffect(() => {
        // Check connection status
        setIsConnected(signalRService.isConnected());

        // Register event handlers
        const handleConnect = () => {
            console.log('✅ SignalR connected');
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            console.log('❌ SignalR disconnected');
            setIsConnected(false);
        };

        const handleRouteUpdate = (updatedRoute) => {
            const routeVehicleId = parseInt(updatedRoute.vehicleId);
            const driverVehicleId = parseInt(currentDriver?.vehicleId);
            if (driverVehicleId && routeVehicleId === driverVehicleId) {
                console.log('📍 Route updated:', updatedRoute);
                setRoute(updatedRoute);
                localStorage.setItem(`driverRoute_${currentDriver.vehicleId}`, JSON.stringify(updatedRoute));
            }
        };

        // Subscribe to events
        signalRService.onConnect(handleConnect);
        signalRService.onDisconnect(handleDisconnect);
        signalRService.onRouteUpdate(handleRouteUpdate);

        // Cleanup on unmount
        return () => {
            signalRService.cleanup();
        };
    }, [currentDriver]);

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        navigate('/login');
    };

    const calculateTotalDistance = () => {
        return route?.distance || 0;
    };

    const calculateTotalTime = () => {
        return route?.duration || 0;
    };

    const getTotalOrders = () => {
        return route?.assignedOrders?.length || 0;
    };

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Refresh orders
                const ordersRes = await fetch(`${API_BASE_URL}/api/orders?driverId=${currentDriver.vehicleId}`);
                if (ordersRes.ok) {
                    const data = await ordersRes.json();
                    setOrders(data);
                }
                alert(`Đã cập nhật trạng thái đơn hàng #${orderId}`);
            } else {
                alert('Có lỗi xảy ra khi cập nhật trạng thái');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        }
    };

    const getStatusBadgeClass = (status) => {
        const statusMap = {
            'pending': 'status-pending',
            'approved': 'status-approved',
            'assigned': 'status-assigned',
            'in_transit': 'status-in-transit',
            'picked': 'status-picked',
            'delivering': 'status-delivering',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled'
        };
        return statusMap[status] || 'status-pending';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'pending': 'Chờ duyệt',
            'approved': 'Đã duyệt',
            'assigned': 'Đã phân công',
            'in_transit': 'Đang lấy hàng',
            'picked': 'Đã lấy hàng',
            'delivering': 'Đang giao',
            'delivered': 'Đã giao',
            'cancelled': 'Đã hủy'
        };
        return labels[status] || status;
    };

    const getNextActions = (status) => {
        const actions = {
            'assigned': [
                { label: 'Bắt đầu lấy hàng', status: 'in_transit', icon: '🚗' }
            ],
            'in_transit': [
                { label: 'Đã lấy hàng', status: 'picked', icon: '📦' }
            ],
            'picked': [
                { label: 'Đang giao hàng', status: 'delivering', icon: '🚚' }
            ],
            'delivering': [
                { label: 'Đã giao thành công', status: 'delivered', icon: '✅' },
                { label: 'Hủy đơn', status: 'cancelled', icon: '❌' }
            ]
        };
        return actions[status] || [];
    };

    const sidebarItems = [
        { name: 'Tuyến đường', icon: '🗺️', path: '/driver' },
        { name: 'Đơn hàng', icon: '📦', path: '/driver/orders' },
        { name: 'Đã giao', icon: '✅', path: '/driver/delivered' },
        { name: 'Cài đặt', icon: '⚙️', path: '/driver/settings' }
    ];

    return (
        <div className="modern-dashboard">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">🚚</span>
                        <span className="logo-text">Tài Xế</span>
                    </div>
                </div>
                
                <nav className="sidebar-nav">
                    {sidebarItems.map((item, index) => (
                        <div 
                            key={index}
                            className={`nav-item ${window.location.pathname === item.path ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-text">{item.name}</span>
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="footer-user">
                        <div className="user-avatar">👤</div>
                        <div className="user-info">
                            <div className="user-name">{currentDriver?.username || 'Tài xế'}</div>
                            <div className="user-role">Driver</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-btn-full">
                        <span>🚪</span> Đăng xuất
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {/* Top Header */}
                <div className="top-header">
                    <div className="header-left">
                        <h1>Tuyến đường của tôi</h1>
                        <p>Xem chi tiết lộ trình và các điểm giao hàng</p>
                    </div>
                    <div className="header-right">
                        <button 
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '8px 16px',
                                marginRight: '10px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            🔄 Kiểm tra lại
                        </button>
                        <div className={`status-badge ${isConnected ? 'status-active' : 'status-inactive'}`}>
                            <span className="status-dot"></span>
                            {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
                        </div>
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="dashboard-content">

                    {/* Map View */}
                    <div className="map-section">
                        {!currentDriver?.vehicleId ? (
                            <div className="empty-state">
                                <div className="empty-icon">⚠️</div>
                                <h3>Thiếu thông tin xe</h3>
                                <p>Tài khoản của bạn chưa được gán xe</p>
                            </div>
                        ) : route ? (
                            <MapContainer
                                center={currentPosition?.position || route.stops?.[0]?.point || HANOI_CENTER}
                                zoom={13}
                                style={{ height: '100%', width: '100%', borderRadius: '12px' }}
                            >
                                <MapController center={mapCenter} />
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />

                                {/* Current vehicle position */}
                                {currentPosition?.position && (
                                    <Marker 
                                        position={currentPosition.position} 
                                        icon={vehicleIcon}
                                    >
                                        <Popup>
                                            <strong>Vị trí hiện tại</strong><br/>
                                            Xe: {route.vehicleId}
                                        </Popup>
                                    </Marker>
                                )}

                                {/* Route polyline */}
                                {route.path && Array.isArray(route.path) && route.path.length > 1 && (
                                    <Polyline
                                        positions={route.path}
                                        color="#3b82f6"
                                        weight={4}
                                        opacity={0.7}
                                    />
                                )}

                                {/* Stop markers - Show ALL stops including both pickup and delivery */}
                                {route.stops?.map((stop, index) => {
                                    if (stop.type === 'depot') return null;
                                    
                                    // Validate point coordinates
                                    if (!stop.point || !Array.isArray(stop.point) || stop.point.length !== 2) {
                                        console.warn('Invalid stop point:', stop);
                                        return null;
                                    }
                                    
                                    if (isNaN(stop.point[0]) || isNaN(stop.point[1])) {
                                        console.warn('NaN coordinates:', stop);
                                        return null;
                                    }
                                    
                                    // Debug log để kiểm tra dữ liệu
                                    if (index === 0) {
                                        console.log('🔍 Sample stop data:', stop);
                                        console.log('🔍 Has pickupAddress:', !!stop.pickupAddress);
                                        console.log('🔍 Has deliveryAddress:', !!stop.deliveryAddress);
                                    }
                                    
                                    const isPickup = stop.type === 'pickup';
                                    const stopNumber = route.stops.filter((s, i) => i < index && s.type !== 'depot').length + 1;
                                    
                                    return (
                                        <Marker
                                            key={`${stop.type}-${stop.orderId}-${index}`}
                                            position={stop.point}
                                            icon={isPickup ? pickupIcon : deliveryIcon}
                                            eventHandlers={{
                                                click: () => {
                                                    console.log('Clicked stop:', stop);
                                                    setSelectedStop(stop);
                                                    setMapCenter(stop.point);
                                                }
                                            }}
                                        >
                                            <Popup>
                                                <div style={{minWidth: '250px'}}>
                                                    <strong style={{fontSize: '14px', color: '#111827'}}>
                                                        Điểm {stopNumber}: {isPickup ? '📦 Lấy hàng' : '🎯 Giao hàng'}
                                                    </strong>
                                                    <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb'}}>
                                                        <div style={{marginBottom: '6px'}}>
                                                            <strong>Đơn hàng:</strong> #{stop.orderId}
                                                        </div>
                                                        {stop.weight && (
                                                            <div style={{marginBottom: '6px'}}>
                                                                <strong>Khối lượng:</strong> ⚖️ {stop.weight}kg
                                                            </div>
                                                        )}
                                                        {isPickup && stop.pickupAddress && (
                                                            <div style={{marginTop: '8px', padding: '8px', background: '#eff6ff', borderRadius: '4px', fontSize: '12px'}}>
                                                                <strong>📍 Địa chỉ lấy hàng:</strong><br/>
                                                                {stop.pickupAddress}
                                                            </div>
                                                        )}
                                                        {!isPickup && stop.deliveryAddress && (
                                                            <div style={{marginTop: '8px', padding: '8px', background: '#f0fdf4', borderRadius: '4px', fontSize: '12px'}}>
                                                                <strong>📍 Địa chỉ giao hàng:</strong><br/>
                                                                {stop.deliveryAddress}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">🗺️</div>
                                <h3>Chưa có tuyến đường</h3>
                                <p>Bạn chưa được phân công tuyến đường nào</p>
                                <div style={{ marginTop: '16px', padding: '16px', background: '#f3f4f6', borderRadius: '8px', fontSize: '13px', textAlign: 'left' }}>
                                    <strong>Debug Info:</strong><br/>
                                    Vehicle ID: {currentDriver?.vehicleId || 'null'}<br/>
                                    LocalStorage Key: driverRoute_{currentDriver?.vehicleId}<br/>
                                    Route Status: {localStorage.getItem(`driverRoute_${currentDriver?.vehicleId}`) ? 'Not found' : 'Not found'}<br/>
                                    Connected: {isConnected ? 'Yes' : 'No'}
                                </div>
                                <button 
                                    onClick={() => {
                                        console.log('🔄 Checking for routes...');
                                        console.log('Vehicle ID:', currentDriver?.vehicleId);
                                        const savedRoute = localStorage.getItem(`driverRoute_${currentDriver?.vehicleId}`);
                                        console.log('Saved route:', savedRoute);
                                        if (savedRoute) {
                                            setRoute(JSON.parse(savedRoute));
                                        } else {
                                            alert('Không tìm thấy tuyến đường. Vui lòng đợi admin phân công đơn hàng.');
                                        }
                                    }}
                                    style={{
                                        marginTop: '16px',
                                        padding: '12px 24px',
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔄 Kiểm tra lại
                                </button>
                                <div style={{marginTop: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px', fontSize: '13px'}}>
                                    <strong>Debug Info:</strong><br/>
                                    Vehicle ID: {currentDriver?.vehicleId}<br/>
                                    LocalStorage Key: driverRoute_{currentDriver?.vehicleId}<br/>
                                    Route Status: {route ? 'Loaded' : 'Not found'}<br/>
                                    Connected: {isConnected ? 'Yes' : 'No'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Info Panel */}
                    <div className="control-panel">
                        {/* Stats Cards */}
                        {route && (
                            <div className="panel-section">
                                <h3 className="section-title">📊 Thống kê</h3>
                                <div className="stats-compact">
                                    <div className="stat-item">
                                        <span className="stat-label">Điểm dừng</span>
                                        <span className="stat-value">{route.stops?.length || 0}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Khoảng cách</span>
                                        <span className="stat-value">{calculateTotalDistance().toFixed(1)} km</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Thời gian</span>
                                        <span className="stat-value">{Math.round(calculateTotalTime())} phút</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Đơn hàng</span>
                                        <span className="stat-value">{getTotalOrders()}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stops Timeline */}
                        <div className="panel-section">
                            <h3 className="section-title">📍 Điểm dừng ({route?.stops?.filter(s => s.type !== 'depot').length || 0})</h3>
                            {route?.stops && route.stops.length > 0 ? (
                                <div className="stops-list">
                                    {route.stops.filter(stop => stop.type !== 'depot').map((stop, index) => {
                                        const stopNumber = index + 1;
                                        return (
                                            <div 
                                                key={`${stop.type}-${stop.orderId}-${index}`} 
                                                className={`stop-item ${selectedStop === stop ? 'selected' : ''}`}
                                                onClick={() => {
                                                    console.log('Click stop in list:', stop);
                                                    if (stop.point && Array.isArray(stop.point) && stop.point.length === 2) {
                                                        setSelectedStop(stop);
                                                        setMapCenter([...stop.point]); // Create new array to trigger update
                                                    } else {
                                                        console.error('Invalid point:', stop.point);
                                                    }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="stop-number">{stopNumber}</div>
                                                <div className="stop-details">
                                                    <div className="stop-actions">
                                                        <span className={`action-badge ${stop.type === 'pickup' ? 'pickup' : 'delivery'}`}>
                                                            {stop.type === 'pickup' ? '📦 Lấy hàng' : '🎯 Giao hàng'}
                                                        </span>
                                                        <span className="order-chip">Đơn #{stop.orderId}</span>
                                                    </div>
                                                    {stop.type === 'pickup' && stop.pickupAddress && (
                                                        <div className="stop-address" title={stop.pickupAddress}>
                                                            📍 {stop.pickupAddress}
                                                        </div>
                                                    )}
                                                    {stop.type === 'delivery' && stop.deliveryAddress && (
                                                        <div className="stop-address" title={stop.deliveryAddress}>
                                                            📍 {stop.deliveryAddress}
                                                        </div>
                                                    )}
                                                    <div className="stop-meta">
                                                        {stop.weight && (
                                                            <span>⚖️ {stop.weight}kg</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state-small">
                                    <p>Chưa có điểm dừng nào</p>
                                </div>
                            )}
                        </div>

                        {/* Selected Stop Details */}
                        {selectedStop && (
                            <div className="panel-section">
                                <h3 className="section-title">📦 Chi tiết điểm dừng</h3>
                                <div className="stop-detail-card">
                                    <div className="orders-group">
                                        <h4 style={{marginBottom: '12px', fontSize: '14px', fontWeight: '600'}}>
                                            {selectedStop.type === 'pickup' ? '📦 Lấy hàng' : '🎯 Giao hàng'}
                                        </h4>
                                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                            <div className="order-chip">Đơn #{selectedStop.orderId}</div>
                                            {selectedStop.weight && (
                                                <div style={{fontSize: '13px', color: '#6b7280', padding: '8px', background: '#f9fafb', borderRadius: '4px'}}>
                                                    ⚖️ Khối lượng: <strong>{selectedStop.weight}kg</strong>
                                                </div>
                                            )}
                                            {selectedStop.type === 'pickup' && selectedStop.pickupAddress && (
                                                <div style={{
                                                    marginTop: '4px', 
                                                    padding: '10px', 
                                                    background: '#eff6ff', 
                                                    borderRadius: '6px',
                                                    borderLeft: '3px solid #3b82f6',
                                                    fontSize: '13px', 
                                                    color: '#1e40af',
                                                    lineHeight: '1.5'
                                                }}>
                                                    <strong>📍 Địa chỉ lấy hàng:</strong><br/>
                                                    {selectedStop.pickupAddress}
                                                </div>
                                            )}
                                            {selectedStop.type === 'delivery' && selectedStop.deliveryAddress && (
                                                <div style={{
                                                    marginTop: '4px', 
                                                    padding: '10px', 
                                                    background: '#f0fdf4', 
                                                    borderRadius: '6px',
                                                    borderLeft: '3px solid #10b981',
                                                    fontSize: '13px', 
                                                    color: '#166534',
                                                    lineHeight: '1.5'
                                                }}>
                                                    <strong>📍 Địa chỉ giao hàng:</strong><br/>
                                                    {selectedStop.deliveryAddress}
                                                </div>
                                            )}
                                            <div style={{
                                                marginTop: '4px',
                                                padding: '8px',
                                                background: '#f3f4f6',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                color: '#6b7280'
                                            }}>
                                                📍 Tọa độ: [{selectedStop.point[0].toFixed(5)}, {selectedStop.point[1].toFixed(5)}]
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DriverPage;
