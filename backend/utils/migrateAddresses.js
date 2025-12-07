/**
 * Script migration: Convert tọa độ thành địa chỉ cho tất cả records trong database
 * 
 * Chạy: node backend/utils/migrateAddresses.js
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const geocodingService = require('./geocodingService');

// Kết nối MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/delivery_system';

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

/**
 * Migrate addresses cho Orders
 */
async function migrateOrderAddresses() {
    console.log('\n📦 Migrating Order addresses...');
    
    try {
        const orders = await Order.find({});
        console.log(`Found ${orders.length} orders to process`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const order of orders) {
            try {
                let updated = false;
                
                // Convert pickup address
                if (order.pickup && order.pickup.length === 2 && !order.pickupAddress) {
                    console.log(`  Converting pickup for Order #${order.id}...`);
                    const pickupAddr = await geocodingService.reverseGeocode(order.pickup);
                    order.pickupAddress = pickupAddr;
                    updated = true;
                    console.log(`    ✓ Pickup: ${pickupAddr}`);
                }
                
                // Convert delivery address
                if (order.delivery && order.delivery.length === 2 && !order.deliveryAddress) {
                    console.log(`  Converting delivery for Order #${order.id}...`);
                    const deliveryAddr = await geocodingService.reverseGeocode(order.delivery);
                    order.deliveryAddress = deliveryAddr;
                    updated = true;
                    console.log(`    ✓ Delivery: ${deliveryAddr}`);
                }
                
                if (updated) {
                    await order.save();
                    successCount++;
                }
                
            } catch (error) {
                console.error(`  ✗ Error processing Order #${order.id}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`\n✅ Orders migration complete: ${successCount} success, ${errorCount} errors`);
        
    } catch (error) {
        console.error('❌ Error in migrateOrderAddresses:', error);
    }
}

/**
 * Migrate addresses cho Vehicles
 */
async function migrateVehicleAddresses() {
    console.log('\n🚗 Migrating Vehicle addresses...');
    
    try {
        const vehicles = await Vehicle.find({});
        console.log(`Found ${vehicles.length} vehicles to process`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const vehicle of vehicles) {
            try {
                if (vehicle.position && vehicle.position.length === 2 && !vehicle.currentAddress) {
                    console.log(`  Converting position for Vehicle #${vehicle.id}...`);
                    const address = await geocodingService.reverseGeocode(vehicle.position);
                    vehicle.currentAddress = address;
                    await vehicle.save();
                    console.log(`    ✓ Address: ${address}`);
                    successCount++;
                }
            } catch (error) {
                console.error(`  ✗ Error processing Vehicle #${vehicle.id}:`, error.message);
                errorCount++;
            }
        }
        
        console.log(`\n✅ Vehicles migration complete: ${successCount} success, ${errorCount} errors`);
        
    } catch (error) {
        console.error('❌ Error in migrateVehicleAddresses:', error);
    }
}

/**
 * Main migration function
 */
async function runMigration() {
    console.log('🚀 Starting address migration...\n');
    console.log('⚠️  This will take some time due to API rate limiting (1 request/second)');
    console.log('⚠️  Please do NOT stop the script until completion\n');
    
    const startTime = Date.now();
    
    try {
        await connectDB();
        
        // Migrate orders
        await migrateOrderAddresses();
        
        // Migrate vehicles
        await migrateVehicleAddresses();
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`\n✅ Migration completed in ${duration} seconds`);
        console.log('📊 Cache stats:', geocodingService.getCacheStats());
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

// Chạy migration nếu được gọi trực tiếp
if (require.main === module) {
    runMigration();
}

module.exports = {
    migrateOrderAddresses,
    migrateVehicleAddresses,
    runMigration
};
