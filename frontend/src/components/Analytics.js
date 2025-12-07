import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Analytics() {
    const navigate = useNavigate();
    const [currentUser] = useState(() => {
        const user = localStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    });

    const [analyticsData, setAnalyticsData] = useState({
        deliveryTrends: [],
        driverPerformance: [],
        fleetMetrics: {
            totalDistance: 0,
            fuelConsumption: 0,
            maintenanceCost: 0,
            utilizationRate: 0
        }
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('/login');
            return;
        }
        fetchAnalyticsData();
    }, [currentUser, navigate]);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            
            // Fetch orders, vehicles, users, and routes
            const [ordersRes, vehiclesRes, usersRes, routesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/orders`),
                fetch(`${API_BASE_URL}/api/vehicles`),
                fetch(`${API_BASE_URL}/api/users`),
                fetch(`${API_BASE_URL}/api/routes`)
            ]);

            if (ordersRes.ok && vehiclesRes.ok && usersRes.ok) {
                const [orders, vehicles, users, routesData] = await Promise.all([
                    ordersRes.json(),
                    vehiclesRes.json(),
                    usersRes.json(),
                    routesRes.ok ? routesRes.json() : []
                ]);

                // Calculate analytics from real data
                calculateAnalytics(orders, vehicles, users, Array.isArray(routesData) ? routesData : []);
            }
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateAnalytics = (orders, vehicles, users, routes) => {
        // Calculate delivery trends (last 6 months)
        const deliveryTrends = calculateDeliveryTrends(orders);
        
        // Calculate driver performance
        const drivers = users.filter(user => user.role === 'driver');
        const driverPerformance = calculateDriverPerformance(drivers, orders, routes);
        
        // Calculate fleet metrics
        const fleetMetrics = calculateFleetMetrics(vehicles, routes, orders);

        setAnalyticsData({
            deliveryTrends,
            driverPerformance,
            fleetMetrics
        });
    };

    const calculateDeliveryTrends = (orders) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const currentDate = new Date();
        
        return months.map((month, index) => {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - index), 1);
            const monthOrders = orders.filter(order => {
                const orderDate = new Date(order.createdAt || order.timestamp || Date.now());
                return orderDate.getMonth() === monthDate.getMonth() && 
                       orderDate.getFullYear() === monthDate.getFullYear();
            });
            
            const onTimeOrders = monthOrders.filter(order => order.status === 'delivered').length;
            const onTimeRate = monthOrders.length > 0 ? Math.round((onTimeOrders / monthOrders.length) * 100) : 0;
            
            return {
                month,
                deliveries: monthOrders.length,
                onTime: onTimeRate
            };
        });
    };

    const calculateDriverPerformance = (drivers, orders, routes) => {
        return drivers.map(driver => {
            // Find routes for this driver
            const driverRoutes = routes.filter(route => route.vehicleId === driver.vehicleId);
            const driverOrders = orders.filter(order => 
                driverRoutes.some(route => route.assignedOrders?.includes(order.id))
            );
            
            const deliveredOrders = driverOrders.filter(order => order.status === 'delivered');
            const onTimeRate = driverOrders.length > 0 
                ? Math.round((deliveredOrders.length / driverOrders.length) * 100) 
                : 100;
            
            return {
                id: driver.id,
                name: driver.name,
                deliveries: driverOrders.length,
                rating: Math.min(5.0, 3.5 + (onTimeRate / 50)), // Simple rating calculation
                onTime: onTimeRate
            };
        });
    };

    const calculateFleetMetrics = (vehicles, routes, orders) => {
        const totalDistance = routes.reduce((sum, route) => sum + (route.distance || 0), 0);
        const activeVehicles = vehicles.filter(vehicle => vehicle.status === 'active').length;
        const utilizationRate = vehicles.length > 0 
            ? Math.round((activeVehicles / vehicles.length) * 100) 
            : 0;
        
        return {
            totalDistance: Math.round(totalDistance),
            fuelConsumption: Math.round(totalDistance * 0.08), // Estimate: 8L per 100km
            maintenanceCost: Math.round(totalDistance * 50), // Estimate: 50 VND per km
            utilizationRate
        };
    };

    return (
        <div className="analytics-content">
                    {loading ? (
                        <div className="loading">Đang tải dữ liệu...</div>
                    ) : (
                        <>
                            {/* Key Metrics Cards */}
                            <div className="metrics-grid">
                                <div className="metric-card">
                                    <div className="metric-icon">🚚</div>
                                    <div className="metric-info">
                                        <h3>{analyticsData.fleetMetrics.totalDistance.toLocaleString()}</h3>
                                        <p>Tổng km đã chạy</p>
                                        <span className="metric-change positive">+12% so với tháng trước</span>
                                    </div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-icon">⛽</div>
                                    <div className="metric-info">
                                        <h3>{analyticsData.fleetMetrics.fuelConsumption} L</h3>
                                        <p>Tiêu thụ nhiên liệu</p>
                                        <span className="metric-change negative">-5% so với tháng trước</span>
                                    </div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-icon">💰</div>
                                    <div className="metric-info">
                                        <h3>{(analyticsData.fleetMetrics.maintenanceCost).toLocaleString()} VNĐ</h3>
                                        <p>Chi phí bảo trì</p>
                                        <span className="metric-change positive">+8% so với tháng trước</span>
                                    </div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-icon">📊</div>
                                    <div className="metric-info">
                                        <h3>{analyticsData.fleetMetrics.utilizationRate}%</h3>
                                        <p>Tỷ lệ sử dụng đội xe</p>
                                        <span className="metric-change positive">+3% so với tháng trước</span>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="charts-section">
                                <div className="chart-container">
                                    <div className="chart-header">
                                        <h3>Xu hướng giao hàng</h3>
                                        <select>
                                            <option>6 tháng gần đây</option>
                                            <option>1 năm</option>
                                        </select>
                                    </div>
                                    <div className="chart-content">
                                        <div className="chart-placeholder">
                                            {analyticsData.deliveryTrends.map((data, index) => (
                                                <div key={index} className="chart-bar">
                                                    <div className="bar" style={{height: `${Math.max((data.deliveries / Math.max(...analyticsData.deliveryTrends.map(d => d.deliveries), 1)) * 100, 10)}%`}}></div>
                                                    <span className="bar-label">{data.month}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="chart-container">
                                    <div className="chart-header">
                                        <h3>Tỷ lệ đúng giờ</h3>
                                        <select>
                                            <option>Theo tháng</option>
                                            <option>Theo tuần</option>
                                        </select>
                                    </div>
                                    <div className="chart-content">
                                        <div className="pie-chart">
                                            <div className="pie-slice pie-on-time" style={{transform: 'rotate(0deg)'}}>
                                                <span>{Math.round(analyticsData.deliveryTrends.reduce((sum, d) => sum + d.onTime, 0) / Math.max(analyticsData.deliveryTrends.length, 1))}% Đúng giờ</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Driver Performance Table */}
                            <div className="performance-section">
                                <div className="section-header">
                                    <h3>Hiệu suất tài xế</h3>
                                    <button className="export-btn">Xuất báo cáo</button>
                                </div>
                                <div className="performance-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Tài xế</th>
                                                <th>Số giao hàng</th>
                                                <th>Đánh giá</th>
                                                <th>Tỷ lệ đúng giờ</th>
                                                <th>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsData.driverPerformance.map((driver) => (
                                                <tr key={driver.id}>
                                                    <td>
                                                        <div className="driver-info">
                                                            <div className="driver-avatar">👤</div>
                                                            <span>{driver.name}</span>
                                                        </div>
                                                    </td>
                                                    <td>{driver.deliveries}</td>
                                                    <td>
                                                        <div className="rating">
                                                            <span>⭐ {driver.rating.toFixed(1)}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="progress-bar">
                                                            <div className="progress" style={{width: `${driver.onTime}%`}}></div>
                                                            <span>{driver.onTime}%</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <button className="action-btn">Chi tiết</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
    );
}

export default Analytics;
