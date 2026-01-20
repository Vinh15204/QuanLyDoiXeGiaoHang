import React, { useState } from 'react';
import '../styles/ModernDashboard.css';

function BulkAssignDriverModal({ 
    show, 
    onClose, 
    drivers, 
    driverStats = {},
    selectedOrders,
    onAssign,
    loading 
}) {
    const [selectedDriver, setSelectedDriver] = useState('');

    const handleConfirm = () => {
        if (!selectedDriver) {
            alert('Vui lòng chọn tài xế!');
            return;
        }
        onAssign(parseInt(selectedDriver));
        setSelectedDriver('');
    };

    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content bulk-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Gán tài xế cho {selectedOrders.length} đơn hàng</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <div className="bulk-info-box">
                        <p>📦 <strong>{selectedOrders.length}</strong> đơn hàng sẽ được gán</p>
                        <p>👤 <strong>{drivers.length}</strong> tài xế</p>
                    </div>

                    <div className="form-group">
                        <label>Chọn tài xế <span className="required">*</span></label>
                        <select
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                            className="form-select"
                            disabled={loading}
                        >
                            <option value="">-- Chưa phân công --</option>
                            {drivers.map(driver => {
                                const vehicleId = driver.vehicleId || driver.id;
                                const stats = driverStats[vehicleId] || {};
                                return (
                                    <option key={driver.id} value={vehicleId}>
                                        {driver.name} (Xe #{vehicleId}) - {stats.orderCount || 0} đơn, {(stats.distance || 0).toFixed(1)}km, {(stats.weight || 0).toFixed(0)}kg
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {selectedDriver && (
                        <div className="driver-info-box">
                            <strong>ℹ️ Thông tin xe:</strong><br/>
                            {(() => {
                                const stats = driverStats[selectedDriver] || {};
                                return (
                                    <>
                                        • Số đơn hàng hiện tại: {stats.orderCount || 0}<br/>
                                        • Tổng quãng đường: {(stats.distance || 0).toFixed(2)} km<br/>
                                        • Tổng khối lượng: {(stats.weight || 0).toFixed(0)} kg
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    <div className="preview-orders">
                        <strong>Đơn hàng được chọn:</strong>
                        <div className="order-ids">
                            {selectedOrders.slice(0, 10).map(order => (
                                <span key={order.id} className="order-badge">#{order.id}</span>
                            ))}
                            {selectedOrders.length > 10 && (
                                <span className="more-badge">+{selectedOrders.length - 10} more</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button 
                        className="btn-secondary" 
                        onClick={onClose}
                        disabled={loading}
                    >
                        Hủy
                    </button>
                    <button 
                        className="btn-primary" 
                        onClick={handleConfirm}
                        disabled={!selectedDriver || loading}
                    >
                        {loading ? 'Đang xử lý...' : 'Xác nhận gán'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BulkAssignDriverModal;
