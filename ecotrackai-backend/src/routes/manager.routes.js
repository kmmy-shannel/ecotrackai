const { Router } = require('express');
const {
  getManagers,
  createManager,
  updateManager,
  deleteManager,
  resetManagerPassword, getLogisticsPending, getLogisticsHistory, getLogisticsStats,
  approveLogistics, declineLogistics,
  getInventoryPending, getInventoryHistory,
  approveInventory, declineInventory,
} = require('../controllers/manager.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation.middleware');

const router = Router();

// Validation rules
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
    .withMessage('Invalid role')
];

const resetPasswordValidation = [
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Manager CRUD routes
router.get('/', getManagers);
router.post('/', createManagerValidation, validateRequest, createManager);
router.put('/:managerId', updateManager);
router.delete('/:managerId', deleteManager);
router.post('/:managerId/reset-password', resetPasswordValidation, validateRequest, resetManagerPassword);

router.get('/logistics/pending',      authenticate, authorize('logistics_manager', 'admin'), getLogisticsPending);
router.get('/logistics/history',      authenticate, authorize('logistics_manager', 'admin'), getLogisticsHistory);
router.get('/logistics/stats',        authenticate, authorize('logistics_manager', 'admin'), getLogisticsStats);
router.post('/logistics/:id/approve', authenticate, authorize('logistics_manager'),          approveLogistics);
router.post('/logistics/:id/decline', authenticate, authorize('logistics_manager'),          declineLogistics);

router.get('/inventory/pending',      authenticate, authorize('inventory_manager', 'admin'), getInventoryPending);
router.get('/inventory/history',      authenticate, authorize('inventory_manager', 'admin'), getInventoryHistory);
router.post('/inventory/:id/approve', authenticate, authorize('inventory_manager'),          approveInventory);
router.post('/inventory/:id/decline', authenticate, authorize('inventory_manager'),          declineInventory);
module.exports = router;