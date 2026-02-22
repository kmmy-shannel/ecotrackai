// ============================================================
// FILE LOCATION: src/pages/manager/inventory/InventoryManagerPage.jsx
// REDESIGN: Clean dark green theme, tab-based views,
//           no "Back to Dashboard" button anywhere
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../../services/auth.service';
import approvalService from '../../../services/approval.service';
import aiService from '../../../services/ai.service';
import InventoryManagerLayout from '../../../components/manager/inventory/InventoryManagerLayout';
import ApprovalCard from '../../../components/manager/inventory/ApprovalCard';
import ApprovalDetailModal from '../../../components/manager/inventory/ApprovalDetailModal';
import InventoryHistoryView from './InventoryHistoryView';
import {
  CheckCircle, Sparkles, AlertTriangle,
  Loader, RefreshCw, InboxIcon
} from 'lucide-react';

const InventoryManagerPage = () => {
  const navigate = useNavigate();
  const [user, setUser]               = useState(null);
  const [approvals, setApprovals]     = useState([]);
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [activeView, setActiveView]   = useState('dashboard');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [aiInsights, setAiInsights]   = useState(null);
  const [loadingAI, setLoadingAI]     = useState(false);
  const [stats, setStats]             = useState({ pending: 0, approvedToday: 0, declined: 0 });
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  const isReadOnlyView = user?.role === 'admin';

  // ── Auth on mount ───────────────────────────────────────────
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    if (currentUser.role !== 'inventory_manager' && currentUser.role !== 'admin') {
      navigate('/dashboard'); return;
    }
    setUser(currentUser);
    fetchApprovals(currentUser.role);
  }, [navigate]);

  // ── Load pending approvals ──────────────────────────────────
  const fetchApprovals = async (viewerRole = null) => {
    try {
      setLoading(true);
      const response = await approvalService.getInventoryApprovals(viewerRole);
      const data = response?.data?.approvals || response?.approvals || [];
      setApprovals(data);
      setStats({
        pending:       data.filter(a => a.status === 'pending').length,
        approvedToday: data.filter(a => a.status === 'approved').length,
        declined:      data.filter(a => a.status === 'rejected' || a.status === 'declined').length,
      });
    } catch (err) {
      console.error('Fetch approvals error:', err);
      showError('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  // ── Load history ────────────────────────────────────────────
  const fetchHistory = async () => {
    try {
      const roleOverride = user?.role === 'admin' ? 'inventory_manager' : null;
      const response = await approvalService.getApprovalHistory(50, roleOverride);
      setHistory(response?.data?.history || response?.history || []);
    } catch {
      setHistory([]);
    }
  };

  // ── Handle tab switch (also fetch history when switching) ───
  const handleViewChange = (view) => {
    setActiveView(view);
    if (view === 'history') fetchHistory();
  };

  // ── Load AI insights ────────────────────────────────────────
  const loadAIInsights = useCallback(async () => {
    try {
      setLoadingAI(true);
      const response = await aiService.getDashboardInsights({
        totalProducts: approvals.length,
        totalAlerts:   stats.pending,
        context:       'inventory_manager',
      });
      if (response.success) setAiInsights(response.data);
    } catch {
      setAiInsights({
        urgentRecommendations: [{
          priority: 'HIGH',
          title:    'Immediate Action Required',
          description: `${stats.pending} pending spoilage approval${stats.pending !== 1 ? 's' : ''} need your review.`,
          actionRequired: 'Review and approve pending spoilage prevention actions',
        }],
      });
    } finally {
      setLoadingAI(false);
    }
  }, [approvals.length, stats.pending]);

  // ── Approve / Decline ───────────────────────────────────────
  const handleDecision = async (approvalId, decision, comments = '') => {
    try {
      setSubmitting(true);
      await approvalService.submitDecision(approvalId, decision, comments);
      showSuccess(`Successfully ${decision === 'approved' ? 'approved' : 'declined'}`);
    } catch {
      showError('Failed to submit decision');
    } finally {
      setApprovals(prev => prev.filter(a => (a.approval_id || a.id) !== approvalId));
      setStats(prev => ({
        ...prev,
        pending:       Math.max(0, prev.pending - 1),
        approvedToday: decision === 'approved' ? prev.approvedToday + 1 : prev.approvedToday,
        declined:      decision !== 'approved'  ? prev.declined + 1     : prev.declined,
      }));
      setSelectedApproval(null);
      setSubmitting(false);
    }
  };

  const showError   = (msg) => { setError(msg);   setTimeout(() => setError(''),   4000); };
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); };

  if (!user) return null;

  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sorted = [...approvals].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
  );
  const displayName = user?.fullName || user?.full_name || 'Manager';

  return (
    <InventoryManagerLayout
      currentPage="Inventory Manager"
      user={user}
      activeView={activeView}
      onViewChange={handleViewChange}
    >
      {/* Toast messages */}
      {success && (
        <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── HISTORY VIEW ───────────────────────────────────────── */}
      {activeView === 'history' ? (
        <InventoryHistoryView history={history} />
      ) : (

      /* ── DASHBOARD VIEW ────────────────────────────────────── */
      <div className="space-y-6">

        {/* Welcome + Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {isReadOnlyView ? 'Inventory Overview' : `Welcome back, ${displayName.split(' ')[0]}`}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isReadOnlyView
                ? 'Admin oversight — view only mode'
                : 'Review and action pending spoilage approvals from admin'}
            </p>
          </div>
          <button
            onClick={() => fetchApprovals(user?.role)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Read-only notice */}
        {isReadOnlyView && (
          <div className="px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm">
            Admin oversight mode — approvals are view-only. Inventory managers perform final approve/decline actions.
          </div>
        )}

        {/* ── Stat Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending',  value: stats.pending,       sub: 'Awaiting review',  accent: true  },
            { label: 'Approved', value: stats.approvedToday, sub: 'Actions taken',    accent: false },
            { label: 'Declined', value: stats.declined,      sub: 'Rejected items',   accent: true  },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden shadow-sm border border-gray-100"
              style={{ background: '#fff' }}
            >
              {s.accent ? (
                <>
                  <div className="px-5 pt-5 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{s.label}</p>
                  </div>
                  <div className="px-5 pb-5" style={{ background: '#1a4d2e' }} >
                    <p className="text-4xl font-bold text-white pt-3">{s.value}</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{s.sub}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-5 pt-4 pb-2 rounded-t-2xl" style={{ background: '#1a4d2e' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white">{s.label}</p>
                  </div>
                  <div className="px-5 pb-5 pt-3">
                    <p className="text-4xl font-bold text-gray-800">{s.value}</p>
                    <p className="text-xs text-green-600 mt-1">{s.sub}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* ── AI Insights Panel ──────────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                Urgent AI Recommendations
              </h3>
            </div>
            <button
              onClick={loadAIInsights}
              disabled={loadingAI}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              <Sparkles size={14} className={loadingAI ? 'animate-spin' : ''} />
              {loadingAI ? 'Analyzing…' : 'Get AI Insights'}
            </button>
          </div>

          <div className="rounded-xl p-5 min-h-36 flex flex-col justify-center" style={{ background: '#f8faf8', border: '1px solid #e4ede6' }}>
            {loadingAI ? (
              <div className="text-center">
                <Sparkles size={28} className="text-purple-500 animate-pulse mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">Analyzing your inventory data…</p>
              </div>
            ) : aiInsights?.urgentRecommendations?.length > 0 ? (
              <div className="space-y-3">
                {aiInsights.urgentRecommendations.map((rec, i) => (
                  <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-red-800 text-sm">{rec.title}</p>
                          <span className="text-xs font-bold px-2 py-0.5 bg-white border border-red-200 text-red-700 rounded-full flex-shrink-0">
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-xs text-red-700">{rec.description}</p>
                        {rec.actionRequired && (
                          <p className="text-xs text-red-600 mt-1.5 font-medium">→ {rec.actionRequired}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: '#dcfce7' }}>
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-600">No urgent recommendations</p>
                <p className="text-xs text-gray-400 mt-1">Click "Get AI Insights" to analyze your inventory</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Pending Approvals List ──────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 uppercase tracking-wide text-sm">
              Pending Approvals
              {stats.pending > 0 && (
                <span className="ml-2 font-normal text-gray-400 normal-case text-xs">
                  ({stats.pending} item{stats.pending !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <Loader size={28} className="mx-auto mb-3 animate-spin" style={{ color: '#1a4d2e' }} />
              <p className="text-sm">Loading approvals…</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#dcfce7' }}>
                <InboxIcon size={28} className="text-green-600" />
              </div>
              <p className="font-semibold text-gray-700">All caught up!</p>
              <p className="text-xs text-gray-400 mt-1">No pending approvals at the moment</p>
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
      </div>
      )}

      {/* Detail Modal */}
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