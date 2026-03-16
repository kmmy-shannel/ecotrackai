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
    }
  }, []);

  // ── Load flagged (revision_requested) records ────────────────────────────
  const loadFlaggedRecords = useCallback(async () => {
    setFlaggedLoading(true);
    try {
      const res = await api.get('/carbon/all');
      const all = res.data?.data?.records || [];
      setFlaggedRecords(
        all.filter(r => r.verification_status === 'revision_requested')
      );
    } catch (_err) {
      setFlaggedRecords([]);
    } finally {
      setFlaggedLoading(false);
    }
  }, []);

  // ── Resubmit a flagged record back to pending ────────────────────────────
  // Calls PATCH /api/carbon/:id/resubmit — admin-only endpoint
  const resubmitRecord = useCallback(async (recordId, correctionNote = '') => {
    setResubmitResult('');
    try {
      await api.patch(`/carbon/${recordId}/resubmit`, { notes: correctionNote });
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