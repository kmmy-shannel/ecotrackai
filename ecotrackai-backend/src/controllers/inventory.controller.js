// ============================================================
// FILE: src/controllers/inventory.controller.js
// PURPOSE: HTTP handlers for inventory endpoints
// ============================================================

const InventoryService = require('../services/inventory.service');

const resolveBusinessId = (user) => user?.businessId ?? user?.business_id ?? null;

const InventoryController = {

  // GET /api/inventory
  async getAll(req, res) {
    try {
      const businessId = resolveBusinessId(req.user);
      if (!businessId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const result = await InventoryService.getAllInventory(businessId);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.error });
      }

      return res.json({ success: true, data: result.data });
    } catch (error) {
      console.error('[InventoryController.getAll]', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/inventory/stats
  async getStats(req, res) {
    try {
      const businessId = resolveBusinessId(req.user);
      if (!businessId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const result = await InventoryService.getStats(businessId);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.error });
      }

      return res.json({ success: true, data: result.data });
    } catch (error) {
      console.error('[InventoryController.getStats]', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // GET /api/inventory/:id
  async getById(req, res) {
    try {
      const businessId  = resolveBusinessId(req.user);
      const inventoryId = req.params.id;

      if (!businessId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const result = await InventoryService.getInventoryById(
        inventoryId,
        businessId
      );
      if (!result.success) {
        return res.status(404).json({ success: false, message: result.error });
      }

      return res.json({ success: true, data: result.data });
    } catch (error) {
      console.error('[InventoryController.getById]', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/inventory
  // Called by AddProductModal on submit
  async create(req, res) {
    console.log('[Inventory Create] req.user:', req.user);
    console.log('[Inventory Create] req.body:', req.body);
    try {
      const businessId = resolveBusinessId(req.user);
      console.log('[Inventory Create] businessId:', businessId);
      if (!businessId) {
        console.log('[Inventory Create] BLOCKED - no businessId');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const result = await InventoryService.addInventory(businessId, req.body);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.error });
      }

      // Keep alerts in sync with newly inserted inventory.
      try {
        const AlertService = require('../services/alert.service');
        await AlertService.syncAlertsFromProducts(businessId);
      } catch (syncError) {
        console.error('[InventoryController.create] Alert sync after inventory add failed:', syncError);
      }

      return res.status(201).json({
        success: true,
        message: 'Inventory added successfully',
        data:    result.data,
      });
    } catch (error) {
      console.error('[InventoryController.create]', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // POST /api/inventory/check-compatibility
  // Called by AddProductModal when admin selects a fruit
  // to warn about incompatible fruits already in stock
  async checkCompatibility(req, res) {
    try {
      const businessId = resolveBusinessId(req.user);
      const { avoid_with } = req.body;  // array of fruit names

      if (!businessId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!avoid_with || !Array.isArray(avoid_with)) {
        return res.json({ success: true, conflicts: [], hasConflict: false });
      }

      const result = await InventoryService.checkCompatibilityWarning(
        businessId,
        avoid_with
      );

      return res.json(result);
    } catch (error) {
      console.error('[InventoryController.checkCompatibility]', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // DELETE /api/inventory/:id
  async remove(req, res) {
    try {
      const businessId  = resolveBusinessId(req.user);
      const inventoryId = req.params.id;

      if (!businessId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const result = await InventoryService.deleteInventory(
        inventoryId,
        businessId
      );
      if (!result.success) {
        return res.status(404).json({ success: false, message: result.error });
      }

      return res.json({ success: true, message: result.message });
    } catch (error) {
      console.error('[InventoryController.remove]', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};

module.exports = InventoryController;
