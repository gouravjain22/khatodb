const express = require('express');
const router = express.Router();

const { addPayment, getPaymentsBySale, getPaymentsByCustomer } = require('../controllers/payment.controller');
const validate = require('../middleware/validate');
const {
  addPaymentSchema,
  saleIdParamSchema,
  customerIdParamSchema,
  queryPaymentsByCustomerSchema,
} = require('../validators/payment.validator');

// POST /api/v1/payments                             – add payment to a sale
router.post('/', validate(addPaymentSchema), addPayment);

// GET  /api/v1/payments/by-sale/:saleId             – payments for a sale
router.get('/by-sale/:saleId', validate({ params: saleIdParamSchema }), getPaymentsBySale);

// GET  /api/v1/payments/by-customer/:customerId     – payments for a customer (shopId required in query)
router.get(
  '/by-customer/:customerId',
  validate({ params: customerIdParamSchema, query: queryPaymentsByCustomerSchema }),
  getPaymentsByCustomer
);

module.exports = router;
