// Port từ OptimizeController.cs
const axios = require('axios');
const Route = require('../models/Route');

// Hàm gọi OSRM để lấy đường đi thực tế giữa các điểm
async function getOsrmRoute(points) {
    try {
        if (!Array.isArray(points) || points.length < 2) {
            console.log('Invalid points array:', points);
            return { route: points, distance: 0, duration: 0 };
        }

        // Verify points have valid coordinates
        points = points.filter(p => Array.isArray(p) && p.length === 2);
        if (points.length < 2) {
            console.log('Not enough valid points after filtering:', points);
            return { route: points, distance: 0, duration: 0 };
        }

        const coordinates = points.map(p => {
            if (!Array.isArray(p) || p.length !== 2) {
                throw new Error(`Invalid coordinates: ${JSON.stringify(p)}`);
            }
            return `${p[1]},${p[0]}`;
        }).join(';');

        console.log('Calling OSRM with coordinates:', coordinates);
        const url = `http://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
        const response = await axios.get(url);
        
        if (response.data.code !== 'Ok') {
            console.error('OSRM response not OK:', response.data);
            throw new Error('OSRM request failed');
        }

        const route = response.data.routes[0];
        return {
            route: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
            distance: route.distance / 1000, // Convert to km
            duration: route.duration / 60 // Convert to minutes
        };
    } catch (error) {
        console.error('Error getting OSRM route:', error);
        // Fallback: calculate straight-line distance
        const distance = calculateDistance(points);
        const duration = (distance / 30) * 60; // Assume 30 km/h average speed
        return {
            route: points,
            distance,
            duration
        };
    }
}

// Tính khoảng cách giữa hai điểm (Haversine formula)
function haversineDistance(point1, point2) {
    if (!Array.isArray(point1) || !Array.isArray(point2) || 
        point1.length !== 2 || point2.length !== 2) {
        console.error('Invalid points:', { point1, point2 });
        return 0;
    }

    const R = 6371; // Earth's radius in km
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Tính tổng khoảng cách của một route
function calculateDistance(points) {
    if (!Array.isArray(points)) {
        console.error('Points is not an array:', points);
        return 0;
    }

    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        if (points[i] && points[i + 1]) {
            totalDistance += haversineDistance(points[i], points[i + 1]);
        }
    }
    return totalDistance;
}

// Ước tính thời gian dựa trên khoảng cách (giả sử tốc độ trung bình 30km/h)
function calculateDuration(points) {
    const distance = calculateDistance(points);
    return (distance / 30) * 60; // Convert to minutes
}

// Tạo chi tiết lộ trình dễ đọc
function generateRouteDetails(vehicle, orders, routeDetails) {
    console.log('Generating route details for:', {
        vehicleId: vehicle?.id,
        numOrders: orders?.length,
        hasRouteDetails: Boolean(routeDetails)
    });

    // Kiểm tra đầu vào
    if (!vehicle || !vehicle.position) {
        console.error('Invalid vehicle data:', vehicle);
        return {
            details: ['Invalid vehicle data'],
            stats: {
                distance: 0,
                numStops: 0,
                waitingTime: 0,
                travelTime: 0,
                totalTime: 0
            }
        };
    }

    if (!Array.isArray(orders)) {
        console.error('Invalid orders array:', orders);
        return {
            details: ['Invalid orders data'],
            stats: {
                distance: 0,
                numStops: 0,
                waitingTime: 0,
                travelTime: 0,
                totalTime: 0
            }
        };
    }

    const details = [];
    let totalDistance = 0;
    let numStops = 0;
    let currentPos = vehicle.position;

    details.push(`[Xuất phát] Xe #${vehicle.id}`);

    // Nếu có route details, sử dụng nó để hiển thị theo thứ tự tối ưu
    if (routeDetails && Array.isArray(routeDetails)) {
        routeDetails.forEach((detail, index) => {
            const distance = haversineDistance(currentPos, detail.point);
            totalDistance += distance;
            
            details.push(`↓ ${distance.toFixed(1)}km`);
            
            if (detail.type === 'pickup') {
                details.push(`[Nhận] Đơn #${detail.orderId} (${detail.weight}kg)`);
                numStops++;
            } else {
                details.push(`[Giao] Đơn #${detail.orderId}`);
                numStops++;
            }
            
            currentPos = detail.point;
        });
        
        // Thêm quãng đường về depot
        const returnDistance = haversineDistance(currentPos, vehicle.position);
        totalDistance += returnDistance;
        
        details.push(`↓ ${returnDistance.toFixed(1)}km`);
        details.push('[Kết thúc] Trở về depot');
    }

    // Tính các thống kê
    const travelTime = (totalDistance / 40) * 60; // 30 km/h
    const waitingTime = numStops * 6; // 10 phút mỗi điểm dừng
    const totalTime = travelTime + waitingTime;

    // Thêm thông tin thống kê
    details.push('');
    details.push(`Tổng quãng đường: ${totalDistance.toFixed(1)}km`);
    details.push(`Tổng điểm dừng: ${numStops} điểm`);
    details.push(`Thời gian dừng đỗ: ${waitingTime} phút (${numStops} điểm × 10 phút)`);
    details.push(`Thời gian di chuyển: ${travelTime.toFixed(1)} phút`);
    details.push(`Tổng thời gian: ${totalTime.toFixed(1)} phút`);

    // Trả về kết quả với đầy đủ thông tin
    const stats = {
        distance: totalDistance,
        numStops,
        waitingTime,
        travelTime,
        totalTime
    };

    console.log('Generated route stats:', stats);

    return {
        details,
        stats
    };
}

// Tính tổng thời gian cho một route
function calculateTotalDuration(route, numStops, vehicle) {
    if (!Array.isArray(route) || route.length < 2 || !vehicle || !vehicle.position) {
        return 0;
    }

    // Đảm bảo tính cả quãng đường quay về depot
    const fullRoute = [
        ...route,
        vehicle.position // Thêm điểm quay về depot
    ];

    // Tính tổng khoảng cách
    let totalDistance = 0;
    for (let i = 0; i < fullRoute.length - 1; i++) {
        totalDistance += haversineDistance(fullRoute[i], fullRoute[i + 1]);
    }

    // Thời gian di chuyển (30km/h)
    const travelTime = (totalDistance / 30) * 60;

    // Thời gian dừng (10 phút mỗi điểm)
    const waitingTime = numStops * 10;

    return {
        totalTime: travelTime + waitingTime,
        totalDistance: totalDistance,
        travelTime: travelTime,
        waitingTime: waitingTime
    };
}

// Hàm tính makespan cho một phương án phân công
function calculateMakespan(vehicleRoutes, vehicles) {
    let makespan = 0;
    for (const [vehicleId, route] of Object.entries(vehicleRoutes)) {
        const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
        if (!vehicle || !route || route.length === 0) continue;

        const routeDetails = generateRouteDetails(vehicle, [], route);
        makespan = Math.max(makespan, routeDetails.stats.totalTime);
    }
    return makespan;
}

// Hàm brute-force cho số lượng nhỏ
function* generateAllAssignments(orders, vehicleIds) {
    const n = orders.length;
    const k = vehicleIds.length;
    const indices = new Array(n).fill(0);
    
    while (true) {
        // Generate current assignment
        const dict = {};
        vehicleIds.forEach(id => dict[id] = []);
        
        orders.forEach((order, i) => {
            const vehicleId = vehicleIds[indices[i]];
            dict[vehicleId].push(order);
        });
        
        yield dict;
        
        // Generate next combination
        let pos = n - 1;
        while (pos >= 0 && indices[pos] === k - 1) {
            indices[pos] = 0;
            pos--;
        }
        if (pos < 0) break;
        indices[pos]++;
    }
}

// Hàm chính để phân công đơn hàng cho xe
async function assignOrders(vehicles, orders) {
    // Nếu số lượng lớn, dùng heuristic
    if (orders.length > 12 || vehicles.length > 6) {
        return heuristicAssignOrders(vehicles, orders);
    }

    const vehicleIds = vehicles.map(v => v.id);
    let bestAssignment = null;
    let minMaxDuration = Infinity;

    // Thử tất cả các cách phân công có thể
    for (const assignment of generateAllAssignments(orders, vehicleIds)) {
        // Kiểm tra giới hạn tải trọng
        let isValid = true;
        for (const [vehicleId, vehicleOrders] of Object.entries(assignment)) {
            const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
            const totalWeight = vehicleOrders.reduce((sum, order) => sum + order.weight, 0);
            if (totalWeight > vehicle.maxLoad) {
                isValid = false;
                break;
            }
        }
        if (!isValid) continue;

        // Tính thời gian cho mỗi xe, bao gồm cả thời gian chờ đợi
        let maxDuration = 0;
        for (const [vehicleId, vehicleOrders] of Object.entries(assignment)) {
            if (vehicleOrders.length === 0) continue;
            
            const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
            const route = buildRoute(vehicle, vehicleOrders);
            const duration = calculateTotalDuration(route, vehicleOrders);
            maxDuration = Math.max(maxDuration, duration);
        }

        // Cập nhật nếu tìm thấy giải pháp tốt hơn
        if (maxDuration < minMaxDuration) {
            minMaxDuration = maxDuration;
            bestAssignment = assignment;
        }
    }

    return bestAssignment || heuristicAssignOrders(vehicles, orders);
}

// Hàm tìm điểm tiếp theo tối ưu nhất
function findBestNextStop(currentPos, stops, currentLoad, maxLoad) {
    let bestDist = Infinity;
    let bestIdx = -1;
    let bestStop = null;

    for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        // Bỏ qua nếu là điểm giao của đơn chưa được nhận
        if (stop.type === 'delivery' && !stop.picked) continue;
        // Bỏ qua nếu nhận thêm sẽ quá tải
        if (stop.type === 'pickup' && currentLoad + stop.weight > maxLoad) continue;

        const dist = haversineDistance(currentPos, stop.point);
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
            bestStop = stop;
        }
    }

    return { bestIdx, bestStop, distance: bestDist };
}

// Thuật toán tham lam cho số lượng lớn
function heuristicAssignOrders(vehicles, orders) {
    // Validate input
    if (!Array.isArray(vehicles) || !Array.isArray(orders)) {
        console.error('Invalid input:', { vehicles, orders });
        throw new Error('Invalid input data');
    }

    // Log input data
    console.log('Starting assignment with:', {
        numVehicles: vehicles.length,
        vehicleIds: vehicles.map(v => v.id),
        numOrders: orders.length,
        orderIds: orders.map(o => o.id),
        totalOrderWeight: orders.reduce((sum, o) => sum + o.weight, 0),
        totalVehicleCapacity: vehicles.reduce((sum, v) => sum + v.maxLoad, 0)
    });

    const vehicleResults = {};
    const routeDetails = {};
    const vehicleLoads = {};
    const vehicleTimes = {};

    // Khởi tạo cho mỗi xe
    vehicles.forEach(v => {
        vehicleResults[v.id] = [];
        routeDetails[v.id] = [];
        vehicleLoads[v.id] = 0;
        vehicleTimes[v.id] = 0;
    });

    // Sắp xếp đơn hàng theo trọng lượng giảm dần
    const sortedOrders = [...orders].sort((a, b) => b.weight - a.weight);

    // Phân bổ từng đơn
    for (const order of sortedOrders) {
        let bestVehicleId = null;
        let bestMakespan = Infinity;
        let bestTime = Infinity;
        let assignmentAttempts = 0;

        // Log order details
        console.log(`\nProcessing order #${order.id}:`, {
            weight: order.weight,
            pickup: order.pickup,
            delivery: order.delivery
        });

        // Tìm xe tốt nhất cho đơn này (xe nào cho makespan nhỏ nhất)
        for (const vehicle of vehicles) {
            assignmentAttempts++;
            
            // Log vehicle status
            console.log(`Trying vehicle #${vehicle.id}:`, {
                currentLoad: vehicleLoads[vehicle.id],
                maxLoad: vehicle.maxLoad,
                remainingCapacity: vehicle.maxLoad - vehicleLoads[vehicle.id],
                currentTime: vehicleTimes[vehicle.id]
            });

            // Kiểm tra tải trọng
            if (vehicleLoads[vehicle.id] + order.weight > vehicle.maxLoad) {
                console.log(`Vehicle #${vehicle.id} overweight, skipping`);
                continue;
            }

            // Tạo route mới thử nghiệm
            const testRouteDetails = [...(routeDetails[vehicle.id] || [])];
            let currentPos = testRouteDetails.length > 0 
                ? testRouteDetails[testRouteDetails.length - 1].point 
                : vehicle.position;

            // Thêm điểm nhận và giao vào route thử nghiệm với tính toán khoảng cách chính xác
            testRouteDetails.push({
                type: 'pickup',
                orderId: order.id,
                point: order.pickup,
                weight: order.weight
            });

            testRouteDetails.push({
                type: 'delivery',
                orderId: order.id,
                point: order.delivery,
                weight: order.weight
            });

            // Tính toàn bộ route details bao gồm cả quãng đường về depot
            const testRouteStats = generateRouteDetails(vehicle, [], testRouteDetails).stats;
            const newTime = testRouteStats.totalTime;

            // Cập nhật makespan
            const currentTimes = { ...vehicleTimes };
            currentTimes[vehicle.id] = newTime;
            const newMakespan = Math.max(...Object.values(currentTimes));

            // Log assignment attempt
            console.log(`Assignment attempt for vehicle #${vehicle.id}:`, {
                newTime,
                newMakespan,
                isBetter: newMakespan < bestMakespan
            });

            if (newMakespan < bestMakespan || (newMakespan === bestMakespan && newTime < bestTime)) {
                bestMakespan = newMakespan;
                bestTime = newTime;
                bestVehicleId = vehicle.id;
            }
        }

        // Nếu tìm được xe phù hợp, cập nhật dữ liệu
        if (bestVehicleId !== null) {
            const vehicle = vehicles.find(v => v.id === bestVehicleId);
            vehicleResults[bestVehicleId].push(order);
            
            // Cập nhật route details và tính toán lại thống kê
            routeDetails[bestVehicleId].push({
                type: 'pickup',
                orderId: order.id,
                point: order.pickup,
                weight: order.weight
            });

            routeDetails[bestVehicleId].push({
                type: 'delivery',
                orderId: order.id,
                point: order.delivery,
                weight: order.weight
            });

            // Cập nhật tải trọng và thời gian từ route details
            const routeStats = generateRouteDetails(vehicle, [], routeDetails[bestVehicleId]).stats;
            vehicleLoads[bestVehicleId] = order.weight;
            vehicleTimes[bestVehicleId] = routeStats.totalTime;

            console.log(`✔ Assigned order #${order.id} to vehicle #${bestVehicleId}:`, {
                currentLoad: vehicleLoads[bestVehicleId],
                currentTime: vehicleTimes[bestVehicleId],
                distance: routeStats.distance,
                numStops: routeStats.numStops
            });
        } else {
            console.warn(`❌ Could not assign order #${order.id}:`, {
                weight: order.weight,
                attempts: assignmentAttempts,
                remainingCapacities: vehicles.map(v => ({
                    vehicleId: v.id,
                    remaining: v.maxLoad - vehicleLoads[v.id]
                }))
            });
        }
    }

    // Log kết quả phân công
    console.log('\nFinal assignment:');
    Object.entries(vehicleResults).forEach(([vehicleId, vehicleOrders]) => {
        const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
        const finalStats = generateRouteDetails(vehicle, [], routeDetails[vehicleId]).stats;
        console.log(`Vehicle #${vehicleId}:`, {
            numOrders: vehicleOrders.length,
            orderIds: vehicleOrders.map(o => o.id),
            totalWeight: vehicleLoads[vehicleId],
            totalTime: finalStats.totalTime,
            totalDistance: finalStats.distance,
            numStops: finalStats.numStops,
            route: routeDetails[vehicleId].map(stop => `${stop.type}:${stop.orderId}`)
        });
    });

    const unassignedOrders = orders.filter(order => 
        !Object.values(vehicleResults).flat().some(assigned => assigned.id === order.id)
    );

    if (unassignedOrders.length > 0) {
        console.warn('\nUnassigned orders:', {
            count: unassignedOrders.length,
            orderIds: unassignedOrders.map(o => o.id),
            weights: unassignedOrders.map(o => o.weight)
        });
    }

    return {
        assignments: vehicleResults,
        routeDetails: routeDetails,
        stats: {
            vehicleLoads,
            vehicleTimes,
            makespan: Math.max(...Object.values(vehicleTimes)),
            assignedOrders: orders.length - unassignedOrders.length,
            totalOrders: orders.length,
            unassignedOrders: unassignedOrders.length
        }
    };
}

// Hàm xây dựng route từ các điểm dừng
function buildCompleteRoute(vehicle, vehicleOrders, routeDetails) {
    if (!vehicle || !vehicle.position) {
        console.error('Invalid vehicle data:', vehicle);
        return [];
    }

    let route = [];

    // Nếu có route details, sử dụng nó
    if (routeDetails && Array.isArray(routeDetails)) {
        route = [vehicle.position, ...routeDetails.map(detail => detail.point)];
    } else {
        // Fallback: Xây dựng route theo thứ tự gốc
        if (!Array.isArray(vehicleOrders)) {
            console.error('Invalid orders array:', vehicleOrders);
            return [vehicle.position];
        }

        route = [vehicle.position];
        vehicleOrders.forEach(order => {
            if (order.pickup) route.push(order.pickup);
            if (order.delivery) route.push(order.delivery);
        });
    }

    // Thêm điểm quay về depot vào cuối route
    route.push(vehicle.position);

    return route;
}

// Hàm tối ưu hóa lộ trình cho nhiều xe và đơn hàng
async function optimizeRoutes(vehicles, orders) {
    console.log("Input for optimization:", {
        vehicles: vehicles.length,
        orders: orders.length
    });

    try {
        // Sort vehicles by capacity
        const sortedVehicles = [...vehicles].sort((a, b) => b.capacity - a.capacity);
        const unassignedOrders = [...orders];
        const routes = [];

        // Hủy các route cũ
        await Route.deleteMany({ status: 'active' });

        for (const vehicle of sortedVehicles) {
            if (unassignedOrders.length === 0) break;

            const vehicleOrders = [];
            let remainingCapacity = vehicle.capacity;

            // Assign orders that fit in this vehicle
            for (let i = unassignedOrders.length - 1; i >= 0; i--) {
                const order = unassignedOrders[i];
                if (order.weight <= remainingCapacity) {
                    vehicleOrders.push(order);
                    remainingCapacity -= order.weight;
                    unassignedOrders.splice(i, 1);
                }
            }

            if (vehicleOrders.length > 0) {
                // Create route for this vehicle
                const route = await createRoute(vehicle, vehicleOrders);
                
                // Save to MongoDB
                const routeDoc = new Route(route);
                await routeDoc.save();
                
                routes.push(route);
            }
        }

        console.log("Optimization results:", routes.map(route => ({
            vehicleId: route.vehicleId,
            ordersCount: route.assignedOrders.length,
            stopsCount: route.stops.length,
            distance: route.distance,
            duration: route.duration
        })));

        return routes;
    } catch (error) {
        console.error("Error in optimizeRoutes:", error);
        throw error;
    }
}

// Thêm hàm lấy route hiện tại của xe
async function getCurrentRoute(vehicleId) {
    try {
        const route = await Route.findOne({ 
            vehicleId: vehicleId, 
            status: 'active' 
        });
        
        if (!route) {
            console.log(`No active route found for vehicle ${vehicleId}`);
            return null;
        }

        console.log(`Found route for vehicle ${vehicleId}:`, {
            stopsCount: route.stops.length,
            distance: route.distance,
            duration: route.duration
        });

        return route;
    } catch (error) {
        console.error(`Error getting route for vehicle ${vehicleId}:`, error);
        return null;
    }
}

module.exports = {
    assignOrders,
    getOsrmRoute,
    buildRoute: buildCompleteRoute,
    generateRouteDetails,
    calculateTotalDuration,
    haversineDistance,
    optimizeRoutes,
    getCurrentRoute
};
