import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut, Leaf } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

/* ─── Shared style string (mirrors admin db-styles) ─────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .im-root, .im-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes im-in    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes im-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
  @keyframes im-spin  { to{transform:rotate(360deg)} }

  /* Sidebar */
  .im-sidebar {
    width:240px; flex-shrink:0;
    background:linear-gradient(160deg,#0f2419 0%,#1a3d2b 100%);
    display:flex; flex-direction:column;
    padding:24px 16px;
    border-right:1px solid rgba(82,183,136,0.14);
  }
  .im-logo-wrap { display:flex; align-items:center; gap:10px; margin-bottom:28px; padding:0 4px; }
  .im-logo-img  { width:38px; height:38px; border-radius:11px; object-fit:cover; border:1px solid rgba(82,183,136,0.25); }
  .im-logo-name { font-size:12px; font-weight:900; color:#fff; letter-spacing:.04em; }
  .im-logo-role { font-size:10px; color:#52b788; font-weight:600; }

  .im-nav-label { font-size:9px; font-weight:800; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:.12em; margin:0 4px 8px; }

  .im-nav-item {
    display:flex; align-items:center; gap:10px;
    padding:9px 12px; border-radius:11px;
    font-size:12.5px; font-weight:600; color:rgba(255,255,255,0.55);
    background:none; border:none; cursor:pointer; width:100%; text-align:left;
    transition:background .14s, color .14s;
    margin-bottom:3px;
    font-family:'Poppins',sans-serif;
  }
  .im-nav-item:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.85); }
  .im-nav-item.active {
    background:rgba(82,183,136,0.18);
    color:#fff;
    border-left:3px solid #52b788;
    padding-left:9px;
  }
  .im-nav-badge {
    margin-left:auto; background:#dc2626; color:#fff;
    font-size:9px; font-weight:800;
    border-radius:99px; padding:2px 7px; min-width:20px; text-align:center;
  }

  .im-sidebar-rule { height:1px; background:rgba(82,183,136,0.12); margin:16px 0; }

  .im-logout-btn {
    display:flex; align-items:center; gap:10px;
    padding:9px 12px; border-radius:11px;
    font-size:12.5px; font-weight:600; color:rgba(255,255,255,0.45);
    background:none; border:none; cursor:pointer; width:100%; text-align:left;
    transition:background .14s, color .14s;
    font-family:'Poppins',sans-serif;
  }
  .im-logout-btn:hover { background:rgba(239,68,68,0.12); color:#fca5a5; }

  /* Top header */
  .im-header {
    background:#fff;
    border-bottom:1px solid rgba(82,183,136,0.12);
    padding:14px 28px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .im-header-title { font-size:16px; font-weight:900; color:#1a3d2b; letter-spacing:-.2px; }
  .im-avatar {
    width:36px; height:36px; border-radius:50%;
    background:linear-gradient(135deg,#1a3d2b,#2d6a4f);
    display:flex; align-items:center; justify-content:center;
    font-size:13px; font-weight:800; color:#fff; flex-shrink:0;
  }

  /* Main content area */
  .im-main { flex:1; overflow:auto; padding:24px 28px; background:#f8fdf9; }

  /* Logout modal */
  .im-modal-back {
    position:fixed; inset:0; background:rgba(8,20,12,.55);
    display:flex; align-items:center; justify-content:center; z-index:50; padding:16px;
    backdrop-filter:blur(4px);
  }
  .im-modal {
    background:#fff; border-radius:20px;
    box-shadow:0 24px 64px rgba(0,0,0,.2);
    width:100%; max-width:380px; padding:28px;
  }
  .im-modal-icon {
    width:52px; height:52px; border-radius:50%;
    background:#fef2f2; display:flex; align-items:center; justify-content:center;
    margin:0 auto 16px;
  }
  .im-pulse-dot {
    width:6px; height:6px; border-radius:50%; background:#4ade80; display:inline-block;
    animation:im-pulse 2.5s ease infinite; box-shadow:0 0 0 3px rgba(74,222,128,0.18);
    flex-shrink:0;
  }
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
  children, currentPage, user, activeView, onViewChange,
  pendingCount = 0,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const displayName = user?.fullName || user?.full_name || user?.name || 'Inventory Manager';

  const handleLogout = async () => {
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  };

  return (
    <div className="im-root" style={{ minHeight:'100vh', display:'flex', background:'#f8fdf9' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="im-sidebar">

        {/* Logo */}
        <div className="im-logo-wrap">
          <img src="/logo.jpg" alt="EcoTrackAI" className="im-logo-img" />
          <div>
            <div className="im-logo-name">EcoTrackAI</div>
            <div className="im-logo-role">Inventory Manager</div>
          </div>
        </div>

        {/* Online indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 12px', background:'rgba(74,222,128,0.07)', borderRadius:10, marginBottom:20, border:'1px solid rgba(74,222,128,0.12)' }}>
          <div className="im-pulse-dot" />
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:500 }}>System Operational</span>
        </div>

        <div className="im-nav-label">Menu</div>

        <nav style={{ flex:1 }}>
          {NAV_ITEMS.map((item) => {
            const Icon   = item.icon;
            const active = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onViewChange(item.view)}
                className={`im-nav-item${active ? ' active' : ''}`}
              >
                <Icon size={16} style={{ color: active ? '#52b788' : 'rgba(255,255,255,0.4)', flexShrink:0 }} />
                <span style={{ flex:1 }}>{item.label}</span>
                {item.view === 'dashboard' && pendingCount > 0 && (
                  <span className="im-nav-badge">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="im-sidebar-rule" />

        {/* User info in sidebar */}
        <div style={{ padding:'8px 12px', marginBottom:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
        </div>

        <button className="im-logout-btn" onClick={() => setShowLogoutModal(true)}>
          <LogOut size={15} style={{ flexShrink:0 }} />
          Logout
        </button>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Top header */}
        <header className="im-header">
          <div>
            <div style={{ fontSize:9, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:2 }}>
              EcoTrackAI · Inventory Manager
            </div>
            <h1 className="im-header-title">{currentPage}</h1>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:'#1a3d2b' }}>{displayName}</div>
              <div style={{ fontSize:10.5, color:'#9ca3af' }}>{user?.email}</div>
            </div>
            <div className="im-avatar">{displayName?.charAt(0) || 'I'}</div>
          </div>
        </header>

        {/* Page content */}
        <main className="im-main">
          {children}
        </main>
      </div>

      {/* ── Logout Modal ─────────────────────────────────────── */}
      {showLogoutModal && (
        <div className="im-modal-back">
          <div className="im-modal">
            <div className="im-modal-icon">
              <LogOut size={24} style={{ color:'#dc2626' }} />
            </div>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:800, color:'#1a3d2b', margin:'0 0 6px' }}>Log out?</h3>
              <p style={{ fontSize:13, color:'#9ca3af', margin:0 }}>Are you sure you want to end your session?</p>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{ flex:1, padding:'11px', border:'1.5px solid rgba(82,183,136,0.2)', borderRadius:12, fontSize:13, fontWeight:600, color:'#6b7280', background:'#fff', cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'background .13s' }}
                onMouseOver={e => e.currentTarget.style.background='#f0faf4'}
                onMouseOut={e => e.currentTarget.style.background='#fff'}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{ flex:1, padding:'11px', background:'#dc2626', border:'none', borderRadius:12, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'Poppins,sans-serif', transition:'background .13s' }}
                onMouseOver={e => e.currentTarget.style.background='#b91c1c'}
                onMouseOut={e => e.currentTarget.style.background='#dc2626'}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagerLayout;