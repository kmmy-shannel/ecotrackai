import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Key, UserCheck, UserX } from 'lucide-react';
import managerService from '../services/manager.service';

const ManagerManagement = ({ onClose }) => {
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
    { value: 'inventory_manager', label: 'Inventory Manager', description: 'Manages products & stock' },
    { value: 'logistics_manager', label: 'Logistics Manager', description: 'Manages routes & deliveries' },
    { value: 'sustainability_manager', label: 'Sustainability Manager', description: 'Reviews environmental impact' },
    { value: 'finance_manager', label: 'Finance Manager', description: 'Oversees financial tracking' }
  ];

  useEffect(() => {
    loadManagers();
  }, []);

  const loadManagers = async () => {
  try {
    setLoading(true);
    console.log('Loading managers...');
    const response = await managerService.getAllManagers();
    console.log('Full response:', response);
    console.log('Response.data:', response.data);
    
    // FIX: The response structure is { success, message, data: { count, managers } }
    const managersData = response.data?.managers || [];
    console.log('Managers array:', managersData);
    
    setManagers(managersData);
    setError(''); // Clear any previous errors
  } catch (err) {
    console.error('Load managers error:', err);
    console.error('Error response:', err.response);
    console.error('Error data:', err.response?.data);
    setError(err.response?.data?.message || 'Failed to load managers');
  } finally {
    setLoading(false);
  }
};

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Creating manager:', formData);
      await managerService.createManager(formData);
      setSuccess('Manager account created successfully!');
      setFormData({
        username: '',
        email: '',
        password: '',
        fullName: '',
        role: ''
      });
      setShowForm(false);
      loadManagers();
    } catch (err) {
      console.error('Create manager error:', err);
      setError(err.response?.data?.message || 'Failed to create manager account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (managerId) => {
    if (!window.confirm('Are you sure you want to deactivate this manager account?')) {
      return;
    }

    try {
      await managerService.deleteManager(managerId);
      setSuccess('Manager account deactivated');
      loadManagers();
    } catch (err) {
      setError('Failed to deactivate manager');
    }
  };

  const getRoleInfo = (role) => {
    return roleOptions.find(r => r.value === role) || { label: role };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Manager Accounts</h2>
            <p className="text-sm text-gray-500 mt-1">Create and manage manager access to your system</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
            <UserCheck size={18} />
            {success}
          </div>
        )}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!showForm ? (
            <>
              {/* Add Manager Button */}
              <button
                onClick={() => setShowForm(true)}
                className="w-full mb-6 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                <Plus size={20} />
                <span className="font-semibold">Create New Manager Account</span>
              </button>

              {/* Managers List */}
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading managers...</div>
              ) : managers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserX size={40} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No manager accounts yet</p>
                  <p className="text-sm text-gray-400 mt-1">Create your first manager to get started</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {managers.map((manager) => {
                    const roleInfo = getRoleInfo(manager.role);
                    return (
                      <div
                        key={manager.user_id}
                        className="bg-white border-2 border-gray-100 rounded-xl p-5 hover:border-green-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md">
                              {manager.full_name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-bold text-gray-800">{manager.full_name}</h3>
                                {manager.is_active ? (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                    Active
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{manager.email} • @{manager.username}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{roleInfo.icon}</span>
                                <div>
                                  <p className="text-sm font-semibold text-gray-700">{roleInfo.label}</p>
                                  <p className="text-xs text-gray-500">{roleInfo.description}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(manager.user_id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                              title="Deactivate Account"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-400">
                            Created: {new Date(manager.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Create Manager Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-1">Create Manager Account</h3>
                <p className="text-sm text-gray-600">Fill in the details to create a new manager account</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="johndoe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="john.doe@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Manager Role *</label>
                <div className="grid grid-cols-2 gap-3">
                  {roleOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.role === option.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={formData.role === option.value}
                        onChange={handleChange}
                        className="mt-1"
                        required
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl"></span>
                          <span className="font-semibold text-gray-800">{option.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      username: '',
                      email: '',
                      password: '',
                      fullName: '',
                      role: ''
                    });
                    setError('');
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Manager Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerManagement;