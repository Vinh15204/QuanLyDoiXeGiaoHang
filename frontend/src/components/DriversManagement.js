import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function DriversManagement() {
    const navigate = useNavigate();
    const [currentUser] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });

    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [newDriver, setNewDriver] = useState({
        name: '',
        phone: '',
        email: '',
        vehicleId: '',
        licenseNumber: '',
        status: 'active'
    });

    // Remove sample data
    
    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('/login');
            return;
        }
        fetchData();
    }, [currentUser, navigate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Fetch users, vehicles, and routes from backend
            const [usersRes, vehiclesRes, routesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/users`),
                fetch(`${API_BASE_URL}/api/vehicles`),
                fetch(`${API_BASE_URL}/api/routes`)
            ]);

            if (usersRes.ok && vehiclesRes.ok) {
                const [users, vehiclesData, routesData] = await Promise.all([
                    usersRes.json(),
                    vehiclesRes.json(),
                    routesRes.ok ? routesRes.json() : { routes: [] }
                ]);

                // Filter drivers from users
                const driversData = users.filter(user => user.role === 'driver');
                
                // Enhance drivers with vehicle and performance data
                const enhancedDrivers = driversData.map(driver => {
                    const vehicle = vehiclesData.find(v => v.id === driver.vehicleId);
                    const driverRoutes = (routesData.routes || []).filter(route => route.vehicleId === driver.vehicleId);
                    
                    // Calculate performance metrics
                    const totalDeliveries = driverRoutes.reduce((sum, route) => sum + (route.assignedOrders?.length || 0), 0);
                    const avgOnTimeRate = driverRoutes.length > 0 
                        ? Math.round(driverRoutes.reduce((sum, route) => sum + (route.onTimeRate || 90), 0) / driverRoutes.length)
                        : 100;
                    
                    return {
                        ...driver,
                        vehicleLicense: vehicle?.licensePlate || 'N/A',
                        currentLocation: driver.currentLocation || [21.0285, 105.8542],
                        totalDeliveries,
                        rating: Math.min(5.0, 3.5 + (avgOnTimeRate / 50)),
                        onTimeRate: avgOnTimeRate,
                        status: driver.status || 'offline'
                    };
                });

                setDrivers(enhancedDrivers);
                setVehicles(vehiclesData);
                setRoutes(routesData.routes || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDrivers = async () => {
        // This function is now replaced by fetchData
        await fetchData();
    };

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        navigate('/login');
    };

    const handleAddDriver = () => {
        setSelectedDriver(null);
        setNewDriver({
            name: '',
            phone: '',
            email: '',
            vehicleId: '',
            licenseNumber: '',
            status: 'active'
        });
        setShowModal(true);
    };

    const handleEditDriver = (driver) => {
        setSelectedDriver(driver);
        setNewDriver({
            name: driver.name,
            phone: driver.phone,
            email: driver.email,
            vehicleId: driver.vehicleId,
            licenseNumber: driver.licenseNumber,
            status: driver.status
        });
        setShowModal(true);
    };

    const handleSaveDriver = async () => {
        try {
            if (selectedDriver) {
                // Update existing driver
                const response = await fetch(`${API_BASE_URL}/api/users/${selectedDriver.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...newDriver,
                        role: 'driver'
                    }),
                });

                if (response.ok) {
                    const updatedDriver = await response.json();
                    const updatedDrivers = drivers.map(driver => 
                        driver.id === selectedDriver.id 
                            ? { ...driver, ...newDriver }
                            : driver
                    );
                    setDrivers(updatedDrivers);
                }
            } else {
                // Add new driver
                const response = await fetch(`${API_BASE_URL}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...newDriver,
                        role: 'driver',
                        password: 'defaultpassword123' // You should implement proper password setup
                    }),
                });

                if (response.ok) {
                    const newDriverData = await response.json();
                    const driverToAdd = {
                        ...newDriverData,
                        currentLocation: [21.0285, 105.8542],
                        totalDeliveries: 0,
                        rating: 5.0,
                        onTimeRate: 100
                    };
                    setDrivers([...drivers, driverToAdd]);
                }
            }
            setShowModal(false);
        } catch (error) {
            console.error('Error saving driver:', error);
            alert('Có lỗi xảy ra khi lưu thông tin tài xế');
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            active: { label: 'Đang hoạt động', class: 'status-active' },
            offline: { label: 'Ngoại tuyến', class: 'status-offline' },
            busy: { label: 'Đang bận', class: 'status-busy' }
        };
        return statusConfig[status] || statusConfig.offline;
    };

    return (
        <div className="drivers-content">
            {/* Drivers Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                            <h3>{drivers.length}</h3>
                            <p>Tổng số tài xế</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <h3>{drivers.filter(d => d.status === 'active').length}</h3>
                            <p>Đang hoạt động</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⭐</div>
                        <div className="stat-info">
                            <h3>{drivers.length > 0 ? (drivers.reduce((sum, d) => sum + d.rating, 0) / drivers.length).toFixed(1) : '0'}</h3>
                            <p>Đánh giá trung bình</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-info">
                            <h3>{drivers.length > 0 ? Math.round(drivers.reduce((sum, d) => sum + d.onTimeRate, 0) / drivers.length) : 0}%</h3>
                            <p>Tỷ lệ đúng giờ</p>
                        </div>
                    </div>
                </div>

                {/* Drivers Table */}
                <div className="table-container">
                    <div className="table-header">
                        <h3>Danh sách tài xế</h3>
                        <div className="table-actions">
                            <select>
                                <option>Tất cả trạng thái</option>
                                <option>Đang hoạt động</option>
                                <option>Ngoại tuyến</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading">Đang tải...</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tài xế</th>
                                    <th>Liên hệ</th>
                                    <th>Xe được gán</th>
                                    <th>GPLX</th>
                                    <th>Trạng thái</th>
                                    <th>Hiệu suất</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drivers.map((driver) => {
                                    const statusConfig = getStatusBadge(driver.status);
                                    return (
                                        <tr key={driver.id}>
                                            <td>
                                                <div className="driver-info">
                                                    <div className="driver-avatar">👤</div>
                                                    <div>
                                                        <div className="driver-name">{driver.name}</div>
                                                        <div className="driver-id">ID: {driver.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="contact-info">
                                                    <div>📱 {driver.phone}</div>
                                                    <div>📧 {driver.email}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="vehicle-info">
                                                    <div>ID: {driver.vehicleId}</div>
                                                    <div>{driver.vehicleLicense}</div>
                                                </div>
                                            </td>
                                            <td>{driver.licenseNumber}</td>
                                            <td>
                                                <span className={`status-badge ${statusConfig.class}`}>
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="performance-info">
                                                    <div>⭐ {driver.rating}</div>
                                                    <div>🎯 {driver.onTimeRate}%</div>
                                                    <div>📦 {driver.totalDeliveries}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button 
                                                        className="edit-btn"
                                                        onClick={() => handleEditDriver(driver)}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button className="view-btn">👁️</button>
                                                    <button className="delete-btn">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

            {/* Modal for Add/Edit Driver */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{selectedDriver ? 'Chỉnh sửa tài xế' : 'Thêm tài xế mới'}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>❌</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Họ tên</label>
                                <input 
                                    type="text" 
                                    value={newDriver.name}
                                    onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                                    placeholder="Nhập họ tên"
                                />
                            </div>
                            <div className="form-group">
                                <label>Số điện thoại</label>
                                <input 
                                    type="text" 
                                    value={newDriver.phone}
                                    onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input 
                                    type="email" 
                                    value={newDriver.email}
                                    onChange={(e) => setNewDriver({...newDriver, email: e.target.value})}
                                    placeholder="Nhập email"
                                />
                            </div>
                            <div className="form-group">
                                <label>ID xe được gán</label>
                                <select 
                                    value={newDriver.vehicleId}
                                    onChange={(e) => setNewDriver({...newDriver, vehicleId: e.target.value})}
                                >
                                    <option value="">Chọn xe</option>
                                    {vehicles.map(vehicle => (
                                        <option key={vehicle.id} value={vehicle.id}>
                                            ID: {vehicle.id} - {vehicle.licensePlate} ({vehicle.type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Số GPLX</label>
                                <input 
                                    type="text" 
                                    value={newDriver.licenseNumber}
                                    onChange={(e) => setNewDriver({...newDriver, licenseNumber: e.target.value})}
                                    placeholder="Nhập số GPLX"
                                />
                            </div>
                            <div className="form-group">
                                <label>Trạng thái</label>
                                <select 
                                    value={newDriver.status}
                                    onChange={(e) => setNewDriver({...newDriver, status: e.target.value})}
                                >
                                    <option value="active">Đang hoạt động</option>
                                    <option value="offline">Ngoại tuyến</option>
                                    <option value="busy">Đang bận</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => setShowModal(false)}>
                                Hủy
                            </button>
                            <button className="save-btn" onClick={handleSaveDriver}>
                                {selectedDriver ? 'Cập nhật' : 'Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DriversManagement;
