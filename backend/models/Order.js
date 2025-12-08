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
        enum: ['pending', 'approved', 'assigned', 'in_transit', 'picked', 'delivering', 'delivered', 'cancelled'],
        default: 'pending'
    },
    driverId: {
        type: Number,
        index: true
    },
    // Phân biệt gán thủ công hay tự động
    assignmentType: {
        type: String,
        enum: ['manual', 'auto'],
        default: null
    },
    // Địa chỉ dạng text
    pickupAddress: {
        type: String,
        default: ''
    },
    deliveryAddress: {
        type: String,
        default: ''
    },
    // Thời gian
    pickupTime: Date,
    deliveryTime: Date,
    approvedAt: Date,
    assignedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Ghi chú
    notes: String,
    cancelReason: String
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
            'pending': ['approved', 'cancelled'],
            'approved': ['assigned', 'cancelled'],
            'assigned': ['in_transit', 'cancelled'],
            'in_transit': ['picked', 'cancelled'],
            'picked': ['delivering', 'cancelled'],
            'delivering': ['delivered', 'cancelled'],
            'delivered': [],
            'cancelled': []
        };
        
        if (!validTransitions[this.status]?.includes(newStatus)) {
            throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
        }
        
        const now = new Date();
        this.status = newStatus;
        
        // Cập nhật thời gian tương ứng
        switch(newStatus) {
            case 'approved':
                this.approvedAt = now;
                break;
            case 'assigned':
                this.assignedAt = now;
                break;
            case 'in_transit':
                this.startedAt = now;
                break;
            case 'picked':
                this.pickupTime = now;
                break;
            case 'delivered':
                this.deliveryTime = now;
                this.completedAt = now;
                break;
            case 'cancelled':
                this.cancelledAt = now;
                break;
        }
        this.updatedAt = now;
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
