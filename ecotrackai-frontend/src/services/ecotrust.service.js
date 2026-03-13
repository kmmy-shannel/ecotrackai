  // ============================================================
  // FILE: ecotrackai-frontend/src/services/ecotrust.service.js
  // ============================================================
  import axios from 'axios';

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const ecoTrustService = {
    // GET /api/ecotrust/score
    getScore: async () => {
      const res = await axios.get(`${API_URL}/ecotrust/score`, {
        headers: getAuthHeaders(),
      });
      return res.data;
    },

    // GET /api/ecotrust/actions
    getSustainableActions: async () => {
      const res = await axios.get(`${API_URL}/ecotrust/actions`, {
        headers: getAuthHeaders(),
      });
      return res.data;
    },
  };

  export default ecoTrustService;