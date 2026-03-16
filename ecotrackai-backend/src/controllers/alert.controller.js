// ============================================================
// FILE: ecotrackai-backend/src/controllers/alert.controller.js
// ============================================================
const AlertService = require('../services/alert.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

// POST /api/alerts/sync
const syncAlertsFromProducts = async (req, res) => {
  try {
    const syncedCount = await AlertService.syncAlertsFromProducts(req.user.businessId);
    sendSuccess(res, 200, `Successfully synced ${syncedCount} alerts from products`);
  } catch (error) {
    console.error('Sync alerts error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to sync alerts');
  }
};

// GET /api/alerts
const getAllAlerts = async (req, res) => {
  try {
    const result = await AlertService.getAllAlerts(req.user.businessId);
    sendSuccess(res, 200, 'Alerts retrieved successfully', result);
  } catch (error) {
    console.error('Get alerts error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to retrieve alerts');
  }
};

// GET /api/alerts/stats
const getAlertStats = async (req, res) => {
  try {
    const stats = await AlertService.getAlertStats(req.user.businessId);
    sendSuccess(res, 200, 'Stats retrieved successfully', stats);
  } catch (error) {
    console.error('Get stats error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to retrieve stats');
  }
};

// DELETE /api/alerts/:id
const deleteAlert = async (req, res) => {
  try {
    await AlertService.deleteAlert(req.params.id, req.user.businessId);
    sendSuccess(res, 200, 'Alert deleted successfully');
  } catch (error) {
    console.error('Delete alert error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to delete alert');
  }
};

// PATCH /api/alerts/:id/status
const updateAlertStatus = async (req, res) => {
  try {
    const result = await AlertService.updateAlertStatus(
      req.params.id,
      req.user.businessId,
      req.body.status,
      req.user
    );
    sendSuccess(res, 200, 'Alert status updated', result);
  } catch (error) {
    console.error('Update alert status error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to update alert status');
  }
};

// POST /api/alerts/:id/submit
const submitAlertForApproval = async (req, res) => {
  try {
    const result = await AlertService.submitAlertForApproval(
      req.params.id,
      req.user.businessId,
      req.user,
      req.body || {}
    );
    sendSuccess(res, 201, 'Alert submitted for approval', result);
  } catch (error) {
    console.error('Submit alert for approval error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to submit alert');
  }
};

// GET /api/alerts/:id/insights
const getAIInsights = async (req, res) => {
  try {
    const insights = await AlertService.getAIInsights(
      req.params.id,
      req.user.businessId
    );
    sendSuccess(res, 200, 'AI insights generated', insights);
  } catch (error) {
    console.error('Get AI insights error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to generate insights');
  }
};

// POST /api/alerts/generate
const generateAlerts = async (req, res) => {
  try {
    const result = await AlertService.generateAlertsForBusiness(req.user.businessId);
    sendSuccess(res, 200, 'Alerts generated', result);
  } catch (error) {
    sendError(res, 500, error.message || 'Failed to generate alerts');
  }
};

// GET /api/alerts/approved-batches
const getApprovedBatches = async (req, res) => {
  try {
    const result = await AlertService.getApprovedBatches(req.user.businessId);
    sendSuccess(res, 200, 'Approved batches retrieved', result);
  } catch (error) {
    console.error('Get approved batches error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to retrieve approved batches');
  }
};

module.exports = {
  syncAlertsFromProducts,
  getAllAlerts,
  getAlertStats,
  deleteAlert,
  updateAlertStatus,
  submitAlertForApproval,
  getAIInsights,
  generateAlerts,
  getApprovedBatches,
};