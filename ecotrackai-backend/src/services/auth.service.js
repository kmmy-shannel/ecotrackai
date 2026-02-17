const pool = require('../config/database');
const UserModel = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/password.utils');
const { generateToken } = require('../utils/jwt.utils');
const { generateOTP, generateResetToken } = require('../utils/otp.utils');
const emailService = require('./email.service');

/**
 * AUTH SERVICE
 * MVVM Layer: Service (ViewModel equivalent for backend)
 * Responsibility: Business logic ONLY - calls Model for DB, handles logic
 */

const AuthService = {

  // ─── REGISTER ──────────────────────────────────────────────

  async register(data) {
    const client = await pool.connect();

    try {
      console.log('REGISTRATION ATTEMPT');
      await client.query('BEGIN');

      const {
        businessName, businessType, registrationNumber,
        address, contactEmail, contactPhone,
        firstName, lastName, username, email, password,
        fullName, role
      } = data;

      // Validate required fields
      if (!businessName || !username || !email || !password || !firstName || !lastName) {
        throw { status: 400, message: 'Please provide all required fields' };
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmailOrUsername(email, username);
      if (existingUser) {
        throw { status: 400, message: 'User with this email or username already exists' };
      }

      // Create business profile
      const businessId = await UserModel.createBusiness(client, {
        businessName, businessType, registrationNumber,
        address, contactEmail, contactPhone
      });
      console.log('✅ Business created with ID:', businessId);

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate OTP
      const otp = generateOTP();
      const otpExpires = new Date();
      otpExpires.setMinutes(otpExpires.getMinutes() + 10);

      // Create user
      const user = await UserModel.createUser(client, {
        businessId, username, email, hashedPassword,
        fullName: fullName || `${firstName} ${lastName}`,
        firstName, lastName, role, otp, otpExpires
      });
      console.log('✅ User created with ID:', user.user_id);

      // Initialize EcoTrust score
      await UserModel.initEcoTrustScore(client, businessId);

      await client.query('COMMIT');
      console.log('✅ Transaction committed');

      // Send OTP email (non-blocking - don't fail registration)
      try {
        await emailService.sendVerificationEmail(
          email, otp, fullName || username
        );
        console.log('✅ Verification email sent');
      } catch (emailError) {
        console.error('⚠️ Failed to send verification email:', emailError);
      }

      return {
        user: {
          userId: user.user_id,
          businessId,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          emailVerified: false
        },
        requiresVerification: true
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // ─── SEND OTP ──────────────────────────────────────────────

  async sendOTP(email) {
    if (!email) {
      throw { status: 400, message: 'Email is required' };
    }

    const user = await UserModel.findByEmailBasic(email);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    if (user.email_verified) {
      throw { status: 400, message: 'Email already verified' };
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date();
    otpExpires.setMinutes(otpExpires.getMinutes() + 10);

    await UserModel.updateOTP(user.user_id, otp, otpExpires);
    await emailService.sendVerificationEmail(
      email, otp, user.full_name || user.username
    );

    console.log('✅ New OTP sent to:', email);
    return true;
  },

  // ─── VERIFY OTP ────────────────────────────────────────────

  async verifyOTP(email, otp, ip, userAgent) {
    if (!email || !otp) {
      throw { status: 400, message: 'Email and OTP are required' };
    }

    const user = await UserModel.findByEmailWithBusiness(email);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    if (user.email_verified) {
      throw { status: 400, message: 'Email already verified' };
    }

    if (user.verification_code !== otp) {
      throw { status: 400, message: 'Invalid verification code' };
    }

    if (new Date() > new Date(user.verification_code_expires)) {
      throw { status: 400, message: 'Verification code has expired. Please request a new one.' };
    }

    // Mark email as verified
    await UserModel.markEmailVerified(user.user_id);

    // Generate token and session
    const token = generateToken({
      userId: user.user_id,
      businessId: user.business_id,
      role: user.role
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await UserModel.createSession(user.user_id, token, expiresAt, ip, userAgent);

    console.log('✅ Email verified successfully for:', email);

    return {
      user: {
        userId: user.user_id,
        businessId: user.business_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        businessName: user.business_name,
        emailVerified: true
      },
      token
    };
  },

  // ─── FORGOT PASSWORD ───────────────────────────────────────

  async forgotPassword(email) {
    if (!email) {
      throw { status: 400, message: 'Email is required' };
    }

    const user = await UserModel.findActiveByEmail(email);

    // Always return success even if user not found (security best practice)
    if (!user) {
      console.log('⚠️ User not found, but returning success for security');
      return true;
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

    await UserModel.saveResetToken(user.user_id, resetToken, resetTokenExpires);
    await emailService.sendPasswordResetEmail(
      email, resetToken, user.full_name || user.username
    );

    console.log('✅ Password reset email sent to:', email);
    return true;
  },

  // ─── RESET PASSWORD ────────────────────────────────────────

  async resetPassword(token, password) {
    if (!password) {
      throw { status: 400, message: 'Password is required' };
    }

    if (password.length < 8 || password.length > 16) {
      throw { status: 400, message: 'Password must be 8-16 characters' };
    }

    if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      throw { status: 400, message: 'Password must contain both letters and numbers' };
    }

    const user = await UserModel.findByResetToken(token);
    if (!user) {
      throw { status: 400, message: 'Invalid or expired reset token' };
    }

    const hashedPassword = await hashPassword(password);
    await UserModel.updatePassword(user.user_id, hashedPassword);
    await UserModel.deleteAllSessions(user.user_id);

    console.log('✅ Password reset successful for:', user.email);
    return true;
  },

  // ─── LOGIN ─────────────────────────────────────────────────

  async login(email, password, ip, userAgent) {
    console.log('LOGIN ATTEMPT');

    if (!email || !password) {
      throw { status: 400, message: 'Please provide email and password' };
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw { status: 401, message: 'Invalid credentials' };
    }
    console.log('User found:', user.username);

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw { status: 401, message: 'Invalid credentials' };
    }
    console.log('Password valid');

    // Generate token
    const token = generateToken({
      userId: user.user_id,
      businessId: user.business_id,
      role: user.role
    });

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await UserModel.createSession(user.user_id, token, expiresAt, ip, userAgent);

    // Update last login
    await UserModel.updateLastLogin(user.user_id);

    console.log('LOGIN SUCCESSFUL');

    return {
      user: {
        userId: user.user_id,
        businessId: user.business_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        businessName: user.business_name,
        emailVerified: user.email_verified
      },
      token
    };
  },

  // ─── LOGOUT ────────────────────────────────────────────────

  async logout(token) {
    if (!token) {
      throw { status: 400, message: 'No token provided' };
    }
    await UserModel.deleteSession(token);
    return true;
  },

  // ─── GET PROFILE ───────────────────────────────────────────

  async getProfile(userId) {
    const profile = await UserModel.findById(userId);
    if (!profile) {
      throw { status: 404, message: 'User not found' };
    }

    return {
      user: {
        userId: profile.user_id,
        username: profile.username,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        isActive: profile.is_active,
        emailVerified: profile.email_verified,
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
    };
  },

  // ─── UPDATE PROFILE ────────────────────────────────────────

  async updateProfile(userId, { fullName, email, username }) {
    // Check if email/username already taken by someone else
    if (email || username) {
      const taken = await UserModel.checkEmailOrUsernameExists(
        email, username, userId
      );
      if (taken) {
        throw { status: 400, message: 'Email or username already taken' };
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fullName) { updates.push(`full_name = $${paramCount++}`); values.push(fullName); }
    if (email)    { updates.push(`email = $${paramCount++}`);     values.push(email); }
    if (username) { updates.push(`username = $${paramCount++}`);  values.push(username); }

    if (updates.length === 0) {
      throw { status: 400, message: 'No fields to update' };
    }

    const updatedUser = await UserModel.updateProfile(userId, updates, values);
    return { user: updatedUser };
  },

  // ─── CHANGE PASSWORD ───────────────────────────────────────

  async changePassword(userId, currentPassword, newPassword, currentToken) {
    if (!currentPassword || !newPassword) {
      throw { status: 400, message: 'Please provide current and new password' };
    }

    if (newPassword.length < 8 || newPassword.length > 16) {
      throw { status: 400, message: 'New password must be 8-16 characters' };
    }

    if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
      throw { status: 400, message: 'Password must contain both letters and numbers' };
    }

    const passwordHash = await UserModel.getPasswordHash(userId);
    if (!passwordHash) {
      throw { status: 404, message: 'User not found' };
    }

    const isPasswordValid = await comparePassword(currentPassword, passwordHash);
    if (!isPasswordValid) {
      throw { status: 401, message: 'Current password is incorrect' };
    }

    const hashedPassword = await hashPassword(newPassword);
    await UserModel.updatePassword(userId, hashedPassword);
    await UserModel.deleteOtherSessions(userId, currentToken);

    return true;
  }
};

module.exports = AuthService;