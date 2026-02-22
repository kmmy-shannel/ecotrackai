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
    if (ROLE_MAP[user.role]) return ROLE_MAP[user.role];
    console.warn('[ApprovalService] Unknown role:', user.role);
    return null;
  }

  async getApprovals(user, status = 'pending', roleOverride = null) {
    console.log('[ApprovalService.getApprovals]', {
      userId: user.userId, role: user.role,
      businessId: user.businessId, status, roleOverride,
    });

    const businessId = user.businessId;
    if (!businessId) {
      throw { status: 400, message: 'businessId missing from token — re-login to refresh your session' };
    }

    const role = this._resolveRole(user, roleOverride);
    const rows = role
      ? await ApprovalModel.findByBusinessRoleAndStatus(businessId, role, status)
      : await ApprovalModel.findByBusinessAndStatus(businessId, status);

    console.log('[ApprovalService.getApprovals] rows returned:', rows.length);
    return { approvals: rows };
  }

  async getPendingCount(user, roleOverride = null) {
    const businessId = user.businessId;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };
    const role = this._resolveRole(user, roleOverride) || 'inventory_manager';
    const count = await ApprovalModel.countPendingByBusinessAndRole(businessId, role);
    return { count };
  }

  async getApprovalHistory(user, limit = 50, roleOverride = null) {
    console.log('[ApprovalService.getApprovalHistory]', {
      userId: user.userId, role: user.role,
      businessId: user.businessId, limit, roleOverride,
    });
    const businessId = user.businessId;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };
    const role = this._resolveRole(user, roleOverride) || 'inventory_manager';
    const rows = await ApprovalModel.findHistoryByBusinessAndRole(businessId, role, limit);
    return { history: rows };
  }

  async approveItem(user, approvalId, notes = '') {
    const businessId = user.businessId;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };
    const role = ROLE_MAP[user.role];
    if (!role) throw { status: 403, message: 'Only managers can approve items' };
    const approval = await ApprovalModel.findByIdAndRole(approvalId, role);
    if (!approval) throw { status: 404, message: 'Approval not found or not accessible' };
    if (approval.status !== 'pending') throw { status: 400, message: 'Approval already decided' };
    await ApprovalModel.updateStatusWithRole(approvalId, 'approved', user.userId, notes, role);
  }

  async rejectItem(user, approvalId, notes = '') {
    const businessId = user.businessId;
    if (!businessId) throw { status: 400, message: 'businessId missing from token' };
    const role = ROLE_MAP[user.role];
    if (!role) throw { status: 403, message: 'Only managers can reject items' };
    const approval = await ApprovalModel.findByIdAndRole(approvalId, role);
    if (!approval) throw { status: 404, message: 'Approval not found or not accessible' };
    if (approval.status !== 'pending') throw { status: 400, message: 'Approval already decided' };
    await ApprovalModel.updateStatusWithRole(approvalId, 'rejected', user.userId, notes, role);
  }

  async createFromAlert(user, body) {
    if (user.role !== 'admin') throw { status: 403, message: 'Only admins can create approvals from alerts' };
    const businessId = user.businessId;
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
      submittedBy:  user.userId,
    });
    return { approval: row };
  }
}

module.exports = new ApprovalService();