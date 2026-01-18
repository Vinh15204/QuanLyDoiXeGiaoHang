import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../styles/ModernDashboard.css';

function DriverLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentDriver, setCurrentDriver] = useState(null);

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
        
        setCurrentDriver(user);
    }, [navigate]);

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

    if (!currentDriver) {
        return <div>Loading...</div>;
    }

    return (
        <div className="modern-dashboard">
            {/* Sidebar - Fixed */}
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
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
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
                            <div className="user-name">{currentDriver.username || 'Tài xế'}</div>
                            <div className="user-role">Driver</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-btn-full">
                        <span>🚪</span> Đăng xuất
                    </button>
                </div>
            </div>

            {/* Main Content - Changes based on route */}
            <Outlet context={{ currentDriver }} />
        </div>
    );
}

export default DriverLayout;
