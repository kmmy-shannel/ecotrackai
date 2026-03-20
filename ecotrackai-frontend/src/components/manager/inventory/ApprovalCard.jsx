import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, CheckCircle2, XCircle, MapPin, Package, Clock } from 'lucide-react';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .ac-root, .ac-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }
  @keyframes ac-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ac-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

  .ac-card { background:#fff; border-radius:16px; border:1px solid rgba(82,183,136,0.14); overflow:hidden; transition:box-shadow .18s,border-color .18s; }
  .ac-card:hover { border-color:rgba(82,183,136,0.3); box-shadow:0 4px 18px rgba(26,61,43,0.09); }

  .ac-header { display:flex; align-items:center; justify-content:space-between; padding:13px 15px; cursor:pointer; transition:background .13s; }
  .ac-header:hover { background:rgba(216,243,220,0.2); }

  .ac-dot-hi { width:8px;height:8px;border-radius:50%;background:#dc2626;animation:ac-pulse 1.8s ease infinite;flex-shrink:0; }
  .ac-dot-md { width:8px;height:8px;border-radius:50%;background:#d97706;animation:ac-pulse 2.4s ease infinite;flex-shrink:0; }
  .ac-dot-lo { width:8px;height:8px;border-radius:50%;background:#40916c;flex-shrink:0; }

  .ac-badge-hi  { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca; }
  .ac-badge-md  { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;background:#fffbeb;color:#b45309;border:1px solid #fde68a; }
  .ac-badge-lo  { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;background:#d8f3dc;color:#2d6a4f;border:1px solid #86efac; }

  .ac-body { border-top:1px solid rgba(82,183,136,0.1); padding:15px; animation:ac-in .18s ease both; }

  .ac-info-cell { background:#f8fdf9; border-radius:11px; padding:10px 12px; border:1px solid rgba(82,183,136,0.1); }
  .ac-info-lbl  { font-size:9px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.07em; display:flex; align-items:center; gap:4px; margin-bottom:4px; }
  .ac-info-val  { font-size:13px; font-weight:700; color:#111827; }

  .ac-ai-box { background:linear-gradient(135deg,#f0fdf4,#d8f3dc); border:1px solid rgba(82,183,136,0.2); border-radius:12px; padding:12px 14px; }
  .ac-ai-label { font-size:9.5px; font-weight:800; color:#2d6a4f; text-transform:uppercase; letter-spacing:.07em; display:flex; align-items:center; gap:5px; margin-bottom:5px; }

  .ac-ta { width:100%; padding:10px 12px; border:1.5px solid rgba(82,183,136,0.18); border-radius:11px; font-size:12.5px; resize:none; outline:none; font-family:'Poppins',sans-serif; color:#374151; background:#fff; transition:border-color .15s,box-shadow .15s; }
  .ac-ta:focus { border-color:#2d6a4f; box-shadow:0 0 0 3px rgba(45,106,79,0.09); }
  .ac-ta-danger:focus { border-color:#dc2626; box-shadow:0 0 0 3px rgba(220,38,38,0.09); }
  .ac-ta-danger { border-color:rgba(239,68,68,0.3) !important; }

  .ac-btn-approve { flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;background:#1a3d2b;color:#fff;border:none;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;transition:background .14s,transform .12s;font-family:'Poppins',sans-serif; }
  .ac-btn-approve:hover { background:#2d6a4f; transform:translateY(-1px); }
  .ac-btn-approve:disabled { opacity:.5; cursor:not-allowed; transform:none; }

  .ac-btn-decline { flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;background:none;border:1.5px solid rgba(220,38,38,0.3);color:#dc2626;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;transition:background .14s;font-family:'Poppins',sans-serif; }
  .ac-btn-decline:hover { background:#fef2f2; }

  .ac-btn-confirm { flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;background:#dc2626;color:#fff;border:none;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;transition:background .13s;font-family:'Poppins',sans-serif; }
  .ac-btn-confirm:hover { background:#b91c1c; }
  .ac-btn-confirm:disabled { opacity:.5; cursor:not-allowed; }

  .ac-btn-cancel { flex:1;padding:10px;border:1.5px solid rgba(82,183,136,0.2);border-radius:11px;font-size:12.5px;font-weight:600;color:#6b7280;background:#fff;cursor:pointer;transition:background .13s;font-family:'Poppins',sans-serif; }
  .ac-btn-cancel:hover { background:#f0faf4; color:#1a3d2b; }
`;

if (typeof document !== 'undefined' && !document.getElementById('ac-styles')) {
  const el = document.createElement('style');
  el.id = 'ac-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

const ApprovalCard = ({ approval, onApprove, onDecline }) => {
  const [expanded,    setExpanded]    = useState(false);
  const [comment,     setComment]     = useState('');
  const [reason,      setReason]      = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [declineMode, setDeclineMode] = useState(false);

  const handleApprove = async () => {
    setSubmitting(true);
    await onApprove(approval.approval_id, comment);
    setSubmitting(false);
  };

  const handleDecline = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onDecline(approval.approval_id, reason);
    setSubmitting(false);
  };

  const rk = approval.risk_level;
  const dotCls   = rk === 'HIGH' ? 'ac-dot-hi' : rk === 'MEDIUM' ? 'ac-dot-md' : 'ac-dot-lo';
  const badgeCls = rk === 'HIGH' ? 'ac-badge-hi' : rk === 'MEDIUM' ? 'ac-badge-md' : 'ac-badge-lo';

  const batchNumber =
    approval.batch_number ||
    (typeof approval.extra_data === 'string'
      ? (() => { try { return JSON.parse(approval.extra_data)?.batchNumber; } catch { return null; } })()
      : approval.extra_data?.batchNumber) ||
    null;

  return (
    <div className="ac-root ac-card">

      {/* Header row */}
      <div className="ac-header" onClick={() => setExpanded(!expanded)}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div className={dotCls} />
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0 }}>{approval.product_name}</p>
            <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>
              {approval.quantity} · {approval.days_left}d left
              {approval.location && ` · ${approval.location}`}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className={badgeCls}>{rk}</span>
          {expanded
            ? <ChevronUp size={14} style={{ color:'#9ca3af' }} />
            : <ChevronDown size={14} style={{ color:'#9ca3af' }} />
          }
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="ac-body">

          {/* Info grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
            <div className="ac-info-cell">
              <div className="ac-info-lbl"><Package size={10} />Quantity</div>
              <div className="ac-info-val">{approval.quantity}</div>
            </div>
            <div className="ac-info-cell">
              <div className="ac-info-lbl"><Clock size={10} />Days Left</div>
              <div className="ac-info-val" style={{ color: approval.days_left <= 2 ? '#dc2626' : approval.days_left <= 4 ? '#d97706' : '#111827' }}>
                {approval.days_left}d
              </div>
            </div>
            <div className="ac-info-cell">
              <div className="ac-info-lbl"><MapPin size={10} />Location</div>
              <div className="ac-info-val" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{approval.location || '—'}</div>
            </div>
          </div>

          {/* Batch number */}
          {batchNumber && (
            <div style={{ background:'#f8fdf9', border:'1px solid rgba(82,183,136,0.1)', borderRadius:10, padding:'8px 12px', display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <span style={{ fontSize:10.5, color:'#9ca3af', fontWeight:700 }}>Batch #</span>
              <span style={{ fontSize:12, fontWeight:800, color:'#374151', fontFamily:'monospace' }}>{batchNumber}</span>
            </div>
          )}

          {/* AI suggestion */}
          {approval.ai_suggestion && (
            <div className="ac-ai-box" style={{ marginBottom:12 }}>
              <div className="ac-ai-label">
                <Sparkles size={11} style={{ color:'#2d6a4f' }} /> AI Recommendation
              </div>
              <p style={{ fontSize:12.5, color:'#1a3d2b', margin:0, lineHeight:1.5, fontStyle:'italic' }}>"{approval.ai_suggestion}"</p>
            </div>
          )}

          {/* Approve note or decline reason */}
          {!declineMode ? (
            <>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:6 }}>
                  Approval Note (optional)
                </label>
                <textarea
                  className="ac-ta"
                  rows={2}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add context for the Admin…"
                />
              </div>
              <div style={{ display:'flex', gap:9 }}>
                <button className="ac-btn-approve" onClick={handleApprove} disabled={submitting}>
                  <CheckCircle2 size={14} />
                  {submitting ? 'Submitting…' : 'Approve'}
                </button>
                <button className="ac-btn-decline" onClick={() => setDeclineMode(true)} disabled={submitting}>
                  <XCircle size={14} />
                  Decline
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, fontWeight:800, color:'#dc2626', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:6 }}>
                  Decline Reason (required)
                </label>
                <textarea
                  className="ac-ta ac-ta-danger"
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="State your reason for declining…"
                />
              </div>
              <div style={{ display:'flex', gap:9 }}>
                <button className="ac-btn-cancel" onClick={() => setDeclineMode(false)}>
                  Cancel
                </button>
                <button className="ac-btn-confirm" onClick={handleDecline} disabled={submitting || !reason.trim()}>
                  <XCircle size={14} />
                  {submitting ? 'Submitting…' : 'Confirm Decline'}
                </button>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
};

export default ApprovalCard;