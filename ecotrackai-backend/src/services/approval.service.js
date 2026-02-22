const ApprovalModel = require('../models/approval.model');

const ROLE_APPROVAL_TYPES = {
  inventory_manager: ['spoilage_action'],
  logistics_manager: ['route_optimization'],
  sustainability_manager: ['carbon_verification'],
  finance_manager: ['cost_approval']
};

const MANAGER_ROLES = Object.keys(ROLE_APPROVAL_TYPES);

const normalizeApproval = (approval) => ({
  ...approval,
  id: approval.id || approval.approval_id,
  comments: approval.review_notes || approval.comments || ''
});

const ApprovalService = {
  resolveReadableRole(user, requestedRole) {
    if (!user) {
      throw { status: 401, message: 'Not authenticated' };
    }

    if (MANAGER_ROLES.includes(user.role)) {
      if (requestedRole && requestedRole !== user.role) {
        throw { status: 403, message: 'Managers can only access their own approval queue' };
      }
      return user.role;
    }

    if (user.role === 'admin') {
      const role = requestedRole || 'inventory_manager';
      if (!MANAGER_ROLES.includes(role)) {
        throw { status: 400, message: 'Invalid role filter' };
      }
      return role;
    }

    throw { status: 403, message: 'Only manager roles or admin can access approvals' };
  },

  ensureManagerRole(user) {
    if (!user || !MANAGER_ROLES.includes(user.role)) {
      throw { status: 403, message: 'Only manager roles can make approval decisions' };
    }
  },

  async getApprovals(user, status = 'pending', requestedRole = null) {
    const { businessId } = user;
    const role = this.resolveReadableRole(user, requestedRole);

    const normalizedStatus = String(status || 'pending').toLowerCase();
    const allowedStatuses = ['pending', 'approved', 'rejected'];
    if (!allowedStatuses.includes(normalizedStatus)) {
      throw { status: 400, message: 'Invalid status filter' };
    }

    const approvalTypes = ROLE_APPROVAL_TYPES[role] || [];
    if (approvalTypes.length === 0) {
      return { approvals: [], count: 0, role };
    }

    const approvals = await ApprovalModel.findByBusinessRoleAndStatus(
      businessId,
      role,
      normalizedStatus
    );

    return { approvals: approvals.map(normalizeApproval), count: approvals.length, role };
  },

  async getPendingCount(user, requestedRole = null) {
    const { businessId } = user;
    const role = this.resolveReadableRole(user, requestedRole);
    const count = await ApprovalModel.countPendingByBusinessAndRole(businessId, role);
    return { count };
  },

  async getApprovalHistory(user, limit = 50, requestedRole = null) {
    const { businessId } = user;
    const role = this.resolveReadableRole(user, requestedRole);
    const history = await ApprovalModel.findHistoryByBusinessAndRole(businessId, role, limit);
    return { history: history.map(normalizeApproval), count: history.length, role };
  },

  async approveItem(user, approvalId, notes) {
    this.ensureManagerRole(user);
    const { userId, role } = user;

    const approval = await ApprovalModel.findByIdAndRole(approvalId, role);
    if (!approval) {
      throw { status: 404, message: 'Approval not found or not authorized' };
    }
    if (approval.status !== 'pending') {
      throw { status: 400, message: 'This item has already been reviewed' };
    }

    await ApprovalModel.updateStatusWithRole(approvalId, 'approved', userId, notes, role);
  },

  async rejectItem(user, approvalId, notes) {
    this.ensureManagerRole(user);
    const { userId, role } = user;

    const approval = await ApprovalModel.findByIdAndRole(approvalId, role);
    if (!approval) {
      throw { status: 404, message: 'Approval not found or not authorized' };
    }
    if (approval.status !== 'pending') {
      throw { status: 400, message: 'This item has already been reviewed' };
    }

    await ApprovalModel.updateStatusWithRole(approvalId, 'rejected', userId, notes, role);
  },

  async createFromAlert(user, alertData) {
    const { businessId, userId } = user;
    const riskToPriority = { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' };

    const approval = await ApprovalModel.create({
      businessId,
      productName: alertData.product_name,
      quantity: alertData.quantity || 'N/A',
      location: alertData.location || 'Warehouse',
      daysLeft: alertData.days_left || 0,
      riskLevel: alertData.risk_level || 'MEDIUM',
      aiSuggestion: alertData.ai_suggestion || alertData.aiSuggestion || '',
      priority: riskToPriority[alertData.risk_level] || 'MEDIUM',
      requiredRole: 'inventory_manager',
      approvalType: 'spoilage_action',
      submittedBy: userId
    });

    return { approval };
  }
};

module.exports = ApprovalService;
