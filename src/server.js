const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/appError');
const routes = require('./routes/index');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({ origin: env.corsOrigin }));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize MongoDB query injection
app.use(mongoSanitize());

// HTTP request logging (dev only)
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Khato API is running', env: env.nodeEnv });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[Server] Khato API running on port ${env.port} in ${env.nodeEnv} mode`);
  });
};

startServer();

module.exports = app;
