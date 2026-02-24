import React from 'react';
import { X, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import managerService from '../../services/manager.service';
import { Trash2, UserCheck, UserX, UserPlus } from 'lucide-react';

const roleOptions = [
  { value: 'inventory_manager',      label: 'Inventory Manager',     description: 'Manages products & stock' },
  { value: 'logistics_manager',      label: 'Logistics Manager',     description: 'Manages routes & deliveries' },
  { value: 'sustainability_manager', label: 'Sustainability Manager', description: 'Reviews environmental impact' },
];

const ManageAccountsModal = ({ onClose }) => {
  const [managers, setManagers]   = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [formData, setFormData]   = useState({
    username: '', email: '', password: '', fullName: '', role: ''
  });

  useEffect(() => { loadManagers(); }, []);

  const loadManagers = async () => {
    try {
      setLoading(true);
      const response = await managerService.getAllManagers();
      setManagers(response.data?.managers || []);
    } catch {
      setError('Failed to load managers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await managerService.createManager(formData);
      setSuccess('Manager account created!');
      setFormData({ username: '', email: '', password: '', fullName: '', role: '' });
      setShowForm(false);
      loadManagers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manager');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (managerId) => {
    if (!window.confirm('Deactivate this manager account?')) return;
    try {
      await managerService.deleteManager(managerId);
      setSuccess('Manager deactivated');
      loadManagers();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to deactivate manager');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a4d2e] to-green-700 text-white p-6 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Manage Accounts</h2>
              <p className="text-green-200 text-sm">Create and manage manager accounts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <UserCheck size={16} /> {success}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!showForm ? (
            <>
              {/* Create button */}
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold text-sm shadow-md transition-all"
              >
                <UserPlus size={18} /> Create New Manager Account
              </button>

              {/* Manager list */}
              {loading ? (
                <div className="text-center py-10 text-gray-400 text-sm">Loading managers...</div>
              ) : managers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <UserX size={30} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-sm">No managers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {managers.map((mgr) => {
                    const roleInfo = roleOptions.find(r => r.value === mgr.role) || { label: mgr.role };
                    return (
                      <div key={mgr.user_id} className="border-2 border-gray-100 rounded-xl p-4 hover:border-green-200 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                              {mgr.full_name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-gray-800 text-sm">{mgr.full_name}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mgr.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {mgr.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">{mgr.email} · @{mgr.username}</p>
                              <p className="text-xs text-gray-600 font-medium mt-0.5">{roleInfo.label}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(mgr.user_id)}
                            className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Create Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <h3 className="font-semibold text-gray-800 text-sm">New Manager Account</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input type="text" required placeholder="John Doe"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Username *</label>
                  <input type="text" required placeholder="johndoe"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email *</label>
                <input type="email" required placeholder="john@company.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Password *</label>
                <input type="password" required minLength={6} placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Manager Role *</label>
                <div className="space-y-2">
                  {roleOptions.map(option => (
                    <label key={option.value}
                      className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.role === option.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <input type="radio" name="role" required
                        value={option.value}
                        checked={formData.role === option.value}
                        onChange={e => setFormData({...formData, role: e.target.value})}
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
                <button type="button"
                  onClick={() => { setShowForm(false); setError(''); }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 text-sm"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageAccountsModal;