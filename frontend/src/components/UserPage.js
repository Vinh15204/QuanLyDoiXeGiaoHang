import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import * as signalR from '@microsoft/signalr';
import initialData from '../data/initialData.json';
import "leaflet/dist/leaflet.css";
import Header from './Header';
import '../styles/User.css';

function UserPage() {
  const navigate = useNavigate();
  const [userOrders, setUserOrders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr || JSON.parse(userStr).role !== 'user') {
      navigate('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setCurrentUser(user);

    // Kết nối SignalR
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/deliveryHub')
      .withAutomaticReconnect()
      .build();

    newConnection.start().then(() => {
      setConnection(newConnection);
      // Đăng ký nhận cập nhật về đơn hàng
      newConnection.on('OrdersUpdated', (updatedOrders) => {
        const myOrders = updatedOrders.filter(order => 
          order.senderId === user.id || order.receiverId === user.id
        );
        setUserOrders(myOrders);
      });
    });

    // Lấy danh sách đơn hàng ban đầu
    fetch('http://localhost:5000/api/orders')
      .then(res => res.json())
      .then(orders => {
        const myOrders = orders.filter(order => 
          order.senderId === user.id || order.receiverId === user.id
        );
        setUserOrders(myOrders);
      });

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [navigate]);

  return (
    <div className="app-wrapper">
      <Header />
      <div className="page-container">
        <div className="info-panel">
          <h2>Đơn hàng của tôi</h2>
          {userOrders.map(order => (
            <div key={order.id} className="order-item">
              <h3>Đơn hàng #{order.id}</h3>
              <p>Trạng thái: {order.status}</p>
              <p>Trọng lượng: {order.weight}kg</p>
              {order.driverId && (
                <p>Tài xế: #{order.driverId}</p>
              )}
            </div>
          ))}
        </div>
        <div className="map-panel">
          <MapContainer 
            center={[21.0285, 105.8542]} 
            zoom={13}
            style={{height:"100%", width:"100%"}}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
            {userOrders.map(order => (
              <React.Fragment key={order.id}>
                <Marker position={order.pickup}>
                  <Popup>Điểm lấy hàng #{order.id}</Popup>
                </Marker>
                <Marker position={order.delivery}>
                  <Popup>Điểm giao hàng #{order.id}</Popup>
                </Marker>
                {order.route && (
                  <Polyline 
                    positions={order.route}
                    color="blue"
                  />
                )}
              </React.Fragment>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default UserPage;
