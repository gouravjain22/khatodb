const Joi = require('joi');
const { objectIdSchema, paginationQuerySchema } = require('./common.validator');

const createProductSchema = Joi.object({
  shopId: objectIdSchema.required(),
  name: Joi.string().trim().min(1).max(200).required(),
  category: Joi.string().trim().default('general'),
  brand: Joi.string().trim().allow('').default(''),
  sku: Joi.string().trim().uppercase().allow('').default(''),
  purchasePricePaise: Joi.number().integer().min(0).required(),
  sellingPricePaise: Joi.number().integer().min(0).required(),
  stockQuantity: Joi.number().integer().default(0),
  lowStockThreshold: Joi.number().integer().min(0).default(2),
  unit: Joi.string().trim().default('piece'),
  status: Joi.string().valid('active', 'inactive', 'archived').default('active'),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200),
  category: Joi.string().trim(),
  brand: Joi.string().trim().allow(''),
  sku: Joi.string().trim().uppercase().allow(''),
  purchasePricePaise: Joi.number().integer().min(0),
  sellingPricePaise: Joi.number().integer().min(0),
  stockQuantity: Joi.number().integer(),
  lowStockThreshold: Joi.number().integer().min(0),
  unit: Joi.string().trim(),
  status: Joi.string().valid('active', 'inactive', 'archived'),
}).min(1);

const productIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const queryProductsSchema = paginationQuerySchema.keys({
  shopId: objectIdSchema.required(),
  category: Joi.string().trim(),
  brand: Joi.string().trim(),
  status: Joi.string().valid('active', 'inactive', 'archived'),
  lowStockOnly: Joi.boolean().default(false),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  queryProductsSchema,
};
