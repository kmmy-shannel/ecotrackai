// ============================================================
// FILE: backend/src/routes/superadmin.routes.js
// LAYER: Routes — URL → Controller mapping
// PURPOSE: All Super Admin endpoints
// ============================================================

const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const SuperAdminController = require('../controllers/superadmin.controller');
const RegistrationController = require('../controllers/registration.controller');

const router = Router();

// All Super Admin routes require authentication and super_admin role
router.use(authenticate);
router.use(authorize('super_admin'));

/**
 * ===== BUSINESS REGISTRY ROUTES =====
 */
router.get('/businesses', SuperAdminController.getAllBusinesses);

router.get('/businesses/:businessId', SuperAdminController.getBusinessById);

router.post(
  '/businesses',
  [
    body('businessName').notEmpty().withMessage('business_name is required'),
    body('businessType').notEmpty().withMessage('business_type is required'),
    body('registrationNumber').notEmpty().withMessage('registration_number is required'),
    body('address').optional(),
    body('contactEmail').optional({ checkFalsy: true }).isEmail().withMessage('contact_email must be valid email'),
    body('contactPhone').optional()
  ],
  validateRequest,
  SuperAdminController.createBusiness
);

router.put(
  '/businesses/:businessId',
  [
    body('businessName').optional().notEmpty().withMessage('business_name cannot be empty'),
    body('businessType').optional().notEmpty().withMessage('business_type cannot be empty'),
    body('address').optional(),
    body('contactEmail').optional({ checkFalsy: true }).isEmail().withMessage('contact_email must be valid email'),
    body('contactPhone').optional()
  ],
  validateRequest,
  SuperAdminController.updateBusiness
);

router.patch(
  '/businesses/:businessId/suspend',
  SuperAdminController.suspendBusiness
);

router.patch(
  '/businesses/:businessId/reactivate',
  SuperAdminController.reactivateBusiness
);

/**
 * ===== BUSINESS REGISTRATION APPROVAL ROUTES =====
 */
router.get('/registrations/pending', RegistrationController.getPendingBusinesses);

router.patch(
  '/businesses/:businessId/approve',
  [
    body('notes').optional().trim()
  ],
  validateRequest,
  RegistrationController.approvePendingBusiness
);
router.get('/ecotrust-config',          SuperAdminController.getEcoTrustConfig);
router.patch('/ecotrust-config/:actionId', SuperAdminController.updateEcoTrustAction);
router.patch(
  '/businesses/:businessId/reject',
  [
    body('reason')
      .trim()
      .notEmpty().withMessage('Rejection reason is required')
      .isLength({ min: 10 }).withMessage('Rejection reason must be at least 10 characters')
  ],
  validateRequest,
  RegistrationController.rejectPendingBusiness
);

/**
 * ===== USER MANAGEMENT ROUTES =====
 */
router.get('/users/super-admins', SuperAdminController.getSuperAdmins);

router.get('/businesses/:businessId/admins', SuperAdminController.getAdminsByBusiness);

router.patch('/users/:userId/deactivate', SuperAdminController.deactivateUser);

/**
 * ===== SYSTEM HEALTH ROUTE =====
 */
router.get('/health', SuperAdminController.getSystemHealth);

/**
 * ===== AUDIT LOG ROUTES =====
 */
router.get('/audit-logs', SuperAdminController.getAuditLogs);
// GET  /api/superadmin/flagged-transactions
router.get('/flagged-transactions', SuperAdminController.getFlaggedTransactions);
// PATCH /api/superadmin/flagged-transactions/:transactionId/dismiss
router.patch('/flagged-transactions/:transactionId/dismiss', SuperAdminController.dismissFlaggedTransaction);
/**
 * ===== ANALYTICS ROUTES =====
 */
router.get('/analytics', SuperAdminController.getCrossBusinessAnalytics);

module.exports = router;
