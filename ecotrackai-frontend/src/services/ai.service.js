import axios from 'axios';

const BACKEND_API_URL = 'http://localhost:5000/api';

class AIService {
  getAuthHeader() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
  }

  async analyzeSpoilageRisk(product, storageData) {
    try {
      console.log('🤖 Calling AI spoilage analysis...');
      console.log('Product:', product);
      console.log('Storage data:', storageData);
      
      const response = await axios.post(
        `${BACKEND_API_URL}/ai/analyze-spoilage`,
        {
          product,
          storageData
        },
        {
          headers: this.getAuthHeader()
        }
      );

      console.log('AI response:', response.data);
      return response.data;
    } catch (error) {
      console.error('AI service error:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  }
}

export default new AIService();