import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Flag, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION HISTORY TAB
// ─────────────────────────────────────────────────────────────────────────────
const HistoryTab = ({ history = [], loading = false }) => (
  <div className="space-y-4">
    {loading && (
      <p className="text-gray-400 text-sm py-6 text-center">Loading history…</p>
    )}

    {!loading && history.length === 0 && (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
        <CheckCircle size={36} className="mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-500">No verification history yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Verified carbon records will appear here
        </p>
      </div>
    )}

    {history.map((record, i) => {
      const isVerified = record.verification_status === 'verified';
      const isRevision = record.verification_status === 'revision_requested';

      return (
        <div
          key={record.record_id || i}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {record.route_name || `Delivery #${record.route_id || '—'}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {record.vehicle_type || '—'} ·{' '}
                {record.created_at
                  ? new Date(record.created_at).toLocaleDateString('en-PH', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              isVerified
                ? 'bg-green-100 text-green-700'
                : isRevision
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {isVerified
                ? <><CheckCircle size={12} /> Verified</>
                : isRevision
                ? <><XCircle size={12} /> Revision Requested</>
                : record.verification_status}
            </span>
          </div>

          {/* Carbon breakdown */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Total CO₂</p>
              <p className="font-semibold text-gray-700">
                {record.total_carbon_kg != null ? `${record.total_carbon_kg} kg` : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Transport CO₂</p>
              <p className="font-semibold text-gray-700">
                {record.transportation_carbon_kg != null
                  ? `${record.transportation_carbon_kg} kg`
                  : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-gray-400 mb-0.5">Storage CO₂</p>
              <p className="font-semibold text-gray-700">
                {record.storage_carbon_kg != null
                  ? `${record.storage_carbon_kg} kg`
                  : '—'}
              </p>
            </div>
          </div>

          {record.revision_notes && (
            <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-2">
              Note: {record.revision_notes}
            </p>
          )}
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CARBON TRENDS TAB — SVG chart: estimated vs actual CO₂ per delivery
// ─────────────────────────────────────────────────────────────────────────────
const TrendsTab = ({ trendData = [], trendLoading, onLoad }) => {
  const loaded = useRef(false);

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      onLoad();
    }
  }, [onLoad]);

  if (trendLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading carbon trend data…
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
        <TrendingUp size={36} className="mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-500">No trend data yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Complete deliveries will populate the estimated vs actual carbon chart
        </p>
      </div>
    );
  }

  // ── SVG chart dimensions ───────────────────────────────────────────────────
  const W = 620, H = 200;
  const PAD = { top: 16, right: 20, bottom: 44, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allVals = trendData.flatMap(d => [d.estimated_carbon, d.actual_carbon]);
  const maxVal  = Math.max(...allVals, 1) * 1.2;
  const n       = trendData.length;
  const xStep   = n > 1 ? chartW / (n - 1) : 0;

  const px = i  => PAD.left + i * xStep;
  const py = v  => PAD.top  + chartH - (v / maxVal) * chartH;

  const estPath = trendData
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(d.estimated_carbon)}`)
    .join(' ');
  const actPath = trendData
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(d.actual_carbon)}`)
    .join(' ');

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    v: maxVal * t,
    y: PAD.top + chartH - t * chartH,
  }));

  // Summary stats
  const totalEst = trendData.reduce((s, d) => s + d.estimated_carbon, 0);
  const totalAct = trendData.reduce((s, d) => s + d.actual_carbon, 0);
  const diff     = totalAct - totalEst;
  const pct      = totalEst > 0 ? ((diff / totalEst) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Chart header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              Estimated vs Actual CO₂ — Per Delivery
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              IPCC diesel emission factor · 2.68 kg CO₂ per litre
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="inline-block w-6 h-0.5 bg-blue-300" style={{ borderTop: '2px dashed #93c5fd' }} />
              Estimated
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="inline-block w-6 h-0.5 bg-green-500" />
              Actual
            </span>
          </div>
        </div>

        {/* SVG chart */}
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ minWidth: '340px', maxWidth: '100%' }}
          >
            {/* Grid lines */}
            {yTicks.map(({ v, y }) => (
              <g key={v}>
                <line
                  x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                  stroke="#f1f5f9" strokeWidth="1"
                />
                <text x={PAD.left - 6} y={y + 3.5} textAnchor="end"
                  fontSize="9" fill="#94a3b8">
                  {v.toFixed(1)}
                </text>
              </g>
            ))}

            {/* Y-axis label */}
            <text
              x={10} y={PAD.top + chartH / 2}
              textAnchor="middle" fontSize="9" fill="#94a3b8"
              transform={`rotate(-90, 10, ${PAD.top + chartH / 2})`}
            >
              kg CO₂
            </text>

            {/* X-axis delivery labels */}
            {trendData.map((d, i) => (
              (i % Math.max(1, Math.floor(n / 5)) === 0) && (
                <text
                  key={i}
                  x={px(i)} y={H - 4}
                  textAnchor="middle" fontSize="8" fill="#94a3b8"
                >
                  {d.route_name?.length > 10
                    ? d.route_name.slice(0, 10) + '…'
                    : (d.route_name || `D${i + 1}`)}
                </text>
              )
            ))}

            {/* Estimated path (dashed blue) */}
            <path
              d={estPath} fill="none"
              stroke="#93c5fd" strokeWidth="1.5"
              strokeDasharray="4 3"
            />

            {/* Actual path (solid green) */}
            <path d={actPath} fill="none" stroke="#10b981" strokeWidth="2" />

            {/* Dots — actual */}
            {trendData.map((d, i) => (
              <g key={i}>
                <circle
                  cx={px(i)} cy={py(d.estimated_carbon)} r="2.5"
                  fill="#93c5fd"
                />
                <circle
                  cx={px(i)} cy={py(d.actual_carbon)} r="3.5"
                  fill={d.status === 'verified' ? '#10b981' : '#f59e0b'}
                  stroke="#fff" strokeWidth="1"
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Total Estimated CO₂',
            value: `${totalEst.toFixed(2)} kg`,
            sub:   `${n} deliveries`,
            color: 'text-blue-600',
            bg:    'bg-blue-50',
          },
          {
            label: 'Total Actual CO₂',
            value: `${totalAct.toFixed(2)} kg`,
            sub:   'verified records',
            color: 'text-green-600',
            bg:    'bg-green-50',
          },
          {
            label: 'Variance',
            value: `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} kg`,
            sub:   `${pct}% vs estimate`,
            color: diff > 0 ? 'text-orange-500' : 'text-green-600',
            bg:    diff > 0 ? 'bg-orange-50' : 'bg-green-50',
          },
          {
            label: 'Deliveries Tracked',
            value: n,
            sub:   'in carbon records',
            color: 'text-gray-700',
            bg:    'bg-gray-50',
          },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-delivery breakdown table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">Per-Delivery Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {['Delivery', 'Vehicle', 'Date', 'Est. CO₂', 'Actual CO₂', 'Variance', 'Status'].map(h => (
                  <th key={h}
                    className="px-4 py-3 text-left text-gray-500 font-semibold uppercase tracking-wide text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trendData.map((d, i) => {
                const v = d.variance;
                return (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {d.route_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.vehicle_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {d.date ? new Date(d.date).toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric',
                      }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-blue-600 font-medium">
                      {d.estimated_carbon.toFixed(2)} kg
                    </td>
                    <td className="px-4 py-3 text-green-700 font-medium">
                      {d.actual_carbon.toFixed(2)} kg
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 font-semibold ${
                        v > 0 ? 'text-orange-500' : v < 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {v > 0
                          ? <TrendingUp size={11} />
                          : v < 0
                          ? <TrendingDown size={11} />
                          : <Minus size={11} />}
                        {v >= 0 ? '+' : ''}{v.toFixed(2)} kg
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        d.status === 'verified'
                          ? 'bg-green-100 text-green-700'
                          : d.status === 'revision_requested'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {d.status === 'verified'
                          ? 'Verified'
                          : d.status === 'revision_requested'
                          ? 'Revision'
                          : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ECOTRUST AUDIT TAB — all ecotrust_transactions + flag suspicious entries
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_META = {
  spoilage_prevention:  { label: 'Spoilage Prevention',  pts: 25, color: 'text-green-600',  bg: 'bg-green-50'  },
  optimized_route:      { label: 'Optimised Route',      pts: 30, color: 'text-blue-600',   bg: 'bg-blue-50'   },
  carbon_verified:      { label: 'Carbon Verified',      pts: 20, color: 'text-purple-600', bg: 'bg-purple-50' },
  on_time_delivery:     { label: 'On-Time Delivery',     pts: 10, color: 'text-orange-600', bg: 'bg-orange-50' },
};

const AuditTab = ({ auditRecords = [], auditLoading, onLoad, onFlag }) => {
  const loaded      = useRef(false);
  const [flagId,    setFlagId]    = useState(null);
  const [reason,    setReason]    = useState('');
  const [flagBusy,  setFlagBusy]  = useState(false);
  const [flagErr,   setFlagErr]   = useState('');

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      onLoad();
    }
  }, [onLoad]);

  const submitFlag = async () => {
    if (!reason.trim()) { setFlagErr('Please enter a reason.'); return; }
    setFlagBusy(true); setFlagErr('');
    const res = await onFlag(flagId, reason.trim());
    setFlagBusy(false);
    if (res.success) { setFlagId(null); setReason(''); }
    else setFlagErr(res.error || 'Failed to flag.');
  };

  if (auditLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading EcoTrust transactions…
      </div>
    );
  }

  if (auditRecords.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
        <Flag size={36} className="mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-500">No EcoTrust transactions yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Transactions appear here once EcoTrust points are awarded
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Flag modal */}
      {flagId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
              <Flag size={16} className="text-red-500" />
              Flag for Super Admin Review
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Describe why this transaction appears suspicious. The Super Admin will be notified.
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Points awarded twice for the same delivery…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            {flagErr && (
              <p className="text-red-500 text-xs mt-1">{flagErr}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={submitFlag}
                disabled={flagBusy}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {flagBusy ? 'Submitting…' : 'Submit Flag'}
              </button>
              <button
                onClick={() => { setFlagId(null); setReason(''); setFlagErr(''); }}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-xl text-sm transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">EcoTrust Transaction Audit</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {auditRecords.length} transactions · Flag suspicious entries for Super Admin review
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {['Date', 'Action', 'Points', 'Status', 'Reference', ''].map(h => (
                  <th key={h}
                    className="px-4 py-3 text-left text-gray-500 font-semibold uppercase tracking-wide text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditRecords.map((tx, i) => {
                const meta    = ACTION_META[tx.action_type] || { label: tx.action_type, color: 'text-gray-600', bg: 'bg-gray-50' };
                const isFlagged = tx.flagged || tx.is_flagged;
                const txId    = tx.transaction_id || tx.id;
                return (
                  <tr
                    key={txId || i}
                    className={`border-t border-gray-50 transition-colors ${
                      isFlagged ? 'bg-red-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500">
                      {tx.created_at
                        ? new Date(tx.created_at).toLocaleDateString('en-PH', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600">
                      +{tx.points_earned || tx.points_awarded || 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        tx.verification_status === 'verified'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {tx.verification_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono">
                      {tx.related_record_type || tx.reference_type || '—'}{' '}
                      #{tx.related_record_id || tx.reference_id || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isFlagged ? (
                        <span className="flex items-center gap-1 text-red-500 font-semibold text-xs">
                          <Flag size={11} /> Flagged
                        </span>
                      ) : (
                        <button
                          onClick={() => { setFlagId(txId); setFlagErr(''); }}
                          className="flex items-center gap-1 border border-red-200 text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Flag size={10} /> Flag
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — SustainabilityHistoryView
// Receives props from SustainabilityManagerPage; renders correct tab content
// ─────────────────────────────────────────────────────────────────────────────
const SustainabilityHistoryView = ({
  // history tab (existing)
  history      = [],
  loading      = false,
  // trends tab (new)
  trendData    = [],
  trendLoading = false,
  onLoadTrend,
  // audit tab (new)
  auditRecords  = [],
  auditLoading  = false,
  onLoadAudit,
  onFlagTransaction,
  // which sub-tab to show
  activeTab    = 'history',
}) => {
  if (activeTab === 'trends') {
    return (
      <TrendsTab
        trendData={trendData}
        trendLoading={trendLoading}
        onLoad={onLoadTrend}
      />
    );
  }

  if (activeTab === 'audit') {
    return (
      <AuditTab
        auditRecords={auditRecords}
        auditLoading={auditLoading}
        onLoad={onLoadAudit}
        onFlag={onFlagTransaction}
      />
    );
  }

  // default: history
  return <HistoryTab history={history} loading={loading} />;
};

export default SustainabilityHistoryView;