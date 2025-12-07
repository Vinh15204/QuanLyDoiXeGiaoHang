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

function OrdersManagement() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        senderId: '',
        receiverId: '',
        weight: '',
        status: 'pending',
        driverId: '',
        notes: ''
    });
    const [currentUser] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });

    // Track if component is mounted to prevent setState on unmounted component
    const [isMounted, setIsMounted] = useState(true);
    
    useEffect(() => {
        setIsMounted(true);
        return () => {
            setIsMounted(false);
        };
    }, []);

    const handleCreateOrder = () => {
        setFormData({
            id: '',
            senderId: '',
            receiverId: '',
            weight: '',
            status: 'pending',
            driverId: '',
            notes: ''
        });
        setSelectedOrder(null);
        setShowAddModal(true);
    };

    const handleViewOrder = (order) => {
        setSelectedOrder(order);
        setShowModal(true);
    };

    const handleEditOrder = (order) => {
        setSelectedOrder(order);
        setFormData({
            id: order.id || '',
            senderId: order.senderId || '',
            receiverId: order.receiverId || '',
            weight: order.weight || '',
            status: order.status || 'pending',
            driverId: order.driverId || '',
            notes: order.notes || ''
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setShowAddModal(false);
        setSelectedOrder(null);
        setFormData({
            id: '',
            senderId: '',
            receiverId: '',
            weight: '',
            status: 'pending',
            driverId: '',
            notes: ''
        });
    };

    const handleOptimizeRoutes = async () => {
        try {
            if (!isMounted) return;
            setLoading(true);
            
            // Fetch vehicles
            const vehiclesRes = await fetch(`${API_BASE_URL}/api/vehicles`);
            if (!vehiclesRes.ok) {
                throw new Error('Không thể tải danh sách xe');
            }
            const vehiclesData = await vehiclesRes.json();
            
            // Filter only pending orders for optimization
            const pendingOrders = orders.filter(o => o.status === 'pending');
            
            if (pendingOrders.length === 0) {
                alert('Không có đơn hàng nào cần phân công!');
                return;
            }
            
            if (vehiclesData.length === 0) {
                alert('Không có xe nào khả dụng!');
                return;
            }
            
            // Format data for optimization API
            const optimizationData = {
                vehicles: vehiclesData.map(v => ({
                    id: v.id,
                    maxLoad: v.capacity || v.maxLoad || 100,
                    position: v.location || v.position || [21.0285, 105.8542] // Default Hanoi
                })),
                orders: pendingOrders.map(o => ({
                    id: o.id,
                    weight: o.weight || 10,
                    pickup: o.pickup || [21.0285, 105.8542],
                    delivery: o.delivery || [21.0285, 105.8542],
                    pickupAddress: o.pickupAddress || null,
                    deliveryAddress: o.deliveryAddress || null
                }))
            };
            
            console.log('Sending optimization request:', optimizationData);
            
            // Call optimization API
            const response = await fetch(`${API_BASE_URL}/api/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(optimizationData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Lỗi khi tối ưu hóa lộ trình');
            }
            
            const result = await response.json();
            console.log('✅ Optimization result:', result);
            
            // Routes are saved in database by API
            // Dashboard will fetch from API automatically
            
            // Set loading false BEFORE navigate (only if still mounted)
            if (isMounted) {
                setLoading(false);
            }
            
            // Show success message
            alert(`Phân công thành công!\n` +
                  `- Tổng đơn hàng: ${result.stats.totalOrders}\n` +
                  `- Đơn đã phân công: ${result.stats.assignedOrders}\n` +
                  `- Số xe sử dụng: ${result.stats.vehiclesWithRoutes}/${result.stats.totalVehicles}\n\n` +
                  `Xem chi tiết trên Dashboard!`);
            
            // Navigate to Dashboard to see routes
            navigate('/admin/map');
            
        } catch (error) {
            console.error('Optimization error:', error);
            alert('Có lỗi xảy ra khi phân công: ' + error.message);
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    const handleSaveOrder = async () => {
        try {
            // Validate
            if (!formData.senderId || !formData.receiverId || !formData.weight) {
                alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
                return;
            }

            const orderData = {
                id: formData.id || undefined,
                senderId: parseInt(formData.senderId),
                receiverId: parseInt(formData.receiverId),
                weight: parseFloat(formData.weight),
                status: formData.status,
                driverId: formData.driverId ? parseInt(formData.driverId) : null,
                notes: formData.notes
            };

            console.log('Saving order:', orderData);

            const method = selectedOrder ? 'PATCH' : 'POST';
            const url = selectedOrder 
                ? `${API_BASE_URL}/api/orders/${selectedOrder.id}`
                : `${API_BASE_URL}/api/orders`;

            console.log('Request:', method, url);

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Success:', result);
                alert(selectedOrder ? 'Cập nhật đơn hàng thành công!' : 'Tạo đơn hàng thành công!');
                handleCloseModal();
                fetchOrders();
            } else {
                const errorData = await response.text();
                console.error('Error response:', errorData);
                alert('Có lỗi xảy ra! Status: ' + response.status + '\n' + errorData);
            }
        } catch (error) {
            console.error('Error saving order:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        }
    };

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        fetchOrders();
    }, [currentUser, navigate]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/orders`);
            if (response.ok) {
                const data = await response.json();
                setOrders(data);
            }
        } catch (err) {
            setError('Lỗi khi tải dữ liệu đơn hàng: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'orange';
            case 'in_progress': return 'blue';
            case 'completed': return 'green';
            case 'cancelled': return 'red';
            default: return 'gray';
        }
    };

    return (
        <div className="orders-content">
                    <div className="page-header">
                        <h1>Orders Management</h1>
                        <div className="header-actions">
                            <button className="btn-success" onClick={handleOptimizeRoutes} disabled={orders.length === 0}>
                                🚚 Phân công giao hàng
                            </button>
                            <button className="btn-primary" onClick={handleCreateOrder}>+ Create New Order</button>
                        </div>
                    </div>

                    {loading && <div className="loading">Loading orders...</div>}
                    {error && <div className="error-message">{error}</div>}

                    <div className="orders-table-container">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Sender</th>
                                    <th>Receiver</th>
                                    <th>Pickup Address</th>
                                    <th>Delivery Address</th>
                                    <th>Weight</th>
                                    <th>Status</th>
                                    <th>Driver</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order, index) => (
                                    <tr key={index}>
                                        <td>#{order.id}</td>
                                        <td>User #{order.senderId}</td>
                                        <td>User #{order.receiverId}</td>
                                        <td>
                                            {order.pickupAddress ? (
                                                <span title={order.pickupAddress}>{order.pickupAddress.length > 40 ? order.pickupAddress.substring(0, 40) + '...' : order.pickupAddress}</span>
                                            ) : order.pickup ? (
                                                <AddressDisplay coordinates={order.pickup} short={true} />
                                            ) : (
                                                'N/A'
                                            )}
                                        </td>
                                        <td>
                                            {order.deliveryAddress ? (
                                                <span title={order.deliveryAddress}>{order.deliveryAddress.length > 40 ? order.deliveryAddress.substring(0, 40) + '...' : order.deliveryAddress}</span>
                                            ) : order.delivery ? (
                                                <AddressDisplay coordinates={order.delivery} short={true} />
                                            ) : (
                                                'N/A'
                                            )}
                                        </td>
                                        <td>{order.weight}kg</td>
                                        <td>
                                            <span className={`status-badge ${getStatusColor(order.status)}`}>
                                                {order.status || 'pending'}
                                            </span>
                                        </td>
                                        <td>
                                            {order.driverId ? `Driver #${order.driverId}` : 'Unassigned'}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-small"
                                                    onClick={() => handleViewOrder(order)}
                                                >
                                                    View
                                                </button>
                                                <button className="btn-small-outline" onClick={() => handleEditOrder(order)}>Edit</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {orders.length === 0 && !loading && (
                            <div className="empty-state">
                                <h3>No orders found</h3>
                                <p>Create your first order to get started.</p>
                            </div>
                        )}
                    </div>

                    {/* View Order Modal */}
                    {showModal && selectedOrder && (
                        <div className="modal-overlay" onClick={handleCloseModal}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Order Details - #{selectedOrder.id}</h3>
                                    <button className="close-btn" onClick={handleCloseModal}>❌</button>
                                </div>
                                <div className="modal-body">
                                    <div className="detail-row">
                                        <strong>Sender:</strong> User #{selectedOrder.senderId}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Receiver:</strong> User #{selectedOrder.receiverId}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Pickup Location:</strong> 
                                        {selectedOrder.pickupAddress ? (
                                            <div>
                                                <div>{selectedOrder.pickupAddress}</div>
                                                {normalizeCoords(selectedOrder.pickup) && (() => {
                                                    const coords = normalizeCoords(selectedOrder.pickup);
                                                    return (
                                                        <small style={{color: '#888'}}>
                                                            ({coords.lat.toFixed(6)}, {coords.lng.toFixed(6)})
                                                        </small>
                                                    );
                                                })()}
                                            </div>
                                        ) : normalizeCoords(selectedOrder.pickup) ? (
                                            <AddressDisplay coordinates={normalizeCoords(selectedOrder.pickup)} showCoords={true} />
                                        ) : (
                                            'N/A'
                                        )}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Delivery Location:</strong> 
                                        {selectedOrder.deliveryAddress ? (
                                            <div>
                                                <div>{selectedOrder.deliveryAddress}</div>
                                                {normalizeCoords(selectedOrder.delivery) && (() => {
                                                    const coords = normalizeCoords(selectedOrder.delivery);
                                                    return (
                                                        <small style={{color: '#888'}}>
                                                            ({coords.lat.toFixed(6)}, {coords.lng.toFixed(6)})
                                                        </small>
                                                    );
                                                })()}
                                            </div>
                                        ) : normalizeCoords(selectedOrder.delivery) ? (
                                            <AddressDisplay coordinates={normalizeCoords(selectedOrder.delivery)} showCoords={true} />
                                        ) : (
                                            'N/A'
                                        )}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Weight:</strong> {selectedOrder.weight}kg
                                    </div>
                                    <div className="detail-row">
                                        <strong>Status:</strong> {selectedOrder.status || 'pending'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Driver:</strong> {selectedOrder.driverId ? `Driver #${selectedOrder.driverId}` : 'Unassigned'}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Created:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn-outline" onClick={handleCloseModal}>Close</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Create/Edit Order Modal */}
                    {showAddModal && (
                        <div className="modal-overlay" onClick={handleCloseModal}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>{selectedOrder ? 'Chỉnh sửa đơn hàng' : 'Tạo đơn hàng mới'}</h3>
                                    <button className="close-btn" onClick={handleCloseModal}>❌</button>
                                </div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Order ID</label>
                                        <input 
                                            type="text" 
                                            value={formData.id}
                                            onChange={(e) => setFormData({...formData, id: e.target.value})}
                                            placeholder="Tự động nếu để trống"
                                            disabled={selectedOrder}
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Sender ID</label>
                                            <input 
                                                type="number" 
                                                value={formData.senderId}
                                                onChange={(e) => setFormData({...formData, senderId: e.target.value})}
                                                placeholder="ID người gửi"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Receiver ID</label>
                                            <input 
                                                type="number" 
                                                value={formData.receiverId}
                                                onChange={(e) => setFormData({...formData, receiverId: e.target.value})}
                                                placeholder="ID người nhận"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Trọng lượng (kg)</label>
                                        <input 
                                            type="number" 
                                            value={formData.weight}
                                            onChange={(e) => setFormData({...formData, weight: e.target.value})}
                                            placeholder="Nhập trọng lượng"
                                            min="0"
                                            step="0.1"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Trạng thái</label>
                                            <select 
                                                value={formData.status}
                                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Driver ID (tùy chọn)</label>
                                            <input 
                                                type="number" 
                                                value={formData.driverId}
                                                onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                                                placeholder="ID tài xế"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Ghi chú</label>
                                        <textarea 
                                            value={formData.notes}
                                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                            placeholder="Ghi chú thêm cho đơn hàng"
                                            rows="3"
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn-outline" onClick={handleCloseModal}>Hủy</button>
                                    <button className="btn-primary" onClick={handleSaveOrder}>
                                        {selectedOrder ? 'Cập nhật' : 'Tạo mới'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
        </div>
    );
}

export default OrdersManagement;
