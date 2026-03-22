// ============================================================
// FILE: src/components/AddInventoryModal.jsx
//
// Extracted from ProductsPage.jsx — zero logic changes.
// This is the Poppins-styled, two-step catalog modal that
// ProductsPage uses inline. Making it a shared component
// so AdminDashboardPage can use the same UI.
//
// ProductsPage.jsx still defines its own inline copy and is
// UNTOUCHED — it does not import this file.
//
// AdminDashboardPage.jsx imports this instead of AddProductModal.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Plus, X, AlertTriangle, ChevronDown, Leaf,
  Package, Thermometer
} from 'lucide-react';
import inventoryService from '../services/inventory.service';
import catalogService   from '../services/catalog.service';

/* ─── Inline styles (scoped to this modal) ─────────────────────────────────── */
// Only the styles this modal actually uses — not the full ProductsPage sheet.
const MODAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');

  .aim-root,.aim-root *{font-family:'Poppins',sans-serif;box-sizing:border-box}

  @keyframes aim-in  {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes aim-pop {from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  @keyframes aim-spin{to{transform:rotate(360deg)}}

  .aim-backdrop{position:fixed;inset:0;background:rgba(8,20,12,.52);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px;animation:aim-in .16s ease both}
  .aim-modal{background:#fff;border-radius:24px;box-shadow:0 32px 80px rgba(0,0,0,.22);width:100%;max-width:500px;max-height:92vh;overflow-y:auto;animation:aim-pop .2s cubic-bezier(.34,1.4,.64,1) both}
  .aim-modal-hd{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 16px;border-bottom:1px solid rgba(82,183,136,.11);position:sticky;top:0;background:#fff;z-index:2;border-radius:24px 24px 0 0}
  .aim-modal-body{padding:18px 22px;display:flex;flex-direction:column;gap:16px}
  .aim-modal-foot{display:flex;gap:9px;padding:14px 22px 20px;border-top:1px solid rgba(82,183,136,.09);position:sticky;bottom:0;background:#fff;border-radius:0 0 24px 24px}

  .aim-lbl{font-size:11.5px;font-weight:700;color:#374151;display:block;margin-bottom:6px;letter-spacing:.01em}
  .aim-inp{width:100%;padding:10px 13px;border:1.5px solid rgba(82,183,136,.22);border-radius:11px;font-size:13px;outline:none;transition:border-color .16s,box-shadow .16s;color:#1a3d2b;background:#fafffe;font-family:'Poppins',sans-serif}
  .aim-inp::placeholder{color:#adb5bd}
  .aim-inp:focus{border-color:#2d6a4f;box-shadow:0 0 0 3px rgba(45,106,79,.09);background:#fff}

  .aim-tog{padding:8px 4px;border-radius:10px;font-size:12px;font-weight:600;border:1.5px solid rgba(82,183,136,.2);background:#fafffe;color:#4b5563;cursor:pointer;transition:all .14s;text-transform:capitalize;text-align:center;font-family:'Poppins',sans-serif}
  .aim-tog:hover{border-color:#52b788;background:#f0faf4;color:#1a3d2b}
  .aim-tog.sel{background:#1a3d2b;color:#fff;border-color:#1a3d2b;box-shadow:0 3px 9px rgba(26,61,43,.22)}

  .aim-fruit-btn{display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:13px;border:1.5px solid rgba(82,183,136,.16);background:#fafffe;cursor:pointer;transition:all .16s;text-align:left;width:100%;font-family:'Poppins',sans-serif}
  .aim-fruit-btn:hover{border-color:#40916c;background:#f0faf4;transform:translateY(-1px);box-shadow:0 4px 12px rgba(26,61,43,.09)}

  .aim-step-btn{width:36px;height:36px;border-radius:10px;border:1.5px solid rgba(82,183,136,.22);background:#fafffe;cursor:pointer;font-size:18px;font-weight:300;color:#2d6a4f;display:flex;align-items:center;justify-content:center;transition:background .13s;flex-shrink:0;font-family:'Poppins',sans-serif}
  .aim-step-btn:hover{background:#d8f3dc;border-color:#52b788}
  .aim-step-val{flex:1;padding:9px;border:1.5px solid rgba(82,183,136,.18);border-radius:10px;font-size:15px;font-weight:900;text-align:center;background:#f8fdf9;color:#1a3d2b;cursor:default;outline:none;font-family:'Poppins',sans-serif}

  .aim-info-strip{background:linear-gradient(135deg,#f0fdf4,#e6f7ee);border:1px solid #86efac;border-radius:13px;padding:13px 15px}
  .aim-warn-strip{background:linear-gradient(135deg,#fffbeb,#fef9c3);border:1px solid #fde68a;border-radius:13px;padding:12px 14px}

  .aim-btn-ok{flex:1;padding:11px;background:#1a3d2b;color:#fff;border-radius:12px;font-size:13px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .16s,transform .12s;box-shadow:0 4px 12px rgba(26,61,43,.26);font-family:'Poppins',sans-serif}
  .aim-btn-ok:hover{background:#2d6a4f;transform:translateY(-1px)}
  .aim-btn-ok:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .aim-btn-cc{flex:1;padding:11px;border:1.5px solid rgba(82,183,136,.2);border-radius:12px;font-size:13px;font-weight:600;color:#6b7280;background:#fff;cursor:pointer;transition:background .14s;font-family:'Poppins',sans-serif}
  .aim-btn-cc:hover{background:#f0faf4;color:#1a3d2b;border-color:#52b788}

  .aim-err{background:#fef2f2;border:1px solid #fecaca;border-radius:11px;padding:10px 13px;font-size:12.5px;color:#dc2626;display:flex;align-items:center;gap:7px}
  .aim-spin{border-radius:50%;border:2.5px solid #b7e4c7;border-top-color:#1a3d2b;animation:aim-spin .6s linear infinite}
`;

if (typeof document !== 'undefined' && !document.getElementById('aim-styles')) {
  const el = document.createElement('style');
  el.id = 'aim-styles'; el.textContent = MODAL_STYLES;
  document.head.appendChild(el);
}

/* ─── Constants (same as ProductsPage) ─────────────────────────────────────── */
const RIPENESS = ['unripe', 'ripe'];
const CONDS    = ['excellent', 'good', 'fair', 'poor'];
const UNITS    = ['kg', 'pieces', 'boxes', 'crates'];

const genBatch = (name) =>
  `${name.toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-3)}`;

/* ─── AddInventoryModal ─────────────────────────────────────────────────────── */
// Identical logic to the inline version in ProductsPage.jsx.
// Props: onClose, onSuccess — same interface as AddProductModal.
const AddInventoryModal = ({ onClose, onSuccess }) => {
  const [step,    setStep]    = useState(1);
  const [fruit,   setFruit]   = useState(null);
  const [compat,  setComp]    = useState(null);
  const [compL,   setCompL]   = useState(false);
  const [catalog, setCat]     = useState([]);
  const [catL,    setCatL]    = useState(true);
  const [catE,    setCatE]    = useState('');
  const [form,    setForm]    = useState({
    quantity: '', unit_of_measure: 'kg', ripeness_stage: 'ripe',
    current_condition: 'good', shelf_life_days: '',
    simulated_storage_temp: '', simulated_storage_humidity: '',
    batch_number: ''
  });
  const [saving,  setSave]    = useState(false);
  const [err,     setErr]     = useState('');

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
    setFruit({
      ...f,
      name: f.product_name || f.name,
      shelfLife: base,
      avoid,
      product_id: f.product_id || f.fruit_id || null
    });
    setForm(p => ({
      ...p,
      unit_of_measure:            unit,
      shelf_life_days:            String(base),
      simulated_storage_temp:     String(tMin),
      simulated_storage_humidity: String(hMin),
      batch_number:               genBatch(f.product_name || f.name)
    }));
    if (avoid?.length) {
      setCompL(true);
      try {
        const r = await inventoryService.checkCompatibility(avoid);
        setComp(r);
      } catch { setComp(null); }
      finally { setCompL(false); }
    } else {
      setComp({ hasConflict: false });
    }
    setStep(2);
  };

  const submit = async () => {
    if (!form.quantity || Number(form.quantity) <= 0) {
      setErr('Quantity must be greater than 0.');
      return;
    }
    setSave(true); setErr('');
    try {
      await inventoryService.addInventory({
        product_id:                 fruit.product_id || null,
        fruit_name:                 fruit.name,
        product_name:               fruit.name,
        quantity:                   Number(form.quantity),
        unit_of_measure:            form.unit_of_measure,
        batch_number:               form.batch_number,
        ripeness_stage:             form.ripeness_stage,
        current_condition:          form.current_condition,
        shelf_life_days:            Number(form.shelf_life_days),
        simulated_storage_temp:     Number(form.simulated_storage_temp) || null,
        simulated_storage_humidity: Number(form.simulated_storage_humidity) || null,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to add inventory.');
    } finally {
      setSave(false);
    }
  };

  const sMin = Math.floor((fruit?.shelfLife || 7) * 0.8);
  const sMax = Math.ceil((fruit?.shelfLife  || 7) * 1.2);

  return (
    <div className="aim-backdrop aim-root">
      <div className="aim-modal">
        {/* Header */}
        <div className="aim-modal-hd">
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
              {[1, 2].map(s => (
                <div key={s} style={{
                  width: s === step ? 20 : 7, height: 7, borderRadius: 99,
                  background: s === step ? '#1a3d2b' : s < step ? '#52b788' : '#e5e7eb',
                  transition: 'all .28s'
                }} />
              ))}
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'none', background:'#f3f4f6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={14} style={{ color:'#6b7280' }} />
            </button>
          </div>
        </div>

        <div className="aim-modal-body">
          {/* ── STEP 1: Pick a fruit ────────────────────────── */}
          {step === 1 && (
            <>
              {catL && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 0', gap:9, color:'#9ca3af' }}>
                  <div className="aim-spin" style={{ width:22, height:22 }} /> Loading catalog…
                </div>
              )}
              {catE && (
                <div className="aim-err"><AlertTriangle size={13} />{catE}</div>
              )}
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
                      <button key={f.product_id || f.fruit_id || nm} onClick={() => pick(f)} className="aim-fruit-btn">
                        <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#d8f3dc,#b7e4c7)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Leaf size={15} style={{ color:'#1a3d2b' }} />
                        </div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <p style={{ fontSize:12.5, fontWeight:700, color:'#1a3d2b', margin:0 }}>{nm}</p>
                          <p style={{ fontSize:11, color:'#9ca3af', margin:0 }}>{sh}d · {st}</p>
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
            </>
          )}

          {/* ── STEP 2: Fill in details ─────────────────────── */}
          {step === 2 && fruit && (
            <>
              <button
                onClick={() => { setStep(1); setFruit(null); setComp(null); }}
                style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:'#6b7280', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'Poppins,sans-serif' }}>
                <ChevronDown size={13} style={{ transform:'rotate(90deg)' }} /> Back
              </button>

              {compL && (
                <div style={{ background:'#f8fdf9', border:'1px solid rgba(82,183,136,.18)', borderRadius:11, padding:'10px 13px', display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'#6b7280' }}>
                  <div className="aim-spin" style={{ width:15, height:15 }} /> Checking storage compatibility…
                </div>
              )}

              {compat?.hasConflict && (
                <div className="aim-warn-strip">
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                    <AlertTriangle size={13} style={{ color:'#d97706' }} />
                    <p style={{ fontSize:12.5, fontWeight:800, color:'#92400e', margin:0 }}>Storage Conflict Detected</p>
                  </div>
                  <p style={{ fontSize:12, color:'#b45309', margin:0 }}>
                    {fruit.name} conflicts with:{' '}
                    <strong>{compat.conflicts?.map(c => c.product_name || c).join(', ')}</strong>. A MEDIUM alert will be created automatically.
                  </p>
                </div>
              )}

              {/* Catalog reference card */}
              <div className="aim-info-strip">
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                  <Leaf size={12} style={{ color:'#166534' }} />
                  <p style={{ fontSize:10, fontWeight:800, color:'#166534', textTransform:'uppercase', letterSpacing:'.08em', margin:0 }}>
                    Catalog Reference — {fruit.name}
                  </p>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
                  {[
                    ['Default Shelf', `${fruit.shelfLife}d`],
                    ['Temp Range',    `${fruit.optimal_temp_min ?? fruit.tempMin ?? '?'}–${fruit.optimal_temp_max ?? fruit.tempMax ?? '?'}°C`],
                    ['Storage',       fruit.storage_category || fruit.default_storage_type || '—'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background:'#fff', borderRadius:9, padding:'8px 10px', border:'1px solid rgba(82,183,136,.13)' }}>
                      <p style={{ fontSize:9.5, color:'#9ca3af', margin:'0 0 3px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>{l}</p>
                      <p style={{ fontSize:13, color:'#1a3d2b', margin:0, fontWeight:800, textTransform:'capitalize' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quantity + unit */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="aim-lbl">Quantity *</label>
                  <input type="number" min="0" value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    placeholder="e.g. 200" className="aim-inp" />
                </div>
                <div>
                  <label className="aim-lbl">Unit of Measure</label>
                  <select value={form.unit_of_measure}
                    onChange={e => setForm(p => ({ ...p, unit_of_measure: e.target.value }))}
                    className="aim-inp">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Ripeness */}
              <div>
                <label className="aim-lbl">Ripeness Stage *</label>
                <div style={{ display:'grid', gridTemplateColumns:`repeat(${RIPENESS.length},1fr)`, gap:7 }}>
                  {RIPENESS.map(s => (
                    <button key={s} onClick={() => setForm(p => ({ ...p, ripeness_stage: s }))}
                      className={`aim-tog ${form.ripeness_stage === s ? 'sel' : ''}`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="aim-lbl">Condition</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:7 }}>
                  {CONDS.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, current_condition: c }))}
                      className={`aim-tog ${form.current_condition === c ? 'sel' : ''}`}>{c}</button>
                  ))}
                </div>
              </div>

              {/* Shelf life stepper */}
              <div>
                <label className="aim-lbl">
                  Shelf Life (days)
                  <span style={{ fontSize:10.5, fontWeight:400, color:'#9ca3af', marginLeft:5 }}>
                    ±20% of default ({fruit.shelfLife}d)
                  </span>
                </label>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <button className="aim-step-btn"
                    onClick={() => setForm(p => ({ ...p, shelf_life_days: String(Math.max(sMin, Number(p.shelf_life_days) - 1)) }))}>−</button>
                  <input readOnly value={form.shelf_life_days} className="aim-step-val" />
                  <button className="aim-step-btn"
                    onClick={() => setForm(p => ({ ...p, shelf_life_days: String(Math.min(sMax, Number(p.shelf_life_days) + 1)) }))}>+</button>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'#9ca3af', marginTop:4, padding:'0 2px' }}>
                  <span>Min {sMin}d</span><span>Max {sMax}d</span>
                </div>
              </div>

              {/* Batch number */}
              <div>
                <label className="aim-lbl">Batch Number</label>
                <input type="text" value={form.batch_number}
                  onChange={e => setForm(p => ({ ...p, batch_number: e.target.value }))}
                  className="aim-inp" style={{ fontFamily:'monospace', letterSpacing:'.03em' }} />
              </div>

              {err && <div className="aim-err"><AlertTriangle size={12} />{err}</div>}
            </>
          )}
        </div>

        {step === 2 && (
          <div className="aim-modal-foot">
            <button onClick={onClose} className="aim-btn-cc">Cancel</button>
            <button onClick={submit} disabled={saving} className="aim-btn-ok">
              {saving
                ? <><div className="aim-spin" style={{ width:15, height:15 }} /> Adding…</>
                : <><Plus size={14} /> Add Batch</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddInventoryModal;