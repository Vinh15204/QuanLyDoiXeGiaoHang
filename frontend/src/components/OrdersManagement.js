import React, { useState, useEffect } from 'react';
import { useRoute } from '../contexts/RouteContext';
import '../styles/Admin.css';
import Modal from './Modal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const OSRM_URL = 'http://router.project-osrm.org/route/v1/driving/';

function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [directDistance, setDirectDistance] = useState(null);
  const [routingDistance, setRoutingDistance] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editData, setEditData] = useState({});
  const { optimizedRoutes, optimizationStats } = useRoute();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      calculateRouteDistance(selectedOrder.pickup, selectedOrder.delivery);
    } else {
      setDirectDistance(null);
      setRoutingDistance(null);
    }
  }, [selectedOrder]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/orders`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError('Lỗi khi tải dữ liệu đơn hàng: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getOrderAssignment = (orderId) => {
    if (!optimizedRoutes) return null;
    return optimizedRoutes.find(route => 
      route.assignedOrders.includes(orderId)
    );
  };

  const handleOrderSelect = (order) => {
    setSelectedOrder(order.id === selectedOrder?.id ? null : order);
  };

  const calculateHaversineDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2[0] - point1[0]) * Math.PI / 180;
    const dLon = (point2[1] - point1[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
  };

  const calculateRouteDistance = async (pickup, delivery) => {
    try {
      // Calculate direct (Haversine) distance
      const haversineDistance = calculateHaversineDistance(pickup, delivery);
      setDirectDistance(haversineDistance);

      // Calculate real route distance using OSRM
      const coords = `${delivery[1]},${delivery[0]};${pickup[1]},${pickup[0]}`;
      const response = await fetch(`${OSRM_URL}${coords}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const distance = (data.routes[0].distance / 1000).toFixed(2); // Convert to km
        const duration = Math.round(data.routes[0].duration / 60); // Convert to minutes
        setRoutingDistance({ distance, duration });
      }
    } catch (err) {
      console.error('Error calculating route distance:', err);
      setRoutingDistance(null);
    }
  };

  const renderDetailPanel = () => {
    if (!selectedOrder) {
      return (
        <div className="detail-section empty">
          Chọn một đơn hàng để xem chi tiết
        </div>
      );
    }

    const assignment = getOrderAssignment(selectedOrder.id);

    return (
      <div className="detail-section">
        <h3>Chi tiết đơn hàng #{selectedOrder.id}</h3>
        
        <div className="detail-group">
          <h4>Thông tin cơ bản</h4>
          <div className="detail-row">
            <span className="detail-label">Trạng thái:</span>
            <span className={`detail-value status-badge ${assignment ? 'status-active' : 'status-pending'}`}>
              {assignment ? 'Đã phân công' : 'Chờ phân công'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Trọng lượng:</span>
            <span className="detail-value">{selectedOrder.weight}kg</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Khoảng cách đường chim bay:</span>
            <span className="detail-value">{directDistance}km</span>
          </div>
          {routingDistance && (
            <>
              <div className="detail-row">
                <span className="detail-label">Quãng đường thực tế:</span>
                <span className="detail-value">{routingDistance.distance}km</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Thời gian di chuyển dự kiến:</span>
                <span className="detail-value">{routingDistance.duration} phút</span>
              </div>
            </>
          )}
        </div>

        <div className="detail-group">
          <h4>Thông tin người gửi</h4>
          <div className="detail-row">
            <span className="detail-label">Mã người gửi:</span>
            <span className="detail-value">#{selectedOrder.senderId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Vị trí lấy hàng:</span>
            <span className="detail-value">
              [{selectedOrder.pickup[0].toFixed(4)}, {selectedOrder.pickup[1].toFixed(4)}]
            </span>
          </div>
        </div>

        <div className="detail-group">
          <h4>Thông tin người nhận</h4>
          <div className="detail-row">
            <span className="detail-label">Mã người nhận:</span>
            <span className="detail-value">#{selectedOrder.receiverId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Vị trí giao hàng:</span>
            <span className="detail-value">
              [{selectedOrder.delivery[0].toFixed(4)}, {selectedOrder.delivery[1].toFixed(4)}]
            </span>
          </div>
        </div>

        {assignment && (
          <div className="detail-group">
            <h4>Thông tin vận chuyển</h4>
            <div className="detail-row">
              <span className="detail-label">Xe được phân công:</span>
              <span className="detail-value">#{assignment.vehicleId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Vị trí trong lộ trình:</span>
              <span className="detail-value">
                {assignment.assignedOrders.indexOf(selectedOrder.id) + 1}/{assignment.assignedOrders.length}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Quãng đường lộ trình:</span>
              <span className="detail-value">{assignment.distance.toFixed(2)}km</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Thời gian dự kiến:</span>
              <span className="detail-value">{assignment.duration.toFixed(0)} phút</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Xóa đơn hàng
  const handleDelete = async (id) => {
    id = Number(id);
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setOrders(os => os.filter(o => o.id !== id));
        if (selectedOrder?.id === id) setSelectedOrder(null);
      } else {
        alert('Xóa đơn hàng thất bại! Đơn hàng không tồn tại hoặc đã bị xóa.');
      }
    } catch (err) {
      alert('Xóa đơn hàng thất bại!');
    }
  };

  // Sửa đơn hàng
  const handleEdit = (order) => {
    setEditOrder(order);
    setEditData({ ...order });
  };
  const handleEditSave = async () => {
    const id = Number(editOrder.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(os => os.map(o => o.id === updated.id ? updated : o));
        setEditOrder(null);
      } else {
        alert('Cập nhật đơn hàng thất bại! Đơn hàng không tồn tại hoặc đã bị xóa.');
      }
    } catch (e) {
      alert('Lỗi khi cập nhật đơn hàng!');
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="management-container">
      <div className="list-section">
        <h2>Quản lý đơn hàng</h2>
        {optimizationStats && (
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Đơn hàng được phân công:</span>
              <span className="stat-value">{optimizationStats.assignedOrders} / {optimizationStats.totalOrders}</span>
            </div>
          </div>
        )}
        <div className="orders-grid">
          {orders.map(order => {
            const assignment = getOrderAssignment(order.id);
            return (
              <div 
                key={order.id} 
                className={`order-card ${order.id === selectedOrder?.id ? 'selected' : ''}`}
                onClick={() => handleOrderSelect(order)}
              >
                <div className="order-header">
                  <h3>Đơn hàng #{order.id}</h3>
                  <div className={`status-badge ${assignment ? 'status-active' : 'status-pending'}`}>
                    {assignment ? 'Đã phân công' : 'Chờ phân công'}
                  </div>
                </div>
                <div className="order-details">
                  <div className="detail-item">
                    <span className="detail-label">Trọng lượng:</span>
                    <span className="detail-value">{order.weight}kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Người gửi:</span>
                    <span className="detail-value">#{order.senderId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Người nhận:</span>
                    <span className="detail-value">#{order.receiverId}</span>
                  </div>
                  {assignment && (
                    <div className="detail-item">
                      <span className="detail-label">Xe phân công:</span>
                      <span className="detail-value">#{assignment.vehicleId}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={e => { e.stopPropagation(); handleEdit(order); }} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Sửa</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(order.id); }} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Xóa</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {renderDetailPanel()}
      {/* Modal sửa đơn hàng */}
      <Modal isOpen={!!editOrder} onClose={() => setEditOrder(null)} title="Sửa thông tin đơn hàng">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Khối lượng (kg):
            <input value={editData.weight || ''} type="number" placeholder="Khối lượng" onChange={e => setEditData(d => ({ ...d, weight: Number(e.target.value) }))} />
          </label>
          <label>
            ID người gửi:
            <input value={editData.senderId || ''} type="number" placeholder="ID người gửi" onChange={e => setEditData(d => ({ ...d, senderId: Number(e.target.value) }))} />
          </label>
          <label>
            ID người nhận:
            <input value={editData.receiverId || ''} type="number" placeholder="ID người nhận" onChange={e => setEditData(d => ({ ...d, receiverId: Number(e.target.value) }))} />
          </label>
          <label>
            Vĩ độ điểm nhận:
            <input value={editData.pickup ? editData.pickup[0] : ''} type="number" placeholder="Vĩ độ nhận" onChange={e => setEditData(d => ({ ...d, pickup: [Number(e.target.value), d.pickup ? d.pickup[1] : 0] }))} />
          </label>
          <label>
            Kinh độ điểm nhận:
            <input value={editData.pickup ? editData.pickup[1] : ''} type="number" placeholder="Kinh độ nhận" onChange={e => setEditData(d => ({ ...d, pickup: [d.pickup ? d.pickup[0] : 0, Number(e.target.value)] }))} />
          </label>
          <label>
            Vĩ độ điểm giao:
            <input value={editData.delivery ? editData.delivery[0] : ''} type="number" placeholder="Vĩ độ giao" onChange={e => setEditData(d => ({ ...d, delivery: [Number(e.target.value), d.delivery ? d.delivery[1] : 0] }))} />
          </label>
          <label>
            Kinh độ điểm giao:
            <input value={editData.delivery ? editData.delivery[1] : ''} type="number" placeholder="Kinh độ giao" onChange={e => setEditData(d => ({ ...d, delivery: [d.delivery ? d.delivery[0] : 0, Number(e.target.value)] }))} />
          </label>
          <button onClick={handleEditSave} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Lưu</button>
        </div>
      </Modal>
    </div>
  );
}

export default OrdersManagement;
