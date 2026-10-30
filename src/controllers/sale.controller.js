const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { withTransaction } = require('../utils/transactionHelper');
const { Shop, Customer, Product, Sale, Payment, Counter } = require('../models/index');

/**
 * POST /api/v1/sales
 * Create a new sale with transactional stock deduction and optional initial payment.
 */
const createSale = asyncHandler(async (req, res) => {
  const { shopId, customerId, items, discountPaise, paidAmountPaise, paymentMethod, saleDate, notes } = req.body;

  // Guard: verify shop exists
  const shop = await Shop.findById(shopId).lean();
  if (!shop) {
    throw new AppError('Shop not found', 404);
  }

  // Guard: verify customer exists
  const customer = await Customer.findById(customerId).lean();
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const sale = await withTransaction(async (session) => {
    const saleItems = [];

    // Process each line item
    for (const item of items) {
      const { productId, quantity } = item;

      const product = await Product.findById(productId).session(session).lean();

      if (!product) {
        throw new AppError(`Product ${productId} not found`, 404);
      }
      if (product.shopId.toString() !== shopId.toString()) {
        throw new AppError(`Product ${productId} does not belong to this shop`, 400);
      }
      if (product.status !== 'active') {
        throw new AppError(`Product "${product.name}" is not active`, 400);
      }

      const unitPricePaise = item.unitPricePaise !== undefined ? item.unitPricePaise : product.sellingPricePaise;
      const lineTotalPaise = quantity * unitPricePaise;

      // Deduct stock
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { stockQuantity: -quantity } },
        { session, new: true }
      );

      saleItems.push({
        productId,
        productName: product.name,
        sku: product.sku || '',
        quantity,
        unitPricePaise,
        purchasePricePaise: product.purchasePricePaise,
        lineTotalPaise,
      });
    }

    // Calculate totals
    const subtotalPaise = saleItems.reduce((sum, i) => sum + i.lineTotalPaise, 0);
    const resolvedDiscountPaise = discountPaise || 0;
    const totalAmountPaise = subtotalPaise - resolvedDiscountPaise;
    const resolvedPaidAmountPaise = paidAmountPaise || 0;
    const balanceDuePaise = Math.max(0, totalAmountPaise - resolvedPaidAmountPaise);

    // Determine payment status
    let paymentStatus;
    if (balanceDuePaise <= 0) {
      paymentStatus = 'paid';
    } else if (resolvedPaidAmountPaise > 0) {
      paymentStatus = 'partially_paid';
    } else {
      paymentStatus = 'unpaid';
    }

    // Generate unique invoice number scoped to this shop
    const counter = await Counter.findOneAndUpdate(
      { shopId, sequenceName: 'invoice' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, session }
    );
    const invoiceNumber = `INV-${shopId.toString().slice(-6).toUpperCase()}-${String(counter.seq).padStart(5, '0')}`;

    const resolvedSaleDate = saleDate ? new Date(saleDate) : new Date();

    // Create sale
    const [newSale] = await Sale.create(
      [
        {
          shopId,
          customerId,
          invoiceNumber,
          items: saleItems,
          subtotalPaise,
          discountPaise: resolvedDiscountPaise,
          totalAmountPaise,
          paidAmountPaise: resolvedPaidAmountPaise,
          balanceDuePaise,
          paymentStatus,
          saleDate: resolvedSaleDate,
          notes: notes || '',
          status: 'active',
        },
      ],
      { session }
    );

    // Create initial payment record if any amount was paid
    if (resolvedPaidAmountPaise > 0) {
      await Payment.create(
        [
          {
            shopId,
            customerId,
            saleId: newSale._id,
            amountPaise: resolvedPaidAmountPaise,
            paymentMethod: paymentMethod || 'cash',
            paymentDate: resolvedSaleDate,
          },
        ],
        { session }
      );
    }

    return newSale;
  });

  // Return populated sale
  const populatedSale = await Sale.findById(sale._id)
    .populate('customerId', 'name phone')
    .lean();

  return ApiResponse.created(res, {
    message: 'Sale created successfully',
    data: populatedSale,
  });
});

/**
 * GET /api/v1/sales
 * Get paginated list of sales for a shop. Requires `shopId` in query.
 */
const getSales = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, shopId, customerId, paymentStatus, startDate, endDate, invoiceNumber } =
    req.query;

  // Build filter
  const filter = { shopId };
  if (customerId) filter.customerId = customerId;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (invoiceNumber) filter.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };
  if (startDate || endDate) {
    filter.saleDate = {};
    if (startDate) filter.saleDate.$gte = new Date(startDate);
    if (endDate) filter.saleDate.$lte = new Date(endDate);
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [sales, totalItems] = await Promise.all([
    Sale.find(filter)
      .populate('customerId', 'name phone')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Sale.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return ApiResponse.paginated(res, {
    message: 'Sales retrieved successfully',
    data: sales,
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
 * GET /api/v1/sales/:id
 * Get a single sale by ID with populated customer and product details.
 */
const getSaleById = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customerId', 'name phone')
    .populate('items.productId', 'name sku')
    .lean();

  if (!sale) {
    throw new AppError('Sale not found', 404);
  }

  return ApiResponse.success(res, {
    message: 'Sale retrieved successfully',
    data: sale,
  });
});

/**
 * PATCH /api/v1/sales/:id/cancel
 * Cancel a sale and restore stock for all items in a transaction.
 */
const cancelSale = asyncHandler(async (req, res) => {
  const saleDoc = await Sale.findById(req.params.id);

  if (!saleDoc) {
    throw new AppError('Sale not found', 404);
  }

  if (saleDoc.status === 'cancelled') {
    throw new AppError('Sale is already cancelled', 400);
  }

  await withTransaction(async (session) => {
    // Restore stock for each item
    for (const item of saleDoc.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stockQuantity: +item.quantity } },
        { session }
      );
    }

    saleDoc.status = 'cancelled';
    await saleDoc.save({ session });
  });

  return ApiResponse.success(res, {
    message: 'Sale cancelled successfully',
    data: saleDoc,
  });
});

module.exports = { createSale, getSales, getSaleById, cancelSale };
