// ============================================================
// FILE: src/services/ecotrust.service.js
// LAYER: Service — EcoTrust API calls
// ============================================================

import api from './api';

const ecotrustService = {
  getScore:        ()     => api.get('/ecotrust/score'),
  getTransactions: ()     => api.get('/ecotrust/transactions'),
  getLeaderboard:  ()     => api.get('/ecotrust/leaderboard'),
};

export default ecotrustService;