const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Invalid resource identifier format: ${err.value}`;
    error = new AppError(message, 400);
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate value '${value}' for unique field '${field}'.`;
    error = new AppError(message, 409, err.keyValue);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    error = new AppError('Validation failed', 422, errors);
  }

  // Handle JSON Syntax Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('Malformed JSON payload received', 400);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  if (env.nodeEnv === 'development' && statusCode === 500) {
    console.error('[Unhandled Error]', err);
  }

  return ApiResponse.error(res, {
    statusCode,
    message,
    errors: error.errors || (env.nodeEnv === 'development' ? err.stack : null),
  });
};

module.exports = errorHandler;
