const CarbonModel = require('../models/carbon.model');
const AuditModel = require('../models/audit.model');
const ApprovalService = require('./approval.service');

const CO2_PER_LITER = 2.31;
const ALLOWED_ROLES = new Set(['admin', 'sustainability_manager']);
const CARBON_TRANSITIONS = {
  pending: new Set(['verified', 'revision_requested']),
  verified: new Set([]),
  revision_requested: new Set([])
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
  }
};

module.exports = CarbonService;
