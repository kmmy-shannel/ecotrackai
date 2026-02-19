import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import authService from '../services/auth.service';
import managerService from '../services/manager.service';
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
  Droplets,
  X,
  Trash2,
  UserCheck,
  UserX,
  UserPlus
} from 'lucide-react';

// ─── Manager Accounts Panel (inline, no modal) ───────────────────────────────
const ManagerAccountsPanel = () => {
  const [managers, setManagers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: ''
  });

  const roleOptions = [
    { value: 'inventory_manager',     label: 'Inventory Manager',     description: 'Manages products & stock' },
    { value: 'logistics_manager',     label: 'Logistics Manager',     description: 'Manages routes & deliveries' },
    { value: 'sustainability_manager',label: 'Sustainability Manager', description: 'Reviews environmental impact' },
    { value: 'finance_manager',       label: 'Finance Manager',       description: 'Oversees financial tracking' }
  ];

  useEffect(() => { loadManagers(); }, []);

  const loadManagers = async () => {
    try {
      setLoading(true);
      const response = await managerService.getAllManagers();
      const managersData = response.data?.managers || [];
      setManagers(managersData);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load managers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await managerService.createManager(formData);
      setSuccess('Manager account created successfully!');
      setFormData({ username: '', email: '', password: '', fullName: '', role: '' });
      setShowForm(false);
      loadManagers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manager account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (managerId) => {
    if (!window.confirm('Are you sure you want to deactivate this manager account?')) return;
    try {
      await managerService.deleteManager(managerId);
      setSuccess('Manager account deactivated');
      loadManagers();
    } catch (err) {
      setError('Failed to deactivate manager');
    }
  };

  const getRoleInfo = (role) => roleOptions.find(r => r.value === role) || { label: role, description: '' };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
      {/* Panel header */}
      <div className="px-6 py-4 bg-gradient-to-r from-[#1a4d2e] to-green-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-white" />
          <h4 className="font-semibold text-white">MANAGER ACCOUNTS</h4>
        </div>
        <span className="text-xs px-2 py-1 bg-white/20 text-white rounded-full">
          {managers.length} accounts
        </span>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mx-5 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <UserCheck size={16} />
          {success}
        </div>
      )}
      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="p-5">
        {!showForm ? (
          <>
            {/* Add button */}
            <button
              onClick={() => setShowForm(true)}
              className="w-full mb-5 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-sm font-semibold"
            >
              <UserPlus size={18} />
              Create New Manager Account
            </button>

            {/* List */}
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading managers...</div>
            ) : managers.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserX size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium text-sm">No manager accounts yet</p>
                <p className="text-xs text-gray-400 mt-1">Create your first manager to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {managers.map((manager) => {
                  const roleInfo = getRoleInfo(manager.role);
                  return (
                    <div
                      key={manager.user_id}
                      className="border-2 border-gray-100 rounded-xl p-4 hover:border-green-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm flex-shrink-0">
                            {manager.full_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <h3 className="font-bold text-gray-800 text-sm">{manager.full_name}</h3>
                              {manager.is_active ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Active</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">Inactive</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{manager.email} · @{manager.username}</p>
                            <p className="text-xs text-gray-600 font-medium mt-1">{roleInfo.label}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(manager.user_id)}
                          className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors flex-shrink-0"
                          title="Deactivate Account"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                          Created: {new Date(manager.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ── Create Form ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
              <h3 className="font-semibold text-gray-800 text-sm">Create Manager Account</h3>
              <p className="text-xs text-gray-500 mt-0.5">Fill in the details below</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input
                  type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  placeholder="John Doe" required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Username *</label>
                <input
                  type="text" name="username" value={formData.username} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  placeholder="johndoe" required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email *</label>
              <input
                type="email" name="email" value={formData.email} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                placeholder="john.doe@company.com" required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Password *</label>
              <input
                type="password" name="password" value={formData.password} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                placeholder="Min. 6 characters" minLength={6} required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Manager Role *</label>
              <div className="grid grid-cols-1 gap-2">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.role === option.value
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio" name="role" value={option.value}
                      checked={formData.role === option.value} onChange={handleChange}
                      className="mt-0.5" required
                    />
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ username: '', email: '', password: '', fullName: '', role: '' });
                  setError('');
                }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Main ManagerPage ─────────────────────────────────────────────────────────
const ManagerPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) { navigate('/'); return; }
    setUser(currentUser);
  }, [navigate]);

  if (!user) return null;

  // ── Sample pending approval data (replace with real hooks/services) ──
  const pendingApprovals = {
    total: 12,
    byManager: { inventory: 7, logistics: 3, sustainability: 2 }
  };

  const inventoryApprovals = [
    { product: 'Tomatoes', quantity: '50kg', risk: 'HIGH',   daysLeft: 2, value: '₱8,000', location: 'Cold Storage A', temperature: 25.5, humidity: 65 },
    { product: 'Lettuce',  quantity: '35kg', risk: 'MEDIUM', daysLeft: 3, value: '₱3,500', location: 'Warehouse B',    temperature: 22.0, humidity: 60 },
    { product: 'Milk',     quantity: '20L',  risk: 'LOW',    daysLeft: 4, value: '₱2,000', location: 'Cold Storage A', temperature: 4.5,  humidity: 70 }
  ];

  const logisticsApprovals = [
    { route: 'Route #024', path: 'Warehouse → Market A',       distance: '45km', stops: 1, co2: '12.5kg' },
    { route: 'Route #025', path: 'Warehouse → A → B → C',      distance: '78km', stops: 3, co2: '21.3kg' }
  ];

  const sustainabilityApprovals = [
    { delivery: 'DEL-042', type: 'CO₂ Verification', co2Saved: '5.2kg', status: 'pending' }
  ];

  return (
    <Layout currentPage="Process Manager" user={user}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left Column ── */}
        <div className="lg:col-span-1 space-y-6">

          {/* Total Pending Approvals */}
          <div className="bg-white overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="bg-[#1a4d2e] px-5 pt-4 pb-3 rounded-t-2xl flex items-center justify-between">
              <h4 className="text-white text-xs font-medium uppercase tracking-wide">Total Pending Approvals</h4>
              <Clock size={20} className="text-white opacity-80" />
            </div>
            <div className="bg-white px-5 py-5 flex-1 flex flex-col justify-between rounded-b-2xl">
              <p className="text-gray-800 text-4xl font-bold mb-2">{pendingApprovals.total}</p>
              <p className="text-green-600 text-xs flex items-center gap-1 font-medium">
                Awaiting review <ChevronRight size={14} className="opacity-70" />
              </p>
            </div>
          </div>

          {/* By Manager Type */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h4 className="font-semibold text-gray-700 text-sm">BY MANAGER TYPE:</h4>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Inventory Manager',      count: pendingApprovals.byManager.inventory,     Icon: Package, color: 'blue' },
                { label: 'Logistics Manager',      count: pendingApprovals.byManager.logistics,     Icon: Truck,   color: 'purple' },
                { label: 'Sustainability Manager', count: pendingApprovals.byManager.sustainability, Icon: Leaf,    color: 'green' }
              ].map(({ label, count, Icon, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 bg-${color}-100 rounded-lg flex items-center justify-center`}>
                      <Icon size={16} className={`text-${color}-600`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Manager Accounts Panel ── */}
          <ManagerAccountsPanel />

        </div>

        {/* ── Right Column — Pending Approvals by Department ── */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-gray-800">PENDING APPROVALS BY DEPARTMENT</h3>

          {/* Inventory */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={20} className="text-blue-600" />
                <h4 className="font-semibold text-gray-800">INVENTORY MANAGER</h4>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{inventoryApprovals.length} pending</span>
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
                        item.risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>{item.risk} risk</span>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">{item.daysLeft} days left</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" /><span className="text-xs text-gray-600">{item.location}</span></div>
                    <div className="flex items-center gap-1.5"><Thermometer size={13} className="text-gray-400" /><span className="text-xs text-gray-600">{item.temperature}°C</span></div>
                    <div className="flex items-center gap-1.5"><Droplets size={13} className="text-gray-400" /><span className="text-xs text-gray-600">{item.humidity}% RH</span></div>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
                    View Details <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 font-medium">
                View all inventory approvals <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Logistics */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-purple-600" />
                <h4 className="font-semibold text-gray-800">LOGISTICS MANAGER</h4>
              </div>
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">{logisticsApprovals.length} pending</span>
            </div>
            <div className="divide-y divide-gray-100">
              {logisticsApprovals.map((item, index) => (
                <div key={index} className="p-5 hover:bg-gray-50 transition-colors">
                  <h5 className="font-semibold text-gray-800">{item.route}</h5>
                  <p className="text-sm text-gray-600 mt-1 mb-3">{item.path}</p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" /><span className="text-xs text-gray-600">{item.distance}</span></div>
                    <div className="flex items-center gap-1.5"><Calendar size={13} className="text-gray-400" /><span className="text-xs text-gray-600">{item.stops} stops</span></div>
                    <div className="flex items-center gap-1.5"><Leaf size={13} className="text-gray-400" /><span className="text-xs text-gray-600">{item.co2} CO₂</span></div>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium">
                    View Route Details <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 font-medium">
                View all logistics approvals <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Sustainability */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf size={20} className="text-green-600" />
                <h4 className="font-semibold text-gray-800">SUSTAINABILITY MANAGER</h4>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">{sustainabilityApprovals.length} pending</span>
            </div>
            <div className="divide-y divide-gray-100">
              {sustainabilityApprovals.map((item, index) => (
                <div key={index} className="p-5 hover:bg-gray-50 transition-colors">
                  <h5 className="font-semibold text-gray-800">{item.delivery}</h5>
                  <p className="text-sm text-gray-600 mt-1 mb-3">{item.type}</p>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5"><TrendingUp size={13} className="text-gray-400" /><span className="text-xs text-gray-600">{item.co2Saved} CO₂ saved</span></div>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">{item.status}</span>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                    Verify CO₂ Data <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 font-medium">
                View all sustainability approvals <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManagerPage;