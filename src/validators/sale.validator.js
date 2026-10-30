const Joi = require('joi');
const { objectIdSchema, paginationQuerySchema } = require('./common.validator');

const saleItemInputSchema = Joi.object({
  productId: objectIdSchema.required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPricePaise: Joi.number().integer().min(0).optional(),
});

const createSaleSchema = Joi.object({
  shopId: objectIdSchema.required(),
  customerId: objectIdSchema.required(),
  items: Joi.array().items(saleItemInputSchema).min(1).required(),
  discountPaise: Joi.number().integer().min(0).default(0),
  paidAmountPaise: Joi.number().integer().min(0).default(0),
  paymentMethod: Joi.when('paidAmountPaise', {
    is: Joi.number().greater(0),
    then: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other').required(),
    otherwise: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other').optional(),
  }),
  saleDate: Joi.date().iso().optional(),
  notes: Joi.string().trim().allow('').default(''),
});

const saleIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const querySalesSchema = paginationQuerySchema.keys({
  shopId: objectIdSchema.required(),
  customerId: objectIdSchema.optional(),
  paymentStatus: Joi.string().valid('unpaid', 'partially_paid', 'paid').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  invoiceNumber: Joi.string().trim().optional(),
});

module.exports = {
  createSaleSchema,
  saleIdParamSchema,
  querySalesSchema,
};
