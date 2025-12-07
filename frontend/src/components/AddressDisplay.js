import React, { useState, useEffect } from 'react';
import { reverseGeocode } from '../utils/geocoding';

/**
 * Component hiển thị địa chỉ từ tọa độ
 * Tự động gọi reverse geocoding và cache kết quả
 */
const AddressDisplay = ({ 
    coordinates, 
    showCoords = false, 
    short = false,
    className = '',
    loading: externalLoading = false
}) => {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchAddress = async () => {
            // Hỗ trợ cả array [lat, lng] và object {lat, lng}
            let lat, lng;
            if (!coordinates) {
                setAddress('Địa chỉ không xác định');
                setLoading(false);
                return;
            }
            
            if (Array.isArray(coordinates)) {
                if (coordinates.length !== 2) {
                    setAddress('Địa chỉ không xác định');
                    setLoading(false);
                    return;
                }
                [lat, lng] = coordinates;
            } else if (coordinates.lat && coordinates.lng) {
                lat = coordinates.lat;
                lng = coordinates.lng;
            } else {
                setAddress('Địa chỉ không xác định');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(false);
                
                // Gọi reverseGeocode với array format
                const result = await reverseGeocode([lat, lng]);
                
                if (isMounted) {
                    let displayAddress = result;
                    
                    // Rút gọn nếu cần
                    if (short && result && !result.includes('không xác định')) {
                        const parts = result.split(',').map(p => p.trim());
                        displayAddress = parts.slice(0, 3).join(', ');
                    }
                    
                    setAddress(displayAddress);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Address display error:', err);
                if (isMounted) {
                    setError(true);
                    setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                    setLoading(false);
                }
            }
        };

        fetchAddress();

        return () => {
            isMounted = false;
        };
    }, [coordinates, short]);

    if (loading || externalLoading) {
        return (
            <span className={className} style={{ color: '#666', fontStyle: 'italic' }}>
                Đang tải địa chỉ...
            </span>
        );
    }

    if (error) {
        return (
            <span className={className} style={{ color: '#e74c3c' }} title="Không thể tải địa chỉ">
                {address}
            </span>
        );
    }

    // Normalize coordinates cho display
    let displayLat, displayLng;
    if (coordinates) {
        if (Array.isArray(coordinates)) {
            [displayLat, displayLng] = coordinates;
        } else if (coordinates.lat && coordinates.lng) {
            displayLat = coordinates.lat;
            displayLng = coordinates.lng;
        }
    }

    return (
        <span 
            className={className}
            title={showCoords && displayLat && displayLng ? `Tọa độ: ${displayLat.toFixed(6)}, ${displayLng.toFixed(6)}` : address}
        >
            {address}
            {showCoords && displayLat && displayLng && (
                <small style={{ display: 'block', color: '#999', fontSize: '0.85em', marginTop: '4px' }}>
                    📍 {displayLat.toFixed(6)}, {displayLng.toFixed(6)}
                </small>
            )}
        </span>
    );
};

export default AddressDisplay;
