const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { Shop, Customer, Sale, Payment } = require('../models/index');

/**
 * GET /api/v1/dashboard/summary?shopId=...
 * Calculate dynamically:
 * 1. Total Sales – sum of totalAmountPaise from Sales (active)
 * 2. Payments Received – sum of amountPaise from Payments (completed)
 * 3. Outstanding – sum of balanceDuePaise from Sales (active) / customer pending
 * 4. Customers – total customer count for the shop
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const { shopId } = req.query;

  if (!shopId) {
    throw new AppError('Shop ID is required.', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    throw new AppError('Invalid shop ID format.', 400);
  }

  const requestedObjectId = new mongoose.Types.ObjectId(shopId);

  // Verify shop exists (check by _id or ownerUserId to support both)
  let shop = await Shop.findById(requestedObjectId).lean();
  if (!shop) {
    shop = await Shop.findOne({ ownerUserId: requestedObjectId }).lean();
  }

  if (!shop) {
    throw new AppError('Shop not found.', 404);
  }

  // Verify that the authenticated user owns the requested shop
  if (req.user && !req.user.isAdmin) {
    const isOwner = shop.ownerUserId.toString() === req.user._id.toString();
    if (!isOwner) {
      throw new AppError('Access denied: You do not own or have access to this shop.', 403);
    }
  }

  // Target shop IDs to scope all collection queries
  const targetShopIds = [shop._id];
  if (requestedObjectId.toString() !== shop._id.toString()) {
    targetShopIds.push(requestedObjectId);
  }

  // Aggregate metrics dynamically in parallel
  const [salesSummary, paymentsSummary, customersCount, customerPendingSummary] = await Promise.all([
    // 1. Total Sales and Outstanding Balance from active sales
    Sale.aggregate([
      {
        $match: {
          shopId: { $in: targetShopIds },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalSalesPaise: { $sum: '$totalAmountPaise' },
          outstandingPaise: { $sum: '$balanceDuePaise' },
        },
      },
    ]),

    // 2. Payments Received from completed payments
    Payment.aggregate([
      {
        $match: {
          shopId: { $in: targetShopIds },
          status: { $ne: 'reversed' },
        },
      },
      {
        $group: {
          _id: null,
          totalPaymentsPaise: { $sum: '$amountPaise' },
        },
      },
    ]),

    // 4. Total Customers associated with the shop
    Customer.countDocuments({
      shopId: { $in: targetShopIds },
    }),

    // Customer-level pending field if present on documents
    Customer.aggregate([
      {
        $match: {
          shopId: { $in: targetShopIds },
          pending: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$pending' },
        },
      },
    ]),
  ]);
const totalPaid = await Customer.aggregate([
  {
    $match: {
      shopId: new mongoose.Types.ObjectId(shopId),
    },
  },
  {
    $group: {
      _id: null,
      totalPaid: {
        $sum: {
          $convert: {
            input: '$paid',
            to: 'double',
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
  },
]);

  const paidAmount = totalPaid[0]?.totalPaid || 0;
  const totalSalesPaise = salesSummary[0]?.totalSalesPaise || 0;
  const salesOutstandingPaise = salesSummary[0]?.outstandingPaise || 0;
  const paymentsReceivedPaise = paymentsSummary[0]?.totalPaymentsPaise || 0;
  const customerPendingPaise = customerPendingSummary[0]?.totalPending || 0;

  // Use sales outstanding balance; if 0 and customer pending exists, use customer pending
  const outstandingPaise = salesOutstandingPaise > 0 ? salesOutstandingPaise : customerPendingPaise;
  const customerCount = customersCount || 0;

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Dashboard summary retrieved successfully.',
    data: {
      totalSales: totalSalesPaise,
      totalSalesPaise,
      totalPaid : paidAmount,
      paymentsReceived: paymentsReceivedPaise,
      paymentsReceivedPaise,
      receivedPaise: paymentsReceivedPaise,
      outstanding: outstandingPaise,
      outstandingPaise,
      customers: customerCount,
      customerCount,
    },
  });
});

module.exports = {
  getDashboardSummary,
  getDashboardDetails: getDashboardSummary,
};
