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
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [driverStats, setDriverStats] = useState({});
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
            
            // Get all unfinished orders (including manual assignments for backend to create constraints)
            const ordersToOptimize = orders.filter(o => 
                o.status !== 'delivered' && 
                o.status !== 'cancelled'
            );
            
            const manualCount = ordersToOptimize.filter(o => o.assignmentType === 'manual').length;
            const autoCount = ordersToOptimize.length - manualCount;
            
            if (ordersToOptimize.length === 0) {
                alert('Không có đơn hàng nào cần phân công!');
                setLoading(false);
                return;
            }
            
            if (vehiclesData.length === 0) {
                alert('Không có xe nào khả dụng!');
                setLoading(false);
                return;
            }
            
            console.log(`🚀 Optimizing ${autoCount} orders (${manualCount} manual assignments will be preserved)...`);
            
            // Format data for optimization API
            // Send ALL orders (including manual) so backend can create constraints
            const optimizationData = {
                vehicles: vehiclesData.map(v => ({
                    id: v.id,
                    maxLoad: v.capacity || v.maxLoad || 100,
                    position: v.location || v.position || [21.0285, 105.8542] // Default Hanoi
                })),
                orders: ordersToOptimize.map(o => ({
                    id: o.id,
                    weight: o.weight || 10,
                    pickup: o.pickup || [21.0285, 105.8542],
                    delivery: o.delivery || [21.0285, 105.8542],
                    pickupAddress: o.pickupAddress || null,
                    deliveryAddress: o.deliveryAddress || null
                }))
            };
            
            console.log('Sending optimization request:', optimizationData);
            
            // Clear cached routes before optimization
            sessionStorage.removeItem('cachedRoutes');
            sessionStorage.removeItem('cacheTime');
            // Set flag to force refresh on dashboard
            sessionStorage.setItem('forceRefreshRoutes', 'true');
            console.log('🗑️ Cleared route cache and set force refresh flag');
            
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
            
            // Reload orders to reflect updated assignments
            console.log('🔄 Reloading orders after optimization...');
            await fetchOrders();
            console.log('✅ Orders reloaded');
            
            // Set loading false after fetch completes
            if (isMounted) {
                setLoading(false);
            }
            
            // Show success message
            alert(`Phân công thành công!\n` +
                  `- Tổng đơn hàng: ${result.stats.totalOrders}\n` +
                  `- Đơn đã phân công: ${result.stats.assignedOrders}\n` +
                  `- Số xe sử dụng: ${result.stats.vehiclesWithRoutes}/${result.stats.totalVehicles}\n\n` +
                  `Danh sách đơn hàng đã được cập nhật!\nXem chi tiết tuyến đường trên Dashboard.`);
            
            // Optional: Navigate to Dashboard to see routes
            // Uncomment if you want to auto-navigate
            // navigate('/admin/map');
            
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

            // Check if driver changed and both old & new drivers exist
            const oldDriverId = selectedOrder?.driverId;
            const newDriverId = formData.driverId ? parseInt(formData.driverId) : null;
            const driverChanged = selectedOrder && oldDriverId && newDriverId && oldDriverId !== newDriverId;

            if (driverChanged) {
                const shouldRecalculate = window.confirm(
                    `Bạn đang chuyển đơn hàng từ Driver #${oldDriverId} sang Driver #${newDriverId}.\n\n` +
                    `Bạn có muốn tính lại quãng đường tối ưu cho cả 2 tài xế không?\n\n` +
                    `- Có: Tính lại route tối ưu cho cả 2 tài xế\n` +
                    `- Hủy: Không lưu thay đổi`
                );

                if (!shouldRecalculate) {
                    return; // Cancel the change
                }

                // Will recalculate routes after saving
            }

            // Determine assignment type based on driverId
            let assignmentType = null;
            let orderStatus = formData.status;
            
            if (formData.driverId) {
                if (selectedOrder) {
                    // Editing existing order
                    const wasAutoAssigned = selectedOrder.assignmentType === 'auto';
                    const driverChangedNow = selectedOrder.driverId !== parseInt(formData.driverId);
                    
                    if (!wasAutoAssigned || driverChangedNow) {
                        assignmentType = 'manual';
                        orderStatus = 'assigned';
                        console.log('🖐️ Manual assignment detected (edit)');
                    }
                } else {
                    // Creating new order with driver assigned
                    assignmentType = 'manual';
                    orderStatus = 'assigned';
                    console.log('🖐️ Manual assignment detected (new order)');
                }
            }

            const orderData = {
                id: formData.id || undefined,
                senderId: parseInt(formData.senderId),
                receiverId: parseInt(formData.receiverId),
                weight: parseFloat(formData.weight),
                status: orderStatus,
                driverId: formData.driverId ? parseInt(formData.driverId) : null,
                assignmentType: assignmentType,
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
                
                // If driver changed, recalculate routes for both drivers
                if (driverChanged) {
                    console.log('🔄 Recalculating routes for drivers:', oldDriverId, newDriverId);
                    
                    try {
                        const recalcResponse = await fetch(`${API_BASE_URL}/api/optimize/recalculate-drivers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                driverIds: [oldDriverId, newDriverId] 
                            })
                        });

                        if (recalcResponse.ok) {
                            const recalcResult = await recalcResponse.json();
                            console.log('✅ Routes recalculated:', recalcResult);
                            
                            // Clear route cache and force Dashboard refresh
                            sessionStorage.removeItem('cachedRoutes');
                            sessionStorage.removeItem('cacheTime');
                            sessionStorage.setItem('forceRefreshRoutes', 'true');
                            
                            // Clear localStorage route cache for both drivers
                            localStorage.removeItem(`driverRoute_${oldDriverId}`);
                            localStorage.removeItem(`driverRoute_${newDriverId}`);
                            console.log(`🗑️ Cleared route cache for drivers ${oldDriverId} and ${newDriverId}`);
                            
                            alert('Cập nhật đơn hàng và tính lại quãng đường thành công!\nTài xế reload trang để thấy tuyến đường mới.');
                        } else {
                            console.error('Failed to recalculate routes');
                            alert('Cập nhật đơn hàng thành công, nhưng không thể tính lại quãng đường.');
                        }
                    } catch (recalcError) {
                        console.error('Error recalculating routes:', recalcError);
                        alert('Cập nhật đơn hàng thành công, nhưng có lỗi khi tính lại quãng đường.');
                    }
                } else {
                    alert(selectedOrder ? 'Cập nhật đơn hàng thành công!' : 'Tạo đơn hàng thành công!');
                }
                
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
        fetchDrivers();
    }, [currentUser, navigate]);

    // Auto-refresh when returning to this page
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('🔄 Page visible again, refreshing orders...');
                fetchOrders();
                fetchDrivers();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

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

    const fetchDrivers = async () => {
        try {
            const [usersRes, routesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/users`),
                fetch(`${API_BASE_URL}/api/routes`)
            ]);

            if (usersRes.ok) {
                const users = await usersRes.json();
                const driverList = users.filter(u => u.role === 'driver');
                setDrivers(driverList);

                // Fetch stats for each driver
                if (routesRes.ok) {
                    const routesData = await routesRes.json();
                    const routes = routesData.routes || routesData || [];
                    
                    const stats = {};
                    driverList.forEach(driver => {
                        const vehicleId = driver.vehicleId || driver.id;
                        const driverRoute = routes.find(r => r.vehicleId === vehicleId);
                        
                        stats[vehicleId] = {
                            orderCount: driverRoute?.assignedOrders?.length || 0,
                            distance: driverRoute?.distance || 0,
                            weight: driverRoute?.totalWeight || 0
                        };
                    });
                    setDriverStats(stats);
                }
            }
        } catch (err) {
            console.error('Error fetching drivers:', err);
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

    const handleResetAssignments = async () => {
        if (!window.confirm('Bạn có chắc muốn hủy tất cả phân công tự động?\nCác đơn được gán thủ công sẽ không bị ảnh hưởng.')) {
            return;
        }

        try {
            setLoading(true);
            
            // Reset all auto-assigned orders back to pending
            const autoAssignedOrders = orders.filter(o => 
                o.status === 'assigned' && 
                o.assignmentType === 'auto'
            );

            console.log(`🔄 Resetting ${autoAssignedOrders.length} auto-assigned orders...`);

            for (const order of autoAssignedOrders) {
                await fetch(`${API_BASE_URL}/api/orders/${order.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'pending',
                        driverId: null,
                        assignmentType: null,
                        assignedAt: null
                    })
                });
            }

            // Delete all auto-generated routes
            await fetch(`${API_BASE_URL}/api/optimize/clear-auto`, {
                method: 'DELETE'
            });

            alert(`Đã hủy phân công ${autoAssignedOrders.length} đơn hàng tự động!`);
            await fetchOrders();
            setLoading(false);
        } catch (error) {
            console.error('Error resetting assignments:', error);
            alert('Có lỗi xảy ra: ' + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="orders-content">
                    <div className="page-header">
                        <h1>Orders Management</h1>
                        <div className="header-actions">
                            <button className="btn-success" onClick={handleOptimizeRoutes} disabled={orders.length === 0}>
                                🚚 Phân công tự động
                            </button>
                            <button className="btn-warning" onClick={handleResetAssignments} disabled={orders.length === 0}>
                                ❌ Hủy phân công
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
                                            {order.driverId ? (
                                                <span>
                                                    Driver #{order.driverId}
                                                    {order.assignmentType === 'manual' && <span style={{fontSize: '11px', color: '#666'}}> (Thủ công)</span>}
                                                </span>
                                            ) : 'Unassigned'}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className="btn-small"
                                                    onClick={() => handleViewOrder(order)}
                                                    title="Xem chi tiết"
                                                >
                                                    VIEW
                                                </button>
                                                <button 
                                                    className="btn-small-outline" 
                                                    onClick={() => handleEditOrder(order)}
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
                                                <option value="pending">Pending - Chờ duyệt</option>
                                                <option value="approved">Approved - Đã duyệt</option>
                                                <option value="assigned">Assigned - Đã phân công</option>
                                                <option value="in_transit">In Transit - Đang lấy hàng</option>
                                                <option value="picked">Picked - Đã lấy hàng</option>
                                                <option value="delivering">Delivering - Đang giao hàng</option>
                                                <option value="delivered">Delivered - Đã giao xong</option>
                                                <option value="cancelled">Cancelled - Đã hủy</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tài xế phụ trách</label>
                                            <select
                                                value={formData.driverId}
                                                onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <option value="">-- Chưa phân công --</option>
                                                {drivers.map(driver => {
                                                    const vehicleId = driver.vehicleId || driver.id;
                                                    const stats = driverStats[vehicleId] || {};
                                                    return (
                                                        <option key={driver.id} value={vehicleId}>
                                                            {driver.name} (Xe #{vehicleId}) - {stats.orderCount || 0} đơn, {(stats.distance || 0).toFixed(1)}km, {(stats.weight || 0).toFixed(0)}kg
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            {formData.driverId && (
                                                <div style={{
                                                    marginTop: '10px',
                                                    padding: '10px',
                                                    background: '#f0f9ff',
                                                    borderRadius: '6px',
                                                    fontSize: '13px'
                                                }}>
                                                    <strong>ℹ️ Thông tin xe:</strong><br/>
                                                    {(() => {
                                                        const stats = driverStats[formData.driverId] || {};
                                                        return (
                                                            <>
                                                                • Số đơn hàng: {stats.orderCount || 0}<br/>
                                                                • Tổng quãng đường: {(stats.distance || 0).toFixed(2)} km<br/>
                                                                • Tổng khối lượng: {(stats.weight || 0).toFixed(0)} kg
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
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
