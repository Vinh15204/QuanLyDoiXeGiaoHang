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
        const optimizationResult = await optimizer.assignOrders(vehicles, orders);
        
        if (!optimizationResult?.assignments) {
            throw new Error('Optimization failed');
        }

        const { assignments, routeDetails, stats } = optimizationResult;
        const routes = [];
        const errors = [];

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
                await Route.findOneAndUpdate(
                    { vehicleId: parseInt(vehicleId) },
                    routeData,
                    { upsert: true, new: true }
                );

                routes.push(routeData);

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
                makespan: stats.makespan,
                totalOrders: orders.length,
                assignedOrders: routes.reduce((sum, r) => sum + r.assignedOrders.length, 0),
                totalVehicles: vehicles.length,
                vehiclesWithRoutes: routes.length
            },
            errors: errors.length > 0 ? errors : undefined
        };

        // Log success
        console.log('Optimization completed:', {
            numRoutes: routes.length,
            numErrors: errors.length,
            stats: response.stats
        });

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

module.exports = router;
