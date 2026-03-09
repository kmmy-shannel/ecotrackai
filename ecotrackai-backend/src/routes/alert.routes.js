const { Router } = require('express');
const {
  syncAlertsFromProducts,
  getAllAlerts,
  getAlertStats,
  deleteAlert,
  updateAlertStatus,
  getAIInsights,
  submitAlertForApproval,
  generateAlerts,              // ← ADD THIS
} = require('../controllers/alert.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.post('/sync',     syncAlertsFromProducts);
router.post('/generate', generateAlerts);          // ← use the imported function directly
router.get('/',          getAllAlerts);
router.get('/stats',     getAlertStats);
router.post('/:id/submit',   authorize('admin'), submitAlertForApproval);
router.get('/:id/insights',  getAIInsights);
router.put('/:id/status',    updateAlertStatus);
router.delete('/:id',        deleteAlert);

module.exports = router;