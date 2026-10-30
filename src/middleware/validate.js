const AppError = require('../utils/appError');

/**
 * Middleware factory for validating incoming requests with Joi schemas.
 * 
 * Supports schema definitions with { body, query, params } or directly for body.
 * 
 * @param {Object} schema - Joi schema or object of Joi schemas
 */
const validate = (schema) => (req, res, next) => {
  const isSegmented = schema.body || schema.query || schema.params;

  if (isSegmented) {
    const segments = ['params', 'query', 'body'];
    for (const segment of segments) {
      if (schema[segment]) {
        const { error, value } = schema[segment].validate(req[segment], {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          const details = error.details.map((d) => ({
            field: d.path.join('.'),
            message: d.message.replace(/['"]/g, ''),
          }));
          return next(new AppError(`Validation failed in request ${segment}`, 400, details));
        }

        req[segment] = value;
      }
    }
    return next();
  }

  // Default: validate body
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return next(new AppError('Validation failed in request body', 400, details));
  }

  req.body = value;
  return next();
};

module.exports = validate;
