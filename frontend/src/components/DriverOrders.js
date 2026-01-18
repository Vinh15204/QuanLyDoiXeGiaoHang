import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import '../styles/Driver.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function DriverOrders() {
    const navigate = useNavigate();
    const { currentDriver } = useOutletContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch orders assigned to this driver (exclude delivered and cancelled)
    useEffect(() => {
        const fetchOrders = async () => {
            if (!currentDriver?.vehicleId) {
                console.log('⚠️ No vehicleId, currentDriver:', currentDriver);
                return;
            }
            
            try {
                setLoading(true);
                console.log('🚚 Fetching orders for vehicleId:', currentDriver.vehicleId);
                const response = await fetch(`${API_BASE_URL}/api/orders?driverId=${currentDriver.vehicleId}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('📦 Total orders from API:', data.length);
                    // Filter out delivered and cancelled orders
                    const activeOrders = data.filter(order => 
                        order.status !== 'delivered' && order.status !== 'cancelled'
                    );
                    setOrders(activeOrders);
                    console.log('✅ Active orders after filter:', activeOrders.length);
                } else {
                    console.error('❌ API error:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, [currentDriver]);

    const handleStartDelivery = async () => {
        if (!currentDriver?.vehicleId) return;
        
        if (!window.confirm('Bắt đầu đi lấy hàng? Tất cả đơn hàng sẽ chuyển sang trạng thái "Đang lấy hàng"')) {
            return;
        }

        try {
            // Update all assigned orders to in_transit
            const assignedOrders = orders.filter(order => order.status === 'assigned');
            
            if (assignedOrders.length === 0) {
                alert('Không có đơn hàng nào cần lấy');
                return;
            }

            console.log('📦 Orders to update:', assignedOrders.map(o => ({ id: o.id, orderId: o.orderId })));

            const updatePromises = assignedOrders.map(order => {
                const orderIdToUse = order.orderId || order.id;
                console.log(`Updating order ${orderIdToUse}`);
                return fetch(`${API_BASE_URL}/api/orders/${orderIdToUse}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'in_transit' })
                });
            });

            const results = await Promise.all(updatePromises);
            const failedCount = results.filter(r => !r.ok).length;
            
            if (failedCount > 0) {
                alert(`Cập nhật thành công ${assignedOrders.length - failedCount}/${assignedOrders.length} đơn hàng`);
            } else {
                alert(`Đã bắt đầu lấy ${assignedOrders.length} đơn hàng!`);
            }
            
            // Redirect to route page
            navigate('/driver');
        } catch (error) {
            console.error('Error starting delivery:', error);
            alert('Lỗi khi bắt đầu lấy hàng');
        }
    };

    const handleUpdateOrderStatus = async (order, newStatus) => {
        try {
            const orderIdToUse = order.orderId || order.id;
            console.log(`Updating order ${orderIdToUse} to status ${newStatus}`);
            
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderIdToUse}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Refresh orders
                const ordersRes = await fetch(`${API_BASE_URL}/api/orders?driverId=${currentDriver.vehicleId}`);
                if (ordersRes.ok) {
                    const data = await ordersRes.json();
                    const activeOrders = data.filter(order => 
                        order.status !== 'delivered' && order.status !== 'cancelled'
                    );
                    setOrders(activeOrders);
                }
                alert(`Đã cập nhật trạng thái đơn hàng #${orderIdToUse}`);
            } else {
                alert('Lỗi khi cập nhật trạng thái');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Lỗi khi cập nhật trạng thái');
        }
    };

    const getStatusBadgeClass = (status) => {
        const statusMap = {
            'pending': 'status-pending',
            'approved': 'status-approved',
            'assigned': 'status-assigned',
            'in_transit': 'status-in-transit',
            'picked': 'status-picked',
            'delivering': 'status-delivering',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled'
        };
        return statusMap[status] || '';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'pending': 'Chờ duyệt',
            'approved': 'Đã duyệt',
            'assigned': 'Đã phân công',
            'in_transit': 'Đang lấy hàng',
            'picked': 'Đã lấy hàng',
            'delivering': 'Đang giao',
            'delivered': 'Đã giao',
            'cancelled': 'Đã hủy'
        };
        return labels[status] || status;
    };

    const getNextActions = (status) => {
        const actions = {
            'assigned': [
                { label: 'Bắt đầu lấy hàng', status: 'in_transit', icon: '🚗' }
            ],
            'in_transit': [
                { label: 'Đã lấy hàng', status: 'picked', icon: '📦' }
            ],
            'picked': [
                { label: 'Đang giao hàng', status: 'delivering', icon: '🚚' }
            ],
            'delivering': [
                { label: 'Đã giao thành công', status: 'delivered', icon: '✅' },
                { label: 'Hủy đơn', status: 'cancelled', icon: '❌' }
            ]
        };
        return actions[status] || [];
    };

    return (
        <div className="main-content">
                {/* Top Header */}
                <div className="top-header">
                    <div className="header-left">
                        <h1>Đơn hàng được giao</h1>
                        <p>Quản lý và cập nhật trạng thái đơn hàng</p>
                    </div>
                    <div className="header-right">
                        {orders.some(order => order.status === 'assigned') && (
                            <button 
                                onClick={handleStartDelivery}
                                style={{
                                    padding: '10px 20px',
                                    marginRight: '10px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                🚗 Bắt đầu đi lấy hàng
                            </button>
                        )}
                        <button 
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '8px 16px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            🔄 Làm mới
                        </button>
                    </div>
                </div>

                {/* Orders List */}
                <div className="dashboard-content">
                    <div className="orders-full-page">
                        {loading ? (
                            <div className="empty-state">
                                <div className="empty-icon">⏳</div>
                                <h3>Đang tải...</h3>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📦</div>
                                <h3>Chưa có đơn hàng</h3>
                                <p>Bạn chưa được phân công đơn hàng nào</p>
                            </div>
                        ) : (
                            <div className="orders-list">
                                {orders.map((order) => (
                                    <div key={order._id} className="order-item">
                                        <div className="order-item-left">
                                            <div className="order-id-badge">
                                                #{order.orderId || order.id}
                                            </div>
                                            <div className={`status-badge-small ${getStatusBadgeClass(order.status)}`}>
                                                {getStatusLabel(order.status)}
                                            </div>
                                        </div>
                                        
                                        <div className="order-item-center">
                                            <div className="order-address-row">
                                                <div className="address-section">
                                                    <strong>Lấy hàng:</strong>
                                                    <p>{order.pickupAddress || 'Chưa cập nhật'}</p>
                                                </div>
                                            </div>
                                            <div className="order-address-row">
                                                <div className="address-section">
                                                    <strong>Giao hàng:</strong>
                                                    <p>{order.deliveryAddress || 'Chưa cập nhật'}</p>
                                                </div>
                                            </div>
                                            <div className="order-weight">
                                                ⚖️ <strong>Khối lượng:</strong> {order.weight} kg
                                            </div>
                                        </div>
                                        
                                        <div className="order-item-right">
                                            {order.status !== 'assigned' && getNextActions(order.status).map((action, idx) => (
                                                <button
                                                    key={idx}
                                                    className={`order-action-btn ${action.status === 'cancelled' ? 'btn-cancel' : 'btn-primary'}`}
                                                    onClick={() => handleUpdateOrderStatus(order, action.status)}
                                                >
                                                    {action.icon} {action.label}
                                                </button>
                                            ))}
                                            {order.status === 'assigned' && (
                                                <div style={{ 
                                                    padding: '10px', 
                                                    color: '#6b7280', 
                                                    fontSize: '13px',
                                                    fontStyle: 'italic'
                                                }}>
                                                    Nhấn "Bắt đầu đi lấy hàng" để bắt đầu
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
    );
}

export default DriverOrders;
