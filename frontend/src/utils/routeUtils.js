const OSRM_URL = 'http://router.project-osrm.org/route/v1/driving/';

export const calculateHaversineDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (point2[0] - point1[0]) * Math.PI / 180;
  const dLon = (point2[1] - point1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getRouteDistance = async (pickup, delivery) => {
  try {
    const coords = `${delivery[1]},${delivery[0]};${pickup[1]},${pickup[0]}`;
    const response = await fetch(`${OSRM_URL}${coords}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    if (data.routes && data.routes[0]) {
      return {
        distance: data.routes[0].distance / 1000, // Convert to km
        duration: Math.round(data.routes[0].duration / 60) // Convert to minutes
      };
    }
    throw new Error('No route found');
  } catch (err) {
    console.error('Error calculating route distance:', err);
    return null;
  }
};
