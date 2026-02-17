const { Router } = require('express');
const { 
  getCarbonFootprint,
  getMonthlyComparison 
} = require('../controllers/carbon.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// Get current month carbon footprint
router.get('/', authenticate, getCarbonFootprint);

// Get monthly comparison
router.get('/monthly', authenticate, getMonthlyComparison);

module.exports = router;