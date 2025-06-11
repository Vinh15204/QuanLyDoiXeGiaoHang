import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usersData from '../data/users.json';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const allUsers = [...usersData.users, ...usersData.drivers, ...usersData.admins];
    const user = allUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
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
      alert('Sai tên đăng nhập hoặc mật khẩu!');
    }
  };

  // Check if user is already logged in
  React.useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      const userData = JSON.parse(user);
      switch(userData.role) {
        case 'user': navigate('/user'); break;
        case 'driver': navigate('/driver'); break;
        case 'admin': navigate('/admin'); break;
        default: break;
      }
    }
  }, [navigate]);

  return (
    <div className="login-page">
      <div className="login-box">
        <h2>Đăng nhập</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên đăng nhập"
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
            />
          </div>
          <button type="submit">Đăng nhập</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
