// Unit test setup
require('../setup');

// Mock external dependencies
jest.mock('../src/services/ocrService');
jest.mock('../src/services/familyService');
jest.mock('../src/services/emergencyBroadcastService');

// Mock file uploads
jest.mock('multer', () => ({
  single: jest.fn(() => (req, res, next) => {
    req.file = {
      fieldname: 'image',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test image data')
    };
    next();
  }),
  array: jest.fn(() => (req, res, next) => {
    req.files = [];
    next();
  })
}));

// Mock Socket.IO
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
    on: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
    in: jest.fn(() => ({ emit: jest.fn() }))
  }))
}));

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ userId: 'mock-user-id', role: 'admin' }))
}));

// Global test helpers
global.createMockUser = () => ({
  _id: '507f1f77bcf86cd799439011',
  username: 'testuser',
  email: 'test@example.com',
  role: 'villager',
  villageId: '507f1f77bcf86cd799439012'
});

global.createMockResident = () => ({
  _id: '507f1f77bcf86cd799439013',
  name: '测试村民',
  idCard: '110101199001011234',
  phone: '13800138000',
  address: '测试地址',
  villageId: '507f1f77bcf86cd799439012'
});