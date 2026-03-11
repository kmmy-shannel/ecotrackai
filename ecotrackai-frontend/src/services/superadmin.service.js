// ============================================================
// FILE: src/services/superadmin.service.js
// LAYER: Service — Super Admin API calls
//
// FIX: URL prefix was /super-admin/... (with hyphen).
//      Backend mounts at /api/superadmin/ (no hyphen).
//      Every single call was 404-ing. All URLs corrected.
// ============================================================

import api from './api';

const superadminService = {
  // ── Business Registry ──────────────────────────────────────
  getBusinesses:       (params)     => api.get('/superadmin/businesses', { params }),
  getBusinessById:     (id)         => api.get(`/superadmin/businesses/${id}`),
  createBusiness:      (data)       => api.post('/superadmin/businesses', data),
  updateBusiness:      (id, data)   => api.put(`/superadmin/businesses/${id}`, data),
  suspendBusiness:     (id)         => api.patch(`/superadmin/businesses/${id}/suspend`),
  reactivateBusiness:  (id)         => api.patch(`/superadmin/businesses/${id}/reactivate`),

  // ── Registration Approval ──────────────────────────────────
  getPendingRegistrations: ()         => api.get('/superadmin/registrations/pending'),
  approveBusiness:         (id, data) => api.patch(`/superadmin/businesses/${id}/approve`, data),
  rejectBusiness:          (id, data) => api.patch(`/superadmin/businesses/${id}/reject`, data),

  // ── User Management ────────────────────────────────────────
  getSuperAdmins:    ()   => api.get('/superadmin/users/super-admins'),
  getBusinessAdmins: (id) => api.get(`/superadmin/businesses/${id}/admins`),
  deactivateUser:    (id) => api.patch(`/superadmin/users/${id}/deactivate`),

  // ── System Health ──────────────────────────────────────────
  getSystemHealth: () => api.get('/superadmin/health'),

  // ── Audit Logs ─────────────────────────────────────────────
  getAuditLogs: (params) => api.get('/superadmin/audit-logs', { params }),

  // ── Analytics ──────────────────────────────────────────────
  getAnalytics: (timeRange = 30) =>
    api.get('/superadmin/analytics', { params: { timeRange } }),

  // ── EcoTrust Config ────────────────────────────────────────
  getEcoTrustConfig:    ()         => api.get('/superadmin/ecotrust-config'),
  updateEcoTrustAction: (id, data) => api.patch(`/superadmin/ecotrust-config/${id}`, data),
};

export default superadminService;