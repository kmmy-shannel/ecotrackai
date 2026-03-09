// ============================================================
// FILE: src/services/inventory.service.js
// PURPOSE: All API calls related to inventory
// MATCHES: backend /api/inventory routes exactly
// ============================================================

import api from './api';

const inventoryService = {

  // ── Get all inventory batches for the logged-in business ───
  async getAllInventory() {
    const response = await api.get('/inventory');
    return response.data;
  },

  // ── Get dashboard stats ─────────────────────────────────────
  async getStats() {
    const response = await api.get('/inventory/stats');
    return response.data;
  },

  // ── Get a single batch ──────────────────────────────────────
  async getById(inventoryId) {
    const response = await api.get(`/inventory/${inventoryId}`);
    return response.data;
  },

  // ── Add new inventory batch ─────────────────────────────────
  // This is called by AddProductModal on submit
  // payload shape must match what inventory.controller expects:
  // {
  //   product_id,           ← from catalog dropdown selection
  //   quantity,             ← number entered by admin
  //   unit_of_measure,      ← from dropdown (kg, pieces, etc)
  //   batch_number,         ← auto-generated in modal
  //   ripeness_stage,       ← from ripeness stage buttons
  //   current_condition,    ← from condition buttons
  //   simulated_storage_temp,      ← auto-filled from catalog
  //   simulated_storage_humidity,  ← auto-filled from catalog
  //   shelf_life_days,      ← auto-filled from catalog (adjustable)
  // }
  async addInventory(payload) {
    const response = await api.post('/inventory', payload);
    return response.data;
  },

  // ── Check compatibility warning before adding ───────────────
  // Pass the avoid_with array from the selected fruit
  // Returns { conflicts: [], hasConflict: false }
  async checkCompatibility(avoidWithList) {
    const response = await api.post('/inventory/check-compatibility', {
      avoid_with: avoidWithList,
    });
    return response.data;
  },

  // ── Delete a batch ──────────────────────────────────────────
  async deleteInventory(inventoryId) {
    const response = await api.delete(`/inventory/${inventoryId}`);
    return response.data;
  },
};

export default inventoryService;