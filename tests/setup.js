const mongoose = require('mongoose');

let mongod;

// Set test environment variables first
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.PORT = 0;

// Setup test database before all tests
beforeAll(async () => {
  try {
    // Only set up database if not already connected
    if (mongoose.connection.readyState === 0) {
      try {
        // Try to use mongodb-memory-server if available
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        
        await mongoose.connect(uri, {
          bufferCommands: false,
          bufferMaxEntries: 0,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        
        console.log('✓ Using MongoDB Memory Server for tests');
      } catch (error) {
        // Fallback: skip database tests
        console.log('⚠ MongoDB Memory Server not available, skipping database tests');
        return;
      }
    }
  } catch (error) {
    console.error('Database setup failed:', error.message);
  }
}, 30000);

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    try {
      const collections = await mongoose.connection.db.collections();
      await Promise.all(
        collections.map(collection => collection.deleteMany({}))
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    // Close all connections
    await mongoose.disconnect();
    
    // Stop memory server
    if (mongod) {
      await mongod.stop();
    }
    
    // Clear any remaining timers
    if (global.gc) {
      global.gc();
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}, 30000);