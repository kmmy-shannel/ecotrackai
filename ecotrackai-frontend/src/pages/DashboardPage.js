import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';
import Navigation from '../components/Navigation';
import ManagerManagement from '../components/ManagerManagement'; 
import { 
  TrendingUp, Package, Truck, AlertTriangle, 
  DollarSign, Award, ChevronRight, Check, X,
  Users 
} from 'lucide-react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showManagerModal, setShowManagerModal] = useState(false);

  const [stats] = useState({
    totalProducts: 24,
    totalDeliveries: 8,
    totalAlerts: 3,
    profit: 49000,
    ecoScore: 890
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) return null;

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

       
        <Navigation onLogout={handleLogout} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <header className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-6 mb-6 flex items-center justify-between shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user.fullName.split(' ')[0]}!</h2>
            <p className="text-sm text-gray-500 mt-1">Here's what's happening with your eco-tracking today</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-3">
              <p className="text-sm font-medium text-gray-700">{user.fullName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-semibold text-lg">{user.fullName.charAt(0)}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Title & Actions */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">DASHBOARD</h1>
          <div className="flex gap-3">

  {user && user.role === 'admin' && (
    <button
      onClick={() => setShowManagerModal(true)}
      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
    >
      <Users size={20} />
      <span className="font-medium">Manage Accounts</span>
    </button>
  )}

  <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
    <span className="text-xl font-semibold">+</span>
    <span className="font-medium">Add Product</span>
  </button>

  <button className="px-5 py-2.5 bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 font-medium rounded-xl transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
    Plan Route
  </button>

</div>

        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            subtitle="items"
            icon={<Package />}
            color="blue"
          />
          <StatCard
            title="Total Delivery"
            value={stats.totalDeliveries}
            subtitle="Today"
            icon={<Truck />}
            color="purple"
          />
          <StatCard
            title="Total Alerts"
            value={stats.totalAlerts}
            subtitle="Decreased from last week"
            icon={<AlertTriangle />}
            trend="down"
            color="orange"
          />
          <StatCard
            title="Profit"
            value={stats.profit.toLocaleString()}
            subtitle="Increased from last month"
            icon={<DollarSign />}
            trend="up"
            color="green"
          />
          <StatCard
            title="Eco Score"
            value={stats.ecoScore}
            subtitle="Increased from last month"
            icon={<Award />}
            trend="up"
            color="emerald"
          />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Urgent AI Recommendations */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">URGENT AI RECOMMENDATIONS</h3>
              <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full">0 Urgent</span>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 min-h-[300px] flex flex-col justify-between border border-gray-100">
              <div className="text-center text-gray-400 flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Check size={32} className="text-green-600" />
                </div>
                <p className="font-medium">No urgent recommendations</p>
                <p className="text-sm mt-1">Everything is running smoothly!</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors">
                  Review Details
                </button>
                <div className="flex gap-2">
                  <button className="w-9 h-9 bg-green-100 hover:bg-green-500 text-green-600 hover:text-white rounded-full flex items-center justify-center transition-all shadow-sm hover:shadow-md">
                    <Check size={18} />
                  </button>
                  <button className="w-9 h-9 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white rounded-full flex items-center justify-center transition-all shadow-sm hover:shadow-md">
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Overview */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">TODAY'S OVERVIEW</h3>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 min-h-[200px] flex items-center justify-center border border-gray-100">
              <div className="text-center text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <span className="text-3xl">📊</span>
                </div>
                <p className="font-medium">No activities today</p>
                <p className="text-sm mt-1">Start tracking your eco-activities</p>
              </div>
            </div>
          </div>
        </div>
      </main>
       {showManagerModal && (
  <ManagerManagement onClose={() => setShowManagerModal(false)} />
)}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon, trend, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    green: 'from-green-500 to-green-600',
    emerald: 'from-emerald-500 to-emerald-600'
  };

  return (
    <div className="bg-white rounded-2xl p-5 relative shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
          {React.cloneElement(icon, { size: 22, className: 'text-white' })}
        </div>
        <ChevronRight size={20} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
      </div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h4>
      <p className="text-3xl font-bold text-gray-800 mb-1">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
      {trend && (
        <div className={`absolute top-5 right-5 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          <TrendingUp size={18} className={trend === 'down' ? 'rotate-180' : ''} />
          
        </div>
      )}
    

    </div>
  );
};



export default DashboardPage;