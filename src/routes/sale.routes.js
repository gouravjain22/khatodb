const express = require('express');
const router = express.Router();

const { createSale, getSales, getSaleById, cancelSale } = require('../controllers/sale.controller');
const validate = require('../middleware/validate');
const { createSaleSchema, saleIdParamSchema, querySalesSchema } = require('../validators/sale.validator');

// POST  /api/v1/sales       – create sale (transactional)
router.post('/', validate(createSaleSchema), createSale);

// GET   /api/v1/sales       – list sales (paginated, shopId required)
router.get('/', validate({ query: querySalesSchema }), getSales);

// GET   /api/v1/sales/:id   – get sale by id
router.get('/:id', validate({ params: saleIdParamSchema }), getSaleById);

// PATCH /api/v1/sales/:id/cancel – cancel sale and restore stock
router.patch('/:id/cancel', validate({ params: saleIdParamSchema }), cancelSale);

module.exports = router;
