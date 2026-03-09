const pool = require('../config/database');

const AlertModel = {
  async findAllByBusiness(businessId) {
    const query = `
      SELECT a.*, 
             i.batch_number,
             i.current_condition,
             i.entry_date,
             i.unit_of_measure,
             COALESCE(i.quantity, 0) AS current_quantity
      FROM alerts a
      LEFT JOIN LATERAL (
        SELECT i2.batch_number, i2.current_condition, i2.entry_date, 
               i2.unit_of_measure, i2.quantity
        FROM inventory i2
        WHERE i2.product_id = a.product_id 
          AND i2.business_id = a.business_id
          AND COALESCE(i2.quantity, 0) > 0
          AND LOWER(COALESCE(i2.current_condition, 'good')) <> 'spoiled'
        ORDER BY i2.entry_date DESC NULLS LAST
        LIMIT 1
      ) i ON true
      WHERE a.business_id = $1
        AND a.status IN ('active', 'pending_review', 'approved', 'declined')
      ORDER BY
        CASE a.risk_level
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
        END,
        a.days_left ASC
    `;
    const { rows } = await pool.query(query, [businessId]);
    return rows;
  },

  async getStatsByBusiness(businessId) {
    const query = `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE risk_level = 'HIGH') AS high_risk,
        COUNT(*) FILTER (WHERE risk_level = 'MEDIUM') AS medium_risk,
        COUNT(*) FILTER (WHERE risk_level = 'LOW') AS low_risk
      FROM alerts
      WHERE business_id = $1
        AND status = 'active'
    `;
    const { rows } = await pool.query(query, [businessId]);
    return rows[0];
  },

  async findByIdAndBusiness(id, businessId) {
    const { rows } = await pool.query(
      'SELECT * FROM alerts WHERE id = $1 AND business_id = $2',
      [id, businessId]
    );
    return rows[0] || null;
  },

  async deleteById(id) {
    await pool.query('DELETE FROM alerts WHERE id = $1', [id]);
  },

  async updateStatusById(id, businessId, status) {
    let query;
    let params;
    if (businessId) {
      query = `
        UPDATE alerts
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND business_id = $3
        RETURNING *
      `;
      params = [status, id, businessId];
    } else {
      query = `
        UPDATE alerts
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      params = [status, id];
    }

    const { rows } = await pool.query(query, params);
    return rows[0] || null;
  },

  async findActiveByProductId(productId) {
    const { rows } = await pool.query(
      `
      SELECT id, status
      FROM alerts
      WHERE product_id = $1
        AND status NOT IN ('dismissed', 'resolved')
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [productId]
    );
    return rows[0] || null;
  },

  async findActiveByInventoryId(inventoryId) {
    if (!inventoryId) return null;
    // Note: alerts table uses product_id, not inventory_id
    // This function checks for active alerts by product_id derived from inventory batch
    const { rows } = await pool.query(
      `
      SELECT id, status, product_id
      FROM alerts
      WHERE product_id = $1
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [inventoryId]
    );
    return rows[0] || null;
  },
  async findActiveByBatchNumber(batchNumber, businessId) {
    if (!batchNumber) return null;
    const { rows } = await pool.query(
      `SELECT id, status, product_id
       FROM alerts
       WHERE batch_number = $1
         AND business_id  = $2
         AND status NOT IN ('dismissed', 'resolved')
       ORDER BY created_at DESC
       LIMIT 1`,
      [batchNumber, businessId]
    );
    return rows[0] || null;
  },

  // Fallback input for spoilage sync when direct inventory query path fails.
  async findProductsByBusiness(businessId) {
    const query = `
      SELECT
        i.product_id,
        p.product_name,
        COALESCE(SUM(i.quantity), 0) AS total_quantity,
        COALESCE(MAX(p.shelf_life_days), 30) AS shelf_life_days,
        COALESCE(MAX(p.storage_category), 'ambient') AS storage_category,
        COALESCE(MAX(i.unit_of_measure), MAX(p.unit_of_measure), 'kg') AS unit_of_measure,
        COALESCE(MAX(i.entry_date), MAX(i.created_at), NOW()) AS created_at,
        'Warehouse'::text AS location
      FROM inventory i
      JOIN products p ON p.product_id = i.product_id
      WHERE i.business_id = $1
        AND COALESCE(i.quantity, 0) > 0
        AND LOWER(COALESCE(i.current_condition, 'good')) <> 'spoiled'
      GROUP BY i.product_id, p.product_name
      ORDER BY p.product_name ASC
    `;

    const { rows } = await pool.query(query, [businessId]);
    return rows;
  },

  async updateSyncedAlert(id, riskLevel, details, daysLeft, temperature, humidity, quantity, value) {
    await pool.query(
      `
      UPDATE alerts
      SET risk_level = $1,
          details = $2,
          days_left = $3,
          temperature = $4,
          humidity = $5,
          quantity = $6,
          value = $7,
          updated_at = NOW()
      WHERE id = $8
      `,
      [riskLevel, details, daysLeft, temperature, humidity, quantity, value, id]
    );
  },

  async createSyncedAlert(
    businessId, productId, productName, riskLevel, details,
    daysLeft, temperature, humidity, location, quantity, value,
    batchNumber = null   // ← new param
  ) {
    await pool.query(
      `
      INSERT INTO alerts (
        business_id, product_id, product_name, risk_level,
        details, days_left, temperature, humidity, location,
        quantity, value, status, batch_number
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',$12)
      `,
      [businessId, productId, productName, riskLevel, details,
       daysLeft, temperature, humidity, location, quantity, value, batchNumber]
    );
  },


  async getAll() {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM alerts
      WHERE status = 'active'
      ORDER BY
        CASE risk_level WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
        created_at DESC
      `
    );
    return rows;
  },

  async create(alertData) {
    const { rows } = await pool.query(
      `
      INSERT INTO alerts (
        product_id,
        product_name,
        alert_type,
        risk_level,
        details,
        days_left,
        temperature,
        humidity,
        location
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id
      `,
      [
        alertData.product_id,
        alertData.product_name,
        alertData.alert_type,
        alertData.risk_level,
        alertData.details,
        alertData.days_left,
        alertData.temperature,
        alertData.humidity,
        alertData.location
      ]
    );
    return rows[0].id;
  },

  async delete(id) {
    await pool.query('DELETE FROM alerts WHERE id = $1', [id]);
  },

  async getStats() {
    const { rows } = await pool.query(
      `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN risk_level = 'MEDIUM' THEN 1 ELSE 0 END) as medium_risk,
        SUM(CASE WHEN risk_level = 'LOW' THEN 1 ELSE 0 END) as low_risk
      FROM alerts
      WHERE status = 'active'
      `
    );
    return rows[0];
  }
};

module.exports = AlertModel;
