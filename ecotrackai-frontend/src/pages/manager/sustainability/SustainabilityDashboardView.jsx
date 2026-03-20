// ============================================================
// FILE: src/pages/manager/sustainability/SustainabilityDashboardView.jsx
// UI restyled to match AdminDashboardPage design system
// NO functional changes — only visual/CSS updates
// ============================================================
import React, { useState } from 'react';
import useSustainabilityApprovals from '../../../hooks/useSustainabilityApprovals';
import { CheckCircle, XCircle, RefreshCw, AlertCircle, Leaf } from 'lucide-react';

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .sdv-root, .sdv-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes sdv-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sdv-slide { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes sdv-spin  { to{transform:rotate(360deg)} }
  @keyframes sdv-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

  .sdv-page { animation:sdv-in .3s ease both; }

  /* Stat cards */
  .sdv-stat { border-radius:18px; border:1px solid rgba(82,183,136,0.18); box-shadow:0 2px 10px rgba(26,61,43,0.07); transition:transform .2s,box-shadow .2s; overflow:hidden; }
  .sdv-stat:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(26,61,43,0.13); }
  .sdv-stat-dk { background:linear-gradient(145deg,#1a3d2b,#2d6a4f); position:relative; }
  .sdv-stat-dk::after { content:''; position:absolute; right:-20px; top:-20px; width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,0.05); pointer-events:none; }
  .sdv-stat-lt { background:#fff; }
  .sdv-stat-cell { padding:16px 18px; position:relative; z-index:1; }

  /* Panel */
  .sdv-panel { background:#fff; border-radius:18px; padding:18px 20px; box-shadow:0 2px 12px rgba(26,61,43,0.07); border:1px solid rgba(82,183,136,0.14); animation:sdv-in .32s ease both; }
  .sdv-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .sdv-sh-left { display:flex; align-items:center; gap:9px; }
  .sdv-sh-ico { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .sdv-rule { height:1px; background:rgba(82,183,136,0.1); margin:13px 0; }

  /* Verification cards */
  .sdv-card { background:#fff; border-radius:16px; border:1px solid rgba(82,183,136,0.16); box-shadow:0 2px 10px rgba(26,61,43,0.06); overflow:hidden; margin-bottom:10px; animation:sdv-slide .22s ease both; transition:border-color .15s,box-shadow .15s; }
  .sdv-card:hover { border-color:#52b788; box-shadow:0 6px 20px rgba(26,61,43,0.1); }
  .sdv-card:nth-child(1){animation-delay:.03s} .sdv-card:nth-child(2){animation-delay:.06s} .sdv-card:nth-child(3){animation-delay:.09s}

  .sdv-card-header { display:flex; align-items:flex-start; justify-content:space-between; padding:14px 16px; cursor:pointer; transition:background .13s; }
  .sdv-card-header:hover { background:rgba(216,243,220,0.2); }
  .sdv-card-body { border-top:1px solid rgba(82,183,136,0.1); padding:16px; background:rgba(240,253,244,0.3); }

  /* Avatar */
  .sdv-av { width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg,#d8f3dc,#b7e4c7); display:flex; align-items:center; justify-content:center; flex-shrink:0; }

  /* Badges */
  .sdv-badge-pending  { display:inline-flex; align-items:center; padding:3px 10px; border-radius:99px; font-size:10.5px; font-weight:700; background:#fffbeb; color:#b45309; border:1px solid #fde68a; }

  /* Metrics grid */
  .sdv-metrics { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
  .sdv-metric { background:#f9fafb; border-radius:12px; padding:12px 14px; border:1px solid rgba(82,183,136,0.1); }
  .sdv-metric-total { background:linear-gradient(135deg,#f0fdf4,#ecfdf5); border:1px solid rgba(82,183,136,0.2); border-radius:12px; padding:12px 14px; margin-bottom:14px; }

  /* Buttons */
  .sdv-btn-verify { display:inline-flex; align-items:center; gap:6px; padding:10px 18px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f); color:#fff; border-radius:12px; font-size:12.5px; font-weight:700; border:none; cursor:pointer; transition:opacity .15s; box-shadow:0 2px 8px rgba(26,61,43,0.2); font-family:'Poppins',sans-serif; }
  .sdv-btn-verify:disabled { opacity:.45; cursor:not-allowed; }
  .sdv-btn-verify:hover:not(:disabled) { opacity:.88; }
  .sdv-btn-revision { display:inline-flex; align-items:center; gap:6px; padding:10px 18px; background:#fff; color:#c2410c; border-radius:12px; font-size:12.5px; font-weight:700; border:1.5px solid #fed7aa; cursor:pointer; transition:background .13s; font-family:'Poppins',sans-serif; }
  .sdv-btn-revision:hover { background:#fff7ed; }
  .sdv-btn-submit { display:inline-flex; align-items:center; gap:6px; padding:10px 18px; background:#dc2626; color:#fff; border-radius:12px; font-size:12.5px; font-weight:700; border:none; cursor:pointer; transition:opacity .13s; font-family:'Poppins',sans-serif; }
  .sdv-btn-submit:disabled { opacity:.45; cursor:not-allowed; }
  .sdv-btn-submit:hover:not(:disabled) { opacity:.88; }

  /* Refresh btn */
  .sdv-btn-refresh { display:inline-flex; align-items:center; gap:5px; padding:7px 13px; background:rgba(255,255,255,0.08); color:#fff; border-radius:10px; font-size:12px; font-weight:600; border:1px solid rgba(255,255,255,0.14); cursor:pointer; transition:background .15s; font-family:'Poppins',sans-serif; }
  .sdv-btn-refresh:hover { background:rgba(255,255,255,0.15); }

  /* Textarea */
  .sdv-textarea { width:100%; border:1.5px solid rgba(82,183,136,0.25); border-radius:12px; padding:10px 14px; font-size:12.5px; font-family:'Poppins',sans-serif; resize:none; outline:none; transition:border-color .15s; background:#fff; }
  .sdv-textarea:focus { border-color:#2d6a4f; box-shadow:0 0 0 3px rgba(45,106,79,0.1); }

  /* Toast */
  .sdv-toast-err { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; border-radius:12px; padding:12px 16px; font-size:13px; font-weight:600; margin-bottom:14px; display:flex; align-items:center; gap:7px; }
  .sdv-toast-ok  { background:#d8f3dc; border:1px solid #86efac; color:#1a3d2b; border-radius:12px; padding:12px 16px; font-size:13px; font-weight:600; margin-bottom:14px; }
  .sdv-toast-err2 { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; border-radius:12px; padding:12px 16px; font-size:13px; font-weight:600; margin-bottom:14px; }

  /* Empty */
  .sdv-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:52px 24px; gap:10px; color:#9ca3af; text-align:center; }

  /* Spinner */
  .sdv-spin { border-radius:50%; border:2.5px solid #95d5b2; border-top-color:#2d6a4f; animation:sdv-spin .65s linear infinite; }

  /* Banner (top of page) */
  .sdv-banner {
    background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%);
    border-radius:18px; padding:18px 22px;
    display:flex; align-items:center; justify-content:space-between;
    box-shadow:0 6px 24px rgba(26,61,43,0.2);
    border:1px solid rgba(82,183,136,0.12);
    position:relative; overflow:hidden; margin-bottom:14px;
  }
  .sdv-banner::after { content:''; position:absolute; right:-40px; top:-40px; width:140px; height:140px; border-radius:50%; background:rgba(255,255,255,0.03); pointer-events:none; }
  .sdv-pulse-dot { width:7px; height:7px; border-radius:50%; background:#4ade80; flex-shrink:0; animation:sdv-pulse 2.5s ease infinite; box-shadow:0 0 0 3px rgba(74,222,128,0.18); }
`;

if (typeof document !== 'undefined' && !document.getElementById('sdv-styles')) {
  const el = document.createElement('style');
  el.id = 'sdv-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ── ALL ORIGINAL LOGIC BELOW — zero changes ──────────────── */

const SustainabilityDashboardView = () => {
  const { pendingRecords, loading, error, verifyRecord, refresh } = useSustainabilityApprovals();
  const [revisionNote, setRevisionNote] = useState('');
  const [selectedId,   setSelectedId]   = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [resultMsg,    setResultMsg]    = useState('');
  const [isSuccess,    setIsSuccess]    = useState(false);

  const handleVerify = async (recordId) => {
    setSubmitting(true); setResultMsg('');
    const result = await verifyRecord(recordId, 'verified', '');
    setIsSuccess(result.success);
    setResultMsg(result.success
      ? `✓ Verified! ${result.data?.totalPointsAdded || 0} points released. Level: ${result.data?.newLevel || ''}`
      : `Error: ${result.error}`);
    setSubmitting(false);
  };

  const handleRequestRevision = async (recordId) => {
    if (!revisionNote.trim()) return alert('Please enter a revision note.');
    setSubmitting(true); setResultMsg('');
    const result = await verifyRecord(recordId, 'revision_requested', revisionNote);
    setIsSuccess(result.success);
    setResultMsg(result.success
      ? '✓ Revision requested. Admin will be notified.'
      : `Error: ${result.error}`);
    setRevisionNote(''); setSelectedId(null); setSubmitting(false);
  };

  return (
    <div className="sdv-root sdv-page" style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {/* Banner */}
      <div className="sdv-banner">
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
            <div className="sdv-pulse-dot" />
            <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.1em' }}>
              Carbon Verification Queue
            </span>
          </div>
          <h2 style={{ color:'#fff', fontSize:18, fontWeight:900, margin:'0 0 4px', letterSpacing:'-.3px' }}>
            Pending Verifications
          </h2>
          <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.45)', margin:0 }}>
            IPCC diesel emission factor · 2.68 kg CO₂ per litre
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, zIndex:1 }}>
          <button className="sdv-btn-refresh" onClick={refresh}>
            <RefreshCw size={12} style={loading ? { animation:'sdv-spin .7s linear infinite' } : {}} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        <div className="sdv-stat sdv-stat-dk">
          <div className="sdv-stat-cell">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <p style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', margin:0, color:'rgba(255,255,255,0.5)' }}>Pending</p>
              <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Leaf size={14} style={{ color:'rgba(255,255,255,0.8)' }} />
              </div>
            </div>
            <p style={{ fontSize:36, fontWeight:900, lineHeight:1, margin:'0 0 4px', letterSpacing:'-1.5px', color:'#fff' }}>{pendingRecords.length}</p>
            <p style={{ fontSize:11, margin:0, color:'rgba(255,255,255,0.45)' }}>Pending Verifications</p>
          </div>
        </div>
        <div className="sdv-stat sdv-stat-lt">
          <div className="sdv-stat-cell">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <p style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', margin:0, color:'#9ca3af' }}>Standard</p>
              <div style={{ width:28, height:28, borderRadius:8, background:'#f0faf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CheckCircle size={14} style={{ color:'#2d6a4f' }} />
              </div>
            </div>
            <p style={{ fontSize:36, fontWeight:900, lineHeight:1, margin:'0 0 4px', letterSpacing:'-1.5px', color:'#1a3d2b' }}>IPCC</p>
            <p style={{ fontSize:11, margin:0, color:'#9ca3af' }}>Emission Standard</p>
          </div>
        </div>
      </div>

      {/* Toasts */}
      {error && (
        <div className="sdv-toast-err">
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {resultMsg && (
        <div className={isSuccess ? 'sdv-toast-ok' : 'sdv-toast-err2'}>{resultMsg}</div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'48px 0', color:'#9ca3af' }}>
          <div className="sdv-spin" style={{ width:22, height:22 }} />
          <span style={{ fontSize:13 }}>Loading pending verifications…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && pendingRecords.length === 0 && (
        <div className="sdv-panel">
          <div className="sdv-empty">
            <div style={{ width:54, height:54, borderRadius:15, background:'#d8f3dc', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CheckCircle size={28} style={{ color:'#2d6a4f' }} />
            </div>
            <p style={{ fontWeight:700, color:'#4b5563', margin:0, fontSize:14 }}>No pending verifications</p>
            <p style={{ fontSize:12, margin:0, maxWidth:220 }}>Completed deliveries will appear here for carbon verification.</p>
          </div>
        </div>
      )}

      {/* Cards */}
      {pendingRecords.map(record => (
        <div key={record.record_id} className="sdv-card" style={{ marginBottom:10 }}>
          {/* Card header */}
          <div className="sdv-card-header">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div className="sdv-av">
                <Leaf size={18} style={{ color:'#2d6a4f' }} />
              </div>
              <div>
                <p style={{ fontSize:13.5, fontWeight:700, color:'#111827', margin:0 }}>
                  {record.route_name || `Delivery #${record.delivery_route_id}`}
                </p>
                <p style={{ fontSize:11, color:'#6b7280', margin:'2px 0 0' }}>
                  {record.vehicle_type} · {record.created_at ? new Date(record.created_at).toLocaleDateString() : ''}
                </p>
              </div>
            </div>
            <span className="sdv-badge-pending">Pending</span>
          </div>

          {/* Breakdown */}
          <div className="sdv-card-body">
            <div className="sdv-metrics">
              <div className="sdv-metric">
                <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 4px', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Transportation CO₂</p>
                <p style={{ fontSize:15, fontWeight:800, color:'#1a3d2b', margin:0 }}>{record.transportation_carbon_kg ?? '—'} kg</p>
              </div>
              <div className="sdv-metric">
                <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 4px', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Storage CO₂</p>
                <p style={{ fontSize:15, fontWeight:800, color:'#1a3d2b', margin:0 }}>{record.storage_carbon_kg ?? '—'} kg</p>
              </div>
            </div>
            <div className="sdv-metric-total">
              <p style={{ fontSize:10, color:'#9ca3af', margin:'0 0 4px', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em' }}>Total CO₂ Emission</p>
              <p style={{ fontSize:20, fontWeight:900, color:'#1a3d2b', margin:'0 0 3px', letterSpacing:'-.5px' }}>{record.total_carbon_kg ?? '—'} kg CO₂</p>
              <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Method: {record.calculation_method || 'IPCC diesel emission factor'}</p>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, marginBottom: selectedId === record.record_id ? 12 : 0 }}>
              <button className="sdv-btn-verify" onClick={() => handleVerify(record.record_id)} disabled={submitting}>
                <CheckCircle size={14} /> Verify
              </button>
              <button
                className="sdv-btn-revision"
                onClick={() => setSelectedId(selectedId === record.record_id ? null : record.record_id)}
              >
                <XCircle size={14} /> Request Revision
              </button>
            </div>

            {/* Revision input */}
            {selectedId === record.record_id && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <textarea
                  className="sdv-textarea"
                  value={revisionNote}
                  onChange={e => setRevisionNote(e.target.value)}
                  placeholder="Explain why revision is needed (e.g. fuel figure not credible for this vehicle type)..."
                  rows={3}
                />
                <button
                  className="sdv-btn-submit"
                  onClick={() => handleRequestRevision(record.record_id)}
                  disabled={submitting}
                >
                  Submit Revision Request
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SustainabilityDashboardView;