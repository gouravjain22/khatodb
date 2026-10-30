const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { Shop, Product } = require('../models/index');

/**
 * POST /api/v1/products
 * Create a new product. Verifies the shop exists first.
 */
const createProduct = asyncHandler(async (req, res) => {
  const { shopId } = req.body;

  // Guard: verify shop exists

  const shopExists = await Shop.find({ ownerUserId: shopId }).lean();
  if (!shopExists) {
    throw new AppError('Shop not found', 404);
  }

  const product = await Product.create(req.body);

  return ApiResponse.created(res, {
    message: 'Product created successfully',
    data: product,
  });
});

/**
 * GET /api/v1/products
 * Get paginated list of products for a shop.
 * Requires `shopId` in query. Supports search, category, brand, status, lowStockOnly.
 */
const getProducts = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, search, shopId, category, brand, status, lowStockOnly } = req.query;

  // Build filter
  const filter = { shopId };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  // Filter products where stockQuantity <= lowStockThreshold
  if (lowStockOnly) {
    filter.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [products, totalItems] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return ApiResponse.paginated(res, {
    message: 'Products retrieved successfully',
    data: products,
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
 * GET /api/v1/products/:id
 * Get a single product by ID.
 */
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Product retrieved successfully',
    data: product,
  });
});

/**
 * PATCH /api/v1/products/:id
 * Partially update a product by ID.
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Product updated successfully',
    data: product,
  });
});

/**
 * DELETE /api/v1/products/:id
 * Hard delete a product by ID.
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id).lean();

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Product deleted successfully',
    data: null,
  });
});

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct };
