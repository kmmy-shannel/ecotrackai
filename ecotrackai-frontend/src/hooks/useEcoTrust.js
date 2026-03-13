// ============================================================
// FILE: ecotrackai-frontend/src/hooks/useEcoTrust.js
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import ecoTrustService from '../services/ecotrust.service';

export default function useEcoTrust(businessId) {
  const [score,       setScore]       = useState(0);
  const [level,       setLevel]       = useState('Newcomer');
  const [levelNumber, setLevelNumber] = useState(1);
  const [nextLevel,   setNextLevel]   = useState(null);
  const [pointsToNext,setPointsToNext]= useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [transactions,setTransactions]= useState([]);
  const [breakdown,   setBreakdown]   = useState([]);
  const [actions,     setActions]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError('');
    try {
      // Fetch score + actions in parallel
      const [scoreRes, actionsRes] = await Promise.all([
        ecoTrustService.getScore(),
        ecoTrustService.getSustainableActions(),
      ]);

      // Score data — backend wraps in sendSuccess → { success, message, data }
      const s = scoreRes?.data ?? scoreRes;
      setScore(s.current_score       ?? 0);
      setLevel(s.level               ?? 'Newcomer');
      setLevelNumber(s.level_number  ?? 1);
      setNextLevel(s.next_level      ?? null);
      setPointsToNext(s.points_to_next ?? 0);
      setProgressPct(s.progress_pct  ?? 0);
      setTransactions(s.transactions ?? []);
      setBreakdown(s.breakdown       ?? []);

      // Actions data
      const a = actionsRes?.data ?? actionsRes;
      setActions(Array.isArray(a) ? a : []);
    } catch (err) {
      console.error('[useEcoTrust] load error:', err);
      setError(err.response?.data?.message || 'Failed to load EcoTrust data');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  return {
    score, level, levelNumber,
    nextLevel, pointsToNext, progressPct,
    transactions, breakdown, actions,
    loading, error,
    refresh: load,
  };
}