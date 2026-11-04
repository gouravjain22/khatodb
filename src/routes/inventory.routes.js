const express = require('express');
const router = express.Router();

const { getLowStockProducts } = require('../controllers/product.controller');
const validate = require('../middleware/validate');
const { queryLowStockSchema } = require('../validators/product.validator');

// GET /api/v1/inventory/low-stock – list products with low stock
router.get('/low-stock', validate({ query: queryLowStockSchema }), getLowStockProducts);

module.exports = router;

