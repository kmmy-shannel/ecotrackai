import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut, Map, Truck } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import UserProfileModal from '../../UserProfileModal';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .lml-root, .lml-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes lml-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lml-spin { to{transform:rotate(360deg)} }

  .lml-shell { display:flex; min-height:100vh; background:linear-gradient(135deg,#f0fdf4 0%,#fff 50%,#f0fdf4 100%); }

  /* Sidebar — sticky fix applied here */
  .lml-sidebar {
    width:240px; flex-shrink:0;
    background:linear-gradient(180deg,#0f2419 0%,#1a3d2b 60%,#2d6a4f 100%);
    display:flex; flex-direction:column; padding:24px 16px;
    box-shadow:4px 0 24px rgba(26,61,43,0.18);
    position:sticky; top:0; height:100vh; overflow-y:auto;
  }

  .lml-logo-wrap { display:flex; align-items:center; gap:10px; margin-bottom:32px; padding:0 4px; }
  .lml-logo-img  { width:38px; height:38px; border-radius:11px; object-fit:cover; box-shadow:0 2px 10px rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.12); }
  .lml-logo-text { font-size:13px; font-weight:900; color:#fff; letter-spacing:.04em; }

  .lml-menu-label { font-size:9.5px; font-weight:800; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:.12em; margin-bottom:8px; padding:0 8px; }

  .lml-nav { display:flex; flex-direction:column; gap:3px; flex:1; }
  .lml-nav-item { width:100%; display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:13px; border:none; cursor:pointer; font-size:12.5px; font-weight:600; transition:background .15s,transform .12s; background:transparent; color:rgba(255,255,255,0.55); text-align:left; position:relative; font-family:'Poppins',sans-serif; }
  .lml-nav-item:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.85); transform:translateX(2px); }
  .lml-nav-item.active { background:rgba(255,255,255,0.12); color:#fff; font-weight:700; border:1px solid rgba(255,255,255,0.12); box-shadow:0 2px 8px rgba(0,0,0,0.12); }
  .lml-nav-item.active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); width:3px; height:18px; background:#86efac; border-radius:0 3px 3px 0; }

  .lml-logout { display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; border-radius:13px; border:none; cursor:pointer; background:transparent; color:rgba(255,255,255,0.4); font-size:12.5px; font-weight:600; font-family:'Poppins',sans-serif; transition:background .15s,color .15s; margin-top:8px; }
  .lml-logout:hover { background:rgba(239,68,68,0.15); color:#fca5a5; }

  .lml-main { flex:1; display:flex; flex-direction:column; min-width:0; }

  .lml-header { background:#fff; border-bottom:1px solid rgba(82,183,136,0.15); padding:16px 28px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 2px 12px rgba(26,61,43,0.06); }
  .lml-header-title { font-size:18px; font-weight:900; color:#1a3d2b; letter-spacing:-.3px; }
  .lml-avatar { width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#fff; box-shadow:0 3px 10px rgba(26,61,43,0.25); }

  .lml-content { flex:1; overflow:auto; padding:24px 28px; animation:lml-in .3s ease both; }
`;

if (typeof document !== 'undefined' && !document.getElementById('lml-styles')) {
  const el = document.createElement('style');
  el.id = 'lml-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Pending Approvals', view: 'dashboard' },
  { icon: Truck,           label: 'Driver Monitor',    view: 'drivers'   },
  { icon: Map,             label: 'Map',               view: 'map'       },
  { icon: ClipboardList,   label: 'History',           view: 'history'   },
];

const LogisticsManagerLayout = ({ children, currentPage, user, activeView, onViewChange }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutModal,  setShowLogoutModal]  = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const displayName = user?.fullName || user?.full_name || user?.name || 'Logistics Manager';
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = async () => {
    try { await logout(); }
    finally { navigate('/login', { replace: true }); }
  };

  return (
    <div className="lml-root lml-shell">

      {/* Sidebar */}
      <aside className="lml-sidebar">
        <div className="lml-logo-wrap">
          <img src="/logo.jpg" alt="EcoTrackAI" className="lml-logo-img" />
          <span className="lml-logo-text">ECO-TRACKAI</span>
        </div>

        <p className="lml-menu-label">Menu</p>

        <nav className="lml-nav">
          {NAV_ITEMS.map((item) => {
            const Icon   = item.icon;
            const active = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onViewChange(item.view)}
                className={`lml-nav-item${active ? ' active' : ''}`}
              >
                <Icon size={15} style={{ color: active ? '#86efac' : 'rgba(255,255,255,0.4)', flexShrink:0 }} />
                <span style={{ flex:1 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout triggers modal in root — not inside sidebar */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:12, marginTop:8 }}>
          <button className="lml-logout" onClick={() => setShowLogoutModal(true)}>
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="lml-main">
        <header className="lml-header">
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 2px' }}>
              Logistics Manager
            </p>
            <h1 className="lml-header-title">{currentPage}</h1>
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
              <p style={{ fontSize:13, fontWeight:700, color:'#1a3d2b', margin:0 }}>{displayName}</p>
              <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>{user?.email}</p>
            </div>
            <div className="lml-avatar">{initials}</div>
          </button>
        </header>

        <div className="lml-content">{children}</div>
      </main>

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

export default LogisticsManagerLayout;