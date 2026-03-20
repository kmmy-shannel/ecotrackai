// ============================================================
// FILE: src/pages/manager/logistics/LogisticsHistoryView.jsx
// UI restyled to match AdminDashboardPage design system
// NO functional changes — only visual/CSS updates
// ============================================================
import React from 'react';
import { CheckCircle, XCircle, History, Navigation, Leaf } from 'lucide-react';

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .lh-root, .lh-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes lh-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

  .lh-page { animation:lh-in .3s ease both; }

  /* Stat cards */
  .lh-stat { border-radius:18px; overflow:hidden; border:1px solid rgba(82,183,136,0.18); box-shadow:0 2px 10px rgba(26,61,43,0.07); transition:transform .2s,box-shadow .2s; animation:lh-in .3s ease both; }
  .lh-stat:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(26,61,43,0.12); }
  .lh-stat-dk { background:linear-gradient(145deg,#1a3d2b,#2d6a4f); }
  .lh-stat-lt { background:#fff; }
  .lh-stat-cell { padding:18px 20px; }

  /* Rate bar panel */
  .lh-panel { background:#fff; border-radius:18px; padding:18px 20px; box-shadow:0 2px 12px rgba(26,61,43,0.07); border:1px solid rgba(82,183,136,0.14); animation:lh-in .3s ease both; }

  /* History items */
  .lh-item { background:#fff; border-radius:16px; border-left:4px solid; box-shadow:0 1px 8px rgba(26,61,43,0.06); padding:14px 16px; display:flex; align-items:flex-start; gap:12px; animation:lh-in .25s ease both; transition:box-shadow .15s; }
  .lh-item:hover { box-shadow:0 4px 16px rgba(26,61,43,0.1); }
  .lh-item-approved { border-left-color:#40916c; }
  .lh-item-declined { border-left-color:#dc2626; }

  .lh-item-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .lh-item-icon-approved { background:#d8f3dc; }
  .lh-item-icon-declined { background:#fef2f2; }

  .lh-badge { display:inline-flex; align-items:center; gap:3px; padding:2px 9px; border-radius:99px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
  .lh-badge-approved { background:#d8f3dc; color:#1a3d2b; border:1px solid #86efac; }
  .lh-badge-declined { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }

  .lh-saving { display:inline-flex; align-items:center; gap:3px; font-size:10.5px; font-weight:600; color:#2d6a4f; }

  /* Date labels */
  .lh-date-label { font-size:9.5px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:.12em; margin:0 0 10px; padding:0 2px; }

  /* Empty */
  .lh-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:56px 24px; gap:10px; color:#9ca3af; text-align:center; }
`;

if (typeof document !== 'undefined' && !document.getElementById('lh-styles')) {
  const el = document.createElement('style');
  el.id = 'lh-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ── ALL ORIGINAL LOGIC BELOW — zero changes ──────────────── */

const LogisticsHistoryView = ({ history, onBack }) => {
  const grouped = history.reduce((acc, item) => {
    const dateStr = item.reviewed_at || item.updated_at;
    const key = dateStr
      ? new Date(dateStr).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
      : 'Unknown Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const totalApproved = history.filter(h => h.status === 'approved').length;
  const totalDeclined = history.filter(h => h.status === 'rejected' || h.status === 'declined').length;
  const approvalRate  = history.length > 0 ? Math.round((totalApproved / history.length) * 100) : 0;

  return (
    <div className="lh-root lh-page" style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'Total Decisions', value: history.length,  dark:true  },
          { label:'Approved',        value: totalApproved,   dark:false },
          { label:'Declined',        value: totalDeclined,   dark:false },
        ].map((s, i) => (
          <div key={s.label} className={`lh-stat ${s.dark ? 'lh-stat-dk' : 'lh-stat-lt'}`} style={{ animationDelay:`${i * 0.05}s` }}>
            <div className="lh-stat-cell">
              <p style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 8px', color: s.dark ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>
                {s.label}
              </p>
              <p style={{ fontSize:36, fontWeight:900, lineHeight:1, margin:0, letterSpacing:'-1.5px', color: s.dark ? '#fff' : (s.label === 'Approved' ? '#1a3d2b' : s.label === 'Declined' ? '#b91c1c' : '#111827') }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Approval rate bar */}
      <div className="lh-panel">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#1a3d2b', margin:0 }}>Approval Rate</p>
          <p style={{ fontSize:22, fontWeight:900, color:'#1a3d2b', margin:0, letterSpacing:'-1px' }}>{approvalRate}%</p>
        </div>
        <div style={{ height:8, background:'rgba(82,183,136,0.12)', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${approvalRate}%`, background:'linear-gradient(90deg,#1a3d2b,#40916c)', borderRadius:99, transition:'width .5s ease' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
          <span style={{ fontSize:10.5, color:'#9ca3af' }}>{totalDeclined} declined</span>
          <span style={{ fontSize:10.5, color:'#40916c', fontWeight:600 }}>{totalApproved} approved</span>
        </div>
      </div>

      {/* History list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="lh-panel">
          <div className="lh-empty">
            <div style={{ width:54, height:54, borderRadius:15, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <History size={28} style={{ color:'#d1d5db' }} />
            </div>
            <p style={{ fontWeight:700, color:'#4b5563', margin:0, fontSize:14 }}>No history yet</p>
            <p style={{ fontSize:12, margin:0 }}>Approved and declined routes will appear here.</p>
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <p className="lh-date-label">{dateLabel}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {items.map((item, i) => {
                const extra   = (() => { try { return JSON.parse(item.extra_data || '{}'); } catch { return {}; } })();
                const savings = extra.savings || {};
                const approved = item.status === 'approved';
                return (
                  <div key={i} className={`lh-item ${approved ? 'lh-item-approved' : 'lh-item-declined'}`}>
                    <div className={`lh-item-icon ${approved ? 'lh-item-icon-approved' : 'lh-item-icon-declined'}`}>
                      {approved
                        ? <CheckCircle size={18} style={{ color:'#40916c' }} />
                        : <XCircle    size={18} style={{ color:'#dc2626' }} />}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:4 }}>
                        <span className={`lh-badge ${approved ? 'lh-badge-approved' : 'lh-badge-declined'}`}>
                          {approved ? 'Approved' : 'Declined'}
                        </span>
                      </div>
                      <p style={{ fontSize:13.5, fontWeight:700, color:'#111827', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {item.product_name}
                      </p>
                      <p style={{ fontSize:11, color:'#9ca3af', margin:'0 0 4px' }}>
                        {item.quantity} · {item.location}
                      </p>
                      {savings.distance && (
                        <div style={{ display:'flex', gap:14 }}>
                          <span className="lh-saving"><Navigation size={10} /> -{savings.distance} km</span>
                          <span className="lh-saving"><Leaf size={10} /> -{savings.emissions} kg CO₂</span>
                        </div>
                      )}
                      {item.review_notes && (
                        <p style={{ fontSize:11, color:'#9ca3af', margin:'4px 0 0', fontStyle:'italic' }}>"{item.review_notes}"</p>
                      )}
                    </div>
                    <p style={{ fontSize:10.5, color:'#9ca3af', flexShrink:0, marginLeft:8 }}>
                      {item.reviewed_at ? new Date(item.reviewed_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default LogisticsHistoryView;