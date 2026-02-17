// ============================================================
// FILE LOCATION: backend/src/controllers/carbon.controller.js
// LAYER: Controller (View) — HTTP handling ONLY
// No DB queries. No business logic. Only req/res.
// ============================================================

const CarbonService = require('../services/carbon.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

// GET /api/carbon
const getCarbonFootprint = async (req, res) => {
  try {
    const result = await CarbonService.getCarbonFootprint(req.user.businessId);
    sendSuccess(res, 200, 'Carbon footprint calculated successfully', result);

  } catch (error) {
    console.error('Carbon footprint error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to calculate carbon footprint');
  }
};

// GET /api/carbon/monthly
const getMonthlyComparison = async (req, res) => {
  try {
    const result = await CarbonService.getMonthlyComparison(req.user.businessId);
    sendSuccess(res, 200, 'Monthly comparison retrieved', result);

  } catch (error) {
    console.error('Monthly comparison error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to get monthly comparison');
  }
};

module.exports = { getCarbonFootprint, getMonthlyComparison };