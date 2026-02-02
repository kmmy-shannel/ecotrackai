import axios from 'axios';
import authService from './auth.service';

const API_URL = 'http://localhost:5000/api/alerts';

class AlertService {
  getAuthHeader() {
    const token = authService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getAllAlerts() {
    const response = await axios.get(API_URL, {
      headers: this.getAuthHeader()
    });
    return response.data;
  }

  async getAlertsByRiskLevel(riskLevel) {
    const response = await axios.get(`${API_URL}/risk/${riskLevel}`, {
      headers: this.getAuthHeader()
    });
    return response.data;
  }

  async getAlertStats() {
    const response = await axios.get(`${API_URL}/stats`, {
      headers: this.getAuthHeader()
    });
    return response.data;
  }

  async createAlert(alertData) {
    const response = await axios.post(API_URL, alertData, {
      headers: this.getAuthHeader()
    });
    return response.data;
  }

  async updateAlertStatus(id, status) {
    const response = await axios.patch(`${API_URL}/${id}/status`, 
      { status },
      { headers: this.getAuthHeader() }
    );
    return response.data;
  }

  async deleteAlert(id) {
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: this.getAuthHeader()
    });
    return response.data;
  }
}

export default new AlertService();