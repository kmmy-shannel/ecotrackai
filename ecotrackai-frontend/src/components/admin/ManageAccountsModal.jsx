import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, UserCheck, UserX, UserPlus, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import managerService from '../../services/manager.service';

/* ── Styles — mirrors mg-* design system from ManagerPage ── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .mam-root, .mam-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes mam-in   { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes mam-fade { from{opacity:0} to{opacity:1} }
  @keyframes mam-spin { to{transform:rotate(360deg)} }

  .mam-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,0.5);
    backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center;
    z-index:9999; padding:20px; animation:mam-fade .2s ease both;
  }
  .mam-card {
    background:#fff; border-radius:22px; width:100%; max-width:520px;
    max-height:88vh; display:flex; flex-direction:column;
    box-shadow:0 24px 64px rgba(26,61,43,0.22);
    animation:mam-in .25s cubic-bezier(.34,1.56,.64,1) both;
    overflow:hidden; border:1px solid rgba(82,183,136,0.16);
  }

  /* Header */
  .mam-header {
    background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 55%,#2d6a4f 100%);
    padding:18px 22px; display:flex; align-items:center; justify-content:space-between;
    flex-shrink:0; position:relative; overflow:hidden;
  }
  .mam-header::after {
    content:''; position:absolute; right:-40px; top:-40px;
    width:130px; height:130px; border-radius:50%;
    background:rgba(255,255,255,0.04); pointer-events:none;
  }
  .mam-header-ico {
    width:34px; height:34px; border-radius:10px;
    background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.14);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .mam-close {
    width:30px; height:30px; border-radius:9px;
    background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.14);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:background .13s; z-index:1; flex-shrink:0;
    outline:none;
  }
  .mam-close:hover { background:rgba(255,255,255,0.2); }

  /* Body */
  .mam-body { flex:1; overflow-y:auto; padding:18px 20px; display:flex; flex-direction:column; gap:12px; }

  /* Create button */
  .mam-btn-create {
    width:100%; display:flex; align-items:center; justify-content:center; gap:7px;
    padding:10px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f);
    color:#fff; border:none; border-radius:13px;
    font-size:13px; font-weight:700; font-family:'Poppins',sans-serif;
    cursor:pointer; transition:opacity .15s, transform .12s;
    box-shadow:0 4px 12px rgba(26,61,43,0.22);
  }
  .mam-btn-create:hover { opacity:.88; transform:translateY(-1px); }

  /* Account row */
  .mam-acct {
    display:flex; align-items:center; gap:11px;
    padding:11px 14px; border-radius:13px;
    border:1px solid rgba(82,183,136,0.14);
    background:#fff; transition:border-color .14s, background .14s;
  }
  .mam-acct:hover { border-color:rgba(82,183,136,0.35); background:#f8fdf9; }
  .mam-acct-av {
    width:38px; height:38px; border-radius:12px;
    background:linear-gradient(135deg,#1a3d2b,#2d6a4f);
    display:flex; align-items:center; justify-content:center;
    font-size:14px; font-weight:800; color:#fff; flex-shrink:0;
  }
  .mam-acct-del {
    width:30px; height:30px; border-radius:9px; border:none;
    background:transparent; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    color:#d1d5db; transition:background .12s, color .12s; flex-shrink:0;
  }
  .mam-acct-del:hover { background:#fee2e2; color:#dc2626; }
  .mam-acct-del:disabled { opacity:.4; cursor:not-allowed; }

  /* Status dot */
  .mam-dot-active   { width:6px; height:6px; border-radius:50%; background:#4ade80; display:inline-block; flex-shrink:0; }
  .mam-dot-inactive { width:6px; height:6px; border-radius:50%; background:#d1d5db; display:inline-block; flex-shrink:0; }

  /* Form fields */
  .mam-lbl { font-size:10.5px; font-weight:700; color:#374151; display:block; margin-bottom:5px; text-transform:uppercase; letter-spacing:.04em; }
  .mam-field {
    width:100%; padding:10px 13px; border:1.5px solid rgba(82,183,136,0.22);
    border-radius:11px; font-size:13px; font-family:'Poppins',sans-serif;
    outline:none; transition:border-color .15s, box-shadow .15s;
    color:#1a3d2b; background:#fafffe;
  }
  .mam-field::placeholder { color:#adb5bd; }
  .mam-field:focus { border-color:#2d6a4f; box-shadow:0 0 0 3px rgba(45,106,79,0.09); background:#fff; }

  /* Role radio */
  .mam-radio {
    display:flex; align-items:center; gap:10px; padding:10px 13px;
    border:1.5px solid rgba(82,183,136,0.16); border-radius:12px;
    cursor:pointer; transition:all .14s; background:#fff;
  }
  .mam-radio:hover { border-color:#52b788; background:#f0faf4; }
  .mam-radio.sel   { border-color:#1a3d2b; background:#d8f3dc; }

  /* Form action buttons */
  .mam-btn-cancel {
    flex:1; padding:10px; border:1.5px solid rgba(82,183,136,0.2);
    border-radius:12px; font-size:13px; font-weight:600;
    color:#6b7280; background:#fff; cursor:pointer;
    transition:background .14s; font-family:'Poppins',sans-serif;
  }
  .mam-btn-cancel:hover { background:#f0faf4; color:#1a3d2b; border-color:#52b788; }
  .mam-btn-submit {
    flex:1; padding:10px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f);
    color:#fff; border-radius:12px; font-size:13px; font-weight:700;
    border:none; cursor:pointer; font-family:'Poppins',sans-serif;
    box-shadow:0 4px 10px rgba(26,61,43,0.22); transition:opacity .15s;
  }
  .mam-btn-submit:hover:not(:disabled) { opacity:.88; }
  .mam-btn-submit:disabled { opacity:.45; cursor:not-allowed; }

  /* Toasts */
  .mam-toast-ok  { background:#d8f3dc; border:1px solid #86efac; color:#166534; border-radius:11px; padding:10px 13px; font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:7px; }
  .mam-toast-err { background:#fee2e2; border:1px solid #fecaca; color:#991b1b; border-radius:11px; padding:10px 13px; font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:7px; }

  /* Spinner */
  .mam-spin { width:18px; height:18px; border-radius:50%; border:2.5px solid #95d5b2; border-top-color:#2d6a4f; animation:mam-spin .65s linear infinite; flex-shrink:0; }

  /* Empty state */
  .mam-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:36px 20px; gap:9px; text-align:center; }

  /* Section divider label */
  .mam-section-label {
    font-size:9.5px; font-weight:800; color:rgba(255,255,255,0.35);
    text-transform:uppercase; letter-spacing:.12em; padding:0 6px;
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('mam-styles')) {
  const el = document.createElement('style');
  el.id = 'mam-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

const ROLE_OPTIONS = [
  { value:'inventory_manager',      label:'Inventory Manager',     icon:'📦', desc:'Manages products & stock' },
  { value:'logistics_manager',      label:'Logistics Manager',     icon:'🚛', desc:'Manages routes & deliveries' },
  { value:'sustainability_manager', label:'Sustainability Manager', icon:'🌿', desc:'Reviews environmental impact' },
  { value:'driver',                 label:'Driver',                icon:'🧭', desc:'Executes delivery routes' },
];

/* ── Confirm Deactivate Modal — same pattern as before, restyled ── */
const ConfirmDeactivateModal = ({ manager, onConfirm, onCancel, loading }) => (
  <div style={{
    position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
    backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
    justifyContent:'center', zIndex:10000, padding:16,
  }}>
    <div style={{
      background:'#fff', borderRadius:20, maxWidth:380, width:'100%',
      overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.25)',
    }}>
      {/* Red header */}
      <div style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)', padding:'16px 20px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <AlertTriangle size={17} style={{ color:'#fff' }} />
        </div>
        <div>
          <p style={{ color:'#fff', fontWeight:800, fontSize:13.5, margin:0, fontFamily:'Poppins,sans-serif' }}>Deactivate Account</p>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:11, margin:0, fontFamily:'Poppins,sans-serif' }}>This action cannot be undone easily</p>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding:'18px 20px' }}>
        <p style={{ fontSize:13, color:'#374151', margin:'0 0 6px', fontFamily:'Poppins,sans-serif' }}>
          Are you sure you want to deactivate{' '}
          <span style={{ fontWeight:800, color:'#111827' }}>{manager?.full_name}</span>?
        </p>
        <p style={{ fontSize:11.5, color:'#9ca3af', margin:'0 0 14px', fontFamily:'Poppins,sans-serif' }}>
          Their account will be set to <span style={{ fontWeight:700, color:'#dc2626' }}>Inactive</span>. All records and history will be preserved.
        </p>
        {/* Manager info pill */}
        <div style={{ background:'#f8fdf9', border:'1px solid rgba(82,183,136,0.16)', borderRadius:12, padding:'10px 13px', display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#1a3d2b,#2d6a4f)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800, flexShrink:0, fontFamily:'Poppins,sans-serif' }}>
            {manager?.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <p style={{ fontSize:12.5, fontWeight:700, color:'#111827', margin:0, fontFamily:'Poppins,sans-serif' }}>{manager?.full_name}</p>
            <p style={{ fontSize:11, color:'#9ca3af', margin:0, fontFamily:'Poppins,sans-serif' }}>{manager?.email}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:9 }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex:1, padding:'10px', border:'1.5px solid rgba(82,183,136,0.2)', borderRadius:12, fontSize:13, fontWeight:600, color:'#6b7280', background:'#fff', cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex:1, padding:'10px', background:'#dc2626', color:'#fff', border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Poppins,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:6, boxShadow:'0 2px 8px rgba(220,38,38,0.25)', opacity: loading ? .6 : 1 }}>
            {loading
              ? <><div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'mam-spin .6s linear infinite' }} /> Deactivating…</>
              : <><Trash2 size={13} /> Yes, Deactivate</>
            }
          </button>
        </div>
      </div>
    </div>
  </div>
);

/* ── Main Modal ── */
const ManageAccountsModal = ({ onClose }) => {
  const [managers,        setManagers]        = useState([]);
  const [showForm,        setShowForm]        = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');
  const [confirmDelete,   setConfirmDelete]   = useState(null);
  const [formData,        setFormData]        = useState({
    username:'', email:'', password:'', fullName:'', role:''
  });

  useEffect(() => { loadManagers(); }, []);

  const loadManagers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await managerService.getAllManagers();
      setManagers(res.data?.managers || res.data?.data || []);
    } catch {
      setError('Failed to load managers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await managerService.createManager(formData);
      setSuccess('Account created successfully!');
      setFormData({ username:'', email:'', password:'', fullName:'', role:'' });
      setShowForm(false);
      loadManagers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const d = err.response?.data;
      const errs = d?.error;
      setError(Array.isArray(errs) && errs.length > 0 ? errs[0] : d?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // ── Same logic as before — opens styled confirm modal ──
  const requestDelete = (manager) => {
    setError('');
    setConfirmDelete(manager);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      await managerService.deleteManager(confirmDelete.user_id);
      setSuccess(`${confirmDelete.full_name}'s account has been deactivated.`);
      setConfirmDelete(null);
      loadManagers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate manager');
      setConfirmDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const roleLabel = (role) => ROLE_OPTIONS.find(r => r.value === role)?.label || role;

  return (
    <div className="mam-root">

      {/* Confirm deactivate modal */}
      {confirmDelete && (
        <ConfirmDeactivateModal
          manager={confirmDelete}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
          loading={deleteLoading}
        />
      )}

      <div className="mam-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="mam-card">

          {/* ── Header ── */}
          <div className="mam-header">
            <div style={{ display:'flex', alignItems:'center', gap:11, position:'relative', zIndex:1 }}>
              <div className="mam-header-ico">
                <Users size={16} style={{ color:'#86efac' }} />
              </div>
              <div>
                <p style={{ color:'#fff', fontWeight:800, fontSize:15, margin:0, letterSpacing:'-.2px' }}>
                  {showForm ? 'Create Account' : 'Manage Accounts'}
                </p>
                <p style={{ color:'rgba(255,255,255,0.45)', fontSize:11, margin:0 }}>
                  {showForm ? 'Fill in the details below' : `${managers.length} account${managers.length !== 1 ? 's' : ''} total`}
                </p>
              </div>
            </div>
            <button className="mam-close" onClick={onClose}>
              <X size={14} style={{ color:'#fff' }} />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="mam-body">

            {/* Toasts */}
            {success && (
              <div className="mam-toast-ok">
                <UserCheck size={14} /> {success}
              </div>
            )}
            {error && (
              <div className="mam-toast-err">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {!showForm ? (
              <>
                {/* Create button */}
                <button className="mam-btn-create" onClick={() => { setShowForm(true); setError(''); }}>
                  <UserPlus size={15} /> Create New Account
                </button>

                {/* Account list */}
                {loading ? (
                  <div className="mam-empty">
                    <div className="mam-spin" />
                    <p style={{ fontSize:13, color:'#9ca3af', margin:0 }}>Loading accounts…</p>
                  </div>
                ) : managers.length === 0 ? (
                  <div className="mam-empty">
                    <div style={{ width:50, height:50, borderRadius:15, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <UserX size={24} style={{ color:'#d1d5db' }} />
                    </div>
                    <p style={{ fontWeight:700, color:'#4b5563', margin:0, fontSize:13 }}>No accounts yet</p>
                    <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>Create your first manager account above.</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {managers.map((mgr) => (
                      <div key={mgr.user_id} className="mam-acct">
                        <div className="mam-acct-av">
                          {mgr.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {mgr.full_name}
                          </p>
                          <p style={{ fontSize:11, fontWeight:600, color:'#2d6a4f', margin:0 }}>
                            {roleLabel(mgr.role)}
                          </p>
                          <p style={{ fontSize:10.5, color:'#9ca3af', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {mgr.email} · @{mgr.username}
                          </p>
                          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                            <span className={mgr.is_active ? 'mam-dot-active' : 'mam-dot-inactive'} />
                            <span style={{ fontSize:10, color:'#9ca3af' }}>{mgr.is_active ? 'Active' : 'Inactive'}</span>
                          </div>
                        </div>
                        {mgr.is_active ? (
                          <button
                            className="mam-acct-del"
                            onClick={() => requestDelete(mgr)}
                            title="Deactivate account"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <span style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', color:'#e5e7eb', flexShrink:0 }}>
                            <Trash2 size={14} />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ── Create Form — matches ManagerPage form exactly ── */
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:13 }}>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label className="mam-lbl">Full Name *</label>
                    <input type="text" required placeholder="John Doe" className="mam-field"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="mam-lbl">Username *</label>
                    <input type="text" required placeholder="johndoe" className="mam-field"
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="mam-lbl">Email *</label>
                  <input type="email" required placeholder="john@company.com" className="mam-field"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="mam-lbl">Password *</label>
                  <input type="password" required minLength={6} placeholder="Min. 6 characters" className="mam-field"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <div>
                  <label className="mam-lbl" style={{ marginBottom:8 }}>Role *</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    {ROLE_OPTIONS.map(opt => (
                      <label
                        key={opt.value}
                        className={`mam-radio${formData.role === opt.value ? ' sel' : ''}`}
                      >
                        <input
                          type="radio" name="role" required
                          value={opt.value}
                          checked={formData.role === opt.value}
                          onChange={e => setFormData({...formData, role: e.target.value})}
                          style={{ accentColor:'#1a3d2b' }}
                        />
                        <span style={{ fontSize:18 }}>{opt.icon}</span>
                        <div>
                          <p style={{ fontSize:12.5, fontWeight:700, color:'#1a3d2b', margin:0 }}>{opt.label}</p>
                          <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display:'flex', gap:9, paddingTop:4 }}>
                  <button
                    type="button"
                    className="mam-btn-cancel"
                    onClick={() => { setShowForm(false); setError(''); setFormData({ username:'', email:'', password:'', fullName:'', role:'' }); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="mam-btn-submit">
                    {loading
                      ? <span style={{ display:'flex', alignItems:'center', gap:6 }}><div className="mam-spin" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#fff' }} /> Creating…</span>
                      : 'Create Account'
                    }
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAccountsModal;