// ============================================================
// FILE: src/components/AddProductModal.js
// LAYER: View — Admin Add Product with full dropdown spec
// PURPOSE: All fields are dropdowns per Section 4 spec
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import catalogService from '../services/catalog.service';
import inventoryService from '../services/inventory.service';
import alertService from '../services/alert.service';
import productService from '../services/product.service';
import {
  X, AlertTriangle, CheckCircle, Package,
  Thermometer, Droplets, Calendar, Hash
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────

const CONDITIONS   = ['Excellent', 'Good', 'Fair', 'Poor'];
const UNITS        = ['kg', 'pieces', 'trays', 'boxes', 'crates'];

// ── Helpers ────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

const generateBatchNumber = (fruitName, existingCount = 0) => {
  const prefix = fruitName.toUpperCase().replace(/\s+/g, '').slice(0, 8);
  const seq    = String(existingCount + 1).padStart(3, '0');
  return `${prefix}-${today()}-${seq}`;
};

const clamp = (val, min, max) => Math.min(Math.max(Number(val), min), max);

// ── Main Component ─────────────────────────────────────────

const AddProductModal = ({ onClose, onSuccess }) => {
  // Catalog data
  const [catalog,    setCatalog]    = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);

  // Selected fruit object (full DB row)
  const [selectedFruit, setSelectedFruit] = useState(null);

  // Form state
  const [form, setForm] = useState({
    productName:      '',
    ripenessStage:    '',
    storageType:      '',
    targetTempMin:    '',
    targetTempMax:    '',
    targetHumidity:   '',
    shelfLifeDays:    '',
    facilityId:       '',
    currentCondition: 'Excellent',
    unitOfMeasure:    'kg',
    quantity:         '',
    batchNumber:      '',
  });

  // Warnings
  const [tempWarning,   setTempWarning]   = useState('');
  const [compatWarning, setCompatWarning] = useState('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  // ── Load catalog + facilities ───────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoadingCat(true);
      try {
        const [catRes, facRes] = await Promise.allSettled([
          catalogService.getCatalogWithDetails
            ? catalogService.getCatalogWithDetails()
            : catalogService.getCatalog(),
          productService.getStorageFacilities
            ? productService.getStorageFacilities()
            : Promise.resolve({ data: { facilities: [] } }),
        ]);
        const fruits = catRes.status === 'fulfilled'
          ? (catRes.value?.data?.data?.fruits || catRes.value?.data?.fruits || [])
          : [];
        const facs = facRes.status === 'fulfilled'
          ? (facRes.value?.data?.data?.facilities || facRes.value?.data?.facilities || [])
          : [];
        setCatalog(fruits);
        setFacilities(facs);
      } catch { /* silent */ }
      finally { setLoadingCat(false); }
    };
    load();
  }, []);

  // ── STEP 1: Fruit Name selected ─────────────────────────

  const handleFruitSelect = (productName) => {
    const fruit = catalog.find(f =>
      (f.product_name || f.name) === productName
    );
    setSelectedFruit(fruit || null);
    setCompatWarning('');
    setTempWarning('');

    if (!fruit) {
      setForm(prev => ({ ...prev, productName, ripenessStage: '' }));
      return;
    }

    // Reset ripeness-dependent fields
    setForm(prev => ({
      ...prev,
      productName,
      ripenessStage:  '',
      storageType:    '',
      targetTempMin:  '',
      targetTempMax:  '',
      targetHumidity: '',
      shelfLifeDays:  fruit.shelf_life_days || fruit.default_shelf_life_days || '',
      unitOfMeasure:  fruit.unit_of_measure || 'kg',
      batchNumber:    generateBatchNumber(productName),
    }));
  };

  // ── STEP 2: Ripeness Stage selected ─────────────────────

  const handleRipenessSelect = (stage) => {
    if (!selectedFruit) return;

    const stages = selectedFruit.ripeness_stages || {};
    const stageData = stages[stage];

    if (stageData) {
      setForm(prev => ({
        ...prev,
        ripenessStage:  stage,
        storageType:    stageData.storage    || '',
        targetTempMin:  stageData.temp_min   ?? '',
        targetTempMax:  stageData.temp_max   ?? '',
        targetHumidity: stageData.humidity   ?? '',
      }));
    } else {
      // Fallback to product-level defaults
      setForm(prev => ({
        ...prev,
        ripenessStage:  stage,
        storageType:    selectedFruit.storage_category || '',
        targetTempMin:  selectedFruit.optimal_temp_min ?? '',
        targetTempMax:  selectedFruit.optimal_temp_max ?? '',
        targetHumidity: selectedFruit.optimal_humidity_min ?? '',
      }));
    }
  };

  // ── STEP 3: Facility selected — check temp + compat ─────

  const handleFacilitySelect = useCallback((facilityId) => {
    setForm(prev => ({ ...prev, facilityId }));
    setTempWarning('');
    setCompatWarning('');

    const facility = facilities.find(f => String(f.facility_id) === String(facilityId));
    if (!facility || !selectedFruit) return;

    // Temperature check
    const facilityTemp = Number(facility.simulated_temp_avg);
    const tempMin = Number(form.targetTempMin || selectedFruit.optimal_temp_min);
    const tempMax = Number(form.targetTempMax || selectedFruit.optimal_temp_max);

    if (!isNaN(facilityTemp) && (facilityTemp < tempMin || facilityTemp > tempMax)) {
      setTempWarning(
        `⚠️ Facility temperature ${facilityTemp}°C is outside the safe range ` +
        `${tempMin}–${tempMax}°C for ${form.productName}.`
      );
    }

    // Compatibility check — check what's already in this facility
    const avoidList = selectedFruit.avoid_with || [];
    if (avoidList.length > 0 && facility.stored_products) {
      const conflicts = (facility.stored_products || []).filter(p =>
        avoidList.includes(p)
      );
      if (conflicts.length > 0) {
        setCompatWarning(
          `⚠️ Compatibility conflict: ${form.productName} should not be stored with ` +
          `${conflicts.join(', ')}. These are currently in this facility.`
        );
      }
    }
  }, [facilities, selectedFruit, form.productName, form.targetTempMin, form.targetTempMax]);

  // ── Shelf life: editable ±20% of default ────────────────

  const handleShelfLifeChange = (val) => {
    if (!selectedFruit) return;
    const def = Number(selectedFruit.shelf_life_days || selectedFruit.default_shelf_life_days || 7);
    const min = Math.floor(def * 0.8);
    const max = Math.ceil(def * 1.2);
    setForm(prev => ({ ...prev, shelfLifeDays: clamp(val, min, max) }));
  };

  // ── Submit ───────────────────────────────────────────────

const handleSubmit = async () => {
  setError('');

  if (!form.productName || !form.quantity || !form.ripenessStage) {
    setError('Please fill in all required fields.');
    return;
  }
  if (Number(form.quantity) <= 0) {
    setError('Quantity must be greater than 0.');
    return;
  }

  setSubmitting(true);
  try {
    // Get the product_id from the selected fruit in catalog
    const selectedCatalogFruit = catalog.find(
      f => (f.product_name || f.name) === form.productName
    );

    if (!selectedCatalogFruit) {
      setError('Selected fruit not found in catalog.');
      setSubmitting(false);
      return;
    }

    const fruitId =
      selectedCatalogFruit.product_id ||
      selectedCatalogFruit.fruit_id ||
      selectedCatalogFruit.id;

    if (!fruitId) {
      setError('Could not identify selected fruit. Please try again.');
      setSubmitting(false);
      return;
    }

    await inventoryService.addInventory({
      product_id:                  fruitId,
      quantity:                    Number(form.quantity),
      unit_of_measure:             form.unitOfMeasure,
      batch_number:                form.batchNumber,
      ripeness_stage:              form.ripenessStage,
      current_condition:           form.currentCondition,
      simulated_storage_temp:      form.targetTempMin || null,
      simulated_storage_humidity:  form.targetHumidity || null,
      shelf_life_days:             form.shelfLifeDays,
    });

    try {
      await alertService.syncAlerts();
    } catch (syncError) {
      console.error('[AddProductModal] Alert sync after inventory add failed:', syncError);
    }

    onSuccess?.();
  } catch (e) {
    setError(e?.response?.data?.message || 'Failed to add inventory. Please try again.');
  } finally {
    setSubmitting(false);
  }
};

  // ── Derived values ───────────────────────────────────────

  const ripenessOptions = selectedFruit?.ripeness_stages
    ? Object.keys(selectedFruit.ripeness_stages)
    : ['Unripe', 'Ripe', 'Cut'];

  const defaultShelfLife = selectedFruit
    ? Number(selectedFruit.shelf_life_days || selectedFruit.default_shelf_life_days || 7)
    : 7;

  const shelfLifeMin = Math.floor(defaultShelfLife * 0.8);
  const shelfLifeMax = Math.ceil(defaultShelfLife * 1.2);

  const canSubmit = form.productName && form.ripenessStage && form.quantity && !submitting;

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-800 rounded-xl flex items-center justify-center">
              <Package size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Add Inventory</h2>
              <p className="text-xs text-gray-500">All fields use dropdowns to prevent errors</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          {/* ── STEP 1: Fruit Name ─────────────────────── */}
          <section>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Step 1 — Select Fruit *
            </label>
            {loadingCat ? (
              <div className="px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-400">
                Loading catalog...
              </div>
            ) : (
              <select
                value={form.productName}
                onChange={e => handleFruitSelect(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">— Select a fruit —</option>
                {catalog.map(f => (
                  <option key={f.product_id || f.fruit_id} value={f.product_name || f.name}>
                    {f.product_name || f.name}
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* ── STEP 2: Ripeness Stage ─────────────────── */}
          {form.productName && (
            <section>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Step 2 — Ripeness Stage *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ripenessOptions.map(stage => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => handleRipenessSelect(stage)}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.ripenessStage === stage
                        ? 'border-green-800 bg-green-800 text-white shadow-md'
                        : 'border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Auto-filled Storage Info ───────────────── */}
          {form.ripenessStage && (
            <section className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={15} className="text-green-700" />
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                  Auto-filled from catalog
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-gray-500 mb-1">Storage Type</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {form.storageType || '—'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-1 mb-1">
                    <Thermometer size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500">Temperature</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {form.targetTempMin}–{form.targetTempMax}°C
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-1 mb-1">
                    <Droplets size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500">Humidity</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {form.targetHumidity}%
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-1 mb-1">
                    <Calendar size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500">Shelf Life</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {form.shelfLifeDays} days
                  </p>
                </div>
              </div>

              {/* Compatibility info */}
              {selectedFruit && (
                <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-green-700 font-medium mb-1"> Safe to store with:</p>
                    <p className="text-xs text-gray-600">
                      {(selectedFruit.compatible_with || []).join(', ') || 'No restrictions'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-red-600 font-medium mb-1"> Avoid storing with:</p>
                    <p className="text-xs text-gray-600">
                      {(selectedFruit.avoid_with || []).join(', ') || 'None'}
                    </p>
                  </div>
                  {selectedFruit.is_ethylene_producer && (
                    <div className="col-span-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-orange-700 font-semibold">
                        ⚡ Ethylene Producer — Accelerates ripening of nearby fruits
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Shelf Life (editable ±20%) ─────────────── */}
          {form.ripenessStage && (
            <section>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Shelf Life (days) — Adjustable ±20%
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={shelfLifeMin}
                  max={shelfLifeMax}
                  value={form.shelfLifeDays || defaultShelfLife}
                  onChange={e => handleShelfLifeChange(e.target.value)}
                  className="flex-1 accent-green-800"
                />
                <span className="w-16 text-center px-3 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-800">
                  {form.shelfLifeDays || defaultShelfLife}d
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Default: {defaultShelfLife} days · Range: {shelfLifeMin}–{shelfLifeMax} days
              </p>
            </section>
          )}

          {/* ── STEP 3: Storage Facility ───────────────── */}
          {form.ripenessStage && (
            <section>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Step 3 — Storage Facility
              </label>
              {facilities.length === 0 ? (
                <div className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-400 bg-gray-50">
                  No storage facilities registered for your business yet
                </div>
              ) : (
                <select
                  value={form.facilityId}
                  onChange={e => handleFacilitySelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">— Select facility (optional) —</option>
                  {facilities.map(f => (
                    <option key={f.facility_id} value={f.facility_id}>
                      {f.facility_name} — {f.facility_type} ({f.simulated_temp_avg}°C avg)
                    </option>
                  ))}
                </select>
              )}

              {/* Temperature Warning */}
              {tempWarning && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  {tempWarning}
                </div>
              )}

              {/* Compatibility Warning */}
              {compatWarning && (
                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700 flex items-start gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  {compatWarning}
                </div>
              )}
            </section>
          )}

          {/* ── Quantity + Unit ────────────────────────── */}
          {form.ripenessStage && (
            <section>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Quantity *
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={form.unitOfMeasure}
                  onChange={e => setForm(prev => ({ ...prev, unitOfMeasure: e.target.value }))}
                  className="w-32 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </section>
          )}

          {/* ── Current Condition ──────────────────────── */}
          {form.ripenessStage && (
            <section>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Current Condition
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CONDITIONS.map(c => {
                  const colorMap = {
                    Excellent: 'border-green-500 bg-green-500 text-white',
                    Good:      'border-blue-500 bg-blue-500 text-white',
                    Fair:      'border-yellow-500 bg-yellow-500 text-white',
                    Poor:      'border-red-500 bg-red-500 text-white',
                  };
                  const inactiveMap = {
                    Excellent: 'border-green-200 text-green-700 hover:bg-green-50',
                    Good:      'border-blue-200 text-blue-700 hover:bg-blue-50',
                    Fair:      'border-yellow-200 text-yellow-700 hover:bg-yellow-50',
                    Poor:      'border-red-200 text-red-700 hover:bg-red-50',
                  };
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, currentCondition: c }))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.currentCondition === c
                          ? colorMap[c]
                          : `bg-white ${inactiveMap[c]}`
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Batch Number (auto-generated) ─────────── */}
          {form.ripenessStage && (
            <section>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Batch Number (auto-generated)
              </label>
              <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">
                <Hash size={15} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm font-mono text-gray-700 font-semibold">
                  {form.batchNumber}
                </span>
                <span className="text-xs text-gray-400 ml-auto">Read-only</span>
              </div>
            </section>
          )}

          {/* ── Action Buttons ─────────────────────────── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 px-4 py-3 bg-green-800 text-white rounded-xl font-semibold hover:bg-green-900 transition-colors disabled:opacity-50 text-sm shadow-md"
            >
              {submitting ? 'Adding...' : 'Add to Inventory'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProductModal;
