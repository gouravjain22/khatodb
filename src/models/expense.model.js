const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Shop ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      trim: true,
      lowercase: true,
      default: 'other',
      index: true,
    },
    amountPaise: {
      type: Number,
      required: [true, 'Expense amount in paise is required'],
      min: [1, 'Expense amount must be at least 1 paisa'],
      validate: {
        validator: Number.isInteger,
        message: 'Expense amount must be an integer in paise',
      },
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'card', 'other'],
      default: 'cash',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field to expose amount in Rupees alongside paise for convenience
expenseSchema.virtual('amount').get(function () {
  return typeof this.amountPaise === 'number' ? this.amountPaise / 100 : 0;
});

// Compound indexes for performant lookups and filtering
expenseSchema.index({ shopId: 1, expenseDate: -1 });
expenseSchema.index({ shopId: 1, category: 1 });
expenseSchema.index({ shopId: 1, status: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;

