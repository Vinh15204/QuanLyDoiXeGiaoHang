const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
    id: { 
        type: Number, 
        required: true
    },
    // Vehicle identification
    licensePlate: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    model: String,
    brand: String,
    year: Number,
    color: String,
    // Vehicle documents
    registrationExpiry: Date,
    insuranceExpiry: Date,
    fuelType: {
        type: String,
        enum: ['gasoline', 'diesel', 'electric', 'hybrid'],
        default: 'diesel'
    },
    // Vehicle type and capacity
    type: {
        type: String,
        enum: ['Standard', 'Truck', 'Van', 'Motorcycle'],
        default: 'Standard'
    },
    capacity: {
        type: Number,
        min: 0
    },
    // Operation info
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
    location: { 
        type: [Number],
        validate: {
            validator: function(v) {
                return !v || (Array.isArray(v) && v.length === 2);
            },
            message: 'Location must be [latitude, longitude]'
        }
    },
    currentAddress: String,
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
