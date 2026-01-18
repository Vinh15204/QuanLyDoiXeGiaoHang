import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../../styles/ModernDashboard.css';

function UserDashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOrdersExpanded, setIsOrdersExpanded] = useState(true);
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('UserDashboardLayout - currentUser:', currentUser);

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;
    const isOrdersActive = location.pathname.startsWith('/user/orders');

    return (
        <div className="modern-dashboard">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>🚚 QLDXGH</h2>
                </div>

                <nav className="sidebar-nav">
                    {/* Đơn hàng - Expandable */}
                    <div className="nav-section">
                        <div 
                            className={`nav-item ${isOrdersActive ? 'active' : ''}`}
                            onClick={() => setIsOrdersExpanded(!isOrdersExpanded)}
                            style={{ cursor: 'pointer' }}
                        >
                            <span className="nav-icon">📦</span>
                            <span className="nav-text">Đơn hàng của bạn</span>
                            <span className="nav-arrow">{isOrdersExpanded ? '▼' : '▶'}</span>
                        </div>
                        
                        {isOrdersExpanded && (
                            <div className="nav-submenu">
                                <div 
                                    className={`nav-subitem ${isActive('/user/orders/create') ? 'active' : ''}`}
                                    onClick={() => navigate('/user/orders/create')}
                                >
                                    <span className="nav-subicon">➕</span>
                                    <span className="nav-subtext">Tạo đơn hàng</span>
                                </div>
                                <div 
                                    className={`nav-subitem ${isActive('/user/orders/in-progress') ? 'active' : ''}`}
                                    onClick={() => navigate('/user/orders/in-progress')}
                                >
                                    <span className="nav-subicon">🚛</span>
                                    <span className="nav-subtext">Đang trong quá trình</span>
                                </div>
                                <div 
                                    className={`nav-subitem ${isActive('/user/orders/history') ? 'active' : ''}`}
                                    onClick={() => navigate('/user/orders/history')}
                                >
                                    <span className="nav-subicon">📋</span>
                                    <span className="nav-subtext">Lịch sử giao hàng</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cài đặt */}
                    <div 
                        className={`nav-item ${isActive('/user/settings') ? 'active' : ''}`}
                        onClick={() => navigate('/user/settings')}
                    >
                        <span className="nav-icon">⚙️</span>
                        <span className="nav-text">Cài đặt</span>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div style={{ 
                        padding: '12px 16px', 
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        marginBottom: '8px'
                    }}>
                        <div style={{ 
                            fontSize: '13px', 
                            color: 'rgba(255,255,255,0.6)',
                            marginBottom: '4px'
                        }}>
                            Đăng nhập với
                        </div>
                        <div style={{ 
                            fontSize: '14px', 
                            color: 'white',
                            fontWeight: '600'
                        }}>
                            👤 {currentUser.name || 'User'}
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        🚪 Đăng xuất
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="main-container">
                <Outlet />
            </div>
        </div>
    );
}

export default UserDashboardLayout;
