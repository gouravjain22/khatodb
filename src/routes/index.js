const express = require('express');
const router = express.Router();

router.use('/shops', require('./shop.routes'));
router.use('/customers', require('./customer.routes'));
router.use('/products', require('./product.routes'));
router.use('/sales', require('./sale.routes'));
router.use('/payments', require('./payment.routes'));

module.exports = router;
