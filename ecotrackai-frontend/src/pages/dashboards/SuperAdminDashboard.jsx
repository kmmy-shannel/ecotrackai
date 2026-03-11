// ============================================================
// FILE: src/pages/dashboards/SuperAdminDashboard.jsx
// LAYER: View — Super Admin platform dashboard
// STYLE: Matches admin dashboard (white cards, green-800)
// ============================================================

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
import superadminService from '../../services/superadmin.service';
import authService         from '../../services/auth.service';
import catalogService      from '../../services/catalog.service';
import {
  Building2, Activity, BookOpen, Leaf,
  ClipboardList, BarChart3, LogOut, ChevronRight,
  Shield, AlertCircle
} from 'lucide-react';

const TABS = [
  { key: 'registry',  label: 'Business Registry', icon: Building2   },
  { key: 'health',    label: 'System Health',      icon: Activity    },
  { key: 'catalog',   label: 'Product Catalog',    icon: BookOpen    },
  { key: 'ecotrust',  label: 'EcoTrust Config',    icon: Leaf        },
  { key: 'audit',     label: 'Audit Logs',         icon: ClipboardList },
  { key: 'analytics', label: 'Analytics',          icon: BarChart3   },
];

const SuperAdminDashboard = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [activeTab, setActiveTab] = useState('registry');
  const vm = useSuperAdmin();
  const [ecoTrustConfig, setEcoTrustConfig] = useState([]);

  const loadEcoTrustConfig = async () => {
    try {
      const res = await superadminService.getEcoTrustConfig();
      setEcoTrustConfig(res.data?.data?.config || []);
    } catch (err) {
      console.error('Failed to load EcoTrust config', err);
    }
  };

  const handleUpdateEcoTrust = async (actionId, data) => {
    try {
      await superadminService.updateEcoTrustAction(actionId, data);
      await loadEcoTrustConfig();
    } catch (err) {
      console.error('Failed to update EcoTrust action', err);
    }
  };
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'audit')     vm.loadAuditLogs();
    if (tab === 'analytics') vm.loadAnalytics();
    if (tab === 'ecotrust')  vm.loadEcoConfig();
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  // Stat cards — same split-design style as admin dashboard
  const statCards = [
    {
      label: 'Total Businesses',
      value: vm.systemHealth?.total_businesses ?? vm.businesses.length,
    },
    {
      label: 'Active Businesses',
      value: vm.systemHealth?.active_businesses ?? vm.businesses.filter(b => b.status === 'active').length,
    },
    {
      label: 'Alerts Today',
      value: vm.systemHealth?.alerts_today ?? '—',
    },
    {
      label: 'Pending Approvals',
      value: vm.systemHealth?.pending_approvals ?? vm.pendingRegs.length,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm">
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.jpg" alt="EcoTrackAI"
            className="w-10 h-10 rounded-xl shadow-md object-cover" />
          <div>
            <h1 className="text-sm font-bold text-gray-800">ECO-TRACKAI</h1>
            <p className="text-xs text-green-700 font-semibold">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-green-800 text-white shadow-md'
                  : 'text-gray-600 hover:bg-green-50 hover:text-green-800'
              }`}
            >
              <Icon size={18} />
              {label}
              {key === 'registry' && vm.pendingRegs.length > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {vm.pendingRegs.length}
                </span>
              )}
              {activeTab === key && !vm.pendingRegs.length && (
                <ChevronRight size={14} className="ml-auto" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-green-700 to-green-900 rounded-full flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {user?.fullName || user?.username || 'Super Admin'}
              </p>
              <p className="text-xs text-gray-500">Platform Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 p-8 overflow-auto">

        {/* Header */}
        <header className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-6 mb-6 flex items-center justify-between shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {TABS.find(t => t.key === activeTab)?.label}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              EcoTrackAI Platform Management
            </p>
          </div>
          <div className="flex items-center gap-3">
            {vm.pendingRegs.length > 0 && (
              <button
                onClick={() => handleTabChange('registry')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-semibold"
              >
                <AlertCircle size={16} />
                {vm.pendingRegs.length} Pending Registration{vm.pendingRegs.length > 1 ? 's' : ''}
              </button>
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {user?.fullName || user?.username}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-700 to-green-900 rounded-full flex items-center justify-center shadow-md">
              <Shield size={20} className="text-white" />
            </div>
          </div>
        </header>

        {/* Messages */}
        {vm.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {vm.error}
          </div>
        )}
        {vm.success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            {vm.success}
          </div>
        )}

        {/* ── Stat Cards (same split-design as admin dashboard) ─ */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {statCards.map((card, i) => (
            <div key={card.label}
              className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
              <div className="bg-white px-5 pt-5 pb-3">
                <h4 className="text-gray-700 text-xs font-medium uppercase tracking-wide">
                  {card.label}
                </h4>
              </div>
              <div className="bg-green-800 px-5 py-4 flex-1 flex flex-col justify-between">
                <p className="text-white text-4xl font-bold">
                  {vm.loading ? '—' : card.value}
                </p>
                <p className="text-green-100 text-xs flex items-center gap-1">
                  Platform-wide <ChevronRight size={14} className="opacity-70" />
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab Content ──────────────────────────────────────── */}
        {vm.loading ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">Loading platform data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'registry' && (
              <BusinessRegistry
                businesses={vm.businesses}
                pendingRegs={vm.pendingRegs}
                onSuspend={vm.suspendBusiness}
                onReactivate={vm.reactivateBusiness}
                onCreate={vm.createBusiness}
                onApprove={vm.approveBusiness}
                onReject={vm.rejectBusiness}
                createError={vm.error}
              />
            )}
            {activeTab === 'health' && (
              <SystemHealthPanel
                health={vm.systemHealth}
                onRefresh={vm.reload}
              />
            )}
            {activeTab === 'catalog' && (
              <FruitCatalog catalogService={catalogService} />
            )}
            {activeTab === 'ecotrust' && (
             <EcoTrustConfig
             config={ecoTrustConfig}
             onLoad={loadEcoTrustConfig}
             onUpdate={handleUpdateEcoTrust}
           />
            )}
            {activeTab === 'audit' && (
              <AuditViewer
                logs={vm.auditLogs}
                onSearch={vm.loadAuditLogs}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsOverview
                analytics={vm.analytics}
                onLoad={vm.loadAnalytics}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;