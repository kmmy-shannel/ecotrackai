const DashboardService = require('../services/dashboard.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

// POST /api/dashboard/insights
const getDashboardInsights = async (req, res) => {
  try {
    // CRITICAL FIX-3: Validate request body and stats parameter
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }
    if (!req.body || typeof req.body !== 'object') {
      return sendError(res, 400, 'Request body is required');
    }
    if (!Array.isArray(req.body.stats) || req.body.stats.length === 0) {
      return sendError(res, 400, 'stats array is required and must not be empty');
    }

    const insights = await DashboardService.getDashboardInsights(req.body.stats);
    sendSuccess(res, 200, 'AI insights generated successfully', insights);

  } catch (error) {
    console.error('Dashboard insights error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to generate insights');
  }
};

module.exports = {
  getDashboardInsights
};