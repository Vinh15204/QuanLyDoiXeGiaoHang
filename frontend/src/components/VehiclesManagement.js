import React, { useState, useEffect } from 'react';
import { useRoute } from '../contexts/RouteContext';
import '../styles/Admin.css';
import Modal from './Modal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function VehiclesManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editVehicle, setEditVehicle] = useState(null);
  const [editData, setEditData] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const { optimizedRoutes, optimizationStats, orders: routeOrders } = useRoute();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/vehicles`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      setError('Lỗi khi tải dữ liệu xe: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getVehicleRoute = (vehicleId) => {
    if (!optimizedRoutes) return null;
    return optimizedRoutes.find(route => route.vehicleId === vehicleId);
  };

  // Lấy thông tin vehicle_summaries từ kết quả tối ưu (nếu có)
  const getVehicleSummary = (vehicleId) => {
    if (!optimizationStats || !optimizationStats.vehicle_summaries) return null;
    return optimizationStats.vehicle_summaries.find(vs => String(vs.vehicle_id) === String(vehicleId));
  };

  // Lấy dữ liệu lộ trình (route) cho từng xe từ optimizedRoutes
  const getVehicleRouteDetail = (vehicleId) => {
    if (!optimizedRoutes) return [];
    const vehicleRoute = optimizedRoutes.find(r => String(r.vehicleId) === String(vehicleId));
    if (!vehicleRoute || !vehicleRoute.stops) return [];

    // Dùng trực tiếp stops từ vehicleRoute (đã lưu trong db)
    return vehicleRoute.stops.map(stop => ({
      type: stop.type,
      order_id: stop.orderId,
      point: stop.point,
      distance_from_prev_km: 0  // TODO: Có thể tính lại khoảng cách giữa các điểm nếu cần
    }));
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle.id === selectedVehicle?.id ? null : vehicle);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa xe này?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/vehicles/${id}`, { method: 'DELETE' });
      setVehicles(vs => vs.filter(v => v.id !== id));
      if (selectedVehicle?.id === id) setSelectedVehicle(null);
    } catch (err) {
      alert('Xóa xe thất bại!');
    }
  };

  // Sửa xe
  const handleEdit = (vehicle) => {
    setEditVehicle(vehicle);
    setEditData({ ...vehicle });
  };
  const handleEditSave = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/vehicles/${editVehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (res.ok) {
        const updated = await res.json();
        setVehicles(vs => vs.map(v => v.id === updated.id ? updated : v));
        setEditVehicle(null);
      } else {
        alert('Cập nhật xe thất bại!');
      }
    } catch (e) {
      alert('Lỗi khi cập nhật xe!');
    }
  };

  const renderDetailPanel = () => {
    if (!selectedVehicle) {
      return (
        <div className="detail-section empty">
          Chọn một xe để xem chi tiết
        </div>
      );
    }

    const vehicleRoute = getVehicleRoute(selectedVehicle.id);
    const vehicleSummary = getVehicleSummary(selectedVehicle.id);
    const routeDetail = getVehicleRouteDetail(selectedVehicle.id);

    // Dùng thông tin trực tiếp từ vehicleRoute và stops
    const distance = vehicleRoute ? vehicleRoute.distance : 0;
    const numOrders = vehicleRoute ? vehicleRoute.assignedOrders?.length || 0 : 0;
    const moveTime = vehicleRoute ? vehicleRoute.stats?.moveTime || (distance / 30 * 60) : 0;
    const stopTime = vehicleRoute ? vehicleRoute.stats?.stopTime || (numOrders * 10) : 0;
    const totalTime = vehicleRoute ? vehicleRoute.stats?.totalTime || (moveTime + stopTime) : 0;
    const loadRatio = vehicleRoute ? vehicleRoute.stats?.loadRatio || 
      ((vehicleRoute.totalWeight || 0) / selectedVehicle.maxLoad * 100).toFixed(1) : 0;
    const numStops = routeDetail ? routeDetail.length : 0;

    return (
      <div className="detail-section">
        <h3>Chi tiết xe #{selectedVehicle.id}</h3>
        
        <div className="detail-group">
          <h4>Thông tin cơ bản</h4>
          <div className="detail-row">
            <span className="detail-label">Trạng thái:</span>
            <span className={`detail-value status-badge ${vehicleRoute ? 'status-active' : 'status-inactive'}`}>
              {vehicleRoute ? 'Đã phân công' : 'Chưa phân công'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Tải trọng tối đa:</span>
            <span className="detail-value">{selectedVehicle.maxLoad}kg</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Vị trí hiện tại:</span>
            <span className="detail-value">
              [{selectedVehicle.position[0].toFixed(4)}, {selectedVehicle.position[1].toFixed(4)}]
            </span>
          </div>
        </div>

        {vehicleRoute && (
          <>
            <div className="detail-group">
              <h4>Thông tin lộ trình</h4>
              <div className="detail-row">
                <span className="detail-label">Số đơn hàng:</span>
                <span className="detail-value">{numOrders}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Quãng đường:</span>
                <span className="detail-value">{distance.toFixed(2)}km</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Thời gian dự kiến:</span>
                <span className="detail-value">{Math.round(totalTime)} phút</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tỷ lệ tải trọng:</span>
                <span className="detail-value">{loadRatio}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tổng điểm dừng:</span>
                <span className="detail-value">{numStops}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Thời gian dừng đỗ:</span>
                <span className="detail-value">{Math.round(stopTime)} phút</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Thời gian di chuyển:</span>
                <span className="detail-value">{Math.round(moveTime)} phút</span>
              </div>
            </div>

            <div className="detail-group">
              <h4>Chi tiết lộ trình</h4>
              {routeDetail && routeDetail.length > 0 ? (
                routeDetail.map((stop, idx) => (
                  <div key={idx} className="route-step">
                    <div className="step-number">{idx + 1}</div>
                    <div className="step-description">
                      {stop.type === 'depot' && `[Xuất phát] từ [${stop.point[0].toFixed(4)}, ${stop.point[1].toFixed(4)}]`}
                      {stop.type === 'pickup' && `[Nhận] đơn #${stop.order_id} tại [${stop.point[0].toFixed(4)}, ${stop.point[1].toFixed(4)}]`}
                      {stop.type === 'delivery' && `[Giao] đơn #${stop.order_id} tại [${stop.point[0].toFixed(4)}, ${stop.point[1].toFixed(4)}]`}
                    </div>
                  </div>
                ))
              ) : (
                <div>Không có dữ liệu lộ trình.</div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="management-container">
      <div className="list-section">
        <h2>Quản lý đội xe</h2>
        <button onClick={fetchVehicles} style={{marginBottom: 12, background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, fontSize: 15, cursor: 'pointer'}}>Làm mới</button>
        {optimizationStats && (
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Xe được phân công:</span>
              <span className="stat-value">{optimizationStats.vehiclesWithRoutes} / {optimizationStats.totalVehicles}</span>
            </div>
          </div>
        )}
        <div className="vehicles-grid">
          {vehicles.map(vehicle => {
            const vehicleRoute = getVehicleRoute(vehicle.id);
            return (
              <div 
                key={vehicle.id} 
                className={`vehicle-card ${vehicle.id === selectedVehicle?.id ? 'selected' : ''}`}
                onClick={() => handleVehicleSelect(vehicle)}
              >
                <div className="vehicle-header">
                  <h3>Xe #{vehicle.id}</h3>
                  <div className={`status-badge ${vehicleRoute ? 'status-active' : 'status-inactive'}`}>
                    {vehicleRoute ? 'Đã phân công' : 'Chưa phân công'}
                  </div>
                </div>
                <div className="vehicle-details">
                  <div className="detail-item">
                    <span className="detail-label">Tải trọng tối đa:</span>
                    <span className="detail-value">{vehicle.maxLoad}kg</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Vị trí hiện tại:</span>
                    <span className="detail-value">
                      [{vehicle.position[0].toFixed(4)}, {vehicle.position[1].toFixed(4)}]
                    </span>
                  </div>
                  {vehicleRoute && (
                    <>
                      <div className="detail-item">
                        <span className="detail-label">Số đơn hàng:</span>
                        <span className="detail-value">{vehicleRoute.assignedOrders.length}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Quãng đường:</span>
                        <span className="detail-value">{vehicleRoute.distance.toFixed(2)}km</span>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={e => { e.stopPropagation(); handleEdit(vehicle); }} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Sửa</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(vehicle.id); }} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>Xóa</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {renderDetailPanel()}
      {/* Modal sửa xe */}
      <Modal isOpen={!!editVehicle} onClose={() => setEditVehicle(null)} title="Sửa thông tin xe">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Tải trọng tối đa (kg):
            <input value={editData.maxLoad || ''} type="number" placeholder="Tải trọng tối đa" onChange={e => setEditData(d => ({ ...d, maxLoad: Number(e.target.value) }))} />
          </label>
          <label>
            Vĩ độ vị trí hiện tại:
            <input value={editData.position ? editData.position[0] : ''} type="number" placeholder="Vĩ độ" onChange={e => setEditData(d => ({ ...d, position: [Number(e.target.value), d.position ? d.position[1] : 0] }))} />
          </label>
          <label>
            Kinh độ vị trí hiện tại:
            <input value={editData.position ? editData.position[1] : ''} type="number" placeholder="Kinh độ" onChange={e => setEditData(d => ({ ...d, position: [d.position ? d.position[0] : 0, Number(e.target.value)] }))} />
          </label>
          <button onClick={handleEditSave} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Lưu</button>
        </div>
      </Modal>
    </div>
  );
}

export default VehiclesManagement;
