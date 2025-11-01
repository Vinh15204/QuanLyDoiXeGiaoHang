const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    id: { 
        type: Number, 
        required: true, 
        unique: true 
    },
    senderId: { 
        type: Number, 
        required: true,
        index: true 
    },
    receiverId: { 
        type: Number,
        required: true,
        index: true
    },
    pickup: { 
        type: [Number], 
        required: true,
        validate: {
            validator: function(v) {
                return v.length === 2 && !v.some(isNaN);
            },
            message: 'Pickup location must be [latitude, longitude]'
        }
    },
    delivery: { 
        type: [Number], 
        required: true,
        validate: {
            validator: function(v) {
                return v.length === 2 && !v.some(isNaN);
            },
            message: 'Delivery location must be [latitude, longitude]'
        }
    },
    weight: { 
        type: Number, 
        required: true,
        min: 0 
    },
    status: { 
        type: String,
        enum: ['pending', 'assigned', 'picked', 'delivered', 'cancelled'],
        default: 'pending'
    },
    driverId: {
        type: Number,
        index: true
    },
    pickupTime: Date,
    deliveryTime: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Add compound indexes
OrderSchema.index({ status: 1, driverId: 1 });
OrderSchema.index({ senderId: 1, status: 1 });
OrderSchema.index({ receiverId: 1, status: 1 });

// Update timestamps before saving
OrderSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Add instance methods
OrderSchema.methods = {
    isAssignable: function() {
        return this.status === 'pending';
    },
    
    assign: function(driverId) {
        if (!this.isAssignable()) {
            throw new Error(`Order ${this.id} cannot be assigned (current status: ${this.status})`);
        }
        this.driverId = driverId;
        this.status = 'assigned';
        this.updatedAt = new Date();
    },
    
    updateStatus: function(newStatus) {
        const validTransitions = {
            'pending': ['assigned', 'cancelled'],
            'assigned': ['picked', 'cancelled'],
            'picked': ['delivered', 'cancelled'],
            'delivered': [],
            'cancelled': []
        };
        
        if (!validTransitions[this.status].includes(newStatus)) {
            throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
        }
        
        this.status = newStatus;
        if (newStatus === 'picked') {
            this.pickupTime = new Date();
        } else if (newStatus === 'delivered') {
            this.deliveryTime = new Date();
        }
    }
};

// Static methods
OrderSchema.statics.findPendingOrders = function() {
    return this.find({ status: 'pending' }).sort({ createdAt: 1 });
};

OrderSchema.statics.findDriverOrders = function(driverId) {
    return this.find({ 
        driverId,
        status: { $in: ['assigned', 'picked'] }
    }).sort({ createdAt: 1 });
};

module.exports = mongoose.model('Order', OrderSchema);
