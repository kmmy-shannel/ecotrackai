import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import authService from '../services/auth.service';
import { 
  Users, 
  Clock,
  AlertTriangle,
  Truck,
  Leaf,
  Package,
  ChevronRight,
  Plus,
  Eye,
  TrendingUp,
  Calendar,
  MapPin,
  Thermometer,
  Droplets
} from 'lucide-react';

const ManagerPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  if (!user) return null;

  // Sample data for pending approvals
  const pendingApprovals = {
    total: 12,
    byManager: {
      inventory: 7,
      logistics: 3,
      sustainability: 2
    }
  };

  // Sample data for manager accounts
  const managers = [
    { name: 'John Santos', department: 'Inventory Manager', email: 'john.s@ecotrack.com' },
    { name: 'Maria Cruz', department: 'Logistics Manager', email: 'maria.c@ecotrack.com' },
    { name: 'Carlos Reyes', department: 'Sustainability Manager', email: 'carlos.r@ecotrack.com' }
  ];

  // Sample data for pending approvals by department
  const inventoryApprovals = [
    { 
      product: 'Tomatoes', 
      quantity: '50kg', 
      risk: 'HIGH', 
      daysLeft: 2,
      value: '₱8,000',
      location: 'Cold Storage A',
      temperature: 25.5,
      humidity: 65
    },
    { 
      product: 'Lettuce', 
      quantity: '35kg', 
      risk: 'MEDIUM', 
      daysLeft: 3,
      value: '₱3,500',
      location: 'Warehouse B',
      temperature: 22.0,
      humidity: 60
    },
    { 
      product: 'Milk', 
      quantity: '20L', 
      risk: 'LOW', 
      daysLeft: 4,
      value: '₱2,000',
      location: 'Cold Storage A',
      temperature: 4.5,
      humidity: 70
    }
  ];

  const logisticsApprovals = [
    { route: 'Route #024', path: 'Warehouse → Market A', distance: '45km', stops: 1, co2: '12.5kg' },
    { route: 'Route #025', path: 'Warehouse → A → B → C', distance: '78km', stops: 3, co2: '21.3kg' }
  ];

  const sustainabilityApprovals = [
    { delivery: 'DEL-042', type: 'CO₂ Verification', co2Saved: '5.2kg', status: 'pending' }
  ];

  return (
    <Layout currentPage="Process Manager" user={user}>
      {/* Page Header */}
    

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Stats and Manager Accounts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Total Pending Approvals Card - Stat Card Style */}
          <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            {/* Header section - Green background */}
            <div className="bg-[#1a4d2e] px-5 pt-4 pb-3 rounded-t-2xl flex items-center justify-between">
              <h4 className="text-white text-xs font-medium uppercase tracking-wide">
                Total Pending Approvals
              </h4>
              <Clock size={20} className="text-white opacity-80" />
            </div>
            
            {/* Body section - White background */}
            <div className="bg-white px-5 py-5 flex-1 flex flex-col justify-between rounded-b-2xl">
              <p className="text-gray-800 text-4xl font-bold mb-2">
                {pendingApprovals.total}
              </p>
              <p className="text-green-600 text-xs flex items-center gap-1 font-medium">
                Awaiting review
                <ChevronRight size={14} className="text-green-600 opacity-70" />
              </p>
            </div>
          </div>

          {/* By Manager Type Stats */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h4 className="font-semibold text-gray-700 text-sm">BY MANAGER TYPE:</h4>
            </div>
            <div className="p-5 space-y-4">
              {/* Inventory Manager Stat */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package size={16} className="text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Inventory Manager</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{pendingApprovals.byManager.inventory}</span>
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">pending</span>
                </div>
              </div>

              {/* Logistics Manager Stat */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Truck size={16} className="text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Logistics Manager</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{pendingApprovals.byManager.logistics}</span>
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">pending</span>
                </div>
              </div>

              {/* Sustainability Manager Stat */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Leaf size={16} className="text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Sustainability Manager</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{pendingApprovals.byManager.sustainability}</span>
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">pending</span>
                </div>
              </div>
            </div>
          </div>

          {/* Manager Accounts Section */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h4 className="font-semibold text-gray-700 text-sm">MANAGER ACCOUNTS</h4>
            </div>
            
            {/* Table Header */}
            <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
              <div>Name</div>
              <div>Department</div>
              <div>Email</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {managers.map((manager, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 px-5 py-3 text-sm hover:bg-gray-50">
                  <div className="font-medium text-gray-800">{manager.name}</div>
                  <div className="text-gray-600">{manager.department}</div>
                  <div className="text-gray-600 text-xs truncate">{manager.email}</div>
                </div>
              ))}
            </div>

            {/* Add New Manager Button */}
            <div className="p-4 border-t border-gray-200">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a4d2e] hover:bg-green-800 text-white text-sm rounded-lg transition-colors shadow-sm font-medium">
                <Plus size={18} />
                Add New Manager
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Pending Approvals by Department */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-gray-800">PENDING APPROVALS BY DEPARTMENT</h3>

          {/* Inventory Manager Section */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={20} className="text-blue-600" />
                <h4 className="font-semibold text-gray-800">INVENTORY MANAGER</h4>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                {inventoryApprovals.length} pending
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {inventoryApprovals.map((item, index) => (
                <div key={index} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-800">{item.product}</h5>
                      <p className="text-sm text-gray-600 mt-1">{item.quantity} • {item.value}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.risk === 'HIGH' ? 'bg-red-100 text-red-800' :
                        item.risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.risk} risk
                      </span>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                        {item.daysLeft} days left
                      </span>
                    </div>
                  </div>

                  {/* Environmental Conditions */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-600">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Thermometer size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-600">{item.temperature}°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-600">{item.humidity}% RH</span>
                    </div>
                  </div>

                  <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                    View Details
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors">
                View all inventory approvals
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Logistics Manager Section */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-purple-600" />
                <h4 className="font-semibold text-gray-800">LOGISTICS MANAGER</h4>
              </div>
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                {logisticsApprovals.length} pending
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {logisticsApprovals.map((item, index) => (
                <div key={index} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-800">{item.route}</h5>
                      <p className="text-sm text-gray-600 mt-1">{item.path}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-600">{item.distance}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-600">{item.stops} stops</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Leaf size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-600">{item.co2} CO₂</span>
                    </div>
                  </div>

                  <button className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors">
                    View Route Details
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors">
                View all logistics approvals
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Sustainability Manager Section */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf size={20} className="text-green-600" />
                <h4 className="font-semibold text-gray-800">SUSTAINABILITY MANAGER</h4>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                {sustainabilityApprovals.length} pending
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {sustainabilityApprovals.map((item, index) => (
                <div key={index} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-800">{item.delivery}</h5>
                      <p className="text-sm text-gray-600 mt-1">{item.type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-gray-400" />
                      <span className="text-xs text-gray-600">{item.co2Saved} CO₂ saved</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                      {item.status}
                    </span>
                  </div>

                  <button className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium transition-colors">
                    Verify CO₂ Data
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors">
                View all sustainability approvals
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManagerPage;