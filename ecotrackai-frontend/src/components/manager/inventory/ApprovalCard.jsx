import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle2, XCircle, MapPin, Package, Clock } from 'lucide-react';
import PriorityBadge from '../shared/PriorityBadge';

const ApprovalCard = ({ approval, onApprove, onDecline }) => {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment]   = useState('');
  const [reason, setReason]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [declineMode, setDeclineMode] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    await onApprove(approval.approval_id, comment);
    setSubmitting(false);
  };

  const handleDecline = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onDecline(approval.approval_id, reason);
    setSubmitting(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            approval.risk_level === 'HIGH' ? 'bg-red-500 animate-pulse' :
            approval.risk_level === 'MEDIUM' ? 'bg-orange-400' : 'bg-green-400'
          }`} />
          <div>
            <p className="font-semibold text-gray-800 text-sm">{approval.product_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {approval.quantity} · {approval.days_left}d left
              {approval.location && ` · ${approval.location}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PriorityBadge level={approval.risk_level} />
          {expanded
            ? <ChevronUp size={15} className="text-gray-400" />
            : <ChevronDown size={15} className="text-gray-400" />
          }
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">

          {/* Info grid */}
          <div className="grid grid-cols-3 gap-3">
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="flex items-center gap-1 mb-1">
      <Package size={11} className="text-gray-400" />
      <p className="text-xs text-gray-400">Quantity</p>
    </div>
    <p className="font-semibold text-gray-800 text-sm">{approval.quantity}</p>
  </div>
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="flex items-center gap-1 mb-1">
      <Clock size={11} className="text-gray-400" />
      <p className="text-xs text-gray-400">Days Left</p>
    </div>
    <p className={`font-semibold text-sm ${
      approval.days_left <= 2 ? 'text-red-600' :
      approval.days_left <= 4 ? 'text-orange-500' : 'text-gray-800'
    }`}>
      {approval.days_left}d
    </p>
  </div>
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="flex items-center gap-1 mb-1">
      <MapPin size={11} className="text-gray-400" />
      <p className="text-xs text-gray-400">Location</p>
    </div>
    <p className="font-semibold text-gray-800 text-sm truncate">
      {approval.location || '—'}
    </p>
  </div>
</div>

{/* Batch number — extracted from extra_data */}
{(() => {
  const batchNumber =
    approval.batch_number ||
    (typeof approval.extra_data === 'string'
      ? (() => { try { return JSON.parse(approval.extra_data)?.batchNumber; } catch { return null; } })()
      : approval.extra_data?.batchNumber) ||
    null;
  return batchNumber ? (
    <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
      <span className="text-xs text-gray-400 font-medium">Batch #</span>
      <span className="text-xs font-bold text-gray-700 font-mono">{batchNumber}</span>
    </div>
  ) : null;
})()}

          {/* AI suggestion */}
          {approval.ai_suggestion && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={12} className="text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700">AI Recommendation</p>
              </div>
              <p className="text-sm text-emerald-800 italic">"{approval.ai_suggestion}"</p>
            </div>
          )}

          {/* Approve flow */}
          {!declineMode && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Approval Note (optional)
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add context for the Admin…"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Decline flow */}
          {declineMode && (
            <div>
              <label className="text-xs font-semibold text-red-500 uppercase tracking-wide block mb-1.5">
                Decline Reason (required)
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="State your reason for declining…"
                className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}

          {/* Action buttons */}
          {!declineMode ? (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                {submitting ? 'Submitting…' : 'Approve'}
              </button>
              <button
                onClick={() => setDeclineMode(true)}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded-lg text-sm transition-all"
              >
                <XCircle size={14} />
                Decline
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setDeclineMode(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={submitting || !reason.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
              >
                <XCircle size={14} />
                {submitting ? 'Submitting…' : 'Confirm Decline'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApprovalCard;