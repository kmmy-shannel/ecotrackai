// ============================================================
// FILE LOCATION: backend/src/services/alert.service.js
// LAYER: Service (ViewModel) — business logic ONLY, no HTTP/no DB
// ============================================================

const AlertModel = require('../models/alert.model');
const aiService  = require('./ai.service');

// ── Pure business logic helpers ────────────────────────────

/**
 * Calculate risk level based on days left and storage conditions
 */
const calculateRiskLevel = (daysLeft, temperature, humidity, storageCategory) => {
  if (daysLeft <= 3) return 'HIGH';
  if (daysLeft <= 7) return 'MEDIUM';

  const isSuboptimal = checkSuboptimalConditions(temperature, humidity, storageCategory);
  if (isSuboptimal && daysLeft <= 14) return 'MEDIUM';

  return 'LOW';
};

/**
 * Check if storage conditions are suboptimal
 */
const checkSuboptimalConditions = (temperature, humidity, storageCategory) => {
  const thresholds = {
    refrigerated:        { tempMax: 4,   humidityRange: [80, 95] },
    frozen:              { tempMax: -18, humidityRange: [0, 100] },
    ambient:             { tempMax: 25,  humidityRange: [40, 70] },
    controlled_atmosphere: { tempMax: 10, humidityRange: [85, 95] }
  };

  const threshold = thresholds[storageCategory] || thresholds.ambient;

  if (temperature > threshold.tempMax) return true;
  if (humidity < threshold.humidityRange[0] || humidity > threshold.humidityRange[1]) return true;

  return false;
};

/**
 * Generate human-readable alert details
 */
const generateAlertDetails = (product, riskLevel, daysLeft) => {
  const details = {
    HIGH:   `Critical: ${product.product_name} expires in ${daysLeft} days. Immediate action required to prevent spoilage.`,
    MEDIUM: `Warning: ${product.product_name} has ${daysLeft} days remaining. Monitor closely and prioritize for delivery.`,
    LOW:    `Info: ${product.product_name} shelf life is ${daysLeft} days. Product condition stable.`
  };
  return details[riskLevel] || details.LOW;
};

/**
 * Simulate environmental conditions based on storage type
 */
const simulateEnvironmentalConditions = (storageCategory) => {
  const conditions = {
    refrigerated: {
      temperature: 2  + Math.random() * 3,
      humidity:    85 + Math.random() * 10,
      location:    'Cold Storage A'
    },
    frozen: {
      temperature: -18 + Math.random() * 2,
      humidity:    90  + Math.random() * 10,
      location:    'Freezer Unit B'
    },
    ambient: {
      temperature: 20 + Math.random() * 8,
      humidity:    50 + Math.random() * 20,
      location:    'Warehouse C'
    },
    controlled_atmosphere: {
      temperature: 8  + Math.random() * 4,
      humidity:    85 + Math.random() * 10,
      location:    'CA Storage D'
    }
  };
  return conditions[storageCategory] || conditions.ambient;
};

// ── Service methods ────────────────────────────────────────

const AlertService = {

  // Sync alerts from products — creates or updates per product
  async syncAlertsFromProducts(businessId) {
    const products = await AlertModel.findProductsByBusiness(businessId);

    let syncedCount = 0;

    for (const product of products) {
      const createdDate    = new Date(product.created_at);
      const today          = new Date();
      const daysSinceCreated = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
      const daysLeft         = Math.max(0, product.shelf_life_days - daysSinceCreated);

      const envConditions = simulateEnvironmentalConditions(product.storage_category);

      const riskLevel = calculateRiskLevel(
        daysLeft,
        envConditions.temperature,
        envConditions.humidity,
        product.storage_category
      );

      const details    = generateAlertDetails(product, riskLevel, daysLeft);
      const unitValue  = 80;
      const totalValue = (parseFloat(product.total_quantity) * unitValue).toFixed(2);
      const quantity   = `${product.total_quantity}${product.unit_of_measure}`;

      const existing = await AlertModel.findActiveByProductId(product.product_id);

      if (existing) {
        await AlertModel.updateSyncedAlert(
          existing.id,
          riskLevel,
          details,
          daysLeft,
          envConditions.temperature,
          envConditions.humidity,
          quantity,
          totalValue
        );
      } else {
        await AlertModel.createSyncedAlert(
          businessId,
          product.product_id,
          product.product_name,
          riskLevel,
          details,
          daysLeft,
          envConditions.temperature,
          envConditions.humidity,
          envConditions.location,
          quantity,
          totalValue
        );
      }

      syncedCount++;
    }

    return syncedCount;
  },

  // Get all active alerts for a business
  async getAllAlerts(businessId) {
    const alerts = await AlertModel.findAllByBusiness(businessId);
    return { alerts };
  },

  // Get alert statistics for a business
  async getAlertStats(businessId) {
    const stats = await AlertModel.getStatsByBusiness(businessId);
    return stats;
  },

  // Delete an alert — verifies ownership first
  async deleteAlert(id, businessId) {
    const alert = await AlertModel.findByIdAndBusiness(id, businessId);
    if (!alert) {
      throw { status: 404, message: 'Alert not found' };
    }
    await AlertModel.deleteById(id);
  },

  // Update alert status — verifies ownership first
  async updateAlertStatus(id, businessId, status) {
    const VALID_STATUSES = ['active', 'dismissed', 'resolved'];
    if (!VALID_STATUSES.includes(status)) {
      throw { status: 400, message: 'Invalid status' };
    }

    const updated = await AlertModel.updateStatusById(id, businessId, status);
    if (!updated) {
      throw { status: 404, message: 'Alert not found' };
    }
    return { alert: updated };
  },

  // Get AI insights for an alert — calls ai.service.js exactly as before
  async getAIInsights(id, businessId) {
    const alert = await AlertModel.findByIdAndBusiness(id, businessId);
    if (!alert) {
      throw { status: 404, message: 'Alert not found' };
    }

    // ✅ AI call preserved exactly — same as original controller
    const insights = await aiService.generateAlertInsights(alert);
    return insights;
  }

};

module.exports = AlertService;