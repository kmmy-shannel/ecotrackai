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

  async login(credentials) {
    try {
      console.log('🔐 Logging in...');
      const response = await axios.post(`${API_URL}/login`, credentials);
      
      if (response.data.success && response.data.data.token) {
        console.log('✅ Login successful, storing token');
        
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

  // NEW: Send OTP to email
  async sendOTP(email) {
    try {
      console.log('📧 Sending OTP to:', email);
      const response = await axios.post(`${API_URL}/send-otp`, { email });
      console.log('✅ OTP sent successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      throw error;
    }
  }

  // NEW: Verify OTP code
  async verifyOTP(email, otp) {
    try {
      console.log('🔐 Verifying OTP for:', email);
      const response = await axios.post(`${API_URL}/verify-otp`, { email, otp });
      
      if (response.data.success && response.data.data.token) {
        // Store user and token after successful verification
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        localStorage.setItem('token', response.data.data.token);
      }
      
      console.log('✅ OTP verified successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      throw error;
    }
  }

  // NEW: Initiate forgot password process
  async forgotPassword(email) {
    try {
      console.log('🔑 Initiating password reset for:', email);
      const response = await axios.post(`${API_URL}/forgot-password`, { email });
      console.log('✅ Password reset email sent');
      return response.data;
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      throw error;
    }
  }

  // NEW: Reset password with token
  async resetPassword(token, newPassword) {
    try {
      console.log('🔐 Resetting password with token');
      const response = await axios.post(`${API_URL}/reset-password/${token}`, { 
        password: newPassword 
      });
      console.log('✅ Password reset successful');
      return response.data;
    } catch (error) {
      console.error('❌ Reset password error:', error);
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