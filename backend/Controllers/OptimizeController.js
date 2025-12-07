const express = require('express');
const router = express.Router();
const optimizer = require('../utils/optimizer');
const Route = require('../models/Route');

// POST /api/optimize
router.post('/', async (req, res) => {
    try {
        console.log('Receiving optimization request:', {
            numVehicles: req.body.vehicles?.length,
            numOrders: req.body.orders?.length
        });

        const { vehicles, orders } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!Array.isArray(vehicles) || !Array.isArray(orders)) {
            return res.status(400).json({
                error: 'Dữ liệu đầu vào không hợp lệ',
                details: {
                    hasVehicles: Array.isArray(vehicles),
                    hasOrders: Array.isArray(orders)
                }
            });
        }

        if (vehicles.length === 0) {
            return res.status(400).json({ error: 'Không có xe nào được cung cấp' });
        }

        if (orders.length === 0) {
            return res.status(400).json({ error: 'Không có đơn hàng nào được cung cấp' });
        }

        // Validate vehicle and order data
        const validVehicles = vehicles.every(v => v.id && Array.isArray(v.position) && v.position.length === 2 && v.maxLoad > 0);
        const validOrders = orders.every(o => o.id && o.weight > 0 && Array.isArray(o.pickup) && Array.isArray(o.delivery));

        if (!validVehicles || !validOrders) {
            console.error('Invalid data format:', { validVehicles, validOrders });
            return res.status(400).json({
                error: 'Dữ liệu xe hoặc đơn hàng không hợp lệ',
                details: { validVehicles, validOrders }
            });
        }

        // Gọi hàm phân công đơn hàng
        console.log('Starting order assignment...');
        const result = await optimizer.assignOrders(vehicles, orders);
        console.log('Order assignment completed:', {
            hasAssignments: !!result?.assignments,
            numRoutes: Object.keys(result?.assignments || {}).length
        });

        if (!result || !result.assignments) {
            throw new Error('Không thể phân công đơn hàng');
        }

        const { assignments, routeDetails, stats } = result;
        const routes = [];
        const errors = [];

        // Process each vehicle's route
        for (const [vehicleId, vehicleOrders] of Object.entries(assignments)) {
            if (vehicleOrders.length === 0) continue;

            try {
                const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
                if (!vehicle) {
                    errors.push(`Vehicle ${vehicleId} not found`);
                    continue;
                }

                // Build route
                const route = optimizer.buildRoute(vehicle, vehicleOrders, routeDetails[vehicleId]);
                const routeInfo = optimizer.generateRouteDetails(vehicle, vehicleOrders, routeDetails[vehicleId]);
                const osrmResult = await optimizer.getOsrmRoute(route);

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
                await Route.findOneAndUpdate(
                    { vehicleId: parseInt(vehicleId) },
                    routeData,
                    { upsert: true, new: true }
                );

                routes.push(routeData);

            } catch (error) {
                console.error(`Error processing route for vehicle ${vehicleId}:`, error);
                errors.push(`Error with vehicle ${vehicleId}: ${error.message}`);
            }
        }

        if (routes.length === 0) {
            throw new Error('Không thể tạo lộ trình cho bất kỳ xe nào');
        }

        const response = {
            routes,
            stats: {
                makespan: stats.makespan,
                totalOrders: orders.length,
                assignedOrders: routes.reduce((sum, r) => sum + r.assignedOrders.length, 0),
                totalVehicles: vehicles.length,
                vehiclesWithRoutes: routes.length
            },
            errors: errors.length > 0 ? errors : undefined
        };

        console.log('Optimization response:', {
            numRoutes: routes.length,
            numErrors: errors.length,
            stats: response.stats
        });

        res.json(response);

    } catch (error) {
        console.error('Error in optimize controller:', error);
        res.status(500).json({ 
            error: 'Có lỗi xảy ra khi tối ưu lộ trình',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router;
