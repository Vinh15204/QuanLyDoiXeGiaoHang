const { spawn } = require('child_process');
const path = require('path');

/**
 * Call OR-Tools Python optimizer with vehicle routing constraints
 * @param {Array} vehicles - Array of vehicle objects with {id, position, maxLoad, capacity}
 * @param {Array} orders - Array of order objects with {id, pickup, delivery, weight}
 * @param {Object} manualConstraints - Manual order-to-vehicle assignments {orderId: vehicleId}
 * @returns {Promise} - Optimization result with assignments and routes
 */
async function optimizeWithORTools(vehicles, orders, manualConstraints = {}) {
    return new Promise((resolve, reject) => {
        console.log('🚀 Starting OR-Tools optimization...');
        console.log(`   Vehicles: ${vehicles.length}, Orders: ${orders.length}`);
        console.log(`   Manual constraints: ${Object.keys(manualConstraints).length}`);

        const pythonScript = path.join(__dirname, 'orToolsOptimizer.py');
        console.log('   Python script path:', pythonScript);
        
        // Prepare input data
        const inputData = {
            vehicles: vehicles.map(v => ({
                id: v.id,
                position: v.position,
                maxLoad: v.maxLoad || v.capacity || 1000
            })),
            orders: orders.map(o => ({
                id: o.id,
                pickup: o.pickup,
                delivery: o.delivery,
                weight: o.weight || 0
            })),
            manualConstraints: manualConstraints
        };

        console.log('   Spawning Python process...');
        // Spawn Python process
        const pythonProcess = spawn('python', [pythonScript]);
        console.log('   Python process spawned, PID:', pythonProcess.pid);
        
        let outputData = '';
        let errorData = '';

        // Send input via stdin
        pythonProcess.stdin.write(JSON.stringify(inputData));
        pythonProcess.stdin.end();

        // Collect stdout
        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        // Collect stderr (for debug logs)
        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            console.log('🐍 Python:', data.toString().trim());
        });

        // Handle process completion
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('❌ Python process failed with code:', code);
                console.error('Error output:', errorData);
                reject(new Error(`Python optimization failed: ${errorData}`));
                return;
            }

            try {
                const result = JSON.parse(outputData);
                console.log('✅ OR-Tools optimization completed');
                console.log('   Result:', {
                    vehicles: Object.keys(result.assignments || {}).length,
                    totalOrders: Object.values(result.assignments || {}).flat().length,
                    routes: (result.routes || []).length
                });
                resolve(result);
            } catch (error) {
                console.error('❌ Failed to parse Python output:', error);
                console.error('Raw output:', outputData);
                reject(new Error(`Failed to parse optimization result: ${error.message}`));
            }
        });

        // Handle process errors
        pythonProcess.on('error', (error) => {
            console.error('❌ Failed to start Python process:', error);
            reject(new Error(`Failed to start Python: ${error.message}`));
        });
    });
}

/**
 * Convert OR-Tools result to route details format
 * @param {Object} orToolsResult - Result from OR-Tools with assignments and routes
 * @param {Array} vehicles - Original vehicle array
 * @param {Array} orders - Original order array
 * @returns {Object} - Route details in backend format
 */
function convertORToolsResult(orToolsResult, vehicles, orders) {
    const routeDetails = {};
    const assignments = {};

    console.log('🔄 Converting OR-Tools result...');
    console.log('   Vehicle summaries:', orToolsResult.vehicle_summaries?.length || 0);
    console.log('   Assignments keys:', Object.keys(orToolsResult.assignments || {}));

    // Process each vehicle's route
    vehicles.forEach(vehicle => {
        const vehicleId = vehicle.id;
        const vehicleSummary = orToolsResult.vehicle_summaries?.find(vs => vs.vehicle_id === vehicleId);
        
        if (!vehicleSummary || !vehicleSummary.route_detail) {
            console.log(`   ⚠️ Vehicle ${vehicleId}: No summary or route detail found`);
            routeDetails[vehicleId] = [];
            assignments[vehicleId] = [];
            return;
        }

        console.log(`   ✅ Vehicle ${vehicleId}: Processing ${vehicleSummary.route_detail.length} stops`);

        // Convert route_detail to stops format
        const stops = vehicleSummary.route_detail.map(stop => {
            const order = orders.find(o => o.id === stop.order_id);
            return {
                type: stop.type,
                orderId: stop.order_id,
                point: stop.point,
                weight: order ? order.weight : 0,
                address: stop.type === 'pickup' ? order?.pickupAddress : 
                        stop.type === 'delivery' ? order?.deliveryAddress : 
                        vehicle.address
            };
        });

        routeDetails[vehicleId] = stops;
        
        // Get assigned order IDs - try both string and number keys
        const assignedOrderIds = orToolsResult.assignments[vehicleId.toString()] || 
                                 orToolsResult.assignments[vehicleId] || 
                                 [];
        assignments[vehicleId] = orders.filter(o => assignedOrderIds.includes(o.id));
        
        console.log(`   📦 Vehicle ${vehicleId}: Assigned ${assignments[vehicleId].length} orders`);
    });

    console.log('✅ Conversion complete');
    console.log('   RouteDetails keys:', Object.keys(routeDetails));
    console.log('   Assignments keys:', Object.keys(assignments));

    return {
        routeDetails,
        assignments,
        stats: {
            totalDistance: orToolsResult.vehicle_summaries?.reduce((sum, vs) => sum + vs.distance_km, 0) || 0,
            totalTime: orToolsResult.vehicle_summaries?.reduce((sum, vs) => sum + vs.total_time_min, 0) || 0,
            makespan: Math.max(...(orToolsResult.vehicle_summaries?.map(vs => vs.total_time_min) || [0])),
            vehicleSummaries: orToolsResult.vehicle_summaries || [],
            vehicleLoads: Object.fromEntries(
                vehicles.map(v => [
                    v.id, 
                    assignments[v.id]?.reduce((sum, o) => sum + (o.weight || 0), 0) || 0
                ])
            )
        }
    };
}

module.exports = {
    optimizeWithORTools,
    convertORToolsResult
};
