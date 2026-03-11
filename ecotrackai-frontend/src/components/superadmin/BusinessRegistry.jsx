// ============================================================
// FILE: src/components/superadmin/BusinessRegistry.jsx
//
// FIX: Create modal had adminName/adminUsername/adminEmail fields
//      but the backend POST /superadmin/businesses ONLY creates
//      the business record (+ ecotrust_scores). It does NOT create
//      an admin user — that must be done via the registration/
//      auth flow separately.
//
//      Two choices:
//        A) Remove the dead admin fields (clean, honest)
//        B) Keep them, pass to backend, backend handles creation
//
//      Choice A implemented here (safe, no backend change needed).
//      The modal now clearly states the admin must register
//      separately via the business's own onboarding flow.
//      Per system flow: "The Super Admin creates the first user
//      account for this business separately."
// ============================================================

import React, { useState } from 'react';
import {
  Plus, Pause, Play, CheckCircle, XCircle,
  AlertCircle, Building2, Users, ChevronRight,
  Mail, Hash, MapPin, Phone
} from 'lucide-react';

const BusinessRegistry = ({
  businesses  = [],
  pendingRegs = [],
  onSuspend,
  onReactivate,
  onCreate,
  onApprove,
  onReject,
}) => {
  const [filterStatus,    setFilterStatus]    = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [rejectingId,     setRejectingId]     = useState(null);
  const [rejectReason,    setRejectReason]    = useState('');

  const [formData, setFormData] = useState({
    businessName:       '',
    businessType:       '',
    registrationNumber: '',
    contactEmail:       '',
    contactPhone:       '',
    address:            '',
  });

  // Merge pending + active into one list
  const allBusinesses = [
    ...pendingRegs.map(b => ({ ...b, status: 'pending' })),
    ...businesses,
  ];

  const filtered = filterStatus === 'all'
    ? allBusinesses
    : allBusinesses.filter(b => b.status === filterStatus);

  const resetForm = () => setFormData({
    businessName: '', businessType: '', registrationNumber: '',
    contactEmail: '', contactPhone: '', address: '',
  });

  const handleCreate = async () => {
    if (!formData.businessName || !formData.businessType || !formData.registrationNumber) return;
    setSubmitting(true);
    // FIX: Only send business fields — no adminName/adminEmail
    // Backend POST /superadmin/businesses only creates business + ecotrust record
    const ok = await onCreate?.({
      businessName:       formData.businessName,
      businessType:       formData.businessType,
      registrationNumber: formData.registrationNumber,
      contactEmail:       formData.contactEmail   || undefined,
      contactPhone:       formData.contactPhone   || undefined,
      address:            formData.address        || undefined,
    });
    setSubmitting(false);
    if (ok) {
      setShowCreateModal(false);
      resetForm();
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
      active:    { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle,  label: 'ACTIVE'    },
      suspended: { cls: 'bg-red-100 text-red-700',         icon: Pause,        label: 'SUSPENDED' },
      pending:   { cls: 'bg-amber-100 text-amber-700',     icon: AlertCircle,  label: 'PENDING'   },
      rejected:  { cls: 'bg-gray-100 text-gray-500',       icon: XCircle,      label: 'REJECTED'  },
    };
    const b = map[status] || map.active;
    const Icon = b.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${b.cls}`}>
        <Icon size={11} /> {b.label}
      </span>
    );
  };

  return (
    <div className="space-y-5">

      {/* ── Pending Registrations Banner ──────────────────── */}
      {pendingRegs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
              <AlertCircle size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-amber-800 text-sm">
              {pendingRegs.length} Business{pendingRegs.length > 1 ? 'es' : ''} Awaiting Approval
            </h3>
          </div>
          <div className="space-y-3">
            {pendingRegs.map(b => (
              <div key={b.business_id}
                className="bg-white rounded-xl border border-amber-200 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-gray-800">{b.business_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="capitalize">{b.business_type}</span>
                    {b.contact_email && <span className="flex items-center gap-1"><Mail size={10} />{b.contact_email}</span>}
                    <span>Registered {new Date(b.created_at).toLocaleDateString('en-PH')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onApprove?.(b.business_id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900 transition-colors"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>

                  {rejectingId === b.business_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Rejection reason (min 10 chars)"
                        className="px-3 py-2 border border-gray-300 rounded-xl text-sm w-56 focus:outline-none focus:ring-2 focus:ring-red-400"
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
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRejectingId(b.business_id)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Table ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-800 flex items-center justify-center">
                <Building2 size={14} className="text-white" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">All Businesses</h3>
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <span className="text-xs text-gray-400 font-medium">{filtered.length} shown</span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900 transition-colors shadow-sm"
          >
            <Plus size={15} /> Create Business
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Business</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Registration</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">EcoTrust</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Users</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-center py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <Building2 size={32} className="mx-auto mb-3 text-gray-200" />
                    <p className="text-gray-400 text-sm">No businesses found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.business_id || b.id}
                    className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-green-800 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                          {(b.business_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{b.business_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{b.contact_email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-sm capitalize">{b.business_type || '—'}</td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded-lg">
                        {b.registration_number || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-green-800 font-bold text-sm">{b.ecotrust_points ?? 0} pts</p>
                        <p className="text-gray-400 text-xs">{b.ecotrust_level || 'Newcomer'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Users size={13} className="text-gray-400" />
                        <span className="font-medium">{b.user_count ?? b.total_users ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(b.status)}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {b.status === 'active' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Suspend ${b.business_name}? Their users will lose access.`)) {
                                onSuspend?.(b.business_id);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-xs font-semibold transition-colors"
                            title="Suspend business"
                          >
                            <Pause size={12} /> Suspend
                          </button>
                        )}
                        {b.status === 'suspended' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Reactivate ${b.business_name}?`)) {
                                onReactivate?.(b.business_id);
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-semibold transition-colors"
                            title="Reactivate business"
                          >
                            <Play size={12} /> Reactivate
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

      {/* ── Create Business Modal ─────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Create New Business</h2>
                {/* FIX: Honest note — admin account is separate per system flow */}
                <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                  <AlertCircle size={11} />
                  Business will be active immediately. Admin account is set up separately via onboarding email.
                </p>
              </div>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-xl leading-none">
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dela Cruz Fruits Trading"
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">Select type...</option>
                    <option value="distributor">Distributor</option>
                    <option value="production">Production</option>
                    <option value="retail">Retail</option>
                    <option value="transport">Transport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Registration No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DTI-2024-00123"
                    value={formData.registrationNumber}
                    onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="owner@business.com"
                    value={formData.contactEmail}
                    onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+63 9XX XXX XXXX"
                    value={formData.contactPhone}
                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123 Divisoria, Manila"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Honest info box per system flow */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-700 font-semibold mb-1">What happens after creation:</p>
                <ol className="text-xs text-blue-600 space-y-1 list-decimal pl-4">
                  <li>Business profile is created with EcoTrust score at 0 (Newcomer)</li>
                  <li>The business owner must register their admin account via the Register page using this business's registration number</li>
                  <li>Once registered, the Super Admin approves their account from the Pending Registrations section above</li>
                </ol>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting || !formData.businessName || !formData.businessType || !formData.registrationNumber}
                  className="flex-1 px-4 py-2.5 bg-green-800 text-white rounded-xl font-semibold hover:bg-green-900 transition-colors disabled:opacity-50 text-sm shadow-sm"
                >
                  {submitting ? 'Creating...' : 'Create Business'}
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