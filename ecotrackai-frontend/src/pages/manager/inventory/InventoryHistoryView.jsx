import React from 'react';
import { CheckCircle, XCircle, ClipboardList } from 'lucide-react';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .ihv-root, .ihv-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }
  @keyframes ihv-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ihv-slide { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }

  .ihv-stat { background:#fff; border-radius:18px; border:1px solid rgba(82,183,136,0.18); padding:16px 18px; text-align:center; transition:transform .2s,box-shadow .2s; animation:ihv-in .3s ease both; }
  .ihv-stat:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(26,61,43,0.1); }
  .ihv-stat-dk { background:linear-gradient(145deg,#1a3d2b,#2d6a4f) !important; }

  .ihv-panel { background:#fff; border-radius:18px; padding:18px 20px; border:1px solid rgba(82,183,136,0.14); box-shadow:0 2px 12px rgba(26,61,43,0.07); animation:ihv-in .3s ease both; }
  .ihv-rule  { height:1px; background:rgba(82,183,136,0.1); margin:13px 0; }

  .ihv-date-label { font-size:9px; font-weight:800; color:#9ca3af; text-transform:uppercase; letter-spacing:.12em; margin:0 0 10px; padding:0 2px; }

  .ihv-row { background:#fff; border-radius:14px; border:1px solid rgba(82,183,136,0.12); padding:13px 15px; display:flex; align-items:start; gap:12px; transition:border-color .14s,box-shadow .14s; animation:ihv-slide .22s ease both; }
  .ihv-row:hover { border-color:#52b788; box-shadow:0 3px 12px rgba(26,61,43,0.07); }
  .ihv-row-approved { border-left:3px solid #40916c !important; }
  .ihv-row-declined  { border-left:3px solid #dc2626 !important; }

  .ihv-icon { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }

  .ihv-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:99px; font-size:9.5px; font-weight:800; }
  .ihv-badge-approved { background:#d8f3dc; color:#1a3d2b; }
  .ihv-badge-declined { background:#fef2f2; color:#b91c1c; }
  .ihv-badge-hi  { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
  .ihv-badge-md  { background:#fffbeb; color:#b45309; border:1px solid #fde68a; }
  .ihv-badge-lo  { background:#d8f3dc; color:#2d6a4f; border:1px solid #86efac; }
  .ihv-badge-pri { display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:99px;font-size:9px;font-weight:700; }

  .ihv-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:56px 20px; gap:10px; text-align:center; }

  /* Progress bar track */
  .ihv-bar-track { height:6px; background:rgba(82,183,136,0.12); border-radius:99px; overflow:hidden; }
  .ihv-bar-fill  { height:100%; border-radius:99px; background:linear-gradient(to right,#1a3d2b,#2d6a4f); transition:width .7s ease; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ihv-styles')) {
  const el = document.createElement('style');
  el.id = 'ihv-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── HistoryItem ────────────────────────────────────────────────────────────── */
const HistoryItem = ({ item, index }) => {
  const approved = item.status === 'approved';

  const batchNumber =
    item.batch_number ||
    (typeof item.extra_data === 'string'
      ? (() => { try { return JSON.parse(item.extra_data)?.batchNumber; } catch { return null; } })()
      : item.extra_data?.batchNumber) ||
    null;

  const priorityBadgeCls =
    item.priority === 'HIGH'   ? 'ihv-badge-hi' :
    item.priority === 'MEDIUM' ? 'ihv-badge-md' : 'ihv-badge-lo';

  return (
    <div
      className={`ihv-row ${approved ? 'ihv-row-approved' : 'ihv-row-declined'}`}
      style={{ animationDelay:`${index * 0.04}s` }}
    >
      {/* Icon */}
      <div
        className="ihv-icon"
        style={{ background: approved ? '#d8f3dc' : '#fef2f2' }}
      >
        {approved
          ? <CheckCircle size={16} style={{ color:'#40916c' }} />
          : <XCircle    size={16} style={{ color:'#dc2626' }} />}
      </div>

      {/* Content */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:4 }}>
          <span className={`ihv-badge ${approved ? 'ihv-badge-approved' : 'ihv-badge-declined'}`}>
            {approved ? 'Approved' : 'Declined'}
          </span>
          {item.priority && (
            <span className={`ihv-badge-pri ${priorityBadgeCls}`}>
              {item.priority}
            </span>
          )}
        </div>

        <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {item.product_name}
          {item.quantity && (
            <span style={{ fontWeight:400, color:'#9ca3af', fontSize:11, marginLeft:5 }}>({item.quantity})</span>
          )}
        </p>

        {item.location && (
          <p style={{ fontSize:11, color:'#9ca3af', margin:'0 0 2px' }}>Location: {item.location}</p>
        )}

        {batchNumber && (
          <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 2px' }}>
            Batch: <span style={{ fontWeight:800, fontFamily:'monospace', color:'#374151' }}>{batchNumber}</span>
          </p>
        )}

        {item.ai_suggestion && (
          <p style={{ fontSize:11, color:'#9ca3af', margin:'2px 0 0', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            AI: "{item.ai_suggestion}"
          </p>
        )}

        {item.review_notes && (
          <p style={{ fontSize:11, color:'#6b7280', margin:'3px 0 0' }}>
            Note: <span style={{ fontStyle:'italic' }}>"{item.review_notes}"</span>
          </p>
        )}

        <p style={{ fontSize:10.5, color:'#9ca3af', margin:'4px 0 0' }}>
          Decided by:{' '}
          <span style={{ fontWeight:600, color:'#6b7280' }}>
            {item.decided_by_role
              ? item.decided_by_role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
              : 'Inventory Manager'}
          </span>
        </p>
      </div>

      {/* Time + shelf life */}
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <p style={{ fontSize:10.5, color:'#9ca3af', margin:0 }}>
          {item.reviewed_at || item.updated_at
            ? new Date(item.reviewed_at || item.updated_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
            : '—'}
        </p>
        {item.days_left != null && (
          <p style={{ fontSize:11, fontWeight:700, margin:'4px 0 0', color: item.days_left <= 2 ? '#dc2626' : item.days_left <= 4 ? '#d97706' : '#40916c' }}>
            {item.days_left}d shelf life
          </p>
        )}
      </div>
    </div>
  );
};

/* ─── InventoryHistoryView ───────────────────────────────────────────────────── */
const InventoryHistoryView = ({ history = [] }) => {
  const totalApproved = history.filter(h => h.status === 'approved').length;
  const totalDeclined = history.filter(h => h.status === 'rejected' || h.status === 'declined').length;
  const approvalRate  = history.length > 0 ? Math.round((totalApproved / history.length) * 100) : 0;

  const grouped = history.reduce((acc, item) => {
    const dateStr = item.reviewed_at || item.updated_at;
    const key = dateStr
      ? new Date(dateStr).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
      : 'Unknown Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="ihv-root" style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Summary Stat Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {/* Total */}
        <div className="ihv-stat ihv-stat-dk" style={{ animationDelay:'.04s' }}>
          <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(255,255,255,0.5)', margin:'0 0 8px' }}>Total Decisions</p>
          <p style={{ fontSize:38, fontWeight:900, lineHeight:1, letterSpacing:'-1.5px', color:'#fff', margin:'0 0 4px' }}>{history.length}</p>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:0 }}>All time</p>
        </div>
        {/* Approved */}
        <div className="ihv-stat" style={{ animationDelay:'.08s' }}>
          <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'#9ca3af', margin:'0 0 8px' }}>Approved</p>
          <p style={{ fontSize:38, fontWeight:900, lineHeight:1, letterSpacing:'-1.5px', color:'#1a3d2b', margin:'0 0 4px' }}>{totalApproved}</p>
          <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Actions approved</p>
        </div>
        {/* Declined */}
        <div className="ihv-stat ihv-stat-dk" style={{ animationDelay:'.12s' }}>
          <p style={{ fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(255,255,255,0.5)', margin:'0 0 8px' }}>Declined</p>
          <p style={{ fontSize:38, fontWeight:900, lineHeight:1, letterSpacing:'-1.5px', color:'#fff', margin:'0 0 4px' }}>{totalDeclined}</p>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:0 }}>Actions declined</p>
        </div>
      </div>

      {/* ── Approval Rate ── */}
      <div className="ihv-panel">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Approval Rate</h3>
            <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>Approved vs total decisions</p>
          </div>
          <p style={{ fontSize:28, fontWeight:900, color:'#1a3d2b', margin:0, letterSpacing:'-1px' }}>{approvalRate}%</p>
        </div>
        <div className="ihv-rule" />
        <div className="ihv-bar-track">
          <div className="ihv-bar-fill" style={{ width:`${approvalRate}%` }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:7 }}>
          <span style={{ fontSize:10.5, color:'#9ca3af' }}>{totalDeclined} declined</span>
          <span style={{ fontSize:10.5, color:'#9ca3af' }}>{totalApproved} approved</span>
        </div>
      </div>

      {/* ── History List ── */}
      <div className="ihv-panel">
        <div style={{ marginBottom:13 }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:0 }}>Decision Log</h3>
          <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>All past spoilage approval decisions</p>
        </div>
        <div className="ihv-rule" />

        {Object.keys(grouped).length === 0 ? (
          <div className="ihv-empty">
            <div style={{ width:50, height:50, borderRadius:15, background:'#f0faf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <ClipboardList size={24} style={{ color:'#d1d5db' }} />
            </div>
            <p style={{ fontWeight:700, color:'#374151', margin:0, fontSize:13 }}>No approval history yet</p>
            <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>Decisions will appear here after you approve or decline items</p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel} style={{ marginBottom:16 }}>
              <p className="ihv-date-label">{dateLabel}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {items.map((item, i) => (
                  <HistoryItem key={`${dateLabel}-${i}`} item={item} index={i} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default InventoryHistoryView;