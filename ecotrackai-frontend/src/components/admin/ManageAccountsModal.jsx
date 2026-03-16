import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, UserCheck, UserX, UserPlus, AlertTriangle } from 'lucide-react';
import managerService from '../../services/manager.service';

const roleOptions = [
  { value: 'inventory_manager',      label: 'Inventory Manager',     description: 'Manages products & stock' },
  { value: 'logistics_manager',      label: 'Logistics Manager',     description: 'Manages routes & deliveries' },
  { value: 'sustainability_manager', label: 'Sustainability Manager', description: 'Reviews environmental impact' },
];

// ─── Styled Confirmation Modal ───────────────────────────────────────────────
// Replaces window.confirm — renders inline inside the parent modal overlay
const ConfirmDeleteModal = ({ manager, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
      {/* Red header bar */}
      <div className="bg-red-500 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">Deactivate Account</p>
          <p className="text-red-100 text-xs">This action cannot be undone easily</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="text-gray-700 text-sm leading-relaxed">
          Are you sure you want to deactivate{' '}
          <span className="font-bold text-gray-900">{manager?.full_name}</span>?
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Their account will be set to <span className="font-semibold text-red-500">Inactive</span>.
          They will no longer be able to log in. All their records and history will be preserved.
        </p>

        {/* Manager info pill */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {manager?.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">{manager?.full_name}</p>
            <p className="text-xs text-gray-500">{manager?.email}</p>
            <p className="text-xs text-gray-400">{roleOptions.find(r => r.value === manager?.role)?.label || manager?.role}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 pb-5 flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Deactivating...
            </>
          ) : (
            <>
              <Trash2 size={14} />
              Yes, Deactivate
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Modal ──────────────────────────────────────────────────────────────
const ManageAccountsModal = ({ onClose }) => {
  const [managers, setManagers]             = useState([]);
  const [showForm, setShowForm]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  // ── Fix: track which manager is pending deletion ──
  const [confirmDelete, setConfirmDelete]   = useState(null); // null | manager object
  const [formData, setFormData]             = useState({
    username: '', email: '', password: '', fullName: '', role: ''
  });

  useEffect(() => { loadManagers(); }, []);

  const loadManagers = async () => {
    try {
      setLoading(true);
      setError('');
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

  // ── Fix #1 core: open styled modal instead of window.confirm ──
  const requestDelete = (manager) => {
    setError('');
    setConfirmDelete(manager);
  };

  // ── Fix #1 core: actual delete/deactivate call ──
  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      await managerService.deleteManager(confirmDelete.user_id);
      setSuccess(`${confirmDelete.full_name}'s account has been deactivated.`);
      setConfirmDelete(null);
      loadManagers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate manager');
      setConfirmDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  return (
    <>
      {/* ── Confirmation modal renders on top when triggered ── */}
      {confirmDelete && (
        <ConfirmDeleteModal
          manager={confirmDelete}
          onConfirm={confirmDeleteAction}
          onCancel={cancelDelete}
          loading={deleteLoading}
        />
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">

          {/* Header — unchanged */}
          <div className="bg-gradient-to-r from-green-700 to-green-600 text-white p-6 rounded-t-2xl flex items-center justify-between flex-shrink-0">
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
                                {mgr.full_name?.charAt(0) || '?'}
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

                            {/* ── Fix: only show delete button for active managers ── */}
                            {mgr.is_active && (
                              <button
                                onClick={() => requestDelete(mgr)}
                                title="Deactivate account"
                                className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}

                            {/* Show a muted icon for already-inactive managers */}
                            {!mgr.is_active && (
                              <span className="p-1.5 text-gray-300 cursor-default" title="Already inactive">
                                <Trash2 size={15} />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* Create Form — completely unchanged from original */
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
    </>
  );
};

export default ManageAccountsModal;