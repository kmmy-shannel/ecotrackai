const pool = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response.utils');
const aiService = require('../services/ai.service'); 

/**
 * Calculate risk level based on days left and storage conditions
 */
const calculateRiskLevel = (daysLeft, temperature, humidity, storageCategory) => {
  // High risk: <= 3 days
  if (daysLeft <= 3) return 'HIGH';
  
  // Medium risk: 4-7 days OR suboptimal conditions
  if (daysLeft <= 7) return 'MEDIUM';
  
  // Check temperature/humidity thresholds
  const isSuboptimal = checkSuboptimalConditions(temperature, humidity, storageCategory);
  if (isSuboptimal && daysLeft <= 14) return 'MEDIUM';
  
  // Low risk: > 7 days
  return 'LOW';
};

/**
 * Check if storage conditions are suboptimal
 */
const checkSuboptimalConditions = (temperature, humidity, storageCategory) => {
  const thresholds = {
    refrigerated: { tempMax: 4, humidityRange: [80, 95] },
    frozen: { tempMax: -18, humidityRange: [0, 100] },
    ambient: { tempMax: 25, humidityRange: [40, 70] },
    controlled_atmosphere: { tempMax: 10, humidityRange: [85, 95] }
  };

  const threshold = thresholds[storageCategory] || thresholds.ambient;
  
  if (temperature > threshold.tempMax) return true;
  if (humidity < threshold.humidityRange[0] || humidity > threshold.humidityRange[1]) return true;
  
  return false;
};

/**
 * Generate alert details based on risk level
 */
const generateAlertDetails = (product, riskLevel, daysLeft) => {
  const details = {
    HIGH: `Critical: ${product.product_name} expires in ${daysLeft} days. Immediate action required to prevent spoilage.`,
    MEDIUM: `Warning: ${product.product_name} has ${daysLeft} days remaining. Monitor closely and prioritize for delivery.`,
    LOW: `Info: ${product.product_name} shelf life is ${daysLeft} days. Product condition stable.`
  };
  
  return details[riskLevel] || details.LOW;
};

/**
 * Sync alerts from products table
 * This automatically creates/updates alerts based on current products
 */
const syncAlertsFromProducts = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const businessId = req.user.businessId;

    // Get all active products for this business
    const productsQuery = `
      SELECT 
        product_id,
        product_name,
        product_type,
        total_quantity,
        unit_of_measure,
        shelf_life_days,
        storage_category,
        created_at
      FROM products
      WHERE business_id = $1
    `;
    
    const { rows: products } = await client.query(productsQuery, [businessId]);

    let syncedCount = 0;

    for (const product of products) {
      // Calculate days since creation (simulating storage time)
      const createdDate = new Date(product.created_at);
      const today = new Date();
      const daysSinceCreated = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
      
      // Calculate remaining shelf life
      const daysLeft = Math.max(0, product.shelf_life_days - daysSinceCreated);

      // Simulate environmental conditions based on storage category
      const envConditions = simulateEnvironmentalConditions(product.storage_category);

      // Calculate risk level
      const riskLevel = calculateRiskLevel(
        daysLeft,
        envConditions.temperature,
        envConditions.humidity,
        product.storage_category
      );

      // Generate alert details
      const details = generateAlertDetails(product, riskLevel, daysLeft);

      // Calculate estimated value (example: ₱80 per kg for potatoes)
      const unitValue = 80; // Price per kg
      const totalValue = (parseFloat(product.total_quantity) * unitValue).toFixed(2);

      // Check if alert already exists for this product
      const existingAlert = await client.query(
        'SELECT id FROM alerts WHERE product_id = $1 AND status = $2',
        [product.product_id, 'active']
      );

      if (existingAlert.rows.length > 0) {
        // Update existing alert
        await client.query(
          `UPDATE alerts 
           SET risk_level = $1, 
               details = $2, 
               days_left = $3,
               temperature = $4,
               humidity = $5,
               quantity = $6,
               value = $7,
               updated_at = NOW()
           WHERE id = $8`,
          [
            riskLevel,
            details,
            daysLeft,
            envConditions.temperature,
            envConditions.humidity,
            `${product.total_quantity}${product.unit_of_measure}`,
            totalValue,
            existingAlert.rows[0].id
          ]
        );
      } else {
        // Create new alert
        await client.query(
          `INSERT INTO alerts 
           (business_id, product_id, product_name, risk_level, details, days_left, 
            temperature, humidity, location, quantity, value, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            businessId,
            product.product_id,
            product.product_name,
            riskLevel,
            details,
            daysLeft,
            envConditions.temperature,
            envConditions.humidity,
            envConditions.location,
            `${product.total_quantity}${product.unit_of_measure}`,
            totalValue,
            'active'
          ]
        );
      }

      syncedCount++;
    }

    await client.query('COMMIT');

    sendSuccess(res, 200, `Successfully synced ${syncedCount} alerts from products`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Sync alerts error:', error);
    sendError(res, 500, 'Failed to sync alerts', error.message);
  } finally {
    client.release();
  }
};

/**
 * Simulate environmental conditions based on storage type
 */
const simulateEnvironmentalConditions = (storageCategory) => {
  const conditions = {
    refrigerated: {
      temperature: 2 + Math.random() * 3, // 2-5°C
      humidity: 85 + Math.random() * 10,  // 85-95%
      location: 'Cold Storage A'
    },
    frozen: {
      temperature: -18 + Math.random() * 2, // -18 to -16°C
      humidity: 90 + Math.random() * 10,
      location: 'Freezer Unit B'
    },
    ambient: {
      temperature: 20 + Math.random() * 8, // 20-28°C
      humidity: 50 + Math.random() * 20,   // 50-70%
      location: 'Warehouse C'
    },
    controlled_atmosphere: {
      temperature: 8 + Math.random() * 4,  // 8-12°C
      humidity: 85 + Math.random() * 10,
      location: 'CA Storage D'
    }
  };

  return conditions[storageCategory] || conditions.ambient;
};

/**
 * Get all alerts for a business
 */
const getAllAlerts = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const query = `
      SELECT 
        id,
        product_id,
        product_name,
        risk_level,
        details,
        days_left,
        temperature,
        humidity,
        location,
        quantity,
        value,
        status,
        created_at,
        updated_at
      FROM alerts
      WHERE business_id = $1 AND status = $2
      ORDER BY 
        CASE risk_level
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
        END,
        days_left ASC
    `;

    const { rows } = await pool.query(query, [businessId, 'active']);

    sendSuccess(res, 200, 'Alerts retrieved successfully', { alerts: rows });

  } catch (error) {
    console.error('Get alerts error:', error);
    sendError(res, 500, 'Failed to retrieve alerts', error.message);
  }
};

/**
 * Get alert statistics
 */
const getAlertStats = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE risk_level = 'HIGH') as high_risk,
        COUNT(*) FILTER (WHERE risk_level = 'MEDIUM') as medium_risk,
        COUNT(*) FILTER (WHERE risk_level = 'LOW') as low_risk
      FROM alerts
      WHERE business_id = $1 AND status = $2
    `;

    const { rows } = await pool.query(query, [businessId, 'active']);

    sendSuccess(res, 200, 'Stats retrieved successfully', rows[0]);

  } catch (error) {
    console.error('Get stats error:', error);
    sendError(res, 500, 'Failed to retrieve stats', error.message);
  }
};

/**
 * Delete an alert
 */
const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    // Verify ownership
    const checkQuery = 'SELECT id FROM alerts WHERE id = $1 AND business_id = $2';
    const { rows } = await pool.query(checkQuery, [id, businessId]);

    if (rows.length === 0) {
      return sendError(res, 404, 'Alert not found');
    }

    // Delete the alert
    await pool.query('DELETE FROM alerts WHERE id = $1', [id]);

    sendSuccess(res, 200, 'Alert deleted successfully');

  } catch (error) {
    console.error('Delete alert error:', error);
    sendError(res, 500, 'Failed to delete alert', error.message);
  }
};

/**
 * Update alert status
 */
const updateAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const businessId = req.user.businessId;

    if (!['active', 'dismissed', 'resolved'].includes(status)) {
      return sendError(res, 400, 'Invalid status');
    }

    const query = `
      UPDATE alerts 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND business_id = $3
      RETURNING *
    `;

    const { rows } = await pool.query(query, [status, id, businessId]);

    if (rows.length === 0) {
      return sendError(res, 404, 'Alert not found');
    }

    sendSuccess(res, 200, 'Alert status updated', { alert: rows[0] });

  } catch (error) {
    console.error('Update alert status error:', error);
    sendError(res, 500, 'Failed to update alert status', error.message);
  }
};

/**
 * Get AI insights for an alert - NOW WITH REAL AI!
 */
const getAIInsights = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    // Get alert details
    const alertQuery = `
      SELECT * FROM alerts 
      WHERE id = $1 AND business_id = $2
    `;
    const { rows } = await pool.query(alertQuery, [id, businessId]);

    if (rows.length === 0) {
      return sendError(res, 404, 'Alert not found');
    }

    const alert = rows[0];

    // AI 
    const insights = await aiService.generateAlertInsights(alert);

    sendSuccess(res, 200, 'AI insights generated', insights);

  } catch (error) {
    console.error('Get AI insights error:', error);
    sendError(res, 500, 'Failed to generate insights', error.message);
  }
};

module.exports = {
  syncAlertsFromProducts,
  getAllAlerts,
  getAlertStats,
  deleteAlert,
  updateAlertStatus,
  getAIInsights
};