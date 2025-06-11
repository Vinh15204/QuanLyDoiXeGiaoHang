import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import * as signalR from '@microsoft/signalr';
import "leaflet/dist/leaflet.css";
import Header from './Header';
import '../styles/Driver.css';

const HANOI_CENTER = [21.0285, 105.8542];

function DriverPage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [currentDriver, setCurrentDriver] = useState(null);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr || JSON.parse(userStr).role !== 'driver') {
      navigate('/login');
      return;
    }

    const driver = JSON.parse(userStr);
    setCurrentDriver(driver);

    // Create SignalR connection
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/deliveryHub', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    // Listen for route updates
    newConnection.on("RoutesOptimized", (updatedRoutes) => {
      console.log("Received routes:", updatedRoutes);
      const myRoutes = updatedRoutes.filter(r => r.vehicleId === driver.vehicleId);
      if (myRoutes.length > 0) {
        console.log("My routes:", myRoutes);
        setRoutes(myRoutes);
      }
    });

    // Start connection
    async function startConnection() {
      try {
        await newConnection.start();
        console.log("SignalR Connected");
        setConnection(newConnection);
      } catch (err) {
        console.error("SignalR Connection Error:", err);
        setTimeout(startConnection, 5000);
      }
    }

    startConnection();

    // Cleanup
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [navigate]);

  return (
    <div className="driver-container">
      <div className="driver-header">
        <Header />
      </div>
      <div className="driver-content">
        <div className="driver-info">
          <h2>Lịch trình giao hàng</h2>
          {routes.length > 0 ? (
            <div className="route-details">
              {routes.map((route, index) => (
                <div key={index} className="route-card">
                  <div className="route-header">
                    <h3>Thông tin lịch trình</h3>
                    <div className="route-summary">
                      <p><strong>Tổng quãng đường:</strong> {route.distance?.toFixed(2)} km</p>
                      <p><strong>Thời gian dự kiến:</strong> {route.duration?.toFixed(0)} phút</p>
                      <p><strong>Số điểm giao:</strong> {route.assignedOrders?.length || 0}</p>
                    </div>
                  </div>
                  
                  <div className="assigned-orders">
                    <h4>Chi tiết lộ trình</h4>
                    <div className="route-timeline">
                      {route.routeDetails?.map((detail, idx) => (
                        <div key={idx} className="timeline-item">
                          <div className="timeline-marker">{idx + 1}</div>
                          <div className="timeline-content">
                            <div className="step-detail">{detail}</div>
                            <div className="step-time">
                              {/* Thời gian ước tính cho mỗi điểm dừng */}
                              {route.estimatedTimes?.[idx]}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-routes">
              <p>Chưa có lịch trình giao hàng</p>
              <p className="sub-text">Lịch trình sẽ được cập nhật khi có phân công từ quản lý</p>
            </div>
          )}
        </div>
        
        <div className="driver-map">
          <MapContainer 
            center={HANOI_CENTER} 
            zoom={13}
            zoomControl={true}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {currentDriver && (
              <Marker position={currentDriver.currentLocation}>
                <Popup>Vị trí của bạn</Popup>
              </Marker>
            )}
            {routes.map((route, idx) => (
              route.route && (
                <Polyline
                  key={idx}
                  positions={route.route}
                  pathOptions={{
                    color: 'blue',
                    weight: 3
                  }}
                >
                  <Popup>Lộ trình của bạn</Popup>
                </Polyline>
              )
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default DriverPage;
