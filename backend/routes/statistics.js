const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Route = require('../models/Route');
const User = require('../models/User');

// Thống kê phương án phân công
router.get('/assignment', async (req, res) => {
    try {
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        
        // Lấy tất cả routes active
        const routes = await Route.find({ isActive: true });
        
        if (routes.length === 0) {
            return res.json({
                totalRoutes: 0,
                totalDistance: 0,
                totalOrders: 0,
                totalWeight: 0,
                drivers: []
            });
        }

        // Tính toán thống kê
        let totalDistance = 0;
        let totalOrders = 0;
        let maxDistance = 0;
        let minDistance = Infinity;
        let maxWeight = 0;
        let minWeight = Infinity;
        let driverWithMaxDistance = null;
        let driverWithMinDistance = null;
        let driverWithMaxWeight = null;
        let driverWithMinWeight = null;

        const driverStats = [];

        for (const route of routes) {
            const distance = route.distance || 0;
            const weight = route.totalWeight || 0;
            const orderCount = route.assignedOrders?.length || 0;
            
            totalDistance += distance;
            totalOrders += orderCount;

            // Lấy thông tin driver
            const driver = await User.findOne({ vehicleId: route.vehicleId, role: 'driver' });
            const driverName = driver ? driver.name : `Driver ${route.vehicleId}`;

            driverStats.push({
                driverId: route.vehicleId,
                driverName,
                distance: distance.toFixed(2),
                weight: weight.toFixed(2),
                orderCount,
                stops: route.stops?.length || 0
            });

            // Track max/min
            if (distance > maxDistance) {
                maxDistance = distance;
                driverWithMaxDistance = { id: route.vehicleId, name: driverName, distance };
            }
            if (distance < minDistance && distance > 0) {
                minDistance = distance;
                driverWithMinDistance = { id: route.vehicleId, name: driverName, distance };
            }
            if (weight > maxWeight) {
                maxWeight = weight;
                driverWithMaxWeight = { id: route.vehicleId, name: driverName, weight };
            }
            if (weight < minWeight && weight > 0) {
                minWeight = weight;
                driverWithMinWeight = { id: route.vehicleId, name: driverName, weight };
            }
        }

        // Tính tổng trọng tải từ orders
        const assignedOrders = await Order.find({ 
            status: { $in: ['assigned', 'in_transit', 'picked', 'delivering'] }
        });
        const totalWeight = assignedOrders.reduce((sum, o) => sum + (o.weight || 0), 0);

        res.json({
            totalRoutes: routes.length,
            totalDistance: totalDistance.toFixed(2),
            totalOrders,
            totalWeight: totalWeight.toFixed(2),
            averageDistance: routes.length > 0 ? (totalDistance / routes.length).toFixed(2) : 0,
            averageWeight: routes.length > 0 ? (totalWeight / routes.length).toFixed(2) : 0,
            driverWithMaxDistance: driverWithMaxDistance ? {
                ...driverWithMaxDistance,
                distance: driverWithMaxDistance.distance.toFixed(2)
            } : null,
            driverWithMinDistance: driverWithMinDistance ? {
                ...driverWithMinDistance,
                distance: driverWithMinDistance.distance.toFixed(2)
            } : null,
            driverWithMaxWeight: driverWithMaxWeight ? {
                ...driverWithMaxWeight,
                weight: driverWithMaxWeight.weight.toFixed(2)
            } : null,
            driverWithMinWeight: driverWithMinWeight ? {
                ...driverWithMinWeight,
                weight: driverWithMinWeight.weight.toFixed(2)
            } : null,
            drivers: driverStats
        });
    } catch (error) {
        console.error('Error getting assignment stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Thống kê tổng quan hệ thống
router.get('/overview', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = {};
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const [totalOrders, totalDrivers, ordersByStatus] = await Promise.all([
            Order.countDocuments(query),
            User.countDocuments({ role: 'driver' }),
            Order.aggregate([
                { $match: query },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        const statusMap = ordersByStatus.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        res.json({
            totalOrders,
            totalDrivers,
            pending: statusMap.pending || 0,
            approved: statusMap.approved || 0,
            assigned: statusMap.assigned || 0,
            inTransit: statusMap.in_transit || 0,
            delivered: statusMap.delivered || 0,
            cancelled: statusMap.cancelled || 0
        });
    } catch (error) {
        console.error('Error getting overview stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
