const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const geocodingService = require('./geocodingService');

const MONGODB_URI = 'mongodb://localhost:27017/qldxgh';

async function geocodeExistingVehicles() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully');

        // Lấy tất cả vehicles có location/position nhưng chưa có currentAddress hoặc là "Địa chỉ không xác định"
        const vehicles = await Vehicle.find({
            $and: [
                {
                    $or: [
                        { location: { $exists: true } },
                        { position: { $exists: true } }
                    ]
                },
                {
                    $or: [
                        { currentAddress: { $exists: false } },
                        { currentAddress: null },
                        { currentAddress: '' },
                        { currentAddress: 'Địa chỉ không xác định' }
                    ]
                }
            ]
        });

        console.log(`Found ${vehicles.length} vehicles without addresses`);

        if (vehicles.length === 0) {
            console.log('No vehicles to geocode. All vehicles already have addresses!');
            await mongoose.disconnect();
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < vehicles.length; i++) {
            const vehicle = vehicles[i];
            let lat, lng;
            
            // Hỗ trợ nhiều format: array [lat, lng], object {lat, lng}, hoặc {latitude, longitude}
            if (vehicle.location) {
                if (Array.isArray(vehicle.location)) {
                    [lat, lng] = vehicle.location;
                } else if (vehicle.location.lat && vehicle.location.lng) {
                    lat = vehicle.location.lat;
                    lng = vehicle.location.lng;
                } else if (vehicle.location.latitude && vehicle.location.longitude) {
                    lat = vehicle.location.latitude;
                    lng = vehicle.location.longitude;
                }
            } else if (vehicle.position) {
                if (Array.isArray(vehicle.position)) {
                    [lat, lng] = vehicle.position;
                } else if (vehicle.position.lat && vehicle.position.lng) {
                    lat = vehicle.position.lat;
                    lng = vehicle.position.lng;
                } else if (vehicle.position.latitude && vehicle.position.longitude) {
                    lat = vehicle.position.latitude;
                    lng = vehicle.position.longitude;
                }
            }
            
            if (!lat || !lng) {
                console.log(`Vehicle ${vehicle.licensePlate || vehicle.id} - No valid coordinates`);
                failCount++;
                continue;
            }

            try {
                console.log(`[${i + 1}/${vehicles.length}] Geocoding vehicle ${vehicle.licensePlate || vehicle.id}...`);
                
                const address = await geocodingService.reverseGeocode(lat, lng);

                if (address) {
                    vehicle.currentAddress = address;
                    await vehicle.save();
                    console.log(`  ✓ Success: ${address.substring(0, 60)}...`);
                    successCount++;
                } else {
                    console.log(`  ✗ Failed: No address found`);
                    failCount++;
                }

                // Delay để tôn trọng rate limit của Nominatim (1 req/sec)
                if (i < vehicles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1100));
                }
            } catch (error) {
                console.error(`  ✗ Error geocoding vehicle ${vehicle.licensePlate || vehicle.id}:`, error.message);
                failCount++;
            }
        }

        console.log('\n=== Geocoding Complete ===');
        console.log(`Total vehicles: ${vehicles.length}`);
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log(`Success rate: ${((successCount / vehicles.length) * 100).toFixed(1)}%`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error in geocoding process:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Chạy script
geocodeExistingVehicles();
