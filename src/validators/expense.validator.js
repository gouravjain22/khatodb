const Joi = require('joi');
const { objectIdSchema, paginationQuerySchema } = require('./common.validator');

const createExpenseSchema = Joi.object({
  shopId: objectIdSchema.required().messages({
    'any.required': 'Shop ID is required',
  }),
  title: Joi.string().trim().min(1).max(200).required().messages({
    'any.required': 'Expense title is required',
    'string.empty': 'Expense title cannot be empty',
  }),
  category: Joi.string().trim().min(1).max(50).default('other'),
  amountPaise: Joi.number().integer().min(1).optional(),
  amount: Joi.number().min(0.01).optional(),
  expenseDate: Joi.date().iso().optional(),
  paymentMethod: Joi.string()
    .valid('cash', 'upi', 'bank_transfer', 'card', 'other')
    .default('cash'),
  notes: Joi.string().trim().allow('').default(''),
}).custom((value, helpers) => {
  // Ensure at least one of amountPaise or amount is provided
  if (value.amountPaise === undefined && value.amount === undefined) {
    return helpers.error('any.custom', {
      message: 'Either amountPaise or amount is required',
    });
  }
  return value;
});

const updateExpenseSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200),
  category: Joi.string().trim().min(1).max(50),
  amountPaise: Joi.number().integer().min(1),
  amount: Joi.number().min(0.01),
  expenseDate: Joi.date().iso(),
  paymentMethod: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other'),
  notes: Joi.string().trim().allow(''),
  status: Joi.string().valid('active', 'cancelled'),
}).min(1);

const expenseIdParamSchema = Joi.object({
  id: objectIdSchema.required(),
});

const queryExpensesSchema = paginationQuerySchema.keys({
  shopId: objectIdSchema.required().messages({
    'any.required': 'Shop ID is required',
  }),
  category: Joi.string().trim().optional(),
  paymentMethod: Joi.string().valid('cash', 'upi', 'bank_transfer', 'card', 'other').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdParamSchema,
  queryExpensesSchema,
};

