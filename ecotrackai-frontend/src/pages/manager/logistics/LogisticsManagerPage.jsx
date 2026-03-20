// ============================================================
// FILE: src/pages/manager/logistics/LogisticsManagerPage.jsx
// UI restyled to match AdminDashboardPage design system
// NO functional changes — only visual/CSS updates
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, LayoutDashboard, Truck, ClipboardList, MapPin, Leaf } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import authService from '../../../services/auth.service';
import LogisticsDashboardView from './LogisticsDashboardView';
import LogisticsHistoryView    from './LogisticsHistoryView';
import LogisticsDriverMonitorView from './LogisticsDriverMonitorView';
import useLogisticsApprovals   from '../../../hooks/useLogisticsApprovals';

/* ─── Shared design-system styles (mirrors AdminDashboardPage) ─────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  .db-root, .db-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  @keyframes db-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes db-slide { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes db-spin  { to{transform:rotate(360deg)} }
  @keyframes db-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

  /* Layout shell */
  .lm-shell { display:flex; min-height:100vh; background:linear-gradient(135deg,#f0fdf4 0%,#fff 50%,#f0fdf4 100%); }

  /* Sidebar */
  .lm-sidebar {
    width:240px; flex-shrink:0;
    background:linear-gradient(180deg,#0f2419 0%,#1a3d2b 60%,#2d6a4f 100%);
    display:flex; flex-direction:column; padding:24px 16px;
    box-shadow:4px 0 24px rgba(26,61,43,0.18);
    position:relative; overflow:hidden;
  }
  .lm-sidebar::before {
    content:''; position:absolute; right:-40px; top:-40px;
    width:140px; height:140px; border-radius:50%;
    background:rgba(255,255,255,0.04); pointer-events:none;
  }
  .lm-sidebar::after {
    content:''; position:absolute; left:-30px; bottom:-30px;
    width:100px; height:100px; border-radius:50%;
    background:rgba(255,255,255,0.03); pointer-events:none;
  }

  /* Logo area */
  .lm-logo-wrap { display:flex; align-items:center; gap:10px; margin-bottom:32px; padding:0 4px; position:relative; z-index:1; }
  .lm-logo-img  { width:38px; height:38px; border-radius:11px; object-fit:cover; box-shadow:0 2px 10px rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.12); }
  .lm-logo-text { font-size:13px; font-weight:900; color:#fff; letter-spacing:.04em; }

  /* Menu label */
  .lm-menu-label { font-size:9.5px; font-weight:800; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:.12em; margin-bottom:8px; padding:0 8px; position:relative; z-index:1; }

  /* Nav items */
  .lm-nav { display:flex; flex-direction:column; gap:3px; flex:1; position:relative; z-index:1; }
  .lm-nav-item {
    width:100%; display:flex; align-items:center; gap:10px;
    padding:10px 12px; border-radius:13px; border:none; cursor:pointer;
    font-size:12.5px; font-weight:600; transition:background .15s,transform .12s;
    background:transparent; color:rgba(255,255,255,0.55); text-align:left;
    position:relative;
  }
  .lm-nav-item:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.85); transform:translateX(2px); }
  .lm-nav-item.active {
    background:rgba(255,255,255,0.12);
    color:#fff; font-weight:700;
    border:1px solid rgba(255,255,255,0.12);
    box-shadow:0 2px 8px rgba(0,0,0,0.12);
  }
  .lm-nav-item.active::before {
    content:''; position:absolute; left:0; top:50%; transform:translateY(-50%);
    width:3px; height:18px; background:#86efac; border-radius:0 3px 3px 0;
  }
  .lm-nav-icon { width:16px; height:16px; flex-shrink:0; }
  .lm-nav-badge {
    margin-left:auto; min-width:20px; height:20px; padding:0 6px;
    background:#dc2626; color:#fff; border-radius:99px;
    font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center;
  }

  /* Logout */
  .lm-logout {
    display:flex; align-items:center; gap:10px; width:100%;
    padding:10px 12px; border-radius:13px; border:none; cursor:pointer;
    background:transparent; color:rgba(255,255,255,0.4); font-size:12.5px; font-weight:600;
    transition:background .15s,color .15s; margin-top:8px; position:relative; z-index:1;
  }
  .lm-logout:hover { background:rgba(239,68,68,0.15); color:#fca5a5; }

  /* Main content area */
  .lm-main { flex:1; display:flex; flex-direction:column; min-width:0; }

  /* Header */
  .lm-header {
    background:#fff; border-bottom:1px solid rgba(82,183,136,0.15);
    padding:16px 28px; display:flex; align-items:center; justify-content:space-between;
    box-shadow:0 2px 12px rgba(26,61,43,0.06);
  }
  .lm-header-title { font-size:18px; font-weight:900; color:#1a3d2b; letter-spacing:-.3px; }
  .lm-header-user  { display:flex; align-items:center; gap:12px; }
  .lm-header-info  { text-align:right; }
  .lm-header-name  { font-size:13px; font-weight:700; color:#1a3d2b; }
  .lm-header-email { font-size:11px; color:#9ca3af; }
  .lm-avatar {
    width:38px; height:38px; border-radius:12px;
    background:linear-gradient(135deg,#1a3d2b,#2d6a4f);
    display:flex; align-items:center; justify-content:center;
    font-size:14px; font-weight:800; color:#fff;
    box-shadow:0 3px 10px rgba(26,61,43,0.25);
  }

  /* Page content wrapper */
  .lm-content { flex:1; overflow:auto; padding:24px 28px; animation:db-in .3s ease both; }

  /* Logout modal */
  .lm-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:50; padding:16px; }
  .lm-modal {
    background:#fff; border-radius:20px; max-width:360px; width:100%; padding:28px;
    box-shadow:0 20px 60px rgba(0,0,0,0.2); border:1px solid rgba(82,183,136,0.1);
    animation:db-in .2s ease both;
  }
  .lm-modal-icon { width:52px; height:52px; border-radius:50%; background:#fef2f2; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
  .lm-modal-title { font-size:16px; font-weight:800; color:#1a3d2b; text-align:center; margin-bottom:6px; }
  .lm-modal-sub   { font-size:12.5px; color:#9ca3af; text-align:center; margin-bottom:24px; }
  .lm-modal-btns  { display:flex; gap:10px; }
  .lm-modal-cancel { flex:1; padding:11px; border:1.5px solid #e5e7eb; background:#fff; color:#374151; font-size:13px; font-weight:700; border-radius:12px; cursor:pointer; transition:background .13s; }
  .lm-modal-cancel:hover { background:#f9fafb; }
  .lm-modal-confirm { flex:1; padding:11px; background:#dc2626; color:#fff; font-size:13px; font-weight:700; border-radius:12px; border:none; cursor:pointer; transition:background .13s; box-shadow:0 2px 8px rgba(220,38,38,0.25); }
  .lm-modal-confirm:hover { background:#b91c1c; }
`;

if (typeof document !== 'undefined' && !document.getElementById('lm-styles')) {
  const el = document.createElement('style');
  el.id = 'lm-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

// ── Nav items (unchanged) ─────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Pending Approvals', icon: LayoutDashboard },
  { id: 'drivers',   label: 'Driver Monitor',    icon: Truck },
  { id: 'history',   label: 'History',           icon: ClipboardList },
];

export default function LogisticsManagerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [showLogout, setShowLogout] = useState(false);

  // ── All original hook / logic — untouched ─────────────────
  const { pending, history, drivers, stats, loading, error, success,
          approveRoute, declineRoute, refresh } = useLogisticsApprovals();

  const pageTitle = {
    dashboard: 'Pending Approvals',
    drivers:   'Driver Monitor',
    history:   'Approval History',
  }[activeView] || 'Logistics Manager';

  const handleLogout = async () => {
    try { await authService.logout(); } catch (_) {}
    navigate('/');
  };
  // ─────────────────────────────────────────────────────────────

  const displayName = user?.fullName || user?.full_name || 'Logistics Manager';

  return (
    <div className="db-root" style={{ display:'flex', minHeight:'100vh', background:'linear-gradient(135deg,#f0fdf4 0%,#fff 50%,#f0fdf4 100%)' }}>

      {/* ── Sidebar ── */}
      <aside className="lm-sidebar">
        {/* Logo */}
        <div className="lm-logo-wrap">
          <img
            src="/logo.jpg" alt="EcoTrackAI"
            className="lm-logo-img"
            onError={e => { e.target.style.display = 'none'; }}
          />
          <span className="lm-logo-text">ECO-TRACKAI</span>
        </div>

        {/* Menu label */}
        <p className="lm-menu-label">Menu</p>

        {/* Nav */}
        <nav className="lm-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeView === id;
            const badge = id === 'dashboard' && pending.length > 0 ? pending.length : null;
            return (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`lm-nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={16} className="lm-nav-icon" />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && <span className="lm-nav-badge">{badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button className="lm-logout" onClick={() => setShowLogout(true)}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="lm-main">
        {/* Header */}
        <header className="lm-header">
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 2px' }}>
              Logistics Manager
            </p>
            <h1 className="lm-header-title">{pageTitle}</h1>
          </div>
          <div className="lm-header-user">
            <div className="lm-header-info">
              <p className="lm-header-name">{displayName}</p>
              <p className="lm-header-email">{user?.email}</p>
            </div>
            <div className="lm-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="lm-content">
          {activeView === 'dashboard' && (
            <LogisticsDashboardView
              pending={pending} history={history} drivers={drivers} stats={stats}
              loading={loading} error={error} success={success}
              approveRoute={approveRoute} declineRoute={declineRoute}
              refresh={refresh}
              onViewChange={setActiveView}
            />
          )}
          {activeView === 'drivers' && (
            <LogisticsDriverMonitorView
              drivers={drivers}
              loading={loading}
              refresh={refresh}
            />
          )}
          {activeView === 'history' && (
            <LogisticsHistoryView history={history} />
          )}
        </div>
      </main>

      {/* ── Logout modal ── */}
      {showLogout && (
        <div className="lm-modal-overlay">
          <div className="lm-modal">
            <div className="lm-modal-icon">
              <LogOut size={24} style={{ color:'#dc2626' }} />
            </div>
            <p className="lm-modal-title">Log out</p>
            <p className="lm-modal-sub">Are you sure you want to end your session?</p>
            <div className="lm-modal-btns">
              <button className="lm-modal-cancel" onClick={() => setShowLogout(false)}>Cancel</button>
              <button className="lm-modal-confirm" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}