const { Router } = require('express');
const {
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
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validation.middleware');

const router = Router();

// Validation rules
const registerValidation = [
  body('businessName')
    .trim()
    .notEmpty().withMessage('Business name is required'),
    body('contactPhone')
  .trim()
  .notEmpty().withMessage('Contact phone is required')
  .matches(/^\d+$/).withMessage('Contact phone must contain numbers only')
  .isLength({ min: 7, max: 15 }).withMessage('Contact phone must be 7-15 digits'),
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 5 }).withMessage('Username must be at least 5 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 16 }).withMessage('Password must be 8-16 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/).withMessage('Password must contain both letters and numbers'),
  body('confirmPassword')
    .trim()
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
];

const sendOTPValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().normalizeEmail().withMessage('Please enter a valid email')
];

const verifyOTPValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers')
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().normalizeEmail().withMessage('Please enter a valid email')
];

const resetPasswordValidation = [
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 16 }).withMessage('Password must be 8-16 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/).withMessage('Password must contain both letters and numbers')
];

const changePasswordValidation = [
  body('currentPassword')
    .trim()
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .trim()
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8, max: 16 }).withMessage('New password must be 8-16 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/).withMessage('Password must contain both letters and numbers')
];

// Routes
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);
router.post('/logout', authenticate, logout);

// OTP routes
router.post('/send-otp', sendOTPValidation, validateRequest, sendOTP);
router.post('/verify-otp', verifyOTPValidation, validateRequest, verifyOTP);

// Password reset routes
router.post('/forgot-password', forgotPasswordValidation, validateRequest, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, validateRequest, resetPassword);

// Profile routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePasswordValidation, validateRequest, changePassword);

module.exports = router;