import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import managerService from '../services/manager.service';
import api from '../services/api';
import {
  Users, Clock, AlertTriangle, Truck, Leaf, Package,
  ChevronRight, ChevronDown, ChevronUp, UserCheck, UserX,
  UserPlus, Trash2, RefreshCw, MapPin, Navigation, Fuel,
  CheckCircle, XCircle, Eye, BarChart3, TrendingDown,
  MessageSquare, Calendar, Box, Thermometer, Droplets,
  ArrowRight, Sparkles, Shield
} from 'lucide-react';

// ─── Shared helpers ───────────────────────────────────────────────────────────
const fmt = (v, dp = 1) => Number(v || 0).toFixed(dp);

const StatusBadge = ({ status }) => {
  const map = {
    pending:    'bg-amber-100 text-amber-800 border-amber-200',
    approved:   'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected:   'bg-red-100 text-red-700 border-red-200',
    declined:   'bg-red-100 text-red-700 border-red-200',
    in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
    delivered:  'bg-green-100 text-green-800 border-green-200',
    planned:    'bg-gray-100 text-gray-600 border-gray-200',
    optimized:  'bg-purple-100 text-purple-800 border-purple-200',
    high:       'bg-red-100 text-red-700 border-red-200',
    medium:     'bg-amber-100 text-amber-700 border-amber-200',
    low:        'bg-green-100 text-green-700 border-green-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

// ─── Logistics hook (inline — same logic as useLogisticsApprovals) ────────────
function useLogistics() {
  const [pending,  setPending]  = useState([]);
  const [stats,    setStats]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const flash = (setter, msg) => { setter(msg); setTimeout(() => setter(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/manager/logistics/pending'),
        api.get('/manager/logistics/stats'),
      ]);
      const extract = r => { const d = r.data; return d?.data ?? d ?? []; };
      setPending(Array.isArray(extract(pRes)) ? extract(pRes) : []);
      setStats(extract(sRes) || {});
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Failed to load logistics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id, comment = '') => {
    try {
      await api.post(`/manager/logistics/${id}/approve`, { comment });
      flash(setSuccess, '✓ Route approved');
      load();
    } catch (err) { flash(setError, err.response?.data?.message || 'Failed to approve'); }
  };

  const decline = async (id, comment) => {
    if (!comment?.trim()) { flash(setError, 'A reason is required to decline'); return; }
    try {
      await api.post(`/manager/logistics/${id}/decline`, { comment });
      flash(setSuccess, 'Route declined');
      load();
    } catch (err) { flash(setError, err.response?.data?.message || 'Failed to decline'); }
  };

  return { pending, stats, loading, error, success, approve, decline, refresh: load };
}

// ─── Inventory hook ───────────────────────────────────────────────────────────
function useInventory() {
  const [pending,  setPending]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const flash = (setter, msg) => { setter(msg); setTimeout(() => setter(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res    = await api.get('/manager/inventory/pending');
      const data   = res.data?.data ?? res.data ?? [];
      setPending(Array.isArray(data) ? data : []);
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id, comment = '') => {
    try {
      await api.post(`/manager/inventory/${id}/approve`, { comment });
      flash(setSuccess, '✓ Action approved');
      load();
    } catch (err) { flash(setError, 'Failed to approve'); }
  };

  const decline = async (id, comment) => {
    if (!comment?.trim()) { flash(setError, 'A reason is required'); return; }
    try {
      await api.post(`/manager/inventory/${id}/decline`, { comment });
      flash(setSuccess, 'Action declined');
      load();
    } catch (err) { flash(setError, 'Failed to decline'); }
  };

  return { pending, loading, error, success, approve, decline, refresh: load };
}

// ─── Logistics approval card ──────────────────────────────────────────────────
const LogisticsCard = ({ item, onApprove, onDecline }) => {
  const [open,      setOpen]      = useState(false);
  const [declining, setDeclining] = useState(false);
  const [comment,   setComment]   = useState('');
  const [busy,      setBusy]      = useState(false);

  const origin = (() => {
    try {
      const o = typeof item.location === 'string' ? JSON.parse(item.location) : item.location;
      return o?.address || o?.name || 'Origin';
    } catch { return item.location || 'Origin'; }
  })();

  const driver   = item.driver_full_name || item.driver_name || 'Unassigned';
  const vehicle  = item.vehicle_type?.replace(/_/g, ' ') || '—';
  const hasSavings = item.savings_km || item.savings_fuel || item.savings_co2;

  const handleApprove = async () => {
    setBusy(true);
    await onApprove(item.approval_id, comment);
    setBusy(false);
  };

  const handleDecline = async () => {
    setBusy(true);
    await onDecline(item.approval_id, comment);
    setBusy(false);
    setDeclining(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header row */}
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1a4d2e] to-[#2a6040] flex items-center justify-center flex-shrink-0 shadow">
            <Truck size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{item.product_name || 'Unnamed Route'}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{driver} · {vehicle}</p>
            <p className="text-xs text-gray-400 truncate">{origin}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <StatusBadge status="pending" />
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">

          {/* Route metrics */}
          {hasSavings && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gradient-to-r from-[#1a4d2e] to-[#2a6040] flex items-center gap-2">
                <Sparkles size={13} className="text-white" />
                <span className="text-xs font-bold text-white uppercase tracking-wide">AI Optimization Savings</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                {[
                  { label: 'Distance', orig: item.total_distance_km, opt: item.optimized_distance, saved: item.savings_km, unit: ' km', icon: <Navigation size={13} className="text-blue-500" /> },
                  { label: 'Fuel',     orig: item.estimated_fuel_consumption_liters, opt: item.optimized_fuel, saved: item.savings_fuel, unit: ' L',  icon: <Fuel size={13} className="text-orange-500" /> },
                  { label: 'CO₂',      orig: item.estimated_carbon_kg, opt: item.optimized_carbon_kg, saved: item.savings_co2, unit: ' kg', icon: <Leaf size={13} className="text-green-600" /> },
                ].map(m => (
                  <div key={m.label} className="px-3 py-2.5 text-center">
                    <div className="flex justify-center mb-1">{m.icon}</div>
                    <p className="text-[10px] text-gray-400 mb-1">{m.label}</p>
                    <p className="text-xs text-gray-400 line-through">{fmt(m.orig)}{m.unit}</p>
                    <p className="text-sm font-bold text-gray-800">{fmt(m.opt)}{m.unit}</p>
                    {m.saved > 0 && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                        −{fmt(m.saved)}{m.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI recommendation */}
          {item.ai_recommendation && (
            <div className="flex gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <Sparkles size={14} className="text-purple-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-800">{item.ai_recommendation}</p>
            </div>
          )}

          {/* Submitted info */}
          <p className="text-xs text-gray-400">
            Submitted {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {item.submitted_by_name && ` by ${item.submitted_by_name}`}
          </p>

          {/* Comment box */}
          <textarea
            rows={2}
            placeholder="Optional comment (required to decline)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-[#2d7a4f] focus:ring-1 focus:ring-[#2d7a4f]"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#1a4d2e] to-[#2a6040] hover:from-[#153621] hover:to-[#1f5a35] text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50 shadow"
            >
              <CheckCircle size={14} /> Approve Route
            </button>
            <button
              onClick={handleDecline}
              disabled={busy || !comment.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <XCircle size={14} /> Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Inventory approval card ──────────────────────────────────────────────────
const InventoryCard = ({ item, onApprove, onDecline }) => {
  const [open,    setOpen]    = useState(false);
  const [comment, setComment] = useState('');
  const [busy,    setBusy]    = useState(false);

  const riskLevel = item.priority?.toLowerCase() || 'low';

  const handleApprove = async () => { setBusy(true); await onApprove(item.approval_id, comment); setBusy(false); };
  const handleDecline = async () => { setBusy(true); await onDecline(item.approval_id, comment); setBusy(false); };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <div
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow ${
            riskLevel === 'high' ? 'bg-gradient-to-br from-red-500 to-red-600' :
            riskLevel === 'medium' ? 'bg-gradient-to-br from-amber-400 to-amber-500' :
            'bg-gradient-to-br from-green-500 to-green-600'
          }`}>
            <Package size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{item.product_name || 'Product'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.quantity || '—'}</p>
            <p className="text-xs text-gray-400">{item.location || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <StatusBadge status={riskLevel} />
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
          {item.ai_suggestion && (
            <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Sparkles size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">{item.ai_suggestion}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">
            Submitted {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {item.submitted_by_name && ` by ${item.submitted_by_name}`}
          </p>
          <textarea
            rows={2}
            placeholder="Optional comment (required to decline)…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-[#2d7a4f] focus:ring-1 focus:ring-[#2d7a4f]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#1a4d2e] to-[#2a6040] hover:from-[#153621] hover:to-[#1f5a35] text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50 shadow"
            >
              <CheckCircle size={14} /> Approve
            </button>
            <button
              onClick={handleDecline}
              disabled={busy || !comment.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <XCircle size={14} /> Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Manager Accounts Panel ───────────────────────────────────────────────────
const ManagerAccountsPanel = () => {
  const [managers, setManagers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [formData, setFormData] = useState({ username: '', email: '', password: '', fullName: '', role: '' });

  const roleOptions = [
    { value: 'inventory_manager',      label: 'Inventory Manager',     icon: '📦', desc: 'Manages products & stock' },
    { value: 'logistics_manager',      label: 'Logistics Manager',     icon: '🚛', desc: 'Manages routes & deliveries' },
    { value: 'sustainability_manager', label: 'Sustainability Manager', icon: '🌿', desc: 'Reviews environmental impact' },
    { value: 'driver',                 label: 'Driver',                icon: '🧭', desc: 'Executes delivery routes (mobile)' },
  ];

  useEffect(() => { loadManagers(); }, []);

  const loadManagers = async () => {
    try {
      setLoading(true);
      const res = await managerService.getAllManagers();
      setManagers(res.data?.managers || res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await managerService.createManager(formData);
      setSuccess('Account created successfully');
      setFormData({ username: '', email: '', password: '', fullName: '', role: '' });
      setShowForm(false);
      loadManagers();
    } catch (err) {
      const d = err.response?.data;
      const errs = d?.error;
      setError(Array.isArray(errs) && errs.length > 0 ? errs[0] : d?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this account?')) return;
    try {
      await managerService.deleteManager(id);
      setSuccess('Account deactivated');
      loadManagers();
    } catch { setError('Failed to deactivate'); }
  };

  const roleLabel = (role) => roleOptions.find(r => r.value === role)?.label || role;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-[#1a4d2e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-white" />
          <span className="text-sm font-bold text-white tracking-wide uppercase">Team Accounts</span>
        </div>
        <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">
          {managers.length} accounts
        </span>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle size={13} />{success}
        </div>
      )}
      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
          {error}
        </div>
      )}

      <div className="p-4">
        {!showForm ? (
          <>
            <button
              onClick={() => setShowForm(true)}
              className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1a4d2e] to-[#2a6040] hover:from-[#153621] hover:to-[#1f5a35] text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
            >
              <UserPlus size={16} /> Create Account
            </button>

            {loading ? (
              <div className="text-center py-6 text-gray-400 text-xs">Loading…</div>
            ) : managers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <UserX size={24} className="text-gray-300" />
                </div>
                <p className="text-xs text-gray-400">No accounts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {managers.map(m => (
                  <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-all">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a4d2e] to-[#2a6040] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {m.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{m.full_name}</p>
                      <p className="text-[10px] text-gray-500 font-medium truncate">{roleLabel(m.role)}</p>
                      <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                      <p className="text-[10px] text-gray-400 truncate">@{m.username}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-[10px] text-gray-400">{m.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(m.user_id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Full Name *</label>
                <input type="text" name="fullName" value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#2d7a4f] focus:ring-1 focus:ring-[#2d7a4f]"
                  placeholder="John Doe" required />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Username *</label>
                <input type="text" name="username" value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#2d7a4f] focus:ring-1 focus:ring-[#2d7a4f]"
                  placeholder="johndoe" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Email *</label>
              <input type="email" name="email" value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#2d7a4f] focus:ring-1 focus:ring-[#2d7a4f]"
                placeholder="john@company.com" required />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Password *</label>
              <input type="password" name="password" value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#2d7a4f] focus:ring-1 focus:ring-[#2d7a4f]"
                placeholder="Min. 6 characters" minLength={6} required />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Role *</label>
              <div className="space-y-1.5">
                {roleOptions.map(opt => (
                  <label key={opt.value}
                    className={`flex items-center gap-2.5 p-2.5 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.role === opt.value
                        ? 'border-[#2d7a4f] bg-green-50'
                        : 'border-gray-100 hover:border-green-200'
                    }`}>
                    <input type="radio" name="role" value={opt.value}
                      checked={formData.role === opt.value}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="accent-[#2d7a4f]" required />
                    <span className="text-base">{opt.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-[10px] text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button"
                onClick={() => { setShowForm(false); setFormData({ username:'', email:'', password:'', fullName:'', role:'' }); setError(''); }}
                className="flex-1 px-3 py-2.5 border-2 border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-3 py-2.5 bg-gradient-to-r from-[#1a4d2e] to-[#2a6040] text-white text-xs font-semibold rounded-xl hover:from-[#153621] hover:to-[#1f5a35] transition-all disabled:opacity-50 shadow">
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────
const ApprovalSection = ({ title, icon, count, color, loading, error, success, children, onRefresh }) => {
  const colors = {
    green:  { hdr: 'from-[#1a4d2e] to-[#1a4d2e]', badge: 'bg-white/20 text-white', dot: 'bg-emerald-400' },
    blue:   { hdr: 'from-blue-900 to-blue-700',    badge: 'bg-white/20 text-white', dot: 'bg-blue-400' },
    amber:  { hdr: 'from-amber-700 to-amber-500',  badge: 'bg-white/20 text-white', dot: 'bg-amber-400' },
  };
  const c = colors[color] || colors.green;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-4 bg-gradient-to-r ${c.hdr} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <span className="text-sm font-bold text-white uppercase tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${c.badge} px-2.5 py-1 rounded-full font-semibold`}>
            {count} pending
          </span>
          {onRefresh && (
            <button onClick={onRefresh} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {(error || success) && (
        <div className={`mx-4 mt-3 p-2.5 rounded-lg text-xs flex items-center gap-1.5 ${
          success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                    'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {success ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
          {success || error}
        </div>
      )}

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-xs">
            <RefreshCw size={14} className="animate-spin" /> Loading…
          </div>
        ) : count === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-dashed border-gray-200">
              <CheckCircle size={20} className="text-gray-300" />
            </div>
            <p className="text-xs text-gray-400 font-medium">All caught up!</p>
            <p className="text-[10px] text-gray-300 mt-0.5">No pending approvals</p>
          </div>
        ) : children}
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const ManagerPage = () => {
  const { user } = useAuth();
  const logistics = useLogistics();
  const inventory = useInventory();

  if (!user) return null;

  const totalPending = logistics.pending.length + inventory.pending.length;

  // Stats from logistics hook
  const stats = logistics.stats || {};

  return (
    <Layout currentPage="Process Manager" user={user}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">

        <button
          onClick={() => { logistics.refresh(); inventory.refresh(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1a4d2e] hover:bg-[#153621] text-white rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <RefreshCw size={16} className={(logistics.loading || inventory.loading) ? 'animate-spin' : ''} />
          <span className="font-medium">Refresh</span>
        </button>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — accounts panel */}
        <div className="space-y-5">
          <ManagerAccountsPanel />

          {/* Quick department counts */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-[#1a4d2e]">
              <span className="text-xs font-bold text-white uppercase tracking-wide">Pending by Department</span>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { label: 'Logistics',  count: logistics.pending.length, icon: <Truck size={15} className="text-purple-500" />,  bg: 'bg-purple-50' },
                { label: 'Inventory',  count: inventory.pending.length, icon: <Package size={15} className="text-blue-500" />,   bg: 'bg-blue-50' },
                { label: 'Sustainability', count: 0,                   icon: <Leaf size={15} className="text-green-500" />,    bg: 'bg-green-50' },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 ${d.bg} rounded-lg flex items-center justify-center`}>{d.icon}</div>
                    <span className="text-sm text-gray-700 font-medium">{d.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{d.count}</span>
                    {d.count > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">pending</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — approval feeds */}
        <div className="lg:col-span-2 space-y-5">

          {/* Logistics approvals */}
          <ApprovalSection
            title="Logistics Approvals"
            icon={<Truck size={16} className="text-white" />}
            count={logistics.pending.length}
            color="green"
            loading={logistics.loading}
            error={logistics.error}
            success={logistics.success}
            onRefresh={logistics.refresh}
          >
            {logistics.pending.map(item => (
              <LogisticsCard
                key={item.approval_id}
                item={item}
                onApprove={logistics.approve}
                onDecline={logistics.decline}
              />
            ))}
          </ApprovalSection>

          {/* Inventory approvals */}
          <ApprovalSection
            title="Inventory Approvals"
            icon={<Package size={16} className="text-white" />}
            count={inventory.pending.length}
            color="green"
            loading={inventory.loading}
            error={inventory.error}
            success={inventory.success}
            onRefresh={inventory.refresh}
          >
            {inventory.pending.map(item => (
              <InventoryCard
                key={item.approval_id}
                item={item}
                onApprove={inventory.approve}
                onDecline={inventory.decline}
              />
            ))}
          </ApprovalSection>

          {/* Sustainability — placeholder (hook not yet built) */}
          <ApprovalSection
            title="Sustainability Approvals"
            icon={<Leaf size={16} className="text-white" />}
            count={0}
            color="green"
            loading={false}
            error=""
            success=""
          >
            {null}
          </ApprovalSection>

        </div>
      </div>
    </Layout>
  );
};

export default ManagerPage;