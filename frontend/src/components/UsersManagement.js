import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function UsersManagement() {
    const navigate = useNavigate();
    const [currentUser] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [filterRole, setFilterRole] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'user',
        currentLocation: [21.0285, 105.8542]
    });

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('/login');
            return;
        }
        fetchUsers();
    }, [currentUser, navigate]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = () => {
        setIsEditMode(false);
        setSelectedUser(null);
        setFormData({
            name: '',
            username: '',
            email: '',
            phone: '',
            password: '',
            role: 'user',
            currentLocation: [21.0285, 105.8542]
        });
        setShowModal(true);
    };

    const handleEditUser = (user) => {
        setIsEditMode(true);
        setSelectedUser(user);
        setFormData({
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            phone: user.phone || '',
            password: '', // Don't show existing password
            role: user.role || 'user',
            currentLocation: user.currentLocation || [21.0285, 105.8542]
        });
        setShowModal(true);
    };

    const handleDeleteUser = async (userId) => {
        if (userId === currentUser.id) {
            alert('Không thể xóa tài khoản của chính bạn!');
            return;
        }

        if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    alert('Xóa người dùng thành công!');
                    fetchUsers();
                } else {
                    alert('Lỗi khi xóa người dùng!');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Lỗi khi xóa người dùng!');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.username) {
            alert('Vui lòng nhập đầy đủ thông tin bắt buộc!');
            return;
        }

        if (!isEditMode && !formData.password) {
            alert('Vui lòng nhập mật khẩu cho người dùng mới!');
            return;
        }

        try {
            const payload = {
                name: formData.name,
                username: formData.username,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                currentLocation: formData.currentLocation
            };

            // Only include password if it's provided
            if (formData.password) {
                payload.password = formData.password;
            }

            let response;
            if (isEditMode && selectedUser) {
                // Update existing user
                response = await fetch(`${API_BASE_URL}/api/users/${selectedUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create new user
                response = await fetch(`${API_BASE_URL}/api/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (response.ok) {
                alert(isEditMode ? 'Cập nhật người dùng thành công!' : 'Thêm người dùng thành công!');
                setShowModal(false);
                fetchUsers();
            } else {
                const error = await response.json();
                alert(`Lỗi: ${error.message || 'Không thể lưu người dùng'}`);
            }
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Lỗi khi lưu người dùng!');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'admin': return 'badge-admin';
            case 'driver': return 'badge-driver';
            case 'user': return 'badge-user';
            default: return 'badge-default';
        }
    };

    const getRoleText = (role) => {
        switch (role) {
            case 'admin': return 'Quản trị viên';
            case 'driver': return 'Tài xế';
            case 'user': return 'Người dùng';
            default: return role;
        }
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        const matchesSearch = !searchTerm || 
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesRole && matchesSearch;
    });

    // Statistics
    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        drivers: users.filter(u => u.role === 'driver').length,
        users: users.filter(u => u.role === 'user').length
    };

    if (loading) {
        return <div className="loading-container">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="page-container">
            <div className="content-area">
                {/* Stats Cards */}
                <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <span>👥</span>
                    </div>
                    <div className="stat-info">
                        <h3>{stats.total}</h3>
                        <p>Tổng người dùng</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <span>👑</span>
                    </div>
                    <div className="stat-info">
                        <h3>{stats.admins}</h3>
                        <p>Quản trị viên</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                        <span>🚗</span>
                    </div>
                    <div className="stat-info">
                        <h3>{stats.drivers}</h3>
                        <p>Tài xế</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                        <span>👤</span>
                    </div>
                    <div className="stat-info">
                        <h3>{stats.users}</h3>
                        <p>Người dùng thường</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="content-header">
                <div className="filter-section">
                    <select 
                        className="filter-select" 
                        value={filterRole} 
                        onChange={(e) => setFilterRole(e.target.value)}
                    >
                        <option value="all">Tất cả vai trò</option>
                        <option value="admin">Quản trị viên</option>
                        <option value="driver">Tài xế</option>
                        <option value="user">Người dùng</option>
                    </select>
                    
                    <div className="search-input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Tìm kiếm theo tên, username, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                
                <button className="btn-primary" onClick={handleAddUser}>
                    ➕ Thêm
                </button>
            </div>

            {/* Users Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Số điện thoại</th>
                            <th>Vai trò</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user._id || user.username || `${user.id}-${user.role}`}>
                                <td>#{user.id}</td>
                                <td>
                                    <div className="user-cell">
                                        <div className="user-avatar-small">{user.name?.charAt(0) || '?'}</div>
                                        <strong>{user.name}</strong>
                                    </div>
                                </td>
                                <td>{user.username}</td>
                                <td>{user.email || 'Chưa cập nhật'}</td>
                                <td>{user.phone || 'Chưa cập nhật'}</td>
                                <td>
                                    <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                                        {getRoleText(user.role)}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button 
                                            className="btn-icon-action edit"
                                            onClick={() => handleEditUser(user)}
                                            title="Chỉnh sửa"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            className="btn-icon-action delete"
                                            onClick={() => handleDeleteUser(user.id)}
                                            title="Xóa"
                                            disabled={user.id === currentUser.id}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="empty-state">
                        <p>Không tìm thấy người dùng nào</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{isEditMode ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Tên đầy đủ <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Nhập tên đầy đủ"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Username <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Nhập username"
                                        disabled={isEditMode}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="email@example.com"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Số điện thoại</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="0123456789"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Vai trò <span className="required">*</span></label>
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="user">Người dùng</option>
                                            <option value="driver">Tài xế</option>
                                            <option value="admin">Quản trị viên</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            {isEditMode ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'} 
                                            {!isEditMode && <span className="required">*</span>}
                                        </label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required={!isEditMode}
                                            placeholder={isEditMode ? "Để trống nếu không đổi" : "Nhập mật khẩu"}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn-primary">
                                    {isEditMode ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

export default UsersManagement;
