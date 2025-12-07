const express = require('express');
const router = express.Router();
const geocodingService = require('../utils/geocodingService');

/**
 * POST /api/geocode/reverse
 * Convert tọa độ thành địa chỉ
 * Body: { coordinates: [lat, lng] }
 */
router.post('/reverse', async (req, res) => {
    try {
        const { coordinates } = req.body;

        if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
            return res.status(400).json({
                error: 'Invalid coordinates format. Expected [latitude, longitude]'
            });
        }

        const address = await geocodingService.reverseGeocode(coordinates);

        res.json({
            success: true,
            coordinates,
            address
        });

    } catch (error) {
        console.error('Reverse geocode error:', error);
        res.status(500).json({
            error: 'Failed to reverse geocode',
            message: error.message
        });
    }
});

/**
 * POST /api/geocode/forward
 * Convert địa chỉ thành tọa độ
 * Body: { address: "Hà Nội" }
 */
router.post('/forward', async (req, res) => {
    try {
        const { address } = req.body;

        if (!address || typeof address !== 'string') {
            return res.status(400).json({
                error: 'Invalid address format. Expected string'
            });
        }

        const coordinates = await geocodingService.forwardGeocode(address);

        if (!coordinates) {
            return res.status(404).json({
                error: 'Address not found',
                address
            });
        }

        res.json({
            success: true,
            address,
            coordinates
        });

    } catch (error) {
        console.error('Forward geocode error:', error);
        res.status(500).json({
            error: 'Failed to forward geocode',
            message: error.message
        });
    }
});

/**
 * POST /api/geocode/batch
 * Convert nhiều tọa độ thành địa chỉ
 * Body: { coordinates: [[lat1,lng1], [lat2,lng2], ...] }
 */
router.post('/batch', async (req, res) => {
    try {
        const { coordinates } = req.body;

        if (!Array.isArray(coordinates)) {
            return res.status(400).json({
                error: 'Invalid format. Expected array of coordinates'
            });
        }

        const addresses = await geocodingService.batchReverseGeocode(coordinates);

        res.json({
            success: true,
            count: coordinates.length,
            results: coordinates.map((coord, idx) => ({
                coordinates: coord,
                address: addresses[idx]
            }))
        });

    } catch (error) {
        console.error('Batch geocode error:', error);
        res.status(500).json({
            error: 'Failed to batch geocode',
            message: error.message
        });
    }
});

/**
 * POST /api/geocode/details
 * Lấy thông tin chi tiết về địa chỉ
 * Body: { coordinates: [lat, lng] }
 */
router.post('/details', async (req, res) => {
    try {
        const { coordinates } = req.body;

        if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
            return res.status(400).json({
                error: 'Invalid coordinates format'
            });
        }

        const details = await geocodingService.getAddressDetails(coordinates);

        if (!details) {
            return res.status(404).json({
                error: 'Address details not found'
            });
        }

        res.json({
            success: true,
            details
        });

    } catch (error) {
        console.error('Get address details error:', error);
        res.status(500).json({
            error: 'Failed to get address details',
            message: error.message
        });
    }
});

/**
 * GET /api/geocode/cache/stats
 * Lấy thống kê cache
 */
router.get('/cache/stats', (req, res) => {
    try {
        const stats = geocodingService.getCacheStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get cache stats',
            message: error.message
        });
    }
});

/**
 * DELETE /api/geocode/cache
 * Clear cache
 */
router.delete('/cache', (req, res) => {
    try {
        geocodingService.clearCache();
        res.json({
            success: true,
            message: 'Cache cleared successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to clear cache',
            message: error.message
        });
    }
});

module.exports = router;
