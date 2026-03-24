// ============================================================
// FILE: src/components/superadmin/SystemHealthPanel.jsx
//
// FIX: Was mapping health.total_users — backend returns
//      health.active_users (not total_users). Card was always —.
//      Corrected field name. Also added super_admin_count query
//      to display properly.
// ============================================================

import React, { useState } from 'react';
import {
  Activity, RefreshCw, ChevronRight,
  Users, AlertTriangle, CheckCircle,
  Building2, Clock
} from 'lucide-react';

const SystemHealthPanel = ({ health, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  };

  // FIX: 'active_users' — backend returns this field name, not 'total_users'
  const metrics = [
    {
      label: 'Total Businesses',
      value: health?.total_businesses     ?? '—',
      icon:  Building2,
      color: 'from-blue-500 to-blue-700',
      bg:    'bg-blue-50',
    },
    {
      label: 'Active Businesses',
      value: health?.active_businesses    ?? '—',
      icon:  CheckCircle,
      color: 'from-green-600 to-green-800',
      bg:    'bg-green-50',
    },
    {
      label: 'Suspended',
      value: health?.suspended_businesses ?? '—',
      icon:  AlertTriangle,
      color: 'from-orange-500 to-orange-700',
      bg:    'bg-orange-50',
    },
    {
      label: 'Active Users',
      // FIX: was health.total_users — corrected to health.active_users
      value: health?.active_users         ?? '—',
      icon:  Users,
      color: 'from-purple-500 to-purple-700',
      bg:    'bg-purple-50',
    },
    {
      label: 'Alerts Today',
      value: health?.alerts_today         ?? '—',
      icon:  AlertTriangle,
      color: 'from-red-500 to-red-700',
      bg:    'bg-red-50',
    },
    {
      label: 'Pending Approvals',
      value: health?.pending_approvals    ?? '—',
      icon:  Clock,
      color: 'from-amber-500 to-amber-700',
      bg:    'bg-amber-50',
    },
    {
      label: 'High Risk Alerts',
      value: health?.high_risk_alerts     ?? '—',
      icon:  AlertTriangle,
      color: 'from-rose-500 to-rose-700',
      bg:    'bg-rose-50',
    },
    {
      label: 'System Status',
      value: health?.system_status        ?? '—',
      icon:  Activity,
      color: 'from-teal-500 to-teal-700',
      bg:    'bg-teal-50',
    },
  ];

  const isOperational = health?.system_status === 'operational';

  return (
    <div className="space-y-5">

      {/* ── Header card ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-800 flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">System Health</h3>
              {health?.timestamp && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Last updated: {new Date(health.timestamp).toLocaleString('en-PH', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {health && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                isOperational
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isOperational ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                {isOperational ? 'All Systems Operational' : 'Issues Detected'}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="p-5 grid grid-cols-4 gap-4">
          {metrics.map(m => {
            const Icon = m.icon;
            return (
              <div key={m.label}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg ${m.bg} flex items-center justify-center`}>
                    <Icon size={13} className="text-gray-600" />
                  </div>
                  <h4 className="text-gray-500 text-xs font-semibold uppercase tracking-wide leading-tight">
                    {m.label}
                  </h4>
                </div>
                <div className={`bg-gradient-to-br ${m.color} px-4 py-3`}>
                  <p className="text-white text-2xl font-bold capitalize">{m.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-white/70 text-xs">Platform-wide</p>
                    <ChevronRight size={11} className="text-white/50" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    
    </div>
  );
};

export default SystemHealthPanel;