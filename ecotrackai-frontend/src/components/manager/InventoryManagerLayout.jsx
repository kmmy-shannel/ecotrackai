import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Settings
} from 'lucide-react';
import authService from '../../services/auth.service';

// ─── Nav Item — exact same style as admin Navigation.jsx ─────────────────────
const NavItem = ({ Icon, label, active, onClick }) => {
  return (
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
};

const ManagerLayout = ({ children, currentPage, user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const getRoleLabel = (role) => {
    const labels = {
      inventory_manager:      'Inventory Manager',
      logistics_manager:      'Logistics Manager',
      sustainability_manager: 'Sustainability Manager',
      finance_manager:        'Finance Manager',
      admin:                  'Administrator'
    };
    return labels[role] || role;
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/inventory-manager' },
  ];

  const isActive = (path) => location.pathname === path;
  const displayName    = user?.fullName || user?.full_name || 'Manager';
  const displayInitial = displayName.charAt(0).toUpperCase();
  const roleLabel      = getRoleLabel(user?.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex">

      {/* ── Sidebar — matches admin sidebar exactly ── */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#1a4d2e] rounded-xl shadow-md flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">ET</span>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              ECO-TRACKAI
            </h1>
            <p className="text-xs text-green-600 font-semibold">{roleLabel}</p>
          </div>
        </div>

       

        {/* Menu label */}
        <p className="text-xs text-gray-400 font-semibold mb-4 uppercase tracking-wider">Menu</p>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              Icon={item.icon}
              label={item.label}
              active={isActive(item.path)}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>

        {/* Bottom */}
        <div className="space-y-1 mt-auto pt-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all text-left group"
          >
            <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            <span className="group-hover:text-red-600 transition-colors">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col">

        {/* Header — matches admin header */}
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
              <span className="text-white font-semibold text-sm">{displayInitial}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ManagerLayout;