import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import signalRService from '../services/signalRService';
import "leaflet/dist/leaflet.css";
import '../utils/mapIcons';  // Import map icons
import Header from './Header';
import '../styles/User.css';

const HANOI_CENTER = [21.0285, 105.8542];

function UserPage() {
  const navigate = useNavigate();
  const [orderUpdate, setOrderUpdate] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr || JSON.parse(userStr).role !== 'user') {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setCurrentUser(user);

    // Đăng ký nhận cập nhật đơn hàng
    signalRService.registerUser(user.id, (update) => {
      console.log("Nhận được cập nhật đơn hàng:", update);
      setOrderUpdate(update);
    });

    return () => {
      // Hủy đăng ký khi component unmount
      signalRService.unregisterUser(user.id);
    };
  }, [navigate]);

  const renderMap = () => {
    return (
      <MapContainer 
        center={HANOI_CENTER} 
        zoom={13} 
        style={{
          height: "500px", // Explicit height
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: "4px"
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* Hiển thị vị trí xe */}
        {orderUpdate?.vehiclePosition && (
          <Marker position={orderUpdate.vehiclePosition}>
            <Popup>
              <div>
                <h4>Xe #{orderUpdate.vehicleId}</h4>
                <p>Đang trên đường đến điểm nhận/giao hàng</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hiển thị điểm nhận và giao */}
        {orderUpdate?.pickup && (
          <Marker position={orderUpdate.pickup}>
            <Popup>
              <div>
                <h4>Điểm nhận hàng</h4>
                <p>Đơn hàng #{orderUpdate.orderId}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {orderUpdate?.delivery && (
          <Marker position={orderUpdate.delivery}>
            <Popup>
              <div>
                <h4>Điểm giao hàng</h4>
                <p>Đơn hàng #{orderUpdate.orderId}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hiển thị đường đi từ điểm nhận đến điểm giao */}
        {orderUpdate?.pickup && orderUpdate?.delivery && (
          <Polyline 
            positions={[orderUpdate.pickup, orderUpdate.delivery]}
            color="green"
            weight={3}
          />
        )}
      </MapContainer>
    );
  };

  const renderOrderDetails = () => {
    if (!orderUpdate) return null;

    return (
      <div className="order-details">
        <h3>Thông tin đơn hàng #{orderUpdate.orderId}</h3>
        <div className="stats">
          <p><strong>Xe giao hàng:</strong> #{orderUpdate.vehicleId}</p>
          <p><strong>Quãng đường:</strong> {orderUpdate.distance.toFixed(2)} km</p>
          <p><strong>Thời gian ước tính:</strong> {orderUpdate.duration.toFixed(0)} phút</p>
        </div>
        <div className="locations">
          <div className="pickup">
            <h4>Điểm nhận hàng</h4>
            <p>Vị trí: [{orderUpdate.pickup[0].toFixed(4)}, {orderUpdate.pickup[1].toFixed(4)}]</p>
          </div>
          <div className="delivery">
            <h4>Điểm giao hàng</h4>
            <p>Vị trí: [{orderUpdate.delivery[0].toFixed(4)}, {orderUpdate.delivery[1].toFixed(4)}]</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="user-page">
      <Header />
      <div className="content">
        <div className="map-container">
          {renderMap()}
        </div>
        <div className="sidebar">
          {renderOrderDetails()}
        </div>
      </div>
    </div>
  );
}

export default UserPage;
