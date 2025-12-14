const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

/**
 * Test helper utilities
 */
class TestHelpers {
  /**
   * Create a test user token
   */
  static createAuthToken(userId = new mongoose.Types.ObjectId(), role = 'resident') {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Create test user data
   */
  static createTestUser(overrides = {}) {
    return {
      name: 'Test User',
      email: 'test@example.com',
      phone: '13800138000',
      idCard: '110101199001010001',
      role: 'resident',
      address: 'Test Address',
      ...overrides
    };
  }

  /**
   * Create test announcement data
   */
  static createTestAnnouncement(overrides = {}) {
    return {
      title: 'Test Announcement',
      content: 'This is a test announcement content',
      category: 'general',
      priority: 'normal',
      status: 'published',
      ...overrides
    };
  }

  /**
   * Create test service request data
   */
  static createTestServiceRequest(overrides = {}) {
    return {
      title: 'Test Service Request',
      description: 'This is a test service request',
      category: 'maintenance',
      priority: 'normal',
      status: 'pending',
      ...overrides
    };
  }

  /**
   * Wait for async operations
   */
  static async wait(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all collections
   */
  static async clearDatabase() {
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.collections();
      for (let collection of collections) {
        await collection.deleteMany({});
      }
    }
  }
}

module.exports = TestHelpers;