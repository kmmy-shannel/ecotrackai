import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

const useSustainabilityApprovals = () => {
  const [pendingRecords,  setPendingRecords]  = useState([]);
  const [historyRecords,  setHistoryRecords]  = useState([]);
  const [trendData,       setTrendData]       = useState([]);
  const [auditRecords,    setAuditRecords]    = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [trendLoading,    setTrendLoading]    = useState(false);
  const [auditLoading,    setAuditLoading]    = useState(false);
  const [error,           setError]           = useState('');

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

  const loadTrendData = useCallback(async () => {
    setTrendLoading(true);
    try {
      const res = await api.get('/carbon/all');
      const allRecords = res.data?.data?.records || [];
      const trend = allRecords
        .filter(r => r.estimated_fuel_liters != null || r.total_carbon_kg != null)
        .map(r => {
          const estFuel   = parseFloat(r.estimated_fuel_liters) || 0;
          const actFuel   = parseFloat(r.actual_fuel_liters)    || 0;
          const estCarbon = parseFloat((estFuel * 2.68).toFixed(2));
          const actCarbon = parseFloat(r.total_carbon_kg)       || parseFloat((actFuel * 2.68).toFixed(2));
          return {
            record_id:        r.record_id,
            route_name:       r.route_name || `Delivery #${r.route_id}`,
            vehicle_type:     r.vehicle_type,
            date:             r.created_at,
            estimated_carbon: estCarbon,
            actual_carbon:    actCarbon,
            estimated_fuel:   estFuel,
            actual_fuel:      actFuel,
            actual_distance:  parseFloat(r.actual_distance_km) || 0,
            status:           r.verification_status,
            variance:         parseFloat((actCarbon - estCarbon).toFixed(2)),
          };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setTrendData(trend);
    } catch (err) {
      console.error('Failed to load carbon trend', err);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  // ── EcoTrust audit ───────────────────────────────────────────────────────────
  const loadAuditRecords = useCallback(async () => {
    setAuditLoading(true);
    try {
      console.log('[useSustainabilityApprovals] calling GET /ecotrust/transactions');
      const res = await api.get('/ecotrust/transactions');
      console.log('[useSustainabilityApprovals] audit raw response:', res.data);

      // Handle both response shapes:
      // { data: [...] }  or  { data: { data: [...] } }  or  { transactions: [...] }
      const records =
        Array.isArray(res.data?.data)         ? res.data.data         :
        Array.isArray(res.data?.data?.data)   ? res.data.data.data    :
        Array.isArray(res.data?.transactions) ? res.data.transactions :
        Array.isArray(res.data)               ? res.data              :
        [];

      // De-duplicate by transaction_id (or id fallback) to avoid duplicated rows
      const seen = new Set();
      const deduped = records.filter(tx => {
        const primaryKey = tx.related_record_id
          ? `${tx.action_type || 'action'}-${tx.related_record_type || 'ref'}-${tx.related_record_id}`
          : tx.transaction_id || tx.id;
        const key = String(primaryKey || `${tx.action_type || 'action'}-${tx.created_at || ''}`);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      console.log('[useSustainabilityApprovals] audit records parsed:', deduped.length, 'rows');
      setAuditRecords(deduped);
    } catch (err) {
      console.error('[useSustainabilityApprovals] audit fetch failed:', err?.response?.status, err?.response?.data);
      setAuditRecords([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const verifyRecord = useCallback(async (recordId, decision, notes = '') => {
    try {
      const res = await api.patch(`/carbon/${recordId}/verify`, { decision, notes });
      await loadPending();
      await loadHistory();
      return { success: true, data: res.data?.data };
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data?.message || 'Verification failed',
      };
    }
  }, [loadPending, loadHistory]);

  const flagTransaction = useCallback(async (transactionId, reason) => {
    try {
      await api.post(`/ecotrust/transactions/${transactionId}/flag`, { reason });

      // Optimistically mark the transaction as flagged so the UI updates instantly
      const targetId = String(transactionId);
      setAuditRecords(prev =>
        prev.map(tx => {
          const txId = tx.transaction_id || tx.id;
          return String(txId) === targetId
            ? { ...tx, flagged: true, is_flagged: true, flag_reason: reason, flagged_at: new Date().toISOString() }
            : tx;
        })
      );

      // Refresh to pick up any backend filters/normalization
      await loadAuditRecords();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data?.message || 'Failed to flag transaction',
      };
    }
  }, [loadAuditRecords]);

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
    refresh: () => { loadPending(); loadHistory(); },
    trendData,
    trendLoading,
    auditRecords,
    auditLoading,
    loadTrendData,
    loadAuditRecords,
    flagTransaction,
  };
};

export default useSustainabilityApprovals;
