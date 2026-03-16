import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import productService from '../../services/product.service';
import alertService from '../../services/alert.service';
import deliveryService from '../../services/delivery.service';
import Layout from '../../components/Layout';
import AddProductModal from '../../components/AddProductModal';
import PlanNewDeliveryModal from '../../components/PlanNewDeliveryModal';
import ManageAccountsModal from '../../components/admin/ManageAccountsModal';

import {
  ChevronRight, Users, Sparkles, Truck,
  Map, Zap, Leaf, Package, ShieldAlert,
  RefreshCw, Plus, Clock, CircleAlert,
  CheckCircle2, Activity, Bell
} from 'lucide-react';

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  .db-root, .db-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes db-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes db-slide { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes db-spin  { to{transform:rotate(360deg)} }
  @keyframes db-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

  .db-page { animation:db-in .3s ease both; }

  /* Banner */
  .db-banner {
    background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%);
    border-radius:20px; padding:20px 24px;
    display:flex; align-items:center; justify-content:space-between;
    box-shadow:0 6px 24px rgba(26,61,43,0.22);
    border:1px solid rgba(82,183,136,0.12);
    position:relative; overflow:hidden;
  }
  .db-banner::after {
    content:''; position:absolute; right:-50px; top:-50px;
    width:180px; height:180px; border-radius:50%;
    background:rgba(255,255,255,0.03); pointer-events:none;
  }
  .db-pulse-dot { width:7px; height:7px; border-radius:50%; background:#4ade80; flex-shrink:0; animation:db-pulse 2.5s ease infinite; box-shadow:0 0 0 3px rgba(74,222,128,0.18); }

  /* Buttons */
  .db-btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:8px 15px; background:rgba(255,255,255,0.08); color:#fff; border-radius:11px; font-size:12.5px; font-weight:600; border:1px solid rgba(255,255,255,0.14); cursor:pointer; transition:background .15s,transform .13s; white-space:nowrap; }
  .db-btn-ghost:hover { background:rgba(255,255,255,0.15); transform:translateY(-1px); }
  .db-btn-solid { display:inline-flex; align-items:center; gap:6px; padding:8px 17px; background:#fff; color:#1a3d2b; border-radius:11px; font-size:12.5px; font-weight:800; border:none; cursor:pointer; transition:transform .13s,box-shadow .15s; box-shadow:0 2px 8px rgba(0,0,0,0.1); white-space:nowrap; }
  .db-btn-solid:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(0,0,0,0.14); }

  /* Stat cards */
  .db-stat { border-radius:18px; border:1px solid rgba(82,183,136,0.18); box-shadow:0 2px 10px rgba(26,61,43,0.07); transition:transform .2s,box-shadow .2s; animation:db-in .3s ease both; overflow:hidden; }
  .db-stat:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(26,61,43,0.13); }
  .db-stat-dk { background:linear-gradient(145deg,#1a3d2b,#2d6a4f); position:relative; overflow:hidden; }
  .db-stat-dk::after { content:''; position:absolute; right:-20px; top:-20px; width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,0.05); pointer-events:none; }
  .db-stat-lt { background:#fff; }
  .db-stat-cell { padding:16px 18px; position:relative; z-index:1; }

  /* Risk bar */
  .db-risk-bar { background:#fff; border:1px solid rgba(82,183,136,0.16); border-radius:14px; padding:10px 16px; display:flex; align-items:center; gap:9px; flex-wrap:wrap; box-shadow:0 1px 6px rgba(26,61,43,0.04); }

  /* Badges */
  .db-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:600; }
  .db-badge-hi  { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
  .db-badge-md  { background:#fffbeb; color:#b45309; border:1px solid #fde68a; }
  .db-badge-lo  { background:#d8f3dc; color:#2d6a4f; border:1px solid #86efac; }
  .db-badge-ora { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }

  /* Dots */
  .db-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; display:inline-block; }
  .db-dot-hi { background:#dc2626; animation:db-pulse 1.8s ease infinite; }
  .db-dot-md { background:#d97706; animation:db-pulse 2.4s ease infinite; }
  .db-dot-lo { background:#40916c; }

  /* Panels */
  .db-panel { background:#fff; border-radius:18px; padding:18px 20px; box-shadow:0 2px 12px rgba(26,61,43,0.07); border:1px solid rgba(82,183,136,0.14); animation:db-in .32s ease both; }

  /* Batch rows */
  .db-row { display:flex; align-items:center; gap:10px; padding:11px 12px; border-radius:13px; border:1px solid rgba(82,183,136,0.13); background:rgba(216,243,220,0.16); margin-bottom:7px; transition:border-color .15s,background .15s; animation:db-slide .22s ease both; }
  .db-row:hover { border-color:#52b788; background:rgba(216,243,220,0.42); }
  .db-row-hi { border-color:rgba(239,68,68,0.18)!important; background:rgba(254,242,242,0.45)!important; }
  .db-row-hi:hover { border-color:#fca5a5!important; background:rgba(254,226,226,0.55)!important; }
  .db-row:nth-child(1){animation-delay:.03s} .db-row:nth-child(2){animation-delay:.06s} .db-row:nth-child(3){animation-delay:.09s} .db-row:nth-child(4){animation-delay:.12s}

  /* Avatar */
  .db-av { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; flex-shrink:0; }
  .db-av-hi { background:linear-gradient(135deg,#fee2e2,#fecaca); color:#991b1b; }
  .db-av-md { background:linear-gradient(135deg,#fef9c3,#fde68a); color:#92400e; }
  .db-av-lo { background:linear-gradient(135deg,#d8f3dc,#b7e4c7); color:#1a3d2b; }

  /* AI Insights */
  .db-insight { border-top:1px solid rgba(82,183,136,0.13); background:linear-gradient(to bottom,#f0fdf4,#fafffe); padding:12px 14px; animation:db-in .18s ease both; }
  .db-btn-ai { display:inline-flex; align-items:center; gap:4px; padding:5px 11px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f); color:#fff; border-radius:99px; font-size:10.5px; font-weight:700; border:none; cursor:pointer; transition:opacity .15s,transform .15s; }
  .db-btn-ai:hover { opacity:.85; transform:scale(1.04); }

  /* Spinner */
  .db-spin { border-radius:50%; border:2.5px solid #95d5b2; border-top-color:#2d6a4f; animation:db-spin .65s linear infinite; }

  /* Empty */
  .db-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; height:160px; gap:9px; color:#9ca3af; text-align:center; }

  /* Nav btn */
  .db-nav-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:5px; font-size:12px; font-weight:600; color:#2d6a4f; background:none; border:none; border-radius:10px; cursor:pointer; padding:7px; margin-top:4px; transition:background .13s; }
  .db-nav-btn:hover { background:rgba(216,243,220,0.65); }

  .db-rule { height:1px; background:rgba(82,183,136,0.1); margin:13px 0; }
  .db-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:13px; }
  .db-sh-left { display:flex; align-items:center; gap:9px; }
  .db-sh-ico { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
`;

if (typeof document !== 'undefined' && !document.getElementById('db-styles')) {
  const el = document.createElement('style');
  el.id = 'db-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const toCount = (v) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };

const getMonthlyCount = (deliveries = []) => {
  const now = new Date();
  const m = deliveries.filter(d => {
    const raw = d.created_at || d.delivery_date || d.scheduled_date;
    if (!raw) return false;
    const dt = new Date(raw);
    return !isNaN(dt) && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });
  return m.length > 0 ? m.length : deliveries.length;
};

/* ─── StatCard ───────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, dark, delay = 0 }) => (
  <div className={`db-stat ${dark ? 'db-stat-dk' : 'db-stat-lt'}`} style={{ animationDelay:`${delay}s` }}>
    <div className="db-stat-cell">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', margin:0, color: dark ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>{label}</p>
        <div style={{ width:30, height:30, borderRadius:9, background: dark ? 'rgba(255,255,255,0.1)' : '#f0faf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={15} style={{ color: dark ? 'rgba(255,255,255,0.85)' : '#2d6a4f' }} />
        </div>
      </div>
      <p style={{ fontSize:38, fontWeight:900, lineHeight:1, margin:'0 0 6px', letterSpacing:'-1.5px', color: dark ? '#fff' : '#111827' }}>{value}</p>
      <p style={{ fontSize:11, margin:0, color: dark ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>{sub}</p>
    </div>
  </div>
);

/* ─── DashboardPage ──────────────────────────────────────────────────────────── */
const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats]                 = useState({ totalProducts:0, totalDeliveries:0, totalAlerts:0, ecoScore:0 });
  const [spoilage, setSpoilage]           = useState({ high:0, medium:0, low:0 });
  const [highRisk, setHighRisk]           = useState([]);
  const [approved, setApproved]           = useState([]);
  const [loading, setLoading]             = useState(true);   // single loading flag
  const [batchInsights, setInsights]      = useState({});
  const [loadingInsId, setLoadingInsId]   = useState(null);
  const [expandedId, setExpandedId]       = useState(null);
  const [showAddProduct, setShowAdd]      = useState(false);
  const [showPlanRoute, setShowPlan]      = useState(false);
  const [showManageAccts, setShowMgmt]    = useState(false);
  const [prefill, setPrefill]             = useState(null);
  const [lastSync, setLastSync]           = useState(null);

  /* ── Single parallel load — no await syncAlerts on critical path ── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    // fire syncAlerts in background, don't await
    alertService.syncAlerts().catch(() => null);

    try {
      const [productsRes, deliveriesRes, alertStatsRes, highRiskRes, approvedRes] =
        await Promise.allSettled([
          productService.getAllProducts(),
          deliveryService.getAllDeliveries(),
          alertService.getAlertStats(),
          alertService.getAllAlerts(),
          alertService.getApprovedBatches(),
        ]);

      // Stats
      const products   = productsRes.value?.data?.products   || productsRes.value?.products   || [];
      const deliveries = deliveriesRes.value?.data?.deliveries || deliveriesRes.value?.deliveries || [];
      const alertStats = alertStatsRes.value?.data || {};
      const high   = toCount(alertStats.high_risk);
      const medium = toCount(alertStats.medium_risk);
      const low    = toCount(alertStats.low_risk);
      setStats({ totalProducts: products.length, totalDeliveries: getMonthlyCount(deliveries), totalAlerts: high + medium + low, ecoScore: 0 });
      setSpoilage({ high, medium, low });

      // High risk batches — filter from existing alerts response
      const allAlerts = highRiskRes.value?.data?.alerts || highRiskRes.value?.alerts || highRiskRes.value?.data || [];
      setHighRisk((Array.isArray(allAlerts) ? allAlerts : []).filter(a => (a.risk_level || a.riskLevel) === 'HIGH' && a.status === 'active'));

      // Approved
      const approvedList = approvedRes.value?.data?.approvedBatches || approvedRes.value?.approvedBatches || [];
      setApproved(Array.isArray(approvedList) ? approvedList : []);

      setLastSync(new Date());
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  const handleInsights = async (batch) => {
    const id = batch.inventory_id || batch.id;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (batchInsights[id]) return;
    setLoadingInsId(id);
    try {
      const res = await alertService.getAIInsights(id);
      setInsights(p => ({ ...p, [id]: res?.data || res }));
    } catch {
      setInsights(p => ({ ...p, [id]: { error: true } }));
    } finally { setLoadingInsId(null); }
  };

  const handlePlanBatch = (batch = null) => {
    setPrefill(batch ? {
      inventoryId: batch.inventory_id, productName: batch.product_name,
      batchNumber: batch.batch_number, quantity: `${batch.available_quantity} ${batch.unit_of_measure || 'kg'}`,
      daysLeft: batch.days_left, riskLevel: batch.risk_level,
    } : null);
    setShowPlan(true);
  };

  const handlePlanSuccess = () => { setShowPlan(false); setPrefill(null); loadAll(); };

  if (!user) return null;

  const today = new Date().toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' });

  return (
    <Layout currentPage="DASHBOARD" user={user}>
      <div className="db-root db-page" style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── Banner ── */}
        <div className="db-banner">
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Leaf size={13} style={{ color:'#86efac' }} />
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.1em' }}>
                EcoTrackAI — Distribution Intelligence
              </span>
            </div>
            <h1 style={{ color:'#fff', fontSize:20, fontWeight:900, margin:'0 0 7px', letterSpacing:'-.4px' }}>Operations Overview</h1>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className="db-pulse-dot" />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>System Operational</span>
              </div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Clock size={10} style={{ color:'rgba(255,255,255,0.35)' }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{today}</span>
              </div>
              {spoilage.high > 0 && (
                <>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <CircleAlert size={11} style={{ color:'#fca5a5' }} />
                    <span style={{ fontSize:11, color:'#fca5a5', fontWeight:600 }}>{spoilage.high} high-risk batches need attention</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display:'flex', gap:8, zIndex:1, flexWrap:'wrap', alignItems:'center' }}>
            <button className="db-btn-ghost" onClick={loadAll} disabled={loading}>
              <RefreshCw size={12} style={loading ? { animation:'db-spin .7s linear infinite' } : {}} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {user?.role === 'admin' && (
              <button className="db-btn-ghost" onClick={() => setShowMgmt(true)}>
                <Users size={12} /> Accounts
              </button>
            )}
            <button className="db-btn-ghost" onClick={() => handlePlanBatch()}>
              <Map size={12} /> Plan Route
            </button>
            <button className="db-btn-solid" onClick={() => setShowAdd(true)}>
              <Plus size={13} /> Add Product
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <StatCard dark label="Total Products"   value={loading ? '—' : stats.totalProducts}   sub="Active inventory"         icon={Package} delay={0.04} />
          <StatCard      label="Deliveries"        value={loading ? '—' : stats.totalDeliveries} sub="Completed this month"      icon={Truck}   delay={0.08} />
          <StatCard dark label="Active Alerts"    value={loading ? '—' : stats.totalAlerts}     sub={`${spoilage.high} high · ${spoilage.medium} medium`} icon={Bell} delay={0.12} />
          <StatCard      label="Eco Score"         value={loading ? '—' : stats.ecoScore}        sub="EcoTrust points"           icon={Leaf}    delay={0.16} />
        </div>

        {/* ── Risk Summary Bar ── */}
        <div className="db-risk-bar">
          <span style={{ fontSize:10.5, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.07em' }}>Risk Overview</span>
          <span className="db-badge db-badge-hi"><div className="db-dot db-dot-hi" />High: {spoilage.high}</span>
          <span className="db-badge db-badge-md"><div className="db-dot db-dot-md" />Medium: {spoilage.medium}</span>
          <span className="db-badge db-badge-lo"><div className="db-dot db-dot-lo" />Low: {spoilage.low}</span>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
            {lastSync && <span style={{ fontSize:10.5, color:'#9ca3af' }}>Synced {lastSync.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' })}</span>}
            <button onClick={() => navigate('/alerts')} style={{ display:'flex', alignItems:'center', gap:3, fontSize:12, fontWeight:700, color:'#2d6a4f', background:'none', border:'none', cursor:'pointer' }}>
              View all <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* ── Two-Column Panels ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* LEFT — Urgent Batches */}
          <div className="db-panel">
            <div className="db-sh">
              <div className="db-sh-left">
                <div className="db-sh-ico" style={{ background:'#fef2f2' }}>
                  <ShieldAlert size={15} style={{ color:'#dc2626' }} />
                </div>
                <div>
                  <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Urgent Batches</h3>
                  <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>HIGH risk · awaiting action</p>
                </div>
              </div>
              <span className="db-badge db-badge-hi">
                <CircleAlert size={10} /> {highRisk.length} unactioned
              </span>
            </div>

            <div className="db-rule" />

            <div style={{ minHeight:220 }}>
              {loading ? (
                <div className="db-empty">
                  <div className="db-spin" style={{ width:24, height:24 }} />
                  <p style={{ fontSize:13, margin:0 }}>Loading…</p>
                </div>
              ) : highRisk.length === 0 ? (
                <div className="db-empty">
                  <div style={{ width:50, height:50, borderRadius:15, background:'#d8f3dc', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <CheckCircle2 size={24} style={{ color:'#2d6a4f' }} />
                  </div>
                  <p style={{ fontWeight:700, color:'#4b5563', margin:0, fontSize:14 }}>No urgent batches</p>
                  <p style={{ fontSize:12, margin:0 }}>All HIGH risk batches actioned.</p>
                </div>
              ) : (
                highRisk.map((batch) => {
                  const id       = batch.inventory_id || batch.id;
                  const expanded = expandedId === id;
                  const ins      = batchInsights[id];
                  const insLoading = loadingInsId === id;
                  return (
                    <div key={id} style={{ border:'1px solid rgba(239,68,68,0.18)', borderRadius:13, overflow:'hidden', marginBottom:8 }}>
                      <div className="db-row db-row-hi" style={{ margin:0, borderRadius:0, border:'none' }}>
                        <div className="db-av db-av-hi">
                          {(batch.product_name || batch.productName || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {batch.product_name || batch.productName}
                          </p>
                          <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>
                            {batch.batch_number || batch.batchNumber || '—'} · {batch.current_quantity ?? batch.quantity ?? '—'} {batch.unit_of_measure || 'kg'} · {batch.days_left ?? batch.daysLeft ?? '?'}d left
                          </p>
                        </div>
                        <button className="db-btn-ai" onClick={() => handleInsights(batch)}>
                          <Sparkles size={10} style={insLoading ? { animation:'db-spin .7s linear infinite' } : {}} />
                          {expanded ? 'Hide' : 'AI'}
                        </button>
                      </div>

                      {expanded && (
                        <div className="db-insight">
                          {insLoading ? (
                            <div style={{ display:'flex', alignItems:'center', gap:7, color:'#6b7280', fontSize:12 }}>
                              <Sparkles size={11} style={{ color:'#2d6a4f' }} /> Analyzing…
                            </div>
                          ) : ins?.error ? (
                            <p style={{ fontSize:12, color:'#dc2626', margin:0 }}>Could not load insights.</p>
                          ) : ins ? (
                            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                              {(ins.recommendations || []).length > 0 && (
                                <div>
                                  <p style={{ fontSize:9.5, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.07em', margin:'0 0 5px', display:'flex', alignItems:'center', gap:4 }}>
                                    <CheckCircle2 size={10} style={{ color:'#40916c' }} /> Recommendations
                                  </p>
                                  {ins.recommendations.map((r, i) => (
                                    <p key={i} style={{ fontSize:12, color:'#374151', margin:'0 0 3px', display:'flex', gap:5 }}>
                                      <ChevronRight size={11} style={{ color:'#40916c', marginTop:2, flexShrink:0 }} /> {r}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {(ins.priority_actions || []).length > 0 && (
                                <div>
                                  <p style={{ fontSize:9.5, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.07em', margin:'0 0 5px', display:'flex', alignItems:'center', gap:4 }}>
                                    <Activity size={10} style={{ color:'#d97706' }} /> Priority Actions
                                  </p>
                                  {ins.priority_actions.map((a, i) => (
                                    <p key={i} style={{ fontSize:12, color:'#374151', margin:'0 0 3px', display:'flex', gap:5 }}>
                                      <span style={{ color:'#d97706', fontWeight:800, fontSize:10, flexShrink:0 }}>{i + 1}.</span> {a}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>No insights available.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {!loading && highRisk.length > 0 && (
              <button className="db-nav-btn" onClick={() => navigate('/alerts')}>
                View all alerts <ChevronRight size={12} />
              </button>
            )}
          </div>

          {/* RIGHT — Ready for Delivery */}
          <div className="db-panel">
            <div className="db-sh">
              <div className="db-sh-left">
                <div className="db-sh-ico" style={{ background:'#fff7ed' }}>
                  <Truck size={15} style={{ color:'#c2410c' }} />
                </div>
                <div>
                  <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Ready for Delivery</h3>
                  <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Approved · pending dispatch</p>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span className="db-badge db-badge-ora">
                  <Package size={10} /> {approved.length} approved
                </span>
                {approved.length > 0 && (
                  <button className="db-btn-ai" style={{ borderRadius:9, padding:'5px 12px', fontSize:11 }} onClick={() => handlePlanBatch()}>
                    <Zap size={10} /> Plan
                  </button>
                )}
              </div>
            </div>

            <div className="db-rule" />

            <div style={{ minHeight:220 }}>
              {loading ? (
                <div className="db-empty">
                  <div className="db-spin" style={{ width:24, height:24 }} />
                  <p style={{ fontSize:13, margin:0 }}>Loading…</p>
                </div>
              ) : approved.length === 0 ? (
                <div className="db-empty">
                  <div style={{ width:50, height:50, borderRadius:15, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Truck size={24} style={{ color:'#d1d5db' }} />
                  </div>
                  <p style={{ fontWeight:700, color:'#4b5563', margin:0, fontSize:14 }}>No batches ready yet</p>
                  <p style={{ fontSize:12, margin:0, maxWidth:190 }}>Approved batches from Inventory Manager appear here.</p>
                </div>
              ) : (
                <>
                  {approved.map((batch) => {
                    const rk = batch.risk_level;
                    const avCls = rk === 'HIGH' ? 'db-av-hi' : rk === 'MEDIUM' ? 'db-av-md' : 'db-av-lo';
                    const dotCls = rk === 'HIGH' ? 'db-dot-hi' : rk === 'MEDIUM' ? 'db-dot-md' : 'db-dot-lo';
                    return (
                      <div key={batch.inventory_id} className="db-row">
                        <div className={`db-dot ${dotCls}`} />
                        <div className={`db-av ${avCls}`}>
                          {(batch.product_name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {batch.product_name}
                          </p>
                          <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>
                            {batch.batch_number || '—'} · {batch.available_quantity} {batch.unit_of_measure || 'kg'} · {batch.days_left}d left
                          </p>
                        </div>
                        <button
                          onClick={() => handlePlanBatch(batch)}
                          style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color:'#2d6a4f', background:'none', border:'none', cursor:'pointer', padding:'4px 7px', borderRadius:7, transition:'background .12s', flexShrink:0 }}
                          onMouseOver={e => e.currentTarget.style.background = '#d8f3dc'}
                          onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                          <Truck size={11} /> Dispatch
                        </button>
                      </div>
                    );
                  })}
                  <button className="db-nav-btn" onClick={() => navigate('/alerts')}>
                    View all in Spoilage Alerts <ChevronRight size={12} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Modals ── */}
      {showAddProduct && (
        <AddProductModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadAll(); }} />
      )}
      {showPlanRoute && (
        <PlanNewDeliveryModal prefill={prefill} onClose={() => { setShowPlan(false); setPrefill(null); }} onSuccess={handlePlanSuccess} />
      )}
      {showManageAccts && (
        <ManageAccountsModal onClose={() => setShowMgmt(false)} />
      )}
    </Layout>
  );
};

export default DashboardPage;