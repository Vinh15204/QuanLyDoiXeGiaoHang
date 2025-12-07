import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import vehicleImg from '../assets/vehicle.png';
import pickupImg from '../assets/pickup.webp';
import deliveryImg from '../assets/delivery.webp';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const createCustomIcon = (iconUrl, iconSize = [25, 41]) => {
    return new L.Icon({
        iconUrl: iconUrl,
        iconSize: iconSize,
        iconAnchor: [iconSize[0] / 2, iconSize[1]],
        popupAnchor: [0, -iconSize[1]],
        tooltipAnchor: [iconSize[0] / 2, -iconSize[1] / 2],
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
        shadowSize: [iconSize[0] * 1.2, iconSize[1] * 1.2], // Scale shadow with icon size
        shadowAnchor: [iconSize[0] * 0.4, iconSize[1]]
    });
};

// Custom icons with proper shadows and anchoring (reduced to half size)
export const vehicleIcon = createCustomIcon(vehicleImg, [15, 15]);
export const pickupIcon = createCustomIcon(pickupImg, [10, 10]);
export const deliveryIcon = createCustomIcon(deliveryImg, [10, 10]);

// Helper function to ensure icons are loaded correctly
export const validateIcon = (icon) => {
    if (!icon || !icon.options || !icon.options.iconUrl) {
        console.warn('Invalid icon configuration:', icon);
        return L.Icon.Default.prototype;
    }
    return icon;
};
