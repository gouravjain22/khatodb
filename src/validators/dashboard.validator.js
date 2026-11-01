const Joi = require('joi');
const { objectIdSchema } = require('./common.validator');

const dashboardSummaryQuerySchema = Joi.object({
  shopId: objectIdSchema.required().messages({
    'any.required': 'Shop ID is required',
    'string.empty': 'Shop ID cannot be empty',
  }),
});

module.exports = {
  dashboardSummaryQuerySchema,
};

