const pool = require('../config/database');
const UserModel = require('../models/user.model');
const { hashPassword, comparePassword } = require('../utils/password.utils');
const { generateToken } = require('../utils/jwt.utils');
const { generateOTP, generateResetToken } = require('../utils/otp.utils');
const emailService = require('./email.service');

const AuthService = {
  _ok(data = null) {
    return { success: true, data };
  },

  _fail(error) {
    return { success: false, error };
  },

  _isNil(value) {
    return value === null || value === undefined;
  },

  _extractAuthContext(user) {
    if (!user || typeof user !== 'object') {
      return this._fail('User context is required');
    }

    const userId = user.userId || user.user_id;
    const businessId = user.businessId || user.business_id;
    const role = user.role;

    if (this._isNil(userId) || this._isNil(role)) {
      return this._fail('Invalid user context');
    }

    if (this._isNil(businessId) && role !== 'super_admin') {
      return this._fail('Invalid user context');
    }

    return this._ok({ userId, businessId, role });
  },

  async register(data) {
    try {
      const {
        businessName, businessType, registrationNumber,
        address, contactEmail, contactPhone,
        firstName, lastName, username, email, password,
        fullName, role
      } = data || {};

      if (!businessName || !username || !email || !password || !firstName || !lastName) {
        return this._fail('Please provide all required fields');
      }

      const existingResult = await UserModel.findByEmailOrUsername(email, username);
      if (!existingResult.success) return existingResult;
      if (existingResult.data) {
        return this._fail('User with this email or username already exists');
      }

      const businessResult = await UserModel.createBusiness(pool, {
        businessName,
        businessType,
        registrationNumber,
        address,
        contactEmail,
        contactPhone
      });
      if (!businessResult.success) return businessResult;
      const businessId = businessResult.data;

      const hashedPassword = await hashPassword(password);
      const otp = generateOTP();
      const otpExpires = new Date();
      otpExpires.setMinutes(otpExpires.getMinutes() + 10);

      const userResult = await UserModel.createUser(pool, {
        businessId,
        username,
        email,
        hashedPassword,
        fullName: fullName || `${firstName} ${lastName}`,
        firstName,
        lastName,
        role,
        otp,
        otpExpires
      });
      if (!userResult.success) return userResult;
      const user = userResult.data;

      const ecoInitResult = await UserModel.initEcoTrustScore(pool, businessId);
      if (!ecoInitResult.success) return ecoInitResult;

      try {
        await emailService.sendVerificationEmail(email, otp, fullName || username);
      } catch (emailError) {
        console.error('[AuthService.register] verification email failed:', emailError);
      }

      return this._ok({
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
      });
    } catch (error) {
      console.error('[AuthService.register]', error);
      return this._fail('Registration failed');
    }
  },

  async sendOTP(email) {
    try {
      if (!email) {
        return this._fail('Email is required');
      }

      const userResult = await UserModel.findByEmailBasic(email);
      if (!userResult.success) return userResult;
      const user = userResult.data;
      if (!user) return this._fail('User not found');
      if (user.email_verified) return this._fail('Email already verified');

      const otp = generateOTP();
      const otpExpires = new Date();
      otpExpires.setMinutes(otpExpires.getMinutes() + 10);

      const otpResult = await UserModel.updateOTP(user.user_id, otp, otpExpires);
      if (!otpResult.success) return otpResult;

      await emailService.sendVerificationEmail(email, otp, user.full_name || user.username);
      return this._ok({ sent: true });
    } catch (error) {
      console.error('[AuthService.sendOTP]', error);
      return this._fail('Failed to send verification code');
    }
  },

  async verifyOTP(email, otp, ip, userAgent) {
    try {
      if (!email || !otp) {
        return this._fail('Email and OTP are required');
      }

      const userResult = await UserModel.findByEmailWithBusiness(email);
      if (!userResult.success) return userResult;
      const user = userResult.data;

      if (!user) return this._fail('User not found');
      if (user.email_verified) return this._fail('Email already verified');
      if (user.verification_code !== otp) return this._fail('Invalid verification code');
      if (new Date() > new Date(user.verification_code_expires)) {
        return this._fail('Verification code has expired. Please request a new one.');
      }

      const verifiedResult = await UserModel.markEmailVerified(user.user_id, user.business_id);
      if (!verifiedResult.success) return verifiedResult;

      const token = generateToken({
        userId: user.user_id,
        businessId: user.business_id,
        role: user.role
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const sessionResult = await UserModel.createSession(
        user.user_id,
        token,
        expiresAt,
        ip,
        userAgent,
        user.business_id
      );
      if (!sessionResult.success) return sessionResult;

      return this._ok({
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
      });
    } catch (error) {
      console.error('[AuthService.verifyOTP]', error);
      return this._fail('Verification failed');
    }
  },

  async forgotPassword(email) {
    try {
      if (!email) {
        return this._fail('Email is required');
      }

      const userResult = await UserModel.findActiveByEmail(email);
      if (!userResult.success) return userResult;
      const user = userResult.data;

      if (!user) {
        return this._ok({ requested: true });
      }

      const resetToken = generateResetToken();
      const resetTokenExpires = new Date();
      resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

      const saveResult = await UserModel.saveResetToken(
        user.user_id,
        resetToken,
        resetTokenExpires
      );
      if (!saveResult.success) return saveResult;

      await emailService.sendPasswordResetEmail(
        email,
        resetToken,
        user.full_name || user.username
      );

      return this._ok({ requested: true });
    } catch (error) {
      console.error('[AuthService.forgotPassword]', error);
      return this._fail('Failed to process password reset request');
    }
  },

  async resetPassword(token, password) {
    try {
      if (!password) return this._fail('Password is required');
      if (password.length < 8 || password.length > 16) {
        return this._fail('Password must be 8-16 characters');
      }
      if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
        return this._fail('Password must contain both letters and numbers');
      }

      const userResult = await UserModel.findByResetToken(token);
      if (!userResult.success) return userResult;
      const user = userResult.data;
      if (!user) return this._fail('Invalid or expired reset token');

      const hashedPassword = await hashPassword(password);
      const updateResult = await UserModel.updatePassword(user.user_id, hashedPassword);
      if (!updateResult.success) return updateResult;

      const deleteSessionsResult = await UserModel.deleteAllSessions(user.user_id);
      if (!deleteSessionsResult.success && deleteSessionsResult.error !== 'Not found or unauthorized') {
        return deleteSessionsResult;
      }

      return this._ok({ reset: true });
    } catch (error) {
      console.error('[AuthService.resetPassword]', error);
      return this._fail('Failed to reset password');
    }
  },

  async login(identifier, password, ip, userAgent) {
    try {
      if (!identifier || !password) {
        return this._fail('Email or username and password are required');
      }

      const cleanIdentifier = String(identifier).trim();
      if (!cleanIdentifier) {
        return this._fail('Email or username and password are required');
      }

      const userResult = await UserModel.findByLoginIdentifier(cleanIdentifier);
      if (!userResult.success) return userResult;
      const user = userResult.data;
      if (!user) return this._fail('Invalid credentials');

      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) return this._fail('Invalid credentials');

      const token = generateToken({
        userId: user.user_id,
        businessId: user.business_id,
        role: user.role
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const sessionResult = await UserModel.createSession(
        user.user_id,
        token,
        expiresAt,
        ip,
        userAgent,
        user.business_id
      );
      if (!sessionResult.success) return sessionResult;

      const loginResult = await UserModel.updateLastLogin(user.user_id, user.business_id);
      if (!loginResult.success) return loginResult;

      return this._ok({
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
      });
    } catch (error) {
      console.error('[AuthService.login]', error);
      return this._fail('Login failed');
    }
  },

  async logout(token, user = null) {
    try {
      if (!token) return this._fail('No token provided');
      const ctx = user ? this._extractAuthContext(user) : this._ok(null);
      if (!ctx.success) return ctx;

      const businessId = ctx.data?.businessId || null;
      const deleteResult = await UserModel.deleteSession(token, businessId);
      if (!deleteResult.success) return deleteResult;

      return this._ok({ loggedOut: true });
    } catch (error) {
      console.error('[AuthService.logout]', error);
      return this._fail('Logout failed');
    }
  },

  async getProfile(userId, user = null) {
    try {
      if (this._isNil(userId)) return this._fail('userId is required');

      let businessId = null;
      if (user) {
        const ctxResult = this._extractAuthContext(user);
        if (!ctxResult.success) return ctxResult;
        const ctx = ctxResult.data;
        if (String(ctx.userId) !== String(userId) && ctx.role !== 'admin') {
          return this._fail('Not found or unauthorized');
        }
        businessId = ctx.businessId;
      }

      const profileResult = await UserModel.findById(userId, businessId);
      if (!profileResult.success) return profileResult;
      const profile = profileResult.data;

      return this._ok({
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
      });
    } catch (error) {
      console.error('[AuthService.getProfile]', error);
      return this._fail('Failed to retrieve profile');
    }
  },

  async updateProfile(userId, payload, user = null) {
    try {
      if (this._isNil(userId)) return this._fail('userId is required');

      const profileResult = await UserModel.findById(userId);
      if (!profileResult.success) return profileResult;
      const currentProfile = profileResult.data;
      const businessId = currentProfile.business_id;

      if (user) {
        const ctxResult = this._extractAuthContext(user);
        if (!ctxResult.success) return ctxResult;
        const ctx = ctxResult.data;
        if (String(ctx.userId) !== String(userId) && ctx.role !== 'admin') {
          return this._fail('Not found or unauthorized');
        }
        if (String(ctx.businessId) !== String(businessId)) {
          return this._fail('Not found or unauthorized');
        }
      }

      const { fullName, email, username } = payload || {};

      if (email || username) {
        const existsResult = await UserModel.checkEmailOrUsernameExists(
          email,
          username,
          userId,
          businessId
        );
        if (!existsResult.success) return existsResult;
        if (existsResult.data === true) {
          return this._fail('Email or username already taken');
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
        return this._fail('No fields to update');
      }

      const updatedResult = await UserModel.updateProfile(userId, updates, values, businessId);
      if (!updatedResult.success) return updatedResult;

      return this._ok({ user: updatedResult.data });
    } catch (error) {
      console.error('[AuthService.updateProfile]', error);
      return this._fail('Failed to update profile');
    }
  },

  async changePassword(userId, currentPassword, newPassword, currentToken, user = null) {
    try {
      if (!currentPassword || !newPassword) {
        return this._fail('Please provide current and new password');
      }
      if (newPassword.length < 8 || newPassword.length > 16) {
        return this._fail('New password must be 8-16 characters');
      }
      if (!/^(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
        return this._fail('Password must contain both letters and numbers');
      }

      let businessId = null;
      if (user) {
        const ctxResult = this._extractAuthContext(user);
        if (!ctxResult.success) return ctxResult;
        const ctx = ctxResult.data;
        if (String(ctx.userId) !== String(userId) && ctx.role !== 'admin') {
          return this._fail('Not found or unauthorized');
        }
        businessId = ctx.businessId;
      } else {
        const profileResult = await UserModel.findById(userId);
        if (!profileResult.success) return profileResult;
        businessId = profileResult.data.business_id;
      }

      const hashResult = await UserModel.getPasswordHash(userId, businessId);
      if (!hashResult.success) return hashResult;
      const passwordHash = hashResult.data;
      if (!passwordHash) return this._fail('User not found');

      const isPasswordValid = await comparePassword(currentPassword, passwordHash);
      if (!isPasswordValid) return this._fail('Current password is incorrect');

      const hashedPassword = await hashPassword(newPassword);
      const updateResult = await UserModel.updatePassword(userId, hashedPassword, businessId);
      if (!updateResult.success) return updateResult;

      const deleteResult = await UserModel.deleteOtherSessions(userId, currentToken, businessId);
      if (!deleteResult.success && deleteResult.error !== 'Not found or unauthorized') {
        return deleteResult;
      }

      return this._ok({ changed: true });
    } catch (error) {
      console.error('[AuthService.changePassword]', error);
      return this._fail('Failed to change password');
    }
  },
  async sendChangePasswordOTP(email) {
 try {
   if (!email) return this._fail('Email is required');
 
   // Find user regardless of email_verified status
   const userResult = await UserModel.findByEmailBasic(email);
   if (!userResult.success) return userResult;
   const user = userResult.data;
   if (!user) return this._fail('User not found');
 
   const otp = generateOTP();
   const otpExpires = new Date();
   otpExpires.setMinutes(otpExpires.getMinutes() + 10);
 
   const otpResult = await UserModel.updateOTP(user.user_id, otp, otpExpires);
   if (!otpResult.success) return otpResult;
 
   await emailService.sendVerificationEmail(email, otp, user.full_name || user.username);
   return this._ok({ sent: true });
 } catch (error) {
   console.error('[AuthService.sendChangePasswordOTP]', error);
   return this._fail('Failed to send verification code');
 }
 },
 
 async verifyChangePasswordOTP(email, otp) {
 try {
   if (!email || !otp) return this._fail('Email and OTP are required');
 
   const userResult = await UserModel.findByEmailWithBusiness(email);
   if (!userResult.success) return userResult;
   const user = userResult.data;
 
   if (!user) return this._fail('User not found');
   if (user.verification_code !== otp) return this._fail('Invalid verification code');
   if (new Date() > new Date(user.verification_code_expires)) {
     return this._fail('Verification code has expired. Please request a new one.');
   }
 
   // Clear the OTP after successful verification (security hygiene)
   await UserModel.updateOTP(user.user_id, null, new Date());
 
   return this._ok({ verified: true });
 } catch (error) {
   console.error('[AuthService.verifyChangePasswordOTP]', error);
   return this._fail('Verification failed');
 }
 },

};

module.exports = AuthService;
