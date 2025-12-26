/**
 * 消息队列使用示例
 * 演示如何在微服务中使用消息队列
 */

const MessagingService = require('../MessagingService');

class MessagingUsageExample {
  constructor() {
    this.messagingService = new MessagingService();
  }

  /**
   * 基本使用示例
   */
  async basicUsageExample() {
    try {
      console.log('=== 基本使用示例 ===');

      // 初始化消息队列服务
      await this.messagingService.initialize();

      // 发送村庄事件
      const eventMessageId = await this.messagingService.sendVillageEvent('resident.created', {
        residentId: 'resident_001',
        userId: 'user_001',
        name: {
          lastName: '张',
          firstName: '三'
        },
        personal: {
          gender: '男',
          birthDate: '1985-05-15'
        },
        villageId: 'village_001'
      });

      console.log('村庄事件消息发送成功，消息ID:', eventMessageId);

      // 发送通知
      const notificationMessageId = await this.messagingService.sendNotification('welcome', {
        title: '欢迎使用智慧乡村平台',
        content: '您已成功注册成为本村村民',
        targetUsers: ['user_001'],
        villageId: 'village_001'
      });

      console.log('通知消息发送成功，消息ID:', notificationMessageId);

      // 发送异步任务
      const taskMessageId = await this.messagingService.sendTask('email_send', {
        to: ['zhangsan@example.com'],
        template: 'welcome_email',
        templateData: {
          name: '张三',
          villageName: '智慧村'
        }
      });

      console.log('任务消息发送成功，消息ID:', taskMessageId);

      // 发送分析事件
      const analyticsMessageId = await this.messagingService.sendAnalyticsEvent('user_action', {
        action: 'login',
        userId: 'user_001',
        sessionId: 'session_001',
        properties: {
          device: 'mobile',
          appVersion: '1.0.0'
        }
      });

      console.log('分析事件发送成功，消息ID:', analyticsMessageId);

      // 发送审计日志
      const auditMessageId = await this.messagingService.sendAuditLog('user_login', 'User', {
        userId: 'user_001',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      }, {
        userId: 'user_001'
      });

      console.log('审计日志发送成功，消息ID:', auditMessageId);

      return true;
    } catch (error) {
      console.error('基本使用示例失败:', error);
      throw error;
    }
  }

  /**
   * 高级使用示例
   */
  async advancedUsageExample() {
    try {
      console.log('=== 高级使用示例 ===');

      // 发送延迟消息（10秒后执行）
      const delayedMessageId = await this.messagingService.sendDelayedMessage('notification', {
        type: 'meeting_reminder',
        title: '会议提醒',
        content: '您有一个会议将在10分钟后开始',
        targetUsers: ['user_001', 'user_002']
      }, 10000);

      console.log('延迟消息发送成功，消息ID:', delayedMessageId);

      // 发送高优先级消息
      const highPriorityMessageId = await this.messagingService.sendHighPriorityMessage('task', {
        taskType: 'emergency_notification',
        data: {
          emergencyType: 'fire',
          location: '村委会大楼',
          severity: 'high'
        }
      });

      console.log('高优先级消息发送成功，消息ID:', highPriorityMessageId);

      // 发送紧急消息
      const urgentMessageId = await this.messagingService.sendUrgentMessage('village_event', {
        eventType: 'emergency.occurred',
        data: {
          emergencyId: 'emergency_001',
          type: '火灾',
          severity: 'critical',
          location: '东大街123号',
          reportedBy: 'user_003'
        }
      });

      console.log('紧急消息发送成功，消息ID:', urgentMessageId);

      // 批量发送消息
      const batchMessages = [
        {
          type: 'notification',
          data: {
            notificationType: 'announcement',
            title: '公告1',
            content: '内容1'
          }
        },
        {
          type: 'notification',
          data: {
            notificationType: 'announcement',
            title: '公告2',
            content: '内容2'
          }
        },
        {
          type: 'analytics',
          data: {
            analyticsType: 'page_view',
            page: '/dashboard'
          }
        }
      ];

      const batchResults = await this.messagingService.sendBatchMessages(batchMessages, {
        batchSize: 2,
        delay: 1000
      });

      console.log('批量消息发送完成:', {
        total: batchMessages.length,
        successful: batchResults.filter(r => r.success).length,
        failed: batchResults.filter(r => !r.success).length
      });

      return true;
    } catch (error) {
      console.error('高级使用示例失败:', error);
      throw error;
    }
  }

  /**
   * 村民注册完整流程示例
   */
  async residentRegistrationFlow() {
    try {
      console.log('=== 村民注册完整流程示例 ===');

      const residentData = {
        residentId: 'resident_002',
        userId: 'user_002',
        name: {
          lastName: '李',
          firstName: '四'
        },
        personal: {
          gender: '女',
          birthDate: '1990-08-20',
          ethnicity: '汉族'
        },
        contact: {
          phone: '13812345678',
          email: 'lisi@example.com'
        },
        villageId: 'village_001'
      };

      // 1. 发送村民创建事件
      const eventMessageId = await this.messagingService.sendVillageEvent('resident.created', residentData);
      console.log('1. 村民创建事件发送成功');

      // 2. 发送欢迎通知（延迟5秒，让系统先处理事件）
      await this.messagingService.sendDelayedMessage('notification', {
        type: 'welcome',
        title: '欢迎加入智慧村',
        content: `${residentData.name.lastName}${residentData.name.firstName}，欢迎您成为本村村民！`,
        targetUsers: [residentData.userId],
        data: residentData
      }, 5000);

      // 3. 发送欢迎邮件任务
      await this.messagingService.sendTask('email_send', {
        to: [residentData.contact.email],
        template: 'welcome_email',
        templateData: {
          name: `${residentData.name.lastName}${residentData.name.firstName}`,
          villageName: '智慧村',
          registrationDate: new Date().toLocaleDateString()
        }
      });

      // 4. 发送短信欢迎通知
      await this.messagingService.sendTask('sms_send', {
        to: [residentData.contact.phone],
        template: 'welcome_sms',
        templateData: {
          name: `${residentData.name.lastName}${residentData.name.firstName}`,
          villageName: '智慧村'
        }
      });

      // 5. 记录注册分析事件
      await this.messagingService.sendAnalyticsEvent('user_action', {
        action: 'registration_completed',
        userId: residentData.userId,
        properties: {
          registrationDate: new Date().toISOString(),
          villageId: residentData.villageId,
          gender: residentData.personal.gender
        }
      });

      // 6. 记录审计日志
      await this.messagingService.sendAuditLog('user_registration', 'Resident', residentData, {
        userId: residentData.userId
      });

      console.log('村民注册完整流程示例执行完成');
      return true;
    } catch (error) {
      console.error('村民注册完整流程示例失败:', error);
      throw error;
    }
  }

  /**
   * 紧急事件处理示例
   */
  async emergencyHandlingFlow() {
    try {
      console.log('=== 紧急事件处理示例 ===');

      const emergencyData = {
        emergencyId: 'emergency_002',
        type: '医疗急救',
        severity: 'critical',
        location: {
          address: '西大街456号',
          coordinates: {
            lat: 39.9042,
            lng: 116.4074
          }
        },
        description: '老人突发心脏病，需要紧急医疗救助',
        reportedBy: 'user_005',
        contactPhone: '13987654321',
        villageId: 'village_001'
      };

      // 1. 发送紧急事件（最高优先级）
      const emergencyMessageId = await this.messagingService.sendUrgentMessage('village_event', {
        eventType: 'emergency.occurred',
        data: emergencyData
      });

      console.log('1. 紧急事件消息发送成功');

      // 2. 立即触发应急响应任务
      await this.messagingService.sendTask('emergency_response', {
        emergencyId: emergencyData.emergencyId,
        type: emergencyData.type,
        severity: emergencyData.severity,
        location: emergencyData.location,
        actions: [
          'notify_emergency_services',
          'notify_village_officials',
          'activate_emergency_broadcast',
          'log_incident'
        ]
      });

      // 3. 发送紧急通知给所有村民
      await this.messagingService.sendNotification('emergency', {
        title: '紧急通知',
        content: `紧急情况：${emergencyData.description}，地点：${emergencyData.location.address}`,
        priority: 'urgent',
        targetVillage: emergencyData.villageId,
        data: {
          emergencyId: emergencyData.emergencyId,
          type: emergencyData.type,
          location: emergencyData.location
        }
      });

      // 4. 发送通知给相关服务
      await this.messagingService.sendTask('sms_send', {
        to: ['120', emergencyData.contactPhone],
        template: 'emergency_notification',
        priority: 'urgent',
        templateData: {
          emergencyType: emergencyData.type,
          location: emergencyData.location.address,
          description: emergencyData.description
        }
      });

      // 5. 记录紧急事件审计
      await this.messagingService.sendAuditLog('emergency_reported', 'Emergency', emergencyData, {
        userId: emergencyData.reportedBy,
        ip: '192.168.1.100'
      });

      console.log('紧急事件处理示例执行完成');
      return true;
    } catch (error) {
      console.error('紧急事件处理示例失败:', error);
      throw error;
    }
  }

  /**
   * 监控和统计示例
   */
  async monitoringExample() {
    try {
      console.log('=== 监控和统计示例 ===');

      // 获取队列状态
      const queueStatus = await this.messagingService.getQueueStatus();
      console.log('队列状态:', JSON.stringify(queueStatus, null, 2));

      // 获取性能指标
      const metrics = await this.messagingService.getMetrics();
      console.log('性能指标:', JSON.stringify(metrics, null, 2));

      // 健康检查
      const healthCheck = await this.messagingService.healthCheck();
      console.log('健康检查:', healthCheck);

      return { queueStatus, metrics, healthCheck };
    } catch (error) {
      console.error('监控和统计示例失败:', error);
      throw error;
    }
  }

  /**
   * 错误处理示例
   */
  async errorHandlingExample() {
    try {
      console.log('=== 错误处理示例 ===');

      // 发送无效的消息类型
      try {
        await this.messagingService.sendTask('invalid_task_type', {
          data: 'test'
        });
      } catch (error) {
        console.log('捕获到预期的错误:', error.message);
      }

      // 在未初始化的情况下发送消息
      const uninitializedService = new MessagingService();
      try {
        await uninitializedService.sendVillageEvent('test', {});
      } catch (error) {
        console.log('捕获到未初始化错误:', error.message);
      }

      // 模拟连接断开的情况
      console.log('模拟连接断开场景（实际使用中会自动重连）');

      return true;
    } catch (error) {
      console.error('错误处理示例失败:', error);
      throw error;
    }
  }

  /**
   * 运行所有示例
   */
  async runAllExamples() {
    try {
      console.log('开始运行消息队列使用示例...\n');

      await this.basicUsageExample();
      console.log('\n');

      await this.advancedUsageExample();
      console.log('\n');

      await this.residentRegistrationFlow();
      console.log('\n');

      await this.emergencyHandlingFlow();
      console.log('\n');

      await this.monitoringExample();
      console.log('\n');

      await this.errorHandlingExample();
      console.log('\n');

      console.log('所有示例运行完成！');

      // 关闭服务
      await this.messagingService.shutdown();
    } catch (error) {
      console.error('运行示例失败:', error);
      process.exit(1);
    }
  }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  const example = new MessagingUsageExample();
  example.runAllExamples();
}

module.exports = MessagingUsageExample;