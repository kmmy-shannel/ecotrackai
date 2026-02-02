import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  AlertTriangle, 
  Leaf, 
  Users, 
  DollarSign, 
  Brain, 
  Award, 
  FileText,
  Settings,
  LogOut
} from 'lucide-react';

const Navigation = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items with their routes and proper icons
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Package, label: 'Products', path: '/products' },
    { icon: Truck, label: 'Deliveries', path: '/deliveries' },
    { icon: AlertTriangle, label: 'Alerts', path: '/alerts' },
    { icon: Leaf, label: 'Carbon', path: '/carbon' },
    { icon: Users, label: 'Managers', path: '/managers' },
    { icon: DollarSign, label: 'Profit', path: '/profit' },
    { icon: Brain, label: 'AI Tools', path: '/ai-tools' },
    { icon: Award, label: 'EcoScore', path: '/ecoscore' },
    { icon: FileText, label: 'Reports', path: '/reports' },
  ];

  const settingsItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Check if current path matches item path
  const isActive = (path) => {
    return location.pathname === path;
  };

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
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all text-left group"
        >
          <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
          <span className="group-hover:text-red-600 transition-colors">Logout</span>
        </button>
      </div>
    </>
  );
};

// Nav Item Component - Updated to use Icon component
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

export default Navigation;