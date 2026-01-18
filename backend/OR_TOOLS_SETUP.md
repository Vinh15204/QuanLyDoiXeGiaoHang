# Google OR-Tools Installation Guide

## Cài đặt Python và OR-Tools

### Windows:

1. **Kiểm tra Python đã cài chưa:**
```bash
python --version
```

2. **Nếu chưa có Python, tải từ:** https://www.python.org/downloads/

3. **Cài đặt OR-Tools:**
```bash
pip install ortools numpy
```

### Kiểm tra cài đặt:
```bash
python -c "from ortools.constraint_solver import pywrapcp; print('OR-Tools installed successfully!')"
```

## Sử dụng

Backend sẽ tự động:
1. Thử dùng OR-Tools trước (tối ưu hơn)
2. Nếu Python/OR-Tools không có, fallback sang JavaScript optimizer

## Manual Constraints

Khi tạo route, hệ thống sẽ tự động:
- Kiểm tra các đơn hàng có `assignmentType: 'manual'`
- Ưu tiên gán những đơn đó cho xe đã chỉ định
- Các đơn còn lại sẽ được tối ưu tự động

## Thuật toán

OR-Tools sử dụng:
- **Pickup-Delivery Pairing**: Đảm bảo lấy hàng trước khi giao
- **Capacity Constraints**: Không vượt tải trọng xe
- **Time Windows**: Tối ưu thời gian di chuyển
- **Manual Constraints**: Giữ nguyên phân công thủ công

Kết quả: Lấy hết hàng trước → Giao hàng sau (tối ưu quãng đường)
