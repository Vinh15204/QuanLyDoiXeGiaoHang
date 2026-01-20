import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Auth.css';

function Register() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        name: '',
        email: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const validateForm = () => {
        if (!formData.username || !formData.password || !formData.name || !formData.email || !formData.phone) {
            setError('Vui lòng điền đầy đủ thông tin');
            return false;
        }

        if (formData.password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Email không hợp lệ');
            return false;
        }

        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(formData.phone)) {
            setError('Số điện thoại không hợp lệ (10-11 số)');
            return false;
        }

        return true;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        try {
            setLoading(true);
            setError('');

            // Kiểm tra username đã tồn tại chưa
            const checkRes = await fetch(`${API_BASE_URL}/api/users`);
            if (!checkRes.ok) throw new Error('Không thể kiểm tra dữ liệu');
            
            const allUsers = await checkRes.json();
            let users = allUsers;
            if (allUsers.users && allUsers.drivers && allUsers.admins) {
                users = [...allUsers.users, ...allUsers.drivers, ...allUsers.admins];
            }

            const existingUser = users.find(u => 
                u.username === formData.username || 
                u.email === formData.email ||
                u.phone === formData.phone
            );

            if (existingUser) {
                // Nếu là tài khoản guest (username bắt đầu bằng "guest_"), cho phép nâng cấp
                const isGuestAccount = existingUser.username && existingUser.username.startsWith('guest_');
                
                if (existingUser.phone === formData.phone && isGuestAccount) {
                    // Nâng cấp từ guest lên user
                    const upgradeRes = await fetch(`${API_BASE_URL}/api/users/${existingUser.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            ...existingUser,
                            username: formData.username,
                            password: formData.password,
                            name: formData.name,
                            email: formData.email,
                            role: 'user'
                        })
                    });

                    if (!upgradeRes.ok) {
                        throw new Error('Không thể nâng cấp tài khoản');
                    }

                    const upgradedUser = await upgradeRes.json();
                    console.log('Nâng cấp tài khoản thành công:', upgradedUser);
                    
                    setSuccess('Nâng cấp tài khoản thành công! Đang chuyển đến trang đăng nhập...');
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                    return;
                }

                // Nếu không phải guest, báo lỗi trùng lặp
                if (existingUser.username === formData.username) {
                    setError('Tên đăng nhập đã tồn tại');
                } else if (existingUser.email === formData.email) {
                    setError('Email đã được sử dụng');
                } else {
                    setError('Số điện thoại đã được đăng ký bởi tài khoản khác');
                }
                setLoading(false);
                return;
            }

            // Tạo user mới
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    role: 'user'
                })
            });

            if (!response.ok) {
                throw new Error('Đăng ký thất bại');
            }

            const newUser = await response.json();
            console.log('Đăng ký thành công:', newUser);
            
            setSuccess('Đăng ký thành công! Đang chuyển đến trang đăng nhập...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            console.error('Register error:', err);
            setError(err.message || 'Có lỗi xảy ra khi đăng ký');
        } finally {
            setLoading(false);
        }
    };

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
                    <h1 className="auth-title">Tạo tài khoản</h1>
                    <p className="auth-subtitle">Đăng ký để bắt đầu sử dụng dịch vụ</p>
                </div>

                <form onSubmit={handleRegister} className="auth-form">
                    {error && (
                        <div className="auth-message error">
                            <span className="message-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="auth-message success">
                            <span className="message-icon">✅</span>
                            {success}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">
                            <span className="label-icon">👤</span>
                            Họ và tên
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Nhập họ và tên"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <span className="label-icon">🔑</span>
                            Tên đăng nhập
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Nhập tên đăng nhập"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">📧</span>
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">📞</span>
                                Số điện thoại
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="0123456789"
                                maxLength="11"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">🔒</span>
                                Mật khẩu
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Ít nhất 6 ký tự"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-icon">🔒</span>
                                Xác nhận mật khẩu
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Nhập lại mật khẩu"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="auth-submit-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <span>Đăng ký</span>
                                <span className="btn-arrow">→</span>
                            </>
                        )}
                    </button>

                    <div className="auth-footer">
                        <p>Đã có tài khoản?</p>
                        <Link to="/login" className="auth-link">
                            Đăng nhập ngay
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Register;
