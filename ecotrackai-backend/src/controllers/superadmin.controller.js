// ============================================================
// FILE: backend/src/controllers/superadmin.controller.js
// LAYER: Controller — Request handling & validation
// PURPOSE: HTTP endpoints for Super Admin operations
// ============================================================

const SuperAdminService = require('../services/superadmin.service');
const { sendSuccess, sendError } = require('../utils/response.utils');
const pool = require('../config/database');
const SuperAdminController = {

  /**
   * ===== BUSINESS REGISTRY ENDPOINTS =====
   */
  async getAllBusinesses(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await SuperAdminService.getAllBusinesses(req.user, parseInt(limit), parseInt(offset));
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
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
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
      sendSuccess(res, 200, 'Business retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getBusinessById]', error);
      sendError(res, 500, 'Failed to fetch business');
    }
  },

  async createBusiness(req, res) {
    try {
      const result = await SuperAdminService.createBusiness(req.user, req.body);
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
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
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
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
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
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
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
      sendSuccess(res, 200, 'Business reactivated successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.reactivateBusiness]', error);
      sendError(res, 500, 'Failed to reactivate business');
    }
  },

  /**
   * ===== USER MANAGEMENT ENDPOINTS =====
   */
  async getSuperAdmins(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await SuperAdminService.getSuperAdmins(req.user, parseInt(limit), parseInt(offset));
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
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
      const result = await SuperAdminService.getAdminsByBusiness(req.user, businessId, parseInt(limit), parseInt(offset));
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
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
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
      sendSuccess(res, 200, 'User deactivated successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.deactivateUser]', error);
      sendError(res, 500, 'Failed to deactivate user');
    }
  },

  /**
   * ===== SYSTEM HEALTH ENDPOINT =====
   */
  async getSystemHealth(req, res) {
    try {
      const result = await SuperAdminService.getSystemHealth(req.user);
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
      sendSuccess(res, 200, 'System health retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getSystemHealth]', error);
      sendError(res, 500, 'Failed to fetch system health');
    }
  },

  /**
   * ===== AUDIT LOG ENDPOINT =====
   */
  async getAuditLogs(req, res) {
    try {
      const { businessId, startDate, endDate, eventType, limit, offset } = req.query;
      const result = await SuperAdminService.getAuditLogs(req.user, {
        businessId: businessId ? parseInt(businessId) : undefined,
        startDate,
        endDate,
        eventType,
        limit: limit ? parseInt(limit) : 100,
        offset: offset ? parseInt(offset) : 0
      });
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
      sendSuccess(res, 200, 'Audit logs retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getAuditLogs]', error);
      sendError(res, 500, 'Failed to fetch audit logs');
    }
  },
  async getEcoTrustConfig(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM sustainable_actions ORDER BY action_id`
    );
    sendSuccess(res, 200, 'EcoTrust config retrieved', { config: rows });
  } catch (error) {
    sendError(res, 500, 'Failed to fetch EcoTrust config');
  }
},

async updateEcoTrustAction(req, res) {
  try {
    const { actionId } = req.params;
    const { points_value, action_name, action_category, description } = req.body;
    const { rows } = await pool.query(
      `UPDATE sustainable_actions
       SET points_value = $1, action_name = $2, action_category = $3, description = $4
       WHERE action_id = $5 RETURNING *`,
      [points_value, action_name, action_category, description, actionId]
    );
    if (!rows.length) return sendError(res, 404, 'Action not found');
    sendSuccess(res, 200, 'Action updated', { action: rows[0] });
  } catch (error) {
    sendError(res, 500, 'Failed to update action');
  }
},

  /**
   * ===== ANALYTICS ENDPOINT =====
   */
  async getCrossBusinessAnalytics(req, res) {
    try {
      const { timeRange = 30 } = req.query;
      const result = await SuperAdminService.getCrossBusinessAnalytics(req.user, parseInt(timeRange));
      
      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }
      
      sendSuccess(res, 200, 'Analytics retrieved successfully', result.data);
    } catch (error) {
      console.error('[SuperAdminController.getCrossBusinessAnalytics]', error);
      sendError(res, 500, 'Failed to fetch analytics');
    }
  }
};

module.exports = SuperAdminController;
