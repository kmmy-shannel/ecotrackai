const { Router } = require('express');
const { getDashboardInsights } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get AI insights for dashboard
router.post('/ai-insights', getDashboardInsights);

module.exports = router;