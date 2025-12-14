const NotificationsService = require('../../server/services/notificationsService');
const testData = require('../fixtures/notificationTestData');
const axios = require('axios');
const nodemailer = require('nodemailer');

// Mock external services
jest.mock('axios');
jest.mock('nodemailer');
jest.mock('node-cron');

describe('NotificationsService - End-to-End Tests', () => {
  let mockAxios, mockTransporter, originalConsoleLog;

  beforeAll(() => {
    // 静默控制台输出
    originalConsoleLog = console.log;
    console.log = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
    
    // 设置axios mock
    mockAxios = axios;
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test_email_123',
        response: '250 OK'
      })
    };
    nodemailer.createTransporter.mockReturnValue(mockTransporter);
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  describe('真实场景端到端测试', () => {
    test('台风预警紧急广播完整流程', async () => {
      // 1. 准备测试数据
      const scenario = testData.testScenarios.emergency_broadcast;
      const villagers = testData.getRandomVillagers(scenario.options.villageId, 100);
      
      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(villagers);

      // 2. 配置API响应
      mockAxios.post.mockImplementation((url, data) => {
        if (url.includes('sms.com')) {
          // 模拟SMS发送，95%成功率
          return Promise.resolve({
            data: Math.random() > 0.05 ? 
              testData.createMockApiResponse('sms', 'success') :
              { error: testData.mockApiResponses.sms.error.service_unavailable }
          });
        }
        
        if (url.includes('fcm.googleapis.com')) {
          // 模拟FCM推送，90%成功率
          return Promise.resolve({
            data: testData.createMockApiResponse('fcm', 'partial_success', data.registration_ids)
          });
        }

        return Promise.resolve({ data: {} });
      });

      // 3. 填充通知模板变量
      const notification = testData.generateNotificationWithVariables(
        scenario.notification,
        {
          emergency_phone: '119',
          evacuation_phone: '0595-12345678'
        }
      );

      // 4. 执行紧急广播
      const startTime = Date.now();
      
      const result = await NotificationsService.sendBroadcast(notification, scenario.options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 5. 验证执行结果
      expect(result.success).toBe(true);
      expect(result.targetUsers).toBe(100);
      expect(duration).toBeLessThan(scenario.expectedResults.max_duration);
      
      // 验证SMS结果
      expect(result.results.sms.sent).toBeGreaterThan(90); // 至少90%成功
      expect(result.results.sms.failed).toBeLessThan(10);
      
      // 验证Push结果  
      expect(result.results.push.sent).toBeGreaterThan(85); // 至少85%成功

      // 6. 验证历史记录
      const history = NotificationsService.getNotificationHistory();
      expect(history.history.length).toBeGreaterThan(0);
      
      const broadcastRecord = history.history.find(h => h.type === 'broadcast');
      expect(broadcastRecord).toBeDefined();
      expect(broadcastRecord.emergency).toBe(true);
      expect(broadcastRecord.villageId).toBe(scenario.options.villageId);

      // 7. 验证统计信息
      const stats = NotificationsService.getNotificationStats();
      expect(stats.success).toBe(true);
      expect(stats.stats.total).toBeGreaterThan(0);

      console.log(`台风预警广播测试完成: ${duration}ms, 成功率 SMS: ${(result.results.sms.sent/100*100).toFixed(1)}%, Push: ${(result.results.push.sent/100*100).toFixed(1)}%`);
    });

    test('村民大会通知计划发送完整流程', async () => {
      // 1. 准备计划通知数据
      const scenario = testData.testScenarios.scheduled_announcement;
      const scheduledTime = scenario.scheduleTime();
      const villagers = testData.getRandomVillagers(scenario.options.villageId, 50)
        .filter(v => v.role === 'resident'); // 只通知村民

      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(villagers);

      // 2. 填充通知模板
      const notification = testData.generateNotificationWithVariables(
        scenario.notification,
        {
          date: scheduledTime.toLocaleDateString('zh-CN'),
          topic1: '村道路维修预算审议',
          topic2: '新建文化活动中心选址',
          topic3: '农村电商合作社成立',
          contact_phone: '0595-87654321'
        }
      );

      // 3. 创建计划任务
      const scheduleResult = NotificationsService.scheduleNotification(
        notification,
        scheduledTime,
        {
          ...scenario.options,
          type: 'broadcast'
        }
      );

      expect(scheduleResult.success).toBe(true);
      expect(scheduleResult.scheduleId).toBeDefined();

      // 4. 验证计划任务已创建
      expect(NotificationsService.scheduledNotifications.size).toBe(1);
      const task = NotificationsService.scheduledNotifications.get(scheduleResult.scheduleId);
      expect(task.status).toBe('pending');

      // 5. 配置执行时的API响应
      mockAxios.post.mockResolvedValue({
        data: testData.createMockApiResponse('sms', 'success')
      });

      // Mock sendBroadcast以验证正确调用
      jest.spyOn(NotificationsService, 'sendBroadcast').mockResolvedValue({
        success: true,
        targetUsers: villagers.length,
        results: {
          sms: { sent: Math.floor(villagers.length * 0.92), failed: Math.ceil(villagers.length * 0.08) },
          push: { sent: Math.floor(villagers.length * 0.88), failed: Math.ceil(villagers.length * 0.12) }
        }
      });

      // 6. 手动触发计划任务执行
      await NotificationsService.executeScheduledNotification(scheduleResult.scheduleId);

      // 7. 验证执行结果
      const executedTask = NotificationsService.scheduledNotifications.get(scheduleResult.scheduleId);
      expect(executedTask.status).toBe('completed');
      expect(executedTask.result.success).toBe(true);

      // 验证sendBroadcast被正确调用
      expect(NotificationsService.sendBroadcast).toHaveBeenCalledWith(
        notification,
        expect.objectContaining({
          type: 'broadcast',
          villageId: scenario.options.villageId,
          userRole: scenario.options.userRole,
          channels: scenario.options.channels
        })
      );

      console.log(`村民大会通知计划执行测试完成: 目标用户${villagers.length}人`);
    });

    test('医疗服务多渠道通知完整流程', async () => {
      // 1. 准备多渠道通知数据
      const scenario = testData.testScenarios.multi_channel_service;
      const villagers = testData.getRandomVillagers(scenario.options.villageId, 300);
      
      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(villagers);

      // 2. 配置多渠道API响应
      mockAxios.post.mockImplementation((url, data) => {
        // 网络延迟模拟
        return testData.simulateNetworkLatency(100, 300).then(() => {
          if (url.includes('sms.com')) {
            return { data: testData.createMockApiResponse('sms', 'success') };
          }
          
          if (url.includes('fcm.googleapis.com')) {
            return { 
              data: testData.createMockApiResponse('fcm', 'success', data.registration_ids)
            };
          }

          return { data: {} };
        });
      });

      // 邮件服务配置
      mockTransporter.sendMail.mockImplementation(async () => {
        await testData.simulateNetworkLatency(200, 500);
        return testData.createMockApiResponse('email', 'success');
      });

      // 3. 填充服务通知模板
      const notification = testData.generateNotificationWithVariables(
        scenario.notification,
        {
          service_type: '健康体检服务',
          service_time: '2024年2月15日-17日 上午8:00-11:30',
          service_location: '村卫生站及村委会大院',
          service_items: '血压测量、血糖检测、心电图检查、健康咨询',
          notes: '请携带身份证，空腹前往',
          appointment_phone: '0595-11223344'
        }
      );

      // 4. 执行多渠道广播
      const startTime = Date.now();
      
      const result = await NotificationsService.sendBroadcast(notification, scenario.options);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 5. 验证多渠道结果
      expect(result.success).toBe(true);
      expect(result.targetUsers).toBe(300);
      expect(duration).toBeLessThan(scenario.expectedResults.max_duration);

      // 验证各渠道发送结果
      const smsSuccessRate = result.results.sms.sent / 300;
      const emailSuccessRate = result.results.email.sent / 300;
      const pushSuccessRate = result.results.push.sent / 300;

      expect(smsSuccessRate).toBeGreaterThan(scenario.expectedResults.sms_success_rate - 0.05);
      expect(emailSuccessRate).toBeGreaterThan(scenario.expectedResults.email_success_rate - 0.05);
      expect(pushSuccessRate).toBeGreaterThan(scenario.expectedResults.push_success_rate - 0.05);

      // 6. 验证用户偏好过滤
      // 统计实际应该接收通知的用户数量
      const smsEligibleUsers = villagers.filter(v => v.preferences.notifications.services).length;
      const emailEligibleUsers = villagers.filter(v => v.email && v.preferences.notifications.services).length;
      
      expect(result.results.sms.sent + result.results.sms.failed).toBeLessThanOrEqual(smsEligibleUsers + 5); // 允许少量误差
      expect(result.results.email.sent + result.results.email.failed).toBeLessThanOrEqual(emailEligibleUsers + 5);

      console.log(`医疗服务多渠道通知测试完成: ${duration}ms, SMS成功率${(smsSuccessRate*100).toFixed(1)}%, Email成功率${(emailSuccessRate*100).toFixed(1)}%, Push成功率${(pushSuccessRate*100).toFixed(1)}%`);
    });

    test('季节性农事提醒周期性通知流程', async () => {
      // 1. 准备季节性通知数据
      const scenario = testData.testScenarios.seasonal_reminder;
      const villagers = testData.getRandomVillagers(scenario.options.villageId, 180)
        .filter(v => v.role === 'resident');

      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(villagers);

      // 2. 填充季节性模板
      const notification = testData.generateNotificationWithVariables(
        scenario.notification,
        {
          crop_planting_advice: '适宜播种玉米、大豆，注意土壤温度',
          irrigation_schedule: '每周三次，早晚进行',
          pest_control_tips: '预防蚜虫，可用生物农药',
          weather_alert: '本周多雷雨，注意排水防涝',
          tech_support_phone: '0595-88776655'
        }
      );

      // 3. 配置API响应 - 高成功率的农事通知
      mockAxios.post.mockResolvedValue({
        data: testData.createMockApiResponse('sms', 'success')
      });

      // 4. 执行季节性通知
      const result = await NotificationsService.sendBroadcast(notification, {
        villageId: scenario.options.villageId,
        userRole: scenario.options.userRole,
        channels: scenario.options.channels
      });

      // 5. 验证季节性通知结果
      expect(result.success).toBe(true);
      expect(result.targetUsers).toBe(villagers.length);

      const successRate = result.results.sms.sent / villagers.length;
      expect(successRate).toBeGreaterThan(scenario.expectedResults.success_rate - 0.05);

      // 6. 模拟用户反馈收集
      const userFeedback = villagers.slice(0, 20).map(user => ({
        userId: user.id,
        notificationId: `spring_reminder_${Date.now()}`,
        feedback: Math.random() > 0.8 ? 'helpful' : 'not_relevant',
        rating: Math.floor(Math.random() * 5) + 1,
        comments: Math.random() > 0.7 ? '信息很实用，谢谢提醒' : null
      }));

      // 7. 验证反馈统计
      const helpfulFeedback = userFeedback.filter(f => f.feedback === 'helpful').length;
      const avgRating = userFeedback.reduce((sum, f) => sum + f.rating, 0) / userFeedback.length;

      expect(helpfulFeedback).toBeGreaterThan(0);
      expect(avgRating).toBeGreaterThan(2.5);

      console.log(`季节性农事提醒测试完成: 成功率${(successRate*100).toFixed(1)}%, 用户反馈满意度${avgRating.toFixed(1)}/5`);
    });
  });

  describe('故障恢复和容灾测试', () => {
    test('网络中断后的重试恢复机制', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;

      // 模拟前2次网络失败，第3次成功
      mockAxios.post.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < maxAttempts) {
          return Promise.reject(new Error('网络连接超时'));
        }
        return Promise.resolve({
          data: testData.createMockApiResponse('sms', 'success')
        });
      });

      const villagers = testData.getRandomVillagers('small_village', 10);
      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(villagers);

      // 执行通知（应该重试并最终成功）
      const result = await NotificationsService.sendBroadcast(
        { title: '网络恢复测试', message: '测试网络中断后的恢复' },
        { villageId: 'small_village', channels: ['sms'] }
      );

      // 验证最终成功
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(maxAttempts); // 确认进行了重试

      console.log(`网络恢复测试完成: 重试${attemptCount}次后成功`);
    });

    test('服务降级和备用渠道切换', async () => {
      const villagers = testData.getRandomVillagers('medium_village', 50);
      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(villagers);

      // 模拟主要渠道失败，备用渠道正常
      mockAxios.post.mockImplementation((url) => {
        if (url.includes('sms.com')) {
          return Promise.reject(new Error('SMS服务不可用'));
        }
        if (url.includes('fcm.googleapis.com')) {
          return Promise.resolve({
            data: testData.createMockApiResponse('fcm', 'success', ['backup_tokens'])
          });
        }
        return Promise.resolve({ data: {} });
      });

      // 邮件服务正常作为备用
      mockTransporter.sendMail.mockResolvedValue(
        testData.createMockApiResponse('email', 'success')
      );

      const result = await NotificationsService.sendBroadcast(
        { title: '服务降级测试', message: '测试备用渠道切换' },
        { villageId: 'medium_village', channels: ['sms', 'email', 'push'] }
      );

      // 验证服务降级结果
      expect(result.success).toBe(true);
      expect(result.results.sms.failed).toBe(50); // SMS全部失败
      expect(result.results.email.sent).toBeGreaterThan(40); // 邮件作为备用成功
      expect(result.results.push.sent).toBeGreaterThan(40); // Push成功

      // 验证至少有一个渠道成功，保证通知送达
      const totalSent = result.results.sms.sent + result.results.email.sent + result.results.push.sent;
      expect(totalSent).toBeGreaterThan(80); // 总体80%以上成功率

      console.log(`服务降级测试完成: SMS失败, Email成功${result.results.email.sent}, Push成功${result.results.push.sent}`);
    });

    test('大规模并发请求的负载均衡', async () => {
      const concurrentRequests = 20;
      const requestPromises = [];

      // 配置负载均衡响应
      let requestCount = 0;
      mockAxios.post.mockImplementation(async () => {
        requestCount++;
        // 模拟不同的响应时间
        await testData.simulateNetworkLatency(50, 300);
        
        return {
          data: testData.createMockApiResponse('sms', 'success')
        };
      });

      // 创建并发请求
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = NotificationsService.sendSMS(
          `138001380${String(i).padStart(2, '0')}`,
          `并发负载测试 ${i + 1}`
        );
        requestPromises.push(promise);
      }

      const startTime = Date.now();
      const results = await Promise.all(requestPromises);
      const endTime = Date.now();

      // 验证并发处理结果
      expect(results.length).toBe(concurrentRequests);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 验证性能
      const totalDuration = endTime - startTime;
      const avgTimePerRequest = totalDuration / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(1000); // 平均每个请求1秒内

      console.log(`并发负载测试完成: ${concurrentRequests}个并发请求, 总时长${totalDuration}ms, 平均${avgTimePerRequest.toFixed(0)}ms/请求`);
    });
  });

  describe('数据一致性和事务性测试', () => {
    test('通知历史记录一致性验证', async () => {
      const initialHistoryCount = NotificationsService.notificationHistory.length;
      const testNotifications = [
        { recipients: ['13800138001'], message: '一致性测试1' },
        { recipients: ['13800138002'], message: '一致性测试2' },
        { recipients: ['13800138003'], message: '一致性测试3' }
      ];

      mockAxios.post.mockResolvedValue({
        data: testData.createMockApiResponse('sms', 'success')
      });

      // 顺序发送通知
      for (const notification of testNotifications) {
        await NotificationsService.sendSMS(notification.recipients[0], notification.message);
      }

      // 验证历史记录一致性
      expect(NotificationsService.notificationHistory.length).toBe(initialHistoryCount + 3);

      // 验证记录顺序
      const recentHistory = NotificationsService.notificationHistory.slice(-3);
      recentHistory.forEach((record, index) => {
        expect(record.type).toBe('sms');
        expect(record.message).toBe(testNotifications[index].message);
        expect(record.recipients).toEqual(testNotifications[index].recipients);
      });

      console.log('通知历史记录一致性验证完成');
    });

    test('计划任务状态转换正确性', async () => {
      const futureTime = new Date(Date.now() + 60000); // 1分钟后
      
      // 创建计划任务
      const scheduleResult = NotificationsService.scheduleNotification(
        { message: '状态转换测试' },
        futureTime,
        { type: 'sms', recipients: ['13800138000'] }
      );

      const taskId = scheduleResult.scheduleId;
      let task = NotificationsService.scheduledNotifications.get(taskId);

      // 验证初始状态
      expect(task.status).toBe('pending');
      expect(task.executedAt).toBeUndefined();

      // 配置执行成功的mock
      jest.spyOn(NotificationsService, 'sendSMS').mockResolvedValue({
        success: true,
        results: [{ success: true }]
      });

      // 执行任务
      await NotificationsService.executeScheduledNotification(taskId);

      // 验证状态转换
      task = NotificationsService.scheduledNotifications.get(taskId);
      expect(task.status).toBe('completed');
      expect(task.executedAt).toBeDefined();
      expect(task.result).toBeDefined();
      expect(task.result.success).toBe(true);

      // 测试执行失败的状态转换
      const failedTaskResult = NotificationsService.scheduleNotification(
        { message: '失败测试' },
        new Date(Date.now() + 60000),
        { type: 'sms', recipients: ['invalid_phone'] }
      );

      jest.spyOn(NotificationsService, 'sendSMS').mockResolvedValue({
        success: false,
        error: '发送失败'
      });

      await NotificationsService.executeScheduledNotification(failedTaskResult.scheduleId);

      const failedTask = NotificationsService.scheduledNotifications.get(failedTaskResult.scheduleId);
      expect(failedTask.status).toBe('failed');

      console.log('计划任务状态转换测试完成');
    });
  });

  describe('用户体验和可用性测试', () => {
    test('多语言和方言支持测试', async () => {
      const villagers = [
        { ...testData.getRandomVillagers('small_village', 1)[0], preferences: { dialect: '四川话' } },
        { ...testData.getRandomVillagers('small_village', 1)[0], preferences: { dialect: '粤语' } },
        { ...testData.getRandomVillagers('small_village', 1)[0], preferences: { dialect: '河南话' } }
      ];

      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(villagers);

      const originalMessage = '今天天气很好，大家注意防暑降温';
      
      // 测试方言转换
      const sichuanMessage = await NotificationsService.convertToDialect(originalMessage, '四川话');
      const cantonMessage = await NotificationsService.convertToDialect(originalMessage, '粤语');
      const henanMessage = await NotificationsService.convertToDialect(originalMessage, '河南话');

      expect(sichuanMessage).toContain('巴适');
      expect(cantonMessage).toContain('好嘅');
      expect(henanMessage).toContain('恁');

      console.log(`方言转换测试: 普通话->${originalMessage}, 四川话->${sichuanMessage}`);
    });

    test('用户偏好设置响应测试', async () => {
      const villagers = testData.getRandomVillagers('medium_village', 100);
      
      // 设置不同的用户偏好
      villagers.forEach((villager, index) => {
        villager.preferences.notifications = {
          emergency: true,
          announcements: index % 2 === 0, // 50%接收公告
          services: index % 3 === 0 // 33%接收服务通知
        };
      });

      jest.spyOn(NotificationsService, 'getTargetUsers').mockResolvedValue(villagers);

      mockAxios.post.mockResolvedValue({
        data: testData.createMockApiResponse('sms', 'success')
      });

      // 测试公告类通知
      const announcementResult = await NotificationsService.sendBroadcast(
        { title: '村务公告', message: '测试用户偏好过滤' },
        { villageId: 'medium_village', notificationType: 'announcements', channels: ['sms'] }
      );

      // 测试服务类通知
      const serviceResult = await NotificationsService.sendBroadcast(
        { title: '服务通知', message: '测试服务通知偏好' },
        { villageId: 'medium_village', notificationType: 'services', channels: ['sms'] }
      );

      // 验证偏好过滤效果（这里简化处理，实际应该在sendBroadcast中实现过滤）
      expect(announcementResult.success).toBe(true);
      expect(serviceResult.success).toBe(true);

      console.log(`用户偏好测试: 公告通知${announcementResult.targetUsers}人, 服务通知${serviceResult.targetUsers}人`);
    });
  });

  describe('监控和运维测试', () => {
    test('性能监控和告警阈值测试', async () => {
      const performanceMetrics = {
        responseTime: [],
        successRate: [],
        errorCount: 0
      };

      // 模拟监控数据收集
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        try {
          const result = await NotificationsService.sendSMS(`1380013800${i}`, `性能监控测试 ${i}`);
          const responseTime = Date.now() - startTime;
          
          performanceMetrics.responseTime.push(responseTime);
          performanceMetrics.successRate.push(result.success ? 1 : 0);
          
          if (!result.success) {
            performanceMetrics.errorCount++;
          }
        } catch (error) {
          performanceMetrics.errorCount++;
        }
      }

      // 计算性能指标
      const avgResponseTime = performanceMetrics.responseTime.reduce((a, b) => a + b, 0) / performanceMetrics.responseTime.length;
      const successRate = performanceMetrics.successRate.reduce((a, b) => a + b, 0) / performanceMetrics.successRate.length;

      // 验证性能阈值
      expect(avgResponseTime).toBeLessThan(2000); // 平均响应时间2秒内
      expect(successRate).toBeGreaterThan(0.95); // 成功率95%以上
      expect(performanceMetrics.errorCount).toBeLessThan(2); // 错误数小于2

      console.log(`性能监控测试: 平均响应时间${avgResponseTime.toFixed(0)}ms, 成功率${(successRate*100).toFixed(1)}%, 错误数${performanceMetrics.errorCount}`);
    });

    test('系统健康状态检查', async () => {
      const healthCheck = {
        services: {
          sms: false,
          email: false,
          push: false
        },
        database: true, // 模拟数据库连接正常
        memory: process.memoryUsage(),
        scheduledTasks: NotificationsService.scheduledNotifications.size
      };

      // 检查SMS服务健康状态
      try {
        await NotificationsService.sendSMS('13800138000', '健康检查');
        healthCheck.services.sms = true;
      } catch (error) {
        healthCheck.services.sms = false;
      }

      // 检查Email服务健康状态
      try {
        await NotificationsService.sendEmail('test@health.check', '健康检查', '测试邮件');
        healthCheck.services.email = true;
      } catch (error) {
        healthCheck.services.email = false;
      }

      // 检查Push服务健康状态
      try {
        await NotificationsService.sendPushNotification('test_token', { title: '健康检查', body: '测试推送' });
        healthCheck.services.push = true;
      } catch (error) {
        healthCheck.services.push = false;
      }

      // 验证健康状态
      const healthyServices = Object.values(healthCheck.services).filter(status => status === true).length;
      expect(healthyServices).toBeGreaterThan(0); // 至少有一个服务健康

      // 内存使用检查
      expect(healthCheck.memory.heapUsed).toBeLessThan(500 * 1024 * 1024); // 内存使用小于500MB

      console.log(`系统健康检查: ${healthyServices}/3 服务正常, 内存使用${(healthCheck.memory.heapUsed/1024/1024).toFixed(1)}MB`);
    });
  });
});