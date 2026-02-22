import React, { useState } from 'react';
import { X, Package, Sparkles, ThumbsUp, ThumbsDown, Loader } from 'lucide-react';

const ApprovalDetailModal = ({ approval, onClose, onDecision, submitting, readOnly = false }) => {
  const [comments, setComments] = useState('');
  if (!approval) return null;

  const priorityBg = {
    HIGH: 'from-red-50 to-orange-50 border-red-200',
    MEDIUM: 'from-orange-50 to-yellow-50 border-orange-200',
    LOW: 'from-blue-50 to-indigo-50 border-blue-200'
  };

  const statusTone = {
    approved: {
      box: 'bg-green-50 border-green-200',
      text: 'text-green-700',
      label: 'Approved by Inventory Manager'
    },
    rejected: {
      box: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      label: 'Declined by Inventory Manager'
    },
    pending: {
      box: 'bg-gray-50 border-gray-200',
      text: 'text-gray-700',
      label: 'Pending manager review'
    }
  };

  const currentStatus = statusTone[approval.status] || statusTone.pending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`bg-gradient-to-r ${priorityBg[approval.priority] || priorityBg.LOW} border-b p-6 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Request #{approval.approval_id || approval.id}
              </p>
              <h2 className="text-xl font-bold text-gray-800">Approval Details</h2>
              <p className="text-xs text-gray-500 mt-1">
                Submitted by: <span className="font-semibold text-[#1a4d2e]">Admin</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  approval.priority === 'HIGH'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : approval.priority === 'MEDIUM'
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}
              >
                {approval.priority}
              </span>
              <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Package size={15} className="text-[#1a4d2e]" /> Product Information
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Product</p>
                <p className="font-bold text-gray-800">{approval.product_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Quantity</p>
                <p className="font-bold text-gray-800">{approval.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Location</p>
                <p className="font-semibold text-gray-700">{approval.location}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    approval.risk_level === 'HIGH'
                      ? 'bg-red-100 text-red-700'
                      : approval.risk_level === 'MEDIUM'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                  }`}
                >
                  {approval.risk_level}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-1">Days Remaining</p>
                <span
                  className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${
                    approval.days_left <= 2
                      ? 'bg-red-100 text-red-700'
                      : approval.days_left <= 4
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                  }`}
                >
                  {approval.days_left} days left
                </span>
              </div>
            </div>
          </div>

          {approval.ai_suggestion && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Sparkles size={15} className="text-purple-600" /> AI Suggestion
              </h3>
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
                <p className="text-gray-700 text-sm leading-relaxed italic">"{approval.ai_suggestion}"</p>
              </div>
            </div>
          )}

          {approval.status === 'pending' && !readOnly ? (
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Your Decision</h3>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder="Add a note about your decision (optional)..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent text-sm resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => onDecision(approval.approval_id || approval.id, 'approved', comments)}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#1a4d2e] hover:bg-green-800 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? <Loader size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
                  Approve
                </button>
                <button
                  onClick={() => onDecision(approval.approval_id || approval.id, 'declined', comments)}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? <Loader size={16} className="animate-spin" /> : <ThumbsDown size={16} />}
                  Decline
                </button>
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-xl border-2 ${currentStatus.box}`}>
              <p className={`font-bold ${currentStatus.text}`}>{currentStatus.label}</p>
              {readOnly && approval.status === 'pending' && (
                <p className="text-sm text-gray-600 mt-1">Read-only mode for admin oversight.</p>
              )}
              {approval.review_notes && <p className="text-sm text-gray-600 mt-1">Note: "{approval.review_notes}"</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalDetailModal;
