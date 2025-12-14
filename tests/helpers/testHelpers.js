/**
 * Test helpers and utilities for NotificationsService testing
 */
const testData = require('../fixtures/notificationTestData');

class NotificationTestHelpers {
  constructor() {
    this.mockHistory = [];
    this.apiCallHistory = [];
  }

  /**
   * 创建测试用的通知服务实例
   */
  static createTestNotificationService() {
    const NotificationsService = require('../../server/services/notificationsService');
    
    // 重置服务状态
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
    
    return NotificationsService;
  }

  /**
   * 设置标准的API mocks
   */
  static setupStandardMocks() {
    const axios = require('axios');
    const nodemailer = require('nodemailer');
    
    // SMS API mock
    axios.post.mockImplementation((url, data) => {
      if (url.includes('sms.com') || url.includes('text2audio')) {
        return Promise.resolve({
          data: testData.createMockApiResponse('sms', 'success', data)
        });
      }
      
      if (url.includes('fcm.googleapis.com')) {
        return Promise.resolve({
          data: testData.createMockApiResponse('fcm', 'success', data.registration_ids || ['test_token'])
        });
      }
      
      return Promise.resolve({ data: {} });
    });

    // Email mock
    const mockTransporter = {
      sendMail: jest.fn().mockResolvedValue(
        testData.createMockApiResponse('email', 'success', ['test@example.com'])
      )
    };
    nodemailer.createTransporter.mockReturnValue(mockTransporter);

    return { axios, mockTransporter };
  }

  /**
   * 设置错误场景的mocks
   */
  static setupErrorMocks(errorScenario) {
    const axios = require('axios');
    const scenario = testData.errorScenarios[errorScenario];
    
    if (scenario) {
      axios.post.mockImplementation(scenario.mockImplementation);
    }
  }

  /**
   * 生成测试用户数据
   */
  static generateTestUsers(count = 10, villageId = 'test_village') {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `测试用户${i + 1}`,
      phone: `138${String(i).padStart(8, '0')}`,
      email: `testuser${i + 1}@${villageId}.com`,
      deviceToken: `test_token_${i + 1}`,
      role: i === 0 ? 'village_admin' : 'resident',
      villageId: villageId,
      villageName: '测试村庄',
      status: 'active',
      preferences: {
        notifications: {
          emergency: true,
          announcements: i % 2 === 0,
          services: i % 3 === 0
        },
        dialect: ['普通话', '四川话', '粤语'][i % 3]
      }
    }));
  }

  /**
   * 验证通知结果的格式
   */
  static validateNotificationResult(result, expectedFields = []) {
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    
    if (result.success) {
      expect(result).toHaveProperty('results');
      
      if (expectedFields.includes('sms')) {
        expect(result.results).toHaveProperty('sms');
        expect(result.results.sms).toHaveProperty('sent');
        expect(result.results.sms).toHaveProperty('failed');
      }
      
      if (expectedFields.includes('email')) {
        expect(result.results).toHaveProperty('email');
      }
      
      if (expectedFields.includes('push')) {
        expect(result.results).toHaveProperty('push');
      }
    } else {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    }
    
    return result;
  }

  /**
   * 验证性能基准
   */
  static validatePerformance(duration, operation, scale) {
    const benchmark = testData.getPerformanceBenchmark(operation, scale);
    
    if (benchmark) {
      expect(duration).toBeLessThan(benchmark.max_time);
      console.log(`性能验证通过: ${operation}(${scale}) ${duration}ms < ${benchmark.max_time}ms`);
    }
    
    return duration;
  }

  /**
   * 创建性能测试环境
   */
  static createPerformanceTestEnv() {
    const startTime = process.hrtime.bigint();
    const initialMemory = process.memoryUsage();
    
    return {
      startTime,
      initialMemory,
      
      measure() {
        const endTime = process.hrtime.bigint();
        const finalMemory = process.memoryUsage();
        
        return {
          duration: Number(endTime - startTime) / 1000000, // 转换为毫秒
          memoryDelta: finalMemory.heapUsed - initialMemory.heapUsed,
          memoryUsage: finalMemory
        };
      }
    };
  }

  /**
   * 等待异步操作完成
   */
  static async waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`等待超时: ${timeout}ms`);
  }

  /**
   * 模拟网络延迟
   */
  static async simulateNetworkDelay(min = 50, max = 200) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
    return delay;
  }

  /**
   * 批量执行测试操作
   */
  static async executeBatch(operations, concurrency = 5) {
    const results = [];
    const batches = [];
    
    // 分批处理
    for (let i = 0; i < operations.length; i += concurrency) {
      batches.push(operations.slice(i, i + concurrency));
    }
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(async (operation, index) => {
          try {
            const result = await operation();
            return { success: true, result, index };
          } catch (error) {
            return { success: false, error: error.message, index };
          }
        })
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * 验证历史记录的完整性
   */
  static validateHistoryIntegrity(history, expectedCount) {
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(expectedCount);
    
    history.forEach((record, index) => {
      expect(record).toHaveProperty('type');
      expect(record).toHaveProperty('timestamp');
      expect(record.timestamp instanceof Date || typeof record.timestamp === 'string').toBe(true);
      
      if (record.results) {
        expect(Array.isArray(record.results)).toBe(true);
        record.results.forEach(result => {
          expect(result).toHaveProperty('success');
          expect(typeof result.success).toBe('boolean');
        });
      }
    });
    
    return true;
  }

  /**
   * 计算成功率统计
   */
  static calculateSuccessRate(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return 0;
    }
    
    const successCount = results.filter(r => r.success === true).length;
    return (successCount / results.length) * 100;
  }

  /**
   * 生成测试报告
   */
  static generateTestReport(testName, results, performance = {}) {
    const report = {
      testName,
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: results.length,
        passed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        successRate: this.calculateSuccessRate(results)
      },
      performance: {
        duration: performance.duration || 0,
        memoryUsage: performance.memoryDelta || 0,
        avgResponseTime: performance.avgResponseTime || 0
      },
      details: results
    };
    
    console.log(`\n📊 测试报告: ${testName}`);
    console.log(`✅ 通过: ${report.summary.passed}/${report.summary.totalTests}`);
    console.log(`❌ 失败: ${report.summary.failed}/${report.summary.totalTests}`);
    console.log(`📈 成功率: ${report.summary.successRate.toFixed(1)}%`);
    
    if (performance.duration) {
      console.log(`⏱️ 总耗时: ${performance.duration.toFixed(0)}ms`);
    }
    
    if (performance.memoryDelta) {
      console.log(`💾 内存变化: ${(performance.memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return report;
  }

  /**
   * 清理测试环境
   */
  static cleanup() {
    // 清理全局状态
    if (global.gc) {
      global.gc();
    }
    
    // 重置mock历史
    jest.clearAllMocks();
    
    // 清理定时器
    jest.clearAllTimers();
  }
}

// 全局测试辅助函数
global.testHelpers = NotificationTestHelpers;

// 在每个测试前后自动清理
beforeEach(() => {
  NotificationTestHelpers.setupStandardMocks();
});

afterEach(() => {
  NotificationTestHelpers.cleanup();
});

module.exports = NotificationTestHelpers;