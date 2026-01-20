import api from './api';

class ManagerService {
  async getAllManagers() {
    try {
      console.log('Calling GET /managers');
      const response = await api.get('/managers');
      console.log('Get managers response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get managers error:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  }

  async createManager(managerData) {
    try {
      console.log('Calling POST /managers with data:', managerData);
      const response = await api.post('/managers', managerData);
      console.log('Create manager response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create manager error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      throw error;
    }
  }

  async updateManager(managerId, updateData) {
    try {
      console.log('Calling PUT /managers/' + managerId);
      const response = await api.put(`/managers/${managerId}`, updateData);
      console.log('Update manager response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Update manager error:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  }

  async deleteManager(managerId) {
    try {
      console.log('Calling DELETE /managers/' + managerId);
      const response = await api.delete(`/managers/${managerId}`);
      console.log('Delete manager response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete manager error:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  }

  async resetPassword(managerId, newPassword) {
    try {
      console.log('Calling POST /managers/' + managerId + '/reset-password');
      const response = await api.post(`/managers/${managerId}/reset-password`, {
        newPassword
      });
      console.log('Reset password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Reset password error:', error);
      console.error('Error response:', error.response);
      throw error;
    }
  }
}

export default new ManagerService();