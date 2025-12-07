# NGHIÊN CỨU MỘT SỐ CÔNG NGHỆ PHẦN MỀM THIẾT KẾ VÀ XÂY DỰNG WEBSITE QUẢN LÝ ĐỘI XE GIAO HÀNG VÀ KHO KHÁCH HÀNG TRÊN NỀN OPENSTREETMAP

## CHƯƠNG 1: GIỚI THIỆU BÀI TOÁN
### 1.1. Đặt vấn đề
Trong thời đại số hóa hiện nay, việc quản lý đội xe giao hàng và kho khách hàng một cách hiệu quả là một nhu cầu thiết yếu của nhiều doanh nghiệp. Đặc biệt, việc tối ưu hóa lộ trình giao hàng không chỉ giúp tiết kiệm chi phí mà còn nâng cao chất lượng dịch vụ và sự hài lòng của khách hàng.

### 1.2. Mục tiêu của đề tài
- Nghiên cứu và áp dụng các công nghệ web hiện đại
- Tích hợp bản đồ OpenStreetMap cho việc hiển thị và theo dõi
- Xây dựng hệ thống quản lý đội xe giao hàng
- Áp dụng thuật toán tối ưu (Google OR-Tools) cho bài toán CVRP và Pickup & Delivery VRP

### 1.3. Phạm vi nghiên cứu
- Tập trung vào hai bài toán chính:
  1. Capacitated Vehicle Routing Problem (CVRP)
  2. Pickup and Delivery Vehicle Routing Problem (PDVRP)
- Sử dụng OpenStreetMap làm nền tảng bản đồ
- Xây dựng hệ thống web với hai đối tượng người dùng: Admin và Users

### 1.2. Kiến trúc hệ thống
Hệ thống được xây dựng theo mô hình client-server với hai phần chính:

**Frontend:**
- Sử dụng ReactJS
- Giao diện người dùng thân thiện
- Tích hợp bản đồ để theo dõi vị trí xe và đơn hàng
- Hỗ trợ real-time updates thông qua SignalR

**Backend:**
- NodeJS/Express cho REST API
- C# .NET cho các tính năng tối ưu hóa
- MongoDB làm cơ sở dữ liệu
- WebSocket (Socket.IO) cho real-time communication

## 2. Các chức năng chính

### 2.1. Quản lý đơn hàng
- Tạo và theo dõi đơn hàng
- Cập nhật trạng thái đơn hàng real-time
- Xem lịch sử đơn hàng
- API endpoints:
  - GET /api/orders - Lấy danh sách đơn hàng
  - GET /api/orders/:id - Lấy chi tiết đơn hàng
  - POST /api/orders - Tạo đơn hàng mới
  - PATCH /api/orders/:id - Cập nhật đơn hàng
  - DELETE /api/orders/:id - Xóa đơn hàng

### 2.2. Quản lý phương tiện
- Theo dõi trạng thái và vị trí xe
- Quản lý thông tin xe (trọng tải, loại xe)
- Phân công xe cho đơn hàng
- Theo dõi lộ trình xe real-time

### 2.3. Quản lý người dùng
- Phân quyền: Admin, Tài xế, Khách hàng
- Đăng nhập/Đăng ký tài khoản
- Quản lý thông tin cá nhân
- Theo dõi hoạt động người dùng

### 2.4. Tối ưu hóa lộ trình
- Sử dụng thuật toán OR-Tools của Google
- Tối ưu hóa lộ trình dựa trên:
  - Vị trí điểm đón/trả hàng
  - Trọng lượng hàng hóa
  - Khả năng vận chuyển của xe
  - Thời gian di chuyển

## 3. Công nghệ sử dụng

### 3.1. Frontend
- ReactJS
- Material-UI cho giao diện
- Leaflet/MapBox cho hiển thị bản đồ
- SignalR client cho real-time updates
- Context API cho state management

### 3.2. Backend
- Express.js
- ASP.NET Core
- MongoDB
- Socket.IO
- Google OR-Tools

### 3.3. Tools và Libraries
- Git cho version control
- VS Code IDE
- Postman cho API testing
- MongoDB Compass cho database management

## 4. Cấu trúc mã nguồn

### 4.1. Frontend Structure
```
frontend/
├── public/
│   └── images/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── services/
│   ├── styles/
│   └── utils/
```

### 4.2. Backend Structure
```
backend/
├── Controllers/
├── Hubs/
├── models/
├── routes/
└── utils/
```

## 5. Tính năng bảo mật
- JWT Authentication
- CORS protection
- Password hashing
- API rate limiting
- Input validation
- Error handling

## 6. Khả năng mở rộng
Hệ thống được thiết kế để dễ dàng mở rộng với các tính năng:
- Tích hợp thanh toán trực tuyến
- Thêm tính năng chat realtime
- Báo cáo và thống kê chi tiết
- Mobile app cho tài xế
- Tích hợp với các hệ thống khác qua API

## 7. Kết luận
Hệ thống QLDXGH đã được xây dựng với kiến trúc hiện đại, đáp ứng được các yêu cầu về:
- Quản lý đơn hàng hiệu quả
- Tối ưu hóa lộ trình giao hàng
- Real-time tracking và updates
- Bảo mật và độ tin cậy cao
- Khả năng mở rộng trong tương lai

---
## Phụ lục

### API Endpoints

#### Orders API
```
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PATCH  /api/orders/:id
DELETE /api/orders/:id
```

#### Users API
```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id
```

#### Vehicles API
```
GET    /api/vehicles
GET    /api/vehicles/:id
POST   /api/vehicles
PATCH  /api/vehicles/:id
DELETE /api/vehicles/:id
```

### Database Schema

#### Order Schema
```javascript
{
  id: Number,
  senderId: Number,
  receiverId: Number,
  pickup: [Number, Number],
  delivery: [Number, Number],
  weight: Number,
  status: String,
  driverId: Number,
  createdAt: Date,
  updatedAt: Date
}
```

#### Vehicle Schema
```javascript
{
  id: Number,
  type: String,
  capacity: Number,
  location: [Number, Number],
  status: String,
  driverId: Number
}
```

#### User Schema
```javascript
{
  id: Number,
  username: String,
  role: String,
  email: String,
  phone: String,
  status: String
}
```
