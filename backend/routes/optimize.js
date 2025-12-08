const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Order = require('../models/Order');
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

        // Get manual assignments from database
        console.log('🔍 Checking for manual assignments...');
        const manualOrders = await Order.find({ 
            assignmentType: 'manual',
            status: { $in: ['assigned', 'in_transit', 'picked', 'delivering'] }
        });
        
        console.log(`📌 Found ${manualOrders.length} manual assignments to preserve`);
        
        // Build constraints for manual assignments: { orderId: vehicleId }
        const manualConstraints = {};
        manualOrders.forEach(order => {
            manualConstraints[order.id] = order.driverId;
            console.log(`  Order ${order.id} must be assigned to driver ${order.driverId}`);
        });

        // Delete all existing routes before creating new ones
        console.log('🗑️ Deleting all existing routes...');
        const existingRoutes = await Route.find({});
        console.log(`📊 Found ${existingRoutes.length} existing routes:`, existingRoutes.map(r => ({ vehicleId: r.vehicleId, isActive: r.isActive })));
        const deleteResult = await Route.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} existing routes`);

        // Start optimization with manual constraints
        console.log('Starting optimization with constraints...');
        const optimizationResult = await optimizer.assignOrders(vehicles, orders, manualConstraints);
        
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

                console.log(`📍 Vehicle ${vehicleId} route building:`, {
                    baseRoutePoints: route.length,
                    osrmRoutePoints: osrmResult.route?.length || 0,
                    willUsePath: osrmResult.route ? 'OSRM route' : 'base route',
                    firstPoint: (osrmResult.route || route)[0],
                    lastPoint: (osrmResult.route || route)[(osrmResult.route || route).length - 1]
                });

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
                    isActive: true,
                    lastUpdated: new Date(),
                    timestamp: new Date()
                };

                // Save to database
                const savedRoute = await Route.findOneAndUpdate(
                    { vehicleId: parseInt(vehicleId) },
                    routeData,
                    { upsert: true, new: true }
                );
                
                console.log(`✅ Saved route for vehicle ${vehicleId}:`, {
                    vehicleId: savedRoute.vehicleId,
                    isActive: savedRoute.isActive,
                    ordersCount: savedRoute.assignedOrders.length,
                    pathLength: savedRoute.path.length
                });

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

        // Update order status and driverId for all assigned orders
        console.log('🔄 Updating order statuses and driver assignments...');
        let totalUpdated = 0;
        let manualKept = 0;
        let autoAssigned = 0;

        for (const route of routes) {
            if (route.assignedOrders.length > 0) {
                // Update auto-assigned orders (not manual)
                const autoUpdateResult = await Order.updateMany(
                    { 
                        id: { $in: route.assignedOrders },
                        assignmentType: { $ne: 'manual' } // Only update non-manual orders
                    },
                    {
                        $set: {
                            driverId: route.vehicleId,
                            status: 'assigned',
                            assignmentType: 'auto',
                            assignedAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                );
                autoAssigned += autoUpdateResult.modifiedCount;
                
                // Update manual orders (keep assignmentType but update status/time if needed)
                const manualUpdateResult = await Order.updateMany(
                    { 
                        id: { $in: route.assignedOrders },
                        assignmentType: 'manual'
                    },
                    {
                        $set: {
                            driverId: route.vehicleId,
                            status: 'assigned',
                            updatedAt: new Date()
                            // Note: assignmentType stays 'manual', assignedAt stays original
                        }
                    }
                );
                manualKept += manualUpdateResult.matchedCount;
                
                totalUpdated += autoUpdateResult.modifiedCount + manualUpdateResult.modifiedCount;
                console.log(`✅ Vehicle ${route.vehicleId}: ${autoUpdateResult.modifiedCount} auto + ${manualUpdateResult.matchedCount} manual`);
            }
        }
        
        console.log(`✅ Total: ${autoAssigned} auto-assigned, ${manualKept} manual preserved`);

        // Prepare response
        const response = {
            routes,
            stats: {
                makespan: stats.makespan,
                totalOrders: orders.length,
                assignedOrders: routes.reduce((sum, r) => sum + r.assignedOrders.length, 0),
                totalVehicles: vehicles.length,
                vehiclesWithRoutes: routes.length,
                updatedOrders: totalUpdated
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

// DELETE /api/optimize/clear-auto - Clear all auto-assigned routes
router.delete('/clear-auto', async (req, res) => {
    try {
        console.log('🗑️ Clearing auto-assigned routes...');
        
        // Note: We don't have assignmentType in Route model, so we clear all routes
        // Manual assignments are preserved in Order.assignmentType
        const result = await Route.deleteMany({});
        
        console.log(`✅ Deleted ${result.deletedCount} routes`);
        
        res.json({ 
            success: true, 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        console.error('Error clearing routes:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/optimize/recalculate-drivers - Recalculate routes for specific drivers
router.post('/recalculate-drivers', async (req, res) => {
    try {
        const { driverIds } = req.body;
        
        if (!Array.isArray(driverIds) || driverIds.length === 0) {
            return res.status(400).json({ error: 'driverIds array is required' });
        }

        console.log(`🔄 Recalculating routes for drivers: ${driverIds.join(', ')}`);

        const Vehicle = require('../models/Vehicle');
        const recalculatedRoutes = [];

        for (const driverId of driverIds) {
            // Get vehicle info
            const vehicle = await Vehicle.findOne({ id: driverId });
            if (!vehicle) {
                console.warn(`Vehicle ${driverId} not found`);
                continue;
            }

            // Get all orders assigned to this driver
            const driverOrders = await Order.find({ 
                driverId: driverId,
                status: { $in: ['assigned', 'in_transit', 'picked', 'delivering'] }
            });

            if (driverOrders.length === 0) {
                console.log(`No orders for driver ${driverId}, deleting route`);
                await Route.deleteOne({ vehicleId: driverId });
                continue;
            }

            console.log(`Driver ${driverId} has ${driverOrders.length} orders, recalculating route...`);

            // Build optimized route for this driver's orders
            const routePoints = [vehicle.position || vehicle.location];
            const routeDetailsArray = [];

            driverOrders.forEach(order => {
                routePoints.push(order.pickup);
                routePoints.push(order.delivery);
                
                routeDetailsArray.push({
                    type: 'pickup',
                    orderId: order.id,
                    point: order.pickup,
                    weight: order.weight
                });
                routeDetailsArray.push({
                    type: 'delivery',
                    orderId: order.id,
                    point: order.delivery,
                    weight: order.weight
                });
            });

            // Get OSRM route
            const osrmResult = await optimizer.getOsrmRoute(routePoints);
            const routeInfo = optimizer.generateRouteDetails(vehicle, driverOrders, routeDetailsArray);

            // Update route in database
            const routeData = {
                vehicleId: driverId,
                assignedOrders: driverOrders.map(o => o.id),
                path: osrmResult.route || routePoints,
                distance: routeInfo.stats.distance || osrmResult.distance || 0,
                duration: routeInfo.stats.totalTime || osrmResult.duration || 0,
                totalWeight: driverOrders.reduce((sum, o) => sum + o.weight, 0),
                routeDetails: routeInfo.details || [],
                stops: routeDetailsArray,
                vehiclePosition: vehicle.position || vehicle.location,
                status: 'active',
                isActive: true,
                lastUpdated: new Date(),
                timestamp: new Date()
            };

            const savedRoute = await Route.findOneAndUpdate(
                { vehicleId: driverId },
                routeData,
                { upsert: true, new: true }
            );

            console.log(`✅ Recalculated route for driver ${driverId}: ${driverOrders.length} orders, ${routeData.distance.toFixed(2)}km`);
            recalculatedRoutes.push(savedRoute);
        }

        res.json({
            success: true,
            recalculated: recalculatedRoutes.length,
            routes: recalculatedRoutes
        });

    } catch (error) {
        console.error('Error recalculating routes:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
