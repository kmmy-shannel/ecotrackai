// ============================================================
// FILE: backend/src/controllers/registration.controller.js
// LAYER: Controller — HTTP request handling
// PURPOSE: Registration endpoints (both flows)
// ============================================================

const RegistrationService = require('../services/registration.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

const RegistrationController = {

  /**
   * ===== FLOW A: SUPER ADMIN CREATE =====
   */
  async createBusinessAsSupAdmin(req, res) {
    try {
      const result = await RegistrationService.createBusinessAsSupAdmin(req.user, req.body);

      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }

      sendSuccess(res, 201, 'Business created successfully', result.data);
    } catch (error) {
      console.error('[RegistrationController.createBusinessAsSupAdmin]', error);
      sendError(res, 500, 'Failed to create business');
    }
  },

  /**
   * ===== FLOW B: SELF-REGISTRATION =====
   */
  async registerBusinessSelfService(req, res) {
    try {
      const result = await RegistrationService.registerBusinessSelfService(req.body);

      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }

      sendSuccess(res, 201, 'Business registered successfully', result.data);
    } catch (error) {
      console.error('[RegistrationController.registerBusinessSelfService]', error);
      sendError(res, 500, 'Failed to register business');
    }
  },

  /**
   * ===== APPROVAL =====
   */
  async approvePendingBusiness(req, res) {
    try {
      const { businessId } = req.params;
      const result = await RegistrationService.approvePendingBusiness(req.user, businessId);

      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }

      sendSuccess(res, 200, 'Business approved successfully', result.data);
    } catch (error) {
      console.error('[RegistrationController.approvePendingBusiness]', error);
      sendError(res, 500, 'Failed to approve business');
    }
  },

  /**
   * ===== REJECTION =====
   */
  async rejectPendingBusiness(req, res) {
    try {
      const { businessId } = req.params;
      const { reason } = req.body;
      const result = await RegistrationService.rejectPendingBusiness(req.user, businessId, reason);

      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }

      sendSuccess(res, 200, 'Business rejected successfully', result.data);
    } catch (error) {
      console.error('[RegistrationController.rejectPendingBusiness]', error);
      sendError(res, 500, 'Failed to reject business');
    }
  },

  /**
   * ===== PENDING BUSINESSES QUERY =====
   */
  async getPendingBusinesses(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await RegistrationService.getPendingBusinesses(
        req.user,
        parseInt(limit),
        parseInt(offset)
      );

      if (!result.success) {
        return sendError(res, result.statusCode || 400, result.error);
      }

      sendSuccess(res, 200, 'Pending businesses retrieved successfully', result.data);
    } catch (error) {
      console.error('[RegistrationController.getPendingBusinesses]', error);
      sendError(res, 500, 'Failed to fetch pending businesses');
    }
  }
};

module.exports = RegistrationController;
