const { Router } = require('express');
const {
  getAllAlerts,
  getAlertsByRiskLevel,
  createAlert,
  updateAlertStatus,
  deleteAlert,
  getAlertStats
} = require('../controllers/alert.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', authenticate, getAllAlerts);
router.get('/stats', authenticate, getAlertStats);
router.get('/risk/:riskLevel', authenticate, getAlertsByRiskLevel);
router.post('/', authenticate, createAlert);
router.patch('/:id/status', authenticate, updateAlertStatus);
router.delete('/:id', authenticate, deleteAlert);

module.exports = router;