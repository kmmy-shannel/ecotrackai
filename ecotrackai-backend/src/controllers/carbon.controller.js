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
    const correctedFuel   = req.body?.corrected_fuel_liters;   // ← new optional field
    const businessId      = req.user?.businessId || req.user?.business_id;
 
    if (!carbonRecordId) {
      return sendError(res, 400, 'Carbon record ID is required');
    }
 
    // Confirm record exists, belongs to this business, and is revision_requested
    const check = await pool.query(
      `SELECT 
         record_id, 
         verification_status,
         route_id,
         total_carbon_kg,
         transportation_carbon_kg
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
 
    const routeId = check.rows[0].route_id;
 
    // ── If admin provided a corrected fuel figure, recalculate CO2 ──────────
    const EMISSION_FACTOR = 2.68; // IPCC kg CO2 per liter of diesel
    let updateFields = `
      verification_status = 'pending',
      revision_notes      = $1
    `;
    let queryParams = [notes, carbonRecordId, businessId];
 
    if (correctedFuel && !isNaN(parseFloat(correctedFuel)) && parseFloat(correctedFuel) > 0) {
      const fuel           = parseFloat(correctedFuel);
      const correctedCarbon = parseFloat((fuel * EMISSION_FACTOR).toFixed(3));
 
      updateFields = `
        verification_status      = 'pending',
        revision_notes           = $1,
        transportation_carbon_kg = $4,
        total_carbon_kg          = $4,
        factors_used             = factors_used || $5::jsonb,
        is_actual                = FALSE
      `;
      queryParams = [
        notes,
        carbonRecordId,
        businessId,
        correctedCarbon,
        JSON.stringify({
          corrected_fuel_liters:   fuel,
          corrected_carbon_kg:     correctedCarbon,
          emission_factor:         EMISSION_FACTOR,
          corrected_by:            req.user?.userId || req.user?.user_id,
          corrected_at:            new Date().toISOString(),
        }),
      ];
 
      // Also update the delivery_logs table if a log exists for this route
      if (routeId) {
        try {
          await pool.query(
            `UPDATE delivery_logs
             SET actual_fuel_used_liters = $1,
                 actual_carbon_kg        = $2
             WHERE route_id = $3 AND business_id = $4`,
            [fuel, correctedCarbon, routeId, businessId]
          );
        } catch (logErr) {
          // Non-fatal — delivery_logs update failing should not block resubmission
          console.warn('[carbon.controller.resubmitCarbonRecord] delivery_logs update failed:', logErr.message);
        }
      }
    }
 
    // Build final query with correct number of params
    const resubmitQuery = correctedFuel
      ? `UPDATE carbon_footprint_records
         SET ${updateFields}
         WHERE record_id = $2 AND business_id = $3
         RETURNING record_id, verification_status, total_carbon_kg, transportation_carbon_kg`
      : `UPDATE carbon_footprint_records
         SET verification_status = 'pending', revision_notes = $1
         WHERE record_id = $2 AND business_id = $3
         RETURNING record_id, verification_status, total_carbon_kg, transportation_carbon_kg`;
 
    const result = await pool.query(resubmitQuery, queryParams);
 
    return sendSuccess(res, 200, 'Carbon record resubmitted for verification', {
      record_id:               result.rows[0].record_id,
      verification_status:     result.rows[0].verification_status,
      total_carbon_kg:         result.rows[0].total_carbon_kg,
      transportation_carbon_kg: result.rows[0].transportation_carbon_kg,
      fuel_corrected:          !!correctedFuel,
      resubmitted_by:          req.user?.userId || req.user?.user_id,
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