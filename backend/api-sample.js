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
app.use('/api/orders/manage', require('./routes/orders'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/statistics', require('./routes/statistics'));

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
    const { 
      status, 
      driverId, 
      senderId, 
      receiverId,
      userId,
      customerId,
      startDate, 
      endDate,
      assignmentType 
    } = req.query;

    console.log('📋 GET /api/orders - Query params:', req.query);
    console.log('📋 customerId:', customerId, 'userId:', userId);

    const query = {};
    
    // Nếu có userId hoặc customerId, tìm orders mà user là sender HOẶC receiver
    const userParam = userId || customerId;
    if (userParam) {
      const userIdNum = parseInt(userParam);
      console.log('✅ Filtering by user ID:', userIdNum);
      query.$or = [
        { senderId: userIdNum },
        { receiverId: userIdNum }
      ];
    } else {
      // Logic cũ cho các filter khác
      if (status) query.status = status;
      if (driverId) query.driverId = parseInt(driverId);
      if (senderId) query.senderId = parseInt(senderId);
      if (receiverId) query.receiverId = parseInt(receiverId);
    }
    
    if (assignmentType) query.assignmentType = assignmentType;
    
    // Filter theo ngày
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    console.log('📋 Fetching orders with query:', query);
    const orders = await Order.find(query).sort({ createdAt: -1 });
    console.log(`✅ Found ${orders.length} orders`);
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
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
    
    // Tự động generate ID nếu chưa có
    if (!req.body.id) {
      const lastOrder = await Order.findOne().sort({ id: -1 });
      req.body.id = lastOrder ? lastOrder.id + 1 : 1;
      console.log('Auto-generated order ID:', req.body.id);
    }
    
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

// Bulk assign driver to multiple orders
app.post('/api/orders/bulk-assign', async (req, res, next) => {
  try {
    const { orderIds, driverId } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'orderIds must be a non-empty array'
      });
    }

    if (!driverId) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'driverId is required'
      });
    }

    // Verify driver exists - driverId có thể là vehicleId hoặc user.id
    const driver = await User.findOne({ 
      $or: [
        { id: driverId, role: 'driver' },
        { vehicleId: driverId, role: 'driver' }
      ]
    });
    
    if (!driver) {
      return res.status(404).json({ 
        error: 'Driver not found',
        message: `Driver with id ${driverId} not found`
      });
    }

    // Update all orders - sử dụng vehicleId nếu có, nếu không thì dùng driver.id
    const vehicleId = driver.vehicleId || driver.id;
    const result = await Order.updateMany(
      { id: { $in: orderIds } },
      { 
        $set: { 
          driverId: vehicleId,
          status: 'assigned',
          assignmentType: 'manual',
          assignedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // Emit real-time update
    if (global.deliveryHub) {
      global.deliveryHub.notifyOrdersUpdated();
    }

    res.json({ 
      success: true,
      message: `${result.modifiedCount} orders assigned to driver ${driver.name}`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
});

// Bulk change status of multiple orders
app.put('/api/orders/bulk-status', async (req, res, next) => {
  try {
    const { orderIds, newStatus, unassignDriver } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'orderIds must be a non-empty array'
      });
    }

    if (!newStatus) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'newStatus is required'
      });
    }

    const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled', 'approved'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Prepare update object
    const updateObj = { 
      status: newStatus,
      updatedAt: new Date()
    };

    // If unassignDriver is true, also clear driverId and assignmentType
    if (unassignDriver) {
      updateObj.driverId = null;
      updateObj.assignmentType = null;
    }

    // Update all orders
    const result = await Order.updateMany(
      { id: { $in: orderIds } },
      { $set: updateObj }
    );

    // Emit real-time update
    if (global.deliveryHub) {
      global.deliveryHub.notifyOrdersUpdated();
    }

    res.json({ 
      success: true,
      message: `${result.modifiedCount} orders updated to status: ${newStatus}`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
});

// Bulk delete multiple orders
app.delete('/api/orders/bulk-delete', async (req, res, next) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'orderIds must be a non-empty array'
      });
    }

    // Delete all orders
    const result = await Order.deleteMany(
      { id: { $in: orderIds } }
    );

    // Emit real-time update
    if (global.deliveryHub) {
      global.deliveryHub.notifyOrdersUpdated();
    }

    res.json({ 
      success: true,
      message: `${result.deletedCount} orders deleted`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
});

// ==================== VEHICLE BULK OPERATIONS ====================

// Bulk change status of multiple vehicles
app.put('/api/vehicles/bulk-status', async (req, res, next) => {
  try {
    const { vehicleIds, newStatus } = req.body;

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'vehicleIds must be a non-empty array'
      });
    }

    if (!newStatus) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'newStatus is required'
      });
    }

    const validStatuses = ['available', 'in_use', 'maintenance'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update all vehicles
    const result = await Vehicle.updateMany(
      { id: { $in: vehicleIds } },
      { $set: { status: newStatus } }
    );

    res.json({ 
      success: true,
      message: `${result.modifiedCount} vehicles updated to status: ${newStatus}`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
});

// Bulk delete multiple vehicles
app.delete('/api/vehicles/bulk-delete', async (req, res, next) => {
  try {
    const { vehicleIds } = req.body;

    if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'vehicleIds must be a non-empty array'
      });
    }

    // Delete all vehicles
    const result = await Vehicle.deleteMany(
      { id: { $in: vehicleIds } }
    );

    res.json({ 
      success: true,
      message: `${result.deletedCount} vehicles deleted`,
      deletedCount: result.deletedCount
    });
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

// Bulk update user status - MUST come before /api/users/:id to avoid route collision
app.put('/api/users/bulk-status', async (req, res, next) => {
  try {
    const { ids, status } = req.body;

    console.log('Bulk status update request:', { ids, status });

    if (!User) {
      return res.status(500).json({ 
        error: 'Database not initialized',
        message: 'Please try again in a few moments'
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Determine if IDs are ObjectIds or numeric IDs
    const firstId = String(ids[0]);
    const isObjectId = firstId.match(/^[0-9a-fA-F]{24}$/);
    
    console.log('ID type detection:', { firstId, isObjectId });
    
    let query;
    if (isObjectId) {
      // Use ObjectId for MongoDB _id field
      const mongoose = require('mongoose');
      query = { _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } };
    } else {
      // Use numeric ID for custom id field
      const numericIds = ids.map(id => {
        const num = parseInt(id);
        if (isNaN(num)) {
          throw new Error(`Invalid numeric ID: ${id}`);
        }
        return num;
      });
      query = { id: { $in: numericIds } };
    }

    console.log('Query:', JSON.stringify(query));

    const result = await User.updateMany(
      query,
      { $set: { status, updatedAt: new Date() } }
    );

    console.log(`✅ Updated status for ${result.modifiedCount} users to ${status}`);
    res.json({ 
      success: true, 
      modifiedCount: result.modifiedCount,
      message: `Updated ${result.modifiedCount} users` 
    });
  } catch (err) {
    console.error('❌ Error in bulk status update:', err);
    res.status(500).json({ 
      error: 'Something went wrong!',
      message: err.message
    });
  }
});

// Bulk delete users - MUST come before /api/users/:id
app.delete('/api/users/bulk-delete', async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!User) {
      return res.status(500).json({ 
        error: 'Database not initialized',
        message: 'Please try again in a few moments'
      });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }

    // Determine if IDs are ObjectIds or numeric IDs
    const firstId = String(ids[0]);
    const isObjectId = firstId.match(/^[0-9a-fA-F]{24}$/);
    
    let query;
    if (isObjectId) {
      const mongoose = require('mongoose');
      query = { _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } };
    } else {
      const numericIds = ids.map(id => {
        const num = parseInt(id);
        if (isNaN(num)) {
          throw new Error(`Invalid numeric ID: ${id}`);
        }
        return num;
      });
      query = { id: { $in: numericIds } };
    }

    const result = await User.deleteMany(query);

    console.log(`✅ Deleted ${result.deletedCount} users`);
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} users` 
    });
  } catch (err) {
    console.error('❌ Error in bulk delete:', err);
    res.status(500).json({ 
      error: 'Something went wrong!',
      message: err.message
    });
  }
});

// Cập nhật user
app.put('/api/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    if (!User) {
      return res.status(500).json({ 
        error: 'Database not initialized',
        message: 'Please try again in a few moments'
      });
    }

    // Remove password from update if it's empty
    const updateData = { ...req.body };
    if (!updateData.password) {
      delete updateData.password;
    }

    // Try to find by MongoDB _id first (if it's a valid ObjectId), otherwise by custom id field
    let query;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a valid MongoDB ObjectId
      query = { _id: userId };
    } else {
      // It's a custom numeric id
      const numericId = parseInt(userId);
      if (isNaN(numericId)) {
        return res.status(400).json({ 
          error: 'Invalid user ID',
          message: `User ID must be a number or valid ObjectId, received: ${userId}`
        });
      }
      query = { id: numericId };
    }

    const user = await User.findOneAndUpdate(
      query,
      { $set: { ...updateData, updatedAt: new Date() } },
      { new: true, runValidators: false }
    );

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `User with id ${userId} not found`
      });
    }

    console.log(`User ${userId} updated successfully`);
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    next(err);
  }
});

// PATCH endpoint (same as PUT for partial updates)
app.patch('/api/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    if (!User) {
      return res.status(500).json({ 
        error: 'Database not initialized',
        message: 'Please try again in a few moments'
      });
    }

    // Remove password from update if it's empty or not provided
    const updateData = { ...req.body };
    if (!updateData.password) {
      delete updateData.password;
    }
    
    // Remove fields that shouldn't be updated via PATCH
    delete updateData._id;
    delete updateData.id; // Don't allow changing user ID
    delete updateData.username; // Don't allow changing username
    
    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    // Try to find by MongoDB _id first (if it's a valid ObjectId), otherwise by custom id field
    let query;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a valid MongoDB ObjectId
      query = { _id: userId };
    } else {
      // It's a custom numeric id
      query = { id: parseInt(userId) };
    }

    const user = await User.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: false } // Disable validators to avoid issues with required fields
    );

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `User with id ${userId} not found`
      });
    }

    console.log(`✅ User ${userId} updated successfully:`, updateData);
    res.json(user);
  } catch (err) {
    console.error('❌ Error updating user:', err);
    res.status(500).json({
      error: 'Update failed',
      message: err.message
    });
  }
});

// Xóa user
app.delete('/api/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (!User) {
      return res.status(500).json({ 
        error: 'Database not initialized',
        message: 'Please try again in a few moments'
      });
    }

    const user = await User.findOneAndDelete({ id: userId });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `User with id ${userId} not found`
      });
    }

    console.log(`User ${userId} deleted successfully`);
    res.json({ 
      success: true,
      message: 'User deleted successfully',
      user 
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    next(err);
  }
});

// API endpoint để lấy tất cả routes
app.get('/api/routes', async (req, res) => {
    try {
        const routes = await Route.find({ isActive: true });
        res.json({ routes });
    } catch (error) {
        console.error('Error getting routes:', error);
        res.status(500).json({ error: error.message });
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

// Cập nhật trạng thái đơn hàng
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    console.log(`📦 Updating order ${id} status to: ${status}`);

    const order = await Order.findOne({ id: parseInt(id) });
    if (!order) {
      console.error(`❌ Order ${id} not found`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update status using the model method if available, otherwise directly
    if (typeof order.updateStatus === 'function') {
      order.updateStatus(status);
    } else {
      order.status = status;
      order.updatedAt = new Date();
    }
    
    if (status === 'cancelled' && reason) {
      order.cancelReason = reason;
    }
    
    await order.save();
    console.log(`✅ Order ${id} status updated to: ${status}`);
    res.json(order);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(400).json({ error: err.message });
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
