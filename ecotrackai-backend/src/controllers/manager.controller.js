// ============================================================
// FILE LOCATION: backend/src/controllers/manager.controller.js
// LAYER: Controller (View) — HTTP handling ONLY
// No DB queries. No business logic. Only req/res.
// ============================================================

const ManagerService = require('../services/manager.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

// GET /api/managers
const getManagers = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const result = await ManagerService.getManagers(req.user.businessId);
    sendSuccess(res, 200, 'Managers retrieved successfully', result);

  } catch (error) {
    console.error('Get managers error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to retrieve managers');
  }
};

// POST /api/managers
const createManager = async (req, res) => {
  try {
    console.log('CREATING MANAGER ACCOUNT');
    console.log('Request by admin:', req.user.userId);
    console.log('Request data:', req.body);

    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const result = await ManagerService.createManager(req.user, req.body);

    console.log('MANAGER CREATION COMPLETED');
    sendSuccess(res, 201, 'Manager account created successfully', result);

  } catch (error) {
    console.error('CREATE MANAGER ERROR:', error);
    sendError(res, error.status || 500, error.message || 'Failed to create manager account');
  }
};

// PUT /api/managers/:managerId
const updateManager = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const result = await ManagerService.updateManager(
      req.user,
      req.params.managerId,
      req.body
    );
    sendSuccess(res, 200, 'Manager updated successfully', result);

  } catch (error) {
    console.error('Update manager error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to update manager');
  }
};

// DELETE /api/managers/:managerId
const deleteManager = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    await ManagerService.deleteManager(req.user, req.params.managerId);
    sendSuccess(res, 200, 'Manager account deactivated successfully');

  } catch (error) {
    console.error('Delete manager error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to delete manager');
  }
};

// POST /api/managers/:managerId/reset-password
const resetManagerPassword = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    await ManagerService.resetManagerPassword(
      req.user,
      req.params.managerId,
      req.body.newPassword
    );
    sendSuccess(res, 200, 'Password reset successfully');

  } catch (error) {
    console.error('Reset password error:', error);
    sendError(res, error.status || 500, error.message || 'Failed to reset password');
  }
};

module.exports = {
  getManagers,
  createManager,
  updateManager,
  deleteManager,
  resetManagerPassword
};