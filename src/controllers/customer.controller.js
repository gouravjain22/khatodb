const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { Shop, Customer } = require('../models/index');

/**
 * POST /api/v1/customers
 * Create a new customer. Verifies the shop exists first.
 */
const createCustomer = asyncHandler(async (req, res) => {
  const { shopId } = req.body;

  // Guard: verify shop exists
  const shopExists = await Shop.find({ownerUserId:shopId}).lean();
  if (!shopExists) {
    throw new AppError('Shop not found', 404);
  }

  const customer = await Customer.create(req.body);

  return ApiResponse.created(res, {
    message: 'Customer created successfully',
    data: customer,
  });
});

/**
 * GET /api/v1/customers
 * Get paginated list of customers for a shop.
 * Requires `shopId` in query.
 */
const getCustomers = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, search, shopId, status } = req.query;

  // Build filter
  const filter = { shopId };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [customers, totalItems] = await Promise.all([
    Customer.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return ApiResponse.paginated(res, {
    message: 'Customers retrieved successfully',
    data: customers,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

/**
 * GET /api/v1/customers/:id
 * Get a single customer by ID.
 */
const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id).lean();

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Customer retrieved successfully',
    data: customer,
  });
});

/**
 * PATCH /api/v1/customers/:id
 * Partially update a customer by ID.
 */
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Customer updated successfully',
    data: customer,
  });
});

/**
 * DELETE /api/v1/customers/:id
 * Hard delete a customer by ID.
 */
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id).lean();

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Customer deleted successfully',
    data: null,
  });
});

module.exports = { createCustomer, getCustomers, getCustomerById, updateCustomer, deleteCustomer };
