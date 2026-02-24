import React, { useState } from 'react';
import { MapPin, Calendar, Sparkles, ThumbsUp, ThumbsDown, Eye, SendHorizonal, ChevronDown, ChevronUp } from 'lucide-react';

const PriorityBadge = ({ priority }) => {
  const styles = {
    HIGH:   'bg-red-100 text-red-700 border border-red-200',
    MEDIUM: 'bg-orange-100 text-orange-700 border border-orange-200',
    LOW:    'bg-blue-100 text-blue-700 border border-blue-200',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[priority] || styles.LOW}`}>
      {priority}
    </span>
  );
};

const ApprovalCard = ({
  approval,
  onApprove,
  onDecline,
  onRequestToAdmin,
  onViewDetails,
  submitting,
  readOnly = false,
}) => {
  const [showRequestBox, setShowRequestBox] = useState(false);
  const [requestComment, setRequestComment] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const priorityStyles = {
    HIGH:   { border: 'border-l-red-500',    dot: 'bg-red-500' },
    MEDIUM: { border: 'border-l-orange-400', dot: 'bg-orange-400' },
    LOW:    { border: 'border-l-blue-400',   dot: 'bg-blue-400' },
  };
  const style = priorityStyles[approval.priority] || priorityStyles.LOW;

  const handleRequestToAdmin = async () => {
    if (!onRequestToAdmin) return;
    try {
      setSendingRequest(true);
      await onRequestToAdmin(approval.approval_id || approval.id, requestComment);
      setShowRequestBox(false);
      setRequestComment('');
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${style.border} overflow-hidden hover:shadow-md transition-all`}>

      {/* Main Card Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
            <PriorityBadge priority={approval.priority} />
            {approval.priority === 'HIGH' && (
              <span className="text-xs font-semibold text-red-600 animate-pulse">Act Now</span>
            )}
          </div>
          <span className="text-xs text-gray-400">#{approval.approval_id || approval.id}</span>
        </div>

        {/* Product Info */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Product</p>
            <p className="font-bold text-gray-800">{approval.product_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Quantity</p>
            <p className="font-bold text-gray-800">{approval.quantity}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-gray-400" />
            <p className="text-xs text-gray-600 truncate">{approval.location}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className={approval.days_left <= 2 ? 'text-red-400' : 'text-gray-400'} />
            <p className={`text-xs font-semibold ${approval.days_left <= 2 ? 'text-red-600' : 'text-gray-600'}`}>
              {approval.days_left} days left
            </p>
          </div>
        </div>

        {/* AI Suggestion */}
        {approval.ai_suggestion && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={12} className="text-purple-600" />
              <p className="text-xs font-semibold text-purple-700">AI Suggestion</p>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed italic">"{approval.ai_suggestion}"</p>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-3">
          Submitted by: <span className="font-medium text-gray-600">Admin</span>
        </p>

        {/* Action Buttons */}
        {!readOnly ? (
          <div className="space-y-2">
            {/* Primary Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onApprove(approval.approval_id || approval.id)}
                disabled={submitting || sendingRequest}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1a4d2e] hover:bg-green-800 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                <ThumbsUp size={13} /> Approve
              </button>
              <button
                onClick={() => onDecline(approval.approval_id || approval.id)}
                disabled={submitting || sendingRequest}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                <ThumbsDown size={13} /> Decline
              </button>
              <button
                onClick={() => onViewDetails(approval)}
                className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all"
                title="View Details"
              >
                <Eye size={13} />
              </button>
            </div>

            {/* Request to Admin toggle */}
            <button
              onClick={() => setShowRequestBox(!showRequestBox)}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              <SendHorizonal size={12} />
              Request to Admin
              {showRequestBox ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => onViewDetails(approval)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all"
          >
            <Eye size={14} /> View Details
          </button>
        )}
      </div>

      {/* Request to Admin Expandable Box */}
      {showRequestBox && !readOnly && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-amber-800">
            Explain why you need Admin review:
          </p>
          <textarea
            rows={2}
            value={requestComment}
            onChange={(e) => setRequestComment(e.target.value)}
            placeholder="e.g. Unsure about quantity threshold, needs higher approval…"
            className="w-full px-3 py-2 border border-amber-200 rounded-xl text-xs resize-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRequestToAdmin}
              disabled={sendingRequest}
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {sendingRequest ? 'Sending…' : 'Send to Admin'}
            </button>
            <button
              onClick={() => { setShowRequestBox(false); setRequestComment(''); }}
              className="px-4 py-2 bg-white border border-amber-200 text-amber-700 text-xs font-semibold rounded-xl hover:bg-amber-100 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalCard;