/**
 * Script kiểm tra và hiển thị trạng thái địa chỉ của các orders
 * Chạy: node backend/utils/checkOrderAddresses.js
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qldxgh';

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

async function checkOrderAddresses() {
    try {
        const totalOrders = await Order.countDocuments();
        console.log(`📊 Total orders in database: ${totalOrders}\n`);
        
        if (totalOrders === 0) {
            console.log('⚠️  No orders found in database.');
            console.log('💡 Import some sample data first!\n');
            return;
        }
        
        // Lấy 10 orders đầu tiên để xem
        const sampleOrders = await Order.find().limit(10);
        
        console.log('📝 Sample orders (first 10):\n');
        console.log('='.repeat(80));
        
        for (const order of sampleOrders) {
            console.log(`\nOrder #${order.id}:`);
            console.log(`  Pickup: [${order.pickup}]`);
            console.log(`  Pickup Address: ${order.pickupAddress || '❌ MISSING'}`);
            console.log(`  Delivery: [${order.delivery}]`);
            console.log(`  Delivery Address: ${order.deliveryAddress || '❌ MISSING'}`);
            console.log(`  Weight: ${order.weight}kg`);
            console.log(`  Status: ${order.status}`);
        }
        
        console.log('\n' + '='.repeat(80));
        
        // Thống kê
        const withPickupAddr = await Order.countDocuments({ 
            pickupAddress: { $exists: true, $ne: null, $ne: '' } 
        });
        const withDeliveryAddr = await Order.countDocuments({ 
            deliveryAddress: { $exists: true, $ne: null, $ne: '' } 
        });
        
        console.log('\n📊 Statistics:');
        console.log(`  Orders with pickup address: ${withPickupAddr}/${totalOrders} (${((withPickupAddr/totalOrders)*100).toFixed(1)}%)`);
        console.log(`  Orders with delivery address: ${withDeliveryAddr}/${totalOrders} (${((withDeliveryAddr/totalOrders)*100).toFixed(1)}%)`);
        
        const missingAddresses = totalOrders - Math.min(withPickupAddr, withDeliveryAddr);
        if (missingAddresses > 0) {
            console.log(`\n⚠️  ${missingAddresses} orders need geocoding!`);
            console.log('💡 Run: node utils/geocodeExistingOrders.js');
        } else {
            console.log('\n✅ All orders have addresses!');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

if (require.main === module) {
    connectDB().then(() => {
        checkOrderAddresses();
    });
}

module.exports = { checkOrderAddresses };
