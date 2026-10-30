const express = require('express');
const router = express.Router();

const { createCustomer, getCustomers, getCustomerById, updateCustomer, deleteCustomer } = require('../controllers/customer.controller');
const validate = require('../middleware/validate');
const { createCustomerSchema, updateCustomerSchema, customerIdParamSchema, queryCustomersSchema } = require('../validators/customer.validator');

// POST   /api/v1/customers       – create customer
router.post('/', validate(createCustomerSchema), createCustomer);

// GET    /api/v1/customers       – list customers (paginated, shopId required)
router.get('/', validate({ query: queryCustomersSchema }), getCustomers);

// GET    /api/v1/customers/:id   – get customer by id
router.get('/:id', validate({ params: customerIdParamSchema }), getCustomerById);

// PATCH  /api/v1/customers/:id   – partial update
router.patch('/:id', validate({ params: customerIdParamSchema, body: updateCustomerSchema }), updateCustomer);

// DELETE /api/v1/customers/:id   – hard delete
router.delete('/:id', validate({ params: customerIdParamSchema }), deleteCustomer);

module.exports = router;
