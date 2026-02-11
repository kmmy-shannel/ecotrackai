const pool = require('../config/database');

class Alert {
  static async createAlertsTable() {
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
      console.error(' Error creating alerts table:', error);
      throw error;
    }
  }

  static async getAll() {
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
  }

  static async getByRiskLevel(riskLevel) {
    const query = `
      SELECT * FROM alerts 
      WHERE risk_level = $1 AND status = 'active'
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query, [riskLevel]);
    return rows;
  }

  static async create(alertData) {
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
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
    await pool.query(query, [status, id]);
  }

  static async delete(id) {
    const query = 'DELETE FROM alerts WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async getStats() {
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
  }
}

module.exports = Alert;