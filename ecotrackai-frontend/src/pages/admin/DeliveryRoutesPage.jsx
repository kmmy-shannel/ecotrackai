import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import PlanNewDeliveryModal from '../../components/PlanNewDeliveryModal';
import {
  Plus, Search, Trash2, MapPin, Navigation,
  Sparkles, TrendingDown, Clock, Fuel, Leaf,
  ChevronDown, ChevronUp, Route, Package, Layers, X,
  CheckCircle, AlertTriangle, Zap
} from 'lucide-react';

import useDelivery from '../../hooks/useDelivery';
import { canTransitionRoute, getTimelineChips } from '../../utils/statusMachines';

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

// ── Dagupan City bounds (same as PlanNewDeliveryModal) ───
const DAGUPAN_CENTER = [16.0433, 120.3339];
const DAGUPAN_BOUNDS = [[15.98, 120.27], [16.11, 120.41]];

const MAP_LAYERS = {
  hybrid:    { name: 'Hybrid',    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attribution: '© Google Maps' },
  satellite: { name: 'Satellite', url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: '© Google Maps' },
  streets:   { name: 'Streets',   url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',  attribution: '© OpenStreetMap' },
};

// ── Helpers ───────────────────────────────────────────────
const fmt = (v, dp = 2) => Number(v || 0).toFixed(dp);
const pct = (val, base) => (base > 0 ? `${Math.round((Number(val) / Number(base)) * 100)}%` : '0%');

// ── Auto-fit map to stop markers ──────────────────────────
const MapFitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 1) {
      try { map.fitBounds(positions, { padding: [40, 40] }); }
      catch { map.setView(DAGUPAN_CENTER, 14); }
    } else {
      map.setView(DAGUPAN_CENTER, 14);
    }
  }, [positions, map]);
  return null;
};

// ── Main Page ─────────────────────────────────────────────
const DeliveryRoutesPage = () => {
  const { user } = useAuth();
  const {
    deliveries, loading, error, success,
    searchTerm, showAddModal, expandedDelivery, expandedStops,
    optimizingRoute, optimizationResult, showOptimizationModal, summaryStats,
    setSearchTerm, setShowAddModal, setExpandedDelivery,
    deleteDelivery, optimizeRoute, applyOptimization,
    handleDeliveryCreated, closeOptimizationModal, getStatusBadge,
  } = useDelivery();

  if (!user) return null;

  return (
    <Layout currentPage="Delivery Routes" user={user}>
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} />{success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {/* Top bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Search delivery or driver..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-md w-full sm:w-auto justify-center">
          <Plus size={20} /><span className="font-medium">Plan new delivery</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Today's Deliveries"
          value={summaryStats.totalDeliveries}
          subtitle={`${summaryStats.inProgress} in progress`}
          icon={<Route />} color="blue"
        />
        <SummaryCard
          title="Total Distance"
          value={`${summaryStats.totalDistance} km`}
          subtitle="Completed today"
          icon={<Navigation />} color="purple"
        />
        <SummaryCard
          title="Fuel Saved"
          value={`${summaryStats.fuelSaved} L`}
          subtitle="From completed deliveries"
          icon={<Fuel />} color="green" trend="down"
        />
        <SummaryCard
          title="CO₂ Reduced"
          value={`${summaryStats.co2Reduced} kg`}
          subtitle="From completed deliveries"
          icon={<Leaf />} color="emerald" trend="down"
        />
      </div>

      {/* Delivery table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Delivery</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Route</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Metrics</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-12 text-gray-500">Loading deliveries…</td></tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Route size={32} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No deliveries found</p>
                      <p className="text-sm text-gray-400">Plan your first delivery route</p>
                    </div>
                  </td>
                </tr>
              ) : (
                deliveries.map((delivery) => {
                  const stops = expandedStops[delivery.id] || [];
                  return (
                    <React.Fragment key={delivery.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">

                        {/* Delivery info */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package size={16} className="text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">{delivery.deliveryCode}</p>
                              <p className="text-sm text-gray-500">{delivery.driver}</p>
                              <p className="text-xs text-gray-400">{delivery.date}</p>
                            </div>
                          </div>
                        </td>

                        {/* Route */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-700">{delivery.stopCount || 0} stops</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {delivery.originName} → {delivery.destName}
                          </p>
                        </td>

                        {/* Metrics */}
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-gray-700"><Navigation size={14} className="text-blue-500" /><span>{delivery.totalDistance} km</span></div>
                            <div className="flex items-center gap-2 text-gray-700"><Clock size={14} className="text-purple-500" /><span>{delivery.estimatedDuration} min</span></div>
                            <div className="flex items-center gap-2 text-gray-700"><Leaf size={14} className="text-green-500" /><span>{delivery.carbonEmissions} kg CO₂</span></div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${getStatusBadge(delivery.status)}`}>
                              {delivery.status?.replace(/_/g, ' ')}
                            </span>
                            {delivery.status === 'awaiting_approval' && <span className="text-xs text-orange-500">⏳ Pending logistics review</span>}
                            {delivery.status === 'optimized'         && <span className="text-xs text-purple-600">✨ AI optimized — ready to submit</span>}
                            {delivery.status === 'approved'          && <span className="text-xs text-green-600">✓ Approved — driver notified</span>}
                            {delivery.status === 'declined'          && <span className="text-xs text-red-500">✕ Declined by logistics manager</span>}
                            {delivery.status === 'in_transit'        && <span className="text-xs text-blue-600">🚛 Driver en route</span>}
                            {delivery.status === 'delivered'         && <span className="text-xs text-green-700">📦 Delivered ✓</span>}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setExpandedDelivery(delivery.id)}
                              className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                              title="View Details">
                              {expandedDelivery === delivery.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button
                              onClick={() => optimizeRoute(delivery)}
                              disabled={optimizingRoute === delivery.id || !canTransitionRoute(delivery.status, 'optimized')}
                              className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="AI Route Optimization">
                              <Sparkles size={18} className={optimizingRoute === delivery.id ? 'animate-spin' : ''} />
                            </button>
                            <button
                              onClick={() => deleteDelivery(delivery.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                              title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedDelivery === delivery.id && (
                        <tr className="bg-gray-50">
                          <td colSpan="5" className="px-6 py-4">
                            <DeliveryDetails delivery={{ ...delivery, stops }} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showOptimizationModal && optimizationResult && (
        <OptimizationModal
          result={optimizationResult}
          onClose={closeOptimizationModal}
          onApply={applyOptimization}
        />
      )}
      {showAddModal && (
        <PlanNewDeliveryModal onClose={() => setShowAddModal(false)} onSuccess={handleDeliveryCreated} />
      )}
    </Layout>
  );
};

// ── Summary Card ─────────────────────────────────────────
const SummaryCard = ({ title, value, subtitle, icon, color, trend }) => {
  const cols = {
    blue:    'from-blue-500 to-blue-600',
    purple:  'from-purple-500 to-purple-600',
    green:   'from-green-500 to-green-600',
    emerald: 'from-emerald-500 to-emerald-600',
  };
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${cols[color]} rounded-lg flex items-center justify-center`}>
          {React.cloneElement(icon, { size: 20, className: 'text-white' })}
        </div>
        {trend === 'down' && <TrendingDown size={16} className="text-green-500" />}
      </div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</h4>
      <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
};

// ── Delivery Details (expanded row) ─────────────────────
const DeliveryDetails = ({ delivery }) => {
  const routeTimeline = getTimelineChips('route', delivery.status);
  const stops = delivery.stops || [];
  return (
    <div className="bg-white rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {routeTimeline.map(chip => (
          <span key={chip.status}
            className={`px-2 py-1 rounded-full text-xs ${
              chip.state === 'done'    ? 'bg-green-100 text-green-700' :
              chip.state === 'current' ? 'bg-blue-100 text-blue-700'  :
                                         'bg-gray-100 text-gray-500'
            }`}>
            {chip.status.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <MapPin size={18} className="text-blue-500" />Route Stops
        </h4>
        {stops.length === 0
          ? <p className="text-sm text-gray-400 pl-4">Loading stops…</p>
          : (
            <div className="space-y-2">
              {stops.map((stop, i) => (
                <div key={stop.id || i} className="flex items-start gap-3 pl-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      stop.type === 'origin' ? 'bg-green-500' :
                      stop.type === 'destination' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    {i < stops.length - 1 && <div className="w-0.5 h-8 bg-gray-300" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="font-medium text-gray-700">{stop.location}</p>
                    {stop.products?.length > 0 && (
                      <p className="text-sm text-gray-500 mt-1">Products: {stop.products.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div><p className="text-xs text-gray-500 mb-1">Vehicle</p><p className="text-sm font-semibold">{delivery.vehicleType?.replace(/_/g, ' ')}</p></div>
        <div><p className="text-xs text-gray-500 mb-1">Fuel</p><p className="text-sm font-semibold">{delivery.fuelConsumption} L</p></div>
        <div><p className="text-xs text-gray-500 mb-1">Distance</p><p className="text-sm font-semibold">{delivery.totalDistance} km</p></div>
        <div><p className="text-xs text-gray-500 mb-1">Duration</p><p className="text-sm font-semibold">{delivery.estimatedDuration} min</p></div>
      </div>
    </div>
  );
};

// ── Route Map — Dagupan-constrained, auto-fits to stops ──
const RouteMap = ({ originalStops, optimizedStops }) => {
  const [mapLayer,  setMapLayer]  = useState('hybrid');
  const [showLayers, setShowLayers] = useState(false);
  const [activeView, setActiveView] = useState('both');

  // Valid stops with real Dagupan coordinates
  const validOrig = (originalStops  || []).filter(s => s.lat && s.lng);
  const validOpt  = (optimizedStops || []).filter(s => s.lat && s.lng);
  const allValid  = validOrig.length > 0 ? validOrig : validOpt;

  // Build [lat, lng] arrays for Polyline — this is what react-leaflet needs
  const origPositions = validOrig.map(s => [s.lat, s.lng]);
  const optPositions  = validOpt.map(s  => [s.lat, s.lng]);

  // For MapFitBounds
  const fitPositions = allValid.length > 0
    ? allValid.map(s => [s.lat, s.lng])
    : null;

  const getIcon = (type) =>
    type === 'origin' ? originIcon :
    type === 'destination' ? destinationIcon : stopIcon;

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm"
      style={{ height: 380 }}
    >
      {/* View toggle */}
      <div className="absolute top-3 left-3 z-[1000] flex bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden text-xs font-medium">
        {[['both','Both'], ['original','Original'], ['optimized','Optimized']].map(([v, label]) => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`px-3 py-1.5 transition-colors ${activeView === v ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Layer selector */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button onClick={() => setShowLayers(!showLayers)}
          className="bg-white px-3 py-1.5 rounded-lg shadow-md border border-gray-200 flex items-center gap-1.5 text-xs font-medium text-gray-700">
          <Layers size={14} />{MAP_LAYERS[mapLayer].name}
        </button>
        {showLayers && (
          <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[140px] overflow-hidden">
            {Object.entries(MAP_LAYERS).map(([key, l]) => (
              <button key={key} onClick={() => { setMapLayer(key); setShowLayers(false); }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 ${mapLayer === key ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}>
                {l.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Location label */}
      <div className="absolute bottom-10 right-3 z-[1000] px-2 py-1 bg-green-800 text-white rounded text-[10px] font-semibold shadow">
        Dagupan City, Pangasinan
      </div>

      <MapContainer
        center={DAGUPAN_CENTER}
        zoom={14}
        minZoom={12}
        maxZoom={19}
        maxBounds={DAGUPAN_BOUNDS}
        maxBoundsViscosity={0.9}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          url={MAP_LAYERS[mapLayer].url}
          attribution={MAP_LAYERS[mapLayer].attribution}
          maxZoom={20}
        />

        {/* Auto-fit to the stop markers */}
        <MapFitBounds positions={fitPositions} />

        {/* Original route — dashed blue line */}
        {(activeView === 'both' || activeView === 'original') && origPositions.length > 1 && (
          <Polyline
            positions={origPositions}
            pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8 5', opacity: 0.85 }}
          />
        )}

        {/* Optimized route — solid green line */}
        {(activeView === 'both' || activeView === 'optimized') && optPositions.length > 1 && (
          <Polyline
            positions={optPositions}
            pathOptions={{ color: '#10b981', weight: 4, opacity: 0.95 }}
          />
        )}

        {/* Markers — show from whichever set is active */}
        {(activeView === 'both' || activeView === 'original'   ? validOrig : []).map((stop, i) => (
          <Marker key={`o-${i}`} position={[stop.lat, stop.lng]} icon={getIcon(stop.type)}>
            <Popup>
              <div className="text-xs min-w-[140px]">
                <p className="font-bold capitalize">{stop.type}</p>
                <p className="text-gray-600">{stop.location}</p>
                <p className="text-green-700 font-mono text-[10px] mt-1">{stop.lat?.toFixed(5)}, {stop.lng?.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {(activeView === 'optimized' ? validOpt : []).map((stop, i) => (
          <Marker key={`p-${i}`} position={[stop.lat, stop.lng]} icon={getIcon(stop.type)}>
            <Popup>
              <div className="text-xs min-w-[140px]">
                <p className="font-bold capitalize text-green-700">[Optimized] {stop.type}</p>
                <p className="text-gray-600">{stop.location}</p>
                <p className="text-green-700 font-mono text-[10px] mt-1">{stop.lat?.toFixed(5)}, {stop.lng?.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white rounded-lg px-3 py-2 shadow-md border border-gray-200 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <svg width="26" height="10">
            <line x1="0" y1="5" x2="26" y2="5" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="7 4" />
          </svg>
          <span className="text-gray-600">Original</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="26" height="10">
            <line x1="0" y1="5" x2="26" y2="5" stroke="#10b981" strokeWidth="3.5" />
          </svg>
          <span className="text-gray-600">Optimized</span>
        </div>
      </div>

      {/* No data warning */}
      {allValid.length < 2 && (
        <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
          <div className="bg-white bg-opacity-90 rounded-lg px-4 py-2.5 shadow text-xs text-gray-500 border border-gray-200">
            No route coordinates available for visualization
          </div>
        </div>
      )}
    </div>
  );
};

// ── Stop list (before / after) ────────────────────────────
const StopList = ({ title, stops, optimized }) => (
  <div className={`rounded-xl border overflow-hidden ${optimized ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
    <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${optimized ? 'border-green-200' : 'border-gray-200'}`}>
      {optimized
        ? <CheckCircle size={15} className="text-green-600" />
        : <Route size={15} className="text-gray-500" />
      }
      <span className="text-sm font-semibold text-gray-700">{title}</span>
    </div>
    <div className="p-3 space-y-1.5">
      {stops.length === 0
        ? <p className="text-xs text-gray-400 py-2 text-center">No stop data</p>
        : stops.map((stop, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              stop.type === 'origin' ? 'bg-green-500' :
              stop.type === 'destination' ? 'bg-red-500' :
              optimized ? 'bg-green-400' : 'bg-blue-400'
            }`} />
            <span className="text-xs text-gray-700 truncate flex-1">{stop.location?.split(',')[0]}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{i + 1}</span>
          </div>
        ))
      }
    </div>
  </div>
);

// ── Optimization Modal ────────────────────────────────────
const OptimizationModal = ({ result, onClose, onApply }) => {
  const {
    originalRoute, optimizedRoute, savings,
    aiRecommendations, improvementPct, usedFallback,
  } = result;

  const metricRows = [
    {
      label: 'Distance', icon: <Navigation size={14} />, color: 'text-blue-600',
      orig:  `${fmt(originalRoute?.totalDistance)} km`,
      opt:   `${fmt(optimizedRoute?.totalDistance)} km`,
      saved: `${fmt(savings?.distance)} km`,
      pctVal: savings?.distance, base: originalRoute?.totalDistance,
    },
    {
      label: 'Duration', icon: <Clock size={14} />, color: 'text-purple-600',
      orig:  `${originalRoute?.estimatedDuration ?? 0} min`,
      opt:   `${optimizedRoute?.estimatedDuration ?? 0} min`,
      saved: `${savings?.time ?? 0} min`,
      pctVal: savings?.time, base: originalRoute?.estimatedDuration,
    },
    {
      label: 'Fuel', icon: <Fuel size={14} />, color: 'text-orange-500',
      orig:  `${fmt(originalRoute?.fuelConsumption)} L`,
      opt:   `${fmt(optimizedRoute?.fuelConsumption)} L`,
      saved: `${fmt(savings?.fuel)} L`,
      pctVal: savings?.fuel, base: originalRoute?.fuelConsumption,
    },
    {
      label: 'CO₂', icon: <Leaf size={14} />, color: 'text-green-600',
      orig:  `${fmt(originalRoute?.carbonEmissions)} kg`,
      opt:   `${fmt(optimizedRoute?.carbonEmissions)} kg`,
      saved: `${fmt(savings?.emissions)} kg`,
      pctVal: savings?.emissions, base: originalRoute?.carbonEmissions,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5 rounded-t-2xl z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold leading-tight">AI Route Optimization</h3>
              <p className="text-purple-200 text-sm">
                {originalRoute?.deliveryCode}
                {improvementPct ? ` · ${improvementPct}% efficiency gain` : ''}
                {!usedFallback ? ' · Groq llama3-8b' : ' · Fallback estimate'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Fallback notice */}
          {usedFallback && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              Groq AI was unavailable — standard 20% estimate applied.
            </div>
          )}

          {/* Metric comparison table */}
          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            <div className="grid grid-cols-4 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-2.5">
              <span>Metric</span>
              <span className="text-center">Before</span>
              <span className="text-center text-green-700">After</span>
              <span className="text-center text-emerald-700">Saved</span>
            </div>
            {metricRows.map(row => (
              <div key={row.label} className="grid grid-cols-4 items-center px-4 py-3 border-t border-gray-200">
                <div className={`flex items-center gap-2 text-sm font-medium ${row.color}`}>
                  {row.icon}<span>{row.label}</span>
                </div>
                <div className="text-center text-sm text-gray-600">{row.orig}</div>
                <div className="text-center text-sm font-semibold text-green-700">{row.opt}</div>
                <div className="text-center">
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    ↓ {row.saved}
                    <span className="text-emerald-500 font-normal">
                      ({pct(row.pctVal, row.base)})
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Stop order comparison */}
          {((originalRoute?.stops?.length || 0) > 0 || (optimizedRoute?.stops?.length || 0) > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              <StopList title="Original Order"   stops={originalRoute?.stops  || []} optimized={false} />
              <StopList title="Optimized Order"  stops={optimizedRoute?.stops || []} optimized={true}  />
            </div>
          )}

          {/* Route map — Dagupan-bounded */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin size={17} className="text-blue-500" />Route Visualization
              <span className="text-xs text-gray-400 font-normal">· Dagupan City, Pangasinan</span>
            </h4>
            <RouteMap
              originalStops={originalRoute?.stops}
              optimizedStops={optimizedRoute?.stops}
            />
          </div>

          {/* AI Recommendations */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-purple-600" />
              Groq AI Recommendations
              {!usedFallback && (
                <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-normal ml-1">
                  llama3-8b-8192
                </span>
              )}
            </h4>
            <ul className="space-y-2.5">
              {(aiRecommendations || []).map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium text-gray-700 transition-colors">
              Cancel
            </button>
            <button onClick={onApply}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-md font-medium flex items-center justify-center gap-2 transition-all">
              <CheckCircle size={18} />Submit for Logistics Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryRoutesPage;