const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { Shop } = require('../models/index');

/**
 * POST /api/v1/shops
 * Create a new shop.
 */
const createShop = asyncHandler(async (req, res) => {
  const shop = await Shop.create(req.body);

  return ApiResponse.created(res, {
    message: 'Shop created successfully',
    data: shop,
  });
});

/**
 * GET /api/v1/shops
 * Get paginated list of shops. Supports search, status filter, sorting and pagination.
 */
const getShops = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, search, status } = req.query;
  console.log(page, limit, sortBy, sortOrder, search, status, 'llllll')
  console.log('Database:', Shop.db.name);
  console.log('Collection:', Shop.collection.name);
  console.log('Connection state:', Shop.db.readyState);
  // Build filter
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.shopName = { $regex: search, $options: 'i' };

  // Build sort
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const skip = (page - 1) * limit;
  const [shops, totalItems] = await Promise.all([
    Shop.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Shop.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return ApiResponse.paginated(res, {
    message: 'Shops retrieved successfully',
    data: shops,
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
 * GET /api/v1/shops/:id
 * Get a single shop by ID.
 */
const getShopById = asyncHandler(async (req, res) => {
  const shop = await Shop.findById(req.params.id).lean();

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Shop retrieved successfully',
    data: shop,
  });
});

/**
 * PATCH /api/v1/shops/:id
 * Partially update a shop by ID.
 */
const updateShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Shop updated successfully',
    data: shop,
  });
});

/**
 * DELETE /api/v1/shops/:id
 * Hard delete a shop by ID.
 */
const deleteShop = asyncHandler(async (req, res) => {
  const shop = await Shop.findByIdAndDelete(req.params.id).lean();

  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Shop deleted successfully',
    data: null,
  });
});

module.exports = { createShop, getShops, getShopById, updateShop, deleteShop };
