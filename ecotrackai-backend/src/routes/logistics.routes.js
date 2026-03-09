// ============================================================
// FILE: src/routes/logistics.routes.js
// ============================================================
const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  getPendingRoutes, getRouteHistory,
  approveRoute, declineRoute,
  getDriverMonitor, getLogisticsStats
} = require('../controllers/logistics.controller');

router.use(authenticate, authorize('logistics_manager', 'admin'));

router.get('/pending',        getPendingRoutes);
router.get('/history',        getRouteHistory);
router.get('/stats',          getLogisticsStats);
router.get('/driver-monitor', getDriverMonitor);
router.patch('/:approvalId/approve', approveRoute);
router.patch('/:approvalId/decline', declineRoute);

module.exports = router;