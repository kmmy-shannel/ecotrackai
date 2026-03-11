const { Router } = require('express');
const {
  getCarbonFootprint,
  getMonthlyComparison,
  finalizeCarbonVerification,
  getPendingVerifications,
  getAllCarbonRecords
} = require('../controllers/carbon.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

// IMPORTANT: specific routes must come BEFORE /:id routes
router.get('/pending', authenticate, authorize('sustainability_manager'), getPendingVerifications);
router.get('/all',     authenticate, authorize('sustainability_manager', 'admin'), getAllCarbonRecords);
router.get('/',        authenticate, getCarbonFootprint);
router.get('/monthly', authenticate, getMonthlyComparison);
router.patch('/:id/verify', authenticate, authorize('sustainability_manager'), finalizeCarbonVerification);

module.exports = router;