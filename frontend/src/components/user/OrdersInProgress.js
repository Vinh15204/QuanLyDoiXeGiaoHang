import React, { useState, useEffect } from 'react';
import '../../styles/ModernDashboard.css';
import usersFlat from '../../data/users_flat.json';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

function OrdersInProgress() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders?customerId=${currentUser.id}`);
            if (response.ok) {
                const data = await response.json();
                // Filter orders in progress (bao gồm cả pending - mới tạo chờ duyệt)
                const inProgressOrders = data.filter(order => 
                    ['pending', 'approved', 'assigned', 'in_transit', 'picked', 'delivering'].includes(order.status)
                );
                setOrders(inProgressOrders);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'pending': { text: 'Chờ duyệt', color: '#6b7280', bg: '#f3f4f6' },
            'approved': { text: 'Đã duyệt', color: '#10b981', bg: '#d1fae5' },
            'assigned': { text: 'Đã phân công', color: '#3b82f6', bg: '#dbeafe' },
            'in_transit': { text: 'Đang lấy hàng', color: '#f59e0b', bg: '#fef3c7' },
            'picked': { text: 'Đã lấy hàng', color: '#8b5cf6', bg: '#ede9fe' },
            'delivering': { text: 'Đang giao', color: '#ec4899', bg: '#fce7f3' }
        };
        const badge = statusMap[status] || { text: status, color: '#6b7280', bg: '#f3f4f6' };
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                color: badge.color,
                background: badge.bg
            }}>
                {badge.text}
            </span>
        );
    };

    // Timeline component để hiển thị trạng thái
    const StatusTimeline = ({ currentStatus }) => {
        const steps = [
            { key: 'pending', label: 'Chờ duyệt', icon: '📝' },
            { key: 'approved', label: 'Đã duyệt', icon: '✅' },
            { key: 'assigned', label: 'Phân tài xế', icon: '👤' },
            { key: 'in_transit', label: 'Lấy hàng', icon: '🚗' },
            { key: 'picked', label: 'Đã lấy', icon: '📦' },
            { key: 'delivering', label: 'Đang giao', icon: '🚚' }
        ];

        const currentIndex = steps.findIndex(s => s.key === currentStatus);

        return (
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                marginBottom: '16px',
                overflowX: 'auto'
            }}>
                {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    
                    return (
                        <React.Fragment key={step.key}>
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center',
                                minWidth: '80px'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    background: isCompleted ? '#10b981' : '#e5e7eb',
                                    border: isCurrent ? '3px solid #3b82f6' : 'none',
                                    transition: 'all 0.3s'
                                }}>
                                    {step.icon}
                                </div>
                                <div style={{
                                    marginTop: '8px',
                                    fontSize: '11px',
                                    fontWeight: isCurrent ? '700' : '500',
                                    color: isCompleted ? '#111827' : '#9ca3af',
                                    textAlign: 'center'
                                }}>
                                    {step.label}
                                </div>
                            </div>
                            
                            {index < steps.length - 1 && (
                                <div style={{
                                    flex: 1,
                                    height: '2px',
                                    background: isCompleted ? '#10b981' : '#e5e7eb',
                                    margin: '0 4px',
                                    marginBottom: '30px'
                                }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

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
                    <h1>Đơn hàng đang xử lý</h1>
                    <p>Theo dõi trạng thái các đơn hàng đang trong quá trình giao</p>
                </div>
            </div>

            <div className="content-body">
                {orders.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: 'white',
                        borderRadius: '12px'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                        <h3 style={{ color: '#666', marginBottom: '8px' }}>Không có đơn hàng nào</h3>
                        <p style={{ color: '#999' }}>Bạn chưa có đơn hàng nào đang trong quá trình giao</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {orders.map(order => (
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
                                            Tạo lúc: {new Date(order.createdAt || Date.now()).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                    {getStatusBadge(order.status)}
                                </div>

                                {/* Timeline trạng thái */}
                                <StatusTimeline currentStatus={order.status} />

                                <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
                                    {/* Vai trò của user */}
                                    {(() => {
                                        const isSender = Number(order.senderId) === Number(currentUser.id);
                                        const isReceiver = Number(order.receiverId) === Number(currentUser.id);
                                        const userRole = isSender ? 'Người gửi' : (isReceiver ? 'Người nhận' : 'Không xác định');
                                        const roleIcon = isSender ? '📤' : '📥';
                                        const roleColor = isSender ? '#3498db' : '#27ae60';
                                        
                                        // Tìm thông tin người còn lại
                                        const otherUserId = isSender ? order.receiverId : order.senderId;
                                        const otherUser = usersFlat.find(u => u.id === otherUserId && u.role === 'user');
                                        const otherUserName = otherUser ? otherUser.name : `User #${otherUserId}`;
                                        const relationLabel = isSender ? 'Gửi đến' : 'Nhận từ';
                                        
                                        return (
                                            <>
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
                                                
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <span style={{ fontSize: '20px' }}>👤</span>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>{relationLabel}</div>
                                                        <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                                                            {otherUserName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
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

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <span style={{ fontSize: '20px' }}>⚖️</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Khối lượng</div>
                                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                                                {order.weight} kg
                                            </div>
                                        </div>
                                    </div>

                                    {order.driverId && (() => {
                                        const driver = usersFlat.find(u => u.id === order.driverId && u.role === 'driver');
                                        const driverName = driver ? driver.name : `Tài xế #${order.driverId}`;
                                        return (
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <span style={{ fontSize: '20px' }}>🚚</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>Tài xế</div>
                                                    <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                                                        {driverName}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default OrdersInProgress;
