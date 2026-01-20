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
    enum: ['admin', 'driver', 'user', 'guest']
  },
  vehicleId: Number,
  // Driver license info
  licenseNumber: String,
  licenseClass: {
    type: String,
    enum: ['B1', 'B2', 'C', 'D', 'E', 'FB2', 'FC', 'FD', 'FE'],
    default: null
  },
  licenseExpiry: Date,
  joinDate: Date,
  totalDeliveries: {
    type: Number,
    default: 0
  },
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

// Pre-save hook to auto-generate ID based on role
UserSchema.pre('save', async function(next) {
  if (this.isNew && !this.id) {
    try {
      const User = mongoose.model('User');
      let startId, endId;
      
      // Define ID ranges based on role
      if (this.role === 'admin') {
        startId = 1;
        endId = 99;
      } else if (this.role === 'driver') {
        startId = 100;
        endId = 999;
      } else { // user
        startId = 1000;
        endId = 999999;
      }
      
      // Find the highest ID in the role's range
      const lastUser = await User.findOne({ 
        id: { $gte: startId, $lte: endId } 
      }).sort({ id: -1 });
      
      if (lastUser && lastUser.id >= endId) {
        throw new Error(`Đã hết ID cho role ${this.role}`);
      }
      
      this.id = lastUser ? lastUser.id + 1 : startId;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
