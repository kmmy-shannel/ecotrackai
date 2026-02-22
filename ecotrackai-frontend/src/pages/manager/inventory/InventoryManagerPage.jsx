import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../../services/auth.service';
import approvalService from '../../../services/approval.service';
import aiService from '../../../services/ai.service';
import InventoryManagerLayout from '../../../components/manager/inventory/InventoryManagerLayout';
import ApprovalCard from '../../../components/manager/inventory/ApprovalCard';
import ApprovalDetailModal from '../../../components/manager/inventory/ApprovalDetailModal';
import {
  CheckCircle, XCircle, Sparkles, AlertTriangle,
  History, ArrowLeft, Loader, Clock
} from 'lucide-react';

// ─── History View ─────────────────────────────────────────────────────────────
const ApprovalHistoryView = ({ history, onBack }) => {
  const grouped = history.reduce((acc, item) => {
    const key = new Date(item.reviewed_at || item.updated_at).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const totalApproved = history.filter(h => h.status === 'approved').length;
  const totalDeclined = history.filter(h => h.status === 'rejected' || h.status === 'declined').length;
  const approvalRate  = history.length > 0 ? Math.round((totalApproved / history.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-[#1a4d2e] font-medium transition-colors">
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-gray-800">{history.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Decisions</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-[#1a4d2e]">{totalApproved}</p>
          <p className="text-sm text-green-600 mt-1">Approved</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-red-600">{totalDeclined}</p>
          <p className="text-sm text-red-500 mt-1">Declined</p>
        </div>
      </div>

      {/* Approval Rate */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Approval Rate</p>
          <p className="text-lg font-bold text-gray-800">{approvalRate}%</p>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#1a4d2e] rounded-full transition-all" style={{ width: `${approvalRate}%` }} />
        </div>
      </div>

      {/* History List */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <History size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No approval history yet</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{dateLabel}</p>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className={`bg-white rounded-xl p-4 border-l-4 shadow-sm ${item.status === 'approved' ? 'border-l-green-600' : 'border-l-red-500'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.status === 'approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {item.status === 'approved'
                          ? <CheckCircle size={16} className="text-green-600" />
                          : <XCircle size={16} className="text-red-500" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {item.status === 'approved' ? 'APPROVED' : 'DECLINED'} — {item.product_name} ({item.quantity})
                        </p>
                        {item.review_notes && <p className="text-xs text-gray-500 mt-0.5">Note: "{item.review_notes}"</p>}
                        <p className="text-xs text-gray-400 mt-0.5">By: Inventory Manager</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0 ml-3">
                      {new Date(item.reviewed_at || item.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const InventoryManagerPage = () => {
  const navigate = useNavigate();
  const [user, setUser]             = useState(null);
  const [approvals, setApprovals]   = useState([]);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAI, setLoadingAI]   = useState(false);
  const [stats, setStats]           = useState({ pending: 0, approvedToday: 0, declined: 0 });
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const isReadOnlyView = user?.role === 'admin';

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    if (currentUser.role !== 'inventory_manager' && currentUser.role !== 'admin') {
      navigate('/dashboard'); return;
    }
    setUser(currentUser);
    fetchApprovals(currentUser.role);
  }, [navigate]);

  const fetchApprovals = async (viewerRole = null) => {
    try {
      setLoading(true);
      const response = await approvalService.getInventoryApprovals(viewerRole || user?.role);
      const data = response?.data?.approvals || response?.approvals || [];
      setApprovals(data);
      setStats({
        pending:       data.filter(a => a.status === 'pending').length,
        approvedToday: data.filter(a => a.status === 'approved').length,
        declined:      data.filter(a => a.status === 'rejected' || a.status === 'declined').length,
      });
    } catch (err) {
      console.error('Fetch approvals error:', err);
      setError('Failed to load approvals');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await approvalService.getApprovalHistory(
        50,
        isReadOnlyView ? 'inventory_manager' : null
      );
      setHistory(response?.data?.history || response?.history || []);
    } catch { setHistory([]); }
  };

  const loadAIInsights = useCallback(async () => {
    try {
      setLoadingAI(true);
      const response = await aiService.getDashboardInsights({
        totalProducts: approvals.length,
        totalAlerts:   stats.pending,
        context:       'inventory_manager'
      });
      if (response.success) setAiInsights(response.data);
    } catch {
      setAiInsights({
        urgentRecommendations: [{
          priority: 'HIGH',
          title: 'Immediate Action Required',
          description: `${stats.pending} pending spoilage approvals need your review.`,
          estimatedImpact: { timeframe: 'Within 24 hours' },
          actionRequired: 'Review and approve pending spoilage prevention actions'
        }]
      });
    } finally { setLoadingAI(false); }
  }, [approvals.length, stats.pending]);

  const handleDecision = async (approvalId, decision, comments = '') => {
    try {
      setSubmitting(true);
      await approvalService.submitDecision(approvalId, decision, comments);
      setSuccess(`Successfully ${decision === 'approved' ? 'approved' : 'declined'}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to submit decision');
      setTimeout(() => setError(''), 3000);
    } finally {
      setApprovals(prev => prev.filter(a => (a.approval_id || a.id) !== approvalId));
      setStats(prev => ({
        ...prev,
        pending:       Math.max(0, prev.pending - 1),
        approvedToday: decision === 'approved' ? prev.approvedToday + 1 : prev.approvedToday,
        declined:      decision !== 'approved'  ? prev.declined + 1      : prev.declined,
      }));
      setSelectedApproval(null);
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sorted = [...approvals].sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
  const displayName = user?.fullName || user?.full_name || 'Manager';

  return (
    <InventoryManagerLayout currentPage="Inventory Manager Dashboard" user={user}>

      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
      {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}

      {activeView === 'history' ? (
        <ApprovalHistoryView
          history={history}
          onBack={() => setActiveView('dashboard')}
        />
      ) : (
        <div className="space-y-6">

       

          {/* Summary Label */}
          <h1 className="text-2xl font-bold text-gray-800">
            {isReadOnlyView ? 'INVENTORY MANAGER SUMMARY' : 'YOUR SUMMARY'}
          </h1>

          {isReadOnlyView && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
              Admin oversight mode: approvals are view-only. Inventory managers perform final approve/decline actions.
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-sm border border-gray-100">
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Approvals</p>
              </div>
              <div className="bg-[#1a4d2e] px-5 py-4 flex-1">
                <p className="text-white text-4xl font-bold">{stats.pending}</p>
                <p className="text-green-200 text-xs mt-1">Awaiting your review</p>
              </div>
            </div>
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-[#1a4d2e] px-5 pt-4 pb-2 rounded-t-2xl">
                <p className="text-xs font-medium text-green-200 uppercase tracking-wide">Approved</p>
              </div>
              <div className="px-5 py-4 flex-1">
                <p className="text-gray-800 text-4xl font-bold">{stats.approvedToday}</p>
                <p className="text-green-600 text-xs mt-1">Actions taken</p>
              </div>
            </div>
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-sm border border-gray-100">
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Declined</p>
              </div>
              <div className="bg-[#1a4d2e] px-5 py-4 flex-1">
                <p className="text-white text-4xl font-bold">{stats.declined}</p>
                <p className="text-green-200 text-xs mt-1">Rejected</p>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-purple-600" />
                <h3 className="font-bold text-gray-800">URGENT AI RECOMMENDATIONS</h3>
              </div>
              <button
                onClick={loadAIInsights}
                disabled={loadingAI}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                <Sparkles size={14} className={loadingAI ? 'animate-spin' : ''} />
                {loadingAI ? 'Analyzing...' : 'Get AI Insights'}
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 min-h-[140px] flex flex-col justify-center border border-gray-100">
              {loadingAI ? (
                <div className="text-center text-gray-400">
                  <Sparkles size={28} className="text-purple-500 animate-pulse mx-auto mb-2" />
                  <p className="text-sm font-medium">Analyzing inventory data...</p>
                </div>
              ) : aiInsights?.urgentRecommendations?.length > 0 ? (
                <div className="space-y-3">
                  {aiInsights.urgentRecommendations.map((rec, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-800 text-sm">{rec.title}</p>
                          <p className="text-sm text-red-700 mt-1">{rec.description}</p>
                          {rec.actionRequired && (
                            <p className="text-xs text-red-600 mt-2 font-medium">→ {rec.actionRequired}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">No urgent recommendations</p>
                  <p className="text-xs mt-1">Click "Get AI Insights" to analyze</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Approvals */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-lg">
                PENDING APPROVALS
                {stats.pending > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({stats.pending} items)</span>}
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <Loader size={28} className="mx-auto mb-3 animate-spin text-[#1a4d2e]" />
                <p className="text-sm">Loading approvals...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <CheckCircle size={36} className="mx-auto mb-3 text-green-400" />
                <p className="font-semibold text-gray-700">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1">No pending approvals at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {sorted.map((approval) => (
                  <ApprovalCard
                    key={approval.approval_id || approval.id}
                    approval={approval}
                    onApprove={(id) => handleDecision(id, 'approved')}
                    onDecline={(id) => handleDecision(id, 'declined')}
                    onViewDetails={setSelectedApproval}
                    submitting={submitting}
                    readOnly={isReadOnlyView}
                  />
                ))}
              </div>
            )}
          </div>

          {/* History Button */}
          <div className="flex justify-center">
            <button
              onClick={() => { fetchHistory(); setActiveView('history'); }}
              className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-[#1a4d2e] text-[#1a4d2e] hover:bg-green-50 font-semibold rounded-xl transition-all shadow-sm"
            >
              <History size={18} /> View Approval History
            </button>
          </div>
        </div>
      )}

      {selectedApproval && (
        <ApprovalDetailModal
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onDecision={handleDecision}
          submitting={submitting}
          readOnly={isReadOnlyView}
        />
      )}
    </InventoryManagerLayout>
  );
};

export default InventoryManagerPage;
