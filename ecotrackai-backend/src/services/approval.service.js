// ============================================================
// FILE LOCATION: backend/src/services/approval.service.js
// ============================================================

const ApprovalModel = require('../models/approval.model');

const ROLE_MAP = {
  inventory_manager:      'inventory_manager',
  logistics_manager:      'logistics_manager',
  sustainability_manager: 'sustainability_manager',
};

class ApprovalService {

  _resolveRole(user, roleOverride) {
    if (roleOverride && ROLE_MAP[roleOverride]) return ROLE_MAP[roleOverride];
    if (user.role === 'admin') return null;
    if (ROLE_MAP[user.role])  return ROLE_MAP[user.role];
    throw { status: 403, message: `Role '${user.role}' cannot access approvals` };
  }

  // ── GET /api/approvals?status=pending ──────────────────────
  async getApprovals(user, status = 'pending', roleOverride = null) {
    console.log('[ApprovalService.getApprovals]', {
      userId:     user?.userId    || user?.user_id,
      role:       user?.role,
      businessId: user?.businessId || user?.business_id,
      status,
      roleOverride,
    });

    const businessId = user?.businessId || user?.business_id;
    if (!businessId) {
      throw { status: 400, message: 'businessId missing from token. Check your JWT payload.' };
    }

    const role = this._resolveRole(user, roleOverride);

    let rows;
    if (!role) {
      rows = await ApprovalModel.findByBusinessAndStatus(businessId, status);
    } else {
      rows = await ApprovalModel.findByBusinessRoleAndStatus(businessId, role, status);
    }

    console.log(`[ApprovalService.getApprovals] returned ${rows.length} rows`);
    return { approvals: rows };
  }

  // ── GET /api/approvals/count ───────────────────────────────
  async getPendingCount(user, roleOverride = null) {
    const businessId = user?.businessId || user?.business_id;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };

    const role = this._resolveRole(user, roleOverride) || 'inventory_manager';
    const count = await ApprovalModel.countPendingByBusinessAndRole(businessId, role);
    return { count };
  }

  // ── GET /api/approvals/history ─────────────────────────────
  async getApprovalHistory(user, limit = 50, roleOverride = null) {
    console.log('[ApprovalService.getApprovalHistory]', {
      userId:     user?.userId || user?.user_id,
      role:       user?.role,
      businessId: user?.businessId || user?.business_id,
      limit,
      roleOverride,
    });

    const businessId = user?.businessId || user?.business_id;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };

    const role = this._resolveRole(user, roleOverride);
    const effectiveRole = role || 'inventory_manager';

    const rows = await ApprovalModel.findHistoryByBusinessAndRole(businessId, effectiveRole, limit);
    return { history: rows };
  }

  // ── PUT /api/approvals/:id/approve ─────────────────────────
  async approveItem(user, approvalId, notes = '') {
    const businessId = user?.businessId || user?.business_id;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };

    const role = this._resolveRole(user, null);
    if (!role) throw { status: 403, message: 'Admin cannot directly approve items' };

    const approval = await ApprovalModel.findByIdAndRole(approvalId, role);
    if (!approval) throw { status: 404, message: 'Approval not found or not accessible' };
    if (approval.status !== 'pending') throw { status: 400, message: 'Approval already decided' };

    await ApprovalModel.updateStatusWithRole(approvalId, 'approved', user.userId || user.user_id, notes, role);
  }

  // ── PUT /api/approvals/:id/reject ──────────────────────────
  async rejectItem(user, approvalId, notes = '') {
    const businessId = user?.businessId || user?.business_id;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };

    const role = this._resolveRole(user, null);
    if (!role) throw { status: 403, message: 'Admin cannot directly reject items' };

    const approval = await ApprovalModel.findByIdAndRole(approvalId, role);
    if (!approval) throw { status: 404, message: 'Approval not found or not accessible' };
    if (approval.status !== 'pending') throw { status: 400, message: 'Approval already decided' };

    await ApprovalModel.updateStatusWithRole(approvalId, 'rejected', user.userId || user.user_id, notes, role);
  }

  // ── POST /api/approvals/from-alert ─────────────────────────
  async createFromAlert(user, body) {
    if (user.role !== 'admin') {
      throw { status: 403, message: 'Only admins can create approvals from alerts' };
    }

    const businessId = user?.businessId || user?.business_id;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };
    if (!body.productName) throw { status: 400, message: 'productName is required' };

    const row = await ApprovalModel.create({
      businessId,
      productName:  body.productName,
      quantity:     body.quantity     || 'N/A',
      location:     body.location     || 'N/A',
      daysLeft:     body.daysLeft     || 0,
      riskLevel:    body.riskLevel    || 'MEDIUM',
      aiSuggestion: body.aiSuggestion || '',
      priority:     body.priority     || 'MEDIUM',
      requiredRole: body.requiredRole || 'inventory_manager',
      approvalType: body.approvalType || 'spoilage_action',
      submittedBy:  user.userId || user.user_id,
    });

    return { approval: row };
  }

  // ── POST /api/approvals/:id/request-admin ──────────────────
  async requestAdminReview(user, approvalId, managerComment = '') {
    const role = this._resolveRole(user, null);
    if (!role) throw { status: 403, message: 'Only managers can escalate to admin' };

    const approval = await ApprovalModel.findByIdAndRole(approvalId, role);
    if (!approval) throw { status: 404, message: 'Approval not found' };
    if (approval.status !== 'pending') throw { status: 400, message: 'Approval is not in pending state' };

    await ApprovalModel.requestAdminReview(approvalId, managerComment);
    return { message: 'Request sent to admin' };
  }

  // ── GET /api/approvals/admin-requests ─────────────────────
  async getAdminRequests(user) {
    if (user.role !== 'admin') throw { status: 403, message: 'Only admins can view escalated requests' };

    const businessId = user?.businessId || user?.business_id;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };

    const requests = await ApprovalModel.findAdminRequests(businessId);
    return { requests };
  }

  // ── PUT /api/approvals/:id/admin-review ───────────────────
  async adminReviewRequest(user, approvalId, decision, adminComment = '') {
    if (user.role !== 'admin') throw { status: 403, message: 'Only admins can review escalated requests' };

    const businessId = user?.businessId || user?.business_id;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };

    if (!['approved', 'declined'].includes(decision)) {
      throw { status: 400, message: "Decision must be 'approved' or 'declined'" };
    }

    const adminUserId = user.userId || user.user_id;
    await ApprovalModel.adminReviewRequest(approvalId, decision, adminComment, adminUserId);
    return { message: `Request ${decision} by admin` };
  }

  // ── POST /api/approvals/from-delivery ─────────────────────
  // FIX: removed undefined extractUser() call.
  // Now reads user properties directly, exactly like every other method above.
  async createFromDelivery(user, body) {
    const businessId = user?.businessId || user?.business_id;
    const userId     = user?.userId     || user?.user_id;

    if (!businessId) {
      throw { status: 400, message: 'businessId missing from token. Check your JWT payload.' };
    }

    // Parse extra_data sent from the frontend (useDelivery.js → applyOptimization)
    let extraParsed = {};
    try {
      extraParsed = typeof body.extra_data === 'string'
        ? JSON.parse(body.extra_data)
        : (body.extra_data || {});
    } catch {
      extraParsed = {};
    }

    const {
      driver            = '',
      vehicleType       = '',
      stops             = [],
      originalRoute     = {},
      optimizedRoute    = {},
      savings           = {},
      aiRecommendations = [],
    } = extraParsed;

    // Build a readable name from stop locations
    const origin      = stops[0]?.location      || 'Warehouse';
    const destination = stops[stops.length - 1]?.location || 'Destination';
    const productName = `${origin.split(',')[0]} → ${destination.split(',')[0]}`;

    const row = await ApprovalModel.create({
      businessId,
      productName,
      quantity:     `${stops.length} stop${stops.length !== 1 ? 's' : ''}`,
      location:     origin,
      daysLeft:     0,
      riskLevel:    'MEDIUM',
      aiSuggestion: aiRecommendations[0] || '',
      priority:     'MEDIUM',
      requiredRole: 'logistics_manager',
      approvalType: 'route_optimization',
      submittedBy:  userId,
      extraData:    JSON.stringify({
        driver,
        vehicleType,
        stops,
        originalRoute,
        optimizedRoute,
        savings,
        aiRecommendations,
      }),
    });

    return { approval: row };
  }
}

module.exports = new ApprovalService();