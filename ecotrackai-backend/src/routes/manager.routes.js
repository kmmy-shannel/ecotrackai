const { Router } = require('express');
const {
  getManagers,
  createManager,
  updateManager,
  deleteManager,
  resetManagerPassword
} = require('../controllers/manager.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation.middleware');

const router = Router();

// Validation rules
const createManagerValidation = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['inventory_manager', 'logistics_manager', 'sustainability_manager', 'finance_manager'])
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

module.exports = router;