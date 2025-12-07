const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('./db');
const DeliveryHub = require('./Hubs/DeliveryHub');

function createServer() {
    const app = express();
    const server = http.createServer(app);
    
    // Cấu hình CORS
    app.use(cors({
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }));

    // Cấu hình Socket.IO
    const io = socketIo(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Khởi tạo DeliveryHub
    const deliveryHub = new DeliveryHub(io);
    deliveryHub.initialize();

    app.use(express.json());

    return { app, server, deliveryHub };
}

module.exports = createServer;
