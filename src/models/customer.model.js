const mongoose = require('mongoose');

const customerAddressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true, default: '' },
    line2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Shop ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Customer phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: customerAddressSchema,
      default: () => ({}),
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
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
// Unique phone number per shop to avoid duplicate ledger accounts
customerSchema.index({ shopId: 1, phone: 1 }, { unique: true });
customerSchema.index({ shopId: 1, name: 1 });
customerSchema.index({ shopId: 1, status: 1, createdAt: -1 });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
