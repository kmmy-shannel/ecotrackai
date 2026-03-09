const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { sendSuccess, sendError } = require('../utils/response.utils');
const aiService = require('../services/ai.service');

// POST /api/ai/dashboard-insights
router.post('/dashboard-insights', authenticate, async (req, res) => {
  try {
    const { stats } = req.body;
    if (!stats) return sendError(res, 400, 'Stats data is required');

    const insights = await aiService.generateDashboardInsights(stats);
    sendSuccess(res, 200, 'Dashboard insights generated successfully', insights);

  } catch (error) {
    console.error('Dashboard insights error:', error);
    sendError(res, 500, 'Failed to generate dashboard insights', error.message);
  }
});

// POST /api/ai/analyze-spoilage
router.post('/analyze-spoilage', authenticate, async (req, res) => {
  try {
    const { product, storageData } = req.body;
    if (!product || !storageData) return sendError(res, 400, 'Product and storage data are required');

    console.log('Analyzing spoilage for:', product.product_name);

    const alertData = {
      product_name: product.product_name,
      risk_level: 'MEDIUM',
      days_left: product.shelf_life_days - storageData.daysInStorage,
      temperature: storageData.temperature,
      humidity: storageData.humidity,
      location: 'Storage',
      quantity: `${product.total_quantity} ${product.unit_of_measure}`,
      value: 0
    };

    const insights = await aiService.generateAlertInsights(alertData);

    const daysRemaining = product.shelf_life_days - storageData.daysInStorage;
    const riskPercentage = Math.min(100, Math.round((storageData.daysInStorage / product.shelf_life_days) * 100));

    res.json({
      success: true,
      data: {
        riskLevel: riskPercentage < 30 ? 'low' : riskPercentage < 70 ? 'medium' : 'high',
        riskPercentage,
        remainingShelfLife: Math.max(0, daysRemaining),
        riskFactors: insights.priority_actions || [],
        recommendations: insights.recommendations || [],
        summary: `Product has ${daysRemaining} days remaining with ${riskPercentage}% risk level.`
      }
    });

  } catch (error) {
    console.error('AI spoilage analysis error:', error);
    sendError(res, 500, 'Failed to analyze spoilage risk', error.message);
  }
});

// POST /api/ai/route-optimization
router.post('/route-optimization', authenticate, async (req, res) => {
  try {
    const { routeData } = req.body;
    if (!routeData) return sendError(res, 400, 'Route data is required');

    const result = await aiService.optimizeDeliveryRoute(routeData);
    sendSuccess(res, 200, 'Route optimization generated successfully', result);

  } catch (error) {
    console.error('Route optimization error:', error);
    sendError(res, 500, 'Failed to generate route optimization', error.message);
  }
});

module.exports = router;