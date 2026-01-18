import React, { useState, useEffect } from 'react';
import '../../styles/ModernDashboard.css';
import usersFlat from '../../data/users_flat.json';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

function OrdersHistory() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, delivered, cancelled

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders?customerId=${currentUser.id}`);
            if (response.ok) {
                const data = await response.json();
                // Filter completed orders
                const completedOrders = data.filter(order => 
                    ['delivered', 'cancelled'].includes(order.status)
                );
                setOrders(completedOrders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'delivered': { text: 'Đã giao', color: '#10b981', bg: '#d1fae5', icon: '✅' },
            'cancelled': { text: 'Đã hủy', color: '#ef4444', bg: '#fee2e2', icon: '❌' }
        };
        const badge = statusMap[status] || { text: status, color: '#6b7280', bg: '#f3f4f6', icon: '❓' };
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                color: badge.color,
                background: badge.bg
            }}>
                {badge.icon} {badge.text}
            </span>
        );
    };

    const filteredOrders = orders.filter(order => {
        if (filter === 'all') return true;
        return order.status === filter;
    });

    if (loading) {
        return (
            <div className="main-content">
                <div className="loading-spinner">⏳ Đang tải...</div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <div className="top-header">
                <div className="header-left">
                    <h1>Lịch sử giao hàng</h1>
                    <p>Xem lại các đơn hàng đã hoàn thành hoặc bị hủy</p>
                </div>
                <div className="header-right" style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setFilter('all')}
                        style={{
                            padding: '10px 20px',
                            background: filter === 'all' ? '#3b82f6' : '#e5e7eb',
                            color: filter === 'all' ? 'white' : '#6b7280',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                    >
                        Tất cả ({orders.length})
                    </button>
                    <button
                        onClick={() => setFilter('delivered')}
                        style={{
                            padding: '10px 20px',
                            background: filter === 'delivered' ? '#10b981' : '#e5e7eb',
                            color: filter === 'delivered' ? 'white' : '#6b7280',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                    >
                        Đã giao ({orders.filter(o => o.status === 'delivered').length})
                    </button>
                    <button
                        onClick={() => setFilter('cancelled')}
                        style={{
                            padding: '10px 20px',
                            background: filter === 'cancelled' ? '#ef4444' : '#e5e7eb',
                            color: filter === 'cancelled' ? 'white' : '#6b7280',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                    >
                        Đã hủy ({orders.filter(o => o.status === 'cancelled').length})
                    </button>
                </div>
            </div>

            <div className="content-body">
                {filteredOrders.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: 'white',
                        borderRadius: '12px'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                        <h3 style={{ color: '#666', marginBottom: '8px' }}>Không có lịch sử</h3>
                        <p style={{ color: '#999' }}>
                            {filter === 'all' && 'Bạn chưa có đơn hàng nào hoàn thành'}
                            {filter === 'delivered' && 'Bạn chưa có đơn hàng nào đã giao thành công'}
                            {filter === 'cancelled' && 'Bạn chưa có đơn hàng nào bị hủy'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {filteredOrders.map(order => {
                            const isSender = Number(order.senderId) === Number(currentUser.id);
                            const isReceiver = Number(order.receiverId) === Number(currentUser.id);
                            const userRole = isSender ? 'Người gửi' : (isReceiver ? 'Người nhận' : 'Không xác định');
                            const roleIcon = isSender ? '📤' : '📥';
                            const roleColor = isSender ? '#3498db' : '#27ae60';
                            const driver = order.driverId ? usersFlat.find(u => u.id === order.driverId && u.role === 'driver') : null;
                            const driverName = driver ? driver.name : (order.driverId ? `Tài xế #${order.driverId}` : 'Chưa phân công');
                            
                            return (
                            <div key={order.id} style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '12px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
                                            Đơn hàng #{order.id}
                                        </h3>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                            Tạo: {new Date(order.createdAt || Date.now()).toLocaleString('vi-VN')}
                                        </p>
                                        {order.updatedAt && (
                                            <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                                Hoàn thành: {new Date(order.updatedAt).toLocaleString('vi-VN')}
                                            </p>
                                        )}
                                    </div>
                                    {getStatusBadge(order.status)}
                                </div>

                                <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                    {/* Vai trò của user */}
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '12px',
                                        background: `${roleColor}15`,
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: `2px solid ${roleColor}30`
                                    }}>
                                        <span style={{ fontSize: '20px' }}>{roleIcon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', color: roleColor, marginBottom: '2px', fontWeight: '600' }}>Vai trò</div>
                                            <div style={{ fontSize: '14px', color: roleColor, fontWeight: '700' }}>
                                                {userRole}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Thông tin người còn lại */}
                                    {(() => {
                                        const otherUserId = isSender ? order.receiverId : order.senderId;
                                        const otherUser = usersFlat.find(u => u.id === otherUserId && u.role === 'user');
                                        const otherUserName = otherUser ? otherUser.name : `User #${otherUserId}`;
                                        const relationLabel = isSender ? 'Gửi đến' : 'Nhận từ';
                                        
                                        return (
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <span style={{ fontSize: '20px' }}>👤</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>{relationLabel}</div>
                                                    <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                                                        {otherUserName}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <span style={{ fontSize: '20px' }}>📦</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Lấy hàng</div>
                                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                                                {order.pickupAddress || 'Chưa có địa chỉ'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <span style={{ fontSize: '20px' }}>🎯</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Giao hàng</div>
                                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                                                {order.deliveryAddress || 'Chưa có địa chỉ'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <span style={{ fontSize: '20px' }}>⚖️</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Khối lượng</div>
                                                <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                                                    {order.weight} kg
                                                </div>
                                            </div>
                                        </div>

                                        {order.driverId && (
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <span style={{ fontSize: '20px' }}>🚚</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Tài xế</div>
                                                    <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                                                        {driverName}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {order.notes && (
                                    <div style={{
                                        padding: '12px',
                                        background: '#f9fafb',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        color: '#6b7280'
                                    }}>
                                        💬 {order.notes}
                                    </div>
                                )}
                            </div>
                        );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default OrdersHistory;
