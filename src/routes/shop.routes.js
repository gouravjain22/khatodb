const express = require('express');
const router = express.Router();

const { createShop, getShops, getShopById, updateShop, deleteShop } = require('../controllers/shop.controller');
const validate = require('../middleware/validate');
const { createShopSchema, updateShopSchema, shopIdParamSchema, queryShopsSchema } = require('../validators/shop.validator');

// POST   /api/v1/shops       – create shop
router.post('/', validate(createShopSchema), createShop);

// GET    /api/v1/shops       – list shops (paginated)
router.get('/', validate({ query: queryShopsSchema }), getShops);

// GET    /api/v1/shops/:id   – get shop by id
router.get('/:id', validate({ params: shopIdParamSchema }), getShopById);

// PATCH  /api/v1/shops/:id   – partial update
router.patch('/:id', validate({ params: shopIdParamSchema, body: updateShopSchema }), updateShop);

// DELETE /api/v1/shops/:id   – hard delete
router.delete('/:id', validate({ params: shopIdParamSchema }), deleteShop);

module.exports = router;
