import React from 'react';
import ApprovalCard from '../../../components/manager/inventory/ApprovalCard';
import { AlertTriangle, CheckCircle, Clock, Zap, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

/* ─── Shared panel styles injected once ─────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .idv-root, .idv-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }
  @keyframes idv-in    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes idv-spin  { to{transform:rotate(360deg)} }
  @keyframes idv-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

  /* Stat cards */
  .idv-stat-dk { background:linear-gradient(145deg,#1a3d2b,#2d6a4f); border-radius:18px; border:1px solid rgba(82,183,136,0.18); overflow:hidden; transition:transform .2s,box-shadow .2s; animation:idv-in .3s ease both; }
  .idv-stat-lt { background:#fff; border-radius:18px; border:1px solid rgba(82,183,136,0.18); overflow:hidden; transition:transform .2s,box-shadow .2s; animation:idv-in .3s ease both; }
  .idv-stat-dk:hover, .idv-stat-lt:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(26,61,43,0.13); }
  .idv-stat-cell { padding:16px 18px; }

  /* Panel */
  .idv-panel { background:#fff; border-radius:18px; padding:18px 20px; border:1px solid rgba(82,183,136,0.14); box-shadow:0 2px 12px rgba(26,61,43,0.07); animation:idv-in .3s ease both; }

  /* Alert row */
  .idv-alert-row { display:flex; align-items:center; justify-content:space-between; padding:11px 14px; border-bottom:1px solid rgba(82,183,136,0.07); transition:background .13s; }
  .idv-alert-row:last-child { border-bottom:none; }
  .idv-alert-row:hover { background:rgba(216,243,220,0.2); }

  /* Badges */
  .idv-badge-hi  { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10px;font-weight:600;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca; }
  .idv-badge-md  { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10px;font-weight:600;background:#fffbeb;color:#b45309;border:1px solid #fde68a; }
  .idv-badge-lo  { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10px;font-weight:600;background:#d8f3dc;color:#2d6a4f;border:1px solid #86efac; }
  .idv-dot-hi  { width:7px;height:7px;border-radius:50%;background:#dc2626;animation:idv-pulse 1.8s ease infinite;flex-shrink:0; }
  .idv-dot-md  { width:7px;height:7px;border-radius:50%;background:#d97706;animation:idv-pulse 2.4s ease infinite;flex-shrink:0; }
  .idv-dot-lo  { width:7px;height:7px;border-radius:50%;background:#40916c;flex-shrink:0; }

  /* Panel section header */
  .idv-sh { display:flex;align-items:center;justify-content:space-between;margin-bottom:13px; }
  .idv-sh-left { display:flex;align-items:center;gap:9px; }
  .idv-sh-ico { width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
  .idv-rule { height:1px;background:rgba(82,183,136,0.1);margin:13px 0; }

  /* Empty state */
  .idv-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px;gap:10px;text-align:center; }

  /* Refresh btn */
  .idv-refresh { display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#9ca3af;background:none;border:none;cursor:pointer;transition:color .13s;font-family:'Poppins',sans-serif;padding:4px; }
  .idv-refresh:hover { color:#2d6a4f; }
`;

if (typeof document !== 'undefined' && !document.getElementById('idv-styles')) {
  const el = document.createElement('style');
  el.id = 'idv-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── StatCard (matches admin StatCard exactly) ─────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, dark, delay = 0 }) => (
  <div className={dark ? 'idv-stat-dk' : 'idv-stat-lt'} style={{ animationDelay:`${delay}s` }}>
    <div className="idv-stat-cell">
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

/* ─── InventoryDashboardView ─────────────────────────────────────────────────── */
const InventoryDashboardView = ({
  approvals, alerts, onApprove, onDecline, loading, onGenerateAlerts
}) => {
  const list      = Array.isArray(approvals) ? approvals : [];
  const alertList = Array.isArray(alerts) ? alerts : [];

  const high   = list.filter(a => a.risk_level === 'HIGH').length;
  const medium = list.filter(a => a.risk_level === 'MEDIUM').length;
  const low    = list.filter(a => a.risk_level === 'LOW').length;

  return (
    <div className="idv-root" style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Stat Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        <StatCard dark  label="High Risk"   value={high}   sub="Needs immediate action" icon={AlertTriangle} delay={0.04} />
        <StatCard       label="Medium Risk"  value={medium} sub="Monitor closely"        icon={Clock}         delay={0.08} />
        <StatCard dark  label="Low Risk"     value={low}    sub="Within safe range"       icon={CheckCircle}   delay={0.12} />
      </div>

      {/* ── Active HIGH Alerts Panel ── */}
      <div className="idv-panel">
        <div className="idv-sh">
          <div className="idv-sh-left">
            <div className="idv-sh-ico" style={{ background:'#fef2f2' }}>
              <ShieldAlert size={15} style={{ color:'#dc2626' }} />
            </div>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Active HIGH Alerts</h3>
              <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Batches requiring immediate attention</p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {alertList.length > 0 && (
              <span className="idv-badge-hi">
                <div className="idv-dot-hi" />
                {alertList.length} active
              </span>
            )}
            <button className="idv-refresh" onClick={onGenerateAlerts}>
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        </div>

        <div className="idv-rule" />

        {alertList.length === 0 ? (
          <div className="idv-empty">
            <div style={{ width:48, height:48, borderRadius:14, background:'#d8f3dc', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CheckCircle2 size={22} style={{ color:'#2d6a4f' }} />
            </div>
            <p style={{ fontWeight:700, color:'#374151', margin:0, fontSize:13 }}>No active HIGH risk alerts</p>
            <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>All batches are within acceptable ranges</p>
          </div>
        ) : (
          <div style={{ borderRadius:12, border:'1px solid rgba(239,68,68,0.14)', overflow:'hidden' }}>
            {alertList.map(alert => (
              <div key={alert.id} className="idv-alert-row">
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#fee2e2,#fecaca)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:800, color:'#991b1b' }}>
                    {(alert.product_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0 }}>{alert.product_name}</p>
                    <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>
                      {alert.quantity} · {alert.location || 'Warehouse'}
                    </p>
                    {alert.details && (
                      <p style={{ fontSize:11, color:'#ef4444', margin:'2px 0 0', fontStyle:'italic' }}>"{alert.details}"</p>
                    )}
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:800, color:'#dc2626', background:'#fef2f2', border:'1px solid #fecaca', padding:'3px 10px', borderRadius:99, flexShrink:0 }}>
                  {alert.days_left}d left
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pending Approvals Panel ── */}
      <div className="idv-panel">
        <div className="idv-sh">
          <div className="idv-sh-left">
            <div className="idv-sh-ico" style={{ background:'#fff7ed' }}>
              <Zap size={15} style={{ color:'#c2410c' }} />
            </div>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Pending Approvals</h3>
              <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Spoilage actions awaiting your review</p>
            </div>
          </div>
          {list.length > 0 && (
            <span className="idv-badge-hi">{list.length} pending</span>
          )}
        </div>

        <div className="idv-rule" />

        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', gap:10, color:'#9ca3af' }}>
            <div style={{ width:20, height:20, borderRadius:'50%', border:'2.5px solid #95d5b2', borderTopColor:'#2d6a4f', animation:'idv-spin .65s linear infinite' }} />
            <span style={{ fontSize:13 }}>Loading approvals…</span>
          </div>
        ) : list.length === 0 ? (
          <div className="idv-empty">
            <div style={{ width:48, height:48, borderRadius:14, background:'#d8f3dc', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CheckCircle2 size={22} style={{ color:'#2d6a4f' }} />
            </div>
            <p style={{ fontWeight:700, color:'#374151', margin:0, fontSize:13 }}>All caught up</p>
            <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>No pending spoilage approvals</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {list.map(approval => (
              <ApprovalCard
                key={approval.approval_id}
                approval={approval}
                onApprove={onApprove}
                onDecline={onDecline}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default InventoryDashboardView;