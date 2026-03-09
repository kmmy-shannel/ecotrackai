// ============================================================
// FILE: src/services/inventory.service.js  (BACKEND)
// PURPOSE: Business logic layer for inventory
// ============================================================

const InventoryModel = require('../models/inventory.model');
const pool           = require('../config/database');

const InventoryService = {

  async getAllInventory(businessId) {
    try {
      const rows = await InventoryModel.findAllByBusiness(businessId);
      return { success: true, data: rows };
    } catch (error) {
      console.error('[InventoryService.getAllInventory]', error);
      return { success: false, error: 'Failed to fetch inventory' };
    }
  },

  async getInventoryById(inventoryId, businessId) {
    try {
      const row = await InventoryModel.findByIdAndBusiness(inventoryId, businessId);
      if (!row) return { success: false, error: 'Inventory record not found' };
      return { success: true, data: row };
    } catch (error) {
      console.error('[InventoryService.getInventoryById]', error);
      return { success: false, error: 'Failed to fetch inventory record' };
    }
  },

  async addInventory(businessId, formData) {
    try {
      const {
        product_id,
        fruit_id,
        id,
        quantity,
        unit_of_measure,
        batch_number,
        ripeness_stage,
        current_condition,
        simulated_storage_temp,
        simulated_storage_humidity,
        shelf_life_days,
      } = formData;

      // Support lookup by fruit name if no product_id given
      const fruitName = formData.fruit_name || formData.product_name || null;
      let resolvedProductId = product_id || fruit_id || id;

      if (!quantity || Number(quantity) <= 0) {
        return { success: false, error: 'Quantity must be greater than 0' };
      }

      // Look up product_id by fruit name if not provided directly
      let productRow;
      if (!resolvedProductId && fruitName) {
        const { rows } = await pool.query(
          `SELECT product_id, product_name, shelf_life_days
           FROM products
           WHERE LOWER(product_name) = LOWER($1)
           LIMIT 1`,
          [fruitName]
        );
        if (rows.length === 0) {
          return { success: false, error: `Fruit "${fruitName}" not found in catalog` };
        }
        productRow = rows[0];
        resolvedProductId = rows[0].product_id;
      } else if (resolvedProductId) {
        const { rows } = await pool.query(
          `SELECT product_id, product_name, shelf_life_days
           FROM products
           WHERE product_id = $1`,
          [resolvedProductId]
        );
        if (rows.length === 0) {
          return { success: false, error: 'Selected fruit not found in catalog' };
        }
        productRow = rows[0];
      } else {
        return { success: false, error: 'product_id or fruit_name is required' };
      }

      const resolvedShelfLife = shelf_life_days || productRow.shelf_life_days || 7;

      // Auto-generate batch number if not provided
      const resolvedBatchNumber = batch_number ||
        `${productRow.product_name.toUpperCase().replace(/\s+/g, '')}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-3)}`;

      const record = await InventoryModel.create(businessId, {
        product_id:                resolvedProductId,
        quantity:                  Number(quantity),
        unit_of_measure:           unit_of_measure || 'kg',
        batch_number:              resolvedBatchNumber,
        current_condition:         current_condition || 'good',
        simulated_storage_temp:    simulated_storage_temp || null,
        simulated_storage_humidity: simulated_storage_humidity || null,
        shelf_life_days:           resolvedShelfLife,
      });

      // Sync alerts after adding inventory
      try {
        const AlertService = require('./alert.service');
        await AlertService.syncAlertsFromProducts(businessId);
      } catch (syncErr) {
        console.error('[InventoryService.addInventory] alert sync failed:', syncErr.message);
      }

      return { success: true, data: record };
    } catch (error) {
      console.error('[InventoryService.addInventory]', error);
      return { success: false, error: 'Failed to add inventory' };
    }
  },

  async checkCompatibilityWarning(businessId, avoidList) {
    try {
      const conflicts = await InventoryModel.checkCompatibility(businessId, avoidList);
      return { success: true, conflicts, hasConflict: conflicts.length > 0 };
    } catch (error) {
      console.error('[InventoryService.checkCompatibilityWarning]', error);
      return { success: false, error: 'Compatibility check failed' };
    }
  },

  async getStats(businessId) {
    try {
      const stats = await InventoryModel.getStatsByBusiness(businessId);
      return { success: true, data: stats };
    } catch (error) {
      console.error('[InventoryService.getStats]', error);
      return { success: false, error: 'Failed to fetch stats' };
    }
  },

  async deleteInventory(inventoryId, businessId) {
    try {
      const deleted = await InventoryModel.deleteById(inventoryId, businessId);
      if (!deleted) return { success: false, error: 'Record not found or unauthorized' };
      return { success: true, message: 'Inventory record deleted' };
    } catch (error) {
      console.error('[InventoryService.deleteInventory]', error);
      return { success: false, error: 'Failed to delete inventory record' };
    }
  },
};

module.exports = InventoryService;