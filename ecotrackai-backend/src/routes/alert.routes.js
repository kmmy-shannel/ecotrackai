const { Router } = require('express');
const {
  syncAlertsFromProducts,
  getAllAlerts,
  getAlertStats,
  deleteAlert,
  updateAlertStatus,
  getAIInsights
} = require('../controllers/alert.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// All routes require authentication
router.use(authenticate);

// Sync alerts from products (call this when products are added/updated)
router.post('/sync', syncAlertsFromProducts);

// Get all alerts
router.get('/', getAllAlerts);

// Get alert statistics
router.get('/stats', getAlertStats);

// Get AI insights for specific alert
router.get('/:id/insights', getAIInsights);

// Update alert status
router.put('/:id/status', updateAlertStatus);

// Delete alert
router.delete('/:id', deleteAlert);

module.exports = router;