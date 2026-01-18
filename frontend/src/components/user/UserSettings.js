import React, { useState } from 'react';
import '../../styles/ModernDashboard.css';

function UserSettings() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const [formData, setFormData] = useState({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
    });
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Update localStorage
        const updatedUser = { ...currentUser, ...formData };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        
        setTimeout(() => {
            setMessage({ type: '', text: '' });
        }, 3000);
    };

    return (
        <div className="main-content">
            <div className="top-header">
                <div className="header-left">
                    <h1>Cài đặt tài khoản</h1>
                    <p>Quản lý thông tin cá nhân của bạn</p>
                </div>
            </div>

            <div className="content-body">
                <div className="form-container" style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    background: 'white',
                    padding: '30px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    {message.text && (
                        <div style={{
                            padding: '12px 20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
                            color: message.type === 'success' ? '#155724' : '#721c24',
                            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                        }}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#333'
                            }}>
                                Họ và tên
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Nhập họ và tên"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#333'
                            }}>
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Nhập email"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: '600',
                                color: '#333'
                            }}>
                                Số điện thoại
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Nhập số điện thoại"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            💾 Lưu thay đổi
                        </button>
                    </form>

                    <div style={{
                        marginTop: '30px',
                        paddingTop: '30px',
                        borderTop: '1px solid #e5e7eb'
                    }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#111827' }}>
                            Thông tin tài khoản
                        </h3>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6b7280' }}>Vai trò:</span>
                                <span style={{ fontWeight: '600', color: '#111827' }}>
                                    {currentUser.role === 'user' ? '👤 Khách hàng' : currentUser.role}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6b7280' }}>ID:</span>
                                <span style={{ fontWeight: '600', color: '#111827' }}>#{currentUser.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserSettings;
