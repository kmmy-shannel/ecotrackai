// ============================================================
// FILE LOCATION: backend/src/models/alert.model.js
// FIX: findProductsByBusiness now tries the correct column names
//      for your actual products table schema.
// ============================================================

const pool = require('../config/database');

const AlertModel = {

  // ── Get all active alerts for a business ───────────────────
  async findAllByBusiness(businessId) {
    const query = `
      SELECT *
      FROM alerts
      WHERE business_id = $1
        AND status = 'active'
      ORDER BY
        CASE risk_level
          WHEN 'HIGH'   THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW'    THEN 3
        END,
        days_left ASC
    `;
    const { rows } = await pool.query(query, [businessId]);
    return rows;
  },

  // ── Get aggregated stats for a business ────────────────────
  async getStatsByBusiness(businessId) {
    const query = `
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE risk_level = 'HIGH')      AS high_risk,
        COUNT(*) FILTER (WHERE risk_level = 'MEDIUM')    AS medium_risk,
        COUNT(*) FILTER (WHERE risk_level = 'LOW')       AS low_risk
      FROM alerts
      WHERE business_id = $1
        AND status = 'active'
    `;
    const { rows } = await pool.query(query, [businessId]);
    return rows[0];
  },

  // ── Ownership check ────────────────────────────────────────
  async findByIdAndBusiness(id, businessId) {
    const { rows } = await pool.query(
      'SELECT * FROM alerts WHERE id = $1 AND business_id = $2',
      [id, businessId]
    );
    return rows[0] || null;
  },

  // ── Hard delete ────────────────────────────────────────────
  async deleteById(id) {
    await pool.query('DELETE FROM alerts WHERE id = $1', [id]);
  },

  // ── Status update ──────────────────────────────────────────
  async updateStatusById(id, businessId, status) {
    const { rows } = await pool.query(
      `UPDATE alerts
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3
       RETURNING *`,
      [status, id, businessId]
    );
    return rows[0] || null;
  },

  // ── Check if active alert exists for a product ─────────────
  async findActiveByProductId(productId) {
    const { rows } = await pool.query(
      `SELECT id FROM alerts
       WHERE product_id = $1 AND status = 'active'`,
      [productId]
    );
    return rows[0] || null;
  },

  // ── Get products for sync ──────────────────────────────────
  // FIXED: uses a safe SELECT * then maps in JS so wrong column
  //        names in the query don't crash the whole sync.
  async findProductsByBusiness(businessId) {
    // First try to detect which primary key / name columns exist
    const { rows } = await pool.query(
      `SELECT * FROM products WHERE business_id = $1 LIMIT 500`,
      [businessId]
    );

    // Normalise each row to the field names alert.service.js expects
    return rows.map(r => ({
      // Primary key — could be id, product_id
      product_id:       r.product_id       || r.id,
      // Name
      product_name:     r.product_name     || r.name || 'Unknown Product',
      // Type/category
      product_type:     r.product_type     || r.category || 'general',
      // Quantity
      total_quantity:   r.total_quantity   || r.quantity || r.stock_quantity || 0,
      unit_of_measure:  r.unit_of_measure  || r.unit || 'kg',
      // Shelf life in days
      shelf_life_days:  r.shelf_life_days  || r.shelf_life || r.expiry_days || 30,
      // Storage
      storage_category: r.storage_category || r.storage_type || 'ambient',
      // Location
      location:         r.location         || r.storage_location || 'Warehouse',
      // Timestamp for age calculation
      created_at:       r.created_at,
    }));
  },

  // ── Update existing alert during sync ──────────────────────
  async updateSyncedAlert(id, riskLevel, details, daysLeft, temperature, humidity, quantity, value) {
    await pool.query(
      `UPDATE alerts
       SET risk_level   = $1,
           details      = $2,
           days_left    = $3,
           temperature  = $4,
           humidity     = $5,
           quantity     = $6,
           value        = $7,
           updated_at   = NOW()
       WHERE id = $8`,
      [riskLevel, details, daysLeft, temperature, humidity, quantity, value, id]
    );
  },

  // ── Insert new alert during sync ───────────────────────────
  async createSyncedAlert(businessId, productId, productName, riskLevel, details, daysLeft, temperature, humidity, location, quantity, value) {
    await pool.query(
      `INSERT INTO alerts
         (business_id, product_id, product_name, risk_level, details,
          days_left, temperature, humidity, location, quantity, value, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')`,
      [businessId, productId, productName, riskLevel, details,
       daysLeft, temperature, humidity, location, quantity, value]
    );
  },

  // ── Legacy methods kept for backward compatibility ─────────
  async getAll() {
    const { rows } = await pool.query(
      `SELECT * FROM alerts WHERE status = 'active'
       ORDER BY CASE risk_level WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, created_at DESC`
    );
    return rows;
  },

  async create(alertData) {
    const { rows } = await pool.query(
      `INSERT INTO alerts
         (product_id, product_name, alert_type, risk_level, details,
          days_left, temperature, humidity, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [alertData.product_id, alertData.product_name, alertData.alert_type,
       alertData.risk_level, alertData.details, alertData.days_left,
       alertData.temperature, alertData.humidity, alertData.location]
    );
    return rows[0].id;
  },

  async delete(id) {
    await pool.query('DELETE FROM alerts WHERE id = $1', [id]);
  },

  async getStats() {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN risk_level='HIGH'   THEN 1 ELSE 0 END) as high_risk,
              SUM(CASE WHEN risk_level='MEDIUM' THEN 1 ELSE 0 END) as medium_risk,
              SUM(CASE WHEN risk_level='LOW'    THEN 1 ELSE 0 END) as low_risk
       FROM alerts WHERE status = 'active'`
    );
    return rows[0];
  },
};

module.exports = AlertModel;