const signalR = require('@microsoft/signalr');
const { getCurrentVehicleRoute } = require('../utils/optimizer');
const Route = require('../models/Route');

// DeliveryHub.js - Socket.IO server implementation for real-time delivery updates

class DeliveryHub {
    constructor(io) {
        this.io = io;
        this.driverConnections = new Map(); // Map để lưu socket id của tài xế
        this.userConnections = new Map(); // Map để lưu socket id của người dùng
    }

    // Khởi tạo các events
    initialize() {
        this.io.on('connection', async (socket) => {
            console.log('Client connected:', socket.id);

            // Driver đăng ký nhận updates
            socket.on('registerDriver', async (driverId) => {
                try {
<<<<<<< HEAD
                    const driverIdStr = driverId.toString();
                    this.driverConnections.set(driverIdStr, socket.id);
                    console.log(`Driver ${driverId} registered with socket ${socket.id}`);

                    // Gửi route hiện tại cho driver nếu có
                    try {
                        const route = await Route.findOne({ 
                            vehicleId: driverId,
                            status: 'active'
                        });

                        if (route) {
                            console.log(`Sending current route to driver ${driverId}`);
                            socket.emit('routeUpdate', {
                                type: 'routeUpdate',
                                data: route
                            });
                        } else {
                            console.log(`No active route found for driver ${driverId}`);
                        }
                    } catch (err) {
                        console.error(`Error fetching route for driver ${driverId}:`, err);
=======
                    this.driverConnections.set(driverId, socket.id);
                    console.log(`Driver ${driverId} registered`);

                    // Gửi route hiện tại cho driver nếu có
                    const currentRoute = await Route.getCurrentRoute(driverId);
                    if (currentRoute) {
                        console.log(`Sending current route to driver ${driverId}`);
                        socket.emit('routeUpdate', {
                            vehicleId: driverId,
                            route: currentRoute
                        });
                    } else {
                        console.log(`No active route found for driver ${driverId}`);
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
                    }
                } catch (err) {
                    console.error(`Error handling driver registration for ${driverId}:`, err);
                    socket.emit('error', { message: 'Error retrieving route information' });
                }
            });

            // User đăng ký nhận updates
            socket.on('registerUser', async (userId) => {
                try {
                    this.userConnections.set(userId, socket.id);
                    console.log(`User ${userId} registered`);

                    // Lấy tất cả route có chứa đơn hàng của user này
                    const userRoutes = await Route.find({
                        isActive: true,
                        'stops.userId': userId
                    });

                    if (userRoutes && userRoutes.length > 0) {
                        console.log(`Sending ${userRoutes.length} routes to user ${userId}`);
                        socket.emit('orderUpdates', {
                            userId,
                            routes: userRoutes.map(route => ({
                                vehicleId: route.vehicleId,
                                currentPosition: route.currentPosition,
                                relevantStops: route.stops.filter(stop => stop.userId === userId)
                            }))
                        });
                    } else {
                        console.log(`No active routes found for user ${userId}`);
                    }
                } catch (err) {
                    console.error(`Error handling user registration for ${userId}:`, err);
                    socket.emit('error', { message: 'Error retrieving order information' });
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
                
                // Remove from driver/user maps
                for (const [driverId, socketId] of this.driverConnections.entries()) {
                    if (socketId === socket.id) {
                        this.driverConnections.delete(driverId);
                        console.log(`Driver ${driverId} disconnected`);
                        break;
                    }
                }
                
                for (const [userId, socketId] of this.userConnections.entries()) {
                    if (socketId === socket.id) {
                        this.userConnections.delete(userId);
                        console.log(`User ${userId} disconnected`);
                        break;
                    }
                }
            });
        });
    }

    // Gửi cập nhật route cho driver
    async sendRouteUpdateToDriver(driverId, route) {
        try {
<<<<<<< HEAD
            const socketId = this.driverConnections.get(driverId.toString());
            if (socketId) {
                console.log(`Sending route update to driver ${driverId} via socket ${socketId}`);
                this.io.to(socketId).emit('routeUpdate', {
                    type: 'routeUpdate',
                    data: route
                });
                return true;
            } else {
                console.log(`Driver ${driverId} not connected, broadcasting to all sockets...`);
                this.io.emit('routeUpdate', {
                    type: 'routeUpdate',
                    data: route
                });
                return true;
            }
        } catch (err) {
            console.error(`Error sending route update to driver ${driverId}:`, err);
            return false;
=======
            const socketId = this.driverConnections.get(driverId);
            if (socketId) {
                console.log(`Sending route update to driver ${driverId}`);
                this.io.to(socketId).emit('routeUpdate', {
                    vehicleId: driverId,
                    route
                });
            } else {
                console.log(`Driver ${driverId} not connected, cannot send route update`);
            }
        } catch (err) {
            console.error(`Error sending route update to driver ${driverId}:`, err);
>>>>>>> f79cecf924c75ac971f405a3dbbff57813436980
        }
    }

    // Broadcast cập nhật cho tất cả user có đơn hàng trong route
    async broadcastRouteUpdateToUsers(route) {
        try {
            // Lấy danh sách unique userId từ stops
            const userIds = [...new Set(route.stops.map(stop => stop.userId))];
            
            for (const userId of userIds) {
                const socketId = this.userConnections.get(userId);
                if (socketId) {
                    console.log(`Sending route update to user ${userId}`);
                    
                    // Chỉ gửi các stops liên quan đến user này
                    const relevantStops = route.stops.filter(stop => stop.userId === userId);
                    
                    this.io.to(socketId).emit('orderUpdates', {
                        userId,
                        routes: [{
                            vehicleId: route.vehicleId,
                            currentPosition: route.currentPosition,
                            relevantStops
                        }]
                    });
                }
            }
        } catch (err) {
            console.error('Error broadcasting route update to users:', err);
        }
    }
}

module.exports = DeliveryHub;
