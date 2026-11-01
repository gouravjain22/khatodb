const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
router.use('/auth', require('./auth.routes'));
router.use('/shops', protect, require('./shop.routes'));
router.use('/products', protect, require('./product.routes'));
router.use('/customers', protect, require('./customer.routes'));
router.use('/sales', protect, require('./sale.routes'));
router.use('/payments', protect, require('./payment.routes'));
router.use('/dashboard', protect, require('./dashboard.routes'));

module.exports = router;
