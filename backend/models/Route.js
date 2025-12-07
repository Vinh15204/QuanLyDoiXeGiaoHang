const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
    vehicleId: {
        type: String,
        required: true,
        index: true
    },
    currentPosition: {
        type: [Number],
        required: true,
        validate: {
            validator: function(v) {
                return v.length === 2 && !v.some(isNaN);
            },
            message: 'Current position must be [latitude, longitude]'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    assignedOrders: [{
        type: String,  // order IDs
        required: true
    }],
    stops: [{
        type: {
            type: String,
            enum: ['pickup', 'delivery', 'depot'],
            required: true
        },
        orderId: String,  // optional for depot
        point: {
            type: [Number],
            required: true,
            validate: {
                validator: function(v) {
                    return v.length === 2 && !v.some(isNaN);
                },
                message: 'Stop position must be [latitude, longitude]'
            }
        }
    }],
    distance: {
        type: Number,
        required: true,
        default: 0
    },
    duration: {
        type: Number,
        required: true,
        default: 0
    },
    totalWeight: {
        type: Number,
        required: true,
        default: 0
    },
    stats: {
        totalStops: Number,
        stopTime: Number,
        moveTime: Number,
        totalTime: Number,
        loadRatio: Number
    },
    path: {
        type: [[Number]], // Mảng các cặp [lat, lng]
        default: [],
    }
});

// Compound index for faster queries
routeSchema.index({ isActive: 1, lastUpdated: -1 });

module.exports = mongoose.model('Route', routeSchema);
