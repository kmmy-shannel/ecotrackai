const pool = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password.utils');
const { generateToken } = require('../utils/jwt.utils');
const { sendSuccess, sendError } = require('../utils/response.utils');

// Register new user and business
const register = async (req, res) => {
  const client = await pool.connect();
  
  try {
    
    console.log('REGISTRATION ATTEMPT');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    
    await client.query('BEGIN');

    const {
      businessName,
      businessType,
      registrationNumber,
      address,
      contactEmail,
      contactPhone,
      username,
      email,
      password,
      fullName,
      role
    } = req.body;

    console.log('✅ Extracted fields:', {
      businessName,
      username,
      email,
      fullName,
      hasPassword: !!password
    });

    // Validate required fields
    if (!businessName || !username || !email || !password) {
      console.log('Missing required fields');
      await client.query('ROLLBACK');
      return sendError(res, 400, 'Please provide all required fields');
    }

    // Check if user already exists
    console.log('Checking for existing user...');
    const userCheck = await client.query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (userCheck.rows.length > 0) {
      console.log('User already exists');
      await client.query('ROLLBACK');
      return sendError(res, 400, 'User with this email or username already exists');
    }

    // Create business profile
    console.log('Creating business profile...');
    const businessQuery = `
      INSERT INTO business_profiles 
      (business_name, business_type, registration_number, address, contact_email, contact_phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING business_id
    `;
    
    const businessResult = await client.query(businessQuery, [
      businessName,
      businessType,
      registrationNumber,
      address,
      contactEmail,
      contactPhone
    ]);

    const businessId = businessResult.rows[0].business_id;
    console.log('Business created with ID:', businessId);

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await hashPassword(password);
    console.log('Password hashed successfully');

    // Create user
    console.log('Creating user account...');
    const userQuery = `
      INSERT INTO users 
      (business_id, username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, username, email, full_name, role
    `;
    
    const userResult = await client.query(userQuery, [
      businessId,
      username,
      email,
      hashedPassword,
      fullName,
      role || 'admin'
    ]);

    const user = userResult.rows[0];
    console.log('User created with ID:', user.user_id);

    // Initialize EcoTrust score
    console.log('Creating EcoTrust score...');
    await client.query(
      'INSERT INTO ecotrust_scores (business_id) VALUES ($1)',
      [businessId]
    );
    console.log('EcoTrust score initialized');

    await client.query('COMMIT');
    console.log('Transaction committed successfully');

    // Generate token
    console.log('Generating JWT token...');
    const token = generateToken({
      userId: user.user_id,
      businessId: businessId,
      role: user.role
    });
    console.log('Token generated');

    // Create session
    console.log('Creating session...');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await pool.query(
      `INSERT INTO user_sessions (user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.user_id, token, expiresAt, req.ip, req.get('user-agent')]
    );
    console.log(' Session created successfully');

    
    console.log(' REGISTRATION COMPLETED SUCCESSFULLY');
   

    sendSuccess(res, 201, 'Registration successful', {
      user: {
        userId: user.user_id,
        businessId,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      },
      token
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('========================================');
    console.error('REGISTRATION ERROR');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('========================================');
    sendError(res, 500, 'Registration failed', error.message);
  } finally {
    client.release();
  }
};
// Login user
const login = async (req, res) => {
  try {
    console.log('========================================');
    console.log('LOGIN ATTEMPT');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('========================================');

    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return sendError(res, 400, 'Please provide email and password');
    }

    console.log('Looking up user...');
    const query = `
      SELECT u.*, b.business_name 
      FROM users u
      JOIN business_profiles b ON u.business_id = b.business_id
      WHERE u.email = $1 AND u.is_active = true
    `;
    
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      console.log('User not found or inactive');
      return sendError(res, 401, 'Invalid credentials');
    }

    const user = rows[0];
    console.log('User found:', user.username);

    console.log('Verifying password...');
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      console.log('Invalid password');
      return sendError(res, 401, 'Invalid credentials');
    }

    console.log('Password valid');

    console.log('Generating token...');
    const token = generateToken({
      userId: user.user_id,
      businessId: user.business_id,
      role: user.role
    });
    console.log('Token generated');

    console.log('Creating session...');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await pool.query(
      `INSERT INTO user_sessions (user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.user_id, token, expiresAt, req.ip, req.get('user-agent')]
    );
    console.log('Session created');

    console.log('Updating last login...');
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    
    console.log('LOGIN SUCCESSFUL');
    

    sendSuccess(res, 200, 'Login successful', {
      user: {
        userId: user.user_id,
        businessId: user.business_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        businessName: user.business_name
      },
      token
    });

  } catch (error) {
    console.error('========================================');
    console.error('LOGIN ERROR');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('========================================');
    sendError(res, 500, 'Login failed', error.message);
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 400, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    await pool.query(
      'DELETE FROM user_sessions WHERE token = $1',
      [token]
    );

    sendSuccess(res, 200, 'Logout successful');

  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 500, 'Logout failed', error);
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const query = `
      SELECT 
        u.user_id, u.username, u.email, u.full_name, u.role, u.is_active,
        u.created_at, u.last_login,
        b.business_id, b.business_name, b.business_type, b.registration_number,
        b.address, b.contact_email, b.contact_phone,
        e.current_score as ecotrust_score, e.level as ecotrust_level, e.rank as ecotrust_rank
      FROM users u
      JOIN business_profiles b ON u.business_id = b.business_id
      LEFT JOIN ecotrust_scores e ON b.business_id = e.business_id
      WHERE u.user_id = $1
    `;

    const { rows } = await pool.query(query, [req.user.userId]);

    if (rows.length === 0) {
      return sendError(res, 404, 'User not found');
    }

    const profile = rows[0];

    sendSuccess(res, 200, 'Profile retrieved successfully', {
      user: {
        userId: profile.user_id,
        username: profile.username,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        isActive: profile.is_active,
        lastLogin: profile.last_login,
        createdAt: profile.created_at
      },
      business: {
        businessId: profile.business_id,
        businessName: profile.business_name,
        businessType: profile.business_type,
        registrationNumber: profile.registration_number,
        address: profile.address,
        contactEmail: profile.contact_email,
        contactPhone: profile.contact_phone
      },
      ecoTrust: {
        score: profile.ecotrust_score,
        level: profile.ecotrust_level,
        rank: profile.ecotrust_rank
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    sendError(res, 500, 'Failed to retrieve profile', error);
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { fullName, email, username } = req.body;
    const userId = req.user.userId;

    if (email || username) {
      const checkQuery = `
        SELECT user_id FROM users 
        WHERE (email = $1 OR username = $2) AND user_id != $3
      `;
      const { rows } = await pool.query(checkQuery, [email, username, userId]);

      if (rows.length > 0) {
        return sendError(res, 400, 'Email or username already taken');
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fullName) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (email) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (username) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }

    if (updates.length === 0) {
      return sendError(res, 400, 'No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING user_id, username, email, full_name, role
    `;

    const result = await pool.query(updateQuery, values);

    sendSuccess(res, 200, 'Profile updated successfully', {
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, 500, 'Failed to update profile', error);
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Not authenticated');
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Please provide current and new password');
    }

    if (newPassword.length < 6) {
      return sendError(res, 400, 'New password must be at least 6 characters');
    }

    const { rows } = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (rows.length === 0) {
      return sendError(res, 404, 'User not found');
    }

    const isPasswordValid = await comparePassword(
      currentPassword,
      rows[0].password_hash
    );

    if (!isPasswordValid) {
      return sendError(res, 401, 'Current password is incorrect');
    }

    const hashedPassword = await hashPassword(newPassword);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [hashedPassword, req.user.userId]
    );

    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.split(' ')[1];

    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1 AND token != $2',
      [req.user.userId, currentToken]
    );

    sendSuccess(res, 200, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    sendError(res, 500, 'Failed to change password', error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword
};