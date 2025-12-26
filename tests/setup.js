const mongoose = require('mongoose');

let mongod;

// Set test environment variables first
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing-in-tests-must-be-32-chars';
process.env.PORT = 0;

// Setup test database before all tests
beforeAll(async () => {
  try {
    // Only set up database if not already connected
    if (mongoose.connection.readyState === 0) {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');

        // Windows-specific configuration
        const isWindows = process.platform === 'win32';
        const mongoServerConfig = {
          instance: {
            port: 27017,
            dbName: 'test_village_db'
          },
          // Windows compatibility options
          binary: {
            version: '6.0.13',
            downloadDir: isWindows
              ? undefined
              : undefined,
          }
        };

        mongod = await MongoMemoryServer.create(mongoServerConfig);
        const uri = mongod.getUri();

        await mongoose.connect(uri, {
          bufferCommands: false,
          bufferMaxEntries: 0,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 60000,
          connectTimeoutMS: 10000,
        });

        console.log('✓ Using MongoDB Memory Server for tests');
        console.log(`  Platform: ${process.platform}`);
        console.log(`  URI: ${uri}`);
      } catch (error) {
        console.error('MongoDB Memory Server setup failed:', error.message);

        // Fallback: try to connect to a local MongoDB instance
        try {
          await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test_village_db', {
            bufferCommands: false,
            bufferMaxEntries: 0,
            serverSelectionTimeoutMS: 5000,
          });
          console.log('✓ Using local MongoDB for tests');
        } catch (localError) {
          console.error('Local MongoDB connection failed:', localError.message);
          console.log('⚠ No database available, skipping database-dependent tests');
          return;
        }
      }
    }
  } catch (error) {
    console.error('Database setup failed:', error.message);
  }
}, 60000);

// Clean up after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    try {
      const collections = await mongoose.connection.db.collections();
      await Promise.all(
        collections.map(collection => collection.deleteMany({}))
      );
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    // Close all connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Stop memory server
    if (mongod) {
      await mongod.stop();
    }

    // Additional cleanup for Windows
    if (process.platform === 'win32') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✓ Test cleanup completed');
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}, 60000);

// Global test utilities
global.getTestUser = () => ({
  _id: new mongoose.Types.ObjectId(),
  name: 'Test User',
  phone: '13800138000',
  role: 'villager',
  villageId: new mongoose.Types.ObjectId()
});

global.getTestVillage = () => ({
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Village',
  code: 'TV001',
  address: 'Test Address',
  population: 100
});
