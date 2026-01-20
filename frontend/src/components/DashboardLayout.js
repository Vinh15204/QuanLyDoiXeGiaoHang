import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import '../styles/ModernDashboard.css';

function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });

    console.log('🔍 DashboardLayout rendered at:', location.pathname);

    const handleLogout = () => {
        // Clear all localStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('optimizedRoutes');
        localStorage.removeItem('optimizationStats');
        // Navigate to login
        navigate('/login');
    };

    const getPageTitle = () => {
        const path = location.pathname;
        if (path.includes('vehicles')) return 'Fleet Management';
        if (path.includes('orders')) return 'Deliveries Management';
        if (path.includes('drivers')) return 'Drivers Management';
        if (path.includes('users')) return 'Users Management';
        if (path.includes('analytics')) return 'Analytics';
        if (path.includes('settings')) return 'Settings';
        return 'Dashboard';
    };

    const getPageSubtitle = () => {
        const path = location.pathname;
        if (path.includes('vehicles')) return 'Quản lý đội xe và phương tiện';
        if (path.includes('orders')) return 'Quản lý đơn hàng và giao hàng';
        if (path.includes('drivers')) return 'Quản lý thông tin tài xế';
        if (path.includes('users')) return 'Quản lý người dùng hệ thống';
        if (path.includes('analytics')) return 'Phân tích hiệu suất và thống kê';
        if (path.includes('settings')) return 'Cài đặt hệ thống và tùy chọn';
        return 'Tổng quan hệ thống quản lý giao hàng';
    };

    const isActive = (path) => {
        return location.pathname.includes(path);
    };

    const sidebarItems = [
        { name: 'Dashboard', icon: '📊', path: '/admin/map' },
        { name: 'Fleet', icon: '🚛', path: '/admin/vehicles' },
        { name: 'Deliveries', icon: '📦', path: '/admin/orders' },
        { name: 'Drivers', icon: '👤', path: '/admin/drivers' },
        { name: 'Users', icon: '👥', path: '/admin/users' },
        { name: 'Analytics', icon: '📈', path: '/admin/analytics' },
        { name: 'Settings', icon: '⚙️', path: '/admin/settings' }
    ];

    return (
        <div className="modern-dashboard">
            {/* Sidebar - Persistent */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">📱</span>
                        <span className="logo-text">PD-Fleet</span>
                    </div>
                </div>
                
                <nav className="sidebar-nav">
                    {sidebarItems.map((item, index) => (
                        <div 
                            key={index}
                            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-text">{item.name}</span>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {/* Top Header - Persistent */}
                <div className="top-header">
                    <div className="header-left">
                        <h1>{getPageTitle()}</h1>
                        <p>{getPageSubtitle()}</p>
                    </div>
                    <div className="header-right">
                        <div className="search-box">
                            <input type="text" placeholder="Tìm kiếm..." />
                            <span className="search-icon">🔍</span>
                        </div>
                        <div className="user-section">
                            <span className="user-name">{currentUser?.name || 'Admin'}</span>
                            <div className="user-avatar">👤</div>
                            <button onClick={handleLogout} className="logout-btn">Đăng xuất</button>
                        </div>
                    </div>
                </div>

                {/* Dynamic Content */}
                <div className="page-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default DashboardLayout;
