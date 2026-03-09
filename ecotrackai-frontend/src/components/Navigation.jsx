import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck,
  AlertTriangle,
  Leaf,
  Users,
  Award,
  Building2,
  ClipboardList,
  LineChart,
  History,
  Map,
  Navigation as NavigationIcon,
  Activity,
  Settings,
  CheckCircle2,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getRoleNavItems } from '../utils/rolePermissions';

const ICONS = {
  layout: LayoutDashboard,
  box: Package,
  truck: Truck,
  bell: AlertTriangle,
  leaf: Leaf,
  users: Users,
  building: Building2,
  list: ClipboardList,
  chart: LineChart,
  history: History,
  flag: Award,
  map: Map,
  navigation: NavigationIcon,
  settings: Settings,
  pulse: Activity,
  check: CheckCircle2,
  user: User
};

const Navigation = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = getRoleNavItems(role);

  const isActive = (path) => {
    if (!path) return false;
    const [targetPath, targetQuery] = path.split('?');
    if (location.pathname !== targetPath) return false;

    if (!targetQuery) return true;
    if (!location.search && targetQuery === 'tab=pending') return true;

    const currentQuery = location.search.startsWith('?')
      ? location.search.slice(1)
      : location.search;
    return currentQuery === targetQuery;
  };

  const handleLogout = async () => {
    await logout();
    if (onLogout) onLogout();
    navigate('/');
  };

  return (
    <>
      <p className="text-xs text-gray-500 font-semibold mb-4 uppercase tracking-wider">Menu</p>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = ICONS[item.icon] || LayoutDashboard;
          return (
            <NavItem
              key={`${item.path}-${item.label}`}
              Icon={Icon}
              label={item.label}
              active={isActive(item.path)}
              onClick={() => navigate(item.path)}
            />
          );
        })}
      </nav>

      <div className="space-y-1 pt-6 border-t border-gray-200 mt-auto">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all text-left group"
        >
          <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
          <span className="group-hover:text-red-600 transition-colors">Logout</span>
        </button>
      </div>

      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={() => {
            setShowLogoutModal(false);
            handleLogout();
          }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
};

const NavItem = ({ Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
      active
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-semibold shadow-sm border-l-4 border-green-500'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
    }`}
  >
    <Icon size={20} className={active ? 'text-green-500' : 'text-gray-400'} />
    <span>{label}</span>
  </button>
);

const LogoutConfirmModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
    <div className="bg-white text-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <LogOut size={26} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold mb-1">Log out</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to log out of your account?
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all text-sm shadow-md"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default Navigation;