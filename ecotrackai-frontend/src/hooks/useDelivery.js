// ============================================================
// FILE LOCATION: src/hooks/useDelivery.js
// LAYER: ViewModel — state + business logic ONLY
// COMPATIBLE WITH: In-memory backend (delivery.routes.js) + AI service
// ============================================================

import { useState, useEffect } from 'react';
import deliveryService from '../services/delivery.service';

const useDelivery = () => {
  // ── State ──────────────────────────────────────────────────
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedDelivery, setExpandedDelivery] = useState(null);
  const [optimizingRoute, setOptimizingRoute] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);

  // ── Business Logic ─────────────────────────────────────────

  // Load all deliveries from API
  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveryService.getAllDeliveries();
      const deliveriesList = response.data?.deliveries || response.deliveries || [];
      setDeliveries(deliveriesList);
      setError('');
    } catch (err) {
      console.error('Load deliveries error:', err);
      setError(err.response?.data?.message || 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  // Optimize route using AI (backend calls aiService.optimizeDeliveryRoute)
  const optimizeRoute = async (delivery) => {
    try {
      setOptimizingRoute(delivery.id);
      const response = await deliveryService.optimizeRoute(delivery.id);
      
      if (response.success) {
        setOptimizationResult(response.data);
        setShowOptimizationModal(true);
      }
    } catch (error) {
      console.error('Optimization error:', error);
      setError(error.response?.data?.message || 'Failed to optimize route');
      setTimeout(() => setError(''), 3000);
    } finally {
      setOptimizingRoute(null);
    }
  };

  // Delete a delivery with confirmation
  const deleteDelivery = async (deliveryId) => {
    if (!window.confirm('Are you sure you want to delete this delivery?')) {
      return;
    }
    
    try {
      await deliveryService.deleteDelivery(deliveryId);
      loadDeliveries();
      setSuccess('Delivery deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.message || 'Failed to delete delivery');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Apply optimization to a delivery
  const applyOptimization = async () => {
    if (!optimizationResult) return;

    try {
      await deliveryService.applyOptimization(
        optimizationResult.originalRoute.id,
        optimizationResult.optimizedRoute
      );
      
      setSuccess('Route optimization applied successfully');
      setShowOptimizationModal(false);
      setOptimizationResult(null);
      loadDeliveries();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Apply optimization error:', error);
      setError('Failed to apply optimization');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Handle successful delivery creation
  const handleDeliveryCreated = () => {
    setShowAddModal(false);
    loadDeliveries();
    setSuccess('Delivery planned successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Close optimization modal
  const closeOptimizationModal = () => {
    setShowOptimizationModal(false);
    setOptimizationResult(null);
  };

  // ── Helpers ────────────────────────────────────────────────

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return badges[status] || badges.pending;
  };

  // ── Computed Values ────────────────────────────────────────

  // Filter deliveries by search term
  const filteredDeliveries = deliveries.filter(delivery =>
    delivery.deliveryCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.driver?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary statistics
  const summaryStats = {
    totalDeliveries: deliveries.length,
    inProgress: deliveries.filter(d => d.status === 'in_progress').length,
    totalDistance: deliveries.reduce((sum, d) => sum + (parseFloat(d.totalDistance) || 0), 0).toFixed(1)
  };

  // ── Effects ────────────────────────────────────────────────

  // Auto-load deliveries on mount
  useEffect(() => {
    loadDeliveries();
  }, []);

  // ── Public API ─────────────────────────────────────────────
  return {
    // State
    deliveries: filteredDeliveries,
    loading,
    error,
    success,
    searchTerm,
    showAddModal,
    expandedDelivery,
    optimizingRoute,
    optimizationResult,
    showOptimizationModal,
    summaryStats,

    // Actions
    setSearchTerm,
    setShowAddModal,
    setExpandedDelivery,
    deleteDelivery,
    optimizeRoute,
    applyOptimization,
    handleDeliveryCreated,
    closeOptimizationModal,

    // Helpers
    getStatusBadge
  };
};

export default useDelivery;