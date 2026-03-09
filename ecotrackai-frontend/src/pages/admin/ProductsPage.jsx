import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Trash2, RefreshCw, Package,
  Clock, AlertTriangle, X, Eye, ChevronDown,
  ChevronUp, Filter
} from 'lucide-react';
import Layout from '../../components/Layout';
import inventoryService from '../../services/inventory.service';
import catalogService from '../../services/catalog.service';
import { useAuth } from '../../hooks/useAuth';

// Fruit catalog is fetched from /api/catalog (managed by super_admin)

const RIPENESS_STAGES = ['unripe', 'ripe'];
const CONDITIONS      = ['excellent', 'good', 'fair', 'poor'];
const UNITS           = ['kg', 'pieces', 'boxes', 'crates'];

const STORAGE_BADGE = {
  refrigerated:          'bg-blue-100 text-blue-700',
  ambient:               'bg-gray-100 text-gray-600',
  controlled_atmosphere: 'bg-purple-100 text-purple-700',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcDaysLeft = (item) => {
  if (item.days_until_expiry !== undefined && item.days_until_expiry !== null) return Number(item.days_until_expiry);
  if (item.days_left !== undefined && item.days_left !== null) return Number(item.days_left);
  if (item.expected_expiry_date) return Math.ceil((new Date(item.expected_expiry_date) - new Date()) / 86400000);
  if (item.entry_date && item.shelf_life_days) {
    const exp = new Date(item.entry_date);
    exp.setDate(exp.getDate() + Number(item.shelf_life_days));
    return Math.ceil((exp - new Date()) / 86400000);
  }
  return null;
};

const getRisk = (d) => {
  if (d === null)  return { label: '—',       cls: 'bg-gray-100 text-gray-500' };
  if (d <= 0)      return { label: 'EXPIRED', cls: 'bg-red-600 text-white' };
  if (d <= 3)      return { label: 'HIGH',    cls: 'bg-red-100 text-red-700' };
  if (d <= 6)      return { label: 'MEDIUM',  cls: 'bg-orange-100 text-orange-700' };
  return                  { label: 'LOW',     cls: 'bg-green-100 text-green-700' };
};

const getDaysColor = (d) => {
  if (d === null) return 'text-gray-400';
  if (d <= 0)     return 'text-red-600 font-bold';
  if (d <= 2)     return 'text-red-500 font-semibold';
  if (d <= 5)     return 'text-orange-500 font-semibold';
  return 'text-green-600';
};

const genBatch = (name) =>
  `${name.toUpperCase()}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-3)}`;

// ── Add Inventory Modal ───────────────────────────────────────────────────────
const AddInventoryModal = ({ onClose, onSuccess }) => {
  const [step, setStep]             = useState(1);
  const [fruit, setFruit]           = useState(null);
  const [compat, setCompat]         = useState(null);
  const [compatLoading, setCompatL] = useState(false);
  const [catalog, setCatalog]       = useState([]);
  const [catalogLoading, setCatalogL] = useState(true);
  const [catalogError, setCatalogE] = useState('');
  const [form, setForm]             = useState({ quantity: '', unit_of_measure: 'kg', ripeness_stage: 'ripe', current_condition: 'good', shelf_life_days: '', simulated_storage_temp: '', simulated_storage_humidity: '', batch_number: '' });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await catalogService.getCatalog();
        // Handle all possible response shapes:
        // { fruits: [] } or { data: { fruits: [] } } or { data: [] } or []
        const fruits =
          res?.fruits ||
          res?.data?.fruits ||
          res?.data ||
          res ||
          [];
        setCatalog(Array.isArray(fruits) ? fruits : []);
      } catch (err) {
        console.error('Catalog fetch error:', err);
        setCatalogE('Failed to load fruit catalog. Ask super admin to add fruits first.');
      } finally {
        setCatalogL(false);
      }
    };
    fetchCatalog();
  }, []);

  const getShelfLifeRange = (baseShelfLife) => {
    const base = Number(baseShelfLife) || 7;
    const min  = Math.floor(base * 0.8);
    const max  = Math.ceil(base * 1.2);
    return { min, max, base };
  };

  const selectFruit = async (f) => {
    const baseShelfLife = f.shelf_life_days || f.shelfLife || f.default_shelf_life_days || 7;
    const tempMin = f.optimal_temp_min ?? f.tempMin ?? f.temperature_range_min ?? '';
    const humMin  = f.optimal_humidity_min ?? f.humMin ?? '';
    const unit    = f.unit_of_measure || f.unit || 'kg';
    const avoid   = f.avoid_with || f.avoid || [];
    setFruit({ ...f, name: f.product_name || f.name, shelfLife: baseShelfLife, avoid, product_id: f.product_id || f.fruit_id || null });
    setForm(p => ({ ...p, unit_of_measure: unit, shelf_life_days: String(baseShelfLife), simulated_storage_temp: String(tempMin), simulated_storage_humidity: String(humMin), batch_number: genBatch(f.product_name || f.name) }));
    if (avoid?.length) {
      setCompatL(true);
      try { const r = await inventoryService.checkCompatibility(avoid); setCompat(r); }
      catch { setCompat(null); }
      finally { setCompatL(false); }
    } else { setCompat({ hasConflict: false, conflicts: [] }); }
    setStep(2);
  };

  const submit = async () => {
    if (!form.quantity || Number(form.quantity) <= 0) { setError('Quantity must be greater than 0.'); return; }
    setLoading(true); setError('');
    try {
      await inventoryService.addInventory({
        product_id: fruit.product_id || null,
        fruit_name: fruit.name,
        product_name: fruit.name,
        quantity: Number(form.quantity),
        unit_of_measure: form.unit_of_measure,
        batch_number: form.batch_number,
        ripeness_stage: form.ripeness_stage,
        current_condition: form.current_condition,
        shelf_life_days: Number(form.shelf_life_days),
        simulated_storage_temp: Number(form.simulated_storage_temp) || null,
        simulated_storage_humidity: Number(form.simulated_storage_humidity) || null,
      });
      onSuccess(); onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add inventory.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Add Fruit Batch</h2>
              <p className="text-xs text-gray-500">{step === 1 ? 'Step 1 — Select fruit' : `Step 2 — ${fruit?.name} details`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="p-6 space-y-5">
          {step === 1 && (
            <div>
              {catalogLoading && (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading catalog...
                </div>
              )}
              {catalogError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{catalogError}</div>
              )}
              {!catalogLoading && !catalogError && catalog.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No fruits in catalog yet.</p>
                  <p className="text-xs mt-1">Ask your super admin to add fruits to the catalog first.</p>
                </div>
              )}
              {!catalogLoading && catalog.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {catalog.map(f => {
                    const name = f.product_name || f.name;
                    const shelf = f.shelf_life_days || f.shelfLife || f.default_shelf_life_days || '?';
                    const storage = f.storage_category || f.default_storage_type || f.storage || '';
                    const ethylene = f.is_ethylene_producer || f.ethylene || false;
                    return (
                      <button key={f.product_id || f.fruit_id || name} onClick={() => selectFruit(f)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left group">
                        <div className="w-9 h-9 bg-gray-100 group-hover:bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-gray-400 group-hover:text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 group-hover:text-green-700">{name}</p>
                          <p className="text-xs text-gray-400">{shelf}d · {storage}</p>
                        </div>
                        {ethylene && <span className="ml-auto text-xs text-orange-500 font-medium">⚠ C₂H₄</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && fruit && (
            <>
              <button onClick={() => { setStep(1); setFruit(null); setCompat(null); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600">
                ← Back to fruit selection
              </button>

              {compatLoading && (
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Checking compatibility...
                </div>
              )}
              {compat?.hasConflict && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <p className="text-sm font-semibold text-orange-700">Storage Conflict</p>
                  </div>
                  <p className="text-xs text-orange-600">
                    {fruit.name} conflicts with: <strong>{compat.conflicts.map(c => c.product_name || c).join(', ')}</strong>. A MEDIUM alert will be auto-created.
                  </p>
                </div>
              )}

              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">Catalog Data — {fruit.name}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Default Shelf', `${fruit.shelfLife}d`],
                    ['Temp', `${fruit.optimal_temp_min ?? fruit.tempMin ?? '?'}–${fruit.optimal_temp_max ?? fruit.tempMax ?? '?'}°C`],
                    ['Storage', fruit.storage_category || fruit.default_storage_type || fruit.storage || '—']
                  ].map(([l,v]) => (
                    <div key={l} className="bg-white rounded-lg p-2.5">
                      <p className="text-xs text-gray-400">{l}</p>
                      <p className="text-sm font-bold text-gray-700 capitalize">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity *</label>
                  <input type="number" min="0" value={form.quantity} onChange={e => setForm(p => ({...p, quantity: e.target.value}))}
                    placeholder="e.g. 200" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit</label>
                  <select value={form.unit_of_measure} onChange={e => setForm(p => ({...p, unit_of_measure: e.target.value}))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ripeness Stage *</label>
                <div className="grid grid-cols-3 gap-2">
                  {RIPENESS_STAGES.map(s => (
                    <button key={s} onClick={() => setForm(p => ({...p, ripeness_stage: s}))}
                      className={`py-2 rounded-xl text-sm font-medium capitalize border transition-all ${form.ripeness_stage === s ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Condition</label>
                <div className="grid grid-cols-4 gap-2">
                  {CONDITIONS.map(c => (
                    <button key={c} onClick={() => setForm(p => ({...p, current_condition: c}))}
                      className={`py-2 rounded-xl text-xs font-medium capitalize border transition-all ${form.current_condition === c ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Shelf Life (days)
                  <span className="text-xs text-gray-400 font-normal ml-1">adjustable ±20% from default ({fruit?.shelfLife}d)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => {
                      const min = Math.floor((fruit?.shelfLife || 7) * 0.8);
                      setForm(p => ({ ...p, shelf_life_days: String(Math.max(min, Number(p.shelf_life_days) - 1)) }));
                    }}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-500 hover:bg-gray-100">−</button>
                  <input type="number" value={form.shelf_life_days}
                    readOnly
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center bg-gray-50 cursor-default select-none" />
                  <button type="button"
                    onClick={() => {
                      const max = Math.ceil((fruit?.shelfLife || 7) * 1.2);
                      setForm(p => ({ ...p, shelf_life_days: String(Math.min(max, Number(p.shelf_life_days) + 1)) }));
                    }}
                    className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-500 hover:bg-gray-100">+</button>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                  <span>Min: {Math.floor((fruit?.shelfLife || 7) * 0.8)}d (−20%)</span>
                  <span>Max: {Math.ceil((fruit?.shelfLife || 7) * 1.2)}d (+20%)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Batch Number</label>
                <input type="text" value={form.batch_number} onChange={e => setForm(p => ({...p, batch_number: e.target.value}))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
            </>
          )}
        </div>

        {step === 2 && (
          <div className="flex gap-3 px-6 pb-6">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={loading}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adding...</> : <><Plus className="w-4 h-4" /> Add Batch</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Detail Modal ──────────────────────────────────────────────────────────────
const DetailModal = ({ item, onClose }) => {
  const d = calcDaysLeft(item);
  const risk = getRisk(d);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{item.product_name}</h2>
            <p className="text-xs font-mono text-gray-400">{item.batch_number || '—'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${risk.cls}`}>
            <AlertTriangle className="w-3.5 h-3.5" /> {risk.label} RISK {d !== null && <span className="opacity-75">· {d}d left</span>}
          </span>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Quantity', `${item.quantity || 0} ${item.unit_of_measure || 'kg'}`],
              ['Storage', item.storage_category || '—'],
              ['Shelf Life', item.shelf_life_days ? `${item.shelf_life_days}d` : '—'],
              ['Condition', item.current_condition || '—'],
              ['Ripeness', item.ripeness_stage || '—'],
              ['Temp', item.simulated_storage_temp ? `${item.simulated_storage_temp}°C` : '—'],
              ['Humidity', item.simulated_storage_humidity ? `${item.simulated_storage_humidity}%` : '—'],
              ['Entry Date', item.entry_date ? new Date(item.entry_date).toLocaleDateString('en-PH') : '—'],
              ['Expiry Date', item.expected_expiry_date ? new Date(item.expected_expiry_date).toLocaleDateString('en-PH') : '—'],
            ].map(([l, v]) => (
              <div key={l} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">{l}</p>
                <p className="text-sm font-semibold text-gray-700 capitalize">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const ProductsPage = () => {
  const { user } = useAuth();
  const [inventory, setInventory]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [riskFilter, setRiskFilter]     = useState('all');
  const [sortField, setSortField]       = useState('entry_date');
  const [sortDir, setSortDir]           = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showAddModal, setShowAdd]      = useState(false);
  const [viewItem, setViewItem]         = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await inventoryService.getAllInventory();
      const list = res?.data || res || [];
      setInventory(Array.isArray(list) ? list : []);
    } catch { setError('Failed to load inventory.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await inventoryService.deleteInventory(deleteTarget.inventory_id); setDeleteTarget(null); load(); }
    catch { setError('Failed to delete batch.'); }
    finally { setDeleting(false); }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setShowSortMenu(false);
  };

  const processed = inventory
    .filter(item => {
      if (search && !item.product_name?.toLowerCase().includes(search.toLowerCase()) && !item.batch_number?.toLowerCase().includes(search.toLowerCase())) return false;
      if (riskFilter === 'all') return true;
      return getRisk(calcDaysLeft(item)).label === riskFilter;
    })
    .sort((a, b) => {
      let av = sortField === 'days_left' ? calcDaysLeft(a) : a[sortField];
      let bv = sortField === 'days_left' ? calcDaysLeft(b) : b[sortField];
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const counts = inventory.reduce((acc, i) => { const l = getRisk(calcDaysLeft(i)).label; acc[l] = (acc[l]||0)+1; return acc; }, {});

  const SortIcon = ({ field }) => sortField === field
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-green-500" /> : <ChevronDown className="w-3 h-3 text-green-500" />)
    : <ChevronUp className="w-3 h-3 text-gray-300" />;

  return (
    <Layout currentPage="Product Management" user={user}>
      <div className="space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Batches', key: 'all',    count: inventory.length,      color: 'border-gray-200 bg-white',           text: 'text-gray-800' },
            { label: 'High Risk',     key: 'HIGH',   count: counts['HIGH']   || 0, color: 'border-red-200 bg-red-50',           text: 'text-red-600' },
            { label: 'Medium Risk',   key: 'MEDIUM', count: counts['MEDIUM'] || 0, color: 'border-orange-200 bg-orange-50',     text: 'text-orange-600' },
            { label: 'Low Risk',      key: 'LOW',    count: counts['LOW']    || 0, color: 'border-green-200 bg-green-50',       text: 'text-green-600' },
          ].map(card => (
            <button key={card.key} onClick={() => setRiskFilter(card.key)}
              className={`border rounded-xl p-4 text-left transition-all hover:shadow-md ${card.color} ${riskFilter === card.key ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}>
              <p className={`text-2xl font-bold ${card.text}`}>{card.count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or batch..."
              className="w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
          </div>

          <div className="relative">
            <button onClick={() => setShowSortMenu(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 bg-white">
              <Filter className="w-4 h-4" /> Sort
            </button>
            {showSortMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-48 py-1">
                {[
                  ['Newest First', 'entry_date', 'desc'], ['Oldest First', 'entry_date', 'asc'],
                  ['Name A–Z', 'product_name', 'asc'], ['Days Left ↑', 'days_left', 'asc'],
                  ['Days Left ↓', 'days_left', 'desc'], ['Quantity ↑', 'quantity', 'asc'],
                ].map(([label, f, d]) => (
                  <button key={label} onClick={() => { setSortField(f); setSortDir(d); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${sortField===f&&sortDir===d ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />
          <button onClick={load} className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-green-600" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow-sm">
            <Plus className="w-4 h-4" /> Add new product
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_80px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
            {[['Product','product_name'],['Unit',null],['Shelf Life','shelf_life_days'],['Storage',null],['Risk','days_left']].map(([l,f]) => (
              <div key={l}>
                {f ? (
                  <button onClick={() => handleSort(f)} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                    {l} <SortIcon field={f} />
                  </button>
                ) : <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{l}</span>}
              </div>
            ))}
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Action</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <RefreshCw className="w-5 h-5 text-green-500 animate-spin" />
              <span className="text-sm text-gray-500">Loading inventory...</span>
            </div>
          ) : processed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <Package className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-medium text-gray-500">No batches found</p>
              <p className="text-sm text-gray-400 mt-1">{search ? `No results for "${search}"` : 'Add your first fruit batch'}</p>
              {!search && (
                <button onClick={() => setShowAdd(true)} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
                  Add Product
                </button>
              )}
            </div>
          ) : (
            processed.map((item, idx) => {
              const d = calcDaysLeft(item);
              const risk = getRisk(d);
              return (
                <div key={item.inventory_id || idx}
                  className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_80px] gap-4 px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{item.product_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{item.ripeness_stage || 'fruit'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.quantity || 0} {item.unit_of_measure || 'kg'}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.batch_number || '—'}</p>
                    {d !== null && <p className={`text-xs mt-0.5 ${getDaysColor(d)}`}>{d <= 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {item.shelf_life_days ? `${item.shelf_life_days}d` : '—'}
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STORAGE_BADGE[item.storage_category] || STORAGE_BADGE.ambient}`}>
                      {item.storage_category || 'ambient'}
                    </span>
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${risk.cls}`}>{risk.label}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setViewItem(item)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(item)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {processed.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">{processed.length} of {inventory.length} batches{riskFilter !== 'all' && ` · ${riskFilter} risk`}</p>
              <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      {showAddModal && <AddInventoryModal onClose={() => setShowAdd(false)} onSuccess={load} />}
      {viewItem && <DetailModal item={viewItem} onClose={() => setViewItem(null)} />}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">Delete Batch?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Remove <strong>{deleteTarget.product_name}</strong> <span className="font-mono text-xs">({deleteTarget.batch_number})</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProductsPage;
