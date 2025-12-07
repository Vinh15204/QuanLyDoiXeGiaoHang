import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Settings() {
    const navigate = useNavigate();
    const [currentUser] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });

    const [settings, setSettings] = useState({
        general: {
            companyName: '',
            address: '',
            phone: '',
            email: ''
        },
        delivery: {
            maxDistance: 50,
            deliveryFee: 15000,
            timeSlots: ['8:00-12:00', '13:00-17:00', '18:00-22:00'],
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        },
        notification: {
            emailNotifications: true,
            smsNotifications: false,
            realTimeUpdates: true,
            dailyReports: true
        },
        system: {
            mapProvider: 'OpenStreetMap',
            language: 'vi',
            timezone: 'Asia/Ho_Chi_Minh',
            backupFrequency: 'daily'
        }
    });

    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('/login');
            return;
        }
        loadSettings();
    }, [currentUser, navigate]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            // Load settings from localStorage or backend
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                setSettings(prevSettings => ({
                    ...prevSettings,
                    ...parsedSettings
                }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Save settings to localStorage (in a real app, save to backend)
            localStorage.setItem('appSettings', JSON.stringify(settings));
            
            // You could also save to backend here:
            // const response = await fetch(`${API_BASE_URL}/api/settings`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(settings)
            // });
            
            alert('Cài đặt đã được lưu thành công!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Có lỗi xảy ra khi lưu cài đặt!');
        } finally {
            setSaving(false);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="settings-form">
                        <h3>Thông tin công ty</h3>
                        <div className="form-group">
                            <label>Tên công ty</label>
                            <input 
                                type="text" 
                                value={settings.general.companyName}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    general: { ...settings.general, companyName: e.target.value }
                                })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Địa chỉ</label>
                            <input 
                                type="text" 
                                value={settings.general.address}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    general: { ...settings.general, address: e.target.value }
                                })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <input 
                                type="text" 
                                value={settings.general.phone}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    general: { ...settings.general, phone: e.target.value }
                                })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input 
                                type="email" 
                                value={settings.general.email}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    general: { ...settings.general, email: e.target.value }
                                })}
                            />
                        </div>
                    </div>
                );

            case 'delivery':
                return (
                    <div className="settings-form">
                        <h3>Cài đặt giao hàng</h3>
                        <div className="form-group">
                            <label>Khoảng cách tối đa (km)</label>
                            <input 
                                type="number" 
                                value={settings.delivery.maxDistance}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    delivery: { ...settings.delivery, maxDistance: parseInt(e.target.value) }
                                })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Phí giao hàng (VNĐ)</label>
                            <input 
                                type="number" 
                                value={settings.delivery.deliveryFee}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    delivery: { ...settings.delivery, deliveryFee: parseInt(e.target.value) }
                                })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Khung giờ giao hàng</label>
                            <div className="time-slots">
                                {settings.delivery.timeSlots.map((slot, index) => (
                                    <div key={index} className="time-slot">
                                        <input type="text" value={slot} readOnly />
                                        <button className="remove-btn">❌</button>
                                    </div>
                                ))}
                                <button className="add-btn">+ Thêm khung giờ</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Ngày làm việc</label>
                            <div className="working-days">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                    <label key={day} className="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.delivery.workingDays.includes(day)}
                                            onChange={(e) => {
                                                const newWorkingDays = e.target.checked 
                                                    ? [...settings.delivery.workingDays, day]
                                                    : settings.delivery.workingDays.filter(d => d !== day);
                                                setSettings({
                                                    ...settings,
                                                    delivery: { ...settings.delivery, workingDays: newWorkingDays }
                                                });
                                            }}
                                        />
                                        {day}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'notification':
                return (
                    <div className="settings-form">
                        <h3>Cài đặt thông báo</h3>
                        <div className="form-group">
                            <label className="toggle-label">
                                <input 
                                    type="checkbox" 
                                    checked={settings.notification.emailNotifications}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        notification: { ...settings.notification, emailNotifications: e.target.checked }
                                    })}
                                />
                                <span className="toggle-slider"></span>
                                Thông báo qua Email
                            </label>
                        </div>
                        <div className="form-group">
                            <label className="toggle-label">
                                <input 
                                    type="checkbox" 
                                    checked={settings.notification.smsNotifications}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        notification: { ...settings.notification, smsNotifications: e.target.checked }
                                    })}
                                />
                                <span className="toggle-slider"></span>
                                Thông báo qua SMS
                            </label>
                        </div>
                        <div className="form-group">
                            <label className="toggle-label">
                                <input 
                                    type="checkbox" 
                                    checked={settings.notification.realTimeUpdates}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        notification: { ...settings.notification, realTimeUpdates: e.target.checked }
                                    })}
                                />
                                <span className="toggle-slider"></span>
                                Cập nhật thời gian thực
                            </label>
                        </div>
                        <div className="form-group">
                            <label className="toggle-label">
                                <input 
                                    type="checkbox" 
                                    checked={settings.notification.dailyReports}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        notification: { ...settings.notification, dailyReports: e.target.checked }
                                    })}
                                />
                                <span className="toggle-slider"></span>
                                Báo cáo hàng ngày
                            </label>
                        </div>
                    </div>
                );

            case 'system':
                return (
                    <div className="settings-form">
                        <h3>Cài đặt hệ thống</h3>
                        <div className="form-group">
                            <label>Nhà cung cấp bản đồ</label>
                            <select 
                                value={settings.system.mapProvider}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    system: { ...settings.system, mapProvider: e.target.value }
                                })}
                            >
                                <option value="OpenStreetMap">OpenStreetMap</option>
                                <option value="Google Maps">Google Maps</option>
                                <option value="Mapbox">Mapbox</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Ngôn ngữ</label>
                            <select 
                                value={settings.system.language}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    system: { ...settings.system, language: e.target.value }
                                })}
                            >
                                <option value="vi">Tiếng Việt</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Múi giờ</label>
                            <select 
                                value={settings.system.timezone}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    system: { ...settings.system, timezone: e.target.value }
                                })}
                            >
                                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Tần suất sao lưu</label>
                            <select 
                                value={settings.system.backupFrequency}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    system: { ...settings.system, backupFrequency: e.target.value }
                                })}
                            >
                                <option value="daily">Hàng ngày</option>
                                <option value="weekly">Hàng tuần</option>
                                <option value="monthly">Hàng tháng</option>
                            </select>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="settings-content">
                    <div className="settings-container">
                        {/* Settings Tabs */}
                        <div className="settings-tabs">
                            <button 
                                className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                                onClick={() => setActiveTab('general')}
                            >
                                🏢 Chung
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
                                onClick={() => setActiveTab('delivery')}
                            >
                                🚚 Giao hàng
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'notification' ? 'active' : ''}`}
                                onClick={() => setActiveTab('notification')}
                            >
                                🔔 Thông báo
                            </button>
                            <button 
                                className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                                onClick={() => setActiveTab('system')}
                            >
                                ⚙️ Hệ thống
                            </button>
                        </div>

                        {/* Settings Form */}
                        <div className="settings-form-container">
                            {renderTabContent()}
                            <div className="form-actions">
                                <button 
                                    className="save-btn" 
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    💾 {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                                </button>
                                <button className="reset-btn">
                                    🔄 Khôi phục mặc định
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
    );
}

export default Settings;
