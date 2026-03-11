import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

const useSustainabilityApprovals = () => {
  const [pendingRecords, setPendingRecords] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/carbon/pending');
      setPendingRecords(res.data?.data?.records || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/carbon/all');
      setHistoryRecords(res.data?.data?.records || []);
    } catch (err) {
      console.error('Failed to load carbon history', err);
    }
  }, []);

  const verifyRecord = useCallback(async (recordId, decision, notes = '') => {
    try {
      const res = await api.patch(`/carbon/${recordId}/verify`, { decision, notes });
      await loadPending();
      await loadHistory();
      return { success: true, data: res.data?.data };
    } catch (err) {
      return { success: false, error: err?.response?.data?.message || 'Verification failed' };
    }
  }, [loadPending, loadHistory]);

  useEffect(() => {
    loadPending();
    loadHistory();
  }, [loadPending, loadHistory]);

  return {
    pendingRecords,
    historyRecords,
    loading,
    error,
    verifyRecord,
    refresh: () => { loadPending(); loadHistory(); }
  };
};

export default useSustainabilityApprovals;