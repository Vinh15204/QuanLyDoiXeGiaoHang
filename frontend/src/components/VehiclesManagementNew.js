import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import AddressDisplay from './AddressDisplay';
import BulkActionToolbar from './BulkActionToolbar';
import BulkVehicleStatusModal from './BulkVehicleStatusModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Helper function để chuyển đổi position format
const normalizeCoords = (coords) => {
    if (!coords) return null;
    if (Array.isArray(coords)) {
        return { lat: coords[0], lng: coords[1] };
    }
    if (coords.lat && coords.lng) {
        return coords;
    }
    return null;
};

function VehiclesManagementNew() {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        licensePlate: '',
        model: '',
        brand: '',
        year: '',
        color: '',
        fuelType: 'diesel',
        registrationExpiry: '',
        insuranceExpiry: '',
        type: 'Standard',
        capacity: '',
        status: 'available',
        lat: '',
        lng: ''
    });
    const [currentUser] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });

    // Bulk selection states
    const [selectedVehicles, setSelectedVehicles] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);

    // Sorting states
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');

    console.log('🚛 VehiclesManagementNew rendered');

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const getSortedVehicles = () => {
        if (!sortBy) return vehicles;
        
        return [...vehicles].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            // Handle driver name sorting
            if (sortBy === 'driver') {
                const driverA = drivers.find(d => d.vehicleId === a.id);
                const driverB = drivers.find(d => d.vehicleId === b.id);
                aVal = driverA?.name || '';
                bVal = driverB?.name || '';
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

    const handleAddVehicle = () => {
        setFormData({
            id: '',
            licensePlate: '',
            model: '',
            brand: '',
            year: '',
            color: '',
            fuelType: 'diesel',
            registrationExpiry: '',
            insuranceExpiry: '',
            type: 'Standard',
            capacity: '',
            status: 'available',
            lat: '',
            lng: ''
        });
        setSelectedVehicle(null);
        setShowAddModal(true);
    };

    const handleViewDetails = (vehicle) => {
        setSelectedVehicle(vehicle);
        setShowModal(true);
    };

    const handleEdit = (vehicle) => {
        setSelectedVehicle(vehicle);
        setFormData({
            id: vehicle.id || '',
            licensePlate: vehicle.licensePlate || '',
            model: vehicle.model || '',
            brand: vehicle.brand || '',
            year: vehicle.year || '',
            color: vehicle.color || '',
            fuelType: vehicle.fuelType || 'diesel',
            registrationExpiry: vehicle.registrationExpiry ? vehicle.registrationExpiry.split('T')[0] : '',
            insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.split('T')[0] : '',
            type: vehicle.type || 'Standard',
            capacity: vehicle.capacity || vehicle.maxLoad || '',
            status: vehicle.status || 'available',
            lat: vehicle.location ? vehicle.location[0] : (vehicle.position ? vehicle.position[0] : ''),
            lng: vehicle.location ? vehicle.location[1] : (vehicle.position ? vehicle.position[1] : '')
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setShowAddModal(false);
        setSelectedVehicle(null);
        setFormData({
            id: '',
            licensePlate: '',
            model: '',
            brand: '',
            year: '',
            color: '',
            fuelType: 'diesel',
            registrationExpiry: '',
            insuranceExpiry: '',
            type: 'Standard',
            capacity: '',
            status: 'available',
            lat: '',
            lng: ''
        });
    };

    const handleSaveVehicle = async () => {
        try {
            // Validate form
            if (!formData.licensePlate || !formData.capacity) {
                alert('Vui lòng điền biển số xe và tải trọng!');
                return;
            }

            const vehicleData = {
                id: formData.id || undefined,
                licensePlate: formData.licensePlate.toUpperCase(),
                model: formData.model,
                brand: formData.brand,
                year: formData.year ? parseInt(formData.year) : null,
                color: formData.color,
                fuelType: formData.fuelType,
                registrationExpiry: formData.registrationExpiry || null,
                insuranceExpiry: formData.insuranceExpiry || null,
                type: formData.type,
                capacity: parseFloat(formData.capacity),
                maxLoad: parseFloat(formData.capacity),
                status: formData.status,
                location: formData.lat && formData.lng ? [parseFloat(formData.lat), parseFloat(formData.lng)] : null,
                position: formData.lat && formData.lng ? [parseFloat(formData.lat), parseFloat(formData.lng)] : null
            };

            console.log('Saving vehicle:', vehicleData);

            const method = selectedVehicle ? 'PATCH' : 'POST';
            const url = selectedVehicle 
                ? `${API_BASE_URL}/api/vehicles/${selectedVehicle.id}`
                : `${API_BASE_URL}/api/vehicles`;

            console.log('Request:', method, url);

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicleData)
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Success:', result);
                alert(selectedVehicle ? 'Cập nhật xe thành công!' : 'Thêm xe thành công!');
                handleCloseModal();
                fetchVehicles();
            } else {
                const errorData = await response.text();
                console.error('Error response:', errorData);
                alert('Có lỗi xảy ra! Status: ' + response.status + '\n' + errorData);
            }
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        }
    };

    // ==================== BULK SELECTION HANDLERS ====================
    const handleSelectVehicle = (vehicleId) => {
        setSelectedVehicles(prev => {
            if (prev.includes(vehicleId)) {
                return prev.filter(id => id !== vehicleId);
            } else {
                return [...prev, vehicleId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedVehicles([]);
        } else {
            setSelectedVehicles(vehicles.map(v => v.id));
        }
        setSelectAll(!selectAll);
    };

    const handleClearSelection = () => {
        setSelectedVehicles([]);
        setSelectAll(false);
    };

    const handleBulkStatusChange = async (newStatus) => {
        try {
            setBulkActionLoading(true);
            
            const response = await fetch(`${API_BASE_URL}/api/vehicles/bulk-status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicleIds: selectedVehicles,
                    newStatus: newStatus
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert(`✅ Đã cập nhật trạng thái ${result.modifiedCount || result.updatedCount} xe!`);
                await fetchVehicles();
                handleClearSelection();
                setShowBulkStatusModal(false);
            } else {
                alert(`❌ Lỗi: ${result.message || 'Không thể cập nhật trạng thái'}`);
            }
        } catch (error) {
            console.error('Error bulk status change:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedVehicles.length} xe đã chọn?`)) {
            return;
        }

        try {
            setBulkActionLoading(true);
            
            const response = await fetch(`${API_BASE_URL}/api/vehicles/bulk-delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicleIds: selectedVehicles
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert(`✅ Đã xóa ${result.deletedCount} xe!`);
                await fetchVehicles();
                handleClearSelection();
            } else {
                alert(`❌ Lỗi: ${result.message || 'Không thể xóa xe'}`);
            }
        } catch (error) {
            console.error('Error bulk delete:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            setBulkActionLoading(false);
        }
    };
    // ==================== END BULK ACTIONS ====================

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        fetchVehicles();
        fetchDrivers();
    }, [currentUser, navigate]);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/vehicles`);
            if (response.ok) {
                const data = await response.json();
                setVehicles(data);
            }
        } catch (err) {
            setError('Lỗi khi tải dữ liệu xe: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDrivers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users?role=driver`);
            if (response.ok) {
                const data = await response.json();
                setDrivers(data);
            }
        } catch (err) {
            console.error('Error fetching drivers:', err);
        }
    };

    return (
        <div className="vehicles-content">
                    <div className="page-header">
                        <h1>Fleet Management</h1>
                        <button className="btn-primary" onClick={handleAddVehicle}>
                            ➕ Thêm xe
                        </button>
                    </div>

                    {loading && <div className="loading">Loading vehicles...</div>}
                    {error && <div className="error-message">{error}</div>}

                    {/* Bulk Action Toolbar */}
                    <BulkActionToolbar 
                        selectedCount={selectedVehicles.length}
                        onClear={handleClearSelection}
                        onChangeStatus={() => setShowBulkStatusModal(true)}
                        onDelete={handleBulkDelete}
                        loading={bulkActionLoading}
                        hideAssignDriver={true}
                        hideDelete={true}
                    />

                    <div className="vehicles-table-container">
                        <table className="vehicles-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-column">
                                        <input 
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                            title="Select all vehicles"
                                        />
                                    </th>
                                    <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Vehicle ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('licensePlate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Biển số {sortBy === 'licensePlate' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('brand')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Hãng xe {sortBy === 'brand' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('capacity')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Capacity {sortBy === 'capacity' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Location</th>
                                    <th onClick={() => handleSort('driver')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Driver {sortBy === 'driver' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getSortedVehicles().map((vehicle, index) => (
                                    <tr 
                                        key={index}
                                        className={selectedVehicles.includes(vehicle.id) ? 'table-row-selected' : ''}
                                    >
                                        <td className="checkbox-column">
                                            <input 
                                                type="checkbox"
                                                checked={selectedVehicles.includes(vehicle.id)}
                                                onChange={() => handleSelectVehicle(vehicle.id)}
                                            />
                                        </td>
                                        <td>#{vehicle.id}</td>
                                        <td>{vehicle.licensePlate || '-'}</td>
                                        <td>{vehicle.type || 'Standard'}</td>
                                        <td>{vehicle.brand || '-'}</td>
                                        <td>{vehicle.capacity || vehicle.maxLoad || 0}kg</td>
                                        <td>
                                            <span className={`status-badge ${vehicle.status || 'available'}`}>
                                                {vehicle.status === 'available' ? '✅ Available' : 
                                                 vehicle.status === 'in_use' ? '🚚 In Use' : 
                                                 vehicle.status === 'maintenance' ? '🔧 Maintenance' : 
                                                 vehicle.status || 'Available'}
                                            </span>
                                        </td>
                                        <td>
                                            {vehicle.currentAddress ? (
                                                <span title={vehicle.currentAddress}>
                                                    {vehicle.currentAddress.length > 50 ? vehicle.currentAddress.substring(0, 50) + '...' : vehicle.currentAddress}
                                                </span>
                                            ) : normalizeCoords(vehicle.location || vehicle.position) ? (
                                                <AddressDisplay 
                                                    coordinates={normalizeCoords(vehicle.location || vehicle.position)} 
                                                    short={true} 
                                                />
                                            ) : (
                                                'Unknown'
                                            )}
                                        </td>
                                        <td>
                                            {(() => {
                                                const driver = drivers.find(d => d.vehicleId === vehicle.id);
                                                return driver ? `${driver.name} (#${driver.id})` : '-';
                                            })()}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-small"
                                                    onClick={() => handleViewDetails(vehicle)}
                                                    title="Xem chi tiết"
                                                >
                                                    VIEW
                                                </button>
                                                <button 
                                                    className="btn-small-outline" 
                                                    onClick={() => handleEdit(vehicle)}
                                                    title="Chỉnh sửa"
                                                >
                                                    EDIT
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {vehicles.length === 0 && !loading && (
                        <div className="empty-state">
                            <h3>No vehicles found</h3>
                            <p>Add your first vehicle to get started.</p>
                        </div>
                    )}

                    {/* View Details Modal */}
                    {showModal && selectedVehicle && (
                        <div className="modal-overlay" onClick={handleCloseModal}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Vehicle Details - #{selectedVehicle.id}</h3>
                                    <button className="close-btn" onClick={handleCloseModal}>❌</button>
                                </div>
                                <div className="modal-body">
                                    <h4 style={{marginTop: 0, marginBottom: '15px', color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px'}}>🚗 Thông tin xe</h4>
                                    <div className="detail-row">
                                        <strong>Biển số xe:</strong> {selectedVehicle.licensePlate || 'Chưa có'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Hãng xe:</strong> {selectedVehicle.brand || 'Chưa rõ'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Dòng xe:</strong> {selectedVehicle.model || 'Chưa rõ'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Năm sản xuất:</strong> {selectedVehicle.year || 'Chưa rõ'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Màu xe:</strong> {selectedVehicle.color || 'Chưa rõ'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Loại nhiên liệu:</strong> {(() => {
                                            const fuelTypes = {
                                                'diesel': 'Dầu diesel',
                                                'gasoline': 'Xăng',
                                                'electric': 'Điện',
                                                'hybrid': 'Hybrid'
                                            };
                                            return fuelTypes[selectedVehicle.fuelType] || selectedVehicle.fuelType || 'Chưa rõ';
                                        })()}
                                    </div>
                                    
                                    <h4 style={{marginTop: '20px', marginBottom: '15px', color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px'}}>📋 Thông số kỹ thuật</h4>
                                    <div className="detail-row">
                                        <strong>Loại xe:</strong> {selectedVehicle.type}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Tải trọng:</strong> {selectedVehicle.capacity || selectedVehicle.maxLoad || 0}kg
                                    </div>
                                    <div className="detail-row">
                                        <strong>Trạng thái:</strong> {selectedVehicle.status || 'Available'}
                                    </div>
                                    
                                    <h4 style={{marginTop: '20px', marginBottom: '15px', color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px'}}>📄 Giấy tờ xe</h4>
                                    <div className="detail-row">
                                        <strong>Hạn đăng kiểm:</strong> {selectedVehicle.registrationExpiry ? new Date(selectedVehicle.registrationExpiry).toLocaleDateString('vi-VN') : 'Chưa có'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Hạn bảo hiểm:</strong> {selectedVehicle.insuranceExpiry ? new Date(selectedVehicle.insuranceExpiry).toLocaleDateString('vi-VN') : 'Chưa có'}
                                    </div>
                                    
                                    <h4 style={{marginTop: '20px', marginBottom: '15px', color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px'}}>📍 Vị trí</h4>
                                    <div className="detail-row">
                                        <strong>Location:</strong> 
                                        {selectedVehicle.currentAddress ? (
                                            <div>
                                                <div>{selectedVehicle.currentAddress}</div>
                                                {normalizeCoords(selectedVehicle.location || selectedVehicle.position) && (() => {
                                                    const coords = normalizeCoords(selectedVehicle.location || selectedVehicle.position);
                                                    return (
                                                        <small style={{color: '#888'}}>
                                                            ({coords.lat.toFixed(6)}, {coords.lng.toFixed(6)})
                                                        </small>
                                                    );
                                                })()}
                                            </div>
                                        ) : normalizeCoords(selectedVehicle.location || selectedVehicle.position) ? (
                                            <AddressDisplay 
                                                coordinates={normalizeCoords(selectedVehicle.location || selectedVehicle.position)} 
                                                showCoords={true} 
                                            />
                                        ) : (
                                            'Unknown'
                                        )}
                                    </div>
                                    {selectedVehicle.driverId && (
                                        <div className="detail-row">
                                            <strong>Driver ID:</strong> {selectedVehicle.driverId}
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button className="btn-outline" onClick={handleCloseModal}>Close</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add/Edit Modal */}
                    {showAddModal && (
                        <div className="modal-overlay" onClick={handleCloseModal}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>{selectedVehicle ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h3>
                                    <button className="close-btn" onClick={handleCloseModal}>❌</button>
                                </div>
                                <div className="modal-body">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Vehicle ID</label>
                                            <input 
                                                type="text" 
                                                value={formData.id}
                                                onChange={(e) => setFormData({...formData, id: e.target.value})}
                                                placeholder="Tự động nếu để trống"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Biển số xe <span className="required">*</span></label>
                                            <input 
                                                type="text" 
                                                value={formData.licensePlate}
                                                onChange={(e) => setFormData({...formData, licensePlate: e.target.value})}
                                                placeholder="VD: 29A-12345"
                                                style={{textTransform: 'uppercase'}}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Hãng xe</label>
                                            <input 
                                                type="text" 
                                                value={formData.brand}
                                                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                                                placeholder="Hyundai, Isuzu, Hino..."
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Dòng xe</label>
                                            <input 
                                                type="text" 
                                                value={formData.model}
                                                onChange={(e) => setFormData({...formData, model: e.target.value})}
                                                placeholder="H150, QKR77H..."
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Năm sản xuất</label>
                                            <input 
                                                type="number" 
                                                value={formData.year}
                                                onChange={(e) => setFormData({...formData, year: e.target.value})}
                                                placeholder="2024"
                                                min="1990"
                                                max="2030"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Màu xe</label>
                                            <input 
                                                type="text" 
                                                value={formData.color}
                                                onChange={(e) => setFormData({...formData, color: e.target.value})}
                                                placeholder="Trắng, Xanh..."
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Loại nhiên liệu</label>
                                            <select 
                                                value={formData.fuelType}
                                                onChange={(e) => setFormData({...formData, fuelType: e.target.value})}
                                            >
                                                <option value="diesel">Dầu diesel</option>
                                                <option value="gasoline">Xăng</option>
                                                <option value="electric">Điện</option>
                                                <option value="hybrid">Hybrid</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Sức chứa (kg) <span className="required">*</span></label>
                                            <input 
                                                type="number" 
                                                value={formData.capacity}
                                                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                                                placeholder="Nhập tải trọng"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Hạn đăng kiểm</label>
                                            <input 
                                                type="date" 
                                                value={formData.registrationExpiry}
                                                onChange={(e) => setFormData({...formData, registrationExpiry: e.target.value})}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Hạn bảo hiểm</label>
                                            <input 
                                                type="date" 
                                                value={formData.insuranceExpiry}
                                                onChange={(e) => setFormData({...formData, insuranceExpiry: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Loại xe</label>
                                        <select 
                                            value={formData.type}
                                            onChange={(e) => setFormData({...formData, type: e.target.value})}
                                        >
                                            <option value="">Chọn loại xe</option>
                                            <option value="Standard">Standard</option>
                                            <option value="Truck">Truck</option>
                                            <option value="Van">Van</option>
                                            <option value="Motorcycle">Motorcycle</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Trạng thái</label>
                                        <select 
                                            value={formData.status}
                                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                                        >
                                            <option value="available">Available</option>
                                            <option value="in_use">In Use</option>
                                            <option value="maintenance">Maintenance</option>
                                        </select>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Latitude</label>
                                            <input 
                                                type="number" 
                                                step="0.000001"
                                                value={formData.lat}
                                                onChange={(e) => setFormData({...formData, lat: e.target.value})}
                                                placeholder="Vĩ độ"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Longitude</label>
                                            <input 
                                                type="number" 
                                                step="0.000001"
                                                value={formData.lng}
                                                onChange={(e) => setFormData({...formData, lng: e.target.value})}
                                                placeholder="Kinh độ"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn-outline" onClick={handleCloseModal}>Hủy</button>
                                    <button className="btn-primary" onClick={handleSaveVehicle}>
                                        {selectedVehicle ? 'Cập nhật' : 'Thêm mới'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bulk Status Change Modal */}
                    <BulkVehicleStatusModal 
                        isOpen={showBulkStatusModal}
                        onClose={() => setShowBulkStatusModal(false)}
                        onConfirm={handleBulkStatusChange}
                        selectedCount={selectedVehicles.length}
                    />
                </div>
    );
}

export default VehiclesManagementNew;
