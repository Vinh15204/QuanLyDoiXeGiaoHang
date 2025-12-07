const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

const MONGODB_URI = 'mongodb://localhost:27017/qldxgh';

async function checkVehicleAddresses() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully\n');

        const totalVehicles = await Vehicle.countDocuments();
        const vehiclesWithAddress = await Vehicle.countDocuments({ 
            currentAddress: { $exists: true, $ne: null, $ne: '' } 
        });
        const vehiclesWithoutAddress = totalVehicles - vehiclesWithAddress;

        console.log('=== Vehicle Address Status ===');
        console.log(`Total vehicles: ${totalVehicles}`);
        console.log(`With addresses: ${vehiclesWithAddress} (${((vehiclesWithAddress/totalVehicles)*100).toFixed(1)}%)`);
        console.log(`Without addresses: ${vehiclesWithoutAddress} (${((vehiclesWithoutAddress/totalVehicles)*100).toFixed(1)}%)`);

        if (vehiclesWithoutAddress > 0) {
            console.log('\n=== Vehicles Without Addresses ===');
            const vehiclesNoAddr = await Vehicle.find({ 
                $or: [
                    { currentAddress: { $exists: false } },
                    { currentAddress: null },
                    { currentAddress: '' }
                ]
            }).limit(10);

            vehiclesNoAddr.forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle.licensePlate || `Vehicle #${vehicle.id}`}`);
                
                let lat, lng;
                const coords = vehicle.location || vehicle.position;
                if (coords) {
                    if (Array.isArray(coords)) {
                        [lat, lng] = coords;
                    } else if (coords.lat && coords.lng) {
                        lat = coords.lat;
                        lng = coords.lng;
                    }
                }
                
                if (lat && lng) {
                    console.log(`   Location: (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
                } else {
                    console.log(`   Location: Not set`);
                }
            });

            if (vehiclesWithoutAddress > 10) {
                console.log(`   ... and ${vehiclesWithoutAddress - 10} more`);
            }
        }

        if (vehiclesWithAddress > 0) {
            console.log('\n=== Sample Vehicles With Addresses ===');
            const vehiclesWithAddr = await Vehicle.find({ 
                currentAddress: { $exists: true, $ne: null, $ne: '' } 
            }).limit(5);

            vehiclesWithAddr.forEach((vehicle, index) => {
                console.log(`${index + 1}. ${vehicle.licensePlate || `Vehicle #${vehicle.id}`}`);
                console.log(`   Address: ${vehicle.currentAddress}`);
                
                let lat, lng;
                const coords = vehicle.location || vehicle.position;
                if (coords) {
                    if (Array.isArray(coords)) {
                        [lat, lng] = coords;
                    } else if (coords.lat && coords.lng) {
                        lat = coords.lat;
                        lng = coords.lng;
                    }
                }
                
                if (lat && lng) {
                    console.log(`   Location: (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
                }
            });
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

checkVehicleAddresses();
