import api from './api';

const getStoredRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.role || null;
  } catch (_error) {
    return null;
  }
};

const assertSuperAdmin = () => {
  if (getStoredRole() !== 'super_admin') {
    throw new Error('Only super_admin can modify catalog entries');
  }
};

const catalogService = {
  async getCatalog() {
    const response = await api.get('/catalog');
    return response.data;
  },

  async createFruit(payload) {
    assertSuperAdmin();
    const response = await api.post('/catalog', payload);
    return response.data;
  },

  async updateFruit(fruitId, payload) {
    assertSuperAdmin();
    const response = await api.put(`/catalog/${fruitId}`, payload);
    return response.data;
  },

  async deleteFruit(fruitId) {
    assertSuperAdmin();
    const response = await api.delete(`/catalog/${fruitId}`);
    return response.data;
  },
};

export default catalogService;
