import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { vehicleIcon, pickupIcon, deliveryIcon } from '../utils/mapIcons';
import AddressDisplay from './AddressDisplay';
import "leaflet/dist/leaflet.css";
import '../styles/ModernDashboard.css';

const HANOI_CENTER = [21.0285, 105.8542];
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Colors for different routes - Updated with modern palette
const ROUTE_COLORS = [
    '#dc3545', // danger red
    '#007bff', // primary blue
    '#28a745', // success green
    '#ffc107', // warning yellow
    '#6f42c1', // purple
    '#e83e8c', // pink
    '#20c997', // teal/info
    '#fd7e14', // orange
];

function ModernDashboard() {
    const navigate = useNavigate();
    const [currentUser] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });
    
    const [orders, setOrders] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [optimizedRoutes, setOptimizedRoutes] = useState(null);
    const [optimizationStats, setOptimizationStats] = useState(null);
    const [optimizationTime, setOptimizationTime] = useState(null);
    const [stats, setStats] = useState({
        activeDeliveries: 0,
        onTimeRate: 0,
        fleetUtilization: 0,
        avgDeliveryTime: 0
    });
    const [loading, setLoading] = useState(true);
    
    // Route visibility filters
    const [showRouteFilter, setShowRouteFilter] = useState(false);
    const [visibleRoutes, setVisibleRoutes] = useState(() => {
        if (optimizedRoutes) {
            return optimizedRoutes.reduce((acc, route) => {
                acc[route.vehicleId] = true;
                return acc;
            }, {});
        }
        return {};
    });
    
    // Order visibility toggle
    const [showAllOrders, setShowAllOrders] = useState(true);

    // Update visible routes when optimizedRoutes changes
    useEffect(() => {
        if (optimizedRoutes) {
            setVisibleRoutes(optimizedRoutes.reduce((acc, route) => {
                acc[route.vehicleId] = true;
                return acc;
            }, {}));
        }
    }, [optimizedRoutes]);

    const toggleAllRoutes = (show) => {
        if (optimizedRoutes) {
            const newVisibility = {};
            optimizedRoutes.forEach(route => {
                newVisibility[route.vehicleId] = show;
            });
            setVisibleRoutes(newVisibility);
        }
    };

    const toggleRoute = (vehicleId) => {
        setVisibleRoutes(prev => ({
            ...prev,
            [vehicleId]: !prev[vehicleId]
        }));
    };

    // Debug: log routes data (disabled to prevent console flooding)
    // useEffect(() => {
    //     console.log('📊 Dashboard - optimizedRoutes:', optimizedRoutes);
    //     console.log('📊 Dashboard - optimizationStats:', optimizationStats);
    // }, [optimizedRoutes, optimizationStats]);

    const fetchData = useCallback(async (forceRefresh = false) => {
        try {
            // Check cache first (only for routes, not orders/vehicles which change frequently)
            const cachedRoutes = sessionStorage.getItem('cachedRoutes');
            const cacheTime = sessionStorage.getItem('cacheTime');
            const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
            
            const isCacheValid = !forceRefresh && cachedRoutes && cacheTime && 
                (Date.now() - parseInt(cacheTime)) < CACHE_DURATION;
            
            if (isCacheValid) {
                console.log('📦 Using cached routes');
                const routes = JSON.parse(cachedRoutes);
                setOptimizedRoutes(routes);
                
                // Still calculate stats
                if (routes.length > 0) {
                    const totalOrders = routes.reduce((sum, r) => sum + (r.assignedOrders?.length || 0), 0);
                    const vehiclesWithRoutes = routes.filter(r => r.assignedOrders?.length > 0).length;
                    const makespan = Math.max(...routes.map(r => r.duration || 0));
                    
                    setOptimizationStats({
                        totalOrders,
                        assignedOrders: totalOrders,
                        vehiclesWithRoutes,
                        totalVehicles: routes.length,
                        makespan
                    });
                    
                    if (routes[0].lastUpdated) {
                        setOptimizationTime(new Date(routes[0].lastUpdated));
                    }
                }
            }
            
            setLoading(true);
            
            // Fetch orders
            const ordersRes = await fetch(`${API_BASE_URL}/api/orders`);
            if (ordersRes.ok) {
                const ordersData = await ordersRes.json();
                setOrders(ordersData);
                
                const activeDeliveries = ordersData.filter(order => 
                    order.status === 'in_transit' || order.status === 'assigned'
                ).length;
                
                const completedOrders = ordersData.filter(order => order.status === 'delivered');
                const onTimeRate = completedOrders.length > 0 
                    ? Math.round((completedOrders.length / ordersData.length) * 100)
                    : 0;
                
                setStats(prevStats => ({
                    ...prevStats,
                    activeDeliveries,
                    onTimeRate
                }));
            }

            // Fetch vehicles
            const vehiclesRes = await fetch(`${API_BASE_URL}/api/vehicles`);
            if (vehiclesRes.ok) {
                const vehiclesData = await vehiclesRes.json();
                setVehicles(vehiclesData);
                
                const activeVehicles = vehiclesData.filter(vehicle => vehicle.status === 'active').length;
                const fleetUtilization = vehiclesData.length > 0 
                    ? Math.round((activeVehicles / vehiclesData.length) * 100)
                    : 0;
                
                setStats(prevStats => ({
                    ...prevStats,
                    fleetUtilization
                }));
            }

            // Fetch users (drivers)
            const usersRes = await fetch(`${API_BASE_URL}/api/users`);
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                const driversData = usersData.filter(user => user.role === 'driver');
                setDrivers(driversData);
            }

            // Fetch routes - only if not using cache or force refresh
            if (!isCacheValid || forceRefresh) {
                console.log('🔄 Fetching fresh routes from API...');
                const routesRes = await fetch(`${API_BASE_URL}/api/routes`);
                if (routesRes.ok) {
                    const routesData = await routesRes.json();
                    console.log('🔍 Routes API response:', routesData);
                    
                    // Routes might be in routesData.routes or directly in routesData
                    let routes = routesData.routes || routesData || [];
                    
                    // If routes is an object with routes property, extract it
                    if (!Array.isArray(routes) && routes.routes) {
                        routes = routes.routes;
                    }
                    
                    console.log('🔍 Parsed routes array:', routes);
                    console.log('🔍 Routes length:', routes.length);
                    
                    if (routes.length > 0) {
                        // Log path information for debugging
                        routes.forEach((route, idx) => {
                            console.log(`🗺️ Route ${idx + 1} (Vehicle ${route.vehicleId}):`, {
                                hasPath: !!route.path,
                                pathType: Array.isArray(route.path) ? 'array' : typeof route.path,
                                pathLength: route.path?.length || 0,
                                firstPoint: route.path?.[0],
                                lastPoint: route.path?.[route.path?.length - 1],
                                distance: route.distance,
                                duration: route.duration
                            });
                        });
                        
                        // Cache the routes
                        sessionStorage.setItem('cachedRoutes', JSON.stringify(routes));
                        sessionStorage.setItem('cacheTime', Date.now().toString());
                        console.log('💾 Routes cached for 2 minutes');
                        
                        // Set optimized routes for map display
                        setOptimizedRoutes(routes);
                        console.log('✅ Set optimizedRoutes:', routes.length, 'routes');
                        
                        // Save route for each driver to localStorage
                        routes.forEach(route => {
                            if (route.vehicleId) {
                                localStorage.setItem(`driverRoute_${route.vehicleId}`, JSON.stringify(route));
                                console.log(`💾 Saved route for vehicle ${route.vehicleId}`);
                            }
                        });
                        
                        // Calculate stats from routes
                        const totalOrders = routes.reduce((sum, r) => sum + (r.assignedOrders?.length || 0), 0);
                        const vehiclesWithRoutes = routes.filter(r => r.assignedOrders?.length > 0).length;
                        const totalVehicles = routes.length;
                        const makespan = Math.max(...routes.map(r => r.duration || 0));
                        
                        const stats = {
                            totalOrders: totalOrders,
                            assignedOrders: totalOrders,
                            vehiclesWithRoutes: vehiclesWithRoutes,
                            totalVehicles: totalVehicles,
                            makespan: makespan
                        };
                        
                        setOptimizationStats(stats);
                        console.log('✅ Set optimizationStats:', stats);
                        
                        // Get optimization time (lastUpdated from first route)
                        if (routes[0].lastUpdated) {
                            setOptimizationTime(new Date(routes[0].lastUpdated));
                            console.log('✅ Optimization time:', routes[0].lastUpdated);
                        }
                        
                        // Calculate avg delivery time for stats
                        const avgDeliveryTime = Math.round(
                            routes.reduce((sum, route) => sum + (route.duration || 0), 0) / routes.length
                        );
                        
                        setStats(prevStats => ({
                            ...prevStats,
                            avgDeliveryTime
                        }));
                    } else {
                        console.log('⚠️ No routes found in response');
                        // Clear cache if no routes
                        sessionStorage.removeItem('cachedRoutes');
                        sessionStorage.removeItem('cacheTime');
                    }
                } else {
                    console.error('❌ Failed to fetch routes:', routesRes.status);
                }
            }
            
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []); // useCallback with empty deps

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
        } else {
            // Check if we should force refresh (after optimization)
            const shouldForceRefresh = sessionStorage.getItem('forceRefreshRoutes');
            if (shouldForceRefresh === 'true') {
                console.log('🔄 Force refreshing routes after optimization');
                sessionStorage.removeItem('forceRefreshRoutes');
                fetchData(true); // Force refresh
            } else {
                fetchData();
            }
        }
        
        // Listen for visibility change to auto-refresh when tab becomes visible
        const handleVisibilityChange = () => {
            if (!document.hidden && sessionStorage.getItem('forceRefreshRoutes') === 'true') {
                console.log('🔄 Tab visible again, force refreshing routes');
                sessionStorage.removeItem('forceRefreshRoutes');
                fetchData(true);
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Poll for force refresh flag every 2 seconds
        const pollInterval = setInterval(() => {
            if (sessionStorage.getItem('forceRefreshRoutes') === 'true') {
                console.log('🔄 Detected force refresh flag, refreshing routes');
                sessionStorage.removeItem('forceRefreshRoutes');
                fetchData(true);
            }
        }, 2000);
        
        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(pollInterval);
        };
        // Run only once on mount - currentUser is from initial state
        // eslint-disable-next-line
    }, []); // Empty deps - only run on mount

    // Calculate driver statistics by status
    const driverStats = {
        active: drivers.filter(d => d.status === 'active').length,
        available: drivers.filter(d => d.status === 'available').length,
        busy: drivers.filter(d => d.status === 'busy').length,
        offline: drivers.filter(d => d.status === 'offline' || !d.status).length,
        total: drivers.length
    };

    // Memoize filtered and processed routes to avoid re-render
    const visibleRoutesData = useMemo(() => {
        if (!optimizedRoutes) {
            console.log('🚫 No optimizedRoutes');
            return [];
        }
        
        console.log('🔍 Processing routes:', {
            totalRoutes: optimizedRoutes.length,
            visibleRoutes: Object.keys(visibleRoutes).filter(k => visibleRoutes[k])
        });
        
        const filtered = optimizedRoutes
            .filter(route => visibleRoutes[route.vehicleId])
            .map((route, index) => {
                // Get original index for color
                const originalIndex = optimizedRoutes.findIndex(r => r.vehicleId === route.vehicleId);
                
                console.log(`Route ${route.vehicleId}:`, {
                    hasPath: !!route.path,
                    pathLength: route.path?.length || 0,
                    visible: visibleRoutes[route.vehicleId]
                });
                
                // Only include routes with valid paths
                if (!route.path || route.path.length === 0) {
                    console.warn(`❌ Route ${route.vehicleId} has no path!`);
                    return null;
                }
                
                return {
                    ...route,
                    colorIndex: originalIndex
                };
            })
            .filter(Boolean);
            
        console.log('✅ Final visibleRoutesData:', filtered.length, 'routes');
        return filtered;
    }, [optimizedRoutes, visibleRoutes]);

    return (
        <>
            {loading ? (
                <div className="loading">Đang tải dữ liệu...</div>
            ) : (
                <>  
                    {/* Dashboard Content */}
                    <div className="dashboard-content">
                        {/* Map and Filter Container */}
                        <div style={{ display: 'flex', gap: '28px', height: '600px' }}>
                            {/* Map Section */}
                            <div className="map-section" style={{ flex: 1, height: '100%' }}>
                                <MapContainer 
                                    center={HANOI_CENTER} 
                                    zoom={12} 
                                    className="map-container"
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    
                                    {/* Render vehicles */}
                                    {vehicles
                                        .filter(vehicle => {
                                            // Nếu showAllOrders = true, hiện tất cả xe
                                            if (showAllOrders) return true;
                                            // Nếu showAllOrders = false, chỉ hiện xe có route được bật
                                            return visibleRoutes[vehicle.id] === true;
                                        })
                                        .map((vehicle, index) => {
                                        // Get position from vehicle.location or vehicle.position
                                        const position = vehicle.location || vehicle.position || HANOI_CENTER;
                                        
                                        // Validate position is array with 2 numbers
                                        if (!Array.isArray(position) || position.length !== 2 || 
                                            typeof position[0] !== 'number' || typeof position[1] !== 'number') {
                                            console.warn(`Invalid position for vehicle ${vehicle.id}:`, position);
                                            return null;
                                        }
                                        
                                        return (
                                        <Marker 
                                            key={`vehicle-${vehicle.id || index}`}
                                            position={position}
                                            icon={vehicleIcon}
                                        >
                                            <Popup>
                                                <div>
                                                    <h4>Xe {vehicle.id}</h4>
                                                    <p>Loại: {vehicle.type}</p>
                                                    <p>Tải trọng: {vehicle.capacity}kg</p>
                                                    <p>Trạng thái: {vehicle.status}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                        );
                                    })}
                                    
                                    {/* Render orders - only if showAllOrders is true */}
                                    {showAllOrders && orders.map((order, index) => (
                                        <React.Fragment key={`order-${index}`}>
                                            <Marker position={order.pickup} icon={pickupIcon}>
                                                <Popup>Điểm lấy hàng - Đơn {order.id}</Popup>
                                            </Marker>
                                            <Marker position={order.delivery} icon={deliveryIcon}>
                                                <Popup>Điểm giao hàng - Đơn {order.id}</Popup>
                                            </Marker>
                                        </React.Fragment>
                                    ))}
                                    
                                    {/* Render optimized routes */}
                                    {visibleRoutesData.map((route, index) => {
                                        // Validate path before rendering
                                        if (!route.path || !Array.isArray(route.path) || route.path.length < 2) {
                                            console.error(`❌ Invalid path for route ${route.vehicleId}:`, route.path);
                                            return null;
                                        }
                                        
                                        return (
                                        <React.Fragment key={`route-${route.vehicleId}`}>
                                            {/* Route line */}
                                            <Polyline
                                                positions={route.path}
                                                color={ROUTE_COLORS[route.colorIndex % ROUTE_COLORS.length]}
                                                weight={4}
                                                opacity={0.7}
                                            >
                                                    <Popup>
                                                        <div>
                                                            <h4>Route - Xe {route.vehicleId}</h4>
                                                            <p>Khoảng cách: {(route.distance || 0).toFixed(2)} km</p>
                                                            <p>Thời gian: {Math.round(route.duration || 0)} phút</p>
                                                            <p>Số điểm dừng: {route.stops?.length || 0}</p>
                                                            <p>Số đơn hàng: {route.assignedOrders?.length || 0}</p>
                                                            <p>Tải trọng: {route.totalWeight || 0} kg</p>
                                                        </div>
                                                    </Popup>
                                                </Polyline>
                                            
                                                {/* Route stops markers */}
                                                {route.stops && route.stops.map((stop, stopIndex) => {
                                                    if (stop.type === 'depot') return null; // Skip depot
                                                    
                                                    // Tìm order tương ứng để lấy thông tin đầy đủ
                                                    const relatedOrder = orders.find(o => o.id === stop.orderId);
                                                    
                                                    // Lấy địa chỉ từ stop hoặc từ order (nếu đã có), nếu không có thì fallback sang AddressDisplay
                                                    const currentAddress = stop.type === 'pickup' 
                                                        ? (stop.pickupAddress || relatedOrder?.pickupAddress)
                                                        : (stop.deliveryAddress || relatedOrder?.deliveryAddress);
                                                    
                                                    const otherAddress = stop.type === 'pickup'
                                                        ? (stop.deliveryAddress || relatedOrder?.deliveryAddress)
                                                        : (stop.pickupAddress || relatedOrder?.pickupAddress);
                                                    
                                                    return (
                                                        <Marker
                                                            key={`stop-${index}-${stopIndex}`}
                                                            position={stop.point}
                                                            icon={stop.type === 'pickup' ? pickupIcon : deliveryIcon}
                                                        >
                                                            <Popup maxWidth={300}>
                                                                <div style={{ minWidth: '250px' }}>
                                                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', borderBottom: '2px solid var(--color-primary)', paddingBottom: '5px', color: 'var(--color-text-primary)' }}>
                                                                        {stop.type === 'pickup' ? '📦 Điểm lấy hàng' : '🎯 Điểm giao hàng'}
                                                                    </h3>
                                                                    
                                                                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                                                        <strong>Đơn hàng:</strong> #{stop.orderId}
                                                                    </p>
                                                                    
                                                                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                                                        <strong>Xe:</strong> #{route.vehicleId}
                                                                    </p>
                                                                    
                                                                    {stop.weight && (
                                                                        <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                                                            <strong>Khối lượng:</strong> {stop.weight}kg
                                                                        </p>
                                                                    )}
                                                                    
                                                                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                                                                        <strong>Điểm dừng:</strong> {stopIndex}/{route.stops.length - 1}
                                                                    </p>
                                                                    
                                                                    <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                                                        <p style={{ margin: '3px 0', fontSize: '13px' }}>
                                                                            <strong>📍 Địa chỉ {stop.type === 'pickup' ? 'lấy hàng' : 'giao hàng'}:</strong>
                                                                        </p>
                                                                        <div style={{ marginTop: '5px', fontSize: '12px', color: '#555' }}>
                                                                            {currentAddress ? (
                                                                                <span>{currentAddress}</span>
                                                                            ) : (
                                                                                <AddressDisplay 
                                                                                    coordinates={stop.point} 
                                                                                    short={false}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {(otherAddress || relatedOrder) && (
                                                                        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e8f4f8', borderRadius: '4px' }}>
                                                                            <p style={{ margin: '3px 0', fontSize: '13px' }}>
                                                                                <strong>
                                                                                    {stop.type === 'pickup' ? '🏁 Gửi đến:' : '📮 Gửi từ:'}
                                                                                </strong>
                                                                            </p>
                                                                            <div style={{ marginTop: '5px', fontSize: '12px', color: '#555' }}>
                                                                                {otherAddress ? (
                                                                                    <span>{otherAddress}</span>
                                                                                ) : relatedOrder ? (
                                                                                    <AddressDisplay 
                                                                                        coordinates={stop.type === 'pickup' ? relatedOrder.delivery : relatedOrder.pickup} 
                                                                                        short={true}
                                                                                    />
                                                                                ) : null}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </Popup>
                                                        </Marker>
                                                    );
                                                })}
                                        </React.Fragment>
                                        );
                                    })}
                                </MapContainer>
                            </div>

                            {/* Route Filter Panel - Always Expanded */}
                            {optimizedRoutes && optimizedRoutes.length > 0 && (
                                <div className="route-filter-panel expanded">
                                    {/* Header - Always visible */}
                                    <div className="filter-panel-header">
                                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                            <span className="panel-icon">🗺️</span>
                                            <span className="panel-title">Routes ({optimizedRoutes.length})</span>
                                        </div>
                                        <button 
                                            className="refresh-routes-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log('🔄 Force refreshing routes...');
                                                fetchData(true);
                                            }}
                                            title="Làm mới dữ liệu"
                                            style={{
                                                background: '#f3f4f6',
                                                border: 'none',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                fontSize: '18px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease',
                                                marginLeft: '8px',
                                                color: '#3b82f6',
                                                fontWeight: '600'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = '#e5e7eb';
                                                e.target.style.transform = 'scale(1.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = '#f3f4f6';
                                                e.target.style.transform = 'scale(1)';
                                            }}
                                        >
                                            🔄
                                        </button>
                                    </div>
                                    
                                    {/* Content - Always visible */}
                                    <div className="filter-panel-content">
                                            {/* Orders Toggle */}
                                            <div className="orders-toggle-section">
                                                <label className="orders-toggle-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={showAllOrders}
                                                        onChange={() => setShowAllOrders(!showAllOrders)}
                                                    />
                                                    <span className="toggle-text">
                                                        {showAllOrders ? '📍 Hiện tất cả đơn hàng và xe' : '🚫 Ẩn đơn hàng và xe'}
                                                    </span>
                                                </label>
                                            </div>
                                            
                                            {/* Routes Actions */}
                                            <div className="filter-section-title">Tuyến đường</div>
                                            <div className="filter-actions">
                                                <button 
                                                    className="filter-btn filter-btn-small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleAllRoutes(true);
                                                    }}
                                                >
                                                    ✓ Hiện tất cả
                                                </button>
                                                <button 
                                                    className="filter-btn filter-btn-small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleAllRoutes(false);
                                                    }}
                                                >
                                                    ✗ Ẩn tất cả
                                                </button>
                                            </div>
                                            <div className="filter-list">
                                                {optimizedRoutes.map((route, index) => (
                                                    <div 
                                                        key={route.vehicleId}
                                                        className={`filter-item ${visibleRoutes[route.vehicleId] ? 'active' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleRoute(route.vehicleId);
                                                        }}
                                                    >
                                                        <div className="filter-checkbox">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={visibleRoutes[route.vehicleId] || false}
                                                                onChange={() => {}}
                                                            />
                                                        </div>
                                                        <div 
                                                            className="route-color-indicator" 
                                                            style={{ backgroundColor: ROUTE_COLORS[index % ROUTE_COLORS.length] }}
                                                        ></div>
                                                        <div className="filter-info">
                                                            <span className="vehicle-id">Xe #{route.vehicleId}</span>
                                                            <span className="route-stats">
                                                                {route.distance.toFixed(1)}km • {route.assignedOrders.length} đơn
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                </div>
                            )}
                        </div>

                        {/* Stats Section - Below Map */}
                        <div className="stats-section" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            {optimizationStats ? (
                                // Show optimization stats if available
                                <>
                                <div className="stats-grid">
                                    <div className="stat-card optimization-card">
                                        <div className="stat-header">
                                            <span className="stat-label">🎯 Optimization Results</span>
                                        </div>
                                        <div className="optimization-badge">
                                            {optimizationTime ? 
                                                `${Math.round((Date.now() - optimizationTime) / 60000)} phút trước` 
                                                : 'Active'}
                                        </div>
                                    </div>
                                    
                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Assigned Orders</span>
                                            <span className="stat-icon">📦</span>
                                        </div>
                                        <div className="stat-value">{optimizationStats.assignedOrders}/{optimizationStats.totalOrders}</div>
                                        <div className="stat-detail">{((optimizationStats.assignedOrders / optimizationStats.totalOrders) * 100).toFixed(0)}% phân công</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Vehicles Used</span>
                                            <span className="stat-icon">🚛</span>
                                        </div>
                                        <div className="stat-value">{optimizationStats.vehiclesWithRoutes}/{vehicles.length}</div>
                                        <div className="stat-detail">{vehicles.length > 0 ? ((optimizationStats.vehiclesWithRoutes / vehicles.length) * 100).toFixed(0) : 0}% sử dụng</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Avg Distance</span>
                                            <span className="stat-icon">�️</span>
                                        </div>
                                        <div className="stat-value">
                                            {optimizedRoutes && optimizedRoutes.length > 0 ? 
                                                `${(optimizedRoutes.reduce((sum, r) => sum + (r.distance || 0), 0) / optimizedRoutes.length).toFixed(2)} km` 
                                                : '0 km'}
                                        </div>
                                        <div className="stat-detail">TB mỗi tuyến</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Longest Route</span>
                                            <span className="stat-icon">⏱️</span>
                                        </div>
                                        <div className="stat-value">
                                            {optimizedRoutes && optimizedRoutes.length > 0 ? 
                                                `${Math.max(...optimizedRoutes.map(r => r.duration || 0)).toFixed(1)} phút` 
                                                : '0 phút'}
                                        </div>
                                        <div className="stat-detail">Xe lâu nhất</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Total Distance</span>
                                            <span className="stat-icon">🏁</span>
                                        </div>
                                        <div className="stat-value">
                                            {optimizedRoutes ? 
                                                `${optimizedRoutes.reduce((sum, r) => sum + (r.distance || 0), 0).toFixed(2)} km` 
                                                : '0 km'}
                                        </div>
                                        <div className="stat-detail">Tổng quãng đường</div>
                                    </div>
                                </div>
                                
                                {/* Driver Statistics - Inline */}
                                <div className="optimization-stats-header" style={{marginTop: '20px'}}>
                                    <h3>Thống kê Tài xế ({driverStats.total})</h3>
                                </div>
                                <div className="stats-grid" style={{marginTop: '12px'}}>
                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Đang hoạt động</span>
                                            <span className="stat-icon" style={{color: '#28a745'}}>🚗</span>
                                        </div>
                                        <div className="stat-value">{driverStats.active}</div>
                                        <div className="stat-detail">Active</div>
                                    </div>
                                    
                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Sẵn sàng</span>
                                            <span className="stat-icon" style={{color: '#17a2b8'}}>✓</span>
                                        </div>
                                        <div className="stat-value">{driverStats.available}</div>
                                        <div className="stat-detail">Available</div>
                                    </div>
                                    
                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Bận</span>
                                            <span className="stat-icon" style={{color: '#ffc107'}}>⏳</span>
                                        </div>
                                        <div className="stat-value">{driverStats.busy}</div>
                                        <div className="stat-detail">Busy</div>
                                    </div>
                                    
                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Offline</span>
                                            <span className="stat-icon" style={{color: '#6c757d'}}>⭕</span>
                                        </div>
                                        <div className="stat-value">{driverStats.offline}</div>
                                        <div className="stat-detail">Ngoại tuyến</div>
                                    </div>
                                </div>
                                </>
                            ) : (
                                // Show default stats
                                <>
                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Active Deliveries</span>
                                        </div>
                                        <div className="stat-value">{stats.activeDeliveries}</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">On-Time Rate</span>
                                        </div>
                                        <div className="stat-value">{stats.onTimeRate}%</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Fleet Utilization</span>
                                        </div>
                                        <div className="stat-value">{stats.fleetUtilization}%</div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-header">
                                            <span className="stat-label">Avg. Delivery Time</span>
                                        </div>
                                        <div className="stat-value">{stats.avgDeliveryTime}m</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default ModernDashboard;
