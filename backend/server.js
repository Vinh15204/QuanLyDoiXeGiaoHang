const connectDB = require('./db');

async function startServer() {
    try {
        console.log('Starting server initialization...');

        // Kết nối MongoDB trước
        console.log('Connecting to MongoDB...');
        await connectDB();
        console.log('MongoDB connected successfully');

        // Sau khi kết nối DB thành công, import và khởi tạo app
        const { app, server, deliveryHub } = await require('./api-sample');
        
        // Khởi động server
        const PORT = process.env.PORT || 3001;
        server.listen(PORT, () => {
            console.log(`
Server started successfully:
- Port: ${PORT}
- Environment: ${process.env.NODE_ENV || 'development'}
- MongoDB: Connected
- Socket.IO: Initialized
- Models: Loaded
- API: Ready

Server is now accepting connections...
`);
        });

        // Handle process termination
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Catch any unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
console.log('Initiating server startup...');
startServer();
