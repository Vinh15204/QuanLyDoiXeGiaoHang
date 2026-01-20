import React from 'react';
import '../styles/ModernDashboard.css';

function BulkActionToolbar({ 
    selectedCount, 
    onClear, 
    onAssignDriver, 
    onChangeStatus, 
    onChangeRole,
    onDelete,
    loading,
    hideAssignDriver = false,
    hideDelete = false,
    hideChangeStatus = false
}) {
    if (selectedCount === 0) return null;

    return (
        <div className="bulk-action-toolbar">
            <div className="bulk-selection-info">
                <span className="bulk-selection-count">
                    <strong>{selectedCount}</strong> đơn hàng đã chọn
                </span>
                <button 
                    className="bulk-clear-btn" 
                    onClick={onClear}
                    disabled={loading}
                >
                    ✕ Bỏ chọn
                </button>
            </div>
            
            <div className="bulk-actions-group">
                {!hideAssignDriver && (
                    <button 
                        className="bulk-action-btn assign"
                        onClick={onAssignDriver}
                        disabled={loading}
                        title="Gán tài xế cho các đơn đã chọn"
                    >
                        <span className="btn-icon">👤</span>
                        Gán tài xế
                    </button>
                )}
                
                {!hideChangeStatus && (
                    <button 
                        className="bulk-action-btn status"
                        onClick={onChangeStatus}
                        disabled={loading}
                        title="Thay đổi trạng thái các đơn đã chọn"
                    >
                        <span className="btn-icon">📦</span>
                        Đổi trạng thái
                    </button>
                )}
                
                {onChangeRole && (
                    <button 
                        className="bulk-action-btn role"
                        onClick={onChangeRole}
                        disabled={loading}
                        title="Đổi vai trò cho các người dùng đã chọn"
                    >
                        <span className="btn-icon">👥</span>
                        Đổi vai trò
                    </button>
                )}
                
                {!hideDelete && (
                    <button 
                        className="bulk-action-btn delete"
                        onClick={onDelete}
                        disabled={loading}
                        title="Xóa các đơn đã chọn"
                    >
                        <span className="btn-icon">🗑️</span>
                        Xóa
                    </button>
                )}
            </div>
            
            {loading && (
                <div className="bulk-loading">
                    <span className="spinner">⏳</span> Đang xử lý...
                </div>
            )}
        </div>
    );
}

export default BulkActionToolbar;
