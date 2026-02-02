const crypto = require('crypto');

/**
 * Generate a 6-digit OTP
 * @returns {string} - 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a secure reset token
 * @returns {string} - Random reset token
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Get OTP expiration time (10 minutes from now)
 * @returns {Date}
 */
const getOTPExpiration = () => {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 10);
  return expiration;
};

/**
 * Get reset token expiration time (1 hour from now)
 * @returns {Date}
 */
const getResetTokenExpiration = () => {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 1);
  return expiration;
};

module.exports = {
  generateOTP,
  generateResetToken,
  getOTPExpiration,
  getResetTokenExpiration
};