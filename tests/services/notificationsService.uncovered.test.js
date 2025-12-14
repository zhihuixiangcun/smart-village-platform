const NotificationsService = require('../../server/services/notificationsService');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Mock dependencies
jest.mock('axios');
jest.mock('fs');
jest.mock('path');
jest.mock('node-cron');

const mockedAxios = axios;
const mockedFs = fs;
const mockedPath = path;
const mockedCron = cron;

describe('NotificationsService - 未覆盖函数测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
  });

  describe('推送通知内部方法', () => {
    test('sendFCMNotification - FCM推送成功', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          results: [
            { message_id: 'fcm_123' },
            { error: 'InvalidRegistration' }
          ]
        }
      });

      const tokens = ['token1', 'token2'];
      const notification = { title: '测试', body: '内容' };
      
      const results = await NotificationsService.sendFCMNotification(tokens, notification);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].messageId).toBe('fcm_123');
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('InvalidRegistration');
    });

    test('sendFCMNotification - FCM推送失败', async () => {
      mockedAxios.post.mockRejectedValue(new Error('FCM服务不可用'));

      const tokens = ['token1'];
      const notification = { title: '测试', body: '内容' };
      
      const results = await NotificationsService.sendFCMNotification(tokens, notification);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('FCM服务不可用');
    });

    test('sendAPNsNotification - APNs推送成功', async () => {
      const tokens = ['apns_token1', 'apns_token2'];
      const notification = { title: '测试', body: '内容' };
      
      const results = await NotificationsService.sendAPNsNotification(tokens, notification);

      expect(results).toHaveLength(2);
      expect(results[0].platform).toBe('apns');
      expect(results[0].success).toBe(true);
      expect(results[0].messageId).toMatch(/^apns_/);
    });
  });

  describe('计划通知执行', () => {
    test('executeScheduledNotification - SMS类型执行成功', async () => {
      const scheduleId = 'test_schedule_1';
      const task = {
        status: 'pending',
        notification: { message: '计划短信' },
        options: {
          type: 'sms',
          recipients: ['13800138000']
        }
      };

      NotificationsService.scheduledNotifications.set(scheduleId, task);

      // Mock SMS发送成功
      jest.spyOn(NotificationsService, 'sendSMS').mockResolvedValue({
        success: true,
        results: [{ success: true }]
      });

      await NotificationsService.executeScheduledNotification(scheduleId);

      const updatedTask = NotificationsService.scheduledNotifications.get(scheduleId);
      expect(updatedTask.status).toBe('completed');
      expect(updatedTask.executedAt).toBeDefined();
    });

    test('executeScheduledNotification - Email类型执行成功', async () => {
      const scheduleId = 'test_schedule_2';
      const task = {
        status: 'pending',
        notification: { title: '计划邮件', message: '计划邮件内容' },
        options: {
          type: 'email',
          recipients: ['test@example.com']
        }
      };

      NotificationsService.scheduledNotifications.set(scheduleId, task);

      jest.spyOn(NotificationsService, 'sendEmail').mockResolvedValue({
        success: true,
        results: [{ success: true }]
      });

      await NotificationsService.executeScheduledNotification(scheduleId);

      const updatedTask = NotificationsService.scheduledNotifications.get(scheduleId);
      expect(updatedTask.status).toBe('completed');
    });

    test('executeScheduledNotification - Push类型执行成功', async () => {
      const scheduleId = 'test_schedule_3';
      const task = {
        status: 'pending',
        notification: { title: '计划推送', body: '推送内容' },
        options: {
          type: 'push',
          recipients: ['device_token']
        }
      };

      NotificationsService.scheduledNotifications.set(scheduleId, task);

      jest.spyOn(NotificationsService, 'sendPushNotification').mockResolvedValue({
        success: true,
        results: [{ success: true }]
      });

      await NotificationsService.executeScheduledNotification(scheduleId);

      const updatedTask = NotificationsService.scheduledNotifications.get(scheduleId);
      expect(updatedTask.status).toBe('completed');
    });

    test('executeScheduledNotification - Broadcast类型执行成功', async () => {
      const scheduleId = 'test_schedule_4';
      const task = {
        status: 'pending',
        notification: { title: '计划广播', message: '广播内容' },
        options: {
          type: 'broadcast',
          villageId: 'village_123'
        }
      };

      NotificationsService.scheduledNotifications.set(scheduleId, task);

      jest.spyOn(NotificationsService, 'sendBroadcast').mockResolvedValue({
        success: true,
        results: {}
      });

      await NotificationsService.executeScheduledNotification(scheduleId);

      const updatedTask = NotificationsService.scheduledNotifications.get(scheduleId);
      expect(updatedTask.status).toBe('completed');
    });

    test('executeScheduledNotification - 未知类型失败', async () => {
      const scheduleId = 'test_schedule_5';
      const task = {
        status: 'pending',
        notification: { message: '未知类型' },
        options: {
          type: 'unknown_type'
        }
      };

      NotificationsService.scheduledNotifications.set(scheduleId, task);

      await NotificationsService.executeScheduledNotification(scheduleId);

      const updatedTask = NotificationsService.scheduledNotifications.get(scheduleId);
      expect(updatedTask.status).toBe('failed');
      expect(updatedTask.error).toBe('未知的通知类型');
    });

    test('executeScheduledNotification - 任务不存在', async () => {
      // 不应该抛出错误，应该静默处理
      await expect(
        NotificationsService.executeScheduledNotification('non_existent_id')
      ).resolves.toBeUndefined();
    });

    test('executeScheduledNotification - 任务状态不是pending', async () => {
      const scheduleId = 'test_schedule_6';
      const task = {
        status: 'completed', // 不是pending
        notification: { message: '已完成任务' },
        options: { type: 'sms' }
      };

      NotificationsService.scheduledNotifications.set(scheduleId, task);

      await NotificationsService.executeScheduledNotification(scheduleId);

      // 任务状态应该保持不变
      const updatedTask = NotificationsService.scheduledNotifications.get(scheduleId);
      expect(updatedTask.status).toBe('completed');
    });

    test('executeScheduledNotification - 执行失败处理', async () => {
      const scheduleId = 'test_schedule_7';
      const task = {
        status: 'pending',
        notification: { message: '执行失败测试' },
        options: {
          type: 'sms',
          recipients: ['13800138000']
        }
      };

      NotificationsService.scheduledNotifications.set(scheduleId, task);

      // Mock SMS发送失败
      jest.spyOn(NotificationsService, 'sendSMS').mockResolvedValue({
        success: false,
        error: '发送失败'
      });

      await NotificationsService.executeScheduledNotification(scheduleId);

      const updatedTask = NotificationsService.scheduledNotifications.get(scheduleId);
      expect(updatedTask.status).toBe('failed');
    });
  });

  describe('定时任务管理', () => {
    test('startScheduledTasks - 启动定时任务', () => {
      const mockSchedule = jest.fn();
      mockedCron.schedule.mockImplementation(mockSchedule);

      NotificationsService.startScheduledTasks();

      expect(mockSchedule).toHaveBeenCalledTimes(2);
      expect(mockSchedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
      expect(mockSchedule).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
    });

    test('cleanupExpiredSchedules - 清理过期任务', () => {
      const mockStop = jest.fn();
      const expiredTask = {
        status: 'completed',
        cronJob: { stop: mockStop }
      };
      const activeTask = {
        status: 'pending',
        scheduledTime: new Date(Date.now() + 3600000), // 未来时间
        cronJob: { stop: jest.fn() }
      };

      NotificationsService.scheduledNotifications.set('expired_1', expiredTask);
      NotificationsService.scheduledNotifications.set('active_1', activeTask);

      NotificationsService.cleanupExpiredSchedules();

      expect(mockStop).toHaveBeenCalled();
      expect(NotificationsService.scheduledNotifications.has('expired_1')).toBe(false);
      expect(NotificationsService.scheduledNotifications.has('active_1')).toBe(true);
    });

    test('cleanupExpiredSchedules - 清理pending但过期的任务', () => {
      const mockStop = jest.fn();
      const expiredPendingTask = {
        status: 'pending',
        scheduledTime: new Date(Date.now() - 3600000), // 过去时间
        cronJob: { stop: mockStop }
      };

      NotificationsService.scheduledNotifications.set('expired_pending', expiredPendingTask);

      NotificationsService.cleanupExpiredSchedules();

      expect(mockStop).toHaveBeenCalled();
      expect(NotificationsService.scheduledNotifications.has('expired_pending')).toBe(false);
    });

    test('backupNotificationHistory - 备份通知历史成功', async () => {
      NotificationsService.notificationHistory = [
        { type: 'sms', message: '测试短信', timestamp: new Date() }
      ];

      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => {});
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedPath.join.mockImplementation((...args) => args.join('/'));

      await NotificationsService.backupNotificationHistory();

      expect(mockedFs.mkdirSync).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    test('backupNotificationHistory - 备份失败处理', async () => {
      mockedPath.join.mockImplementation(() => {
        throw new Error('路径错误');
      });

      // 应该不抛出异常，只是记录错误
      await expect(
        NotificationsService.backupNotificationHistory()
      ).resolves.toBeUndefined();
    });
  });

  describe('数据库相关', () => {
    test('getTargetUsers - 获取目标用户（模拟实现）', async () => {
      const users = await NotificationsService.getTargetUsers('village_123', 'all');

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      expect(users[0]).toHaveProperty('phone');
      expect(users[0]).toHaveProperty('email');
      expect(users[0]).toHaveProperty('deviceToken');
    });
  });

  describe('错误处理和边界情况', () => {
    test('sendSMS - 网络超时处理', async () => {
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: '请求超时'
      });

      const result = await NotificationsService.sendSMS('13800138000', '超时测试');

      expect(result.success).toBe(true);
      expect(result.totalFailed).toBe(1);
      expect(result.results[0].error).toMatch(/超时|请求超时/);
    });

    test('sendEmail - SMTP连接失败', async () => {
      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP连接失败'));
      
      require('nodemailer').createTransporter.mockReturnValue({
        sendMail: mockSendMail
      });

      const result = await NotificationsService.sendEmail(
        'test@example.com',
        '连接失败测试',
        '测试内容'
      );

      expect(result.success).toBe(true);
      expect(result.totalFailed).toBe(1);
      expect(result.results[0].error).toBe('SMTP连接失败');
    });

    test('addToHistory - 历史记录数量限制', () => {
      // 填充超过限制的历史记录
      for (let i = 0; i < 10001; i++) {
        NotificationsService.addToHistory('test', { id: i });
      }

      // 应该被截断到5000条
      expect(NotificationsService.notificationHistory.length).toBe(5000);
    });

    test('getNotificationHistory - 时间范围过滤', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      NotificationsService.notificationHistory = [
        { type: 'sms', timestamp: new Date('2023-12-31') }, // 范围外
        { type: 'email', timestamp: new Date('2024-01-15') }, // 范围内
        { type: 'push', timestamp: new Date('2024-02-01') } // 范围外
      ];

      const result = NotificationsService.getNotificationHistory({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      expect(result.success).toBe(true);
      expect(result.history.length).toBe(1);
      expect(result.history[0].type).toBe('email');
    });

    test('getNotificationStats - 空历史处理', () => {
      NotificationsService.notificationHistory = [];

      const result = NotificationsService.getNotificationStats();

      expect(result.success).toBe(true);
      expect(result.stats.total).toBe(0);
      expect(Object.keys(result.stats.byType).length).toBe(0);
    });

    test('sendBroadcast - 无目标用户处理', async () => {
      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue([]);

      const result = await NotificationsService.sendBroadcast(
        { message: '无用户广播测试' },
        { villageId: 'empty_village' }
      );

      expect(result.success).toBe(true);
      expect(result.targetUsers).toBe(0);
    });

    test('sendBroadcast - 部分渠道失败', async () => {
      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue([
        { phone: '13800138000', email: 'user@example.com' }
      ]);

      // Mock SMS成功，Email失败
      jest.spyOn(NotificationsService, 'sendSMS').mockResolvedValue({
        totalSent: 1,
        totalFailed: 0,
        results: [{ success: true }]
      });

      const mockSendMail = jest.fn().mockRejectedValue(new Error('邮件服务器错误'));
      require('nodemailer').createTransporter.mockReturnValue({
        sendMail: mockSendMail
      });

      const result = await NotificationsService.sendBroadcast(
        { title: '部分失败测试', message: '测试内容' },
        { 
          villageId: 'village_123', 
          channels: ['sms', 'email'] 
        }
      );

      expect(result.success).toBe(true);
      expect(result.results.sms.sent).toBe(1);
      expect(result.results.email.failed).toBe(1);
    });

    test('scheduleNotification - 异常处理', () => {
      // Mock cron.schedule抛出异常
      mockedCron.schedule.mockImplementation(() => {
        throw new Error('Cron调度失败');
      });

      const futureDate = new Date(Date.now() + 3600000);
      
      const result = NotificationsService.scheduleNotification(
        { message: 'Cron异常测试' },
        futureDate
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cron调度失败');
    });
  });

  describe('性能和内存测试', () => {
    test('批量处理性能测试', async () => {
      const largeRecipientList = Array.from({ length: 100 }, (_, i) => `1380013${String(i).padStart(4, '0')}`);
      
      mockedAxios.post.mockResolvedValue({
        data: { message_id: 'sms_123' }
      });

      const startTime = Date.now();
      const result = await NotificationsService.sendSMS(largeRecipientList, '批量测试');
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(100);
      expect(endTime - startTime).toBeLessThan(15000); // 15秒内完成
    });

    test('内存泄露防护测试', () => {
      const initialHistoryLength = NotificationsService.notificationHistory.length;
      
      // 添加大量历史记录
      for (let i = 0; i < 12000; i++) {
        NotificationsService.addToHistory('memory_test', { 
          data: 'x'.repeat(1000) // 1KB数据
        });
      }

      // 应该被自动截断
      expect(NotificationsService.notificationHistory.length).toBe(5000);
    });
  });
});