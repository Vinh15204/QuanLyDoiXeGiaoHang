import sys
import json
import numpy as np
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

input_data = json.load(sys.stdin)
vehicles = input_data['vehicles']
orders = input_data['orders']
manual_constraints = input_data.get('manualConstraints', {})  # {orderId: vehicleId}

num_vehicles = len(vehicles)
num_orders = len(orders)

# 1. Handle manual constraints first
order_assignments = {v['id']: [] for v in vehicles}
assigned = set()

# Assign manually constrained orders
for order_id_str, vehicle_id in manual_constraints.items():
    order_id = int(order_id_str)
    order = next((o for o in orders if o['id'] == order_id), None)
    if order:
        order_assignments[vehicle_id].append(order)
        assigned.add(orders.index(order))
        print(f"Manual constraint: Order {order_id} assigned to Vehicle {vehicle_id}", file=sys.stderr)

# Get remaining orders to assign
remaining_orders = [o for oi, o in enumerate(orders) if oi not in assigned]
num_remaining = len(remaining_orders)

if num_remaining > 0:
    # 2. Chia đều đơn hàng còn lại cho các xe dựa trên tổ hợp đường chim bay tối ưu nhất
    # Tính tổng khoảng cách (pickup + delivery) từ mỗi đơn đến từng xe
    cost_matrix = np.zeros((num_vehicles, num_remaining))
    for vi, v in enumerate(vehicles):
        for oi, o in enumerate(remaining_orders):
            pickup_dist = np.linalg.norm(np.array(v['position']) - np.array(o['pickup']))
            delivery_dist = np.linalg.norm(np.array(v['position']) - np.array(o['delivery']))
            cost_matrix[vi, oi] = pickup_dist + delivery_dist

    # Calculate available capacity for each vehicle
    vehicle_available_slots = {}
    total_manual_assigned = len([o for orders_list in order_assignments.values() for o in orders_list])
    remaining_slots = num_orders - total_manual_assigned
    base_slots_per_vehicle = remaining_slots // num_vehicles
    
    for vi, v in enumerate(vehicles):
        current_load = len(order_assignments[v['id']])
        vehicle_available_slots[vi] = base_slots_per_vehicle
        
    # Greedy assignment: gán từng đơn cho xe gần nhất còn slot
    order_indices = list(range(num_remaining))
    order_indices.sort(key=lambda oi: cost_matrix[:, oi].min())
    
    for oi in order_indices:
        best_vi = None
        best_cost = float('inf')
        for vi in range(num_vehicles):
            v = vehicles[vi]
            current_assigned = len(order_assignments[v['id']])
            # Check weight capacity
            current_weight = sum(ord['weight'] for ord in order_assignments[v['id']])
            if current_weight + remaining_orders[oi]['weight'] > v['maxLoad']:
                continue
            # Find best vehicle with available capacity
            if vehicle_available_slots[vi] > 0 or current_assigned == 0:
                if cost_matrix[vi, oi] < best_cost:
                    best_cost = cost_matrix[vi, oi]
                    best_vi = vi
        
        if best_vi is not None:
            v_id = vehicles[best_vi]['id']
            order_assignments[v_id].append(remaining_orders[oi])
            vehicle_available_slots[best_vi] -= 1
            assigned.add(orders.index(remaining_orders[oi]))
    
    # Nếu còn đơn chưa gán, gán cho xe có tải trọng thấp nhất
    for oi in range(num_remaining):
        if orders.index(remaining_orders[oi]) not in assigned:
            best_vi = None
            min_weight = float('inf')
            for vi in range(num_vehicles):
                v = vehicles[vi]
                current_weight = sum(ord['weight'] for ord in order_assignments[v['id']])
                if current_weight < min_weight and current_weight + remaining_orders[oi]['weight'] <= v['maxLoad']:
                    min_weight = current_weight
                    best_vi = vi
            if best_vi is not None:
                v_id = vehicles[best_vi]['id']
                order_assignments[v_id].append(remaining_orders[oi])
                assigned.add(orders.index(remaining_orders[oi]))

result = {'assignments': {}, 'routes': []}

# 2. Lập lộ trình tối ưu cho từng xe bằng OR-Tools
for vi, v in enumerate(vehicles):
    assigned_orders = order_assignments[v['id']]
    if not assigned_orders:
        result['routes'].append([])
        result['assignments'][str(v['id'])] = []
        continue
    locations = [v['position']]
    for o in assigned_orders:
        locations.append(o['pickup'])
        locations.append(o['delivery'])
    num_locations = len(locations)
    vehicle_starts = [0]
    vehicle_ends = [0]
    vehicle_capacities = [v['maxLoad']]
    demands = [0]
    pickup_delivery_pairs = []
    for o in assigned_orders:
        demands.append(o['weight'])
        demands.append(-o['weight'])
        pickup_delivery_pairs.append((len(demands)-2, len(demands)-1))
    def compute_euclidean_distance_matrix(locations):
        size = len(locations)
        matrix = {}
        for from_idx in range(size):
            matrix[from_idx] = {}
            for to_idx in range(size):
                if from_idx == to_idx:
                    matrix[from_idx][to_idx] = 0
                else:
                    dx = locations[from_idx][0] - locations[to_idx][0]
                    dy = locations[from_idx][1] - locations[to_idx][1]
                    matrix[from_idx][to_idx] = int(((dx**2 + dy**2) ** 0.5) * 1000)
        return matrix
    distance_matrix = compute_euclidean_distance_matrix(locations)
    manager = pywrapcp.RoutingIndexManager(num_locations, 1, vehicle_starts, vehicle_ends)
    routing = pywrapcp.RoutingModel(manager)
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]
    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]
    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,
        vehicle_capacities,
        True,
        'Capacity'
    )
    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        travel_time = distance_matrix[from_node][to_node] / 1000 * 60
        return int(travel_time + 5)
    time_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.AddDimension(
        time_callback_index,
        0,
        10000,
        True,
        'Time'
    )
    time_dimension = routing.GetDimensionOrDie('Time')
    for pickup, delivery in pickup_delivery_pairs:
        routing.AddPickupAndDelivery(manager.NodeToIndex(pickup), manager.NodeToIndex(delivery))
        routing.solver().Add(
            routing.VehicleVar(manager.NodeToIndex(pickup)) == routing.VehicleVar(manager.NodeToIndex(delivery))
        )
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.time_limit.seconds = 10
    solution = routing.SolveWithParameters(search_parameters)
    route = []
    assigned_order_ids = set()
    if solution:
        index = routing.Start(0)
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            route.append(node)
            if node > 0:
                order_idx = (node - 1) // 2
                assigned_order_ids.add(assigned_orders[order_idx]['id'])
            index = solution.Value(routing.NextVar(index))
        result['routes'].append(route)
        result['assignments'][str(v['id'])] = list(assigned_order_ids)
    else:
        result['routes'].append([])
        result['assignments'][str(v['id'])] = [o['id'] for o in assigned_orders]

# Sau khi tối ưu xong, tính toán và xuất lịch trình chi tiết cho từng xe
# Thông số tốc độ trung bình (km/h)
AVG_SPEED_KMH = 30
STOP_TIME_PER_ORDER_MIN = 10

vehicle_summaries = []
for vi, v in enumerate(vehicles):
    assigned_orders = order_assignments[v['id']]
    route = result['routes'][vi] if vi < len(result['routes']) else []
    if not assigned_orders or not route or len(route) < 2:
        vehicle_summaries.append({
            'vehicle_id': v['id'],
            'num_orders': 0,
            'distance_km': 0.0,
            'est_time_min': 0.0,
            'load_ratio': 0.0,
            'route_detail': [],
            'total_stops': 0,
            'stop_time_min': 0.0,
            'move_time_min': 0.0,
            'total_time_min': 0.0
        })
        continue
    # Mapping lại thứ tự điểm dừng
    stops = []
    total_distance = 0.0
    prev_point = v['position']
    for idx in route[1:]:
        order_idx = (idx - 1) // 2 if idx > 0 else None
        is_pickup = (idx - 1) % 2 == 0 if idx > 0 else False
        if idx == 0:
            point = v['position']
            stop_type = 'depot'
            order_id = None
        elif order_idx is not None and 0 <= order_idx < len(assigned_orders):
            order = assigned_orders[order_idx]
            point = order['pickup'] if is_pickup else order['delivery']
            stop_type = 'pickup' if is_pickup else 'delivery'
            order_id = order['id']
        else:
            continue
        # Tính quãng đường
        dist = ((prev_point[0] - point[0]) ** 2 + (prev_point[1] - point[1]) ** 2) ** 0.5 * 111  # xấp xỉ km
        total_distance += dist
        stops.append({'type': stop_type, 'order_id': order_id, 'point': point, 'distance_from_prev_km': round(dist, 2)})
        prev_point = point
    num_orders = len(assigned_orders)
    move_time_min = total_distance / AVG_SPEED_KMH * 60
    stop_time_min = num_orders * STOP_TIME_PER_ORDER_MIN
    total_time_min = move_time_min + stop_time_min
    max_load = v['maxLoad']
    total_weight = sum(o['weight'] for o in assigned_orders)
    load_ratio = round(total_weight / max_load * 100, 1) if max_load else 0.0
    vehicle_summaries.append({
        'vehicle_id': v['id'],
        'num_orders': num_orders,
        'distance_km': round(total_distance, 2),
        'est_time_min': round(total_time_min, 1),
        'load_ratio': load_ratio,
        'route_detail': stops,
        'total_stops': len(stops),
        'stop_time_min': round(stop_time_min, 1),
        'move_time_min': round(move_time_min, 1),
        'total_time_min': round(total_time_min, 1)
    })

result['vehicle_summaries'] = vehicle_summaries
print(json.dumps(result))