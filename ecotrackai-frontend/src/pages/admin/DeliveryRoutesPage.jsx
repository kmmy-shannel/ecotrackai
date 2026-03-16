import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';
import PlanNewDeliveryModal from '../../components/PlanNewDeliveryModal';
import {
  Plus, Search, Trash2, MapPin, Navigation,
  Sparkles, Fuel, Leaf,
  ChevronDown, ChevronUp, Route, Package, Layers, X,
  CheckCircle, AlertTriangle, Zap, RefreshCw,
  Truck, Clock, Map, AlertCircle, Ban,
} from 'lucide-react';
import useDelivery from '../../hooks/useDelivery';
import { canTransitionRoute, getTimelineChips } from '../../utils/statusMachines';
import deliveryService from '../../services/delivery.service';

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .dr-root,.dr-root *{font-family:'Poppins',sans-serif;box-sizing:border-box}

  @keyframes dr-in    {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes dr-slide {from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  @keyframes dr-pop   {from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  @keyframes dr-spin  {to{transform:rotate(360deg)}}
  @keyframes dr-pulse {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}

  .dr-page{animation:dr-in .3s ease both}

  .dr-banner{background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%);border-radius:20px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 6px 24px rgba(26,61,43,0.22);border:1px solid rgba(82,183,136,0.12);position:relative;overflow:hidden}
  .dr-banner::after{content:'';position:absolute;right:-50px;top:-50px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.03);pointer-events:none}
  .dr-pulse-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0;animation:dr-pulse 2.5s ease infinite;box-shadow:0 0 0 3px rgba(74,222,128,0.18)}

  .dr-btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:8px 15px;background:rgba(255,255,255,0.08);color:#fff;border-radius:11px;font-size:12.5px;font-weight:600;border:1px solid rgba(255,255,255,0.14);cursor:pointer;transition:background .15s,transform .13s;white-space:nowrap}
  .dr-btn-ghost:hover{background:rgba(255,255,255,0.15);transform:translateY(-1px)}
  .dr-btn-solid{display:inline-flex;align-items:center;gap:6px;padding:8px 17px;background:#fff;color:#1a3d2b;border-radius:11px;font-size:12.5px;font-weight:800;border:none;cursor:pointer;transition:transform .13s,box-shadow .15s;box-shadow:0 2px 8px rgba(0,0,0,0.1);white-space:nowrap}
  .dr-btn-solid:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(0,0,0,0.14)}

  .dr-stat{border-radius:18px;border:1px solid rgba(82,183,136,0.18);box-shadow:0 2px 10px rgba(26,61,43,0.07);transition:transform .2s,box-shadow .2s;animation:dr-in .3s ease both;overflow:hidden}
  .dr-stat:hover{transform:translateY(-3px);box-shadow:0 10px 26px rgba(26,61,43,0.13)}
  .dr-stat-dk{background:linear-gradient(145deg,#1a3d2b,#2d6a4f);position:relative;overflow:hidden}
  .dr-stat-dk::after{content:'';position:absolute;right:-20px;top:-20px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.05);pointer-events:none}
  .dr-stat-lt{background:#fff}
  .dr-stat-cell{padding:16px 18px;position:relative;z-index:1}

  .dr-bar{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(82,183,136,.16);border-radius:16px;padding:9px 13px;box-shadow:0 2px 8px rgba(26,61,43,.05)}
  .dr-srch-wrap{position:relative;flex:1;max-width:280px}
  .dr-srch{width:100%;padding:8px 32px 8px 34px;background:#f8fdf9;border:1.5px solid rgba(82,183,136,.18);border-radius:10px;font-size:13px;outline:none;color:#1a3d2b;transition:border-color .16s,box-shadow .16s}
  .dr-srch::placeholder{color:#adb5bd}
  .dr-srch:focus{border-color:#2d6a4f;box-shadow:0 0 0 3px rgba(45,106,79,.09);background:#fff}
  .dr-divider{width:1px;height:24px;background:rgba(82,183,136,.18);flex-shrink:0}
  .dr-ibtn{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;cursor:pointer;color:#6b7280;transition:background .14s,color .14s;flex-shrink:0}
  .dr-ibtn:hover{background:#f0faf4;color:#1a3d2b}
  .dr-add-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:#1a3d2b;color:#fff;border-radius:11px;font-size:13px;font-weight:700;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .16s,transform .13s,box-shadow .16s;box-shadow:0 4px 12px rgba(26,61,43,.28)}
  .dr-add-btn:hover{background:#2d6a4f;transform:translateY(-1px);box-shadow:0 6px 18px rgba(26,61,43,.32)}

  .dr-draft-wrap{background:linear-gradient(135deg,#fff7ed,#fff3e0);border:1px solid rgba(249,115,22,0.25);border-radius:16px;padding:12px 16px;display:flex;align-items:start;justify-content:space-between;gap:12px;box-shadow:0 2px 10px rgba(249,115,22,0.08);transition:border-color .15s}
  .dr-draft-wrap:hover{border-color:rgba(249,115,22,0.45)}
  .dr-draft-av{width:36px;height:36px;background:linear-gradient(135deg,#fed7aa,#fdba74);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}

  .dr-status{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
  .dr-s-planned        {background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe}
  .dr-s-optimized      {background:#f5f3ff;color:#6d28d9;border:1.5px solid #ddd6fe}
  .dr-s-awaiting       {background:#fff7ed;color:#c2410c;border:1.5px solid #fed7aa}
  .dr-s-approved       {background:#f0fdf4;color:#166534;border:1.5px solid #bbf7d0}
  .dr-s-declined       {background:#fef2f2;color:#991b1b;border:1.5px solid #fecaca}
  .dr-s-transit        {background:#eff6ff;color:#1e40af;border:1.5px solid #bfdbfe}
  .dr-s-delivered      {background:#d8f3dc;color:#1a3d2b;border:1.5px solid #86efac}
  .dr-s-cancelled      {background:#f3f4f6;color:#6b7280;border:1.5px solid #d1d5db}
  .dr-s-default        {background:#f3f4f6;color:#6b7280;border:1.5px solid #e5e7eb}

  .dr-table{background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(82,183,136,.14);box-shadow:0 3px 18px rgba(26,61,43,.07)}
  .dr-thead{display:grid;grid-template-columns:1.6fr 1.3fr 1.5fr 1fr 1.2fr 110px;gap:10px;padding:12px 20px;background:linear-gradient(to right,#f8fdf9,#edfaf2);border-bottom:1px solid rgba(82,183,136,.11);align-items:center}
  .dr-th{font-size:10px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em}
  .dr-row{display:grid;grid-template-columns:1.6fr 1.3fr 1.5fr 1fr 1.2fr 110px;gap:10px;padding:14px 20px;border-bottom:1px solid rgba(82,183,136,.07);align-items:center;transition:background .13s;animation:dr-slide .22s ease both}
  .dr-row:hover{background:linear-gradient(to right,#f8fdf9,#fafffe)}
  .dr-row:last-child{border-bottom:none}

  .dr-av{width:40px;height:40px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
  .dr-av-blue  {background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af}
  .dr-av-green {background:linear-gradient(135deg,#d8f3dc,#b7e4c7);color:#1a3d2b}
  .dr-av-purple{background:linear-gradient(135deg,#ede9fe,#ddd6fe);color:#5b21b6}
  .dr-av-red   {background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b}
  .dr-av-gray  {background:linear-gradient(135deg,#f3f4f6,#e5e7eb);color:#6b7280}

  .dr-act{width:30px;height:30px;border-radius:8px;border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s,transform .12s;color:#9ca3af}
  .dr-act:hover{transform:scale(1.12)}
  .dr-act:disabled{opacity:.35;cursor:not-allowed;transform:none!important}
  .dr-act-expand:hover  {background:#eff6ff;color:#1e40af}
  .dr-act-ai:hover      {background:#f5f3ff;color:#6d28d9}
  .dr-act-approve:hover {background:#f0fdf4;color:#166534}
  .dr-act-resubmit:hover{background:#fff7ed;color:#c2410c}
  .dr-act-del:hover     {background:#fee2e2;color:#991b1b}
  .dr-act-cancel:hover  {background:#fef2f2;color:#dc2626}

  .dr-detail{background:#f8fdf9;border-top:1px solid rgba(82,183,136,.1);padding:16px 20px;animation:dr-in .18s ease both}
  .dr-detail-card{background:#fff;border-radius:14px;border:1px solid rgba(82,183,136,.12);overflow:hidden}
  .dr-det-cell{background:#f8fdf9;border-radius:11px;padding:10px 12px;border:1px solid rgba(82,183,136,.1)}

  .dr-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:10.5px;font-weight:600}
  .dr-chip-done   {background:#d8f3dc;color:#166534}
  .dr-chip-current{background:#dbeafe;color:#1e40af}
  .dr-chip-next   {background:#f3f4f6;color:#9ca3af}

  .dr-stop-line{width:1px;height:22px;background:rgba(82,183,136,.3);margin:2px 0 2px 5px}
  .dr-stop-dot-o{width:11px;height:11px;border-radius:50%;background:#16a34a;flex-shrink:0}
  .dr-stop-dot-d{width:11px;height:11px;border-radius:50%;background:#dc2626;flex-shrink:0}
  .dr-stop-dot-m{width:11px;height:11px;border-radius:50%;background:#3b82f6;flex-shrink:0}

  .dr-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600}
  .dr-badge-orange{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}

  .dr-rule{height:1px;background:rgba(82,183,136,.1);margin:13px 0}
  .dr-decline-card{background:linear-gradient(135deg,#fef2f2,#fde8e8);border:1px solid #fecaca;border-radius:13px;padding:12px 15px}
  .dr-cancel-card{background:linear-gradient(135deg,#f9fafb,#f3f4f6);border:1px solid #d1d5db;border-radius:13px;padding:12px 15px}

  .dr-modal-back{position:fixed;inset:0;background:rgba(8,20,12,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px;animation:dr-in .16s ease both}
  .dr-modal{background:#fff;border-radius:24px;box-shadow:0 32px 80px rgba(0,0,0,.22);width:100%;max-width:860px;max-height:92vh;overflow-y:auto;animation:dr-pop .2s cubic-bezier(.34,1.4,.64,1) both}
  .dr-modal-hd{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;background:linear-gradient(135deg,#1a3d2b,#2d6a4f);border-radius:24px 24px 0 0;position:sticky;top:0;z-index:2}
  .dr-modal-body{padding:22px 24px;display:flex;flex-direction:column;gap:18px}
  .dr-modal-foot{display:flex;gap:9px;padding:16px 24px 22px;border-top:1px solid rgba(82,183,136,.09);position:sticky;bottom:0;background:#fff;border-radius:0 0 24px 24px}
  .dr-btn-ok{flex:1;padding:12px;background:#1a3d2b;color:#fff;border-radius:12px;font-size:13px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .16s,transform .12s;box-shadow:0 4px 12px rgba(26,61,43,.26)}
  .dr-btn-ok:hover{background:#2d6a4f;transform:translateY(-1px)}
  .dr-btn-cc{flex:1;padding:12px;border:1.5px solid rgba(82,183,136,.2);border-radius:12px;font-size:13px;font-weight:600;color:#6b7280;background:#fff;cursor:pointer;transition:background .14s}
  .dr-btn-cc:hover{background:#f0faf4;color:#1a3d2b;border-color:#52b788}

  .dr-metric-row{display:grid;grid-template-columns:1.2fr 1fr 1fr 1.2fr;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(82,183,136,.08);align-items:center}
  .dr-metric-row:last-child{border-bottom:none}

  .dr-stop-card{border-radius:14px;overflow:hidden}
  .dr-stop-orig{background:#f8fdf9;border:1px solid rgba(82,183,136,.14)}
  .dr-stop-opt {background:linear-gradient(135deg,#f0fdf4,#d8f3dc);border:1px solid #86efac}

  .dr-saved{display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#d8f3dc,#b7e4c7);color:#1a3d2b;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800}
  .dr-rec-item{display:flex;align-items:start;gap:10px;padding:10px 12px;background:linear-gradient(135deg,#f8fdf9,#f0fdf4);border:1px solid rgba(82,183,136,.12);border-radius:12px}
  .dr-rec-num{width:22px;height:22px;background:#1a3d2b;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;margin-top:1px}

  .dr-spin{border-radius:50%;border:2.5px solid #95d5b2;border-top-color:#2d6a4f;animation:dr-spin .65s linear infinite}
  .dr-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 20px;gap:11px;text-align:center}
  .dr-foot{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:linear-gradient(to right,#f8fdf9,#edfaf2);border-top:1px solid rgba(82,183,136,.09)}

  /* Delete confirm modal */
  .dr-del-modal-back{position:fixed;inset:0;background:rgba(8,20,12,.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:60;padding:16px;animation:dr-in .15s ease both}
  .dr-del-modal{background:#fff;border-radius:22px;box-shadow:0 28px 70px rgba(0,0,0,.24);width:100%;max-width:460px;overflow:hidden;animation:dr-pop .2s cubic-bezier(.34,1.4,.64,1) both}
  .dr-del-hd{padding:18px 22px;display:flex;align-items:center;gap:12px}
  .dr-del-icon{width:40px;height:40px;background:rgba(255,255,255,.15);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .dr-del-body{padding:0 22px 20px}
  .dr-del-info{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;margin-bottom:14px}
  .dr-del-foot{padding:0 22px 22px;display:flex;gap:10px}
  .dr-del-cancel{flex:1;padding:11px;border:1.5px solid #e5e7eb;border-radius:11px;font-size:13px;font-weight:600;color:#6b7280;background:#fff;cursor:pointer;transition:background .13s;font-family:'Poppins',sans-serif}
  .dr-del-cancel:hover{background:#f9fafb}
  .dr-del-confirm{flex:1;padding:11px;color:#fff;border-radius:11px;font-size:13px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .13s;font-family:'Poppins',sans-serif}
  .dr-del-confirm:disabled{opacity:.55;cursor:not-allowed}

  /* Tooltip */
  .dr-del-tooltip{position:relative;display:inline-flex}
  .dr-del-tooltip .dr-tooltip-text{visibility:hidden;position:absolute;bottom:calc(100% + 6px);right:0;background:#1f2937;color:#fff;font-size:10.5px;font-weight:500;padding:5px 10px;border-radius:8px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s;font-family:'Poppins',sans-serif;z-index:10}
  .dr-del-tooltip:hover .dr-tooltip-text{visibility:visible;opacity:1}

  .dr-cargo-pill{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:7px;font-size:10.5px;font-weight:600;background:#f0fdf4;color:#166534;border:1px solid #86efac;white-space:nowrap}
  .dr-cargo-more{font-size:10px;color:#9ca3af;font-weight:500}
  .dr-cargo-strip{background:linear-gradient(135deg,#f0fdf4,#e6f7ee);border:1px solid rgba(82,183,136,.2);border-radius:12px;padding:11px 14px}
  .dr-cargo-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(82,183,136,.08)}
  .dr-cargo-item:last-child{border-bottom:none;padding-bottom:0}

  /* Cancel reason textarea */
  .dr-reason-ta{width:100%;padding:10px 13px;border:1.5px solid rgba(220,38,38,.3);border-radius:11px;font-size:13px;outline:none;resize:vertical;min-height:72px;font-family:'Poppins',sans-serif;color:#374151;background:#fffafa;transition:border-color .16s,box-shadow .16s}
  .dr-reason-ta:focus{border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.09);background:#fff}
  .dr-reason-ta::placeholder{color:#adb5bd}
`;

if (typeof document !== 'undefined' && !document.getElementById('dr-styles')) {
  const el = document.createElement('style');
  el.id = 'dr-styles'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── Leaflet ────────────────────────────────────────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
const mkIcon = (c) => new L.Icon({ iconUrl:`https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${c}.png`, shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41] });
const originIcon = mkIcon('green'), stopIcon = mkIcon('blue'), destIcon = mkIcon('red');

const DAGUPAN_CENTER = [16.0433, 120.3339];
const DAGUPAN_BOUNDS = [[15.98, 120.27], [16.11, 120.41]];
const MAP_LAYERS = {
  hybrid:    { name:'Hybrid',    url:'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',  attr:'© Google Maps' },
  satellite: { name:'Satellite', url:'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',  attr:'© Google Maps' },
  streets:   { name:'Streets',   url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',   attr:'© OpenStreetMap' },
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const fmt = (v, dp = 2) => Number(v || 0).toFixed(dp);
const pct = (val, base) => (base > 0 ? `${Math.round((Number(val)/Number(base))*100)}%` : '0%');

// ── Delete: only planned ──────────────────────────────────────────────────────
// Allow hard delete for routes that never started, or have been cancelled.
const DELETABLE_STATUSES = ['planned', 'cancelled'];
const canDelete = (status) => DELETABLE_STATUSES.includes(status);
const deleteBlockReason = (status) => {
  const map = {
    optimized:          'Optimized routes cannot be deleted — reset to planned first',
    awaiting_approval:  'Cannot delete while awaiting Logistics Manager approval',
    approved:           'Approved routes cannot be deleted — use Cancel instead',
    in_transit:         'Delivery is in progress — use Cancel instead',
    delivered:          'Completed deliveries cannot be deleted',
    declined:           'Declined routes cannot be deleted — resubmit or contact admin',
    cancelled:          'Already cancelled',
    draft:              'Draft routes cannot be deleted directly',
  };
  return map[status] || `Cannot delete a route with status "${status}"`;
};

// ── Cancel: planned / awaiting_approval / approved / in_transit ──────────────
const CANCELLABLE_STATUSES = new Set(['planned', 'awaiting_approval', 'approved', 'in_transit']);
const canCancel = (status) => CANCELLABLE_STATUSES.has(status);

// Per-status label and urgency level for the cancel modal
const cancelMeta = (status) => {
  const map = {
    planned:           { label: 'Planned',            color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', warning: false, driverActive: false },
    awaiting_approval: { label: 'Awaiting Approval',  color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', warning: false, driverActive: false },
    approved:          { label: 'Approved',            color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', warning: true,  driverActive: true  },
    in_transit:        { label: 'In Transit',          color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', warning: true,  driverActive: true  },
  };
  return map[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', warning: false, driverActive: false };
};

const statusCls = (s) => {
  if (s === 'planned')           return 'dr-status dr-s-planned';
  if (s === 'optimized')         return 'dr-status dr-s-optimized';
  if (s === 'awaiting_approval') return 'dr-status dr-s-awaiting';
  if (s === 'approved')          return 'dr-status dr-s-approved';
  if (s === 'declined')          return 'dr-status dr-s-declined';
  if (s === 'in_transit')        return 'dr-status dr-s-transit';
  if (s === 'delivered')         return 'dr-status dr-s-delivered';
  if (s === 'cancelled')         return 'dr-status dr-s-cancelled';
  return 'dr-status dr-s-default';
};

const avCls = (s) => {
  if (s === 'approved' || s === 'delivered') return 'dr-av dr-av-green';
  if (s === 'declined' || s === 'cancelled') return 'dr-av dr-av-gray';
  if (s === 'optimized')                     return 'dr-av dr-av-purple';
  return 'dr-av dr-av-blue';
};

const dotStyle = (s) => {
  const pulse = ['declined','awaiting_approval','in_transit'].includes(s);
  const bg = s==='declined'||s==='cancelled'?'#9ca3af':s==='awaiting_approval'?'#f97316':s==='in_transit'?'#3b82f6':s==='approved'||s==='delivered'?'#16a34a':'#9ca3af';
  return { width:7,height:7,borderRadius:'50%',background:bg,flexShrink:0,...(pulse?{animation:'dr-pulse 2s ease infinite'}:{}) };
};

// ── Cargo helpers (same as before) ───────────────────────────────────────────
const getRouteCargo = (delivery, stops = []) => {
  const topLevel = Array.isArray(delivery.cargo) ? delivery.cargo : [];
  if (topLevel.length > 0) return topLevel;

  const map = {};
  for (const stop of stops) {
    const products = Array.isArray(stop.products) ? stop.products : [];
    for (const p of products) {
      if (!p) continue;
      const name = p.productName || p.product_name || p.name || '';
      if (!name) continue;
      const qty  = Number(p.quantity || p.qty || 0);
      const unit = p.unit || p.unit_of_measure || 'kg';
      const key  = name.toLowerCase();
      if (!map[key]) map[key] = { productName: name, quantity: 0, unit };
      map[key].quantity += qty;
    }
  }
  return Object.values(map);
};

/* ─── StatCard ───────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, icon: Icon, dark, delay=0 }) => (
  <div className={`dr-stat ${dark?'dr-stat-dk':'dr-stat-lt'}`} style={{ animationDelay:`${delay}s` }}>
    <div className="dr-stat-cell">
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
        <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',margin:0,color:dark?'rgba(255,255,255,0.5)':'#9ca3af' }}>{label}</p>
        <div style={{ width:30,height:30,borderRadius:9,background:dark?'rgba(255,255,255,0.1)':'#f0faf4',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Icon size={15} style={{ color:dark?'rgba(255,255,255,0.85)':'#2d6a4f' }} />
        </div>
      </div>
      <p style={{ fontSize:36,fontWeight:900,lineHeight:1,margin:'0 0 6px',letterSpacing:'-1.5px',color:dark?'#fff':'#111827' }}>{value}</p>
      <p style={{ fontSize:11,margin:0,color:dark?'rgba(255,255,255,0.5)':'#9ca3af' }}>{sub}</p>
    </div>
  </div>
);

/* ─── MapFitBounds ───────────────────────────────────────────────────────────── */
const MapFitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions?.length > 1) { try { map.fitBounds(positions, { padding:[40,40] }); } catch { map.setView(DAGUPAN_CENTER,14); } }
    else map.setView(DAGUPAN_CENTER,14);
  }, [positions, map]);
  return null;
};

/* ─── fetchRoadRoute ─────────────────────────────────────────────────────────── */
const fetchRoadRoute = async (stops) => {
  if (!stops || stops.length < 2) return null;
  const valid = stops.filter(s => s.lat && s.lng);
  if (valid.length < 2) return null;
  try {
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${valid.map(s=>`${s.lng},${s.lat}`).join(';')}?overview=full&geometries=geojson`);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    return data.routes[0].geometry.coordinates.map(([lng,lat]) => [lat,lng]);
  } catch { return null; }
};

/* ─── RouteMap ───────────────────────────────────────────────────────────────── */
const RouteMap = ({ originalStops, optimizedStops }) => {
  const [mapLayer,   setMapLayer]   = useState('hybrid');
  const [showLayers, setShowLayers] = useState(false);
  const [activeView, setActiveView] = useState('both');
  const [origRoad,   setOrigRoad]   = useState(null);
  const [optRoad,    setOptRoad]    = useState(null);
  const [loading,    setLoading]    = useState(false);

  const validO = (originalStops||[]).filter(s=>s.lat&&s.lng);
  const validP = (optimizedStops||[]).filter(s=>s.lat&&s.lng);
  const all    = validO.length > 0 ? validO : validP;
  const fitPos = all.length > 0 ? all.map(s=>[s.lat,s.lng]) : null;

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true); setOrigRoad(null); setOptRoad(null);
      const [o,p] = await Promise.all([fetchRoadRoute(validO),fetchRoadRoute(validP)]);
      if (!cancel) { setOrigRoad(o||validO.map(s=>[s.lat,s.lng])); setOptRoad(p||validP.map(s=>[s.lat,s.lng])); setLoading(false); }
    };
    if (all.length >= 2) load();
    return () => { cancel = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(originalStops), JSON.stringify(optimizedStops)]);

  const getIcon = (t) => t==='origin'?originIcon:t==='destination'?destIcon:stopIcon;

  return (
    <div style={{ position:'relative',borderRadius:16,overflow:'hidden',border:'1px solid rgba(82,183,136,.18)',boxShadow:'0 3px 14px rgba(26,61,43,.08)',height:360 }}>
      {loading && (
        <div style={{ position:'absolute',inset:0,zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.65)',pointerEvents:'none' }}>
          <div style={{ background:'#fff',borderRadius:12,padding:'10px 16px',boxShadow:'0 4px 16px rgba(0,0,0,.1)',border:'1px solid rgba(82,183,136,.2)',display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#6b7280',fontFamily:'Poppins,sans-serif' }}>
            <div className="dr-spin" style={{ width:14,height:14 }} /> Snapping to roads…
          </div>
        </div>
      )}
      <div style={{ position:'absolute',top:10,left:10,zIndex:1000,display:'flex',background:'#fff',borderRadius:10,boxShadow:'0 3px 12px rgba(0,0,0,.1)',border:'1px solid rgba(82,183,136,.18)',overflow:'hidden' }}>
        {[['both','Both'],['original','Original'],['optimized','Optimized']].map(([v,l]) => (
          <button key={v} onClick={() => setActiveView(v)} style={{ padding:'6px 12px',fontSize:11,fontWeight:600,cursor:'pointer',border:'none',fontFamily:'Poppins,sans-serif',transition:'all .13s',background:activeView===v?'#1a3d2b':'transparent',color:activeView===v?'#fff':'#6b7280' }}>{l}</button>
        ))}
      </div>
      <div style={{ position:'absolute',top:10,right:10,zIndex:1000 }}>
        <button onClick={() => setShowLayers(!showLayers)} style={{ background:'#fff',padding:'6px 12px',borderRadius:10,boxShadow:'0 3px 12px rgba(0,0,0,.1)',border:'1px solid rgba(82,183,136,.18)',display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:600,color:'#374151',cursor:'pointer',fontFamily:'Poppins,sans-serif' }}>
          <Layers size={13} />{MAP_LAYERS[mapLayer].name}
        </button>
        {showLayers && (
          <div style={{ position:'absolute',top:'calc(100% + 6px)',right:0,background:'#fff',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,.12)',border:'1px solid rgba(82,183,136,.18)',minWidth:130,overflow:'hidden' }}>
            {Object.entries(MAP_LAYERS).map(([key,l]) => (
              <button key={key} onClick={() => { setMapLayer(key); setShowLayers(false); }} style={{ width:'100%',padding:'8px 12px',textAlign:'left',fontSize:12,cursor:'pointer',border:'none',fontFamily:'Poppins,sans-serif',fontWeight:mapLayer===key?700:500,background:mapLayer===key?'#d8f3dc':'transparent',color:mapLayer===key?'#1a3d2b':'#374151' }}>{l.name}</button>
            ))}
          </div>
        )}
      </div>
      <div style={{ position:'absolute',bottom:36,right:10,zIndex:1000,background:'#1a3d2b',color:'#fff',borderRadius:8,padding:'4px 10px',fontSize:10,fontWeight:700,fontFamily:'Poppins,sans-serif' }}>
        Dagupan City, Pangasinan
      </div>
      <MapContainer center={DAGUPAN_CENTER} zoom={14} minZoom={12} maxZoom={19} maxBounds={DAGUPAN_BOUNDS} maxBoundsViscosity={0.9} style={{ height:'100%',width:'100%' }}>
        <TileLayer url={MAP_LAYERS[mapLayer].url} attribution={MAP_LAYERS[mapLayer].attr} maxZoom={20} />
        <MapFitBounds positions={fitPos} />
        {(activeView==='both'||activeView==='original') && origRoad?.length>1 && <Polyline positions={origRoad} pathOptions={{ color:'#3b82f6',weight:4,dashArray:'10 6',opacity:.9 }} />}
        {(activeView==='both'||activeView==='optimized') && optRoad?.length>1  && <Polyline positions={optRoad}  pathOptions={{ color:'#2d6a4f',weight:5,opacity:.95 }} />}
        {(activeView==='both'||activeView==='original') && validO.map((s,i) => <Marker key={`o-${i}`} position={[s.lat,s.lng]} icon={getIcon(s.type)}><Popup><div style={{ fontFamily:'Poppins,sans-serif',fontSize:12 }}><p style={{ fontWeight:700,margin:'0 0 3px',textTransform:'capitalize' }}>{s.type}</p><p style={{ color:'#6b7280',margin:0 }}>{s.location}</p></div></Popup></Marker>)}
        {(activeView==='both'||activeView==='optimized') && validP.map((s,i) => <Marker key={`p-${i}`} position={[s.lat,s.lng]} icon={getIcon(s.type)}><Popup><div style={{ fontFamily:'Poppins,sans-serif',fontSize:12 }}><p style={{ fontWeight:700,margin:'0 0 3px',color:'#2d6a4f',textTransform:'capitalize' }}>[Opt] {s.type}</p><p style={{ color:'#6b7280',margin:0 }}>{s.location}</p></div></Popup></Marker>)}
      </MapContainer>
      <div style={{ position:'absolute',bottom:10,left:10,zIndex:1000,background:'#fff',borderRadius:10,padding:'7px 12px',boxShadow:'0 3px 12px rgba(0,0,0,.1)',border:'1px solid rgba(82,183,136,.18)',display:'flex',alignItems:'center',gap:12,fontFamily:'Poppins,sans-serif' }}>
        {[['Original',<svg key="o" width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="7 4"/></svg>],['Optimized',<svg key="p" width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#2d6a4f" strokeWidth="3.5"/></svg>],['Origin',<div key="ori" style={{ width:9,height:9,borderRadius:'50%',background:'#16a34a' }} />],['Dest',<div key="dst" style={{ width:9,height:9,borderRadius:'50%',background:'#dc2626' }} />]].map(([label,el]) => (
          <div key={label} style={{ display:'flex',alignItems:'center',gap:6 }}>{el}<span style={{ fontSize:10.5,color:'#6b7280',fontWeight:500 }}>{label}</span></div>
        ))}
      </div>
      {all.length < 2 && <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,pointerEvents:'none' }}><div style={{ background:'rgba(255,255,255,.92)',borderRadius:12,padding:'10px 16px',fontSize:12,color:'#9ca3af',fontFamily:'Poppins,sans-serif' }}>No route coordinates available</div></div>}
    </div>
  );
};

/* ─── StopList ───────────────────────────────────────────────────────────────── */
const StopList = ({ title, stops, optimized }) => (
  <div className={`dr-stop-card ${optimized?'dr-stop-opt':'dr-stop-orig'}`}>
    <div style={{ padding:'10px 14px',display:'flex',alignItems:'center',gap:8,borderBottom:`1px solid ${optimized?'#86efac':'rgba(82,183,136,.12)'}` }}>
      {optimized ? <CheckCircle size={14} style={{ color:'#16a34a' }} /> : <Route size={14} style={{ color:'#9ca3af' }} />}
      <span style={{ fontSize:12.5,fontWeight:700,color:'#1a3d2b' }}>{title}</span>
    </div>
    <div style={{ padding:'10px 14px',display:'flex',flexDirection:'column',gap:6 }}>
      {stops.length===0
        ? <p style={{ fontSize:12,color:'#9ca3af',textAlign:'center',padding:'8px 0',margin:0 }}>No stop data</p>
        : stops.map((s,i) => (
          <div key={i} style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div className={s.type==='origin'?'dr-stop-dot-o':s.type==='destination'?'dr-stop-dot-d':'dr-stop-dot-m'} />
            <span style={{ fontSize:12,color:'#374151',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.location?.split(',')[0]}</span>
            <span style={{ fontSize:10.5,color:'#9ca3af',background:'rgba(0,0,0,.05)',padding:'1px 7px',borderRadius:99,flexShrink:0 }}>{i+1}</span>
          </div>
        ))}
    </div>
  </div>
);

/* ─── DeliveryDetails ────────────────────────────────────────────────────────── */
const DeliveryDetails = ({ delivery }) => {
  const chips = getTimelineChips('route', delivery.status);
  const stops = delivery.stops || [];
  const cargo = getRouteCargo(delivery, stops);

  return (
    <div className="dr-detail">
      <div className="dr-detail-card">
        <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(82,183,136,.1)' }}>
          {(delivery.declineReason||delivery.decline_reason) && delivery.status==='declined' && (
            <div className="dr-decline-card" style={{ marginBottom:12 }}>
              <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:5 }}>
                <AlertTriangle size={13} style={{ color:'#dc2626' }} />
                <p style={{ fontSize:11,fontWeight:800,color:'#991b1b',margin:0,textTransform:'uppercase',letterSpacing:'.05em' }}>Declined by Logistics Manager</p>
              </div>
              <p style={{ fontSize:12.5,color:'#b91c1c',margin:'0 0 4px' }}>"{delivery.declineReason||delivery.decline_reason}"</p>
              <p style={{ fontSize:11,color:'#ef4444',margin:0 }}>Edit and resubmit for approval.</p>
            </div>
          )}
          {delivery.status === 'cancelled' && (
            <div className="dr-cancel-card" style={{ marginBottom:12 }}>
              <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:5 }}>
                <Ban size={13} style={{ color:'#6b7280' }} />
                <p style={{ fontSize:11,fontWeight:800,color:'#374151',margin:0,textTransform:'uppercase',letterSpacing:'.05em' }}>Delivery Cancelled</p>
              </div>
              {delivery.notes && <p style={{ fontSize:12.5,color:'#6b7280',margin:0 }}>Reason: "{delivery.notes}"</p>}
            </div>
          )}
          <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
            {chips.map(c => <span key={c.status} className={`dr-chip ${c.state==='done'?'dr-chip-done':c.state==='current'?'dr-chip-current':'dr-chip-next'}`}>{c.status.replace(/_/g,' ')}</span>)}
          </div>
        </div>

        {cargo.length > 0 && (
          <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(82,183,136,.1)' }}>
            <p style={{ fontSize:11,fontWeight:800,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.07em',margin:'0 0 10px',display:'flex',alignItems:'center',gap:6 }}>
              <Package size={12} style={{ color:'#2d6a4f' }} /> Cargo Manifest
            </p>
            <div className="dr-cargo-strip">
              {cargo.map((c, i) => (
                <div key={i} className="dr-cargo-item">
                  <div style={{ width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <Leaf size={13} style={{ color:'#1a3d2b' }} />
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontSize:12.5,fontWeight:700,color:'#1a3d2b',margin:0 }}>{c.productName||c.name}</p>
                  </div>
                  {(c.quantity > 0) && (
                    <span style={{ fontSize:12,fontWeight:800,color:'#166534',background:'#d8f3dc',padding:'2px 10px',borderRadius:99,flexShrink:0 }}>
                      {c.quantity} {c.unit||'kg'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding:'14px 16px',borderBottom:'1px solid rgba(82,183,136,.1)' }}>
          <p style={{ fontSize:11,fontWeight:800,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.07em',margin:'0 0 10px',display:'flex',alignItems:'center',gap:6 }}>
            <MapPin size={12} style={{ color:'#3b82f6' }} /> Route Stops
          </p>
          {stops.length===0 ? <p style={{ fontSize:12.5,color:'#9ca3af',margin:0 }}>Loading stops…</p> : (
            <div style={{ display:'flex',flexDirection:'column' }}>
              {stops.map((stop,i) => (
                <div key={stop.id||i} style={{ display:'flex',alignItems:'start',gap:10 }}>
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',paddingTop:2 }}>
                    <div className={stop.type==='origin'?'dr-stop-dot-o':stop.type==='destination'?'dr-stop-dot-d':'dr-stop-dot-m'} />
                    {i<stops.length-1 && <div className="dr-stop-line" />}
                  </div>
                  <div style={{ paddingBottom:i<stops.length-1?8:0 }}>
                    <p style={{ fontSize:12.5,fontWeight:600,color:'#111827',margin:0 }}>{stop.location}</p>
                    {stop.products?.length>0 && <p style={{ fontSize:11,color:'#9ca3af',margin:'2px 0 0' }}>Products: {stop.products.map(p=>p.productName||p.product_name||p).join(', ')}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding:'12px 16px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
          {[['Vehicle',delivery.vehicleType?.replace(/_/g,' ')||'—',Truck],['Fuel',`${delivery.fuelConsumption} L`,Fuel],['Distance',`${delivery.totalDistance} km`,Navigation]].map(([label,value,Icon]) => (
            <div key={label} className="dr-det-cell">
              <p style={{ fontSize:9.5,color:'#9ca3af',margin:'0 0 3px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',display:'flex',alignItems:'center',gap:4 }}><Icon size={10} style={{ color:'#2d6a4f' }} />{label}</p>
              <p style={{ fontSize:13,fontWeight:700,color:'#1a3d2b',margin:0,textTransform:'capitalize' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── OptimizationModal — UNCHANGED ─────────────────────────────────────────── */
const OptimizationModal = ({ result, onClose, onApply }) => {
  const { originalRoute, optimizedRoute, savings, aiRecommendations, improvementPct, usedFallback } = result;
  const metrics = [
    { label:'Distance', icon:<Navigation size={14}/>, color:'#3b82f6', orig:`${fmt(originalRoute?.totalDistance)} km`,   opt:`${fmt(optimizedRoute?.totalDistance)} km`,   saved:`${fmt(savings?.distance)} km`,  pv:savings?.distance, base:originalRoute?.totalDistance },
    { label:'Fuel',     icon:<Fuel size={14}/>,       color:'#f97316', orig:`${fmt(originalRoute?.fuelConsumption)} L`,  opt:`${fmt(optimizedRoute?.fuelConsumption)} L`,  saved:`${fmt(savings?.fuel)} L`,       pv:savings?.fuel,      base:originalRoute?.fuelConsumption },
    { label:'CO₂',      icon:<Leaf size={14}/>,       color:'#16a34a', orig:`${fmt(originalRoute?.carbonEmissions)} kg`, opt:`${fmt(optimizedRoute?.carbonEmissions)} kg`, saved:`${fmt(savings?.emissions)} kg`, pv:savings?.emissions, base:originalRoute?.carbonEmissions },
  ];
  return (
    <div className="dr-modal-back dr-root">
      <div className="dr-modal">
        <div className="dr-modal-hd">
          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ width:46,height:46,background:'rgba(255,255,255,.12)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,.18)' }}>
              <Sparkles size={22} style={{ color:'#fff' }} />
            </div>
            <div>
              <h3 style={{ fontSize:17,fontWeight:900,color:'#fff',margin:0,letterSpacing:'-.3px' }}>AI Route Optimization</h3>
              <p style={{ fontSize:12,color:'rgba(255,255,255,.55)',margin:0 }}>{originalRoute?.deliveryCode}{improvementPct?` · ${improvementPct}% efficiency gain`:''}{!usedFallback?' · AI optimized':' · TSP Algorithm'}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:34,height:34,borderRadius:10,background:'rgba(255,255,255,.1)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <X size={16} style={{ color:'#fff' }} />
          </button>
        </div>
        <div className="dr-modal-body">
          {usedFallback && (
            <div style={{ display:'flex',alignItems:'start',gap:10,padding:'10px 14px',background:'linear-gradient(135deg,#eff6ff,#dbeafe)',border:'1px solid #bfdbfe',borderRadius:12 }}>
              <Zap size={15} style={{ color:'#3b82f6',marginTop:1,flexShrink:0 }} />
              <div>
                <p style={{ fontSize:12.5,fontWeight:700,color:'#1e40af',margin:'0 0 2px' }}>Nearest-Neighbor TSP Algorithm</p>
                <p style={{ fontSize:12,color:'#3b82f6',margin:0 }}>{(originalRoute?.stops?.length||0)<=2?'Only 2 stops — add intermediate stops to enable full reordering.':'Stops analyzed using Nearest-Neighbor heuristic to minimize travel distance.'}</p>
              </div>
            </div>
          )}
          <div style={{ background:'#fff',border:'1px solid rgba(82,183,136,.14)',borderRadius:16,overflow:'hidden' }}>
            <div style={{ display:'grid',gridTemplateColumns:'1.2fr 1fr 1fr 1.2fr',gap:8,padding:'10px 16px',background:'linear-gradient(to right,#f8fdf9,#edfaf2)',borderBottom:'1px solid rgba(82,183,136,.1)' }}>
              {['Metric','Before','After','Saved'].map((h,i) => <span key={h} style={{ fontSize:10,fontWeight:800,color:i===2?'#166534':i===3?'#1a3d2b':'#9ca3af',textTransform:'uppercase',letterSpacing:'.07em',textAlign:i>0?'center':'left' }}>{h}</span>)}
            </div>
            {metrics.map(r => (
              <div key={r.label} className="dr-metric-row">
                <div style={{ display:'flex',alignItems:'center',gap:7,color:r.color }}>{r.icon}<span style={{ fontSize:13,fontWeight:600 }}>{r.label}</span></div>
                <div style={{ textAlign:'center',fontSize:13,color:'#6b7280' }}>{r.orig}</div>
                <div style={{ textAlign:'center',fontSize:13,fontWeight:700,color:'#166634' }}>{r.opt}</div>
                <div style={{ textAlign:'center' }}><span className="dr-saved">↓ {r.saved} <span style={{ fontWeight:400,fontSize:10,opacity:.7 }}>({pct(r.pv,r.base)})</span></span></div>
              </div>
            ))}
          </div>
          {((originalRoute?.stops?.length||0)>0||(optimizedRoute?.stops?.length||0)>0) && (
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <StopList title="Original Order"  stops={originalRoute?.stops||[]}  optimized={false} />
              <StopList title="Optimized Order" stops={optimizedRoute?.stops||[]} optimized={true}  />
            </div>
          )}
          <div>
            <p style={{ fontSize:12,fontWeight:800,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.07em',margin:'0 0 10px',display:'flex',alignItems:'center',gap:6 }}><Map size={12} style={{ color:'#3b82f6' }} /> Route Visualization · Dagupan City</p>
            <RouteMap originalStops={originalRoute?.stops} optimizedStops={optimizedRoute?.stops} />
          </div>
          {(aiRecommendations||[]).length>0 && (
            <div>
              <p style={{ fontSize:12,fontWeight:800,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.07em',margin:'0 0 10px',display:'flex',alignItems:'center',gap:6 }}><Sparkles size={12} style={{ color:'#2d6a4f' }} /> AI Recommendations</p>
              <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
                {aiRecommendations.map((rec,i) => (<div key={i} className="dr-rec-item"><div className="dr-rec-num">{i+1}</div><p style={{ fontSize:13,color:'#374151',margin:0,lineHeight:1.5 }}>{rec}</p></div>))}
              </div>
            </div>
          )}
        </div>
        <div className="dr-modal-foot">
          <button onClick={onClose} className="dr-btn-cc">Cancel</button>
          <button onClick={onApply} className="dr-btn-ok"><CheckCircle size={15} /> Submit for Logistics Approval</button>
        </div>
      </div>
    </div>
  );
};

/* ─── DeleteConfirmModal — UNCHANGED ────────────────────────────────────────── */
const DeleteConfirmModal = ({ delivery, onConfirm, onCancel, loading }) => (
  <div className="dr-del-modal-back dr-root">
    <div className="dr-del-modal">
      <div className="dr-del-hd" style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
        <div className="dr-del-icon"><Trash2 size={20} style={{ color:'#fff' }} /></div>
        <div>
          <p style={{ color:'#fff',fontWeight:800,fontSize:14,margin:0 }}>Delete Delivery Route</p>
          <p style={{ color:'rgba(255,255,255,0.65)',fontSize:11,margin:0 }}>This action cannot be undone</p>
        </div>
      </div>
      <div className="dr-del-body" style={{ paddingTop:20 }}>
        <p style={{ fontSize:13,color:'#374151',margin:'0 0 14px',lineHeight:1.6 }}>Are you sure you want to delete this delivery route? All stop data and planning information will be permanently removed.</p>
        <div className="dr-del-info">
          <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#dbeafe,#bfdbfe)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><Truck size={16} style={{ color:'#1e40af' }} /></div>
          <div>
            <p style={{ fontSize:12.5,fontWeight:700,color:'#111827',margin:0 }}>{delivery?.deliveryCode||delivery?.route_name||'Delivery Route'}</p>
            <p style={{ fontSize:11,color:'#6b7280',margin:'2px 0 0' }}>{delivery?.driver||'No driver assigned'} · {delivery?.stopCount||0} stops</p>
            <span className="dr-s-planned dr-status" style={{ marginTop:4,display:'inline-flex' }}>planned</span>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'start',gap:8,padding:'8px 12px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10 }}>
          <AlertCircle size={13} style={{ color:'#c2410c',flexShrink:0,marginTop:1 }} />
          <p style={{ fontSize:11,color:'#9a3412',margin:0,lineHeight:1.5 }}>Only routes in <strong>Planned</strong> status can be deleted. For Approved or In-Transit routes, use <strong>Cancel</strong> instead.</p>
        </div>
      </div>
      <div className="dr-del-foot">
        <button className="dr-del-cancel" onClick={onCancel} disabled={loading}>Keep Route</button>
        <button className="dr-del-confirm" onClick={onConfirm} disabled={loading} style={{ background: loading?'#dc2626':'#dc2626' }}>
          {loading?<><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'dr-spin .65s linear infinite',display:'inline-block' }} />Deleting…</>:<><Trash2 size={13} />Yes, Delete Route</>}
        </button>
      </div>
    </div>
  </div>
);

/* ─── CancelDeliveryModal ────────────────────────────────────────────────────── */
// Shows different severity based on whether the driver is active.
// Includes optional reason textarea.
const CancelDeliveryModal = ({ delivery, onConfirm, onCancel, loading }) => {
  const [reason, setReason] = useState('');
  const meta = cancelMeta(delivery?.status);

  const handleConfirm = () => onConfirm(reason.trim());

  return (
    <div className="dr-del-modal-back dr-root">
      <div className="dr-del-modal" style={{ maxWidth: 480 }}>
        {/* Header — orange for driver-active, gray otherwise */}
        <div className="dr-del-hd" style={{ background: meta.driverActive ? 'linear-gradient(135deg,#c2410c,#9a3412)' : 'linear-gradient(135deg,#374151,#1f2937)' }}>
          <div className="dr-del-icon"><Ban size={20} style={{ color:'#fff' }} /></div>
          <div>
            <p style={{ color:'#fff',fontWeight:800,fontSize:14,margin:0 }}>Cancel Delivery</p>
            <p style={{ color:'rgba(255,255,255,0.65)',fontSize:11,margin:0 }}>
              Current status: <span style={{ fontWeight:700 }}>{meta.label}</span>
            </p>
          </div>
        </div>

        <div className="dr-del-body" style={{ paddingTop:20 }}>
          {/* Route info */}
          <div className="dr-del-info">
            <div style={{ width:36,height:36,borderRadius:10,background:`${meta.bg}`,border:`1px solid ${meta.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <Truck size={16} style={{ color: meta.color }} />
            </div>
            <div>
              <p style={{ fontSize:12.5,fontWeight:700,color:'#111827',margin:0 }}>{delivery?.deliveryCode||delivery?.route_name||'Delivery Route'}</p>
              <p style={{ fontSize:11,color:'#6b7280',margin:'2px 0 4px' }}>{delivery?.driver||'No driver assigned'} · {delivery?.stopCount||0} stops</p>
              <span className={statusCls(delivery?.status)} style={{ display:'inline-flex' }}>{delivery?.status?.replace(/_/g,' ')}</span>
            </div>
          </div>

          {/* Driver warning — shown when driver has been assigned and may be active */}
          {meta.driverActive && (
            <div style={{ display:'flex',alignItems:'start',gap:8,padding:'10px 12px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,marginBottom:14 }}>
              <AlertTriangle size={13} style={{ color:'#c2410c',flexShrink:0,marginTop:1 }} />
              <div>
                <p style={{ fontSize:12,fontWeight:700,color:'#9a3412',margin:'0 0 2px' }}>
                  {delivery?.status === 'in_transit'
                    ? 'Driver is currently on the road'
                    : 'Driver has been assigned to this route'}
                </p>
                <p style={{ fontSize:11.5,color:'#b45309',margin:0,lineHeight:1.5 }}>
                  {delivery?.status === 'in_transit'
                    ? 'Cancelling will immediately alert the driver on their phone to stop the delivery. The Logistics Manager will also be notified. Inventory reservations will be released back to available stock.'
                    : 'The driver will be notified of the cancellation. Inventory reservations will be released back to available stock.'}
                </p>
              </div>
            </div>
          )}

          {!meta.driverActive && (
            <p style={{ fontSize:13,color:'#374151',margin:'0 0 14px',lineHeight:1.6 }}>
              This will cancel the delivery route and release all reserved inventory back to available stock.
              {delivery?.status === 'awaiting_approval' && ' The pending Logistics Manager approval will also be cancelled.'}
            </p>
          )}

          {/* Optional reason */}
          <div>
            <label style={{ fontSize:11.5,fontWeight:700,color:'#374151',display:'block',marginBottom:6 }}>
              Cancellation Reason <span style={{ fontWeight:400,color:'#9ca3af' }}>(optional but recommended)</span>
            </label>
            <textarea
              className="dr-reason-ta"
              placeholder="e.g. Client called to cancel order. Will reschedule next week."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="dr-del-foot">
          <button className="dr-del-cancel" onClick={onCancel} disabled={loading}>Keep Route</button>
          <button
            className="dr-del-confirm"
            onClick={handleConfirm}
            disabled={loading}
            style={{ background: meta.driverActive ? '#c2410c' : '#374151' }}
          >
            {loading
              ? <><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'dr-spin .65s linear infinite',display:'inline-block' }} />Cancelling…</>
              : <><Ban size={13} />Yes, Cancel Delivery</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── ApprovalConfirmModal ───────────────────────────────────────────────────── */
const ApprovalConfirmModal = ({ delivery, onConfirm, onCancel, loading }) => {
  const isResubmit  = delivery?.status === 'declined';
  const isOptimized = delivery?.status === 'optimized';

  return (
    <div className="dr-del-modal-back dr-root">
      <div className="dr-del-modal" style={{ maxWidth: 480 }}>
        <div className="dr-del-hd" style={{ background: isResubmit ? 'linear-gradient(135deg,#c2410c,#9a3412)' : 'linear-gradient(135deg,#1a3d2b,#2d6a4f)' }}>
          <div className="dr-del-icon"><CheckCircle size={20} style={{ color:'#fff' }} /></div>
          <div>
            <p style={{ color:'#fff',fontWeight:800,fontSize:14,margin:0 }}>
              {isResubmit ? 'Resubmit for Approval' : 'Submit for Logistics Approval'}
            </p>
            <p style={{ color:'rgba(255,255,255,0.65)',fontSize:11,margin:0 }}>
              {isResubmit ? 'Previously declined — sending back for review' : isOptimized ? 'AI optimized route ready for review' : 'Route will be sent to Logistics Manager'}
            </p>
          </div>
        </div>

        <div className="dr-del-body" style={{ paddingTop:20 }}>
          <div className="dr-del-info">
            <div style={{ width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <Truck size={16} style={{ color:'#1a3d2b' }} />
            </div>
            <div>
              <p style={{ fontSize:12.5,fontWeight:700,color:'#111827',margin:0 }}>{delivery?.deliveryCode||delivery?.route_name||'Delivery Route'}</p>
              <p style={{ fontSize:11,color:'#6b7280',margin:'2px 0 4px' }}>{delivery?.driver||'No driver assigned'} · {delivery?.stopCount||0} stops</p>
              <span className={statusCls(delivery?.status)} style={{ display:'inline-flex' }}>{delivery?.status?.replace(/_/g,' ')}</span>
            </div>
          </div>

          {!isOptimized && !isResubmit && (
            <div style={{ display:'flex',alignItems:'start',gap:8,padding:'10px 12px',background:'linear-gradient(135deg,#eff6ff,#dbeafe)',border:'1px solid #bfdbfe',borderRadius:10,marginBottom:4 }}>
              <AlertCircle size={13} style={{ color:'#2563eb',flexShrink:0,marginTop:1 }} />
              <div>
                <p style={{ fontSize:12,fontWeight:700,color:'#1e40af',margin:'0 0 2px' }}>Optimization is optional</p>
                <p style={{ fontSize:11.5,color:'#3b82f6',margin:0,lineHeight:1.5 }}>You can submit without running AI optimization first. The Logistics Manager will review the route as planned.</p>
              </div>
            </div>
          )}

          {isOptimized && (
            <div style={{ display:'flex',alignItems:'start',gap:8,padding:'10px 12px',background:'linear-gradient(135deg,#f0fdf4,#d8f3dc)',border:'1px solid #86efac',borderRadius:10,marginBottom:4 }}>
              <Sparkles size={13} style={{ color:'#16a34a',flexShrink:0,marginTop:1 }} />
              <p style={{ fontSize:11.5,color:'#166534',margin:0,lineHeight:1.5 }}>This route has been AI optimized. The Logistics Manager will see the original vs optimized metrics comparison before deciding.</p>
            </div>
          )}

          {isResubmit && (delivery?.declineReason||delivery?.decline_reason) && (
            <div className="dr-decline-card" style={{ marginBottom:8 }}>
              <p style={{ fontSize:11,fontWeight:700,color:'#991b1b',margin:'0 0 4px' }}>Previous decline reason:</p>
              <p style={{ fontSize:12,color:'#b91c1c',margin:0 }}>"{delivery.declineReason||delivery.decline_reason}"</p>
            </div>
          )}

          <p style={{ fontSize:13,color:'#374151',margin:'10px 0 0',lineHeight:1.6 }}>
            {isResubmit
              ? 'The Logistics Manager will be notified and can approve or decline again.'
              : 'The Logistics Manager will review this route and approve or decline it. You will be notified of their decision.'}
          </p>
        </div>

        <div className="dr-del-foot">
          <button className="dr-del-cancel" onClick={onCancel} disabled={loading}>Go Back</button>
          <button className="dr-del-confirm" onClick={onConfirm} disabled={loading} style={{ background: isResubmit ? '#c2410c' : '#1a3d2b' }}>
            {loading
              ? <><span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'dr-spin .65s linear infinite',display:'inline-block' }} />Submitting…</>
              : <><CheckCircle size={13} />{isResubmit ? 'Yes, Resubmit Route' : 'Yes, Submit for Approval'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── DeliveryRoutesPage ────────────────────────────────────────────────────── */
const DeliveryRoutesPage = () => {
  const { user } = useAuth();
  const {
    deliveries, loading, error, success,
    searchTerm, showAddModal, expandedDelivery, expandedStops,
    optimizingRoute, optimizationResult, showOptimizationModal, summaryStats,
    setSearchTerm, setShowAddModal, setExpandedDelivery,
    deleteDelivery, confirmDelete, optimizeRoute, applyOptimization,
    handleDeliveryCreated, closeOptimizationModal,
    submitRouteForApproval,
    refreshDeliveries,
  } = useDelivery();

  const [draftDeliveries,    setDraftDeliveries]    = useState([]);
  const [loadingDrafts,      setLoadingDrafts]      = useState(false);
  const [dismissed,          setDismissed]          = useState(new Set());
  const [draftPrefill,       setDraftPrefill]       = useState(null);

  // Delete state (planned only)
  const [confirmDeleteRoute, setConfirmDeleteRoute] = useState(null);
  const [deleteLoading,      setDeleteLoading]      = useState(false);

  // Cancel state (planned / awaiting / approved / in_transit)
  const [confirmCancelRoute, setConfirmCancelRoute] = useState(null);
  const [cancelLoading,      setCancelLoading]      = useState(false);
  const [cancelError,        setCancelError]        = useState('');

  // Approval submit state
  const [approvalTarget,  setApprovalTarget]  = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const fetchDrafts = async () => {
    try { setLoadingDrafts(true); const r = await deliveryService.getDraftDeliveries(); setDraftDeliveries(r?.data?.drafts||r?.drafts||[]); }
    catch { setDraftDeliveries([]); } finally { setLoadingDrafts(false); }
  };

  useEffect(() => { fetchDrafts(); }, []);

  const handleOpenDraft = (draft) => {
    let meta = {}; try { meta = JSON.parse(draft.notes||'{}'); } catch {}
    setDraftPrefill({ routeId:draft.route_id, productName:meta.product_name||'', quantity:meta.quantity||'', batchNumber:meta.batch_number||'', location:meta.location||'', daysLeft:meta.days_left||0, riskLevel:meta.risk_level||'HIGH', routeName:draft.route_name||'' });
    setShowAddModal(true);
  };

  const requestDelete = (delivery) => {
    if (!canDelete(delivery.status)) return;
    setConfirmDeleteRoute(delivery);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDeleteRoute) return;
    setDeleteLoading(true);
    try {
      await confirmDelete(confirmDeleteRoute.id);
      setConfirmDeleteRoute(null);
    } catch {
      setConfirmDeleteRoute(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Cancel handlers ─────────────────────────────────────────────────────────
  const requestCancel = (delivery) => {
    if (!canCancel(delivery.status)) return;
    setCancelError('');
    setConfirmCancelRoute(delivery);
  };

  const confirmCancelAction = async (reason) => {
    if (!confirmCancelRoute) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      // Call the cancel endpoint directly
      const api = (await import('../../services/api')).default;
      const res = await api.patch(`/deliveries/${confirmCancelRoute.id}/cancel`, { reason });
      if (res.data?.success || res.status === 200) {
        setConfirmCancelRoute(null);
        // Refresh the delivery list to show updated status
        if (typeof refreshDeliveries === 'function') {
          await refreshDeliveries();
        } else {
          // Fallback: reload after short delay if hook doesn't expose refresh
          window.setTimeout(() => window.location.reload(), 800);
        }
      } else {
        setCancelError(res.data?.message || 'Cancellation failed. Please try again.');
      }
    } catch (err) {
      setCancelError(
        err?.response?.data?.message ||
        err?.response?.data?.error   ||
        'Cancellation failed. Please try again.'
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const confirmApprovalSubmit = async () => {
    if (!approvalTarget) return;
    setApprovalLoading(true);
    try {
      const isResubmit = approvalTarget.status === 'declined';
      await submitRouteForApproval(approvalTarget.id, isResubmit);
      setApprovalTarget(null);
    } catch {
      setApprovalTarget(null);
    } finally {
      setApprovalLoading(false);
    }
  };

  if (!user) return null;

  const today = new Date().toLocaleDateString('en-PH',{ weekday:'short',month:'short',day:'numeric',year:'numeric' });
  const visible = draftDeliveries.filter(d => !dismissed.has(d.route_id));

  return (
    <Layout currentPage="Delivery Routes" user={user}>
      {/* Delete confirm modal */}
      {confirmDeleteRoute && (
        <DeleteConfirmModal
          delivery={confirmDeleteRoute}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDeleteRoute(null)}
          loading={deleteLoading}
        />
      )}

      {/* Cancel confirm modal */}
      {confirmCancelRoute && (
        <CancelDeliveryModal
          delivery={confirmCancelRoute}
          onConfirm={confirmCancelAction}
          onCancel={() => { setConfirmCancelRoute(null); setCancelError(''); }}
          loading={cancelLoading}
        />
      )}

      {/* Approval confirm modal */}
      {approvalTarget && (
        <ApprovalConfirmModal
          delivery={approvalTarget}
          onConfirm={confirmApprovalSubmit}
          onCancel={() => setApprovalTarget(null)}
          loading={approvalLoading}
        />
      )}

      <div className="dr-root dr-page" style={{ display:'flex',flexDirection:'column',gap:16 }}>

        {/* Banner */}
        <div className="dr-banner">
          <div style={{ position:'relative',zIndex:1 }}>
            <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:7 }}>
              <div style={{ width:26,height:26,borderRadius:7,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.14)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <Truck size={13} style={{ color:'#86efac' }} />
              </div>
              <span style={{ fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'.1em' }}>EcoTrackAI — Delivery Management</span>
            </div>
            <h1 style={{ color:'#fff',fontSize:20,fontWeight:900,margin:'0 0 7px',letterSpacing:'-.4px' }}>Delivery Routes</h1>
            <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
              <div style={{ display:'flex',alignItems:'center',gap:6 }}><div className="dr-pulse-dot" /><span style={{ fontSize:11,color:'rgba(255,255,255,0.6)',fontWeight:500 }}>System Operational</span></div>
              <span style={{ fontSize:10,color:'rgba(255,255,255,0.25)' }}>|</span>
              <div style={{ display:'flex',alignItems:'center',gap:5 }}><Clock size={10} style={{ color:'rgba(255,255,255,0.35)' }} /><span style={{ fontSize:11,color:'rgba(255,255,255,0.45)' }}>{today}</span></div>
              {visible.length>0 && (<><span style={{ fontSize:10,color:'rgba(255,255,255,0.25)' }}>|</span><div style={{ display:'flex',alignItems:'center',gap:5 }}><Zap size={11} style={{ color:'#fbbf24' }} /><span style={{ fontSize:11,color:'#fbbf24',fontWeight:600 }}>{visible.length} priority draft{visible.length>1?'s':''} awaiting action</span></div></>)}
            </div>
          </div>
          <div style={{ display:'flex',gap:8,zIndex:1,flexWrap:'wrap',alignItems:'center' }}>
            <button className="dr-btn-ghost" onClick={fetchDrafts} disabled={loadingDrafts}>
              <RefreshCw size={12} style={loadingDrafts?{ animation:'dr-spin .7s linear infinite' }:{}} />
              {loadingDrafts?'Loading…':'Refresh'}
            </button>
            <button className="dr-btn-solid" onClick={() => setShowAddModal(true)}><Plus size={13} /> Plan Delivery</button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
          <StatCard dark label="Total Deliveries" value={loading?'—':summaryStats.totalDeliveries}            sub={`${summaryStats.inProgress} in progress`}  icon={Route}      delay={0.04} />
          <StatCard      label="Total Distance"   value={loading?'—':`${summaryStats.totalDistance} km`}      sub="Across all routes"                          icon={Navigation} delay={0.08} />
          <StatCard dark label="Fuel Saved"       value={loading?'—':`${summaryStats.fuelSaved} L`}           sub="From completed deliveries"                  icon={Fuel}       delay={0.12} />
          <StatCard      label="CO₂ Reduced"      value={loading?'—':`${summaryStats.co2Reduced??'0.00'} kg`} sub="Carbon emissions saved"                     icon={Leaf}       delay={0.16} />
        </div>

        {/* Priority Drafts */}
        {visible.length>0 && (
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <div style={{ width:26,height:26,borderRadius:8,background:'linear-gradient(135deg,#fed7aa,#fdba74)',display:'flex',alignItems:'center',justifyContent:'center' }}><Zap size={13} style={{ color:'#c2410c' }} /></div>
              <span style={{ fontSize:11,fontWeight:800,color:'#c2410c',textTransform:'uppercase',letterSpacing:'.08em' }}>Priority Delivery Drafts</span>
              <span className="dr-badge dr-badge-orange">{visible.length} awaiting action</span>
            </div>
            {visible.map(draft => {
              let meta = {}; try { meta = JSON.parse(draft.notes||'{}'); } catch {}
              return (
                <div key={draft.route_id} className="dr-draft-wrap">
                  <div style={{ display:'flex',alignItems:'start',gap:10,flex:1,minWidth:0 }}>
                    <div className="dr-draft-av"><Package size={16} style={{ color:'#c2410c' }} /></div>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontSize:13,fontWeight:700,color:'#7c2d12',margin:'0 0 3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{meta.product_name||'Product'} — {meta.quantity} · Batch: {meta.batch_number||'N/A'}</p>
                      <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                        <span style={{ fontSize:11.5,color:'#9a3412',display:'flex',alignItems:'center',gap:4 }}><MapPin size={10} />{meta.location||'Warehouse'}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:meta.days_left<=2?'#dc2626':'#c2410c' }}>{meta.days_left}d left</span>
                        <span style={{ fontSize:10,fontWeight:800,background:'#fed7aa',color:'#7c2d12',padding:'1px 7px',borderRadius:99 }}>{meta.risk_level}</span>
                      </div>
                      <p style={{ fontSize:11,color:'#fb923c',margin:'4px 0 0',display:'flex',alignItems:'center',gap:4 }}><CheckCircle size={10} /> Approved by Inventory Manager — complete the delivery plan to dispatch</p>
                    </div>
                  </div>
                  <div style={{ display:'flex',alignItems:'center',gap:7,flexShrink:0 }}>
                    <button onClick={() => handleOpenDraft(draft)} style={{ padding:'7px 14px',background:'#c2410c',color:'#fff',border:'none',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Poppins,sans-serif',transition:'background .13s' }} onMouseOver={e=>e.currentTarget.style.background='#9a3412'} onMouseOut={e=>e.currentTarget.style.background='#c2410c'}>Open Draft</button>
                    <button onClick={() => setDismissed(p=>new Set([...p,draft.route_id]))} style={{ width:30,height:30,borderRadius:8,background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fb923c',transition:'background .12s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(249,115,22,.12)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}><X size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="dr-bar">
          <div className="dr-srch-wrap">
            <Search size={13} style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',pointerEvents:'none' }} />
            <input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search delivery or driver…" className="dr-srch" />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',display:'flex',padding:0 }}><X size={12} style={{ color:'#9ca3af' }} /></button>}
          </div>
          <div className="dr-divider" />
          <div style={{ flex:1 }} />
          <button onClick={fetchDrafts} className="dr-ibtn" title="Refresh"><RefreshCw size={14} style={loadingDrafts?{ animation:'dr-spin .65s linear infinite' }:{}} /></button>
          <button onClick={() => setShowAddModal(true)} className="dr-add-btn"><Plus size={14} /> Plan new delivery</button>
        </div>

        {/* Alerts */}
        {error       && <div style={{ background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 14px',fontSize:12.5,color:'#dc2626',display:'flex',alignItems:'center',gap:7 }}><AlertTriangle size={13} style={{ flexShrink:0 }}/>{error}</div>}
        {success     && <div style={{ background:'#d8f3dc',border:'1px solid #86efac',borderRadius:12,padding:'10px 14px',fontSize:12.5,color:'#1a3d2b',display:'flex',alignItems:'center',gap:7 }}><CheckCircle size={13} style={{ flexShrink:0 }}/>{success}</div>}
        {cancelError && <div style={{ background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 14px',fontSize:12.5,color:'#dc2626',display:'flex',alignItems:'center',gap:7 }}><AlertTriangle size={13} style={{ flexShrink:0 }}/>{cancelError}<button onClick={()=>setCancelError('')} style={{ marginLeft:'auto',background:'none',border:'none',cursor:'pointer',display:'flex' }}><X size={12} style={{ color:'#dc2626' }} /></button></div>}

        {/* Table */}
        <div className="dr-table">
          <div className="dr-thead">
            <span className="dr-th">Delivery</span>
            <span className="dr-th">Route</span>
            <span className="dr-th">Cargo</span>
            <span className="dr-th">Metrics</span>
            <span className="dr-th">Status</span>
            <span className="dr-th" style={{ textAlign:'right' }}>Actions</span>
          </div>

          {loading ? (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'56px 0',gap:12,color:'#9ca3af' }}>
              <div className="dr-spin" style={{ width:26,height:26 }} />
              <span style={{ fontSize:13.5 }}>Loading deliveries…</span>
            </div>
          ) : deliveries.length===0 ? (
            <div className="dr-empty">
              <div style={{ width:60,height:60,borderRadius:18,background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:4 }}><Route size={28} style={{ color:'#1a3d2b' }} /></div>
              <p style={{ fontWeight:800,fontSize:15,color:'#1a3d2b',margin:0 }}>No deliveries found</p>
              <p style={{ fontSize:13,color:'#9ca3af',margin:0 }}>{searchTerm?`No results for "${searchTerm}"`: 'Plan your first delivery route'}</p>
              {!searchTerm && <button onClick={()=>setShowAddModal(true)} className="dr-add-btn" style={{ marginTop:6 }}><Plus size={13}/>Plan new delivery</button>}
            </div>
          ) : (
            <>
              {deliveries.map((delivery, idx) => {
                const stops      = expandedStops[delivery.id] || [];
                const isExpanded = expandedDelivery === delivery.id;
                const deletable  = canDelete(delivery.status);
                const cancellable = canCancel(delivery.status);

                const cargo     = getRouteCargo(delivery, stops);
                const MAX_SHOW  = 2;
                const cargoShow = cargo.slice(0, MAX_SHOW);
                const cargoMore = cargo.length - MAX_SHOW;

                return (
                  <React.Fragment key={delivery.id}>
                    <div className="dr-row" style={{ animationDelay:`${idx*0.03}s` }}>

                      {/* Delivery */}
                      <div style={{ display:'flex',alignItems:'center',gap:11,minWidth:0 }}>
                        <div className={avCls(delivery.status)}><Truck size={16} /></div>
                        <div style={{ minWidth:0 }}>
                          <p style={{ fontSize:13,fontWeight:700,color:'#111827',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{delivery.deliveryCode}</p>
                          <p style={{ fontSize:11.5,color:'#6b7280',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{delivery.driver}</p>
                          <p style={{ fontSize:10.5,color:'#9ca3af',margin:0 }}>{delivery.date}</p>
                        </div>
                      </div>

                      {/* Route */}
                      <div>
                        <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:3 }}><MapPin size={11} style={{ color:'#9ca3af',flexShrink:0 }} /><span style={{ fontSize:12,color:'#374151',fontWeight:600 }}>{delivery.stopCount||0} stops</span></div>
                        <p style={{ fontSize:11,color:'#9ca3af',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{delivery.originName} → {delivery.destName}</p>
                      </div>

                      {/* Cargo */}
                      <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                        {cargo.length === 0 ? (
                          <p style={{ fontSize:11,color:'#d1d5db',margin:0,fontStyle:'italic' }}>No cargo assigned</p>
                        ) : (
                          <>
                            <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                              {cargoShow.map((c, ci) => (
                                <span key={ci} className="dr-cargo-pill"><Leaf size={8} />{c.productName||c.name}{c.quantity > 0 && <span style={{ opacity:.75 }}> {c.quantity}{c.unit||'kg'}</span>}</span>
                              ))}
                              {cargoMore > 0 && <span className="dr-cargo-more">+{cargoMore} more</span>}
                            </div>
                            {cargo.some(c=>c.quantity>0) && <p style={{ fontSize:10.5,color:'#9ca3af',margin:0 }}>{cargo.reduce((s,c)=>s+(c.quantity||0),0)} {cargo[0]?.unit||'kg'} total load</p>}
                          </>
                        )}
                      </div>

                      {/* Metrics */}
                      <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:6 }}><Navigation size={11} style={{ color:'#3b82f6',flexShrink:0 }}/><span style={{ fontSize:12,color:'#374151' }}>{delivery.totalDistance} km</span></div>
                        <div style={{ display:'flex',alignItems:'center',gap:6 }}><Leaf size={11} style={{ color:'#16a34a',flexShrink:0 }}/><span style={{ fontSize:12,color:'#374151' }}>{delivery.carbonEmissions} kg CO₂</span></div>
                      </div>

                      {/* Status */}
                      <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                          <div style={dotStyle(delivery.status)} />
                          <span className={statusCls(delivery.status)}>{delivery.status?.replace(/_/g,' ')}</span>
                        </div>
                        {delivery.status==='awaiting_approval' && <span style={{ fontSize:10.5,color:'#f97316' }}>Pending logistics review</span>}
                        {delivery.status==='optimized'         && <span style={{ fontSize:10.5,color:'#7c3aed' }}>AI optimized · ready to submit</span>}
                        {delivery.status==='approved'          && <span style={{ fontSize:10.5,color:'#16a34a' }}>Approved · driver notified</span>}
                        {delivery.status==='declined'          && <span style={{ fontSize:10.5,color:'#dc2626' }}>Declined{(delivery.declineReason||delivery.decline_reason)?` · "${(delivery.declineReason||delivery.decline_reason)?.slice(0,28)}${(delivery.declineReason||delivery.decline_reason)?.length>28?'…':''}"`:''}</span>}
                        {delivery.status==='in_transit'        && <span style={{ fontSize:10.5,color:'#2563eb' }}>Driver en route</span>}
                        {delivery.status==='delivered'         && <span style={{ fontSize:10.5,color:'#1a3d2b' }}>Delivered</span>}
                        {delivery.status==='cancelled'         && <span style={{ fontSize:10.5,color:'#9ca3af' }}>Cancelled</span>}
                      </div>

                      {/* Actions — 5 buttons max: expand, AI, submit/resubmit, cancel, delete */}
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end',gap:3 }}>
                        {/* Expand */}
                        <button className="dr-act dr-act-expand" onClick={() => setExpandedDelivery(isExpanded?null:delivery.id)} title="View details">
                          {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </button>

                        {/* AI Optimize */}
                        {delivery.status !== 'cancelled' && delivery.status !== 'delivered' && (
                          <button className="dr-act dr-act-ai"
                            onClick={() => optimizeRoute(delivery)}
                            disabled={optimizingRoute===delivery.id||(!canTransitionRoute(delivery.status,'optimized')&&delivery.status!=='optimized')}
                            title="AI Optimize">
                            <Sparkles size={16} style={optimizingRoute===delivery.id?{animation:'dr-spin .7s linear infinite'}:{}} />
                          </button>
                        )}

                        {/* Submit / Resubmit */}
                        {(delivery.status==='planned'||delivery.status==='optimized'||delivery.status==='declined') && (
                          <button
                            className={`dr-act ${delivery.status==='declined'?'dr-act-resubmit':'dr-act-approve'}`}
                            onClick={() => setApprovalTarget(delivery)}
                            title={delivery.status==='declined'?'Resubmit for Approval':'Submit for Approval'}>
                            <CheckCircle size={16}/>
                          </button>
                        )}

                        {/* Cancel — shown for cancellable statuses */}
                        {cancellable ? (
                          <button
                            className="dr-act dr-act-cancel"
                            onClick={() => requestCancel(delivery)}
                            title="Cancel delivery"
                          >
                            <Ban size={16}/>
                          </button>
                        ) : (
                          // Non-cancellable: show nothing (completed/delivered/cancelled don't need a cancel button)
                          null
                        )}

                        {/* Delete — shown only for 'planned' (before any approval) */}
                        {deletable ? (
                          <button className="dr-act dr-act-del" onClick={() => requestDelete(delivery)} title="Delete route">
                            <Trash2 size={16}/>
                          </button>
                        ) : delivery.status !== 'cancelled' && delivery.status !== 'delivered' && delivery.status !== 'completed' ? (
                          // Blocked delete with tooltip for non-terminal statuses (except cancelled which already shows cancel)
                          null
                        ) : null}
                      </div>
                    </div>

                    {isExpanded && <DeliveryDetails delivery={{ ...delivery, stops }} />}
                  </React.Fragment>
                );
              })}

              <div className="dr-foot">
                <p style={{ fontSize:12,color:'#9ca3af',margin:0 }}>
                  Showing <strong style={{ color:'#1a3d2b' }}>{deliveries.length}</strong> deliveries
                  {searchTerm && <span style={{ color:'#6b7280' }}> · filtered by "{searchTerm}"</span>}
                </p>
                <button onClick={fetchDrafts} style={{ display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#6b7280',background:'none',border:'none',cursor:'pointer',fontWeight:500,fontFamily:'Poppins,sans-serif',transition:'color .13s' }} onMouseOver={e=>e.currentTarget.style.color='#1a3d2b'} onMouseOut={e=>e.currentTarget.style.color='#6b7280'}><RefreshCw size={11}/> Refresh</button>
              </div>
            </>
          )}
        </div>
      </div>

      {showOptimizationModal && optimizationResult && (
        <OptimizationModal result={optimizationResult} onClose={closeOptimizationModal} onApply={applyOptimization} />
      )}
      {showAddModal && (
        <PlanNewDeliveryModal
          onClose={() => { setShowAddModal(false); setDraftPrefill(null); }}
          onSuccess={() => { handleDeliveryCreated(); fetchDrafts(); setDraftPrefill(null); }}
          prefill={draftPrefill}
        />
      )}
    </Layout>
  );
};

export default DeliveryRoutesPage;
