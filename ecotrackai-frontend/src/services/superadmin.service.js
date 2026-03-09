// ============================================================
// FILE: src/services/superadmin.service.js
// LAYER: Service — Super Admin API calls
// ============================================================

import api from './api';

const superadminService = {
  // ── Business Registry ──────────────────────────────────────
  getBusinesses:       (params)    => api.get('/super-admin/businesses', { params }),
  getBusinessById:     (id)        => api.get(`/super-admin/businesses/${id}`),
  createBusiness:      (data)      => api.post('/super-admin/businesses', data),
  updateBusiness:      (id, data)  => api.put(`/super-admin/businesses/${id}`, data),
  suspendBusiness:     (id)        => api.patch(`/super-admin/businesses/${id}/suspend`),
  reactivateBusiness:  (id)        => api.patch(`/super-admin/businesses/${id}/reactivate`),

  // ── Registration Approval ──────────────────────────────────
  getPendingRegistrations: ()        => api.get('/super-admin/registrations/pending'),
  approveBusiness:         (id, data) => api.patch(`/super-admin/businesses/${id}/approve`, data),
  rejectBusiness:          (id, data) => api.patch(`/super-admin/businesses/${id}/reject`, data),

  // ── User Management ────────────────────────────────────────
  getSuperAdmins:    ()   => api.get('/super-admin/users/super-admins'),
  getBusinessAdmins: (id) => api.get(`/super-admin/businesses/${id}/admins`),
  deactivateUser:    (id) => api.patch(`/super-admin/users/${id}/deactivate`),

  // ── System Health ──────────────────────────────────────────
  getSystemHealth: () => api.get('/super-admin/health'),

  // ── Audit Logs ─────────────────────────────────────────────
  getAuditLogs: (params) => api.get('/super-admin/audit-logs', { params }),

  // ── Analytics ──────────────────────────────────────────────
  getAnalytics: (timeRange = 30) => api.get('/super-admin/analytics', { params: { timeRange } }),

  // ── EcoTrust Config ────────────────────────────────────────
  getEcoTrustConfig:    ()         => api.get('/super-admin/ecotrust-config'),
  updateEcoTrustAction: (id, data) => api.patch(`/super-admin/ecotrust-config/${id}`, data),
};

export default superadminService;