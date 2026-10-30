const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    productName: {
      type: String,
      required: [true, 'Product name snapshot is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    unitPricePaise: {
      type: Number,
      required: [true, 'Unit price in paise is required'],
      min: [0, 'Unit price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Unit price must be an integer in paise',
      },
    },
    purchasePricePaise: {
      type: Number,
      default: 0,
      min: [0, 'Purchase price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Purchase price must be an integer in paise',
      },
    },
    lineTotalPaise: {
      type: Number,
      required: [true, 'Line total in paise is required'],
      min: [0, 'Line total cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Line total must be an integer in paise',
      },
    },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
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
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
    },
    items: {
      type: [saleItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'Sale must contain at least one item',
      },
    },
    subtotalPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Subtotal must be an integer in paise',
      },
    },
    discountPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Discount must be an integer in paise',
      },
    },
    totalAmountPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Total amount must be an integer in paise',
      },
    },
    paidAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Paid amount must be an integer in paise',
      },
    },
    balanceDuePaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Balance due must be an integer in paise',
      },
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
      index: true,
    },
    saleDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
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
  }
);

// Compound indexes
// 1. Unique invoice number scoped to shop
saleSchema.index({ shopId: 1, invoiceNumber: 1 }, { unique: true });

// 2. Customer ledger lookups & outstanding queries
saleSchema.index({ shopId: 1, customerId: 1, createdAt: -1 });
saleSchema.index({ shopId: 1, paymentStatus: 1, balanceDuePaise: 1 });
saleSchema.index({ shopId: 1, saleDate: -1 });
saleSchema.index({ customerId: 1, status: 1, balanceDuePaise: 1 });

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;
