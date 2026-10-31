const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isAdmin:{
      type: Boolean,
      enum:[true, false]
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);