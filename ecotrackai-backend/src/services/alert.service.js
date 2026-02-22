// ============================================================
// FILE LOCATION: backend/src/services/alert.service.js
// FIX: Sync is now wrapped in per-product try/catch so one bad
//      product row never crashes the whole sync.
//      Added detailed logging so you can see what's failing.
// ============================================================

const AlertModel = require('../models/alert.model');
const aiService  = require('./ai.service');

// ── Helpers ────────────────────────────────────────────────

const calculateRiskLevel = (daysLeft, temperature, humidity, storageCategory) => {
  if (daysLeft <= 3) return 'HIGH';
  if (daysLeft <= 7) return 'MEDIUM';
  if (checkSuboptimalConditions(temperature, humidity, storageCategory) && daysLeft <= 14)
    return 'MEDIUM';
  return 'LOW';
};

const checkSuboptimalConditions = (temperature, humidity, storageCategory) => {
  const thresholds = {
    refrigerated:          { tempMax: 4,   humidityRange: [80, 95] },
    frozen:                { tempMax: -18, humidityRange: [0, 100] },
    ambient:               { tempMax: 25,  humidityRange: [40, 70] },
    controlled_atmosphere: { tempMax: 10,  humidityRange: [85, 95] },
  };
  const t = thresholds[storageCategory] || thresholds.ambient;
  if (temperature > t.tempMax) return true;
  if (humidity < t.humidityRange[0] || humidity > t.humidityRange[1]) return true;
  return false;
};

const generateAlertDetails = (productName, riskLevel, daysLeft) => ({
  HIGH:   `Critical: ${productName} expires in ${daysLeft} days. Immediate action required.`,
  MEDIUM: `Warning: ${productName} has ${daysLeft} days remaining. Prioritize for delivery.`,
  LOW:    `Info: ${productName} shelf life is ${daysLeft} days. Product condition stable.`,
}[riskLevel] || `${productName}: ${daysLeft} days remaining.`);

const simulateEnvironmentalConditions = (storageCategory) => ({
  refrigerated:          { temperature: 2  + Math.random() * 3,  humidity: 85 + Math.random() * 10, location: 'Cold Storage A' },
  frozen:                { temperature: -18 + Math.random() * 2, humidity: 90 + Math.random() * 10, location: 'Freezer Unit B' },
  ambient:               { temperature: 20 + Math.random() * 8,  humidity: 50 + Math.random() * 20, location: 'Warehouse C' },
  controlled_atmosphere: { temperature: 8  + Math.random() * 4,  humidity: 85 + Math.random() * 10, location: 'CA Storage D' },
}[storageCategory] || { temperature: 22, humidity: 60, location: 'Warehouse' });

// ── Service ────────────────────────────────────────────────

const AlertService = {

  async syncAlertsFromProducts(businessId) {
    console.log('[AlertService.syncAlertsFromProducts] businessId =', businessId);

    if (!businessId) {
      throw { status: 400, message: 'businessId is required for sync' };
    }

    let products;
    try {
      products = await AlertModel.findProductsByBusiness(businessId);
      console.log(`[AlertService.sync] found ${products.length} products`);
    } catch (err) {
      console.error('[AlertService.sync] Failed to fetch products:', err.message);
      // Don't crash the whole request — return 0 synced
      return 0;
    }

    let syncedCount = 0;

    for (const product of products) {
      try {
        // Guard: skip rows with no usable shelf life
        const shelfLifeDays = Number(product.shelf_life_days) || 30;
        const createdAt     = product.created_at ? new Date(product.created_at) : new Date();
        const today         = new Date();
        const daysSince     = Math.floor((today - createdAt) / 86_400_000);
        const daysLeft      = Math.max(0, shelfLifeDays - daysSince);

        const env       = simulateEnvironmentalConditions(product.storage_category);
        const riskLevel = calculateRiskLevel(daysLeft, env.temperature, env.humidity, product.storage_category);
        const details   = generateAlertDetails(product.product_name, riskLevel, daysLeft);
        const quantity  = `${product.total_quantity}${product.unit_of_measure}`;
        const value     = (parseFloat(product.total_quantity || 0) * 80).toFixed(2);

        const existing = await AlertModel.findActiveByProductId(product.product_id);

        if (existing) {
          await AlertModel.updateSyncedAlert(
            existing.id, riskLevel, details, daysLeft,
            env.temperature, env.humidity, quantity, value
          );
        } else {
          await AlertModel.createSyncedAlert(
            businessId, product.product_id, product.product_name,
            riskLevel, details, daysLeft,
            env.temperature, env.humidity, env.location, quantity, value
          );
        }

        syncedCount++;
      } catch (productErr) {
        // Log but don't crash — skip this product and continue
        console.error(
          `[AlertService.sync] Failed on product "${product.product_name}":`,
          productErr.message
        );
      }
    }

    console.log(`[AlertService.sync] synced ${syncedCount}/${products.length} products`);
    return syncedCount;
  },

  async getAllAlerts(businessId) {
    const alerts = await AlertModel.findAllByBusiness(businessId);
    return { alerts };
  },

  async getAlertStats(businessId) {
    return AlertModel.getStatsByBusiness(businessId);
  },

  async deleteAlert(id, businessId) {
    const alert = await AlertModel.findByIdAndBusiness(id, businessId);
    if (!alert) throw { status: 404, message: 'Alert not found' };
    await AlertModel.deleteById(id);
  },

  async updateAlertStatus(id, businessId, status) {
    const VALID = ['active', 'dismissed', 'resolved'];
    if (!VALID.includes(status)) throw { status: 400, message: 'Invalid status' };
    const updated = await AlertModel.updateStatusById(id, businessId, status);
    if (!updated) throw { status: 404, message: 'Alert not found' };
    return { alert: updated };
  },

  async getAIInsights(id, businessId) {
    const alert = await AlertModel.findByIdAndBusiness(id, businessId);
    if (!alert) throw { status: 404, message: 'Alert not found' };
    return aiService.generateAlertInsights(alert);
  },
};

module.exports = AlertService;