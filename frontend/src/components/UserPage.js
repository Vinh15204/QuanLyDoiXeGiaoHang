import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import signalRService from '../services/signalRService';
import usersFlat from '../data/users_flat.json';
import { useRoute } from '../contexts/RouteContext';
import Modal from './Modal';
import "leaflet/dist/leaflet.css";
import '../utils/mapIcons';
import Header from './Header';
import '../styles/User.css';
import '../styles/ModernDashboard.css';
import API_URL from '../config';

const HANOI_CENTER = [21.0285, 105.8542];

function LocationPickerModal({ isOpen, onClose, onPick, label }) {
  const [picked, setPicked] = useState(null);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chß╗ìn ${label} tr├¬n bß║ún ─æß╗ô`}>
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
      <button onClick={() => { if (picked) { onPick(picked); onClose(); } }} disabled={!picked} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: picked ? 'pointer' : 'not-allowed', width: '100%' }}>X├íc nhß║¡n</button>
    </Modal>
  );
}

function LocationPicker({ onPick, markerPosition, label }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    }
  });
  // Chß╗ë render Marker nß║┐u markerPosition l├á mß║úng hß╗úp lß╗ç
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
  const [loading, setLoading] = useState(true);

  // Lấy đơn hàng của user từ API
  const fetchUserOrders = async (userId) => {
    try {
      setLoading(true);
      // Gọi API với parameter userId để lấy orders mà user là sender HOẶC receiver
      const response = await fetch(`${API_URL}/api/orders?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const orders = await response.json();
      
      console.log('Fetched orders for user', userId, ':', orders.length);
      console.log('Orders:', orders);
      setUserOrders(orders);
    } catch (error) {
      console.error('Error fetching user orders:', error);
      setUserOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra đăng nhập khi mount
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    console.log('localStorage currentUser:', userStr);
    
    if (!userStr || JSON.parse(userStr).role !== 'user') {
      setShouldRedirect(true);
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    
    const userId = Number(user.id);
    console.log('Current User:', user);
    console.log('Current User ID:', userId, 'Type:', typeof userId);
    console.log('API URL:', API_URL);
    console.log('Calling API:', `${API_URL}/api/orders?userId=${userId}`);
    
    // Lấy đơn hàng từ API
    fetchUserOrders(userId);

    // Đăng ký nhận cập nhật đơn hàng qua signalR
    signalRService.registerUser(user.id);

    // Cleanup
    return () => {
      // signalRService.unregisterUser(user.id);
    };
  }, []);

  // Chß╗ë navigate khi shouldRedirect ─æß╗òi sang true
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
        {userOrders.map(order => {
          const orderId = order._id || order.id;
          return (
          <React.Fragment key={orderId}>
            {Array.isArray(order.pickup) && order.pickup.length === 2 && order.pickup.every(x => typeof x === 'number' && !isNaN(x)) && (
              <Marker position={order.pickup}>
                <Popup>
                  <div>
                    <h4>─Éiß╗âm nhß║¡n h├áng</h4>
                    <p>─É╞ín h├áng #{orderId}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {Array.isArray(order.delivery) && order.delivery.length === 2 && order.delivery.every(x => typeof x === 'number' && !isNaN(x)) && (
              <Marker position={order.delivery}>
                <Popup>
                  <div>
                    <h4>─Éiß╗âm giao h├áng</h4>
                    <p>─É╞ín h├áng #{orderId}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {order.route && Array.isArray(order.route) && order.route.length > 1 && (
              <Polyline positions={order.route} color="blue" weight={3} />
            )}
          </React.Fragment>
        );
        })}
        {/* Hiß╗ân thß╗ï marker chß╗ìn ─æiß╗âm nhß║¡n/giao khi tß║ío ─æ╞ín mß╗¢i */}
        {showModal && pickMode === 'pickup' && (
          <LocationPicker
            onPick={latlng => {
              setNewOrder(o => ({ ...o, pickup: latlng.join(',') }));
              setPickMode(null);
            }}
            markerPosition={newOrder.pickup ? newOrder.pickup.split(',').map(Number) : null}
            label="─Éiß╗âm nhß║¡n mß╗¢i"
          />
        )}
        {showModal && pickMode === 'delivery' && (
          <LocationPicker
            onPick={latlng => {
              setNewOrder(o => ({ ...o, delivery: latlng.join(',') }));
              setPickMode(null);
            }}
            markerPosition={newOrder.delivery ? newOrder.delivery.split(',').map(Number) : null}
            label="─Éiß╗âm giao mß╗¢i"
          />
        )}
      </MapContainer>
    );
  };

  // H├ám lß║Ñy th├┤ng tin lß╗Ö tr├¼nh cho ─æ╞ín h├áng
  const getOrderRouteInfo = (orderId) => {
    if (!optimizedRoutes) return null;
    for (const route of optimizedRoutes) {
      if (route.assignedOrders && route.assignedOrders.includes(orderId)) {
        // T├¼m stop pickup/delivery cß╗ºa ─æ╞ín h├áng n├áy
        const pickupStop = route.stops?.find(s => s.orderId == orderId && s.type === 'pickup');
        const deliveryStop = route.stops?.find(s => s.orderId == orderId && s.type === 'delivery');
        // T├¼m t├ái xß║┐
        const driver = usersFlat.find(u => u.role === 'driver' && u.vehicleId === route.vehicleId);
        return {
          driverName: driver ? driver.name : 'Ch╞░a r├╡',
          pickupTime: pickupStop?.arrivalTime,
          deliveryTime: deliveryStop?.arrivalTime,
        };
      }
    }
    return null;
  };

  // H├ám xß╗¡ l├╜ tß║ío ─æ╞ín h├áng mß╗¢i
  const handleCreateOrder = async () => {
    setCreating(true);
    try {
      const pickupArr = newOrder.pickup.split(',').map(Number);
      const deliveryArr = newOrder.delivery.split(',').map(Number);
      // Lß║Ñy id mß╗¢i bß║»t ─æß║ºu tß╗½ 100 (t├¼m max id hiß╗çn tß║íi hoß║╖c lß║Ñy 100 nß║┐u ch╞░a c├│)
      const getNewOrderId = () => {
        const maxId = userOrders.length > 0 ? Math.max(...userOrders.map(o => o.id || 0)) : 99;
        return maxId >= 100 ? maxId + 1 : 100;
      };
      const order = {
        id: getNewOrderId(),
        senderId: Number(currentUser.id),
        receiverId: Number(newOrder.receiverId),
        pickup: pickupArr,
        delivery: deliveryArr,
        weight: Number(newOrder.weight),
        status: 'pending',
        driverId: null
      };
      // Gß╗¡i l├¬n backend
      const res = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      if (res.ok) {
        const created = await res.json();
        // Refresh lại danh sách đơn hàng từ API
        await fetchUserOrders(Number(currentUser.id));
        alert(`Tß║ío ─æ╞ín h├áng th├ánh c├┤ng! M├ú ─æ╞ín h├áng: ${created.id || created._id}`);
      } else {
        alert('Tß║ío ─æ╞ín h├áng thß║Ñt bß║íi!');
      }
      setShowModal(false);
      setNewOrder({ pickup: '', delivery: '', weight: '', receiverId: '' });
    } catch (e) {
      alert('Lß╗ùi khi tß║ío ─æ╞ín h├áng!');
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
            <h1 className="page-title">≡ƒæñ Dashboard Kh├ích H├áng</h1>
            <p className="page-subtitle">Xin ch├áo, {currentUser?.name}</p>
          </div>
          <div className="header-right">
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <span>Γ₧ò</span> Tß║ío ─æ╞ín h├áng mß╗¢i
            </button>
          </div>
        </div>

        <div className="dashboard-content-alt">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{background: '#3498db'}}>≡ƒôª</div>
              <div className="stat-details">
                <div className="stat-label">Tß╗òng ─æ╞ín h├áng</div>
                <div className="stat-value">{userOrders.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background: '#f39c12'}}>ΓÅ│</div>
              <div className="stat-details">
                <div className="stat-label">─Éang xß╗¡ l├╜</div>
                <div className="stat-value">{userOrders.filter(o => o.status === 'pending').length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background: '#27ae60'}}>Γ£à</div>
              <div className="stat-details">
                <div className="stat-label">Ho├án th├ánh</div>
                <div className="stat-value">{userOrders.filter(o => o.status === 'delivered').length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{background: '#e74c3c'}}>ΓÜû∩╕Å</div>
              <div className="stat-details">
                <div className="stat-label">Tß╗òng khß╗æi l╞░ß╗úng</div>
                <div className="stat-value">{userOrders.reduce((sum, o) => sum + (o.weight || 0), 0)} kg</div>
              </div>
            </div>
          </div>

          <div className="content-grid">
            {/* Map Section */}
            <div className="content-card map-card">
              <div className="card-header">
                <h2 className="card-title">≡ƒù║∩╕Å Bß║ún ─æß╗ô ─æ╞ín h├áng</h2>
              </div>
              <div className="card-body" style={{padding: 0}}>
                {renderMap()}
              </div>
            </div>

            {/* Orders List Section */}
            <div className="content-card">
              <div className="card-header">
                <h2 className="card-title">≡ƒôï ─É╞ín h├áng cß╗ºa t├┤i</h2>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="empty-state">
                    <div className="empty-icon">⏳</div>
                    <p className="empty-text">Đang tải đơn hàng...</p>
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">≡ƒô¡</div>
                    <p className="empty-text">Ch╞░a c├│ ─æ╞ín h├áng n├áo</p>
                    <p className="empty-subtext">Nhß║Ñn "Tß║ío ─æ╞ín h├áng mß╗¢i" ─æß╗â bß║»t ─æß║ºu</p>
                  </div>
                ) : (
                  <div className="orders-list">
                    {userOrders.map(order => {
                      const orderId = order._id || order.id;
                      const routeInfo = getOrderRouteInfo(orderId);
                      
                      // Xác định vai trò của user
                      const isSender = Number(order.senderId) === Number(currentUser?.id);
                      const isReceiver = Number(order.receiverId) === Number(currentUser?.id);
                      const userRole = isSender ? 'Người gửi' : (isReceiver ? 'Người nhận' : 'Không xác định');
                      const roleIcon = isSender ? '📤' : '📥';
                      const roleColor = isSender ? '#3498db' : '#27ae60';
                      
                      // Tìm thông tin tài xế
                      const driver = order.driverId ? usersFlat.find(u => u.id === order.driverId && u.role === 'driver') : null;
                      const driverName = driver ? driver.name : (order.driverId ? `Tài xế #${order.driverId}` : 'Chưa phân công');
                      
                      const statusColors = {
                        pending: '#f39c12',
                        assigned: '#9b59b6',
                        processing: '#3498db',
                        delivered: '#27ae60',
                        cancelled: '#e74c3c'
                      };
                      const statusLabels = {
                        pending: 'Chờ xử lý',
                        assigned: 'Đã phân công',
                        processing: 'Đang giao',
                        delivered: 'Đã giao',
                        cancelled: 'Đã hủy'
                      };
                      return (
                        <div key={orderId} className="order-card">
                          <div className="order-header">
                            <div className="order-title">
                              <span className="order-icon">📦</span>
                              <span className="order-id">Đơn hàng #{orderId}</span>
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
                            {/* Vai trò của user */}
                            <div className="detail-row" style={{ 
                              background: `${roleColor}10`, 
                              padding: '8px 12px', 
                              borderRadius: '6px',
                              marginBottom: '8px'
                            }}>
                              <span className="detail-icon">{roleIcon}</span>
                              <span className="detail-label" style={{ fontWeight: '700', color: roleColor }}>Vai trò:</span>
                              <span className="detail-value" style={{ fontWeight: '700', color: roleColor }}>{userRole}</span>
                            </div>
                            
                            <div className="detail-row">
                              <span className="detail-icon">⚖️</span>
                              <span className="detail-label">Trọng lượng:</span>
                              <span className="detail-value">{order.weight}kg</span>
                            </div>
                            
                            {order.pickupAddress && (
                              <div className="detail-row">
                                <span className="detail-icon">📍</span>
                                <span className="detail-label">Điểm nhận:</span>
                                <span className="detail-value">{order.pickupAddress}</span>
                              </div>
                            )}
                            
                            {order.deliveryAddress && (
                              <div className="detail-row">
                                <span className="detail-icon">🏁</span>
                                <span className="detail-label">Điểm giao:</span>
                                <span className="detail-value">{order.deliveryAddress}</span>
                              </div>
                            )}
                            
                            {/* Thông tin tài xế và thời gian */}
                            {(order.driverId || routeInfo) && (
                              <>
                                <div className="divider"></div>
                                <div className="detail-row">
                                  <span className="detail-icon">🚚</span>
                                  <span className="detail-label">Tài xế:</span>
                                  <span className="detail-value">{driverName}</span>
                                </div>
                                {routeInfo && routeInfo.pickupTime && (
                                  <div className="detail-row">
                                    <span className="detail-icon">⏱️</span>
                                    <span className="detail-label">Đến điểm nhận:</span>
                                    <span className="detail-value">{routeInfo.pickupTime} phút</span>
                                  </div>
                                )}
                                {routeInfo && routeInfo.deliveryTime && (
                                  <div className="detail-row">
                                    <span className="detail-icon">⏲️</span>
                                    <span className="detail-label">Đến điểm giao:</span>
                                    <span className="detail-value">{routeInfo.deliveryTime} phút</span>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {order.route && Array.isArray(order.route) && order.route.length > 1 && (
                              <div className="route-optimized">
                                <span className="check-icon">Γ£ô</span>
                                ─É├ú tß╗æi ╞░u lß╗Ö tr├¼nh
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
      
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tß║ío ─æ╞ín h├áng mß╗¢i">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="─Éiß╗âm nhß║¡n (lat,lng)" value={newOrder.pickup} readOnly style={{ flex: 1 }} />
            <button onClick={() => { setPickMode('pickup'); setPickLabel('─æiß╗âm nhß║¡n'); setShowPickModal(true); }} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0 12px', fontWeight: 600, cursor: 'pointer' }}>Chß╗ìn tr├¬n bß║ún ─æß╗ô</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="─Éiß╗âm giao (lat,lng)" value={newOrder.delivery} readOnly style={{ flex: 1 }} />
            <button onClick={() => { setPickMode('delivery'); setPickLabel('─æiß╗âm giao'); setShowPickModal(true); }} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '0 12px', fontWeight: 600, cursor: 'pointer' }}>Chß╗ìn tr├¬n bß║ún ─æß╗ô</button>
          </div>
          <input placeholder="Khß╗æi l╞░ß╗úng (kg)" type="number" value={newOrder.weight} onChange={e => setNewOrder({ ...newOrder, weight: e.target.value })} />
          <input placeholder="ID ng╞░ß╗¥i nhß║¡n" type="number" value={newOrder.receiverId || ''} onChange={e => setNewOrder({ ...newOrder, receiverId: e.target.value })} />
          <button onClick={handleCreateOrder} disabled={creating} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Tß║ío ─æ╞ín h├áng</button>
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
