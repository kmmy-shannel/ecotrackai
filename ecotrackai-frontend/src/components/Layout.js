import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Truck, AlertTriangle, 
  Leaf, Users, Brain, Award, // Changed Wrench to Brain
  Settings, LogOut
} from 'lucide-react';
import authService from '../services/auth.service';

const Layout = ({ children, currentPage, user }) => {
  const navigate = useNavigate();
  const location = useLocation(); // Add this to get current path

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Package, label: 'Products', path: '/products' },
    { icon: Truck, label: 'Deliveries', path: '/deliveries' },
    { icon: AlertTriangle, label: 'Alerts', path: '/alerts' },
    { icon: Leaf, label: 'Carbon', path: '/carbon' },
    { icon: Users, label: 'Managers', path: '/managers' },
    { icon: Brain, label: 'AI Tools', path: '/ai-tools' }, // Changed from Wrench to Brain
    { icon: Award, label: 'EcoScore', path: '/ecoscore' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <img 
            src="/logo.jpg" 
            alt="EcoTrackAI Logo" 
            className="w-10 h-10 rounded-xl shadow-md object-cover"
          />
          <h1 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            ECO-TRACKAI
          </h1>
        </div>

        {/* Menu Label */}
        <p className="text-xs text-gray-500 font-semibold mb-4 uppercase tracking-wider">Menu</p>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Use location.pathname instead of currentPage for accurate matching
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-semibold shadow-sm border-l-4 border-green-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-green-500' : 'text-gray-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Menu */}
        <div className="space-y-1 pt-6 border-t border-gray-200 mt-auto">
          <button
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
              location.pathname === '/settings'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-semibold shadow-sm border-l-4 border-green-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings size={20} className={location.pathname === '/settings' ? 'text-green-500' : 'text-gray-400'} />
            <span>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl transition-all group"
          >
            <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            <span className="group-hover:text-red-600 transition-colors">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
              {currentPage}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <p className="text-sm font-medium text-gray-700">{user?.fullName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-sm">
                {user?.fullName?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;