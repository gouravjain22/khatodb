const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true, default: '' },
    line2: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'India' },
  },
  { _id: false }
);

const businessDetailsSchema = new mongoose.Schema(
  {
    businessType: { type: String, trim: true, default: 'kirana' },
    description: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: addressSchema, default: () => ({}) },
  },
  { _id: false }
);

const legalDetailsSchema = new mongoose.Schema(
  {
    gstRegistered: { type: Boolean, default: false },
    gstin: { type: String, trim: true, default: null },
    businessRegistrationNumber: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    currency: { type: String, default: 'INR' },
    language: { type: String, default: 'hi' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    financialYearStartMonth: { type: Number, default: 4, min: 1, max: 12 },
  },
  { _id: false }
);

const preferencesSchema = new mongoose.Schema(
  {
    inventoryEnabled: { type: Boolean, default: true },
    billingEnabled: { type: Boolean, default: true },
    khataEnabled: { type: Boolean, default: true },
    lowStockAlertsEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    plan: { type: String, default: 'free' },
    status: { type: String, default: 'active' },
  },
  { _id: false }
);

const shopSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
      index: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Owner user ID is required'],
      index: true,
    },
    businessDetails: {
      type: businessDetailsSchema,
      required: true,
    },
    legalDetails: {
      type: legalDetailsSchema,
      default: () => ({}),
    },
    settings: {
      type: settingsSchema,
      default: () => ({}),
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({}),
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

shopSchema.index({ 'businessDetails.phone': 1 });
shopSchema.index({ status: 1, createdAt: -1 });

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;
