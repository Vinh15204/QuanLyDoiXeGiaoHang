# Hướng dẫn sử dụng Geocoding - Chuyển Tọa độ thành Địa chỉ

## 📋 Tổng quan

Hệ thống đã được tích hợp **reverse geocoding** để tự động chuyển đổi tọa độ GPS thành địa chỉ thực tế sử dụng **Nominatim API** (OpenStreetMap) - hoàn toàn **MIỄN PHÍ**.

---

## 🚀 Cách sử dụng

### 1. **Frontend - React Components**

#### A. Sử dụng Component `AddressDisplay`:

```javascript
import AddressDisplay from './components/AddressDisplay';

// Hiển thị địa chỉ đầy đủ
<AddressDisplay coordinates={[21.0285, 105.8542]} />

// Hiển thị địa chỉ rút gọn
<AddressDisplay coordinates={[21.0285, 105.8542]} short={true} />

// Hiển thị cả địa chỉ và tọa độ
<AddressDisplay coordinates={[21.0285, 105.8542]} showCoords={true} />
```

#### B. Sử dụng trực tiếp utility functions:

```javascript
import { reverseGeocode, forwardGeocode, getShortAddress } from './utils/geocoding';

// Chuyển tọa độ thành địa chỉ
const address = await reverseGeocode([21.0285, 105.8542]);
console.log(address); // "123 Hoàng Quốc Việt, Cầu Giấy, Hà Nội, Việt Nam"

// Chuyển địa chỉ thành tọa độ
const coords = await forwardGeocode("Hà Nội");
console.log(coords); // [21.0278, 105.8342]

// Lấy địa chỉ rút gọn
const shortAddr = await getShortAddress([21.0285, 105.8542]);
console.log(shortAddr); // "123 Hoàng Quốc Việt, Cầu Giấy"
```

#### C. Batch conversion (nhiều tọa độ):

```javascript
import { batchReverseGeocode } from './utils/geocoding';

const coordinates = [
    [21.0285, 105.8542],
    [21.0345, 105.8372],
    [21.0412, 105.8198]
];

const addresses = await batchReverseGeocode(coordinates);
// Tự động có delay 1.1s giữa các request để tôn trọng rate limit
```

---

### 2. **Backend - Node.js API**

```javascript
const geocodingService = require('./utils/geocodingService');

// Reverse geocoding
const address = await geocodingService.reverseGeocode([21.0285, 105.8542]);

// Forward geocoding
const coords = await geocodingService.forwardGeocode("Hà Nội");

// Lấy thông tin chi tiết
const details = await geocodingService.getAddressDetails([21.0285, 105.8542]);
console.log(details);
/* {
    fullAddress: "123 Hoàng Quốc Việt, ...",
    street: "Hoàng Quốc Việt",
    district: "Cầu Giấy",
    city: "Hà Nội",
    country: "Việt Nam",
    postcode: "100000",
    coordinates: [21.0285, 105.8542]
} */
```

---

### 3. **Migrate dữ liệu hiện có**

Chạy script để convert tất cả tọa độ trong database thành địa chỉ:

```powershell
# Chuyển đến thư mục backend
cd backend

# Chạy migration script
node utils/migrateAddresses.js
```

**Script sẽ:**
- ✅ Tự động convert tất cả `pickup`, `delivery` (Orders) thành `pickupAddress`, `deliveryAddress`
- ✅ Tự động convert `position` (Vehicles) thành `currentAddress`
- ✅ Cache kết quả để tránh gọi API trùng lặp
- ✅ Hiển thị progress và báo cáo chi tiết

**Lưu ý:**
- ⏱️ Mất ~1.1 giây cho mỗi tọa độ (do rate limit)
- ⚠️ Không dừng script giữa chừng
- 📊 VD: 100 tọa độ ≈ 2-3 phút

---

## 🛠️ Tích hợp vào components hiện có

### Ví dụ: OrdersManagementNew.js

```javascript
import AddressDisplay from './AddressDisplay';

// Trong phần render table
<td>
    <AddressDisplay 
        coordinates={order.pickup} 
        short={true}
    />
</td>
<td>
    <AddressDisplay 
        coordinates={order.delivery} 
        short={true}
    />
</td>
```

### Ví dụ: VehiclesManagementNew.js

```javascript
<td>
    <AddressDisplay 
        coordinates={vehicle.position}
        showCoords={false}
    />
</td>
```

---

## 📊 Database Schema

### **Order Model** đã được cập nhật:

```javascript
{
    pickup: [Number, Number],      // Tọa độ [lat, lng]
    pickupAddress: String,         // ← MỚI: Địa chỉ pickup
    delivery: [Number, Number],    // Tọa độ [lat, lng]
    deliveryAddress: String,       // ← MỚI: Địa chỉ delivery
    // ... các field khác
}
```

### **Vehicle Model** đã được cập nhật:

```javascript
{
    position: [Number, Number],    // Tọa độ [lat, lng]
    currentAddress: String,        // ← MỚI: Địa chỉ hiện tại
    // ... các field khác
}
```

---

## ⚡ Performance & Caching

### Frontend Cache:
- ✅ Tự động cache trong memory
- ✅ TTL: 24 giờ
- ✅ Key: tọa độ làm tròn 5 chữ số thập phân

### Backend Cache:
- ✅ In-memory Map cache
- ✅ TTL: 24 giờ
- ✅ Rate limiting: 1 request/1.1 giây
- ✅ Clear cache: `geocodingService.clearCache()`

---

## 🌐 API Sử dụng

**Nominatim (OpenStreetMap)**
- ✅ Hoàn toàn miễn phí
- ⚠️ Rate limit: 1 request/giây
- ✅ Không cần API key
- ✅ Hỗ trợ toàn cầu
- 📖 Docs: https://nominatim.org/release-docs/latest/api/Reverse/

**Lưu ý:** Nếu cần nhiều request hơn, có thể:
1. Self-host Nominatim server
2. Sử dụng Google Maps Geocoding API (có phí)
3. Dùng Mapbox API (có free tier)

---

## 🐛 Troubleshooting

### 1. Lỗi "429 Too Many Requests"
→ **Nguyên nhân:** Vượt quá rate limit (1 req/s)
→ **Giải pháp:** Script đã tự động xử lý delay, chờ vài giây rồi thử lại

### 2. Địa chỉ hiển thị sai/không chính xác
→ **Nguyên nhân:** Tọa độ không chính xác hoặc dữ liệu OSM chưa đầy đủ
→ **Giải pháp:** Kiểm tra lại tọa độ, hoặc update OSM data

### 3. Loading lâu
→ **Nguyên nhân:** Chưa cache, API response chậm
→ **Giải pháp:** Sau lần đầu, kết quả được cache 24h

### 4. Hiển thị tọa độ thay vì địa chỉ
→ **Nguyên nhân:** API error hoặc không tìm thấy địa chỉ
→ **Giải pháp:** Fallback tự động về tọa độ

---

## 📝 TODO / Nâng cấp tương lai

- [ ] Thêm dropdown chọn API provider (Nominatim/Google/Mapbox)
- [ ] Cache vào localStorage cho persistent cache
- [ ] Backend endpoint `/api/geocode` để frontend gọi
- [ ] Batch API endpoint cho nhiều tọa độ cùng lúc
- [ ] Hỗ trợ đa ngôn ngữ (hiện tại theo địa phương)
- [ ] Auto-refresh địa chỉ khi tọa độ thay đổi

---

## 💡 Tips

1. **Luôn dùng `short={true}`** cho table columns để tiết kiệm space
2. **Hiển thị tọa độ trong tooltip** với `showCoords={true}` cho debug
3. **Chạy migration 1 lần** sau khi deploy để convert data hiện có
4. **Monitor cache size** bằng `getCacheStats()` để tránh memory leak

---

## 📞 Liên hệ

Nếu cần hỗ trợ hoặc có câu hỏi, vui lòng liên hệ team phát triển.
