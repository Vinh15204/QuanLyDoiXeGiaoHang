const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
    id: { 
        type: Number, 
        required: true
    },
    position: { 
        type: [Number], 
        required: true,
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.length === 2;
            },
            message: 'Position must be [latitude, longitude]'
        }
    },
    currentAddress: {
        type: String,
        default: ''
    },
    maxLoad: { 
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['available', 'busy', 'maintenance'],
        default: 'available'
    },
    currentLoad: {
        type: Number,
        default: 0,
        min: 0
    }
});

module.exports = mongoose.model('Vehicle', VehicleSchema);
