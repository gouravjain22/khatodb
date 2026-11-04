const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { withTransaction } = require('../utils/transactionHelper');
const { Shop, Customer, Product, Sale, Payment, Counter } = require('../models/index');
const { verifyShopAccess } = require('../utils/shopHelper');

/**
 * Format invoice output with consistent customer details and amount representations.
 */
const formatInvoice = (sale, payments = []) => {
  const doc = sale.toObject ? sale.toObject() : { ...sale };
  const customer = doc.customerId && typeof doc.customerId === 'object' ? doc.customerId : null;

  return {
    _id: doc._id,
    invoiceId: doc._id,
    invoiceNumber: doc.invoiceNumber,
    saleDate: doc.saleDate,
    shopId: doc.shopId,
    customerId: customer ? customer._id : doc.customerId,
    customer: customer
      ? {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email || '',
          address: customer.address || {},
        }
      : null,
    customerName: customer ? customer.name : '',
    customerPhone: customer ? customer.phone : '',
    items: (doc.items || []).map((item) => ({
      productId: item.productId?._id || item.productId,
      productName: item.productName || item.productId?.name || '',
      sku: item.sku || item.productId?.sku || '',
      quantity: item.quantity,
      unitPricePaise: item.unitPricePaise,
      unitPrice: typeof item.unitPricePaise === 'number' ? item.unitPricePaise / 100 : 0,
      lineTotalPaise: item.lineTotalPaise,
      lineTotal: typeof item.lineTotalPaise === 'number' ? item.lineTotalPaise / 100 : 0,
    })),
    subtotalPaise: doc.subtotalPaise,
    subtotal: typeof doc.subtotalPaise === 'number' ? doc.subtotalPaise / 100 : 0,
    discountPaise: doc.discountPaise || 0,
    discount: typeof doc.discountPaise === 'number' ? doc.discountPaise / 100 : 0,
    totalAmountPaise: doc.totalAmountPaise,
    totalAmount: typeof doc.totalAmountPaise === 'number' ? doc.totalAmountPaise / 100 : 0,
    paidAmountPaise: doc.paidAmountPaise || 0,
    paidAmount: typeof doc.paidAmountPaise === 'number' ? doc.paidAmountPaise / 100 : 0,
    balanceDuePaise: doc.balanceDuePaise || 0,
    balanceDue: typeof doc.balanceDuePaise === 'number' ? doc.balanceDuePaise / 100 : 0,
    paymentStatus: doc.paymentStatus,
    notes: doc.notes || '',
    status: doc.status,
    payments: payments.map((p) => ({
      _id: p._id,
      amountPaise: p.amountPaise,
      amount: typeof p.amountPaise === 'number' ? p.amountPaise / 100 : 0,
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
      referenceNumber: p.referenceNumber || '',
      notes: p.notes || '',
      status: p.status,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

/**
 * GET /api/v1/invoices
 * Retrieve all invoices for a shop with filtering and pagination.
 */
const getInvoices = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, shopId, customerId, paymentStatus, startDate, endDate, invoiceNumber, search } =
    req.query;

  // Validate shop access and cross-shop isolation
  const { targetShopIds } = await verifyShopAccess(shopId, req.user);

  const filter = {
    shopId: { $in: targetShopIds },
    status: { $ne: 'cancelled' },
  };

  if (customerId) filter.customerId = customerId;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (invoiceNumber) filter.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };

  if (startDate || endDate) {
    filter.saleDate = {};
    if (startDate) filter.saleDate.$gte = new Date(startDate);
    if (endDate) filter.saleDate.$lte = new Date(endDate);
  }

  if (search) {
    filter.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [sales, totalItems] = await Promise.all([
    Sale.find(filter)
      .populate('customerId', 'name phone email address')
      .populate('items.productId', 'name sku unit')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Sale.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return ApiResponse.paginated(res, {
    message: 'Invoices retrieved successfully',
    data: sales.map((sale) => formatInvoice(sale)),
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
 * GET /api/v1/invoices/:id
 * Retrieve a single invoice by its ID or invoiceNumber.
 */
const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { invoiceNumber: id }] } : { invoiceNumber: id };

  const sale = await Sale.findOne(query)
    .populate('customerId', 'name phone email address notes')
    .populate('items.productId', 'name sku unit category')
    .lean();

  if (!sale) {
    throw new AppError('Invoice not found', 404);
  }

  // Cross-shop access prevention: verify user owns this invoice's shop
  await verifyShopAccess(sale.shopId, req.user);

  // Retrieve payment history for this invoice
  const payments = await Payment.find({ saleId: sale._id, status: { $ne: 'reversed' } })
    .sort({ paymentDate: -1 })
    .lean();

  return ApiResponse.success(res, {
    message: 'Invoice retrieved successfully',
    data: formatInvoice(sale, payments),
  });
});

/**
 * POST /api/v1/invoices
 * Create or generate an invoice using existing sales data or new sale details.
 */
const createInvoice = asyncHandler(async (req, res) => {
  const { saleId, shopId, customerId, items, discountPaise, paidAmountPaise, paymentMethod, saleDate, notes } =
    req.body;

  // Case 1: Generate or retrieve invoice from an existing sale
  if (saleId) {
    const sale = await Sale.findById(saleId);
    if (!sale) {
      throw new AppError('Sale record not found', 404);
    }

    // Cross-shop access prevention
    await verifyShopAccess(sale.shopId, req.user);

    // If sale does not have an invoiceNumber, generate one now
    if (!sale.invoiceNumber) {
      const counter = await Counter.findOneAndUpdate(
        { shopId: sale.shopId, sequenceName: 'invoice' },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      sale.invoiceNumber = `INV-${sale.shopId.toString().slice(-6).toUpperCase()}-${String(counter.seq).padStart(5, '0')}`;
      await sale.save();
    }

    const populatedSale = await Sale.findById(sale._id)
      .populate('customerId', 'name phone email address')
      .populate('items.productId', 'name sku unit')
      .lean();

    const payments = await Payment.find({ saleId: sale._id, status: { $ne: 'reversed' } }).lean();

    return ApiResponse.created(res, {
      message: 'Invoice generated successfully from existing sale',
      data: formatInvoice(populatedSale, payments),
    });
  }

  // Case 2: Create a new sale with invoice
  const { shop } = await verifyShopAccess(shopId, req.user);

  const customer = await Customer.findById(customerId).lean();
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const newSale = await withTransaction(async (session) => {
    const saleItems = [];

    // Process each line item
    for (const item of items) {
      const { productId, quantity } = item;

      const product = await Product.findById(productId).session(session).lean();

      if (!product) {
        throw new AppError(`Product ${productId} not found`, 404);
      }
      if (product.shopId.toString() !== shop._id.toString() && product.shopId.toString() !== shopId.toString()) {
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
      { shopId: shop._id, sequenceName: 'invoice' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, session }
    );
    const invoiceNumber = `INV-${shop._id.toString().slice(-6).toUpperCase()}-${String(counter.seq).padStart(5, '0')}`;

    const resolvedSaleDate = saleDate ? new Date(saleDate) : new Date();

    const [createdSale] = await Sale.create(
      [
        {
          shopId: shop._id,
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

    // Create payment record if any initial amount was paid
    let initialPayment = null;
    if (resolvedPaidAmountPaise > 0) {
      const [payRecord] = await Payment.create(
        [
          {
            shopId: shop._id,
            customerId,
            saleId: createdSale._id,
            amountPaise: resolvedPaidAmountPaise,
            paymentMethod: paymentMethod || 'cash',
            paymentDate: resolvedSaleDate,
          },
        ],
        { session }
      );
      initialPayment = payRecord;
    }

    return { createdSale, initialPayment };
  });

  const populatedSale = await Sale.findById(newSale.createdSale._id)
    .populate('customerId', 'name phone email address')
    .populate('items.productId', 'name sku unit')
    .lean();

  const payments = newSale.initialPayment ? [newSale.initialPayment] : [];

  return ApiResponse.created(res, {
    message: 'Invoice created successfully',
    data: formatInvoice(populatedSale, payments),
  });
});

/**
 * PATCH /api/v1/invoices/:id
 * Update non-financial invoice information (notes, saleDate) preserving financial integrity.
 */
const updateInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { invoiceNumber: id }] } : { invoiceNumber: id };

  const sale = await Sale.findOne(query);

  if (!sale) {
    throw new AppError('Invoice not found', 404);
  }

  // Cross-shop access prevention: verify user owns this invoice's shop
  await verifyShopAccess(sale.shopId, req.user);

  // Financial safety: only allow updating non-financial fields (notes, saleDate)
  const allowedUpdates = {};
  if (req.body.notes !== undefined) allowedUpdates.notes = req.body.notes;
  if (req.body.saleDate !== undefined) allowedUpdates.saleDate = new Date(req.body.saleDate);

  const updatedSale = await Sale.findByIdAndUpdate(sale._id, allowedUpdates, {
    new: true,
    runValidators: true,
  })
    .populate('customerId', 'name phone email address')
    .populate('items.productId', 'name sku unit')
    .lean();

  const payments = await Payment.find({ saleId: sale._id, status: { $ne: 'reversed' } }).lean();

  return ApiResponse.success(res, {
    message: 'Invoice updated successfully',
    data: formatInvoice(updatedSale, payments),
  });
});

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
};

