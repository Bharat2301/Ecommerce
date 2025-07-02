const express = require('express');
const { register, login, logout, resetPassword, requestResetOtp, verifyEmail } = require('../controllers/authController.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler } = require('../utils/asyncHandler.js');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 login attempts per window per IP
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit to 3 OTP requests per window per IP
  message: {
    success: false,
    error: 'Too many OTP requests. Please try again after 15 minutes.',
  },
});

router.post('/register', asyncHandler(register));
router.post('/login', loginLimiter, asyncHandler(login));
router.post('/logout', authenticate, asyncHandler(logout));
router.post('/reset-password', asyncHandler(resetPassword));
router.post('/request-reset-otp', otpRequestLimiter, asyncHandler(requestResetOtp));
router.post('/verify-email', asyncHandler(verifyEmail));

module.exports = router;