import React from 'react';
import { CheckCircle, XCircle, History, Navigation, Leaf } from 'lucide-react';

const LogisticsHistoryView = ({ history, onBack }) => {
  const grouped = history.reduce((acc, item) => {
    const dateStr = item.reviewed_at || item.updated_at;
    const key = dateStr
      ? new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'Unknown Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const totalApproved = history.filter(h => h.status === 'approved').length;
  const totalDeclined = history.filter(h => h.status === 'rejected' || h.status === 'declined').length;
  const approvalRate  = history.length > 0 ? Math.round((totalApproved / history.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">APPROVAL HISTORY</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-gray-800">{history.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Decisions</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-green-600">{totalApproved}</p>
          <p className="text-sm text-green-600 mt-1">Approved</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-red-600">{totalDeclined}</p>
          <p className="text-sm text-red-500 mt-1">Declined</p>
        </div>
      </div>

      {/* Rate bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Approval Rate</p>
          <p className="text-lg font-bold text-gray-800">{approvalRate}%</p>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#1a4d2e] rounded-full transition-all duration-500" style={{ width: `${approvalRate}%` }} />
        </div>
      </div>

      {/* History list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <History size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">No history yet</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">{dateLabel}</p>
            <div className="space-y-3">
              {items.map((item, i) => {
                const extra = (() => { try { return JSON.parse(item.extra_data || '{}'); } catch { return {}; } })();
                const savings = extra.savings || {};
                return (
                  <div key={i} className={`bg-white rounded-xl p-4 border-l-4 shadow-sm ${item.status === 'approved' ? 'border-l-green-500' : 'border-l-red-400'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${item.status === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {item.status === 'approved'
                            ? <CheckCircle size={18} className="text-green-600" />
                            : <XCircle size={18} className="text-red-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {item.status === 'approved' ? 'APPROVED' : 'DECLINED'}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-800 text-sm">{item.product_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.quantity} · {item.location}</p>
                          {savings.distance && (
                            <div className="flex gap-3 mt-1">
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <Navigation size={10} /> -{savings.distance} km
                              </span>
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <Leaf size={10} /> -{savings.emissions} kg CO₂
                              </span>
                            </div>
                          )}
                          {item.review_notes && <p className="text-xs text-gray-400 mt-1 italic">"{item.review_notes}"</p>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {item.reviewed_at ? new Date(item.reviewed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default LogisticsHistoryView;