const Joi = require('joi');
const { objectIdSchema, paginationQuerySchema } = require('./common.validator');

const addPaymentSchema = Joi.object({
  saleId: objectIdSchema.required(),
  amountPaise: Joi.number().integer().min(1).required(),
  paymentMethod: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other').default('cash'),
  paymentDate: Joi.date().iso().optional(),
  referenceNumber: Joi.string().trim().allow('').default(''),
  notes: Joi.string().trim().allow('').default(''),
});

const saleIdParamSchema = Joi.object({ saleId: objectIdSchema.required() });

const customerIdParamSchema = Joi.object({ customerId: objectIdSchema.required() });

const queryPaymentsByCustomerSchema = paginationQuerySchema.keys({
  shopId: objectIdSchema.required(),
});

module.exports = {
  addPaymentSchema,
  saleIdParamSchema,
  customerIdParamSchema,
  queryPaymentsByCustomerSchema,
};
