import React, { useState } from 'react';
import '../styles/ModernDashboard.css';

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Chờ xử lý', color: '#f59e0b', icon: '⏳' },
    { value: 'assigned', label: 'Đã phân công', color: '#3b82f6', icon: '👤' },
    { value: 'in_transit', label: 'Đang giao', color: '#8b5cf6', icon: '🚚' },
    { value: 'delivered', label: 'Đã giao', color: '#10b981', icon: '✅' },
    { value: 'cancelled', label: 'Đã hủy', color: '#ef4444', icon: '❌' }
];

function BulkStatusChangeModal({ 
    show, 
    onClose, 
    selectedOrders,
    onConfirm,
    loading 
}) {
    const [newStatus, setNewStatus] = useState('');

    const handleConfirm = () => {
        if (!newStatus) {
            alert('Vui lòng chọn trạng thái!');
            return;
        }
        onConfirm(newStatus);
        setNewStatus('');
    };

    if (!show) return null;

    // Check if any selected order has driver assigned
    const hasAssignedOrders = selectedOrders.some(o => o.driverId);
    const willUnassignDriver = (newStatus === 'pending' || newStatus === 'approved') && hasAssignedOrders;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content bulk-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Thay đổi trạng thái {selectedOrders.length} đơn hàng</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <div className="bulk-info-box">
                        <p>📦 <strong>{selectedOrders.length}</strong> đơn hàng sẽ được cập nhật</p>
                    </div>

                    <div className="form-group">
                        <label>Chọn trạng thái mới <span className="required">*</span></label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="form-select"
                            disabled={loading}
                        >
                            <option value="">-- Chọn trạng thái --</option>
                            {STATUS_OPTIONS.map(status => (
                                <option key={status.value} value={status.value}>
                                    {status.icon} {status.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {willUnassignDriver && (
                        <div className="warning-box" style={{ background: '#fef3c7', borderColor: '#f59e0b' }}>
                            ⚠️ <strong>Cảnh báo:</strong> Đổi về trạng thái "{STATUS_OPTIONS.find(s => s.value === newStatus)?.label}" 
                            sẽ <strong>HỦY PHÂN CÔNG TÀI XẾ</strong> và <strong>TÍNH LẠI QUÃNG ĐƯỜNG</strong> cho các tài xế có liên quan!
                        </div>
                    )}

                    <div className="preview-orders">
                        <strong>Đơn hàng được chọn:</strong>
                        <div className="order-ids">
                            {selectedOrders.slice(0, 10).map(order => (
                                <span key={order.id} className="order-badge">
                                    #{order.id} {order.driverId ? `(Driver #${order.driverId})` : ''}
                                </span>
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
                        disabled={!newStatus || loading}
                    >
                        {loading ? 'Đang xử lý...' : 'Xác nhận thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BulkStatusChangeModal;
