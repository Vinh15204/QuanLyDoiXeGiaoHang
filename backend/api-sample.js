const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const http = require('http');
const socketIo = require('socket.io');
const DeliveryHub = require('./Hubs/DeliveryHub');
const path = require('path');

// Import routes
const optimizeRoute = require('./routes/optimize');
const geocodeRoute = require('./routes/geocode');

let Vehicle, Order, User, Route;

// Function to initialize models after DB connection
const initModels = async () => {
    // Import models after DB connection is established
    Vehicle = require('./models/Vehicle');
    Order = require('./models/Order');
    User = require('./models/User');
    Route = require('./models/Route');
    
    // Log loaded models for verification
    console.log('Models initialized:', {
        hasVehicle: !!Vehicle,
        hasOrder: !!Order,
        hasUser: !!User,
        hasRoute: !!Route
    });
};

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Khởi tạo DeliveryHub
const deliveryHub = new DeliveryHub(io);
deliveryHub.initialize();

// Make deliveryHub accessible globally and in Express
global.deliveryHub = deliveryHub;
app.locals.deliveryHub = deliveryHub;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Add deliveryHub to request object
app.use((req, res, next) => {
    req.deliveryHub = deliveryHub;
    next();
});

// Initialize models before setting up routes
initModels();

// Mount routes
app.use('/api/optimize', optimizeRoute);
app.use('/api/geocode', geocodeRoute);

// Lấy danh sách xe
app.get('/api/vehicles', async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

// Thêm xe mới
app.post('/api/vehicles', async (req, res, next) => {
  try {
    const vehicleData = req.body;
    
    // Auto-geocode current location nếu có tọa độ nhưng chưa có địa chỉ
    if (!vehicleData.currentAddress) {
      let lat, lng;
      const coords = vehicleData.location || vehicleData.position;
      
      // Hỗ trợ nhiều format: array [lat, lng] hoặc object {lat, lng}
      if (coords) {
        if (Array.isArray(coords)) {
          [lat, lng] = coords;
        } else if (coords.lat && coords.lng) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }
      
      if (lat && lng) {
        try {
          const address = await geocodingService.reverseGeocode(lat, lng);
          if (address) {
            vehicleData.currentAddress = address;
          }
        } catch (geoError) {
          console.warn('Geocoding failed for vehicle, continuing without address:', geoError.message);
        }
      }
    }
    
    const vehicle = await Vehicle.create(vehicleData);
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
});

// Lấy danh sách đơn hàng
app.get('/api/orders', async (req, res, next) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Lấy đơn hàng theo id
app.get('/api/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ id: parseInt(id) });
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Thêm đơn hàng mới
app.post('/api/orders', async (req, res, next) => {
  try {
    const geocodingService = require('./utils/geocodingService');
    
    // Tự động geocode địa chỉ nếu chưa có
    if (req.body.pickup && !req.body.pickupAddress) {
      try {
        req.body.pickupAddress = await geocodingService.reverseGeocode(req.body.pickup);
        console.log('Auto-geocoded pickup:', req.body.pickupAddress);
      } catch (error) {
        console.warn('Failed to geocode pickup:', error.message);
      }
    }
    
    if (req.body.delivery && !req.body.deliveryAddress) {
      try {
        req.body.deliveryAddress = await geocodingService.reverseGeocode(req.body.delivery);
        console.log('Auto-geocoded delivery:', req.body.deliveryAddress);
      } catch (error) {
        console.warn('Failed to geocode delivery:', error.message);
      }
    }
    
    const order = await Order.create(req.body);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Lấy danh sách users
app.get('/api/users', async (req, res) => {
  try {
    if (!User) {
      console.error('User model not initialized');
      return res.status(500).json({ 
        error: 'Database not initialized',
        message: 'Please try again in a few moments'
      });
    }

    const users = await User.find().lean();
    
    if (!users) {
      console.log('No users found in database');
      return res.json([]);
    }

    console.log(`Found ${users.length} users`);
    res.json(users);

  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ 
      error: 'Error fetching users',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Thêm user mới
app.post('/api/users', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// API endpoint để lấy route hiện tại của xe
app.get('/api/routes/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        console.log('Getting route for vehicle:', vehicleId);
        
        const route = await Route.findOne({ 
            vehicleId: parseInt(vehicleId), 
            isActive: true 
        });

        if (!route) {
            console.log('No active route found for vehicle:', vehicleId);
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lộ trình cho xe này'
            });
        }

        console.log('Found route:', {
            vehicleId: route.vehicleId,
            numStops: route.stops?.length,
            numOrders: route.assignedOrders?.length
        });

        res.json({
            success: true,
            route: route
        });
    } catch (error) {
        console.error('Error getting route for vehicle:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin lộ trình',
            error: error.message
        });
    }
});

// API endpoint để lấy tất cả routes đang active
app.get('/api/routes', async (req, res) => {
    try {
        const { limit, excludePath } = req.query;
        
        // Build query
        let query = Route.find({ isActive: true }).sort({ lastUpdated: -1 });
        
        // Optional: exclude path field to reduce payload size (for overview only)
        if (excludePath === 'true') {
            query = query.select('-path');
            console.log('⚡ Excluding path field for faster response');
        }
        
        // Optional: limit results
        if (limit) {
            query = query.limit(parseInt(limit));
        }
        
        const routes = await query.lean(); // .lean() for faster queries
        console.log(`📍 GET /api/routes - Found ${routes.length} active routes`);
        
        res.json({
            success: true,
            routes: routes
        });
    } catch (error) {
        console.error('Error in /api/routes:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting routes',
            error: error.message
        });
    }
});

// Route mặc định cho /
app.get('/', (req, res) => {
  res.send('QLDXGH API is running!');
});

// Xóa xe
app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Vehicle.findOneAndDelete({ id: parseInt(id) });
    if (!deleted) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sửa xe
app.patch('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Auto-geocode nếu location/position được cập nhật nhưng không có currentAddress
    if ((updateData.location || updateData.position) && !updateData.currentAddress) {
      let lat, lng;
      const coords = updateData.location || updateData.position;
      
      // Hỗ trợ nhiều format: array [lat, lng] hoặc object {lat, lng}
      if (coords) {
        if (Array.isArray(coords)) {
          [lat, lng] = coords;
        } else if (coords.lat && coords.lng) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }
      
      if (lat && lng) {
        try {
          const address = await geocodingService.reverseGeocode(lat, lng);
          if (address) {
            updateData.currentAddress = address;
          }
        } catch (geoError) {
          console.warn('Geocoding failed for vehicle update:', geoError.message);
        }
      }
    }
    
    const updated = await Vehicle.findOneAndUpdate({ id: parseInt(id) }, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa đơn hàng
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Order.findOneAndDelete({ id: parseInt(id) });
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sửa đơn hàng
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Order.findOneAndUpdate({ id: parseInt(id) }, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Export for use in server.js
module.exports = {
  app,
  server,
  deliveryHub
};
