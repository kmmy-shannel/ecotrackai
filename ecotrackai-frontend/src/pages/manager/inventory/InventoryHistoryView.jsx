// ============================================================
// FILE LOCATION: src/pages/manager/inventory/InventoryHistoryView.jsx
// REDESIGN: No "Back to Dashboard" button — navigation is
//           handled by the sidebar tabs in the Layout.
//           Clean dark green modern aesthetic.
// ============================================================

import React from 'react';
import { CheckCircle, XCircle, ClipboardList } from 'lucide-react';

const InventoryHistoryView = ({ history = [] }) => {
  const totalApproved = history.filter(h => h.status === 'approved').length;
  const totalDeclined = history.filter(h => h.status === 'rejected' || h.status === 'declined').length;
  const approvalRate  = history.length > 0 ? Math.round((totalApproved / history.length) * 100) : 0;

  // Group by date
  const grouped = history.reduce((acc, item) => {
    const dateStr = item.reviewed_at || item.updated_at;
    const key = dateStr
      ? new Date(dateStr).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
      : 'Unknown Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Approval History</h2>
        <p className="text-xs text-gray-400 mt-0.5">All past spoilage approval decisions</p>
      </div>

      {/* ── Summary Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-gray-800">{history.length}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">Total Decisions</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold" style={{ color: '#1a4d2e' }}>{totalApproved}</p>
          <p className="text-xs text-green-600 mt-1 font-medium uppercase tracking-wide">Approved</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-red-600">{totalDeclined}</p>
          <p className="text-xs text-red-500 mt-1 font-medium uppercase tracking-wide">Declined</p>
        </div>
      </div>

      {/* ── Approval Rate Bar ──────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Approval Rate</p>
          <p className="text-lg font-bold text-gray-800">{approvalRate}%</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${approvalRate}%`, background: '#1a4d2e' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-400">{totalDeclined} declined</span>
          <span className="text-xs text-gray-400">{totalApproved} approved</span>
        </div>
      </div>

      {/* ── History List ───────────────────────────────────── */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#f0fdf4' }}>
            <ClipboardList size={28} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-500 text-sm">No approval history yet</p>
          <p className="text-xs text-gray-400 mt-1">Decisions will appear here after you approve or decline items</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
              {dateLabel}
            </p>
            <div className="space-y-2">
              {items.map((item, i) => (
                <HistoryItem key={`${dateLabel}-${i}`} item={item} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ── Individual history row ──────────────────────────────────
const HistoryItem = ({ item }) => {
  const approved = item.status === 'approved';

  return (
    <div
      className={`bg-white rounded-xl p-4 shadow-sm border-l-4 hover:shadow-md transition-shadow ${
        approved ? 'border-l-green-500' : 'border-l-red-400'
      }`}
      style={{ border: '1px solid #f0f0f0', borderLeft: approved ? '4px solid #22c55e' : '4px solid #f87171' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">

          {/* Icon */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: approved ? '#dcfce7' : '#fee2e2' }}
          >
            {approved
              ? <CheckCircle size={16} className="text-green-600" />
              : <XCircle    size={16} className="text-red-500" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: approved ? '#dcfce7' : '#fee2e2',
                  color: approved ? '#166534' : '#991b1b',
                }}
              >
                {approved ? 'APPROVED' : 'DECLINED'}
              </span>
              {item.priority && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  item.priority === 'HIGH'   ? 'bg-red-50 text-red-600 border-red-200' :
                  item.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                  'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {item.priority}
                </span>
              )}
            </div>

            <p className="font-semibold text-gray-800 text-sm truncate">
              {item.product_name}
              {item.quantity && (
                <span className="font-normal text-gray-500 ml-1 text-xs">({item.quantity})</span>
              )}
            </p>

            {item.location && (
              <p className="text-xs text-gray-400 mt-0.5">📍 {item.location}</p>
            )}

            {item.ai_suggestion && (
              <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">
                AI: "{item.ai_suggestion}"
              </p>
            )}

            {item.review_notes && (
              <p className="text-xs text-gray-500 mt-1">
                Note: <span className="italic">"{item.review_notes}"</span>
              </p>
            )}

            <p className="text-xs text-gray-400 mt-1">
              Decided by:{' '}
              <span className="font-medium text-gray-600">
                {item.decided_by_role
                  ? item.decided_by_role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  : 'Inventory Manager'}
              </span>
            </p>
          </div>
        </div>

        {/* Time + shelf life */}
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400">
            {item.reviewed_at || item.updated_at
              ? new Date(item.reviewed_at || item.updated_at).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit',
                })
              : '—'}
          </p>
          {item.days_left != null && (
            <p className={`text-xs font-semibold mt-1 ${
              item.days_left <= 2 ? 'text-red-500' :
              item.days_left <= 4 ? 'text-orange-500' :
              'text-green-600'
            }`}>
              {item.days_left}d shelf life
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryHistoryView;