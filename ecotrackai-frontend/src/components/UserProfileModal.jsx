import React, { useState, useEffect } from 'react';
import { X, User, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

/* ─── Styles ──────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .upm-root, .upm-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes upm-in    { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes upm-fade  { from{opacity:0} to{opacity:1} }
  @keyframes upm-spin  { to{transform:rotate(360deg)} }

  .upm-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,0.45); backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center;
    z-index:9999; padding:20px; animation:upm-fade .2s ease both;
  }
  .upm-card {
    background:#fff; border-radius:24px; width:100%; max-width:460px;
    box-shadow:0 24px 64px rgba(26,61,43,0.22), 0 4px 16px rgba(0,0,0,0.08);
    animation:upm-in .25s cubic-bezier(.34,1.56,.64,1) both;
    overflow:hidden; border:1px solid rgba(82,183,136,0.16);
  }

  .upm-header {
    background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 55%,#2d6a4f 100%);
    padding:22px 24px 18px; position:relative; overflow:hidden;
  }
  .upm-header::after {
    content:''; position:absolute; right:-30px; top:-30px;
    width:120px; height:120px; border-radius:50%;
    background:rgba(255,255,255,0.04); pointer-events:none;
  }
  .upm-avatar {
    width:52px; height:52px; border-radius:16px;
    background:linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08));
    display:flex; align-items:center; justify-content:center;
    border:2px solid rgba(255,255,255,0.18); margin-bottom:10px;
    font-size:22px; font-weight:800; color:#fff; letter-spacing:-1px;
  }
  .upm-close {
    position:absolute; top:14px; right:14px; width:30px; height:30px;
    border-radius:9px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.14);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:background .13s; z-index:1;
  }
  .upm-close:hover { background:rgba(255,255,255,0.2); }

  .upm-tabs { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid rgba(82,183,136,0.12); }
  .upm-tab {
    padding:13px; text-align:center; font-size:12.5px; font-weight:700;
    color:#9ca3af; cursor:pointer; transition:all .15s; border:none; background:none;
    display:flex; align-items:center; justify-content:center; gap:6px;
    border-bottom:2.5px solid transparent; font-family:'Poppins',sans-serif;
  }
  .upm-tab.active { color:#1a3d2b; border-bottom-color:#2d6a4f; }
  .upm-tab:hover:not(.active) { color:#374151; background:rgba(240,253,244,0.5); }

  .upm-body { padding:22px 24px 24px; }

  .upm-label { font-size:11.5px; font-weight:700; color:#374151; display:block; margin-bottom:5px; }
  .upm-input-wrap { position:relative; margin-bottom:14px; }
  .upm-input {
    width:100%; padding:11px 14px; border:1.5px solid rgba(82,183,136,0.25);
    border-radius:12px; font-size:13px; font-family:'Poppins',sans-serif;
    outline:none; transition:border-color .15s, box-shadow .15s; color:#111827; background:#fff;
  }
  .upm-input:focus { border-color:#2d6a4f; box-shadow:0 0 0 3px rgba(45,106,79,0.1); }
  .upm-input:disabled { background:#f9fafb; color:#9ca3af; cursor:not-allowed; }
  .upm-input.has-icon { padding-right:40px; }
  .upm-eye {
    position:absolute; right:12px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; color:#9ca3af;
    display:flex; align-items:center; padding:2px;
  }
  .upm-eye:hover { color:#2d6a4f; }

  .upm-otp-input {
    width:100%; padding:14px; border:1.5px solid rgba(82,183,136,0.25);
    border-radius:12px; font-size:26px; font-family:'Poppins',sans-serif;
    font-weight:800; text-align:center; letter-spacing:0.35em;
    outline:none; transition:border-color .15s, box-shadow .15s; color:#1a3d2b; background:#fff;
  }
  .upm-otp-input:focus { border-color:#2d6a4f; box-shadow:0 0 0 3px rgba(45,106,79,0.1); }

  .upm-hint { font-size:11px; color:#9ca3af; margin-top:-10px; margin-bottom:14px; }

  .upm-otp-info {
    background:linear-gradient(135deg,#f0fdf4,#ecfdf5);
    border:1px solid rgba(82,183,136,0.2); border-radius:12px;
    padding:12px 14px; margin-bottom:16px;
    display:flex; align-items:flex-start; gap:9px;
  }

  .upm-resend-row {
    display:flex; align-items:center; justify-content:center; gap:6px;
    margin-bottom:14px; font-size:12px; color:#6b7280;
  }
  .upm-resend-btn {
    background:none; border:none; font-family:'Poppins',sans-serif;
    font-size:12px; font-weight:700; color:#2d6a4f; cursor:pointer;
    padding:0; transition:opacity .13s;
  }
  .upm-resend-btn:disabled { opacity:.4; cursor:not-allowed; }
  .upm-resend-btn:hover:not(:disabled) { opacity:.75; }

  .upm-steps { display:flex; align-items:center; gap:6px; margin-bottom:18px; }
  .upm-step-dot { width:8px; height:8px; border-radius:50%; background:rgba(82,183,136,0.2); transition:background .2s; }
  .upm-step-dot.active { background:#2d6a4f; }
  .upm-step-dot.done { background:#86efac; }
  .upm-step-line { flex:1; height:2px; background:rgba(82,183,136,0.15); border-radius:99px; }
  .upm-step-line.done { background:#86efac; }

  .upm-btn {
    width:100%; padding:12px; border-radius:13px; font-size:13px; font-weight:700;
    font-family:'Poppins',sans-serif; cursor:pointer; transition:all .15s;
    display:flex; align-items:center; justify-content:center; gap:7px; border:none;
  }
  .upm-btn-primary {
    background:linear-gradient(135deg,#1a3d2b,#2d6a4f);
    color:#fff; box-shadow:0 3px 10px rgba(26,61,43,0.25);
  }
  .upm-btn-primary:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }
  .upm-btn-primary:disabled { opacity:.45; cursor:not-allowed; transform:none; }
  .upm-btn-ghost { background:#f3f4f6; color:#374151; margin-top:8px; }
  .upm-btn-ghost:hover:not(:disabled) { background:#e5e7eb; }

  .upm-toast-ok  { background:#d8f3dc; border:1px solid #86efac; color:#1a3d2b; border-radius:11px; padding:11px 14px; font-size:12.5px; font-weight:600; margin-bottom:14px; display:flex; align-items:center; gap:7px; }
  .upm-toast-err { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; border-radius:11px; padding:11px 14px; font-size:12.5px; font-weight:600; margin-bottom:14px; display:flex; align-items:center; gap:7px; }

  .upm-spin { width:15px; height:15px; border-radius:50%; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; animation:upm-spin .6s linear infinite; flex-shrink:0; }

  .upm-role { display:inline-flex; align-items:center; padding:3px 10px; border-radius:99px; font-size:10px; font-weight:700; background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.8); border:1px solid rgba(255,255,255,0.16); margin-top:4px; text-transform:uppercase; letter-spacing:.06em; }
`;

if (typeof document !== 'undefined' && !document.getElementById('upm-styles')) {
  const el = document.createElement('style');
  el.id = 'upm-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  logistics_manager: 'Logistics Manager',
  inventory_manager: 'Inventory Manager',
  sustainability_manager: 'Sustainability Manager',
  driver: 'Driver',
};

const UserProfileModal = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('details');

  // ── Details state ──────────────────────────────────────
  const [fullName,       setFullName]       = useState(user?.fullName || '');
  const [username,       setUsername]       = useState(user?.username || '');
  const [email,          setEmail]          = useState(user?.email || '');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsMsg,     setDetailsMsg]     = useState(null);

  // ── Password state (3 steps: form → otp → done) ────────
  const [pwStep,          setPwStep]          = useState('form');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]      = useState('');
  const [confirmPassword, setConfirmPassword]  = useState('');
  const [showCurrent,     setShowCurrent]      = useState(false);
  const [showNew,         setShowNew]          = useState(false);
  const [showConfirm,     setShowConfirm]      = useState(false);
  const [otp,             setOtp]              = useState('');
  const [sendingOtp,      setSendingOtp]       = useState(false);
  const [otpLoading,      setOtpLoading]       = useState(false);
  const [resendCooldown,  setResendCooldown]   = useState(0);
  const [passwordLoading, setPasswordLoading]  = useState(false);
  const [passwordMsg,     setPasswordMsg]      = useState(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const initials = (user?.fullName || user?.username || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    setDetailsMsg(null);
    setPasswordMsg(null);
    if (newTab === 'password') {
      setPwStep('form');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setOtp('');
    }
  };

  // ════════════════════════════════════════════════════════
  // DETAILS — Save
  // KEY FIX: No manual authHeaders passed. api.js interceptor
  // auto-attaches Authorization: Bearer <token> on every request.
  // ════════════════════════════════════════════════════════
  const handleSaveDetails = async () => {
    setDetailsMsg(null);
    if (!fullName.trim() || !username.trim() || !email.trim()) {
      setDetailsMsg({ type: 'err', text: 'All fields are required.' });
      return;
    }
    setDetailsLoading(true);
    try {
      const res = await api.put('/auth/profile', { fullName, username, email });
      const updated = res.data?.data?.user || res.data?.data || {};
      updateUser({
        fullName: updated.full_name || fullName,
        username: updated.username  || username,
        email:    updated.email     || email,
      });
      setDetailsMsg({ type: 'ok', text: 'Profile updated successfully!' });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to update profile.';
      setDetailsMsg({ type: 'err', text: msg });
    } finally {
      setDetailsLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // PASSWORD STEP 1 — Validate form then send OTP
  // We use the existing POST /auth/send-otp endpoint.
  // IMPORTANT: Your backend's sendOTP checks email_verified and
  // returns error if already verified. To work around this without
  // changing the backend, we call the forgot-password endpoint
  // which sends an email regardless of verification status.
  // But since forgot-password sends a reset LINK (not an OTP code),
  // we instead use a direct axios call to /auth/send-otp and
  // temporarily reset email_verified via the backend's own flow.
  //
  // SIMPLEST SAFE APPROACH (no backend change):
  // Use POST /auth/forgot-password to trigger an email, then
  // have the user enter the reset token — but that changes UX too much.
  //
  // ACTUAL FIX USED HERE:
  // We call send-otp. If the backend says "already verified",
  // we instruct the user to use Forgot Password from login.
  // For users whose email is NOT yet verified this works fine.
  // For already-verified users (all active users), see note below.
  //
  // NOTE FOR DEVELOPER: To make OTP work for verified users, add
  // one line to your backend auth.service.js sendOTP():
  // Remove the check: if (user.email_verified) return this._fail(...)
  // Or add a new route POST /auth/send-change-password-otp that
  // skips the email_verified check. See Step-by-step instructions.
  // ════════════════════════════════════════════════════════
  const handleRequestOtp = async () => {
    setPasswordMsg(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'All password fields are required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 16) {
      setPasswordMsg({ type: 'err', text: 'Password must be 8–16 characters.' });
      return;
    }
    if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
      setPasswordMsg({ type: 'err', text: 'Password must contain letters and numbers.' });
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMsg({ type: 'err', text: 'New password must be different from your current password.' });
      return;
    }
    setSendingOtp(true);
    try {
      // Call the dedicated change-password OTP route (see backend step below)
      await api.post('/auth/send-change-password-otp', { email: user?.email });
      setPasswordMsg(null);
      setPwStep('otp');
      setResendCooldown(60);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to send verification code.';
      setPasswordMsg({ type: 'err', text: msg });
    } finally {
      setSendingOtp(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // PASSWORD STEP 2 — Verify OTP then change password
  // KEY FIX: api.post() called with ONLY the data object as 2nd arg.
  // Previously the bug was: api.post(url, data, authHeaders)
  // where authHeaders was being treated as axios config,
  // which caused the data to be ignored — backend got empty body.
  // ════════════════════════════════════════════════════════
  const handleVerifyAndChange = async () => {
    setPasswordMsg(null);
    if (!otp || otp.length !== 6) {
      setPasswordMsg({ type: 'err', text: 'Please enter the 6-digit code.' });
      return;
    }
    setPasswordLoading(true);
    try {
      // Step 2a: Verify the OTP code using the dedicated verify route
      await api.post('/auth/verify-change-password-otp', {
        email: user?.email,
        otp,
      });

      // Step 2b: Change the password — NO manual headers, api.js handles it
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setPwStep('done');
      setPasswordMsg(null);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Verification or password change failed.';
      setPasswordMsg({ type: 'err', text: msg });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpLoading(true);
    try {
      await api.post('/auth/send-change-password-otp', { email: user?.email });
      setResendCooldown(60);
      setOtp('');
      setPasswordMsg({ type: 'ok', text: 'A new code has been sent to your email.' });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to resend code.';
      setPasswordMsg({ type: 'err', text: msg });
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="upm-root">
      <div className="upm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="upm-card">

          {/* Header */}
          <div className="upm-header">
            <button className="upm-close" onClick={onClose}>
              <X size={14} color="#fff" />
            </button>
            <div className="upm-avatar">{initials}</div>
            <p style={{ color:'#fff', fontWeight:800, fontSize:16, margin:'0 0 2px', letterSpacing:'-.3px', position:'relative', zIndex:1 }}>
              {user?.fullName || user?.username || 'My Profile'}
            </p>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11.5, margin:0, position:'relative', zIndex:1 }}>
              {user?.email}
            </p>
            <span className="upm-role">{ROLE_LABELS[user?.role] || user?.role}</span>
          </div>

          {/* Tabs */}
          <div className="upm-tabs">
            <button className={`upm-tab${tab === 'details' ? ' active' : ''}`} onClick={() => handleTabSwitch('details')}>
              <User size={14} /> Edit Details
            </button>
            <button className={`upm-tab${tab === 'password' ? ' active' : ''}`} onClick={() => handleTabSwitch('password')}>
              <Lock size={14} /> Change Password
            </button>
          </div>

          {/* Body */}
          <div className="upm-body">

            {/* ══ DETAILS TAB ══ */}
            {tab === 'details' && (
              <>
                {detailsMsg && (
                  <div className={detailsMsg.type === 'ok' ? 'upm-toast-ok' : 'upm-toast-err'}>
                    {detailsMsg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {detailsMsg.text}
                  </div>
                )}
                <label className="upm-label">Full Name</label>
                <div className="upm-input-wrap">
                  <input className="upm-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <label className="upm-label">Username</label>
                <div className="upm-input-wrap">
                  <input className="upm-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your username" />
                </div>
                <label className="upm-label">Email</label>
                <div className="upm-input-wrap">
                  <input className="upm-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" />
                </div>
                <label className="upm-label">Role</label>
                <div className="upm-input-wrap">
                  <input className="upm-input" value={ROLE_LABELS[user?.role] || user?.role || ''} disabled />
                </div>
                <button className="upm-btn upm-btn-primary" onClick={handleSaveDetails} disabled={detailsLoading}>
                  {detailsLoading ? <><div className="upm-spin" /> Saving…</> : 'Save Changes'}
                </button>
              </>
            )}

            {/* ══ PASSWORD TAB ══ */}
            {tab === 'password' && (
              <>
                {pwStep !== 'done' && (
                  <div className="upm-steps">
                    <div className={`upm-step-dot ${pwStep === 'form' ? 'active' : 'done'}`} />
                    <div className={`upm-step-line ${pwStep !== 'form' ? 'done' : ''}`} />
                    <div className={`upm-step-dot ${pwStep === 'otp' ? 'active' : pwStep === 'done' ? 'done' : ''}`} />
                    <div className={`upm-step-line ${pwStep === 'done' ? 'done' : ''}`} />
                    <div className={`upm-step-dot ${pwStep === 'done' ? 'done' : ''}`} />
                  </div>
                )}

                {passwordMsg && (
                  <div className={passwordMsg.type === 'ok' ? 'upm-toast-ok' : 'upm-toast-err'}>
                    {passwordMsg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {passwordMsg.text}
                  </div>
                )}

                {/* Step 1 — Password fields */}
                {pwStep === 'form' && (
                  <>
                    <label className="upm-label">Current Password</label>
                    <div className="upm-input-wrap">
                      <input className="upm-input has-icon" type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
                      <button className="upm-eye" onClick={() => setShowCurrent(v => !v)}>
                        {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <label className="upm-label">New Password</label>
                    <div className="upm-input-wrap">
                      <input className="upm-input has-icon" type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
                      <button className="upm-eye" onClick={() => setShowNew(v => !v)}>
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <p className="upm-hint">8–16 characters, must contain letters and numbers.</p>
                    <label className="upm-label">Confirm New Password</label>
                    <div className="upm-input-wrap">
                      <input className="upm-input has-icon" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                      <button className="upm-eye" onClick={() => setShowConfirm(v => !v)}>
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <button className="upm-btn upm-btn-primary" onClick={handleRequestOtp} disabled={sendingOtp}>
                      {sendingOtp ? <><div className="upm-spin" /> Sending Code…</> : <><Mail size={14} /> Continue — Send Verification Code</>}
                    </button>
                  </>
                )}

                {/* Step 2 — OTP entry */}
                {pwStep === 'otp' && (
                  <>
                    <div className="upm-otp-info">
                      <Mail size={16} style={{ color:'#2d6a4f', flexShrink:0, marginTop:1 }} />
                      <div>
                        <p style={{ fontSize:12.5, fontWeight:700, color:'#1a3d2b', margin:'0 0 2px' }}>Check your email</p>
                        <p style={{ fontSize:11.5, color:'#4b5563', margin:0 }}>
                          We sent a 6-digit code to <strong>{user?.email}</strong>. Enter it below to confirm your password change.
                        </p>
                      </div>
                    </div>
                    <label className="upm-label">Verification Code</label>
                    <div className="upm-input-wrap">
                      <input
                        className="upm-otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        autoFocus
                      />
                    </div>
                    <div className="upm-resend-row">
                      Didn't receive it?{' '}
                      <button className="upm-resend-btn" onClick={handleResendOtp} disabled={resendCooldown > 0 || otpLoading}>
                        {otpLoading ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                      </button>
                    </div>
                    <button className="upm-btn upm-btn-primary" onClick={handleVerifyAndChange} disabled={passwordLoading || otp.length !== 6}>
                      {passwordLoading ? <><div className="upm-spin" /> Verifying…</> : <><ShieldCheck size={14} /> Verify & Change Password</>}
                    </button>
                    <button className="upm-btn upm-btn-ghost" onClick={() => { setPwStep('form'); setPasswordMsg(null); setOtp(''); }}>
                      ← Back
                    </button>
                  </>
                )}

                {/* Step 3 — Success */}
                {pwStep === 'done' && (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'16px 0 8px' }}>
                    <div style={{ width:60, height:60, borderRadius:18, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                      <ShieldCheck size={28} style={{ color:'#1a3d2b' }} />
                    </div>
                    <p style={{ fontSize:16, fontWeight:800, color:'#1a3d2b', margin:'0 0 6px' }}>Password Changed!</p>
                    <p style={{ fontSize:12.5, color:'#6b7280', margin:'0 0 20px', maxWidth:300 }}>
                      Your password has been updated successfully. Use your new password the next time you log in.
                    </p>
                    <button className="upm-btn upm-btn-primary" onClick={onClose} style={{ maxWidth:200 }}>Done</button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;