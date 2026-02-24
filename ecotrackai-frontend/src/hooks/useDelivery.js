import { useState, useEffect, useCallback } from 'react';
import deliveryService from '../services/delivery.service';
import approvalService from '../services/approval.service';

const useDelivery = () => {
  const [deliveries, setDeliveries]                 = useState([]);
  const [loading, setLoading]                       = useState(false);
  const [error, setError]                           = useState('');
  const [success, setSuccess]                       = useState('');
  const [searchTerm, setSearchTerm]                 = useState('');
  const [showAddModal, setShowAddModal]             = useState(false);
  const [expandedDelivery, setExpandedDelivery]     = useState(null);
  const [optimizingRoute, setOptimizingRoute]       = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [summaryStats, setSummaryStats]             = useState({
    totalDeliveries: 0,
    inProgress: 0,
    totalDistance: 0,
    fuelSaved: 0,
    co2Reduced: 0,
  });

  // ─── Load all deliveries ────────────────────────────────────────────────────
  const loadDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const response = await deliveryService.getAllDeliveries();
      const raw = response?.data?.deliveries || response?.deliveries || [];

      // Normalise each delivery so the UI always has consistent field names
      const normalised = raw.map((d) => ({
        id:                d.delivery_id  || d.id,
        deliveryCode:      d.delivery_code || d.deliveryCode || `DEL-${d.delivery_id || d.id}`,
        driver:            d.driver_name  || d.driver       || 'Unknown Driver',
        vehicleType:       d.vehicle_type || d.vehicleType  || 'standard_truck',
        date:              d.delivery_date || d.created_at  || '',
        status:            d.status        || 'pending',
        totalDistance:     parseFloat(d.total_distance     || d.totalDistance     || 0).toFixed(1),
        estimatedDuration: parseFloat(d.estimated_duration  || d.estimatedDuration  || 0).toFixed(0),
        fuelConsumption:   parseFloat(d.fuel_consumption    || d.fuelConsumption    || 0).toFixed(1),
        carbonEmissions:   parseFloat(d.carbon_emissions    || d.carbonEmissions    || 0).toFixed(2),
        stops: (() => {
          try {
            const s = d.stops || d.route_stops;
            return typeof s === 'string' ? JSON.parse(s) : (s || []);
          } catch { return []; }
        })(),
        // Keep raw for optimisation payload
        _raw: d,
      }));

      // Filter by searchTerm (applied at render, but also stored here)
      setDeliveries(normalised);

      // Compute summary stats
      const inProgress   = normalised.filter(d => d.status === 'in_progress').length;
      const totalDist    = normalised.reduce((sum, d) => sum + parseFloat(d.totalDistance),   0);
      const fuelSaved    = normalised.reduce((sum, d) => sum + parseFloat(d.fuelConsumption), 0) * 0.12;
      const co2Reduced   = normalised.reduce((sum, d) => sum + parseFloat(d.carbonEmissions), 0) * 0.08;

      setSummaryStats({
        totalDeliveries: normalised.length,
        inProgress,
        totalDistance:  parseFloat(totalDist.toFixed(1)),
        fuelSaved:      parseFloat(fuelSaved.toFixed(1)),
        co2Reduced:     parseFloat(co2Reduced.toFixed(2)),
      });
    } catch (err) {
      console.error('Failed to load deliveries:', err);
      setError('Failed to load deliveries');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  // ─── Filtered deliveries for the table ─────────────────────────────────────
  const filteredDeliveries = searchTerm
    ? deliveries.filter(d =>
        d.deliveryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.driver.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : deliveries;

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const deleteDelivery = async (deliveryId) => {
    if (!window.confirm('Delete this delivery?')) return;
    try {
      await deliveryService.deleteDelivery(deliveryId);
      setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
      setSuccess('Delivery deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete delivery');
      setTimeout(() => setError(''), 3000);
    }
  };

  // ─── AI Route Optimisation ──────────────────────────────────────────────────
  const optimizeRoute = async (delivery) => {
    try {
      setOptimizingRoute(delivery.id);
      setError('');

      const response = await deliveryService.optimizeRoute(delivery.id);
      const data     = response?.data || response;

      if (!data || (!data.optimizedRoute && !data.savings)) {
        throw new Error('Invalid optimisation response from server');
      }

      // Attach the delivery reference so applyOptimization can use it
      setOptimizationResult({ ...data, deliveryId: delivery.id, delivery });
      setShowOptimizationModal(true);
    } catch (err) {
      console.error('Optimisation error:', err);
      setError(err?.response?.data?.message || 'Failed to optimise route. Please try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setOptimizingRoute(null);
    }
  };

  // ─── Apply Optimisation → send to Logistics Manager approval queue ──────────
  const applyOptimization = async () => {
    if (!optimizationResult) return;

    try {
      setLoading(true);
      setError('');

      const { deliveryId, delivery, originalRoute, optimizedRoute, savings, aiRecommendations } = optimizationResult;

      // Build the payload for the approval queue
      const approvalPayload = {
        delivery_id:    deliveryId,
        // extra_data is stored as JSON string in the DB
        extra_data: JSON.stringify({
          driver:       delivery?.driver      || originalRoute?.driver      || '',
          vehicleType:  delivery?.vehicleType || originalRoute?.vehicleType || '',
          stops:        originalRoute?.stops  || delivery?.stops            || [],
          originalRoute: {
            totalDistance:     originalRoute?.totalDistance,
            estimatedDuration: originalRoute?.estimatedDuration,
            fuelConsumption:   originalRoute?.fuelConsumption,
            carbonEmissions:   originalRoute?.carbonEmissions,
          },
          optimizedRoute: {
            totalDistance:     optimizedRoute?.totalDistance,
            estimatedDuration: optimizedRoute?.estimatedDuration,
            fuelConsumption:   optimizedRoute?.fuelConsumption,
            carbonEmissions:   optimizedRoute?.carbonEmissions,
          },
          savings: {
            distance:  savings?.distance  || 0,
            time:      savings?.time      || 0,
            fuel:      savings?.fuel      || 0,
            emissions: savings?.emissions || 0,
          },
          aiRecommendations: aiRecommendations || [],
        }),
      };

      // POST to /api/approvals/from-delivery  →  lands in logistics manager queue
      await approvalService.createFromDelivery(approvalPayload);

      setSuccess('Route optimisation sent to Logistics Manager for approval!');
      setShowOptimizationModal(false);
      setOptimizationResult(null);
      setTimeout(() => setSuccess(''), 4000);

      // Refresh list
      loadDeliveries();
    } catch (err) {
      console.error('Apply optimisation error:', err);
      setError(
        err?.response?.data?.message ||
        'Failed to apply optimisation. Please check your connection and try again.'
      );
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  // ─── Close optimisation modal ───────────────────────────────────────────────
  const closeOptimizationModal = () => {
    setShowOptimizationModal(false);
    setOptimizationResult(null);
  };

  // ─── Called after PlanNewDeliveryModal succeeds ─────────────────────────────
  const handleDeliveryCreated = () => {
    setShowAddModal(false);
    loadDeliveries();
  };

  // ─── Status badge colours ───────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const map = {
      pending:     'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed:   'bg-green-100 text-green-700',
      cancelled:   'bg-red-100 text-red-700',
      optimized:   'bg-purple-100 text-purple-700',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  return {
    // state
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
    // setters
    setSearchTerm,
    setShowAddModal,
    setExpandedDelivery,
    // actions
    deleteDelivery,
    optimizeRoute,
    applyOptimization,
    handleDeliveryCreated,
    closeOptimizationModal,
    getStatusBadge,
    loadDeliveries,
  };
};

export default useDelivery;