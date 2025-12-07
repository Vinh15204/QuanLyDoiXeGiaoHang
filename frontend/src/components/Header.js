import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/Header.css';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const baseRoute = `/${currentUser?.role}`;

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const renderNavButtons = () => {
    if (currentUser?.role === 'admin') {
      return (
        <>
          <button 
            className={`nav-button ${location.pathname.includes('/map') ? 'active' : ''}`}
            onClick={() => navigate(`${baseRoute}/map`)}
          >
            Bản đồ
          </button>
          <button 
            className={`nav-button ${location.pathname.includes('/info') ? 'active' : ''}`}
            onClick={() => navigate(`${baseRoute}/info`)}
          >
            Thông tin
          </button>
          <button 
            className={`nav-button ${location.pathname.includes('/vehicles') ? 'active' : ''}`}
            onClick={() => navigate(`${baseRoute}/vehicles`)}
          >
            Quản lý đội xe
          </button>
          <button 
            className={`nav-button ${location.pathname.includes('/orders') ? 'active' : ''}`}
            onClick={() => navigate(`${baseRoute}/orders`)}
          >
            Quản lý đơn hàng
          </button>
        </>
      );
    }
    if (currentUser?.role === 'driver') {
      return (
        <button 
          className="nav-button active"
          onClick={() => navigate(baseRoute)}
        >
          Lộ trình
        </button>
      );
    }
    // Add other role-specific buttons here
    return null;
  };

  return (
    <div className="header">
      <div className="header-nav">
        {renderNavButtons()}
      </div>
      <div className="header-user">
        <span>{currentUser?.name}</span>
        <button onClick={handleLogout} className="logout-button">Đăng xuất</button>
      </div>
    </div>
  );
}

export default Header;
