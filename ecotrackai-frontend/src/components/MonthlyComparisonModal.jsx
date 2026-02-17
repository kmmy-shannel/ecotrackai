import React, { useState, useEffect } from 'react';
import { X, TrendingDown, TrendingUp, Minus, Calendar, Leaf, Fuel, Truck, MapPin, RefreshCw } from 'lucide-react';
import carbonService from '../services/carbon.service';

const MonthlyComparisonModal = ({ onClose, currentData }) => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMetric, setActiveMetric] = useState('emissions');

  useEffect(() => {
    loadMonthlyData();
  }, []);

  const loadMonthlyData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await carbonService.getMonthlyComparison();
      if (response.success) {
        setMonthlyData(response.data.months || []);
      }
    } catch (err) {
      console.error('Monthly data error:', err);
      setError('Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    { key: 'emissions', label: 'CO₂ (kg)', icon: <Leaf size={14} />, color: '#1a4d2e', unit: 'kg' },
    { key: 'fuel', label: 'Fuel (L)', icon: <Fuel size={14} />, color: '#d97706', unit: 'L' },
    { key: 'distance', label: 'Distance (km)', icon: <MapPin size={14} />, color: '#2563eb', unit: 'km' },
    { key: 'trips', label: 'Trips', icon: <Truck size={14} />, color: '#7c3aed', unit: '' },
  ];

  const activeMetricInfo = metrics.find(m => m.key === activeMetric);

  // Find max value for bar scaling
  const maxValue = Math.max(
    ...monthlyData.map(m => parseFloat(m[activeMetric]) || 0),
    1
  );

  const getTrend = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous * 100).toFixed(1);
    return parseFloat(change);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#1a4d2e] to-emerald-700 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Calendar size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Monthly Comparison</h3>
                <p className="text-emerald-100 text-sm">Last 6 months overview</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Current Month Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs text-emerald-600 font-medium mb-1">This Month</p>
              <p className="text-2xl font-bold text-gray-800">
                {currentData?.totalEmissions?.toFixed(1) || '0.0'}
                <span className="text-sm font-normal ml-1">kg CO₂</span>
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium mb-1">vs Last Month</p>
              <div className="flex items-center gap-2">
                {currentData?.comparison?.trend === 'decreased' ? (
                  <>
                    <TrendingDown size={20} className="text-green-600" />
                    <p className="text-2xl font-bold text-green-700">
                      -{Math.abs(currentData?.comparison?.change || 0).toFixed(1)}%
                    </p>
                  </>
                ) : currentData?.comparison?.trend === 'increased' ? (
                  <>
                    <TrendingUp size={20} className="text-red-600" />
                    <p className="text-2xl font-bold text-red-700">
                      +{Math.abs(currentData?.comparison?.change || 0).toFixed(1)}%
                    </p>
                  </>
                ) : (
                  <>
                    <Minus size={20} className="text-gray-500" />
                    <p className="text-2xl font-bold text-gray-600">0%</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Metric Selector */}
          <div className="flex gap-2 flex-wrap">
            {metrics.map(m => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeMetric === m.key
                    ? 'bg-[#1a4d2e] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {/* Chart / Bars */}
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">Loading monthly data...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm mb-3">{error}</p>
              <button
                onClick={loadMonthlyData}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyData.map((month, idx) => {
                const value = parseFloat(month[activeMetric]) || 0;
                const prevValue = idx > 0 ? parseFloat(monthlyData[idx - 1][activeMetric]) || 0 : null;
                const trend = getTrend(value, prevValue);
                const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const isLatest = idx === monthlyData.length - 1;

                return (
                  <div key={idx} className={`rounded-xl p-4 border transition-all ${
                    isLatest
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{month.month}</span>
                        {isLatest && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {trend !== null && (
                          <span className={`text-xs font-medium flex items-center gap-1 ${
                            activeMetric === 'emissions' || activeMetric === 'fuel'
                              ? trend < 0 ? 'text-green-600' : trend > 0 ? 'text-red-500' : 'text-gray-500'
                              : trend > 0 ? 'text-blue-600' : trend < 0 ? 'text-orange-500' : 'text-gray-500'
                          }`}>
                            {trend < 0 ? <TrendingDown size={12} /> : trend > 0 ? <TrendingUp size={12} /> : <Minus size={12} />}
                            {Math.abs(trend)}%
                          </span>
                        )}
                        <span className="text-sm font-bold text-gray-800">
                          {value.toFixed(activeMetric === 'trips' ? 0 : 1)} {activeMetricInfo?.unit}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: isLatest ? '#1a4d2e' : activeMetricInfo?.color
                        }}
                      />
                    </div>

                    {/* Sub stats */}
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>{month.trips} trips</span>
                      <span>{parseFloat(month.distance).toFixed(1)} km</span>
                      <span>{parseFloat(month.fuel).toFixed(1)} L fuel</span>
                    </div>
                  </div>
                );
              })}

              {monthlyData.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Calendar size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No historical data available yet.</p>
                  <p className="text-xs mt-1">Data will appear after deliveries are made.</p>
                </div>
              )}
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#1a4d2e] hover:bg-emerald-800 text-white rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyComparisonModal;