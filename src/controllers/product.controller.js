const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { Product } = require('../models/index');
const { verifyShopAccess } = require('../utils/shopHelper');

/**
 * POST /api/v1/products
 * Create a new product. Verifies the shop exists and user owns it.
 */
const createProduct = asyncHandler(async (req, res) => {
  const { shopId } = req.body;

  // Guard: verify shop exists and user has access
  const { shop } = await verifyShopAccess(shopId, req.user);

  const product = await Product.create({
    ...req.body,
    shopId: shop._id,
  });

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

  // Validate shop access
  const { targetShopIds } = await verifyShopAccess(shopId, req.user);

  // Build filter
  const filter = { shopId: { $in: targetShopIds } };
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
    // Low stock should only consider active products unless status specifically requested
    if (!status) {
      filter.status = 'active';
    }
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
 * GET /api/v1/products/low-stock
 * Dedicated endpoint to retrieve products whose stock quantity is <= lowStockThreshold.
 * Excludes inactive or archived products.
 */
const getLowStockProducts = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, search, shopId, category, brand } = req.query;

  // Validate shop access and cross-shop isolation
  const { targetShopIds } = await verifyShopAccess(shopId, req.user);

  const filter = {
    shopId: { $in: targetShopIds },
    status: 'active',
    $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
  };

  if (category) filter.category = category;
  if (brand) filter.brand = brand;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }

  // Default sorting: lowest stock quantity first
  const sort = sortBy ? { [sortBy]: sortOrder === 'asc' ? 1 : -1 } : { stockQuantity: 1, name: 1 };
  const skip = (page - 1) * limit;

  const [products, totalItems] = await Promise.all([
    Product.find(filter)
      .select('_id name sku stockQuantity lowStockThreshold unit category sellingPricePaise purchasePricePaise status')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return ApiResponse.paginated(res, {
    message: 'Low stock products retrieved successfully',
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

  // Cross-shop access prevention: verify user owns this product's shop
  await verifyShopAccess(product.shopId, req.user);

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
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Cross-shop access prevention: verify user owns this product's shop
  await verifyShopAccess(product.shopId, req.user);

  const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  return ApiResponse.success(res, {
    message: 'Product updated successfully',
    data: updatedProduct,
  });
});

/**
 * DELETE /api/v1/products/:id
 * Hard delete a product by ID.
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Cross-shop access prevention: verify user owns this product's shop
  await verifyShopAccess(product.shopId, req.user);

  await Product.findByIdAndDelete(req.params.id);

  return ApiResponse.success(res, {
    message: 'Product deleted successfully',
    data: null,
  });
});

module.exports = {
  createProduct,
  getProducts,
  getLowStockProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
