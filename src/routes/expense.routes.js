const express = require('express');
const router = express.Router();

const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require('../controllers/expense.controller');
const validate = require('../middleware/validate');
const {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdParamSchema,
  queryExpensesSchema,
} = require('../validators/expense.validator');

// POST   /api/v1/expenses       – create an expense
router.post('/', validate(createExpenseSchema), createExpense);

// GET    /api/v1/expenses       – list expenses (paginated, filtered by shopId)
router.get('/', validate({ query: queryExpensesSchema }), getExpenses);

// GET    /api/v1/expenses/:id   – get single expense by ID
router.get('/:id', validate({ params: expenseIdParamSchema }), getExpenseById);

// PATCH  /api/v1/expenses/:id   – update expense by ID
router.patch('/:id', validate({ params: expenseIdParamSchema, body: updateExpenseSchema }), updateExpense);

// DELETE /api/v1/expenses/:id   – delete expense by ID
router.delete('/:id', validate({ params: expenseIdParamSchema }), deleteExpense);

module.exports = router;

