// ============================================================
// FILE: src/components/superadmin/AnalyticsOverview.jsx
//
// FIX: KPI cards were mapping analytics.totalCarbonEmitted,
//      analytics.totalCarbonReduced — these flat fields don't
//      exist. Backend returns carbon_trends[] and approval_rates[].
//      KPIs now computed from those arrays correctly.
//      Also added ecotrust_leaderboard table (backend returns it).
// ============================================================

import React, { useState } from 'react';
import { BarChart3, TrendingUp, RefreshCw, Trophy, Leaf } from 'lucide-react';

const AnalyticsOverview = ({ analytics, onLoad }) => {
  const [timeRange,  setTimeRange]  = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const handleLoad = async () => {
    setRefreshing(true);
    await onLoad?.(timeRange);
    setRefreshing(false);
  };

  // ── Safely pull arrays from backend response ──────────────
  // Backend shape: { carbon_trends[], alert_distribution[], approval_rates[], ecotrust_leaderboard[] }
  const carbonTrend    = analytics?.carbon_trends        || analytics?.carbonTrend        || [];
  const alertDist      = analytics?.alert_distribution   || analytics?.alertDistribution  || [];
  const approvalRates  = analytics?.approval_rates       || analytics?.approvalRates      || [];
  const leaderboard    = analytics?.ecotrust_leaderboard || [];

  // FIX: Compute KPIs from the actual arrays — not missing flat fields
  const totalCO2 = carbonTrend.reduce((sum, d) => {
    return sum + Number(d.total_emissions || d.value || 0);
  }, 0);

  const totalDeliveries = approvalRates.reduce((sum, b) => {
    return sum + Number(b.total_approvals || 0);
  }, 0);

  const topEcoScore = leaderboard.length > 0
    ? leaderboard[0].total_points
    : '—';

  const avgEcoScore = leaderboard.length > 0
    ? Math.round(leaderboard.reduce((s, b) => s + Number(b.total_points || 0), 0) / leaderboard.length)
    : '—';

  const kpis = [
    { label: 'Total CO₂ Emitted',    value: totalCO2 ? `${totalCO2.toFixed(1)}` : '—', unit: 'kg CO₂' },
    { label: 'Total Approval Events', value: totalDeliveries || '—',                   unit: 'records'  },
    { label: 'Top EcoTrust Score',    value: topEcoScore,                               unit: 'pts'      },
    { label: 'Avg EcoTrust Score',    value: avgEcoScore,                               unit: 'pts'      },
  ];

  const maxVal = (arr, key) => Math.max(...arr.map(d => Number(d[key] || 0)), 1);

  const levelColors = {
    'Newcomer':      'bg-gray-100 text-gray-600',
    'Eco Warrior':   'bg-blue-100 text-blue-700',
    'Eco Champion':  'bg-green-100 text-green-700',
    'Eco Legend':    'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-5">

      {/* ── Controls ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-green-800 flex items-center justify-center">
            <BarChart3 size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Cross-Business Analytics</h3>
            <p className="text-xs text-gray-400 mt-0.5">Platform-wide sustainability metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={e => setTimeRange(Number(e.target.value))}
            className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={handleLoad}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900 disabled:opacity-60 transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {analytics ? 'Refresh' : 'Load Analytics'}
          </button>
        </div>
      </div>

      {!analytics ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">Click <strong>Load Analytics</strong> to fetch cross-business data</p>
          <p className="text-gray-400 text-sm mt-1">Aggregates carbon, EcoTrust, and approval data across all businesses</p>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ──────────────────────────────────── */}
          {/* FIX: Values now computed from backend arrays, not missing flat fields */}
          <div className="grid grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={k.label}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 pt-4 pb-2">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{k.label}</p>
                </div>
                <div className="bg-green-800 px-5 py-4">
                  <p className="text-white text-3xl font-bold">
                    {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
                  </p>
                  <p className="text-green-300 text-xs mt-1">{k.unit}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Carbon Trend ────────────────────────────────── */}
          {carbonTrend.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-green-800" />
                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                  Carbon Emissions Trend
                </h3>
                <span className="text-xs text-gray-400 ml-auto">{timeRange}-day window</span>
              </div>
              <div className="space-y-3">
                {carbonTrend.slice(0, 10).map((point, i) => {
                  const val = Number(point.total_emissions || point.value || 0);
                  const pct = Math.min((val / maxVal(carbonTrend, 'total_emissions')) * 100, 100);
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-xs text-gray-400 w-20 flex-shrink-0 font-mono">
                        {point.date
                          ? new Date(point.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                          : `Day ${i + 1}`}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        <div
                          className="bg-gradient-to-r from-green-600 to-green-800 h-2.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-28 text-right flex-shrink-0 font-semibold">
                        {val.toFixed(2)} kg CO₂
                      </span>
                      <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">
                        {point.businesses_active || 0} biz
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Alert Distribution ──────────────────────────── */}
          {alertDist.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-5">
                Alert Distribution
              </h3>
              <div className="space-y-3">
                {alertDist.map((item, i) => {
                  const val = Number(item.count || item.value || 0);
                  const pct = Math.min((val / maxVal(alertDist, 'count')) * 100, 100);
                  const colorMap = {
                    HIGH:   'from-red-400 to-red-600',
                    MEDIUM: 'from-orange-400 to-orange-500',
                    LOW:    'from-green-400 to-green-600',
                  };
                  const barColor = colorMap[item.alert_type] || 'from-blue-400 to-blue-600';
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-xs font-bold text-gray-600 w-16 flex-shrink-0">
                        {item.alert_type || `Type ${i + 1}`}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`bg-gradient-to-r ${barColor} h-2.5 rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-10 text-right flex-shrink-0">
                        {val}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Two-column bottom section ─────────────────── */}
          <div className="grid grid-cols-2 gap-5">

            {/* Approval Rates */}
            {approvalRates.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Approval Rates</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-500 uppercase">Business</th>
                        <th className="text-center py-2.5 px-3 text-xs font-bold text-gray-500 uppercase">✓</th>
                        <th className="text-center py-2.5 px-3 text-xs font-bold text-gray-500 uppercase">✗</th>
                        <th className="text-center py-2.5 px-3 text-xs font-bold text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalRates.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-800 text-xs truncate max-w-32">
                            {row.business_name || `Business ${i + 1}`}
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-600 font-bold text-xs">
                            {row.approved_count ?? '—'}
                          </td>
                          <td className="py-3 px-3 text-center text-red-500 font-bold text-xs">
                            {row.rejected_count ?? '—'}
                          </td>
                          <td className="py-3 px-3 text-center text-gray-500 text-xs">
                            {row.total_approvals ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* EcoTrust Leaderboard — backend returns this, was never shown before */}
            {leaderboard.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 flex items-center gap-2">
                  <Trophy size={15} className="text-amber-500" />
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">EcoTrust Leaderboard</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {leaderboard.slice(0, 8).map((biz, i) => (
                    <div key={biz.business_id || i}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-gray-200 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-500'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 font-semibold text-xs truncate">{biz.business_name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${levelColors[biz.level] || 'bg-gray-100 text-gray-600'}`}>
                          {biz.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Leaf size={11} className="text-green-600" />
                        <span className="text-green-800 font-bold text-sm">{biz.total_points}</span>
                        <span className="text-gray-400 text-xs">pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsOverview;