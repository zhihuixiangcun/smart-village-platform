const NotificationsService = require('../../server/services/notificationsService');
const axios = require('axios');

jest.mock('axios');

// Mock nodemailer without importing it
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test_email_123',
      response: '250 OK'
    })
  }))
}));

// Mock fs without importing it
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

// Mock node-cron without importing it  
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn()
  }))
}));

describe('NotificationsService - Basic Edge Case Test', () => {
  let mockAxios;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton state like other tests
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
    
    mockAxios = axios;
    
    // Setup basic axios mock
    mockAxios.post.mockResolvedValue({
      data: { message_id: 'test_123', cost: 0.05 }
    });
  });

  test('should handle null/undefined inputs gracefully', async () => {
    const testCases = [
      { recipients: null, message: null },
      { recipients: undefined, message: undefined },
      { recipients: '', message: '' }
    ];

    for (const testCase of testCases) {
      const result = await NotificationsService.sendSMS(testCase.recipients, testCase.message);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      console.log(`✅ Test case handled: recipients=${testCase.recipients}, message=${testCase.message}`);
    }
  });

  test('should handle very long messages', async () => {
    const longMessage = 'x'.repeat(1000); // 1KB message (reduced size)
    const result = await NotificationsService.sendSMS('13800138000', longMessage);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    console.log(`✅ Long message test passed: ${longMessage.length} characters`);
  });
});