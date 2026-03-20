// ============================================================
// FILE: src/components/manager/logistics/RouteApprovalCard.jsx
// UI restyled to match AdminDashboardPage design system
// NO functional changes — only visual/CSS updates
// ============================================================
import React from 'react';
import { MapPin, Navigation, Clock, Leaf, Fuel, Sparkles, Eye } from 'lucide-react';

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .rac-root, .rac-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes rac-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

  .rac-card {
    background:#fff; border-radius:18px;
    border:1px solid rgba(82,183,136,0.16); border-left:4px solid;
    box-shadow:0 2px 12px rgba(26,61,43,0.07);
    overflow:hidden; animation:rac-in .25s ease both;
    transition:box-shadow .2s,transform .2s;
  }
  .rac-card:hover { box-shadow:0 8px 24px rgba(26,61,43,0.12); transform:translateY(-2px); }
  .rac-card-hi { border-left-color:#dc2626; }
  .rac-card-md { border-left-color:#d97706; }
  .rac-card-lo { border-left-color:#2563eb; }

  .rac-header { padding:16px 18px 12px; }
  .rac-title { font-size:13.5px; font-weight:800; color:#1a3d2b; margin:0 0 3px; }
  .rac-sub   { font-size:11px;   color:#9ca3af;  margin:0; }

  /* Priority badge */
  .rac-pri { display:inline-flex; align-items:center; padding:3px 10px; border-radius:99px; font-size:10.5px; font-weight:800; }
  .rac-pri-hi { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
  .rac-pri-md { background:#fffbeb; color:#b45309; border:1px solid #fde68a; }
  .rac-pri-lo { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }

  /* Route comparison boxes */
  .rac-compare-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:0 18px 14px; }
  .rac-compare-orig { background:#f9fafb; border-radius:13px; padding:12px; border:1px solid rgba(82,183,136,0.12); }
  .rac-compare-opt  { background:linear-gradient(135deg,#f0fdf4,#ecfdf5); border-radius:13px; padding:12px; border:1px solid rgba(82,183,136,0.25); }
  .rac-compare-label { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; margin:0 0 8px; }
  .rac-metric { display:flex; align-items:center; gap:5px; font-size:11.5px; color:#374151; margin-bottom:4px; }
  .rac-metric:last-child { margin-bottom:0; }

  /* Savings */
  .rac-savings { display:flex; gap:7px; flex-wrap:wrap; margin:0 18px 14px; }
  .rac-saving-chip { display:inline-flex; align-items:center; gap:3px; padding:4px 10px; background:#d8f3dc; color:#1a3d2b; border-radius:99px; font-size:11px; font-weight:700; border:1px solid #86efac; }

  /* Actions */
  .rac-actions { display:flex; gap:8px; padding:0 18px 16px; }
  .rac-btn-view { display:inline-flex; align-items:center; gap:5px; padding:9px 14px; background:#f3f4f6; color:#374151; border-radius:11px; font-size:12px; font-weight:700; border:none; cursor:pointer; transition:background .13s; }
  .rac-btn-view:hover { background:#e5e7eb; }
  .rac-btn-approve { flex:1; padding:9px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f); color:#fff; border-radius:11px; font-size:12px; font-weight:700; border:none; cursor:pointer; transition:opacity .13s; box-shadow:0 2px 8px rgba(26,61,43,0.2); }
  .rac-btn-approve:disabled { opacity:.45; cursor:not-allowed; }
  .rac-btn-approve:hover:not(:disabled) { opacity:.88; }
  .rac-btn-decline { flex:1; padding:9px; background:#fff; color:#dc2626; border-radius:11px; font-size:12px; font-weight:700; border:1.5px solid #fecaca; cursor:pointer; transition:background .13s; }
  .rac-btn-decline:disabled { opacity:.45; cursor:not-allowed; }
  .rac-btn-decline:hover:not(:disabled) { background:#fef2f2; }
`;

if (typeof document !== 'undefined' && !document.getElementById('rac-styles')) {
  const el = document.createElement('style');
  el.id = 'rac-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ── ALL ORIGINAL LOGIC BELOW — zero changes ──────────────── */

const RouteApprovalCard = ({ approval, onViewDetails, onApprove, onDecline, submitting, readOnly }) => {
  const extra = (() => {
    try { return JSON.parse(approval.extra_data || approval.extraData || '{}'); }
    catch { return {}; }
  })();

  const savings   = extra.savings        || {};
  const original  = extra.originalRoute  || {};
  const optimized = extra.optimizedRoute || {};
  const stops     = extra.stops          || [];

  const priCls = {
    HIGH:   'rac-card-hi',
    MEDIUM: 'rac-card-md',
    LOW:    'rac-card-lo',
  }[approval.priority] || 'rac-card-lo';

  const priBadgeCls = {
    HIGH:   'rac-pri rac-pri-hi',
    MEDIUM: 'rac-pri rac-pri-md',
    LOW:    'rac-pri rac-pri-lo',
  }[approval.priority] || 'rac-pri rac-pri-lo';

  return (
    <div className={`rac-root rac-card ${priCls}`}>

      {/* Header */}
      <div className="rac-header">
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:6 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p className="rac-title">
              {approval.product_name} — {stops.length === 1 ? 'SINGLE STOP' : `MULTI STOP (${stops.length} STOPS)`}
            </p>
            <p className="rac-sub" style={{ margin:'3px 0 0' }}>
              {stops[0]?.location?.split(',')[0]} → {stops[stops.length - 1]?.location?.split(',')[0]}
            </p>
          </div>
          <span className={priBadgeCls}>{approval.priority}</span>
        </div>
        <p className="rac-sub">
          Driver: {extra.driver || '—'} · {extra.vehicleType?.replace('_', ' ') || '—'}
        </p>
      </div>

      {/* Route comparison */}
      <div className="rac-compare-grid">
        <div className="rac-compare-orig">
          <p className="rac-compare-label" style={{ color:'#9ca3af' }}>Original</p>
          <div className="rac-metric"><Navigation size={11} style={{ color:'#9ca3af' }} /> {original.totalDistance} km</div>
          <div className="rac-metric"><Clock      size={11} style={{ color:'#9ca3af' }} /> {original.estimatedDuration} min</div>
          <div className="rac-metric"><Leaf       size={11} style={{ color:'#9ca3af' }} /> {original.carbonEmissions} kg CO₂</div>
        </div>
        <div className="rac-compare-opt">
          <p className="rac-compare-label" style={{ color:'#2d6a4f', display:'flex', alignItems:'center', gap:4 }}>
            <Sparkles size={9} /> AI Optimized
          </p>
          <div className="rac-metric" style={{ color:'#1a3d2b' }}><Navigation size={11} style={{ color:'#40916c' }} /> {optimized.totalDistance} km</div>
          <div className="rac-metric" style={{ color:'#1a3d2b' }}><Clock      size={11} style={{ color:'#40916c' }} /> {optimized.estimatedDuration} min</div>
          <div className="rac-metric" style={{ color:'#1a3d2b' }}><Leaf       size={11} style={{ color:'#40916c' }} /> {optimized.carbonEmissions} kg CO₂</div>
        </div>
      </div>

      {/* Savings */}
      {savings.distance && (
        <div className="rac-savings">
          <span className="rac-saving-chip">-{savings.distance} km</span>
          <span className="rac-saving-chip">-{savings.fuel} L fuel</span>
          <span className="rac-saving-chip">-{savings.emissions} kg CO₂</span>
        </div>
      )}

      {/* Submitted by */}
      <div style={{ padding:'0 18px 14px' }}>
        <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>
          Submitted by: <span style={{ fontWeight:700, color:'#374151' }}>Admin</span>
        </p>
      </div>

      {/* Actions */}
      <div className="rac-actions">
        <button className="rac-btn-view" onClick={() => onViewDetails(approval)}>
          <Eye size={13} /> View Details
        </button>
        {!readOnly && (
          <>
            <button className="rac-btn-approve" onClick={() => onApprove(approval.approval_id || approval.id)} disabled={submitting}>
              Approve
            </button>
            <button className="rac-btn-decline" onClick={() => onDecline(approval.approval_id || approval.id)} disabled={submitting}>
              Decline
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RouteApprovalCard;