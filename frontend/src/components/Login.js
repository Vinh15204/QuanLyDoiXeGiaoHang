import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Login() {
  console.log('🔵 Login component rendered');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleLogin = async (e) => {
<<<<<<< HEAD
    let isMounted = true;
=======
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
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
        
<<<<<<< HEAD
        if (isMounted) {
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
        }
      } else {
        if (isMounted) setError('Sai tên đăng nhập hoặc mật khẩu!');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (isMounted) setError(`Lỗi đăng nhập: ${err.message}`);
    } finally {
      if (isMounted) setLoading(false);
=======
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
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
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
    <div className="login-container">
<<<<<<< HEAD
      <div className="login-form">
=======
      <div className="login-box">
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
        <h2>Đăng nhập</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
<<<<<<< HEAD
            <label htmlFor="username">Tên đăng nhập</label>
=======
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
<<<<<<< HEAD
              placeholder="Nhập tên đăng nhập"
=======
              placeholder="Tên đăng nhập"
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
              disabled={loading}
              required
            />
          </div>
          <div className="form-group">
<<<<<<< HEAD
            <label htmlFor="password">Mật khẩu</label>
=======
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
<<<<<<< HEAD
              placeholder="Nhập mật khẩu"
=======
              placeholder="Mật khẩu"
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
              disabled={loading}
              required
            />
          </div>
<<<<<<< HEAD
          <button type="submit" disabled={loading}>
            {loading && <span className="loading-spinner"></span>}
=======
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading}>
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
