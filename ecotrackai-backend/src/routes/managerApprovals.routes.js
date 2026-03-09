// ============================================================
// FILE: src/routes/managerApprovals.routes.js  (NEW FILE)
// This is a SEPARATE file from manager.routes.js
// It does NOT inherit the router.use(authorize('admin')) guard
// Register in server.js as: app.use('/api/manager', require('./routes/managerApprovals.routes'))
// ============================================================
const { Router }  = require('express');
const router      = Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');

const {
  getLogisticsPending, getLogisticsHistory, getLogisticsStats,
  approveLogistics, declineLogistics,
  getInventoryPending, getInventoryHistory,
  approveInventory, declineInventory,
} = require('../controllers/manager.controller');

// ── Logistics Manager ────────────────────────────────────────
router.get(
  '/logistics/pending',
  authenticate, authorize('logistics_manager', 'admin'),
  getLogisticsPending
);
router.get(
  '/logistics/history',
  authenticate, authorize('logistics_manager', 'admin'),
  getLogisticsHistory
);
router.get(
  '/logistics/stats',
  authenticate, authorize('logistics_manager', 'admin'),
  getLogisticsStats
);
router.post(
  '/logistics/:id/approve',
  authenticate, authorize('logistics_manager'),
  approveLogistics
);
router.post(
  '/logistics/:id/decline',
  authenticate, authorize('logistics_manager'),
  declineLogistics
);

// ── Inventory Manager ────────────────────────────────────────
router.get(
  '/inventory/pending',
  authenticate, authorize('inventory_manager', 'admin'),
  getInventoryPending
);
router.get(
  '/inventory/history',
  authenticate, authorize('inventory_manager', 'admin'),
  getInventoryHistory
);
router.post(
  '/inventory/:id/approve',
  authenticate, authorize('inventory_manager'),
  approveInventory
);
router.post(
  '/inventory/:id/decline',
  authenticate, authorize('inventory_manager'),
  declineInventory
);

module.exports = router;