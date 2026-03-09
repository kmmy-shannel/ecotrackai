import React, { useState } from 'react';
import { Search, Download, Clock, Building2, User, CheckCircle, AlertCircle } from 'lucide-react';

const AuditViewer = ({ logs = [], onSearch }) => {
  const [filters, setFilters] = useState({
    businessId: '', actionType: '', startDate: '', endDate: '', search: ''
  });

  const handleSearch = () => {
    onSearch?.(filters);
  };

  const handleExport = () => {
    const rows = [
      ['Timestamp', 'Business ID', 'User', 'Event Type', 'Action', 'Entity', 'Message'],
      ...logs.map(l => [
        new Date(l.created_at).toLocaleString(),
        l.business_id || 'Platform',
        l.user_id || 'System',
        l.event_type || '—',
        l.action || '—',
        `${l.entity_type || ''} ${l.entity_id || ''}`.trim(),
        l.message || l.details || '—',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getEventBadge = (event) => {
    if (!event) return null;
    const e = event.toLowerCase();
    const approved  = e.includes('approved');
    const rejected  = e.includes('rejected');
    const created   = e.includes('created');
    const suspended = e.includes('suspended');
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium';
    if (approved)  return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle size={11} /> Approved</span>;
    if (rejected)  return <span className={`${base} bg-red-100 text-red-700`}><AlertCircle size={11} /> Rejected</span>;
    if (created)   return <span className={`${base} bg-blue-100 text-blue-700`}><CheckCircle size={11} /> Created</span>;
    if (suspended) return <span className={`${base} bg-orange-100 text-orange-700`}><AlertCircle size={11} /> Suspended</span>;
    return <span className={`${base} bg-gray-100 text-gray-600`}>{event}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search size={16} className="text-green-800" />
          <h3 className="font-semibold text-gray-800">SEARCH AUDIT LOGS</h3>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Business ID"
            value={filters.businessId}
            onChange={e => setFilters({...filters, businessId: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={filters.actionType}
            onChange={e => setFilters({...filters, actionType: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Actions</option>
            <option value="business_created">Business Created</option>
            <option value="business_approved">Business Approved</option>
            <option value="business_rejected">Business Rejected</option>
            <option value="business_suspended">Business Suspended</option>
          </select>
          <input type="date"
            value={filters.startDate}
            onChange={e => setFilters({...filters, startDate: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input type="date"
            value={filters.endDate}
            onChange={e => setFilters({...filters, endDate: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSearch}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900 transition-colors"
          >
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">AUDIT LOG — {logs.length} entries</h3>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Timestamp</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Business</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actor</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Event</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-400 text-sm">
                    No audit logs found. Use the search above to load logs.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5 text-gray-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-gray-700 text-xs">
                        <Building2 size={12} />
                        {log.business_id || 'Platform'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <User size={12} />
                        {log.user_id || 'System'}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getEventBadge(log.event_type || log.action)}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs max-w-xs truncate" title={log.message}>
                      {log.message || log.details || '—'}
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