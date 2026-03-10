console.log('[AlertService] MODULE LOADED - new version');
const pool = require('../config/database');
const AlertModel = require('../models/alert.model');
const AuditModel = require('../models/audit.model');
const aiService = require('./ai.service');

const SPOILAGE_RISK_THRESHOLD = Number(process.env.SPOILAGE_RISK_THRESHOLD || 15);
const SPOILAGE_TRANSITIONS = {
  active: new Set(['pending_review', 'dismissed']),
  pending_review: new Set(['approved', 'rejected', 'declined']),
  approved: new Set(['resolved']),
  rejected: new Set(['resolved']),
  declined: new Set(['resolved']),
  dismissed: new Set([]),
  resolved: new Set([])
};

const STORAGE_THRESHOLDS = {
  refrigerated: { tempMin: 0, tempMax: 4, humidityRange: [80, 95] },
  frozen: { tempMin: -25, tempMax: -18, humidityRange: [0, 100] },
  ambient: { tempMin: 18, tempMax: 25, humidityRange: [40, 70] },
  controlled_atmosphere: { tempMin: 6, tempMax: 10, humidityRange: [85, 95] }
};

const normalizeSpoilageStatus = (status) => {
  if (status === 'rejected') return 'declined';
  return status;
};

const canTransitionSpoilageStatus = (fromStatus, toStatus) => {
  const from = normalizeSpoilageStatus(fromStatus);
  const to = normalizeSpoilageStatus(toStatus);
  return Boolean(SPOILAGE_TRANSITIONS[from]?.has(to));
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const checkSuboptimalConditions = (temperature, humidity, storageCategory) => {
  const threshold = STORAGE_THRESHOLDS[storageCategory] || STORAGE_THRESHOLDS.ambient;
  if (temperature < threshold.tempMin || temperature > threshold.tempMax) return true;
  if (humidity < threshold.humidityRange[0] || humidity > threshold.humidityRange[1]) return true;
  return false;
};

const generateAlertDetails = (productName, riskLevel, daysLeft, riskScore) => ({
  HIGH: `Critical: ${productName} expires in ${daysLeft} day(s). Risk score ${riskScore}. Immediate action required.`,
  MEDIUM: `Warning: ${productName} has ${daysLeft} day(s) left. Risk score ${riskScore}. Prioritize dispatch.`,
  LOW: `Info: ${productName} has ${daysLeft} day(s) left. Risk score ${riskScore}. Continue monitoring.`
}[riskLevel] || `${productName}: ${daysLeft} day(s) left. Risk score ${riskScore}.`);

const simulateEnvironmentalConditions = (storageCategory) => ({
  refrigerated: { temperature: 2 + Math.random() * 3, humidity: 85 + Math.random() * 10, location: 'Cold Storage A' },
  frozen: { temperature: -19 + Math.random() * 2, humidity: 90 + Math.random() * 10, location: 'Freezer Unit B' },
  ambient: { temperature: 20 + Math.random() * 6, humidity: 50 + Math.random() * 18, location: 'Warehouse C' },
  controlled_atmosphere: { temperature: 7 + Math.random() * 3, humidity: 86 + Math.random() * 8, location: 'CA Storage D' }
}[storageCategory] || { temperature: 22, humidity: 60, location: 'Warehouse' });

const AlertService = {
  _isNil(value) {
    return value === null || value === undefined;
  },

  _toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },

  async _cleanupStaleAlerts(businessId) {
    try {
      const oldResolvedQuery = `
        DELETE FROM alerts
        WHERE business_id = $1
          AND status IN ('resolved', 'dismissed')
          AND created_at < NOW() - INTERVAL '7 days'
        RETURNING id
      `;
      const { rows: oldResolved } = await pool.query(oldResolvedQuery, [businessId]);

      const cleanupQuery = `
        DELETE FROM alerts a
        WHERE a.business_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM inventory i
            WHERE i.business_id = a.business_id
              AND i.product_id = a.product_id
              AND COALESCE(i.quantity, 0) > 0
              AND LOWER(COALESCE(i.current_condition, 'good')) <> 'spoiled'
          )
        RETURNING a.id
      `;
      const { rows: deletedRows } = await pool.query(cleanupQuery, [businessId]);

      const totalDeleted = oldResolved.length + deletedRows.length;
      if (totalDeleted > 0) {
        console.log(`[AlertService._cleanupStaleAlerts] Cleaned up ${totalDeleted} stale alerts for business ${businessId}`);
      }
      return totalDeleted;
    } catch (error) {
      console.error('[AlertService._cleanupStaleAlerts]', error);
      return 0;
    }
  },

  _calculateDaysLeft(shelfLifeDays, batchCreatedAt) {
    const shelf = Math.max(1, this._toNumber(shelfLifeDays, 30));
    const createdAt = batchCreatedAt ? new Date(batchCreatedAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      return shelf;
    }
    const daysSinceEntry = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
    return Math.max(0, shelf - Math.max(0, daysSinceEntry));
  },

  _calculateRiskScore(batchMetrics) {
    const shelfLifeDays = Math.max(1, this._toNumber(batchMetrics.shelfLifeDays, 30));
    const daysLeft = clamp(this._toNumber(batchMetrics.daysLeft, shelfLifeDays), 0, shelfLifeDays);
    const temperature = this._toNumber(batchMetrics.temperature, 22);
    const humidity = this._toNumber(batchMetrics.humidity, 60);
    const quantity = Math.max(0, this._toNumber(batchMetrics.quantity, 0));
    const storageCategory = batchMetrics.storageCategory || 'ambient';
    const condition = String(batchMetrics.currentCondition || 'good').toLowerCase();

    const threshold = STORAGE_THRESHOLDS[storageCategory] || STORAGE_THRESHOLDS.ambient;
    const lifeConsumption = 1 - (daysLeft / shelfLifeDays);
    const daysComponent = clamp(lifeConsumption * 55, 0, 55);

    const tempDeviation = temperature < threshold.tempMin
      ? threshold.tempMin - temperature
      : temperature > threshold.tempMax
        ? temperature - threshold.tempMax
        : 0;
    const humidityDeviation = humidity < threshold.humidityRange[0]
      ? threshold.humidityRange[0] - humidity
      : humidity > threshold.humidityRange[1]
        ? humidity - threshold.humidityRange[1]
        : 0;

    const tempComponent = clamp(tempDeviation * 2.5, 0, 20);
    const humidityComponent = clamp(humidityDeviation * 0.8, 0, 12);
    const GOOD_CONDITIONS = ['good', 'excellent', 'very good'];
    const conditionComponent = GOOD_CONDITIONS.includes(condition) ? 0 : 12;
    const quantityComponent = clamp(Math.log10(quantity + 1) * 4, 0, 8);
    const suboptimalComponent = checkSuboptimalConditions(temperature, humidity, storageCategory) ? 5 : 0;

    const total = daysComponent + tempComponent + humidityComponent + conditionComponent + quantityComponent + suboptimalComponent;
    return clamp(Math.round(total), 0, 100);
  },

  _riskLevelFromScore(score) {
    if (score >= 85) return 'HIGH';
    if (score >= 60) return 'MEDIUM';
    return 'LOW';
  },

  async _fetchBusinessIdsWithProducts() {
    try {
      const query = `
        SELECT DISTINCT business_id
        FROM inventory
        WHERE business_id IS NOT NULL
          AND COALESCE(quantity, 0) > 0
          AND LOWER(COALESCE(current_condition, 'good')) <> 'spoiled'
      `;
      const { rows } = await pool.query(query);
      return rows.map((row) => row.business_id).filter((id) => !this._isNil(id));
    } catch (error) {
      console.error('[AlertService._fetchBusinessIdsWithProducts]', error);
      return [];
    }
  },

  async finalizeCarbonVerification(ctx, carbonRecordId, decision, notes = '') {
    try {
      const actionType = decision === 'verified' ? 'carbon_verified' : 'carbon_revision_requested';
      const txResult = await ApprovalModel.createEcoTrustTransaction({
        businessId: ctx.businessId,
        actionType,
        relatedRecordId: carbonRecordId,
        relatedRecordType: 'carbon_record',
        actorUserId: ctx.userId,
        verificationStatus: decision === 'verified' ? 'verified' : 'pending',
        notes
      });
      await ApprovalModel.createApprovalHistory({
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: decision,
        notes,
        relatedRecordType: 'carbon_record',
        relatedRecordId: carbonRecordId
      });
      return { success: true, data: { transaction: txResult.data } };
    } catch (error) {
      console.error('[ApprovalService.finalizeCarbonVerification]', error);
      return { success: false, error: 'Failed to finalize carbon verification' };
    }
  },

  async _fetchInventoryBatchesByBusiness(businessId) {
    try {
      const query = `
        SELECT
          i.inventory_id AS batch_id,
          i.batch_number,
          i.product_id,
          p.product_name,
          p.storage_category,
          p.shelf_life_days,
          i.quantity AS batch_quantity,
          COALESCE(i.unit_of_measure, p.unit_of_measure, 'kg') AS unit_of_measure,
          COALESCE(i.entry_date, p.created_at, NOW()) AS batch_created_at,
          COALESCE(i.current_condition, 'good') AS current_condition,
          i.expected_expiry_date
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        WHERE i.business_id = $1
          AND COALESCE(i.quantity, 0) > 0
          AND LOWER(COALESCE(i.current_condition, 'good')) <> 'spoiled'
        ORDER BY i.inventory_id ASC
      `;
      const { rows } = await pool.query(query, [businessId]);
      if (rows.length > 0) return rows;
    } catch (error) {
      console.error('[AlertService._fetchInventoryBatchesByBusiness] inventory query failed:', error.message);
    }

    try {
      const products = await AlertModel.findProductsByBusiness(businessId);
      return (products || []).map((product) => ({
        batch_id: `product-${product.product_id}`,
        product_id: product.product_id,
        product_name: product.product_name,
        storage_category: product.storage_category,
        shelf_life_days: product.shelf_life_days,
        batch_quantity: this._toNumber(product.total_quantity, 0),
        unit_of_measure: product.unit_of_measure || 'kg',
        batch_created_at: product.created_at || new Date(),
        current_condition: 'good'
      }));
    } catch (error) {
      console.error('[AlertService._fetchInventoryBatchesByBusiness] product fallback failed:', error.message);
      return [];
    }
  },

  async _upsertSpoilageAlert(businessId, candidate) {
    try {
      let existing = null;
      if (candidate.batchNumber) {
        existing = await AlertModel.findActiveByBatchNumber(candidate.batchNumber, candidate.businessId);
      }
      if (!existing) {
        existing = await AlertModel.findActiveByProductId(candidate.productId);
      }
      if (existing && ['pending_review', 'approved', 'declined', 'rejected'].includes(existing.status)) {
        return { created: 0, updated: 0, skipped: 1 };
      }

      const aiPayload = {
        product_name: candidate.productName,
        risk_level: candidate.riskLevel,
        days_left: candidate.daysLeft,
        temperature: candidate.temperature,
        humidity: candidate.humidity,
        location: candidate.location,
        quantity: candidate.quantityDisplay,
        value: candidate.valueEstimate
      };

      const aiRecommendation = await aiService.generateSpoilageRecommendation(aiPayload);
      const recommendationText = aiRecommendation?.recommendation || 'Prioritize immediate redistribution to avoid spoilage.';
      const modelMeta = aiRecommendation?.meta || {};

      console.log('[SpoilageRiskEngine.AI]', {
        business_id: businessId,
        product_id: candidate.productId,
        model: modelMeta.model || null,
        prompt_version: modelMeta.promptVersion || null,
        confidence_score: modelMeta.confidence || null,
        used_fallback: modelMeta.usedFallback || false
      });

      const details = `${generateAlertDetails(candidate.productName, candidate.riskLevel, candidate.daysLeft, candidate.riskScore)} Recommendation: ${recommendationText}`;

      if (existing) {
        await AlertModel.updateSyncedAlert(
          existing.id,
          candidate.riskLevel,
          details,
          candidate.daysLeft,
          candidate.temperature,
          candidate.humidity,
          candidate.quantityDisplay,
          String(candidate.valueEstimate)
        );
        return { created: 0, updated: 1, skipped: 0 };
      }

      await AlertModel.createSyncedAlert(
        businessId,
        candidate.productId,
        candidate.productName,
        candidate.riskLevel,
        details,
        candidate.daysLeft,
        candidate.temperature,
        candidate.humidity,
        candidate.location,
        candidate.quantityDisplay,
        String(candidate.valueEstimate),
        candidate.batchNumber || null
      );

      return { created: 1, updated: 0, skipped: 0 };
    } catch (error) {
      console.error('[AlertService._upsertSpoilageAlert]', error);
      return { created: 0, updated: 0, skipped: 0, failed: 1 };
    }
  },

  async processBusinessSpoilageRiskEngine(businessId) {
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      await this._cleanupStaleAlerts(businessId);

      const batches = await this._fetchInventoryBatchesByBusiness(businessId);
      if (!Array.isArray(batches) || batches.length === 0) {
        return {
          success: true,
          data: { businessId, evaluatedBatches: 0, highRiskBatches: 0, alertsCreated: 0, alertsUpdated: 0, skippedDuplicates: 0 }
        };
      }

      const highestRiskByBatch = new Map();

      for (const batch of batches) {
        const quantity = Math.max(0, this._toNumber(batch.batch_quantity, 0));
        if (quantity <= 0) continue;

        const storageCategory = batch.storage_category || 'ambient';
        const env = simulateEnvironmentalConditions(storageCategory);
        const shelfLifeDays = this._toNumber(batch.shelf_life_days, 30);
        let daysLeft;
        if (batch.expected_expiry_date) {
          const msLeft = new Date(batch.expected_expiry_date).getTime() - Date.now();
          daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
        } else {
          daysLeft = this._calculateDaysLeft(shelfLifeDays, batch.batch_created_at);
        }

        const forceAlert = daysLeft <= 7 || (shelfLifeDays > 0 && (daysLeft / shelfLifeDays) <= 0.7);
        const condition = String(batch.current_condition || 'good').toLowerCase();
        const conditionMultiplier = { poor: 0.4, fair: 0.7, good: 1.0, excellent: 1.0 };
        const effectiveDaysLeft = Math.floor(daysLeft * (conditionMultiplier[condition] || 1.0));

        const riskScore = this._calculateRiskScore({
          shelfLifeDays,
          daysLeft: effectiveDaysLeft,
          temperature: env.temperature,
          humidity: env.humidity,
          quantity,
          storageCategory,
          currentCondition: batch.current_condition
        });

        if (riskScore <= SPOILAGE_RISK_THRESHOLD && !forceAlert) continue;

        const riskLevel = this._riskLevelFromScore(riskScore);
        const candidate = {
          businessId,
          inventoryId: batch.batch_id,
          batchNumber: batch.batch_number || null,
          productId: batch.product_id,
          productName: batch.product_name,
          quantity,
          quantityDisplay: `${quantity}${batch.unit_of_measure || 'kg'}`,
          shelfLifeDays,
          daysLeft,
          riskScore,
          riskLevel,
          storageCategory,
          temperature: env.temperature,
          humidity: env.humidity,
          location: env.location,
          valueEstimate: Number((quantity * 80).toFixed(2))
        };

        const batchKey = candidate.batchNumber || `product-${candidate.productId}-${candidate.inventoryId}`;
        const current = highestRiskByBatch.get(batchKey);
        if (!current || candidate.riskScore > current.riskScore) {
          highestRiskByBatch.set(batchKey, candidate);
        }
      }

      let alertsCreated = 0;
      let alertsUpdated = 0;
      let skippedDuplicates = 0;

      for (const candidate of highestRiskByBatch.values()) {
        const upsertResult = await this._upsertSpoilageAlert(businessId, candidate);
        alertsCreated += upsertResult.created || 0;
        alertsUpdated += upsertResult.updated || 0;
        skippedDuplicates += upsertResult.skipped || 0;
      }

      return {
        success: true,
        data: {
          businessId,
          evaluatedBatches: batches.length,
          highRiskBatches: highestRiskByBatch.size,
          alertsCreated,
          alertsUpdated,
          skippedDuplicates
        }
      };
    } catch (error) {
      console.error('[AlertService.processBusinessSpoilageRiskEngine]', error);
      return { success: false, error: 'Failed to process spoilage risk engine' };
    }
  },

  async runDailySpoilageRiskEngine() {
    try {
      const businessIds = await this._fetchBusinessIdsWithProducts();
      let businessesProcessed = 0;
      let totalAlertsCreated = 0;
      let totalAlertsUpdated = 0;
      let totalHighRiskBatches = 0;

      for (const businessId of businessIds) {
        const businessResult = await this.processBusinessSpoilageRiskEngine(businessId);
        if (!businessResult.success) continue;
        businessesProcessed += 1;
        totalAlertsCreated += businessResult.data.alertsCreated || 0;
        totalAlertsUpdated += businessResult.data.alertsUpdated || 0;
        totalHighRiskBatches += businessResult.data.highRiskBatches || 0;
      }

      console.log('[SpoilageRiskEngine.DailyRun]', {
        run_at: new Date().toISOString(),
        threshold: SPOILAGE_RISK_THRESHOLD,
        businesses_processed: businessesProcessed,
        high_risk_batches: totalHighRiskBatches,
        alerts_created: totalAlertsCreated,
        alerts_updated: totalAlertsUpdated
      });

      return {
        success: true,
        data: {
          businessesProcessed,
          highRiskBatches: totalHighRiskBatches,
          alertsCreated: totalAlertsCreated,
          alertsUpdated: totalAlertsUpdated
        }
      };
    } catch (error) {
      console.error('[AlertService.runDailySpoilageRiskEngine]', error);
      return { success: false, error: 'Failed to run daily spoilage risk engine' };
    }
  },

  async generateAlertsForBusiness(businessId) {
    const { rows: items } = await pool.query(`
      SELECT
        i.inventory_id, i.product_id, i.quantity, i.batch_number,
        i.expected_expiry_date, i.current_condition, i.unit_of_measure,
        i.facility_id,
        p.product_name, p.optimal_temp_min, p.optimal_temp_max,
        p.storage_category,
        sf.facility_name,
        CURRENT_DATE::date AS today,
        (i.expected_expiry_date - CURRENT_DATE)::int AS days_left
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      LEFT JOIN storage_facilities sf ON i.facility_id = sf.facility_id
      WHERE i.business_id = $1
        AND i.expected_expiry_date >= CURRENT_DATE
        AND i.quantity > 0
    `, [businessId]);

    let created = 0;
    let skipped = 0;

    for (const item of items) {
      const daysLeft = item.days_left;

      // ✅ UPDATED risk classification — HIGH ≤4d, MEDIUM ≤9d, LOW 10d+
      let riskLevel;
      if (daysLeft <= 4)      riskLevel = 'HIGH';
      else if (daysLeft <= 7) riskLevel = 'MEDIUM';
      else                    riskLevel = 'LOW';

      const { rows: existing } = await pool.query(`
        SELECT id FROM alerts
        WHERE business_id = $1
          AND product_id = $2
          AND batch_number = $3
          AND status NOT IN ('dismissed', 'resolved', 'approved', 'declined')
      `, [businessId, item.product_id, item.batch_number]);

      if (existing.length > 0) { skipped++; continue; }

      const suggestion =
        riskLevel === 'HIGH'
          ? `Redistribute ${item.product_name} immediately or offer at reduced price to avoid total loss.`
          : riskLevel === 'MEDIUM'
          ? `Plan delivery or promotional move for ${item.product_name} within the next few days.`
          : `Monitor ${item.product_name} closely — expiry approaching within 10 days.`;

      await pool.query(`
        INSERT INTO alerts (
          business_id, product_id, product_name, risk_level,
          details, days_left, quantity, location,
          alert_type, status, batch_number
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)
      `, [
        businessId,
        item.product_id,
        item.product_name,
        riskLevel,
        suggestion,
        daysLeft,
        `${item.quantity} ${item.unit_of_measure || 'kg'}`,
        item.facility_name || 'Main Warehouse',
        'spoilage_risk',
        item.batch_number
      ]);
      created++;
    }

    return { created, skipped, total: items.length };
  },

  async syncAlertsFromProducts(businessId) {
    console.log('[AlertService.syncAlertsFromProducts] businessId =', businessId);
    if (!businessId) {
      throw { status: 400, message: 'businessId is required for sync' };
    }
    const result = await this.generateAlertsForBusiness(businessId);
    return (result.created || 0) + (result.skipped || 0);
  },

  async getAllAlerts(businessId) {
    console.log('[getAllAlerts] called with businessId:', businessId);
    const { rows } = await pool.query(`
      SELECT
        i.inventory_id AS id,
        i.inventory_id,
        i.product_id,
        p.product_name,
        i.batch_number,
        i.quantity AS current_quantity,
        i.unit_of_measure,
        i.expected_expiry_date,
        (i.expected_expiry_date - CURRENT_DATE)::int AS days_left,
        CASE
          WHEN (i.expected_expiry_date - CURRENT_DATE)::int <= 4 THEN 'HIGH'
          WHEN (i.expected_expiry_date - CURRENT_DATE)::int <= 7 THEN 'MEDIUM'
          ELSE 'LOW'
        END AS risk_level,
        'active' AS status,
        'spoilage_risk' AS alert_type,
        i.current_condition
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.business_id = $1
        AND i.quantity > 0
        AND i.expected_expiry_date IS NOT NULL
        AND LOWER(COALESCE(i.current_condition, 'good')) <> 'spoiled'
      ORDER BY
        CASE
          WHEN (i.expected_expiry_date - CURRENT_DATE)::int <= 4 THEN 1
          WHEN (i.expected_expiry_date - CURRENT_DATE)::int <= 7 THEN 2
          ELSE 3
        END,
        i.expected_expiry_date ASC
    `, [businessId]);
    return { alerts: rows };
  },

  async getAlertStats(businessId) {
    return AlertModel.getStatsByBusiness(businessId);
  },

  async getAlertById(id, businessId) {
    const alert = await AlertModel.findByIdAndBusiness(id, businessId);
    return alert || null;
  },

  async submitAlertForApproval(alertId, businessId, user, options = {}) {
    // Look up from inventory directly (matches how getAllAlerts returns inventory_id as id)
    const { rows } = await pool.query(`
      SELECT
        i.inventory_id AS id,
        i.product_id,
        p.product_name,
        i.batch_number,
        i.quantity,
        i.unit_of_measure,
        (i.expected_expiry_date - CURRENT_DATE)::int AS days_left,
        CASE
          WHEN (i.expected_expiry_date - CURRENT_DATE)::int <= 4 THEN 'HIGH'
          WHEN (i.expected_expiry_date - CURRENT_DATE)::int <= 7 THEN 'MEDIUM'
          ELSE 'LOW'
        END AS risk_level,
        'active' AS status,
        i.current_condition,
        'Main Warehouse' AS location
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.inventory_id = $1
        AND i.business_id = $2
        AND i.quantity > 0
    `, [alertId, businessId]);
  
    const alert = rows[0];
    if (!alert) throw { status: 404, message: 'Alert not found' };
  
    // Check if already submitted (pending approval exists for this inventory item)
    const { rows: existing } = await pool.query(`
      SELECT approval_id FROM manager_approvals
      WHERE business_id = $1
        AND alert_id = $2
        AND status = 'pending'
      LIMIT 1
    `, [businessId, alert.id]);
  
    if (existing.length > 0) {
      throw { status: 400, message: 'This alert is already pending manager review' };
    }
  
    const ApprovalService = require('./approval.service');
    const payload = {
      alertId: alert.id,
      productName: alert.product_name,
      quantity: alert.quantity || 'N/A',
      location: alert.location || 'N/A',
      daysLeft: alert.days_left || 0,
      riskLevel: alert.risk_level || 'MEDIUM',
      priority: alert.risk_level || 'MEDIUM',
      aiSuggestion: options.aiSuggestion || '',
      requiredRole: 'inventory_manager',
      approvalType: 'spoilage_action',
      batchNumber: alert.batch_number || null
    };
  
    const result = await ApprovalService.createFromAlert(user, payload);
    return result;
  },

  async deleteAlert(id, businessId) {
    const alert = await AlertModel.findByIdAndBusiness(id, businessId);
    if (!alert) throw { status: 404, message: 'Alert not found' };
    await AlertModel.deleteById(id);
  },

  async updateAlertStatus(id, businessId, status, userContext = null) {
    const VALID = ['active', 'dismissed', 'resolved', 'pending_review', 'approved', 'declined', 'rejected'];
    if (!VALID.includes(status)) throw { status: 400, message: 'Invalid status' };

    const alert = await AlertModel.findByIdAndBusiness(id, businessId);
    if (!alert) throw { status: 404, message: 'Alert not found' };

    if (!canTransitionSpoilageStatus(alert.status, status)) {
      await AuditModel.logInvalidStatusTransition({
        businessId,
        userId: userContext?.userId || userContext?.user_id || null,
        role: userContext?.role || null,
        workflow: 'spoilage',
        entityType: 'alert',
        entityId: id,
        fromStatus: normalizeSpoilageStatus(alert.status),
        toStatus: normalizeSpoilageStatus(status),
        reason: 'Illegal spoilage status transition'
      });
      throw {
        status: 400,
        message: `Invalid spoilage status transition: ${normalizeSpoilageStatus(alert.status)} -> ${normalizeSpoilageStatus(status)}`
      };
    }

    const targetStatus = normalizeSpoilageStatus(status);
    const updated = await AlertModel.updateStatusById(id, businessId, targetStatus);
    if (!updated) throw { status: 404, message: 'Alert not found' };
    return { alert: updated };
  },

  async getAIInsights(id, businessId) {
    const { rows } = await pool.query(`
      SELECT
        i.inventory_id AS id,
        i.product_id,
        p.product_name,
        i.batch_number,
        i.quantity,
        i.unit_of_measure,
        (i.expected_expiry_date - CURRENT_DATE)::int AS days_left,
        CASE
          WHEN (i.expected_expiry_date - CURRENT_DATE)::int <= 4 THEN 'HIGH'
          WHEN (i.expected_expiry_date - CURRENT_DATE)::int <= 7 THEN 'MEDIUM'
          ELSE 'LOW'
        END AS risk_level,
        i.current_condition,
        'Main Warehouse' AS location
      FROM inventory i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.inventory_id = $1
        AND i.business_id = $2
    `, [id, businessId]);
    if (!rows[0]) throw { status: 404, message: 'Inventory item not found' };
    return aiService.generateAlertInsights(rows[0]);
  }
};

module.exports = AlertService;
