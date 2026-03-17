// ============================================================
// FILE: backend/src/controllers/superadmin.controller.js
// LAYER: Controller — Request handling
// PURPOSE: HTTP endpoints for Super Admin operations
// CHANGE FROM ORIGINAL: getEcoTrustConfig + updateEcoTrustAction
//   now route through SuperAdminModel instead of direct pool.query
//   so this file no longer imports pool at all.
// ============================================================

const SuperAdminService = require('../services/superadmin.service');
const SuperAdminModel   = require('../models/superadmin.model');
const { sendSuccess, sendError } = require('../utils/response.utils');

const SuperAdminController = {

  // ─── BUSINESS REGISTRY ────────────────────────────────────

  async getAllBusinesses(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await SuperAdminService.getAllBusinesses(
        req.user, parseInt(limit), parseInt(offset)
      );
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Businesses retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getAllBusinesses]', error);
      sendError(res, 500, 'Failed to fetch businesses');
    }
  },

  async getBusinessById(req, res) {
    try {
      const { businessId } = req.params;
      const result = await SuperAdminService.getBusinessById(req.user, businessId);
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Business retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getBusinessById]', error);
      sendError(res, 500, 'Failed to fetch business');
    }
  },

  async createBusiness(req, res) {
    try {
      const result = await SuperAdminService.createBusiness(req.user, req.body);
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 201, 'Business created successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.createBusiness]', error);
      sendError(res, 500, 'Failed to create business');
    }
  },

  async updateBusiness(req, res) {
    try {
      const { businessId } = req.params;
      const result = await SuperAdminService.updateBusiness(req.user, businessId, req.body);
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Business updated successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.updateBusiness]', error);
      sendError(res, 500, 'Failed to update business');
    }
  },

  async suspendBusiness(req, res) {
    try {
      const { businessId } = req.params;
      const result = await SuperAdminService.suspendBusiness(req.user, businessId);
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Business suspended successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.suspendBusiness]', error);
      sendError(res, 500, 'Failed to suspend business');
    }
  },

  async reactivateBusiness(req, res) {
    try {
      const { businessId } = req.params;
      const result = await SuperAdminService.reactivateBusiness(req.user, businessId);
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Business reactivated successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.reactivateBusiness]', error);
      sendError(res, 500, 'Failed to reactivate business');
    }
  },

  // ─── USER MANAGEMENT ─────────────────────────────────────

  async getSuperAdmins(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await SuperAdminService.getSuperAdmins(
        req.user, parseInt(limit), parseInt(offset)
      );
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Super admins retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getSuperAdmins]', error);
      sendError(res, 500, 'Failed to fetch super admins');
    }
  },

  async getAdminsByBusiness(req, res) {
    try {
      const { businessId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const result = await SuperAdminService.getAdminsByBusiness(
        req.user, businessId, parseInt(limit), parseInt(offset)
      );
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Business admins retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getAdminsByBusiness]', error);
      sendError(res, 500, 'Failed to fetch business admins');
    }
  },

  async deactivateUser(req, res) {
    try {
      const { userId } = req.params;
      const result = await SuperAdminService.deactivateUser(req.user, userId);
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'User deactivated successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.deactivateUser]', error);
      sendError(res, 500, 'Failed to deactivate user');
    }
  },

  // ─── SYSTEM HEALTH ────────────────────────────────────────

  async getSystemHealth(req, res) {
    try {
      const result = await SuperAdminService.getSystemHealth(req.user);
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'System health retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getSystemHealth]', error);
      sendError(res, 500, 'Failed to fetch system health');
    }
  },

  // ─── AUDIT LOGS ───────────────────────────────────────────

  async getAuditLogs(req, res) {
    try {
      const { businessId, startDate, endDate, eventType, limit, offset } = req.query;
      const result = await SuperAdminService.getAuditLogs(req.user, {
        businessId:  businessId ? parseInt(businessId) : undefined,
        startDate,
        endDate,
        eventType,
        limit:  limit  ? parseInt(limit)  : 100,
        offset: offset ? parseInt(offset) : 0
      });
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Audit logs retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getAuditLogs]', error);
      sendError(res, 500, 'Failed to fetch audit logs');
    }
  },

  // ─── ECOTRUST CONFIG ──────────────────────────────────────
  // FIX: was using pool.query directly — now uses SuperAdminModel
  // so the controller has no direct DB dependency

  async getEcoTrustConfig(req, res) {
    try {
      const config = await SuperAdminModel.getEcoTrustConfig();
      sendSuccess(res, 200, 'EcoTrust config retrieved', { config });
    } catch (error) {
      console.error('[SuperAdminController.getEcoTrustConfig]', error);
      sendError(res, 500, 'Failed to fetch EcoTrust config');
    }
  },

  async updateEcoTrustAction(req, res) {
    try {
      const { actionId } = req.params;
      const { points_value, action_name, action_category, description } = req.body;

      if (points_value === undefined) {
        return sendError(res, 400, 'points_value is required');
      }

      const updated = await SuperAdminModel.updateEcoTrustAction(actionId, {
        points_value,
        action_name,
        action_category,
        description
      });

      if (!updated) return sendError(res, 404, 'Action not found');
      sendSuccess(res, 200, 'Action updated', { action: updated });
    } catch (error) {
      console.error('[SuperAdminController.updateEcoTrustAction]', error);
      sendError(res, 500, 'Failed to update action');
    }
  },

  // ─── ANALYTICS ────────────────────────────────────────────

  async getCrossBusinessAnalytics(req, res) {
    try {
      const { timeRange = 30 } = req.query;
      const result = await SuperAdminService.getCrossBusinessAnalytics(
        req.user, parseInt(timeRange)
      );
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Analytics retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getCrossBusinessAnalytics]', error);
      sendError(res, 500, 'Failed to fetch analytics');
    }
  },
  async getFlaggedTransactions(req, res) {
    try {
      const result = await SuperAdminService.getFlaggedTransactions(req.user);
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Flagged transactions retrieved', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getFlaggedTransactions]', error);
      sendError(res, 500, 'Failed to fetch flagged transactions');
    }
  },
  async dismissFlaggedTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const result = await SuperAdminService.dismissFlaggedTransaction(req.user, transactionId);
      if (!result.success) return sendError(res, result.statusCode || 400, result.error);
      sendSuccess(res, 200, 'Transaction flag dismissed', result.data);
    } catch (error) {
      console.error('[SuperAdminController.dismissFlaggedTransaction]', error);
      sendError(res, 500, 'Failed to dismiss flag');
    }
  },  
};

module.exports = SuperAdminController;