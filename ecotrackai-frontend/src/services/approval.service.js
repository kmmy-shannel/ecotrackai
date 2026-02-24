import api from './api';

class ApprovalService {

  // Used by InventoryManagerPage — passes role so admin can view too
  async getInventoryApprovals(viewerRole = null) {
    const params = new URLSearchParams({ status: 'pending' });
    if (viewerRole === 'admin') params.append('role', 'inventory_manager');
    const response = await api.get(`/approvals?${params.toString()}`);
    return response.data;
  }

  async getMyApprovals(status = 'pending') {
    const response = await api.get(`/approvals?status=${status}`);
    return response.data;
  }

  async approve(approvalId, notes = '') {
    const response = await api.put(`/approvals/${approvalId}/approve`, { notes });
    return response.data;
  }

  async reject(approvalId, notes = '') {
    const response = await api.put(`/approvals/${approvalId}/reject`, { notes });
    return response.data;
  }

  async submitDecision(approvalId, decision, comments = '') {
    if (decision === 'approved') return this.approve(approvalId, comments);
    return this.reject(approvalId, comments);
  }

  async getPendingCount() {
    const response = await api.get('/approvals/count');
    return response.data;
  }

  async getApprovalHistory(limit = 50, roleOverride = null) {
    const params = new URLSearchParams({ limit });
    if (roleOverride) params.append('role', roleOverride);
    const response = await api.get(`/approvals/history?${params.toString()}`);
    return response.data;
  }

  async createFromAlert(alertData) {
    const response = await api.post('/approvals/from-alert', alertData);
    return response.data;
  }

  // ── New: Manager escalates to Admin ────────────────────────
  // Called when manager clicks "Request to Admin"
  async requestAdminReview(approvalId, managerComment = '') {
    const response = await api.post(`/approvals/${approvalId}/request-admin`, {
      manager_comment: managerComment,
    });
    return response.data;
  }

  // ── New: Admin fetches all escalated requests ───────────────
  // Used in AlertsPage to show "Pending Admin Review" section
  async getRequestsForAdmin() {
    const response = await api.get('/approvals/admin-requests');
    return response.data;
  }

  // ── New: Admin approves or declines an escalated request ───
  async adminReviewRequest(requestId, decision, adminComment = '') {
    const response = await api.put(`/approvals/${requestId}/admin-review`, {
      decision,          // 'approved' | 'declined'
      admin_comment: adminComment,
    });
    return response.data;
  }
}

const approvalServiceInstance = new ApprovalService();
export default approvalServiceInstance;