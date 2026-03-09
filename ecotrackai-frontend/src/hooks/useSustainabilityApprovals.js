// ============================================================
// FILE: src/hooks/useSustainabilityApprovals.js
// LAYER: ViewModel — Sustainability manager approval state
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import approvalService from '../services/approval.service';
import carbonService   from '../services/carbon.service';

export const useSustainabilityApprovals = (businessId) => {
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [history,             setHistory]             = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState('');
  const [success,             setSuccess]             = useState('');

  const clearMessages = () => { setError(''); setSuccess(''); };

  const loadPending = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await approvalService.getSustainabilityApprovals(businessId);
      const items = res?.data?.data?.approvals || res?.data?.approvals || [];
      setPendingVerifications(items.filter(a => a.status === 'pending'));
    } catch (e) {
      setError('Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const loadHistory = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await approvalService.getSustainabilityApprovals(businessId);
      const items = res?.data?.data?.approvals || res?.data?.approvals || [];
      setHistory(items.filter(a => a.status !== 'pending'));
    } catch (e) {
      setError('Failed to load history');
    }
  }, [businessId]);

   const verify = async (carbonRecordId, notes = '') => {
    clearMessages();
    try {
      await carbonService.verifyCarbonRecord(carbonRecordId, 'verified', notes);
      setSuccess('Carbon record verified successfully');
      await loadPending();
      return true;
    } catch (e) {
      setError(e?.response?.data?.message || 'Verification failed');
      return false;
    }
  };

  const requestRevision = async (carbonRecordId, reason = '') => {
    clearMessages();
    try {
      await carbonService.verifyCarbonRecord(carbonRecordId, 'revision_requested', reason);
      setSuccess('Revision requested — admin will be notified');
      await loadPending();
      return true;
    } catch (e) {
      setError(e?.response?.data?.message || 'Request revision failed');
      return false;
    }
  };

  useEffect(() => { loadPending(); }, [loadPending]);

  return {
    pendingVerifications, history, loading, error, success,
    loadPending, loadHistory, verify, requestRevision,
  };
};