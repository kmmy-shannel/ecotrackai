// ============================================================
// FILE: src/pages/manager/logistics/LogisticsManagerPage.jsx
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, LayoutDashboard, Truck, ClipboardList, MapPin } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import authService from '../../../services/auth.service';
import LogisticsDashboardView from './LogisticsDashboardView';
import LogisticsHistoryView    from './LogisticsHistoryView';
import LogisticsDriverMonitorView from './LogisticsDriverMonitorView';
import useLogisticsApprovals   from '../../../hooks/useLogisticsApprovals';

// ── Match admin Layout.js structure exactly ──────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Pending Approvals', icon: LayoutDashboard },
  { id: 'drivers',   label: 'Driver Monitor', icon: Truck },
  { id: 'history',   label: 'History',        icon: ClipboardList },
];

export default function LogisticsManagerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [showLogout, setShowLogout] = useState(false);

  const { pending, history, drivers, stats, loading, error, success,
          approveRoute, declineRoute, refresh } = useLogisticsApprovals();

  const pageTitle = {
    dashboard: 'PENDING APPROVALS',
    drivers:   'DRIVER MONITOR',
    history:   'APPROVAL HISTORY',
  }[activeView] || 'LOGISTICS MANAGER';

  const handleLogout = async () => {
    try { await authService.logout(); } catch (_) {}
    navigate('/');
  };

  return (
    // ── Same outer shell as admin Layout.js ─────────────────
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex">

      {/* Sidebar — identical structure to admin */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.jpg" alt="EcoTrackAI Logo"
            className="w-10 h-10 rounded-xl shadow-md object-cover"
            onError={e => { e.target.style.display='none'; }} />
          <h1 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            ECO-TRACKAI
          </h1>
        </div>

        {/* Menu Label */}
        <p className="text-xs text-gray-500 font-semibold mb-4 uppercase tracking-wider">Menu</p>

        {/* Navigation - UPDATED TO ADMIN STYLE */}
        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeView === id;
            // Show pending badge on dashboard tab
            const badge = id === 'dashboard' && pending.length > 0 ? pending.length : null;
            
            return (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-semibold shadow-sm border-l-4 border-green-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-green-500' : 'text-gray-400'} />
                <span className="text-sm font-medium flex-1">{label}</span>
                {badge && (
                  <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${
                    isActive 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button - UPDATED TO ADMIN STYLE */}
        <button
          onClick={() => setShowLogout(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all group mt-auto"
        >
          <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
          <span className="text-sm font-medium group-hover:text-red-600 transition-colors">Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header — identical structure to admin */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <p className="text-sm font-medium text-gray-700">
                {user?.fullName || user?.full_name || 'Logistics Manager'}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-sm">
                {(user?.fullName || user?.full_name || 'L').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
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

      {/* Logout confirmation modal - UPDATED TO ADMIN STYLE */}
      {showLogout && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <LogOut size={26} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold mb-1">Log out</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to end your session?
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogout(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all text-sm shadow-md"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}