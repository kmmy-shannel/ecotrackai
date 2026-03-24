import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSuperAdmin } from '../../hooks/useSuperAdmin';
import BusinessRegistry    from '../../components/superadmin/BusinessRegistry';
import SystemHealthPanel   from '../../components/superadmin/SystemHealthPanel';
import EcoTrustConfig      from '../../components/superadmin/EcoTrustConfig';
import AuditViewer         from '../../components/superadmin/AuditViewer';
import AnalyticsOverview   from '../../components/superadmin/AnalyticsOverview';
import FruitCatalog        from '../../components/superadmin/FruitCatalog';
import UserProfileModal    from '../../components/UserProfileModal';
import superadminService   from '../../services/superadmin.service';
import authService         from '../../services/auth.service';
import catalogService      from '../../services/catalog.service';
import {
  Building2, Activity, BookOpen, Leaf,
  ClipboardList, BarChart3, LogOut, ChevronRight,
  Shield, AlertCircle
} from 'lucide-react';

/* ── Sidebar styles — matches all other layouts ── */
const SA_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .sa-root, .sa-root * { font-family:'Poppins',sans-serif; box-sizing:border-box; }

  .sa-sidebar {
    width:240px; flex-shrink:0;
    background:linear-gradient(180deg,#0f2419 0%,#1a3d2b 60%,#2d6a4f 100%);
    display:flex; flex-direction:column; padding:24px 16px;
    box-shadow:4px 0 24px rgba(26,61,43,0.18);
    position:sticky; top:0; height:100vh; overflow-y:auto;
  }
  .sa-logo-wrap { display:flex; align-items:center; gap:10px; margin-bottom:32px; padding:0 4px; }
  .sa-logo-img  { width:38px; height:38px; border-radius:11px; object-fit:cover; box-shadow:0 2px 10px rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.12); }
  .sa-logo-text { font-size:13px; font-weight:900; color:#fff; letter-spacing:.04em; }
  .sa-logo-role { font-size:10px; color:#86efac; font-weight:600; margin-top:1px; }

  .sa-menu-label { font-size:9.5px; font-weight:800; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:.12em; margin-bottom:8px; padding:0 8px; }

  .sa-nav-item {
    width:100%; display:flex; align-items:center; gap:10px;
    padding:10px 12px; border-radius:13px; border:none; cursor:pointer;
    font-size:12.5px; font-weight:600; font-family:'Poppins',sans-serif;
    transition:background .15s, transform .12s;
    background:transparent; color:rgba(255,255,255,0.55); text-align:left; position:relative;
  }
  .sa-nav-item:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.85); transform:translateX(2px); }
  .sa-nav-item.active { background:rgba(255,255,255,0.12); color:#fff; font-weight:700; border:1px solid rgba(255,255,255,0.12); box-shadow:0 2px 8px rgba(0,0,0,0.12); }
  .sa-nav-item.active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); width:3px; height:18px; background:#86efac; border-radius:0 3px 3px 0; }

  .sa-badge { margin-left:auto; background:#f97316; color:#fff; font-size:9px; font-weight:800; border-radius:99px; padding:2px 7px; min-width:20px; text-align:center; }

  .sa-logout { display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; border-radius:13px; border:none; cursor:pointer; background:transparent; color:rgba(255,255,255,0.4); font-size:12.5px; font-weight:600; font-family:'Poppins',sans-serif; transition:background .15s,color .15s; }
  .sa-logout:hover { background:rgba(239,68,68,0.15); color:#fca5a5; }

  .sa-avatar { width:38px; height:38px; border-radius:12px; background:linear-gradient(135deg,#1a3d2b,#2d6a4f); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; color:#fff; box-shadow:0 3px 10px rgba(26,61,43,0.25); flex-shrink:0; }
`;

if (typeof document !== 'undefined' && !document.getElementById('sa-styles')) {
  const el = document.createElement('style');
  el.id = 'sa-styles'; el.textContent = SA_STYLES;
  document.head.appendChild(el);
}

const TABS = [
  { key: 'registry',  label: 'All Businesses', icon: Building2    },
  { key: 'health',    label: 'System Health',      icon: Activity     },
  { key: 'catalog',   label: 'Product Catalog',    icon: BookOpen     },
  { key: 'ecotrust',  label: 'EcoTrust Config',    icon: Leaf         },
  { key: 'audit',     label: 'Audit Logs',         icon: ClipboardList },
  { key: 'analytics', label: 'Analytics',          icon: BarChart3    },
];

const SuperAdminDashboard = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['registry', 'health', 'catalog', 'ecotrust', 'audit', 'analytics'];
    return validTabs.includes(hash) ? hash : 'registry';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileModal,setShowProfileModal]= useState(false);
  const vm = useSuperAdmin();
  const [ecoTrustConfig, setEcoTrustConfig] = useState([]);

  const displayName = user?.fullName || user?.username || 'Super Admin';
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  /* ── All original handlers — zero changes ── */
  const loadEcoTrustConfig = async () => {
    try {
      const res = await superadminService.getEcoTrustConfig();
      setEcoTrustConfig(res.data?.data?.config || []);
    } catch (err) { console.error('Failed to load EcoTrust config', err); }
  };

  const handleUpdateEcoTrust = async (actionId, data) => {
    try {
      await superadminService.updateEcoTrustAction(actionId, data);
      await loadEcoTrustConfig();
    } catch (err) { console.error('Failed to update EcoTrust action', err); }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
    if (tab === 'audit')     vm.loadAuditLogs();
    if (tab === 'analytics') vm.loadAnalytics();
    if (tab === 'ecotrust')  loadEcoTrustConfig();
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const statCards = [
    { label: 'Total Businesses',   value: vm.systemHealth?.total_businesses   ?? vm.businesses.length },
    { label: 'Active Businesses',  value: vm.systemHealth?.active_businesses  ?? vm.businesses.filter(b => b.status === 'active').length },
    { label: 'Alerts Today',       value: vm.systemHealth?.alerts_today       ?? '—' },
    { label: 'Pending Approvals',  value: vm.systemHealth?.pending_approvals  ?? vm.pendingRegs.length },
  ];

  return (
    <div className="sa-root" style={{ minHeight:'100vh', display:'flex', background:'linear-gradient(135deg,#f0fdf4 0%,#fff 50%,#f0fdf4 100%)' }}>

      {/* ── Sidebar — dark green, sticky ── */}
      <aside className="sa-sidebar">
        <div className="sa-logo-wrap">
          <img src="/logo.jpg" alt="EcoTrackAI" className="sa-logo-img" />
          <div>
            <div className="sa-logo-text">ECO-TRACKAI</div>
            <div className="sa-logo-role">Super Admin</div>
          </div>
        </div>

        <p className="sa-menu-label">Menu</p>

        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`sa-nav-item${activeTab === key ? ' active' : ''}`}
            >
              <Icon size={15} style={{ color: activeTab === key ? '#86efac' : 'rgba(255,255,255,0.4)', flexShrink:0 }} />
              <span style={{ flex:1 }}>{label}</span>
              {key === 'registry' && vm.pendingRegs.length > 0 && (
                <span className="sa-badge">{vm.pendingRegs.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:12, marginTop:8 }}>
          <button className="sa-logout" onClick={() => setShowLogoutModal(true)}>
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content — all original, zero changes ── */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflowY:'auto' }}>

        {/* Header */}
       {/* Header — matches Sustainability/Admin/Logistics/Inventory layout exactly */}
       <header style={{
          background:'#fff',
          borderBottom:'1px solid rgba(82,183,136,0.15)',
          padding:'16px 28px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          boxShadow:'0 2px 12px rgba(26,61,43,0.06)',
          flexShrink:0,
        }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 2px' }}>
              Super Admin
            </p>
            <h1 style={{ fontSize:18, fontWeight:900, color:'#1a3d2b', letterSpacing:'-.3px', margin:0, textTransform:'uppercase' }}>
              {TABS.find(t => t.key === activeTab)?.label}
            </h1>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {vm.pendingRegs.length > 0 && (
              <button
                onClick={() => handleTabChange('registry')}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 14px', background:'#fff7ed', border:'1px solid #fed7aa', color:'#c2410c', borderRadius:12, fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}
              >
                <AlertCircle size={15} />
                {vm.pendingRegs.length} Pending Registration{vm.pendingRegs.length > 1 ? 's' : ''}
              </button>
            )}

            {/* Clickable profile — identical to all other layouts */}
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
              <div className="sa-avatar">{initials}</div>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex:1, overflowY:'auto', padding:32 }}>

        {/* Messages — original, untouched */}
        {vm.error && (
          <div style={{ marginBottom:16, padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', borderRadius:12, fontSize:13 }}>
            {vm.error}
          </div>
        )}
        {vm.success && (
          <div style={{ marginBottom:16, padding:'12px 16px', background:'#d8f3dc', border:'1px solid #86efac', color:'#1a3d2b', borderRadius:12, fontSize:13 }}>
            {vm.success}
          </div>
        )}

        {/* Stat Cards — original, untouched */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {statCards.map((card) => (
            <div key={card.label} style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(26,61,43,0.07)', border:'1px solid rgba(82,183,136,0.12)', transition:'transform .2s,box-shadow .2s' }}
              onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 10px 26px rgba(26,61,43,0.13)'; }}
              onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 10px rgba(26,61,43,0.07)'; }}
            >
              <div style={{ padding:'16px 20px 10px', background:'#fff' }}>
                <h4 style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'#9ca3af', margin:0 }}>{card.label}</h4>
              </div>
              <div style={{ padding:'12px 20px 16px', background:'linear-gradient(145deg,#1a3d2b,#2d6a4f)' }}>
                <p style={{ fontSize:38, fontWeight:900, color:'#fff', margin:'0 0 4px', lineHeight:1, letterSpacing:'-1.5px' }}>
                  {vm.loading ? '—' : card.value}
                </p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', margin:0, display:'flex', alignItems:'center', gap:4 }}>
                  Platform-wide <ChevronRight size={12} style={{ opacity:.6 }} />
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Content — original, completely untouched */}
        {vm.loading ? (
          <div style={{ background:'#fff', borderRadius:16, padding:32, textAlign:'center', boxShadow:'0 2px 10px rgba(26,61,43,0.07)', border:'1px solid rgba(82,183,136,0.1)' }}>
            <p style={{ color:'#9ca3af', fontSize:13, margin:0 }}>Loading platform data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'registry'  && <BusinessRegistry businesses={vm.businesses} pendingRegs={vm.pendingRegs} onSuspend={vm.suspendBusiness} onReactivate={vm.reactivateBusiness} onCreate={vm.createBusiness} onApprove={vm.approveBusiness} onReject={vm.rejectBusiness} createError={vm.error} />}
            {activeTab === 'health'    && <SystemHealthPanel health={vm.systemHealth} onRefresh={vm.reload} />}
            {activeTab === 'catalog'   && <FruitCatalog catalogService={catalogService} />}
            {activeTab === 'ecotrust'  && <EcoTrustConfig config={ecoTrustConfig} onLoad={loadEcoTrustConfig} onUpdate={handleUpdateEcoTrust} />}
            {activeTab === 'audit'     && <AuditViewer logs={vm.auditLogs} onSearch={vm.loadAuditLogs} />}
            {activeTab === 'analytics' && <AnalyticsOverview analytics={vm.analytics} onLoad={vm.loadAnalytics} />}
          </>
      )}
      </div>
    </main>

      {/* ── Modals at root level — never clipped ── */}
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
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:16 }}>
    <div style={{ background:'#fff', borderRadius:20, maxWidth:360, width:'100%', padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', border:'1px solid rgba(82,183,136,0.1)' }}>
      <div style={{ width:52, height:52, borderRadius:'50%', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
        <LogOut size={24} style={{ color:'#dc2626' }} />
      </div>
      <p style={{ fontSize:16, fontWeight:800, color:'#1a3d2b', textAlign:'center', margin:'0 0 6px' }}>Sign out</p>
      <p style={{ fontSize:12.5, color:'#9ca3af', textAlign:'center', margin:'0 0 24px' }}>Are you sure you want to end your session?</p>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onCancel} style={{ flex:1, padding:11, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', fontSize:13, fontWeight:700, borderRadius:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>Cancel</button>
        <button onClick={onConfirm} style={{ flex:1, padding:11, background:'#dc2626', color:'#fff', fontSize:13, fontWeight:700, borderRadius:12, border:'none', cursor:'pointer', fontFamily:'Poppins,sans-serif', boxShadow:'0 2px 8px rgba(220,38,38,0.25)' }}>Sign out</button>
      </div>
    </div>
  </div>
);

export default SuperAdminDashboard;