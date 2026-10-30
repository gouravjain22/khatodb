const Joi = require('joi');
const { objectIdSchema, paginationQuerySchema } = require('./common.validator');

const createShopSchema = Joi.object({
  shopName: Joi.string().trim().min(2).max(100).required(),
  ownerUserId: objectIdSchema.required(),
  businessDetails: Joi.object({
    businessType: Joi.string().trim().default('kirana'),
    description: Joi.string().trim().allow('').default(''),
    phone: Joi.string().trim().min(8).max(15).required(),
    email: Joi.string().email().trim().allow('').default(''),
    address: Joi.object({
      line1: Joi.string().trim().allow('').default(''),
      line2: Joi.string().trim().allow('').default(''),
      city: Joi.string().trim().allow('').default(''),
      district: Joi.string().trim().allow('').default(''),
      state: Joi.string().trim().allow('').default(''),
      pincode: Joi.string().trim().allow('').default(''),
      country: Joi.string().trim().allow('').default('India'),
    }).default({}),
  }).required(),
  legalDetails: Joi.object({
    gstRegistered: Joi.boolean().default(false),
    gstin: Joi.string().trim().allow(null, '').default(null),
    businessRegistrationNumber: Joi.string().trim().allow(null, '').default(null),
  }).default({}),
  settings: Joi.object({
    currency: Joi.string().default('INR'),
    language: Joi.string().default('hi'),
    timezone: Joi.string().default('Asia/Kolkata'),
    financialYearStartMonth: Joi.number().integer().min(1).max(12).default(4),
  }).default({}),
  preferences: Joi.object({
    inventoryEnabled: Joi.boolean().default(true),
    billingEnabled: Joi.boolean().default(true),
    khataEnabled: Joi.boolean().default(true),
    lowStockAlertsEnabled: Joi.boolean().default(true),
  }).default({}),
  subscription: Joi.object({
    plan: Joi.string().default('free'),
    status: Joi.string().default('active'),
  }).default({}),
  status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
});

const updateShopSchema = Joi.object({
  shopName: Joi.string().trim().min(2).max(100),
  businessDetails: Joi.object({
    businessType: Joi.string().trim(),
    description: Joi.string().trim().allow(''),
    phone: Joi.string().trim().min(8).max(15),
    email: Joi.string().email().trim().allow(''),
    address: Joi.object({
      line1: Joi.string().trim().allow(''),
      line2: Joi.string().trim().allow(''),
      city: Joi.string().trim().allow(''),
      district: Joi.string().trim().allow(''),
      state: Joi.string().trim().allow(''),
      pincode: Joi.string().trim().allow(''),
      country: Joi.string().trim().allow(''),
    }),
  }),
  legalDetails: Joi.object({
    gstRegistered: Joi.boolean(),
    gstin: Joi.string().trim().allow(null, ''),
    businessRegistrationNumber: Joi.string().trim().allow(null, ''),
  }),
  settings: Joi.object({
    currency: Joi.string(),
    language: Joi.string(),
    timezone: Joi.string(),
    financialYearStartMonth: Joi.number().integer().min(1).max(12),
  }),
  preferences: Joi.object({
    inventoryEnabled: Joi.boolean(),
    billingEnabled: Joi.boolean(),
    khataEnabled: Joi.boolean(),
    lowStockAlertsEnabled: Joi.boolean(),
  }),
  subscription: Joi.object({
    plan: Joi.string(),
    status: Joi.string(),
  }),
  status: Joi.string().valid('active', 'inactive', 'suspended'),
}).min(1);

const shopIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const queryShopsSchema = paginationQuerySchema.keys({
  status: Joi.string().valid('active', 'inactive', 'suspended'),
});

module.exports = {
  createShopSchema,
  updateShopSchema,
  shopIdParamSchema,
  queryShopsSchema,
};
