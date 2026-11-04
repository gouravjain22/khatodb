const mongoose = require('mongoose');
const { Shop } = require('../models/index');
const AppError = require('./appError');

/**
 * Validates that a shop exists and that the authenticated user owns it.
 * Supports both shop._id and shop.ownerUserId to handle edge cases smoothly.
 *
 * @param {string|mongoose.Types.ObjectId} shopId
 * @param {Object} user - req.user from auth middleware
 * @returns {Promise<{ shop: Object, targetShopIds: mongoose.Types.ObjectId[] }>}
 */
const verifyShopAccess = async (shopId, user) => {
  if (!shopId) {
    throw new AppError('Shop ID is required.', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(shopId)) {
    throw new AppError('Invalid shop ID format.', 400);
  }

  const requestedObjectId = new mongoose.Types.ObjectId(shopId);

  let shop = await Shop.findById(requestedObjectId).lean();
  if (!shop) {
    shop = await Shop.findOne({ ownerUserId: requestedObjectId }).lean();
  }

  if (!shop) {
    throw new AppError('Shop not found.', 404);
  }

  // Cross-shop access prevention: user must own the shop (unless admin)
  if (user && !user.isAdmin) {
    const isOwner = shop.ownerUserId.toString() === user._id.toString();
    if (!isOwner) {
      throw new AppError('Access denied: You do not own or have permission to access this shop.', 403);
    }
  }

  const targetShopIds = [shop._id];
  if (requestedObjectId.toString() !== shop._id.toString()) {
    targetShopIds.push(requestedObjectId);
  }

  return { shop, targetShopIds };
};

module.exports = {
  verifyShopAccess,
};

