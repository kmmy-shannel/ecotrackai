import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

class AuthService {
  async register(userData) {
    try {
      const response = await axios.post(`${API_URL}/register`, userData);
      
      if (response.data.success && response.data.data.token) {
        // Store both user and token
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        localStorage.setItem('token', response.data.data.token);
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async login(email, password) {
    try {
      console.log('🔐 Logging in...');
      const response = await axios.post(`${API_URL}/login`, { email, password });
      
      if (response.data.success && response.data.data.token) {
        console.log('✅ Login successful, storing token');
        
        // CRITICAL: Store both user and token
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        localStorage.setItem('token', response.data.data.token);
        
        console.log('Token stored:', localStorage.getItem('token') ? 'YES' : 'NO');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  logout() {
    console.log('🚪 Logging out, clearing localStorage');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

export default new AuthService();