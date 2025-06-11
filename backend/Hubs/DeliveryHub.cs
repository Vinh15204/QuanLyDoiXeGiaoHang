using Microsoft.AspNetCore.SignalR;

namespace backend.Hubs
{
    public class DeliveryHub : Hub
    {
        public async Task UpdateLocation(int vehicleId, double[] location)
        {
            await Clients.All.SendAsync("LocationUpdated", vehicleId, location);
        }

        public async Task UpdateOrderStatus(int orderId, string status)
        {
            await Clients.All.SendAsync("OrderStatusUpdated", orderId, status);
        }

        public async Task BroadcastOptimizedRoutes(object routes)
        {
            await Clients.All.SendAsync("OrdersUpdated", routes);
        }
    }
}
