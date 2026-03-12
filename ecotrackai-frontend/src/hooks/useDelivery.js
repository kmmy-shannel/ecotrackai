// ============================================================
// FILE: src/hooks/useDelivery.js
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import deliveryService from '../services/delivery.service';

// ── Normalize a raw DB row into the shape the UI expects ──
const normalizeDelivery = (raw) => {
  const parseLocation = (val) => {
    try { return typeof val === 'string' ? JSON.parse(val) : (val || {}); }
    catch { return {}; }
  };

  const origin = parseLocation(raw.origin_location);
  const dest   = parseLocation(raw.destination_location);

  const rawStops = Array.isArray(raw.stops) ? raw.stops : [];
  const stops = rawStops.map(s => {
    const loc = parseLocation(s.location);
    return {
      id:       s.stop_id,
      type:     s.stop_type || 'stop',
      location: s.location_name || loc.address || loc.name || 'Stop',
      lat:      parseFloat(loc.lat || loc.latitude  || 0) || null,
      lng:      parseFloat(loc.lng || loc.longitude || 0) || null,
      products: [],
    };
  });

  // Build origin/dest display name — prefer address string over raw coords
  const buildName = (loc) => {
    if (loc.address && !/^\d/.test(loc.address)) return loc.address;
    if (loc.name    && !/^\d/.test(loc.name))    return loc.name;
    const lat = parseFloat(loc.lat || loc.latitude  || 0);
    const lng = parseFloat(loc.lng || loc.longitude || 0);
    return lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Unknown';
  };

  return {
    id:                raw.route_id,
    deliveryCode:      raw.route_name || `Route-${raw.route_id}`,
    driver:            raw.driver_full_name || raw.driver_name || 'Driver Not Assigned',
    date: raw.created_at
      ? new Date(raw.created_at).toLocaleDateString('en-US', {
          month: 'numeric', day: 'numeric', year: 'numeric'
        })
      : '—',
    stops,
    stopCount: parseInt(raw.stop_count || raw.stops_count || rawStops.length || 0),
    totalDistance:     parseFloat(raw.total_distance_km                || 0).toFixed(1),
    estimatedDuration: parseInt(raw.estimated_duration_minutes         || 0),
    carbonEmissions:   parseFloat(raw.estimated_carbon_kg              || 0).toFixed(2),
    fuelConsumption:   parseFloat(raw.estimated_fuel_consumption_liters || 0).toFixed(2),
    vehicleType:       raw.vehicle_type || '—',
    status:            raw.status       || 'planned',
    declineReason:     raw.decline_reason || raw.manager_comment || null,
    originName:        buildName(origin),
    destName:          buildName(dest),
    // Keep raw coords for map use
    originLat: parseFloat(origin.lat || origin.latitude  || 0) || null,
    originLng: parseFloat(origin.lng || origin.longitude || 0) || null,
    destLat:   parseFloat(dest.lat   || dest.latitude    || 0) || null,
    destLng:   parseFloat(dest.lng   || dest.longitude   || 0) || null,
  };
};

// ── Status badge colours ──────────────────────────────────
const getStatusBadge = (status) => ({
  planned:            'bg-gray-100 text-gray-600',
  optimized:          'bg-purple-100 text-purple-700',
  awaiting_approval:  'bg-yellow-100 text-yellow-700',
  approved:           'bg-green-100 text-green-700',
  declined:           'bg-red-100 text-red-600',
  in_transit:         'bg-blue-100 text-blue-700',
  assigned_to_driver: 'bg-blue-50 text-blue-600',
  delivered:          'bg-emerald-100 text-emerald-700',
  completed:          'bg-green-200 text-green-800',
  cancelled:          'bg-gray-200 text-gray-500',
  in_progress:        'bg-blue-100 text-blue-700',
  pending:            'bg-gray-100 text-gray-500',
}[status] || 'bg-gray-100 text-gray-600');

export default function useDelivery() {
  const [deliveries,            setDeliveries]            = useState([]);
  const [loading,               setLoading]               = useState(true);
  const [error,                 setError]                 = useState('');
  const [success,               setSuccess]               = useState('');
  const [searchTerm,            setSearchTerm]            = useState('');
  const [showAddModal,          setShowAddModal]          = useState(false);
  const [expandedDelivery,      setExpandedDelivery]      = useState(null);
  const [expandedStops,         setExpandedStops]         = useState({});
  const [optimizingRoute,       setOptimizingRoute]       = useState(null);
  const [optimizationResult,    setOptimizationResult]    = useState(null);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [confirmModal,          setConfirmModal]          = useState(null); // { type, id, isResubmit? }

  const flash = (setter, msg, ms = 4000) => {
    setter(msg);
    setTimeout(() => setter(''), ms);
  };

  // ── Load list ─────────────────────────────────────────────
  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await deliveryService.getAllDeliveries();
      const raw  = response?.data?.data ?? response?.data ?? response ?? [];
      const list = Array.isArray(raw) ? raw : [];
      setDeliveries(list.map(normalizeDelivery));
    } catch (err) {
      console.error('[useDelivery] loadDeliveries error:', err);
      flash(setError, err.response?.data?.message || 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  // ── Load stops on-demand when a row is expanded ───────────
  const handleExpandDelivery = useCallback(async (deliveryId) => {
    if (expandedDelivery === deliveryId) {
      setExpandedDelivery(null);
      return;
    }
    setExpandedDelivery(deliveryId);
    if (expandedStops[deliveryId]) return;

    try {
      const response = await deliveryService.getDeliveryById(deliveryId);
      const detail   = response?.data?.data ?? response?.data ?? response;
      const rawStops = detail?.stops || [];

      const stops = rawStops.map(s => {
        const loc = (() => {
          try { return typeof s.location === 'string' ? JSON.parse(s.location) : (s.location || {}); }
          catch { return {}; }
        })();
        return {
          id:       s.stop_id,
          type:     s.stop_type || 'stop',
          location: s.location_name || loc.address || loc.name || 'Stop',
          lat:      parseFloat(loc.lat || loc.latitude  || 0) || null,
          lng:      parseFloat(loc.lng || loc.longitude || 0) || null,
          products: [],
        };
      });

      setExpandedStops(prev => ({ ...prev, [deliveryId]: stops }));
    } catch (err) {
      console.error('[useDelivery] fetchStops error:', err);
      setExpandedStops(prev => ({ ...prev, [deliveryId]: [] }));
    }
  }, [expandedDelivery, expandedStops]);

  const handleDeliveryCreated = () => {
    setShowAddModal(false);
    loadDeliveries();
    flash(setSuccess, 'Delivery route created successfully');
  };

  // ── Submit route directly for logistics approval ──────────
  const submitRouteForApproval = async (deliveryId, isResubmit = false) => {
    setConfirmModal({ type: 'submit', id: deliveryId, isResubmit });
  };

  const confirmSubmit = async (deliveryId, isResubmit = false) => {
    try {
      const res  = await deliveryService.submitForApproval(deliveryId);
      const body = res?.data ?? res;
      if (body?.success === false) {
        flash(setError, body.message || body.error || 'Submission failed');
        return false;
      }
      const msg = isResubmit
        ? 'Route resubmitted for logistics manager approval'
        : 'Route submitted for logistics manager approval';
      flash(setSuccess, msg);
      await loadDeliveries();
      return true;
    } catch (err) {
      console.error('[useDelivery] submitForApproval error:', err);
      flash(setError, err.response?.data?.message || err.response?.data?.error || 'Failed to submit route for approval');
      return false;
    } finally {
      setConfirmModal(null);
    }
  };

  const deleteDelivery = async (id) => {
    setConfirmModal({ type: 'delete', id });
  };

  const confirmDelete = async (id) => {
    try {
      await deliveryService.deleteDelivery(id);
      flash(setSuccess, 'Route deleted');
      await loadDeliveries();
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Failed to delete route');
    } finally {
      setConfirmModal(null);
    }
  };

  // ── AI optimize ──────────────────────────────────────────
  const optimizeRoute = async (delivery) => {
    setOptimizingRoute(delivery.id);
    setError('');
    try {
      // Build the payload — ensure stops carry lat/lng for TSP reorder
      const stopsWithCoords = (expandedStops[delivery.id] || delivery.stops || []).map(s => ({
        id:            s.id       || s.stop_id,
        type:          s.type     || s.stop_type || 'stop',
        location:      s.location || s.location_name || 'Stop',
        lat:           parseFloat(s.lat || s.latitude  || 0) || null,
        lng:           parseFloat(s.lng || s.longitude || 0) || null,
        products:      s.products || [],
      }));

      const response = await deliveryService.optimizeRoute(delivery.id, {
        stops:             stopsWithCoords,
        totalDistance:     delivery.totalDistance,
        estimatedDuration: delivery.estimatedDuration,
        fuelConsumption:   delivery.fuelConsumption,
        carbonEmissions:   delivery.carbonEmissions,
        deliveryCode:      delivery.deliveryCode,
      });

     // Log raw response to see what shape it actually is
console.log('[optimizeRoute] raw response:', JSON.stringify(response?.data)?.slice(0, 300));
const payload = response?.data?.data ?? response?.data ?? response;

// Guard: if payload doesn't have the expected shape, throw clearly
if (!payload?.originalRoute || !payload?.optimizedRoute) {
  console.error('[optimizeRoute] Unexpected payload shape:', payload);
  throw new Error('Optimization response missing route data');
}

// Do NOT reload here — wait until user actually confirms in the modal
      // Status will update after applyOptimization() or when modal is closed
      const normalizeStops = (arr) =>
        (arr || []).map(s => ({
          ...s,
          lat: parseFloat(s.lat || 0) || null,
          lng: parseFloat(s.lng || 0) || null,
        }));

      const result = {
        deliveryId:    delivery.id,
        currentStatus: 'optimized',
        originalRoute: {
          deliveryCode:      delivery.deliveryCode,
          totalDistance:     payload.originalRoute?.totalDistance     ?? delivery.totalDistance,
          estimatedDuration: payload.originalRoute?.estimatedDuration ?? delivery.estimatedDuration,
          fuelConsumption:   payload.originalRoute?.fuelConsumption   ?? delivery.fuelConsumption,
          carbonEmissions:   payload.originalRoute?.carbonEmissions   ?? delivery.carbonEmissions,
          stops:             normalizeStops(payload.originalRoute?.stops ?? stopsWithCoords),
        },
        optimizedRoute: {
          totalDistance:     payload.optimizedRoute?.totalDistance     ?? payload.optimizedDistance    ?? delivery.totalDistance,
          estimatedDuration: payload.optimizedRoute?.estimatedDuration ?? payload.optimizedDuration   ?? delivery.estimatedDuration,
          fuelConsumption:   payload.optimizedRoute?.fuelConsumption   ?? payload.optimizedFuel        ?? delivery.fuelConsumption,
          carbonEmissions:   payload.optimizedRoute?.carbonEmissions   ?? payload.optimizedCarbon     ?? delivery.carbonEmissions,
          stops:             normalizeStops(payload.optimizedRoute?.stops ?? stopsWithCoords),
        },
        savings: payload.savings ?? {
          distance:  payload.savingsKm   ?? 0,
          time:      0,
          fuel:      payload.savingsFuel ?? 0,
          emissions: payload.savingsCo2  ?? 0,
        },
        aiRecommendations: payload.aiRecommendations
          ?? (payload.aiRecommendation ? [payload.aiRecommendation] : ['Route has been optimized.']),
        improvementPct: payload.improvementPct ?? 20,
        usedFallback:   payload.usedFallback   ?? false,
      };

      setOptimizationResult(result);
      setShowOptimizationModal(true);
    } catch (err) {
      console.error('[useDelivery] optimizeRoute error:', err);
      flash(setError, err.response?.data?.message || 'Failed to optimize route');
    } finally {
      setOptimizingRoute(null);
    }
  };

  // ── Apply optimization → submit for logistics approval ──
  // Called when user clicks "Submit for Logistics Approval" in the modal
  const applyOptimization = async () => {
    if (!optimizationResult) return;
    try {
      const res = await deliveryService.submitForApproval(optimizationResult.deliveryId);
      // Check if backend returned an error in the body
      const body = res?.data ?? res;
      if (body?.success === false) {
        flash(setError, body.message || body.error || 'Submission failed');
        return;
      }
      setShowOptimizationModal(false);
      setOptimizationResult(null);
      flash(setSuccess, 'Route submitted for logistics manager approval');
      // Reload so status flips to awaiting_approval in the table
      await loadDeliveries();
    } catch (err) {
      console.error('[useDelivery] applyOptimization error:', err);
      flash(setError, err.response?.data?.message || err.response?.data?.error || 'Failed to submit for approval');
    }
  };

  const closeOptimizationModal = async () => {
    setShowOptimizationModal(false);
    setOptimizationResult(null);
    // Reload to sync whatever status the backend set (optimized or unchanged)
    await loadDeliveries();
  };

  // ── Summary stats from backend actual metrics API ──────
  const [metricsSummary, setMetricsSummary] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await deliveryService.getMetricsSummary();
        setMetricsSummary(response.data || {});
      } catch (err) {
        console.warn('[useDelivery] metrics API failed:', err);
        // Fallback to local calc
        const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        const deliveredToday = deliveries.filter(d => d.status === 'delivered' && d.date === today);
        setMetricsSummary({
          totalDeliveries: deliveries.length,
          inProgress: deliveries.filter(d => d.status === 'in_transit').length,
          totalDistance: deliveredToday.reduce((s, d) => s + parseFloat(d.totalDistance || 0), 0).toFixed(1),
          fuelSaved: '0.0',
    // co2Reduced: '0.00' // Removed
        });
      } finally {
        setMetricsLoading(false);
      }
    };
    fetchMetrics();
  }, [deliveries]);

  const summaryStats = metricsLoading ? {
    totalDeliveries: 0,
    totalDistance: '—',
    fuelSaved: '—',
    co2Reduced: '—',
    inProgress: 0
  } : {
    totalDeliveries: parseInt(metricsSummary.totalDeliveries || 0),
    totalDistance: metricsSummary.totalDistance || '0.0',
    fuelSaved: metricsSummary.fuelSaved || '0.0',
    // co2Reduced: metricsSummary.co2Reduced || '0.00', // Removed per feedback
    inProgress: parseInt(metricsSummary.inProgress || 0),
  };


  // ── Filtered list ─────────────────────────────────────────
  const filtered = deliveries.filter(d => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.deliveryCode?.toLowerCase().includes(q) ||
      d.driver?.toLowerCase().includes(q)
    );
  });

  return {
    deliveries:   filtered,
    loading, error, success,
    searchTerm, showAddModal,
    expandedDelivery, expandedStops,
    optimizingRoute, optimizationResult, showOptimizationModal,
    confirmModal, setConfirmModal,
    summaryStats,
    setSearchTerm, setShowAddModal,
    setExpandedDelivery: handleExpandDelivery,
    deleteDelivery, confirmDelete,
    optimizeRoute, applyOptimization,
    handleDeliveryCreated, closeOptimizationModal,
    submitRouteForApproval, confirmSubmit,
    getStatusBadge,
  };
}