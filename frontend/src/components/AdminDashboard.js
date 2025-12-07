<<<<<<< HEAD
import React from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import ModernDashboardContent from "./ModernDashboardContent";
import VehiclesManagementNew from "./VehiclesManagementNew";
import OrdersManagementNew from "./OrdersManagementNew";
import DriversManagement from "./DriversManagement";
import Analytics from "./Analytics";
import Settings from "./Settings";

function AdminDashboard() {
  const location = useLocation();
  const currentPage = location.pathname.split('/').pop();

  // Render different page content inside the layout
  const renderPageContent = () => {
    switch (currentPage) {
      case 'vehicles':
        return <VehiclesManagementNew />;
      case 'orders':
        return <OrdersManagementNew />;
      case 'drivers':
        return <DriversManagement />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'map':
      case 'info':
      default:
        return <ModernDashboardContent />;
    }
  };

  return (
    <DashboardLayout>
      {renderPageContent()}
    </DashboardLayout>
=======
import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import Modal from "./Modal";
import Header from "./Header";
import 'leaflet/dist/leaflet.css';
import { vehicleIcon, pickupIcon, deliveryIcon, validateIcon } from '../utils/mapIcons';
import '../styles/Admin.css';
import '../styles/Icons.css';

const COLORS = ["#2196F3", "#F44336", "#4CAF50", "#FF9800", "#9C27B0"];
const HANOI_CENTER = [21.0285, 105.8542];
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const VehiclePopup = ({ vehicle, optimizedRoutes, onViewRoute }) => (
  <div className="popup-content">
    <h3>Xe #{vehicle.id}</h3>
    <p>Tải trọng: {vehicle.maxLoad}kg</p>
    <p>Vị trí: [{vehicle.position[0].toFixed(4)}, {vehicle.position[1].toFixed(4)}]</p>
    {optimizedRoutes?.find(r => r.vehicleId === vehicle.id) && (
      <>
        <p>Số đơn hàng: {optimizedRoutes.find(r => r.vehicleId === vehicle.id).assignedOrders.length}</p>
        <p>Quãng đường: {optimizedRoutes.find(r => r.vehicleId === vehicle.id).distance}km</p>
        <p>Thời gian: {optimizedRoutes.find(r => r.vehicleId === vehicle.id).duration} phút</p>
        <button className="popup-button" onClick={onViewRoute}>
          Xem chi tiết lộ trình
        </button>
      </>
    )}
  </div>
);

const OrderPopup = ({ order, type, optimizedRoutes }) => (
  <div className="popup-content">
    <h3>{type === 'pickup' ? 'Điểm lấy hàng' : 'Điểm giao hàng'} #{order.id}</h3>
    <p>Trọng lượng: {order.weight}kg</p>
    {type === 'pickup' ? (
      <p>Người gửi: #{order.senderId}</p>
    ) : (
      <p>Người nhận: #{order.receiverId}</p>
    )}
    <p>Trạng thái: {order.status}</p>
    {optimizedRoutes?.some(r => r.assignedOrders.includes(order.id)) && (
      <p>Xe được phân công: #{optimizedRoutes.find(r => r.assignedOrders.includes(order.id)).vehicleId}</p>
    )}
  </div>
);

function AdminDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [orders, setOrders] = useState([]);
  const [optimizedRoutes, setOptimizedRoutes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optimizationStatus, setOptimizationStatus] = useState('idle'); // idle, loading, success, error
  const [isVehiclesModalOpen, setVehiclesModalOpen] = useState(false);
  const [isOrdersModalOpen, setOrdersModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [optimizationStats, setOptimizationStats] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch data function
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [vehiclesRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/vehicles`),
        fetch(`${API_BASE_URL}/api/orders`)
      ]);

      if (!vehiclesRes.ok || !ordersRes.ok) {
        throw new Error(
          `Network response was not ok - Vehicles: ${vehiclesRes.status}, Orders: ${ordersRes.status}`
        );
      }

      const vehiclesData = await vehiclesRes.json();
      const ordersData = await ordersRes.json();

      if (!Array.isArray(vehiclesData) || !Array.isArray(ordersData)) {
        throw new Error('Invalid data format received from server');
      }

      setVehicles(vehiclesData);
      setOrders(ordersData);
      
      console.log('Data loaded:', {
        vehicles: vehiclesData.length,
        orders: ordersData.length
      });

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Lỗi khi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Optimization function
  const handleOptimize = async () => {
    if (optimizationStatus === 'loading') {
      console.log('Already optimizing, please wait...');
      return;
    }

    try {
      setOptimizationStatus('loading');
      setError(null);
      setOptimizationStats(null);
      
      // Validate data
      if (!vehicles.length || !orders.length) {
        throw new Error('No vehicles or orders available');
      }

      console.log('Starting optimization:', {
        vehicles: vehicles.length,
        orders: orders.length
      });

      // Call optimization API
      const response = await fetch(`${API_BASE_URL}/api/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicles, orders })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Optimization response:', data);

      if (!data.routes || !Array.isArray(data.routes)) {
        throw new Error('Invalid response format');
      }

      // Update state with results
      setOptimizedRoutes(data.routes);
      setOptimizationStats(data.stats);
      setOptimizationStatus('success');
      
      console.log('Optimization completed:', {
        routes: data.routes.length,
        stats: data.stats
      });

    } catch (err) {
      console.error('Optimization error:', err);
      setError('Lỗi khi tối ưu: ' + err.message);
      setOptimizationStatus('error');
    }
  };

  const MapView = () => (
    <div className="map-view">
      <div className="map-panel">
        <MapContainer center={HANOI_CENTER} zoom={13} style={{height:"100%", width:"100%"}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          
          {/* Render vehicles */}
          {vehicles.map(vehicle => (
            <Marker 
              key={vehicle.id} 
              position={vehicle.position}
              icon={validateIcon(vehicleIcon)}
              zIndexOffset={1000}
              eventHandlers={{
                click: () => setSelectedVehicle(vehicle)
              }}
            >
              <Popup>
                <VehiclePopup 
                  vehicle={vehicle} 
                  optimizedRoutes={optimizedRoutes}
                  onViewRoute={() => setSelectedVehicle(vehicle)}
                />
              </Popup>
            </Marker>
          ))}

          {/* Render orders */}
          {orders.map(order => (
            <React.Fragment key={order.id}>
              <Marker 
                position={order.pickup} 
                icon={validateIcon(pickupIcon)}
                zIndexOffset={500}
              >
                <Popup>
                  <OrderPopup 
                    order={order}
                    type="pickup"
                    optimizedRoutes={optimizedRoutes}
                  />
                </Popup>
              </Marker>
              <Marker 
                position={order.delivery} 
                icon={validateIcon(deliveryIcon)}
                zIndexOffset={0}
              >
                <Popup>
                  <OrderPopup 
                    order={order}
                    type="delivery"
                    optimizedRoutes={optimizedRoutes}
                  />
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {/* Render optimized routes */}
          {optimizedRoutes?.map((route, idx) => (
            route.path && route.path.length >= 2 ? (
              <Polyline
                key={idx}
                positions={route.path}
                pathOptions={{
                  color: COLORS[idx % COLORS.length],
                  weight: 3,
                  opacity: selectedVehicle ? (selectedVehicle.id === route.vehicleId ? 1 : 0.3) : 1
                }}
              >
                <Popup>
                  <div className="popup-content">
                    <h3>Lộ trình xe #{route.vehicleId}</h3>
                    <p>Quãng đường: {route.distance}km</p>
                    <p>Thời gian: {route.duration} phút</p>
                    <p>Đơn hàng: {route.assignedOrders.join(', ')}</p>
                  </div>
                </Popup>
              </Polyline>
            ) : null
          ))}
        </MapContainer>

        {/* Route details panel when a vehicle is selected */}
        {selectedVehicle && optimizedRoutes && (
          <div className="route-details-panel">
            <div className="panel-header">
              <h3>Chi tiết lộ trình xe #{selectedVehicle.id}</h3>
              <button onClick={() => setSelectedVehicle(null)}>&times;</button>
            </div>            {(() => {
              const vehicleRoute = optimizedRoutes.find(r => r.vehicleId === selectedVehicle.id);
              if (vehicleRoute && Array.isArray(vehicleRoute.routeDetails)) {
                return vehicleRoute.routeDetails.map((detail, idx) => (
                  <div key={idx} className="route-step">
                    <div className="step-number">{idx + 1}</div>
                    <div className="step-description">{detail}</div>
                  </div>
                ));
              } else {
                return <div className="no-route">Không có thông tin lộ trình</div>;
              }
            })()}
          </div>
        )}
      </div>
    </div>
  );

  const InfoView = () => (
    <div className="info-view">
      <div className="info-panel">
        <div className="control-section">
          <h3>Thông tin tổng quan</h3>
          <div className="stats-container">
            <div className="stats-item">
              <label>Số xe:</label>
              <span>{vehicles.length}</span>
            </div>
            <div className="stats-item">
              <label>Số đơn hàng:</label>
              <span>{orders.length}</span>
            </div>
            
            {optimizationStats && (
              <>
                <div className="stats-item">
                  <label>Xe được phân công:</label>
                  <span>{optimizationStats.vehiclesWithRoutes} / {optimizationStats.totalVehicles}</span>
                </div>
                <div className="stats-item">
                  <label>Đơn được phân công:</label>
                  <span>{optimizationStats.assignedOrders} / {optimizationStats.totalOrders}</span>
                </div>
                <div className="stats-item">
                  <label>Thời gian tối đa:</label>
                  <span>{optimizationStats.makespan?.toFixed(1)} phút</span>
                </div>
              </>
            )}
          </div>

          <div className="optimization-controls">
            <button 
              className={`optimize-button ${optimizationStatus}`}
              onClick={handleOptimize}
              disabled={optimizationStatus === 'loading' || !vehicles.length || !orders.length}
            >
              {optimizationStatus === 'loading' && (
                <span className="loader"></span>
              )}
              {optimizationStatus === 'loading' ? 'Đang tối ưu...' : 'Tính toán lộ trình'}
            </button>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {optimizationStatus === 'success' && (
              <div className="success-message">
                Tính toán lộ trình thành công!
              </div>
            )}
          </div>

          <div className="buttons-container">
            <button onClick={() => setVehiclesModalOpen(true)}>
              Quản lý đội xe
            </button>
            <button onClick={() => setOrdersModalOpen(true)}>
              Quản lý đơn hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-wrapper">
      <Header />
      <div className="page-container">
        <Routes>
          <Route path="map" element={<MapView />} />
          <Route path="info" element={<InfoView />} />
          <Route path="" element={<Navigate to="map" replace />} />
        </Routes>
      </div>
    </div>
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
  );
}

export default AdminDashboard;
