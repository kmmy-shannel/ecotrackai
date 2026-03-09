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
    const result = await CarbonService.getCarbonFootprint(req.user);
    if (!result.success) {
      return sendError(res, 400, result.error || 'Failed to calculate carbon footprint');
    }

    return sendSuccess(res, 200, 'Carbon footprint calculated successfully', result.data);

  } catch (error) {
    console.error('Carbon footprint error:', error);
    return sendError(res, error.status || 500, error.message || 'Failed to calculate carbon footprint');
  }
};

// GET /api/carbon/monthly
const getMonthlyComparison = async (req, res) => {
  try {
    const result = await CarbonService.getMonthlyComparison(req.user);
    if (!result.success) {
      return sendError(res, 400, result.error || 'Failed to get monthly comparison');
    }

    return sendSuccess(res, 200, 'Monthly comparison retrieved', result.data);

  } catch (error) {
    console.error('Monthly comparison error:', error);
    return sendError(res, error.status || 500, error.message || 'Failed to get monthly comparison');
  }
};

// PATCH /api/carbon/:id/verify
const finalizeCarbonVerification = async (req, res) => {
  try {
    const decision = req.body?.decision;
    const notes = req.body?.notes || '';
    const carbonRecordId = req.params?.id;

    const result = await CarbonService.finalizeVerification(
      req.user,
      carbonRecordId,
      decision,
      notes
    );

    if (!result.success) {
      return sendError(res, 400, result.error || 'Failed to finalize carbon verification');
    }

    return sendSuccess(res, 200, 'Carbon verification finalized successfully', result);
  } catch (error) {
    console.error('Finalize carbon verification error:', error);
    return sendError(res, error.status || 500, error.message || 'Failed to finalize carbon verification');
  }
};

module.exports = {
  getCarbonFootprint,
  getMonthlyComparison,
  finalizeCarbonVerification
};
