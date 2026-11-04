const Joi = require('joi');
const { objectIdSchema, paginationQuerySchema } = require('./common.validator');

const saleItemInputSchema = Joi.object({
  productId: objectIdSchema.required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPricePaise: Joi.number().integer().min(0).optional(),
});

const createInvoiceSchema = Joi.object({
  // Can either generate invoice from existing saleId
  saleId: objectIdSchema.optional(),

  // Or create invoice with new sale details
  shopId: objectIdSchema.when('saleId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  customerId: objectIdSchema.when('saleId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  items: Joi.array().items(saleItemInputSchema).min(1).when('saleId', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  discountPaise: Joi.number().integer().min(0).default(0),
  paidAmountPaise: Joi.number().integer().min(0).default(0),
  paymentMethod: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other').default('cash'),
  saleDate: Joi.date().iso().optional(),
  notes: Joi.string().trim().allow('').default(''),
});

const updateInvoiceSchema = Joi.object({
  notes: Joi.string().trim().allow(''),
  saleDate: Joi.date().iso(),
}).min(1);

const invoiceIdParamSchema = Joi.object({
  id: Joi.string().trim().required().messages({
    'any.required': 'Invoice ID or invoice number is required',
  }),
});

const queryInvoicesSchema = paginationQuerySchema.keys({
  shopId: objectIdSchema.required().messages({
    'any.required': 'Shop ID is required',
  }),
  customerId: objectIdSchema.optional(),
  paymentStatus: Joi.string().valid('unpaid', 'partially_paid', 'paid').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  invoiceNumber: Joi.string().trim().optional(),
});

module.exports = {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdParamSchema,
  queryInvoicesSchema,
};

