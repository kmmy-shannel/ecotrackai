import api from './api'; 

class AuthService { 
  async login(credentials) { 
    const response = await api.post('/auth/login', credentials); 
    if (response.data.success) { 
      localStorage.setItem('token', response.data.data.token); 
      localStorage.setItem('user', JSON.stringify(response.data.data.user)); 
    } 
    return response.data; 
  } 
 
  async register(data) { 
    const response = await api.post('/auth/register', data); 
    if (response.data.success) { 
      localStorage.setItem('token', response.data.data.token); 
      localStorage.setItem('user', JSON.stringify(response.data.data.user)); 
    } 
    return response.data; 
  } 
 
  async logout() { 
    await api.post('/auth/logout'); 
    localStorage.removeItem('token'); 
    localStorage.removeItem('user'); 
  } 
 
  async getProfile() { 
    const response = await api.get('/auth/profile'); 
    return response.data; 
  } 
 
  getCurrentUser() { 
    const userStr = localStorage.getItem('user'); 
    if (userStr) { 
      return JSON.parse(userStr); 
    } 
    return null; 
  } 
 
  isAuthenticated() { 
    return !!localStorage.getItem('token'); 
  } 
} 

const authService = new AuthService();
export default authService;