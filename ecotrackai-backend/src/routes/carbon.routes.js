const { Router } = require('express');
const {
  getCarbonFootprint,
  getMonthlyComparison,
  finalizeCarbonVerification,
  getPendingVerifications,
  getAllCarbonRecords,
  resubmitCarbonRecord,        // ← NEW
} = require('../controllers/carbon.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

// IMPORTANT: specific routes must come BEFORE /:id routes
router.get('/pending',  authenticate, authorize('sustainability_manager'),          getPendingVerifications);
router.get('/all',      authenticate, authorize('sustainability_manager', 'admin'), getAllCarbonRecords);
router.get('/',         authenticate,                                                getCarbonFootprint);
router.get('/monthly',  authenticate,                                                getMonthlyComparison);

// Sustainability manager: verify or flag for correction
router.patch('/:id/verify',    authenticate, authorize('sustainability_manager'), finalizeCarbonVerification);

// Admin: resubmit a flagged record back to pending so Carlo can re-review it
router.patch('/:id/resubmit',  authenticate, authorize('admin'),                  resubmitCarbonRecord);

module.exports = router;