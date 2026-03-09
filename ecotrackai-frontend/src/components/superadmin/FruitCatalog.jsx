// ============================================================
// FILE: src/components/superadmin/FruitCatalog.jsx
// LAYER: Components — Global Catalog Management
// PURPOSE: Add, edit, and manage global fruit catalog
// SECURITY: Super admin only, affects all businesses
// ============================================================

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, Thermometer } from 'lucide-react';

const EMPTY_FORM = {
  name:                    '',
  default_storage_type:    'ambient',
  temperature_range_min:   '',
  temperature_range_max:   '',
  humidity_range:          '',
  default_shelf_life_days: '',
  unit_of_measure:         'kg',
  is_ethylene_producer:    false,
  compatible_with:         '',  // comma-separated → array on save
  avoid_with:              '',  // comma-separated → array on save
  ripeness_stages: {
    Unripe: { temp_min: '', temp_max: '', humidity: '', storage: 'ambient'      },
    Ripe:   { temp_min: '', temp_max: '', humidity: '', storage: 'refrigerated' },
    Cut:    { temp_min: '', temp_max: '', humidity: '', storage: 'refrigerated' },
  },
};

const FruitCatalog = ({ catalogService }) => {
  const [fruits,  setFruits]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await catalogService.getCatalog();
      setFruits(res?.data?.data?.fruits || res?.data?.fruits || res?.fruits || []);
    } catch {
      setError('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Update a single ripeness stage field ──────────────────
  const updateStage = (stage, field, value) => {
    setForm(prev => ({
      ...prev,
      ripeness_stages: {
        ...prev.ripeness_stages,
        [stage]: { ...prev.ripeness_stages[stage], [field]: value }
      }
    }));
  };

  // ── Submit ────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await catalogService.createFruit({
        name:                    form.name,
        default_storage_type:    form.default_storage_type,
        temperature_range_min:   Number(form.temperature_range_min),
        temperature_range_max:   Number(form.temperature_range_max),
        humidity_range:          form.humidity_range,
        default_shelf_life_days: Number(form.default_shelf_life_days),
        unit_of_measure:         form.unit_of_measure,
        is_ethylene_producer:    form.is_ethylene_producer,
        compatible_with:         form.compatible_with
                                   .split(',')
                                   .map(s => s.trim())
                                   .filter(Boolean),
        avoid_with:              form.avoid_with
                                   .split(',')
                                   .map(s => s.trim())
                                   .filter(Boolean),
        ripeness_stages:         form.ripeness_stages,
      });
      setSuccess('Fruit added to global catalog');
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add fruit');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Remove this fruit from the global catalog?')) return;
    setError('');
    setSuccess('');
    try {
      await catalogService.deleteFruit(id);
      setSuccess('Fruit removed');
      load();
    } catch {
      setError('Failed to remove fruit');
    }
  };

  // ── Storage color badges ──────────────────────────────────
  const storageColors = {
    ambient:                'bg-green-100 text-green-700',
    refrigerated:           'bg-blue-100 text-blue-700',
    frozen:                 'bg-indigo-100 text-indigo-700',
    controlled_atmosphere:  'bg-purple-100 text-purple-700',
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="grid gap-6 lg:grid-cols-2">

      {/* ── LEFT: Catalog List ─────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 flex items-center gap-2">
          <BookOpen size={18} className="text-green-800" />
          <h3 className="font-semibold text-gray-800">
            GLOBAL CATALOG ({fruits.length} fruits)
          </h3>
        </div>

        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            {success}
          </div>
        )}

        <div className="p-4 space-y-2">
          {loading ? (
            <p className="text-gray-400 text-sm text-center py-6">Loading catalog...</p>
          ) : fruits.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-400 text-sm">No fruits in catalog yet</p>
            </div>
          ) : (
            fruits.map(f => (
              <div
                key={f.fruit_id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between hover:border-green-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-800 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {(f.name || '?').charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{f.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        storageColors[f.default_storage_type] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {f.default_storage_type}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Thermometer size={11} />
                        {f.temperature_range_min}–{f.temperature_range_max}°C
                      </span>
                      <span className="text-xs text-gray-500">
                        {f.default_shelf_life_days}d shelf life
                      </span>
                      {f.is_ethylene_producer && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
                          ⚡ Ethylene
                        </span>
                      )}
                    </div>
                    {/* Compatibility info */}
                    {(f.compatible_with?.length > 0 || f.avoid_with?.length > 0) && (
                      <div className="mt-1.5 flex gap-3">
                        {f.compatible_with?.length > 0 && (
                          <span className="text-xs text-green-600">
                            ✅ {f.compatible_with.join(', ')}
                          </span>
                        )}
                        {f.avoid_with?.length > 0 && (
                          <span className="text-xs text-red-500">
                            ❌ {f.avoid_with.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(f.fruit_id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Remove from catalog"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Add Fruit Form ──────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 flex items-center gap-2">
          <Plus size={18} className="text-green-800" />
          <h3 className="font-semibold text-gray-800">ADD FRUIT TO CATALOG</h3>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Fruit Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fruit Name *
            </label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Saging, Mangga, Pinya"
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Storage Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Storage Type *
            </label>
            <select
              value={form.default_storage_type}
              onChange={e => setForm({ ...form, default_storage_type: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="ambient">Ambient (Room Temperature)</option>
              <option value="refrigerated">Refrigerated</option>
              <option value="frozen">Frozen</option>
              <option value="controlled_atmosphere">Controlled Atmosphere</option>
            </select>
          </div>

          {/* Temp Min / Max */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Temp Min (°C) *
              </label>
              <input
                type="number" step="0.1"
                value={form.temperature_range_min}
                onChange={e => setForm({ ...form, temperature_range_min: e.target.value })}
                placeholder="e.g., 13"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Temp Max (°C) *
              </label>
              <input
                type="number" step="0.1"
                value={form.temperature_range_max}
                onChange={e => setForm({ ...form, temperature_range_max: e.target.value })}
                placeholder="e.g., 25"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Humidity / Shelf Life */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Humidity Range
              </label>
              <input
                value={form.humidity_range}
                onChange={e => setForm({ ...form, humidity_range: e.target.value })}
                placeholder="e.g., 85-95%"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Shelf Life (days) *
              </label>
              <input
                type="number" min="1"
                value={form.default_shelf_life_days}
                onChange={e => setForm({ ...form, default_shelf_life_days: e.target.value })}
                placeholder="e.g., 7"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Unit of Measure */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Unit of Measure
            </label>
            <select
              value={form.unit_of_measure}
              onChange={e => setForm({ ...form, unit_of_measure: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="kg">kg</option>
              <option value="pieces">pieces</option>
              <option value="trays">trays</option>
              <option value="boxes">boxes</option>
            </select>
          </div>

          {/* Ethylene Producer */}
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
            <input
              type="checkbox"
              id="ethylene"
              checked={form.is_ethylene_producer}
              onChange={e => setForm({ ...form, is_ethylene_producer: e.target.checked })}
              className="w-4 h-4 accent-green-800"
            />
            <label htmlFor="ethylene" className="text-sm text-gray-700 font-medium cursor-pointer">
              Ethylene Producer — accelerates ripening of nearby fruits
            </label>
          </div>

          {/* Compatible With */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Compatible With
              <span className="text-gray-400 font-normal ml-1">(comma-separated fruit names)</span>
            </label>
            <input
              value={form.compatible_with}
              onChange={e => setForm({ ...form, compatible_with: e.target.value })}
              placeholder="e.g., Mangga, Papaya"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Avoid With */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Avoid Storing With
              <span className="text-gray-400 font-normal ml-1">(comma-separated fruit names)</span>
            </label>
            <input
              value={form.avoid_with}
              onChange={e => setForm({ ...form, avoid_with: e.target.value })}
              placeholder="e.g., Calamansi, Pakwan"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Ripeness Stage Temperatures */}
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Temperature per Ripeness Stage
            </p>
            {Object.entries(form.ripeness_stages).map(([stage, data]) => (
              <div key={stage} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">
                    {stage}
                  </span>
                  <select
                    value={data.storage}
                    onChange={e => updateStage(stage, 'storage', e.target.value)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 bg-white text-gray-600"
                  >
                    <option value="ambient">Ambient</option>
                    <option value="refrigerated">Refrigerated</option>
                    <option value="frozen">Frozen</option>
                    <option value="controlled_atmosphere">Controlled Atmosphere</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Temp Min °C</label>
                    <input
                      type="number" step="0.1"
                      placeholder="e.g., 13"
                      value={data.temp_min}
                      onChange={e => updateStage(stage, 'temp_min', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Temp Max °C</label>
                    <input
                      type="number" step="0.1"
                      placeholder="e.g., 15"
                      value={data.temp_max}
                      onChange={e => updateStage(stage, 'temp_max', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Humidity %</label>
                    <input
                      type="number"
                      placeholder="e.g., 85"
                      value={data.humidity}
                      onChange={e => updateStage(stage, 'humidity', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-800 text-white rounded-xl font-semibold hover:bg-green-900 transition-colors disabled:opacity-50 shadow-md"
          >
            <Plus size={16} />
            {saving ? 'Adding...' : 'Add Fruit to Global Catalog'}
          </button>

        </form>
      </div>

    </div>
  );
};

export default FruitCatalog;