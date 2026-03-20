import React, { useState } from 'react';
import { X, Package, Sparkles, ThumbsUp, ThumbsDown, Loader, SendHorizonal, MessageSquare, MapPin, Clock, AlertTriangle } from 'lucide-react';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .adm-root, .adm-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }
  @keyframes adm-in  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes adm-pop { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }

  .adm-back { position:fixed;inset:0;background:rgba(8,20,12,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px; }
  .adm-modal { background:#fff;border-radius:22px;box-shadow:0 28px 72px rgba(0,0,0,.22);width:100%;max-width:640px;max-height:90vh;overflow-y:auto;animation:adm-pop .2s cubic-bezier(.34,1.4,.64,1) both; }

  /* Modal header */
  .adm-header { background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%); border-radius:22px 22px 0 0; padding:20px 22px; position:sticky;top:0;z-index:2; }
  .adm-header-hi   { background:linear-gradient(130deg,#450a0a,#991b1b,#dc2626) !important; }
  .adm-header-md   { background:linear-gradient(130deg,#431407,#9a3412,#c2410c) !important; }
  .adm-header-lo   { background:linear-gradient(130deg,#052e16,#14532d,#166534) !important; }

  .adm-body { padding:22px; display:flex; flex-direction:column; gap:18px; }

  /* Section heading inside modal */
  .adm-sec-lbl { font-size:9px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;display:flex;align-items:center;gap:6px;margin-bottom:10px; }

  /* Info grid cells */
  .adm-cell { background:#f8fdf9;border-radius:11px;padding:10px 12px;border:1px solid rgba(82,183,136,0.1); }
  .adm-cell-lbl { font-size:9.5px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px; }
  .adm-cell-val { font-size:13.5px;font-weight:700;color:#111827; }

  /* Days left pill */
  .adm-days-hi { background:#fef2f2;color:#dc2626;border:1px solid #fecaca; }
  .adm-days-md { background:#fffbeb;color:#d97706;border:1px solid #fde68a; }
  .adm-days-lo { background:#d8f3dc;color:#1a3d2b;border:1px solid #86efac; }

  /* AI suggestion */
  .adm-ai-box { background:linear-gradient(135deg,#f0fdf4,#d8f3dc);border:1px solid rgba(82,183,136,0.2);border-radius:13px;padding:14px 15px; }

  /* Textarea */
  .adm-ta { width:100%;padding:10px 12px;border:1.5px solid rgba(82,183,136,0.18);border-radius:11px;font-size:12.5px;resize:none;outline:none;font-family:'Poppins',sans-serif;color:#374151;background:#fff;transition:border-color .15s,box-shadow .15s; }
  .adm-ta:focus { border-color:#2d6a4f;box-shadow:0 0 0 3px rgba(45,106,79,0.09); }
  .adm-ta-warn { border-color:rgba(245,158,11,0.3) !important; }
  .adm-ta-warn:focus { border-color:#d97706 !important; box-shadow:0 0 0 3px rgba(217,119,6,0.09) !important; }

  /* Buttons */
  .adm-btn-approve { flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:11px;background:#1a3d2b;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;transition:background .14s,transform .12s;font-family:'Poppins',sans-serif; }
  .adm-btn-approve:hover { background:#2d6a4f;transform:translateY(-1px); }
  .adm-btn-approve:disabled { opacity:.5;cursor:not-allowed;transform:none; }

  .adm-btn-decline { flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:11px;background:none;border:1.5px solid rgba(220,38,38,0.3);color:#dc2626;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;transition:background .14s;font-family:'Poppins',sans-serif; }
  .adm-btn-decline:hover { background:#fef2f2; }

  .adm-btn-escalate { width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;background:none;border:1.5px solid rgba(245,158,11,0.3);color:#d97706;border-radius:12px;font-size:12.5px;font-weight:700;cursor:pointer;transition:background .14s;font-family:'Poppins',sans-serif; }
  .adm-btn-escalate:hover { background:#fffbeb; }

  .adm-btn-send { flex:1;padding:9px;background:#d97706;color:#fff;border:none;border-radius:10px;font-size:12.5px;font-weight:700;cursor:pointer;transition:background .13s;font-family:'Poppins',sans-serif; }
  .adm-btn-send:hover { background:#b45309; }
  .adm-btn-send:disabled { opacity:.5;cursor:not-allowed; }

  .adm-btn-cc { padding:9px 14px;border:1.5px solid rgba(82,183,136,0.18);border-radius:10px;font-size:12.5px;font-weight:600;color:#6b7280;background:#fff;cursor:pointer;transition:background .13s;font-family:'Poppins',sans-serif; }
  .adm-btn-cc:hover { background:#f0faf4; }

  /* Status banner */
  .adm-status-approved { background:#d8f3dc;border:1px solid #86efac;border-radius:13px;padding:14px; }
  .adm-status-rejected { background:#fef2f2;border:1px solid #fecaca;border-radius:13px;padding:14px; }
  .adm-status-pending_admin { background:#fffbeb;border:1px solid #fde68a;border-radius:13px;padding:14px; }
  .adm-status-pending  { background:#f8fdf9;border:1px solid rgba(82,183,136,0.18);border-radius:13px;padding:14px; }

  /* Escalation sent */
  .adm-escalated { display:flex;align-items:center;gap:8px;padding:11px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px; }

  /* Footer sticky */
  .adm-foot { padding:16px 22px 22px;border-top:1px solid rgba(82,183,136,0.09);position:sticky;bottom:0;background:#fff;border-radius:0 0 22px 22px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('adm-styles')) {
  const el = document.createElement('style');
  el.id = 'adm-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

const ApprovalDetailModal = ({
  approval,
  onClose,
  onDecision,
  onRequestToAdmin,
  submitting,
  readOnly = false,
}) => {
  const [comments,         setComments]         = useState('');
  const [showRequestBox,   setShowRequestBox]   = useState(false);
  const [requestComment,   setRequestComment]   = useState('');
  const [sendingRequest,   setSendingRequest]   = useState(false);
  const [requestSent,      setRequestSent]      = useState(false);

  if (!approval) return null;

  const headerRisk =
    approval.priority === 'HIGH'   ? 'adm-header-hi' :
    approval.priority === 'MEDIUM' ? 'adm-header-md' : '';

  const statusTone = {
    approved:        { cls:'adm-status-approved',      textColor:'#1a3d2b', label:'Approved by Inventory Manager' },
    rejected:        { cls:'adm-status-rejected',      textColor:'#b91c1c', label:'Declined by Inventory Manager' },
    pending_admin:   { cls:'adm-status-pending_admin', textColor:'#b45309', label:'Escalated to Admin — awaiting review' },
    pending:         { cls:'adm-status-pending',       textColor:'#374151', label:'Pending manager review' },
  };
  const currentStatus = statusTone[approval.status] || statusTone.pending;

  const daysCls =
    approval.days_left <= 2 ? 'adm-days-hi' :
    approval.days_left <= 4 ? 'adm-days-md' : 'adm-days-lo';

  const handleRequestToAdmin = async () => {
    if (!onRequestToAdmin) return;
    try {
      setSendingRequest(true);
      await onRequestToAdmin(approval.approval_id || approval.id, requestComment);
      setRequestSent(true);
      setShowRequestBox(false);
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="adm-root adm-back">
      <div className="adm-modal">

        {/* Header */}
        <div className={`adm-header ${headerRisk}`}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 4px' }}>
                Request #{approval.approval_id || approval.id}
              </p>
              <h2 style={{ fontSize:17, fontWeight:900, color:'#fff', margin:'0 0 4px', letterSpacing:'-.3px' }}>Approval Details</h2>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', margin:0 }}>
                Submitted by: <span style={{ fontWeight:700, color:'#86efac' }}>Admin</span>
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              {approval.priority && (
                <span style={{
                  fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:99,
                  background: approval.priority === 'HIGH' ? '#fef2f2' : approval.priority === 'MEDIUM' ? '#fffbeb' : '#d8f3dc',
                  color: approval.priority === 'HIGH' ? '#b91c1c' : approval.priority === 'MEDIUM' ? '#b45309' : '#1a3d2b',
                  border: `1px solid ${approval.priority === 'HIGH' ? '#fecaca' : approval.priority === 'MEDIUM' ? '#fde68a' : '#86efac'}`,
                }}>
                  {approval.priority}
                </span>
              )}
              <button
                onClick={onClose}
                style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}
                onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
              >
                <X size={15} style={{ color:'#fff' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="adm-body">

          {/* Product Information */}
          <div>
            <div className="adm-sec-lbl">
              <Package size={12} style={{ color:'#2d6a4f' }} /> Product Information
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div className="adm-cell">
                <div className="adm-cell-lbl">Product</div>
                <div className="adm-cell-val">{approval.product_name}</div>
              </div>
              <div className="adm-cell">
                <div className="adm-cell-lbl">Quantity</div>
                <div className="adm-cell-val">{approval.quantity}</div>
              </div>
              <div className="adm-cell">
                <div className="adm-cell-lbl" style={{ display:'flex', alignItems:'center', gap:4 }}><MapPin size={9} />Location</div>
                <div className="adm-cell-val">{approval.location}</div>
              </div>
              <div className="adm-cell">
                <div className="adm-cell-lbl">Risk Level</div>
                <span style={{
                  display:'inline-block', fontSize:11, fontWeight:800, padding:'2px 10px', borderRadius:99,
                  background: approval.risk_level === 'HIGH' ? '#fef2f2' : approval.risk_level === 'MEDIUM' ? '#fffbeb' : '#d8f3dc',
                  color: approval.risk_level === 'HIGH' ? '#b91c1c' : approval.risk_level === 'MEDIUM' ? '#b45309' : '#1a3d2b',
                }}>
                  {approval.risk_level}
                </span>
              </div>
              <div className="adm-cell" style={{ gridColumn:'span 2' }}>
                <div className="adm-cell-lbl" style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={9} />Days Remaining</div>
                <span style={{ display:'inline-block', fontSize:12, fontWeight:800, padding:'3px 12px', borderRadius:99 }} className={daysCls}>
                  {approval.days_left} days left
                </span>
              </div>
            </div>
          </div>

          {/* AI Suggestion */}
          {approval.ai_suggestion && (
            <div>
              <div className="adm-sec-lbl">
                <Sparkles size={12} style={{ color:'#2d6a4f' }} /> AI Suggestion
              </div>
              <div className="adm-ai-box">
                <p style={{ fontSize:13, color:'#1a3d2b', margin:0, lineHeight:1.6, fontStyle:'italic' }}>"{approval.ai_suggestion}"</p>
              </div>
            </div>
          )}

          {/* Decision area */}
          {approval.status === 'pending' && !readOnly ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:6 }}>
                  Your Decision Note (optional)
                </label>
                <textarea
                  className="adm-ta"
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  rows={3}
                  placeholder="Add a note about your decision…"
                />
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button
                  className="adm-btn-approve"
                  onClick={() => onDecision(approval.approval_id || approval.id, 'approved', comments)}
                  disabled={submitting || sendingRequest}
                >
                  {submitting ? <Loader size={14} style={{ animation:'adm-spin .7s linear infinite' }} /> : <ThumbsUp size={14} />}
                  Approve
                </button>
                <button
                  className="adm-btn-decline"
                  onClick={() => onDecision(approval.approval_id || approval.id, 'declined', comments)}
                  disabled={submitting || sendingRequest}
                >
                  {submitting ? <Loader size={14} /> : <ThumbsDown size={14} />}
                  Decline
                </button>
              </div>

              {/* Escalate to admin */}
              {!requestSent && onRequestToAdmin ? (
                <div>
                  <button className="adm-btn-escalate" onClick={() => setShowRequestBox(!showRequestBox)} disabled={submitting}>
                    <SendHorizonal size={13} />
                    Request Admin Review
                  </button>
                  {showRequestBox && (
                    <div style={{ marginTop:10, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'13px 14px', display:'flex', flexDirection:'column', gap:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <AlertTriangle size={12} style={{ color:'#d97706' }} />
                        <span style={{ fontSize:11, fontWeight:700, color:'#b45309' }}>Explain why Admin review is needed:</span>
                      </div>
                      <textarea
                        className="adm-ta adm-ta-warn"
                        rows={2}
                        value={requestComment}
                        onChange={e => setRequestComment(e.target.value)}
                        placeholder="e.g. Requires higher-level approval, unsure about quantity…"
                      />
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="adm-btn-send" onClick={handleRequestToAdmin} disabled={sendingRequest}>
                          {sendingRequest ? 'Sending…' : 'Send to Admin'}
                        </button>
                        <button className="adm-btn-cc" onClick={() => { setShowRequestBox(false); setRequestComment(''); }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : onRequestToAdmin && requestSent ? (
                <div className="adm-escalated">
                  <SendHorizonal size={13} style={{ color:'#d97706', flexShrink:0 }} />
                  <p style={{ fontSize:12.5, fontWeight:600, color:'#b45309', margin:0 }}>Request sent to Admin — awaiting their review.</p>
                </div>
              ) : null}
            </div>
          ) : (
            /* Read-only / already decided status */
            <div className={currentStatus.cls}>
              <p style={{ fontWeight:800, fontSize:13, color:currentStatus.textColor, margin:0 }}>{currentStatus.label}</p>
              {readOnly && approval.status === 'pending' && (
                <p style={{ fontSize:12, color:'#6b7280', margin:'5px 0 0' }}>Read-only mode — inventory managers perform final approve/decline.</p>
              )}
              {approval.review_notes && (
                <p style={{ fontSize:12, color:'#6b7280', margin:'5px 0 0' }}>Note: "{approval.review_notes}"</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ApprovalDetailModal;