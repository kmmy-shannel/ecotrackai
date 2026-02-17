const aiService = require('./ai.service');

const DashboardService = {

  // Generate AI insights from dashboard stats
  // stats come from the frontend (already computed on client side)
  async getDashboardInsights(stats) {
    console.log('Generating AI insights for dashboard...');
    console.log('Stats received:', stats);

    // AI call preserved exactly — same as original controller
    const insights = await aiService.generateDashboardInsights(stats);
    return insights;
  }

};

module.exports = DashboardService;
