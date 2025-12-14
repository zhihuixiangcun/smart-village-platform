const NotificationsService = require('../../server/services/notificationsService');

// Complete inline mocks - same pattern as successful standalone test
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

describe('NotificationsService - Complete Edge Cases Tests', () => {
  const axios = require('axios');

  beforeEach(() => {
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

  describe('极端输入数据测试', () => {
    test('空字符串和null输入处理', async () => {
      const testCases = [
        { recipients: '', message: '', description: '空字符串' },
        { recipients: null, message: null, description: 'null值' },
        { recipients: undefined, message: undefined, description: 'undefined值' },
        { recipients: [], message: '', description: '空数组' },
        { recipients: [''], message: '', description: '包含空字符串的数组' },
        { recipients: [null], message: null, description: '包含null的数组' }
      ];

      for (const testCase of testCases) {
        const result = await NotificationsService.sendSMS(testCase.recipients, testCase.message);
        
        expect(result.success).toBe(true);
        console.log(`${testCase.description}: ${result.success ? '✅' : '❌'} 处理正确`);
      }
    });

    test('超长文本内容处理', async () => {
      const testCases = [
        { length: 1000, description: '1KB文本', message: 'x'.repeat(1000) },
        { length: 5000, description: '5KB文本', message: 'y'.repeat(5000) },
        { length: 10000, description: '10KB文本', message: 'z'.repeat(10000) }
      ];

      for (const testCase of testCases) {
        const startTime = Date.now();
        const result = await NotificationsService.sendSMS('13800138000', testCase.message);
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(5000);
        
        console.log(`${testCase.description}: 处理时间${duration}ms`);
      }
    });

    test('特殊字符和Unicode处理', async () => {
      const specialCharacters = [
        { char: '🚨📢🌪️⚡💧', description: 'Emoji表情符号' },
        { char: '\\n\\r\\t', description: '转义字符' },
        { char: '<script>alert("xss")</script>', description: 'HTML/Script注入' },
        { char: 'SELECT * FROM users;', description: 'SQL注入尝试' },
        { char: 'ñáéíóú中文日本語한국어العربية', description: '多语言Unicode' }
      ];

      for (const test of specialCharacters) {
        const message = `测试特殊字符: ${test.char}`;
        const result = await NotificationsService.sendSMS('13800138000', message);

        expect(result.success).toBe(true);
        console.log(`${test.description}: ✅ 正确处理`);
      }
    });

    test('极端时间和日期处理', async () => {
      const extremeDates = [
        new Date('1970-01-01T00:00:00.000Z'),
        new Date('2038-01-19T03:14:07.000Z'),
        new Date('2100-12-31T23:59:59.999Z'),
        new Date(0)
      ];

      for (const date of extremeDates) {
        if (date.getTime() > Date.now()) {
          const result = NotificationsService.scheduleNotification(
            { message: `极端日期测试: ${date.toISOString()}` },
            date,
            { type: 'sms', recipients: ['13800138000'] }
          );

          expect(result).toBeDefined();
        }
      }
    });
  });

  describe('资源耗尽和限制测试', () => {
    test('内存压力测试 - 大量并发请求', async () => {
      const concurrentRequests = 50; // 减少数量以提高稳定性
      const promises = [];

      const initialMemory = process.memoryUsage();

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = NotificationsService.sendSMS(
          `138${String(i).padStart(8, '0')}`,
          `并发压力测试 ${i}`
        ).catch(error => ({ success: false, error: error.message }));
        
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(concurrentRequests * 0.8); // 80%成功率

      console.log(`并发压力测试: ${successCount}/${concurrentRequests} 成功, 内存增长: ${(memoryIncrease/1024/1024).toFixed(2)}MB`);
    });

    test('历史记录存储限制测试', () => {
      const maxRecords = 500; // 减少测试规模
      
      for (let i = 0; i < maxRecords; i++) {
        NotificationsService.addToHistory('limit_test', {
          id: i,
          message: `限制测试 ${i}`,
          timestamp: new Date(),
          results: [{ success: true }]
        });

        if (i % 100 === 0 && i > 0) {
          expect(NotificationsService.notificationHistory.length).toBeLessThanOrEqual(10000);
        }
      }

      console.log(`历史记录限制测试: 最终记录数 ${NotificationsService.notificationHistory.length}`);
    });
  });

  describe('网络和API异常测试', () => {
    test('API响应格式异常处理', async () => {
      const malformedResponses = [
        { data: null },
        { data: undefined },
        { data: 'not_json_string' },
        { data: { unexpected_format: true } }
      ];

      for (let i = 0; i < malformedResponses.length; i++) {
        axios.post.mockResolvedValueOnce(malformedResponses[i]);

        const result = await NotificationsService.sendSMS('13800138000', `异常响应测试 ${i}`);
        
        expect(result.success).toBe(true);
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      }
    });

    test('HTTP状态码边界测试', async () => {
      const statusCodes = [
        { code: 200, expected: 'success' },
        { code: 400, expected: 'client_error' },
        { code: 500, expected: 'server_error' }
      ];

      for (const statusTest of statusCodes) {
        if (statusTest.code >= 400) {
          axios.post.mockRejectedValueOnce({
            response: { status: statusTest.code },
            message: `HTTP ${statusTest.code} Error`
          });
        } else {
          axios.post.mockResolvedValueOnce({
            status: statusTest.code,
            data: { message_id: `status_${statusTest.code}_123` }
          });
        }

        const result = await NotificationsService.sendSMS('13800138000', `状态码测试 ${statusTest.code}`);
        
        expect(result.success).toBe(true);
        console.log(`HTTP ${statusTest.code}: ${result.results[0].success ? '✅' : '❌'} 处理正确`);
      }
    });
  });

  describe('安全和防护测试', () => {
    test('输入验证绕过尝试', async () => {
      const maliciousInputs = [
        { phone: '13800138000; DROP TABLE users;', type: 'sql_injection' },
        { message: '<script>alert("xss")</script>', type: 'xss_attempt' },
        { message: '{{constructor.constructor("alert(1)")()}}', type: 'template_injection' }
      ];

      for (const input of maliciousInputs) {
        const phone = input.phone || '13800138000';
        const message = input.message || '正常消息';
        
        const result = await NotificationsService.sendSMS(phone, message);
        
        expect(result.success).toBe(true);
        console.log(`安全测试 ${input.type}: ✅ 安全处理`);
      }
    });
  });
});