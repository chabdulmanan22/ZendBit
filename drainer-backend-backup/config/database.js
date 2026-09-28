const mongoose = require('mongoose');

const connectDB = async () => {
  let uri = process.env.MONGODB_URI;

  try {
    // Try connecting to real MongoDB first
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000, // fail fast if not available
    });
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn('Real MongoDB not available, falling back to in-memory MongoDB...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log(`✅ In-Memory MongoDB started: ${memUri}`);
      console.log('⚠️  Note: Data will be lost when server restarts (in-memory mode)');
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB:', memErr);
      process.exit(1);
    }
  }
};

module.exports = connectDB;

