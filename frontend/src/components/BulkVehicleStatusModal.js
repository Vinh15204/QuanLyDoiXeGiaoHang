import React, { useState } from 'react';
import '../styles/ModernDashboard.css';

function BulkVehicleStatusModal({ isOpen, onClose, onConfirm, selectedCount }) {
    const [newStatus, setNewStatus] = useState('available');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(newStatus);
    };

    const statusOptions = [
        { value: 'available', label: '✅ Available', color: '#22c55e' },
        { value: 'in_use', label: '🚚 In Use', color: '#3b82f6' },
        { value: 'maintenance', label: '🔧 Maintenance', color: '#f59e0b' }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content bulk-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Đổi trạng thái {selectedCount} xe</h3>
                    <button className="close-btn" onClick={onClose}>❌</button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Chọn trạng thái mới:</label>
                        <select 
                            className="form-select"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            autoFocus
                        >
                            {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Preview */}
                    <div className="status-preview" style={{
                        marginTop: '20px',
                        padding: '15px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{fontSize: '14px', color: '#64748b', marginBottom: '8px'}}>
                            Xem trước trạng thái mới:
                        </div>
                        <div style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            background: statusOptions.find(s => s.value === newStatus)?.color || '#22c55e',
                            color: 'white'
                        }}>
                            {statusOptions.find(s => s.value === newStatus)?.label}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-outline" onClick={onClose}>Hủy</button>
                    <button className="btn-primary" onClick={handleConfirm}>
                        ✅ Xác nhận đổi {selectedCount} xe
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BulkVehicleStatusModal;
