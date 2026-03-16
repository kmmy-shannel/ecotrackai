// ============================================================
// FILE: src/pages/manager/logistics/LogisticsDashboardView.jsx
// Props-based — data comes from LogisticsManagerPage
// ============================================================
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Leaflet icon fix ──────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
const createIcon = (color) => new L.Icon({
  iconUrl:   `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const originIcon      = createIcon('green');
const stopIcon        = createIcon('blue');
const destinationIcon = createIcon('red');

const DAGUPAN_CENTER = [16.0433, 120.3339];
const DAGUPAN_BOUNDS = [[15.98, 120.27], [16.11, 120.41]];
const DAGUPAN_ZOOM   = 14;

// ── Fit map to route bounds ───────────────────────────────
const FitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      try { map.fitBounds(positions, { padding: [32, 32], maxZoom: 17 }); }
      catch { /* ignore */ }
    }
  }, [map, positions]);
  return null;
};

// ── Fetch real road route from OSRM ──────────────────────
const fetchRoadRoute = async (stops) => {
  // coords = [[lng, lat], ...]
  const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]) return null;
  // GeoJSON coords are [lng, lat] — convert to [lat, lng] for Leaflet
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
};

// ── Route Map Component ───────────────────────────────────
const RouteMapPreview = ({ stops = [] }) => {
  const validStops = stops.filter(s => s.lat && s.lng);
  const [roadPath,    setRoadPath]    = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    if (validStops.length < 2) { setRoadPath([]); return; }
    setRouteLoading(true);
    fetchRoadRoute(validStops)
      .then(path => setRoadPath(path || []))
      .catch(() => setRoadPath([]))
      .finally(() => setRouteLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(validStops)]);

  if (validStops.length === 0) return (
    <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg text-xs text-gray-400">
      No coordinates available for map preview
    </div>
  );

  const markerPositions = validStops.map(s => [s.lat, s.lng]);
  const getIcon = (i) => i === 0 ? originIcon : i === validStops.length - 1 ? destinationIcon : stopIcon;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DAGUPAN_CENTER}
        zoom={DAGUPAN_ZOOM}
        minZoom={13}
        maxZoom={19}
        maxBounds={DAGUPAN_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          attribution="© Google"
          maxZoom={20}
        />
        <Rectangle
          bounds={DAGUPAN_BOUNDS}
          pathOptions={{ color: '#15803d', weight: 2, fillOpacity: 0.02, dashArray: '6 4' }}
        />

        <FitBounds positions={markerPositions} />

        {validStops.map((stop, i) => (
          <Marker key={i} position={[stop.lat, stop.lng]} icon={getIcon(i)}>
            <Popup>
              <div className="text-xs min-w-[140px]">
                <p className="font-bold text-gray-700 mb-1">
                  {i === 0 ? '🟢 Origin' : i === validStops.length - 1 ? '🔴 Destination' : `🔵 Stop ${i}`}
                </p>
                <p className="text-gray-600">{stop.name || `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}`}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Road route path — falls back to straight line if OSRM fails */}
        {roadPath.length > 1 && (
          <Polyline positions={roadPath} color="#15803d" weight={4} opacity={0.85} />
        )}
        {roadPath.length === 0 && !routeLoading && markerPositions.length > 1 && (
          <Polyline positions={markerPositions} color="#15803d" weight={3} opacity={0.6} dashArray="6 4" />
        )}
      </MapContainer>

      {/* Loading overlay */}
      {routeLoading && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow text-xs text-gray-600 font-medium border border-gray-200">
          <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          Calculating road route…
        </div>
      )}

      {/* Dagupan label */}
      <div className="absolute top-2 left-2 z-[1000] px-2.5 py-1 bg-green-800 text-white rounded-lg text-[10px] font-semibold shadow-md pointer-events-none">
        Dagupan City, Pangasinan
      </div>

      {/* ── DEBUG PANEL — remove once routing is confirmed working ── */}
      <div className="absolute top-2 right-2 z-[1000] bg-black/75 text-white rounded-lg px-2.5 py-2 text-[10px] font-mono max-w-[220px] shadow-lg">
        <p className="font-bold text-yellow-300 mb-1">🔍 Debug · Parsed Stops ({validStops.length})</p>
        {validStops.length === 0 ? (
          <p className="text-red-300">⚠ No stops parsed — check extra_data</p>
        ) : (
          validStops.map((s, i) => (
            <div key={i} className={`mb-1 pb-1 ${i < validStops.length - 1 ? 'border-b border-white/20' : ''}`}>
              <p className={i === 0 ? 'text-green-300' : i === validStops.length - 1 ? 'text-red-300' : 'text-blue-300'}>
                {i === 0 ? '🟢' : i === validStops.length - 1 ? '🔴' : '🔵'} {s.name?.slice(0, 22) || 'unnamed'}
              </p>
              <p className="text-gray-300">{s.lat?.toFixed(5)}, {s.lng?.toFixed(5)}</p>
            </div>
          ))
        )}
        <p className="mt-1 pt-1 border-t border-white/20 text-gray-400">
          Road path: {roadPath.length > 0 ? `✅ ${roadPath.length} pts` : routeLoading ? '⏳ loading…' : '❌ none (fallback)'}
        </p>
      </div>
    </div>
  );
};

const Badge = ({ status }) => {
  const colors = {
    pending:    'bg-yellow-100 text-yellow-800',
    approved:   'bg-green-100 text-green-800',
    rejected:   'bg-red-100 text-red-800',
    declined:   'bg-red-100 text-red-800',
    in_transit: 'bg-blue-100 text-blue-800',
    delivered:  'bg-emerald-100 text-emerald-800',
    planned:    'bg-gray-100 text-gray-600',
    optimized:  'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const MetricRow = ({ label, original, optimized, unit }) => {
  const saved    = ((parseFloat(original) || 0) - (parseFloat(optimized) || 0)).toFixed(2);
  const improved = parseFloat(saved) > 0;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 text-sm last:border-0">
      <span className="text-gray-500 w-20">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-gray-400 line-through text-xs">{(parseFloat(original)||0).toFixed(1)}{unit}</span>
        <span className="font-semibold text-gray-800">{(parseFloat(optimized)||0).toFixed(1)}{unit}</span>
        {improved && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">−{saved}</span>
        )}
      </div>
    </div>
  );
};

// ── Parse stops from extra_data or location fields ───────
const parseRouteStops = (item) => {
  try {
    // extra_data is stored as JSON: { route, optimization }
    const extra = typeof item.extra_data === 'string'
      ? JSON.parse(item.extra_data)
      : (item.extra_data || {});

    const routeData = extra.route || {};

    // Try to get stops from route_stops if available
    if (Array.isArray(extra.stops) && extra.stops.length > 0) {
      return extra.stops.map(s => {
        const loc = typeof s.location === 'string' ? (() => { try { return JSON.parse(s.location); } catch { return {}; } })() : (s.location || {});
        return { lat: parseFloat(loc.lat || s.lat || 0) || null, lng: parseFloat(loc.lng || s.lng || 0) || null, name: loc.address || s.location_name || s.name || '' };
      }).filter(s => s.lat && s.lng);
    }

    // Fall back to origin + destination from route object
    const stops = [];
    const origin = typeof routeData.origin_location === 'string'
      ? (() => { try { return JSON.parse(routeData.origin_location); } catch { return {}; } })()
      : (routeData.origin_location || {});
    const dest = typeof routeData.destination_location === 'string'
      ? (() => { try { return JSON.parse(routeData.destination_location); } catch { return {}; } })()
      : (routeData.destination_location || {});

    if (origin.lat && origin.lng) stops.push({ lat: parseFloat(origin.lat), lng: parseFloat(origin.lng), name: origin.address || 'Origin' });
    if (dest.lat && dest.lng)     stops.push({ lat: parseFloat(dest.lat),   lng: parseFloat(dest.lng),   name: dest.address || 'Destination' });

    // Also try item.location as origin if nothing else
    if (stops.length === 0 && item.location) {
      const loc = typeof item.location === 'string' ? (() => { try { return JSON.parse(item.location); } catch { return {}; } })() : (item.location || {});
      if (loc.lat && loc.lng) stops.push({ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng), name: loc.address || 'Origin' });
    }

    return stops;
  } catch { return []; }
};

function ApprovalCard({ item, onApprove, onDecline, drivers = [] }) {
  const [open,             setOpen]       = useState(false);
  const [comment,          setComment]    = useState('');
  const [declining,        setDeclining]  = useState(false);
  const [busy,             setBusy]       = useState(false);
  const [selectedDriver,   setSelectedDriver] = useState('');
  const [showMap,          setShowMap]    = useState(false);
  const routeStops = parseRouteStops(item);

  // Only show drivers without an active ongoing delivery
  const availableDrivers = drivers.filter(d => !d.route_status);

  const origin = (() => {
    try {
      const o = typeof item.location === 'string' ? JSON.parse(item.location) : item.location;
      return o?.address || o?.name || item.location || 'Origin';
    } catch { return item.location || 'Origin'; }
  })();

  const driverName = item.driver_full_name || item.driver_name || 'No driver assigned';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">🚛</div>
          <div>
            <p className="font-semibold text-gray-800">{item.product_name || 'Unnamed Route'}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {driverName} · {item.vehicle_type || '—'} · {origin}
            </p>
            <p className="text-xs text-gray-400">
              Submitted {new Date(item.created_at).toLocaleDateString()} by {item.submitted_by_name || 'admin'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge status="pending" />
          {routeStops.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setShowMap(v => !v); if (!open) setOpen(true); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                showMap ? 'bg-green-700 text-white border-green-700' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
              }`}
            >
              🗺 {showMap ? 'Hide Map' : 'View Map'}
            </button>
          )}
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">

          {/* Route Map Preview */}
          {showMap && routeStops.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Route Map Preview · Dagupan City
              </p>
              <div className="h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <RouteMapPreview stops={routeStops} />
              </div>
              <div className="flex gap-3 mt-2">
                {[
                  { color: 'bg-green-500', label: 'Origin' },
                  { color: 'bg-blue-500',  label: 'Stop' },
                  { color: 'bg-red-500',   label: 'Destination' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(item.optimized_distance || item.optimized_fuel) ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Route Optimization Comparison
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <MetricRow label="Distance" original={item.total_distance_km}                  optimized={item.optimized_distance}   unit=" km" />
                <MetricRow label="Fuel"     original={item.estimated_fuel_consumption_liters}  optimized={item.optimized_fuel}        unit=" L"  />
                <MetricRow label="CO₂"      original={item.estimated_carbon_kg}                optimized={item.optimized_carbon_kg}   unit=" kg" />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { label: 'Distance saved', value: `${(parseFloat(item.savings_km)   || 0).toFixed(1)} km` },
                  { label: 'Fuel saved',     value: `${(parseFloat(item.savings_fuel) || 0).toFixed(1)} L`  },
                  { label: 'CO₂ saved',      value: `${(parseFloat(item.savings_co2)  || 0).toFixed(1)} kg` },
                ].map(s => (
                  <div key={s.label} className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                    <p className="text-xs text-green-700 font-bold">{s.value}</p>
                    <p className="text-xs text-green-600">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              ⚠ No optimization data. Admin submitted without running AI optimization first.
            </div>
          )}

          {item.ai_recommendation && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs font-bold text-green-700 mb-1">AI Recommendation</p>
              <p className="text-sm text-green-800">{item.ai_recommendation}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600">
              {declining ? 'Reason for declining (required)' : 'Comment for admin (optional)'}
            </label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder={declining ? 'Explain why this route is being declined…' : 'Any notes for the admin…'}
              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-500 outline-none" />
          </div>

         {!declining ? (
            <div className="space-y-3">
              {/* Step 4-5: Jose must select a driver before approving */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Assign Driver <span className="text-red-500">*</span>
                </label>
                {availableDrivers.length === 0 ? (
                  <p className="text-xs text-orange-500 py-1">
                    No available drivers. All drivers have active deliveries.
                  </p>
                ) : (
                  <select
                    value={selectedDriver}
                    onChange={e => setSelectedDriver(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">Select available driver…</option>
                    {availableDrivers.map(d => (
                      <option key={d.user_id} value={d.user_id}>{d.full_name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!selectedDriver) return;
                    setBusy(true);
                    await onApprove(item.approval_id, comment, selectedDriver);
                    setBusy(false);
                  }}
                  disabled={busy || !selectedDriver}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {busy ? 'Processing…' : '✓ Approve & Assign Driver'}
                </button>
                <button onClick={() => setDeclining(true)}
                  className="flex-1 border border-red-300 hover:bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                  ✕ Decline
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!comment.trim()) return;
                  setBusy(true);
                  await onDecline(item.approval_id, comment);
                  setBusy(false);
                }}
                disabled={busy || !comment.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                {busy ? 'Processing…' : 'Confirm Decline'}
              </button>
              <button onClick={() => { setDeclining(false); setComment(''); }}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DriverRow({ driver }) {
  const progress = driver.stops_total > 0
    ? Math.round((Number(driver.stops_completed) / Number(driver.stops_total)) * 100)
    : 0;
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm">
          {driver.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{driver.full_name}</p>
          <p className="text-xs text-gray-400">{driver.route_name || 'No active route'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {driver.route_status ? (
          <>
            <div className="text-right">
              <p className="text-xs text-gray-500">{driver.stops_completed}/{driver.stops_total} stops</p>
              <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                <div className="h-1.5 bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <Badge status={driver.route_status} />
          </>
        ) : (
          <span className="text-xs text-gray-400 italic">Idle</span>
        )}
      </div>
    </div>
  );
}

export default function LogisticsDashboardView({
  pending = [], history = [], drivers = [], stats = {},
  loading, error, success,
  approveRoute, declineRoute, refresh,
}) {
  return (
    <div className="space-y-6">
      {error   && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Review',  value: stats.pending_count  ?? '—', color: 'text-yellow-600' },
          { label: 'Approved',        value: stats.approved_count ?? '—', color: 'text-green-600'  },
          { label: 'Declined',        value: stats.declined_count ?? '—', color: 'text-red-500'    },
          { label: 'Avg CO₂ Saved',   value: stats.avg_co2_saved ? `${parseFloat(stats.avg_co2_saved).toFixed(1)} kg` : '—', color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-200 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading && <div className="text-center py-12 text-gray-400">Loading…</div>}

      {/* ── Pending Approvals ─────────────────────────────── */}
      {!loading && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Pending Route Approvals
            </h2>
            <span className="text-xs text-gray-400">{pending.length} item{pending.length !== 1 ? 's' : ''}</span>
          </div>

          {pending.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-medium text-gray-600">No pending approvals</p>
              <p className="text-sm text-gray-400 mt-1">All routes have been reviewed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(item => (
                <ApprovalCard
                  key={item.approval_id}
                  item={item}
                  onApprove={approveRoute}
                  onDecline={declineRoute}
                  drivers={drivers}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Driver Monitor Snapshot ───────────────────────── */}
      {!loading && drivers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Driver Monitor</h3>
            <span className="text-xs text-gray-400">
              {drivers.filter(d => d.route_status).length} of {drivers.length} active
            </span>
          </div>
          <div className="space-y-2">
            {drivers.slice(0, 3).map(d => <DriverRow key={d.user_id} driver={d} />)}
          </div>
          {drivers.length > 3 && (
            <p className="text-xs text-gray-400 text-center mt-2">
              +{drivers.length - 3} more · open Driver Monitor for full view
            </p>
          )}
        </div>
      )}
    </div>
  );
}