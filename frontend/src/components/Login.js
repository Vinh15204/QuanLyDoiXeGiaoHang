import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Login() {
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
  };

  // Check if user is already logged in
  React.useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
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
  }, [navigate]);

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Đăng nhập</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên đăng nhập"
              disabled={loading}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              disabled={loading}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
