import * as signalR from '@microsoft/signalr';

class SignalRService {
    constructor() {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl('http://localhost:5000/deliveryHub', {
                withCredentials: true,
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect()
            .build();

        this.connection.start().catch(err => console.error('SignalR Connection Error: ', err));
    }

    onLocationUpdate(callback) {
        this.connection.on('LocationUpdated', callback);
    }

    onOrderStatusUpdate(callback) {
        this.connection.on('OrderStatusUpdated', callback);
    }

    updateLocation(vehicleId, location) {
        this.connection.invoke('UpdateLocation', vehicleId, location);
    }

    updateOrderStatus(orderId, status) {
        this.connection.invoke('UpdateOrderStatus', orderId, status);
    }
}

export default new SignalRService();
