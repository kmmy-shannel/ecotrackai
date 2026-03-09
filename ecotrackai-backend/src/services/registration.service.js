// ============================================================
// FILE: backend/src/services/registration.service.js
// LAYER: Business Logic — Registration workflows
// PURPOSE: Flow A (Super Admin) + Flow B (Self-Reg) orchestration
// ============================================================

const RegistrationModel = require('../models/registration.model');
const UserModel = require('../models/user.model');
const { hashPassword } = require('../utils/password.utils');
const { generateOTP } = require('../utils/otp.utils');
const emailService = require('./email.service');

const RegistrationService = {

  _ok(data = null) {
    return { success: true, data };
  },

  _fail(error, statusCode = 400) {
    return { success: false, error, statusCode };
  },

  _isNil(value) {
    return value === null || value === undefined;
  },

  _extractSuperAdminContext(user) {
    if (!user || typeof user !== 'object') {
      return this._fail('User context is required');
    }

    const userId = user.userId || user.user_id;
    const role = user.role;

    if (this._isNil(userId) || this._isNil(role)) {
      return this._fail('Invalid user context');
    }

    if (role !== 'super_admin') {
      return this._fail('Only super_admin can access this resource', 403);
    }

    return this._ok({ userId, role });
  },

  /**
   * ===== FLOW A: SUPER ADMIN CREATES BUSINESS =====
   * - Immediate activation
   * - Auto-generate temp password
   * - Send OTP
   */
  async createBusinessAsSupAdmin(user, body) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (!body || typeof body !== 'object') {
        return this._fail('Request body is required');
      }

      const { businessName, businessType, registrationNumber, address, contactEmail, contactPhone, adminName, adminEmail } = body;

      // Validation
      if (!businessName || !businessType || !registrationNumber || !adminName || !adminEmail) {
        return this._fail('business_name, business_type, registration_number, admin_name, and admin_email are required');
      }

      // Check uniqueness
      const nameCheck = await RegistrationModel.checkBusinessNameExists(businessName);
      if (!nameCheck.success) return nameCheck;
      if (nameCheck.data) return this._fail('Business name already exists', 409);

      const regCheck = await RegistrationModel.checkRegistrationNumberExists(registrationNumber);
      if (!regCheck.success) return regCheck;
      if (regCheck.data) return this._fail('Registration number already exists', 409);

      const emailCheck = await RegistrationModel.checkContactEmailExists(contactEmail);
      if (!emailCheck.success) return emailCheck;
      if (emailCheck.data) return this._fail('Contact email already exists', 409);

      const adminEmailCheck = await RegistrationModel.checkAdminEmailExists(adminEmail);
      if (!adminEmailCheck.success) return adminEmailCheck;
      if (adminEmailCheck.data) return this._fail('Admin email already exists', 409);

      // Generate admin credentials
      const tempPassword = Math.random().toString(36).slice(-12);
      const hashedPassword = await hashPassword(tempPassword);
      const otp = generateOTP();
      const adminUsername = adminEmail.split('@')[0] + '_' + Math.random().toString(36).slice(-4);

      // Execute transaction
      const transactionResult = await RegistrationModel.withTransaction(async (client) => {
        return await RegistrationModel.createBusinessWithAdmin(client, {
          businessName,
          businessType,
          registrationNumber,
          address: address || null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          adminUsername,
          adminName,
          adminEmail,
          adminPasswordHash: hashedPassword,
          status: 'active',
          createdBySupAdmin: true,
          requiresApproval: false
        });
      });

      if (!transactionResult.success) return transactionResult;

      const registrationData = transactionResult.data;

      // Send welcome email with OTP
      try {
        await emailService.sendVerificationEmail(
          adminEmail,
          otp,
          adminName,
          { tempPassword, businessName }
        );
      } catch (emailError) {
        console.error('[RegistrationService.createBusinessAsSupAdmin] Email send failed:', emailError);
        // Don't fail the registration; email is secondary
      }

      return this._ok({
        business: {
          business_id: registrationData.businessId,
          business_name: registrationData.businessName,
          status: 'active',
          created_by: 'super_admin'
        },
        admin_user: {
          email: registrationData.adminEmail,
          username: adminUsername,
          temp_password: tempPassword,
          otp: otp,
          message: 'Admin account created. Send OTP and temp password to admin.'
        }
      });
    } catch (error) {
      console.error('[RegistrationService.createBusinessAsSupAdmin]', error);
      return this._fail('Failed to create business');
    }
  },

  /**
   * ===== FLOW B: SELF-REGISTRATION =====
   * - Status: pending
   * - Admin locked until approved
   * - Notify super_admin
   */
  async registerBusinessSelfService(body) {
    try {
      if (!body || typeof body !== 'object') {
        return this._fail('Request body is required');
      }

      const { businessName, businessType, registrationNumber, address, contactEmail, contactPhone, adminName, adminEmail, adminPassword } = body;

      // Validation
      if (!businessName || !businessType || !registrationNumber || !adminName || !adminEmail || !adminPassword) {
        return this._fail('All fields required: business_name, business_type, registration_number, admin_name, admin_email, admin_password');
      }

      if (adminPassword.length < 8) {
        return this._fail('Password must be at least 8 characters');
      }

      // Check uniqueness
      const nameCheck = await RegistrationModel.checkBusinessNameExists(businessName);
      if (!nameCheck.success) return nameCheck;
      if (nameCheck.data) return this._fail('Business name already exists', 409);

      const regCheck = await RegistrationModel.checkRegistrationNumberExists(registrationNumber);
      if (!regCheck.success) return regCheck;
      if (regCheck.data) return this._fail('Registration number already exists', 409);

      const emailCheck = await RegistrationModel.checkContactEmailExists(contactEmail);
      if (!emailCheck.success) return emailCheck;
      if (emailCheck.data) return this._fail('Contact email already exists', 409);

      const adminEmailCheck = await RegistrationModel.checkAdminEmailExists(adminEmail);
      if (!adminEmailCheck.success) return adminEmailCheck;
      if (adminEmailCheck.data) return this._fail('Email already registered', 409);

      // Hash password
      const hashedPassword = await hashPassword(adminPassword);
      const adminUsername = adminEmail.split('@')[0] + '_' + Math.random().toString(36).slice(-4);

      // Execute transaction (status='pending', admin locked)
      const transactionResult = await RegistrationModel.withTransaction(async (client) => {
        return await RegistrationModel.createBusinessWithAdmin(client, {
          businessName,
          businessType,
          registrationNumber,
          address: address || null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          adminUsername,
          adminName,
          adminEmail,
          adminPasswordHash: hashedPassword,
          status: 'pending',
          createdBySupAdmin: false,
          requiresApproval: true
        });
      });

      if (!transactionResult.success) return transactionResult;

      const registrationData = transactionResult.data;

      // Notify super_admin (placeholder for email service)
      try {
        // TODO: Send to all super_admin users
        console.log(`[Registration] New pending business: ${businessName}. Notify super_admin queue.`);
      } catch (notifyError) {
        console.error('[RegistrationService.registerBusinessSelfService] Notify failed:', notifyError);
      }

      return this._ok({
        business: {
          business_id: registrationData.businessId,
          business_name: registrationData.businessName,
          status: 'pending',
          message: 'Business registration pending super_admin approval'
        }
      });
    } catch (error) {
      console.error('[RegistrationService.registerBusinessSelfService]', error);
      return this._fail('Failed to register business');
    }
  },

  /**
   * ===== APPROVAL OPERATIONS =====
   */
  async approvePendingBusiness(user, businessId) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (this._isNil(businessId)) {
        return this._fail('business_id is required');
      }

      // Verify business exists and is pending
      const businessCheck = await RegistrationModel.getBusinessById(businessId);
      if (!businessCheck.success) return businessCheck;
      if (!businessCheck.data) {
        return this._fail('Business not found', 404);
      }
      if (businessCheck.data.status !== 'pending') {
        return this._fail(`Cannot approve business in status: ${businessCheck.data.status}`, 400);
      }

      // Execute transaction
      const transactionResult = await RegistrationModel.withTransaction(async (client) => {
        return await RegistrationModel.approvePendingBusiness(client, businessId);
      });

      if (!transactionResult.success) return transactionResult;

      const approvalData = transactionResult.data;

      // Send activation email to admin
      try {
        await emailService.sendSimpleEmail(
          approvalData.adminEmail,
          'Business Approved - Account Activated',
          `Your business "${approvalData.businessName}" has been approved and is now active.`
        );
      } catch (emailError) {
        console.error('[RegistrationService.approvePendingBusiness] Email send failed:', emailError);
      }

      return this._ok({
        business: approvalData,
        message: 'Business approved and activated'
      });
    } catch (error) {
      console.error('[RegistrationService.approvePendingBusiness]', error);
      return this._fail('Failed to approve business');
    }
  },

  /**
   * ===== REJECTION OPERATIONS =====
   */
  async rejectPendingBusiness(user, businessId, reason) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      if (this._isNil(businessId)) {
        return this._fail('business_id is required');
      }

      // Verify business exists and is pending
      const businessCheck = await RegistrationModel.getBusinessById(businessId);
      if (!businessCheck.success) return businessCheck;
      if (!businessCheck.data) {
        return this._fail('Business not found', 404);
      }
      if (businessCheck.data.status !== 'pending') {
        return this._fail(`Cannot reject business in status: ${businessCheck.data.status}`, 400);
      }

      // Execute transaction
      const transactionResult = await RegistrationModel.withTransaction(async (client) => {
        return await RegistrationModel.rejectPendingBusiness(client, businessId, reason);
      });

      if (!transactionResult.success) return transactionResult;

      return this._ok({
        business: transactionResult.data,
        message: 'Business rejected'
      });
    } catch (error) {
      console.error('[RegistrationService.rejectPendingBusiness]', error);
      return this._fail('Failed to reject business');
    }
  },

  /**
   * ===== QUERY OPERATIONS =====
   */
  async getPendingBusinesses(user, limit = 50, offset = 0) {
    try {
      const ctxResult = this._extractSuperAdminContext(user);
      if (!ctxResult.success) return ctxResult;

      const result = await RegistrationModel.getPendingBusinesses(limit, offset);
      if (!result.success) return result;

      return this._ok(result.data);
    } catch (error) {
      console.error('[RegistrationService.getPendingBusinesses]', error);
      return this._fail('Failed to fetch pending businesses');
    }
  }
};

module.exports = RegistrationService;
