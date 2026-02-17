import axios from 'axios';
import routingService from './routing.service'; 

const API_URL = `${process.env.REACT_APP_API_URL}/deliveries`;


// Helper to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('token'); // Get token directly
  
  if (!token) {
    console.error('No token found in localStorage');
    return {};
  }
  
  console.log('Token found, adding to headers');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

class DeliveryService {
  async getAllDeliveries() {
    try {
      console.log('Fetching deliveries...');
      const headers = getAuthHeader();
      console.log('Headers:', headers);
      
      const response = await axios.get(API_URL, { headers });
      return response.data;
    } catch (error) {
      console.error('Get deliveries error:', error);
      throw error;
    }
  }

  async getDeliveryById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Get delivery error:', error);
      throw error;
    }
  }

  async createDelivery(deliveryData) {
    try {
      console.log('Creating delivery...', deliveryData);
      const response = await axios.post(API_URL, deliveryData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Create delivery error:', error);
      throw error;
    }
  }

  async updateDelivery(id, deliveryData) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, deliveryData, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Update delivery error:', error);
      throw error;
    }
  }

  async deleteDelivery(id) {
    try {
      const response = await axios.delete(`${API_URL}/${id}`, {
        headers: getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Delete delivery error:', error);
      throw error;
    }
  }

  async optimizeRoute(deliveryId) {
    try {
      console.log('Optimizing route for delivery:', deliveryId);
      const response = await axios.post(
        `${API_URL}/${deliveryId}/optimize`,
        {},
        { headers: getAuthHeader() }
      );
       if (response.data.success) {
      const result = response.data.data;
      
      // Get coordinates for original route
      const originalCoords = result.originalRoute.stops.map(s => [s.lng, s.lat]);
      const originalRouteGeometry = await routingService.getRoute(originalCoords);
      
      // Get coordinates for optimized route
      const optimizedCoords = result.optimizedRoute.stops.map(s => [s.lng, s.lat]);
      const optimizedRouteGeometry = await routingService.getRoute(optimizedCoords);
      
      // Add geometry to response
      result.originalRoute.routeGeometry = originalRouteGeometry.geometry;
      result.optimizedRoute.routeGeometry = optimizedRouteGeometry.geometry;
      
      console.log('Route optimization complete with geometry');
      return response.data;
    }
      return response.data;
    } catch (error) {
      console.error('Optimize route error:', error);
      throw error;
    }
  }

  async applyOptimization(deliveryId, optimizedRoute) {
    try {
      console.log('Applying optimization...');
      const response = await axios.put(
        `${API_URL}/${deliveryId}/apply-optimization`,
        { optimizedRoute },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Apply optimization error:', error);
      throw error;
    }
  }
}

export default new DeliveryService();