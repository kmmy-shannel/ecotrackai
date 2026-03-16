import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

// ─── Level config (must match EcoScorePage's TRUST_LEVELS) ───────────────────
const TRUST_LEVELS = [
  { level: 1, name: 'Newcomer',     min: 0,    max: 499  },
  { level: 2, name: 'Eco Warrior',  min: 500,  max: 999  },
  { level: 3, name: 'Eco Champion', min: 1000, max: 1999 },
  { level: 4, name: 'Eco Leader',   min: 2000, max: 3999 },
  { level: 5, name: 'Eco Legend',   min: 4000, max: null },
];

const getLevelInfo = (score) => {
  const current = TRUST_LEVELS.findLast(l => score >= l.min) || TRUST_LEVELS[0];
  const next    = TRUST_LEVELS.find(l => l.level === current.level + 1) || null;

  const pointsToNext  = next ? next.min - score : 0;
  const rangeSize     = next ? next.min - current.min : 1;
  const progressPct   = next
    ? Math.min(100, Math.round(((score - current.min) / rangeSize) * 100))
    : 100;

  return {
    levelNumber: current.level,
    level:       current.name,
    nextLevel:   next ? next.name : null,
    pointsToNext,
    progressPct,
  };
};

// ─── Build breakdown by category from transactions ────────────────────────────
const buildBreakdown = (transactions = []) => {
  const map = {};
  transactions.forEach(tx => {
    const cat = tx.category || tx.action_type || 'other';
    if (!map[cat]) map[cat] = { category: cat, total_points: 0 };
    map[cat].total_points += Number(tx.points_earned) || 0;
  });
  return Object.values(map);
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
const useEcoTrust = (businessId) => {
  const [score,        setScore]        = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [breakdown,    setBreakdown]    = useState([]);
  const [actions,      setActions]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const loadEcoTrust = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/ecotrust/score', {
        params: { business_id: businessId },
      });

      const payload = response?.data?.data || response?.data || {};

      const currentScore = Number(
        payload.current_score ?? payload.total_points ?? payload.score ?? 0
      );

      const txList = Array.isArray(payload.transactions)
        ? payload.transactions
        : [];

      const actionList = Array.isArray(payload.actions)
        ? payload.actions
        : [];

      setScore(currentScore);
      setTransactions(txList);
      setBreakdown(buildBreakdown(txList));
      setActions(actionList);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load EcoTrust data');
      // keep existing state on error — don't reset to undefined
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadEcoTrust();
  }, [loadEcoTrust]);

  // Derive level info from score every render (cheap calculation)
  const { levelNumber, level, nextLevel, pointsToNext, progressPct } =
    getLevelInfo(score);

  return {
    // ── what EcoScorePage needs ──────────────────────────────────────────────
    score,
    level,
    levelNumber,
    nextLevel,
    pointsToNext,
    progressPct,
    transactions,   // array — never undefined
    breakdown,      // array — never undefined
    actions,        // array — never undefined
    // ── legacy fields (kept so nothing else breaks) ──────────────────────────
    nextLevelPoints: pointsToNext,
    // ── utils ────────────────────────────────────────────────────────────────
    loading,
    error,
    refresh: loadEcoTrust,
  };
};

export default useEcoTrust;