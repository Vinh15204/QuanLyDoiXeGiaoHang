import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import '../styles/Driver.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function DriverDelivered() {
    const navigate = useNavigate();
    const [currentDriver, setCurrentDriver] = useState(null);
    const [deliveredOrders, setDeliveredOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem('currentUser');
        if (!userData) {
            navigate('/login');
            return;
        }
        const user = JSON.parse(userData);
        if (user.role !== 'driver') {
            navigate('/login');
            return;
        }
        
        // Fallback: Nếu không có vehicleId, dùng id của user
        if (!user.vehicleId && user.id) {
            console.warn('⚠️ vehicleId not found, using user.id as vehicleId');
            user.vehicleId = user.id;
        }
        
        console.log('👨‍✈️ Driver user:', user);
        console.log('🚗 Vehicle ID:', user.vehicleId);
        setCurrentDriver(user);
    }, [navigate]);

    // Fetch delivered orders
    useEffect(() => {
        const fetchDeliveredOrders = async () => {
            if (!currentDriver?.vehicleId) {
                console.log('⚠️ No vehicleId, currentDriver:', currentDriver);
                return;
            }
            
            try {
                setLoading(true);
                console.log('🚚 Fetching delivered orders for vehicleId:', currentDriver.vehicleId);
                const response = await fetch(`${API_BASE_URL}/api/orders?driverId=${currentDriver.vehicleId}&status=delivered`);
                if (response.ok) {
                    const data = await response.json();
                    setDeliveredOrders(data);
                    console.log('✅ Loaded delivered orders:', data.length);
                } else {
                    console.error('❌ API error:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('Error fetching delivered orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDeliveredOrders();
        const interval = setInterval(fetchDeliveredOrders, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [currentDriver]);

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        navigate('/login');
    };

    const sidebarItems = [
        { name: 'Tuyến đường', icon: '🗺️', path: '/driver' },
        { name: 'Đơn hàng', icon: '📦', path: '/driver/orders' },
        { name: 'Đã giao', icon: '✅', path: '/driver/delivered' },
        { name: 'Cài đặt', icon: '⚙️', path: '/driver/settings' }
    ];

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="modern-dashboard">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">🚚</span>
                        <span className="logo-text">Tài Xế</span>
                    </div>
                </div>
                
                <nav className="sidebar-nav">
                    {sidebarItems.map((item, index) => (
                        <div 
                            key={index}
                            className={`nav-item ${window.location.pathname === item.path ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-text">{item.name}</span>
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="footer-user">
                        <div className="user-avatar">👤</div>
                        <div className="user-info">
                            <div className="user-name">{currentDriver?.username || 'Tài xế'}</div>
                            <div className="user-role">Driver</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-btn-full">
                        <span>🚪</span> Đăng xuất
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {/* Top Header */}
                <div className="top-header">
                    <div className="header-left">
                        <h1>Lịch sử đã giao</h1>
                        <p>Các đơn hàng đã giao thành công</p>
                    </div>
                    <div className="header-right">
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

                {/* Delivered Orders List */}
                <div className="dashboard-content">
                    <div className="orders-full-page">
                        {loading ? (
                            <div className="empty-state">
                                <div className="empty-icon">⏳</div>
                                <h3>Đang tải...</h3>
                            </div>
                        ) : deliveredOrders.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">✅</div>
                                <h3>Chưa có đơn hàng đã giao</h3>
                                <p>Bạn chưa giao đơn hàng nào</p>
                            </div>
                        ) : (
                            <div className="orders-list">
                                {deliveredOrders.map((order) => (
                                    <div key={order._id} className="order-item delivered-item">
                                        <div className="order-item-left">
                                            <div className="order-id-badge">
                                                #{order.orderId}
                                            </div>
                                            <div className="status-badge-small status-delivered">
                                                ✅ Đã giao
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
                                            <div className="delivered-time">
                                                🕐 {formatDate(order.updatedAt)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DriverDelivered;
