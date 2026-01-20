import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import AddressDisplay from './AddressDisplay';
import BulkActionToolbar from './BulkActionToolbar';
import BulkAssignDriverModal from './BulkAssignDriverModal';
import BulkStatusChangeModal from './BulkStatusChangeModal';

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
    const [allOrders, setAllOrders] = useState([]); // Store all orders for filtering
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [users, setUsers] = useState([]); // Store all users for display names
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [driverStats, setDriverStats] = useState({});
    
    // Filter states
    const [filterWeight, setFilterWeight] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
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

    // Bulk selection states
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

    // Sorting states
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');
    const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const getSortedOrders = () => {
        if (!sortBy) return orders;
        
        return [...orders].sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
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
            
            // Log detailed optimization results to console with colors
            console.log('\n' + '='.repeat(80));
            console.log('%c📊 OPTIMIZATION RESULTS', 'font-size: 16px; font-weight: bold; color: #2563eb;');
            console.log('='.repeat(80));
            
            const engine = result.optimizationEngine || 'Unknown';
            const engineColor = engine === 'OR-Tools' ? '#10b981' : engine === 'JavaScript' ? '#f59e0b' : '#6b7280';
            const engineIcon = engine === 'OR-Tools' ? '🔬' : engine === 'JavaScript' ? '⚙️' : '❓';
            
            console.log(`%c${engineIcon} Engine: ${engine}`, `font-weight: bold; color: ${engineColor}`);
            console.log('📏 Total Distance:', result.stats.totalDistance?.toFixed(2) || 'N/A', 'km');
            console.log('⏱️  Makespan:', result.stats.makespan?.toFixed(2) || 'N/A', 'min');
            console.log('📦 Orders:', result.stats.assignedOrders, '/', result.stats.totalOrders);
            console.log('🚚 Vehicles:', result.stats.vehiclesWithRoutes, '/', result.stats.totalVehicles);
            console.log('');
            console.log('%c📋 ROUTE SEQUENCES:', 'font-weight: bold; color: #8b5cf6;');
            
            // Fetch routes to display sequences
            const routesRes = await fetch(`${API_BASE_URL}/api/routes`);
            if (routesRes.ok) {
                const data = await routesRes.json();
                const routes = data.routes || data; // Handle both { routes: [...] } and direct array
                console.log('Routes response:', routes, 'Type:', typeof routes, 'Is Array:', Array.isArray(routes));
                
                if (!Array.isArray(routes)) {
                    console.warn('⚠️ Routes is not an array, skipping sequence display');
                } else if (routes.length === 0) {
                    console.log('ℹ️ No routes found');
                } else {
                    routes.forEach(route => {
                    if (route.stops && route.stops.length > 0) {
                        const stops = route.stops.filter(s => s.type !== 'depot');
                        const sequence = stops.map(s => `${s.type}:${s.orderId}`).join(' → ');
                        
                        // Check if pattern is pickup-delivery-pickup-delivery (alternating)
                        let isAlternating = true;
                        for (let i = 0; i < stops.length - 1; i += 2) {
                            if (stops[i]?.type !== 'pickup' || stops[i + 1]?.type !== 'delivery') {
                                isAlternating = false;
                                break;
                            }
                        }
                        
                        const pattern = isAlternating ? '📦🎯 (pickup-delivery pairs)' : '🔀 (optimized mix)';
                        console.log(`   %cVehicle ${route.vehicleId}:`, 'color: #059669; font-weight: bold', sequence, pattern);
                    }
                    });
                }
            }
            console.log('='.repeat(80) + '\n');
            
            // Additional analysis
            console.log('%c🔍 PATTERN ANALYSIS:', 'font-weight: bold; color: #dc2626;');
            if (engine === 'OR-Tools') {
                console.log('   ✅ Using Google OR-Tools optimizer');
                console.log('   ✅ Route sequences optimized for minimum distance');
                console.log('   ✅ Can mix pickup/delivery order (pickup-pickup-delivery-delivery)');
            } else if (engine === 'JavaScript') {
                console.log('   ⚠️  Using JavaScript fallback optimizer');
                console.log('   ⚠️  May use simple pickup-delivery pairing');
                console.log('   💡 Install Python + OR-Tools for better optimization');
            }
            console.log('');
            
            // Reload orders to reflect updated assignments
            console.log('🔄 Reloading orders after optimization...');
            await fetchOrders();
            console.log('✅ Orders reloaded');
            
            // Set loading false after fetch completes
            if (isMounted) {
                setLoading(false);
            }
            
            // Show success message with engine info
            const engineInfo = result.optimizationEngine === 'OR-Tools' ? 
                '🔬 Google OR-Tools' : 
                result.optimizationEngine === 'JavaScript' ? 
                '⚙️ JavaScript Fallback' : 
                '❓ Unknown';
            
            alert(`Phân công thành công!\n\n` +
                  `Engine: ${engineInfo}\n` +
                  `- Tổng đơn hàng: ${result.stats.totalOrders}\n` +
                  `- Đơn đã phân công: ${result.stats.assignedOrders}\n` +
                  `- Số xe sử dụng: ${result.stats.vehiclesWithRoutes}/${result.stats.totalVehicles}\n` +
                  `- Quãng đường: ${result.stats.totalDistance?.toFixed(2) || 'N/A'} km\n\n` +
                  `Xem chi tiết trong Console (F12)!`);
            
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

            // Check if status changed to pending/approved and order has driver assigned
            const oldStatus = selectedOrder?.status;
            const newStatus = formData.status;
            const statusChangedToPendingOrApproved = selectedOrder && 
                selectedOrder.driverId && 
                (newStatus === 'pending' || newStatus === 'approved') &&
                oldStatus !== newStatus;

            if (statusChangedToPendingOrApproved) {
                const shouldUnassign = window.confirm(
                    `⚠️ Đổi trạng thái về "${newStatus === 'pending' ? 'Chờ xử lý' : 'Đã duyệt'}" sẽ HỦY PHÂN CÔNG tài xế #${selectedOrder.driverId}.\n\n` +
                    `Bạn có muốn tiếp tục?\n\n` +
                    `- Có: Hủy phân công và tính lại quãng đường\n` +
                    `- Hủy: Không lưu thay đổi`
                );

                if (!shouldUnassign) {
                    return; // Cancel the change
                }
            }

            // Check if driver changed and both old & new drivers exist
            const oldDriverId = selectedOrder?.driverId;
            const newDriverId = formData.driverId ? parseInt(formData.driverId) : null;
            const driverChanged = selectedOrder && oldDriverId && newDriverId && oldDriverId !== newDriverId;
            const driverAssignedNew = selectedOrder && !oldDriverId && newDriverId; // New: assigned driver to previously unassigned order

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
            } else if (driverAssignedNew) {
                const shouldRecalculate = window.confirm(
                    `Bạn đang phân công đơn hàng cho Driver #${newDriverId}.\n\n` +
                    `Bạn có muốn tính lại quãng đường tối ưu cho tài xế không?\n\n` +
                    `- Có: Tính lại route tối ưu\n` +
                    `- Hủy: Không lưu thay đổi`
                );

                if (!shouldRecalculate) {
                    return; // Cancel the change
                }

                // Will recalculate route after saving
            }

            // Determine assignment type and final status based on driverId
            let assignmentType = null;
            let orderStatus = formData.status;
            let finalDriverId = formData.driverId ? parseInt(formData.driverId) : null;
            
            // If status changed to pending/approved, unassign driver
            if (statusChangedToPendingOrApproved) {
                finalDriverId = null;
                assignmentType = null;
                console.log(`⚠️ Status changed to "${newStatus}" - unassigning driver ${oldDriverId}`);
            } else if (formData.driverId) {
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
                driverId: finalDriverId,
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
                
                // Determine which drivers need route recalculation
                let driversToRecalculate = [];
                
                if (statusChangedToPendingOrApproved) {
                    // Only old driver needs recalculation (order was unassigned)
                    driversToRecalculate = [oldDriverId];
                    console.log('🔄 Status changed - will recalculate for unassigned driver:', oldDriverId);
                } else if (driverChanged) {
                    // Both old and new drivers need recalculation
                    driversToRecalculate = [oldDriverId, newDriverId];
                    console.log('🔄 Driver changed - will recalculate for both drivers:', oldDriverId, newDriverId);
                } else if (driverAssignedNew) {
                    // Only new driver needs recalculation (first time assignment)
                    driversToRecalculate = [newDriverId];
                    console.log('🔄 Driver assigned (new) - will recalculate for driver:', newDriverId);
                }
                
                if (driversToRecalculate.length > 0) {
                    try {
                        const recalcResponse = await fetch(`${API_BASE_URL}/api/optimize/recalculate-drivers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                driverIds: driversToRecalculate 
                            })
                        });

                        if (recalcResponse.ok) {
                            const recalcResult = await recalcResponse.json();
                            console.log('✅ Routes recalculated:', recalcResult);
                            
                            // Clear route cache and force Dashboard refresh
                            sessionStorage.removeItem('cachedRoutes');
                            sessionStorage.removeItem('cacheTime');
                            sessionStorage.setItem('forceRefreshRoutes', 'true');
                            
                            // Clear localStorage route cache for affected drivers
                            driversToRecalculate.forEach(dId => {
                                localStorage.removeItem(`driverRoute_${dId}`);
                            });
                            console.log(`🗑️ Cleared route cache for drivers ${driversToRecalculate.join(', ')}`);
                            
                            const message = statusChangedToPendingOrApproved
                                ? 'Cập nhật đơn hàng, hủy phân công tài xế và tính lại quãng đường thành công!'
                                : 'Cập nhật đơn hàng và tính lại quãng đường thành công!';
                            alert(message + '\nTài xế reload trang để thấy tuyến đường mới.');
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
                fetchDrivers(); // Refresh driver stats
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
        fetchVehicles();
        fetchUsers();
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

    // Filter orders when filter criteria change
    useEffect(() => {
        let filtered = [...allOrders];
        
        // Filter by weight
        if (filterWeight) {
            if (filterWeight === '0-10') {
                filtered = filtered.filter(o => o.weight >= 0 && o.weight <= 10);
            } else if (filterWeight === '10-20') {
                filtered = filtered.filter(o => o.weight > 10 && o.weight <= 20);
            } else if (filterWeight === '20-50') {
                filtered = filtered.filter(o => o.weight > 20 && o.weight <= 50);
            } else if (filterWeight === '50+') {
                filtered = filtered.filter(o => o.weight > 50);
            }
        }
        
        // Filter by status
        if (filterStatus) {
            filtered = filtered.filter(o => o.status === filterStatus);
        }
        
        // Filter by search term (phone number)
        if (searchTerm) {
            filtered = filtered.filter(o => {
                const search = searchTerm.toLowerCase();
                const sender = users.find(u => u.id === o.senderId);
                const receiver = users.find(u => u.id === o.receiverId);
                return sender?.phone?.toLowerCase().includes(search) ||
                       receiver?.phone?.toLowerCase().includes(search);
            });
        }
        
        setOrders(filtered);
    }, [filterWeight, filterStatus, searchTerm, allOrders, users]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/orders`);
            if (response.ok) {
                const data = await response.json();
                setAllOrders(data);
                setOrders(data);
            }
        } catch (err) {
            setError('Lỗi khi tải dữ liệu đơn hàng: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const fetchVehicles = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/vehicles`);
            if (response.ok) {
                const data = await response.json();
                setVehicles(data);
            }
        } catch (err) {
            console.error('Error fetching vehicles:', err);
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

    // ==================== BULK ACTIONS ====================
    
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedOrders([]);
            setSelectAll(false);
        } else {
            setSelectedOrders(orders.map(o => o.id));
            setSelectAll(true);
        }
    };

    const handleSelectOrder = (orderId) => {
        setSelectedOrders(prev => {
            if (prev.includes(orderId)) {
                const newSelection = prev.filter(id => id !== orderId);
                setSelectAll(false);
                return newSelection;
            } else {
                const newSelection = [...prev, orderId];
                setSelectAll(newSelection.length === orders.length);
                return newSelection;
            }
        });
    };

    const handleClearSelection = () => {
        setSelectedOrders([]);
        setSelectAll(false);
    };

    const handleBulkAssignDriver = async (driverId) => {
        try {
            setBulkActionLoading(true);
            
            // Collect old driver IDs from selected orders
            const affectedOrders = orders.filter(o => selectedOrders.includes(o.id));
            const oldDriverIds = [...new Set(
                affectedOrders
                    .map(o => o.driverId)
                    .filter(id => id && id !== driverId) // Exclude null and new driver
            )];
            
            console.log('🔄 Bulk assign - Old drivers:', oldDriverIds, 'New driver:', driverId);
            
            const response = await fetch(`${API_BASE_URL}/api/orders/bulk-assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderIds: selectedOrders,
                    driverId: parseInt(driverId)
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Recalculate routes for all affected drivers (old + new)
                const affectedDriverIds = [...oldDriverIds, driverId];
                
                if (affectedDriverIds.length > 0) {
                    console.log('🔄 Recalculating routes for drivers:', affectedDriverIds);
                    
                    try {
                        const recalcResponse = await fetch(`${API_BASE_URL}/api/optimize/recalculate-drivers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                driverIds: affectedDriverIds 
                            })
                        });

                        if (recalcResponse.ok) {
                            const recalcResult = await recalcResponse.json();
                            console.log('✅ Routes recalculated:', recalcResult);
                            
                            // Clear route cache and force Dashboard refresh
                            sessionStorage.removeItem('cachedRoutes');
                            sessionStorage.removeItem('cacheTime');
                            sessionStorage.setItem('forceRefreshRoutes', 'true');
                            
                            // Clear localStorage route cache for all affected drivers
                            affectedDriverIds.forEach(dId => {
                                localStorage.removeItem(`driverRoute_${dId}`);
                            });
                            console.log(`🗑️ Cleared route cache for drivers ${affectedDriverIds.join(', ')}`);
                        }
                    } catch (recalcError) {
                        console.error('Error recalculating routes:', recalcError);
                    }
                }
                
                alert(`✅ Đã gán ${result.modifiedCount || result.updatedCount} đơn hàng và tính lại quãng đường!`);
                await fetchOrders();
                await fetchDrivers(); // Refresh driver stats
                handleClearSelection();
                setShowBulkAssignModal(false);
            } else {
                alert(`❌ Lỗi: ${result.message || 'Không thể gán đơn hàng'}`);
            }
        } catch (error) {
            console.error('Error bulk assigning:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkStatusChange = async (newStatus) => {
        try {
            setBulkActionLoading(true);
            
            // Check if changing to pending/approved and some orders have drivers
            const affectedOrders = orders.filter(o => selectedOrders.includes(o.id));
            const shouldUnassignDriver = (newStatus === 'pending' || newStatus === 'approved');
            const affectedDriverIds = shouldUnassignDriver 
                ? [...new Set(affectedOrders.map(o => o.driverId).filter(id => id))]
                : [];
            
            if (affectedDriverIds.length > 0) {
                console.log(`⚠️ Status change to "${newStatus}" will unassign drivers:`, affectedDriverIds);
            }
            
            const response = await fetch(`${API_BASE_URL}/api/orders/bulk-status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderIds: selectedOrders,
                    newStatus: newStatus,
                    unassignDriver: shouldUnassignDriver
                })
            });

            const result = await response.json();

            if (response.ok) {
                // If drivers were unassigned, recalculate their routes
                if (affectedDriverIds.length > 0) {
                    console.log('🔄 Recalculating routes for unassigned drivers:', affectedDriverIds);
                    
                    try {
                        const recalcResponse = await fetch(`${API_BASE_URL}/api/optimize/recalculate-drivers`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                driverIds: affectedDriverIds 
                            })
                        });

                        if (recalcResponse.ok) {
                            const recalcResult = await recalcResponse.json();
                            console.log('✅ Routes recalculated:', recalcResult);
                            
                            // Clear route cache
                            sessionStorage.removeItem('cachedRoutes');
                            sessionStorage.removeItem('cacheTime');
                            sessionStorage.setItem('forceRefreshRoutes', 'true');
                            
                            affectedDriverIds.forEach(dId => {
                                localStorage.removeItem(`driverRoute_${dId}`);
                            });
                            console.log(`🗑️ Cleared route cache for drivers ${affectedDriverIds.join(', ')}`);
                        }
                    } catch (recalcError) {
                        console.error('Error recalculating routes:', recalcError);
                    }
                }
                
                const message = affectedDriverIds.length > 0
                    ? `✅ Đã cập nhật ${result.modifiedCount || result.updatedCount} đơn hàng, hủy phân công tài xế và tính lại quãng đường!`
                    : `✅ Đã cập nhật trạng thái ${result.modifiedCount || result.updatedCount} đơn hàng!`;
                
                alert(message);
                await fetchOrders();
                await fetchDrivers(); // Refresh driver stats
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
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedOrders.length} đơn hàng?\n\nThao tác này không thể hoàn tác!`)) {
            return;
        }

        try {
            setBulkActionLoading(true);
            
            const response = await fetch(`${API_BASE_URL}/api/orders/bulk-delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderIds: selectedOrders
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert(`✅ Đã xóa ${result.deletedCount} đơn hàng!`);
                await fetchOrders();
                handleClearSelection();
            } else {
                alert(`❌ Lỗi: ${result.message || 'Không thể xóa đơn hàng'}`);
            }
        } catch (error) {
            console.error('Error bulk delete:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            setBulkActionLoading(false);
        }
    };

    // ==================== END BULK ACTIONS ====================

    return (
        <div className="orders-content">
                    <div className="page-header">
                        <h1>Orders Management</h1>
                        <div className="header-actions">
                            <button className="btn-action" onClick={handleOptimizeRoutes} disabled={orders.length === 0}>
                                🚚 Phân công tự động
                            </button>
                            <button className="btn-action" onClick={handleResetAssignments} disabled={orders.length === 0}>
                                ❌ Hủy phân công
                            </button>
                            <button className="btn-action btn-primary" onClick={handleCreateOrder}>➕ Tạo đơn hàng mới</button>
                        </div>
                    </div>

                    {loading && <div className="loading">Loading orders...</div>}
                    {error && <div className="error-message">{error}</div>}

                    {/* Filter Controls */}
                    <div className="filter-controls">
                        <div className="filter-group">
                            <label>🔍 Tìm kiếm SĐT:</label>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Nhập số điện thoại..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '200px'}}
                            />
                        </div>
                        <div className="filter-group">
                            <label>🎯 Lọc theo cân nặng:</label>
                            <select value={filterWeight} onChange={(e) => setFilterWeight(e.target.value)}>
                                <option value="">Tất cả</option>
                                <option value="0-10">0-10kg</option>
                                <option value="10-20">10-20kg</option>
                                <option value="20-50">20-50kg</option>
                                <option value="50+">Trên 50kg</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>📦 Lọc theo trạng thái:</label>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">Tất cả</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="assigned">Assigned</option>
                                <option value="in_transit">In Transit</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Bulk Action Toolbar */}
                    <BulkActionToolbar 
                        selectedCount={selectedOrders.length}
                        onClear={handleClearSelection}
                        onAssignDriver={() => setShowBulkAssignModal(true)}
                        onChangeStatus={() => setShowBulkStatusModal(true)}
                        onDelete={handleBulkDelete}
                        loading={bulkActionLoading}
                        hideDelete={true}
                    />

                    <div className="orders-table-container">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-column">
                                        <input 
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                            title="Select all orders"
                                        />
                                    </th>
                                    <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Order ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Pickup Address</th>
                                    <th>Delivery Address</th>
                                    <th onClick={() => handleSort('weight')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Weight {sortBy === 'weight' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('driverId')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                        VEHICLE ID {sortBy === 'driverId' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getSortedOrders().map((order, index) => (
                                    <tr 
                                        key={index}
                                        className={selectedOrders.includes(order.id) ? 'table-row-selected' : ''}
                                    >
                                        <td className="checkbox-column">
                                            <input 
                                                type="checkbox"
                                                checked={selectedOrders.includes(order.id)}
                                                onChange={() => handleSelectOrder(order.id)}
                                            />
                                        </td>
                                        <td>#{order.id}</td>
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
                                                    {(() => {
                                                        const vehicle = vehicles.find(v => v.id === order.driverId);
                                                        return vehicle ? `Xe #${vehicle.id}` : `Xe #${order.driverId}`;
                                                    })()}
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
                                    <h4 style={{marginTop: 0, marginBottom: '15px', color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px'}}>📦 Thông tin đơn hàng</h4>
                                    <div className="detail-row">
                                        <strong>Người gửi:</strong> {(() => {
                                            const sender = users.find(u => u.id === selectedOrder.senderId);
                                            if (sender) {
                                                return (
                                                    <div>
                                                        <div>{sender.name} (#{sender.id})</div>
                                                        {sender.phone && <small style={{color: '#888'}}>📞 {sender.phone}</small>}
                                                    </div>
                                                );
                                            }
                                            return `User #${selectedOrder.senderId}`;
                                        })()}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Người nhận:</strong> {(() => {
                                            const receiver = users.find(u => u.id === selectedOrder.receiverId);
                                            if (receiver) {
                                                return (
                                                    <div>
                                                        <div>{receiver.name} (#{receiver.id})</div>
                                                        {receiver.phone && <small style={{color: '#888'}}>📞 {receiver.phone}</small>}
                                                    </div>
                                                );
                                            }
                                            return `User #${selectedOrder.receiverId}`;
                                        })()}
                                    </div>
                                    <div className="detail-row">
                                        <strong>Cân nặng:</strong> {selectedOrder.weight}kg
                                    </div>
                                    <div className="detail-row">
                                        <strong>Trạng thái:</strong> <span className={`status-badge ${getStatusColor(selectedOrder.status)}`}>{selectedOrder.status || 'pending'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <strong>Tài xế:</strong> {(() => {
                                            if (!selectedOrder.driverId) return 'Chưa gán';
                                            const vehicle = vehicles.find(v => v.id === selectedOrder.driverId);
                                            const driver = drivers.find(d => d.vehicleId === selectedOrder.driverId);
                                            if (vehicle && driver) {
                                                return (
                                                    <div>
                                                        <div>Xe #{vehicle.id} - {driver.name}</div>
                                                        {driver.phone && <small style={{color: '#888'}}>📞 {driver.phone}</small>}
                                                    </div>
                                                );
                                            }
                                            return `Xe #${selectedOrder.driverId}`;
                                        })()}
                                    </div>
                                    
                                    <h4 style={{marginTop: '20px', marginBottom: '15px', color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px'}}>📍 Địa điểm</h4>
                                    <div className="detail-row">
                                        <strong>Điểm lấy hàng:</strong> 
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
                                        <strong>Điểm giao hàng:</strong> 
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
                                    
                                    <h4 style={{marginTop: '20px', marginBottom: '15px', color: '#4a5568', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px'}}>📅 Thông tin khác</h4>
                                    <div className="detail-row">
                                        <strong>Ngày tạo:</strong> {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                    {selectedOrder.assignmentType && (
                                        <div className="detail-row">
                                            <strong>Loại phân công:</strong> {selectedOrder.assignmentType === 'manual' ? 'Thủ công' : 'Tự động'}
                                        </div>
                                    )}
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

                    {/* Bulk Assign Driver Modal */}
                    <BulkAssignDriverModal 
                        show={showBulkAssignModal}
                        onClose={() => setShowBulkAssignModal(false)}
                        onAssign={handleBulkAssignDriver}
                        drivers={drivers}
                        driverStats={driverStats}
                        selectedOrders={orders.filter(o => selectedOrders.includes(o.id))}
                        loading={bulkActionLoading}
                    />

                    {/* Bulk Status Change Modal */}
                    <BulkStatusChangeModal 
                        show={showBulkStatusModal}
                        onClose={() => setShowBulkStatusModal(false)}
                        onConfirm={handleBulkStatusChange}
                        selectedOrders={orders.filter(o => selectedOrders.includes(o.id))}
                        loading={bulkActionLoading}
                    />
        </div>
    );
}

export default OrdersManagement;
