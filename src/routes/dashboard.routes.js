const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboard.controller');
const validate = require('../middleware/validate');
const { dashboardSummaryQuerySchema } = require('../validators/dashboard.validator');

// GET /api/v1/dashboard/summary?shopId=...
router.get('/summary', validate({ query: dashboardSummaryQuerySchema }), getDashboardSummary);

// Alias GET /api/v1/dashboard?shopId=...
router.get('/', validate({ query: dashboardSummaryQuerySchema }), getDashboardSummary);

module.exports = router;

