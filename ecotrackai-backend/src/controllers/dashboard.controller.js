const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response.utils');
const aiService = require('../services/ai.service');

/**
 * Get dashboard AI insights
 */
const getDashboardInsights = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const { stats } = req.body;

    console.log('Generating AI insights for dashboard...');
    console.log('Stats received:', stats);

    // Generate AI insights
    const insights = await aiService.generateDashboardInsights(stats);

    sendSuccess(res, 200, 'AI insights generated successfully', insights);

  } catch (error) {
    console.error('Dashboard insights error:', error);
    sendError(res, 500, 'Failed to generate insights', error.message);
  }
};

module.exports = {
  getDashboardInsights
};