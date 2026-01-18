// Test API để kiểm tra filter orders theo userId
const userId = 1; // Thay bằng userId bạn muốn test

fetch(`http://localhost:3001/api/orders?userId=${userId}`)
  .then(res => res.json())
  .then(orders => {
    console.log(`Orders for user ${userId}:`, orders.length);
    orders.forEach(order => {
      console.log(`Order ${order.id}: senderId=${order.senderId}, receiverId=${order.receiverId}`);
    });
  })
  .catch(err => console.error('Error:', err));
