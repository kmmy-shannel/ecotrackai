import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  AlertTriangle, 
  Leaf, 
  Users, 
  Award, 
  Settings,
  LogOut
} from 'lucide-react';

const Navigation = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',  path: '/dashboard' },
    { icon: Package,         label: 'Products',   path: '/products' },
    { icon: Truck,           label: 'Deliveries', path: '/deliveries' },
    { icon: AlertTriangle,   label: 'Alerts',     path: '/alerts' },
    { icon: Leaf,            label: 'Carbon',     path: '/carbon' },
    { icon: Users,           label: 'Managers',   path: '/managers' },
    { icon: Award,           label: 'EcoScore',   path: '/ecoscore' },
  ];

  const settingsItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Menu Label */}
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

      {/* Bottom Menu */}
      <div className="space-y-1 mt-auto pt-6 border-t border-gray-200">
        {settingsItems.map((item) => (
          <NavItem
            key={item.path}
            Icon={item.icon}
            label={item.label}
            active={isActive(item.path)}
            onClick={() => navigate(item.path)}
          />
        ))}

        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all text-left group"
        >
          <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
          <span className="group-hover:text-red-600 transition-colors">Logout</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <LogoutConfirmModal
          onConfirm={() => { setShowLogoutModal(false); onLogout(); }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
};

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
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <LogOut size={26} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Log out?</h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to log out of your account?
        </p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all text-sm shadow-md"
          >
            Yes, Log out
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default Navigation;