// FILE: src/services/logistics.service.js
// NEW FILE — calls all /api/logistics/ endpoints for the logistics manager dashboard

import api from './api';

const logisticsService = {
  getPending:       ()             => api.get('/logistics/pending'),
  getHistory:       ()             => api.get('/logistics/history'),
  getStats:         ()             => api.get('/logistics/stats'),
  getDriverMonitor: ()             => api.get('/logistics/driver-monitor'),
  approveRoute:     (id, body)     => api.patch(`/logistics/${id}/approve`, body),
  declineRoute:     (id, body)     => api.patch(`/logistics/${id}/decline`, body),
};

export default logisticsService;