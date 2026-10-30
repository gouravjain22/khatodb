class ApiResponse {
  static success(res, { statusCode = 200, message = 'Success', data = null, meta = null }) {
    const payload = {
      success: true,
      statusCode,
      message,
      data,
    };
    if (meta) {
      payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
  }

  static created(res, { message = 'Resource created successfully', data = null }) {
    return ApiResponse.success(res, { statusCode: 201, message, data });
  }

  static paginated(res, { statusCode = 200, message = 'Success', data = [], pagination = {} }) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        totalItems: pagination.totalItems || data.length,
        totalPages: pagination.totalPages || Math.ceil((pagination.totalItems || data.length) / (pagination.limit || 10)),
        hasNextPage: Boolean(pagination.hasNextPage),
        hasPrevPage: Boolean(pagination.hasPrevPage),
      },
    });
  }

  static error(res, { statusCode = 500, message = 'Internal server error', errors = null }) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors,
    });
  }
}

module.exports = ApiResponse;
