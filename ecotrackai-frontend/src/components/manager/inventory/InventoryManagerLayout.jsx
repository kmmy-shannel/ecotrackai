import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Pending Approvals', view: 'dashboard' },
  { icon: ClipboardList,   label: 'History',           view: 'history'   },
];

const InventoryManagerLayout = ({
  children, currentPage, user, activeView, onViewChange,
  pendingCount = 0,   // ← optional badge count passed from page
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const displayName = user?.fullName || user?.full_name || user?.name || 'Inventory Manager';

  const handleLogout = async () => {
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex">

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <img
            src="/logo.jpg"
            alt="EcoTrackAI"
            className="w-10 h-10 rounded-xl shadow-md object-cover"
          />
          <div>
            <h1 className="text-sm font-bold text-gray-800">ECO-TRACKAI</h1>
            <p className="text-xs text-emerald-600 font-medium">Inventory Manager</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 font-semibold mb-4 uppercase tracking-wider">Menu</p>

        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon   = item.icon;
            const active = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onViewChange(item.view)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                  active
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-semibold shadow-sm border-l-4 border-green-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon size={20} className={active ? 'text-green-500' : 'text-gray-400'} />
                <span className="flex-1 text-sm">{item.label}</span>

                {/* Badge — only on Pending tab when there are items */}
                {item.view === 'dashboard' && pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="pt-6 border-t border-gray-200 mt-auto">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all text-left group"
          >
            <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            <span className="text-sm group-hover:text-red-600 transition-colors">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
            {currentPage}
          </h1>
          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <p className="text-sm font-medium text-gray-700">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-sm">
                {displayName?.charAt(0) || 'I'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>

      {/* ── Logout Modal ─────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <LogOut size={26} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold mb-1 text-gray-800">Log out</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to end your session?
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm shadow-md"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagerLayout;