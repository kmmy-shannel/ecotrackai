// ============================================================
// FILE LOCATION: backend/src/routes/manager.routes.js
// ============================================================

const { Router } = require('express');
const {
  getManagers,
  createManager,
  updateManager,
  deleteManager,
  resetManagerPassword,
  getLogisticsPending,
  getLogisticsHistory,
  getLogisticsStats,
  approveLogistics,
  declineLogistics,
  getInventoryPending,
  getInventoryHistory,
  approveInventory,
  declineInventory,
} = require('../controllers/manager.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation.middleware');

const router = Router();

// ── Validation rules ──────────────────────────────────────────────────────────
const createManagerValidation = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 5 }).withMessage('Username must be at least 5 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['inventory_manager', 'logistics_manager', 'sustainability_manager', 'driver'])
    .withMessage('Invalid role'),
];

const resetPasswordValidation = [
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// ── All routes require authentication ─────────────────────────────────────────
// authenticate is applied once here for all routes in this router.
router.use(authenticate);

// ── Admin-only: Manager CRUD ──────────────────────────────────────────────────
// authorize('admin') scoped only to these four routes.
router.get('/',                                              authorize('admin'),               getManagers);
router.post('/',   createManagerValidation, validateRequest, authorize('admin'),               createManager);
router.put('/:managerId',                                   authorize('admin'),               updateManager);

// ── Fix #1: DELETE route — properly wired to deleteManager controller ──────────
// authorize('admin') ensures only the Admin can deactivate manager accounts.
// The controller calls ManagerService.deleteManager which:
//   1. Verifies manager belongs to same business_id as the admin
//   2. Calls ManagerModel.deleteSessions → logs out the manager immediately
//   3. Calls ManagerModel.deactivate     → sets is_active = FALSE
router.delete('/:managerId',                                authorize('admin'),               deleteManager);

router.post('/:managerId/reset-password',
  resetPasswordValidation, validateRequest,                 authorize('admin'),               resetManagerPassword);

// ── Logistics Manager routes ──────────────────────────────────────────────────
// Both admin and logistics_manager can READ; only logistics_manager can APPROVE/DECLINE.
// Note: router.use(authenticate) above already covers auth for all routes below.
router.get('/logistics/pending',       authorize('logistics_manager', 'admin'), getLogisticsPending);
router.get('/logistics/history',       authorize('logistics_manager', 'admin'), getLogisticsHistory);
router.get('/logistics/stats',         authorize('logistics_manager', 'admin'), getLogisticsStats);
router.post('/logistics/:id/approve',  authorize('logistics_manager'),          approveLogistics);
router.post('/logistics/:id/decline',  authorize('logistics_manager'),          declineLogistics);

// ── Inventory Manager routes ──────────────────────────────────────────────────
router.get('/inventory/pending',       authorize('inventory_manager', 'admin'), getInventoryPending);
router.get('/inventory/history',       authorize('inventory_manager', 'admin'), getInventoryHistory);
router.post('/inventory/:id/approve',  authorize('inventory_manager'),          approveInventory);
router.post('/inventory/:id/decline',  authorize('inventory_manager'),          declineInventory);

module.exports = router;