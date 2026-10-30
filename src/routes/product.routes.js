const express = require('express');
const router = express.Router();

const { createProduct, getProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/product.controller');
const validate = require('../middleware/validate');
const { createProductSchema, updateProductSchema, productIdParamSchema, queryProductsSchema } = require('../validators/product.validator');

// POST   /api/v1/products       – create product
router.post('/', validate(createProductSchema), createProduct);

// GET    /api/v1/products       – list products (paginated, shopId required)
router.get('/', validate({ query: queryProductsSchema }), getProducts);

// GET    /api/v1/products/:id   – get product by id
router.get('/:id', validate({ params: productIdParamSchema }), getProductById);

// PATCH  /api/v1/products/:id   – partial update
router.patch('/:id', validate({ params: productIdParamSchema, body: updateProductSchema }), updateProduct);

// DELETE /api/v1/products/:id   – hard delete
router.delete('/:id', validate({ params: productIdParamSchema }), deleteProduct);

module.exports = router;
