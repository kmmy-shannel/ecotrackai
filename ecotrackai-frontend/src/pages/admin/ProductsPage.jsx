import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Trash2, RefreshCw, Package, Clock,
  AlertTriangle, X, Eye, ChevronDown, ChevronUp,
  SlidersHorizontal, Leaf, ShieldCheck, Boxes,
  CalendarArrowUp, CalendarArrowDown, ArrowUpAZ,
  ArrowDownWideNarrow, ArrowUpNarrowWide, TrendingUp,
  Thermometer, Snowflake, Wind, CircleAlert,
  CheckCircle2, Minus, Droplets, Lock
} from 'lucide-react';
import Layout from '../../components/Layout';
import inventoryService from '../../services/inventory.service';
import catalogService from '../../services/catalog.service';
import { useAuth } from '../../hooks/useAuth';

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
  .pr-root,.pr-root *{font-family:'Poppins',sans-serif;box-sizing:border-box}

  @keyframes pr-in    {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pr-slide {from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pr-pop   {from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  @keyframes pr-spin  {to{transform:rotate(360deg)}}
  @keyframes pr-pulse {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.75)}}

  .pr-page{animation:pr-in .3s ease both}

  /* Stat cards */
  .pr-stat{position:relative;overflow:hidden;border-radius:20px;padding:20px 18px 16px;cursor:pointer;border:2px solid transparent;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s}
  .pr-stat:hover{transform:translateY(-4px) scale(1.01);box-shadow:0 16px 40px rgba(0,0,0,.11)}
  .pr-stat.pr-on{border-color:#1a3d2b;box-shadow:0 0 0 4px rgba(26,61,43,.09),0 8px 24px rgba(26,61,43,.14)}
  .pr-stat-all{background:linear-gradient(135deg,#1a3d2b,#2d6a4f)}
  .pr-stat-hi {background:linear-gradient(135deg,#fff0f0,#ffe4e4)}
  .pr-stat-md {background:linear-gradient(135deg,#fffdf0,#fef3c7)}
  .pr-stat-lo {background:linear-gradient(135deg,#f0fdf4,#dcfce7)}
  .pr-stat-orb{position:absolute;border-radius:50%;background:rgba(255,255,255,.06);pointer-events:none}
  .pr-stat-ico{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
  .pr-stat-num{font-size:40px;font-weight:900;line-height:1;margin:0 0 3px;letter-spacing:-1.5px}
  .pr-stat-lbl{font-size:11.5px;font-weight:600;margin:0}

  /* Toolbar */
  .pr-bar{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(82,183,136,.16);border-radius:16px;padding:9px 13px;box-shadow:0 2px 8px rgba(26,61,43,.05)}
  .pr-srch-wrap{position:relative;flex:1;max-width:260px}
  .pr-srch{width:100%;padding:8px 32px 8px 34px;background:#f8fdf9;border:1.5px solid rgba(82,183,136,.18);border-radius:10px;font-size:13px;outline:none;color:#1a3d2b;transition:border-color .16s,box-shadow .16s,background .16s}
  .pr-srch::placeholder{color:#adb5bd}
  .pr-srch:focus{border-color:#2d6a4f;box-shadow:0 0 0 3px rgba(45,106,79,.09);background:#fff}
  .pr-divider{width:1px;height:24px;background:rgba(82,183,136,.18);flex-shrink:0}

  /* Filter chips */
  .pr-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:99px;font-size:11px;font-weight:600;border:1.5px solid transparent;cursor:pointer;transition:all .14s;white-space:nowrap}
  .pr-chip-all{background:#f3f4f6;color:#6b7280;border-color:#e5e7eb}
  .pr-chip-all.on{background:#1a3d2b;color:#fff;border-color:#1a3d2b}
  .pr-chip-hi{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
  .pr-chip-hi.on{background:#dc2626;color:#fff;border-color:#dc2626}
  .pr-chip-md{background:#fffbeb;color:#b45309;border-color:#fde68a}
  .pr-chip-md.on{background:#d97706;color:#fff;border-color:#d97706}
  .pr-chip-lo{background:#f0fdf4;color:#166534;border-color:#86efac}
  .pr-chip-lo.on{background:#16a34a;color:#fff;border-color:#16a34a}

  .pr-ibtn{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;cursor:pointer;color:#6b7280;transition:background .14s,color .14s;flex-shrink:0}
  .pr-ibtn:hover{background:#f0faf4;color:#1a3d2b}
  .pr-sort-btn{display:inline-flex;align-items:center;gap:5px;padding:8px 12px;background:transparent;border:none;border-radius:9px;font-size:12.5px;font-weight:500;color:#4b5563;cursor:pointer;transition:background .14s,color .14s;white-space:nowrap}
  .pr-sort-btn:hover{background:#f0faf4;color:#1a3d2b}
  .pr-add-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:#1a3d2b;color:#fff;border-radius:11px;font-size:13px;font-weight:700;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .16s,transform .13s,box-shadow .16s;box-shadow:0 4px 12px rgba(26,61,43,.28)}
  .pr-add-btn:hover{background:#2d6a4f;transform:translateY(-1px);box-shadow:0 6px 18px rgba(26,61,43,.32)}

  /* Sort dropdown */
  .pr-drop{position:absolute;top:calc(100% + 7px);right:0;background:#fff;border:1px solid rgba(82,183,136,.18);border-radius:14px;box-shadow:0 12px 36px rgba(26,61,43,.14);z-index:30;min-width:200px;padding:6px;animation:pr-pop .14s ease both}
  .pr-drop-item{width:100%;text-align:left;padding:8px 11px;border-radius:9px;font-size:12.5px;font-weight:500;color:#374151;background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .11s}
  .pr-drop-item:hover{background:#f0faf4;color:#1a3d2b}
  .pr-drop-item.pr-on{background:#d8f3dc;color:#1a3d2b;font-weight:700}
  .pr-drop-ico{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#f3f4f6}
  .pr-drop-item.pr-on .pr-drop-ico{background:rgba(26,61,43,.1)}

  /* Table */
  .pr-table{background:#fff;border-radius:20px;overflow:hidden;border:1px solid rgba(82,183,136,.14);box-shadow:0 3px 18px rgba(26,61,43,.07)}

  /* Fix #4: updated column widths — added Available column */
  .pr-thead{display:grid;grid-template-columns:2fr 1.5fr .85fr 1.1fr .9fr .85fr 70px;gap:10px;padding:12px 20px;background:linear-gradient(to right,#f8fdf9,#edfaf2);border-bottom:1px solid rgba(82,183,136,.11);align-items:center}
  .pr-th{font-size:10px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:0;transition:color .13s}
  .pr-th:hover{color:#374151}
  .pr-th-r{cursor:default!important}
  .pr-row{display:grid;grid-template-columns:2fr 1.5fr .85fr 1.1fr .9fr .85fr 70px;gap:10px;padding:14px 20px;border-bottom:1px solid rgba(82,183,136,.07);align-items:center;transition:background .13s;animation:pr-slide .22s ease both}
  .pr-row:hover{background:linear-gradient(to right,#f8fdf9,#fafffe)}
  .pr-row:last-child{border-bottom:none}
  .pr-row:nth-child(1){animation-delay:.03s}.pr-row:nth-child(2){animation-delay:.06s}
  .pr-row:nth-child(3){animation-delay:.09s}.pr-row:nth-child(4){animation-delay:.12s}
  .pr-row:nth-child(5){animation-delay:.15s}.pr-row:nth-child(6){animation-delay:.18s}
  .pr-row:nth-child(7){animation-delay:.21s}.pr-row:nth-child(8){animation-delay:.24s}

  /* Avatar */
  .pr-av{width:40px;height:40px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;letter-spacing:-.5px}
  .pr-av-lo{background:linear-gradient(135deg,#d8f3dc,#b7e4c7);color:#1a3d2b}
  .pr-av-md{background:linear-gradient(135deg,#fef9c3,#fde68a);color:#92400e}
  .pr-av-hi{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b}
  .pr-av-ex{background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff}
  .pr-av-na{background:linear-gradient(135deg,#f3f4f6,#e5e7eb);color:#6b7280}

  /* Days pill */
  .pr-days{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;font-size:10.5px;font-weight:700}
  .pr-days-lo {background:#d8f3dc;color:#166534}
  .pr-days-md {background:#fef9c3;color:#92400e}
  .pr-days-hi {background:#fee2e2;color:#991b1b}
  .pr-days-exp{background:#dc2626;color:#fff}

  /* Risk badge */
  .pr-risk{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
  .pr-risk-lo {background:#d8f3dc;color:#166534;border:1.5px solid #86efac}
  .pr-risk-md {background:#fef9c3;color:#92400e;border:1.5px solid #fde68a}
  .pr-risk-hi {background:#fee2e2;color:#991b1b;border:1.5px solid #fecaca}
  .pr-risk-exp{background:#dc2626;color:#fff;   border:1.5px solid #b91c1c}
  .pr-risk-na {background:#f3f4f6;color:#9ca3af;border:1.5px solid #e5e7eb}

  /* Dot */
  .pr-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;display:inline-block}
  .pr-dot-hi {background:#dc2626;animation:pr-pulse 1.8s ease infinite}
  .pr-dot-md {background:#d97706;animation:pr-pulse 2.4s ease infinite}
  .pr-dot-lo {background:#16a34a}
  .pr-dot-exp{background:#7f1d1d}
  .pr-dot-na {background:#9ca3af}

  /* Storage chip */
  .pr-stor{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:7px;font-size:11px;font-weight:600}
  .pr-stor-ref {background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
  .pr-stor-amb {background:#f9fafb;color:#6b7280;border:1px solid #e5e7eb}
  .pr-stor-ctrl{background:#faf5ff;color:#7c3aed;border:1px solid #ddd6fe}

  /* Action buttons */
  .pr-act{width:30px;height:30px;border-radius:8px;border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s,transform .12s;color:#9ca3af}
  .pr-act:hover{transform:scale(1.12)}
  .pr-act-eye:hover{background:#d8f3dc;color:#166634!important}
  .pr-act-del:hover{background:#fee2e2;color:#991b1b!important}

  /* Table footer */
  .pr-foot{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;background:linear-gradient(to right,#f8fdf9,#edfaf2);border-top:1px solid rgba(82,183,136,.09)}

  /* Spinner */
  .pr-spin{border-radius:50%;border:2.5px solid #b7e4c7;border-top-color:#1a3d2b;animation:pr-spin .6s linear infinite}

  /* Empty */
  .pr-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 20px;gap:11px;text-align:center}

  /* Error */
  .pr-err{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:10px 13px;font-size:12.5px;color:#dc2626;display:flex;align-items:center;gap:7px}

  /* Modal */
  .pr-backdrop{position:fixed;inset:0;background:rgba(8,20,12,.52);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px;animation:pr-in .16s ease both}
  .pr-modal{background:#fff;border-radius:24px;box-shadow:0 32px 80px rgba(0,0,0,.22);width:100%;max-width:500px;max-height:92vh;overflow-y:auto;animation:pr-pop .2s cubic-bezier(.34,1.4,.64,1) both}
  .pr-modal-sm{max-width:420px}
  .pr-modal-hd{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 16px;border-bottom:1px solid rgba(82,183,136,.11);position:sticky;top:0;background:#fff;z-index:2;border-radius:24px 24px 0 0}
  .pr-modal-body{padding:18px 22px;display:flex;flex-direction:column;gap:16px}
  .pr-modal-foot{display:flex;gap:9px;padding:14px 22px 20px;border-top:1px solid rgba(82,183,136,.09);position:sticky;bottom:0;background:#fff;border-radius:0 0 24px 24px}

  /* Form */
  .pr-lbl{font-size:11.5px;font-weight:700;color:#374151;display:block;margin-bottom:6px;letter-spacing:.01em}
  .pr-inp{width:100%;padding:10px 13px;border:1.5px solid rgba(82,183,136,.22);border-radius:11px;font-size:13px;outline:none;transition:border-color .16s,box-shadow .16s;color:#1a3d2b;background:#fafffe}
  .pr-inp::placeholder{color:#adb5bd}
  .pr-inp:focus{border-color:#2d6a4f;box-shadow:0 0 0 3px rgba(45,106,79,.09);background:#fff}
  .pr-tog{padding:8px 4px;border-radius:10px;font-size:12px;font-weight:600;border:1.5px solid rgba(82,183,136,.2);background:#fafffe;color:#4b5563;cursor:pointer;transition:all .14s;text-transform:capitalize;text-align:center}
  .pr-tog:hover{border-color:#52b788;background:#f0faf4;color:#1a3d2b}
  .pr-tog.sel{background:#1a3d2b;color:#fff;border-color:#1a3d2b;box-shadow:0 3px 9px rgba(26,61,43,.22)}
  .pr-fruit-btn{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:13px;border:1.5px solid rgba(82,183,136,.16);background:#fafffe;cursor:pointer;transition:all .16s;text-align:left}
  .pr-fruit-btn:hover{border-color:#40916c;background:#f0faf4;transform:translateY(-1px);box-shadow:0 4px 12px rgba(26,61,43,.09)}
  .pr-step-btn{width:36px;height:36px;border-radius:10px;border:1.5px solid rgba(82,183,136,.22);background:#fafffe;cursor:pointer;font-size:18px;font-weight:300;color:#2d6a4f;display:flex;align-items:center;justify-content:center;transition:background .13s;flex-shrink:0}
  .pr-step-btn:hover{background:#d8f3dc;border-color:#52b788}
  .pr-step-val{flex:1;padding:9px;border:1.5px solid rgba(82,183,136,.18);border-radius:10px;font-size:15px;font-weight:900;text-align:center;background:#f8fdf9;color:#1a3d2b;cursor:default;outline:none}
  .pr-info-strip{background:linear-gradient(135deg,#f0fdf4,#e6f7ee);border:1px solid #86efac;border-radius:13px;padding:13px 15px}
  .pr-warn-strip{background:linear-gradient(135deg,#fffbeb,#fef9c3);border:1px solid #fde68a;border-radius:13px;padding:12px 14px}
  .pr-btn-ok{flex:1;padding:11px;background:#1a3d2b;color:#fff;border-radius:12px;font-size:13px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .16s,transform .12s;box-shadow:0 4px 12px rgba(26,61,43,.26)}
  .pr-btn-ok:hover{background:#2d6a4f;transform:translateY(-1px)}
  .pr-btn-ok:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .pr-btn-cc{flex:1;padding:11px;border:1.5px solid rgba(82,183,136,.2);border-radius:12px;font-size:13px;font-weight:600;color:#6b7280;background:#fff;cursor:pointer;transition:background .14s}
  .pr-btn-cc:hover{background:#f0faf4;color:#1a3d2b;border-color:#52b788}
  .pr-btn-dl{flex:1;padding:11px;background:#dc2626;color:#fff;border-radius:12px;font-size:13px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .16s;box-shadow:0 4px 12px rgba(220,38,38,.26)}
  .pr-btn-dl:hover{background:#b91c1c}
  .pr-btn-dl:disabled{opacity:.5;cursor:not-allowed}
  .pr-det-cell{background:#f8fdf9;border-radius:11px;padding:10px 12px;border:1px solid rgba(82,183,136,.1)}
  .pr-rule{height:1px;background:rgba(82,183,136,.1);margin:12px 0}

  /* ── Banner ── */
  .pr-banner{background:linear-gradient(130deg,#0f2419 0%,#1a3d2b 50%,#2d6a4f 100%);border-radius:20px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 6px 24px rgba(26,61,43,0.22);border:1px solid rgba(82,183,136,0.12);position:relative;overflow:hidden}
  .pr-banner::after{content:'';position:absolute;right:-50px;top:-50px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.03);pointer-events:none}
  .pr-pulse-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0;animation:pr-pulse 2.5s ease infinite;box-shadow:0 0 0 3px rgba(74,222,128,0.18)}
  .pr-btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:8px 15px;background:rgba(255,255,255,0.08);color:#fff;border-radius:11px;font-size:12.5px;font-weight:600;border:1px solid rgba(255,255,255,0.14);cursor:pointer;transition:background .15s,transform .13s;white-space:nowrap}
  .pr-btn-ghost:hover{background:rgba(255,255,255,0.15);transform:translateY(-1px)}
  .pr-btn-solid{display:inline-flex;align-items:center;gap:6px;padding:8px 17px;background:#fff;color:#1a3d2b;border-radius:11px;font-size:12.5px;font-weight:800;border:none;cursor:pointer;transition:transform .13s,box-shadow .15s;box-shadow:0 2px 8px rgba(0,0,0,0.1);white-space:nowrap}
  .pr-btn-solid:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(0,0,0,0.14)}

  /* ── Fix #3: Storage conditions highlight strip in detail modal ── */
  .pr-cond-strip{background:linear-gradient(135deg,#f0fdf4,#e6f7ee);border:1px solid rgba(82,183,136,.25);border-radius:13px;padding:13px 15px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .pr-cond-cell{background:#fff;border-radius:9px;padding:9px 11px;border:1px solid rgba(82,183,136,.13);display:flex;flex-direction:column;gap:3px}
  .pr-cond-lbl{font-size:9px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;gap:4px}
  .pr-cond-val{font-size:13px;font-weight:800;color:#1a3d2b;text-transform:capitalize}
  .pr-cond-val-missing{font-size:12px;font-weight:500;color:#d1d5db;font-style:italic}

  /* ── Fix #4: Reservation bar in table row ── */
  .pr-qty-bar-wrap{height:4px;border-radius:99px;background:#e5e7eb;overflow:hidden;margin-top:4px;width:100%}
  .pr-qty-bar-fill{height:100%;border-radius:99px;transition:width .4s ease}
  .pr-reserved-pill{display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:99px;font-size:9.5px;font-weight:700;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}

  /* ── Fix #4: Reservation breakdown in detail modal ── */
  .pr-avail-strip{background:linear-gradient(135deg,#f0fdf4,#e6f7ee);border:1px solid rgba(82,183,136,.25);border-radius:13px;padding:13px 15px}
  .pr-avail-bar-wrap{height:8px;border-radius:99px;background:#e5e7eb;overflow:hidden;margin:8px 0 4px}
  .pr-avail-bar-avail{height:100%;border-radius:99px 0 0 99px;background:linear-gradient(to right,#4ade80,#16a34a);display:inline-block}
  .pr-avail-bar-reserv{height:100%;background:linear-gradient(to right,#fb923c,#ea580c);display:inline-block}
`;

if (typeof document !== 'undefined' && !document.getElementById('pr-sty')) {
  const el = document.createElement('style'); el.id = 'pr-sty'; el.textContent = STYLES;
  document.head.appendChild(el);
}

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const RIPENESS  = ['unripe', 'ripe'];
const CONDS     = ['excellent', 'good', 'fair', 'poor'];
const UNITS     = ['kg', 'pieces', 'boxes', 'crates'];
const AV_CLS    = { lo:'pr-av pr-av-lo', md:'pr-av pr-av-md', hi:'pr-av pr-av-hi', exp:'pr-av pr-av-ex', na:'pr-av pr-av-na' };

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const calcDaysLeft = (item) => {
  if (item.days_until_expiry != null) return Number(item.days_until_expiry);
  if (item.days_left         != null) return Number(item.days_left);
  if (item.expected_expiry_date) return Math.ceil((new Date(item.expected_expiry_date) - new Date()) / 86400000);
  if (item.entry_date && item.shelf_life_days) {
    const e = new Date(item.entry_date); e.setDate(e.getDate() + Number(item.shelf_life_days));
    return Math.ceil((e - new Date()) / 86400000);
  }
  return null;
};

const getRisk = (d) => {
  if (d === null) return { label:'—',       k:'na'  };
  if (d <= 0)     return { label:'EXPIRED', k:'exp' };
  if (d <= 4)     return { label:'HIGH',    k:'hi'  };
  if (d <= 7)     return { label:'MEDIUM',  k:'md'  };
  return               { label:'LOW',     k:'lo'  };
};

const storCls = (s = '') => {
  if (s.includes('refrig'))  return 'pr-stor pr-stor-ref';
  if (s.includes('control')) return 'pr-stor pr-stor-ctrl';
  return 'pr-stor pr-stor-amb';
};

const StorIcon = ({ s = '' }) => {
  if (s.includes('refrig'))  return <Snowflake size={11} />;
  if (s.includes('control')) return <Thermometer size={11} />;
  return <Wind size={11} />;
};

const genBatch = (name) =>
  `${name.toUpperCase()}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-3)}`;

/* ─── Fix #4: parse reservation fields safely ──────────────────────────────── */
// available_quantity and reserved_quantity are returned by the fixed model.
// Fall back gracefully for items fetched before the migration ran.
const getQtyBreakdown = (item) => {
  const total    = Number(item.quantity || 0);
  const reserved = Number(item.reserved_quantity || 0);
  const available = item.available_quantity != null
    ? Number(item.available_quantity)
    : Math.max(total - reserved, 0);
  return { total, reserved, available };
};

/* ─── Sort options ──────────────────────────────────────────────────────────── */
const SORT_OPTIONS = [
  { label:'Newest first',   f:'entry_date',   d:'desc', Icon:CalendarArrowDown  },
  { label:'Oldest first',   f:'entry_date',   d:'asc',  Icon:CalendarArrowUp    },
  { label:'Name A – Z',     f:'product_name', d:'asc',  Icon:ArrowUpAZ          },
  { label:'Days left ↑',    f:'days_left',    d:'asc',  Icon:ArrowUpNarrowWide  },
  { label:'Days left ↓',    f:'days_left',    d:'desc', Icon:ArrowDownWideNarrow},
  { label:'Quantity ↑',     f:'quantity',     d:'asc',  Icon:TrendingUp         },
];

/* ─── Risk icon helper ───────────────────────────────────────────────────────── */
const RiskIcon = ({ k, size = 10 }) => {
  if (k === 'hi'  || k === 'exp') return <CircleAlert size={size} />;
  if (k === 'md')                 return <AlertTriangle size={size} />;
  if (k === 'lo')                 return <CheckCircle2 size={size} />;
  return <Minus size={size} />;
};

/* ─── AddInventoryModal — COMPLETELY UNCHANGED ──────────────────────────────── */
const AddInventoryModal = ({ onClose, onSuccess }) => {
  const [step,  setStep]  = useState(1);
  const [fruit, setFruit] = useState(null);
  const [compat,setComp]  = useState(null);
  const [compL, setCompL] = useState(false);
  const [catalog,setCat]  = useState([]);
  const [catL,  setCatL]  = useState(true);
  const [catE,  setCatE]  = useState('');
  const [form,  setForm]  = useState({ quantity:'', unit_of_measure:'kg', ripeness_stage:'ripe', current_condition:'good', shelf_life_days:'', simulated_storage_temp:'', simulated_storage_humidity:'', batch_number:'' });
  const [saving,setSave]  = useState(false);
  const [err,   setErr]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await catalogService.getCatalog();
        const f = r?.fruits || r?.data?.fruits || r?.data || r || [];
        setCat(Array.isArray(f) ? f : []);
      } catch { setCatE('Failed to load catalog.'); }
      finally  { setCatL(false); }
    })();
  }, []);

  const pick = async (f) => {
    const base  = f.shelf_life_days || f.shelfLife || f.default_shelf_life_days || 7;
    const tMin  = f.optimal_temp_min  ?? f.tempMin  ?? '';
    const hMin  = f.optimal_humidity_min ?? f.humMin ?? '';
    const unit  = f.unit_of_measure || f.unit || 'kg';
    const avoid = f.avoid_with || f.avoid || [];
    setFruit({ ...f, name: f.product_name || f.name, shelfLife: base, avoid, product_id: f.product_id || f.fruit_id || null });
    setForm(p => ({ ...p, unit_of_measure:unit, shelf_life_days:String(base), simulated_storage_temp:String(tMin), simulated_storage_humidity:String(hMin), batch_number:genBatch(f.product_name||f.name) }));
    if (avoid?.length) {
      setCompL(true);
      try { const r = await inventoryService.checkCompatibility(avoid); setComp(r); }
      catch { setComp(null); }
      finally { setCompL(false); }
    } else setComp({ hasConflict: false });
    setStep(2);
  };

  const submit = async () => {
    if (!form.quantity || Number(form.quantity) <= 0) { setErr('Quantity must be greater than 0.'); return; }
    setSave(true); setErr('');
    try {
      await inventoryService.addInventory({
        product_id: fruit.product_id || null, fruit_name: fruit.name, product_name: fruit.name,
        quantity: Number(form.quantity), unit_of_measure: form.unit_of_measure, batch_number: form.batch_number,
        ripeness_stage: form.ripeness_stage, current_condition: form.current_condition,
        shelf_life_days: Number(form.shelf_life_days),
        simulated_storage_temp: Number(form.simulated_storage_temp) || null,
        simulated_storage_humidity: Number(form.simulated_storage_humidity) || null,
      });
      onSuccess(); onClose();
    } catch (e) { setErr(e.response?.data?.message || 'Failed to add inventory.'); }
    finally { setSave(false); }
  };

  const sMin = Math.floor((fruit?.shelfLife || 7) * 0.8);
  const sMax = Math.ceil((fruit?.shelfLife  || 7) * 1.2);

  return (
    <div className="pr-backdrop pr-root">
      <div className="pr-modal">
        <div className="pr-modal-hd">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Plus size={18} style={{ color:'#1a3d2b' }} />
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:15, color:'#1a3d2b', margin:0 }}>Add Fruit Batch</p>
              <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>
                {step === 1 ? 'Step 1 of 2 — Select a fruit' : `Step 2 of 2 — ${fruit?.name}`}
              </p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ display:'flex', gap:4 }}>
              {[1,2].map(s => <div key={s} style={{ width: s===step ? 20:7, height:7, borderRadius:99, background: s===step?'#1a3d2b': s<step?'#52b788':'#e5e7eb', transition:'all .28s' }} />)}
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={14} style={{ color:'#6b7280' }} />
            </button>
          </div>
        </div>

        <div className="pr-modal-body">
          {step === 1 && (<>
            {catL && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 0', gap:9, color:'#9ca3af' }}><div className="pr-spin" style={{ width:22, height:22 }} /> Loading catalog…</div>}
            {catE && <div className="pr-err"><AlertTriangle size={13} />{catE}</div>}
            {!catL && !catE && catalog.length === 0 && (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <div style={{ width:54, height:54, borderRadius:16, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <Package size={26} style={{ color:'#1a3d2b' }} />
                </div>
                <p style={{ fontWeight:700, fontSize:14, color:'#4b5563', margin:'0 0 4px' }}>No fruits in catalog</p>
                <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>Ask your super admin to add fruits first.</p>
              </div>
            )}
            {!catL && catalog.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {catalog.map(f => {
                  const nm  = f.product_name || f.name;
                  const sh  = f.shelf_life_days || f.shelfLife || f.default_shelf_life_days || '?';
                  const st  = f.storage_category || f.default_storage_type || f.storage || 'ambient';
                  const eth = f.is_ethylene_producer || f.ethylene || false;
                  return (
                    <button key={f.product_id || f.fruit_id || nm} onClick={() => pick(f)} className="pr-fruit-btn">
                      <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Leaf size={15} style={{ color:'#1a3d2b' }} />
                      </div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <p style={{ fontSize:12.5, fontWeight:700, color:'#1a3d2b', margin:0 }}>{nm}</p>
                        <p style={{ fontSize:11,   color:'#9ca3af', margin:0 }}>{sh}d · {st}</p>
                      </div>
                      {eth && (
                        <div style={{ width:24, height:24, borderRadius:7, background:'#fef9c3', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} title="Ethylene producer">
                          <Thermometer size={12} style={{ color:'#d97706' }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>)}

          {step === 2 && fruit && (<>
            <button onClick={() => { setStep(1); setFruit(null); setComp(null); }}
              style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:'#6b7280', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'Poppins,sans-serif' }}>
              <ChevronDown size={13} style={{ transform:'rotate(90deg)' }} /> Back
            </button>
            {compL && (
              <div style={{ background:'#f8fdf9', border:'1px solid rgba(82,183,136,.18)', borderRadius:11, padding:'10px 13px', display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'#6b7280' }}>
                <div className="pr-spin" style={{ width:15, height:15 }} /> Checking storage compatibility…
              </div>
            )}
            {compat?.hasConflict && (
              <div className="pr-warn-strip">
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                  <AlertTriangle size={13} style={{ color:'#d97706' }} />
                  <p style={{ fontSize:12.5, fontWeight:800, color:'#92400e', margin:0 }}>Storage Conflict Detected</p>
                </div>
                <p style={{ fontSize:12, color:'#b45309', margin:0 }}>
                  {fruit.name} conflicts with: <strong>{compat.conflicts?.map(c => c.product_name || c).join(', ')}</strong>. A MEDIUM alert will be created automatically.
                </p>
              </div>
            )}
            <div className="pr-info-strip">
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                <Leaf size={12} style={{ color:'#166534' }} />
                <p style={{ fontSize:10, fontWeight:800, color:'#166534', textTransform:'uppercase', letterSpacing:'.08em', margin:0 }}>Catalog Reference — {fruit.name}</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
                {[
                  ['Default Shelf', `${fruit.shelfLife}d`],
                  ['Temp Range',    `${fruit.optimal_temp_min ?? fruit.tempMin ?? '?'}–${fruit.optimal_temp_max ?? fruit.tempMax ?? '?'}°C`],
                  ['Storage',       fruit.storage_category || fruit.default_storage_type || '—'],
                ].map(([l,v]) => (
                  <div key={l} style={{ background:'#fff', borderRadius:9, padding:'8px 10px', border:'1px solid rgba(82,183,136,.13)' }}>
                    <p style={{ fontSize:9.5, color:'#9ca3af', margin:'0 0 3px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>{l}</p>
                    <p style={{ fontSize:13,  color:'#1a3d2b', margin:0, fontWeight:800, textTransform:'capitalize' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="pr-lbl">Quantity *</label>
                <input type="number" min="0" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity:e.target.value }))} placeholder="e.g. 200" className="pr-inp" />
              </div>
              <div>
                <label className="pr-lbl">Unit of Measure</label>
                <select value={form.unit_of_measure} onChange={e => setForm(p => ({ ...p, unit_of_measure:e.target.value }))} className="pr-inp">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="pr-lbl">Ripeness Stage *</label>
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${RIPENESS.length},1fr)`, gap:7 }}>
                {RIPENESS.map(s => (
                  <button key={s} onClick={() => setForm(p => ({ ...p, ripeness_stage:s }))} className={`pr-tog ${form.ripeness_stage===s?'sel':''}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="pr-lbl">Condition</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
                {CONDS.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, current_condition:c }))} className={`pr-tog ${form.current_condition===c?'sel':''}`}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="pr-lbl">
                Shelf Life (days)
                <span style={{ fontSize:10.5, fontWeight:400, color:'#9ca3af', marginLeft:5 }}>±20% of default ({fruit.shelfLife}d)</span>
              </label>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <button className="pr-step-btn" onClick={() => setForm(p => ({ ...p, shelf_life_days:String(Math.max(sMin, Number(p.shelf_life_days)-1)) }))}>−</button>
                <input readOnly value={form.shelf_life_days} className="pr-step-val" />
                <button className="pr-step-btn" onClick={() => setForm(p => ({ ...p, shelf_life_days:String(Math.min(sMax, Number(p.shelf_life_days)+1)) }))}>+</button>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'#9ca3af', marginTop:4, padding:'0 2px' }}>
                <span>Min {sMin}d</span><span>Max {sMax}d</span>
              </div>
            </div>
            <div>
              <label className="pr-lbl">Batch Number</label>
              <input type="text" value={form.batch_number} onChange={e => setForm(p => ({ ...p, batch_number:e.target.value }))} className="pr-inp" style={{ fontFamily:'monospace', letterSpacing:'.03em' }} />
            </div>
            {err && <div className="pr-err"><AlertTriangle size={12} />{err}</div>}
          </>)}
        </div>

        {step === 2 && (
          <div className="pr-modal-foot">
            <button onClick={onClose} className="pr-btn-cc">Cancel</button>
            <button onClick={submit} disabled={saving} className="pr-btn-ok">
              {saving ? <><div className="pr-spin" style={{ width:15, height:15 }} /> Adding…</> : <><Plus size={14} /> Add Batch</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── DetailModal — Fix #3 (storage conditions) + Fix #4 (reservation bar) ─── */
const DetailModal = ({ item, onClose }) => {
  const d = calcDaysLeft(item);
  const { label, k } = getRisk(d);
  const { total, reserved, available } = getQtyBreakdown(item);
  const reservedPct  = total > 0 ? Math.round((reserved  / total) * 100) : 0;
  const availablePct = total > 0 ? Math.round((available / total) * 100) : 100;

  const val = (v, suffix = '') =>
    (v !== null && v !== undefined && v !== '')
      ? <span className="pr-cond-val">{v}{suffix}</span>
      : <span className="pr-cond-val-missing">not recorded</span>;

  return (
    <div className="pr-backdrop pr-root">
      <div className="pr-modal pr-modal-sm">
        {/* Header */}
        <div className="pr-modal-hd">
          <div style={{ display:'flex', alignItems:'center', gap:11 }}>
            <div className={`${AV_CLS[k]||'pr-av pr-av-lo'}`} style={{ width:42, height:42, borderRadius:13, fontSize:17 }}>
              {(item.product_name||'?')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:15, color:'#1a3d2b', margin:0 }}>{item.product_name}</p>
              <p style={{ fontSize:11, color:'#9ca3af', margin:0, fontFamily:'monospace' }}>{item.batch_number||'—'}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14} style={{ color:'#6b7280' }} />
          </button>
        </div>

        <div className="pr-modal-body">
          {/* Risk + days */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className={`pr-risk pr-risk-${k}`}>
              <RiskIcon k={k} size={10} /> {label}
            </span>
            {d !== null && (
              <span className={`pr-days pr-days-${k}`}>
                <div className={`pr-dot pr-dot-${k}`} />
                {d <= 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}
              </span>
            )}
          </div>

          {/* Fix #4: Quantity / Reservation breakdown ──────────────────────── */}
          <div className="pr-avail-strip">
            <p style={{ fontSize:10, fontWeight:800, color:'#166534', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 8px', display:'flex', alignItems:'center', gap:5 }}>
              <Boxes size={11} style={{ color:'#166534' }} /> Quantity Breakdown
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {/* Total */}
              <div style={{ background:'#fff', borderRadius:9, padding:'8px 10px', border:'1px solid rgba(82,183,136,.13)' }}>
                <p style={{ fontSize:9.5, color:'#9ca3af', margin:'0 0 2px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>Total Stock</p>
                <p style={{ fontSize:15, color:'#1a3d2b', margin:0, fontWeight:900 }}>{total}</p>
                <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>{item.unit_of_measure||'kg'}</p>
              </div>
              {/* Reserved */}
              <div style={{ background: reserved > 0 ? '#fff7ed' : '#fff', borderRadius:9, padding:'8px 10px', border:`1px solid ${reserved > 0 ? '#fed7aa' : 'rgba(82,183,136,.13)'}` }}>
                <p style={{ fontSize:9.5, color: reserved > 0 ? '#c2410c' : '#9ca3af', margin:'0 0 2px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', display:'flex', alignItems:'center', gap:3 }}>
                  {reserved > 0 && <Lock size={8} />} Reserved
                </p>
                <p style={{ fontSize:15, color: reserved > 0 ? '#c2410c' : '#6b7280', margin:0, fontWeight:900 }}>{reserved}</p>
                <p style={{ fontSize:10, color: reserved > 0 ? '#fb923c' : '#9ca3af', margin:0 }}>{reservedPct}% locked</p>
              </div>
              {/* Available */}
              <div style={{ background:'linear-gradient(135deg,#f0fdf4,#e6f7ee)', borderRadius:9, padding:'8px 10px', border:'1px solid #86efac' }}>
                <p style={{ fontSize:9.5, color:'#166534', margin:'0 0 2px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>Available</p>
                <p style={{ fontSize:15, color:'#1a3d2b', margin:0, fontWeight:900 }}>{available}</p>
                <p style={{ fontSize:10, color:'#52b788', margin:0 }}>{availablePct}% free</p>
              </div>
            </div>
            {/* Visual bar */}
            {reserved > 0 && (
              <>
                <div className="pr-avail-bar-wrap">
                  <span className="pr-avail-bar-avail" style={{ width:`${availablePct}%` }} />
                  <span className="pr-avail-bar-reserv" style={{ width:`${reservedPct}%` }} />
                </div>
                <p style={{ fontSize:10.5, color:'#9a3412', margin:0, display:'flex', alignItems:'center', gap:4 }}>
                  <Lock size={10} /> {reserved} {item.unit_of_measure||'kg'} reserved for a pending delivery
                </p>
              </>
            )}
          </div>

          {/* Fix #3: Storage conditions strip */}
          <div>
            <p style={{ fontSize:10, fontWeight:800, color:'#166534', textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 7px', display:'flex', alignItems:'center', gap:5 }}>
              <Leaf size={11} style={{ color:'#166534' }} /> Storage Conditions
            </p>
            <div className="pr-cond-strip">
              <div className="pr-cond-cell">
                <span className="pr-cond-lbl"><Leaf size={9} style={{ color:'#2d6a4f' }} /> Ripeness</span>
                {val(item.ripeness_stage)}
              </div>
              <div className="pr-cond-cell">
                <span className="pr-cond-lbl"><Thermometer size={9} style={{ color:'#3b82f6' }} /> Temp</span>
                {val(item.simulated_storage_temp, '°C')}
              </div>
              <div className="pr-cond-cell">
                <span className="pr-cond-lbl"><Droplets size={9} style={{ color:'#0891b2' }} /> Humidity</span>
                {val(item.simulated_storage_humidity, '%')}
              </div>
            </div>
          </div>

          <div className="pr-rule" />

          {/* All other fields */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              ['Storage',     item.storage_category||'—'],
              ['Condition',   item.current_condition||'—'],
              ['Shelf Life',  item.shelf_life_days ? `${item.shelf_life_days}d` : '—'],
              ['Entry Date',  item.entry_date  ? new Date(item.entry_date).toLocaleDateString('en-PH')                 : '—'],
              ['Expiry Date', item.expected_expiry_date ? new Date(item.expected_expiry_date).toLocaleDateString('en-PH') : '—'],
              ['Batch',       item.batch_number||'—'],
            ].map(([l, v]) => (
              <div key={l} className="pr-det-cell">
                <p style={{ fontSize:9.5, color:'#9ca3af', margin:'0 0 3px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</p>
                <p style={{ fontSize:13, fontWeight:700, color:'#1a3d2b', margin:0, textTransform:'capitalize', fontFamily: l==='Batch'?'monospace':'inherit' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── ProductsPage ──────────────────────────────────────────────────────────── */
const ProductsPage = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [riskF,     setRiskF]     = useState('all');
  const [sortFld,   setSortFld]   = useState('entry_date');
  const [sortDir,   setSortDir]   = useState('desc');
  const [showSort,  setShowSort]  = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [viewItem,  setViewItem]  = useState(null);
  const [delTgt,    setDelTgt]    = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await inventoryService.getAllInventory();
      const list = res?.data || res || [];
      setInventory(Array.isArray(list) ? list : []);
    } catch { setError('Failed to load inventory.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await inventoryService.deleteInventory(delTgt.inventory_id); load(); }
    catch { setError('Failed to delete batch.'); }
    finally { setDeleting(false); setDelTgt(null); }
  };

  const handleSort = (f) => {
    if (sortFld === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortFld(f); setSortDir('asc'); }
    setShowSort(false);
  };

  const processed = inventory
    .filter(item => {
      if (search && !item.product_name?.toLowerCase().includes(search.toLowerCase()) && !item.batch_number?.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskF === 'all') return true;
      return getRisk(calcDaysLeft(item)).label === riskF;
    })
    .sort((a, b) => {
      let av = sortFld === 'days_left' ? calcDaysLeft(a) : a[sortFld];
      let bv = sortFld === 'days_left' ? calcDaysLeft(b) : b[sortFld];
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const counts = inventory.reduce((acc, i) => {
    const l = getRisk(calcDaysLeft(i)).label; acc[l] = (acc[l] || 0) + 1; return acc;
  }, {});

  const SortArrow = ({ field }) =>
    sortFld === field
      ? (sortDir === 'asc' ? <ChevronUp size={10} style={{ color:'#2d6a4f' }} /> : <ChevronDown size={10} style={{ color:'#2d6a4f' }} />)
      : <ChevronUp size={10} style={{ color:'#d1d5db' }} />;

  const activeSortLabel = SORT_OPTIONS.find(o => o.f === sortFld && o.d === sortDir)?.label || 'Sort';

  return (
    <Layout currentPage="Product Management" user={user}>
      <div className="pr-root pr-page" style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── Banner ── */}
        <div className="pr-banner">
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Package size={13} style={{ color:'#86efac' }} />
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.1em' }}>
                EcoTrackAI — Inventory Management
              </span>
            </div>
            <h1 style={{ color:'#fff', fontSize:20, fontWeight:900, margin:'0 0 7px', letterSpacing:'-.4px' }}>Product Inventory</h1>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className="pr-pulse-dot" />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>System Operational</span>
              </div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Clock size={10} style={{ color:'rgba(255,255,255,0.35)' }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>
                  {new Date().toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
                </span>
              </div>
              {(counts['HIGH'] || 0) > 0 && (
                <>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <CircleAlert size={11} style={{ color:'#fca5a5' }} />
                    <span style={{ fontSize:11, color:'#fca5a5', fontWeight:600 }}>{counts['HIGH']} high-risk batch{counts['HIGH'] > 1 ? 'es' : ''} need attention</span>
                  </div>
                </>
              )}
              {/* Fix #4: banner notice for any reserved stock */}
              {inventory.some(i => Number(i.reserved_quantity) > 0) && (
                <>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>|</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <Lock size={11} style={{ color:'#fbbf24' }} />
                    <span style={{ fontSize:11, color:'#fbbf24', fontWeight:600 }}>
                      {inventory.filter(i => Number(i.reserved_quantity) > 0).length} batch{inventory.filter(i=>Number(i.reserved_quantity)>0).length>1?'es':''} partially reserved
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, zIndex:1, flexWrap:'wrap', alignItems:'center' }}>
            <button className="pr-btn-ghost" onClick={load} disabled={loading}>
              <RefreshCw size={12} style={loading ? { animation:'pr-spin .7s linear infinite' } : {}} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button className="pr-btn-solid" onClick={() => setShowAdd(true)}>
              <Plus size={13} /> Add Product
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[
            { key:'all',    label:'Total Batches', count:inventory.length,     cls:'pr-stat-all', num:'#fff',     sub:'rgba(255,255,255,.55)', Icon:Boxes,       ibg:'rgba(255,255,255,.13)', ic:'#fff'    },
            { key:'HIGH',   label:'High Risk',     count:counts['HIGH']||0,    cls:'pr-stat-hi',  num:'#991b1b',  sub:'#fca5a5',              Icon:CircleAlert,  ibg:'#fee2e2',              ic:'#dc2626' },
            { key:'MEDIUM', label:'Medium Risk',   count:counts['MEDIUM']||0,  cls:'pr-stat-md',  num:'#92400e',  sub:'#fbbf24',              Icon:AlertTriangle,ibg:'#fef9c3',              ic:'#d97706' },
            { key:'LOW',    label:'Low Risk',      count:counts['LOW']||0,     cls:'pr-stat-lo',  num:'#166534',  sub:'#4ade80',              Icon:ShieldCheck,  ibg:'#d8f3dc',              ic:'#16a34a' },
          ].map(({ key, label, count, cls, num, sub, Icon, ibg, ic }) => (
            <button key={key} onClick={() => setRiskF(key)} className={`pr-stat ${cls} ${riskF===key?'pr-on':''}`} style={{ textAlign:'left' }}>
              <div className="pr-stat-orb" style={{ width:100, height:100, right:-30, top:-30 }} />
              <div className="pr-stat-orb" style={{ width:55,  height:55,  right:16, bottom:-20 }} />
              <div className="pr-stat-ico" style={{ background:ibg }}>
                <Icon size={18} style={{ color:ic }} />
              </div>
              <p className="pr-stat-num" style={{ color:num }}>{count}</p>
              <p className="pr-stat-lbl" style={{ color:sub }}>{label}</p>
            </button>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="pr-bar">
          <div className="pr-srch-wrap">
            <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fruit or batch…" className="pr-srch" />
            {search && (
              <button onClick={() => setSearch('')} style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', display:'flex', padding:0 }}>
                <X size={12} style={{ color:'#9ca3af' }} />
              </button>
            )}
          </div>
          <div className="pr-divider" />
          {riskF !== 'all' && (
            <button onClick={() => setRiskF('all')}
              style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:99, fontSize:11.5, fontWeight:600, background:'#f3f4f6', color:'#6b7280', border:'1.5px solid #e5e7eb', cursor:'pointer', whiteSpace:'nowrap' }}>
              <X size={11} /> Clear: {riskF}
            </button>
          )}
          <div style={{ flex:1 }} />
          <div style={{ position:'relative' }}>
            <button className="pr-sort-btn" onClick={() => setShowSort(v => !v)}>
              <SlidersHorizontal size={13} />
              <span>{activeSortLabel}</span>
              <ChevronDown size={11} style={{ opacity:.45 }} />
            </button>
            {showSort && (
              <div className="pr-drop">
                {SORT_OPTIONS.map(({ label, f, d, Icon }) => (
                  <button key={label} onClick={() => { setSortFld(f); setSortDir(d); setShowSort(false); }}
                    className={`pr-drop-item ${sortFld===f && sortDir===d ? 'pr-on' : ''}`}>
                    <div className="pr-drop-ico"><Icon size={13} style={{ color:'#6b7280' }} /></div>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pr-divider" />
          <button onClick={load} className="pr-ibtn" title="Refresh">
            <RefreshCw size={14} style={loading ? { animation:'pr-spin .65s linear infinite' } : {}} />
          </button>
          <button onClick={() => setShowAdd(true)} className="pr-add-btn">
            <Plus size={14} /> Add Product
          </button>
        </div>

        {error && (
          <div className="pr-err">
            <AlertTriangle size={13} style={{ flexShrink:0 }} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', display:'flex' }}>
              <X size={12} style={{ color:'#dc2626' }} />
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="pr-table">
          {/* Fix #4: Added "Available" column header */}
          <div className="pr-thead">
            {[['Product','product_name'],['Batch / Qty',null],['Available',null],['Shelf Life','shelf_life_days'],['Storage',null],['Risk','days_left']].map(([l,f]) => (
              <div key={l}>
                {f
                  ? <button className="pr-th" onClick={() => handleSort(f)}>{l}<SortArrow field={f}/></button>
                  : <span className="pr-th pr-th-r">{l}</span>}
              </div>
            ))}
            <span className="pr-th pr-th-r" style={{ justifyContent:'flex-end' }}>Actions</span>
          </div>

          {loading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'56px 0', gap:12, color:'#9ca3af' }}>
              <div className="pr-spin" style={{ width:26, height:26 }} />
              <span style={{ fontSize:13.5 }}>Loading inventory…</span>
            </div>
          ) : processed.length === 0 ? (
            <div className="pr-empty">
              <div style={{ width:60, height:60, borderRadius:18, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 }}>
                <Package size={28} style={{ color:'#1a3d2b' }} />
              </div>
              <p style={{ fontWeight:800, fontSize:15, color:'#1a3d2b', margin:0 }}>No batches found</p>
              <p style={{ fontSize:13, color:'#9ca3af', margin:0 }}>
                {search ? `No results for "${search}"` : 'Add your first fruit batch to get started'}
              </p>
              {!search && (
                <button onClick={() => setShowAdd(true)} className="pr-add-btn" style={{ marginTop:6 }}>
                  <Plus size={13} /> Add Product
                </button>
              )}
            </div>
          ) : processed.map((item, idx) => {
            const d = calcDaysLeft(item);
            const { label, k } = getRisk(d);
            const { total, reserved, available } = getQtyBreakdown(item);
            const reservedPct  = total > 0 ? Math.round((reserved  / total) * 100) : 0;
            const availablePct = 100 - reservedPct;
            const hasReserved  = reserved > 0;

            return (
              <div key={item.inventory_id || idx} className="pr-row">

                {/* Product */}
                <div style={{ display:'flex', alignItems:'center', gap:11, minWidth:0 }}>
                  <div className={AV_CLS[k]||'pr-av pr-av-lo'}>{(item.product_name||'?')[0].toUpperCase()}</div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#111827', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.product_name}</p>
                    <p style={{ fontSize:11, color:'#9ca3af', margin:0, textTransform:'capitalize' }}>{item.ripeness_stage||'fruit'}</p>
                  </div>
                </div>

                {/* Batch / Total Qty */}
                <div>
                  <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 2px', fontFamily:'monospace', letterSpacing:'.02em' }}>{item.batch_number||'—'}</p>
                  <p style={{ fontSize:12.5, fontWeight:600, color:'#374151', margin:'0 0 3px' }}>
                    {total} {item.unit_of_measure||'kg'} <span style={{ fontSize:10, color:'#9ca3af', fontWeight:400 }}>total</span>
                  </p>
                  {d !== null && (
                    <span className={`pr-days pr-days-${k}`}>
                      <div className={`pr-dot pr-dot-${k}`} />
                      {d <= 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}
                    </span>
                  )}
                </div>

                {/* Fix #4: Available column — the key new column ─────────────── */}
                <div>
                  <p style={{ fontSize:13, fontWeight:800, color: hasReserved ? '#166534' : '#374151', margin:'0 0 2px' }}>
                    {available} <span style={{ fontSize:10, color:'#9ca3af', fontWeight:400 }}>{item.unit_of_measure||'kg'}</span>
                  </p>
                  {hasReserved ? (
                    <>
                      <span className="pr-reserved-pill">
                        <Lock size={8} /> {reserved} reserved
                      </span>
                      {/* Mini progress bar: green = available, orange = reserved */}
                      <div className="pr-qty-bar-wrap" style={{ marginTop:5 }}>
                        <div style={{ display:'flex', height:'100%' }}>
                          <div className="pr-qty-bar-fill" style={{ width:`${availablePct}%`, background:'#4ade80' }} />
                          <div className="pr-qty-bar-fill" style={{ width:`${reservedPct}%`,  background:'#fb923c' }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p style={{ fontSize:10, color:'#9ca3af', margin:0 }}>fully available</p>
                  )}
                </div>

                {/* Shelf Life */}
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <Clock size={11} style={{ color:'#9ca3af', flexShrink:0 }} />
                  <span style={{ fontSize:12.5, color:'#374151', fontWeight:500 }}>
                    {item.shelf_life_days ? `${item.shelf_life_days}d` : '—'}
                  </span>
                </div>

                {/* Storage */}
                <div>
                  <span className={storCls(item.storage_category||'')}>
                    <StorIcon s={item.storage_category||''} />
                    {item.storage_category||'ambient'}
                  </span>
                </div>

                {/* Risk */}
                <div>
                  <span className={`pr-risk pr-risk-${k}`}>
                    <RiskIcon k={k} size={10} /> {label}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:3 }}>
                  <button className="pr-act pr-act-eye" onClick={() => setViewItem(item)} title="View details">
                    <Eye size={14} />
                  </button>
                  <button className="pr-act pr-act-del" onClick={() => setDelTgt(item)} title="Delete batch">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {processed.length > 0 && (
            <div className="pr-foot">
              <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>
                Showing <strong style={{ color:'#1a3d2b' }}>{processed.length}</strong> of <strong style={{ color:'#1a3d2b' }}>{inventory.length}</strong> batches
                {riskF !== 'all' && <span style={{ color:'#6b7280' }}> · {riskF} filter active</span>}
              </p>
              <button onClick={load}
                style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#6b7280', background:'none', border:'none', cursor:'pointer', fontWeight:500, fontFamily:'Poppins,sans-serif', transition:'color .13s' }}
                onMouseOver={e => e.currentTarget.style.color = '#1a3d2b'}
                onMouseOut={e  => e.currentTarget.style.color = '#6b7280'}>
                <RefreshCw size={11} /> Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      {showAdd   && <AddInventoryModal onClose={() => setShowAdd(false)} onSuccess={load} />}
      {viewItem  && <DetailModal item={viewItem} onClose={() => setViewItem(null)} />}

      {delTgt && (
        <div className="pr-backdrop pr-root">
          <div className="pr-modal pr-modal-sm" style={{ padding:28, textAlign:'center' }}>
            <div style={{ width:58, height:58, borderRadius:18, background:'linear-gradient(135deg,#fee2e2,#fecaca)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
              <Trash2 size={26} style={{ color:'#dc2626' }} />
            </div>
            <p style={{ fontWeight:900, fontSize:17, color:'#111827', margin:'0 0 7px' }}>Delete this batch?</p>
            <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 22px', lineHeight:1.6 }}>
              You are about to permanently remove{' '}
              <strong style={{ color:'#1a3d2b' }}>{delTgt.product_name}</strong>{' '}
              <span style={{ fontFamily:'monospace', fontSize:11.5, background:'#f3f4f6', padding:'1px 6px', borderRadius:5 }}>{delTgt.batch_number}</span>.
              <br />This action cannot be undone.
            </p>
            <div style={{ display:'flex', gap:9 }}>
              <button onClick={() => setDelTgt(null)} className="pr-btn-cc">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="pr-btn-dl">
                {deleting
                  ? <div className="pr-spin" style={{ width:15, height:15, borderColor:'rgba(255,255,255,.35)', borderTopColor:'#fff' }} />
                  : <Trash2 size={13} />}
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProductsPage;
