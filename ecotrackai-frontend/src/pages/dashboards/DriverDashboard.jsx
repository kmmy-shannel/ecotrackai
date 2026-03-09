import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, MapPin, Navigation, Truck } from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import { useGPS } from '../../hooks/useGPS';
import deliveryService from '../../services/delivery.service';
import { formatDistance, GEOFENCE_RADIUS_METERS } from '../../utils/gpsUtils';
import { getTimelineChips } from '../../utils/statusMachines';

const parseStops = (route) => {
  if (Array.isArray(route?.stops)) return route.stops;
  if (typeof route?.stops === 'string') {
    try {
      return JSON.parse(route.stops);
    } catch (_error) {
      return [];
    }
  }
  return [];
};

const normalizeStop = (stop, index, total) => {
  const type = stop.type || (index === 0 ? 'origin' : index === total - 1 ? 'destination' : 'stop');
  return {
    ...stop,
    id: stop.stop_id || stop.stopId || `${type}-${index}`,
    type,
    status: stop.status || 'pending',
    latitude: Number(stop.latitude ?? stop.lat ?? 0),
    longitude: Number(stop.longitude ?? stop.lng ?? 0),
  };
};

const DriverDashboard = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { location, getCurrentLocation, startTracking, stopTracking, distanceTo, isTracking } = useGPS({
    enableTracking: false,
    updateInterval: 5000,
  });

  const [route, setRoute] = useState(null);
  const [assignedRoutes, setAssignedRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deliveryLog, setDeliveryLog] = useState({
    actualDistanceKm: '',
    actualFuelUsedLiters: '',
    actualDurationMinutes: '',
    notes: '',
  });
  const activeTab = searchParams.get('tab') || 'today';

  const loadAssignedRoute = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await deliveryService.getAllDeliveries();
      const allRoutes =
        response?.data?.data?.deliveries ||
        response?.data?.deliveries ||
        response?.deliveries ||
        [];

      const userId = user?.userId ?? user?.user_id;
      const normalizedName = String(user?.fullName || user?.username || user?.name || '')
        .trim()
        .toLowerCase();

      const assignedCandidates = allRoutes.filter((item) => {
        const driverId = item.driver_user_id || item.driverUserId;
        const driverName = String(item.driver_name || item.driver || '')
          .trim()
          .toLowerCase();
        return (
          (driverId && String(driverId) === String(userId)) ||
          (normalizedName && driverName && driverName === normalizedName)
        );
      });

      setAssignedRoutes(assignedCandidates);

      if (!assignedCandidates.length) {
        setRoute(null);
        return;
      }

      const assigned = assignedCandidates.find((item) =>
        ['approved', 'awaiting_approval', 'optimized', 'planned', 'in_progress'].includes(
          String(item.status || '').toLowerCase()
        )
      ) || assignedCandidates[0];

      const stops = parseStops(assigned);
      const normalizedStops = stops.map((stop, index) =>
        normalizeStop(stop, index, stops.length)
      );

      setRoute({
        ...assigned,
        id: assigned.route_id || assigned.delivery_id || assigned.id,
        status: assigned.status || 'planned',
        stops: normalizedStops,
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load assigned route');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAssignedRoute();
  }, [loadAssignedRoute]);

  const currentStop = useMemo(() => {
    if (!route?.stops?.length) return null;
    const nextStop = route.stops.find((stop) => stop.type !== 'origin' && stop.status !== 'departed');
    return nextStop || route.stops[route.stops.length - 1];
  }, [route]);

  const destinationStop = useMemo(() => {
    if (!route?.stops?.length) return null;
    return route.stops[route.stops.length - 1];
  }, [route]);

  const currentDistance = useMemo(() => {
    if (!currentStop || !location) return null;
    return distanceTo(currentStop);
  }, [currentStop, location, distanceTo]);

  const destinationDistance = useMemo(() => {
    if (!destinationStop || !location) return null;
    return distanceTo(destinationStop);
  }, [destinationStop, location, distanceTo]);

  const isWithinCurrentGeofence =
    typeof currentDistance === 'number' && currentDistance <= GEOFENCE_RADIUS_METERS;

  const isWithinDestinationGeofence =
    typeof destinationDistance === 'number' &&
    destinationDistance <= GEOFENCE_RADIUS_METERS;

  const allStopsDeparted = useMemo(
    () => (route?.stops || []).filter((stop) => stop.type !== 'origin').every((stop) => stop.status === 'departed'),
    [route]
  );

  const refreshAndTrack = async () => {
    await loadAssignedRoute();
    await getCurrentLocation();
  };

  const startRoute = async () => {
    if (!route) return;
    setActionLoading(true);
    setError('');
    try {
      const gps = await getCurrentLocation();
      await deliveryService.startDelivery(
        route.id,
        { latitude: gps.latitude, longitude: gps.longitude, accuracy: location?.accuracy },
        route.status
      );
      await startTracking();
      setSuccess('Delivery started');
      await refreshAndTrack();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to start delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const markArrived = async () => {
    if (!route || !currentStop || !isWithinCurrentGeofence) return;
    setActionLoading(true);
    setError('');
    try {
      const gps = await getCurrentLocation();
      await deliveryService.markStopArrived(
        route.id,
        currentStop.id,
        { latitude: gps.latitude, longitude: gps.longitude, accuracy: location?.accuracy },
        route.status
      );
      setSuccess('Stop arrival recorded');
      await refreshAndTrack();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to mark arrival');
    } finally {
      setActionLoading(false);
    }
  };

  const markDeparted = async () => {
    if (!route || !currentStop || !isWithinCurrentGeofence) return;
    setActionLoading(true);
    setError('');
    try {
      await deliveryService.markStopDeparted(route.id, currentStop.id, route.status);
      setSuccess('Stop departure recorded');
      await refreshAndTrack();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to mark departure');
    } finally {
      setActionLoading(false);
    }
  };

  const completeRoute = async () => {
    if (!route) return;
    setActionLoading(true);
    setError('');
    try {
      await deliveryService.completeDelivery(route.id, deliveryLog, route.status);
      stopTracking();
      setSuccess('Delivery completed');
      await refreshAndTrack();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to complete delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const timeline = getTimelineChips('route', route?.status);

  return (
    <Layout currentPage="Driver Dashboard" user={user}>
      <div className="max-w-3xl mx-auto space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 text-red-100 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/40 text-emerald-100 px-4 py-3 text-sm">
            {success}
          </div>
        ) : null}

        {activeTab === 'profile' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4 space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-100)]">Driver Profile</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] p-3">
                <p className="text-[var(--text-300)]">Name</p>
                <p className="text-[var(--text-100)] font-semibold">{user?.fullName || user?.name || '-'}</p>
              </div>
              <div className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] p-3">
                <p className="text-[var(--text-300)]">Email</p>
                <p className="text-[var(--text-100)] font-semibold">{user?.email || '-'}</p>
              </div>
              <div className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] p-3">
                <p className="text-[var(--text-300)]">Role</p>
                <p className="text-[var(--text-100)] font-semibold">Driver</p>
              </div>
              <div className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] p-3">
                <p className="text-[var(--text-300)]">Business ID</p>
                <p className="text-[var(--text-100)] font-semibold">{user?.businessId || user?.business_id || '-'}</p>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'history' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4 space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-100)]">Delivery History</h2>
            {assignedRoutes.filter((item) => String(item.status).toLowerCase() === 'completed').length === 0 ? (
              <p className="text-sm text-[var(--text-300)]">No completed deliveries yet.</p>
            ) : (
              assignedRoutes
                .filter((item) => String(item.status).toLowerCase() === 'completed')
                .map((item) => (
                  <div
                    key={item.route_id || item.delivery_id || item.id}
                    className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] p-3 text-sm"
                  >
                    <p className="text-[var(--text-100)] font-semibold">
                      {item.route_name || item.delivery_code || item.id}
                    </p>
                    <p className="text-[var(--text-300)] mt-1">
                      Completed at {item.completed_at || item.updated_at || item.created_at || '-'}
                    </p>
                  </div>
                ))
            )}
          </div>
        ) : null}

        {activeTab === 'today' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4">
          <h2 className="text-lg font-semibold text-[var(--text-100)] mb-3">Today's Route</h2>
          {loading ? (
            <p className="text-sm text-[var(--text-300)]">Loading route...</p>
          ) : !route ? (
            <p className="text-sm text-[var(--text-300)]">No route currently assigned.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-300)]">Route</p>
                  <p className="font-semibold text-[var(--text-100)]">{route.route_name || route.id}</p>
                </div>
                <span className="rounded-full bg-[var(--surface-700)] px-3 py-1 text-xs text-[var(--text-300)]">
                  {String(route.status).replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {timeline.map((chip) => (
                  <span
                    key={chip.status}
                    className={`rounded-full px-2.5 py-1 text-xs capitalize ${
                      chip.state === 'done'
                        ? 'bg-emerald-900/60 text-emerald-100'
                        : chip.state === 'current'
                          ? 'bg-[var(--accent-500)] text-[var(--text-100)]'
                          : 'bg-[var(--surface-700)] text-[var(--text-300)]'
                    }`}
                  >
                    {chip.status.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] p-3">
                {route.stops.map((stop, index) => (
                  <div key={stop.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-[var(--text-100)]">
                      <MapPin size={14} className="text-[var(--accent-400)]" />
                      <span>{index + 1}. {stop.location || `${stop.latitude}, ${stop.longitude}`}</span>
                    </div>
                    <span className="text-[var(--text-300)]">{stop.status}</span>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={startRoute}
                  disabled={actionLoading || route.status !== 'approved'}
                  className="rounded-lg px-4 py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-400)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--text-100)] font-semibold"
                >
                  Start Delivery
                </button>
                <button
                  onClick={() => getCurrentLocation()}
                  disabled={actionLoading}
                  className="rounded-lg px-4 py-2.5 border border-[var(--surface-700)] hover:bg-[var(--surface-700)] text-[var(--text-100)]"
                >
                  Refresh GPS
                </button>
              </div>
            </div>
          )}
          </div>
        ) : null}

        {route && activeTab === 'today' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4 space-y-4">
            <h3 className="font-semibold text-[var(--text-100)]">Stop Execution</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] p-3">
                <p className="text-xs text-[var(--text-300)] mb-1">Current stop distance</p>
                <p className="text-lg font-semibold text-[var(--text-100)]">
                  {typeof currentDistance === 'number' ? formatDistance(currentDistance) : '-'}
                </p>
                <p className="text-xs text-[var(--text-300)] mt-1">
                  Action unlock radius: {GEOFENCE_RADIUS_METERS}m
                </p>
              </div>
              <div className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] p-3">
                <p className="text-xs text-[var(--text-300)] mb-1">GPS tracking</p>
                <p className="text-lg font-semibold text-[var(--text-100)]">
                  {isTracking ? 'Active' : 'Inactive'}
                </p>
                <p className="text-xs text-[var(--text-300)] mt-1">
                  Updates every 5 seconds during route execution
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={markArrived}
                disabled={
                  actionLoading ||
                  route.status !== 'in_progress' ||
                  !currentStop ||
                  currentStop.status === 'arrived' ||
                  currentStop.status === 'departed' ||
                  !isWithinCurrentGeofence
                }
                className="rounded-lg px-4 py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-400)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--text-100)]"
              >
                Mark Arrived
              </button>
              <button
                onClick={markDeparted}
                disabled={
                  actionLoading ||
                  route.status !== 'in_progress' ||
                  !currentStop ||
                  currentStop.status !== 'arrived' ||
                  !isWithinCurrentGeofence
                }
                className="rounded-lg px-4 py-2.5 bg-[var(--surface-700)] hover:bg-[var(--accent-500)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--text-100)]"
              >
                Mark Departed
              </button>
            </div>
          </div>
        ) : null}

        {route && activeTab === 'today' ? (
          <div className="rounded-xl border border-[var(--surface-700)] bg-[var(--bg-900)] p-4 space-y-3">
            <h3 className="font-semibold text-[var(--text-100)] flex items-center gap-2">
              <Truck size={16} className="text-[var(--accent-400)]" />
              Delivery Log
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Actual distance km"
                value={deliveryLog.actualDistanceKm}
                onChange={(event) =>
                  setDeliveryLog((prev) => ({ ...prev, actualDistanceKm: event.target.value }))
                }
                className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] px-3 py-2 text-[var(--text-100)]"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Fuel liters"
                value={deliveryLog.actualFuelUsedLiters}
                onChange={(event) =>
                  setDeliveryLog((prev) => ({ ...prev, actualFuelUsedLiters: event.target.value }))
                }
                className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] px-3 py-2 text-[var(--text-100)]"
              />
              <input
                type="number"
                min="0"
                placeholder="Duration minutes"
                value={deliveryLog.actualDurationMinutes}
                onChange={(event) =>
                  setDeliveryLog((prev) => ({ ...prev, actualDurationMinutes: event.target.value }))
                }
                className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] px-3 py-2 text-[var(--text-100)]"
              />
            </div>
            <textarea
              rows="2"
              placeholder="Driver notes"
              value={deliveryLog.notes}
              onChange={(event) => setDeliveryLog((prev) => ({ ...prev, notes: event.target.value }))}
              className="w-full rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] px-3 py-2 text-[var(--text-100)]"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-[var(--surface-700)] bg-[var(--bg-800)] px-3 py-2 text-sm">
                <p className="text-[var(--text-300)] flex items-center gap-1">
                  <Navigation size={14} />
                  Destination distance
                </p>
                <p className="text-[var(--text-100)] font-semibold mt-1">
                  {typeof destinationDistance === 'number' ? formatDistance(destinationDistance) : '-'}
                </p>
              </div>
              <button
                onClick={completeRoute}
                disabled={
                  actionLoading ||
                  route.status !== 'in_progress' ||
                  !allStopsDeparted ||
                  !isWithinDestinationGeofence ||
                  !deliveryLog.actualDistanceKm ||
                  !deliveryLog.actualFuelUsedLiters
                }
                className="rounded-lg px-4 py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-400)] disabled:opacity-60 disabled:cursor-not-allowed text-[var(--text-100)] font-semibold flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                Complete Delivery
              </button>
            </div>
            <p className="text-xs text-[var(--text-300)] flex items-center gap-1">
              <Clock3 size={12} />
              Complete action is enabled only when all stops are departed and within {GEOFENCE_RADIUS_METERS}m of destination.
            </p>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default DriverDashboard;
