const pool = require('../config/database');

/**
 * USER MODEL
 * MVVM Layer: Model
 * Responsibility: Database queries ONLY - no business logic
 */

const UserModel = {

  // ─── FIND QUERIES ──────────────────────────────────────────

  async findByEmailOrUsername(email, username) {
    const { rows } = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT u.*, b.business_name 
       FROM users u
       JOIN business_profiles b ON u.business_id = b.business_id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );
    return rows[0] || null;
  },

  async findByEmailBasic(email) {
    const { rows } = await pool.query(
      'SELECT user_id, username, full_name, email_verified FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  },

  async findByEmailWithBusiness(email) {
    const { rows } = await pool.query(
      `SELECT u.*, b.business_name 
       FROM users u
       JOIN business_profiles b ON u.business_id = b.business_id
       WHERE u.email = $1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(userId) {
    const { rows } = await pool.query(
      `SELECT 
        u.user_id, u.username, u.email, u.full_name, u.role, u.is_active,
        u.created_at, u.last_login, u.email_verified,
        b.business_id, b.business_name, b.business_type, b.registration_number,
        b.address, b.contact_email, b.contact_phone,
        e.current_score as ecotrust_score, e.level as ecotrust_level, e.rank as ecotrust_rank
       FROM users u
       JOIN business_profiles b ON u.business_id = b.business_id
       LEFT JOIN ecotrust_scores e ON b.business_id = e.business_id
       WHERE u.user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  },

  async findByResetToken(token) {
    const { rows } = await pool.query(
      `SELECT user_id, email, username 
       FROM users 
       WHERE reset_password_token = $1 
       AND reset_password_expires > NOW()
       AND is_active = true`,
      [token]
    );
    return rows[0] || null;
  },

  async findActiveByEmail(email) {
    const { rows } = await pool.query(
      'SELECT user_id, username, full_name FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    return rows[0] || null;
  },

  // ─── CREATE QUERIES ────────────────────────────────────────

  async createBusiness(client, { businessName, businessType, registrationNumber, address, contactEmail, contactPhone }) {
    const { rows } = await client.query(
      `INSERT INTO business_profiles 
       (business_name, business_type, registration_number, address, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING business_id`,
      [businessName, businessType, registrationNumber, address, contactEmail, contactPhone]
    );
    return rows[0].business_id;
  },

  async createUser(client, { businessId, username, email, hashedPassword, fullName, firstName, lastName, role, otp, otpExpires }) {
    const { rows } = await client.query(
      `INSERT INTO users 
       (business_id, username, email, password_hash, full_name, first_name, last_name, role, 
        email_verified, verification_code, verification_code_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING user_id, username, email, full_name, role`,
      [businessId, username, email, hashedPassword, fullName, firstName, lastName,
       role || 'admin', false, otp, otpExpires]
    );
    return rows[0];
  },

  async initEcoTrustScore(client, businessId) {
    await client.query(
      'INSERT INTO ecotrust_scores (business_id) VALUES ($1)',
      [businessId]
    );
  },

  async createSession(userId, token, expiresAt, ip, userAgent) {
    await pool.query(
      `INSERT INTO user_sessions (user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, token, expiresAt, ip, userAgent]
    );
  },

  // ─── UPDATE QUERIES ────────────────────────────────────────

  async updateOTP(userId, otp, otpExpires) {
    await pool.query(
      'UPDATE users SET verification_code = $1, verification_code_expires = $2 WHERE user_id = $3',
      [otp, otpExpires, userId]
    );
  },

  async markEmailVerified(userId) {
    await pool.query(
      `UPDATE users 
       SET email_verified = true, 
           verification_code = NULL, 
           verification_code_expires = NULL,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  },

  async updateLastLogin(userId) {
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [userId]
    );
  },

  async saveResetToken(userId, resetToken, resetTokenExpires) {
    await pool.query(
      `UPDATE users 
       SET reset_password_token = $1, 
           reset_password_expires = $2,
           updated_at = NOW()
       WHERE user_id = $3`,
      [resetToken, resetTokenExpires, userId]
    );
  },

  async updatePassword(userId, hashedPassword) {
    await pool.query(
      `UPDATE users 
       SET password_hash = $1,
           reset_password_token = NULL,
           reset_password_expires = NULL,
           updated_at = NOW()
       WHERE user_id = $2`,
      [hashedPassword, userId]
    );
  },

  async updateProfile(userId, updates, values) {
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE user_id = $${values.length + 1}
      RETURNING user_id, username, email, full_name, role
    `;
    const { rows } = await pool.query(query, [...values, userId]);
    return rows[0];
  },

  async getPasswordHash(userId) {
    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [userId]
    );
    return rows[0]?.password_hash || null;
  },

  async checkEmailOrUsernameExists(email, username, excludeUserId) {
    const { rows } = await pool.query(
      'SELECT user_id FROM users WHERE (email = $1 OR username = $2) AND user_id != $3',
      [email, username, excludeUserId]
    );
    return rows.length > 0;
  },

  // ─── DELETE / SESSION QUERIES ──────────────────────────────

  async deleteSession(token) {
    await pool.query(
      'DELETE FROM user_sessions WHERE token = $1',
      [token]
    );
  },

  async deleteAllSessions(userId) {
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [userId]
    );
  },

  async deleteOtherSessions(userId, currentToken) {
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1 AND token != $2',
      [userId, currentToken]
    );
  }
};

module.exports = UserModel;