const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    sequenceName: {
      type: String,
      required: true,
      default: 'invoice',
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

counterSchema.index({ shopId: 1, sequenceName: 1 }, { unique: true });

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
