import Openrouteservice from 'openrouteservice-js';

class OpenRouteService {
  constructor() {
    this.api = new Openrouteservice.Directions({
      api_key: process.env.REACT_APP_OPENROUTE_API_KEY
    });
    
    this.matrixApi = new Openrouteservice.Matrix({
      api_key: process.env.REACT_APP_OPENROUTE_API_KEY
    });
  }

  // Geocode address to coordinates
  async geocodeAddress(address) {
    try {
      const response = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=${process.env.REACT_APP_OPENROUTE_API_KEY}&text=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const coords = data.features[0].geometry.coordinates;
        return {
          longitude: coords[0],
          latitude: coords[1],
          displayName: data.features[0].properties.label
        };
      }
      throw new Error('Location not found');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  // Calculate route between multiple points
  async calculateRoute(coordinates, vehicleType = 'driving-car') {
    try {
      const response = await this.api.calculate({
        coordinates: coordinates, // Array of [longitude, latitude]
        profile: this.getVehicleProfile(vehicleType),
        extra_info: ['waytype', 'steepness'],
        geometry: true,
        instructions: true
      });

      return {
        distance: response.routes[0].summary.distance / 1000, // Convert to km
        duration: response.routes[0].summary.duration / 60, // Convert to minutes
        geometry: response.routes[0].geometry,
        instructions: response.routes[0].segments.map(seg => seg.steps).flat()
      };
    } catch (error) {
      console.error('Route calculation error:', error);
      throw error;
    }
  }

  // Calculate distance matrix for route optimization
  async calculateDistanceMatrix(locations, vehicleType = 'driving-car') {
    try {
      const coordinates = locations.map(loc => [loc.longitude, loc.latitude]);
      
      const response = await this.matrixApi.calculate({
        locations: coordinates,
        profile: this.getVehicleProfile(vehicleType),
        metrics: ['distance', 'duration']
      });

      return {
        distances: response.distances, // 2D array of distances in meters
        durations: response.durations  // 2D array of durations in seconds
      };
    } catch (error) {
      console.error('Distance matrix error:', error);
      throw error;
    }
  }

  // Map your vehicle types to OpenRouteService profiles
  getVehicleProfile(vehicleType) {
    const profiles = {
      'van': 'driving-car',
      'truck': 'driving-hgv', // Heavy Goods Vehicle
      'refrigerated_truck': 'driving-hgv',
      'motorcycle': 'cycling-regular' // Closest approximation
    };
    return profiles[vehicleType] || 'driving-car';
  }

  // Calculate fuel consumption based on real distance
  calculateFuelConsumption(distanceKm, vehicleType) {
    const fuelRates = {
      'van': 0.12, // L/km
      'truck': 0.25,
      'refrigerated_truck': 0.30,
      'motorcycle': 0.04
    };
    return (distanceKm * (fuelRates[vehicleType] || 0.12)).toFixed(2);
  }

  // Calculate carbon emissions
  calculateCarbonEmissions(fuelLiters) {
    // Average: 2.31 kg CO2 per liter of diesel
    return (fuelLiters * 2.31).toFixed(2);
  }
}

export default new OpenRouteService();