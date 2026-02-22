import api from './api';

class ApprovalService {

  // Get approvals for logged-in manager's role
  async getMyApprovals(status = 'pending', role = null) {
    const params = { status };
    if (role) params.role = role;
    const response = await api.get('/approvals', { params });
    return response.data;
  }

  // Used by InventoryManagerPage
  async getInventoryApprovals(viewerRole = null) {
    const role = viewerRole === 'admin' ? 'inventory_manager' : null;
    return this.getMyApprovals('pending', role);
  }

  // Approve an item
  async approve(approvalId, notes = '') {
    const response = await api.put(`/approvals/${approvalId}/approve`, { notes });
    return response.data;
  }

  // Reject an item
  async reject(approvalId, notes = '') {
    const response = await api.put(`/approvals/${approvalId}/reject`, { notes });
    return response.data;
  }

  // submitDecision — used by InventoryManagerPage handleDecision
  async submitDecision(approvalId, decision, comments = '') {
    if (decision === 'approved') return this.approve(approvalId, comments);
    return this.reject(approvalId, comments);
  }

  // Get pending count for badge
  async getPendingCount(role = null) {
    const params = role ? { role } : {};
    const response = await api.get('/approvals/count', { params });
    return response.data;
  }

  // Get history
  async getApprovalHistory(limit = 50, role = null) {
    const params = { limit };
    if (role) params.role = role;
    const response = await api.get('/approvals/history', { params });
    return response.data;
  }

  // Called when admin clicks Accept in AI modal
  async createFromAlert(alertData) {
    const response = await api.post('/approvals/from-alert', alertData);
    return response.data;
  }
}

const approvalServiceInstance = new ApprovalService();
export default approvalServiceInstance;
