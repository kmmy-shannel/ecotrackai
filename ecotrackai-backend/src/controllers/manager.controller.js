// ============================================================
// FILE LOCATION: backend/src/controllers/manager.controller.js
// LAYER: Controller — HTTP handling ONLY
// No DB queries. No business logic. Only req/res.
// ============================================================

const ManagerService = require('../services/manager.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

const resolveBusinessId = (user) => user?.businessId ?? user?.business_id ?? null;

// GET /api/managers
const getManagers = async (req, res) => {
  try {
    if (!req.user) return sendError(res, 401, 'Not authenticated');
    const businessId = resolveBusinessId(req.user);
    if (!businessId) return sendError(res, 400, 'businessId is required');

    const result = await ManagerService.getManagers(businessId);

    if (!result.success) return sendError(res, 400, result.error);
    sendSuccess(res, 200, 'Managers retrieved successfully', result.data);

  } catch (error) {
    console.error('Get managers error:', error);
    sendError(res, 500, 'Failed to retrieve managers');
  }
};

const createManager = async (req, res) => {
  try {
    if (!req.user) return sendError(res, 401, 'Not authenticated');

    const result = await ManagerService.createManager(req.user, req.body);

    if (!result.success) return sendError(res, 400, result.error);
    sendSuccess(res, 201, 'Manager account created successfully', result.data);

  } catch (error) {
    console.error('CREATE MANAGER ERROR:', error);
    sendError(res, 500, 'Failed to create manager account');
  }
};

const updateManager = async (req, res) => {
  try {
    if (!req.user) return sendError(res, 401, 'Not authenticated');

    const result = await ManagerService.updateManager(req.user, req.params.managerId, req.body);

    if (!result.success) return sendError(res, 400, result.error);
    sendSuccess(res, 200, 'Manager updated successfully', result.data);

  } catch (error) {
    console.error('Update manager error:', error);
    sendError(res, 500, 'Failed to update manager');
  }
};

// ── Fix #1: deleteManager — deactivates the account (soft delete) ─────────────
// Calls ManagerService.deleteManager which:
//   1. Verifies the manager belongs to this business
//   2. Calls ManagerModel.deleteSessions(managerId)  → logs them out immediately
//   3. Calls ManagerModel.deactivate(managerId)       → sets is_active = FALSE
// Hard deletion is intentionally avoided to preserve FK references in
// manager_approvals, ecotrust_transactions, and approval_history.
const deleteManager = async (req, res) => {
  try {
    if (!req.user) return sendError(res, 401, 'Not authenticated');

    const result = await ManagerService.deleteManager(req.user, req.params.managerId);

    if (!result.success) return sendError(res, 400, result.error);
    sendSuccess(res, 200, 'Manager account deactivated successfully', result.data);

  } catch (error) {
    console.error('Delete manager error:', error);
    sendError(res, 500, 'Failed to delete manager');
  }
};

const resetManagerPassword = async (req, res) => {
  try {
    if (!req.user) return sendError(res, 401, 'Not authenticated');

    const result = await ManagerService.resetManagerPassword(
      req.user, req.params.managerId, req.body.newPassword
    );

    if (!result.success) return sendError(res, 400, result.error);
    sendSuccess(res, 200, 'Password reset successfully', result.data);

  } catch (error) {
    console.error('Reset password error:', error);
    sendError(res, 500, 'Failed to reset password');
  }
};

// ── LOGISTICS APPROVALS ────────────────────────────────────────────────────────

const getLogisticsPending = async (req, res) => {
  try {
    const businessId = resolveBusinessId(req.user);
    const ManagerModel = require('../models/manager.model');
    const result = await ManagerModel.getLogisticsPending(businessId);
    result.success ? sendSuccess(res, 200, 'Pending retrieved', result.data)
                   : sendError(res, 400, result.error);
  } catch (error) {
    console.error('getLogisticsPending error:', error);
    sendError(res, 500, 'Failed to retrieve pending approvals');
  }
};

const getLogisticsHistory = async (req, res) => {
  try {
    const businessId = resolveBusinessId(req.user);
    const ManagerModel = require('../models/manager.model');
    const result = await ManagerModel.getLogisticsHistory(businessId);
    result.success ? sendSuccess(res, 200, 'History retrieved', result.data)
                   : sendError(res, 400, result.error);
  } catch (error) {
    console.error('getLogisticsHistory error:', error);
    sendError(res, 500, 'Failed to retrieve history');
  }
};

const getLogisticsStats = async (req, res) => {
  try {
    const businessId = resolveBusinessId(req.user);
    const ManagerModel = require('../models/manager.model');
    const result = await ManagerModel.getLogisticsStats(businessId);
    result.success ? sendSuccess(res, 200, 'Stats retrieved', result.data)
                   : sendError(res, 400, result.error);
  } catch (error) {
    console.error('getLogisticsStats error:', error);
    sendError(res, 500, 'Failed to retrieve stats');
  }
};

const approveLogistics = async (req, res) => {
  try {
    const businessId = resolveBusinessId(req.user);
    const reviewerId = req.user?.userId ?? req.user?.user_id;
    const ManagerModel = require('../models/manager.model');
    const result = await ManagerModel.approveLogistics(
      req.params.id, businessId, reviewerId, req.body.comment
    );
    result.success ? sendSuccess(res, 200, 'Route approved', result.data)
                   : sendError(res, 400, result.error);
  } catch (error) {
    console.error('approveLogistics error:', error);
    sendError(res, 500, 'Failed to approve route');
  }
};

const declineLogistics = async (req, res) => {
  try {
    const businessId = resolveBusinessId(req.user);
    const reviewerId = req.user?.userId ?? req.user?.user_id;
    const ManagerModel = require('../models/manager.model');
    const result = await ManagerModel.declineLogistics(
      req.params.id, businessId, reviewerId, req.body.comment
    );
    result.success ? sendSuccess(res, 200, 'Route declined', result.data)
                   : sendError(res, 400, result.error);
  } catch (error) {
    console.error('declineLogistics error:', error);
    sendError(res, 500, 'Failed to decline route');
  }
};

const getInventoryPending = async (req, res) => {
  try {
    const businessId = resolveBusinessId(req.user);
    const ManagerModel = require('../models/manager.model');
    const result = await ManagerModel.getInventoryPending(businessId);
    result.success ? sendSuccess(res, 200, 'Pending retrieved', result.data)
                   : sendError(res, 400, result.error);
  } catch (error) {
    console.error('getInventoryPending error:', error);
    sendError(res, 500, 'Failed to retrieve pending approvals');
  }
};

const getInventoryHistory = async (req, res) => {
  try {
    const businessId = resolveBusinessId(req.user);
    const ManagerModel = require('../models/manager.model');
    const result = await ManagerModel.getInventoryHistory(businessId);
    result.success ? sendSuccess(res, 200, 'History retrieved', result.data)
                   : sendError(res, 400, result.error);
  } catch (error) {
    console.error('getInventoryHistory error:', error);
    sendError(res, 500, 'Failed to retrieve history');
  }
};

const approveInventory = async (req, res) => {
  try {
    const businessId = resolveBusinessId(req.user);
    const reviewerId = req.user?.userId ?? req.user?.user_id;
    const ManagerModel = require('../models/manager.model');
    const result = await ManagerModel.approveInventory(
      req.params.id, businessId, reviewerId, req.body.comment
    );
    result.success ? sendSuccess(res, 200, 'Approved', result.data)
                   : sendError(res, 400, result.error);
  } catch (error) {
    console.error('approveInventory error:', error);
    sendError(res, 500, 'Failed to approve');
  }
};

const declineInventory = async (req, res) => {
  try {
    const businessId = resolveBusinessId(req.user);
    const reviewerId = req.user?.userId ?? req.user?.user_id;
    const ManagerModel = require('../models/manager.model');
    const result = await ManagerModel.declineInventory(
      req.params.id, businessId, reviewerId, req.body.comment
    );
    result.success ? sendSuccess(res, 200, 'Declined', result.data)
                   : sendError(res, 400, result.error);
  } catch (error) {
    console.error('declineInventory error:', error);
    sendError(res, 500, 'Failed to decline');
  }
};

module.exports = {
  getManagers,
  createManager,
  updateManager,
  deleteManager,
  resetManagerPassword,
  getLogisticsPending,
  getLogisticsHistory,
  getLogisticsStats,
  approveLogistics,
  declineLogistics,
  getInventoryPending,
  getInventoryHistory,
  approveInventory,
  declineInventory,
};