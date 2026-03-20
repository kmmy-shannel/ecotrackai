// ============================================================
// FILE: src/components/manager/logistics/RouteDetailModal.jsx
// UI restyled to match AdminDashboardPage design system
// NO functional changes — only visual/CSS updates
// ============================================================
import React, { useState } from 'react';
import { X, Navigation, Clock, Leaf, Fuel, Sparkles, MapPin } from 'lucide-react';

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .rdm-root, .rdm-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes rdm-in { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }

  .rdm-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,0.5);
    display:flex; align-items:center; justify-content:center;
    z-index:50; padding:16px;
  }
  .rdm-modal {
    background:#fff; border-radius:22px; max-width:640px; width:100%;
    max-height:90vh; display:flex; flex-direction:column;
    box-shadow:0 24px 64px rgba(0,0,0,0.2);
    border:1px solid rgba(82,183,136,0.1);
    animation:rdm-in .2s ease both;
    overflow:hidden;
  }

  /* Header */
  .rdm-header {
    background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%);
    padding:22px 24px; display:flex; align-items:flex-start; justify-content:space-between;
    flex-shrink:0; position:relative; overflow:hidden;
  }
  .rdm-header::after { content:''; position:absolute; right:-30px; top:-30px; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,0.04); pointer-events:none; }
  .rdm-header-title { font-size:18px; font-weight:900; color:#fff; margin:0 0 4px; letter-spacing:-.3px; }
  .rdm-header-sub   { font-size:12px; color:rgba(255,255,255,0.5); margin:0; }
  .rdm-close { width:34px; height:34px; border-radius:10px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background .13s; flex-shrink:0; position:relative; z-index:1; }
  .rdm-close:hover { background:rgba(255,255,255,0.18); }

  /* Body */
  .rdm-body { flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:14px; }

  /* Section box */
  .rdm-section { background:#f9fafb; border-radius:14px; padding:14px 16px; border:1px solid rgba(82,183,136,0.1); }
  .rdm-section-label { font-size:9.5px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:.1em; margin:0 0 10px; }

  /* Comparison grid */
  .rdm-compare-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .rdm-compare-orig { background:#fff; border-radius:13px; padding:14px; border:1px solid #e5e7eb; }
  .rdm-compare-opt  { background:linear-gradient(135deg,#f0fdf4,#ecfdf5); border-radius:13px; padding:14px; border:1px solid rgba(82,183,136,0.25); }
  .rdm-compare-label { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; margin:0 0 10px; }
  .rdm-metric-row { display:flex; justify-content:space-between; align-items:center; font-size:12.5px; padding:5px 0; border-bottom:1px solid rgba(82,183,136,0.07); }
  .rdm-metric-row:last-child { border-bottom:none; }

  /* Savings */
  .rdm-savings { background:linear-gradient(135deg,#f0fdf4,#ecfdf5); border:1px solid rgba(82,183,136,0.2); border-radius:13px; padding:14px 16px; }
  .rdm-saving-chip { display:inline-flex; align-items:center; gap:4px; padding:5px 12px; background:#d8f3dc; color:#1a3d2b; border-radius:99px; font-size:12px; font-weight:700; border:1px solid #86efac; }

  /* Stop list */
  .rdm-stop { display:flex; align-items:flex-start; gap:8px; font-size:12.5px; color:#374151; margin-bottom:6px; }
  .rdm-stop:last-child { margin-bottom:0; }
  .rdm-stop-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; margin-top:4px; }

  /* AI box */
  .rdm-ai { background:#f5f3ff; border:1px solid #ddd6fe; border-radius:14px; padding:14px 16px; }

  /* Textarea */
  .rdm-textarea { width:100%; border:1.5px solid rgba(82,183,136,0.25); border-radius:12px; padding:10px 14px; font-size:13px; font-family:'Poppins',sans-serif; resize:none; outline:none; transition:border-color .15s; background:#fff; }
  .rdm-textarea:focus { border-color:#2d6a4f; box-shadow:0 0 0 3px rgba(45,106,79,0.1); }

  /* Footer */
  .rdm-footer { border-top:1px solid rgba(82,183,136,0.1); padding:16px 24px; background:#fafffe; flex-shrink:0; display:flex; gap:10px; }
  .rdm-btn-approve { flex:1; padding:12px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f); color:#fff; border-radius:13px; font-size:13px; font-weight:700; border:none; cursor:pointer; transition:opacity .13s; box-shadow:0 3px 10px rgba(26,61,43,0.2); }
  .rdm-btn-approve:disabled { opacity:.45; cursor:not-allowed; }
  .rdm-btn-approve:hover:not(:disabled) { opacity:.88; }
  .rdm-btn-decline { flex:1; padding:12px; background:#fff; color:#dc2626; border-radius:13px; font-size:13px; font-weight:700; border:1.5px solid #fecaca; cursor:pointer; transition:background .13s; }
  .rdm-btn-decline:disabled { opacity:.45; cursor:not-allowed; }
  .rdm-btn-decline:hover:not(:disabled) { background:#fef2f2; }
  .rdm-btn-cancel { padding:12px 20px; background:#f3f4f6; color:#374151; border-radius:13px; font-size:13px; font-weight:700; border:none; cursor:pointer; transition:background .13s; }
  .rdm-btn-cancel:hover { background:#e5e7eb; }
  .rdm-btn-close { width:100%; padding:12px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f); color:#fff; border-radius:13px; font-size:13px; font-weight:700; border:none; cursor:pointer; transition:opacity .13s; }
  .rdm-btn-close:hover { opacity:.88; }
`;

if (typeof document !== 'undefined' && !document.getElementById('rdm-styles')) {
  const el = document.createElement('style');
  el.id = 'rdm-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ── ALL ORIGINAL LOGIC BELOW — zero changes ──────────────── */

const RouteDetailModal = ({ approval, onClose, onDecision, submitting, readOnly }) => {
  const [comments, setComments] = useState('');

  const extra = (() => {
    try { return JSON.parse(approval.extra_data || approval.extraData || '{}'); }
    catch { return {}; }
  })();

  const { savings = {}, originalRoute = {}, optimizedRoute = {}, stops = [], aiRecommendations = [] } = extra;

  return (
    <div className="rdm-root">
      <div className="rdm-overlay">
        <div className="rdm-modal">

          {/* Header */}
          <div className="rdm-header">
            <div style={{ position:'relative', zIndex:1 }}>
              <p style={{ fontSize:9.5, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 4px' }}>
                Route Detail
              </p>
              <h2 className="rdm-header-title">{approval.product_name}</h2>
              <p className="rdm-header-sub">
                {stops.length === 1 ? 'Single Stop Route' : `Multi-Stop Route (${stops.length} stops)`}
              </p>
            </div>
            <button className="rdm-close" onClick={onClose}>
              <X size={16} style={{ color:'#fff' }} />
            </button>
          </div>

          {/* Body */}
          <div className="rdm-body">

            {/* Route info */}
            <div className="rdm-section">
              <p className="rdm-section-label">Route Information</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                <div>
                  <p style={{ fontSize:10.5, color:'#9ca3af', margin:'0 0 2px' }}>Driver</p>
                  <p style={{ fontSize:13, fontWeight:700, color:'#1a3d2b', margin:0 }}>{extra.driver || '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize:10.5, color:'#9ca3af', margin:'0 0 2px' }}>Vehicle</p>
                  <p style={{ fontSize:13, fontWeight:700, color:'#1a3d2b', margin:0 }}>{extra.vehicleType?.replace('_', ' ') || '—'}</p>
                </div>
              </div>
              <div>
                {stops.map((stop, i) => (
                  <div key={i} className="rdm-stop">
                    <div className="rdm-stop-dot" style={{ background: stop.type === 'origin' ? '#40916c' : stop.type === 'destination' ? '#dc2626' : '#2d6a4f' }} />
                    <span>{stop.location}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison */}
            <div className="rdm-compare-grid">
              <div className="rdm-compare-orig">
                <p className="rdm-compare-label" style={{ color:'#9ca3af' }}>Original Order</p>
                {[
                  { label:'Distance', val:`${originalRoute.totalDistance} km` },
                  { label:'Duration', val:`${originalRoute.estimatedDuration} min` },
                  { label:'Fuel',     val:`${originalRoute.fuelConsumption} L` },
                  { label:'CO₂',      val:`${originalRoute.carbonEmissions} kg` },
                ].map(r => (
                  <div key={r.label} className="rdm-metric-row">
                    <span style={{ color:'#9ca3af' }}>{r.label}</span>
                    <span style={{ fontWeight:700, color:'#374151' }}>{r.val}</span>
                  </div>
                ))}
              </div>
              <div className="rdm-compare-opt">
                <p className="rdm-compare-label" style={{ color:'#2d6a4f', display:'flex', alignItems:'center', gap:4 }}>
                  <Sparkles size={9} /> AI Optimized
                </p>
                {[
                  { label:'Distance', val:`${optimizedRoute.totalDistance} km` },
                  { label:'Duration', val:`${optimizedRoute.estimatedDuration} min` },
                  { label:'Fuel',     val:`${optimizedRoute.fuelConsumption} L` },
                  { label:'CO₂',      val:`${optimizedRoute.carbonEmissions} kg` },
                ].map(r => (
                  <div key={r.label} className="rdm-metric-row">
                    <span style={{ color:'#9ca3af' }}>{r.label}</span>
                    <span style={{ fontWeight:700, color:'#1a3d2b' }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings */}
            <div className="rdm-savings">
              <p style={{ fontSize:9.5, fontWeight:800, color:'#2d6a4f', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 10px' }}>
                Total Savings
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {savings.distance  && <span className="rdm-saving-chip">-{savings.distance} km</span>}
                {savings.fuel      && <span className="rdm-saving-chip">-{savings.fuel} L fuel</span>}
                {savings.emissions && <span className="rdm-saving-chip">-{savings.emissions} kg CO₂</span>}
                {savings.time      && <span className="rdm-saving-chip">-{savings.time} min</span>}
              </div>
            </div>

            {/* AI Suggestion */}
            {approval.ai_suggestion && (
              <div className="rdm-ai">
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                  <Sparkles size={14} style={{ color:'#7c3aed' }} />
                  <p style={{ fontSize:9.5, fontWeight:800, color:'#6d28d9', textTransform:'uppercase', letterSpacing:'.1em', margin:0 }}>AI Suggestion</p>
                </div>
                <p style={{ fontSize:13, color:'#5b21b6', fontStyle:'italic', margin:0 }}>"{approval.ai_suggestion}"</p>
              </div>
            )}

            {/* Comments */}
            {!readOnly && (
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
                  Comments <span style={{ color:'#9ca3af', fontWeight:500 }}>(optional)</span>
                </label>
                <textarea
                  className="rdm-textarea"
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  rows={3}
                  placeholder="Comment here..."
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="rdm-footer">
            {!readOnly ? (
              <>
                <button
                  className="rdm-btn-approve"
                  onClick={() => onDecision(approval.approval_id || approval.id, 'approved', comments)}
                  disabled={submitting}
                >
                  Accept
                </button>
                <button
                  className="rdm-btn-decline"
                  onClick={() => onDecision(approval.approval_id || approval.id, 'declined', comments)}
                  disabled={submitting}
                >
                  Decline
                </button>
                <button className="rdm-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="rdm-btn-close" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteDetailModal;