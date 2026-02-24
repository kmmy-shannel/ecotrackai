import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import authService from '../../services/auth.service';
import useAlerts from '../../hooks/useAlerts';
import approvalService from '../../services/approval.service';
import {
  Search, Sparkles, Trash2, X, TrendingDown,
  Package, Clock, ShieldCheck, AlertCircle, CheckCircle2,
  XCircle, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';

const AlertsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Pending admin-escalated requests
  const [adminRequests, setAdminRequests]         = useState([]);
  const [loadingRequests, setLoadingRequests]     = useState(false);
  const [expandedRequest, setExpandedRequest]     = useState(null);
  const [adminComments, setAdminComments]         = useState({});
  const [submittingId, setSubmittingId]           = useState(null);
  const [requestSuccess, setRequestSuccess]       = useState('');
  const [requestError, setRequestError]           = useState('');

  const {
    filteredAlerts, loading, stats, error, success,
    searchTerm, selectedFilter, showAIModal, selectedAlert,
    aiInsights, loadingInsights,
    setSearchTerm, setSelectedFilter,
    deleteAlert, getAIInsights, closeAIModal, submitReview,
    getRiskBadgeColor, getRiskBadgeText, getProductImage
  } = useAlerts();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    setUser(currentUser);
    fetchAdminRequests();
  }, [navigate]);

  const fetchAdminRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await approvalService.getRequestsForAdmin();
      setAdminRequests(response?.data?.requests || response?.requests || []);
    } catch {
      setAdminRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleAdminDecision = async (requestId, decision) => {
    try {
      setSubmittingId(requestId);
      const comment = adminComments[requestId] || '';
      await approvalService.adminReviewRequest(requestId, decision, comment);
      setRequestSuccess(`Successfully ${decision === 'approved' ? 'approved' : 'declined'} the request.`);
      setAdminRequests(prev => prev.filter(r => (r.request_id || r.id) !== requestId));
      setTimeout(() => setRequestSuccess(''), 4000);
    } catch {
      setRequestError('Failed to submit decision. Please try again.');
      setTimeout(() => setRequestError(''), 4000);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReview = (decision) => submitReview(decision);

  if (!user) return null;

  return (
    <Layout currentPage="Spoilage Alerts" user={user}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Toast Messages */}
        {(success || requestSuccess) && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> {success || requestSuccess}
          </div>
        )}
        {(error || requestError) && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error || requestError}
          </div>
        )}

        {/* ── Admin Review Panel (escalated requests) ─────────── */}
        {adminRequests.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-[#1a4d2e]" />
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                Pending Admin Review
              </h2>
              <span className="ml-1 text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full">
                {adminRequests.length} request{adminRequests.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingRequests ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                Loading requests…
              </div>
            ) : (
              <div className="space-y-3">
                {adminRequests.map((req) => {
                  const id = req.request_id || req.id;
                  const isExpanded = expandedRequest === id;
                  const isSubmitting = submittingId === id;

                  return (
                    <div
                      key={id}
                      className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden"
                    >
                      {/* Card Header */}
                      <div
                        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-amber-50 transition-colors"
                        onClick={() => setExpandedRequest(isExpanded ? null : id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{req.product_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Escalated by Inventory Manager
                              {req.manager_comment && ` · "${req.manager_comment}"`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <RiskBadge level={req.risk_level || req.priority} />
                          {isExpanded
                            ? <ChevronUp size={16} className="text-gray-400" />
                            : <ChevronDown size={16} className="text-gray-400" />
                          }
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-amber-100 px-5 py-4 space-y-4">
                          {/* Product Info */}
                          <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-4">
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Quantity</p>
                              <p className="font-semibold text-gray-800 text-sm">{req.quantity}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Days Left</p>
                              <p className={`font-semibold text-sm ${req.days_left <= 2 ? 'text-red-600' : 'text-gray-800'}`}>
                                {req.days_left}d
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Location</p>
                              <p className="font-semibold text-gray-800 text-sm truncate">{req.location || '—'}</p>
                            </div>
                          </div>

                          {/* AI Suggestion */}
                          {req.ai_suggestion && (
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Sparkles size={12} className="text-purple-600" />
                                <p className="text-xs font-semibold text-purple-700">AI Suggestion</p>
                              </div>
                              <p className="text-sm text-gray-700 italic">"{req.ai_suggestion}"</p>
                            </div>
                          )}

                          {/* Manager's Comment */}
                          {req.manager_comment && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                              <div className="flex items-center gap-1.5 mb-1">
                                <MessageSquare size={12} className="text-amber-600" />
                                <p className="text-xs font-semibold text-amber-700">Manager's Note</p>
                              </div>
                              <p className="text-sm text-gray-700">"{req.manager_comment}"</p>
                            </div>
                          )}

                          {/* Admin Comment Input */}
                          <div>
                            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">
                              Your Decision Note (optional)
                            </label>
                            <textarea
                              rows={2}
                              value={adminComments[id] || ''}
                              onChange={(e) => setAdminComments(prev => ({ ...prev, [id]: e.target.value }))}
                              placeholder="Add a note to the manager…"
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                            />
                          </div>

                          {/* Admin Action Buttons */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleAdminDecision(id, 'approved')}
                              disabled={isSubmitting}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1a4d2e] hover:bg-green-800 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm"
                            >
                              <CheckCircle2 size={15} />
                              {isSubmitting ? 'Processing…' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleAdminDecision(id, 'declined')}
                              disabled={isSubmitting}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm"
                            >
                              <XCircle size={15} />
                              {isSubmitting ? 'Processing…' : 'Decline'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── AI Suggests Box ──────────────────────────────────── */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">AI Suggests</h3>
          <div className="bg-white rounded-xl p-5 min-h-[90px] flex items-center">
            {stats.high_risk > 0 ? (
              <div className="w-full">
                <p className="text-red-600 font-semibold text-sm mb-1">Urgent Action Required</p>
                <p className="text-gray-600 text-sm">
                  You have <span className="font-bold">{stats.high_risk}</span> high-risk product{stats.high_risk > 1 ? 's' : ''} requiring
                  immediate attention. Click "AI Insights" on a product to view recommendations.
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mx-auto">No urgent recommendations at this time.</p>
            )}
          </div>
        </div>

        {/* ── Search ──────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search product…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
          />
        </div>

        {/* ── Filter Pills ─────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { label: 'All', value: 'All' },
            { label: `High (${stats.high_risk || 0})`, value: 'High' },
            { label: `Medium (${stats.medium_risk || 0})`, value: 'Medium' },
            { label: `Low (${stats.low_risk || 0})`, value: 'Low' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setSelectedFilter(value)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedFilter === value
                  ? 'bg-[#1a4d2e] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Alerts Table ─────────────────────────────────────── */}
        <div>
          <div className="bg-[#1a4d2e] rounded-t-2xl px-5 py-3 grid grid-cols-5 gap-4 text-xs font-semibold text-white uppercase tracking-wide">
            <div>Product</div>
            <div className="text-center">Quantity</div>
            <div className="text-center">Shelf Life</div>
            <div className="text-center">Risk</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl divide-y divide-gray-100">
            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading alerts…</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-gray-500 font-medium text-sm">No alerts found</p>
                <p className="text-xs text-gray-400 mt-1">All products are in good condition</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <ProductRow
                  key={alert.id}
                  alert={alert}
                  onDelete={deleteAlert}
                  onGetInsights={getAIInsights}
                  getProductImage={getProductImage}
                  getRiskBadgeColor={getRiskBadgeColor}
                  getRiskBadgeText={getRiskBadgeText}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Modal */}
      {showAIModal && (
        <AIInsightsModal
          alert={selectedAlert}
          insights={aiInsights}
          loading={loadingInsights}
          onClose={closeAIModal}
          onReview={handleReview}
        />
      )}
    </Layout>
  );
};

/* ─── Helpers ─────────────────────────────────────────────── */

const RiskBadge = ({ level }) => {
  const map = {
    HIGH:   'bg-red-100 text-red-700 border-red-200',
    MEDIUM: 'bg-orange-100 text-orange-700 border-orange-200',
    LOW:    'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[level] || map.LOW}`}>
      {level}
    </span>
  );
};

const ProductRow = ({ alert, onDelete, onGetInsights, getProductImage, getRiskBadgeColor, getRiskBadgeText }) => (
  <div className="px-5 py-4 grid grid-cols-5 gap-4 items-center hover:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
        {getProductImage(alert.product_name)}
      </div>
      <p className="font-semibold text-gray-800 text-sm truncate">{alert.product_name}</p>
    </div>
    <div className="text-center text-sm font-medium text-gray-700">{alert.quantity || '—'}</div>
    <div className="text-center text-sm font-medium text-gray-700">
      {alert.days_left ? `${alert.days_left}d` : '—'}
    </div>
    <div className="flex justify-center">
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskBadgeColor(alert.risk_level)}`}>
        {getRiskBadgeText(alert.risk_level)}
      </span>
    </div>
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => onGetInsights(alert)}
        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-full transition-colors inline-flex items-center gap-1"
      >
        <Sparkles size={11} /> AI Insights
      </button>
      <button
        onClick={() => onDelete(alert.id)}
        className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
      >
        <Trash2 size={15} />
      </button>
    </div>
  </div>
);

/* ─── AI Insights Modal ───────────────────────────────────── */

const AIInsightsModal = ({ alert, insights, loading, onClose, onReview }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-600 text-white p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Insights</h2>
              {insights && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  insights._source === 'groq'
                    ? 'bg-green-400 text-green-900'
                    : 'bg-yellow-400 text-yellow-900'
                }`}>
                  {insights._source === 'groq' ? '✓ Real Groq AI' : '⚠ Fallback Data'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X size={22} />
          </button>
        </div>
        {alert && <p className="text-purple-200 text-sm mt-2">Analysis for: <strong>{alert.product_name}</strong></p>}
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto flex-1">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Analyzing product data…</p>
          </div>
        ) : insights ? (
          <div className="space-y-5">
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={18} className="text-red-600" />
                <h3 className="font-bold text-gray-800 text-sm">Risk Assessment</h3>
              </div>
              <p className="text-sm text-gray-700"><strong>Risk Level:</strong> {alert?.risk_level || 'HIGH'}</p>
              <p className="text-sm text-gray-700 mt-1"><strong>Days Until Expiry:</strong> {alert?.days_left || 4} days</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Package size={18} className="text-blue-600" />
                <h3 className="font-bold text-gray-800 text-sm">Recommendations</h3>
              </div>
              <ul className="space-y-2">
                {(insights.recommendations || [
                  'Move product to faster delivery route',
                  'Consider promotional pricing to accelerate sales',
                  'Monitor temperature closely',
                  'Prioritize for next delivery batch',
                ]).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-500 mt-0.5">•</span> {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-purple-600" />
                <h3 className="font-bold text-gray-800 text-sm">Priority Actions</h3>
              </div>
              <ul className="space-y-2">
                {(insights.priority_actions || [
                  'Immediate: Schedule delivery within 48 hours',
                  'Short-term: Reduce storage temperature by 2°C',
                  'Medium-term: Review supplier delivery schedules',
                ]).map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-purple-600 font-bold">{i + 1}.</span> {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">No insights available</div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3 flex-shrink-0">
        {!loading && insights && (
          <div className="flex gap-3">
            <button
              onClick={() => onReview('accepted')}
              className="flex-1 py-3 bg-[#1a4d2e] hover:bg-green-800 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              ✓ Accept Recommendations
            </button>
            <button
              onClick={() => onReview('rejected')}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              ✗ Reject Recommendations
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export default AlertsPage;