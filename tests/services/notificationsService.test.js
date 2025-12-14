const NotificationsService = require('../../server/services/notificationsService');
const axios = require('axios');

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios;

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn()
  }))
}));

// Mock cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn()
  }))
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(() => ({ mtime: new Date() })),
  unlinkSync: jest.fn()
}));

describe('NotificationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
  });

  describe('SMS功能测试', () => {
    test('sendSMS - 发送单个短信成功', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          message_id: 'sms_123',
          cost: 0.05
        }
      });

      const result = await NotificationsService.sendSMS('13800138000', '测试短信');

      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].messageId).toBe('sms_123');
    });

    test('sendSMS - 发送多个短信', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          message_id: 'sms_123',
          cost: 0.05
        }
      });

      const result = await NotificationsService.sendSMS(
        ['13800138000', '13800138001'], 
        '批量短信测试'
      );

      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    test('sendSMS - 无效手机号处理', async () => {
      const result = await NotificationsService.sendSMS('invalid_phone', '测试短信');

      expect(result.success).toBe(true);
      expect(result.totalFailed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('手机号格式无效');
    });

    test('sendSMS - API调用失败', async () => {
      mockedAxios.post.mockRejectedValue(new Error('网络错误'));

      const result = await NotificationsService.sendSMS('13800138000', '测试短信');

      expect(result.success).toBe(true);
      expect(result.totalFailed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('网络错误');
    });
  });

  describe('邮件功能测试', () => {
    test('sendEmail - 发送单个邮件成功', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({
        messageId: 'email_123',
        response: '250 OK'
      });
      
      require('nodemailer').createTransporter.mockReturnValue({
        sendMail: mockSendMail
      });

      const result = await NotificationsService.sendEmail(
        'test@example.com',
        '测试邮件',
        '这是测试内容'
      );

      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(1);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    test('sendEmail - 无效邮箱处理', async () => {
      const result = await NotificationsService.sendEmail(
        'invalid_email',
        '测试邮件',
        '测试内容'
      );

      expect(result.success).toBe(true);
      expect(result.totalFailed).toBe(1);
      expect(result.results[0].error).toBe('邮箱格式无效');
    });
  });

  describe('推送通知功能测试', () => {
    test('sendPushNotification - FCM推送成功', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          results: [{ message_id: 'fcm_123' }]
        }
      });

      const result = await NotificationsService.sendPushNotification(
        'device_token_123',
        { title: '推送标题', body: '推送内容' },
        { platform: 'android' }
      );

      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(1);
    });
  });

  describe('广播通知功能测试', () => {
    test('sendBroadcast - 广播通知成功', async () => {
      // Mock getTargetUsers
      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue([
        { phone: '13800138000', email: 'user1@example.com', deviceToken: 'token1' },
        { phone: '13800138001', email: 'user2@example.com', deviceToken: 'token2' }
      ]);

      // Mock SMS成功
      mockedAxios.post.mockResolvedValue({
        data: { message_id: 'sms_123' }
      });

      const result = await NotificationsService.sendBroadcast(
        { title: '紧急通知', message: '全村广播测试' },
        { villageId: 'village_123', channels: ['sms'] }
      );

      expect(result.success).toBe(true);
      expect(result.targetUsers).toBe(2);
      expect(result.results.sms.sent).toBe(2);
    });
  });

  describe('计划通知功能测试', () => {
    test('scheduleNotification - 计划通知成功', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1小时后
      
      const result = NotificationsService.scheduleNotification(
        { title: '计划通知', message: '这是计划发送的通知' },
        futureDate,
        { type: 'sms', recipients: ['13800138000'] }
      );

      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
      expect(NotificationsService.scheduledNotifications.size).toBe(1);
    });

    test('scheduleNotification - 过期时间失败', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1小时前
      
      const result = NotificationsService.scheduleNotification(
        { title: '计划通知', message: '过期通知' },
        pastDate
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('计划发送时间必须是未来时间');
    });

    test('cancelScheduledNotification - 取消计划成功', () => {
      const futureDate = new Date(Date.now() + 3600000);
      const scheduleResult = NotificationsService.scheduleNotification(
        { title: '计划通知', message: '待取消的通知' },
        futureDate
      );

      const cancelResult = NotificationsService.cancelScheduledNotification(scheduleResult.scheduleId);

      expect(cancelResult.success).toBe(true);
      expect(NotificationsService.scheduledNotifications.size).toBe(0);
    });

    test('cancelScheduledNotification - 未找到计划', () => {
      const result = NotificationsService.cancelScheduledNotification('non_existent_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('未找到指定的计划通知');
    });
  });

  describe('通知历史功能测试', () => {
    beforeEach(() => {
      // 添加一些测试数据
      NotificationsService.notificationHistory = [
        {
          type: 'sms',
          timestamp: new Date('2024-01-01'),
          results: [{ success: true }, { success: false }]
        },
        {
          type: 'email',
          timestamp: new Date('2024-01-02'),
          results: [{ success: true }]
        }
      ];
    });

    test('getNotificationHistory - 获取所有历史', () => {
      const result = NotificationsService.getNotificationHistory();

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(result.history).toHaveLength(2);
    });

    test('getNotificationHistory - 按类型过滤', () => {
      const result = NotificationsService.getNotificationHistory({ type: 'sms' });

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(1);
      expect(result.history[0].type).toBe('sms');
    });

    test('getNotificationHistory - 分页处理', () => {
      const result = NotificationsService.getNotificationHistory({ 
        page: 1, 
        limit: 1 
      });

      expect(result.success).toBe(true);
      expect(result.history).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });
  });

  describe('统计功能测试', () => {
    beforeEach(() => {
      NotificationsService.notificationHistory = [
        {
          type: 'sms',
          timestamp: new Date(),
          results: [{ success: true }, { success: false }]
        },
        {
          type: 'email',
          timestamp: new Date(),
          results: [{ success: true }]
        }
      ];
    });

    test('getNotificationStats - 获取统计信息', () => {
      const result = NotificationsService.getNotificationStats();

      expect(result.success).toBe(true);
      expect(result.stats.total).toBe(2);
      expect(result.stats.byType.sms).toBe(1);
      expect(result.stats.byType.email).toBe(1);
      expect(result.stats.successRate.sms.rate).toBe('50.00%');
      expect(result.stats.successRate.email.rate).toBe('100.00%');
    });
  });

  describe('辅助方法测试', () => {
    test('validatePhoneNumber - 有效手机号', () => {
      expect(NotificationsService.validatePhoneNumber('13800138000')).toBe(true);
      expect(NotificationsService.validatePhoneNumber('15012345678')).toBe(true);
    });

    test('validatePhoneNumber - 无效手机号', () => {
      expect(NotificationsService.validatePhoneNumber('12800138000')).toBe(false);
      expect(NotificationsService.validatePhoneNumber('1380013800')).toBe(false);
      expect(NotificationsService.validatePhoneNumber('abc')).toBe(false);
    });

    test('validateEmail - 有效邮箱', () => {
      expect(NotificationsService.validateEmail('test@example.com')).toBe(true);
      expect(NotificationsService.validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    test('validateEmail - 无效邮箱', () => {
      expect(NotificationsService.validateEmail('invalid_email')).toBe(false);
      expect(NotificationsService.validateEmail('test@')).toBe(false);
      expect(NotificationsService.validateEmail('@domain.com')).toBe(false);
    });

    test('delay - 延迟函数', async () => {
      const start = Date.now();
      await NotificationsService.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(99); // 允许少量误差
    });

    test('addToHistory - 添加历史记录', () => {
      NotificationsService.addToHistory('test', { data: 'test_data' });

      expect(NotificationsService.notificationHistory).toHaveLength(1);
      expect(NotificationsService.notificationHistory[0].type).toBe('test');
      expect(NotificationsService.notificationHistory[0].data).toBe('test_data');
    });

    test('dateToCron - 日期转cron表达式', () => {
      const date = new Date('2024-01-15 14:30:00');
      const cronExpr = NotificationsService.dateToCron(date);

      expect(cronExpr).toBe('30 14 15 1 *');
    });
  });
});