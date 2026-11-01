const Joi = require('joi');
const { objectIdSchema, paginationQuerySchema } = require('./common.validator');

const createCustomerSchema = Joi.object({
  shopId: objectIdSchema.required(),
  name: Joi.string().trim().min(1).max(100).required(),
  phone: Joi.string().trim().min(8).max(15).required(),
  email: Joi.string().email().trim().allow('').default(''),
  address: Joi.object({
    line1: Joi.string().trim().allow('').default(''),
    line2: Joi.string().trim().allow('').default(''),
    city: Joi.string().trim().allow('').default(''),
    state: Joi.string().trim().allow('').default(''),
    pincode: Joi.string().trim().allow('').default(''),
  }).default({}),
  notes: Joi.string().trim().allow('').default(''),
  status: Joi.string().valid('active', 'inactive').default('active'),
  paid: Joi.number().min(0).empty(['', null]).default(0),
  pending: Joi.number().min(0).empty(['', null]).default(0),
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  phone: Joi.string().trim().min(8).max(15),
  email: Joi.string().email().trim().allow(''),
  address: Joi.object({
    line1: Joi.string().trim().allow(''),
    line2: Joi.string().trim().allow(''),
    city: Joi.string().trim().allow(''),
    state: Joi.string().trim().allow(''),
    pincode: Joi.string().trim().allow(''),
  }),
  notes: Joi.string().trim().allow(''),
  status: Joi.string().valid('active', 'inactive'),
  paid: Joi.number().min(0).empty(['', null]).default(0),
  pending: Joi.number().min(0).empty(['', null]).default(0),
}).min(1);

const customerIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const queryCustomersSchema = paginationQuerySchema.keys({
  shopId: objectIdSchema.required(),
  status: Joi.string().valid('active', 'inactive'),
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdParamSchema,
  queryCustomersSchema,
};
