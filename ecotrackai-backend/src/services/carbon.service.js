const CarbonModel = require('../models/carbon.model');
const AuditModel = require('../models/audit.model');
const ApprovalService = require('./approval.service');
const pool = require('../config/database');   // ADD THIS LINE

const CO2_PER_LITER = 2.31;
const ALLOWED_ROLES = new Set(['admin', 'sustainability_manager']);
const CARBON_TRANSITIONS = {
  pending: new Set(['verified', 'revision_requested']),
  verified: new Set([]),
  revision_requested: new Set(['pending']),
};

const CarbonService = {
  _ok(data = null) {
    return { success: true, data };
  },

  _fail(error) {
    return { success: false, error };
  },

  _isNil(value) {
    return value === null || value === undefined;
  },

  _canTransition(fromStatus, toStatus) {
    return Boolean(CARBON_TRANSITIONS[fromStatus]?.has(toStatus));
  },

  async _logInvalidTransition(ctx, payload) {
    try {
      await AuditModel.logInvalidStatusTransition({
        businessId: ctx?.businessId || null,
        userId: ctx?.userId || ctx?.user_id || null,
        role: ctx?.role || null,
        workflow: 'carbon',
        entityType: 'carbon_record',
        entityId: payload.recordId || null,
        fromStatus: payload.fromStatus,
        toStatus: payload.toStatus,
        reason: payload.reason || 'Illegal carbon status transition'
      });
    } catch (error) {
      console.error('[CarbonService._logInvalidTransition]', error);
    }
  },

  async _assertTransition(ctx, fromStatus, toStatus, recordId) {
    if (this._canTransition(fromStatus, toStatus)) return;
    await this._logInvalidTransition(ctx, {
      recordId,
      fromStatus,
      toStatus,
      reason: 'Skipped or illegal carbon stage'
    });
    throw {
      status: 400,
      message: `Invalid carbon status transition: ${fromStatus} -> ${toStatus}`
    };
  },

  _resolveContext(userOrBusinessId) {
    if (userOrBusinessId && typeof userOrBusinessId === 'object') {
      const userId = userOrBusinessId.userId || userOrBusinessId.user_id || null;
      const businessId = userOrBusinessId.businessId || userOrBusinessId.business_id;
      const role = userOrBusinessId.role;

      if (this._isNil(businessId) || this._isNil(role)) {
        return this._fail('Invalid user context');
      }
      if (!ALLOWED_ROLES.has(role)) {
        return this._fail('Not authorized to access carbon module');
      }
      return this._ok({ userId, businessId, role });
    }

    if (!this._isNil(userOrBusinessId)) {
      return this._ok({ userId: null, businessId: userOrBusinessId, role: 'admin', legacy: true });
    }

    return this._fail('businessId is required');
  },

  async getCarbonFootprint(userOrBusinessId) {
    try {
      const ctxResult = this._resolveContext(userOrBusinessId);
      if (!ctxResult.success) return ctxResult;
      const { businessId } = ctxResult.data;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const deliveriesResult = await CarbonModel.findDeliveriesByDateRange(
        businessId,
        firstDayOfMonth,
        lastDayOfMonth
      );
      if (!deliveriesResult.success) return deliveriesResult;
      const deliveries = deliveriesResult.data || [];

      let totalTrips = deliveries.length;
      let totalDistance = 0;
      let totalFuel = 0;
      let totalEmissions = 0;

      for (const delivery of deliveries) {
        totalDistance += parseFloat(delivery.total_distance) || 0;
        totalFuel += parseFloat(delivery.fuel_consumption) || 0;
        totalEmissions += parseFloat(delivery.carbon_emissions) || 0;
      }

      if (totalFuel === 0 && totalDistance > 0) {
        totalFuel = (totalDistance / 100) * 10;
        totalEmissions = totalFuel * CO2_PER_LITER;
      }

      const prevMonthResult = await CarbonModel.getMonthTotals(
        businessId,
        firstDayOfPrevMonth,
        lastDayOfPrevMonth
      );
      if (!prevMonthResult.success) return prevMonthResult;
      const prevMonth = prevMonthResult.data || {};

      const prevEmissions = parseFloat(prevMonth.total_emissions) || 0;
      const emissionsChange = prevEmissions > 0
        ? ((totalEmissions - prevEmissions) / prevEmissions * 100).toFixed(1)
        : 0;

      const result = {
        thisMonth: {
          totalEmissions: parseFloat(totalEmissions.toFixed(2)),
          deliveryTrips: totalTrips,
          distanceTraveled: parseFloat(totalDistance.toFixed(1)),
          litersOfFuelUsed: parseFloat(totalFuel.toFixed(1)),
          month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
        },
        comparison: {
          previousMonth: parseFloat(prevEmissions.toFixed(2)),
          change: parseFloat(emissionsChange),
          trend: parseFloat(emissionsChange) < 0 ? 'decreased'
            : parseFloat(emissionsChange) > 0 ? 'increased'
              : 'same'
        }
      };

      return this._ok(result);
    } catch (error) {
      console.error('[CarbonService.getCarbonFootprint]', error);
      return this._fail('Failed to calculate carbon footprint');
    }
  },

  async getMonthlyComparison(userOrBusinessId) {
    try {
      const ctxResult = this._resolveContext(userOrBusinessId);
      if (!ctxResult.success) return ctxResult;
      const { businessId } = ctxResult.data;

      const monthsData = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);

        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const totalsResult = await CarbonModel.getMonthTotals(businessId, firstDay, lastDay);
        if (!totalsResult.success) return totalsResult;
        const row = totalsResult.data || {};

        monthsData.push({
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          trips: parseInt(row.trip_count, 10) || 0,
          distance: (parseFloat(row.total_distance) || 0).toFixed(1),
          fuel: (parseFloat(row.total_fuel) || 0).toFixed(1),
          emissions: (parseFloat(row.total_emissions) || 0).toFixed(2)
        });
      }

      return this._ok({ months: monthsData });
    } catch (error) {
      console.error('[CarbonService.getMonthlyComparison]', error);
      return this._fail('Failed to get monthly comparison');
    }
  },

  async validateVerificationTransition(userOrBusinessId, currentStatus, targetStatus, recordId = null) {
    try {
      if (this._isNil(currentStatus) || this._isNil(targetStatus)) {
        return this._fail('currentStatus and targetStatus are required');
      }

      const ctxResult = this._resolveContext(userOrBusinessId);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      await this._assertTransition(ctx, currentStatus, targetStatus, recordId);
      return this._ok({ valid: true });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[CarbonService.validateVerificationTransition]', error);
      return this._fail('Failed to validate carbon transition');
    }
  },

  async finalizeVerification(userOrBusinessId, carbonRecordId, decision, notes = '') {
    try {
      if (this._isNil(carbonRecordId)) {
        return this._fail('carbonRecordId is required');
      }
      if (this._isNil(decision)) {
        return this._fail('decision is required');
      }

      const normalizedDecision = String(decision).trim().toLowerCase();
      if (!['verified', 'revision_requested'].includes(normalizedDecision)) {
        return this._fail("decision must be 'verified' or 'revision_requested'");
      }

      const ctxResult = this._resolveContext(userOrBusinessId);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (ctx.role !== 'sustainability_manager') {
        return this._fail('Only sustainability_manager can verify carbon records');
      }

      const recordResult = await CarbonModel.findVerificationRecordById(
        carbonRecordId,
        ctx.businessId
      );
      if (!recordResult.success) return recordResult;
      const record = recordResult.data || {};
      const currentStatus = String(
        record.verification_status || record.status || 'pending'
      ).trim().toLowerCase();

      if (currentStatus === 'verified') {
        await this._logInvalidTransition(ctx, {
          recordId: carbonRecordId,
          fromStatus: currentStatus,
          toStatus: normalizedDecision,
          reason: 'Prevented double verification'
        });
        return this._fail('Carbon record already verified');
      }

      if (currentStatus === 'revision_requested') {
        await this._logInvalidTransition(ctx, {
          recordId: carbonRecordId,
          fromStatus: currentStatus,
          toStatus: normalizedDecision,
          reason: 'Record already sent for revision'
        });
        return this._fail('Carbon record is already marked as revision_requested');
      }

      await this._assertTransition(
        ctx,
        currentStatus,
        normalizedDecision,
        carbonRecordId
      );

      const updateResult = await CarbonModel.updateVerificationStatus(
        carbonRecordId,
        ctx.businessId,
        normalizedDecision,
        ctx.userId,
        notes
      );
      if (!updateResult.success) return updateResult;

      const finalizationResult = await ApprovalService.finalizeCarbonVerification(
        {
          userId: ctx.userId,
          businessId: ctx.businessId,
          role: ctx.role
        },
        carbonRecordId,
        normalizedDecision,
        notes
      );
      if (!finalizationResult.success) return finalizationResult;
      if (normalizedDecision === 'verified') {
        try {
          // 1. Get delivery_id linked to this carbon record
          const carbonRow = await pool.query(
            `SELECT route_id FROM carbon_footprint_records WHERE record_id = $1`,
            [carbonRecordId]
          );
          const deliveryId = carbonRow.rows[0]?.route_id;

          if (deliveryId) {
            // 2. Find all pending ecotrust transactions for this delivery
            const pending = await pool.query(
              `SELECT * FROM ecotrust_transactions 
               WHERE related_record_id = $1 AND verification_status = 'pending'`,
              [String(deliveryId)]
            );

            // 3. Finalize each one and add points
            for (const tx of pending.rows) {
              await pool.query(
                `UPDATE ecotrust_transactions 
                 SET verification_status = 'verified' 
                 WHERE transaction_id = $1`,
                [tx.transaction_id]
              );

             // REPLACE WITH (correct column names):
await pool.query(
  `UPDATE ecotrust_scores
   SET current_score = current_score + $1,
       total_points_earned = total_points_earned + $1,
       last_updated = NOW()
   WHERE business_id = $2`,
  [tx.points_earned, tx.business_id]
);
            }

            // 4. Recalculate level based on new total
            // 4. Recalculate level based on new total
            const scoreRow = await pool.query(
              `SELECT current_score FROM ecotrust_scores WHERE business_id = $1`,
              [ctx.businessId]
            );
            const total = scoreRow.rows[0]?.current_score || 0;
            const newLevel = total >= 700 ? 'Eco Leader'
                           : total >= 300 ? 'Eco Champion'
                           : total >= 100 ? 'Eco Warrior'
                           : 'Newcomer';

            await pool.query(
              `UPDATE ecotrust_scores SET level = $1 WHERE business_id = $2`,
              [newLevel, ctx.businessId]
            );

          // Add carbon_verification points
          const carbonActionRow = await pool.query(
            `SELECT points_value FROM sustainable_actions
             WHERE action_category = 'carbon_verification'
             ORDER BY action_id DESC LIMIT 1`
          );
          const carbonPoints = carbonActionRow.rows[0]?.points_value || 20;

          await pool.query(
            `INSERT INTO ecotrust_transactions
               (business_id, action_type, points_earned, verification_status,
                related_record_type, related_record_id, created_at)
             VALUES ($1, 'carbon_verified', $2, 'verified', 'carbon_record', $3, NOW())`,
            [ctx.businessId, carbonPoints, carbonRecordId]
          );

          await pool.query(
            `UPDATE ecotrust_scores
             SET current_score = current_score + $1,
                 total_points_earned = total_points_earned + $1,
                 last_updated = NOW()
             WHERE business_id = $2`,
            [carbonPoints, ctx.businessId]
          );

          console.log(`[CarbonService] Released ${pending.rows.length} EcoTrust transactions for delivery ${deliveryId}`);
        }
        } catch (releaseErr) {
          // Non-fatal — carbon verification still succeeds even if points release fails
          console.error('[CarbonService] Failed to release EcoTrust points:', releaseErr.message);
        }
      }
      return this._ok({
        carbonRecordId,
        status: normalizedDecision,
        ...finalizationResult.data
      });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[CarbonService.finalizeVerification]', error);
      return this._fail('Failed to finalize carbon verification');
    }
  },
  async getPendingVerifications(user) {
    try {
      const businessId = user?.businessId || user?.business_id;
      if (!businessId) return { success: false, error: 'businessId required' };
      const records = await CarbonModel.getPendingVerifications(businessId);
      return { success: true, data: { records } };
    } catch (error) {
      console.error('[CarbonService.getPendingVerifications]', error);
      return { success: false, error: 'Failed to fetch pending verifications' };
    }
  },

  async getAllCarbonRecords(user) {
    try {
      const businessId = user?.businessId || user?.business_id;
      if (!businessId) return { success: false, error: 'businessId required' };
      const records = await CarbonModel.getAllByBusiness(businessId);
      return { success: true, data: { records } };
    } catch (error) {
      console.error('[CarbonService.getAllCarbonRecords]', error);
      return { success: false, error: 'Failed to fetch carbon records' };
    }
  },
};

module.exports = CarbonService;
