// ============================================================
// FILE: ecotrackai-backend/src/controllers/carbon.controller.js
// ============================================================
const CarbonService = require('../services/carbon.service');
const { sendSuccess, sendError } = require('../utils/response.utils');
const pool = require('../config/database');

// GET /api/carbon
const getCarbonFootprint = async (req, res) => {
  try {
    const result = await CarbonService.getCarbonFootprint(req.user);
    if (!result.success) return sendError(res, 400, result.error || 'Failed to calculate carbon footprint');
    return sendSuccess(res, 200, 'Carbon footprint calculated successfully', result.data);
  } catch (error) {
    return sendError(res, error.status || 500, error.message || 'Failed to calculate carbon footprint');
  }
};

// GET /api/carbon/monthly
const getMonthlyComparison = async (req, res) => {
  try {
    const result = await CarbonService.getMonthlyComparison(req.user);
    if (!result.success) return sendError(res, 400, result.error || 'Failed to get monthly comparison');
    return sendSuccess(res, 200, 'Monthly comparison retrieved', result.data);
  } catch (error) {
    return sendError(res, error.status || 500, error.message || 'Failed to get monthly comparison');
  }
};

// PATCH /api/carbon/:id/verify  (sustainability_manager only)
const finalizeCarbonVerification = async (req, res) => {
  try {
    const decision        = req.body?.decision;
    const notes           = req.body?.notes || '';
    const carbonRecordId  = req.params?.id;

    const result = await CarbonService.finalizeVerification(
      req.user,
      carbonRecordId,
      decision,
      notes
    );
    if (!result.success) return sendError(res, 400, result.error || 'Failed to finalize carbon verification');
    return sendSuccess(res, 200, 'Carbon verification finalized successfully', result);
  } catch (error) {
    return sendError(res, error.status || 500, error.message || 'Failed to finalize carbon verification');
  }
};

// GET /api/carbon/pending  (sustainability_manager only)
const getPendingVerifications = async (req, res) => {
  try {
    const result = await CarbonService.getPendingVerifications(req.user);
    if (!result.success) return sendError(res, 400, result.error);
    return sendSuccess(res, 200, 'Pending verifications retrieved', result.data);
  } catch (error) {
    return sendError(res, 500, 'Failed to get pending verifications');
  }
};

// GET /api/carbon/all  (sustainability_manager + admin)
const getAllCarbonRecords = async (req, res) => {
  try {
    const result = await CarbonService.getAllCarbonRecords(req.user);
    if (!result.success) return sendError(res, 400, result.error);
    return sendSuccess(res, 200, 'Carbon records retrieved', result.data);
  } catch (error) {
    return sendError(res, 500, 'Failed to get carbon records');
  }
};

// ─── PATCH /api/carbon/:id/resubmit  (admin only) ────────────────────────────
// Admin calls this after correcting the delivery log.
// Resets verification_status from 'revision_requested' back to 'pending'
// so the Sustainability Manager sees it again in their queue.
const resubmitCarbonRecord = async (req, res) => {
  try {
    const carbonRecordId  = req.params?.id;
    const notes           = req.body?.notes || '';
    const businessId      = req.user?.businessId || req.user?.business_id;

    if (!carbonRecordId) {
      return sendError(res, 400, 'Carbon record ID is required');
    }

    // Confirm the record exists, belongs to this business, and is currently revision_requested
    const check = await pool.query(
      `SELECT record_id, verification_status
       FROM carbon_footprint_records
       WHERE record_id = $1 AND business_id = $2`,
      [carbonRecordId, businessId]
    );

    if (check.rows.length === 0) {
      return sendError(res, 404, 'Carbon record not found or unauthorized');
    }

    const currentStatus = check.rows[0].verification_status;
    if (currentStatus !== 'revision_requested') {
      return sendError(
        res, 400,
        `Cannot resubmit — current status is '${currentStatus}'. Only 'revision_requested' records can be resubmitted.`
      );
    }

    // Reset to pending so Carlo sees it again
    await pool.query(
      `UPDATE carbon_footprint_records
       SET verification_status = 'pending',
           revision_notes = $1
       WHERE record_id = $2 AND business_id = $3`,
      [notes, carbonRecordId, businessId]
    );

    return sendSuccess(res, 200, 'Carbon record resubmitted for verification', {
      record_id: carbonRecordId,
      verification_status: 'pending',
      resubmitted_by: req.user?.userId || req.user?.user_id,
      notes,
    });
  } catch (error) {
    console.error('[carbon.controller.resubmitCarbonRecord]', error);
    return sendError(res, 500, 'Failed to resubmit carbon record');
  }
};

module.exports = {
  getCarbonFootprint,
  getMonthlyComparison,
  finalizeCarbonVerification,
  getPendingVerifications,
  getAllCarbonRecords,
  resubmitCarbonRecord,        // ← exported
};