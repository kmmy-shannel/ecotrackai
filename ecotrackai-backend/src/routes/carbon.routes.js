// FINAL FILE should look like this:
const { Router } = require('express');
const { 
  getCarbonFootprint,
  getMonthlyComparison,
  finalizeCarbonVerification
} = require('../controllers/carbon.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

// Get current month carbon footprint
router.get('/', authenticate, getCarbonFootprint);

// Get monthly comparison
router.get('/monthly', authenticate, getMonthlyComparison);

// Step 10: Only Sustainability Manager can verify carbon records
router.patch('/:id/verify', authenticate, authorize('sustainability_manager'), finalizeCarbonVerification);

module.exports = router;