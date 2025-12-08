const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: String,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: String,
  phone: String,
  currentLocation: [Number],
  role: { 
    type: String, 
    required: true,
    enum: ['admin', 'driver', 'user']
  },
  vehicleId: Number,
  licenseNumber: String,
  // Trạng thái tài xế
  status: {
    type: String,
    enum: ['active', 'available', 'busy', 'offline', 'on_leave'],
    default: 'available'
  },
  // Danh sách ngày nghỉ
  daysOff: [{
    date: { type: Date, required: true },
    reason: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
