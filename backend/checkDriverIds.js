const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');

async function checkDriverIds() {
    try {
        await mongoose.connect('mongodb://localhost:27017/qldxgh');
        console.log('✅ Connected to MongoDB\n');

        // Get sample orders with driverId
        const orders = await Order.find({ 
            driverId: { $exists: true, $ne: null } 
        }).limit(5).lean();

        console.log('📦 Sample orders with driverId:');
        orders.forEach(o => {
            console.log(`   Order #${o.id}: driverId=${o.driverId}, status=${o.status}`);
        });

        // Get all drivers
        const drivers = await User.find({ role: 'driver' }).sort({ id: 1 }).lean();
        
        console.log('\n👨‍✈️ All Drivers:');
        drivers.forEach(d => {
            console.log(`   Driver ID=${d.id}, Name=${d.name}, VehicleID=${d.vehicleId || 'none'}`);
        });

        console.log('\n🔍 Analysis:');
        console.log('   - If order.driverId matches driver.id (100+), it\'s using driver ID ✅');
        console.log('   - If order.driverId matches driver.vehicleId (1-11), it\'s using vehicle ID ❌');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

checkDriverIds();
