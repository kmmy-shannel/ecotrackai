// ============================================================
// FILE: src/components/superadmin/BusinessRegistry.jsx
//
// CHANGE: Removed "Create Business" button and modal entirely.
//   Reason: Businesses register via the Register page on the login screen.
//   The Super Admin approves pending registrations from the banner above.
//   All other functionality unchanged.
// ============================================================

import React, { useState } from 'react';
import {
  Pause, Play, CheckCircle, XCircle,
  AlertCircle, Building2, Users
} from 'lucide-react';

const BusinessRegistry = ({
  businesses    = [],
  pendingRegs   = [],
  onSuspend,
  onReactivate,
  onApprove,
  onReject,
}) => {
  const [filterStatus,    setFilterStatus]    = useState('all');
  const [submitting,      setSubmitting]       = useState(false);
  const [rejectingId,     setRejectingId]      = useState(null);
  const [rejectReason,    setRejectReason]     = useState('');
  const [suspendTarget,   setSuspendTarget]    = useState(null); // business object | null
  const [suspending,      setSuspending]       = useState(false);

  const allBusinesses = [
    ...pendingRegs.map(b => ({ ...b, status: 'pending' })),
    ...businesses,
  ];

  const filtered = filterStatus === 'all'
    ? allBusinesses
    : allBusinesses.filter(b => b.status === filterStatus);

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
      active:    { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'ACTIVE'    },
      suspended: { cls: 'bg-red-100    text-red-700',      icon: Pause,       label: 'SUSPENDED' },
      pending:   { cls: 'bg-amber-100  text-amber-700',    icon: AlertCircle, label: 'PENDING'   },
      rejected:  { cls: 'bg-gray-100   text-gray-500',     icon: XCircle,     label: 'REJECTED'  },
    };
    const b    = map[status] || map.active;
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
                    {b.contact_email && <span>{b.contact_email}</span>}
                    <span>Registered {new Date(b.created_at).toLocaleDateString('en-PH')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => onApprove?.(b.business_id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-800 text-white rounded-xl text-sm font-semibold hover:bg-green-900 transition-colors">
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
                      <button onClick={() => handleReject(b.business_id)}
                        disabled={rejectReason.length < 10 || submitting}
                        className="px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                        Confirm
                      </button>
                      <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 text-gray-600">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectingId(b.business_id)}
                      className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
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
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <span className="text-xs text-gray-400 font-medium">{filtered.length} shown</span>
          </div>
          {/* NOTE: Create Business button removed.
              Businesses register via the Register page on the login screen.
              Super Admin approves them from the Pending Registrations banner above. */}
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
                      <p className="text-green-800 font-bold text-sm">{b.ecotrust_points ?? 0} pts</p>
                      <p className="text-gray-400 text-xs">{b.ecotrust_level || 'Newcomer'}</p>
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
                            onClick={() => setSuspendTarget(b)}
                            className="flex items-center gap-1 px-3 py-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-xs font-semibold transition-colors">
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
                            className="flex items-center gap-1 px-3 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-semibold transition-colors">
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
      

{/* ── Suspend Confirmation Modal ── */}
{suspendTarget && (
  <div style={{
    position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
    backdropFilter:'blur(4px)', display:'flex', alignItems:'center',
    justifyContent:'center', zIndex:9999, padding:16,
  }}>
    <div style={{
      background:'#fff', borderRadius:20, maxWidth:400, width:'100%',
      overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,0.22)',
      fontFamily:'system-ui,sans-serif',
    }}>

      {/* Orange header */}
      <div style={{
        background:'linear-gradient(135deg,#ea580c,#c2410c)',
        padding:'18px 22px', display:'flex', alignItems:'center', gap:12,
      }}>
        <div style={{
          width:36, height:36, borderRadius:10,
          background:'rgba(255,255,255,0.15)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>
          <Pause size={18} style={{ color:'#fff' }} />
        </div>
        <div>
          <p style={{ color:'#fff', fontWeight:800, fontSize:14, margin:0 }}>Suspend Business</p>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:11.5, margin:0 }}>
            This will lock out all users immediately
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'20px 22px' }}>
        <p style={{ fontSize:13.5, color:'#374151', margin:'0 0 8px' }}>
          Are you sure you want to suspend{' '}
          <span style={{ fontWeight:800, color:'#111827' }}>{suspendTarget.business_name}</span>?
        </p>
        <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 16px' }}>
          All users under this business will immediately lose access until the account is reactivated.
        </p>

        {/* Business info pill */}
        <div style={{
          background:'#fff7ed', border:'1px solid #fed7aa',
          borderRadius:12, padding:'10px 14px',
          display:'flex', alignItems:'center', gap:10, marginBottom:20,
        }}>
          <div style={{
            width:34, height:34, borderRadius:10,
            background:'linear-gradient(135deg,#ea580c,#c2410c)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:14, fontWeight:800, flexShrink:0,
          }}>
            {suspendTarget.business_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0 }}>
              {suspendTarget.business_name}
            </p>
            <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>
              {suspendTarget.contact_email || suspendTarget.business_type || '—'}
            </p>
          </div>
          <div style={{ marginLeft:'auto' }}>
            <span style={{
              fontSize:10, fontWeight:700, background:'#fed7aa',
              color:'#c2410c', padding:'3px 10px', borderRadius:99,
            }}>
              {suspendTarget.user_count ?? suspendTarget.total_users ?? 0} users affected
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', gap:10 }}>
          <button
            onClick={() => setSuspendTarget(null)}
            disabled={suspending}
            style={{
              flex:1, padding:'10px', border:'1.5px solid #e5e7eb',
              background:'#fff', color:'#374151', fontSize:13,
              fontWeight:600, borderRadius:12, cursor:'pointer',
              fontFamily:'inherit', opacity: suspending ? .5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setSuspending(true);
              await onSuspend?.(suspendTarget.business_id);
              setSuspending(false);
              setSuspendTarget(null);
            }}
            disabled={suspending}
            style={{
              flex:1, padding:'10px',
              background: suspending ? '#fdba74' : 'linear-gradient(135deg,#ea580c,#c2410c)',
              color:'#fff', fontSize:13, fontWeight:700,
              borderRadius:12, border:'none', cursor: suspending ? 'not-allowed' : 'pointer',
              fontFamily:'inherit', display:'flex', alignItems:'center',
              justifyContent:'center', gap:6,
              boxShadow:'0 2px 8px rgba(234,88,12,0.3)',
            }}
          >
            {suspending ? (
              <>
                <div style={{
                  width:13, height:13, borderRadius:'50%',
                  border:'2px solid rgba(255,255,255,0.3)',
                  borderTopColor:'#fff',
                  animation:'spin 0.6s linear infinite',
                }} />
                Suspending…
              </>
            ) : (
              <><Pause size={13} /> Yes, Suspend</>
            )}
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