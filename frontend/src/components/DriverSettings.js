import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import '../styles/ModernDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function DriverSettings() {
    const navigate = useNavigate();
    const { currentDriver } = useOutletContext();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'password'
    
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        licenseNumber: '',
        licenseClass: '',
        licenseExpiry: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (currentDriver) {
            setProfileData({
                name: currentDriver.name || '',
                email: currentDriver.email || '',
                phone: currentDriver.phone || '',
                licenseNumber: currentDriver.licenseNumber || '',
                licenseClass: currentDriver.licenseClass || '',
                licenseExpiry: currentDriver.licenseExpiry ? currentDriver.licenseExpiry.split('T')[0] : ''
            });
        }
    }, [currentDriver]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${currentDriver.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...currentDriver,
                    ...profileData
                })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                // Update localStorage
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
                
                // Reload page to refresh data
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error('Cập nhật thất bại');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Có lỗi xảy ra: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validate
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin!' });
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Mật khẩu mới không khớp!' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
            return;
        }

        setLoading(true);

        try {
            // Verify current password by attempting login
            const loginResponse = await fetch(`${API_BASE_URL}/api/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: currentDriver.username,
                    password: passwordData.currentPassword
                })
            });

            if (!loginResponse.ok) {
                throw new Error('Mật khẩu hiện tại không đúng!');
            }

            // Update password
            const response = await fetch(`${API_BASE_URL}/api/users/${currentDriver.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...currentDriver,
                    password: passwordData.newPassword
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            } else {
                throw new Error('Cập nhật mật khẩu thất bại');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    if (!currentDriver) {
        return <div>Loading...</div>;
    }

    return (
        <div className="content-body" style={{ padding: '32px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
                    ⚙️ Cài đặt
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>
                    Quản lý thông tin cá nhân và bảo mật
                </p>

                {/* Tabs */}
                <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    borderBottom: '2px solid #e5e7eb',
                    marginBottom: '32px'
                }}>
                    <button
                        onClick={() => setActiveTab('profile')}
                        style={{
                            padding: '12px 24px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'profile' ? '3px solid #3b82f6' : 'none',
                            color: activeTab === 'profile' ? '#3b82f6' : '#6b7280',
                            fontWeight: '600',
                            fontSize: '15px',
                            cursor: 'pointer',
                            marginBottom: '-2px'
                        }}
                    >
                        👤 Thông tin cá nhân
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        style={{
                            padding: '12px 24px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'password' ? '3px solid #3b82f6' : 'none',
                            color: activeTab === 'password' ? '#3b82f6' : '#6b7280',
                            fontWeight: '600',
                            fontSize: '15px',
                            cursor: 'pointer',
                            marginBottom: '-2px'
                        }}
                    >
                        🔒 Đổi mật khẩu
                    </button>
                </div>

                {/* Message */}
                {message.text && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                        color: message.type === 'success' ? '#065f46' : '#991b1b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleSaveProfile}>
                        <div style={{
                            background: 'white',
                            padding: '32px',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'grid', gap: '24px' }}>
                                {/* Name */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#374151'
                                    }}>
                                        Họ và tên
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={profileData.name}
                                        onChange={handleProfileChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#374151'
                                    }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profileData.email}
                                        onChange={handleProfileChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#374151'
                                    }}>
                                        Số điện thoại
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleProfileChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                {/* License Number */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#374151'
                                    }}>
                                        Số giấy phép lái xe
                                    </label>
                                    <input
                                        type="text"
                                        name="licenseNumber"
                                        value={profileData.licenseNumber}
                                        onChange={handleProfileChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                {/* License Class */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#374151'
                                    }}>
                                        Hạng bằng lái
                                    </label>
                                    <select
                                        name="licenseClass"
                                        value={profileData.licenseClass}
                                        onChange={handleProfileChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                    >
                                        <option value="">-- Chọn hạng bằng --</option>
                                        <option value="B1">B1</option>
                                        <option value="B2">B2</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                        <option value="E">E</option>
                                        <option value="FB2">FB2</option>
                                        <option value="FC">FC</option>
                                        <option value="FD">FD</option>
                                        <option value="FE">FE</option>
                                    </select>
                                </div>

                                {/* License Expiry */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#374151'
                                    }}>
                                        Ngày hết hạn bằng lái
                                    </label>
                                    <input
                                        type="date"
                                        name="licenseExpiry"
                                        value={profileData.licenseExpiry}
                                        onChange={handleProfileChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: '32px',
                                    padding: '12px 24px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1
                                }}
                            >
                                {loading ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Password Tab */}
                {activeTab === 'password' && (
                    <form onSubmit={handleChangePassword}>
                        <div style={{
                            background: 'white',
                            padding: '32px',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'grid', gap: '24px' }}>
                                {/* Current Password */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#374151'
                                    }}>
                                        Mật khẩu hiện tại
                                    </label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                        required
                                    />
                                </div>

                                {/* New Password */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#374151'
                                    }}>
                                        Mật khẩu mới
                                    </label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                        required
                                        minLength={6}
                                    />
                                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                        Tối thiểu 6 ký tự
                                    </p>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        fontSize: '14px', 
                                        fontWeight: '600',
                                        marginBottom: '8px',
                                        color: '#374151'
                                    }}>
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '15px'
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: '32px',
                                    padding: '12px 24px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1
                                }}
                            >
                                {loading ? 'Đang xử lý...' : '🔒 Đổi mật khẩu'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default DriverSettings;
