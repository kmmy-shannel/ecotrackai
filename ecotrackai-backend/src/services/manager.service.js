const ManagerModel = require('../models/manager.model');
const { hashPassword } = require('../utils/password.utils');

const MANAGED_ROLES = [
  'inventory_manager',
  'logistics_manager',
  'sustainability_manager',
  'driver'
];

const ManagerService = {
  _ok(data = null) {
    return { success: true, data };
  },

  _fail(error) {
    return { success: false, error };
  },

  _isNil(value) {
    return value === null || value === undefined;
  },

  _extractAdminContext(adminUser) {
    if (!adminUser || typeof adminUser !== 'object') {
      return this._fail('User context is required');
    }

    const userId = adminUser.userId || adminUser.user_id;
    const businessId = adminUser.businessId || adminUser.business_id;
    const role = adminUser.role;

    if (this._isNil(userId) || this._isNil(businessId) || this._isNil(role)) {
      return this._fail('Invalid user context');
    }

    if (role !== 'admin') {
      return this._fail('Only administrators can perform this action');
    }

    return this._ok({ userId, businessId, role });
  },

  async getManagers(businessId) {
    try {
      if (this._isNil(businessId)) {
        return this._fail('businessId is required');
      }

      const managers = await ManagerModel.findAllByBusiness(businessId);
      return this._ok({ count: managers.length, managers });
    } catch (error) {
      console.error('[ManagerService.getManagers]', error);
      return this._fail('Failed to retrieve managers');
    }
  },

  async createManager(adminUser, body) {
    try {
      const ctxResult = this._extractAdminContext(adminUser);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (!body || typeof body !== 'object') {
        return this._fail('Request body is required');
      }

      const { username, email, password, fullName, role } = body;

      if (!username || !email || !password || !fullName || !role) {
        return this._fail('Please provide all required fields');
      }

      if (!MANAGED_ROLES.includes(role)) {
        return this._fail(`Invalid role. Must be one of: ${MANAGED_ROLES.join(', ')}`);
      }

      const existing = await ManagerModel.findByEmailOrUsername(email, username);
      if (existing) {
        return this._fail('User with this email or username already exists');
      }

      const hashedPassword = await hashPassword(password);

      const newManager = await ManagerModel.create(
        ctx.businessId,
        username,
        email,
        hashedPassword,
        fullName,
        role
      );

      return this._ok({
        manager: {
          userId: newManager.user_id,
          username: newManager.username,
          email: newManager.email,
          fullName: newManager.full_name,
          role: newManager.role,
          isActive: newManager.is_active,
          createdAt: newManager.created_at
        }
      });
    } catch (error) {
      console.error('[ManagerService.createManager]', error);
      return this._fail('Failed to create manager account');
    }
  },

  async updateManager(adminUser, managerId, body) {
    try {
      const ctxResult = this._extractAdminContext(adminUser);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (this._isNil(managerId)) {
        return this._fail('managerId is required');
      }

      const { fullName, email, username, isActive } = body || {};
      const hasFields = fullName || email || username || typeof isActive === 'boolean';
      if (!hasFields) {
        return this._fail('No fields to update');
      }

      const manager = await ManagerModel.findNonAdminByIdAndBusiness(managerId, ctx.businessId);
      if (!manager) {
        return this._fail('Not found or unauthorized');
      }

      const updated = await ManagerModel.update(managerId, { fullName, email, username, isActive });
      if (!updated) {
        return this._fail('Not found or unauthorized');
      }

      return this._ok({ manager: updated });
    } catch (error) {
      console.error('[ManagerService.updateManager]', error);
      return this._fail('Failed to update manager');
    }
  },

  async deleteManager(adminUser, managerId) {
    try {
      const ctxResult = this._extractAdminContext(adminUser);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (this._isNil(managerId)) {
        return this._fail('managerId is required');
      }

      const manager = await ManagerModel.findByIdAndBusiness(managerId, ctx.businessId);
      if (!manager) {
        return this._fail('Not found or unauthorized');
      }

      if (manager.role === 'admin') {
        return this._fail('Cannot delete admin account');
      }

      await ManagerModel.deactivate(managerId);
      await ManagerModel.deleteSessions(managerId);

      return this._ok({ deleted: true });
    } catch (error) {
      console.error('[ManagerService.deleteManager]', error);
      return this._fail('Failed to delete manager');
    }
  },

  async resetManagerPassword(adminUser, managerId, newPassword) {
    try {
      const ctxResult = this._extractAdminContext(adminUser);
      if (!ctxResult.success) return ctxResult;
      const ctx = ctxResult.data;

      if (this._isNil(managerId)) {
        return this._fail('managerId is required');
      }
      if (!newPassword || newPassword.length < 6) {
        return this._fail('Password must be at least 6 characters');
      }

      const manager = await ManagerModel.findByIdAndBusiness(managerId, ctx.businessId);
      if (!manager) {
        return this._fail('Not found or unauthorized');
      }
      if (manager.role === 'admin') {
        return this._fail('Cannot reset admin password');
      }

      const hashedPassword = await hashPassword(newPassword);
      await ManagerModel.updatePassword(managerId, hashedPassword);
      await ManagerModel.deleteSessions(managerId);

      return this._ok({ reset: true });
    } catch (error) {
      console.error('[ManagerService.resetManagerPassword]', error);
      return this._fail('Failed to reset password');
    }
  }
};

module.exports = ManagerService;
