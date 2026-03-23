const pool = require('../config/database');

const SAFE_PROFILE_UPDATE_PATTERN = /^(full_name|email|username)\s*=\s*\$\d+$/;

const UserModel = {
  _isNil(value) {
    return value === null || value === undefined;
  },

  _handleDbError(method, error) {
    console.error(`[UserModel.${method}]`, error);
    if (error && error.code === '23503') {
      return 'Foreign key constraint violation';
    }
    return 'Database operation failed';
  },

  async findByEmailOrUsername(email, username) {
    if (this._isNil(email) || this._isNil(username)) {
      return { success: false, error: 'email and username are required' };
    }

    try {
      const query = 'SELECT user_id FROM users WHERE email = $1 OR username = $2';
      const { rows } = await pool.query(query, [email, username]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByEmailOrUsername', error) };
    }
  },

  async findByEmail(email) {
    if (this._isNil(email)) {
      return { success: false, error: 'email is required' };
    }

    try {
      const query = `
        SELECT
          u.*,
          COALESCE(b.business_name, 'EcoTrackAI Platform') AS business_name
        FROM users u
        LEFT JOIN business_profiles b ON u.business_id = b.business_id
        WHERE u.email = $1
          AND u.is_active = true
      `;
      const { rows } = await pool.query(query, [email]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByEmail', error) };
    }
  },

  async findByLoginIdentifier(identifier) {
    if (this._isNil(identifier)) {
      return { success: false, error: 'identifier is required' };
    }

    const normalized = String(identifier).trim();
    if (!normalized) {
      return { success: false, error: 'identifier is required' };
    }

    try {
      const query = `
        SELECT
          u.*,
          COALESCE(b.business_name, 'EcoTrackAI Platform') AS business_name
        FROM users u
        LEFT JOIN business_profiles b ON u.business_id = b.business_id
        WHERE (LOWER(u.email) = LOWER($1) OR LOWER(u.username) = LOWER($1))
          AND u.is_active = true
        ORDER BY CASE WHEN LOWER(u.email) = LOWER($1) THEN 0 ELSE 1 END
        LIMIT 1
      `;
      const { rows } = await pool.query(query, [normalized]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return {
        success: false,
        error: this._handleDbError('findByLoginIdentifier', error)
      };
    }
  },

  async findByEmailBasic(email) {
    if (this._isNil(email)) {
      return { success: false, error: 'email is required' };
    }

    try {
      const query = 'SELECT user_id, username, full_name, email_verified FROM users WHERE email = $1';
      const { rows } = await pool.query(query, [email]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByEmailBasic', error) };
    }
  },

  async findByEmailWithBusiness(email) {
    if (this._isNil(email)) {
      return { success: false, error: 'email is required' };
    }

    try {
      const query = `
        SELECT
          u.*,
          COALESCE(b.business_name, 'EcoTrackAI Platform') AS business_name
        FROM users u
        LEFT JOIN business_profiles b ON u.business_id = b.business_id
        WHERE u.email = $1
      `;
      const { rows } = await pool.query(query, [email]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByEmailWithBusiness', error) };
    }
  },

  async findById(userId, businessId = null) {
    if (this._isNil(userId)) {
      return { success: false, error: 'userId is required' };
    }

    try {
      let query = `
        SELECT
          u.user_id, u.username, u.email, u.full_name, u.role, u.is_active,
          u.created_at, u.last_login, u.email_verified,
          b.business_id, COALESCE(b.business_name, 'EcoTrackAI Platform') AS business_name, b.business_type, b.registration_number,
          b.address, b.contact_email, b.contact_phone,
          e.current_score AS ecotrust_score, e.level AS ecotrust_level, e.rank AS ecotrust_rank
        FROM users u
        LEFT JOIN business_profiles b ON u.business_id = b.business_id
        LEFT JOIN ecotrust_scores e ON b.business_id = e.business_id
        WHERE u.user_id = $1
      `;
      const params = [userId];

      if (!this._isNil(businessId)) {
        query += ' AND u.business_id = $2';
        params.push(businessId);
      }

      const { rows } = await pool.query(query, params);
      if (rows.length === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('findById', error) };
    }
  },

  async findByResetToken(token) {
    if (this._isNil(token)) {
      return { success: false, error: 'token is required' };
    }

    try {
      const query = `
        SELECT user_id, email, username
        FROM users
        WHERE reset_password_token = $1
          AND reset_password_expires > NOW()
          AND is_active = true
      `;
      const { rows } = await pool.query(query, [token]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findByResetToken', error) };
    }
  },

  async findActiveByEmail(email) {
    if (this._isNil(email)) {
      return { success: false, error: 'email is required' };
    }

    try {
      const query = `
        SELECT user_id, username, full_name
        FROM users
        WHERE email = $1
          AND is_active = true
      `;
      const { rows } = await pool.query(query, [email]);
      return { success: true, data: rows[0] || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('findActiveByEmail', error) };
    }
  },

  async createBusiness(client, payload) {
    if (!client) {
      return { success: false, error: 'client is required' };
    }
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'business payload is required' };
    }

    const {
      businessName,
      businessType,
      registrationNumber,
      address,
      contactEmail,
      contactPhone
    } = payload;

    if (this._isNil(businessName)) {
      return { success: false, error: 'businessName is required' };
    }

    try {
      const query = `
        INSERT INTO business_profiles
          (business_name, business_type, registration_number, address, contact_email, contact_phone)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING business_id
      `;

      const { rows } = await client.query(query, [
        businessName,
        businessType,
        registrationNumber,
        address,
        contactEmail,
        contactPhone
      ]);

      return { success: true, data: rows[0].business_id };
    } catch (error) {
      return { success: false, error: this._handleDbError('createBusiness', error) };
    }
  },

  async createUser(client, payload) {
    if (!client) {
      return { success: false, error: 'client is required' };
    }
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'user payload is required' };
    }

    const {
      businessId,
      username,
      email,
      hashedPassword,
      fullName,
      firstName,
      lastName,
      role,
      otp,
      otpExpires
    } = payload;

    if (this._isNil(businessId) || this._isNil(username) || this._isNil(email) || this._isNil(hashedPassword)) {
      return { success: false, error: 'businessId, username, email, and hashedPassword are required' };
    }

    try {
      const query = `
        INSERT INTO users
          (business_id, username, email, password_hash, full_name, first_name, last_name, role,
           email_verified, verification_code, verification_code_expires)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING user_id, username, email, full_name, role
      `;

      const { rows } = await client.query(query, [
        businessId,
        username,
        email,
        hashedPassword,
        fullName,
        firstName,
        lastName,
        role || 'admin',
        false,
        otp,
        otpExpires
      ]);

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('createUser', error) };
    }
  },

  async initEcoTrustScore(client, businessId) {
    if (!client) {
      return { success: false, error: 'client is required' };
    }
    if (this._isNil(businessId)) {
      return { success: false, error: 'businessId is required' };
    }

    try {
      const query = 'INSERT INTO ecotrust_scores (business_id) VALUES ($1) RETURNING business_id';
      const { rows } = await client.query(query, [businessId]);
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('initEcoTrustScore', error) };
    }
  },

  async createSession(userId, token, expiresAt, ip, userAgent, businessId = null) {
    if (this._isNil(userId) || this._isNil(token) || this._isNil(expiresAt)) {
      return { success: false, error: 'userId, token, and expiresAt are required' };
    }

    try {
      const verifyQuery = `
        SELECT user_id
        FROM users
        WHERE user_id = $1
          ${this._isNil(businessId) ? '' : 'AND business_id = $2'}
      `;
      const verifyParams = this._isNil(businessId) ? [userId] : [userId, businessId];
      const verify = await pool.query(verifyQuery, verifyParams);

      if (verify.rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      const query = `
        INSERT INTO user_sessions (user_id, token, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING session_id
      `;
      const { rows } = await pool.query(query, [userId, token, expiresAt, ip, userAgent]);
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('createSession', error) };
    }
  },

  async updateOTP(userId, otp, otpExpires, businessId = null) {
    if (this._isNil(userId) || this._isNil(otp) || this._isNil(otpExpires)) {
      return { success: false, error: 'userId, otp, and otpExpires are required' };
    }

    try {
      let query = `
        UPDATE users
        SET verification_code = $1,
            verification_code_expires = $2
        WHERE user_id = $3
      `;
      const params = [otp, otpExpires, userId];

      if (!this._isNil(businessId)) {
        query += ' AND business_id = $4';
        params.push(businessId);
      }
      query += ' RETURNING user_id';

      const { rows, rowCount } = await pool.query(query, params);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('updateOTP', error) };
    }
  },

  async markEmailVerified(userId, businessId = null) {
    if (this._isNil(userId)) {
      return { success: false, error: 'userId is required' };
    }

    try {
      let query = `
        UPDATE users
        SET email_verified = true,
            verification_code = NULL,
            verification_code_expires = NULL,
            updated_at = NOW()
        WHERE user_id = $1
      `;
      const params = [userId];

      if (!this._isNil(businessId)) {
        query += ' AND business_id = $2';
        params.push(businessId);
      }
      query += ' RETURNING user_id';

      const { rows, rowCount } = await pool.query(query, params);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('markEmailVerified', error) };
    }
  },

  async updateLastLogin(userId, businessId = null) {
    if (this._isNil(userId)) {
      return { success: false, error: 'userId is required' };
    }

    try {
      let query = 'UPDATE users SET last_login = NOW() WHERE user_id = $1';
      const params = [userId];

      if (!this._isNil(businessId)) {
        query += ' AND business_id = $2';
        params.push(businessId);
      }
      query += ' RETURNING user_id';

      const { rows, rowCount } = await pool.query(query, params);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('updateLastLogin', error) };
    }
  },

  async saveResetToken(userId, resetToken, resetTokenExpires, businessId = null) {
    if (this._isNil(userId) || this._isNil(resetToken) || this._isNil(resetTokenExpires)) {
      return { success: false, error: 'userId, resetToken, and resetTokenExpires are required' };
    }

    try {
      let query = `
        UPDATE users
        SET reset_password_token = $1,
            reset_password_expires = $2,
            updated_at = NOW()
        WHERE user_id = $3
      `;
      const params = [resetToken, resetTokenExpires, userId];

      if (!this._isNil(businessId)) {
        query += ' AND business_id = $4';
        params.push(businessId);
      }
      query += ' RETURNING user_id';

      const { rows, rowCount } = await pool.query(query, params);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('saveResetToken', error) };
    }
  },

  async updatePassword(userId, hashedPassword, businessId = null) {
    if (this._isNil(userId) || this._isNil(hashedPassword)) {
      return { success: false, error: 'userId and hashedPassword are required' };
    }

    try {
      let query = `
        UPDATE users
        SET password_hash = $1,
            reset_password_token = NULL,
            reset_password_expires = NULL,
            updated_at = NOW()
        WHERE user_id = $2
      `;
      const params = [hashedPassword, userId];

      if (!this._isNil(businessId)) {
        query += ' AND business_id = $3';
        params.push(businessId);
      }
      query += ' RETURNING user_id';

      const { rows, rowCount } = await pool.query(query, params);
      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('updatePassword', error) };
    }
  },

  async updateProfile(userId, updates, values, businessId = null) {
    if (this._isNil(userId)) {
      return { success: false, error: 'userId is required' };
    }
    if (!Array.isArray(updates) || updates.length === 0 || !Array.isArray(values)) {
      return { success: false, error: 'updates and values are required' };
    }

    const allSafe = updates.every((segment) => SAFE_PROFILE_UPDATE_PATTERN.test(String(segment).trim()));
    if (!allSafe) {
      return { success: false, error: 'Invalid update fields' };
    }

    try {
      let query = `
        UPDATE users
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $${values.length + 1}
      `;
      const params = [...values, userId];

      if (!this._isNil(businessId)) {
        query += ` AND business_id = $${values.length + 2}`;
        params.push(businessId);
      }

      query += ' RETURNING user_id, username, email, full_name, role';
      const { rows, rowCount } = await pool.query(query, params);

      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('updateProfile', error) };
    }
  },

  async getPasswordHash(userId, businessId = null) {
    if (this._isNil(userId)) {
      return { success: false, error: 'userId is required' };
    }

    try {
      let query = 'SELECT password_hash FROM users WHERE user_id = $1';
      const params = [userId];

      if (!this._isNil(businessId)) {
        query += ' AND business_id = $2';
        params.push(businessId);
      }

      const { rows } = await pool.query(query, params);
      if (rows.length === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }

      return { success: true, data: rows[0].password_hash || null };
    } catch (error) {
      return { success: false, error: this._handleDbError('getPasswordHash', error) };
    }
  },

  async checkEmailOrUsernameExists(email, username, excludeUserId, businessId = null) {
    if (this._isNil(email) || this._isNil(username) || this._isNil(excludeUserId)) {
      return { success: false, error: 'email, username, and excludeUserId are required' };
    }

    try {
      let query = `
        SELECT user_id
        FROM users
        WHERE (email = $1 OR username = $2)
          AND user_id != $3
      `;
      const params = [email, username, excludeUserId];

      if (!this._isNil(businessId)) {
        query += ' AND business_id = $4';
        params.push(businessId);
      }

      const { rows } = await pool.query(query, params);
      return { success: true, data: rows.length > 0 };
    } catch (error) {
      return { success: false, error: this._handleDbError('checkEmailOrUsernameExists', error) };
    }
  },

  async deleteSession(token, businessId = null) {
    if (this._isNil(token)) {
      return { success: false, error: 'token is required' };
    }

    try {
      let query = `
        DELETE FROM user_sessions
        WHERE token = $1
      `;
      const params = [token];

      if (!this._isNil(businessId)) {
        query += `
          AND user_id IN (
            SELECT user_id FROM users WHERE business_id = $2
          )
        `;
        params.push(businessId);
      }

      query += ' RETURNING session_id';
      const { rows, rowCount } = await pool.query(query, params);

      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      return { success: false, error: this._handleDbError('deleteSession', error) };
    }
  },

  async deleteAllSessions(userId, businessId = null) {
    if (this._isNil(userId)) {
      return { success: false, error: 'userId is required' };
    }

    try {
      let query = `
        DELETE FROM user_sessions
        WHERE user_id = $1
      `;
      const params = [userId];

      if (!this._isNil(businessId)) {
        query += `
          AND user_id IN (
            SELECT user_id FROM users WHERE business_id = $2
          )
        `;
        params.push(businessId);
      }

      query += ' RETURNING session_id';
      const { rows, rowCount } = await pool.query(query, params);

      if (rowCount === 0) {
        return { success: false, error: 'Not found or unauthorized' };
      }
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('deleteAllSessions', error) };
    }
  },

  async deleteOtherSessions(userId, currentToken, businessId = null) {
    if (this._isNil(userId) || this._isNil(currentToken)) {
      return { success: false, error: 'userId and currentToken are required' };
    }

    try {
      let query = `
        DELETE FROM user_sessions
        WHERE user_id = $1
          AND token != $2
      `;
      const params = [userId, currentToken];

      if (!this._isNil(businessId)) {
        query += `
          AND user_id IN (
            SELECT user_id FROM users WHERE business_id = $3
          )
        `;
        params.push(businessId);
      }

      query += ' RETURNING session_id';
      const { rows } = await pool.query(query, params);
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: this._handleDbError('deleteOtherSessions', error) };
    }
  },

  async findSuperAdminCount() {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM users
        WHERE role = 'super_admin' AND is_active = true
      `;
      const { rows } = await pool.query(query);
      return { success: true, data: parseInt(rows[0].count) };
    } catch (error) {
      return { success: false, error: this._handleDbError('findSuperAdminCount', error) };
    }
  }
};

module.exports = UserModel;
