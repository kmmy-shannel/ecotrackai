import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

/*
 * STEP 6 — Verify the EcoScore Hook Reads Correctly
 * 
 * This hook should call:
 * GET /api/ecotrust/score/:businessId
 * 
 * Expected response shape:
 * {
 *   total_points: number,
 *   level: string,
 *   transactions: array
 * }
 * 
 * The current implementation maps the response to handle
 * different possible response structures.
 */

const useEcoTrust = (businessId) => {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState('Newcomer');
  const [nextLevelPoints, setNextLevelPoints] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadEcoTrust = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/ecotrust/score', { params: { business_id: businessId } });
      const payload = response?.data?.data || response?.data || {};
      setScore(payload.current_score || payload.score || 0);

      setLevel(payload.level || 'Newcomer');
      setNextLevelPoints(payload.nextLevelPoints || payload.next_level_points || 0);
      setTransactions(payload.transactions || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load EcoTrust data');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadEcoTrust();
  }, [loadEcoTrust]);

  return {
    score,
    level,
    nextLevelPoints,
    transactions,
    loading,
    error,
    refresh: loadEcoTrust,
  };
};

export default useEcoTrust;