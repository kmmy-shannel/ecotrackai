import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Truck, AlertTriangle, Leaf,
  Users, Award, Building2, ClipboardList, LineChart,
  History, Map, Navigation as NavigationIcon, Activity,
  Settings, CheckCircle2, User, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getRoleNavItems } from '../utils/rolePermissions';

const ICONS = {
  layout: LayoutDashboard, box: Package, truck: Truck,
  bell: AlertTriangle, leaf: Leaf, users: Users,
  building: Building2, list: ClipboardList, chart: LineChart,
  history: History, flag: Award, map: Map,
  navigation: NavigationIcon, settings: Settings,
  pulse: Activity, check: CheckCircle2, user: User,
};

const ROLE_LABELS = {
  super_admin: 'Super Admin', admin: 'Admin',
  logistics_manager: 'Logistics Manager',
  inventory_manager: 'Inventory Manager',
  sustainability_manager: 'Sustainability Manager',
  driver: 'Driver',
};

/* ── Injected styles — only affect nav items inside dark sidebar ── */
const NAV_STYLES = `
  .adm-nav-item {
    width:100%; display:flex; align-items:center; gap:10px;
    padding:10px 12px; border-radius:13px; border:none; cursor:pointer;
    font-size:12.5px; font-weight:600; font-family:'Poppins',sans-serif;
    transition:background .15s, transform .12s;
    background:transparent; color:rgba(255,255,255,0.55); text-align:left;
    position:relative;
  }
  .adm-nav-item:hover {
    background:rgba(255,255,255,0.07);
    color:rgba(255,255,255,0.85);
    transform:translateX(2px);
  }
  .adm-nav-item.active {
    background:rgba(255,255,255,0.12);
    color:#fff; font-weight:700;
    border:1px solid rgba(255,255,255,0.12);
    box-shadow:0 2px 8px rgba(0,0,0,0.12);
  }
  .adm-nav-item.active::before {
    content:''; position:absolute; left:0; top:50%;
    transform:translateY(-50%);
    width:3px; height:18px; background:#86efac;
    border-radius:0 3px 3px 0;
  }
  .adm-nav-label {
    font-size:9.5px; font-weight:800;
    color:rgba(255,255,255,0.3);
    text-transform:uppercase; letter-spacing:.12em;
    margin-bottom:8px; padding:0 8px;
  }
  .adm-logout {
    display:flex; align-items:center; gap:10px;
    width:100%; padding:10px 12px; border-radius:13px;
    border:none; cursor:pointer; background:transparent;
    color:rgba(255,255,255,0.4); font-size:12.5px; font-weight:600;
    font-family:'Poppins',sans-serif;
    transition:background .15s, color .15s; margin-top:8px;
  }
  .adm-logout:hover { background:rgba(239,68,68,0.15); color:#fca5a5; }
`;

if (typeof document !== 'undefined' && !document.getElementById('adm-nav-styles')) {
  const el = document.createElement('style');
  el.id = 'adm-nav-styles'; el.textContent = NAV_STYLES;
  document.head.appendChild(el);
}

// ── CHANGE 1: Added onLogoutRequest to props ──────────────────
const Navigation = ({ onLogout, onLogoutRequest }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, logout } = useAuth();
  // ── CHANGE 3a: showLogoutModal state REMOVED ─────────────────

  const navItems = getRoleNavItems(role);

  const isActive = (path) => {
    if (!path) return false;
    const [targetPath, targetQuery] = path.split('?');
    if (location.pathname !== targetPath) return false;
    if (!targetQuery) return true;
    if (!location.search && targetQuery === 'tab=pending') return true;
    const currentQuery = location.search.startsWith('?')
      ? location.search.slice(1) : location.search;
    return currentQuery === targetQuery;
  };

  const handleLogout = async () => {
    await logout();
    if (onLogout) onLogout();
    navigate('/');
  };

  return (
    <>
      <p className="adm-nav-label">Menu</p>

      <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
        {navItems.map((item) => {
          const Icon = ICONS[item.icon] || LayoutDashboard;
          const active = isActive(item.path);
          return (
            <button
              key={`${item.path}-${item.label}`}
              onClick={() => navigate(item.path)}
              className={`adm-nav-item${active ? ' active' : ''}`}
            >
              <Icon size={15} style={{ flexShrink:0,
                color: active ? '#86efac' : 'rgba(255,255,255,0.4)' }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── CHANGE 2: onClick now calls onLogoutRequest from Layout ── */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:12, marginTop:8 }}>
        <button className="adm-logout" onClick={() => onLogoutRequest ? onLogoutRequest() : handleLogout()}>
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>

      {/* ── CHANGE 3b: LogoutConfirmModal render REMOVED from here ── */}
    </>
  );
};

/* ── NavItem kept for any external references ── */
const NavItem = ({ Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`adm-nav-item${active ? ' active' : ''}`}
  >
    <Icon size={15} style={{ flexShrink:0,
      color: active ? '#86efac' : 'rgba(255,255,255,0.4)' }} />
    <span>{label}</span>
  </button>
);

export default Navigation;