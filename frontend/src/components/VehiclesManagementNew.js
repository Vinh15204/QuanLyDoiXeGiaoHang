import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import AddressDisplay from './AddressDisplay';

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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
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

    console.log('🚛 VehiclesManagementNew rendered');

    const handleAddVehicle = () => {
        setFormData({
            id: '',
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
            if (!formData.type || !formData.capacity) {
                alert('Vui lòng điền đầy đủ thông tin!');
                return;
            }

            const vehicleData = {
                id: formData.id || undefined,
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

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        fetchVehicles();
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

    return (
        <div className="management-content">
                    <div className="page-header">
                        <h1>Fleet Management</h1>
                        <button className="btn-primary" onClick={handleAddVehicle}>
                            ➕ Thêm
                        </button>
                    </div>

                    {loading && <div className="loading">Loading vehicles...</div>}
                    {error && <div className="error-message">{error}</div>}

                    <div className="vehicles-grid">
                        {vehicles.map((vehicle, index) => (
                            <div key={index} className="vehicle-card">
                                <div className="vehicle-header">
                                    <div className="vehicle-id">Vehicle #{vehicle.id}</div>
                                    <div className={`vehicle-status ${vehicle.status || 'available'}`}>
                                        {vehicle.status || 'Available'}
                                    </div>
                                </div>
                                
                                <div className="vehicle-details">
                                    <div className="detail-row">
                                        <span>Type:</span>
                                        <span>{vehicle.type || 'Standard'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Capacity:</span>
                                        <span>{vehicle.capacity || vehicle.maxLoad || 0}kg</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>Location:</span>
                                        <span>
                                            {vehicle.currentAddress ? (
                                                <span title={vehicle.currentAddress}>
                                                    {vehicle.currentAddress.length > 40 ? vehicle.currentAddress.substring(0, 40) + '...' : vehicle.currentAddress}
                                                </span>
                                            ) : normalizeCoords(vehicle.location || vehicle.position) ? (
                                                <AddressDisplay 
                                                    coordinates={normalizeCoords(vehicle.location || vehicle.position)} 
                                                    short={true} 
                                                />
                                            ) : (
                                                'Unknown'
                                            )}
                                        </span>
                                    </div>
                                    {vehicle.driverId && (
                                        <div className="detail-row">
                                            <span>Driver:</span>
                                            <span>Driver #{vehicle.driverId}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="vehicle-actions">
                                    <button 
                                        className="btn-secondary"
                                        onClick={() => handleViewDetails(vehicle)}
                                    >
                                        View Details
                                    </button>
                                    <button className="btn-outline" onClick={() => handleEdit(vehicle)}>Edit</button>
                                </div>
                            </div>
                        ))}
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
                                    <div className="detail-row">
                                        <strong>Type:</strong> {selectedVehicle.type || 'Standard'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Capacity:</strong> {selectedVehicle.capacity || selectedVehicle.maxLoad || 0}kg
                                    </div>
                                    <div className="detail-row">
                                        <strong>Status:</strong> {selectedVehicle.status || 'Available'}
                                    </div>
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
                                    <div className="form-group">
                                        <label>Vehicle ID</label>
                                        <input 
                                            type="text" 
                                            value={formData.id}
                                            onChange={(e) => setFormData({...formData, id: e.target.value})}
                                            placeholder="Nhập ID xe (tự động nếu để trống)"
                                        />
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
                                        <label>Sức chứa (kg)</label>
                                        <input 
                                            type="number" 
                                            value={formData.capacity}
                                            onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                                            placeholder="Nhập sức chứa"
                                            min="0"
                                        />
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
                </div>
    );
}

export default VehiclesManagementNew;
