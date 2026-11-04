const express = require('express');

const router = express.Router();

const {
  register,
  login,
} = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);

// Mobile OTP login (existing password login is preserved).
router.use('/', require('./otp.routes'));

module.exports = router;
