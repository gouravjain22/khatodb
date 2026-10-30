const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = Joi.string()
  .pattern(objectIdPattern)
  .message('Must be a valid 24-character hexadecimal MongoDB ObjectId');

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().allow('').optional(),
  sortBy: Joi.string().trim().default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = {
  objectIdSchema,
  paginationQuerySchema,
};
