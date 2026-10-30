const mongoose = require('mongoose');
const { getIsReplicaSet } = require('../config/db');

/**
 * Execute a unit of work inside a MongoDB transaction if replica set is available,
 * otherwise execute directly with null session (for standalone dev environments).
 * 
 * @param {Function} work - Async callback receiving { session }
 * @returns {Promise<any>}
 */
const withTransaction = async (work) => {
  const useReplicaSet = getIsReplicaSet();

  if (!useReplicaSet) {
    return await work(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  withTransaction,
};
