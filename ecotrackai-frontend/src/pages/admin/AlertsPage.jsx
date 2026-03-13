import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import authService from '../../services/auth.service';
import alertService from '../../services/alert.service';
import useAlerts from '../../hooks/useAlerts';
import approvalService from '../../services/approval.service';
import PlanNewDeliveryModal from '../../components/PlanNewDeliveryModal';
import {
  Search, Sparkles, X, TrendingDown, Truck,
  Package, Clock, ShieldCheck, AlertCircle, CheckCircle2,
  XCircle, MessageSquare, ChevronDown, ChevronUp, Zap
} from 'lucide-react';

const AlertsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Approved batches (collapsible)
  const [approvedBatches, setApprovedBatches]       = useState([]);
  const [showDeliveryList, setShowDeliveryList]     = useState(false);
  const [showPlanModal, setShowPlanModal]           = useState(false);
  const [selectedPrefill, setSelectedPrefill]       = useState(null);

  // Pending admin-escalated requests
  const [adminRequests, setAdminRequests]           = useState([]);
  const [loadingRequests, setLoadingRequests]       = useState(false);
  const [expandedRequest, setExpandedRequest]       = useState(null);
  const [adminComments, setAdminComments]           = useState({});
  const [submittingId, setSubmittingId]             = useState(null);
  const [requestSuccess, setRequestSuccess]         = useState('');
  const [requestError, setRequestError]             = useState('');

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
    fetchApprovedBatches();
  }, [navigate]);

  const fetchApprovedBatches = async () => {
    try {
      const res = await alertService.getApprovedBatches();
      const list = res?.data?.approvedBatches || res?.approvedBatches || [];
      setApprovedBatches(Array.isArray(list) ? list : []);
    } catch {
      setApprovedBatches([]);
    }
  };

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

  const handlePlanNow = (batch = null) => {
    if (batch) {
      setSelectedPrefill({
        inventoryId:  batch.inventory_id,
        productName:  batch.product_name,
        batchNumber:  batch.batch_number,
        quantity:     `${batch.available_quantity} ${batch.unit_of_measure || 'kg'}`,
        daysLeft:     batch.days_left,
        riskLevel:    batch.risk_level,
      });
    } else {
      setSelectedPrefill(null);
    }
    setShowPlanModal(true);
  };

  const handlePlanSuccess = () => {
    setShowPlanModal(false);
    setSelectedPrefill(null);
    // Refresh approved batches so banner updates
    fetchApprovedBatches();
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

        {/* Admin Review Panel (escalated requests) */}
        {adminRequests.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-emerald-700" />
              <h2 className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
                Pending Admin Review
              </h2>
              <span className="ml-1 text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full">
                {adminRequests.length} request{adminRequests.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingRequests ? (
              <div className="bg-white rounded-2xl border border-emerald-100 p-8 text-center text-emerald-400 text-sm">
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
                      className="bg-white border border-emerald-200 rounded-2xl shadow-sm overflow-hidden"
                    >
                      {/* Card Header */}
                      <div
                        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-emerald-50 transition-colors"
                        onClick={() => setExpandedRequest(isExpanded ? null : id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <div>
                            <p className="font-bold text-emerald-900 text-sm">{req.product_name}</p>
                            <p className="text-xs text-emerald-600 mt-0.5">
                              Escalated by Inventory Manager
                              {req.manager_comment && ` · "${req.manager_comment}"`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <RiskBadge level={req.risk_level || req.priority} />
                          {isExpanded
                            ? <ChevronUp size={16} className="text-emerald-400" />
                            : <ChevronDown size={16} className="text-emerald-400" />
                          }
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-emerald-100 px-5 py-4 space-y-4">
                          <div className="grid grid-cols-3 gap-3 bg-emerald-50 rounded-xl p-4">
                            <div>
                              <p className="text-xs text-emerald-600 mb-0.5">Quantity</p>
                              <p className="font-semibold text-emerald-900 text-sm">{req.quantity}</p>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600 mb-0.5">Days Left</p>
                              <p className={`font-semibold text-sm ${req.days_left <= 2 ? 'text-red-600' : 'text-emerald-900'}`}>
                                {req.days_left}d
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600 mb-0.5">Location</p>
                              <p className="font-semibold text-emerald-900 text-sm truncate">{req.location || '—'}</p>
                            </div>
                          </div>

                          {req.ai_suggestion && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Sparkles size={12} className="text-emerald-600" />
                                <p className="text-xs font-semibold text-emerald-700">AI Suggestion</p>
                              </div>
                              <p className="text-sm text-emerald-800 italic">"{req.ai_suggestion}"</p>
                            </div>
                          )}

                          {req.manager_comment && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                              <div className="flex items-center gap-1.5 mb-1">
                                <MessageSquare size={12} className="text-emerald-600" />
                                <p className="text-xs font-semibold text-emerald-700">Manager's Note</p>
                              </div>
                              <p className="text-sm text-emerald-800">"{req.manager_comment}"</p>
                            </div>
                          )}

                          <div>
                            <label className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5 block">
                              Your Decision Note (optional)
                            </label>
                            <textarea
                              rows={2}
                              value={adminComments[id] || ''}
                              onChange={(e) => setAdminComments(prev => ({ ...prev, [id]: e.target.value }))}
                              placeholder="Add a note to the manager…"
                              className="w-full px-4 py-3 border border-emerald-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => handleAdminDecision(id, 'approved')}
                              disabled={isSubmitting}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm"
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

        {/* AI Suggests Box */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wide">AI Suggests</h3>
            {stats.high_risk > 0 && (
              <span className="ml-auto text-xs font-bold px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full animate-pulse">
                {stats.high_risk} urgent
              </span>
            )}
          </div>
          <div className="bg-white rounded-xl p-4 min-h-[80px] flex items-center border border-emerald-100">
            {stats.high_risk > 0 ? (
              <div className="w-full">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-600 font-semibold text-sm">Urgent Action Required</p>
                </div>
                <p className="text-emerald-700 text-sm leading-relaxed">
                  <span className="font-bold text-red-600">{stats.high_risk}</span> high-risk product{stats.high_risk > 1 ? 's' : ''} detected.
                  Click <span className="font-semibold text-emerald-600">"AI Insights"</span> on any HIGH risk product below for AI recommendations.
                </p>
              </div>
            ) : stats.medium_risk > 0 ? (
              <div className="w-full">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={15} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-emerald-700 font-semibold text-sm">Monitoring Active</p>
                </div>
                <p className="text-emerald-700 text-sm">
                  <span className="font-bold text-emerald-600">{stats.medium_risk}</span> medium-risk product{stats.medium_risk > 1 ? 's' : ''} to watch. No immediate action needed.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                <p className="text-emerald-600 text-sm">All products are within safe parameters. No urgent recommendations.</p>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
          <input
            type="text"
            placeholder="Search product…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-emerald-200 rounded-full text-sm focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
          />
        </div>

        {/* Filter Pills + Ready for Delivery Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
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
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ready for Delivery toggle button */}
          {approvedBatches.length > 0 && (
            <button
              onClick={() => setShowDeliveryList(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                showDeliveryList
                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                  : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100'
              }`}
            >
              <Truck size={13} />
              Ready for Delivery ({approvedBatches.length})
              {showDeliveryList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        {/* Collapsible approved batches list */}
        {showDeliveryList && approvedBatches.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wide flex items-center gap-1.5">
                <Zap size={12} className="text-orange-600" />
                {approvedBatches.length} batch{approvedBatches.length !== 1 ? 'es' : ''} approved — ready to plan delivery
              </p>
              <button
                onClick={() => handlePlanNow()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <Truck size={12} /> Plan Now
              </button>
            </div>
            {approvedBatches.map((batch) => (
              <div
                key={batch.inventory_id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-orange-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    batch.risk_level === 'HIGH'   ? 'bg-red-500' :
                    batch.risk_level === 'MEDIUM' ? 'bg-orange-400' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{batch.product_name}</p>
                    <p className="text-[10px] text-gray-500">
                      Batch {batch.batch_number || '—'} · {batch.available_quantity} {batch.unit_of_measure || 'kg'} · {batch.days_left}d left
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handlePlanNow(batch)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-800 underline underline-offset-2 transition-colors"
                >
                  Plan this batch
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Alerts Table */}
        <div>
          <div className="bg-emerald-800 rounded-t-2xl px-5 py-3 grid grid-cols-6 gap-4 text-xs font-semibold text-white uppercase tracking-wide">
            <div>Product</div>
            <div className="text-center">Batch #</div>
            <div className="text-center">Quantity</div>
            <div className="text-center">Days Left</div>
            <div className="text-center">Risk</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="bg-white border-x border-b border-emerald-100 rounded-b-2xl divide-y divide-emerald-50">
            {loading ? (
              <div className="text-center py-12 text-emerald-400 text-sm">Loading alerts…</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-2" />
                <p className="text-emerald-600 font-medium text-sm">No alerts found</p>
                <p className="text-xs text-emerald-400 mt-1">All products are in good condition</p>
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

      {/* Plan New Delivery Modal */}
      {showPlanModal && (
        <PlanNewDeliveryModal
          prefill={selectedPrefill}
          onClose={() => { setShowPlanModal(false); setSelectedPrefill(null); }}
          onSuccess={handlePlanSuccess}
        />
      )}
    </Layout>
  );
};

/* ── Helpers ─────────────────────────────────────────────── */

const RiskBadge = ({ level }) => {
  const map = {
    HIGH:   'bg-red-100 text-red-700 border-red-200',
    MEDIUM: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    LOW:    'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[level] || map.LOW}`}>
      {level}
    </span>
  );
};

const statusConfig = {
  pending_review: { label: 'Pending Manager Review', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  approved:       { label: '✓ Approved by Manager',  className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  declined:       { label: '✗ Declined by Manager',  className: 'bg-red-50 text-red-600 border-red-200' },
};

const ProductRow = ({ alert, onDelete, onGetInsights, getProductImage, getRiskBadgeColor, getRiskBadgeText }) => (
  <div className={`px-5 py-4 grid grid-cols-6 gap-4 items-center hover:bg-emerald-50 transition-colors ${
    alert.status === 'pending_review' ? 'bg-emerald-50/30' :
    alert.status === 'approved'       ? 'bg-emerald-50/30' :
    alert.status === 'declined'       ? 'bg-red-50/30'     : ''
  }`}>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
        {getProductImage(alert.product_name)}
      </div>
      <div>
        <p className="font-semibold text-emerald-900 text-sm truncate">{alert.product_name}</p>
        {statusConfig[alert.status] && (
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusConfig[alert.status].className}`}>
            {statusConfig[alert.status].label}
          </span>
        )}
        {alert.status === 'declined' && alert.decline_reason && (
          <p className="text-xs text-red-500 mt-1 italic">
            ✗ "{alert.decline_reason}"
          </p>
        )}
      </div>
    </div>
    <div className="text-center text-sm font-medium text-emerald-700">
      {alert.batch_number || alert.batchNumber || '—'}
    </div>
    <div className="text-center text-sm font-medium text-emerald-700">
      {alert.current_quantity !== undefined && alert.current_quantity !== null
        ? `${alert.current_quantity} ${alert.unit_of_measure || 'kg'}`
        : (alert.quantity || '—')}
    </div>
    <div className="text-center text-sm font-medium text-emerald-700">
      {alert.days_left ? `${alert.days_left}d` : '—'}
    </div>
    <div className="flex justify-center">
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskBadgeColor(alert.risk_level)}`}>
        {getRiskBadgeText(alert.risk_level)}
      </span>
    </div>
    <div className="flex items-center justify-end gap-2">
      {alert.status === 'active' && (
        <button
          onClick={() => onGetInsights(alert)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full transition-colors inline-flex items-center gap-1"
        >
          <Sparkles size={11} /> AI Insights
        </button>
      )}
      {alert.status === 'pending_review' && (
        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full inline-flex items-center gap-1">
          Awaiting Manager
        </span>
      )}
      {alert.status === 'approved' && (
        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full inline-flex items-center gap-1">
          ✓ Action Taken
        </span>
      )}
      {alert.status === 'declined' && (
        <button
          onClick={() => onGetInsights(alert)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full transition-colors inline-flex items-center gap-1"
        >
          <Sparkles size={11} /> Re-analyze & Resubmit
        </button>
      )}
    </div>
  </div>
);

/* ── AI Insights Modal ───────────────────────────────────── */

const AIInsightsModal = ({ alert, insights, loading, onClose, onReview }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Insights</h2>
              {insights && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  insights.recommendations?.length > 0
                    ? 'bg-emerald-400 text-emerald-900'
                    : 'bg-emerald-300 text-emerald-900'
                }`}>
                  {insights.recommendations?.length > 0
                    ? '✓ Groq AI · llama-3.1-8b-instant'
                    : '⚠ Fallback Data'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X size={22} />
          </button>
        </div>
        {alert && <p className="text-emerald-200 text-sm mt-2">Analysis for: <strong>{alert.product_name}</strong></p>}
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto flex-1">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-emerald-600 text-sm">Analyzing product data…</p>
          </div>
        ) : insights ? (
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={18} className="text-emerald-600" />
                <h3 className="font-bold text-emerald-900 text-sm">Risk Assessment</h3>
              </div>
              <p className="text-sm text-emerald-800"><strong>Risk Level:</strong> {alert?.risk_level || 'HIGH'}</p>
              <p className="text-sm text-emerald-800 mt-1"><strong>Days Until Expiry:</strong> {alert?.days_left || 4} days</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Package size={18} className="text-emerald-600" />
                <h3 className="font-bold text-emerald-900 text-sm">Recommendations</h3>
              </div>
              <ul className="space-y-2">
                {(insights.recommendations || [
                  'Move product to faster delivery route',
                  'Consider promotional pricing to accelerate sales',
                  'Monitor temperature closely',
                  'Prioritize for next delivery batch',
                ]).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                    <span className="text-emerald-600 mt-0.5">•</span> {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-emerald-600" />
                <h3 className="font-bold text-emerald-900 text-sm">Priority Actions</h3>
              </div>
              <ul className="space-y-2">
                {(insights.priority_actions || [
                  'Immediate: Schedule delivery within 48 hours',
                  'Short-term: Reduce storage temperature by 2°C',
                  'Medium-term: Review supplier delivery schedules',
                ]).map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                    <span className="text-emerald-700 font-bold">{i + 1}.</span> {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-emerald-400 text-sm">No insights available</div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-emerald-100 p-4 bg-emerald-50 space-y-3 flex-shrink-0">
        {!loading && insights && alert?.risk_level !== 'LOW' && (
          <div className="flex gap-3">
            <button
              onClick={() => { onReview('accepted'); onClose(); }}
              className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              ✓ Accept Recommendations
            </button>
            <button
              onClick={() => { onReview('rejected'); onClose(); }}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              ✗ Reject Recommendations
            </button>
          </div>
        )}
        {!loading && insights && alert?.risk_level === 'LOW' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-100 border border-emerald-200 rounded-xl">
            <span className="text-emerald-600 text-lg">🌱</span>
            <p className="text-xs text-emerald-700 font-medium">
              Low risk — no manager approval needed. This batch can be added to delivery directly.
            </p>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export default AlertsPage;
