import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import BulkActionToolbar from './BulkActionToolbar';

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
    const [showViewModal, setShowViewModal] = useState(false);
    const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [selectedDrivers, setSelectedDrivers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [newDriver, setNewDriver] = useState({
        name: '',
        phone: '',
        email: '',
        vehicleId: '',
        licenseNumber: '',
        licenseClass: '',
        licenseExpiry: '',
        joinDate: '',
        status: 'active'
    });

    // Sorting states
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const getSortedDrivers = (driversList) => {
        if (!sortBy) return driversList;
        
        return [...driversList].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            // Handle vehicle assignment
            if (sortBy === 'vehicle') {
                const vehicleA = vehicles.find(v => v.id === a.vehicleId);
                const vehicleB = vehicles.find(v => v.id === b.vehicleId);
                aVal = vehicleA?.licensePlate || '';
                bVal = vehicleB?.licensePlate || '';
            }
            
            // Handle null/undefined values
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            
            // Numeric comparison
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            }
            
            // String comparison
            const comparison = String(aVal).localeCompare(String(bVal));
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    };

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
                        _id: driver._id, // MongoDB ObjectId for API operations
                        id: driver.id, // Short numeric ID for display
                        vehicleLicense: vehicle?.licensePlate || 'N/A',
                        vehicleType: vehicle?.type || 'N/A',
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
            licenseClass: '',
            licenseExpiry: '',
            joinDate: '',
            status: 'active'
        });
        setShowModal(true);
    };

    const handleEditDriver = (driver) => {
        setSelectedDriver(driver);
        setNewDriver({
            name: driver.name,
            phone: driver.phone || '',
            email: driver.email || '',
            vehicleId: driver.vehicleId,
            licenseNumber: driver.licenseNumber || '',
            licenseClass: driver.licenseClass || '',
            licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.split('T')[0] : '',
            joinDate: driver.joinDate ? driver.joinDate.split('T')[0] : '',
            status: driver.status
        });
        setShowModal(true);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedDrivers(drivers.map(d => d._id));
        } else {
            setSelectedDrivers([]);
        }
    };

    const handleSelectDriver = (driverId) => {
        setSelectedDrivers(prev => {
            if (prev.includes(driverId)) {
                return prev.filter(id => id !== driverId);
            } else {
                return [...prev, driverId];
            }
        });
    };

    const handleViewDriver = (driver) => {
        setSelectedDriver(driver);
        setShowViewModal(true);
    };

    const handleBulkStatusChange = async (newStatus) => {
        console.log('Changing status to:', newStatus);
        console.log('Selected drivers:', selectedDrivers);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/bulk-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: selectedDrivers,
                    status: newStatus
                }),
            });

            console.log('Response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Update result:', result);
                alert(`Đã cập nhật trạng thái cho ${selectedDrivers.length} tài xế`);
                setSelectedDrivers([]);
                setShowBulkStatusModal(false);
                await fetchData(); // Reload data from server
            } else {
                const error = await response.json();
                console.error('Error response:', error);
                alert(`Lỗi: ${error.message || 'Không thể cập nhật trạng thái'}`);
            }
        } catch (error) {
            console.error('Error updating driver status:', error);
            alert('Có lỗi xảy ra khi cập nhật trạng thái');
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedDrivers.length} tài xế?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/bulk-delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: selectedDrivers }),
            });

            if (response.ok) {
                setDrivers(drivers.filter(driver => !selectedDrivers.includes(driver.id)));
                setSelectedDrivers([]);
            }
        } catch (error) {
            console.error('Error deleting drivers:', error);
            alert('Có lỗi xảy ra khi xóa tài xế');
        }
    };

    const handleSaveDriver = async () => {
        try {
            if (selectedDriver) {
                // Update existing driver - use _id for API
                const response = await fetch(`${API_BASE_URL}/api/users/${selectedDriver._id}`, {
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
                    alert('Cập nhật tài xế thành công');
                    setShowModal(false);
                    await fetchData(); // Reload data from server
                } else {
                    const error = await response.json();
                    alert(`Lỗi: ${error.message || 'Không thể cập nhật tài xế'}`);
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
                    alert('Thêm tài xế thành công');
                    setShowModal(false);
                    await fetchData(); // Reload data from server
                } else {
                    const error = await response.json();
                    alert(`Lỗi: ${error.message || 'Không thể thêm tài xế'}`);
                }
            }
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
                {/* Drivers Table */}
                <div className="page-header">
                    <h1>Quản lý tài xế</h1>
                    <div className="header-actions">
                        <div className="search-input-wrapper" style={{marginRight: '12px'}}>
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn-action" onClick={handleAddDriver}>
                            ➕ Thêm tài xế mới
                        </button>
                    </div>
                </div>

                {selectedDrivers.length > 0 && (
                    <BulkActionToolbar
                        selectedCount={selectedDrivers.length}
                        onChangeStatus={() => setShowBulkStatusModal(true)}
                        onClear={() => setSelectedDrivers([])}
                        onDelete={handleBulkDelete}
                        hideAssignDriver={true}
                        hideDelete={true}
                    />
                )}

                <div className="orders-table-container">
                    {loading ? (
                        <div className="loading">Đang tải...</div>
                    ) : (
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-column">
                                        <input 
                                            type="checkbox"
                                            checked={selectedDrivers.length === drivers.length && drivers.length > 0}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        DRIVER ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        TÊN TÀI XẾ {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('email')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        EMAIL {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        SỐ ĐIỆN THOẠI {sortBy === 'phone' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('vehicleId')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        ID XE {sortBy === 'vehicleId' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('vehicle')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        XE ĐƯỢC GÁN {sortBy === 'vehicle' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('licenseClass')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        LOẠI GPLX {sortBy === 'licenseClass' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        TRẠNG THÁI {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getSortedDrivers(drivers
                                    .filter(driver => {
                                        if (!searchTerm) return true;
                                        const search = searchTerm.toLowerCase();
                                        return driver.name?.toLowerCase().includes(search) ||
                                               driver.email?.toLowerCase().includes(search) ||
                                               driver.phone?.toLowerCase().includes(search);
                                    })
                                ).map((driver) => {
                                    const statusConfig = getStatusBadge(driver.status);
                                    const isSelected = selectedDrivers.includes(driver._id);
                                    return (
                                        <tr key={driver._id} className={isSelected ? 'table-row-selected' : ''}>
                                            <td className="checkbox-column">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectDriver(driver._id)}
                                                />
                                            </td>
                                            <td>{driver.id}</td>
                                            <td>{driver.name}</td>
                                            <td>{driver.email || 'N/A'}</td>
                                            <td>{driver.phone}</td>
                                            <td>{driver.vehicleId || 'N/A'}</td>
                                            <td>{driver.vehicleType}</td>
                                            <td>{driver.licenseClass || 'N/A'}</td>
                                            <td>
                                                <span className={`status-badge ${statusConfig.class}`}>
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button 
                                                        className="btn-small"
                                                        onClick={() => handleViewDriver(driver)}
                                                    >
                                                        VIEW
                                                    </button>
                                                    <button 
                                                        className="btn-small-outline"
                                                        onClick={() => handleEditDriver(driver)}
                                                    >
                                                        EDIT
                                                    </button>
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
                                    {vehicles
                                        .filter(vehicle => {
                                            // Show vehicle if:
                                            // 1. Not assigned to any driver, OR
                                            // 2. Assigned to current editing driver
                                            const assignedDriver = drivers.find(d => d.vehicleId === vehicle.id);
                                            return !assignedDriver || (selectedDriver && assignedDriver._id === selectedDriver._id);
                                        })
                                        .map(vehicle => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                ID: {vehicle.id} - {vehicle.licensePlate} ({vehicle.type})
                                            </option>
                                        ))
                                    }
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
                                <label>Loại GPLX</label>
                                <select 
                                    value={newDriver.licenseClass}
                                    onChange={(e) => setNewDriver({...newDriver, licenseClass: e.target.value})}
                                >
                                    <option value="">Chọn loại GPLX</option>
                                    <option value="B1">B1 - Xe mô tô 2 bánh</option>
                                    <option value="B2">B2 - Xe ô tô dưới 9 chỗ</option>
                                    <option value="C">C - Xe tải, xe chở hàng</option>
                                    <option value="D">D - Xe ô tô từ 9-30 chỗ</option>
                                    <option value="E">E - Xe ô tô trên 30 chỗ</option>
                                    <option value="FB2">FB2 - B2 + Rơ moóc</option>
                                    <option value="FC">FC - C + Rơ moóc</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Hạn GPLX</label>
                                <input 
                                    type="date" 
                                    value={newDriver.licenseExpiry}
                                    onChange={(e) => setNewDriver({...newDriver, licenseExpiry: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Ngày vào làm</label>
                                <input 
                                    type="date" 
                                    value={newDriver.joinDate}
                                    onChange={(e) => setNewDriver({...newDriver, joinDate: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Trạng thái</label>
                                <select 
                                    value={newDriver.status}
                                    onChange={(e) => setNewDriver({...newDriver, status: e.target.value})}
                                >
                                    <option value="active">Đang hoạt động</option>
                                    <option value="available">Sẵn sàng</option>
                                    <option value="busy">Đang bận</option>
                                    <option value="offline">Ngoại tuyến</option>
                                    <option value="on_leave">Nghỉ phép</option>
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

            {/* View Driver Modal */}
            {showViewModal && selectedDriver && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Chi tiết tài xế</h3>
                            <button className="close-btn" onClick={() => setShowViewModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-section">
                                <h4>Thông tin cá nhân</h4>
                                <div className="detail-group">
                                    <label>ID:</label>
                                    <span>{selectedDriver.id}</span>
                                </div>
                                <div className="detail-group">
                                    <label>Họ tên:</label>
                                    <span>{selectedDriver.name}</span>
                                </div>
                                <div className="detail-group">
                                    <label>Số điện thoại:</label>
                                    <span>{selectedDriver.phone}</span>
                                </div>
                                <div className="detail-group">
                                    <label>Email:</label>
                                    <span>{selectedDriver.email || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Thông tin xe</h4>
                                <div className="detail-group">
                                    <label>ID xe:</label>
                                    <span>{selectedDriver.vehicleId}</span>
                                </div>
                                <div className="detail-group">
                                    <label>Biển số xe:</label>
                                    <span>{selectedDriver.vehicleLicense}</span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Giấy phép lái xe</h4>
                                <div className="detail-group">
                                    <label>Số GPLX:</label>
                                    <span>{selectedDriver.licenseNumber || 'N/A'}</span>
                                </div>
                                <div className="detail-group">
                                    <label>Loại GPLX:</label>
                                    <span>{selectedDriver.licenseClass || 'N/A'}</span>
                                </div>
                                <div className="detail-group">
                                    <label>Hạn GPLX:</label>
                                    <span>{selectedDriver.licenseExpiry ? new Date(selectedDriver.licenseExpiry).toLocaleDateString('vi-VN') : 'N/A'}</span>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Hiệu suất làm việc</h4>
                                <div className="detail-group">
                                    <label>Trạng thái:</label>
                                    <span className={`status-badge ${getStatusBadge(selectedDriver.status).class}`}>
                                        {getStatusBadge(selectedDriver.status).label}
                                    </span>
                                </div>
                                <div className="detail-group">
                                    <label>Đánh giá:</label>
                                    <span>⭐ {selectedDriver.rating.toFixed(1)}</span>
                                </div>
                                <div className="detail-group">
                                    <label>Tỷ lệ đúng giờ:</label>
                                    <span>🎯 {selectedDriver.onTimeRate}%</span>
                                </div>
                                <div className="detail-group">
                                    <label>Tổng số đơn:</label>
                                    <span>📦 {selectedDriver.totalDeliveries}</span>
                                </div>
                                <div className="detail-group">
                                    <label>Ngày vào làm:</label>
                                    <span>{selectedDriver.joinDate ? new Date(selectedDriver.joinDate).toLocaleDateString('vi-VN') : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => setShowViewModal(false)}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Status Change Modal */}
            {showBulkStatusModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Đổi trạng thái tài xế</h3>
                            <button className="close-btn" onClick={() => setShowBulkStatusModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p>Chọn trạng thái mới cho <strong>{selectedDrivers.length}</strong> tài xế đã chọn:</p>
                            <div className="form-group">
                                <label>Trạng thái mới</label>
                                <select 
                                    id="bulk-status-select"
                                    className="form-control"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Chọn trạng thái...</option>
                                    <option value="active">Đang hoạt động</option>
                                    <option value="available">Sẵn sàng</option>
                                    <option value="busy">Đang bận</option>
                                    <option value="offline">Ngoại tuyến</option>
                                    <option value="on_leave">Nghỉ phép</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => setShowBulkStatusModal(false)}>
                                Hủy
                            </button>
                            <button 
                                className="save-btn" 
                                onClick={() => {
                                    const select = document.getElementById('bulk-status-select');
                                    const newStatus = select.value;
                                    if (newStatus) {
                                        handleBulkStatusChange(newStatus);
                                    } else {
                                        alert('Vui lòng chọn trạng thái!');
                                    }
                                }}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DriversManagement;
