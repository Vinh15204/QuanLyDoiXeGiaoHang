import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import signalRService from '../services/signalRService';
import ordersData from '../data/orders.json';
import usersFlat from '../data/users_flat.json';
import { useRoute } from '../contexts/RouteContext';
import Modal from './Modal';
import "leaflet/dist/leaflet.css";
import '../utils/mapIcons';
import Header from './Header';
import '../styles/User.css';
import '../styles/ModernDashboard.css';

const HANOI_CENTER = [21.0285, 105.8542];

function LocationPickerModal({ isOpen, onClose, onPick, label }) {
  const [picked, setPicked] = useState(null);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chọn ${label} trên bản đồ`}>
      <div style={{ width: 400, height: 350, marginBottom: 12 }}>
        <MapContainer center={HANOI_CENTER} zoom={13} style={{ width: '100%', height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationPicker
            onPick={latlng => setPicked(latlng)}
            markerPosition={picked}
            label={label}
          />
        </MapContainer>
      </div>
      <button onClick={() => { if (picked) { onPick(picked); onClose(); } }} disabled={!picked} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: picked ? 'pointer' : 'not-allowed', width: '100%' }}>Xác nhận</button>
    </Modal>
  );
}

function LocationPicker({ onPick, markerPosition, label }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    }
  });
  // Chỉ render Marker nếu markerPosition là mảng hợp lệ
  if (Array.isArray(markerPosition) && markerPosition.length === 2 && markerPosition.every(x => typeof x === 'number' && !isNaN(x))) {
    return (
      <Marker position={markerPosition}>
        <Popup>{label}</Popup>
      </Marker>
    );
  }
  return null;
}

function UserPage() {
  const navigate = useNavigate();
  const [userOrders, setUserOrders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const { optimizedRoutes } = useRoute();
  const [showModal, setShowModal] = useState(false);
  const [newOrder, setNewOrder] = useState({ pickup: '', delivery: '', weight: '' });
  const [creating, setCreating] = useState(false);
  const [pickMode, setPickMode] = useState(null); // 'pickup' | 'delivery' | null
  const [showPickModal, setShowPickModal] = useState(false);
  const [pickLabel, setPickLabel] = useState('');

  // Chỉ kiểm tra đăng nhập khi mount, không phụ thuộc navigate
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr || JSON.parse(userStr).role !== 'user') {
      setShouldRedirect(true);
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);

    // Ưu tiên lấy đơn hàng từ localStorage
    const savedOrders = localStorage.getItem(`userOrders_${user.id}`);
    let myOrders;
    if (savedOrders) {
      myOrders = JSON.parse(savedOrders);
    } else {
      // Lọc đơn hàng của user hiện tại từ file tĩnh
      myOrders = ordersData.filter(order => 
        order.senderId === user.id || order.receiverId === user.id
      );
    }
    setUserOrders(myOrders);

    // Đăng ký nhận cập nhật đơn hàng qua signalR nếu cần
    signalRService.registerUser(user.id);
    // TODO: Nếu muốn cập nhật realtime, cần lắng nghe sự kiện và cập nhật userOrders

    // Cleanup
    return () => {
      // signalRService.unregisterUser(user.id); // Nếu có hàm này
    };
  }, []);

  // Lưu userOrders vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (currentUser && userOrders.length > 0) {
      localStorage.setItem(`userOrders_${currentUser.id}`, JSON.stringify(userOrders));
    }
  }, [userOrders, currentUser]);

  // Chỉ navigate khi shouldRedirect đổi sang true
  useEffect(() => {
    if (shouldRedirect) {
      navigate('/login', { replace: true });
    }
  }, [shouldRedirect, navigate]);

  if (shouldRedirect) {
    return null;
  }

  const renderMap = () => {
    return (
      <MapContainer 
        center={HANOI_CENTER} 
        zoom={13} 
        style={{ height: "500px", width: "100%", border: "1px solid #ccc", borderRadius: "4px" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {userOrders.map(order => (
          <React.Fragment key={order.id}>
            {Array.isArray(order.pickup) && order.pickup.length === 2 && order.pickup.every(x => typeof x === 'number' && !isNaN(x)) && (
              <Marker position={order.pickup}>
                <Popup>
                  <div>
                    <h4>Điểm nhận hàng</h4>
                    <p>Đơn hàng #{order.id}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {Array.isArray(order.delivery) && order.delivery.length === 2 && order.delivery.every(x => typeof x === 'number' && !isNaN(x)) && (
              <Marker position={order.delivery}>
                <Popup>
                  <div>
                    <h4>Điểm giao hàng</h4>
                    <p>Đơn hàng #{order.id}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {order.route && Array.isArray(order.route) && order.route.length > 1 && (
              <Polyline positions={order.route} color="blue" weight={3} />
            )}
          </React.Fragment>
        ))}
        {/* Hiển thị marker chọn điểm nhận/giao khi tạo đơn mới */}
        {showModal && pickMode === 'pickup' && (
          <LocationPicker
            onPick={latlng => {
              setNewOrder(o => ({ ...o, pickup: latlng.join(',') }));
              setPickMode(null);
            }}
            markerPosition={newOrder.pickup ? newOrder.pickup.split(',').map(Number) : null}
            label="Điểm nhận mới"
          />
        )}
        {showModal && pickMode === 'delivery' && (
          <LocationPicker
            onPick={latlng => {
              setNewOrder(o => ({ ...o, delivery: latlng.join(',') }));
              setPickMode(null);
            }}
            markerPosition={newOrder.delivery ? newOrder.delivery.split(',').map(Number) : null}
            label="Điểm giao mới"
          />
        )}
      </MapContainer>
    );
  };

  // Hàm lấy thông tin lộ trình cho đơn hàng
  const getOrderRouteInfo = (orderId) => {
    if (!optimizedRoutes) return null;
    for (const route of optimizedRoutes) {
      if (route.assignedOrders && route.assignedOrders.includes(orderId)) {
        // Tìm stop pickup/delivery của đơn hàng này
        const pickupStop = route.stops?.find(s => s.orderId == orderId && s.type === 'pickup');
        const deliveryStop = route.stops?.find(s => s.orderId == orderId && s.type === 'delivery');
        // Tìm tài xế
        const driver = usersFlat.find(u => u.role === 'driver' && u.vehicleId === route.vehicleId);
        return {
          driverName: driver ? driver.name : 'Chưa rõ',
          pickupTime: pickupStop?.arrivalTime,
          deliveryTime: deliveryStop?.arrivalTime,
        };
      }
    }
    return null;
  };

  // Hàm xử lý tạo đơn hàng mới
  const handleCreateOrder = async () => {
    setCreating(true);
    try {
      const pickupArr = newOrder.pickup.split(',').map(Number);
      const deliveryArr = newOrder.delivery.split(',').map(Number);
      // Lấy id mới bắt đầu từ 100 (tìm max id hiện tại hoặc lấy 100 nếu chưa có)
      const getNewOrderId = () => {
        const maxId = userOrders.length > 0 ? Math.max(...userOrders.map(o => o.id || 0)) : 99;
        return maxId >= 100 ? maxId + 1 : 100;
      };
      const order = {
        id: getNewOrderId(),
        senderId: currentUser.id,
        receiverId: Number(newOrder.receiverId),
        pickup: pickupArr,
        delivery: deliveryArr,
        weight: Number(newOrder.weight),
        status: 'pending',
        driverId: null
      };
      // Gửi lên backend
      const res = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        const created = await res.json();
        setUserOrders(prev => [...prev, created]);
        alert(`Tạo đơn hàng thành công! Mã đơn hàng: ${created.id}`);
      } else {
        alert('Tạo đơn hàng thất bại!');
      }
      setShowModal(false);
      setNewOrder({ pickup: '', delivery: '', weight: '', receiverId: '' });
    } catch (e) {
      alert('Lỗi khi tạo đơn hàng!');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modern-dashboard">
      <Header />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="header-left">
            <h1 className="page-title">👤 Dashboard Khách Hàng</h1>
            <p className="page-subtitle">Xin chào, {currentUser?.name}</p>
          </div>
          <div className="header-right">
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <span>➕</span> Tạo đơn hàng mới
            </button>
          </div>
        </div>

        <div className="dashboard-content-alt">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{background: '#3498db'}}>📦</div>
              <div className="stat-details">
                <div className="stat-label">Tổng đơn hàng</div>
                <div className="stat-value">{userOrders.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background: '#f39c12'}}>⏳</div>
              <div className="stat-details">
                <div className="stat-label">Đang xử lý</div>
                <div className="stat-value">{userOrders.filter(o => o.status === 'pending').length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background: '#27ae60'}}>✅</div>
              <div className="stat-details">
                <div className="stat-label">Hoàn thành</div>
                <div className="stat-value">{userOrders.filter(o => o.status === 'delivered').length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background: '#e74c3c'}}>⚖️</div>
              <div className="stat-details">
                <div className="stat-label">Tổng khối lượng</div>
                <div className="stat-value">{userOrders.reduce((sum, o) => sum + (o.weight || 0), 0)} kg</div>
              </div>
            </div>
          </div>

          <div className="content-grid">
            {/* Map Section */}
            <div className="content-card map-card">
              <div className="card-header">
                <h2 className="card-title">🗺️ Bản đồ đơn hàng</h2>
              </div>
              <div className="card-body" style={{padding: 0}}>
                {renderMap()}
              </div>
            </div>

            {/* Orders List Section */}
            <div className="content-card">
              <div className="card-header">
                <h2 className="card-title">📋 Đơn hàng của tôi</h2>
              </div>
              <div className="card-body">
                {userOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p className="empty-text">Chưa có đơn hàng nào</p>
                    <p className="empty-subtext">Nhấn "Tạo đơn hàng mới" để bắt đầu</p>
                  </div>
                ) : (
                  <div className="orders-list">
                    {userOrders.map(order => {
                      const routeInfo = getOrderRouteInfo(order.id);
                      const statusColors = {
                        pending: '#f39c12',
                        processing: '#3498db',
                        delivered: '#27ae60',
                        cancelled: '#e74c3c'
                      };
                      const statusLabels = {
                        pending: 'Chờ xử lý',
                        processing: 'Đang giao',
                        delivered: 'Đã giao',
                        cancelled: 'Đã hủy'
                      };
                      return (
                        <div key={order.id} className="order-card">
                          <div className="order-header">
                            <div className="order-title">
                              <span className="order-icon">📦</span>
                              <span className="order-id">Đơn hàng #{order.id}</span>
                            </div>
                            <span className="status-badge" style={{
                              background: `${statusColors[order.status] || '#95a5a6'}20`,
                              color: statusColors[order.status] || '#95a5a6',
                              border: `1px solid ${statusColors[order.status] || '#95a5a6'}40`
                            }}>
                              {statusLabels[order.status] || order.status}
                            </span>
                          </div>
                          
                          <div className="order-details">
                            <div className="detail-row">
                              <span className="detail-icon">⚖️</span>
                              <span className="detail-label">Trọng lượng:</span>
                              <span className="detail-value">{order.weight}kg</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-icon">📍</span>
                              <span className="detail-label">Điểm nhận:</span>
                              <span className="detail-value">[{order.pickup[0].toFixed(4)}, {order.pickup[1].toFixed(4)}]</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-icon">🎯</span>
                              <span className="detail-label">Điểm giao:</span>
                              <span className="detail-value">[{order.delivery[0].toFixed(4)}, {order.delivery[1].toFixed(4)}]</span>
                            </div>
                            
                            {routeInfo && (
                              <>
                                <div className="divider"></div>
                                <div className="detail-row">
                                  <span className="detail-icon">🚚</span>
                                  <span className="detail-label">Tài xế:</span>
                                  <span className="detail-value">{routeInfo.driverName}</span>
                                </div>
                                {routeInfo.pickupTime && (
                                  <div className="detail-row">
                                    <span className="detail-icon">⏰</span>
                                    <span className="detail-label">Đến điểm nhận:</span>
                                    <span className="detail-value">{routeInfo.pickupTime} phút</span>
                                  </div>
                                )}
                                {routeInfo.deliveryTime && (
                                  <div className="detail-row">
                                    <span className="detail-icon">⏱️</span>
                                    <span className="detail-label">Đến điểm giao:</span>
                                    <span className="detail-value">{routeInfo.deliveryTime} phút</span>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {order.route && Array.isArray(order.route) && order.route.length > 1 && (
                              <div className="route-optimized">
                                <span className="check-icon">✓</span>
                                Đã tối ưu lộ trình
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tạo đơn hàng mới">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Điểm nhận (lat,lng)" value={newOrder.pickup} readOnly style={{ flex: 1 }} />
            <button onClick={() => { setPickMode('pickup'); setPickLabel('điểm nhận'); setShowPickModal(true); }} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0 12px', fontWeight: 600, cursor: 'pointer' }}>Chọn trên bản đồ</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Điểm giao (lat,lng)" value={newOrder.delivery} readOnly style={{ flex: 1 }} />
            <button onClick={() => { setPickMode('delivery'); setPickLabel('điểm giao'); setShowPickModal(true); }} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0 12px', fontWeight: 600, cursor: 'pointer' }}>Chọn trên bản đồ</button>
          </div>
          <input placeholder="Khối lượng (kg)" type="number" value={newOrder.weight} onChange={e => setNewOrder({ ...newOrder, weight: e.target.value })} />
          <input placeholder="ID người nhận" type="number" value={newOrder.receiverId || ''} onChange={e => setNewOrder({ ...newOrder, receiverId: e.target.value })} />
          <button onClick={handleCreateOrder} disabled={creating} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Tạo đơn hàng</button>
        </div>
      </Modal>
      <LocationPickerModal
        isOpen={showPickModal}
        onClose={() => setShowPickModal(false)}
        label={pickLabel}
        onPick={latlng => {
          if (pickMode === 'pickup') setNewOrder(o => ({ ...o, pickup: latlng.join(',') }));
          if (pickMode === 'delivery') setNewOrder(o => ({ ...o, delivery: latlng.join(',') }));
          setPickMode(null);
        }}
      />
    </div>
  );
}

export default UserPage;
