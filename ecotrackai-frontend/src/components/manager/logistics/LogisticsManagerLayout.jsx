import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, LogOut, Truck } from 'lucide-react';
import authService from '../../../services/auth.service';

const NavItem = ({ Icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all ${
      active
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-semibold shadow-sm border-l-4 border-green-500'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
    }`}
  >
    <Icon size={20} className={active ? 'text-green-500' : 'text-gray-400'} />
    <span>{label}</span>
  </div>
);

const LogoutConfirmModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <LogOut size={26} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Log out?</h3>
        <p className="text-sm text-gray-500 mb-6">Are you sure you want to log out?</p>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm shadow-md">Yes, Log out</button>
        </div>
      </div>
    </div>
  </div>
);

const LogisticsManagerLayout = ({ children, currentPage, user, activeView, onViewChange }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const displayName    = user?.fullName || user?.full_name || 'Manager';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    navigate('/');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' },
    { icon: ClipboardList,   label: 'History',   view: 'history'   },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex">
      {/* Sidebar — matches admin dark green style */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm">
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.jpg" alt="EcoTrackAI Logo" className="w-10 h-10 rounded-xl shadow-md object-cover" />
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              ECO-TRACKAI
            </h1>
            <p className="text-xs text-green-700 font-semibold -mt-0.5">Logistics Manager</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 font-semibold mb-4 uppercase tracking-wider">Menu</p>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <NavItem
              key={item.view}
              Icon={item.icon}
              label={item.label}
              active={activeView === item.view}
              onClick={() => onViewChange(item.view)}
            />
          ))}
        </nav>

        <div className="space-y-1 mt-auto pt-6 border-t border-gray-200">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all text-left group"
          >
            <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            <span className="group-hover:text-red-600 transition-colors">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">{currentPage}</h1>
          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <p className="text-sm font-medium text-gray-700">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#1a4d2e] to-green-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-sm">{displayInitial}</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>

      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={() => { setShowLogoutModal(false); handleLogout(); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
};

export default LogisticsManagerLayout;