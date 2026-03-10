import axios from 'axios';
import authService from './auth.service';
import api from './api';  // ← ADD THIS ONE IMPORT

const API_URL = `${process.env.REACT_APP_API_URL}/alerts`;

class AlertService {
  // Get authorization headers
  getAuthHeader() {
    const token = authService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Sync alerts from products
  async syncAlerts() {
    try {
      const response = await axios.post(
        `${API_URL}/sync`,
        {},
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Sync alerts error:', error);
      throw error;
    }
  }

  // Get all alerts
  async getAllAlerts() {
    try {
      const response = await axios.get(API_URL, {
        headers: this.getAuthHeader(),
        params: { _t: Date.now() }
      });
      return response.data;
    } catch (error) {
      console.error('Get alerts error:', error);
      throw error;
    }
  }

  // Get alert statistics
  async getAlertStats() {
    try {
      const response = await axios.get(`${API_URL}/stats`, {
        headers: this.getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Get stats error:', error);
      throw error;
    }
  }

  // Get AI insights for an alert
  async getAIInsights(alertId) {
    try {
      const response = await axios.get(`${API_URL}/${alertId}/insights`, {
        headers: this.getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Get AI insights error:', error);
      throw error;
    }
  }

  // Update alert status
  async updateAlertStatus(alertId, status) {
    try {
      const response = await axios.put(
        `${API_URL}/${alertId}/status`,
        { status },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      console.error('Update alert status error:', error);
      throw error;
    }
  }

  // Delete alert
  async deleteAlert(alertId) {
    try {
      const response = await axios.delete(`${API_URL}/${alertId}`, {
        headers: this.getAuthHeader()
      });
      return response.data;
    } catch (error) {
      console.error('Delete alert error:', error);
      throw error;
    }
  }

  // Submit active alert for manager approval
  // ← REPLACED: now uses shared api instance so auth token is handled automatically
  async submitForApproval(alertId, body = {}) {
    try {
      const response = await api.post(`/alerts/${alertId}/submit`, body);
      return response.data;
    } catch (error) {
      console.error('Submit alert for approval error:', error);
      throw error;
    }
  }
}

export default new AlertService();