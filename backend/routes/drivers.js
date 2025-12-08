const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Route = require('../models/Route');

// Cập nhật ngày nghỉ của tài xế
router.post('/:id/days-off', async (req, res) => {
    try {
        const { id } = req.params;
        const { date, reason } = req.body;

        const driver = await User.findOne({ id: parseInt(id), role: 'driver' });
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        driver.daysOff.push({
            date: new Date(date),
            reason: reason || ''
        });
        
        await driver.save();
        res.json(driver);
    } catch (error) {
        console.error('Error adding day off:', error);
        res.status(500).json({ error: error.message });
    }
});

// Xóa ngày nghỉ
router.delete('/:id/days-off/:dayOffId', async (req, res) => {
    try {
        const { id, dayOffId } = req.params;

        const driver = await User.findOne({ id: parseInt(id), role: 'driver' });
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        driver.daysOff = driver.daysOff.filter(d => d._id.toString() !== dayOffId);
        await driver.save();
        
        res.json(driver);
    } catch (error) {
        console.error('Error removing day off:', error);
        res.status(500).json({ error: error.message });
    }
});

// Lấy ngày nghỉ của tài xế
router.get('/:id/days-off', async (req, res) => {
    try {
        const { id } = req.params;
        const driver = await User.findOne({ id: parseInt(id), role: 'driver' });
        
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        res.json(driver.daysOff || []);
    } catch (error) {
        console.error('Error getting days off:', error);
        res.status(500).json({ error: error.message });
    }
});

// Kiểm tra tài xế có nghỉ vào ngày cụ thể không
router.get('/:id/is-off', async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        const driver = await User.findOne({ id: parseInt(id), role: 'driver' });
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        const checkDate = new Date(date);
        const isOff = driver.daysOff.some(dayOff => {
            const offDate = new Date(dayOff.date);
            return offDate.toDateString() === checkDate.toDateString();
        });

        res.json({ isOff });
    } catch (error) {
        console.error('Error checking day off:', error);
        res.status(500).json({ error: error.message });
    }
});

// Thống kê tài xế
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        
        const driverId = parseInt(id);
        const query = { driverId };
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const [orders, routes] = await Promise.all([
            Order.find(query),
            Route.find({ vehicleId: driverId })
        ]);

        const totalOrders = orders.length;
        const totalWeight = orders.reduce((sum, o) => sum + (o.weight || 0), 0);
        const totalDistance = routes.reduce((sum, r) => sum + (r.distance || 0), 0);
        const completedOrders = orders.filter(o => o.status === 'delivered').length;

        res.json({
            driverId,
            totalOrders,
            completedOrders,
            totalWeight,
            totalDistance: totalDistance.toFixed(2),
            averageWeight: totalOrders > 0 ? (totalWeight / totalOrders).toFixed(2) : 0,
            completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0
        });
    } catch (error) {
        console.error('Error getting driver stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
