import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/auth.service';
import approvalService from '../../services/approval.service';
import aiService from '../../services/ai.service';
import ManagerLayout from '../../components/manager/InventoryManagerLayout';
import {
  Package, Clock, CheckCircle, XCircle, AlertTriangle,
  Sparkles, ThumbsUp, ThumbsDown, Eye,
  Thermometer, Droplets, MapPin, Calendar, History,
  TrendingUp, Download, ArrowLeft, X, Loader
} from 'lucide-react';

// ─── Priority Badge ───────────────────────────────────────────────────────────
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

// ─── Approval Detail Modal ────────────────────────────────────────────────────
const ApprovalDetailModal = ({ approval, onClose, onDecision, submitting }) => {
  const [comments, setComments] = useState('');
  if (!approval) return null;

  const priorityBg = {
    HIGH:   'from-red-50 to-orange-50 border-red-200',
    MEDIUM: 'from-orange-50 to-yellow-50 border-orange-200',
    LOW:    'from-blue-50 to-indigo-50 border-blue-200',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className={`bg-gradient-to-r ${priorityBg[approval.priority] || priorityBg.LOW} border-b p-6 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Request #{approval.request_id || approval.id}
              </p>
              <h2 className="text-xl font-bold text-gray-800">Approval Details</h2>
            </div>
            <div className="flex items-center gap-3">
              <PriorityBadge priority={approval.priority} />
              <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Product Info */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Package size={16} className="text-green-600" /> Product Information
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Product</p>
                <p className="font-bold text-gray-800 text-lg">{approval.product_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Quantity</p>
                <p className="font-bold text-gray-800 text-lg">{approval.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Storage Type</p>
                <p className="font-semibold text-gray-700">{approval.storage_type || 'Dry Storage'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Location</p>
                <p className="font-semibold text-gray-700">{approval.location}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Date Received</p>
                <p className="font-semibold text-gray-700">
                  {approval.date_received ? new Date(approval.date_received).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Expiration</p>
                <p className="font-semibold text-gray-700">
                  {approval.expiration_date ? new Date(approval.expiration_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Days Remaining</p>
                <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${
                  approval.days_left <= 2 ? 'bg-red-100 text-red-700' :
                  approval.days_left <= 4 ? 'bg-orange-100 text-orange-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {approval.days_left} days left
                </span>
              </div>
            </div>
          </div>

          {/* Storage Conditions */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Thermometer size={16} className="text-blue-600" /> Storage Conditions
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Thermometer size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Temperature</p>
                  <p className="font-bold text-gray-800">{approval.temperature ?? '—'}°C</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Droplets size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Humidity</p>
                  <p className="font-bold text-gray-800">{approval.humidity ?? '—'}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Issue</p>
                  <p className="font-bold text-gray-800 text-xs">{approval.condition_issue || 'None detected'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Suggestion */}
          {approval.ai_suggestion && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-600" /> AI Suggestion
              </h3>
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
                <p className="text-gray-700 text-sm leading-relaxed italic">"{approval.ai_suggestion}"</p>
              </div>
            </div>
          )}

          {/* Decision */}
          {approval.status === 'pending' ? (
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Your Decision</h3>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder="Add a note about your decision (optional)..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => onDecision(approval.id, 'approved', comments)}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#1a4d2e] hover:bg-green-800 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? <Loader size={18} className="animate-spin" /> : <ThumbsUp size={18} />}
                  Approve — Implement Suggestion
                </button>
                <button
                  onClick={() => onDecision(approval.id, 'declined', comments)}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? <Loader size={18} className="animate-spin" /> : <ThumbsUp size={18} />}
                  Decline — Reject Suggestion
                </button>
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-xl border-2 ${approval.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`font-bold ${approval.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                {approval.status === 'approved' ? '✓ Approved' : '✗ Declined'}
              </p>
              {approval.comments && <p className="text-sm text-gray-600 mt-1">{approval.comments}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Approval Card ────────────────────────────────────────────────────────────
const ApprovalCard = ({ approval, onApprove, onDecline, onViewDetails, submitting }) => {
  const priorityStyles = {
    HIGH:   { border: 'border-l-red-500',    dot: 'bg-red-500' },
    MEDIUM: { border: 'border-l-orange-400', dot: 'bg-orange-400' },
    LOW:    { border: 'border-l-blue-400',   dot: 'bg-blue-400' },
  };
  const style = priorityStyles[approval.priority] || priorityStyles.LOW;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-l-4 ${style.border} p-5 hover:shadow-md transition-all`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
          <PriorityBadge priority={approval.priority} />
          {approval.priority === 'HIGH' && (
            <span className="text-xs font-semibold text-red-600 animate-pulse">Act Now</span>
          )}
        </div>
        <span className="text-xs text-gray-400">#{approval.request_id || approval.id}</span>
      </div>

      {/* Product Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Product</p>
          <p className="font-bold text-gray-800 text-lg">{approval.product_name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Quantity</p>
          <p className="font-bold text-gray-800 text-lg">{approval.quantity}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="text-gray-400" />
          <p className="text-sm text-gray-600">{approval.location}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className={approval.days_left <= 2 ? 'text-red-400' : 'text-gray-400'} />
          <p className={`text-sm font-semibold ${approval.days_left <= 2 ? 'text-red-600' : 'text-gray-600'}`}>
            {approval.days_left} days remaining
          </p>
        </div>
      </div>

      {/* AI Suggestion */}
      {approval.ai_suggestion && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={13} className="text-purple-600" />
            <p className="text-xs font-semibold text-purple-700">AI Suggestion</p>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed italic">"{approval.ai_suggestion}"</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(approval.id)}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1a4d2e] hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          <ThumbsUp size={15} /> Approve
        </button>
        <button
          onClick={() => onDecline(approval.id)}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          <ThumbsDown size={15} /> Decline
        </button>
        <button
          onClick={() => onViewDetails(approval)}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all"
        >
          <Eye size={15} /> Details
        </button>
      </div>
    </div>
  );
};

// ─── Approval History View ────────────────────────────────────────────────────
const ApprovalHistoryView = ({ history, onBack, onExport }) => {
  const grouped = history.reduce((acc, item) => {
    const key = new Date(item.decided_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const totalApproved = history.filter(h => h.status === 'approved').length;
  const totalDeclined = history.filter(h => h.status === 'declined').length;
  const approvalRate  = history.length > 0 ? Math.round((totalApproved / history.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back + Export */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors">
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 bg-[#1a4d2e] hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-all shadow-md">
          <Download size={16} /> Export Logs
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-gray-800">{history.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Decisions</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-bold text-green-700">{totalApproved}</p>
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
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-green-600" />
            <p className="text-sm font-semibold text-gray-700">Approval Rate</p>
          </div>
          <p className="text-lg font-bold text-gray-800">{approvalRate}%</p>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all" style={{ width: `${approvalRate}%` }} />
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
                <div key={i} className={`bg-white rounded-xl p-4 border-l-4 shadow-sm ${item.status === 'approved' ? 'border-l-green-500' : 'border-l-red-500'}`}>
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
                        {item.comments && <p className="text-xs text-gray-500 mt-0.5">Note: "{item.comments}"</p>}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0 ml-3">
                      {new Date(item.decided_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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

  const sampleApprovals = [
    {
      id: 1, request_id: 'INV-001', priority: 'HIGH', status: 'pending',
      product_name: 'Tomatoes', quantity: '50kg', location: 'Warehouse B, Shelf 4',
      days_left: 2, storage_type: 'Dry Storage', temperature: 28, humidity: 65,
      condition_issue: 'Too warm for tomatoes',
      date_received: new Date(Date.now() - 5 * 86400000).toISOString(),
      expiration_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      ai_suggestion: "Move 30kg to freezer storage immediately. Remaining 20kg should be sold today at a discount. Include in today's delivery to Market A."
    },
    {
      id: 2, request_id: 'INV-002', priority: 'MEDIUM', status: 'pending',
      product_name: 'Lettuce', quantity: '35kg', location: 'Warehouse A, Rack 2',
      days_left: 3, storage_type: 'Cold Storage', temperature: 22, humidity: 60,
      condition_issue: 'Slightly above optimal humidity',
      date_received: new Date(Date.now() - 4 * 86400000).toISOString(),
      expiration_date: new Date(Date.now() + 3 * 86400000).toISOString(),
      ai_suggestion: "Prioritize in next delivery to Restaurant B. Maintain temperature below 10°C to extend shelf life."
    },
    {
      id: 3, request_id: 'INV-003', priority: 'LOW', status: 'pending',
      product_name: 'Milk', quantity: '20L', location: 'Refrigerator Unit 1',
      days_left: 4, storage_type: 'Cold Storage', temperature: 4.5, humidity: 70,
      condition_issue: 'None detected',
      date_received: new Date(Date.now() - 2 * 86400000).toISOString(),
      expiration_date: new Date(Date.now() + 4 * 86400000).toISOString(),
      ai_suggestion: "Check temperature settings daily. Current conditions are acceptable but monitor closely."
    }
  ];

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    if (currentUser.role !== 'inventory_manager' && currentUser.role !== 'admin') {
      navigate('/dashboard'); return;
    }
    setUser(currentUser);
    fetchApprovals();
  }, [navigate]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await approvalService.getInventoryApprovals();
      const data = response?.data?.approvals || response?.data || [];
      if (data.length > 0) {
        setApprovals(data);
        setStats({
          pending:       data.filter(a => a.status === 'pending').length,
          approvedToday: data.filter(a => a.status === 'approved').length,
          declined:      data.filter(a => a.status === 'declined').length,
        });
      } else {
        setApprovals(sampleApprovals);
        setStats({ pending: 3, approvedToday: 2, declined: 1 });
      }
    } catch {
      setApprovals(sampleApprovals);
      setStats({ pending: 3, approvedToday: 2, declined: 1 });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await approvalService.getApprovalHistory();
      setHistory(response?.data?.history || response?.data || []);
    } catch { setHistory([]); }
  };

  const loadAIInsights = useCallback(async () => {
    try {
      setLoadingAI(true);
      const response = await aiService.getDashboardInsights({
        totalProducts: approvals.length,
        totalAlerts: stats.pending,
        context: 'inventory_manager'
      });
      if (response.success) setAiInsights(response.data);
    } catch {
      setAiInsights({
        urgentRecommendations: [{
          priority: 'HIGH', type: 'SPOILAGE',
          title: 'Immediate Action Required',
          description: 'Multiple products approaching critical shelf life. Prioritize tomatoes and lettuce.',
          estimatedImpact: { financial: '₱15,000 potential loss', timeframe: 'Within 24 hours' },
          actionRequired: 'Review and approve pending spoilage prevention actions'
        }]
      });
    } finally { setLoadingAI(false); }
  }, [approvals.length, stats.pending]);

  const handleDecision = async (approvalId, decision, comments = '') => {
    try {
      setSubmitting(true);
      await approvalService.submitDecision(approvalId, decision, comments);
    } catch {}
    finally {
      setApprovals(prev => prev.filter(a => a.id !== approvalId));
      setStats(prev => ({
        ...prev,
        pending:       Math.max(0, prev.pending - 1),
        approvedToday: decision === 'approved' ? prev.approvedToday + 1 : prev.approvedToday,
        declined:      decision === 'declined' ? prev.declined + 1      : prev.declined,
      }));
      setSelectedApproval(null);
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Product', 'Quantity', 'Decision', 'Comments'],
      ...history.map(h => [new Date(h.decided_at).toLocaleDateString(), h.product_name, h.quantity, h.status, h.comments || ''])
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'approval_history.csv';
    a.click();
  };

  if (!user) return null;

  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sorted = [...approvals].sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
  const displayName = user?.fullName || user?.full_name || 'Manager';

  return (
  <ManagerLayout currentPage="Inventory Manager Dashboard" user={user}>
      {activeView === 'history' ? (
        <ApprovalHistoryView
          history={history}
          onBack={() => setActiveView('dashboard')}
          onExport={handleExport}
        />
      ) : (
        <div className="space-y-6">

          {/* Welcome Header — dark green like admin */}
          <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-6 flex items-center justify-between shadow-sm border border-gray-100">
           
            <div className="flex items-center gap-3">
              
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-lg">{displayName.charAt(0)}</span>
              </div>
            </div>
          </div>

          {/* YOUR SUMMARY label */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">YOUR SUMMARY</h1>
          </div>

          {/* Stat Cards — same split-design style as admin dashboard */}
          <div className="grid grid-cols-3 gap-4">

            {/* Pending */}
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
              <div className="bg-white px-5 pt-5 pb-3">
                <h4 className="text-gray-700 text-xs font-medium uppercase tracking-wide">Pending Approvals</h4>
              </div>
              <div className="bg-[#1a4d2e] px-5 py-4 flex-1 flex flex-col justify-between">
                <p className="text-white text-4xl font-bold">{stats.pending}</p>
                <p className="text-green-100 text-xs flex items-center gap-1">Awaiting review</p>
              </div>
            </div>

            {/* Approved Today */}
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
              <div className="bg-[#1a4d2e] px-5 pt-4 pb-3 rounded-t-2xl">
                <h4 className="text-white text-xs font-medium uppercase tracking-wide">Approved Today</h4>
              </div>
              <div className="bg-white px-5 py-4 flex-1 flex flex-col justify-between rounded-b-2xl">
                <p className="text-gray-800 text-4xl font-bold">{stats.approvedToday}</p>
                <p className="text-green-600 text-xs flex items-center gap-1">Actions taken</p>
              </div>
            </div>

            {/* Declined */}
            <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
              <div className="bg-white px-5 pt-5 pb-3">
                <h4 className="text-gray-700 text-xs font-medium uppercase tracking-wide">Declined</h4>
              </div>
              <div className="bg-[#1a4d2e] px-5 py-4 flex-1 flex flex-col justify-between">
                <p className="text-white text-4xl font-bold">{stats.declined}</p>
                <p className="text-green-100 text-xs flex items-center gap-1">Rejected today</p>
              </div>
            </div>
          </div>

          {/* AI Insights — same style as admin dashboard AI panel */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-600" />
                <h3 className="text-lg font-bold text-gray-800">URGENT AI RECOMMENDATIONS</h3>
              </div>
              <button
                onClick={loadAIInsights}
                disabled={loadingAI}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} className={loadingAI ? 'animate-spin' : ''} />
                <span className="text-sm font-medium">{loadingAI ? 'Analyzing...' : 'Get AI Insights'}</span>
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 min-h-[200px] flex flex-col justify-between border border-gray-100">
              {loadingAI ? (
                <div className="text-center text-gray-400 flex-1 flex flex-col items-center justify-center">
                  <Sparkles size={32} className="text-purple-600 animate-pulse mb-3" />
                  <p className="font-medium">AI is analyzing your inventory data...</p>
                  <p className="text-sm mt-1">This may take a few moments</p>
                </div>
              ) : aiInsights?.urgentRecommendations?.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {aiInsights.urgentRecommendations.map((rec, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <span className="text-xs font-semibold px-2 py-1 bg-white rounded">{rec.priority}</span>
                          </div>
                          <p className="text-sm mb-2">{rec.description}</p>
                          {rec.estimatedImpact && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="font-medium">Financial:</span> {rec.estimatedImpact.financial}</div>
                              <div><span className="font-medium">Timeline:</span> {rec.estimatedImpact.timeframe}</div>
                            </div>
                          )}
                          {rec.actionRequired && (
                            <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                              <p className="text-xs font-medium">Action: {rec.actionRequired}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 flex-1 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                  <p className="font-medium">No urgent recommendations</p>
                  <p className="text-sm mt-1">Click "Get AI Insights" to analyze your inventory</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Approvals */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                PENDING APPROVALS
                {stats.pending > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">({stats.pending} items)</span>
                )}
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <Loader size={32} className="mx-auto mb-3 animate-spin text-green-600" />
                <p className="text-sm">Loading approvals...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
                <p className="font-semibold text-gray-700">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1">No pending approvals at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {sorted.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onApprove={(id) => handleDecision(id, 'approved')}
                    onDecline={(id) => handleDecision(id, 'declined')}
                    onViewDetails={setSelectedApproval}
                    submitting={submitting}
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
        />
      )}
    </ManagerLayout>
  );
};

export default InventoryManagerPage;