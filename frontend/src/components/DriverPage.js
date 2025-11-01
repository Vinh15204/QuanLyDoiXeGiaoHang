import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import signalRService from '../services/signalRService';
import { vehicleIcon, pickupIcon, deliveryIcon, validateIcon } from '../utils/mapIcons';
import "leaflet/dist/leaflet.css";
import Header from './Header';
import '../styles/Driver.css';

const HANOI_CENTER = [21.0285, 105.8542];

function DriverPage() {
    const navigate = useNavigate();
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
            </div>
        </div>
    );
}

export default DriverPage;
