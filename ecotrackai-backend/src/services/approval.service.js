// ============================================================
// FILE LOCATION: backend/src/services/approval.service.js
// LAYER: Service (ViewModel) — business logic ONLY, no HTTP/no DB
// ============================================================

const ApprovalModel = require('../models/approval.model');

// Map roles to what they can approve — preserved exactly from original
const ROLE_APPROVAL_TYPES = {
  inventory_manager:       ['spoilage_action'],
  logistics_manager:       ['route_optimization'],
  sustainability_manager:  ['carbon_verification'],
  finance_manager:         ['cost_approval']
};

const ApprovalService = {

  // Get approvals for a manager's role
  async getApprovals(user, status = 'pending') {
    const { role, businessId } = user;

    const approvalTypes = ROLE_APPROVAL_TYPES[role] || [];

    // Role has no approval types — return empty gracefully
    if (approvalTypes.length === 0) {
      return { approvals: [], count: 0, role };
    }

    const approvals = await ApprovalModel.findByBusinessRoleAndStatus(
      businessId,
      role,
      status
    );

    return { approvals, count: approvals.length, role };
  },

  // Get pending approval count for notification badge
  async getPendingCount(user) {
    const { role, businessId } = user;
    const count = await ApprovalModel.countPendingByBusinessAndRole(businessId, role);
    return { count };
  },

  // Approve an item — verifies ownership and pending status
  async approveItem(user, approvalId, notes) {
    const { userId, role } = user;

    const approval = await ApprovalModel.findByIdAndRole(approvalId, role);

    if (!approval) {
      throw { status: 404, message: 'Approval not found or not authorized' };
    }

    if (approval.status !== 'pending') {
      throw { status: 400, message: 'This item has already been reviewed' };
    }

    await ApprovalModel.updateStatus(approvalId, 'approved', userId, notes);
  },

  // Reject an item — verifies ownership and pending status
  async rejectItem(user, approvalId, notes) {
    const { userId, role } = user;

    const approval = await ApprovalModel.findByIdAndRole(approvalId, role);

    if (!approval) {
      throw { status: 404, message: 'Approval not found or not authorized' };
    }

    if (approval.status !== 'pending') {
      throw { status: 400, message: 'This item has already been reviewed' };
    }

    await ApprovalModel.updateStatus(approvalId, 'rejected', userId, notes);
  }

};

module.exports = ApprovalService;