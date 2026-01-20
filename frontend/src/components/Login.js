import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Auth.css';

function Login() {
  console.log('🔵 Login component rendered');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Fetch toàn bộ users từ API
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const allUsers = await res.json();
      console.log('Received users data:', { 
        count: Array.isArray(allUsers) ? allUsers.length : 'not an array',
        structure: allUsers 
      });

      // Gộp tất cả users các loại nếu API trả về dạng phân nhóm
      let users = allUsers;
      if (allUsers.users && allUsers.drivers && allUsers.admins) {
        users = [...allUsers.users, ...allUsers.drivers, ...allUsers.admins];
      }

      const user = users.find(u => u.username === username && u.password === password);
      
      if (user) {
        console.log('Login successful, redirecting to:', user.role);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        switch(user.role) {
          case 'user': 
            navigate('/user'); 
            break;
          case 'driver': 
            navigate('/driver'); 
            break;
          case 'admin': 
            navigate('/admin'); 
            break;
          default: 
            navigate('/login');
        }
      } else {
        setError('Sai tên đăng nhập hoặc mật khẩu!');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`Lỗi đăng nhập: ${err.message}`);
    } finally {
      setLoading(false);
    }
    return () => { isMounted = false; };
  };

  // Check if user is already logged in
  React.useEffect(() => {
    let isMounted = true;
    const user = localStorage.getItem('currentUser');
    if (user && isMounted) {
      const userData = JSON.parse(user);
      switch(userData.role) {
        case 'user':
          navigate('/user');
          break;
        case 'driver':
          navigate('/driver');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          localStorage.removeItem('currentUser');
      }
    }
    return () => { isMounted = false; };
  }, [navigate]);

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-blob blob-1"></div>
        <div className="auth-blob blob-2"></div>
        <div className="auth-blob blob-3"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🚚</div>
          <h1 className="auth-title">Đăng nhập</h1>
          <p className="auth-subtitle">Chào mừng bạn trở lại!</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          {error && (
            <div className="auth-message error">
              <span className="message-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">👤</span>
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="Nhập tên đăng nhập"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🔒</span>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Nhập mật khẩu"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Đang đăng nhập...
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>

          <div className="auth-footer">
            <p>Chưa có tài khoản?</p>
            <Link to="/register" className="auth-link">
              Đăng ký ngay
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
