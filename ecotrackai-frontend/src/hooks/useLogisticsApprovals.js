// ============================================================
// FILE: src/hooks/useLogisticsApprovals.jsx
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function useLogisticsApprovals() {
  const [pending,  setPending]  = useState([]);
  const [history,  setHistory]  = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [stats,    setStats]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const flash = (setter, msg, ms = 3000) => {
    setter(msg);
    setTimeout(() => setter(''), ms);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingRes, historyRes, statsRes, driversRes] = await Promise.all([
        api.get('/logistics/pending'),
        api.get('/logistics/history'),
        api.get('/logistics/stats'),
        api.get('/deliveries/drivers'),
      ]);

      const extract = (res) => {
        const d = res.data;
        return d?.data ?? d ?? [];
      };

      setPending(Array.isArray(extract(pendingRes))  ? extract(pendingRes)  : []);
      setHistory(Array.isArray(extract(historyRes))  ? extract(historyRes)  : []);
      setStats(extract(statsRes) || {});
      setDrivers(Array.isArray(extract(driversRes)) ? extract(driversRes) : []);
    } catch (err) {
      console.error('[useLogisticsApprovals]', err);
      setError(err.response?.data?.message || 'Failed to load logistics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const approveRoute = async (approvalId, comment = '') => {
    setError('');
    try {
      await api.patch(`/logistics/${approvalId}/approve`, { comment });
      flash(setSuccess, '✓ Route approved — driver has been notified');
      await loadAll();
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Failed to approve route');
    }
  };

  const declineRoute = async (approvalId, comment = '') => {
    if (!comment.trim()) {
      flash(setError, 'A reason is required to decline');
      return;
    }
    setError('');
    try {
      await api.patch(`/logistics/${approvalId}/decline`, {
        reason: comment,
        comment,
      });
      flash(setSuccess, 'Route declined — admin has been notified');
      await loadAll();
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Failed to decline route');
    }
  };

  return {
    pending, history, drivers, stats,
    loading, error, success,
    approveRoute, declineRoute,
    refresh: loadAll,
  };
}
