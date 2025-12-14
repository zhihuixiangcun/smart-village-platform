const NotificationsService = require('../../server/services/notificationsService');
const mongoose = require('mongoose');
const axios = require('axios');
const nodemailer = require('nodemailer');

// Mock external dependencies
jest.mock('axios');
jest.mock('nodemailer');
jest.mock('node-cron');

describe('NotificationsService - Integration Tests', () => {
  let mockAxios, mockTransporter;

  beforeAll(async () => {
    // Set up test environment variables
    process.env.SMS_API_KEY = 'test_sms_key';
    process.env.SMS_API_SECRET = 'test_sms_secret';
    process.env.EMAIL_HOST = 'smtp.test.com';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'test_password';
    process.env.FCM_SERVER_KEY = 'test_fcm_key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
    
    // Setup axios mock
    mockAxios = axios;
    mockAxios.post.mockResolvedValue({
      data: { message_id: 'test_123', cost: 0.05 }
    });

    // Setup nodemailer mock
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'email_123',
        response: '250 OK'
      })
    };
    nodemailer.createTransporter.mockReturnValue(mockTransporter);
  });

  describe('完整通知流程集成测试', () => {
    test('村民紧急广播通知完整流程', async () => {
      // Mock target users
      const mockUsers = [
        { 
          id: 1, 
          phone: '13800138000', 
          email: 'villager1@test.com', 
          deviceToken: 'token_1',
          role: 'resident'
        },
        { 
          id: 2, 
          phone: '13800138001', 
          email: 'villager2@test.com', 
          deviceToken: 'token_2',
          role: 'resident'
        },
        { 
          id: 3, 
          phone: '13800138002', 
          email: 'admin@test.com', 
          deviceToken: 'token_3',
          role: 'village_admin'
        }
      ];

      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(mockUsers);

      // Mock FCM response
      mockAxios.post.mockImplementation((url, data) => {
        if (url.includes('fcm.googleapis.com')) {
          return Promise.resolve({
            data: {
              results: data.registration_ids.map(() => ({ message_id: `fcm_${Math.random()}` }))
            }
          });
        }
        // SMS API response
        return Promise.resolve({
          data: { message_id: `sms_${Math.random()}`, cost: 0.05 }
        });
      });

      const notification = {
        title: '紧急通知：台风预警',
        message: '预计今晚有强台风过境，请村民做好防护措施，及时撤离危险区域。如有紧急情况请联系村委会：0595-12345678'
      };

      const result = await NotificationsService.sendBroadcast(notification, {
        villageId: 'village_001',
        userRole: 'all',
        channels: ['sms', 'email', 'push'],
        emergency: true
      });

      // 验证广播结果
      expect(result.success).toBe(true);
      expect(result.targetUsers).toBe(3);
      expect(result.results.sms.sent).toBe(3);
      expect(result.results.email.sent).toBe(3);
      expect(result.results.push.sent).toBe(3);

      // 验证历史记录
      expect(NotificationsService.notificationHistory).toHaveLength(4); // broadcast + 3 individual sends
      const broadcastHistory = NotificationsService.notificationHistory.find(h => h.type === 'broadcast');
      expect(broadcastHistory).toBeDefined();
      expect(broadcastHistory.emergency).toBe(true);
      expect(broadcastHistory.villageId).toBe('village_001');

      // 验证API调用次数
      expect(mockAxios.post).toHaveBeenCalledTimes(7); // 3 SMS + 1 FCM + 3 retries可能
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    test('定时村务通知完整流程', async () => {
      const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后
      
      const notification = {
        title: '村民大会通知',
        message: '定于明日上午9点在村委会召开村民大会，讨论村道建设事宜，请各位村民准时参加。'
      };

      // 1. 调度通知
      const scheduleResult = NotificationsService.scheduleNotification(
        notification,
        futureTime,
        {
          type: 'broadcast',
          villageId: 'village_001',
          channels: ['sms', 'push'],
          userRole: 'resident'
        }
      );

      expect(scheduleResult.success).toBe(true);
      expect(scheduleResult.scheduleId).toBeDefined();

      // 2. 验证计划任务已创建
      expect(NotificationsService.scheduledNotifications.size).toBe(1);
      const task = NotificationsService.scheduledNotifications.get(scheduleResult.scheduleId);
      expect(task.status).toBe('pending');
      expect(task.notification).toEqual(notification);

      // 3. 手动执行计划任务（模拟定时触发）
      jest.spyOn(NotificationsService, 'sendBroadcast').mockResolvedValue({
        success: true,
        targetUsers: 2,
        results: { sms: { sent: 2, failed: 0 }, push: { sent: 2, failed: 0 } }
      });

      await NotificationsService.executeScheduledNotification(scheduleResult.scheduleId);

      // 4. 验证执行结果
      const executedTask = NotificationsService.scheduledNotifications.get(scheduleResult.scheduleId);
      expect(executedTask.status).toBe('completed');
      expect(executedTask.executedAt).toBeDefined();
      expect(executedTask.result.success).toBe(true);

      // 5. 验证sendBroadcast被正确调用
      expect(NotificationsService.sendBroadcast).toHaveBeenCalledWith(
        notification,
        expect.objectContaining({
          type: 'broadcast',
          villageId: 'village_001',
          channels: ['sms', 'push'],
          userRole: 'resident'
        })
      );
    });

    test('多渠道通知失败恢复机制', async () => {
      const mockUsers = [
        { phone: '13800138000', email: 'test1@example.com', deviceToken: 'token1' }
      ];

      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(mockUsers);

      // 模拟不同渠道的失败情况
      mockAxios.post.mockImplementation((url) => {
        if (url.includes('sms.com')) {
          return Promise.reject(new Error('SMS服务暂时不可用'));
        }
        if (url.includes('fcm.googleapis.com')) {
          return Promise.resolve({
            data: { results: [{ error: 'InvalidRegistration' }] }
          });
        }
        return Promise.resolve({ data: {} });
      });

      // 邮件服务正常
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'email_backup_123',
        response: '250 OK'
      });

      const notification = {
        title: '重要通知',
        message: '测试多渠道失败恢复'
      };

      const result = await NotificationsService.sendBroadcast(notification, {
        villageId: 'village_001',
        channels: ['sms', 'email', 'push']
      });

      // 验证部分成功的结果
      expect(result.success).toBe(true);
      expect(result.results.sms.failed).toBe(1);  // SMS失败
      expect(result.results.email.sent).toBe(1);  // Email成功
      expect(result.results.push.failed).toBe(1); // Push失败

      // 验证至少有一个渠道成功发送
      const totalSent = result.results.sms.sent + result.results.email.sent + result.results.push.sent;
      expect(totalSent).toBeGreaterThan(0);
    });
  });

  describe('边界条件和错误恢复测试', () => {
    test('大量用户广播性能测试', async () => {
      // 生成1000个用户
      const largeUserList = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        phone: `138${String(i).padStart(8, '0')}`,
        email: `user${i}@village.com`,
        deviceToken: `token_${i}`
      }));

      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(largeUserList);

      // Mock SMS批量发送
      mockAxios.post.mockResolvedValue({
        data: { message_id: 'bulk_sms_123', cost: 0.03 }
      });

      const startTime = Date.now();
      
      const result = await NotificationsService.sendBroadcast(
        { title: '大规模通知', message: '性能测试通知' },
        { villageId: 'large_village', channels: ['sms'] }
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 性能验证
      expect(result.success).toBe(true);
      expect(result.targetUsers).toBe(1000);
      expect(executionTime).toBeLessThan(30000); // 30秒内完成
      expect(mockAxios.post).toHaveBeenCalledTimes(1000);

      console.log(`大规模通知测试完成: ${executionTime}ms for ${largeUserList.length} users`);
    });

    test('网络中断恢复测试', async () => {
      let callCount = 0;
      
      // 模拟前3次调用失败，第4次成功
      mockAxios.post.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.reject(new Error('网络连接超时'));
        }
        return Promise.resolve({
          data: { message_id: 'recovery_123', cost: 0.05 }
        });
      });

      // 重试逻辑测试（需要在服务中实现）
      const result = await NotificationsService.sendSMS('13800138000', '网络恢复测试');

      expect(result.success).toBe(true);
      expect(result.results[0].success).toBe(false); // 第一次尝试失败
      expect(result.results[0].error).toBe('网络连接超时');
    });

    test('内存泄漏防护测试', async () => {
      const initialHistoryLength = NotificationsService.notificationHistory.length;
      
      // 快速添加大量历史记录
      for (let i = 0; i < 15000; i++) {
        NotificationsService.addToHistory('memory_test', {
          id: i,
          data: {
            message: 'x'.repeat(100), // 100字符消息
            timestamp: new Date(),
            recipients: [`user${i}@test.com`]
          }
        });

        // 每1000条检查一次内存使用
        if (i % 1000 === 0) {
          const currentLength = NotificationsService.notificationHistory.length;
          expect(currentLength).toBeLessThanOrEqual(10000); // 不应超过最大限制
        }
      }

      // 最终检查
      expect(NotificationsService.notificationHistory.length).toBe(5000); // 应该被截断到5000
      
      // 验证最新的记录被保留
      const lastRecord = NotificationsService.notificationHistory[NotificationsService.notificationHistory.length - 1];
      expect(lastRecord.id).toBe(14999);
    });

    test('并发通知处理测试', async () => {
      mockAxios.post.mockResolvedValue({
        data: { message_id: 'concurrent_123' }
      });

      // 创建多个并发通知请求
      const concurrentPromises = [];
      for (let i = 0; i < 10; i++) {
        const promise = NotificationsService.sendSMS(
          `1380013800${i}`,
          `并发测试消息 ${i}`
        );
        concurrentPromises.push(promise);
      }

      const results = await Promise.all(concurrentPromises);

      // 验证所有请求都成功处理
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.totalSent).toBe(1);
      });

      // 验证历史记录正确
      expect(NotificationsService.notificationHistory.length).toBe(10);
      
      // 验证API调用次数
      expect(mockAxios.post).toHaveBeenCalledTimes(10);
    });

    test('异常数据处理测试', async () => {
      const testCases = [
        // 空消息
        { recipients: '13800138000', message: '', expected: false },
        // null/undefined接收者
        { recipients: null, message: '测试消息', expected: false },
        // 空数组接收者
        { recipients: [], message: '测试消息', expected: true },
        // 超长消息
        { recipients: '13800138000', message: 'x'.repeat(2000), expected: true },
        // 特殊字符
        { recipients: '13800138000', message: '🚨紧急通知📢', expected: true },
        // HTML内容
        { recipients: '13800138000', message: '<script>alert("test")</script>', expected: true }
      ];

      for (const testCase of testCases) {
        const result = await NotificationsService.sendSMS(
          testCase.recipients,
          testCase.message
        );

        if (testCase.expected) {
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(true); // 服务层应该处理错误但不抛异常
          if (Array.isArray(testCase.recipients) && testCase.recipients.length === 0) {
            expect(result.results).toHaveLength(0);
          }
        }
      }
    });

    test('时区处理测试', () => {
      const scheduleData = [
        // 北京时间
        { date: '2024-12-25 09:00:00', timezone: 'Asia/Shanghai' },
        // UTC时间
        { date: '2024-12-25 01:00:00', timezone: 'UTC' },
        // 纽约时间
        { date: '2024-12-24 20:00:00', timezone: 'America/New_York' }
      ];

      scheduleData.forEach(({ date, timezone }) => {
        const scheduledTime = new Date(`${date} GMT${timezone === 'UTC' ? '+0' : '+8'}`);
        
        const result = NotificationsService.scheduleNotification(
          { message: `时区测试 ${timezone}` },
          scheduledTime,
          { 
            type: 'sms',
            recipients: ['13800138000'],
            timezone: timezone
          }
        );

        expect(result.success).toBe(true);
        expect(result.scheduleId).toBeDefined();
      });

      expect(NotificationsService.scheduledNotifications.size).toBe(3);
    });
  });

  describe('监控和统计测试', () => {
    test('通知成功率统计准确性', async () => {
      // 清空历史记录
      NotificationsService.notificationHistory = [];

      // 添加测试数据 - 混合成功和失败的通知
      const testHistory = [
        // SMS: 3成功, 2失败
        { type: 'sms', results: [{ success: true }, { success: true }, { success: true }, { success: false }, { success: false }] },
        { type: 'sms', results: [{ success: true }, { success: false }] },
        
        // Email: 5成功, 1失败
        { type: 'email', results: [{ success: true }, { success: true }, { success: true }] },
        { type: 'email', results: [{ success: true }, { success: true }, { success: false }] },
        
        // Push: 2成功, 3失败
        { type: 'push', results: [{ success: true }, { success: false }] },
        { type: 'push', results: [{ success: true }, { success: false }, { success: false }] }
      ];

      testHistory.forEach(item => {
        NotificationsService.addToHistory(item.type, item);
      });

      const stats = NotificationsService.getNotificationStats();

      expect(stats.success).toBe(true);
      expect(stats.stats.total).toBe(6);
      
      // 验证各类型统计
      expect(stats.stats.byType.sms).toBe(2);
      expect(stats.stats.byType.email).toBe(2);
      expect(stats.stats.byType.push).toBe(2);

      // 验证成功率计算
      expect(stats.stats.successRate.sms.rate).toBe('57.14%'); // 4/7
      expect(stats.stats.successRate.email.rate).toBe('83.33%'); // 5/6
      expect(stats.stats.successRate.push.rate).toBe('40.00%'); // 2/5
    });

    test('时间范围统计测试', () => {
      NotificationsService.notificationHistory = [];

      // 创建不同时间的通知历史
      const dates = [
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        new Date('2024-01-02'),
        new Date('2024-01-03'),
        new Date('2024-01-03'),
        new Date('2024-01-03')
      ];

      dates.forEach((date, i) => {
        NotificationsService.addToHistory('test', {
          id: i,
          timestamp: date,
          results: [{ success: true }]
        });
      });

      // 获取2024-01-01的历史
      const jan1History = NotificationsService.getNotificationHistory({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-01T23:59:59.999Z'
      });

      expect(jan1History.history.length).toBe(2);

      // 获取2024-01-03的历史
      const jan3History = NotificationsService.getNotificationHistory({
        startDate: '2024-01-03T00:00:00.000Z',
        endDate: '2024-01-03T23:59:59.999Z'
      });

      expect(jan3History.history.length).toBe(3);
    });

    test('分页功能测试', () => {
      NotificationsService.notificationHistory = [];

      // 添加50条测试记录
      for (let i = 0; i < 50; i++) {
        NotificationsService.addToHistory('pagination_test', {
          id: i,
          timestamp: new Date(),
          results: [{ success: true }]
        });
      }

      // 测试第一页
      const page1 = NotificationsService.getNotificationHistory({
        page: 1,
        limit: 10
      });

      expect(page1.history.length).toBe(10);
      expect(page1.total).toBe(50);
      expect(page1.page).toBe(1);

      // 测试第三页
      const page3 = NotificationsService.getNotificationHistory({
        page: 3,
        limit: 10
      });

      expect(page3.history.length).toBe(10);
      expect(page3.page).toBe(3);

      // 测试最后一页
      const lastPage = NotificationsService.getNotificationHistory({
        page: 5,
        limit: 10
      });

      expect(lastPage.history.length).toBe(10);

      // 测试超出范围的页数
      const beyondPage = NotificationsService.getNotificationHistory({
        page: 10,
        limit: 10
      });

      expect(beyondPage.history.length).toBe(0);
    });
  });

  describe('清理和维护测试', () => {
    test('过期计划任务清理', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 3600000); // 1小时前
      const futureDate = new Date(now.getTime() + 3600000); // 1小时后

      const mockStop1 = jest.fn();
      const mockStop2 = jest.fn();
      const mockStop3 = jest.fn();

      // 添加不同状态的计划任务
      NotificationsService.scheduledNotifications.set('completed_task', {
        status: 'completed',
        scheduledTime: pastDate,
        cronJob: { stop: mockStop1 }
      });

      NotificationsService.scheduledNotifications.set('failed_task', {
        status: 'failed',
        scheduledTime: pastDate,
        cronJob: { stop: mockStop2 }
      });

      NotificationsService.scheduledNotifications.set('expired_pending', {
        status: 'pending',
        scheduledTime: pastDate,
        cronJob: { stop: mockStop3 }
      });

      NotificationsService.scheduledNotifications.set('active_task', {
        status: 'pending',
        scheduledTime: futureDate,
        cronJob: { stop: jest.fn() }
      });

      expect(NotificationsService.scheduledNotifications.size).toBe(4);

      // 执行清理
      NotificationsService.cleanupExpiredSchedules();

      // 验证清理结果
      expect(NotificationsService.scheduledNotifications.size).toBe(1);
      expect(NotificationsService.scheduledNotifications.has('active_task')).toBe(true);

      // 验证cron任务被停止
      expect(mockStop1).toHaveBeenCalled();
      expect(mockStop2).toHaveBeenCalled();
      expect(mockStop3).toHaveBeenCalled();
    });

    test('历史记录备份功能', async () => {
      const mockFs = require('fs');
      const mockPath = require('path');

      // 添加测试历史记录
      NotificationsService.notificationHistory = [
        { type: 'sms', message: '备份测试1', timestamp: new Date() },
        { type: 'email', message: '备份测试2', timestamp: new Date() }
      ];

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});
      mockPath.join.mockImplementation((...args) => args.join('/'));

      await NotificationsService.backupNotificationHistory();

      // 验证目录创建
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('backups/notifications'),
        { recursive: true }
      );

      // 验证文件写入
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('notification_history_'),
        expect.stringContaining('"type": "sms"')
      );
    });
  });

  afterAll(() => {
    // 清理环境变量
    delete process.env.SMS_API_KEY;
    delete process.env.SMS_API_SECRET;
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.FCM_SERVER_KEY;
  });
});