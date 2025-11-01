const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: String,
  username: { type: String, required: true },
  password: { type: String, required: true },
  currentLocation: [Number],
  role: { type: String, required: true },
  vehicleId: Number
});

module.exports = mongoose.model('User', UserSchema);
