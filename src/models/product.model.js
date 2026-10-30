const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Shop ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'general',
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    purchasePricePaise: {
      type: Number,
      required: [true, 'Purchase price in paise is required'],
      min: [0, 'Purchase price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Purchase price must be an integer in paise',
      },
    },
    sellingPricePaise: {
      type: Number,
      required: [true, 'Selling price in paise is required'],
      min: [0, 'Selling price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Selling price must be an integer in paise',
      },
    },
    stockQuantity: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock quantity must be an integer',
      },
    },
    lowStockThreshold: {
      type: Number,
      default: 2,
      min: [0, 'Low stock threshold cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Low stock threshold must be an integer',
      },
    },
    unit: {
      type: String,
      trim: true,
      default: 'piece',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index: unique SKU per shop if SKU is provided
productSchema.index(
  { shopId: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: { sku: { $type: 'string', $gt: '' } },
  }
);

// Compound indexes for fast shop-scoped lookups and search
productSchema.index({ shopId: 1, name: 1 });
productSchema.index({ shopId: 1, category: 1 });
productSchema.index({ shopId: 1, status: 1 });
productSchema.index({ shopId: 1, stockQuantity: 1, lowStockThreshold: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
