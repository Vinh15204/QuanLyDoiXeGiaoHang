/**
 * Script để geocode tất cả orders hiện có trong database
 * Chạy: node backend/utils/geocodeExistingOrders.js
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const geocodingService = require('./geocodingService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qldxgh';

async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

async function geocodeExistingOrders() {
    console.log('🚀 Starting to geocode existing orders...\n');
    
    try {
        // Tìm tất cả orders chưa có địa chỉ hoặc là "Địa chỉ không xác định"
        const orders = await Order.find({
            $or: [
                { pickupAddress: { $exists: false } },
                { pickupAddress: null },
                { pickupAddress: '' },
                { pickupAddress: 'Địa chỉ không xác định' },
                { deliveryAddress: { $exists: false } },
                { deliveryAddress: null },
                { deliveryAddress: '' },
                { deliveryAddress: 'Địa chỉ không xác định' }
            ]
        });
        
        console.log(`Found ${orders.length} orders without addresses\n`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const order of orders) {
            console.log(`Processing Order #${order.id}...`);
            
            try {
                let updated = false;
                
                // Geocode pickup nếu chưa có
                if (order.pickup && !order.pickupAddress) {
                    console.log(`  Geocoding pickup [${order.pickup}]...`);
                    const pickupAddr = await geocodingService.reverseGeocode(order.pickup);
                    order.pickupAddress = pickupAddr;
                    console.log(`  ✓ Pickup: ${pickupAddr}`);
                    updated = true;
                }
                
                // Geocode delivery nếu chưa có
                if (order.delivery && !order.deliveryAddress) {
                    console.log(`  Geocoding delivery [${order.delivery}]...`);
                    const deliveryAddr = await geocodingService.reverseGeocode(order.delivery);
                    order.deliveryAddress = deliveryAddr;
                    console.log(`  ✓ Delivery: ${deliveryAddr}`);
                    updated = true;
                }
                
                if (updated) {
                    await order.save();
                    successCount++;
                    console.log(`  ✅ Order #${order.id} saved\n`);
                }
                
            } catch (error) {
                console.error(`  ❌ Error processing Order #${order.id}:`, error.message);
                errorCount++;
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Geocoding completed!');
        console.log(`Success: ${successCount} orders`);
        console.log(`Errors: ${errorCount} orders`);
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

// Run if called directly
if (require.main === module) {
    connectDB().then(() => {
        geocodeExistingOrders();
    });
}

module.exports = { geocodeExistingOrders };
