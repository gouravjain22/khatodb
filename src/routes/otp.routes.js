const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendOtp, verifyOtp } = require('../controllers/otp.controller');

const router = express.Router();

const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again later.',
  },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again later.',
  },
});

router.post('/send-otp', sendOtpLimiter, sendOtp);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);

module.exports = router;
