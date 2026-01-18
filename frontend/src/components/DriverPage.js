import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
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
    const { currentDriver } = useOutletContext();
    const [route, setRoute] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [selectedStop, setSelectedStop] = useState(null);
    const [mapCenter, setMapCenter] = useState(null);
    const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
    const [mapDisplayMode, setMapDisplayMode] = useState('full'); // 'full' or 'next'
    const [orders, setOrders] = useState([]);
    const [nextStopRoute, setNextStopRoute] = useState(null); // OSRM route to next stop
    const [vehicleCurrentPosition, setVehicleCurrentPosition] = useState(null); // Current vehicle position
    const [lastCompletedStop, setLastCompletedStop] = useState(null); // Track last completed stop

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
                            
                            // Check if stops have address data
                            const hasAddresses = driverRoute.stops?.some(s => 
                                s.pickupAddress || s.deliveryAddress || s.address
                            );
                            console.log('🏷️ Route has addresses:', hasAddresses);
                            
                            // If no addresses found, clear old cache
                            if (!hasAddresses) {
                                console.warn('⚠️ Route missing address data - clearing cache');
                                localStorage.removeItem(`driverRoute_${currentDriver.vehicleId}`);
                            }
                            
                            setRoute(driverRoute);
                            
                            // Initialize vehicle position if not set
                            if (!vehicleCurrentPosition) {
                                const depotStop = driverRoute.stops?.find(s => s.type === 'depot');
                                const initialPos = depotStop?.point || driverRoute.vehiclePosition;
                                if (initialPos) {
                                    setVehicleCurrentPosition(initialPos);
                                    console.log('🚗 Initial vehicle position set:', initialPos);
                                }
                            }
                            
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
                // Don't use localStorage fallback if we want fresh data
                console.log('⚠️ Not using localStorage cache to ensure fresh data');
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

    // Enrich route stops with addresses from orders when both are loaded
    useEffect(() => {
        if (!route || !orders || orders.length === 0) return;
        
        const hasAddresses = route.stops?.some(s => s.pickupAddress || s.deliveryAddress);
        if (hasAddresses) {
            console.log('✅ Route already has addresses');
            return;
        }
        
        console.log('🔧 Enriching route stops with order addresses...');
        const enrichedStops = route.stops.map(stop => {
            if (stop.type === 'depot') return stop;
            
            const order = orders.find(o => o.id === stop.orderId);
            if (!order) {
                console.warn(`Order ${stop.orderId} not found`);
                return stop;
            }
            
            return {
                ...stop,
                pickupAddress: order.pickupAddress || '',
                deliveryAddress: order.deliveryAddress || ''
            };
        });
        
        setRoute({
            ...route,
            stops: enrichedStops
        });
        console.log('✅ Route stops enriched with addresses');
    }, [orders, route?.vehicleId]);

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

    const calculateTotalDistance = () => {
        return route?.distance || 0;
    };

    const calculateTotalTime = () => {
        return route?.duration || 0;
    };

    const getTotalOrders = () => {
        return route?.assignedOrders?.length || 0;
    };

    const handleUpdateOrderStatus = async (orderId, newStatus, currentStop, isFinal) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Update vehicle position immediately after completing any stop
                if (currentStop && isFinal) {
                    setVehicleCurrentPosition(currentStop.point);
                    console.log('🚗 Vehicle position updated to:', currentStop.type, 'location');
                }
                
                // Mark this stop as completed
                if (currentStop) {
                    setLastCompletedStop(currentStop);
                    console.log('📌 Marked stop as completed:', currentStop.type, 'Order:', currentStop.orderId);
                }
                
                // Refresh orders to update next stop
                const ordersRes = await fetch(`${API_BASE_URL}/api/orders?driverId=${currentDriver.vehicleId}`);
                if (ordersRes.ok) {
                    const data = await ordersRes.json();
                    setOrders(data);
                    console.log('✅ Order status updated to:', newStatus);
                }
            } else {
                alert('Có lỗi xảy ra khi cập nhật trạng thái');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        }
    };

    // Move to next location
    const handleMoveToNextLocation = () => {
        if (lastCompletedStop && lastCompletedStop.point) {
            console.log('🚗 Moving vehicle from', vehicleCurrentPosition, 'to', lastCompletedStop.point);
            setVehicleCurrentPosition(lastCompletedStop.point);
            setLastCompletedStop(null);
            console.log('✅ Vehicle position updated');
        } else {
            console.warn('⚠️ No completed stop to move to');
        }
    };

    // Get next status for an order based on stop type and current status
    const getNextStatusForStop = (stop, order) => {
        if (!order) return null;
        
        const status = order.status;
        
        // For pickup stops
        if (stop.type === 'pickup') {
            if (status === 'assigned') return { status: 'in_transit', label: '🚗 Bắt đầu lấy hàng', isFinal: false };
            if (status === 'in_transit') return { status: 'picked', label: '📦 Đã lấy hàng', isFinal: true };
        }
        
        // For delivery stops
        if (stop.type === 'delivery') {
            if (status === 'picked') return { status: 'delivering', label: '🚚 Đang giao hàng', isFinal: false };
            if (status === 'delivering') return { status: 'delivered', label: '✅ Hoàn thành', isFinal: true };
        }
        
        return null;
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

    // Get next destination stop (first incomplete stop based on stop type and order status)
    const getNextStop = () => {
        if (!route?.stops || !orders) return null;
        
        // Filter out depot stops
        const activeStops = route.stops.filter(s => s.type !== 'depot');
        
        for (const stop of activeStops) {
            const order = orders.find(o => o.id === stop.orderId);
            if (!order) continue;
            
            // Check if this stop is completed based on type and status
            const isStopCompleted = 
                (stop.type === 'pickup' && ['picked', 'delivering', 'delivered', 'cancelled'].includes(order.status)) ||
                (stop.type === 'delivery' && ['delivered', 'cancelled'].includes(order.status));
            
            // If stop is not completed, this is the next stop
            if (!isStopCompleted) {
                console.log('🎯 Next stop found:', stop.type, 'Order:', stop.orderId, 'Status:', order.status);
                return stop;
            }
        }
        
        return null;
    };

    // Fetch OSRM route to next stop when in 'next' mode
    useEffect(() => {
        const fetchNextStopRoute = async () => {
            if (mapDisplayMode !== 'next') {
                setNextStopRoute(null);
                return;
            }

            const nextStop = getNextStop();
            // Use current vehicle position or fallback to depot
            const vehiclePos = vehicleCurrentPosition || 
                              route?.stops?.find(s => s.type === 'depot')?.point || 
                              route?.vehiclePosition;

            if (!nextStop || !vehiclePos) {
                setNextStopRoute(null);
                return;
            }

            try {
                // Format: lng,lat;lng,lat
                const coords = `${vehiclePos[1]},${vehiclePos[0]};${nextStop.point[1]},${nextStop.point[0]}`;
                const url = `http://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.code === 'Ok' && data.routes?.[0]) {
                    // Convert from [lng, lat] to [lat, lng] for Leaflet
                    const routePath = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                    setNextStopRoute(routePath);
                    console.log('✅ Fetched OSRM route to next stop:', routePath.length, 'points');
                } else {
                    console.warn('⚠️ OSRM failed, using straight line');
                    setNextStopRoute(null);
                }
            } catch (error) {
                console.error('Error fetching OSRM route:', error);
                setNextStopRoute(null);
            }
        };

        fetchNextStopRoute();
    }, [mapDisplayMode, route?.vehicleId, orders, vehicleCurrentPosition]);

    return (
        <div className="main-content">
                {/* Top Header */}
                <div className="top-header">
                    <div className="header-left">
                        <h1>Tuyến đường của tôi</h1>
                        <p>Xem chi tiết lộ trình và các điểm giao hàng</p>
                    </div>
                    <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Map Display Mode Toggle */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                onClick={() => setMapDisplayMode('full')}
                                style={{
                                    padding: '10px 20px',
                                    background: mapDisplayMode === 'full' ? '#3b82f6' : '#e5e7eb',
                                    color: mapDisplayMode === 'full' ? 'white' : '#6b7280',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                🗺️ Toàn bộ
                            </button>
                            <button 
                                onClick={() => setMapDisplayMode('next')}
                                style={{
                                    padding: '10px 20px',
                                    background: mapDisplayMode === 'next' ? '#3b82f6' : '#e5e7eb',
                                    color: mapDisplayMode === 'next' ? 'white' : '#6b7280',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                📍 Điểm kế tiếp
                            </button>
                        </div>
                        <button 
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '10px 20px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
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
                            (() => {
                                const nextStop = getNextStop();
                                const depotStop = route.stops?.find(s => s.type === 'depot');
                                const vehiclePos = vehicleCurrentPosition || depotStop?.point || route.vehiclePosition;
                                
                                // For 'next' mode: show only vehicle and next stop with direct route
                                if (mapDisplayMode === 'next' && nextStop && vehiclePos) {
                                    return (
                                        <MapContainer
                                            center={nextStop.point}
                                            zoom={14}
                                            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
                                        >
                                            <MapController center={mapCenter} />
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                            />

                                            {/* Vehicle position */}
                                            <Marker position={vehiclePos} icon={vehicleIcon}>
                                                <Popup>
                                                    <div style={{minWidth: '200px'}}>
                                                        <strong style={{fontSize: '14px', color: '#111827'}}>🚚 Vị trí xe</strong>
                                                        <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb'}}>
                                                            <div><strong>Xe:</strong> #{route.vehicleId}</div>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>

                                            {/* Next stop marker */}
                                            <Marker 
                                                position={nextStop.point} 
                                                icon={nextStop.type === 'pickup' ? pickupIcon : deliveryIcon}
                                            >
                                                <Popup>
                                                    <div style={{minWidth: '250px'}}>
                                                        <strong style={{fontSize: '14px', color: '#111827'}}>
                                                            📍 Điểm kế tiếp: {nextStop.type === 'pickup' ? '📦 Lấy hàng' : '🎯 Giao hàng'}
                                                        </strong>
                                                        <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb'}}>
                                                            <div style={{marginBottom: '6px'}}>
                                                                <strong>Đơn hàng:</strong> #{nextStop.orderId}
                                                            </div>
                                                            {nextStop.weight && (
                                                                <div style={{marginBottom: '6px'}}>
                                                                    <strong>Khối lượng:</strong> ⚖️ {nextStop.weight}kg
                                                                </div>
                                                            )}
                                                            {nextStop.type === 'pickup' && nextStop.pickupAddress && (
                                                                <div style={{marginTop: '8px', padding: '8px', background: '#eff6ff', borderRadius: '4px', fontSize: '12px'}}>
                                                                    <strong>📍 Địa chỉ:</strong><br/>
                                                                    {nextStop.pickupAddress}
                                                                </div>
                                                            )}
                                                            {nextStop.type === 'delivery' && nextStop.deliveryAddress && (
                                                                <div style={{marginTop: '8px', padding: '8px', background: '#f0fdf4', borderRadius: '4px', fontSize: '12px'}}>
                                                                    <strong>📍 Địa chỉ:</strong><br/>
                                                                    {nextStop.deliveryAddress}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>

                                            {/* Route line to next stop - OSRM or straight line */}
                                            {nextStopRoute ? (
                                                <Polyline
                                                    positions={nextStopRoute}
                                                    color="#ef4444"
                                                    weight={5}
                                                    opacity={0.8}
                                                />
                                            ) : (
                                                <Polyline
                                                    positions={[vehiclePos, nextStop.point]}
                                                    color="#ef4444"
                                                    weight={4}
                                                    opacity={0.6}
                                                    dashArray="10, 10"
                                                />
                                            )}
                                        </MapContainer>
                                    );
                                }

                                // Full mode: show all stops and full route
                                return (
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

                                        {/* Depot/Vehicle starting position */}
                                        {vehiclePos && (
                                            <Marker position={vehiclePos} icon={vehicleIcon}>
                                                <Popup>
                                                    <div style={{minWidth: '200px'}}>
                                                        <strong style={{fontSize: '14px', color: '#111827'}}>🚚 Điểm xuất phát</strong>
                                                        <div style={{marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb'}}>
                                                            <div style={{marginBottom: '6px'}}>
                                                                <strong>Xe:</strong> #{route.vehicleId}
                                                            </div>
                                                            {depotStop?.address && (
                                                                <div style={{marginTop: '8px', padding: '8px', background: '#fef3c7', borderRadius: '4px', fontSize: '12px'}}>
                                                                    <strong>📍 Địa chỉ:</strong><br/>
                                                                    {depotStop.address}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        )}

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
                                                        {/* Fallback: show address field if specific address not available */}
                                                        {!stop.pickupAddress && !stop.deliveryAddress && stop.address && (
                                                            <div style={{marginTop: '8px', padding: '8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '12px'}}>
                                                                <strong>📍 Địa chỉ:</strong><br/>
                                                                {stop.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>
                                );
                            })()
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
                        {mapDisplayMode === 'next' ? (
                            /* Next Stop Mode - Show only next destination */
                            (() => {
                                const nextStop = getNextStop();
                                if (!nextStop) {
                                    return (
                                        <div className="panel-section">
                                            <h3 className="section-title">✅ Hoàn thành</h3>
                                            <div style={{ padding: '20px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                                                <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                                                    Đã hoàn thành tất cả điểm dừng
                                                </p>
                                                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                                    Chuyển sang chế độ "Toàn bộ" để xem lại tuyến đường
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }

                                const order = orders.find(o => o.id === nextStop.orderId);
                                const nextAction = getNextStatusForStop(nextStop, order);
                                
                                // Debug logging
                                console.log('🔍 Next Stop Panel:', {
                                    nextStop: { orderId: nextStop.orderId, type: nextStop.type },
                                    lastCompleted: lastCompletedStop ? { orderId: lastCompletedStop.orderId, type: lastCompletedStop.type } : null,
                                    orderStatus: order?.status,
                                    nextAction: nextAction?.label,
                                    shouldShowMoveButton: lastCompletedStop && 
                                                          lastCompletedStop.orderId === nextStop.orderId && 
                                                          lastCompletedStop.type === nextStop.type
                                });
                                
                                return (
                                    <div className="panel-section">
                                        <h3 className="section-title">📍 Điểm đến kế tiếp</h3>
                                        <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                                <div style={{ 
                                                    width: '48px', 
                                                    height: '48px', 
                                                    borderRadius: '50%', 
                                                    background: nextStop.type === 'pickup' ? '#dbeafe' : '#dcfce7',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '24px'
                                                }}>
                                                    {nextStop.type === 'pickup' ? '📦' : '🎯'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                                                        {nextStop.type === 'pickup' ? 'Lấy hàng' : 'Giao hàng'}
                                                    </div>
                                                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                        Đơn hàng #{nextStop.orderId}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Address */}
                                            <div style={{ marginBottom: '16px', padding: '12px', background: 'white', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                                                    📍 ĐỊA CHỈ
                                                </div>
                                                <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                                                    {nextStop.type === 'pickup' 
                                                        ? (nextStop.pickupAddress || 'Chưa có địa chỉ')
                                                        : (nextStop.deliveryAddress || 'Chưa có địa chỉ')
                                                    }
                                                </div>
                                            </div>

                                            {/* Weight */}
                                            {nextStop.weight && (
                                                <div style={{ marginBottom: '16px', padding: '12px', background: 'white', borderRadius: '8px' }}>
                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                                                        ⚖️ KHỐI LƯỢNG
                                                    </div>
                                                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                                                        {nextStop.weight} kg
                                                    </div>
                                                </div>
                                            )}

                                            {/* Order Status */}
                                            {order && (
                                                <div style={{ marginBottom: '16px', padding: '12px', background: 'white', borderRadius: '8px' }}>
                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                                                        📊 TRẠNG THÁI
                                                    </div>
                                                    <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                                                        {getStatusLabel(order.status)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            {lastCompletedStop && 
                                             lastCompletedStop.orderId === nextStop.orderId && 
                                             lastCompletedStop.type === nextStop.type &&
                                             nextAction?.isFinal ? (
                                                /* Show "Move to Next Location" only after final status update for this stop type */
                                                <button
                                                    onClick={handleMoveToNextLocation}
                                                    style={{
                                                        width: '100%',
                                                        padding: '14px',
                                                        background: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '15px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={e => e.target.style.background = '#059669'}
                                                    onMouseOut={e => e.target.style.background = '#10b981'}
                                                >
                                                    🚗 Đến Điểm Tiếp Theo
                                                </button>
                                            ) : nextAction ? (
                                                /* Show status update button */
                                                <button
                                                    onClick={() => handleUpdateOrderStatus(nextStop.orderId, nextAction.status, nextStop, nextAction.isFinal)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '14px',
                                                        background: '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '15px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={e => e.target.style.background = '#2563eb'}
                                                    onMouseOut={e => e.target.style.background = '#3b82f6'}
                                                >
                                                    {nextAction.label}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            /* Full Mode - Show stats and all stops */
                            <>
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
                                                    {/* Display address based on stop type */}
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
                                                    {/* Fallback to address field if specific address not available */}
                                                    {!stop.pickupAddress && !stop.deliveryAddress && stop.address && (
                                                        <div className="stop-address" title={stop.address}>
                                                            📍 {stop.address}
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
                            </>
                        )}
                    </div>
                </div>
            </div>
    );
}

export default DriverPage;
