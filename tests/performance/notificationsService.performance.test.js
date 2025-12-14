const NotificationsService = require('../../server/services/notificationsService');

describe('NotificationsService - Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
    
    // Mock axios for performance tests
    const axios = require('axios');
    axios.post.mockResolvedValue({
      data: { message_id: 'perf_test_123', cost: 0.01 }
    });
  });

  describe('短信发送性能测试', () => {
    test('单次短信发送响应时间', async () => {
      const startTime = process.hrtime.bigint();
      
      const result = await NotificationsService.sendSMS('13800138000', '性能测试消息');
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // 应在1秒内完成
      
      console.log(`单次SMS发送耗时: ${duration.toFixed(2)}ms`);
    });

    test('批量短信发送性能基准', async () => {
      const recipients = [];
      for (let i = 0; i < 100; i++) {
        recipients.push(`138${String(i).padStart(8, '0')}`);
      }

      const startTime = process.hrtime.bigint();
      
      const result = await NotificationsService.sendSMS(recipients, '批量性能测试');
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(100);
      expect(duration).toBeLessThan(15000); // 15秒内完成100条短信
      
      const avgTime = duration / recipients.length;
      expect(avgTime).toBeLessThan(150); // 平均每条短信150ms内

      console.log(`批量SMS发送 (${recipients.length}条): 总耗时${duration.toFixed(2)}ms, 平均${avgTime.toFixed(2)}ms/条`);
    });

    test('大规模短信发送压力测试', async () => {
      const recipients = [];
      for (let i = 0; i < 1000; i++) {
        recipients.push(`139${String(i).padStart(8, '0')}`);
      }

      const startTime = Date.now();
      
      const result = await NotificationsService.sendSMS(recipients, '压力测试消息');
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(1000);
      expect(duration).toBeLessThan(60000); // 1分钟内完成1000条短信
      
      // 验证内存使用合理（通过历史记录检查）
      expect(NotificationsService.notificationHistory.length).toBeLessThanOrEqual(10);

      console.log(`大规模SMS压力测试 (${recipients.length}条): ${duration}ms`);
    });
  });

  describe('邮件发送性能测试', () => {
    beforeEach(() => {
      const nodemailer = require('nodemailer');
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({
          messageId: 'email_perf_123',
          response: '250 OK'
        })
      };
      nodemailer.createTransporter.mockReturnValue(mockTransporter);
    });

    test('单次邮件发送性能', async () => {
      const startTime = process.hrtime.bigint();
      
      const result = await NotificationsService.sendEmail(
        'performance@test.com',
        '性能测试邮件',
        '这是邮件性能测试内容'
      );
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000); // 邮件发送2秒内完成
      
      console.log(`单次邮件发送耗时: ${duration.toFixed(2)}ms`);
    });

    test('批量邮件发送性能', async () => {
      const recipients = [];
      for (let i = 0; i < 50; i++) {
        recipients.push(`user${i}@performance.test`);
      }

      const startTime = process.hrtime.bigint();
      
      const result = await NotificationsService.sendEmail(
        recipients,
        '批量性能测试邮件',
        '这是批量邮件性能测试内容'
      );
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(50);
      expect(duration).toBeLessThan(10000); // 50封邮件10秒内完成
      
      console.log(`批量邮件发送 (${recipients.length}封): ${duration.toFixed(2)}ms`);
    });
  });

  describe('推送通知性能测试', () => {
    test('FCM推送性能测试', async () => {
      const tokens = [];
      for (let i = 0; i < 100; i++) {
        tokens.push(`fcm_token_${i}`);
      }

      const startTime = process.hrtime.bigint();
      
      const result = await NotificationsService.sendPushNotification(
        tokens,
        { title: 'FCM性能测试', body: '推送性能测试内容' },
        { platform: 'android' }
      );
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(3000); // FCM推送3秒内完成
      
      console.log(`FCM推送 (${tokens.length}个设备): ${duration.toFixed(2)}ms`);
    });

    test('混合平台推送性能', async () => {
      const androidTokens = Array.from({ length: 50 }, (_, i) => `android_token_${i}`);
      const iosTokens = Array.from({ length: 50 }, (_, i) => `ios_token_${i}`);

      const notification = {
        title: '混合推送性能测试',
        body: '跨平台推送性能测试'
      };

      const startTime = process.hrtime.bigint();
      
      const [androidResult, iosResult] = await Promise.all([
        NotificationsService.sendPushNotification(androidTokens, notification, { platform: 'android' }),
        NotificationsService.sendPushNotification(iosTokens, notification, { platform: 'ios' })
      ]);
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(androidResult.success).toBe(true);
      expect(iosResult.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 混合推送5秒内完成
      
      console.log(`混合平台推送 (Android: ${androidTokens.length}, iOS: ${iosTokens.length}): ${duration.toFixed(2)}ms`);
    });
  });

  describe('广播通知性能测试', () => {
    beforeEach(() => {
      // Mock getTargetUsers 返回大量用户
      jest.spyOn(NotificationsService, 'getTargetUsers').mockImplementation(async (villageId, userRole) => {
        const userCount = villageId === 'large_village' ? 5000 : 100;
        return Array.from({ length: userCount }, (_, i) => ({
          id: i + 1,
          phone: `138${String(i).padStart(8, '0')}`,
          email: `user${i}@${villageId}.com`,
          deviceToken: `token_${i}`
        }));
      });
    });

    test('中等规模村庄广播性能', async () => {
      const startTime = process.hrtime.bigint();
      
      const result = await NotificationsService.sendBroadcast(
        { title: '村庄通知', message: '中等规模广播测试' },
        { villageId: 'medium_village', channels: ['sms'] }
      );
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(result.success).toBe(true);
      expect(result.targetUsers).toBe(100);
      expect(duration).toBeLessThan(20000); // 20秒内完成
      
      console.log(`中等规模广播 (${result.targetUsers}人): ${duration.toFixed(2)}ms`);
    });

    test('大规模村庄广播性能', async () => {
      const startTime = process.hrtime.bigint();
      
      const result = await NotificationsService.sendBroadcast(
        { title: '紧急广播', message: '大规模广播测试' },
        { villageId: 'large_village', channels: ['sms'], emergency: true }
      );
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(result.success).toBe(true);
      expect(result.targetUsers).toBe(5000);
      expect(duration).toBeLessThan(120000); // 2分钟内完成
      
      const avgTime = duration / result.targetUsers;
      expect(avgTime).toBeLessThan(25); // 平均每人25ms内
      
      console.log(`大规模广播 (${result.targetUsers}人): 总耗时${(duration/1000).toFixed(2)}s, 平均${avgTime.toFixed(2)}ms/人`);
    });

    test('多渠道广播性能对比', async () => {
      const channels = [
        ['sms'],
        ['email'],
        ['push'],
        ['sms', 'email'],
        ['sms', 'push'],
        ['sms', 'email', 'push']
      ];

      const results = [];

      for (const channelSet of channels) {
        const startTime = process.hrtime.bigint();
        
        const result = await NotificationsService.sendBroadcast(
          { title: '多渠道测试', message: '渠道性能对比测试' },
          { villageId: 'medium_village', channels: channelSet }
        );
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;

        results.push({
          channels: channelSet.join('+'),
          duration: duration,
          targetUsers: result.targetUsers
        });

        expect(result.success).toBe(true);
      }

      // 输出性能对比结果
      console.log('\n多渠道广播性能对比:');
      results.forEach(result => {
        console.log(`${result.channels}: ${result.duration.toFixed(2)}ms (${result.targetUsers}人)`);
      });

      // 验证渠道越多，耗时相应增加（但应该在合理范围内）
      const singleChannelTime = results.find(r => r.channels === 'sms').duration;
      const tripleChannelTime = results.find(r => r.channels === 'sms+email+push').duration;
      
      expect(tripleChannelTime).toBeGreaterThan(singleChannelTime);
      expect(tripleChannelTime / singleChannelTime).toBeLessThan(5); // 不应超过5倍差异
    });
  });

  describe('计划通知性能测试', () => {
    test('大量计划任务创建性能', () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const taskCount = 1000;

      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < taskCount; i++) {
        const scheduledTime = new Date(futureTime.getTime() + i * 60000); // 每分钟一个任务
        
        const result = NotificationsService.scheduleNotification(
          { message: `计划任务 ${i}` },
          scheduledTime,
          { type: 'sms', recipients: [`1380013800${i % 10}`] }
        );

        expect(result.success).toBe(true);
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(NotificationsService.scheduledNotifications.size).toBe(taskCount);
      expect(duration).toBeLessThan(5000); // 5秒内创建1000个任务
      
      console.log(`创建${taskCount}个计划任务: ${duration.toFixed(2)}ms, 平均${(duration/taskCount).toFixed(2)}ms/任务`);
    });

    test('计划任务清理性能', () => {
      // 创建大量已完成和过期的任务
      const mockStop = jest.fn();
      
      for (let i = 0; i < 5000; i++) {
        const pastTime = new Date(Date.now() - Math.random() * 86400000); // 随机过去时间
        const status = ['completed', 'failed', 'pending'][Math.floor(Math.random() * 3)];
        
        NotificationsService.scheduledNotifications.set(`task_${i}`, {
          status: status,
          scheduledTime: pastTime,
          cronJob: { stop: mockStop }
        });
      }

      expect(NotificationsService.scheduledNotifications.size).toBe(5000);

      const startTime = process.hrtime.bigint();
      
      NotificationsService.cleanupExpiredSchedules();
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(duration).toBeLessThan(1000); // 1秒内清理5000个任务
      expect(NotificationsService.scheduledNotifications.size).toBeLessThan(2000); // 应该清理了大部分
      
      console.log(`清理计划任务: ${duration.toFixed(2)}ms, 剩余任务${NotificationsService.scheduledNotifications.size}个`);
    });
  });

  describe('内存使用性能测试', () => {
    test('历史记录内存增长控制', () => {
      const initialMemory = process.memoryUsage();
      
      // 快速添加大量历史记录
      for (let i = 0; i < 20000; i++) {
        NotificationsService.addToHistory('memory_test', {
          id: i,
          message: `测试消息 ${i}`.repeat(10), // 增加消息长度
          timestamp: new Date(),
          recipients: [`user${i}@test.com`],
          results: [{ success: i % 2 === 0 }]
        });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // 验证历史记录被正确截断
      expect(NotificationsService.notificationHistory.length).toBe(5000);
      
      // 验证内存增长在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB, 历史记录: ${NotificationsService.notificationHistory.length}条`);
    });

    test('统计计算性能', () => {
      // 创建大量历史数据
      for (let i = 0; i < 10000; i++) {
        const types = ['sms', 'email', 'push'];
        const type = types[i % types.length];
        const resultCount = Math.floor(Math.random() * 10) + 1;
        const results = Array.from({ length: resultCount }, (_, j) => ({
          success: Math.random() > 0.3 // 70%成功率
        }));

        NotificationsService.addToHistory(type, {
          id: i,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 过去30天
          results: results
        });
      }

      const startTime = process.hrtime.bigint();
      
      const stats = NotificationsService.getNotificationStats();
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      expect(stats.success).toBe(true);
      expect(stats.stats.total).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // 统计计算500ms内完成
      
      console.log(`统计计算 (${stats.stats.total}条记录): ${duration.toFixed(2)}ms`);
    });

    test('并发操作内存安全性', async () => {
      const operations = [];

      // 创建多个并发操作
      for (let i = 0; i < 50; i++) {
        operations.push(
          NotificationsService.sendSMS(`1380013${String(i).padStart(4, '0')}`, `并发测试 ${i}`)
        );
      }

      const startMemory = process.memoryUsage();
      
      const results = await Promise.all(operations);
      
      const endMemory = process.memoryUsage();
      const memoryDiff = endMemory.heapUsed - startMemory.heapUsed;

      // 验证所有操作成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 验证内存增长合理（小于10MB）
      expect(memoryDiff).toBeLessThan(10 * 1024 * 1024);
      
      console.log(`并发操作内存变化: ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('数据库查询性能测试（模拟）', () => {
    test('大规模用户查询性能', async () => {
      // 模拟数据库查询延迟
      const originalGetTargetUsers = NotificationsService.getTargetUsers;
      jest.spyOn(NotificationsService, 'getTargetUsers').mockImplementation(async (villageId, userRole) => {
        // 模拟数据库查询时间
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        const userCount = villageId.includes('large') ? 10000 : 1000;
        return Array.from({ length: userCount }, (_, i) => ({
          id: i + 1,
          phone: `138${String(i).padStart(8, '0')}`,
          email: `user${i}@${villageId}.com`
        }));
      });

      const queryTests = [
        { villageId: 'small_village', expectedUsers: 1000 },
        { villageId: 'large_village_1', expectedUsers: 10000 },
        { villageId: 'large_village_2', expectedUsers: 10000 }
      ];

      for (const test of queryTests) {
        const startTime = process.hrtime.bigint();
        
        const users = await NotificationsService.getTargetUsers(test.villageId, 'all');
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000;

        expect(users.length).toBe(test.expectedUsers);
        expect(duration).toBeLessThan(200); // 查询应在200ms内完成
        
        console.log(`用户查询 ${test.villageId} (${users.length}人): ${duration.toFixed(2)}ms`);
      }
    });
  });

  afterEach(() => {
    // 清理资源
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications.clear();
    
    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }
  });
});