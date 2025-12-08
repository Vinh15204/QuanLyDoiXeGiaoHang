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
    stops: [{
        type: {
            type: String,
            enum: ['pickup', 'delivery'],
            required: true
        },
        orderId: {
            type: String,
            required: true
        },
        userId: {
            type: String,
            required: true
        },
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
        load: Number
    }],
    totalDistance: Number,
    totalTime: Number,
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
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
