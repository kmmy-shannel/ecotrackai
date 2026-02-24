import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../../services/auth.service';
import approvalService from '../../../services/approval.service';
import aiService from '../../../services/ai.service';
import LogisticsManagerLayout from '../../../components/manager/logistics/LogisticsManagerLayout';
import RouteApprovalCard from '../../../components/manager/logistics/RouteApprovalCard';
import RouteDetailModal from '../../../components/manager/logistics/RouteDetailModal';
import LogisticsHistoryView from '../logistics/LogisticsHistoryView';
import {
  CheckCircle, Sparkles, AlertTriangle, History,
  Loader, Truck, Leaf, Navigation, Map
} from 'lucide-react';

const LogisticsManagerPage = () => {
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
  const [stats, setStats]             = useState({ pending: 0, approved: 0, declined: 0, kmSaved: 0, co2Reduced: 0 });
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  const isReadOnly = user?.role === 'admin';

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    if (currentUser.role !== 'logistics_manager' && currentUser.role !== 'admin') {
      navigate('/dashboard'); return;
    }
    setUser(currentUser);
    fetchApprovals(currentUser.role);
  }, [navigate]);

  const fetchApprovals = async (viewerRole = null) => {
    try {
      setLoading(true);
      const response = await approvalService.getLogisticsApprovals(viewerRole);
      const data = response?.data?.approvals || response?.approvals || [];
      setApprovals(data);

      let kmSaved = 0, co2Reduced = 0;
      data.forEach(a => {
        try {
          const extra = JSON.parse(a.extra_data || '{}');
          kmSaved    += Number(extra.savings?.distance  || 0);
          co2Reduced += Number(extra.savings?.emissions || 0);
        } catch {}
      });

      setStats({
        pending:    data.filter(a => a.status === 'pending').length,
        approved:   data.filter(a => a.status === 'approved').length,
        declined:   data.filter(a => a.status === 'rejected' || a.status === 'declined').length,
        kmSaved:    parseFloat(kmSaved.toFixed(1)),
        co2Reduced: parseFloat(co2Reduced.toFixed(1))
      });
    } catch (err) {
      setError('Failed to load approvals');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const roleOverride = user?.role === 'admin' ? 'logistics_manager' : null;
      const response = await approvalService.getApprovalHistory(50, roleOverride);
      setHistory(response?.data?.history || response?.history || []);
    } catch { setHistory([]); }
  };

  const loadAIInsights = useCallback(async () => {
    try {
      setLoadingAI(true);
      const response = await aiService.getDashboardInsights({
        totalProducts: approvals.length,
        totalAlerts:   stats.pending,
        context:       'logistics_manager'
      });
      if (response.success) setAiInsights(response.data);
    } catch {
      setAiInsights({
        urgentRecommendations: [{
          priority: 'MEDIUM',
          title: 'Route Approvals Pending',
          description: `${stats.pending} route optimizations are awaiting your review.`,
          actionRequired: 'Review and approve pending route changes'
        }]
      });
    } finally { setLoadingAI(false); }
  }, [approvals.length, stats.pending]);

  const handleDecision = async (approvalId, decision, comments = '') => {
    try {
      setSubmitting(true);
      await approvalService.submitDecision(approvalId, decision, comments);
      setSuccess(`Route ${decision === 'approved' ? 'approved' : 'declined'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to submit decision');
      setTimeout(() => setError(''), 3000);
    } finally {
      setApprovals(prev => prev.filter(a => (a.approval_id || a.id) !== approvalId));
      setStats(prev => ({
        ...prev,
        pending:  Math.max(0, prev.pending - 1),
        approved: decision === 'approved' ? prev.approved + 1 : prev.approved,
        declined: decision !== 'approved'  ? prev.declined + 1 : prev.declined,
      }));
      setSelectedApproval(null);
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const displayName = user?.fullName || user?.full_name || 'Manager';
  const sorted = [...approvals].sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
  });

  return (
    <LogisticsManagerLayout
      currentPage="Logistics Manager Dashboard"
      user={user}
      activeView={activeView}
      onViewChange={(view) => {
        if (view === 'history') fetchHistory();
        setActiveView(view);
      }}
    >
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {activeView === 'history' ? (
        <LogisticsHistoryView history={history} onBack={() => setActiveView('dashboard')} />
      ) : (
        <div className="space-y-6">

          {/* Welcome Banner — dark green like admin */}
         
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">DASHBOARD</h1>
          </div>

          {isReadOnly && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Admin oversight mode — approvals are view-only.
            </div>
          )}

          {/* Stat Cards — dark green split design matching admin */}
          <div className="grid grid-cols-4 gap-4">
            {/* Pending */}
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
              <div className="bg-white px-5 pt-5 pb-3">
                <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Pending Approvals</p>
              </div>
              <div className="bg-[#1a4d2e] px-5 py-4 flex-1 flex flex-col justify-between">
                <p className="text-white text-4xl font-bold">{stats.pending}</p>
                <p className="text-green-100 text-xs mt-1">Awaiting review</p>
              </div>
            </div>

            {/* Approved */}
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
              <div className="bg-[#1a4d2e] px-5 pt-4 pb-3 rounded-t-2xl">
                <p className="text-white text-xs font-medium uppercase tracking-wide">Approved Routes</p>
              </div>
              <div className="px-5 py-4 flex-1 flex flex-col justify-between">
                <p className="text-gray-800 text-4xl font-bold">{stats.approved}</p>
                <p className="text-green-600 text-xs mt-1">Routes optimized</p>
              </div>
            </div>

            {/* Km Saved */}
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
              <div className="bg-white px-5 pt-5 pb-3">
                <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Total Km Saved</p>
              </div>
              <div className="bg-[#1a4d2e] px-5 py-4 flex-1 flex flex-col justify-between">
                <p className="text-white text-4xl font-bold">{stats.kmSaved}</p>
                <p className="text-green-100 text-xs mt-1">km this week</p>
              </div>
            </div>

            {/* CO2 */}
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
              <div className="bg-[#1a4d2e] px-5 pt-4 pb-3 rounded-t-2xl">
                <p className="text-white text-xs font-medium uppercase tracking-wide">CO₂ Reduced</p>
              </div>
              <div className="px-5 py-4 flex-1 flex flex-col justify-between">
                <p className="text-gray-800 text-4xl font-bold">{stats.co2Reduced}</p>
                <p className="text-green-600 text-xs mt-1">kg total</p>
              </div>
            </div>
          </div>

          {/* Two-column layout: AI + Pending routes */}
          <div className="grid grid-cols-2 gap-6">

            {/* AI Insights Panel */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-800">URGENT AI RECOMMENDATIONS</h3>
                </div>
                <button
                  onClick={loadAIInsights}
                  disabled={loadingAI}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-sm text-sm font-medium disabled:opacity-50"
                >
                  <Sparkles size={16} className={loadingAI ? 'animate-spin' : ''} />
                  {loadingAI ? 'Analyzing...' : 'Get AI Insights'}
                </button>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 min-h-[220px] flex flex-col justify-center border border-gray-100">
                {loadingAI ? (
                  <div className="text-center text-gray-400">
                    <Sparkles size={32} className="text-purple-600 animate-pulse mx-auto mb-3" />
                    <p className="font-medium">Analyzing route data...</p>
                    <p className="text-sm mt-1">This may take a few moments</p>
                  </div>
                ) : aiInsights?.urgentRecommendations?.length > 0 ? (
                  <div className="space-y-3">
                    {aiInsights.urgentRecommendations.map((rec, i) => (
                      <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-orange-800 text-sm">{rec.title}</p>
                              {rec.priority && (
                                <span className="text-xs px-2 py-0.5 bg-white rounded-full font-semibold text-orange-700">
                                  {rec.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-orange-700">{rec.description}</p>
                            {rec.actionRequired && (
                              <p className="text-xs text-orange-600 mt-2 font-medium">→ {rec.actionRequired}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 mx-auto">
                      <CheckCircle size={32} className="text-green-600" />
                    </div>
                    <p className="font-medium">No urgent recommendations</p>
                    <p className="text-sm mt-1">Click "Get AI Insights" to analyze</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">TODAY'S OVERVIEW</h3>
                <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 min-h-[220px] border border-gray-100 space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#1a4d2e] rounded-lg flex items-center justify-center">
                      <Truck size={16} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Pending Approvals</span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{stats.pending}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Approved Today</span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{stats.approved}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                      <Map size={16} className="text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Km Saved</span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{stats.kmSaved} km</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                      <Leaf size={16} className="text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">CO₂ Reduced</span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{stats.co2Reduced} kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Route Approvals */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              PENDING ROUTE APPROVALS
              {stats.pending > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">({stats.pending} routes)</span>
              )}
            </h2>

            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <Loader size={32} className="mx-auto mb-3 animate-spin text-[#1a4d2e]" />
                <p className="text-sm">Loading route approvals...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <p className="font-semibold text-gray-700">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1">No pending route approvals</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {sorted.map(approval => (
                  <RouteApprovalCard
                    key={approval.approval_id || approval.id}
                    approval={approval}
                    onViewDetails={setSelectedApproval}
                    onApprove={id => handleDecision(id, 'approved')}
                    onDecline={id => handleDecision(id, 'declined')}
                    submitting={submitting}
                    readOnly={isReadOnly}
                  />
                ))}
              </div>
            )}
          </div>

          {/* History Button */}
          <div className="flex justify-center pb-4">
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
        <RouteDetailModal
          approval={selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onDecision={handleDecision}
          submitting={submitting}
          readOnly={isReadOnly}
        />
      )}
    </LogisticsManagerLayout>
  );
};

export default LogisticsManagerPage;