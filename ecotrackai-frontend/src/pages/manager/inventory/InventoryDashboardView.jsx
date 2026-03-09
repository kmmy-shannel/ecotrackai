import React from 'react';
import ApprovalCard from '../../../components/manager/inventory/ApprovalCard';
import StatCard from '../../../components/manager/shared/StatCard';
import { AlertTriangle, CheckCircle, Clock, Zap, RefreshCw } from 'lucide-react';

const InventoryDashboardView = ({
  approvals, alerts, onApprove, onDecline, loading, onGenerateAlerts
}) => {
  const list   = Array.isArray(approvals) ? approvals : [];
  const alertList = Array.isArray(alerts) ? alerts : [];

  const high   = list.filter(a => a.risk_level === 'HIGH').length;
  const medium = list.filter(a => a.risk_level === 'MEDIUM').length;
  const low    = list.filter(a => a.risk_level === 'LOW').length;

  return (
    <div className="space-y-6">

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="High Risk"   value={high}   icon={AlertTriangle} accent />
        <StatCard label="Medium Risk" value={medium} icon={Clock} />
        <StatCard label="Low Risk"    value={low}    icon={CheckCircle} />
      </div>

      {/* ── ALERTS PANEL (Module 3) ──────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-red-50">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-red-600" />
            <p className="text-sm font-bold text-red-700 uppercase tracking-wide">
              Active HIGH Alerts
            </p>
            {alertList.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                {alertList.length}
              </span>
            )}
          </div>
          <button
            onClick={onGenerateAlerts}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {alertList.length === 0 ? (
          <div className="px-5 py-4 text-sm text-gray-400 text-center">
            No active HIGH risk alerts right now
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {alertList.map(alert => (
              <div key={alert.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{alert.product_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {alert.quantity} · {alert.location || 'Warehouse'}
                  </p>
                  {alert.details && (
                    <p className="text-xs text-red-500 mt-0.5 italic">"{alert.details}"</p>
                  )}
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full flex-shrink-0">
                  {alert.days_left}d left
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PENDING APPROVALS (Module 1) ──────────────── */}
      {loading && (
        <p className="text-gray-400 text-sm">Loading approvals…</p>
      )}

      {!loading && list.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
          <p className="text-gray-700 font-semibold">All caught up</p>
          <p className="text-gray-400 text-sm mt-1">No pending spoilage approvals</p>
        </div>
      )}

      <div className="space-y-3">
        {list.map(approval => (
          <ApprovalCard
            key={approval.approval_id}
            approval={approval}
            onApprove={onApprove}
            onDecline={onDecline}
          />
        ))}
      </div>
    </div>
  );
};

export default InventoryDashboardView;