// ============================================================
// FILE LOCATION: backend/src/models/alert.model.js
// LAYER: Model — DB queries ONLY, no business logic
// REPLACES your existing alert.model.js (adds new queries)
// ============================================================

const pool = require('../config/database');

const AlertModel = {

  // ── Original methods (kept exactly as-is) ──────────────────

  async createAlertsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        alert_type VARCHAR(50) CHECK (alert_type IN ('spoilage', 'temperature', 'expiry', 'quality')) DEFAULT 'spoilage',
        risk_level VARCHAR(10) CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW')) NOT NULL,
        details TEXT,
        days_left INT,
        temperature DECIMAL(5,2),
        humidity DECIMAL(5,2),
        location VARCHAR(255),
        status VARCHAR(10) CHECK (status IN ('active', 'resolved', 'dismissed')) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;
    try {
      await pool.query(query);
      console.log('Alerts table created/verified');
    } catch (error) {
      console.error('Error creating alerts table:', error);
      throw error;
    }
  },

  async getAll() {
    const query = `
      SELECT * FROM alerts 
      WHERE status = 'active'
      ORDER BY 
        CASE risk_level 
          WHEN 'HIGH' THEN 1 
          WHEN 'MEDIUM' THEN 2 
          WHEN 'LOW' THEN 3 
        END,
        created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  },

  async getByRiskLevel(riskLevel) {
    const query = `
      SELECT * FROM alerts 
      WHERE risk_level = $1 AND status = 'active'
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query, [riskLevel]);
    return rows;
  },

  async create(alertData) {
    const query = `
      INSERT INTO alerts (
        product_id, product_name, alert_type, risk_level, 
        details, days_left, temperature, humidity, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    const { rows } = await pool.query(query, [
      alertData.product_id,
      alertData.product_name,
      alertData.alert_type,
      alertData.risk_level,
      alertData.details,
      alertData.days_left,
      alertData.temperature,
      alertData.humidity,
      alertData.location
    ]);
    return rows[0].id;
  },

  async updateStatus(id, status) {
    const query = 'UPDATE alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await pool.query(query, [status, id]);
  },

  async delete(id) {
    const query = 'DELETE FROM alerts WHERE id = $1';
    await pool.query(query, [id]);
  },

  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN risk_level = 'MEDIUM' THEN 1 ELSE 0 END) as medium_risk,
        SUM(CASE WHEN risk_level = 'LOW' THEN 1 ELSE 0 END) as low_risk
      FROM alerts 
      WHERE status = 'active'
    `;
    const { rows } = await pool.query(query);
    return rows[0];
  },

  // ── New methods added for alert.controller ─────────────────

  // Get all active alerts for a specific business (ordered by risk)
  async findAllByBusiness(businessId) {
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
      WHERE business_id = $1 AND status = 'active'
      ORDER BY 
        CASE risk_level
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
        END,
        days_left ASC
    `;
    const { rows } = await pool.query(query, [businessId]);
    return rows;
  },

  // Get aggregated stats for a business
  async getStatsByBusiness(businessId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE risk_level = 'HIGH')   as high_risk,
        COUNT(*) FILTER (WHERE risk_level = 'MEDIUM') as medium_risk,
        COUNT(*) FILTER (WHERE risk_level = 'LOW')    as low_risk
      FROM alerts
      WHERE business_id = $1 AND status = 'active'
    `;
    const { rows } = await pool.query(query, [businessId]);
    return rows[0];
  },

  // Verify alert belongs to a business (ownership check)
  async findByIdAndBusiness(id, businessId) {
    const query = 'SELECT * FROM alerts WHERE id = $1 AND business_id = $2';
    const { rows } = await pool.query(query, [id, businessId]);
    return rows[0] || null;
  },

  // Hard delete a single alert
  async deleteById(id) {
    await pool.query('DELETE FROM alerts WHERE id = $1', [id]);
  },

  // Update alert status (active / dismissed / resolved)
  async updateStatusById(id, businessId, status) {
    const query = `
      UPDATE alerts 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND business_id = $3
      RETURNING *
    `;
    const { rows } = await pool.query(query, [status, id, businessId]);
    return rows[0] || null;
  },

  // Get all active products for a business (used during sync)
  async findProductsByBusiness(businessId) {
    const query = `
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
    const { rows } = await pool.query(query, [businessId]);
    return rows;
  },

  // Check if an active alert already exists for a product
  async findActiveByProductId(productId) {
    const query = 'SELECT id FROM alerts WHERE product_id = $1 AND status = $2';
    const { rows } = await pool.query(query, [productId, 'active']);
    return rows[0] || null;
  },

  // Update an existing alert during sync
  async updateSyncedAlert(id, riskLevel, details, daysLeft, temperature, humidity, quantity, value) {
    await pool.query(
      `UPDATE alerts 
       SET risk_level = $1, 
           details    = $2, 
           days_left  = $3,
           temperature = $4,
           humidity   = $5,
           quantity   = $6,
           value      = $7,
           updated_at = NOW()
       WHERE id = $8`,
      [riskLevel, details, daysLeft, temperature, humidity, quantity, value, id]
    );
  },

  // Insert a new alert during sync
  async createSyncedAlert(businessId, productId, productName, riskLevel, details, daysLeft, temperature, humidity, location, quantity, value) {
    await pool.query(
      `INSERT INTO alerts 
       (business_id, product_id, product_name, risk_level, details, days_left, 
        temperature, humidity, location, quantity, value, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [businessId, productId, productName, riskLevel, details, daysLeft,
       temperature, humidity, location, quantity, value, 'active']
    );
  }

};

module.exports = AlertModel;