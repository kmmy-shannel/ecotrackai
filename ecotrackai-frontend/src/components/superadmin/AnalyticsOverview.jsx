import React, { useState } from 'react';
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react';

const AnalyticsOverview = ({ analytics, onLoad }) => {
  const [timeRange, setTimeRange] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const handleLoad = async () => {
    setRefreshing(true);
    await onLoad?.(timeRange);
    setRefreshing(false);
  };

  const kpis = [
    { label: 'Total Carbon Emitted',  value: analytics?.totalCarbonEmitted  ?? '—', unit: 'kg CO₂' },
    { label: 'Total Carbon Saved',    value: analytics?.totalCarbonReduced   ?? '—', unit: 'kg CO₂' },
    { label: 'Total Deliveries',      value: analytics?.totalDeliveries      ?? '—', unit: 'routes'  },
    { label: 'Avg EcoTrust Score',    value: analytics?.avgEcotrustScore     ?? '—', unit: 'pts'     },
  ];

  const carbonTrend = analytics?.carbonTrend || analytics?.carbon_trends || [];
  const alertDist   = analytics?.alertDistribution || analytics?.alert_distribution || [];
  const approvalRates = analytics?.approvalRates || analytics?.approval_rates || [];

  const max = (arr, key) => Math.max(...arr.map(d => Number(d[key] || d.value || 0)), 1);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={18} className="text-green-800" />
          <h3 className="font-semibold text-gray-800">CROSS-BUSINESS ANALYTICS</h3>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={e => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={handleLoad} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {analytics ? 'Refresh' : 'Load Analytics'}
          </button>
        </div>
      </div>

      {!analytics ? (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-10 text-center">
          <BarChart3 size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm font-medium">Click Load Analytics to fetch cross-business data</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {kpis.map(k => (
              <div key={k.label}
                className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md border border-gray-100">
                <div className="bg-white px-5 pt-4 pb-2">
                  <h4 className="text-gray-600 text-xs font-medium uppercase tracking-wide">{k.label}</h4>
                </div>
                <div className="bg-green-800 px-5 py-3 flex-1">
                  <p className="text-white text-3xl font-bold">
                    {typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
                  </p>
                  <p className="text-green-200 text-xs mt-0.5">{k.unit}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Carbon Trend */}
          {carbonTrend.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-green-800" />
                <h3 className="font-semibold text-gray-800">CARBON TREND</h3>
              </div>
              <div className="space-y-3">
                {carbonTrend.map((point, i) => {
                  const val = Number(point.total_emission || point.value || 0);
                  const pct = Math.min((val / max(carbonTrend, 'total_emission')) * 100, 100);
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                        {point.date ? new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : point.label}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-green-800 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-24 text-right flex-shrink-0">
                        {val.toFixed(2)} kg CO₂
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alert Distribution */}
          {alertDist.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-5">ALERT DISTRIBUTION</h3>
              <div className="space-y-3">
                {alertDist.map((item, i) => {
                  const val = Number(item.count || item.value || 0);
                  const pct = Math.min((val / max(alertDist, 'count')) * 100, 100);
                  const colorMap = { HIGH: 'bg-red-500', MEDIUM: 'bg-orange-500', LOW: 'bg-green-500' };
                  const color = colorMap[item.alert_type || item.type] || 'bg-blue-500';
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-gray-600 w-16 flex-shrink-0">
                        {item.alert_type || item.type || `Type ${i + 1}`}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-12 text-right flex-shrink-0">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Approval Rates */}
          {approvalRates.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-5">APPROVAL RATES BY BUSINESS</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Business</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Approved</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Rejected</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalRates.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-800">{row.business_name || `Business ${i + 1}`}</td>
                        <td className="py-3 px-3 text-green-700 font-semibold">{row.approved_count ?? '—'}</td>
                        <td className="py-3 px-3 text-red-600 font-semibold">{row.rejected_count ?? '—'}</td>
                        <td className="py-3 px-3 text-gray-600">{row.total_approvals ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsOverview;