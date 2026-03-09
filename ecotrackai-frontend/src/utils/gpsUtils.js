/**
 * gpsUtils.js - GPS and geofencing utilities
 * Handles distance calculations, geofence checks, location tracking
 */

const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters
export const GEOFENCE_RADIUS_METERS = 50; // Standard geofence radius: 50 meters

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance);
};

/**
 * Check if driver location is within geofence radius of stop location
 * @param {object} driverLocation - { latitude, longitude }
 * @param {object} stopLocation - { latitude, longitude } or can be parsed from string
 * @param {number} radiusMeters - Geofence radius (default 50m)
 * @returns {boolean} True if within geofence
 */
export const isWithinGeofence = (
  driverLocation,
  stopLocation,
  radiusMeters = GEOFENCE_RADIUS_METERS
) => {
  if (!driverLocation || !stopLocation) return false;

  // Parse stopLocation if it's a string (JSON format)
  const stop =
    typeof stopLocation === 'string' ? JSON.parse(stopLocation) : stopLocation;

  const distance = calculateDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    stop.latitude || stop.lat,
    stop.longitude || stop.lng
  );

  return distance <= radiusMeters;
};

/**
 * Get formatted distance string
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance (e.g., "65m", "1.2 km")
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Bearing in degrees (0-360)
 */
export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const toDeg = (x) => (x * 180) / Math.PI;

  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  let bearing = toDeg(Math.atan2(y, x));
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  return Math.round(bearing);
};

/**
 * Get compass direction from bearing
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export const getCompassDirection = (bearing) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

/**
 * Parse location from various formats
 * @param {string|object} location - Location as string or object
 * @returns {object} Parsed location { latitude, longitude }
 */
export const parseLocation = (location) => {
  if (typeof location === 'object') {
    return {
      latitude: location.latitude || location.lat,
      longitude: location.longitude || location.lng,
    };
  }

  try {
    const parsed = JSON.parse(location);
    return {
      latitude: parsed.latitude || parsed.lat,
      longitude: parsed.longitude || parsed.lng,
    };
  } catch {
    console.error('Failed to parse location:', location);
    return null;
  }
};

/**
 * Check if two locations are approximately the same
 * @param {object} loc1 - First location
 * @param {object} loc2 - Second location
 * @param {number} toleranceMeters - Tolerance in meters (default 100m)
 * @returns {boolean}
 */
export const isSameLocation = (loc1, loc2, toleranceMeters = 100) => {
  if (!loc1 || !loc2) return false;

  const distance = calculateDistance(
    loc1.latitude || loc1.lat,
    loc1.longitude || loc1.lng,
    loc2.latitude || loc2.lat,
    loc2.longitude || loc2.lng
  );

  return distance <= toleranceMeters;
};

/**
 * Get geofence circle properties for map rendering
 * @param {object} center - Center location { latitude, longitude }
 * @param {number} radiusMeters - Geofence radius
 * @returns {object} Circle properties for map library
 */
export const getGeofenceCircle = (center, radiusMeters = GEOFENCE_RADIUS_METERS) => {
  return {
    center: {
      lat: center.latitude || center.lat,
      lng: center.longitude || center.lng,
    },
    radius: radiusMeters,
    fillColor: '#4285F4',
    fillOpacity: 0.1,
    strokeColor: '#4285F4',
    strokeOpacity: 0.8,
    strokeWeight: 2,
  };
};

/**
 * Calculate center point between multiple locations
 * @param {array} locations - Array of locations
 * @returns {object} Center location { latitude, longitude }
 */
export const calculateCenterPoint = (locations) => {
  if (!locations || locations.length === 0) return null;

  const sumLat = locations.reduce((sum, loc) => sum + (loc.latitude || loc.lat), 0);
  const sumLng = locations.reduce((sum, loc) => sum + (loc.longitude || loc.lng), 0);

  return {
    latitude: sumLat / locations.length,
    longitude: sumLng / locations.length,
  };
};

/**
 * Calculate bounding box for multiple locations
 * @param {array} locations - Array of locations
 * @returns {object} Bounding box { minLat, maxLat, minLng, maxLng }
 */
export const calculateBoundingBox = (locations) => {
  if (!locations || locations.length === 0) return null;

  const lats = locations.map((loc) => loc.latitude || loc.lat);
  const lngs = locations.map((loc) => loc.longitude || loc.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
};

/**
 * Check if location is valid
 * @param {object} location - Location to validate
 * @returns {boolean}
 */
export const isValidLocation = (location) => {
  if (!location) return false;

  const lat = location.latitude || location.lat;
  const lng = location.longitude || location.lng;

  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};
