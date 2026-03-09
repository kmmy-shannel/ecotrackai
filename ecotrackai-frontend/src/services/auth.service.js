import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE_URL}/auth`;

class AuthService {
  _extractPayload(responseData) {
    if (!responseData || typeof responseData !== 'object') return null;

    // Supports:
    // { success, data: { user, token } }
    // { success, data: { success, data: { user, token } } }
    const level1 = responseData.data;
    if (level1 && typeof level1 === 'object') {
      const level2 = level1.data;
      if (level2 && typeof level2 === 'object' && (level2.user || level2.token)) {
        return level2;
      }
      if (level1.user || level1.token) {
        return level1;
      }
    }

    if (responseData.user || responseData.token) {
      return responseData;
    }

    return null;
  }

  _normalizeResponse(responseData) {
    return {
      ...(responseData || {}),
      data: this._extractPayload(responseData),
    };
  }

  _persistSession(payload) {
    if (!payload?.token || !payload?.user) return;
    localStorage.setItem('token', payload.token);
    localStorage.setItem('user', JSON.stringify(payload.user));
  }

  _clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async register(userData) {
    const response = await axios.post(`${API_URL}/register`, userData);
    return this._normalizeResponse(response.data);
  }

  async login(credentials) {
    const response = await axios.post(`${API_URL}/login`, credentials);
    const normalized = this._normalizeResponse(response.data);
    this._persistSession(normalized.data);
    return normalized;
  }

  async sendOTP(email) {
    const response = await axios.post(`${API_URL}/send-otp`, { email });
    return response.data;
  }

  async verifyOTP(email, otp) {
    const response = await axios.post(`${API_URL}/verify-otp`, { email, otp });
    const normalized = this._normalizeResponse(response.data);
    this._persistSession(normalized.data);
    return normalized;
  }

  async forgotPassword(email) {
    const response = await axios.post(`${API_URL}/forgot-password`, { email });
    return response.data;
  }

  async resetPassword(token, newPassword) {
    const response = await axios.post(`${API_URL}/reset-password/${token}`, {
      password: newPassword,
    });
    return response.data;
  }

  async logout() {
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await axios.post(
          `${API_URL}/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } finally {
      this._clearSession();
    }
  }

  getCurrentUser() {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }
}

export default new AuthService();
