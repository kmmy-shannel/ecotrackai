// ============================================================
// FILE: src/hooks/useLogisticsApprovals.jsx
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

let dashboardEndpointMode = 'auto';

const parseMaybeJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const pickNumber = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeLocation = (rawLocation = {}, fallback = {}) => {
  const location = { ...fallback, ...parseMaybeJson(rawLocation) };
  const lat = pickNumber(
    location.lat,
    location.latitude,
    location.origin_latitude,
    location.destination_latitude
  );
  const lng = pickNumber(
    location.lng,
    location.longitude,
    location.lon,
    location.origin_longitude,
    location.destination_longitude
  );

  return {
    lat: lat || null,
    lng: lng || null,
    address: location.address || location.location_name || location.stop_name || location.name || '',
  };
};

const normalizeStops = (rawStops = []) => {
  if (!Array.isArray(rawStops)) return [];
  return rawStops
    .map((stop, index, allStops) => {
      const fallbackLocation = {
        lat: stop?.lat ?? stop?.latitude,
        lng: stop?.lng ?? stop?.longitude ?? stop?.lon,
        address: stop?.address || stop?.location_name || stop?.stop_name || stop?.name || '',
      };
      const location = normalizeLocation(stop?.location, fallbackLocation);
      if (!location.lat || !location.lng) return null;

      const type =
        stop?.stop_type ||
        stop?.type ||
        (index === 0 ? 'origin' : index === allStops.length - 1 ? 'destination' : 'stop');
      const name =
        location.address ||
        stop?.address ||
        stop?.location_name ||
        stop?.stop_name ||
        stop?.name ||
        (type === 'origin' ? 'Origin' : type === 'destination' ? 'Destination' : `Stop ${index + 1}`);

      return {
        ...stop,
        type,
        stop_type: type,
        lat: location.lat,
        lng: location.lng,
        latitude: location.lat,
        longitude: location.lng,
        name,
        stop_name: stop?.stop_name || name,
        location_name: stop?.location_name || name,
        address: stop?.address || name,
        location: {
          lat: location.lat,
          lng: location.lng,
          address: stop?.address || name,
        },
      };
    })
    .filter(Boolean);
};

const normalizeDashboardSummary = (summary = {}) => ({
  pending_count: summary.pending_count ?? summary.pendingApprovals ?? 0,
  approved_count: summary.approved_count ?? summary.approvedToday ?? 0,
  declined_count: summary.declined_count ?? summary.declined ?? 0,
  avg_co2_saved: summary.avg_co2_saved ?? summary.avgCO2Saved ?? 0,
  avg_fuel_saved: summary.avg_fuel_saved ?? summary.avgFuelSaved ?? 0,
  avg_km_saved: summary.avg_km_saved ?? summary.avgKmSaved ?? 0,
  total_co2_reduced: summary.total_co2_reduced ?? summary.totalCO2Reduced ?? 0,
  total_km_saved: summary.total_km_saved ?? summary.totalKmSaved ?? 0,
});

const extractApiData = (res, fallback = []) => {
  const payload = res?.data;
  return payload?.data ?? payload ?? fallback;
};

const normalizePendingRoute = (route = {}) => {
  const existingExtra = parseMaybeJson(route.extra_data || route.extraData);
  const requestData = parseMaybeJson(route.request_data || route.requestData);
  const routeDetails =
    existingExtra.route && typeof existingExtra.route === 'object'
      ? existingExtra.route
      : requestData;
  const optimizationDetails =
    existingExtra.optimization && typeof existingExtra.optimization === 'object'
      ? existingExtra.optimization
      : parseMaybeJson(requestData.optimization);

  const originLocation = normalizeLocation(
    route.origin_location || route.originLocation || routeDetails.origin_location || routeDetails.originLocation,
    {
      lat:
        route.origin_latitude ??
        route.originLatitude ??
        routeDetails.origin_latitude ??
        routeDetails.originLatitude,
      lng:
        route.origin_longitude ??
        route.originLongitude ??
        routeDetails.origin_longitude ??
        routeDetails.originLongitude,
      address: route.from || route.from_location || routeDetails.from || routeDetails.from_location || '',
    }
  );
  const destinationLocation = normalizeLocation(
    route.destination_location || route.destinationLocation || routeDetails.destination_location || routeDetails.destinationLocation,
    {
      lat:
        route.destination_latitude ??
        route.destinationLatitude ??
        routeDetails.destination_latitude ??
        routeDetails.destinationLatitude,
      lng:
        route.destination_longitude ??
        route.destinationLongitude ??
        routeDetails.destination_longitude ??
        routeDetails.destinationLongitude,
      address: route.to || route.to_location || routeDetails.to || routeDetails.to_location || '',
    }
  );

  const originalStops = normalizeStops(
    route.original_stops ||
      route.originalStops ||
      route.stops ||
      routeDetails.original_stops ||
      routeDetails.originalStops ||
      routeDetails.stops ||
      existingExtra?.stops ||
      []
  );
  const optimizedStops = normalizeStops(
    route.optimized_stops ||
      route.optimizedStops ||
      optimizationDetails.stops ||
      optimizationDetails.optimized_stops ||
      optimizationDetails.optimizedStops ||
      []
  );
  const displayStops =
    originalStops.length > 0
      ? originalStops
      : normalizeStops(route.stops || routeDetails.stops || routeDetails.original_stops || routeDetails.originalStops || []);
  const routeName =
    route.route_name ||
    route.routeName ||
    routeDetails.route_name ||
    routeDetails.routeName ||
    route.route_code ||
    route.routeCode ||
    routeDetails.route_code ||
    routeDetails.routeCode ||
    route.product_name ||
    `Route-${route.route_id || route.routeId || route.approval_id || route.approvalId || route.id || 'pending'}`;
  const submittedAt = route.submitted_at || route.submittedTime || route.created_at || route.departure_time || null;
  const aiRecommendation =
    route.ai_recommendation ||
    route.aiRecommendation ||
    route.aiSuggestion ||
    route.ai_suggestion ||
    routeDetails.ai_recommendation ||
    routeDetails.aiRecommendation ||
    routeDetails.aiSuggestion ||
    routeDetails.ai_suggestion ||
    null;

  const normalizedExtra = {
    ...existingExtra,
    stops: displayStops,
    route: {
      ...(existingExtra.route || {}),
      route_id: route.route_id ?? route.routeId ?? existingExtra?.route?.route_id ?? null,
      route_name: routeName,
      origin_location: originLocation,
      destination_location: destinationLocation,
      stops: displayStops,
      route_path:
        route.route_path ||
        route.routePath ||
        routeDetails.route_path ||
        routeDetails.routePath ||
        existingExtra?.route?.route_path ||
        [],
    },
    optimization: {
      ...(existingExtra.optimization || {}),
      origin_location: originLocation,
      destination_location: destinationLocation,
      stops: optimizedStops.length > 0 ? optimizedStops : displayStops,
      route_path:
        route.optimized_path ||
        route.optimizedPath ||
        optimizationDetails.route_path ||
        optimizationDetails.routePath ||
        existingExtra?.optimization?.route_path ||
        [],
    },
    originalRoute: {
      ...(existingExtra.originalRoute || {}),
      totalDistance: pickNumber(existingExtra?.originalRoute?.totalDistance, route.original_distance, route.originalDistance, route.total_distance_km),
      fuelConsumption: pickNumber(existingExtra?.originalRoute?.fuelConsumption, route.original_fuel, route.originalFuel, route.estimated_fuel_consumption_liters),
      carbonEmissions: pickNumber(existingExtra?.originalRoute?.carbonEmissions, route.original_co2, route.originalCO2, route.estimated_carbon_kg),
      stops: displayStops,
    },
    optimizedRoute: {
      ...(existingExtra.optimizedRoute || {}),
      totalDistance: pickNumber(existingExtra?.optimizedRoute?.totalDistance, route.optimized_distance, route.optimizedDistance, route.optimized_distance_km),
      fuelConsumption: pickNumber(existingExtra?.optimizedRoute?.fuelConsumption, route.optimized_fuel, route.optimizedFuel, route.optimized_fuel_liters),
      carbonEmissions: pickNumber(existingExtra?.optimizedRoute?.carbonEmissions, route.optimized_co2, route.optimizedCO2, route.optimized_carbon_kg),
      stops: optimizedStops.length > 0 ? optimizedStops : displayStops,
    },
    savings: {
      ...(existingExtra.savings || {}),
      distance: pickNumber(existingExtra?.savings?.distance, route.savings_km, route.totalSavingsKm),
      fuel: pickNumber(existingExtra?.savings?.fuel, route.savings_fuel, route.totalSavingsFuel),
      emissions: pickNumber(existingExtra?.savings?.emissions, route.savings_co2, route.totalSavingsCO2),
    },
    aiRecommendations:
      existingExtra.aiRecommendations ||
      (aiRecommendation ? [aiRecommendation] : []),
  };

  return {
    ...route,
    id: route.id ?? route.approval_id ?? route.approvalId ?? null,
    approval_id: route.approval_id ?? route.approvalId ?? route.id ?? null,
    approvalId: route.approvalId ?? route.approval_id ?? route.id ?? null,
    route_id: route.route_id ?? route.routeId ?? null,
    routeId: route.routeId ?? route.route_id ?? null,
    product_name: routeName,
    route_name: routeName,
    routeName: routeName,
    driver_name: route.driver_name || route.driver || 'Driver Not Assigned',
    driver: route.driver || route.driver_name || 'Driver Not Assigned',
    vehicle_type: route.vehicle_type || route.vehicle || null,
    location: originLocation,
    created_at: submittedAt,
    submitted_at: submittedAt,
    submittedTime: submittedAt,
    submitted_by_name: route.submitted_by_name || route.submittedByName || route.submittedBy || route.submitted_by || null,
    total_distance_km: pickNumber(route.total_distance_km, route.original_distance, route.originalDistance),
    optimized_distance: pickNumber(route.optimized_distance, route.optimizedDistance, route.optimized_distance_km),
    estimated_fuel_consumption_liters: pickNumber(route.estimated_fuel_consumption_liters, route.original_fuel, route.originalFuel),
    optimized_fuel: pickNumber(route.optimized_fuel, route.optimizedFuel, route.optimized_fuel_liters),
    estimated_carbon_kg: pickNumber(route.estimated_carbon_kg, route.original_co2, route.originalCO2),
    optimized_carbon_kg: pickNumber(route.optimized_carbon_kg, route.optimized_co2, route.optimizedCO2),
    savings_km: pickNumber(route.savings_km, route.totalSavingsKm),
    savings_fuel: pickNumber(route.savings_fuel, route.totalSavingsFuel),
    savings_co2: pickNumber(route.savings_co2, route.totalSavingsCO2),
    ai_recommendation: aiRecommendation,
    stops: displayStops,
    original_stops: displayStops,
    optimized_stops: optimizedStops.length > 0 ? optimizedStops : displayStops,
    extra_data: normalizedExtra,
    extraData: normalizedExtra,
  };
};

const normalizeHistoryEntry = (entry = {}) => {
  const existingExtra = parseMaybeJson(entry.extra_data || entry.extraData);
  const requestData = parseMaybeJson(entry.request_data || entry.requestData);
  const fromLocation =
    entry.from_location ||
    entry.from ||
    requestData.from_location ||
    requestData.from ||
    normalizeLocation(entry.location).address ||
    (typeof entry.location === 'string' ? entry.location : '') ||
    'Unknown';
  const toLocation = entry.to_location || entry.to || requestData.to_location || requestData.to || '';
  const genericType = ['STANDARD', 'DELIVERY'].includes(String(entry.product_name || '').trim().toUpperCase());
  const routeName =
    entry.route_name ||
    entry.routeName ||
    requestData.route_name ||
    requestData.routeName ||
    (!genericType ? entry.product_name : '') ||
    `Route-${entry.route_id || entry.routeId || entry.approval_id || entry.approvalId || 'history'}`;
  const savingsKm = pickNumber(entry.savings_km, existingExtra?.savings?.distance);
  const savingsFuel = pickNumber(entry.savings_fuel, existingExtra?.savings?.fuel);
  const savingsCo2 = pickNumber(entry.savings_co2, existingExtra?.savings?.emissions);
  const aiRecommendation =
    entry.ai_recommendation ||
    entry.aiRecommendation ||
    entry.ai_suggestion ||
    entry.aiSuggestion ||
    existingExtra?.aiRecommendations?.[0] ||
    null;

  const normalizedExtra = {
    ...existingExtra,
    route: {
      ...(existingExtra.route || {}),
      route_id: entry.route_id ?? entry.routeId ?? entry.approval_id ?? entry.approvalId ?? null,
      route_name: routeName,
      from_location: fromLocation,
      to_location: toLocation || null,
    },
    savings: {
      ...(existingExtra.savings || {}),
      distance: savingsKm,
      fuel: savingsFuel,
      emissions: savingsCo2,
    },
    aiRecommendations:
      existingExtra.aiRecommendations ||
      (aiRecommendation ? [aiRecommendation] : []),
  };

  return {
    ...entry,
    status: String(entry.status || '').trim().toLowerCase(),
    route_name: routeName,
    routeName: routeName,
    product_name: routeName,
    from_location: fromLocation,
    to_location: toLocation || null,
    location:
      toLocation && toLocation !== fromLocation
        ? `${fromLocation} -> ${toLocation}`
        : fromLocation,
    savings_km: savingsKm,
    savings_fuel: savingsFuel,
    savings_co2: savingsCo2,
    ai_recommendation: aiRecommendation,
    extra_data: normalizedExtra,
    extraData: normalizedExtra,
  };
};

export default function useLogisticsApprovals() {
  const [pending,  setPending]  = useState([]);
  const [history,  setHistory]  = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [stats,    setStats]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const flash = (setter, msg, ms = 3000) => {
    setter(msg);
    setTimeout(() => setter(''), ms);
  };

  const loadLegacyDashboardData = useCallback(async () => {
    const [pendingRes, statsRes, driversRes] = await Promise.all([
      api.get('/logistics/pending'),
      api.get('/logistics/stats'),
      api.get('/logistics/driver-monitor'),
    ]);

    return {
      pendingRoutes: Array.isArray(extractApiData(pendingRes)) ? extractApiData(pendingRes) : [],
      summary: extractApiData(statsRes, {}),
      driverMonitor: Array.isArray(extractApiData(driversRes)) ? extractApiData(driversRes) : [],
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (dashboardEndpointMode === 'legacy') {
      return loadLegacyDashboardData();
    }

    try {
      const dashboardRes = await api.get('/logistics/dashboard');
      const dashboardPayload = extractApiData(dashboardRes, {});
      dashboardEndpointMode = 'dashboard';
      return {
        pendingRoutes: Array.isArray(dashboardPayload.pendingRoutes) ? dashboardPayload.pendingRoutes : [],
        summary: dashboardPayload.summary || {},
        driverMonitor: Array.isArray(dashboardPayload.driverMonitor) ? dashboardPayload.driverMonitor : [],
      };
    } catch (err) {
      if (err?.response?.status !== 404) throw err;
      dashboardEndpointMode = 'legacy';
      return loadLegacyDashboardData();
    }
  }, [loadLegacyDashboardData]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardPayload, historyRes] = await Promise.all([
        loadDashboardData(),
        api.get('/logistics/history'),
      ]);
      const pendingRoutes = Array.isArray(dashboardPayload.pendingRoutes)
        ? dashboardPayload.pendingRoutes.map(normalizePendingRoute)
        : [];

      setPending(pendingRoutes);
      setHistory(
        Array.isArray(extractApiData(historyRes))
          ? extractApiData(historyRes).map(normalizeHistoryEntry)
          : []
      );
      setStats(normalizeDashboardSummary(dashboardPayload.summary || {}));
      setDrivers(Array.isArray(dashboardPayload.driverMonitor) ? dashboardPayload.driverMonitor : []);
    } catch (err) {
      console.error('[useLogisticsApprovals]', err);
      setError(err.response?.data?.message || 'Failed to load logistics data');
    } finally {
      setLoading(false);
    }
  }, [loadDashboardData]);

  useEffect(() => { loadAll(); }, [loadAll]);

   const approveRoute = async (approvalId, comment = '', driverUserId = null) => {
    setError('');
    try {
      await api.patch(`/logistics/${approvalId}/approve`, { 
        comment, 
        driverUserId: driverUserId ? parseInt(driverUserId, 10) : null 
      });
      flash(setSuccess, '✓ Route approved — driver has been notified');
      await loadAll();
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Failed to approve route');
    }
  };

  const declineRoute = async (approvalId, comment = '') => {
    if (!comment.trim()) {
      flash(setError, 'A reason is required to decline');
      return;
    }
    setError('');
    try {
      await api.patch(`/logistics/${approvalId}/decline`, {
        reason: comment,
        comment,
      });
      flash(setSuccess, 'Route declined — admin has been notified');
      await loadAll();
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Failed to decline route');
    }
  };

  return {
    pending, history, drivers, stats,
    loading, error, success,
    approveRoute, declineRoute,
    refresh: loadAll,
  };
}
