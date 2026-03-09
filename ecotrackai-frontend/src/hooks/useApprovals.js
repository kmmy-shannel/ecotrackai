import { useCallback, useEffect, useState } from 'react';
import approvalService from '../services/approval.service';
import alertService from '../services/alert.service';
import { useAuth } from './useAuth';
// REPLACE the existing extractApprovals with this:
const extractApprovals = (response) => {
  const raw =
    response?.data?.data?.approvals ||
    response?.data?.approvals       ||
    response?.approvals             ||
    response?.data?.data            ||
    response?.data                  ||
    [];
  return Array.isArray(raw) ? raw : [];
};

// ADD this helper for history:
const extractHistory = (response) => {
  const raw =
    response?.data?.data?.history ||
    response?.data?.history       ||
    response?.history             ||
    response?.data?.data          ||
    response?.data                ||
    [];
  return Array.isArray(raw) ? raw : [];
};

const roleMethod = {
  inventory_manager:    'getInventoryApprovals',
  logistics_manager:    'getLogisticsApprovals',
  sustainability_manager: 'getSustainabilityApprovals',
};

export const useApprovals = () => {
  const { role } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [history, setHistory]     = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const loadApprovals = useCallback(async () => {
    if (!role || !roleMethod[role]) { setApprovals([]); return; }
    setLoading(true);
    setError('');
    try {
      const response = await approvalService[roleMethod[role]]();
      setApprovals(extractApprovals(response));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [role]);

  // ADD: load history
  const loadHistory = useCallback(async () => {
    try {
      const response = await approvalService.getApprovalHistory(50);
      setHistory(extractHistory(response));
    } catch {
      // silent — history failing shouldn't break the dashboard
    }
  }, []);

  const loadHighAlerts = useCallback(async () => {
    try {
      const response = await alertService.getAllAlerts();
      const raw = response?.data?.alerts || response?.alerts || response?.data || [];
      const list = Array.isArray(raw) ? raw : [];
      // Only show HIGH + active for the inventory dashboard panel
      setAlerts(list.filter(a => a.risk_level === 'HIGH' && a.status === 'active'));
    } catch {
      setAlerts([]);
    }
  }, []);

  const generateAlerts = async () => {
    try {
      await alertService.syncAlerts();   // single code path — no duplicates
      await loadHighAlerts();
      await loadApprovals();
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadApprovals();
    loadHistory();
    loadHighAlerts();
  }, [loadApprovals, loadHistory, loadHighAlerts]);

  const approveApproval = async (approvalId, note = '') => {
    await approvalService.approveApproval(approvalId, note);
    setSuccess('Approved — Admin has been notified.');
    setTimeout(() => setSuccess(''), 4000);
    await loadApprovals();
    await loadHistory();
  };

  const declineApproval = async (approvalId, reason) => {
    await approvalService.declineApproval(approvalId, reason);
    setSuccess('Declined — recorded in history.');
    setTimeout(() => setSuccess(''), 4000);
    await loadApprovals();
    await loadHistory();
  };

  return {
    approvals, history, alerts, loading, error, success,
    reload: loadApprovals,
    approveApproval,
    declineApproval,
    generateAlerts,
  };
};

export default useApprovals;