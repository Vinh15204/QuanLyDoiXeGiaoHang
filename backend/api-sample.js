const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const http = require('http');
const socketIo = require('socket.io');
const DeliveryHub = require('./Hubs/DeliveryHub');
const path = require('path');

// Import routes
const optimizeRoute = require('./routes/optimize');

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

// Middleware
app.use(cors());
app.use(express.json());

// Initialize models before setting up routes
initModels();

// Mount routes
app.use('/api/optimize', optimizeRoute);

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
    const vehicle = await Vehicle.create(req.body);
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

// Thêm đơn hàng mới
app.post('/api/orders', async (req, res, next) => {
  try {
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
        const route = await getCurrentRoute(vehicleId);
        
        if (!route) {
            return res.status(404).json({
                success: false,
                message: 'No active route found for this vehicle'
            });
        }

        res.json({
            success: true,
            route: route
        });
    } catch (error) {
        console.error('Error in /api/routes/:vehicleId:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting route',
            error: error.message
        });
    }
});

// API endpoint để lấy tất cả routes đang active
app.get('/api/routes', async (req, res) => {
    try {
        const routes = await Route.find({ status: 'active' });
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
