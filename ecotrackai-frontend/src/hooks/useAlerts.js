import { useState, useEffect } from 'react';
import alertService from '../services/alert.service';
import approvalService from '../services/approval.service';

const useAlerts = () => {
  // ── State ──────────────────────────────────────────────────
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [stats, setStats] = useState({
    total: 0,
    high_risk: 0,
    medium_risk: 0,
    low_risk: 0
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [aiInsights, setAIInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // ── Business Logic ─────────────────────────────────────────

  // Load all alerts from API
  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await alertService.getAllAlerts();
      setAlerts(response.data.alerts || []);
      setError('');
    } catch (err) {
      console.error('Load alerts error:', err);
      setError(err.response?.data?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  // Load alert statistics
  const loadStats = async () => {
    try {
      const response = await alertService.getAlertStats();
      setStats(response.data);
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  // Filter alerts based on search term and risk level
  const filterAlerts = () => {
    let filtered = alerts;

    // Filter by risk level
    if (selectedFilter !== 'All') {
      filtered = filtered.filter(alert => {
        if (selectedFilter === 'High') return alert.risk_level === 'HIGH';
        if (selectedFilter === 'Medium') return alert.risk_level === 'MEDIUM';
        if (selectedFilter === 'Low') return alert.risk_level === 'LOW';
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAlerts(filtered);
  };

  // Delete alert with confirmation
  const deleteAlert = async (id) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      await alertService.deleteAlert(id);
      setSuccess('Alert deleted successfully');
      loadAlerts();
      loadStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete alert error:', err);
      setError('Failed to delete alert');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Get AI insights for an alert
  const getAIInsights = async (alert) => {
    setSelectedAlert(alert);
    setShowAIModal(true);
    setLoadingInsights(true);

    try {
      const response = await alertService.getAIInsights(alert.id);
      setAIInsights(response.data);
    } catch (err) {
      console.error('Get AI insights error:', err);
      setAIInsights({
        recommendations: [
          'Unable to generate insights at this time',
          'Please try again later'
        ],
        priority_actions: [],
        cost_impact: 'Unknown'
      });
    } finally {
      setLoadingInsights(false);
    }
  };

  // Close AI modal
  const closeAIModal = () => {
    setShowAIModal(false);
    setSelectedAlert(null);
    setAIInsights(null);
  };
// Called when admin clicks Accept or Reject in AI modal
const submitReview = async (decision) => {
  if (!selectedAlert) return;

  if (decision === 'accepted') {
    try {
      await approvalService.createFromAlert({
        product_name:  selectedAlert.product_name,
        quantity:      selectedAlert.quantity,
        location:      selectedAlert.location || 'Warehouse',
        days_left:     selectedAlert.days_left,
        risk_level:    selectedAlert.risk_level,
        ai_suggestion: aiInsights?.recommendations?.join(' | ') || '',
      });
      setSuccess('Sent to Inventory Manager for review');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Submit review error:', err);
      setError('Failed to send to manager');
      setTimeout(() => setError(''), 3000);
    }
  } else {
    setSuccess('Recommendation rejected');
    setTimeout(() => setSuccess(''), 3000);
  }

  closeAIModal();
};
  // ── Helpers ────────────────────────────────────────────────

  const getRiskBadgeColor = (riskLevel) => {
    const colors = {
      HIGH: 'bg-red-100 text-red-600 border-red-200',
      MEDIUM: 'bg-orange-100 text-orange-600 border-orange-200',
      LOW: 'bg-green-100 text-green-600 border-green-200'
    };
    return colors[riskLevel] || colors.LOW;
  };

  const getRiskBadgeText = (riskLevel) => {
    const text = {
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low'
    };
    return text[riskLevel] || 'Low';
  };

  const getProductImage = (productName) => {
    return '🥔';
  };

  // ── Effects ────────────────────────────────────────────────

  // Auto-load alerts and stats on mount
  useEffect(() => {
    loadAlerts();
    loadStats();
  }, []);

  // Re-filter when dependencies change
  useEffect(() => {
    filterAlerts();
  }, [alerts, searchTerm, selectedFilter]);

  // ── Public API ─────────────────────────────────────────────
  return {
    // State
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

    // Actions
    setSearchTerm,
    setSelectedFilter,
    deleteAlert,
    getAIInsights,
    closeAIModal,
    submitReview, 

    // Helpers
    getRiskBadgeColor,
    getRiskBadgeText,
    getProductImage
  };
};

export default useAlerts;