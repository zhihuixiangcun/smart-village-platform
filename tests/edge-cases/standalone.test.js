const NotificationsService = require('../../server/services/notificationsService');

// Complete inline mocks - no external dependencies
jest.mock('axios', () => ({
  post: jest.fn()
}));

jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test_email_123',
      response: '250 OK'
    })
  }))
}));

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(() => '{}')
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn()
  }))
}));

describe('NotificationsService - Standalone Edge Case Test', () => {
  const axios = require('axios');

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset service state
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
    
    // Setup axios mock
    axios.post.mockResolvedValue({
      data: { 
        message_id: 'test_123', 
        cost: 0.05,
        status: 'sent'
      }
    });
  });

  test('should handle null inputs gracefully', async () => {
    console.log('🧪 Testing null input handling...');
    
    const result = await NotificationsService.sendSMS(null, null);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    
    console.log('✅ Null input test passed:', result);
  });

  test('should handle undefined inputs gracefully', async () => {
    console.log('🧪 Testing undefined input handling...');
    
    const result = await NotificationsService.sendSMS(undefined, undefined);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    
    console.log('✅ Undefined input test passed:', result);
  });

  test('should handle empty string inputs', async () => {
    console.log('🧪 Testing empty string handling...');
    
    const result = await NotificationsService.sendSMS('', '');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    
    console.log('✅ Empty string test passed:', result);
  });

  test('should handle large messages', async () => {
    console.log('🧪 Testing large message handling...');
    
    const largeMessage = 'x'.repeat(1000); // 1KB message
    const result = await NotificationsService.sendSMS('13800138000', largeMessage);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    
    console.log(`✅ Large message test passed: ${largeMessage.length} characters`);
  });

  test('should handle special characters', async () => {
    console.log('🧪 Testing special character handling...');
    
    const specialMessage = '🌪️台风预警🚨 特殊字符测试: <script>alert("test")</script>';
    const result = await NotificationsService.sendSMS('13800138000', specialMessage);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    
    console.log('✅ Special character test passed');
  });
});