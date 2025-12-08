import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class SignalRService {
    constructor() {
        this.socket = io(API_BASE_URL, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });

        this.socket.on('connect', () => {
            console.log('Socket.IO Connected successfully');
            this._retryCount = 0; // Reset retry count on successful connection
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket.IO Connection Error:', error);
            this._retryCount = (this._retryCount || 0) + 1;
            console.log(`Retrying connection... Attempt ${this._retryCount}`);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket.IO Disconnected:', reason);
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                this.socket.connect();
            }
        });
    }    // Connection management methods
    connect() {
        if (!this.socket.connected) {
            console.log('Initiating socket connection...');
            this.socket.connect();
        }
    }

    disconnect() {
        if (this.socket.connected) {
            console.log('Disconnecting socket...');
            this.socket.disconnect();
        }
    }

    isConnected() {
        return this.socket.connected;
    }

    // Event listener methods for DriverPage
    onConnect(callback) {
        this.socket.on('connect', callback);
    }

    onDisconnect(callback) {
        this.socket.on('disconnect', callback);
    }

    onRouteUpdate(callback) {
        this.socket.on('routeUpdate', callback);
    }

    // Cleanup method to remove all listeners
    cleanup() {
        this.socket.off('connect');
        this.socket.off('disconnect');
        this.socket.off('routeUpdate');
        this.socket.off('orderUpdates');
        this.socket.off('userOrderUpdate');
    }

    // Event registration methods
    registerDriver(driverId, callback) {
        this.connect();
        
        console.log(`Registering driver: ${driverId}`);
        this.socket.emit('registerDriver', driverId);

        // Remove any existing listener to prevent duplicates
        this.socket.off('routeUpdate');
        this.socket.on('routeUpdate', (data) => {
            console.log(`Received route update for driver ${driverId}:`, data);
            callback(data);
        });
    }

    // Đăng ký nhận updates cho user
    registerUser(userId, callback) {
        this.connect();
        
        console.log(`Registering user: ${userId}`);
        this.socket.emit('registerUser', userId);

        // Remove any existing listener to prevent duplicates
        this.socket.off('orderUpdates');
        this.socket.on('orderUpdates', (data) => {
            console.log(`Received order updates for user ${userId}:`, data);
            callback(data);
        });
        if (!this.socket.connected) {
            console.warn('Socket not connected, attempting to connect...');
            this.socket.connect();
        }
        
        this.socket.emit('registerUser', userId);
        this.socket.on('userOrderUpdate', callback);
    }

    // Cập nhật vị trí xe
    updateLocation(vehicleId, location) {
        if (this.socket.connected) {
            this.socket.emit('updateLocation', { vehicleId, location });
        }
    }

    // Cập nhật trạng thái đơn hàng
    updateOrderStatus(orderId, status) {
        if (this.socket.connected) {
            this.socket.emit('updateOrderStatus', { orderId, status });
        }
    }

    // Hủy đăng ký
    unregisterDriver(driverId) {
        this.socket.off('driverRouteUpdate');
        this.socket.emit('unregisterDriver', driverId);
    }    unregisterUser(userId) {
        this.socket.off('userOrderUpdate');
        this.socket.emit('unregisterUser', userId);
    }

    // Disconnect socket
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

const signalRService = new SignalRService();
export default signalRService;
