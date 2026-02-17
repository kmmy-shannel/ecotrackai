import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/carbon`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

class CarbonService {
  // Get carbon footprint data calculated from deliveries
  async getCarbonFootprint() {
    try {
      const headers = getAuthHeader();
      const response = await axios.get(API_URL, { headers });
      return response.data;
    } catch (error) {
      console.error('Get carbon footprint error:', error);
      throw error;
    }
  }

  // Get monthly comparison
  async getMonthlyComparison() {
    try {
      const headers = getAuthHeader();
      const response = await axios.get(`${API_URL}/monthly`, { headers });
      return response.data;
    } catch (error) {
      console.error('Get monthly comparison error:', error);
      throw error;
    }
  }
}

export default new CarbonService();