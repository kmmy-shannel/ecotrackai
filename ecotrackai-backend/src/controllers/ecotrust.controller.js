// ============================================================
// FILE: ecotrackai-backend/src/controllers/ecotrust.controller.js
// ============================================================
const EcoTrustService = require('../services/ecotrust.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

const getScore = async (req, res) => {
  const businessId = req.user.businessId;
  const result = await EcoTrustService.getScore(businessId);
  result.success
    ? sendSuccess(res, 200, 'EcoTrust score retrieved', result.data)
    : sendError(res, 500, result.error);
};

const getSustainableActions = async (req, res) => {
  const businessId = req.user.businessId;
  const result = await EcoTrustService.getSustainableActions(businessId);
  result.success
    ? sendSuccess(res, 200, 'Sustainable actions retrieved', result.data)
    : sendError(res, 500, result.error);
};

module.exports = { getScore, getSustainableActions };
