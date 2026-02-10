import axios from 'axios';
import authService from './auth.service';

const API_URL = 'http://localhost:5000/api/dashboard';

class DashboardService {
  // Get authorization headers
  getAuthHeader() {
    const token = authService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Get AI insights for dashboard
  async getDashboardInsights(stats) {
    try {
      console.log('📊 Requesting dashboard AI insights with stats:', stats);
      
      const response = await axios.post(
        `${API_URL}/ai-insights`,
        { stats },
        { headers: this.getAuthHeader() }
      );
      
      console.log('Dashboard AI insights received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Dashboard AI insights error:', error);
      throw error;
    }
  }
}

export default new DashboardService();