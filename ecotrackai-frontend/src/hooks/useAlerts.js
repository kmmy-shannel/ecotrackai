// ============================================================
// FILE LOCATION: src/hooks/useAlerts.js
// PURPOSE: State + logic for AlertsPage
// KEY FIX: submitReview('accepted') now calls approvalService.createFromAlert
//          which creates a pending approval visible to the Inventory Manager
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import alertService from '../services/alert.service';
import approvalService from '../services/approval.service';

const useAlerts = () => {
  const [alerts, setAlerts]               = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [stats, setStats]                 = useState({ total: 0, high_risk: 0, medium_risk: 0, low_risk: 0 });
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [searchTerm, setSearchTerm]       = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  // AI modal state
  const [showAIModal, setShowAIModal]       = useState(false);
  const [selectedAlert, setSelectedAlert]   = useState(null);
  const [aiInsights, setAiInsights]         = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // ── Load alerts on mount ────────────────────────────────────
  useEffect(() => {
    loadAlerts();
  }, []);

  // ── Filter whenever alerts / search / filter change ────────
  useEffect(() => {
    let result = [...alerts];

    if (searchTerm.trim()) {
      result = result.filter(a =>
        a.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedFilter !== 'All') {
      result = result.filter(a =>
        a.risk_level?.toLowerCase() === selectedFilter.toLowerCase()
      );
    }

    setFilteredAlerts(result);
  }, [alerts, searchTerm, selectedFilter]);

  // ── Fetch all alerts + sync ─────────────────────────────────
  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);

      // Auto-sync to generate alerts from current products
      try { await alertService.syncAlerts(); } catch { /* non-fatal */ }

      const response = await alertService.getAllAlerts();
      const data = response?.data || response?.alerts || response || [];
      const list = Array.isArray(data) ? data : (data.alerts || []);
      setAlerts(list);

      // Compute stats locally (in case /stats endpoint is slow)
      setStats({
        total:       list.length,
        high_risk:   list.filter(a => a.risk_level === 'HIGH').length,
        medium_risk: list.filter(a => a.risk_level === 'MEDIUM').length,
        low_risk:    list.filter(a => a.risk_level === 'LOW').length,
      });
    } catch (err) {
      console.error('Load alerts error:', err);
      setError('Failed to load alerts');
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Delete an alert ─────────────────────────────────────────
  const deleteAlert = useCallback(async (id) => {
    try {
      await alertService.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      setSuccess('Alert deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete alert');
      setTimeout(() => setError(''), 3000);
    }
  }, []);

  // ── Open AI modal and fetch insights ───────────────────────
  const getAIInsights = useCallback(async (alert) => {
    setSelectedAlert(alert);
    setAiInsights(null);
    setShowAIModal(true);
    setLoadingInsights(true);

    try {
      const response = await alertService.getAIInsights(alert.id);
      const insights = response?.data || response;
      setAiInsights(insights);
    } catch {
      // Fallback — rule-based insights so UI never stays empty
      const daysLeft   = alert.days_left || 0;
      const riskLevel  = alert.risk_level;

      const fallbackMap = {
        HIGH: {
          recommendations: [
            `Immediate delivery recommended — only ${daysLeft} days remaining`,
            'Apply 20–30% promotional discount to accelerate sales',
            'Prioritise this product in the next delivery batch',
            `Verify cooling: current temp ${alert.temperature ?? '?'}°C`,
            'Alert top buyers about limited-time bulk availability',
          ],
          priority_actions: [
            'Immediate: Schedule delivery within 24–48 hours',
            'Short-term: Contact buyers for emergency bulk orders',
            'Medium-term: Review supplier lead times',
          ],
          cost_impact: String((parseFloat(alert.value || 0) * 0.80).toFixed(2)),
        },
        MEDIUM: {
          recommendations: [
            `${daysLeft} days left — schedule delivery this week`,
            'Monitor storage conditions daily',
            'Bundle with faster-moving products to increase turnover',
          ],
          priority_actions: [
            'Short-term: Include in next delivery route within 5–7 days',
            'Medium-term: Optimise storage conditions',
            'Long-term: Adjust order quantities based on demand',
          ],
          cost_impact: String((parseFloat(alert.value || 0) * 0.50).toFixed(2)),
        },
        LOW: {
          recommendations: [
            'Product condition is stable — continue regular monitoring',
            'Maintain current storage conditions',
            `${daysLeft} days allows standard distribution`,
          ],
          priority_actions: [
            'Regular: Continue standard monitoring procedures',
            'Medium-term: Track shelf-life patterns',
            'Long-term: Optimise procurement cycles',
          ],
          cost_impact: String((parseFloat(alert.value || 0) * 0.10).toFixed(2)),
        },
      };

      setAiInsights(fallbackMap[riskLevel] || fallbackMap.LOW);
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  // ── Close AI modal ──────────────────────────────────────────
  const closeAIModal = useCallback(() => {
    setShowAIModal(false);
    setSelectedAlert(null);
    setAiInsights(null);
  }, []);

  // ── CORE CONNECTION: Admin accepts → creates Inventory Manager approval ─
  const submitReview = useCallback(async (decision) => {
    if (!selectedAlert) return;

    try {
      if (decision === 'accepted') {
        // Build the AI suggestion string from fetched insights
        const aiSuggestion = aiInsights?.recommendations?.[0]
          ? `${aiInsights.recommendations[0]}. ${aiInsights.priority_actions?.[0] || ''}`
          : `${selectedAlert.risk_level} risk: ${selectedAlert.days_left} days remaining — immediate action required.`;

        // Priority maps from risk_level
        const priorityMap = { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' };

        // Create a pending approval in the Inventory Manager's queue
        await approvalService.createFromAlert({
          alertId:      selectedAlert.id,
          productName:  selectedAlert.product_name,
          quantity:     selectedAlert.quantity     || 'N/A',
          location:     selectedAlert.location     || 'N/A',
          daysLeft:     selectedAlert.days_left    || 0,
          riskLevel:    selectedAlert.risk_level   || 'MEDIUM',
          priority:     priorityMap[selectedAlert.risk_level] || 'MEDIUM',
          aiSuggestion,
          requiredRole: 'inventory_manager',
          approvalType: 'spoilage_action',
        });

        // Mark the alert as resolved so it leaves the admin's view
        await alertService.updateAlertStatus(selectedAlert.id, 'resolved');
        setAlerts(prev => prev.filter(a => a.id !== selectedAlert.id));

        setSuccess('✓ Recommendations accepted — sent to Inventory Manager for approval');
      } else {
        // Admin rejected → just dismiss the alert
        await alertService.updateAlertStatus(selectedAlert.id, 'dismissed');
        setAlerts(prev => prev.filter(a => a.id !== selectedAlert.id));
        setSuccess('Recommendations dismissed');
      }

      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Submit review error:', err);
      setError('Failed to submit decision. Please try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      closeAIModal();
    }
  }, [selectedAlert, aiInsights, closeAIModal]);

  // ── UI helpers ──────────────────────────────────────────────
  const getRiskBadgeColor = (level) => ({
    HIGH:   'bg-red-100 text-red-700 border-red-200',
    MEDIUM: 'bg-orange-100 text-orange-700 border-orange-200',
    LOW:    'bg-green-100 text-green-700 border-green-200',
  }[level] || 'bg-gray-100 text-gray-700 border-gray-200');

  const getRiskBadgeText = (level) => ({
    HIGH: 'HIGH RISK', MEDIUM: 'MEDIUM RISK', LOW: 'LOW RISK',
  }[level] || level);

  const getProductImage = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('tomato'))  return '🍅';
    if (n.includes('lettuce') || n.includes('salad')) return '🥬';
    if (n.includes('chicken') || n.includes('poultry')) return '🍗';
    if (n.includes('fish') || n.includes('seafood'))    return '🐟';
    if (n.includes('milk') || n.includes('dairy'))      return '🥛';
    if (n.includes('bread'))   return '🍞';
    if (n.includes('fruit'))   return '🍎';
    if (n.includes('veg'))     return '🥦';
    if (n.includes('egg'))     return '🥚';
    if (n.includes('meat') || n.includes('beef') || n.includes('pork')) return '🥩';
    return '📦';
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