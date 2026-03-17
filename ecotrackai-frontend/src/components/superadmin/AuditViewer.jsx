// ============================================================
// FILE: src/components/superadmin/AuditViewer.jsx
//
// ADDED: Flagged EcoTrust Transactions section at the top.
//   Shows all ecotrust_transactions WHERE flagged = TRUE
//   across all businesses. Super Admin can review and dismiss.
//   All existing audit log search/table functionality unchanged.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Search, Download, Clock, Building2, User,
  CheckCircle, AlertCircle, XCircle, RefreshCw, Flag
} from 'lucide-react';

// ─── Flagged Transactions Panel ───────────────────────────────────────────────
// Shows ecotrust_transactions flagged by Sustainability Managers
const FlaggedTransactionsPanel = ({ flaggedTransactions = [], loading, onDismiss }) => {
  const ACTION_META = {
    spoilage_prevention: { label: 'Spoilage Prevention',  color: 'text-green-700',  bg: 'bg-green-50'  },
    optimized_route:     { label: 'Optimised Route',      color: 'text-blue-700',   bg: 'bg-blue-50'   },
    carbon_verified:     { label: 'Carbon Verified',      color: 'text-purple-700', bg: 'bg-purple-50' },
    on_time_delivery:    { label: 'On-Time Delivery',     color: 'text-orange-700', bg: 'bg-orange-50' },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-gray-400" />
        <p className="text-gray-400 text-sm">Loading flagged transactions…</p>
      </div>
    );
  }

  if (flaggedTransactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-green-800 flex items-center justify-center">
            <Flag size={14} className="text-white" />
          </div>
          <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
            Flagged EcoTrust Transactions
          </h3>
        </div>
        <div className="flex items-center gap-2 mt-4 text-gray-400">
          <CheckCircle size={16} className="text-green-500" />
          <span className="text-sm">No flagged transactions — all clear.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
            <Flag size={14} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
              Flagged EcoTrust Transactions
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Flagged by Sustainability Managers for review
            </p>
          </div>
        </div>
        <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-200">
          {flaggedTransactions.length} flagged
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Business</th>
              <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Points</th>
              <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Flagged By</th>
              <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Flagged At</th>
              <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {flaggedTransactions.map((tx, i) => {
              const meta = ACTION_META[tx.action_type] || { label: tx.action_type, color: 'text-gray-600', bg: 'bg-gray-50' };
              return (
                <tr key={tx.transaction_id || i}
                  className="border-b border-gray-50 hover:bg-red-50/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-gray-800 font-medium text-xs">{tx.business_name || '—'}</p>
                        <p className="text-gray-400 text-xs">ID: {tx.business_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-green-700 text-sm">+{tx.points_earned}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <User size={11} className="text-gray-400" />
                      <span className="text-gray-700 text-xs">{tx.flagged_by_name || `User #${tx.flagged_by}`}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <Clock size={11} className="flex-shrink-0" />
                      {tx.flagged_at
                        ? new Date(tx.flagged_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-gray-500 text-xs truncate" title={tx.flag_reason}>
                      {tx.flag_reason || '—'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onDismiss?.(tx.transaction_id)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main AuditViewer ─────────────────────────────────────────────────────────
const AuditViewer = ({ logs = [], onSearch, flaggedTransactions = [], flaggedLoading = false, onDismissFlag }) => {
  const [filters, setFilters] = useState({
    businessId: '',
    eventType:  '',
    startDate:  '',
    endDate:    '',
  });
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    await onSearch?.({
      businessId: filters.businessId || undefined,
      eventType:  filters.eventType  || undefined,
      startDate:  filters.startDate  || undefined,
      endDate:    filters.endDate    || undefined,
    });
    setSearching(false);
  };

  const handleExport = () => {
    const rows = [
      ['Timestamp', 'Business', 'Actor', 'Event Type', 'Status', 'Risk', 'Comment'],
      ...logs.map(l => [
        l.created_at ? new Date(l.created_at).toLocaleString() : '—',
        l.business_name  || l.business_id || 'Platform',
        l.decided_by_name || l.decided_by || 'System',
        l.event_type     || l.approval_type || '—',
        l.status         || '—',
        l.risk_level     || '—',
        l.reason         || l.manager_comment || l.ai_suggestion || '—',
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    const base = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold';
    if (s === 'approved')          return <span className={`${base} bg-emerald-100 text-emerald-700`}><CheckCircle size={11} /> Approved</span>;
    if (s === 'rejected' || s === 'declined') return <span className={`${base} bg-red-100 text-red-700`}><XCircle size={11} /> {status}</span>;
    if (s === 'pending')           return <span className={`${base} bg-amber-100 text-amber-700`}><AlertCircle size={11} /> Pending</span>;
    if (s === 'revision_required') return <span className={`${base} bg-orange-100 text-orange-700`}><RefreshCw size={11} /> Revision</span>;
    return <span className={`${base} bg-gray-100 text-gray-600`}>{status}</span>;
  };

  const getRiskBadge = (risk) => {
    if (!risk) return null;
    const map = {
      HIGH:   'bg-red-100 text-red-700',
      MEDIUM: 'bg-orange-100 text-orange-700',
      LOW:    'bg-green-100 text-green-700',
    };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${map[risk] || 'bg-gray-100 text-gray-600'}`}>
        {risk}
      </span>
    );
  };

  return (
    <div className="space-y-5">

      {/* ── Flagged EcoTrust Transactions (NEW) ─────────────── */}
      <FlaggedTransactionsPanel
        flaggedTransactions={flaggedTransactions}
        loading={flaggedLoading}
        onDismiss={onDismissFlag}
      />

      {/* ── Filter Bar (unchanged) ───────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-green-800 flex items-center justify-center">
            <Search size={14} className="text-white" />
          </div>
          <h3 className="font-bold text-gray-800 text-sm tracking-wide uppercase">Search Audit Logs</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Business ID</label>
            <input
              type="number"
              placeholder="e.g. 3"
              value={filters.businessId}
              onChange={e => setFilters({ ...filters, businessId: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
            <select
              value={filters.eventType}
              onChange={e => setFilters({ ...filters, eventType: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">All Types</option>
              <option value="spoilage_action">Spoilage Action</option>
              <option value="route_optimization">Route Optimization</option>
              <option value="carbon_verification">Carbon Verification</option>
              <option value="inventory_adjustment">Inventory Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={searching}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900 transition-colors disabled:opacity-60"
        >
          {searching
            ? <><RefreshCw size={14} className="animate-spin" /> Searching...</>
            : <><Search size={14} /> Search Logs</>
          }
        </button>
      </div>

      {/* ── Results Table (unchanged) ────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-white to-gray-50">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Audit Trail</h3>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-semibold">
              {logs.length} entries
            </span>
          </div>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Business</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Decided By</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Event Type</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Risk</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <Search size={32} className="mx-auto mb-3 text-gray-200" />
                    <p className="text-gray-400 text-sm font-medium">Use the search above to load audit logs</p>
                    <p className="text-gray-300 text-xs mt-1">Filter by business, date range, or event type</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={log.approval_id || i}
                    className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Clock size={11} className="flex-shrink-0" />
                        <span>{log.created_at ? new Date(log.created_at).toLocaleString('en-PH', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '—'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-gray-800 font-medium text-xs">{log.business_name || '—'}</p>
                          <p className="text-gray-400 text-xs">ID: {log.business_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700 text-xs font-medium">
                          {log.decided_by_name || 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
                        {log.event_type || log.approval_type || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(log.status)}</td>
                    <td className="py-3.5 px-4">{getRiskBadge(log.risk_level)}</td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-gray-500 text-xs truncate" title={log.reason || log.ai_suggestion}>
                        {log.reason || log.ai_suggestion || '—'}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditViewer;