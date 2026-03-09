// ============================================================
// FILE: src/hooks/useSuperAdmin.js
// LAYER: ViewModel — Super Admin platform-level state
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import superadminService from '../services/superadmin.service';

export const useSuperAdmin = () => {
  const [businesses,  setBusinesses]  = useState([]);
  const [systemHealth,setSystemHealth]= useState(null);
  const [auditLogs,   setAuditLogs]   = useState([]);
  const [analytics,   setAnalytics]   = useState(null);
  const [ecoConfig,   setEcoConfig]   = useState([]);
  const [pendingRegs, setPendingRegs] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');

  const clearMessages = () => { setError(''); setSuccess(''); };

  const loadBusinesses = useCallback(async () => {
    try {
      const res = await superadminService.getBusinesses();
      const d = res?.data?.data || res?.data || {};
      setBusinesses(d.businesses || []);
    } catch { setError('Failed to load businesses'); }
  }, []);

  const loadSystemHealth = useCallback(async () => {
    try {
      const res = await superadminService.getSystemHealth();
      const d = res?.data?.data || res?.data || {};
      setSystemHealth(d.system_health || d);
    } catch { setError('Failed to load system health'); }
  }, []);

  const loadAuditLogs = useCallback(async (params = {}) => {
    try {
      const res = await superadminService.getAuditLogs(params);
      const d = res?.data?.data || res?.data || {};
      setAuditLogs(d.audit_logs || []);
    } catch { setError('Failed to load audit logs'); }
  }, []);

  const loadAnalytics = useCallback(async (timeRange = 30) => {
    try {
      const res = await superadminService.getAnalytics(timeRange);
      const d = res?.data?.data || res?.data || {};
      setAnalytics(d.analytics || d);
    } catch { setError('Failed to load analytics'); }
  }, []);

  const loadEcoConfig = useCallback(async () => {
    try {
      const res = await superadminService.getEcoTrustConfig();
      const d = res?.data?.data || res?.data || {};
      setEcoConfig(d.config || []);
    } catch { setError('Failed to load EcoTrust config'); }
  }, []);

  const loadPendingRegistrations = useCallback(async () => {
    try {
      const res = await superadminService.getPendingRegistrations();
      const d = res?.data?.data || res?.data || {};
      setPendingRegs(d.registrations || d.businesses || []);
    } catch { setError('Failed to load pending registrations'); }
  }, []);

  const suspendBusiness = async (id) => {
    clearMessages();
    try {
      await superadminService.suspendBusiness(id);
      setSuccess('Business suspended');
      setBusinesses(prev => prev.map(b =>
        b.business_id === id ? { ...b, status: 'suspended' } : b
      ));
    } catch (e) { setError(e?.response?.data?.message || 'Failed to suspend'); }
  };

  const reactivateBusiness = async (id) => {
    clearMessages();
    try {
      await superadminService.reactivateBusiness(id);
      setSuccess('Business reactivated');
      setBusinesses(prev => prev.map(b =>
        b.business_id === id ? { ...b, status: 'active' } : b
      ));
    } catch (e) { setError(e?.response?.data?.message || 'Failed to reactivate'); }
  };

  const createBusiness = async (formData) => {
    clearMessages();
    try {
      await superadminService.createBusiness(formData);
      setSuccess('Business and admin created successfully');
      await loadBusinesses();
      return true;
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create business');
      return false;
    }
  };

  const approveBusiness = async (id, notes = '') => {
    clearMessages();
    try {
      await superadminService.approveBusiness(id, { notes });
      setSuccess('Business approved');
      await Promise.all([loadPendingRegistrations(), loadBusinesses()]);
    } catch (e) { setError(e?.response?.data?.message || 'Failed to approve'); }
  };

  const rejectBusiness = async (id, reason) => {
    clearMessages();
    try {
      await superadminService.rejectBusiness(id, { reason });
      setSuccess('Business rejected');
      await loadPendingRegistrations();
    } catch (e) { setError(e?.response?.data?.message || 'Failed to reject'); }
  };

  const updateEcoAction = async (id, actionData) => {
    clearMessages();
    try {
      await superadminService.updateEcoTrustAction(id, actionData);
      setSuccess('EcoTrust action updated');
      await loadEcoConfig();
    } catch { setError('Failed to update action'); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadBusinesses(),
      loadSystemHealth(),
      loadPendingRegistrations(),
    ]).finally(() => setLoading(false));
  }, [loadBusinesses, loadSystemHealth, loadPendingRegistrations]);

  return {
    businesses, systemHealth, auditLogs, analytics,
    ecoConfig, pendingRegs, loading, error, success,
    createBusiness, suspendBusiness, reactivateBusiness,
    approveBusiness, rejectBusiness,
    loadAuditLogs, loadAnalytics, loadEcoConfig,
    updateEcoAction,
    reload: () => Promise.all([loadBusinesses(), loadSystemHealth()]),
    clearMessages,
  };
};