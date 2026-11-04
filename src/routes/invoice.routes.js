const express = require('express');
const router = express.Router();

const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
} = require('../controllers/invoice.controller');
const validate = require('../middleware/validate');
const {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceIdParamSchema,
  queryInvoicesSchema,
} = require('../validators/invoice.validator');

// POST   /api/v1/invoices       – generate/create invoice
router.post('/', validate(createInvoiceSchema), createInvoice);

// GET    /api/v1/invoices       – list invoices (paginated, filtered by shopId)
router.get('/', validate({ query: queryInvoicesSchema }), getInvoices);

// GET    /api/v1/invoices/:id   – get single invoice by id or invoiceNumber
router.get('/:id', validate({ params: invoiceIdParamSchema }), getInvoiceById);

// PATCH  /api/v1/invoices/:id   – update non-financial invoice fields
router.patch('/:id', validate({ params: invoiceIdParamSchema, body: updateInvoiceSchema }), updateInvoice);

module.exports = router;

