// ============================================================
// FILE LOCATION: backend/src/services/manager.service.js
// LAYER: Service (ViewModel) — business logic ONLY, no HTTP/no DB
// ============================================================

const ManagerModel   = require('../models/manager.model');
const { hashPassword } = require('../utils/password.utils');

const VALID_ROLES = [
  'inventory_manager',
  'logistics_manager',
  'sustainability_manager',
  'finance_manager'
];

const ManagerService = {

  // Get all managers for a business
  async getManagers(businessId) {
    const managers = await ManagerModel.findAllByBusiness(businessId);
    return { count: managers.length, managers };
  },

  // Create a new manager account
  async createManager(adminUser, body) {
    const { username, email, password, fullName, role } = body;

    // Only admin can create managers
    if (adminUser.role !== 'admin') {
      console.log('Non-admin user attempted to create manager');
      throw { status: 403, message: 'Only administrators can create manager accounts' };
    }

    // Validate required fields
    if (!username || !email || !password || !fullName || !role) {
      console.log('Missing required fields');
      throw { status: 400, message: 'Please provide all required fields' };
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      console.log('Invalid role:', role);
      throw {
        status: 400,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`
      };
    }

    // Check if user already exists
    console.log('Checking for existing user...');
    const existing = await ManagerModel.findByEmailOrUsername(email, username);
    if (existing) {
      console.log('User already exists');
      throw { status: 400, message: 'User with this email or username already exists' };
    }

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await hashPassword(password);

    // Create manager account
    console.log('Creating manager account...');
    const newManager = await ManagerModel.create(
      adminUser.businessId,
      username,
      email,
      hashedPassword,
      fullName,
      role
    );

    console.log('Manager created successfully with ID:', newManager.user_id);

    return {
      manager: {
        userId:    newManager.user_id,
        username:  newManager.username,
        email:     newManager.email,
        fullName:  newManager.full_name,
        role:      newManager.role,
        isActive:  newManager.is_active,
        createdAt: newManager.created_at
      }
    };
  },

  // Update manager account fields
  async updateManager(adminUser, managerId, body) {
    if (!adminUser || adminUser.role !== 'admin') {
      throw { status: 403, message: 'Only administrators can update manager accounts' };
    }

    const { fullName, email, username, isActive } = body;

    // Verify manager belongs to same business and is not admin
    const manager = await ManagerModel.findNonAdminByIdAndBusiness(managerId, adminUser.businessId);
    if (!manager) {
      throw { status: 404, message: 'Manager not found or cannot be modified' };
    }

    // Guard: at least one field must be present
    const hasFields = fullName || email || username || typeof isActive === 'boolean';
    if (!hasFields) {
      throw { status: 400, message: 'No fields to update' };
    }

    const updated = await ManagerModel.update(managerId, { fullName, email, username, isActive });
    return { manager: updated };
  },

  // Soft delete (deactivate) a manager account
  async deleteManager(adminUser, managerId) {
    if (!adminUser || adminUser.role !== 'admin') {
      throw { status: 403, message: 'Only administrators can delete manager accounts' };
    }

    // Verify manager belongs to business
    const manager = await ManagerModel.findByIdAndBusiness(managerId, adminUser.businessId);
    if (!manager) {
      throw { status: 404, message: 'Manager not found' };
    }

    // Prevent deleting another admin
    if (manager.role === 'admin') {
      throw { status: 403, message: 'Cannot delete admin account' };
    }

    // Soft delete + kill sessions
    await ManagerModel.deactivate(managerId);
    await ManagerModel.deleteSessions(managerId);
  },

  // Reset manager password (admin only)
  async resetManagerPassword(adminUser, managerId, newPassword) {
    if (!adminUser || adminUser.role !== 'admin') {
      throw { status: 403, message: 'Only administrators can reset passwords' };
    }

    if (!newPassword || newPassword.length < 6) {
      throw { status: 400, message: 'Password must be at least 6 characters' };
    }

    // Verify manager belongs to business
    const manager = await ManagerModel.findByIdAndBusiness(managerId, adminUser.businessId);
    if (!manager) {
      throw { status: 404, message: 'Manager not found' };
    }

    // Prevent resetting admin password
    if (manager.role === 'admin') {
      throw { status: 403, message: 'Cannot reset admin password' };
    }

    const hashedPassword = await hashPassword(newPassword);

    // Update password + kill all sessions to force re-login
    await ManagerModel.updatePassword(managerId, hashedPassword);
    await ManagerModel.deleteSessions(managerId);
  }

};

module.exports = ManagerService;