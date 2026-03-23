import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut, Leaf } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import UserProfileModal from '../../UserProfileModal';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .im-root, .im-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes im-in    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes im-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
  @keyframes im-spin  { to{transform:rotate(360deg)} }

  /* Sidebar — sticky fix */
  .im-sidebar {
    width:240px; flex-shrink:0;
    background:linear-gradient(180deg,#0f2419 0%,#1a3d2b 60%,#2d6a4f 100%);
    display:flex; flex-direction:column; padding:24px 16px;
    box-shadow:4px 0 24px rgba(26,61,43,0.18);
    position:sticky; top:0; height:100vh; overflow-y:auto;
  }

  .im-logo-wrap { display:flex; align-items:center; gap:10px; margin-bottom:32px; padding:0 4px; }
  .im-logo-img  { width:38px; height:38px; border-radius:11px; object-fit:cover; box-shadow:0 2px 10px rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.12); }
  .im-logo-name { font-size:13px; font-weight:900; color:#fff; letter-spacing:.04em; }

  .im-nav-label { font-size:9.5px; font-weight:800; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:.12em; margin-bottom:8px; padding:0 8px; }

  .im-nav-item {
    display:flex; align-items:center; gap:10px;
    padding:10px 12px; border-radius:13px;
    font-size:12.5px; font-weight:600; color:rgba(255,255,255,0.55);
    background:none; border:none; cursor:pointer; width:100%; text-align:left;
    transition:background .14s, color .14s, transform .12s;
    font-family:'Poppins',sans-serif; position:relative;
  }
  .im-nav-item:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.85); transform:translateX(2px); }
  .im-nav-item.active { background:rgba(255,255,255,0.12); color:#fff; font-weight:700; border:1px solid rgba(255,255,255,0.12); box-shadow:0 2px 8px rgba(0,0,0,0.12); }
  .im-nav-item.active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); width:3px; height:18px; background:#86efac; border-radius:0 3px 3px 0; }

  .im-nav-badge { margin-left:auto; background:#dc2626; color:#fff; font-size:9px; font-weight:800; border-radius:99px; padding:2px 7px; min-width:20px; text-align:center; }

  .im-logout-btn {
    display:flex; align-items:center; gap:10px;
    padding:10px 12px; border-radius:13px;
    font-size:12.5px; font-weight:600; color:rgba(255,255,255,0.4);
    background:none; border:none; cursor:pointer; width:100%;
    transition:background .14s, color .14s;
    font-family:'Poppins',sans-serif;
  }
  .im-logout-btn:hover { background:rgba(239,68,68,0.15); color:#fca5a5; }

  .im-pulse-dot {
    width:6px; height:6px; border-radius:50%; background:#4ade80; display:inline-block;
    animation:im-pulse 2.5s ease infinite; box-shadow:0 0 0 3px rgba(74,222,128,0.18); flex-shrink:0;
  }

  .im-header { background:#fff; border-bottom:1px solid rgba(82,183,136,0.12); padding:16px 28px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(26,61,43,0.06); }
  .im-header-title { font-size:18px; font-weight:900; color:#1a3d2b; letter-spacing:-.3px; }
  .im-avatar { width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#fff; box-shadow:0 3px 10px rgba(26,61,43,0.25); flex-shrink:0; }

  .im-main { flex:1; overflow:auto; padding:24px 28px; background:#f8fdf9; }
`;

if (typeof document !== 'undefined' && !document.getElementById('im-styles')) {
  const el = document.createElement('style');
  el.id = 'im-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Pending Approvals', view: 'dashboard' },
  { icon: ClipboardList,   label: 'History',           view: 'history'   },
];

const InventoryManagerLayout = ({
  children, currentPage, user, activeView, onViewChange, pendingCount = 0,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutModal,  setShowLogoutModal]  = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const displayName = user?.fullName || user?.full_name || user?.name || 'Inventory Manager';
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = async () => {
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  };

  return (
    <div className="im-root" style={{ minHeight:'100vh', display:'flex', background:'#f8fdf9' }}>

      {/* Sidebar */}
      <aside className="im-sidebar">
        <div className="im-logo-wrap">
          <img src="/logo.jpg" alt="EcoTrackAI" className="im-logo-img" />
          <div className="im-logo-name">ECO-TRACKAI</div>
        </div>

        {/* Online indicator — kept exactly as before */}
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 12px', background:'rgba(74,222,128,0.07)', borderRadius:10, marginBottom:20, border:'1px solid rgba(74,222,128,0.12)' }}>
          <div className="im-pulse-dot" />
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:500 }}>System Operational</span>
        </div>

        <div className="im-nav-label">Menu</div>

        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
          {NAV_ITEMS.map((item) => {
            const Icon   = item.icon;
            const active = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onViewChange(item.view)}
                className={`im-nav-item${active ? ' active' : ''}`}
              >
                <Icon size={15} style={{ color: active ? '#86efac' : 'rgba(255,255,255,0.4)', flexShrink:0 }} />
                <span style={{ flex:1 }}>{item.label}</span>
                {item.view === 'dashboard' && pendingCount > 0 && (
                  <span className="im-nav-badge">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout triggers modal at root — not inside sidebar */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:12, marginTop:8 }}>
          <button className="im-logout-btn" onClick={() => setShowLogoutModal(true)}>
            <LogOut size={15} style={{ flexShrink:0 }} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <header className="im-header">
          <div>
            <div style={{ fontSize:9, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:2 }}>
              EcoTrackAI · Inventory Manager
            </div>
            <h1 className="im-header-title">{currentPage}</h1>
          </div>

          {/* Clickable profile — consistent with admin */}
          <button
            onClick={() => setShowProfileModal(true)}
            style={{
              display:'flex', alignItems:'center', gap:12, padding:'6px 10px',
              borderRadius:14, border:'none', background:'none', cursor:'pointer',
              transition:'background .15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(216,243,220,0.5)'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#1a3d2b' }}>{displayName}</div>
              <div style={{ fontSize:11, color:'#9ca3af' }}>{user?.email}</div>
            </div>
            <div className="im-avatar">{initials}</div>
          </button>
        </header>

        <main className="im-main">{children}</main>
      </div>

      {/* ── Modals render at root level — never clipped by sidebar ── */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={() => { setShowLogoutModal(false); handleLogout(); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
};

const LogoutModal = ({ onConfirm, onCancel }) => (
  <div style={{
    position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
    backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
    justifyContent:'center', zIndex:9999, padding:16,
  }}>
    <div style={{
      background:'#fff', borderRadius:20, maxWidth:360, width:'100%',
      padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
      border:'1px solid rgba(82,183,136,0.1)',
    }}>
      <div style={{ width:52, height:52, borderRadius:'50%', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
        <LogOut size={24} style={{ color:'#dc2626' }} />
      </div>
      <p style={{ fontSize:16, fontWeight:800, color:'#1a3d2b', textAlign:'center', margin:'0 0 6px' }}>Log out</p>
      <p style={{ fontSize:12.5, color:'#9ca3af', textAlign:'center', margin:'0 0 24px' }}>Are you sure you want to end your session?</p>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, padding:11, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:13, fontWeight:700, borderRadius:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
          Cancel
        </button>
        <button onClick={onConfirm} style={{ flex:1, padding:11, background:'#dc2626', color:'#fff', fontSize:13, fontWeight:700, borderRadius:12, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', boxShadow:'0 2px 8px rgba(220,38,38,0.25)' }}>
          Log out
        </button>
      </div>
    </div>
  </div>
);

export default InventoryManagerLayout;