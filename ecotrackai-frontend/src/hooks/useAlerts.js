import { useCallback, useEffect, useMemo, useState } from 'react';
import alertService from '../services/alert.service';
import { canTransitionSpoilage } from '../utils/statusMachines';

const useAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await alertService.getAllAlerts();
      const list = response?.data?.alerts || response?.alerts || [];
      setAlerts(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const filteredAlerts = useMemo(() => {
    let result = [...alerts];
    if (searchTerm.trim()) {
      const text = searchTerm.toLowerCase();
      result = result.filter((alert) =>
        String(alert.product_name || '').toLowerCase().includes(text)
      );
    }
    if (selectedFilter !== 'All') {
      result = result.filter(
        (alert) => String(alert.risk_level || '').toLowerCase() === selectedFilter.toLowerCase()
      );
    }
    return result;
  }, [alerts, searchTerm, selectedFilter]);

  const stats = useMemo(
    () => ({
      total: alerts.length,
      high_risk: alerts.filter((item) => item.risk_level === 'HIGH').length,
      medium_risk: alerts.filter((item) => item.risk_level === 'MEDIUM').length,
      low_risk: alerts.filter((item) => item.risk_level === 'LOW').length,
    }),
    [alerts]
  );

  const deleteAlert = useCallback(async (id) => {
    try {
      await alertService.deleteAlert(id);
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
      setSuccess('Alert deleted');
      setTimeout(() => setSuccess(''), 2500);
    } catch (_err) {
      setError('Failed to delete alert');
      setTimeout(() => setError(''), 3000);
    }
  }, []);

  const getAIInsights = useCallback(async (alert) => {
    setSelectedAlert(alert);
    setAiInsights(null);
    setShowAIModal(true);
    setLoadingInsights(true);
    try {
      const response = await alertService.getAIInsights(alert.id);
      setAiInsights(response?.data || response);
    } catch (_err) {
      const daysLeft = alert.days_left || 0;
      setAiInsights({
        recommendations: [`Schedule redistribution within ${daysLeft} days`],
        priority_actions: ['Move to next available delivery plan'],
        cost_impact: String((Number(alert.value || 0) * 0.5).toFixed(2)),
        _source: 'fallback',
      });
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  const closeAIModal = useCallback(() => {
    setShowAIModal(false);
    setSelectedAlert(null);
    setAiInsights(null);
  }, []);

  const submitReview = useCallback(
    async (decision) => {
      if (!selectedAlert) return;
      try {
        if (decision === 'accepted') {
          if (!canTransitionSpoilage(selectedAlert.status || 'active', 'pending_review')) {
            throw new Error('Alert cannot move to pending_review from its current status');
          }
          // use new submit endpoint which handles approval creation and status change
          await alertService.submitForApproval(selectedAlert.id, {
            aiSuggestion:
              aiInsights?.recommendations?.[0] ||
              `${selectedAlert.risk_level} risk with ${selectedAlert.days_left} days remaining`,
          });
          // local sync of status
          setAlerts((prev) =>
            prev.map((alert) =>
              alert.id === selectedAlert.id ? { ...alert, status: 'pending_review' } : alert
            )
          );
          setSuccess('Alert submitted to Inventory Manager');
        } else {
          await alertService.updateAlertStatus(selectedAlert.id, 'dismissed');
          setAlerts((prev) => prev.filter((alert) => alert.id !== selectedAlert.id));
          setSuccess('Alert dismissed');
        }
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Failed to submit review');
        setTimeout(() => setError(''), 4000);
      } finally {
        closeAIModal();
      }
    },
    [selectedAlert, aiInsights, closeAIModal]
  );

  const getRiskBadgeColor = (level) =>
    (
      {
        HIGH: 'bg-red-100 text-red-700 border-red-200',
        MEDIUM: 'bg-orange-100 text-orange-700 border-orange-200',
        LOW: 'bg-green-100 text-green-700 border-green-200',
      }[level] || 'bg-gray-100 text-gray-700 border-gray-200'
    );

  const getRiskBadgeText = (level) =>
    (
      {
        HIGH: 'HIGH RISK',
        MEDIUM: 'MEDIUM RISK',
        LOW: 'LOW RISK',
      }[level] || level
    );

  const getProductImage = (name = '') => {
    const cleaned = String(name).trim();
    return cleaned ? cleaned.slice(0, 3).toUpperCase() : 'PRD';
  };

  return {
    filteredAlerts,
    loading,
    stats,
    error,
    success,
    searchTerm,
    selectedFilter,
    showAIModal,
    selectedAlert,
    aiInsights,
    loadingInsights,
    setSearchTerm,
    setSelectedFilter,
    deleteAlert,
    getAIInsights,
    closeAIModal,
    submitReview,
    getRiskBadgeColor,
    getRiskBadgeText,
    getProductImage,
  };
};

export default useAlerts;