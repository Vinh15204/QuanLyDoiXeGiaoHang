using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using backend.Hubs;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using System.Linq;
using System.Text.Json;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OptimizeController : ControllerBase
    {
        private readonly IHubContext<DeliveryHub> _hubContext;

        public OptimizeController(IHubContext<DeliveryHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public class Vehicle
        {
            public int id { get; set; }
            public double[]? position { get; set; }
            public int maxLoad { get; set; }
        }
        public class Order
        {
            public int id { get; set; }
            public double[]? pickup { get; set; }
            public double[]? delivery { get; set; }
            public int weight { get; set; }
        }
        public class OptimizeRequest
        {
            public List<Vehicle>? vehicles { get; set; }
            public List<Order>? orders { get; set; }
        }

        // Hàm gọi OSRM để lấy đường đi thực tế giữa các điểm
        private async Task<(List<double[]> route, double distance, double duration)> GetOsrmRoute(List<double[]> points)
        {
            try {
                if (points.Count < 2) return (points, 0, 0);
                
                // OSRM yêu cầu tọa độ dạng "longitude,latitude" và dùng dấu chấm cho số thập phân
                var coords = string.Join(";", points.Select(p => 
                    $"{p[1].ToString(System.Globalization.CultureInfo.InvariantCulture)}," +
                    $"{p[0].ToString(System.Globalization.CultureInfo.InvariantCulture)}"
                ));
                
                var url = $"http://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson&steps=true";
                
                using var http = new HttpClient();
                var res = await http.GetAsync(url);
                var json = await res.Content.ReadAsStringAsync();

                if (!res.IsSuccessStatusCode) {
                    return (points, 0, 0);
                }

                var doc = JsonDocument.Parse(json);
                var route = doc.RootElement.GetProperty("routes")[0];
                
                // Lấy tổng khoảng cách (mét) và thời gian (giây)
                var distance = route.GetProperty("distance").GetDouble();
                var duration = route.GetProperty("duration").GetDouble();

                var coordinates = route.GetProperty("geometry")
                    .GetProperty("coordinates")
                    .EnumerateArray()
                    .Select(coord => new double[] { 
                        coord[1].GetDouble(),
                        coord[0].GetDouble()
                    })
                    .ToList();

                return (coordinates, distance, duration);
            }
            catch (Exception ex) {
                Console.WriteLine($"Error: {ex.Message}");
                return (points, 0, 0);
            }
        }

        // Hàm chia đơn hàng cho xe (tham lam)
        private Dictionary<int, List<Order>> AssignOrders(List<Vehicle> vehicles, List<Order> orders)
        {
            var result = vehicles.ToDictionary(v => v.id, v => new List<Order>());
            var vehicleLoads = vehicles.ToDictionary(v => v.id, v => 0);
            var vehicleTimes = vehicles.ToDictionary(v => v.id, v => 0.0);
            
            // Sắp xếp đơn hàng theo trọng lượng giảm dần
            var sortedOrders = orders.OrderByDescending(o => o.weight).ToList();

            foreach (var order in sortedOrders)
            {
                // Tìm xe có thể nhận thêm đơn và có thời gian giao hàng ngắn nhất
                var bestVehicle = vehicles
                    .Where(v => vehicleLoads[v.id] + order.weight <= v.maxLoad)
                    .OrderBy(v => EstimateDeliveryTime(v, order, vehicleTimes[v.id]))
                    .FirstOrDefault();

                if (bestVehicle != null)
                {
                    result[bestVehicle.id].Add(order);
                    vehicleLoads[bestVehicle.id] += order.weight;
                    vehicleTimes[bestVehicle.id] = EstimateDeliveryTime(bestVehicle, order, vehicleTimes[bestVehicle.id]);
                }
            }

            return result;
        }

        private double EstimateDeliveryTime(Vehicle vehicle, Order order, double currentTime)
        {
            // Ước tính thời gian di chuyển từ vị trí hiện tại đến điểm nhận hàng
            var distanceToPickup = CalculateDistance(vehicle.position, order.pickup);
            var timeToPickup = distanceToPickup * 0.02; // Giả sử tốc độ trung bình 50km/h

            // Ước tính thời gian di chuyển từ điểm nhận đến điểm giao
            var distanceToDeliver = CalculateDistance(order.pickup, order.delivery); 
            var timeToDeliver = distanceToDeliver * 0.02;

            // Thêm thời gian xử lý đơn hàng (nhận/giao)
            var handlingTime = 10; // 10 phút cho mỗi điểm dừng

            return currentTime + timeToPickup + timeToDeliver + handlingTime;
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] OptimizeRequest req)
        {
            try
            {
                var results = new List<object>();
                if (req.vehicles is { Count: > 0 } && req.orders is { Count: > 0 })
                {
                    var assign = AssignOrders(req.vehicles, req.orders);

                    foreach (var v in req.vehicles)
                    {
                        var assignedOrders = assign[v.id];
                        var routePoints = new List<double[]>();
                        var routeDetails = new List<string>();
                        int currentLoad = 0;

                        // Thêm điểm xuất phát
                        if (v.position != null)
                        {
                            routePoints.Add(v.position);
                            routeDetails.Add($"Xuất phát từ vị trí xe #{v.id}");
                        }

                        var stops = new List<(string type, int orderId, double[] point, int weight)>();
                        foreach (var order in assignedOrders)
                        {
                            if (order.pickup != null)
                                stops.Add(("pickup", order.id, order.pickup, order.weight));
                            if (order.delivery != null)
                                stops.Add(("delivery", order.id, order.delivery, order.weight));
                        }

                        var picked = new HashSet<int>();
                        var delivered = new HashSet<int>();
                        var currentPos = v.position;

                        while (stops.Count > 0)
                        {
                            double minDist = double.MaxValue;
                            int nextIdx = -1;
                            (string type, int orderId, double[] point, int weight) nextStop = default;

                            for (int i = 0; i < stops.Count; i++)
                            {
                                var stop = stops[i];
                                if (stop.point == null) continue;
                                if (stop.type == "delivery" && !picked.Contains(stop.orderId))
                                    continue;
                                if (stop.type == "pickup" && currentLoad + stop.weight > v.maxLoad)
                                    continue;
                                if (stop.type == "delivery" && delivered.Contains(stop.orderId))
                                    continue;

                                if (currentPos == null) continue;
                                var dist = CalculateDistance(currentPos, stop.point);
                                if (dist < minDist)
                                {
                                    minDist = dist;
                                    nextIdx = i;
                                    nextStop = stop;
                                }
                            }

                            if (nextIdx == -1) break;

                            if (nextStop.point != null)
                            {
                                routePoints.Add(nextStop.point);
                                if (nextStop.type == "pickup")
                                {
                                    currentLoad += nextStop.weight;
                                    picked.Add(nextStop.orderId);
                                    routeDetails.Add($"Nhận đơn #{nextStop.orderId} ({nextStop.weight}kg) - Tải hiện tại: {currentLoad}kg");
                                }
                                else
                                {
                                    currentLoad -= nextStop.weight;
                                    delivered.Add(nextStop.orderId);
                                    routeDetails.Add($"Giao đơn #{nextStop.orderId} ({nextStop.weight}kg) - Tải hiện tại: {currentLoad}kg");
                                }
                                currentPos = nextStop.point;
                            }
                            stops.RemoveAt(nextIdx);
                        }

                        // Loại bỏ các phần tử null trong routePoints (phòng trường hợp bất ngờ)
                        routePoints = routePoints.Where(p => p != null).ToList();

                        var (route, distance, duration) = await GetOsrmRoute(routePoints);

                        results.Add(new
                        {
                            vehicleId = v.id,
                            maxLoad = v.maxLoad,
                            assignedOrders = assignedOrders.Select(o => o.id).ToList(),
                            routeDetails = routeDetails,
                            route = route,
                            distance = Math.Round(distance / 1000, 2),
                            duration = Math.Round(duration / 60, 2)
                        });
                    }

                    // Broadcast to all clients immediately after optimization
                    await _hubContext.Clients.All.SendAsync("RoutesOptimized", results);
                    
                    return Ok(new { routes = results });
                }
                return BadRequest("Invalid input data");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Hàm tính khoảng cách Euclidean, kiểm tra null
        private double CalculateDistance(double[]? p1, double[]? p2)
        {
            if (p1 == null || p2 == null) return double.MaxValue;
            var dx = p1[0] - p2[0];
            var dy = p1[1] - p2[1];
            return Math.Sqrt(dx * dx + dy * dy);
        }
    }
}
