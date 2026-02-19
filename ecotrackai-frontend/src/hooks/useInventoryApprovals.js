import { useState, useEffect, useCallback } from 'react';
import approvalService from '../services/approval.service';

const useInventoryApprovals = () => {
  const [approvals, setApprovals]     = useState([]);
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [stats, setStats]             = useState({
    pending: 0, approvedToday: 0, declined: 0
  });

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await approvalService.getInventoryApprovals();
      const data = response.data || [];
      setApprovals(data);
      setStats({
        pending:       data.filter(a => a.status === 'pending').length,
        approvedToday: data.filter(a => a.status === 'approved').length,
        declined:      data.filter(a => a.status === 'declined').length,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await approvalService.getApprovalHistory();
      setHistory(response.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const submitDecision = async (id, decision, comments) => {
    try {
      setLoading(true);
      await approvalService.submitDecision(id, decision, comments);
      await fetchApprovals(); // refresh list after decision
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  return { approvals, history, stats, loading, error, submitDecision, fetchApprovals, fetchHistory };
};

export default useInventoryApprovals;