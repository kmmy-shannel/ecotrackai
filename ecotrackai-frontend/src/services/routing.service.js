import axios from 'axios';

const ORS_API_KEY = process.env.REACT_APP_OPENROUTE_API_KEY || 'YOUR_API_KEY';
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2';

class RoutingService {
  /**
   * Get optimized route with real road geometry
   * @param {Array} coordinates - Array of [lng, lat] coordinates
   * @param {string} profile - Vehicle profile (driving-car, driving-hgv, etc.)
   * @returns {Promise} Route with geometry and details
   */
  async getRoute(coordinates, profile = 'driving-car') {
    try {
      console.log('🗺️ Fetching route from OpenRouteService...');
      console.log('Coordinates:', coordinates);

      const response = await axios.post(
        `${ORS_BASE_URL}/directions/${profile}/geojson`,
        {
          coordinates: coordinates, // [[lng1, lat1], [lng2, lat2], ...]
          preference: 'recommended',
          units: 'km',
          language: 'en',
          geometry: true,
          instructions: true
        },
        {
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      const route = response.data.features[0];
      const properties = route.properties;
      const segments = properties.segments[0];

      console.log('✅ Route fetched successfully');

      return {
        geometry: route.geometry, // GeoJSON LineString
        distance: (properties.summary.distance / 1000).toFixed(2), // km
        duration: (properties.summary.duration / 60).toFixed(1), // minutes
        steps: segments.steps
      };

    } catch (error) {
      console.error('❌ Routing error:', error.response?.data || error.message);
      
      // Fallback: return straight line
      return this.getStraightLineRoute(coordinates);
    }
  }

  /**
   * Get optimized route order (TSP - Traveling Salesman Problem)
   * @param {Array} coordinates - Array of [lng, lat] coordinates
   * @returns {Promise} Optimized order and route
   */
  async getOptimizedRoute(coordinates) {
    try {
      console.log('🤖 Requesting route optimization from OpenRouteService...');

      // OpenRouteService Optimization API
      const response = await axios.post(
        `${ORS_BASE_URL}/optimization`,
        {
          jobs: coordinates.slice(1, -1).map((coord, index) => ({
            id: index + 1,
            location: coord,
            service: 300 // 5 minutes service time
          })),
          vehicles: [
            {
              id: 1,
              profile: 'driving-car',
              start: coordinates[0],
              end: coordinates[coordinates.length - 1],
              capacity: [100]
            }
          ],
          options: {
            g: true // Return route geometry
          }
        },
        {
          headers: {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      const route = response.data.routes[0];
      
      console.log('✅ Optimized route received');

      return {
        optimizedOrder: route.steps.map(step => step.job || 0),
        geometry: route.geometry,
        distance: (route.distance / 1000).toFixed(2),
        duration: (route.duration / 60).toFixed(1)
      };

    } catch (error) {
      console.error('❌ Optimization error:', error.response?.data || error.message);
      
      // Fallback: just get regular route
      return this.getRoute(coordinates);
    }
  }

  /**
   * Fallback: Calculate straight line route
   */
  getStraightLineRoute(coordinates) {
    console.log('⚠️ Using straight line fallback');

    // Convert coordinates to GeoJSON LineString
    const geometry = {
      type: 'LineString',
      coordinates: coordinates
    };

    // Calculate rough distance using Haversine formula
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const dist = this.haversineDistance(
        coordinates[i][1], coordinates[i][0],
        coordinates[i + 1][1], coordinates[i + 1][0]
      );
      totalDistance += dist;
    }

    return {
      geometry: geometry,
      distance: totalDistance.toFixed(2),
      duration: (totalDistance * 2.5).toFixed(1), // Rough estimate: 2.5 min per km
      steps: []
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert vehicle type to OpenRouteService profile
   */
  getVehicleProfile(vehicleType) {
    const profiles = {
      'van': 'driving-car',
      'truck': 'driving-hgv',
      'refrigerated_truck': 'driving-hgv',
      'motorcycle': 'cycling-regular'
    };
    return profiles[vehicleType] || 'driving-car';
  }
}

export default new RoutingService();