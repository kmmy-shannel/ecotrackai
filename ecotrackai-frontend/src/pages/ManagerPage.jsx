import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import managerService from '../services/manager.service';
import api from '../services/api';
import {
  Users, Clock, AlertTriangle, Truck, Leaf, Package,
  ChevronDown, ChevronUp, UserCheck, UserX,
  UserPlus, Trash2, RefreshCw, Navigation, Fuel,
  CheckCircle, XCircle, Sparkles, Shield,
  CheckCircle2, CircleAlert, Activity
} from 'lucide-react';

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .mg-root,.mg-root *{font-family:'Poppins',sans-serif;box-sizing:border-box}

  @keyframes mg-in    {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes mg-slide {from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  @keyframes mg-pop   {from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  @keyframes mg-spin  {to{transform:rotate(360deg)}}
  @keyframes mg-pulse {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}

  .mg-page{animation:mg-in .3s ease both}

  /* ── Banner ── */
  .mg-banner{background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%);border-radius:20px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 6px 24px rgba(26,61,43,.22);border:1px solid rgba(82,183,136,.12);position:relative;overflow:hidden}
  .mg-banner::after{content:'';position:absolute;right:-50px;top:-50px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.03);pointer-events:none}
  .mg-pulse-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0;animation:mg-pulse 2.5s ease infinite;box-shadow:0 0 0 3px rgba(74,222,128,.18)}

  /* ── Banner buttons ── */
  .mg-btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:8px 15px;background:rgba(255,255,255,.08);color:#fff;border-radius:11px;font-size:12.5px;font-weight:600;border:1px solid rgba(255,255,255,.14);cursor:pointer;transition:background .15s,transform .13s;white-space:nowrap}
  .mg-btn-ghost:hover{background:rgba(255,255,255,.15);transform:translateY(-1px)}
  .mg-btn-ghost:disabled{opacity:.5;cursor:not-allowed;transform:none}

  /* ── Stat cards ── */
  .mg-stat{border-radius:18px;border:1px solid rgba(82,183,136,.18);box-shadow:0 2px 10px rgba(26,61,43,.07);transition:transform .2s,box-shadow .2s;animation:mg-in .3s ease both;overflow:hidden}
  .mg-stat:hover{transform:translateY(-3px);box-shadow:0 10px 26px rgba(26,61,43,.13)}
  .mg-stat-dk{background:linear-gradient(145deg,#1a3d2b,#2d6a4f);position:relative}
  .mg-stat-dk::after{content:'';position:absolute;right:-20px;top:-20px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none}
  .mg-stat-lt{background:#fff}
 .mg-stat-cell{padding:18px 20px;position:relative;z-index:1;min-height:120px;display:flex;flex-direction:column;justify-content:space-between}

  /* ── Panels ── */
  .mg-panel{background:#fff;border-radius:18px;border:1px solid rgba(82,183,136,.14);box-shadow:0 2px 12px rgba(26,61,43,.07);overflow:hidden;animation:mg-in .32s ease both}
  .mg-panel-hd{padding:13px 18px;background:linear-gradient(130deg,#0f2419,#1a3d2b,#2d6a4f);display:flex;align-items:center;justify-content:space-between}
  .mg-panel-hd-lt{padding:13px 18px;background:linear-gradient(to right,#f8fdf9,#edfaf2);border-bottom:1px solid rgba(82,183,136,.1);display:flex;align-items:center;justify-content:space-between}

  /* ── Approval cards ── */
  .mg-card{border:1px solid rgba(82,183,136,.14);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 1px 6px rgba(26,61,43,.05);transition:box-shadow .15s,border-color .15s;animation:mg-slide .22s ease both;margin-bottom:8px}
  .mg-card:hover{box-shadow:0 6px 18px rgba(26,61,43,.1);border-color:rgba(82,183,136,.3)}
  .mg-card:last-child{margin-bottom:0}
  .mg-card-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 15px;cursor:pointer;transition:background .12s}
  .mg-card-hd:hover{background:#f8fdf9}
  .mg-card-body{padding:14px 15px;border-top:1px solid rgba(82,183,136,.09);background:#f8fdf9;display:flex;flex-direction:column;gap:11px}

  /* ── Metrics row ── */
  .mg-metric-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .mg-metric-cell{background:#fff;border-radius:11px;padding:9px 11px;border:1px solid rgba(82,183,136,.1);text-align:center}

  /* ── AI suggestion ── */
  .mg-ai-box{display:flex;align-items:flex-start;gap:9px;padding:10px 12px;background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1px solid #ddd6fe;border-radius:11px}

  /* ── Textarea / input ── */
  .mg-inp{width:100%;padding:9px 12px;border:1.5px solid rgba(82,183,136,.2);border-radius:10px;font-size:12px;font-family:'Poppins',sans-serif;resize:none;outline:none;color:#1a3d2b;background:#fafffe;transition:border-color .15s,box-shadow .15s}
  .mg-inp:focus{border-color:#2d6a4f;box-shadow:0 0 0 3px rgba(45,106,79,.08);background:#fff}
  .mg-inp::placeholder{color:#adb5bd}

  /* ── Action buttons ── */
  .mg-btn-ok{flex:1;padding:9px;background:#1a3d2b;color:#fff;border-radius:10px;font-size:12px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:background .14s,transform .12s;box-shadow:0 4px 10px rgba(26,61,43,.22);font-family:'Poppins',sans-serif}
  .mg-btn-ok:hover{background:#2d6a4f;transform:translateY(-1px)}
  .mg-btn-ok:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .mg-btn-dl{flex:1;padding:9px;background:#dc2626;color:#fff;border-radius:10px;font-size:12px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:background .14s;box-shadow:0 4px 10px rgba(220,38,38,.22);font-family:'Poppins',sans-serif}
  .mg-btn-dl:hover{background:#b91c1c}
  .mg-btn-dl:disabled{opacity:.4;cursor:not-allowed}

  /* ── Status badges ── */
  .mg-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
  .mg-badge-pending{background:#fffbeb;color:#b45309;border:1.5px solid #fde68a}
  .mg-badge-green  {background:#d8f3dc;color:#166534;border:1.5px solid #86efac}
  .mg-badge-red    {background:#fee2e2;color:#991b1b;border:1.5px solid #fecaca}
  .mg-badge-blue   {background:#dbeafe;color:#1e40af;border:1.5px solid #bfdbfe}
  .mg-badge-amber  {background:#fef9c3;color:#92400e;border:1.5px solid #fde68a}
  .mg-badge-gray   {background:#f3f4f6;color:#6b7280;border:1.5px solid #e5e7eb}

  /* ── Risk dot ── */
  .mg-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .mg-dot-hi{background:#dc2626;animation:mg-pulse 1.8s ease infinite}
  .mg-dot-md{background:#d97706;animation:mg-pulse 2.4s ease infinite}
  .mg-dot-lo{background:#16a34a}

  /* ── Account list ── */
  .mg-acct{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(82,183,136,.07);transition:background .12s}
  .mg-acct:last-child{border-bottom:none}
  .mg-acct:hover{background:#f8fdf9}
  .mg-acct-av{width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,#1a3d2b,#2d6a4f);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0}

  /* ── Form ── */
  .mg-lbl{font-size:10.5px;font-weight:700;color:#374151;display:block;margin-bottom:5px;letter-spacing:.02em;text-transform:uppercase}
  .mg-field{width:100%;padding:9px 12px;border:1.5px solid rgba(82,183,136,.22);border-radius:10px;font-size:12.5px;outline:none;transition:border-color .16s,box-shadow .16s;color:#1a3d2b;background:#fafffe;font-family:'Poppins',sans-serif}
  .mg-field::placeholder{color:#adb5bd}
  .mg-field:focus{border-color:#2d6a4f;box-shadow:0 0 0 3px rgba(45,106,79,.09);background:#fff}
  .mg-radio{display:flex;align-items:center;gap:9px;padding:9px 11px;border:1.5px solid rgba(82,183,136,.16);border-radius:10px;cursor:pointer;transition:all .14s}
  .mg-radio:hover{border-color:#52b788;background:#f0faf4}
  .mg-radio.sel{border-color:#1a3d2b;background:#d8f3dc}
  .mg-btn-cc{flex:1;padding:9px;border:1.5px solid rgba(82,183,136,.2);border-radius:10px;font-size:12px;font-weight:600;color:#6b7280;background:#fff;cursor:pointer;transition:background .14s;font-family:'Poppins',sans-serif}
  .mg-btn-cc:hover{background:#f0faf4;color:#1a3d2b;border-color:#52b788}

  /* ── Dept row ── */
  .mg-dept{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid rgba(82,183,136,.07);transition:background .12s}
  .mg-dept:last-child{border-bottom:none}
  .mg-dept:hover{background:#f8fdf9}

  /* ── Toasts ── */
  .mg-toast{padding:9px 13px;border-radius:11px;font-size:12.5px;display:flex;align-items:center;gap:7px;animation:mg-in .2s ease both;margin-bottom:10px}
  .mg-toast-ok {background:#d8f3dc;border:1px solid #86efac;color:#166534}
  .mg-toast-err{background:#fee2e2;border:1px solid #fecaca;color:#991b1b}

  /* ── Spinner / Empty ── */
  .mg-spin{border-radius:50%;border:2.5px solid #95d5b2;border-top-color:#2d6a4f;animation:mg-spin .65s linear infinite}
  .mg-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 20px;gap:8px;text-align:center}

  /* ── Savings saved tag ── */
  .mg-saved{display:inline-flex;align-items:center;padding:2px 7px;background:linear-gradient(135deg,#d8f3dc,#b7e4c7);color:#1a3d2b;border-radius:99px;font-size:10px;font-weight:800}
`;

if (typeof document !== 'undefined' && !document.getElementById('mg-styles')) {
  const el = document.createElement('style');
  el.id = 'mg-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const fmt = (v, dp = 1) => Number(v || 0).toFixed(dp);

const riskK = (level) => {
  const r = String(level || '').toLowerCase();
  if (r === 'high')   return 'hi';
  if (r === 'medium') return 'md';
  return 'lo';
};

/* ─── Hooks ──────────────────────────────────────────────────────────────────── */
function useLogistics() {
  const [pending, setPending] = useState([]);
  const [stats,   setStats]   = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
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
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id, comment = '') => {
    try { await api.post(`/manager/logistics/${id}/approve`, { comment }); flash(setSuccess, '✓ Route approved'); load(); }
    catch (err) { flash(setError, err.response?.data?.message || 'Failed to approve'); }
  };

  const decline = async (id, comment) => {
    if (!comment?.trim()) { flash(setError, 'A reason is required to decline'); return; }
    try { await api.post(`/manager/logistics/${id}/decline`, { comment }); flash(setSuccess, 'Route declined'); load(); }
    catch (err) { flash(setError, err.response?.data?.message || 'Failed to decline'); }
  };

  return { pending, stats, loading, error, success, approve, decline, refresh: load };
}

function useInventory() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const flash = (setter, msg) => { setter(msg); setTimeout(() => setter(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await api.get('/manager/inventory/pending');
      const data = res.data?.data ?? res.data ?? [];
      setPending(Array.isArray(data) ? data : []);
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Failed to load inventory data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id, comment = '') => {
    try { await api.post(`/manager/inventory/${id}/approve`, { comment }); flash(setSuccess, '✓ Action approved'); load(); }
    catch { flash(setError, 'Failed to approve'); }
  };

  const decline = async (id, comment) => {
    if (!comment?.trim()) { flash(setError, 'A reason is required'); return; }
    try { await api.post(`/manager/inventory/${id}/decline`, { comment }); flash(setSuccess, 'Action declined'); load(); }
    catch { flash(setError, 'Failed to decline'); }
  };

  return { pending, loading, error, success, approve, decline, refresh: load };
}

/* ─── StatCard ───────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, dark, delay = 0 }) => (
  <div className={`mg-stat ${dark ? 'mg-stat-dk' : 'mg-stat-lt'}`} style={{ animationDelay:`${delay}s` }}>
    <div className="mg-stat-cell" style={{ padding:'18px 20px' }}>
      {/* Icon row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{
          width:36, height:36, borderRadius:10,
          background: dark ? 'rgba(255,255,255,0.12)' : '#f0faf4',
          display:'flex', alignItems:'center', justifyContent:'center',
          border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(82,183,136,0.14)',
        }}>
          <Icon size={17} style={{ color: dark ? 'rgba(255,255,255,0.85)' : '#2d6a4f' }} />
        </div>
        <p style={{
          fontSize:9.5, fontWeight:800, textTransform:'uppercase',
          letterSpacing:'.09em', margin:0,
          color: dark ? 'rgba(255,255,255,0.45)' : '#b0bec5',
        }}>{label}</p>
      </div>
      {/* Number */}
      <p style={{
        fontSize:40, fontWeight:900, lineHeight:1,
        margin:'0 0 5px', letterSpacing:'-2px',
        color: dark ? '#fff' : '#111827',
      }}>{value}</p>
      {/* Sub */}
      <p style={{
        fontSize:11.5, margin:0, fontWeight:500,
        color: dark ? 'rgba(255,255,255,0.45)' : '#9ca3af',
      }}>{sub}</p>
    </div>
  </div>
);
/* ─── LogisticsCard ──────────────────────────────────────────────────────────── */
const LogisticsCard = ({ item, onApprove, onDecline, delay = 0 }) => {
  const [open,    setOpen]    = useState(false);
  const [comment, setComment] = useState('');
  const [busy,    setBusy]    = useState(false);

  const origin = (() => {
    try {
      const o = typeof item.location === 'string' ? JSON.parse(item.location) : item.location;
      return o?.address || o?.name || 'Origin';
    } catch { return item.location || 'Origin'; }
  })();

  const driver  = item.driver_full_name || item.driver_name || 'Unassigned';
  const vehicle = item.vehicle_type?.replace(/_/g, ' ') || '—';
  const hasSavings = item.savings_km || item.savings_fuel || item.savings_co2;

  const handleApprove = async () => { setBusy(true); await onApprove(item.approval_id, comment); setBusy(false); };
  const handleDecline = async () => { setBusy(true); await onDecline(item.approval_id, comment); setBusy(false); };

  return (
    <div className="mg-card" style={{ animationDelay:`${delay}s` }}>
      {/* Header */}
      <div className="mg-card-hd" onClick={() => setOpen(o => !o)}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#1a3d2b,#2d6a4f)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Truck size={17} style={{ color:'#fff' }} />
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {item.product_name || 'Unnamed Route'}
            </p>
            <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>{driver} · {vehicle}</p>
            <p style={{ fontSize:10.5, color:'#9ca3af', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{origin}</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0, marginLeft:8 }}>
          <span className="mg-badge mg-badge-pending">Pending</span>
          {open ? <ChevronUp size={15} style={{ color:'#9ca3af' }} /> : <ChevronDown size={15} style={{ color:'#9ca3af' }} />}
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="mg-card-body">

          {/* AI Savings */}
          {hasSavings && (
            <div style={{ border:'1px solid rgba(82,183,136,.14)', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'8px 13px', background:'linear-gradient(130deg,#0f2419,#1a3d2b,#2d6a4f)', display:'flex', alignItems:'center', gap:7 }}>
                <Sparkles size={12} style={{ color:'#86efac' }} />
                <span style={{ fontSize:10, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'.08em' }}>AI Optimization Savings</span>
              </div>
              <div className="mg-metric-row" style={{ padding:'10px 11px', background:'#fff' }}>
                {[
                  { label:'Distance', orig: item.total_distance_km, opt: item.optimized_distance, saved: item.savings_km,   unit:'km', Icon: Navigation, color:'#3b82f6' },
                  { label:'Fuel',     orig: item.estimated_fuel_consumption_liters, opt: item.optimized_fuel, saved: item.savings_fuel, unit:'L',  Icon: Fuel,       color:'#f97316' },
                  { label:'CO₂',      orig: item.estimated_carbon_kg, opt: item.optimized_carbon_kg, saved: item.savings_co2, unit:'kg', Icon: Leaf,       color:'#16a34a' },
                ].map(m => (
                  <div key={m.label} className="mg-metric-cell">
                    <m.Icon size={12} style={{ color:m.color, marginBottom:4 }} />
                    <p style={{ fontSize:9.5, color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 3px' }}>{m.label}</p>
                    <p style={{ fontSize:10.5, color:'#9ca3af', textDecoration:'line-through', margin:0 }}>{fmt(m.orig)}{m.unit}</p>
                    <p style={{ fontSize:14, fontWeight:800, color:'#1a3d2b', margin:'1px 0 3px' }}>{fmt(m.opt)}{m.unit}</p>
                    {m.saved > 0 && <span className="mg-saved">↓ {fmt(m.saved)}{m.unit}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI recommendation */}
          {item.ai_recommendation && (
            <div className="mg-ai-box">
              <Sparkles size={13} style={{ color:'#7c3aed', flexShrink:0, marginTop:1 }} />
              <p style={{ fontSize:12, color:'#5b21b6', margin:0, lineHeight:1.55 }}>{item.ai_recommendation}</p>
            </div>
          )}

          {/* Submitted */}
          <p style={{ fontSize:10.5, color:'#9ca3af', margin:0 }}>
            Submitted {new Date(item.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
            {item.submitted_by_name && ` · by ${item.submitted_by_name}`}
          </p>


        </div>
      )}
    </div>
  );
};

/* ─── InventoryCard ──────────────────────────────────────────────────────────── */
const InventoryCard = ({ item, onApprove, onDecline, delay = 0 }) => {
  const [open,    setOpen]    = useState(false);
  const [comment, setComment] = useState('');
  const [busy,    setBusy]    = useState(false);

  const k = riskK(item.priority);
  const handleApprove = async () => { setBusy(true); await onApprove(item.approval_id, comment); setBusy(false); };
  const handleDecline = async () => { setBusy(true); await onDecline(item.approval_id, comment); setBusy(false); };

  const avBg = k === 'hi' ? 'linear-gradient(135deg,#fee2e2,#fecaca)' :
               k === 'md' ? 'linear-gradient(135deg,#fef9c3,#fde68a)' :
                            'linear-gradient(135deg,#d8f3dc,#b7e4c7)';
  const avColor = k === 'hi' ? '#991b1b' : k === 'md' ? '#92400e' : '#1a3d2b';

  return (
    <div className="mg-card" style={{ animationDelay:`${delay}s` }}>
      <div className="mg-card-hd" onClick={() => setOpen(o => !o)}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:avBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Package size={17} style={{ color:avColor }} />
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {item.product_name || 'Product'}
            </p>
            <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>{item.quantity || '—'}</p>
            <p style={{ fontSize:10.5, color:'#9ca3af', margin:0 }}>{item.location || '—'}</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0, marginLeft:8 }}>
          <div className={`mg-dot mg-dot-${k}`} />
          <span className={`mg-badge mg-badge-${k === 'hi' ? 'red' : k === 'md' ? 'amber' : 'green'}`}>
            {(item.priority || 'low').toUpperCase()}
          </span>
          {open ? <ChevronUp size={15} style={{ color:'#9ca3af' }} /> : <ChevronDown size={15} style={{ color:'#9ca3af' }} />}
        </div>
      </div>

      {open && (
        <div className="mg-card-body">
          {item.ai_suggestion && (
            <div className="mg-ai-box">
              <Sparkles size={13} style={{ color:'#7c3aed', flexShrink:0, marginTop:1 }} />
              <p style={{ fontSize:12, color:'#5b21b6', margin:0, lineHeight:1.55 }}>{item.ai_suggestion}</p>
            </div>
          )}
          <p style={{ fontSize:10.5, color:'#9ca3af', margin:0 }}>
            Submitted {new Date(item.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
            {item.submitted_by_name && ` · by ${item.submitted_by_name}`}
          </p>

        </div>
      )}
    </div>
  );
};

/* ─── ApprovalSection ────────────────────────────────────────────────────────── */
const ApprovalSection = ({ title, icon: Icon, count, loading, error, success, children, onRefresh }) => (
  <div className="mg-panel">
    <div className="mg-panel-hd">
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={15} style={{ color:'#86efac' }} />
        </div>
        <span style={{ fontSize:12, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'.08em' }}>{title}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <span className="mg-badge mg-badge-pending" style={{ background:'rgba(255,255,255,.12)', color:'#fff', borderColor:'rgba(255,255,255,.2)' }}>
          {count} pending
        </span>
        {onRefresh && (
          <button onClick={onRefresh} className="mg-btn-ghost" style={{ padding:'5px 9px', fontSize:11 }} disabled={loading}>
            <RefreshCw size={11} style={loading ? { animation:'mg-spin .7s linear infinite' } : {}} />
          </button>
        )}
      </div>
    </div>

    {(error || success) && (
      <div style={{ margin:'10px 14px 0' }}>
        <div className={`mg-toast ${success ? 'mg-toast-ok' : 'mg-toast-err'}`}>
          {success ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          {success || error}
        </div>
      </div>
    )}

    <div style={{ padding:'12px 14px' }}>
      {loading ? (
        <div className="mg-empty">
          <div className="mg-spin" style={{ width:24, height:24 }} />
          <p style={{ fontSize:13, color:'#9ca3af', margin:0 }}>Loading…</p>
        </div>
      ) : count === 0 ? (
        <div className="mg-empty">
          <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CheckCircle2 size={22} style={{ color:'#2d6a4f' }} />
          </div>
          <p style={{ fontWeight:700, fontSize:13, color:'#1a3d2b', margin:0 }}>All caught up!</p>
          <p style={{ fontSize:11.5, color:'#9ca3af', margin:0 }}>No pending approvals</p>
        </div>
      ) : children}
    </div>
  </div>
);

/* ─── ManagerAccountsPanel ───────────────────────────────────────────────────── */
const ManagerAccountsPanel = () => {
  const [managers, setManagers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [formData, setFormData] = useState({ username:'', email:'', password:'', fullName:'', role:'' });

  const roleOptions = [
    { value:'inventory_manager',      label:'Inventory Manager',     icon:'📦', desc:'Manages products & stock' },
    { value:'logistics_manager',      label:'Logistics Manager',     icon:'🚛', desc:'Manages routes & deliveries' },
    { value:'sustainability_manager', label:'Sustainability Manager', icon:'🌿', desc:'Reviews environmental impact' },
    { value:'driver',                 label:'Driver',                icon:'🧭', desc:'Executes delivery routes' },
  ];

  useEffect(() => { loadManagers(); }, []);

  const loadManagers = async () => {
    try {
      setLoading(true);
      const res = await managerService.getAllManagers();
      setManagers(res.data?.managers || res.data?.data || []);
    } catch (err) { setError(err.response?.data?.message || 'Failed to load accounts'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await managerService.createManager(formData);
      setSuccess('Account created successfully');
      setFormData({ username:'', email:'', password:'', fullName:'', role:'' });
      setShowForm(false);
      loadManagers();
    } catch (err) {
      const d = err.response?.data;
      const errs = d?.error;
      setError(Array.isArray(errs) && errs.length > 0 ? errs[0] : d?.message || 'Failed to create account');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this account?')) return;
    try { await managerService.deleteManager(id); setSuccess('Account deactivated'); loadManagers(); }
    catch { setError('Failed to deactivate'); }
  };

  const roleLabel = (role) => roleOptions.find(r => r.value === role)?.label || role;

  return (
    <div className="mg-panel">
      <div className="mg-panel-hd">
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Users size={15} style={{ color:'#86efac' }} />
          </div>
          <span style={{ fontSize:12, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'.08em' }}>Team Accounts</span>
        </div>
        <span className="mg-badge" style={{ background:'rgba(255,255,255,.12)', color:'#fff', borderColor:'rgba(255,255,255,.2)' }}>
          {managers.length} accounts
        </span>
      </div>

      {(success || error) && (
        <div style={{ margin:'10px 14px 0' }}>
          <div className={`mg-toast ${success ? 'mg-toast-ok' : 'mg-toast-err'}`}>
            {success ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            {success || error}
          </div>
        </div>
      )}

      <div style={{ padding:'12px 14px' }}>
        {!showForm ? (
          <>
            <button onClick={() => setShowForm(true)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px', background:'#1a3d2b', color:'#fff', border:'none', borderRadius:11, fontSize:12.5, fontWeight:700, cursor:'pointer', marginBottom:11, fontFamily:'Poppins,sans-serif', transition:'background .14s', boxShadow:'0 4px 10px rgba(26,61,43,.22)' }}
              onMouseOver={e => e.currentTarget.style.background='#2d6a4f'}
              onMouseOut={e => e.currentTarget.style.background='#1a3d2b'}>
              <UserPlus size={14} /> Create Account
            </button>

            {loading ? (
              <div className="mg-empty">
                <div className="mg-spin" style={{ width:22, height:22 }} />
                <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>Loading…</p>
              </div>
            ) : managers.length === 0 ? (
              <div className="mg-empty">
                <div style={{ width:44, height:44, borderRadius:13, background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <UserX size={20} style={{ color:'#d1d5db' }} />
                </div>
                <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>No accounts yet</p>
              </div>
            ) : managers.map(m => (
              <div key={m.user_id} className="mg-acct">
                <div className="mg-acct-av">{m.full_name?.charAt(0)?.toUpperCase()}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12.5, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.full_name}</p>
                  <p style={{ fontSize:10.5, color:'#6b7280', margin:0, fontWeight:500 }}>{roleLabel(m.role)}</p>
                  <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>{m.email}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background: m.is_active ? '#4ade80' : '#d1d5db' }} />
                    <span style={{ fontSize:10, color:'#9ca3af' }}>{m.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(m.user_id)}
                  style={{ width:28, height:28, borderRadius:8, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#d1d5db', transition:'background .12s,color .12s' }}
                  onMouseOver={e => { e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.color='#dc2626'; }}
                  onMouseOut={e  => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#d1d5db'; }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:11 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
              <div>
                <label className="mg-lbl">Full Name *</label>
                <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName:e.target.value})} className="mg-field" placeholder="John Doe" required />
              </div>
              <div>
                <label className="mg-lbl">Username *</label>
                <input type="text" value={formData.username} onChange={e => setFormData({...formData, username:e.target.value})} className="mg-field" placeholder="johndoe" required />
              </div>
            </div>
            <div>
              <label className="mg-lbl">Email *</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email:e.target.value})} className="mg-field" placeholder="john@company.com" required />
            </div>
            <div>
              <label className="mg-lbl">Password *</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password:e.target.value})} className="mg-field" placeholder="Min. 6 characters" minLength={6} required />
            </div>
            <div>
              <label className="mg-lbl" style={{ marginBottom:7 }}>Role *</label>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {roleOptions.map(opt => (
                  <label key={opt.value} className={`mg-radio ${formData.role === opt.value ? 'sel' : ''}`}>
                    <input type="radio" name="role" value={opt.value} checked={formData.role === opt.value}
                      onChange={e => setFormData({...formData, role:e.target.value})}
                      style={{ accentColor:'#1a3d2b' }} required />
                    <span style={{ fontSize:16 }}>{opt.icon}</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:'#1a3d2b', margin:0 }}>{opt.label}</p>
                      <p style={{ fontSize:10.5, color:'#9ca3af', margin:0 }}>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:3 }}>
              <button type="button" className="mg-btn-cc"
                onClick={() => { setShowForm(false); setFormData({ username:'', email:'', password:'', fullName:'', role:'' }); setError(''); }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="mg-btn-ok">
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ─── ManagerPage ────────────────────────────────────────────────────────────── */
const ManagerPage = () => {
  const { user } = useAuth();
  const logistics = useLogistics();
  const inventory = useInventory();

  if (!user) return null;

  const today = new Date().toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  const totalPending = logistics.pending.length + inventory.pending.length;
  const stats = logistics.stats || {};

  return (
    <Layout currentPage="Process Manager" user={user}>
      <div className="mg-root mg-page" style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── Banner ── */}
        <div className="mg-banner">
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Shield size={13} style={{ color:'#86efac' }} />
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.1em' }}>
                EcoTrackAI — Process Manager
              </span>
            </div>
            <h1 style={{ color:'#fff', fontSize:20, fontWeight:900, margin:'0 0 7px', letterSpacing:'-.4px' }}>Manager Dashboard</h1>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className="mg-pulse-dot" />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>System Operational</span>
              </div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Clock size={10} style={{ color:'rgba(255,255,255,0.35)' }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{today}</span>
              </div>
              {totalPending > 0 && (
                <>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <CircleAlert size={11} style={{ color:'#fca5a5' }} />
                    <span style={{ fontSize:11, color:'#fca5a5', fontWeight:600 }}>{totalPending} approval{totalPending !== 1 ? 's' : ''} pending</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <button className="mg-btn-ghost"
            onClick={() => { logistics.refresh(); inventory.refresh(); }}
            disabled={logistics.loading || inventory.loading}>
            <RefreshCw size={12} style={(logistics.loading || inventory.loading) ? { animation:'mg-spin .7s linear infinite' } : {}} />
            {(logistics.loading || inventory.loading) ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
    <StatCard dark  label="Total Pending"   value={totalPending}                sub="Awaiting review"   icon={Activity}  delay={0.04} />
    <StatCard       label="Logistics"        value={logistics.pending.length}    sub="Route approvals"   icon={Truck}     delay={0.08} />
    <StatCard dark  label="Inventory"        value={inventory.pending.length}    sub="Stock approvals"   icon={Package}   delay={0.12} />
    <StatCard       label="Sustainability"   value={0}                           sub="Carbon approvals"  icon={Leaf}      delay={0.16} />
  </div>

        {/* ── Main Grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:14, alignItems:'start' }}>

          {/* Left — accounts + dept summary */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <ManagerAccountsPanel />

            {/* Dept counts */}
            <div className="mg-panel">
              <div className="mg-panel-hd">
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:30, height:30, borderRadius:9, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Activity size={15} style={{ color:'#86efac' }} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'.08em' }}>Pending by Dept.</span>
                </div>
              </div>
              {[
                { label:'Logistics',      count: logistics.pending.length, Icon: Truck,   bg:'#ede9fe', ic:'#7c3aed' },
                { label:'Inventory',      count: inventory.pending.length, Icon: Package, bg:'#dbeafe', ic:'#1d4ed8' },
                { label:'Sustainability', count: 0,                        Icon: Leaf,    bg:'#d8f3dc', ic:'#166534' },
              ].map(d => (
                <div key={d.label} className="mg-dept">
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:9, background:d.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <d.Icon size={14} style={{ color:d.ic }} />
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{d.label}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontSize:16, fontWeight:900, color:'#1a3d2b' }}>{d.count}</span>
                    {d.count > 0 && <span className="mg-badge mg-badge-pending">{d.count > 1 ? 'pending' : 'pending'}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — approval feeds */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Logistics */}
            <ApprovalSection
              title="Logistics Approvals"
              icon={Truck}
              count={logistics.pending.length}
              loading={logistics.loading}
              error={logistics.error}
              success={logistics.success}
              onRefresh={logistics.refresh}
            >
              {logistics.pending.map((item, idx) => (
                <LogisticsCard key={item.approval_id} item={item} onApprove={logistics.approve} onDecline={logistics.decline} delay={idx * 0.04} />
              ))}
            </ApprovalSection>

            {/* Inventory */}
            <ApprovalSection
              title="Inventory Approvals"
              icon={Package}
              count={inventory.pending.length}
              loading={inventory.loading}
              error={inventory.error}
              success={inventory.success}
              onRefresh={inventory.refresh}
            >
              {inventory.pending.map((item, idx) => (
                <InventoryCard key={item.approval_id} item={item} onApprove={inventory.approve} onDecline={inventory.decline} delay={idx * 0.04} />
              ))}
            </ApprovalSection>

            {/* Sustainability — placeholder */}
            <ApprovalSection
              title="Sustainability Approvals"
              icon={Leaf}
              count={0}
              loading={false}
              error=""
              success=""
            >
              {null}
            </ApprovalSection>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ManagerPage;
