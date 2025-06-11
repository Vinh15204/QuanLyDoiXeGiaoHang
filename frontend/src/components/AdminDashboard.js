import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline } from "react-leaflet";
import Modal from "./Modal";
import Header from "./Header";
import initialData from '../data/initialData.json';
import '../styles/Admin.css'; // Updated import with capital A

const COLORS = ["blue", "red", "green", "orange", "purple"];
const HANOI_CENTER = [21.0285, 105.8542];

function AdminDashboard() {
  const [vehicles] = useState(initialData.vehicles);
  const [orders] = useState(initialData.orders);
  const [optimizedRoutes, setOptimizedRoutes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVehiclesModalOpen, setVehiclesModalOpen] = useState(false);
  const [isOrdersModalOpen, setOrdersModalOpen] = useState(false);

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicles, orders })
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tính toán lộ trình');
      }

      const data = await response.json();
      // Ensure the routes data is properly formatted
      const processedRoutes = data.routes.map(route => ({
        ...route,
        path: Array.isArray(route.route) ? route.route : [],
        vehicleId: route.vehicleId || 0
      }));
      setOptimizedRoutes(processedRoutes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const MapView = () => (
    <div className="map-view">
      <div className="map-panel">
        <MapContainer center={HANOI_CENTER} zoom={13} style={{height:"100%", width:"100%"}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          
          {/* Render vehicles */}
          {vehicles.map(vehicle => (
            <Marker key={vehicle.id} position={vehicle.position}>
              <Popup>Xe #{vehicle.id}</Popup>
            </Marker>
          ))}

          {/* Render orders */}
          {orders.map(order => (
            <React.Fragment key={order.id}>
              <CircleMarker center={order.pickup} radius={7} color="blue">
                <Popup>Điểm lấy hàng #{order.id}</Popup>
              </CircleMarker>
              <CircleMarker center={order.delivery} radius={7} color="red">
                <Popup>Điểm giao hàng #{order.id}</Popup>
              </CircleMarker>
            </React.Fragment>
          ))}

          {/* Render optimized routes only if they exist and have valid coordinates */}
          {optimizedRoutes?.map((route, idx) => (
            route.path && route.path.length >= 2 ? (
              <Polyline
                key={idx}
                positions={route.path}
                pathOptions={{
                  color: COLORS[idx % COLORS.length],
                  weight: 3
                }}
              >
                <Popup>Lộ trình xe #{route.vehicleId}</Popup>
              </Polyline>
            ) : null
          ))}
        </MapContainer>
      </div>
    </div>
  );

  const InfoView = () => (
    <div className="info-view">
      <div className="info-panel">
        <div className="control-section">
          <h3>Thông tin tổng quan</h3>
          <p>Số xe: {vehicles.length}</p>
          <p>Số đơn hàng: {orders.length}</p>
          <button 
            className="optimize-button"
            onClick={handleOptimize}
            disabled={loading}
          >
            {loading ? 'Đang tính toán...' : 'Tính toán lộ trình'}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="vehicles-section">
          {/* Hiển thị danh sách xe */}
        </div>

        <div className="orders-section">
          {/* Hiển thị danh sách đơn hàng */}
        </div>

        {optimizedRoutes && (
          <div className="routes-section">
            {/* Hiển thị kết quả tính toán */}
          </div>
        )}
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

        <Modal 
          isOpen={isVehiclesModalOpen} 
          onClose={() => setVehiclesModalOpen(false)}
          title="Thông tin đội xe"
        >
          <div className="scrollable-container">
            {initialData.vehicles.map(vehicle => (
              <div key={vehicle.id} className="vehicle-item">
                <h4>Xe #{vehicle.id}</h4>
                <p>Tải trọng: {vehicle.maxLoad}kg</p>
                <p>Vị trí: [{vehicle.position[0].toFixed(4)}, {vehicle.position[1].toFixed(4)}]</p>
              </div>
            ))}
          </div>
        </Modal>

        <Modal 
          isOpen={isOrdersModalOpen} 
          onClose={() => setOrdersModalOpen(false)}
          title="Thông tin đơn hàng"
        >
          <div className="scrollable-container">
            {initialData.orders.map(order => (
              <div key={order.id} className="order-item">
                <h4>Đơn hàng #{order.id}</h4>
                <p>Trọng lượng: {order.weight}kg</p>
                <p>Trạng thái: {order.status}</p>
                <p>Người gửi: {order.senderId}</p>
                <p>Người nhận: {order.receiverId}</p>
              </div>
            ))}
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default AdminDashboard;
