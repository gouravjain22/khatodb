const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const ApiResponse = require('../utils/apiResponse');
const { Expense } = require('../models/index');
const { verifyShopAccess } = require('../utils/shopHelper');

/**
 * POST /api/v1/expenses
 * Create a new expense for a shop.
 */
const createExpense = asyncHandler(async (req, res) => {
  const { shopId, title, category, amountPaise, amount, expenseDate, paymentMethod, notes } = req.body;

  // Validate shop exists and authenticated user has access
  const { shop } = await verifyShopAccess(shopId, req.user);

  // Normalize amount to paise
  let resolvedAmountPaise = amountPaise;
  if (resolvedAmountPaise === undefined && amount !== undefined) {
    resolvedAmountPaise = Math.round(Number(amount) * 100);
  }

  if (!resolvedAmountPaise || resolvedAmountPaise < 1) {
    throw new AppError('Valid expense amount is required.', 400);
  }

  const expense = await Expense.create({
    shopId: shop._id,
    title: title.trim(),
    category: (category || 'other').trim().toLowerCase(),
    amountPaise: resolvedAmountPaise,
    expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
    paymentMethod: paymentMethod || 'cash',
    notes: notes || '',
    createdBy: req.user?._id,
    status: 'active',
  });

  return ApiResponse.created(res, {
    message: 'Expense created successfully',
    data: expense,
  });
});

/**
 * GET /api/v1/expenses
 * Get paginated list of expenses for a shop.
 * Requires shopId. Supports category, date range, search and pagination.
 */
const getExpenses = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, search, shopId, category, paymentMethod, startDate, endDate } = req.query;

  // Validate shop access and get target shop IDs
  const { targetShopIds } = await verifyShopAccess(shopId, req.user);

  // Build filter
  const filter = {
    shopId: { $in: targetShopIds },
    status: { $ne: 'cancelled' },
  };

  if (category) {
    filter.category = category.trim().toLowerCase();
  }

  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  if (startDate || endDate) {
    filter.expenseDate = {};
    if (startDate) filter.expenseDate.$gte = new Date(startDate);
    if (endDate) filter.expenseDate.$lte = new Date(endDate);
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [expenses, totalItems] = await Promise.all([
    Expense.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Expense.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return ApiResponse.paginated(res, {
    message: 'Expenses retrieved successfully',
    data: expenses,
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
 * GET /api/v1/expenses/:id
 * Get single expense by ID.
 */
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id)
    .populate('createdBy', 'name email')
    .lean({ virtuals: true });

  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Cross-shop access prevention: verify user owns this expense's shop
  await verifyShopAccess(expense.shopId, req.user);

  return ApiResponse.success(res, {
    message: 'Expense retrieved successfully',
    data: expense,
  });
});

/**
 * PATCH /api/v1/expenses/:id
 * Partially update an expense.
 */
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Cross-shop access prevention: verify user owns this expense's shop
  await verifyShopAccess(expense.shopId, req.user);

  const updates = { ...req.body };

  // If amount was provided in rupees, convert to paise
  if (updates.amount !== undefined && updates.amountPaise === undefined) {
    updates.amountPaise = Math.round(Number(updates.amount) * 100);
    delete updates.amount;
  }

  if (updates.category) {
    updates.category = updates.category.trim().toLowerCase();
  }

  const updatedExpense = await Expense.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })
    .populate('createdBy', 'name email')
    .lean({ virtuals: true });

  return ApiResponse.success(res, {
    message: 'Expense updated successfully',
    data: updatedExpense,
  });
});

/**
 * DELETE /api/v1/expenses/:id
 * Hard delete an expense by ID.
 */
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  // Cross-shop access prevention: verify user owns this expense's shop
  await verifyShopAccess(expense.shopId, req.user);

  await Expense.findByIdAndDelete(req.params.id);

  return ApiResponse.success(res, {
    message: 'Expense deleted successfully',
    data: null,
  });
});

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};

