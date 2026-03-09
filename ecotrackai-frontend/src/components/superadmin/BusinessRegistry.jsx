import React, { useState } from 'react';
import {
  Plus, Pause, Play, CheckCircle, XCircle,
  AlertCircle, Building2, Users, ChevronRight
} from 'lucide-react';

const BusinessRegistry = ({
  businesses = [],
  pendingRegs = [],
  onSuspend,
  onReactivate,
  onCreate,
  onApprove,
  onReject,
}) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [formData, setFormData] = useState({
    businessName: '', businessType: '', registrationNumber: '',
    contactEmail: '', contactPhone: '', address: '',
    adminName: '', adminUsername: '', adminEmail: '',
  });

  const allBusinesses = [
    ...pendingRegs.map(b => ({ ...b, status: 'pending' })),
    ...businesses,
  ];

  const filtered = filterStatus === 'all'
    ? allBusinesses
    : allBusinesses.filter(b => b.status === filterStatus);

  const handleCreate = async () => {
    if (!formData.businessName || !formData.businessType || !formData.registrationNumber) return;
    setSubmitting(true);
    const ok = await onCreate?.({
      businessName:       formData.businessName,
      businessType:       formData.businessType,
      registrationNumber: formData.registrationNumber,
      contactEmail:       formData.contactEmail,
      contactPhone:       formData.contactPhone,
      address:            formData.address,
      adminName:          formData.adminName,
      adminUsername:      formData.adminUsername,
      adminEmail:         formData.adminEmail,
    });
    setSubmitting(false);
    if (ok) {
      setShowCreateModal(false);
      setFormData({
        businessName: '', businessType: '', registrationNumber: '',
        contactEmail: '', contactPhone: '', address: '',
        adminName: '', adminUsername: '', adminEmail: '',
      });
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason || rejectReason.length < 10) return;
    setSubmitting(true);
    await onReject?.(id, rejectReason);
    setSubmitting(false);
    setRejectingId(null);
    setRejectReason('');
  };

  const getStatusBadge = (status) => {
    const map = {
      active:    { bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
      suspended: { bg: 'bg-red-100',    text: 'text-red-700',    icon: Pause       },
      pending:   { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle },
      rejected:  { bg: 'bg-gray-100',   text: 'text-gray-600',   icon: XCircle     },
    };
    const b = map[status] || map.active;
    const Icon = b.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>
        <Icon size={12} /> {status?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">

      {/* Pending Registrations Banner */}
      {pendingRegs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-orange-600" />
            <h3 className="font-semibold text-orange-800">
              {pendingRegs.length} Business{pendingRegs.length > 1 ? 'es' : ''} Awaiting Approval
            </h3>
          </div>
          <div className="space-y-3">
            {pendingRegs.map(b => (
              <div key={b.business_id}
                className="bg-white rounded-xl border border-orange-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{b.business_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {b.business_type} · {b.contact_email} · Registered {new Date(b.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApprove?.(b.business_id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900 transition-colors"
                  >
                    <CheckCircle size={15} /> Approve
                  </button>
                  {rejectingId === b.business_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason (min 10 chars)"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-52"
                      />
                      <button
                        onClick={() => handleReject(b.business_id)}
                        disabled={rejectReason.length < 10 || submitting}
                        className="px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="px-3 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRejectingId(b.business_id)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-green-800" />
              <h3 className="font-semibold text-gray-800">ALL BUSINESSES</h3>
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-xl font-medium hover:bg-green-900 transition-colors text-sm shadow-md"
          >
            <Plus size={16} /> Create Business
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Business</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Registration</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Users</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-gray-400 text-sm">
                    No businesses found
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.business_id || b.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(b.business_name || '?').charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{b.business_name}</p>
                          <p className="text-xs text-gray-500">{b.contact_email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 capitalize">{b.business_type || '—'}</td>
                    <td className="py-4 px-4 font-mono text-gray-500 text-xs">{b.registration_number || '—'}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users size={13} />
                        <span>{b.user_count ?? b.total_users ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {b.status === 'active' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Suspend this business?')) onSuspend?.(b.business_id);
                            }}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Suspend"
                          >
                            <Pause size={16} />
                          </button>
                        )}
                        {b.status === 'suspended' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Reactivate this business?')) onReactivate?.(b.business_id);
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Reactivate"
                          >
                            <Play size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Business Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Create New Business</h2>
                <p className="text-xs text-gray-500 mt-0.5">Business will be immediately active. Admin receives email with temp password.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Business Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Business Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text" placeholder="Business Name *"
                    value={formData.businessName}
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                    className="col-span-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={formData.businessType}
                    onChange={e => setFormData({...formData, businessType: e.target.value})}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Business Type *</option>
                    <option value="distributor">Distributor</option>
                    <option value="production">Production</option>
                    <option value="retail">Retail</option>
                    <option value="transport">Transport</option>
                  </select>
                  <input
                    type="text" placeholder="Registration Number *"
                    value={formData.registrationNumber}
                    onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="email" placeholder="Contact Email"
                    value={formData.contactEmail}
                    onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="tel" placeholder="Contact Phone"
                    value={formData.contactPhone}
                    onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text" placeholder="Address"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="col-span-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Admin User */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Admin Account</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text" placeholder="Full Name *"
                    value={formData.adminName}
                    onChange={e => setFormData({...formData, adminName: e.target.value})}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text" placeholder="Username *"
                    value={formData.adminUsername}
                    onChange={e => setFormData({...formData, adminUsername: e.target.value})}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="email" placeholder="Admin Email *"
                    value={formData.adminEmail}
                    onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                    className="col-span-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  A temporary password will be auto-generated and sent to the admin's email via OTP.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting || !formData.businessName || !formData.businessType || !formData.registrationNumber}
                  className="flex-1 px-4 py-2.5 bg-green-800 text-white rounded-xl font-semibold hover:bg-green-900 transition-colors disabled:opacity-50 text-sm shadow-md"
                >
                  {submitting ? 'Creating...' : 'Create Business + Admin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessRegistry;