# or_tools_debug_mapping.py
# Script này chỉ để kiểm tra mapping index <-> loại điểm <-> id đơn hàng
import json
with open('or_tools_input_debug.json', encoding='utf-8') as f:
    data = json.load(f)
vehicles = data['vehicles']
orders = data['orders']

locations = [v['position'] for v in vehicles]
location_type = ['vehicle'] * len(vehicles)
location_order = [None] * len(vehicles)
for o in orders:
    locations.append(o['pickup'])
    location_type.append('pickup')
    location_order.append(o['id'])
    locations.append(o['delivery'])
    location_type.append('delivery')
    location_order.append(o['id'])

for idx, (loc, typ, oid) in enumerate(zip(locations, location_type, location_order)):
    print(f"{idx:3}: {typ:8} | order: {oid} | {loc}")
