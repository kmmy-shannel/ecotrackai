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
  XCircle, MessageSquare, ChevronDown, ChevronUp, Zap,
  CircleAlert, AlertTriangle, CheckCircle, Minus
} from 'lucide-react';

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .al-root,.al-root *{font-family:'Poppins',sans-serif;box-sizing:border-box}

  @keyframes al-in    {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes al-slide {from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  @keyframes al-pop   {from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  @keyframes al-spin  {to{transform:rotate(360deg)}}
  @keyframes al-pulse {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}

  .al-page{animation:al-in .3s ease both}

  /* Stat cards */
  .al-stat{position:relative;overflow:hidden;border-radius:20px;padding:18px 18px 14px;border:2px solid transparent;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s}
  .al-stat:hover{transform:translateY(-4px) scale(1.01);box-shadow:0 16px 40px rgba(0,0,0,.11)}
  .al-stat-dk{background:linear-gradient(135deg,#1a3d2b,#2d6a4f)}
  .al-stat-hi{background:linear-gradient(135deg,#fff0f0,#ffe4e4)}
  .al-stat-md{background:linear-gradient(135deg,#fffdf0,#fef3c7)}
  .al-stat-lo{background:linear-gradient(135deg,#f0fdf4,#dcfce7)}
  .al-stat-orb{position:absolute;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none}
  .al-stat-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
  .al-stat-num{font-size:40px;font-weight:900;line-height:1;margin:0 0 3px;letter-spacing:-1.5px}
  .al-stat-lbl{font-size:11px;font-weight:600;margin:0}

  /* Toolbar */
  .al-bar{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(82,183,136,.16);border-radius:16px;padding:9px 13px;box-shadow:0 2px 8px rgba(26,61,43,.05)}
  .al-srch-wrap{position:relative;flex:1}
  .al-srch{width:100%;padding:8px 32px 8px 34px;background:#f8fdf9;border:1.5px solid rgba(82,183,136,.18);border-radius:10px;font-size:13px;outline:none;color:#1a3d2b;transition:border-color .16s,box-shadow .16s}
  .al-srch::placeholder{color:#adb5bd}
  .al-srch:focus{border-color:#2d6a4f;box-shadow:0 0 0 3px rgba(45,106,79,.09);background:#fff}

  /* Filter chips */
  .al-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:99px;font-size:11px;font-weight:600;border:1.5px solid transparent;cursor:pointer;transition:all .14s;white-space:nowrap}
  .al-chip-all{background:#f3f4f6;color:#6b7280;border-color:#e5e7eb}
  .al-chip-all.on{background:#1a3d2b;color:#fff;border-color:#1a3d2b}
  .al-chip-hi{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
  .al-chip-hi.on{background:#dc2626;color:#fff;border-color:#dc2626}
  .al-chip-md{background:#fffbeb;color:#b45309;border-color:#fde68a}
  .al-chip-md.on{background:#d97706;color:#fff;border-color:#d97706}
  .al-chip-lo{background:#f0fdf4;color:#166534;border-color:#86efac}
  .al-chip-lo.on{background:#16a34a;color:#fff;border-color:#16a34a}

  /* Table */
  .al-table{background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(82,183,136,.14);box-shadow:0 3px 18px rgba(26,61,43,.07)}
  .al-thead{display:grid;grid-template-columns:2.2fr 1.1fr 1fr .9fr 1fr 90px;gap:10px;padding:12px 20px;background:linear-gradient(to right,#f8fdf9,#edfaf2);border-bottom:1px solid rgba(82,183,136,.11);align-items:center}
  .al-th{font-size:10px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em}
  .al-row{display:grid;grid-template-columns:2.2fr 1.1fr 1fr .9fr 1fr 90px;gap:10px;padding:14px 20px;border-bottom:1px solid rgba(82,183,136,.07);align-items:center;transition:background .13s;animation:al-slide .22s ease both}
  .al-row:hover{background:linear-gradient(to right,#f8fdf9,#fafffe)}
  .al-row:last-child{border-bottom:none}
  .al-row.al-hi{border-left:3px solid #dc2626}
  .al-row.al-md{border-left:3px solid #d97706}
  .al-row.al-lo{border-left:3px solid #16a34a}
  .al-row:nth-child(1){animation-delay:.03s}.al-row:nth-child(2){animation-delay:.06s}
  .al-row:nth-child(3){animation-delay:.09s}.al-row:nth-child(4){animation-delay:.12s}
  .al-row:nth-child(5){animation-delay:.15s}.al-row:nth-child(6){animation-delay:.18s}

  /* Avatar */
  .al-av{width:38px;height:38px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px}
  .al-av-hi{background:linear-gradient(135deg,#fee2e2,#fecaca)}
  .al-av-md{background:linear-gradient(135deg,#fef9c3,#fde68a)}
  .al-av-lo{background:linear-gradient(135deg,#d8f3dc,#b7e4c7)}

  /* Days pill */
  .al-days{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}
  .al-days-lo{background:#d8f3dc;color:#166534}
  .al-days-md{background:#fef9c3;color:#92400e}
  .al-days-hi{background:#fee2e2;color:#991b1b}

  /* Risk badge */
  .al-risk{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
  .al-risk-lo{background:#d8f3dc;color:#166534;border:1.5px solid #86efac}
  .al-risk-md{background:#fef9c3;color:#92400e;border:1.5px solid #fde68a}
  .al-risk-hi{background:#fee2e2;color:#991b1b;border:1.5px solid #fecaca}

  /* Dot */
  .al-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block}
  .al-dot-hi{background:#dc2626;animation:al-pulse 1.8s ease infinite}
  .al-dot-md{background:#d97706;animation:al-pulse 2.4s ease infinite}
  .al-dot-lo{background:#16a34a}

  /* Action buttons */
  .al-act{width:30px;height:30px;border-radius:8px;border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s,transform .12s;color:#9ca3af}
  .al-act:hover{transform:scale(1.12)}
  .al-act-ai:hover{background:#d8f3dc;color:#1a3d2b}
  .al-act-del:hover{background:#fee2e2;color:#991b1b}

  /* AI button */
  .al-ai-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;background:#1a3d2b;color:#fff;border-radius:99px;font-size:11px;font-weight:700;border:none;cursor:pointer;transition:background .14s,transform .12s;box-shadow:0 3px 9px rgba(26,61,43,.25)}
  .al-ai-btn:hover{background:#2d6a4f;transform:translateY(-1px)}
  .al-ai-btn-re{background:#7c3aed}
  .al-ai-btn-re:hover{background:#6d28d9}

  /* Status tags */
  .al-status{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:6px;font-size:9.5px;font-weight:700;border:1px solid}
  .al-status-pending{background:#fffbeb;color:#b45309;border-color:#fde68a}
  .al-status-approved{background:#d8f3dc;color:#166534;border-color:#86efac}
  .al-status-declined{background:#fee2e2;color:#991b1b;border-color:#fecaca}

  /* Table footer */
  .al-foot{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:linear-gradient(to right,#f8fdf9,#edfaf2);border-top:1px solid rgba(82,183,136,.09)}

  /* Spin */
  .al-spin{border-radius:50%;border:2.5px solid #b7e4c7;border-top-color:#1a3d2b;animation:al-spin .6s linear infinite}

  /* Empty */
  .al-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 20px;gap:10px;text-align:center}

  /* Toast */
  .al-toast{padding:10px 14px;border-radius:12px;font-size:12.5px;display:flex;align-items:center;gap:8px;animation:al-in .2s ease both;margin-bottom:12px}
  .al-toast-ok{background:#d8f3dc;border:1px solid #86efac;color:#166534}
  .al-toast-err{background:#fee2e2;border:1px solid #fecaca;color:#991b1b}

  /* AI Suggests panel */
  .al-suggest{background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%);border-radius:18px;padding:16px 20px;border:1px solid rgba(82,183,136,.12);box-shadow:0 4px 16px rgba(26,61,43,.2);position:relative;overflow:hidden}
  .al-suggest::after{content:'';position:absolute;right:-40px;top:-40px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.04);pointer-events:none}
  .al-suggest-body{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;margin-top:10px}

  /* Admin review cards */
  .al-req{background:#fff;border:1px solid rgba(82,183,136,.2);border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(26,61,43,.06)}
  .al-req-hd{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;cursor:pointer;transition:background .12s}
  .al-req-hd:hover{background:#f8fdf9}
  .al-req-body{padding:16px 18px;border-top:1px solid rgba(82,183,136,.1);display:flex;flex-direction:column;gap:12px}
  .al-req-cell{background:#f8fdf9;border-radius:10px;padding:9px 12px;border:1px solid rgba(82,183,136,.1)}
  .al-inp{width:100%;padding:9px 12px;border:1.5px solid rgba(82,183,136,.2);border-radius:10px;font-size:12px;font-family:'Poppins',sans-serif;resize:none;outline:none;color:#1a3d2b;background:#fafffe;transition:border-color .15s,box-shadow .15s}
  .al-inp:focus{border-color:#2d6a4f;box-shadow:0 0 0 3px rgba(45,106,79,.08);background:#fff}
  .al-btn-ok{flex:1;padding:10px;background:#1a3d2b;color:#fff;border-radius:11px;font-size:12.5px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 12px rgba(26,61,43,.26);transition:background .14s}
  .al-btn-ok:hover{background:#2d6a4f}
  .al-btn-ok:disabled{opacity:.5;cursor:not-allowed}
  .al-btn-dl{flex:1;padding:10px;background:#dc2626;color:#fff;border-radius:11px;font-size:12.5px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 12px rgba(220,38,38,.24);transition:background .14s}
  .al-btn-dl:hover{background:#b91c1c}
  .al-btn-dl:disabled{opacity:.5;cursor:not-allowed}

  /* Delivery batch drawer */
  .al-batch-drawer{background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1.5px solid #fed7aa;border-radius:14px;overflow:hidden;animation:al-in .18s ease both}
  .al-batch-row{display:flex;align-items:center;justify-content:space-between;padding:9px 16px;border-bottom:1px solid #fed7aa;transition:background .12s}
  .al-batch-row:hover{background:rgba(255,255,255,.5)}
  .al-batch-row:last-child{border-bottom:none}

  /* Modal */
  .al-backdrop{position:fixed;inset:0;background:rgba(8,20,12,.55);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px;animation:al-in .16s ease both}
  .al-modal{background:#fff;border-radius:24px;box-shadow:0 32px 80px rgba(0,0,0,.22);width:100%;max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;animation:al-pop .2s cubic-bezier(.34,1.4,.64,1) both}
  .al-modal-hd{flex-shrink:0;background:linear-gradient(130deg,#0f2419,#1a3d2b,#2d6a4f);color:#fff;padding:20px 22px}
  .al-modal-body{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:14px}
  .al-modal-ft{flex-shrink:0;padding:14px 22px 20px;border-top:1px solid rgba(82,183,136,.1);background:#f8fdf9;display:flex;flex-direction:column;gap:9px}
  .al-info-card{background:#f8fdf9;border:1px solid rgba(82,183,136,.14);border-radius:13px;padding:14px 16px}
  .al-info-title{font-size:10px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;gap:6px;margin-bottom:10px}
`;

if (typeof document !== 'undefined' && !document.getElementById('al-sty')) {
  const el = document.createElement('style'); el.id = 'al-sty'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const riskK = (level) => {
  const r = String(level || '').toUpperCase();
  if (r === 'HIGH')   return 'hi';
  if (r === 'MEDIUM') return 'md';
  return 'lo';
};

/* ─── AlertsPage ────────────────────────────────────────────────────────────── */
const AlertsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [approvedBatches,  setApprovedBatches]  = useState([]);
  const [showDeliveryList, setShowDeliveryList] = useState(false);
  const [showPlanModal,    setShowPlanModal]    = useState(false);
  const [selectedPrefill,  setSelectedPrefill]  = useState(null);
  const [adminRequests,    setAdminRequests]    = useState([]);
  const [loadingRequests,  setLoadingRequests]  = useState(false);
  const [expandedRequest,  setExpandedRequest]  = useState(null);
  const [adminComments,    setAdminComments]    = useState({});
  const [submittingId,     setSubmittingId]     = useState(null);
  const [requestSuccess,   setRequestSuccess]   = useState('');
  const [requestError,     setRequestError]     = useState('');

  const {
    filteredAlerts, loading, stats, error, success,
    searchTerm, selectedFilter, showAIModal, selectedAlert,
    aiInsights, loadingInsights,
    setSearchTerm, setSelectedFilter,
    deleteAlert, getAIInsights, closeAIModal, submitReview,
    getRiskBadgeColor, getRiskBadgeText, getProductImage
  } = useAlerts();

  useEffect(() => {
    const u = authService.getCurrentUser();
    if (!u) { navigate('/'); return; }
    setUser(u);
    fetchAdminRequests();
    fetchApprovedBatches();
  }, [navigate]);

  const fetchApprovedBatches = async () => {
    try {
      const res = await alertService.getApprovedBatches();
      const list = res?.data?.approvedBatches || res?.approvedBatches || [];
      setApprovedBatches(Array.isArray(list) ? list : []);
    } catch { setApprovedBatches([]); }
  };

  const fetchAdminRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await approvalService.getRequestsForAdmin();
      setAdminRequests(res?.data?.requests || res?.requests || []);
    } catch { setAdminRequests([]); }
    finally   { setLoadingRequests(false); }
  };

  const handleAdminDecision = async (requestId, decision) => {
    try {
      setSubmittingId(requestId);
      await approvalService.adminReviewRequest(requestId, decision, adminComments[requestId] || '');
      setRequestSuccess(`Successfully ${decision === 'approved' ? 'approved' : 'declined'} the request.`);
      setAdminRequests(prev => prev.filter(r => (r.request_id || r.id) !== requestId));
      setTimeout(() => setRequestSuccess(''), 4000);
    } catch {
      setRequestError('Failed to submit decision. Please try again.');
      setTimeout(() => setRequestError(''), 4000);
    } finally { setSubmittingId(null); }
  };

  const handlePlanNow = (batch = null) => {
    setSelectedPrefill(batch ? {
      inventoryId: batch.inventory_id, productName: batch.product_name,
      batchNumber: batch.batch_number, quantity: `${batch.available_quantity} ${batch.unit_of_measure || 'kg'}`,
      daysLeft: batch.days_left, riskLevel: batch.risk_level,
    } : null);
    setShowPlanModal(true);
  };

  const handlePlanSuccess = () => {
    setShowPlanModal(false); setSelectedPrefill(null);
    fetchApprovedBatches();
  };

  if (!user) return null;

  const filterChips = [
    { label: 'All', value: 'All', cls: 'al-chip al-chip-all' },
    { label: `High (${stats.high_risk || 0})`,   value: 'High',   cls: 'al-chip al-chip-hi' },
    { label: `Medium (${stats.medium_risk || 0})`,value: 'Medium', cls: 'al-chip al-chip-md' },
    { label: `Low (${stats.low_risk || 0})`,      value: 'Low',    cls: 'al-chip al-chip-lo' },
  ];

  return (
    <Layout currentPage="Spoilage Alerts" user={user}>
      <div className="al-root al-page">

        {/* Toasts */}
        {(success || requestSuccess) && <div className="al-toast al-toast-ok"><CheckCircle2 size={14} />{success || requestSuccess}</div>}
        {(error   || requestError)   && <div className="al-toast al-toast-err"><AlertCircle size={14} />{error   || requestError}</div>}

        {/* ── Admin review section ── */}
        {adminRequests.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ShieldCheck size={14} style={{ color: '#1a3d2b' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#1a3d2b', textTransform: 'uppercase', letterSpacing: '.07em' }}>Pending Admin Review</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#d8f3dc', color: '#1a3d2b', border: '1px solid #86efac', borderRadius: 99 }}>
                {adminRequests.length} request{adminRequests.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {adminRequests.map((req) => {
                const id = req.request_id || req.id;
                const isExpanded  = expandedRequest === id;
                const isSubmitting = submittingId === id;
                const k = riskK(req.risk_level || req.priority);
                return (
                  <div key={id} className="al-req">
                    <div className="al-req-hd" onClick={() => setExpandedRequest(isExpanded ? null : id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="al-dot" style={{ width: 8, height: 8 }} data-k={k}
                          className={`al-dot al-dot-${k}`} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3d2b', marginBottom: 2 }}>{req.product_name}</p>
                          <p style={{ fontSize: 10, color: '#6b7280' }}>
                            Escalated by Inventory Manager{req.manager_comment && ` · "${req.manager_comment}"`}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`al-risk al-risk-${k}`}>{(req.risk_level || req.priority || 'LOW').toUpperCase()}</span>
                        {isExpanded ? <ChevronUp size={15} style={{ color: '#9ca3af' }} /> : <ChevronDown size={15} style={{ color: '#9ca3af' }} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="al-req-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                          {[{ l: 'Quantity', v: req.quantity }, { l: 'Days Left', v: `${req.days_left}d`, danger: req.days_left <= 2 }, { l: 'Location', v: req.location || '—' }].map(m => (
                            <div key={m.l} className="al-req-cell">
                              <p style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>{m.l}</p>
                              <p style={{ fontSize: 13, fontWeight: 700, color: m.danger ? '#dc2626' : '#1a3d2b' }}>{m.v}</p>
                            </div>
                          ))}
                        </div>
                        {req.ai_suggestion && (
                          <div style={{ background: '#f8fdf9', border: '1px solid rgba(82,183,136,.16)', borderRadius: 11, padding: '11px 14px' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                              <Sparkles size={11} style={{ color: '#2d6a4f' }} />AI Suggestion
                            </p>
                            <p style={{ fontSize: 12, color: '#1a3d2b', fontStyle: 'italic' }}>"{req.ai_suggestion}"</p>
                          </div>
                        )}
                        {req.manager_comment && (
                          <div style={{ background: '#f8fdf9', border: '1px solid rgba(82,183,136,.16)', borderRadius: 11, padding: '11px 14px' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                              <MessageSquare size={11} style={{ color: '#6b7280' }} />Manager's Note
                            </p>
                            <p style={{ fontSize: 12, color: '#374151' }}>"{req.manager_comment}"</p>
                          </div>
                        )}
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Your Decision Note (optional)</p>
                          <textarea className="al-inp" rows={2} value={adminComments[id] || ''}
                            onChange={e => setAdminComments(p => ({ ...p, [id]: e.target.value }))}
                            placeholder="Add a note to the manager…" />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="al-btn-ok" onClick={() => handleAdminDecision(id, 'approved')} disabled={isSubmitting}>
                            <CheckCircle2 size={14} />{isSubmitting ? 'Processing…' : 'Approve'}
                          </button>
                          <button className="al-btn-dl" onClick={() => handleAdminDecision(id, 'declined')} disabled={isSubmitting}>
                            <XCircle size={14} />{isSubmitting ? 'Processing…' : 'Decline'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AI Suggests banner ── */}
        <div className="al-suggest" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} style={{ color: '#52b788' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(183,228,199,.8)', textTransform: 'uppercase', letterSpacing: '.08em' }}>AI Suggests</span>
            </div>
            {stats.high_risk > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', background: '#dc2626', color: '#fff', borderRadius: 99, animation: 'al-pulse 1.8s ease infinite' }}>
                {stats.high_risk} urgent
              </span>
            )}
          </div>
          <div className="al-suggest-body" style={{ position: 'relative', zIndex: 1 }}>
            {stats.high_risk > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <AlertCircle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>Urgent Action Required</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(183,228,199,.8)', lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 800, color: '#f87171' }}>{stats.high_risk}</span> high-risk product{stats.high_risk > 1 ? 's' : ''} detected.
                  Click <span style={{ fontWeight: 700, color: '#52b788' }}>"AI Insights"</span> on any HIGH risk product below for recommendations.
                </p>
              </div>
            ) : stats.medium_risk > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <Sparkles size={13} style={{ color: '#52b788', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(183,228,199,.9)' }}>Monitoring Active</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(183,228,199,.7)' }}>
                  <span style={{ fontWeight: 800, color: '#52b788' }}>{stats.medium_risk}</span> medium-risk product{stats.medium_risk > 1 ? 's' : ''} to watch. No immediate action needed.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={15} style={{ color: '#52b788', flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: 'rgba(183,228,199,.8)' }}>All products are within safe parameters. No urgent recommendations.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="al-bar" style={{ marginBottom: 14 }}>
          <div className="al-srch-wrap">
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input className="al-srch" placeholder="Search product…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(82,183,136,.18)', flexShrink: 0 }} />
          {filterChips.map(({ label, value, cls }) => (
            <button key={value} className={`${cls}${selectedFilter === value ? ' on' : ''}`}
              onClick={() => setSelectedFilter(value)}>
              {label}
            </button>
          ))}
          {approvedBatches.length > 0 && (
            <>
              <div style={{ width: 1, height: 24, background: 'rgba(82,183,136,.18)', flexShrink: 0 }} />
              <button
                onClick={() => setShowDeliveryList(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                  borderRadius: 99, fontSize: 11, fontWeight: 700, border: '1.5px solid', cursor: 'pointer', transition: 'all .14s',
                  background: showDeliveryList ? '#c2410c' : '#fff7ed',
                  color: showDeliveryList ? '#fff' : '#c2410c',
                  borderColor: showDeliveryList ? '#c2410c' : '#fed7aa',
                }}>
                <Truck size={12} />Ready for Delivery ({approvedBatches.length})
                {showDeliveryList ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </>
          )}
        </div>

        {/* ── Delivery batch drawer ── */}
        {showDeliveryList && approvedBatches.length > 0 && (
          <div className="al-batch-drawer" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #fed7aa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Zap size={12} style={{ color: '#c2410c' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#7c2d12', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {approvedBatches.length} batch{approvedBatches.length !== 1 ? 'es' : ''} approved — ready to plan
                </span>
              </div>
              <button onClick={() => handlePlanNow()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#c2410c', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                <Truck size={11} />Plan Now
              </button>
            </div>
            {approvedBatches.map(batch => {
              const k = riskK(batch.risk_level);
              return (
                <div key={batch.inventory_id} className="al-batch-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`al-dot al-dot-${k}`} style={{ width: 8, height: 8 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#7c2d12' }}>{batch.product_name}</p>
                      <p style={{ fontSize: 10, color: '#c2410c' }}>Batch {batch.batch_number || '—'} · {batch.available_quantity} {batch.unit_of_measure || 'kg'} · {batch.days_left}d left</p>
                    </div>
                  </div>
                  <button onClick={() => handlePlanNow(batch)} style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Plan this batch
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Table ── */}
        <div className="al-table">
          <div className="al-thead">
            <span className="al-th">Product</span>
            <span className="al-th">Batch #</span>
            <span className="al-th">Quantity</span>
            <span className="al-th">Days Left</span>
            <span className="al-th">Risk</span>
            <span className="al-th" style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {loading ? (
            <div className="al-empty">
              <div className="al-spin" style={{ width: 28, height: 28 }} />
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Loading alerts…</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="al-empty">
              <div style={{ width: 54, height: 54, background: '#f0fdf4', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={26} style={{ color: '#86efac' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>No alerts found</p>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>All products are in good condition</p>
            </div>
          ) : (
            filteredAlerts.map((alert, idx) => {
              const k = riskK(alert.risk_level);
              return (
                <div key={alert.id} className={`al-row al-${k}`} style={{ animationDelay: `${idx * 0.04}s` }}>
                  {/* Product */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    <div className={`al-av al-av-${k}`}>{getProductImage(alert.product_name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3d2b', marginBottom: 2 }}>{alert.product_name}</p>
                      {alert.status === 'pending_review' && <span className="al-status al-status-pending">⏳ Pending Manager</span>}
                      {alert.status === 'approved'       && <span className="al-status al-status-approved">✓ Approved</span>}
                      {alert.status === 'declined'       && (
                        <div>
                          <span className="al-status al-status-declined">✗ Declined</span>
                          {alert.decline_reason && <p style={{ fontSize: 9.5, color: '#ef4444', fontStyle: 'italic', marginTop: 2 }}>"{alert.decline_reason}"</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Batch # */}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{alert.batch_number || alert.batchNumber || '—'}</span>

                  {/* Quantity */}
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {alert.current_quantity !== undefined && alert.current_quantity !== null
                      ? `${alert.current_quantity} ${alert.unit_of_measure || 'kg'}`
                      : (alert.quantity || '—')}
                  </span>

                  {/* Days left */}
                  <span className={`al-days al-days-${k}`}>
                    <span className={`al-dot al-dot-${k}`} />
                    {alert.days_left ? `${alert.days_left}d` : '—'}
                  </span>

                  {/* Risk */}
                  <span className={`al-risk al-risk-${k}`}>
                    {k === 'hi' ? <CircleAlert size={10} /> : k === 'md' ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                    {getRiskBadgeText(alert.risk_level)}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    {alert.status === 'active' && (
                      <button className="al-act al-act-ai" onClick={() => getAIInsights(alert)} title="AI Insights">
                        <Sparkles size={15} />
                      </button>
                    )}
                    {alert.status === 'pending_review' && (
                      <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic', paddingRight: 4 }}>Awaiting…</span>
                    )}
                    {alert.status === 'declined' && (
                      <button className="al-act al-act-ai" onClick={() => getAIInsights(alert)} title="Re-analyze">
                        <Sparkles size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {filteredAlerts.length > 0 && (
            <div className="al-foot">
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* AI Insights Modal */}
        {showAIModal && (
          <AIInsightsModal
            alert={selectedAlert} insights={aiInsights}
            loading={loadingInsights} onClose={closeAIModal}
            onReview={(d) => submitReview(d)}
          />
        )}

        {/* Plan Delivery Modal */}
        {showPlanModal && (
          <PlanNewDeliveryModal
            prefill={selectedPrefill}
            onClose={() => { setShowPlanModal(false); setSelectedPrefill(null); }}
            onSuccess={handlePlanSuccess}
          />
        )}
      </div>
    </Layout>
  );
};

/* ─── AI Insights Modal ─────────────────────────────────────────────────────── */
const AIInsightsModal = ({ alert, insights, loading, onClose, onReview }) => (
  <div className="al-backdrop">
    <div className="al-modal">
      {/* Header */}
      <div className="al-modal-hd" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, background: 'rgba(255,255,255,.15)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 4 }}>AI Insights</p>
              {insights && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: insights.recommendations?.length > 0 ? 'rgba(82,183,136,.3)' : 'rgba(255,255,255,.15)', color: '#b7e4c7', borderRadius: 99 }}>
                  {insights.recommendations?.length > 0 ? '✓ Groq AI · llama-3.1-8b-instant' : '⚠ Fallback Data'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.12)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={17} />
          </button>
        </div>
        {alert && <p style={{ fontSize: 11, color: 'rgba(183,228,199,.7)', marginTop: 8, position: 'relative', zIndex: 1 }}>Analysis for: <strong style={{ color: 'rgba(183,228,199,.9)' }}>{alert.product_name}</strong></p>}
      </div>

      {/* Body */}
      <div className="al-modal-body">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 12 }}>
            <div className="al-spin" style={{ width: 36, height: 36 }} />
            <p style={{ fontSize: 13, color: '#6b7280' }}>Analyzing product data…</p>
          </div>
        ) : insights ? (
          <>
            {/* Risk Assessment — colored by risk level */}
            {(() => {
              const rl = alert?.risk_level || 'HIGH';
              const riskStyle = rl === 'HIGH'
                ? { bg: '#fef2f2', border: '#fecaca', titleColor: '#991b1b', icon: '#dc2626', dotBg: '#fee2e2', dotColor: '#991b1b' }
                : rl === 'MEDIUM'
                ? { bg: '#fffbeb', border: '#fde68a', titleColor: '#92400e', icon: '#d97706', dotBg: '#fef9c3', dotColor: '#92400e' }
                : { bg: '#f0fdf4', border: '#86efac', titleColor: '#166534', icon: '#16a34a', dotBg: '#d8f3dc', dotColor: '#166534' };
              return (
                <div style={{ background: riskStyle.bg, border: `1px solid ${riskStyle.border}`, borderRadius: 13, padding: '14px 16px' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: riskStyle.titleColor, textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <TrendingDown size={11} style={{ color: riskStyle.icon }} />Risk Assessment
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'rgba(255,255,255,.6)', borderRadius: 9, padding: '8px 11px' }}>
                      <p style={{ fontSize: 10, color: riskStyle.titleColor, opacity: .7, marginBottom: 3 }}>Risk Level</p>
                      <p style={{ fontSize: 15, fontWeight: 900, color: riskStyle.icon }}>{rl}</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,.6)', borderRadius: 9, padding: '8px 11px' }}>
                      <p style={{ fontSize: 10, color: riskStyle.titleColor, opacity: .7, marginBottom: 3 }}>Days Until Expiry</p>
                      <p style={{ fontSize: 15, fontWeight: 900, color: riskStyle.titleColor }}>{alert?.days_left || 4} days</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Recommendations — green */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 13, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Package size={11} style={{ color: '#16a34a' }} />Recommendations
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(insights.recommendations || ['Move product to faster delivery route', 'Consider promotional pricing to accelerate sales', 'Monitor temperature closely', 'Prioritize for next delivery batch']).map((rec, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <span style={{ width: 19, height: 19, background: '#d8f3dc', color: '#1a3d2b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.6 }}>{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Actions — amber */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 13, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Clock size={11} style={{ color: '#d97706' }} />Priority Actions
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(insights.priority_actions || ['Immediate: Schedule delivery within 48 hours', 'Short-term: Reduce storage temperature by 2°C', 'Medium-term: Review supplier delivery schedules']).map((action, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <span style={{ width: 19, height: 19, background: '#fef9c3', color: '#92400e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>No insights available</div>
        )}
      </div>

      {/* Footer */}
      <div className="al-modal-ft">
        {!loading && insights && alert?.risk_level !== 'LOW' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="al-btn-ok" onClick={() => { onReview('accepted'); onClose(); }}>
              <CheckCircle2 size={14} />✓ Accept Recommendations
            </button>
            <button className="al-btn-dl" onClick={() => { onReview('rejected'); onClose(); }}>
              <XCircle size={14} />✗ Reject
            </button>
          </div>
        )}
        {!loading && insights && alert?.risk_level === 'LOW' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 11 }}>
            <span style={{ fontSize: 16 }}>🌱</span>
            <p style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Low risk — no manager approval needed. This batch can be added to delivery directly.</p>
          </div>
        )}
        <button onClick={onClose} style={{ width: '100%', padding: '11px', background: '#1a3d2b', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background .13s' }}>
          Close
        </button>
      </div>
    </div>
  </div>
);

export default AlertsPage;
