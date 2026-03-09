// ============================================================
// FILE: src/pages/manager/logistics/LogisticsDashboardView.jsx
// Props-based — data comes from LogisticsManagerPage
// ============================================================
import { useState } from 'react';

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

function ApprovalCard({ item, onApprove, onDecline }) {
  const [open,      setOpen]      = useState(false);
  const [comment,   setComment]   = useState('');
  const [declining, setDeclining] = useState(false);
  const [busy,      setBusy]      = useState(false);

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
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
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
            <div className="flex gap-2">
              <button
                onClick={async () => { setBusy(true); await onApprove(item.approval_id, comment); setBusy(false); }}
                disabled={busy}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                {busy ? 'Processing…' : '✓ Accept Optimization'}
              </button>
              <button onClick={() => setDeclining(true)}
                className="flex-1 border border-red-300 hover:bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-semibold transition-colors">
                ✕ Decline
              </button>
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
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 text-gray-400">
              <p className="font-medium">No pending route approvals</p>
              <p className="text-sm mt-1">New submissions from admin will appear here</p>
            </div>
          ) : pending.map(item => (
            <ApprovalCard key={item.approval_id} item={item} onApprove={approveRoute} onDecline={declineRoute} />
          ))}
        </div>
      )}

      {/* ── Driver Monitor ────────────────────────────────── */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Driver Monitor
            </h3>
            <span className="text-xs text-gray-400">
              {drivers.filter(d => d.route_status).length} of {drivers.length} on route
            </span>
          </div>
          {drivers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No drivers registered in this business</p>
              <p className="text-xs mt-1 text-gray-300">Real-time GPS tracking will appear here once drivers are active</p>
            </div>
          ) : (
            drivers.map(d => <DriverRow key={d.user_id} driver={d} />)
          )}
        </div>
      )}
    </div>
  );
}