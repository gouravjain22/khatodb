const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Shop ID is required'],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: [true, 'Sale ID is required'],
      index: true,
    },
    amountPaise: {
      type: Number,
      required: [true, 'Payment amount in paise is required'],
      min: [1, 'Payment amount must be at least 1 paisa'],
      validate: {
        validator: Number.isInteger,
        message: 'Payment amount must be an integer in paise',
      },
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'card', 'other'],
      default: 'cash',
      index: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['completed', 'reversed'],
      default: 'completed',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for performant lookups
paymentSchema.index({ shopId: 1, saleId: 1, createdAt: -1 });
paymentSchema.index({ shopId: 1, customerId: 1, createdAt: -1 });
paymentSchema.index({ shopId: 1, paymentDate: -1 });
paymentSchema.index({ saleId: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
