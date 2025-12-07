const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const optimizer = require('../utils/optimizer');

// POST /api/optimize
router.post('/', async (req, res) => {
    try {
        console.log('Receiving optimization request:', {
            numVehicles: req.body.vehicles?.length,
            numOrders: req.body.orders?.length
        });

        const { vehicles, orders } = req.body;

        // Basic validation
        if (!vehicles?.length || !orders?.length) {
            return res.status(400).json({ 
                error: 'Dữ liệu không hợp lệ',
                details: {
                    vehicles: vehicles?.length || 0,
                    orders: orders?.length || 0
                }
            });
        }

        // Format validation
        const validVehicles = vehicles.every(v => 
            v.id && v.maxLoad > 0 && 
            Array.isArray(v.position) && v.position.length === 2 &&
            typeof v.position[0] === 'number' && typeof v.position[1] === 'number'
        );

        const validOrders = orders.every(o => 
            o.id && o.weight > 0 && 
            Array.isArray(o.pickup) && o.pickup.length === 2 &&
            Array.isArray(o.delivery) && o.delivery.length === 2
        );

        if (!validVehicles || !validOrders) {
            return res.status(400).json({
                error: 'Dữ liệu không đúng định dạng',
                details: { validVehicles, validOrders }
            });
        }

        // Start optimization
        console.log('Starting optimization...');
<<<<<<< HEAD
        // Chỉ sử dụng OR-Tools, không fallback JS
        const optimizationResult = await optimizer.assignOrdersOrtools(vehicles, orders);
        console.log('OR-Tools optimization result:', JSON.stringify(optimizationResult, null, 2));
=======
        const optimizationResult = await optimizer.assignOrders(vehicles, orders);
        
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
        if (!optimizationResult?.assignments) {
            throw new Error('Optimization failed');
        }

        const { assignments, routeDetails, stats } = optimizationResult;
        const routes = [];
        const errors = [];

<<<<<<< HEAD
        // Build routes for each vehicle (ưu tiên dùng route từ OR-Tools nếu có)
        for (const [vehicleId, assignedOrderIds] of Object.entries(assignments)) {
            try {
                const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
                if (!vehicle || !assignedOrderIds.length) continue; // BỎ QUA XE KHÔNG ĐƯỢC GÁN ĐƠN

                // Lấy danh sách đơn hàng theo id
                const vehicleOrders = orders.filter(o => assignedOrderIds.includes(o.id));
                
                // Log để debug
                if (vehicleOrders.length > 0) {
                    console.log(`Vehicle ${vehicleId} first order:`, {
                        id: vehicleOrders[0].id,
                        hasPickupAddress: !!vehicleOrders[0].pickupAddress,
                        hasDeliveryAddress: !!vehicleOrders[0].deliveryAddress,
                        pickupAddress: vehicleOrders[0].pickupAddress,
                        deliveryAddress: vehicleOrders[0].deliveryAddress
                    });
                }

                // Nếu OR-Tools trả về route (chuỗi index), chuyển thành tọa độ
                let route = [vehicle.position];
                if (optimizationResult.routes && optimizationResult.routes.length > 0) {
                    const routeIdx = Object.keys(assignments).indexOf(vehicleId);
                    const routeIndexes = optimizationResult.routes[routeIdx] || [];
                    // Chỉ lấy các điểm pickup/delivery thuộc assignedOrderIds
                    route = routeIndexes
                        .map(idx => {
                            if (idx < vehicles.length) return vehicles[idx].position;
                            // mapping lại đúng đơn hàng
                            const pickupDeliveryIdx = idx - vehicles.length;
                            const orderIdx = Math.floor(pickupDeliveryIdx / 2);
                            const isPickup = pickupDeliveryIdx % 2 === 0;
                            const order = orders[orderIdx];
                            if (!order || !assignedOrderIds.includes(order.id)) return null;
                            return isPickup ? order.pickup : order.delivery;
                        })
                        .filter(Boolean);
                    // Đảm bảo route bắt đầu từ vị trí xe
                    if (route.length === 0 || (route[0][0] !== vehicle.position[0] || route[0][1] !== vehicle.position[1])) {
                        route.unshift(vehicle.position);
                    }
                }
                if (route.length < 2) route = [vehicle.position, vehicle.position];

                // Log để debug
                console.log(`Vehicle #${vehicleId} route:`, route);
                console.log(`Assigned orders:`, vehicleOrders.map(o => o.id));

                // Tạo routeInfo và các thông tin khác như cũ
                const routeInfo = optimizer.generateRouteDetails(vehicle, vehicleOrders, null);

                // Tạo stops array với đầy đủ thông tin và tọa độ cho TẤT CẢ đơn hàng được gán
                let stops = [];
                // Thêm depot
                stops.push({
                    type: 'depot',
                    point: vehicle.position
                });

                // Với mỗi đơn hàng được gán, thêm cả pickup và delivery vào stops
                for (const order of vehicleOrders) {
                    // Thêm điểm pickup
                    stops.push({
                        type: 'pickup',
                        orderId: order.id,
                        point: order.pickup,
                        weight: order.weight,
                        pickupAddress: order.pickupAddress || null,
                        deliveryAddress: order.deliveryAddress || null
                    });
                    // Thêm điểm delivery
                    stops.push({
                        type: 'delivery',
                        orderId: order.id,
                        point: order.delivery,
                        weight: order.weight,
                        pickupAddress: order.pickupAddress || null,
                        deliveryAddress: order.deliveryAddress || null
                    });
                }

                // Sắp xếp lại thứ tự các điểm dừng theo route từ OR-Tools (nếu có)
                if (optimizationResult.routes && optimizationResult.routes.length > 0) {
                    const routeIdx = Object.keys(assignments).indexOf(vehicleId);
                    const routeIndexes = optimizationResult.routes[routeIdx] || [];
                    if (routeIndexes.length > 0) {
                        // Tạo mảng stops mới theo thứ tự từ routeIndexes
                        const orderedStops = [stops[0]]; // Giữ depot ở đầu
                        for (const idx of routeIndexes) {
                            if (idx === 0) continue; // Bỏ qua depot
                            const orderIdx = Math.floor((idx - 1) / 2);
                            const isPickup = (idx - 1) % 2 === 0;
                            const order = vehicleOrders[orderIdx];
                            if (!order) continue;
                            const stop = {
                                type: isPickup ? 'pickup' : 'delivery',
                                orderId: order.id,
                                point: isPickup ? order.pickup : order.delivery
                            };
                            orderedStops.push(stop);
                        }
                        stops = orderedStops;
                    }
                }

                // Tính toán các thống kê
                const points = stops.map(stop => stop.point);
                console.log(`Vehicle #${vehicleId} stops points:`, points);

                // Lấy đường đi thực tế từ OSRM cho toàn bộ điểm stops theo thứ tự
                const osrmResult = await optimizer.getOsrmRoute(points);
                console.log(`Vehicle #${vehicleId} OSRM result:`, {
                    numPoints: osrmResult.route?.length,
                    distance: osrmResult.distance,
                    duration: osrmResult.duration
                });

                const moveTime = osrmResult.duration || 0;
                const stopTime = stops.length * 10; // 10 phút mỗi điểm dừng
                const totalTime = moveTime + stopTime;
                const loadRatio = (vehicleOrders.reduce((sum, o) => sum + o.weight, 0) / vehicle.maxLoad * 100).toFixed(1);

                // Ensure path is always an array with at least 2 points (start and end)
                let routePath = osrmResult.route || [];
                if (!routePath || routePath.length === 0) {
                    console.warn(`⚠️ Vehicle #${vehicleId} has no OSRM route, using stops as path`);
                    routePath = points; // Fallback to straight lines between stops
                }
                
                console.log(`Vehicle #${vehicleId} final path length:`, routePath.length);

                const routeData = {
                    vehicleId: parseInt(vehicleId),
                    currentPosition: vehicle.position,
                    isActive: true,
                    lastUpdated: new Date(),
                    assignedOrders: vehicleOrders.map(o => o.id),
                    stops: stops,
                    distance: osrmResult.distance || 0,
                    duration: totalTime,
                    totalWeight: vehicleOrders.reduce((sum, o) => sum + o.weight, 0),
                    stats: {
                        totalStops: stops.length,
                        stopTime: stopTime,
                        moveTime: moveTime,
                        totalTime: totalTime,
                        loadRatio: parseFloat(loadRatio)
                    },
                    path: routePath // Đường đi thực tế từ OSRM đi qua tất cả stops
                };

=======
        // Build routes for each vehicle
        for (const [vehicleId, vehicleOrders] of Object.entries(assignments)) {
            try {
                const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
                if (!vehicle || vehicleOrders.length === 0) continue;

                // Get route path and details
                const route = optimizer.buildRoute(vehicle, vehicleOrders, routeDetails[vehicleId]);
                const routeInfo = optimizer.generateRouteDetails(vehicle, vehicleOrders, routeDetails[vehicleId]);
                const osrmResult = await optimizer.getOsrmRoute(route);

                // Create route data
                const routeData = {
                    vehicleId: parseInt(vehicleId),
                    assignedOrders: vehicleOrders.map(o => o.id),
                    path: osrmResult.route || route,
                    distance: routeInfo.stats.distance || osrmResult.distance || 0,
                    duration: routeInfo.stats.totalTime || osrmResult.duration || 0,
                    totalWeight: stats.vehicleLoads[vehicleId] || 0,
                    routeDetails: routeInfo.details || [],
                    stops: routeDetails[vehicleId] || [],
                    vehiclePosition: vehicle.position,
                    status: 'active',
                    timestamp: new Date()
                };

                // Save to database
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
                await Route.findOneAndUpdate(
                    { vehicleId: parseInt(vehicleId) },
                    routeData,
                    { upsert: true, new: true }
                );

                routes.push(routeData);
<<<<<<< HEAD
=======

>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
            } catch (error) {
                console.error(`Error processing vehicle ${vehicleId}:`, error);
                errors.push(`Error with vehicle ${vehicleId}: ${error.message}`);
            }
        }

        // Check results
        if (routes.length === 0) {
            throw new Error('Không thể tạo lộ trình cho bất kỳ xe nào');
        }

        // Prepare response
        const response = {
            routes,
            stats: {
<<<<<<< HEAD
                makespan: stats && stats.makespan !== undefined ? stats.makespan : (routes.length > 0 ? Math.max(...routes.map(r => r.duration || 0)) : 0),
=======
                makespan: stats.makespan,
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
                totalOrders: orders.length,
                assignedOrders: routes.reduce((sum, r) => sum + r.assignedOrders.length, 0),
                totalVehicles: vehicles.length,
                vehiclesWithRoutes: routes.length
            },
            errors: errors.length > 0 ? errors : undefined
<<<<<<< HEAD
        };        // Log success
=======
        };

        // Log success
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
        console.log('Optimization completed:', {
            numRoutes: routes.length,
            numErrors: errors.length,
            stats: response.stats
        });

<<<<<<< HEAD
        // Broadcast route updates to all drivers
        try {
            console.log('Broadcasting route updates to drivers...');
            for (const route of routes) {
                if (req.deliveryHub && typeof req.deliveryHub.sendRouteUpdateToDriver === 'function') {
                    await req.deliveryHub.sendRouteUpdateToDriver(route.vehicleId, route);
                    console.log(`Route broadcasted to vehicle ${route.vehicleId}`);
                } else {
                    console.error('DeliveryHub not properly initialized');
                }
            }
        } catch (e) {
            console.error('Error broadcasting route updates:', e);
        }

=======
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
        return res.json(response);

    } catch (error) {
        console.error('Optimization error:', error);
        return res.status(500).json({
            error: 'Lỗi khi tối ưu lộ trình',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

<<<<<<< HEAD
// GET /api/optimize/route/:vehicleId - Get route for specific vehicle
router.get('/route/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        console.log(`Fetching route for vehicle ${vehicleId}`);
        
        const route = await Route.findOne({ vehicleId: parseInt(vehicleId) });
        
        if (!route) {
            return res.status(404).json({
                error: 'Route not found',
                message: `No route assigned for vehicle ${vehicleId}`
            });
        }
        
        return res.json({
            success: true,
            route: route
        });
    } catch (error) {
        console.error('Error fetching route:', error);
        return res.status(500).json({
            error: 'Error fetching route',
            message: error.message
        });
    }
});

=======
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
module.exports = router;
