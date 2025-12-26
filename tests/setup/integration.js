// Integration test setup
require('../setup');

const request = require('supertest');
const app = require('../../src/app');

// Create test app instance
global.createTestApp = () => {
  return request(app);
};

// Helper to create authenticated request
global.createAuthenticatedRequest = async (userRole = 'admin') => {
  const jwt = require('jsonwebtoken');
  const mockUser = {
    userId: '507f1f77bcf86cd799439011',
    username: 'testuser',
    role: userRole,
    villageId: '507f1f77bcf86cd799439012'
  };

  const token = jwt.sign(mockUser, process.env.JWT_SECRET);
  return request(app).set('Authorization', `Bearer ${token}`);
};

// Test data factories
global.createTestVillage = () => ({
  name: '测试村',
  code: 'TEST001',
  address: '测试地址',
  population: 1000,
  area: 10.5,
  description: '这是一个测试村庄'
});

global.createTestAnnouncement = () => ({
  title: '测试公告',
  content: '这是一个测试公告内容',
  type: 'notice',
  priority: 'normal',
  villageId: '507f1f77bcf86cd799439012'
});

global.createTestEmergency = () => ({
  type: 'fire',
  title: '火灾报警',
  description: '测试火灾报警描述',
  location: {
    address: '测试地址',
    coordinates: [116.404, 39.915]
  },
  reporterId: '507f1f77bcf86cd799439011',
  villageId: '507f1f77bcf86cd799439012'
});

// Database cleanup helpers
global.clearDatabase = async () => {
  const collections = require('mongoose').connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

// Setup and teardown hooks for integration tests
beforeAll(async () => {
  console.log('🚀 Starting integration tests setup...');
});

afterAll(async () => {
  console.log('🧹 Integration tests cleanup completed');
});