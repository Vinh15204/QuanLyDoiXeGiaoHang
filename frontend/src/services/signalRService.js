import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class SignalRService {
    constructor() {
        this._connectHandlers = [];
        this._disconnectHandlers = [];
        this._routeUpdateHandlers = [];

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
            this._retryCount = 0;
            this._connectHandlers.forEach(handler => handler());
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket.IO Connection Error:', error);
            this._retryCount = (this._retryCount || 0) + 1;
            console.log(`Retrying connection... Attempt ${this._retryCount}`);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket.IO Disconnected:', reason);
            this._disconnectHandlers.forEach(handler => handler());
            if (reason === 'io server disconnect') {
                this.socket.connect();
            }
        });

        this.socket.on('routeUpdate', (routeData) => {
            console.log('Received route update:', routeData);
            this._routeUpdateHandlers.forEach(handler => handler(routeData));
        });
    }

    // Event handler registration methods
    onConnect(handler) {
        this._connectHandlers.push(handler);
        // Nếu đã kết nối, gọi handler ngay lập tức
        if (this.socket.connected) {
            handler();
        }
    }

    onDisconnect(handler) {
        this._disconnectHandlers.push(handler);
    }

    onRouteUpdate(handler) {
        this._routeUpdateHandlers.push(handler);
    }

    // Event handler removal methods
    offConnect(handler) {
        this._connectHandlers = this._connectHandlers.filter(h => h !== handler);
    }

    offDisconnect(handler) {
        this._disconnectHandlers = this._disconnectHandlers.filter(h => h !== handler);
    }

    offRouteUpdate(handler) {
        this._routeUpdateHandlers = this._routeUpdateHandlers.filter(h => h !== handler);
    }

    // Connection management methods
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

    // Đăng ký user với server để nhận cập nhật đơn hàng
    registerUser(userId) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('registerUser', userId);
            console.log('registerUser emitted:', userId);
        } else {
            // Nếu socket chưa kết nối, đợi kết nối xong rồi emit
            this.onConnect(() => {
                this.socket.emit('registerUser', userId);
                console.log('registerUser emitted (delayed):', userId);
            });
        }
    }

    // Clean up method
    cleanup() {
        this._connectHandlers = [];
        this._disconnectHandlers = [];
        this._routeUpdateHandlers = [];
        this.disconnect();
    }
}

const signalRService = new SignalRService();
export default signalRService;
