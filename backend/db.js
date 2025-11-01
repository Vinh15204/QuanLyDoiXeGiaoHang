const mongoose = require('mongoose');

// Khai báo promise để track trạng thái kết nối
let dbConnection = null;

const connectDB = async () => {
    try {
        if (dbConnection) {
            console.log('Using existing database connection');
            return dbConnection;
        }

        console.log('Connecting to MongoDB...');
        
        // Xóa các deprecated warnings
        mongoose.set('strictQuery', false);

        const conn = await mongoose.connect('mongodb://127.0.0.1:27017/qldxgh');
        
        dbConnection = conn;
        
        console.log('MongoDB Connected successfully');
        
        // Kiểm tra các collections đã tồn tại
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            dbConnection = null;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            dbConnection = null;
        });

        return conn;
    } catch (err) {
        console.error('MongoDB connection error:', err);
        dbConnection = null;
        throw err; // Throw error instead of exit to handle it in api-sample.js
    }
};

// Export the connection function
module.exports = connectDB;
