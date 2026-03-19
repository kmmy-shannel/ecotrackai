const ApprovalModel = require('../models/approval.model');
const DeliveryModel = require('../models/delivery.model');
const AlertModel = require('../models/alert.model');
const AuditModel = require('../models/audit.model');
const pool          = require('../config/database');

const MANAGER_ROLES = new Set([
  'inventory_manager',
  'logistics_manager',
  'sustainability_manager'
]);

const ALL_ALLOWED_ROLES = new Set([
  'super_admin',
  'admin',
  'inventory_manager',
  'logistics_manager',
  'sustainability_manager',
  'driver'
]);

const APPROVAL_TRANSITIONS = {
  pending: new Set(['approved', 'rejected']),
  approved: new Set(['completed'])
};

const SPOILAGE_TRANSITIONS = {
  active: new Set(['pending_review']),
  pending_review: new Set(['approved', 'rejected']),
  approved: new Set(['resolved']),
  rejected: new Set(['resolved'])
};

const ROUTE_TRANSITIONS = {
  planned: new Set(['optimized']),
  optimized: new Set(['awaiting_approval']),
  awaiting_approval: new Set(['approved', 'optimized']),
  approved: new Set(['in_progress']),
  in_progress: new Set(['completed']),
  completed: new Set([])
};

const CARBON_TRANSITIONS = {
  pending: new Set(['verified', 'revision_requested']),
  verified: new Set([]),
  revision_requested: new Set([])
};

class ApprovalService {
  _ok(data = null) {
    return { success: true, data };
  }

  _fail(error) {
    return { success: false, error };
  }

  _isNil(value) {
    return value === null || value === undefined;
  }

  _normalizeStatus(status) {
    if (status === 'pending_admin') return 'pending';
    if (status === 'declined') return 'rejected';
    return status;
  }

  _canTransition(map, fromStatus, toStatus) {
    const from = this._normalizeStatus(fromStatus);
    const to = this._normalizeStatus(toStatus);
    return Boolean(map[from]?.has(to));
  }

  _sameId(a, b) {
    if (this._isNil(a) || this._isNil(b)) return false;
    return String(a) === String(b);
  }

  async _logInvalidTransition(ctx, payload) {
    try {
      await AuditModel.logInvalidStatusTransition({
        businessId: ctx?.businessId || null,
        userId: ctx?.userId || null,
        role: ctx?.role || null,
        workflow: payload.workflow,
        entityType: payload.entityType,
        entityId: payload.entityId,
        fromStatus: payload.fromStatus,
        toStatus: payload.toStatus,
        reason: payload.reason
      });
    } catch (error) {
      console.error('[ApprovalService._logInvalidTransition]', error);
    }
  }

  async _throwInvalidTransition(ctx, payload) {
    await this._logInvalidTransition(ctx, payload);
    throw {
      status: 400,
      message: `Invalid ${payload.workflow} status transition: ${payload.fromStatus} -> ${payload.toStatus}`
    };
  }

  async _assertTransition(ctx, map, workflow, fromStatus, toStatus, entityType, entityId) {
    if (this._canTransition(map, fromStatus, toStatus)) return;
    await this._throwInvalidTransition(ctx, {
      workflow,
      entityType,
      entityId,
      fromStatus,
      toStatus,
      reason: 'Illegal transition attempt'
    });
  }

  _extractUserContext(user) {
    if (!user || typeof user !== 'object') {
      return this._fail('User context is required');
    }

    const userId = user.userId || user.user_id;
    const businessId = user.businessId || user.business_id;
    const role = user.role;

    if (this._isNil(userId) || this._isNil(businessId) || this._isNil(role)) {
      return this._fail('Invalid user context');
    }

    if (!ALL_ALLOWED_ROLES.has(role)) {
      return this._fail('Invalid role');
    }

    return this._ok({ userId, businessId, role });
  }

  _resolveQueueRole(ctxRole, roleOverride) {
    if (!this._isNil(roleOverride)) {
      if (!MANAGER_ROLES.has(roleOverride)) {
        return this._fail('Invalid role override');
      }
      return this._ok(roleOverride);
    }

    if (ctxRole === 'admin') return this._ok(null);
    if (MANAGER_ROLES.has(ctxRole)) return this._ok(ctxRole);
    return this._fail('Role is not allowed to access approvals');
  }

  async _fetchApprovalByRole(approvalId, role, businessId) {
    const approvalResult = await ApprovalModel.findByIdAndRole(approvalId, role, businessId);
    if (!approvalResult.success) return approvalResult;
    return this._ok(approvalResult.data);
  }

  async _fetchApprovalById(approvalId, businessId) {
    const approvalResult = await ApprovalModel.findById(approvalId, businessId);
    if (!approvalResult.success) return approvalResult;
    return this._ok(approvalResult.data);
  }

  async _updateLinkedRecordsAfterDecision(approval, businessId, decisionStatus, ctx) {
    try {
      if (approval.approval_type === 'route_optimization' && approval.delivery_id) {
        const deliveryResult = await DeliveryModel.findById(approval.delivery_id, businessId);
        if (!deliveryResult.success) return deliveryResult;
        const currentRouteStatus = deliveryResult.data.status;

        if (decisionStatus === 'approved') {
          await this._assertTransition(
            ctx,
            ROUTE_TRANSITIONS,
            'route',
            currentRouteStatus,
            'approved',
            'delivery_route',
            approval.delivery_id
          );
          const routeUpdated = await DeliveryModel.updateStatus(approval.delivery_id, businessId, 'approved');
          if (!routeUpdated.success) return routeUpdated;
        } else {
          // CRITICAL FIX-5: Unlock inventory on route rejection to prevent inventory deadlock
          if (typeof ApprovalModel.unlockInventoryForRoute === 'function') {
            const unlockResult = await ApprovalModel.unlockInventoryForRoute(approval.delivery_id, businessId);
            if (!unlockResult.success) {
              console.error('[ApprovalService._updateLinkedRecordsAfterDecision] Failed to unlock inventory:', unlockResult.error);
              // Don't fail the whole operation if unlock fails, log and continue
            }
          }

          await this._assertTransition(
            ctx,
            ROUTE_TRANSITIONS,
            'route',
            currentRouteStatus,
            'optimized',
            'delivery_route',
            approval.delivery_id
          );
          const routeUpdated = await DeliveryModel.updateStatus(approval.delivery_id, businessId, 'optimized');
          if (!routeUpdated.success) return routeUpdated;
        }
      }

      if (approval.approval_type === 'spoilage_action' && approval.alert_id) {
        const alert = await AlertModel.findByIdAndBusiness(approval.alert_id, businessId);

        // Some alert submissions come from inventory-derived "pseudo alerts" that
        // are not persisted in the alerts table. Previously we returned a failure
        // here, which short-circuited EcoTrust point creation even though the
        // manager approval itself succeeded. To keep the approval flow resilient,
        // we now treat a missing alert record as non-blocking and simply skip the
        // status sync while still continuing with downstream actions (e.g. EcoTrust).
        if (!alert) {
          console.warn(`[ApprovalService._updateLinkedRecordsAfterDecision] Alert ${approval.alert_id} not found for business ${businessId}; skipping alert status sync.`);
        } else {
          await this._assertTransition(
            ctx,
            SPOILAGE_TRANSITIONS,
            'spoilage',
            alert.status,
            decisionStatus,
            'alert',
            approval.alert_id
          );

          let targetAlertStatus = decisionStatus;
          if (targetAlertStatus === 'rejected') {
            try {
              const rejectedUpdate = await AlertModel.updateStatusById(
                approval.alert_id,
                businessId,
                'rejected'
              );
              if (rejectedUpdate) {
                targetAlertStatus = 'rejected';
              } else {
                targetAlertStatus = 'declined';
              }
            } catch (error) {
              targetAlertStatus = 'declined';
            }
          }

          const alertUpdated = await AlertModel.updateStatusById(
            approval.alert_id,
            businessId,
            targetAlertStatus
          );

          // Do not block approval if the alert status row is missing; log for traceability.
          if (!alertUpdated) {
            console.warn(`[ApprovalService._updateLinkedRecordsAfterDecision] Failed to update alert ${approval.alert_id}; continuing without blocking approval.`);
          }
        }
      }

      return this._ok(true);
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService._updateLinkedRecordsAfterDecision]', error);
      return this._fail('Failed to update linked records');
    }
  }

  async _logApprovalHistoryIfAvailable(payload) {
    try {
      if (typeof ApprovalModel.createApprovalHistory === 'function') {
        const result = await ApprovalModel.createApprovalHistory(payload);
        if (result && result.success === false) return result;
      } else if (typeof ApprovalModel.logApprovalHistory === 'function') {
        const result = await ApprovalModel.logApprovalHistory(payload);
        if (result && result.success === false) return result;
      }
      return this._ok(true);
    } catch (error) {
      console.error('[ApprovalService._logApprovalHistoryIfAvailable]', error);
      return this._fail('Failed to log approval history');
    }
  }

  async _createEcoTrustTransactionIfAvailable(approval, businessId, actorUserId, actionType) {
    try {
      if (typeof ApprovalModel.createEcoTrustTransaction !== 'function') {
        return this._ok(true);
      }

      // ── Spoilage approvals ──────────────────────────────────────────────
      const isSpoilageApproval =
        approval?.approval_type === 'spoilage_action' ||
        approval?.approval_type === 'spoilage_alert' ||
        !this._isNil(approval?.alert_id);

      if (isSpoilageApproval) {
        console.log('[EcoTrust] Spoilage approval → create transaction');
        const payload = {
          businessId,
          actionId:           null,
          actionType:         'Spoilage Alert Approved',
          pointsEarned:       25, // fallback; table value used when present
          approvalId:         approval.approval_id,
          relatedRecordType:  'manager_approval',
          relatedRecordId:    approval.approval_id,
          verificationStatus: 'verified',
          actorUserId,
          source:             'approval_service'
        };

        const created = await ApprovalModel.createEcoTrustTransaction(payload);
        if (!created.success) {
          console.error('[EcoTrust] Spoilage transaction failed:', created.error);
          return created;
        }
        return this._ok(created.data);
      }

      // ── Route optimization approvals ─────────────────────────────────────
      const isRouteOptimization = approval?.approval_type === 'route_optimization';
      if (isRouteOptimization) {
        // Only award if admin ran AI optimization (route_optimizations row exists)
        try {
          const { rowCount: hasOpt } = await pool.query(
            `SELECT 1 FROM route_optimizations WHERE route_id = $1 LIMIT 1`,
            [approval.delivery_id]
          );
          if (hasOpt === 0) {
            console.log('[EcoTrust] Skipped route points: no AI optimization record for route', approval.delivery_id);
            return this._ok(true);
          }
        } catch (checkErr) {
          console.error('[EcoTrust] route_optimizations check failed:', checkErr.message);
          // Non-fatal: if we cannot verify, do not award to avoid false positives
          return this._ok(true);
        }

        // Avoid duplicate EcoTrust transaction for this route
        try {
          const { rowCount: existing } = await pool.query(
            `SELECT 1 FROM ecotrust_transactions
             WHERE business_id = $1
               AND related_record_type = 'delivery'
               AND related_record_id   = $2
               AND action_type         = 'Route Optimization Approved'
             LIMIT 1`,
            [businessId, approval.delivery_id]
          );
          if (existing > 0) {
            console.log('[EcoTrust] Skipped duplicate route transaction for', approval.delivery_id);
            return this._ok(true);
          }
        } catch (dupErr) {
          console.error('[EcoTrust] duplicate route tx check failed:', dupErr.message);
        }

        const payload = {
          businessId,
          actionId:           null,
          actionType:         'Route Optimization Approved',
          pointsEarned:       30, // fallback; sustainable_actions value preferred
          approvalId:         approval.approval_id,
          relatedRecordType:  'delivery',
          relatedRecordId:    approval.delivery_id,
          verificationStatus: 'pending',
          actorUserId,
          source:             'approval_service'
        };

        const created = await ApprovalModel.createEcoTrustTransaction(payload);
        if (!created.success) {
          console.error('[EcoTrust] Route transaction failed:', created.error);
          return created;
        }
        return this._ok(created.data);
      }

      // No EcoTrust side-effect for other approval types
      return this._ok(true);
    } catch (error) {
      console.error('[ApprovalService._createEcoTrustTransactionIfAvailable]', error);
      return this._fail('Failed to create EcoTrust transaction');
    }
  }
  async _notifyAdminsOnCarbonRevision(ctx, carbonRecordId, notes = '') {
    try {
      if (typeof ApprovalModel.findBusinessAdmins !== 'function') {
        return this._ok({ notifiedAdminCount: 0 });
      }

      const adminsResult = await ApprovalModel.findBusinessAdmins(ctx.businessId);
      if (!adminsResult.success) return adminsResult;
      const admins = adminsResult.data || [];

      let notifiedAdminCount = 0;
      for (const admin of admins) {
        if (typeof ApprovalModel.createApprovalHistory === 'function') {
          const historyResult = await ApprovalModel.createApprovalHistory({
            approvalId: null,
            businessId: ctx.businessId,
            actorUserId: ctx.userId,
            actorRole: ctx.role,
            action: 'carbon_revision_requested_admin_notified',
            notes,
            relatedRecordType: 'carbon_record',
            relatedRecordId: carbonRecordId,
            metadata: {
              target_admin_user_id: admin.user_id,
              target_admin_email: admin.email || null
            }
          });
          if (!historyResult.success) return historyResult;
        }
        notifiedAdminCount += 1;
      }

      return this._ok({ notifiedAdminCount });
    } catch (error) {
      console.error('[ApprovalService._notifyAdminsOnCarbonRevision]', error);
      return this._fail('Failed to notify admins on carbon revision request');
    }
  }

  async finalizeCarbonVerification(ctxLikeUser, carbonRecordId, decision, notes = '') {
    try {
      if (this._isNil(carbonRecordId)) {
        return this._fail('carbonRecordId is required');
      }
      if (!['verified', 'revision_requested'].includes(decision)) {
        return this._fail("Decision must be 'verified' or 'revision_requested'");
      }

      const ctxResult = this._extractUserContext(ctxLikeUser);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      // CRITICAL FIX-6: Add idempotency check - prevent duplicate verification processing
      // Query the carbon record to check its current verification status
      if (typeof ApprovalModel.getCarbonRecordById === 'function') {
        try {
          const existingRecord = await ApprovalModel.getCarbonRecordById(carbonRecordId, ctx.businessId);
          if (existingRecord.success && existingRecord.data) {
            const currentStatus = this._normalizeStatus(
              existingRecord.data.verification_status 
              || existingRecord.data.status
              || 'pending'
            );
            // If already verified and we're trying to verify again, return idempotent success
            if (currentStatus === 'verified' && decision === 'verified') {
              console.log(`[ApprovalService.finalizeCarbonVerification] Idempotent: carbon record ${carbonRecordId} already verified`);
              return this._ok({
                verificationStatus: 'verified',
                ecotrustFinalized: true,
                isIdempotent: true,
                message: 'Already verified - returning cached result'
              });
            }
            // If already in revision_requested and we request revision again, return idempotent success
            if (currentStatus === 'revision_requested' && decision === 'revision_requested') {
              console.log(`[ApprovalService.finalizeCarbonVerification] Idempotent: carbon record ${carbonRecordId} already in revision_requested`);
              return this._ok({
                verificationStatus: 'revision_requested',
                ecotrustFinalized: false,
                isIdempotent: true,
                message: 'Already in revision_requested - returning cached result'
              });
            }
          }
        } catch (statusCheckError) {
          console.warn('[ApprovalService.finalizeCarbonVerification] Status check failed, proceeding:', statusCheckError?.message);
          // Continue processing even if status check fails
        }
      }

      await this._assertCarbonTransition(ctx, 'pending', decision, carbonRecordId);

      // CRITICAL FIX-6: Log approval history for audit trail
      // If this is called again with verified status, return gracefully
      const historyResult = await this._logApprovalHistoryIfAvailable({
        approvalId: null,
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: decision === 'verified' ? 'carbon_verified' : 'carbon_revision_requested',
        notes,
        relatedRecordType: 'carbon_record',
        relatedRecordId: carbonRecordId
      });
      if (!historyResult.success) return historyResult;

      if (decision === 'revision_requested') {
        const notifyResult = await this._notifyAdminsOnCarbonRevision(ctx, carbonRecordId, notes);
        if (!notifyResult.success) return notifyResult;

        return this._ok({
          verificationStatus: 'revision_requested',
          ecotrustFinalized: false,
          adminNotification: notifyResult.data || { notifiedAdminCount: 0 }
        });
      }

      if (typeof ApprovalModel.createEcoTrustTransaction !== 'function') {
        return this._ok({
          verificationStatus: 'verified',
          ecotrustFinalized: false
        });
      }

      const createResult = await ApprovalModel.createEcoTrustTransaction({
        businessId: ctx.businessId,
        actionType: 'carbon_verified',
        relatedRecordType: 'carbon_record',
        relatedRecordId: carbonRecordId,
        verificationStatus: 'verified',
        actorUserId: ctx.userId,
        source: 'carbon_verification'
      });
      if (!createResult.success) return createResult;

      let transaction = createResult.data || null;
      const verificationStatus = this._normalizeStatus(
        transaction?.verification_status
        || (transaction?.is_verified === true ? 'verified' : transaction?.status)
        || 'pending'
      );

      if (verificationStatus !== 'verified') {
        const transactionId = transaction?.transaction_id || transaction?.id || null;
        if (!this._isNil(transactionId) && typeof ApprovalModel.verifyEcoTrustTransaction === 'function') {
          const verifyResult = await ApprovalModel.verifyEcoTrustTransaction({
            businessId: ctx.businessId,
            transactionId
          });
          if (!verifyResult.success) return verifyResult;
          transaction = {
            ...(transaction || {}),
            transaction_id: transactionId,
            verification_status: 'verified'
          };
        }
      }

      return this._ok({
        verificationStatus: 'verified',
        ecotrustFinalized: true,
        transaction
      });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.finalizeCarbonVerification]', error);
      return this._fail('Failed to finalize carbon verification');
    }
  }

  async _hasDuplicateQueueItemByAlert(businessId, alertId) {
    if (this._isNil(alertId)) return this._ok(false);
    const pending = await ApprovalModel.findByBusinessAndStatus(businessId, 'pending');
    if (!pending.success) return pending;
    const pendingAdmin = await ApprovalModel.findByBusinessAndStatus(businessId, 'pending_admin');
    if (!pendingAdmin.success) return pendingAdmin;
    const all = [...(pending.data || []), ...(pendingAdmin.data || [])];
    return this._ok(all.some((row) => this._sameId(row.alert_id, alertId)));
  }

  async _hasDuplicateQueueItemByDelivery(businessId, deliveryId) {
    if (this._isNil(deliveryId)) return this._ok(false);
    const pending = await ApprovalModel.findByBusinessAndStatus(businessId, 'pending');
    if (!pending.success) return pending;
    const pendingAdmin = await ApprovalModel.findByBusinessAndStatus(businessId, 'pending_admin');
    if (!pendingAdmin.success) return pendingAdmin;
    const all = [...(pending.data || []), ...(pendingAdmin.data || [])];
    return this._ok(all.some((row) => this._sameId(row.delivery_id, deliveryId)));
  }

  async _assertApprovalTransition(ctx, currentStatus, nextStatus, approvalId) {
    await this._assertTransition(
      ctx,
      APPROVAL_TRANSITIONS,
      'approval',
      currentStatus,
      nextStatus,
      'manager_approval',
      approvalId
    );
  }

  async _assertCarbonTransition(ctx, currentStatus, nextStatus, recordId) {
    await this._assertTransition(
      ctx,
      CARBON_TRANSITIONS,
      'carbon',
      currentStatus,
      nextStatus,
      'carbon_record',
      recordId
    );
  }

  async getApprovals(user, status = 'pending', roleOverride = null) {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      const roleResult = this._resolveQueueRole(ctx.role, roleOverride);
      if (!roleResult.success) return roleResult;
      const queueRole = roleResult.data;

      const rowsResult = queueRole
        ? await ApprovalModel.findByBusinessRoleAndStatus(ctx.businessId, queueRole, status)
        : await ApprovalModel.findByBusinessAndStatus(ctx.businessId, status);

      if (!rowsResult.success) return rowsResult;
      return this._ok({ approvals: rowsResult.data || [] });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.getApprovals]', error);
      return this._fail('Failed to get approvals');
    }
  }

  async getPendingCount(user, roleOverride = null) {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      const roleResult = this._resolveQueueRole(ctx.role, roleOverride);
      if (!roleResult.success) return roleResult;
      const queueRole = roleResult.data || 'inventory_manager';

      const countResult = await ApprovalModel.countPendingByBusinessAndRole(ctx.businessId, queueRole);
      if (!countResult.success) return countResult;
      return this._ok({ count: countResult.data || 0 });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.getPendingCount]', error);
      return this._fail('Failed to get pending count');
    }
  }

  async getApprovalHistory(user, limit = 50, roleOverride = null) {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      const roleResult = this._resolveQueueRole(ctx.role, roleOverride);
      if (!roleResult.success) return roleResult;
      const queueRole = roleResult.data || 'inventory_manager';

      const rowsResult = await ApprovalModel.findHistoryByBusinessAndRole(
        ctx.businessId,
        queueRole,
        limit
      );
      if (!rowsResult.success) return rowsResult;
      return this._ok({ history: rowsResult.data || [] });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.getApprovalHistory]', error);
      return this._fail('Failed to get approval history');
    }
  }

  async approveItem(user, approvalId, notes = '') {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (!MANAGER_ROLES.has(ctx.role)) {
        return this._fail('Only manager roles can approve items');
      }
      if (this._isNil(approvalId)) {
        return this._fail('approvalId is required');
      }

      const approvalResult = await this._fetchApprovalByRole(approvalId, ctx.role, ctx.businessId);
      if (!approvalResult.success) return approvalResult;
      const approval = approvalResult.data;

      if (!this._sameId(approval.business_id, ctx.businessId)) {
        return this._fail('Not found or unauthorized');
      }
      if (this._sameId(approval.submitted_by, ctx.userId)) {
        return this._fail('Self-approval is not allowed');
      }
      if (this._normalizeStatus(approval.status) === 'completed') {
        await this._throwInvalidTransition(ctx, {
          workflow: 'approval',
          entityType: 'manager_approval',
          entityId: approvalId,
          fromStatus: approval.status,
          toStatus: 'approved',
          reason: 'Prevented duplicate completion'
        });
      }
      if (['approved', 'rejected', 'declined'].includes(this._normalizeStatus(approval.status))) {
        await this._throwInvalidTransition(ctx, {
          workflow: 'approval',
          entityType: 'manager_approval',
          entityId: approvalId,
          fromStatus: approval.status,
          toStatus: 'approved',
          reason: 'Approval already decided'
        });
      }

      await this._assertApprovalTransition(ctx, approval.status, 'approved', approvalId);

      const updateResult = await ApprovalModel.updateStatusWithRole(
        approvalId,
        ctx.businessId,
        'approved',
        ctx.userId,
        notes,
        ctx.role
      );
      if (!updateResult.success) return updateResult;

      const linkedResult = await this._updateLinkedRecordsAfterDecision(
        approval,
        ctx.businessId,
        'approved',
        ctx
      );
      if (!linkedResult.success) return linkedResult;

      const historyResult = await this._logApprovalHistoryIfAvailable({
        approvalId,
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: 'approved',
        notes
      });
      if (!historyResult.success) return historyResult;

      const ecoTrustResult = await this._createEcoTrustTransactionIfAvailable(
        approval,
        ctx.businessId,
        ctx.userId,
        'approval_approved'
      );
      if (!ecoTrustResult.success) return ecoTrustResult;
      
      if (approval.approval_type === 'spoilage_action') {
        try {
          const extraData = typeof approval.extra_data === 'string'
            ? JSON.parse(approval.extra_data || '{}')
            : (approval.extra_data || {});
      
          const batchNumber = extraData.batchNumber || 'N/A';
          const draftName   = `DRAFT - ${approval.product_name} · Batch: ${batchNumber} · ${approval.quantity} kg`;
          const originObj   = JSON.stringify({ address: approval.location || 'Warehouse' });
      
          // Store approval_id so the admin can trace this draft back to the spoilage alert
          const draftMeta = JSON.stringify({
            from_approval_id: approval.approval_id,
            product_name:     approval.product_name,
            quantity:         approval.quantity,
            batch_number:     batchNumber,
            location:         approval.location || 'Warehouse',
            days_left:        approval.days_left,
            risk_level:       approval.risk_level,
            is_spoilage_draft: true
          });
      
          await pool.query(`
            INSERT INTO delivery_routes (
              business_id, route_name, status,
              origin_location, destination_location,
              vehicle_type,
              total_distance_km, estimated_duration_minutes,
              estimated_fuel_consumption_liters, estimated_carbon_kg,
              notes,
              created_at, updated_at
            ) VALUES (
              $1, $2, 'draft',
              $3, $3,
              'van',
              0, 0, 0, 0,
              $4,
              NOW(), NOW()
            )
          `, [ctx.businessId, draftName, originObj, draftMeta]);
      
          console.log(`[ApprovalService.approveItem] Draft delivery created for approval ${approval.approval_id}`);
        } catch (draftErr) {
          // Non-fatal — approval still succeeds even if draft creation fails
          console.error('[ApprovalService.approveItem] Draft creation failed (non-fatal):', draftErr.message);
        }
      }
      
      return this._ok({ approvalId, status: 'approved' });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.approveItem]', error);
      return this._fail('Failed to approve item');
    }
  }

  async rejectItem(user, approvalId, notes = '') {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (!MANAGER_ROLES.has(ctx.role)) {
        return this._fail('Only manager roles can reject items');
      }
      if (this._isNil(approvalId)) {
        return this._fail('approvalId is required');
      }

      const approvalResult = await this._fetchApprovalByRole(approvalId, ctx.role, ctx.businessId);
      if (!approvalResult.success) return approvalResult;
      const approval = approvalResult.data;

      if (!this._sameId(approval.business_id, ctx.businessId)) {
        return this._fail('Not found or unauthorized');
      }
      if (this._sameId(approval.submitted_by, ctx.userId)) {
        return this._fail('Self-approval is not allowed');
      }
      if (this._normalizeStatus(approval.status) === 'completed') {
        await this._throwInvalidTransition(ctx, {
          workflow: 'approval',
          entityType: 'manager_approval',
          entityId: approvalId,
          fromStatus: approval.status,
          toStatus: 'rejected',
          reason: 'Prevented duplicate completion'
        });
      }
      if (['approved', 'rejected', 'declined'].includes(this._normalizeStatus(approval.status))) {
        await this._throwInvalidTransition(ctx, {
          workflow: 'approval',
          entityType: 'manager_approval',
          entityId: approvalId,
          fromStatus: approval.status,
          toStatus: 'rejected',
          reason: 'Approval already decided'
        });
      }

      await this._assertApprovalTransition(ctx, approval.status, 'rejected', approvalId);

      const updateResult = await ApprovalModel.updateStatusWithRole(
        approvalId,
        ctx.businessId,
        'rejected',
        ctx.userId,
        notes,
        ctx.role
      );
      if (!updateResult.success) return updateResult;

      const linkedResult = await this._updateLinkedRecordsAfterDecision(
        approval,
        ctx.businessId,
        'rejected',
        ctx
      );
      if (!linkedResult.success) return linkedResult;

      const historyResult = await this._logApprovalHistoryIfAvailable({
        approvalId,
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: 'rejected',
        notes
      });
      if (!historyResult.success) return historyResult;

      return this._ok({ approvalId, status: 'rejected' });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.rejectItem]', error);
      return this._fail('Failed to reject item');
    }
  }

  async createFromAlert(user, body) {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (ctx.role !== 'admin') {
        return this._fail('Only admins can create approvals from alerts');
      }
      if (!body || typeof body !== 'object') {
        return this._fail('Request body is required');
      }
      if (this._isNil(body.productName)) {
        return this._fail('productName is required');
      }

      const requiredRole = body.requiredRole || 'inventory_manager';
      if (!MANAGER_ROLES.has(requiredRole)) {
        return this._fail('Invalid required role');
      }

      const duplicateResult = await this._hasDuplicateQueueItemByAlert(ctx.businessId, body.alertId);
      if (!duplicateResult.success) return duplicateResult;
      if (duplicateResult.data === true) {
        return this._fail('Duplicate approval action is not allowed');
      }

      if (!this._isNil(body.alertId)) {
        const alert = await AlertModel.findByIdAndBusiness(body.alertId, ctx.businessId);
        if (!alert) return this._fail('Not found or unauthorized');
        await this._assertTransition(
          ctx,
          SPOILAGE_TRANSITIONS,
          'spoilage',
          alert.status,
          'pending_review',
          'alert',
          body.alertId
        );
      }

      const createResult = await ApprovalModel.create({
        businessId: ctx.businessId,
        productName: body.productName,
        quantity: body.quantity || 'N/A',
        location: body.location || 'N/A',
        daysLeft: body.daysLeft || 0,
        riskLevel: body.riskLevel || 'MEDIUM',
        aiSuggestion: body.aiSuggestion || '',
        priority: body.priority || 'MEDIUM',
        requiredRole,
        approvalType: body.approvalType || 'spoilage_action',
        submittedBy: ctx.userId,
        alertId: body.alertId || null,
        extraData: body.batchNumber ? { batchNumber: body.batchNumber } : null
      });
      if (!createResult.success) return createResult;

      if (!this._isNil(body.alertId)) {
        const alertUpdated = await AlertModel.updateStatusById(body.alertId, ctx.businessId, 'pending_review');
        if (!alertUpdated) return this._fail('Not found or unauthorized');
      }

      const historyResult = await this._logApprovalHistoryIfAvailable({
        approvalId: createResult.data.approval_id,
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: 'submitted',
        notes: body.manager_comment || ''
      });
      if (!historyResult.success) return historyResult;

      return this._ok({ approval: createResult.data });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.createFromAlert]', error);
      return this._fail('Failed to create approval from alert');
    }
  }

  async requestAdminReview(user, approvalId, managerComment = '') {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (!MANAGER_ROLES.has(ctx.role)) {
        return this._fail('Only manager roles can escalate to admin');
      }
      if (this._isNil(approvalId)) {
        return this._fail('approvalId is required');
      }

      const approvalResult = await this._fetchApprovalByRole(approvalId, ctx.role, ctx.businessId);
      if (!approvalResult.success) return approvalResult;
      const approval = approvalResult.data;

      if (!this._sameId(approval.business_id, ctx.businessId)) {
        return this._fail('Not found or unauthorized');
      }
      if (approval.status !== 'pending') {
        await this._throwInvalidTransition(ctx, {
          workflow: 'approval',
          entityType: 'manager_approval',
          entityId: approvalId,
          fromStatus: approval.status,
          toStatus: 'pending_admin',
          reason: 'Escalation is only allowed from pending state'
        });
      }

      const updateResult = await ApprovalModel.requestAdminReview(
        approvalId,
        ctx.businessId,
        managerComment
      );
      if (!updateResult.success) return updateResult;

      const historyResult = await this._logApprovalHistoryIfAvailable({
        approvalId,
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: 'escalated_to_admin',
        notes: managerComment
      });
      if (!historyResult.success) return historyResult;

      return this._ok({ message: 'Request sent to admin' });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.requestAdminReview]', error);
      return this._fail('Failed to escalate to admin');
    }
  }

  async getAdminRequests(user) {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (ctx.role !== 'admin') {
        return this._fail('Only admins can view escalated requests');
      }

      const requestsResult = await ApprovalModel.findAdminRequests(ctx.businessId);
      if (!requestsResult.success) return requestsResult;
      return this._ok({ requests: requestsResult.data || [] });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.getAdminRequests]', error);
      return this._fail('Failed to get admin requests');
    }
  }

  async adminReviewRequest(user, approvalId, decision, adminComment = '') {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (ctx.role !== 'admin') {
        return this._fail('Only admins can review escalated requests');
      }
      if (this._isNil(approvalId) || this._isNil(decision)) {
        return this._fail('approvalId and decision are required');
      }
      if (!['approved', 'declined', 'rejected'].includes(decision)) {
        return this._fail("Decision must be 'approved' or 'rejected'");
      }

      const normalizedDecision = decision === 'declined' ? 'rejected' : decision;

      const approvalResult = await this._fetchApprovalById(approvalId, ctx.businessId);
      if (!approvalResult.success) return approvalResult;
      const approval = approvalResult.data;

      if (!this._sameId(approval.business_id, ctx.businessId)) {
        return this._fail('Not found or unauthorized');
      }
      if (this._sameId(approval.submitted_by, ctx.userId)) {
        return this._fail('Self-approval is not allowed');
      }
      if (approval.status !== 'pending_admin') {
        await this._throwInvalidTransition(ctx, {
          workflow: 'approval',
          entityType: 'manager_approval',
          entityId: approvalId,
          fromStatus: approval.status,
          toStatus: normalizedDecision,
          reason: 'Admin review is only allowed from pending_admin state'
        });
      }

      await this._assertApprovalTransition(ctx, approval.status, normalizedDecision, approvalId);

      const reviewResult = await ApprovalModel.adminReviewRequest(
        approvalId,
        ctx.businessId,
        normalizedDecision,
        adminComment,
        ctx.userId
      );
      if (!reviewResult.success) return reviewResult;

      const linkedResult = await this._updateLinkedRecordsAfterDecision(
        approval,
        ctx.businessId,
        normalizedDecision,
        ctx
      );
      if (!linkedResult.success) return linkedResult;

      const historyResult = await this._logApprovalHistoryIfAvailable({
        approvalId,
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: normalizedDecision,
        notes: adminComment
      });
      if (!historyResult.success) return historyResult;

      if (normalizedDecision === 'approved') {
        const ecoTrustResult = await this._createEcoTrustTransactionIfAvailable(
          approval,
          ctx.businessId,
          ctx.userId,
          'approval_approved_by_admin'
        );
        if (!ecoTrustResult.success) return ecoTrustResult;
      }

      return this._ok({ message: `Request ${normalizedDecision} by admin` });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.adminReviewRequest]', error);
      return this._fail('Failed to submit admin review');
    }
  }

  async createFromDelivery(user, body) {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (ctx.role !== 'admin') {
        return this._fail('Only admins can create route approvals');
      }
      if (!body || typeof body !== 'object') {
        return this._fail('Request body is required');
      }
      if (this._isNil(body.delivery_id)) {
        return this._fail('delivery_id is required');
      }

      const deliveryOwnership = await DeliveryModel.findById(body.delivery_id, ctx.businessId);
      if (!deliveryOwnership.success) return deliveryOwnership;
      const delivery = deliveryOwnership.data;

      await this._assertTransition(
        ctx,
        ROUTE_TRANSITIONS,
        'route',
        delivery.status,
        'awaiting_approval',
        'delivery_route',
        body.delivery_id
      );

      const duplicateResult = await this._hasDuplicateQueueItemByDelivery(ctx.businessId, body.delivery_id);
      if (!duplicateResult.success) return duplicateResult;
      if (duplicateResult.data === true) {
        return this._fail('Duplicate approval action is not allowed');
      }

      let extraData = body.extra_data;
      if (typeof extraData === 'object') {
        extraData = JSON.stringify(extraData);
      }

      const createResult = await ApprovalModel.create({
        businessId: ctx.businessId,
        productName: 'Route Optimization',
        quantity: 'N/A',
        location: 'Warehouse',
        daysLeft: 0,
        riskLevel: 'MEDIUM',
        aiSuggestion: '',
        priority: 'MEDIUM',
        requiredRole: 'logistics_manager',
        approvalType: 'route_optimization',
        submittedBy: ctx.userId,
        extraData: extraData || null,
        deliveryId: body.delivery_id
      });
      if (!createResult.success) return createResult;

      const statusResult = await DeliveryModel.updateStatus(
        body.delivery_id,
        ctx.businessId,
        'awaiting_approval'
      );
      if (!statusResult.success) return statusResult;

      const historyResult = await this._logApprovalHistoryIfAvailable({
        approvalId: createResult.data.approval_id,
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: 'submitted',
        notes: ''
      });
      if (!historyResult.success) return historyResult;

      return this._ok({ approval: createResult.data });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.createFromDelivery]', error);
      return this._fail('Failed to create route approval');
    }
  }

  async validateCarbonTransition(user, currentStatus, targetStatus, carbonRecordId = null) {
    try {
      const ctxResult = this._extractUserContext(user);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      await this._assertCarbonTransition(
        ctx,
        currentStatus,
        targetStatus,
        carbonRecordId || 'unknown'
      );
      return this._ok({ valid: true });
    } catch (error) {
      if (error?.status) throw error;
      console.error('[ApprovalService.validateCarbonTransition]', error);
      return this._fail('Failed to validate carbon transition');
    }
  }
}

module.exports = new ApprovalService();
