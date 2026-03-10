const { Router } = require('express');
const router = Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');

const {
  getLogisticsPending, getLogisticsHistory, getLogisticsStats,
  approveLogistics, declineLogistics,
  getInventoryPending, getInventoryHistory,
  approveInventory, declineInventory,
} = require('../controllers/manager.controller');

// ── Logistics ─────────────────────────────────────────────────
router.get('/logistics/pending',
  authenticate, authorize('logistics_manager', 'admin'),
  getLogisticsPending
);
router.get('/logistics/history',
  authenticate, authorize('logistics_manager', 'admin'),
  getLogisticsHistory
);
router.get('/logistics/stats',
  authenticate, authorize('logistics_manager', 'admin'),
  getLogisticsStats
);
router.post('/logistics/:id/approve',
  authenticate, authorize('logistics_manager', 'admin'),
  approveLogistics
);
router.post('/logistics/:id/decline',
  authenticate, authorize('logistics_manager', 'admin'),
  declineLogistics
);

// ── Inventory ─────────────────────────────────────────────────
router.get('/inventory/pending',
  authenticate, authorize('inventory_manager', 'admin'),
  getInventoryPending
);
router.get('/inventory/history',
  authenticate, authorize('inventory_manager', 'admin'),
  getInventoryHistory
);
router.post('/inventory/:id/approve',
  authenticate, authorize('inventory_manager', 'admin'),
  approveInventory
);
router.post('/inventory/:id/decline',
  authenticate, authorize('inventory_manager', 'admin'),
  declineInventory
);

module.exports = router;