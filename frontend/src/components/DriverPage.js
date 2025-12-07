import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import signalRService from '../services/signalRService';
import { vehicleIcon, pickupIcon, deliveryIcon } from '../utils/mapIcons';
=======
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import signalRService from '../services/signalRService';
import { vehicleIcon, pickupIcon, deliveryIcon, validateIcon } from '../utils/mapIcons';
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
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
<<<<<<< HEAD
    const [currentDriver] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });
    const [route, setRoute] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [selectedStop, setSelectedStop] = useState(null);
    const [mapCenter, setMapCenter] = useState(null);

    // Load saved route from localStorage or fetch from API
    useEffect(() => {
        console.log('🚗 Current driver:', currentDriver);
        console.log('🔑 Vehicle ID:', currentDriver?.vehicleId);
        
        const loadRoute = async () => {
            if (!currentDriver?.vehicleId) {
                console.warn('⚠️ No vehicleId found for driver');
                return;
            }

            // Try localStorage first
            const savedRoute = localStorage.getItem(`driverRoute_${currentDriver.vehicleId}`);
            console.log('💾 Saved route:', savedRoute ? 'Found' : 'Not found');
            
            if (savedRoute) {
                const parsedRoute = JSON.parse(savedRoute);
                console.log('📍 Parsed route from localStorage:', parsedRoute);
                console.log('📍 Total stops:', parsedRoute.stops?.length);
                console.log('📍 Stops breakdown:', {
                    depot: parsedRoute.stops?.filter(s => s.type === 'depot').length,
                    pickup: parsedRoute.stops?.filter(s => s.type === 'pickup').length,
                    delivery: parsedRoute.stops?.filter(s => s.type === 'delivery').length
                });
                setRoute(parsedRoute);
            } else {
                // Fetch from API if not in localStorage
                console.log('🌐 Fetching route from API...');
                try {
                    const response = await fetch(`${API_BASE_URL}/api/optimize/route/${currentDriver.vehicleId}`);
                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Fetched route from API:', data.route);
                        console.log('📍 Total stops:', data.route?.stops?.length);
                        console.log('📍 Stops breakdown:', {
                            depot: data.route?.stops?.filter(s => s.type === 'depot').length,
                            pickup: data.route?.stops?.filter(s => s.type === 'pickup').length,
                            delivery: data.route?.stops?.filter(s => s.type === 'delivery').length
                        });
                        if (data.route) {
                            setRoute(data.route);
                            // Save to localStorage
                            localStorage.setItem(`driverRoute_${currentDriver.vehicleId}`, JSON.stringify(data.route));
                            console.log('💾 Route saved to localStorage');
                        }
                    } else if (response.status === 404) {
                        console.log('ℹ️ No route assigned yet');
                    } else {
                        console.error('❌ Error fetching route:', response.statusText);
                    }
                } catch (error) {
                    console.error('❌ Error fetching route:', error);
                }
            }
        };

        loadRoute();
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
            signalRService.offConnect(handleConnect);
            signalRService.offDisconnect(handleDisconnect);
            signalRService.offRouteUpdate(handleRouteUpdate);
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

    const sidebarItems = [
        { name: 'Tuyến đường', icon: '🗺️', path: '/driver' },
        { name: 'Lịch sử', icon: '📋', path: '/driver/history' },
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
                        <div className={`status-badge ${isConnected ? 'status-active' : 'status-inactive'}`}>
                            <span className="status-dot"></span>
                            {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
                        </div>
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="dashboard-content">

                    {/* Map Container */}
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
=======
    const [route, setRoute] = useState(null);
    const [currentDriver, setCurrentDriver] = useState(null);
    const [mapKey, setMapKey] = useState(0);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('currentUser');
        if (!userStr || JSON.parse(userStr).role !== 'driver') {
            navigate('/login');
            return;
        }

        const driver = JSON.parse(userStr);
        setCurrentDriver(driver);

        // Lắng nghe sự kiện kết nối
        signalRService.onConnect(() => {
            console.log('Connected to SignalR');
            setIsConnected(true);
        });

        // Lắng nghe sự kiện mất kết nối
        signalRService.onDisconnect(() => {
            console.log('Disconnected from SignalR');
            setIsConnected(false);
        });

        // Xử lý khi có route update
        signalRService.onRouteUpdate((routeUpdate) => {
            console.log("Received route update:", routeUpdate);
            if (routeUpdate) {
                const validatedRoute = validateRouteData(routeUpdate);
                setRoute(validatedRoute);
                setMapKey(prev => prev + 1);
            }
        });

        // Đăng ký nhận updates
        if (driver.vehicleId) {
            signalRService.registerDriver(driver.vehicleId);
        }

        return () => {
            if (driver.vehicleId) {
                signalRService.unregisterDriver(driver.vehicleId);
            }
        };
    }, [navigate]);

    // Hàm validate dữ liệu route
    const validateRouteData = (routeData) => {
        if (!routeData) return null;

        const validated = {
            ...routeData,
            currentPosition: validatePoint(routeData.currentPosition),
            path: (routeData.path || []).map(validatePoint).filter(Boolean),
            stops: (routeData.stops || []).map(stop => ({
                ...stop,
                point: validatePoint(stop.point)
            })).filter(stop => stop.point)
        };

        console.log("Validated route data:", {
            hasCurrentPosition: !!validated.currentPosition,
            pathPoints: validated.path.length,
            validStops: validated.stops.length
        });

        return validated;
    };

    // Hàm validate một điểm tọa độ
    const validatePoint = (point) => {
        if (!point || !Array.isArray(point) || point.length !== 2) return null;
        const [lat, lng] = point.map(Number);
        if (isNaN(lat) || isNaN(lng)) return null;
        return [lat, lng];
    };

    const renderMap = () => {
        if (!route) return null;

        // Log để debug
        console.log("Current route data:", {
            vehicleId: route.vehicleId,
            stopsCount: route.stops?.length || 0,
            pathPoints: route.path?.length || 0,
            hasCurrentPosition: !!route.currentPosition,
            firstStop: route.stops?.[0]
        });

        // Validate coordinates
        const validPath = route.path?.filter(point => 
            Array.isArray(point) && point.length === 2 &&
            !isNaN(point[0]) && !isNaN(point[1])
        ) || [];

        const validStops = route.stops?.filter(stop => 
            stop.point && Array.isArray(stop.point) && stop.point.length === 2 &&
            !isNaN(stop.point[0]) && !isNaN(stop.point[1])
        ) || [];

        const validCurrentPosition = route.currentPosition && 
            Array.isArray(route.currentPosition) && 
            route.currentPosition.length === 2 && 
            !isNaN(route.currentPosition[0]) && 
            !isNaN(route.currentPosition[1]) ? 
            route.currentPosition : null;

        // Get center of map
        const center = validCurrentPosition || 
            validStops[0]?.point || 
            validPath[0] || 
            HANOI_CENTER;

        console.log("Validated map data:", {
            validPathPoints: validPath.length,
            validStops: validStops.length,
            center
        });

        return (
            <div className="map-container">
                <MapContainer 
                    key={mapKey}
                    center={center}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* Hiển thị đường đi */}
                    {validPath.length >= 2 && (
                        <Polyline 
                            positions={validPath}
                            color="#007bff"
                            weight={4}
                            opacity={0.8}
                        />
                    )}

                    {/* Hiển thị vị trí xe */}
                    {validCurrentPosition && (
                        <Marker
                            position={validCurrentPosition}
                            icon={validateIcon(vehicleIcon)}
                            zIndexOffset={1000}
                        >
                            <Popup>
                                <div className="vehicle-popup">
                                    <h4>Xe #{route.vehicleId}</h4>
                                    <p>Vị trí hiện tại</p>
                                    <p>Số điểm dừng: {validStops.length}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Hiển thị các điểm dừng */}
                    {validStops.map((stop, index) => {
                        return (
                            <Marker
                                key={index}
                                position={stop.point}
                                icon={validateIcon(stop.type === 'pickup' ? pickupIcon : deliveryIcon)}
                                zIndexOffset={stop.type === 'pickup' ? 500 : 0}
                            >
                                <Popup>
                                    <div className="stop-popup">
                                        <h4>{stop.type === 'pickup' ? 'Điểm nhận' : 'Điểm giao'}</h4>
                                        <p><strong>Đơn hàng:</strong> #{stop.orderId}</p>
                                        {stop.type === 'pickup' && stop.weight && (
                                            <p><strong>Trọng lượng:</strong> {stop.weight}kg</p>
                                        )}
                                        <p><strong>STT:</strong> {stop.index}</p>
                                        {stop.address && (
                                            <p><strong>Địa chỉ:</strong> {stop.address}</p>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        );
    };

    const renderRouteDetails = () => {
        if (!route) {
            return (
                <div className="sidebar">
                    <div className="route-details">
                        <h3>Thông tin lộ trình</h3>
                        <div className="stats">
                            <p>Chưa có lộ trình nào được phân công</p>
                        </div>
                    </div>
                </div>
            );
        }

        const validStops = route.stops?.filter(stop => 
            stop.point && Array.isArray(stop.point) && stop.point.length === 2 &&
            !isNaN(stop.point[0]) && !isNaN(stop.point[1])
        ) || [];

        return (
            <div className="sidebar">
                <div className="route-details">
                    <h3>Chi tiết lộ trình</h3>
                    <div className="stats">
                        <p><strong>Tổng quãng đường:</strong> {route.distance?.toFixed(2)} km</p>
                        <p><strong>Thời gian ước tính:</strong> {route.duration?.toFixed(0)} phút</p>
                        <p><strong>Số điểm dừng:</strong> {validStops.length}</p>
                    </div>
                    <div className="steps">
                        {route.routeDetails?.map((detail, index) => (
                            <div key={index} className="step">
                                <div className="step-number">{index + 1}</div>
                                <div className="step-description">{detail}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="driver-page">
            <Header />
            <div className="content">
                {renderMap()}
                {renderRouteDetails()}
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
            </div>
        </div>
    );
}

export default DriverPage;
