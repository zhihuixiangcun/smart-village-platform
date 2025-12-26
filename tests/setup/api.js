// API test setup
require('../setup');

const request = require('supertest');
const app = require('../../src/app');

// API testing utilities
global.api = request(app);

// Response assertion helpers
global.expectSuccess = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
};

global.expectError = (response, statusCode = 400) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBeDefined();
};

expect.extend({
  toBeValidApiResponse(received) {
    const hasSuccess = typeof received.success === 'boolean';
    const hasData = received.data !== undefined || received.message !== undefined;

    if (hasSuccess && hasData) {
      return {
        message: () => `expected ${received} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid API response with success and data/message fields`,
        pass: false,
      };
    }
  },

  toBeValidPaginatedResponse(received) {
    const isValid = received.data &&
                   Array.isArray(received.data.items) &&
                   typeof received.data.pagination === 'object' &&
                   typeof received.data.pagination.page === 'number' &&
                   typeof received.data.pagination.limit === 'number' &&
                   typeof received.data.pagination.total === 'number';

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid paginated response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid paginated response with proper data and pagination structure`,
        pass: false,
      };
    }
  }
});

// Mock file upload for API testing
global.mockFileUpload = {
  fieldname: 'file',
  originalname: 'test-image.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: Buffer.from('fake-image-data'),
  path: '/tmp/test-upload.jpg'
};

// Rate limiting test helper
global.testRateLimit = async (endpoint, maxRequests = 10) => {
  const responses = [];
  for (let i = 0; i < maxRequests + 5; i++) {
    const response = await global.api.get(endpoint);
    responses.push(response);
  }

  const rateLimitedResponses = responses.filter(r => r.status === 429);
  expect(rateLimitedResponses.length).toBeGreaterThan(0);

  return responses;
};