const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');

// Override system DNS with reliable public resolvers.
// Required when the local/ISP DNS server cannot resolve MongoDB Atlas SRV records.
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

let isReplicaSet = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongodbUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Detect if connected to a replica set (needed for multi-document ACID transactions)
    try {
      const adminDb = conn.connection.db.admin();
      const status = await adminDb.command({ replSetGetStatus: 1 });
      if (status && status.ok) {
        isReplicaSet = true;
        console.log(`[MongoDB] Replica Set '${status.set}' active - ACID transactions fully enabled.`);
      }
    } catch {
      isReplicaSet = false;
      console.log('[MongoDB] Running in standalone mode (no replica set detected). Operations will run directly.');
    }

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected. Reconnecting...');
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection Failed: ${error.message}`);
    process.exit(1);
  }
};

const getIsReplicaSet = () => isReplicaSet;

module.exports = {
  connectDB,
  getIsReplicaSet,
};
