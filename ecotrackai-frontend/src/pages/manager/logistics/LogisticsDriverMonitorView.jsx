// ============================================================
// FILE: src/pages/manager/logistics/LogisticsDriverMonitorView.jsx
// READ-ONLY — Driver states are driven by the Android app only
// ============================================================
import React from 'react';
import { MapPin, Clock, Truck, CheckCircle, AlertCircle, Navigation } from 'lucide-react';

const STATUS_CONFIG = {
  in_transit:  { dot: 'bg-blue-500',   label: 'In Progress',  badge: 'bg-blue-100 text-blue-700',    ring: 'ring-blue-200'   },
  approved:    { dot: 'bg-yellow-400', label: 'Assigned',     badge: 'bg-yellow-100 text-yellow-700', ring: 'ring-yellow-200' },
  delivered:   { dot: 'bg-green-500',  label: 'Completed',    badge: 'bg-green-100 text-green-700',   ring: 'ring-green-200'  },
  completed:   { dot: 'bg-green-500',  label: 'Completed',    badge: 'bg-green-100 text-green-700',   ring: 'ring-green-200'  },
};

const VEHICLE_ICONS = {
  van:                '🚐',
  refrigerated_truck: '🚛',
  truck:              '🚚',
  motorcycle:         '🏍️',
};

// ── Single driver card ────────────────────────────────────────
const DriverCard = ({ driver }) => {
  const cfg = STATUS_CONFIG[driver.route_status] || null;
  const progress = driver.stops_total > 0
    ? Math.round((Number(driver.stops_completed) / Number(driver.stops_total)) * 100)
    : 0;

  const vehicleIcon = VEHICLE_ICONS[driver.vehicle_type] || '🚗';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden`}>
      
      {/* Card header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-100">
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-lg ${cfg ? `ring-2 ${cfg.ring}` : ''}`}>
            {driver.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          {/* Live status dot */}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg ? cfg.dot : 'bg-gray-300'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{driver.full_name}</p>
          <p className="text-xs text-gray-400 truncate">{driver.email || 'Driver'}</p>
        </div>
        {cfg ? (
          <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
            {cfg.label}
          </span>
        ) : (
          <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
            Idle
          </span>
        )}
      </div>

      {/* Active route details */}
      {driver.route_status ? (
        <div className="p-4 space-y-3">

          {/* Route name + vehicle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{vehicleIcon}</span>
              <div>
                <p className="text-sm font-medium text-gray-700">{driver.route_name || 'Active Route'}</p>
                <p className="text-xs text-gray-400 capitalize">{driver.vehicle_type?.replace(/_/g, ' ') || '—'}</p>
              </div>
            </div>
            {driver.delivery_date && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} />
                {new Date(driver.delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>

          {/* Stop progress — only meaningful when in_transit */}
          {(driver.route_status === 'in_transit') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={11} /> Stop Progress
                </span>
                <span className="text-xs font-semibold text-gray-700">
                  {driver.stops_completed || 0} / {driver.stops_total || 0} stops
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-right text-[10px] text-gray-400 mt-0.5">{progress}%</p>
            </div>
          )}

          {/* Assigned but not started yet */}
          {driver.route_status === 'approved' && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
              <AlertCircle size={13} className="flex-shrink-0" />
              Route assigned — waiting for driver to start
            </div>
          )}

          {/* Completed */}
          {(driver.route_status === 'delivered' || driver.route_status === 'completed') && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              <CheckCircle size={13} className="flex-shrink-0" />
              Delivery completed
              {driver.completed_at && (
                <span className="ml-auto text-green-500">
                  {new Date(driver.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

          {/* Route metrics */}
          {(driver.total_distance_km || driver.estimated_duration_minutes) && (
            <div className="flex gap-3 pt-1 border-t border-gray-100">
              {driver.total_distance_km && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Navigation size={11} className="text-blue-400" />
                  {parseFloat(driver.total_distance_km).toFixed(1)} km
                </div>
              )}
              {driver.estimated_duration_minutes && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={11} className="text-purple-400" />
                  ~{driver.estimated_duration_minutes} min
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // No active route
        <div className="px-4 py-4 text-center">
          <p className="text-xs text-gray-400">No active route</p>
          <p className="text-[10px] text-gray-300 mt-0.5">
            Driver will appear here once a route is approved and assigned
          </p>
        </div>
      )}
    </div>
  );
};

// ── Summary bar ───────────────────────────────────────────────
const SummaryBar = ({ drivers }) => {
  const total      = drivers.length;
  const idle       = drivers.filter(d => !d.route_status).length;
  const assigned   = drivers.filter(d => d.route_status === 'approved').length;
  const inProgress = drivers.filter(d => d.route_status === 'in_transit').length;
  const done       = drivers.filter(d => ['delivered', 'completed'].includes(d.route_status)).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Total Drivers', value: total,      color: 'text-gray-700',   bg: 'bg-gray-50',    border: 'border-gray-200'   },
        { label: 'Idle',          value: idle,       color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-gray-200'   },
        { label: 'Assigned',      value: assigned,   color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
        { label: 'In Progress',   value: inProgress, color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200'   },
      ].map(s => (
        <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center shadow-sm`}>
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

// ── Main view ─────────────────────────────────────────────────
export default function LogisticsDriverMonitorView({ drivers = [], loading, refresh }) {
  const active = drivers.filter(d =>
    ['approved', 'in_transit'].includes(d.route_status)
  );
  const idle = drivers.filter(d => !d.route_status);
  const done = drivers.filter(d =>
    ['delivered', 'completed'].includes(d.route_status)
  );

  return (
    <div className="space-y-6">

      {/* Read-only notice */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <Truck size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Read-only Monitor</p>
          <p className="text-xs text-blue-500 mt-0.5">
            Driver status updates in real time from the mobile app. 
            To assign a driver, approve a pending route from the dashboard.
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">Loading drivers…</div>
      )}

      {!loading && drivers.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Truck size={26} className="text-gray-400" />
          </div>
          <p className="font-medium text-gray-600">No drivers registered</p>
          <p className="text-sm text-gray-400 mt-1">
            Create driver accounts from the admin panel first
          </p>
        </div>
      )}

      {!loading && drivers.length > 0 && (
        <>
          <SummaryBar drivers={drivers} />

          {/* Active drivers first */}
          {active.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                Active ({active.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map(d => <DriverCard key={d.user_id} driver={d} />)}
              </div>
            </div>
          )}

          {/* Idle drivers */}
          {idle.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                Available ({idle.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {idle.map(d => <DriverCard key={d.user_id} driver={d} />)}
              </div>
            </div>
          )}

          {/* Completed today */}
          {done.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Completed Today ({done.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {done.map(d => <DriverCard key={d.user_id} driver={d} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}