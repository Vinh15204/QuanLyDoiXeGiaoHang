const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    vehicleId: {
        type: Number,
        required: true,
        index: true
    },
    // Vị trí hiện tại của xe (có thể khác với vehiclePosition ban đầu)
    currentPosition: {
        type: [Number],
        validate: {
            validator: function(v) {
                return !v || (v.length === 2 && !v.some(isNaN));
            },
            message: 'Current position must be [latitude, longitude]'
        }
    },
    // Vị trí ban đầu của xe khi tạo route
    vehiclePosition: {
        type: [Number],
        required: true,
        validate: {
            validator: function(v) {
                return v.length === 2 && !v.some(isNaN);
            },
            message: 'Vehicle position must be [latitude, longitude]'
        }
    },
    // Mảng các tọa độ tạo thành đường đi (dùng để vẽ Polyline)
    path: {
        type: [[Number]],
        required: true,
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.every(point => 
                    Array.isArray(point) && point.length === 2 && !point.some(isNaN)
                );
            },
            message: 'Path must be an array of [latitude, longitude] coordinates'
        }
    },
    // Danh sách ID đơn hàng được phân công
    assignedOrders: {
        type: [Number],
        default: []
    },
    // Các điểm dừng trên tuyến đường
    stops: [{
        type: {
            type: String,
            enum: ['pickup', 'delivery', 'depot'],
            required: true
        },
        orderId: Number,
        userId: String,
        point: {
            type: [Number],
            required: true,
            validate: {
                validator: function(v) {
                    return v.length === 2 && !v.some(isNaN);
                },
                message: 'Stop point must be [latitude, longitude]'
            }
        },
        arrivalTime: Number,
        serviceTime: Number,
        load: Number,
        pickupAddress: String,
        deliveryAddress: String
    }],
    // Thông tin chi tiết về tuyến đường
    routeDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    // Khoảng cách tổng (km)
    distance: {
        type: Number,
        default: 0
    },
    // Thời gian tổng (phút)
    duration: {
        type: Number,
        default: 0
    },
    // Tổng trọng tải
    totalWeight: {
        type: Number,
        default: 0
    },
    // Legacy fields
    totalDistance: Number,
    totalTime: Number,
    // Trạng thái
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    // Cho phép lưu các field không có trong schema (flexible)
    strict: false
});

// Compound index for queries
routeSchema.index({ vehicleId: 1, isActive: 1 });

// Add some useful methods
routeSchema.methods = {
    // Get estimated time of arrival to a specific stop
    getETA: function(stopIndex) {
        if (stopIndex < 0 || stopIndex >= this.stops.length) return null;
        return this.stops[stopIndex].arrivalTime;
    },
    
    // Get current load of the vehicle at a specific stop
    getCurrentLoad: function(stopIndex) {
        if (stopIndex < 0 || stopIndex >= this.stops.length) return 0;
        return this.stops[stopIndex].load;
    }
};

// Create or update route for a vehicle
routeSchema.statics.upsertRoute = async function(vehicleId, routeData) {
    try {
        // Deactivate any existing active routes for this vehicle
        await this.updateMany(
            { vehicleId, isActive: true },
            { $set: { isActive: false } }
        );
        
        // Create new route
        const route = new this({
            vehicleId,
            isActive: true,
            ...routeData
        });
        
        await route.save();
        return route;
    } catch (err) {
        console.error('Error upserting route:', err);
        throw err;
    }
};

// Get current active route for a vehicle
routeSchema.statics.getCurrentRoute = async function(vehicleId) {
    try {
        return await this.findOne({ vehicleId, isActive: true });
    } catch (err) {
        console.error('Error getting current route:', err);
        return null;
    }
};

module.exports = mongoose.model('Route', routeSchema);
