const { Router } = require('express');
const { 
  getCarbonFootprint,
  getMonthlyComparison,
  finalizeCarbonVerification
} = require('../controllers/carbon.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// Get current month carbon footprint
router.get('/', authenticate, getCarbonFootprint);

// Get monthly comparison
router.get('/monthly', authenticate, getMonthlyComparison);

// Verify or request revision for carbon record
router.patch('/:id/verify', authenticate, finalizeCarbonVerification);

module.exports = router;
