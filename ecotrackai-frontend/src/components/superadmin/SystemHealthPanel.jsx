import React, { useState } from 'react';
import {
  AlertCircle, CheckCircle, TrendingUp,
  Users, Activity, RefreshCw, ChevronRight
} from 'lucide-react';

const SystemHealthPanel = ({ health, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  };

  const metrics = [
    { label: 'Total Businesses',   value: health?.total_businesses  ?? '—', color: 'blue'   },
    { label: 'Active Businesses',  value: health?.active_businesses ?? '—', color: 'green'  },
    { label: 'Suspended',          value: health?.suspended_businesses ?? '—', color: 'orange' },
    { label: 'Total Users',        value: health?.total_users       ?? '—', color: 'purple' },
    { label: 'Alerts Today',       value: health?.alerts_today      ?? '—', color: 'red'    },
    { label: 'Pending Approvals',  value: health?.pending_approvals ?? '—', color: 'yellow' },
    { label: 'High Risk Alerts',   value: health?.high_risk_alerts  ?? '—', color: 'red'    },
    { label: 'System Status',      value: health?.system_status     ?? 'operational', color: 'green' },
  ];

  const colorMap = {
    green:  { bar: 'bg-green-800', text: 'text-green-800' },
    blue:   { bar: 'bg-blue-700',  text: 'text-blue-700'  },
    purple: { bar: 'bg-purple-700',text: 'text-purple-700'},
    orange: { bar: 'bg-orange-600',text: 'text-orange-600'},
    red:    { bar: 'bg-red-600',   text: 'text-red-600'   },
    yellow: { bar: 'bg-yellow-600',text: 'text-yellow-700'},
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-green-800" />
            <h3 className="font-semibold text-gray-800">SYSTEM HEALTH</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="p-6 grid grid-cols-4 gap-4">
          {metrics.map(m => {
            const c = colorMap[m.color] || colorMap.green;
            return (
              <div key={m.label}
                className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100">
                <div className="bg-white px-4 pt-4 pb-2">
                  <h4 className="text-gray-600 text-xs font-medium uppercase tracking-wide">{m.label}</h4>
                </div>
                <div className={`${c.bar} px-4 py-3 flex-1`}>
                  <p className="text-white text-2xl font-bold capitalize">{m.value}</p>
                  <p className="text-green-100 text-xs mt-1 flex items-center gap-1">
                    Platform-wide <ChevronRight size={12} className="opacity-70" />
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Super Admin Users */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-green-800" />
          <h3 className="font-semibold text-gray-800">SUPER ADMIN ACCOUNTS</h3>
        </div>
        {health?.super_admin_count ? (
          <p className="text-3xl font-bold text-green-800">{health.super_admin_count}</p>
        ) : (
          <p className="text-gray-400 text-sm">Load health data to see super admin count</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Recommended: 1–3 super admins. Current: {health?.super_admin_count ?? '—'}
        </p>
      </div>
    </div>
  );
};

export default SystemHealthPanel;