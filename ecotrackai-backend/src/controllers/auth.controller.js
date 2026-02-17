const AuthService = require('../services/auth.service');
const { sendSuccess, sendError } = require('../utils/response.utils');

/**
 * AUTH CONTROLLER
 * MVVM Layer: Controller (View equivalent for backend)
 * Responsibility: HTTP request/response ONLY - calls Service, returns response
 */

// Register new user and business
const register = async (req, res) => {
  try {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    const result = await AuthService.register(req.body);
    sendSuccess(res, 201,
      'Registration successful. Please check your email for verification code.',
      result
    );
  } catch (error) {
    console.error('❌ REGISTRATION ERROR:', error.message);
    sendError(res, error.status || 500, error.message || 'Registration failed');
  }
};

// Send OTP for email verification
const sendOTP = async (req, res) => {
  try {
    await AuthService.sendOTP(req.body.email);
    sendSuccess(res, 200, 'Verification code sent to your email');
  } catch (error) {
    console.error('❌ Send OTP error:', error.message);
    sendError(res, error.status || 500, error.message || 'Failed to send verification code');
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const result = await AuthService.verifyOTP(
      req.body.email,
      req.body.otp,
      req.ip,
      req.get('user-agent')
    );
    sendSuccess(res, 200, 'Email verified successfully', result);
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    sendError(res, error.status || 500, error.message || 'Verification failed');
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    await AuthService.forgotPassword(req.body.email);
    // Always return same message (security best practice)
    sendSuccess(res, 200,
      'If an account with that email exists, a password reset link has been sent.'
    );
  } catch (error) {
    console.error('Forgot password error:', error.message);
    sendError(res, error.status || 500, error.message || 'Failed to process password reset request');
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    await AuthService.resetPassword(req.params.token, req.body.password);
    sendSuccess(res, 200, 'Password reset successful. Please login with your new password.');
  } catch (error) {
    console.error('Reset password error:', error.message);
    sendError(res, error.status || 500, error.message || 'Failed to reset password');
  }
};

// Login
const login = async (req, res) => {
  try {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    const result = await AuthService.login(
      req.body.email,
      req.body.password,
      req.ip,
      req.get('user-agent')
    );
    sendSuccess(res, 200, 'Login successful', result);
  } catch (error) {
    console.error('LOGIN ERROR:', error.message);
    sendError(res, error.status || 500, error.message || 'Login failed');
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 400, 'No token provided');
    }
    const token = authHeader.split(' ')[1];
    await AuthService.logout(token);
    sendSuccess(res, 200, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error.message);
    sendError(res, error.status || 500, error.message || 'Logout failed');
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    if (!req.user) return sendError(res, 401, 'Not authenticated');
    const result = await AuthService.getProfile(req.user.userId);
    sendSuccess(res, 200, 'Profile retrieved successfully', result);
  } catch (error) {
    console.error('Get profile error:', error.message);
    sendError(res, error.status || 500, error.message || 'Failed to retrieve profile');
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    if (!req.user) return sendError(res, 401, 'Not authenticated');
    const result = await AuthService.updateProfile(req.user.userId, req.body);
    sendSuccess(res, 200, 'Profile updated successfully', result);
  } catch (error) {
    console.error('Update profile error:', error.message);
    sendError(res, error.status || 500, error.message || 'Failed to update profile');
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    if (!req.user) return sendError(res, 401, 'Not authenticated');
    const authHeader = req.headers.authorization;
    const currentToken = authHeader?.split(' ')[1];
    await AuthService.changePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword,
      currentToken
    );
    sendSuccess(res, 200, 'Password changed successfully');
  } catch (error) {
    console.error('❌ Change password error:', error.message);
    sendError(res, error.status || 500, error.message || 'Failed to change password');
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword
};