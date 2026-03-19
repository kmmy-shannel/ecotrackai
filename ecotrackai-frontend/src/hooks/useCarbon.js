import { useEffect, useState, useCallback } from 'react';
import carbonService from '../services/carbon.service';
import api from '../services/api';

const emptyData = {
  thisMonth: {
    totalEmissions: 0,
    deliveryTrips: 0,
    distanceTraveled: 0,
    litersOfFuelUsed: 0,
    month: '',
  },
  comparison: {
    previousMonth: 0,
    change: 0,
    trend: 'decreased',
  },
};

const useCarbon = () => {
  const [loading,               setLoading]               = useState(false);
  const [error,                 setError]                 = useState('');
  const [carbonData,            setCarbonData]            = useState(emptyData);
  const [flaggedRecords,        setFlaggedRecords]        = useState([]);
  const [flaggedLoading,        setFlaggedLoading]        = useState(false);
  const [resubmitResult,        setResubmitResult]        = useState('');
  const [resubmitSuccess,       setResubmitSuccess]       = useState(false);
  const [showHowCalculated,     setShowHowCalculated]     = useState(false);
  const [showMonthlyComparison, setShowMonthlyComparison] = useState(false);

  // ── Load flagged (revision_requested) records ────────────────────────────
  const loadFlaggedRecords = useCallback(async () => {
    setFlaggedLoading(true);
    try {
      // Pull carbon records and flagged EcoTrust transactions in parallel
      const [carbonRes, txRes] = await Promise.all([
        api.get('/carbon/all'),
        api.get('/ecotrust/transactions'),
      ]);

      const allRecords = carbonRes.data?.data?.records || [];
      const txRaw =
        Array.isArray(txRes.data?.data)         ? txRes.data.data         :
        Array.isArray(txRes.data?.data?.data)   ? txRes.data.data.data    :
        Array.isArray(txRes.data?.transactions) ? txRes.data.transactions :
        Array.isArray(txRes.data)               ? txRes.data              :
        [];

      // Index carbon records by record_id and route_id for quick lookup
      const byRecordId = new Map();
      const byRouteId  = new Map();
      allRecords.forEach(r => {
        if (r.record_id) byRecordId.set(String(r.record_id), r);
        if (r.route_id)  byRouteId.set(String(r.route_id), r);
      });

      // Keep only flagged carbon-related transactions
      const flagged = txRaw.filter(tx => {
        const flagged = tx.flagged || tx.is_flagged;
        const isCarbon = tx.action_type === 'carbon_verified' || tx.related_record_type === 'carbon_record';
        return flagged && isCarbon;
      }).map(tx => {
        const key = tx.related_record_id != null ? String(tx.related_record_id) : null;
        const match = (key && (byRecordId.get(key) || byRouteId.get(key))) || null;
        if (match) {
          return {
            ...match,
            flag_reason: tx.flag_reason || match.revision_notes,
            revision_notes: tx.flag_reason || match.revision_notes,
            flagged_at: tx.flagged_at || match.flagged_at,
            verification_status: match.verification_status || 'revision_requested',
          };
        }
        // Fallback if no carbon record match found — still show something
        return {
          record_id: key,
          route_id: key,
          route_name: tx.related_record_type || 'Carbon record',
          verification_status: 'revision_requested',
          flag_reason: tx.flag_reason,
          flagged_at: tx.flagged_at,
        };
      });

      setFlaggedRecords(flagged);
    } catch (err) {
      // Keep previous flagged list if the request fails to avoid flicker
      console.warn('[useCarbon] loadFlaggedRecords failed', err?.response?.status);
    } finally {
      setFlaggedLoading(false);
    }
  }, []);

  // ── Load main carbon footprint data ─────────────────────────────────────
  const loadCarbonData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await carbonService.getCarbonFootprint();
      if (response?.success && response?.data) {
        setCarbonData(response.data);
      } else {
        setCarbonData(emptyData);
      }
    } catch (_err) {
      setError('Failed to load carbon footprint data');
      setCarbonData({
        ...emptyData,
        thisMonth: {
          ...emptyData.thisMonth,
          month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        },
      });
    } finally {
      setLoading(false);
      // Keep flagged list in sync whenever we refresh the carbon dashboard
      loadFlaggedRecords();
    }
  }, [loadFlaggedRecords]);

  // ── Resubmit a flagged record back to pending ────────────────────────────
  // Calls PATCH /api/carbon/:id/resubmit — admin-only endpoint
  const resubmitRecord = useCallback(async (recordId, correctionNote = '', correctedFuelLiters = null) => {
    setResubmitResult('');
    try {
      await api.patch(`/carbon/${recordId}/resubmit`, {
        notes: correctionNote,
        corrected_fuel_liters: correctedFuelLiters,
      });
      setResubmitSuccess(true);
      setResubmitResult('✓ Record resubmitted. Carlo will review it again in his pending queue.');
      await loadFlaggedRecords();
    } catch (err) {
      setResubmitSuccess(false);
      setResubmitResult(
        err?.response?.data?.message || 'Failed to resubmit. Please try again.'
      );
    }
  }, [loadFlaggedRecords]);

  useEffect(() => {
    loadCarbonData();
    loadFlaggedRecords();
  }, [loadCarbonData, loadFlaggedRecords]);

  const decreaseAmount = Math.abs(carbonData?.comparison?.change || 0).toFixed(1);

  return {
    // ── existing fields — nothing removed ───────────────────────────────────
    loading,
    error,
    carbonData,
    showHowCalculated,
    showMonthlyComparison,
    decreaseAmount,
    loadCarbonData,
    setShowHowCalculated,
    setShowMonthlyComparison,
    // ── new fields ───────────────────────────────────────────────────────────
    flaggedRecords,
    flaggedLoading,
    resubmitRecord,
    resubmitResult,
    resubmitSuccess,
    refreshFlagged: loadFlaggedRecords,
  };
};

export default useCarbon;
