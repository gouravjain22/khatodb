const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { withTransaction } = require('../utils/transactionHelper');
const { Sale, Payment } = require('../models/index');

/**
 * POST /api/v1/payments
 * Add a payment against an existing active sale.
 */
const addPayment = asyncHandler(async (req, res) => {
  const { saleId, amountPaise, paymentMethod, paymentDate, referenceNumber, notes } = req.body;

  // Find the sale
  const sale = await Sale.findById(saleId);
  if (!sale) {
    throw new AppError('Sale not found', 404);
  }

  // Guard: cannot pay a cancelled sale
  if (sale.status === 'cancelled') {
    throw new AppError('Cannot add payment to a cancelled sale', 400);
  }

  // Guard: sale already fully paid
  if (sale.paymentStatus === 'paid') {
    throw new AppError('Sale is already fully paid', 400);
  }

  const payment = await withTransaction(async (session) => {
    // Create payment record
    const [newPayment] = await Payment.create(
      [
        {
          shopId: sale.shopId,
          customerId: sale.customerId,
          saleId: sale._id,
          amountPaise,
          paymentMethod: paymentMethod || 'cash',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          referenceNumber: referenceNumber || '',
          notes: notes || '',
        },
      ],
      { session }
    );

    // Update sale totals
    const newPaidAmountPaise = sale.paidAmountPaise + amountPaise;
    const newBalanceDuePaise = Math.max(0, sale.totalAmountPaise - newPaidAmountPaise);

    let newPaymentStatus;
    if (newBalanceDuePaise <= 0) {
      newPaymentStatus = 'paid';
    } else if (newPaidAmountPaise > 0) {
      newPaymentStatus = 'partially_paid';
    } else {
      newPaymentStatus = 'unpaid';
    }

    await Sale.findByIdAndUpdate(
      sale._id,
      {
        paidAmountPaise: newPaidAmountPaise,
        balanceDuePaise: newBalanceDuePaise,
        paymentStatus: newPaymentStatus,
      },
      { session }
    );

    return newPayment;
  });

  return ApiResponse.created(res, {
    message: 'Payment added successfully',
    data: payment,
  });
});

/**
 * GET /api/v1/payments/by-sale/:saleId
 * Get paginated payments for a specific sale.
 */
const getPaymentsBySale = asyncHandler(async (req, res) => {
  const { saleId } = req.params;
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const filter = { saleId };
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [payments, totalItems] = await Promise.all([
    Payment.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
    Payment.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return ApiResponse.paginated(res, {
    message: 'Payments retrieved successfully',
    data: payments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalItems,
      totalPages,
      hasNextPage: Number(page) < totalPages,
      hasPrevPage: Number(page) > 1,
    },
  });
});

/**
 * GET /api/v1/payments/by-customer/:customerId
 * Get paginated payments for a specific customer scoped to a shop.
 * Requires `shopId` in query.
 */
const getPaymentsByCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { shopId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const filter = { customerId, shopId };
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [payments, totalItems] = await Promise.all([
    Payment.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
    Payment.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return ApiResponse.paginated(res, {
    message: 'Payments retrieved successfully',
    data: payments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalItems,
      totalPages,
      hasNextPage: Number(page) < totalPages,
      hasPrevPage: Number(page) > 1,
    },
  });
});

module.exports = { addPayment, getPaymentsBySale, getPaymentsByCustomer };
