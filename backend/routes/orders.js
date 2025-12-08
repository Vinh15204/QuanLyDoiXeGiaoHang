const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Lấy đơn hàng với filter
router.get('/', async (req, res) => {
    try {
        const { 
            status, 
            driverId, 
            senderId, 
            receiverId,
            startDate, 
            endDate,
            assignmentType 
        } = req.query;

        const query = {};
        
        if (status) query.status = status;
        if (driverId) query.driverId = parseInt(driverId);
        if (senderId) query.senderId = parseInt(senderId);
        if (receiverId) query.receiverId = parseInt(receiverId);
        if (assignmentType) query.assignmentType = assignmentType;
        
        // Filter theo ngày
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const orders = await Order.find(query).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cập nhật toàn bộ đơn hàng
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const order = await Order.findOne({ id: parseInt(id) });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update fields
        if (updateData.senderId !== undefined) order.senderId = parseInt(updateData.senderId);
        if (updateData.receiverId !== undefined) order.receiverId = parseInt(updateData.receiverId);
        if (updateData.weight !== undefined) order.weight = parseFloat(updateData.weight);
        if (updateData.status !== undefined) order.status = updateData.status;
        if (updateData.driverId !== undefined) {
            order.driverId = updateData.driverId ? parseInt(updateData.driverId) : null;
            // If driver is being assigned/changed, update assignedAt
            if (updateData.driverId) {
                order.assignedAt = new Date();
            }
        }
        if (updateData.assignmentType !== undefined) {
            order.assignmentType = updateData.assignmentType;
        }
        if (updateData.assignedAt !== undefined) {
            order.assignedAt = updateData.assignedAt;
        }
        if (updateData.notes !== undefined) order.notes = updateData.notes;
        
        order.updatedAt = new Date();
        
        await order.save();
        console.log(`✅ Updated order ${id}:`, {
            ...updateData,
            assignmentType: order.assignmentType
        });
        res.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cập nhật trạng thái đơn hàng
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        const order = await Order.findOne({ id: parseInt(id) });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.updateStatus(status);
        if (status === 'cancelled' && reason) {
            order.cancelReason = reason;
        }
        
        await order.save();
        res.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(400).json({ error: error.message });
    }
});

// Gán tài xế thủ công
router.patch('/:id/assign', async (req, res) => {
    try {
        const { id } = req.params;
        const { driverId } = req.body;

        const order = await Order.findOne({ id: parseInt(id) });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Gán thủ công
        order.driverId = driverId;
        order.assignmentType = 'manual';
        order.status = 'assigned';
        order.assignedAt = new Date();
        order.updatedAt = new Date();
        
        await order.save();
        
        console.log(`✅ Manually assigned order ${id} to driver ${driverId}`);
        res.json(order);
    } catch (error) {
        console.error('Error assigning order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Hủy đơn hàng
router.patch('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const order = await Order.findOne({ id: parseInt(id) });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.updateStatus('cancelled');
        if (reason) {
            order.cancelReason = reason;
        }
        
        await order.save();
        res.json(order);
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(400).json({ error: error.message });
    }
});

// Thống kê đơn hàng
router.get('/stats', async (req, res) => {
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

        const [total, byStatus, byDriver] = await Promise.all([
            Order.countDocuments(query),
            Order.aggregate([
                { $match: query },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Order.aggregate([
                { $match: { ...query, driverId: { $ne: null } } },
                { 
                    $group: { 
                        _id: '$driverId',
                        orderCount: { $sum: 1 },
                        totalWeight: { $sum: '$weight' }
                    } 
                }
            ])
        ]);

        res.json({
            total,
            byStatus: byStatus.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byDriver
        });
    } catch (error) {
        console.error('Error getting order stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
