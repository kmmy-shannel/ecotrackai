const DashboardService = require('../services/dashboard.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

// POST /api/dashboard/insights
const getDashboardInsights = async (req, res) => {
  try {
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