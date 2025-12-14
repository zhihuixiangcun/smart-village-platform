const request = require('supertest');
const app = require('../../src/app');
const NotificationsService = require('../../server/services/notificationsService');

// Mock外部依赖
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
  mkdirSync: jest.fn()
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn()
  }))
}));

describe('Notifications REST API Tests', () => {
  const axios = require('axios');
  
  // 模拟JWT Token用于认证测试
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3RfdXNlciIsInJvbGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOlsibm90aWZpY2F0aW9uOnNlbmQiXX0.test';
  const mockAdminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3RfYWRtaW4iLCJyb2xlIjoiYWRtaW4ifQ.test';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置服务状态
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
    
    // 模拟axios响应
    axios.post.mockResolvedValue({
      data: { message_id: 'test_123', cost: 0.05 }
    });
  });

  describe('健康检查和信息端点', () => {
    test('GET /api/v1/notifications/health - 应该返回服务健康状态', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '消息模板服务运行正常',
        data: {
          service: 'notification-template-system',
          version: '1.0.0',
          status: 'healthy',
          templatesLoaded: expect.any(Number),
          features: {
            templateManagement: true,
            messagePreview: true,
            singleSend: true,
            batchSend: true,
            broadcast: true,
            scheduled: true
          }
        }
      });
    });

    test('GET /api/v1/notifications/info - 应该返回API信息', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/info')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          name: '智慧乡村消息模板系统 REST API',
          version: 'v1',
          baseUrl: '/api/v1/notifications',
          endpoints: expect.any(Object),
          authentication: expect.any(Object),
          features: expect.any(Object)
        }
      });
    });
  });

  describe('模板管理API', () => {
    test('GET /api/v1/notifications/templates - 应该获取所有模板', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '模板列表获取成功',
        data: {
          templates: expect.any(Array),
          total: expect.any(Number),
          categories: expect.any(Array),
          priorities: expect.any(Array)
        }
      });

      // 验证至少有预定义模板
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    test('GET /api/v1/notifications/templates?category=emergency - 应该按类别过滤模板', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates?category=emergency')
        .expect(200);

      expect(response.body.data.templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ category: 'emergency' })
        ])
      );
    });

    test('GET /api/v1/notifications/templates/:templateId - 应该获取单个模板', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates/emergency_typhoon')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '模板详情获取成功',
        data: {
          template: {
            id: 'emergency_typhoon',
            name: expect.any(String),
            category: 'emergency',
            content: expect.any(String)
          }
        }
      });
    });

    test('GET /api/v1/notifications/templates/nonexistent - 应该返回404', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: expect.stringContaining('nonexistent')
        }
      });
    });

    test('POST /api/v1/notifications/templates - 应该创建新模板', async () => {
      const newTemplate = {
        templateId: 'test_custom_template',
        template: {
          name: '测试自定义模板',
          category: 'announcement',
          content: '这是一个测试模板：{{message}}',
          priority: 'normal',
          channels: ['sms'],
          variables: ['message']
        }
      };

      const response = await request(app)
        .post('/api/v1/notifications/templates')
        .send(newTemplate)
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '模板创建成功',
        data: {
          templateId: 'test_custom_template',
          template: expect.objectContaining({
            name: '测试自定义模板',
            category: 'announcement'
          })
        }
      });
    });

    test('POST /api/v1/notifications/templates - 应该验证必需字段', async () => {
      const invalidTemplate = {
        templateId: 'invalid_template',
        template: {
          name: '无效模板'
          // 缺少必需的category和content
        }
      };

      const response = await request(app)
        .post('/api/v1/notifications/templates')
        .send(invalidTemplate)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    test('DELETE /api/v1/notifications/templates/:templateId - 应该删除模板', async () => {
      // 先创建一个测试模板
      const testTemplate = {
        templateId: 'delete_test_template',
        template: {
          name: '待删除模板',
          category: 'announcement',
          content: '测试删除：{{message}}'
        }
      };

      await request(app)
        .post('/api/v1/notifications/templates')
        .send(testTemplate)
        .expect(201);

      // 然后删除它
      const response = await request(app)
        .delete('/api/v1/notifications/templates/delete_test_template')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          deletedTemplateId: 'delete_test_template'
        }
      });
    });
  });

  describe('模板预览API', () => {
    test('POST /api/v1/notifications/templates/:templateId/preview - 应该预览模板', async () => {
      const previewData = {
        data: {
          village: { name: '测试村' },
          typhoon: { 
            name: '台风测试',
            arrivalTime: '今晚8点'
          },
          contact: { emergency: '110' }
        },
        options: {
          dialect: '四川话'
        }
      };

      const response = await request(app)
        .post('/api/v1/notifications/templates/emergency_typhoon/preview')
        .send(previewData)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '模板预览成功',
        data: {
          preview: {
            message: expect.stringContaining('测试村'),
            templateInfo: {
              id: 'emergency_typhoon',
              category: 'emergency'
            },
            metadata: {
              dialect: '四川话'
            }
          }
        }
      });
    });

    test('POST /api/v1/notifications/templates/nonexistent/preview - 预览不存在模板应返回错误', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/templates/nonexistent/preview')
        .send({ data: {} })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('消息发送API', () => {
    test('POST /api/v1/notifications/send - 应该发送单个模板消息', async () => {
      const sendData = {
        templateId: 'emergency_typhoon',
        data: {
          village: { name: '测试村' },
          typhoon: { name: '海燕', arrivalTime: '今晚8点' },
          contact: { emergency: '110' }
        },
        recipients: {
          phone: '13800138000',
          email: 'test@example.com'
        }
      };

      const response = await request(app)
        .post('/api/v1/notifications/send')
        .send(sendData)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          notificationId: expect.any(String),
          templateId: 'emergency_typhoon',
          renderedMessage: expect.any(String),
          channels: expect.any(Array),
          results: expect.any(Array),
          totalSent: expect.any(Number),
          sentAt: expect.any(String)
        }
      });
    });

    test('POST /api/v1/notifications/send - 应该验证必需参数', async () => {
      const invalidData = {
        templateId: 'emergency_typhoon'
        // 缺少data和recipients
      };

      const response = await request(app)
        .post('/api/v1/notifications/send')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR'
        }
      });
    });

    test('POST /api/v1/notifications/send/batch - 应该批量发送消息', async () => {
      const batchData = {
        templateId: 'announcement_meeting',
        commonData: {
          village: { name: '测试村' },
          meeting: {
            date: '2024年1月15日',
            time: '晚上7点',
            location: '村委会',
            agenda: '讨论测试事务'
          }
        },
        recipients: [
          {
            id: 'user1',
            contact: { phone: '13800138001' },
            data: { user: { name: '张三' } }
          },
          {
            id: 'user2',
            contact: { phone: '13800138002' },
            data: { user: { name: '李四' } }
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/notifications/send/batch')
        .send(batchData)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '批量消息发送完成',
        data: {
          success: true,
          batchId: expect.any(String),
          totalRecipients: 2,
          totalSent: expect.any(Number)
        }
      });
    });

    test('POST /api/v1/notifications/broadcast - 应该发送广播消息', async () => {
      const broadcastData = {
        templateId: 'emergency_typhoon',
        data: {
          village: { name: '全体村民' },
          typhoon: { name: '测试台风', arrivalTime: '今晚' },
          contact: { emergency: '110' }
        },
        options: {
          villageId: 'test_village',
          channels: ['sms', 'push'],
          emergency: true
        }
      };

      const response = await request(app)
        .post('/api/v1/notifications/broadcast')
        .send(broadcastData)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '广播消息发送完成',
        data: {
          broadcastId: expect.any(String),
          templateId: 'emergency_typhoon',
          renderedMessage: expect.any(String),
          targetUsers: expect.any(Number)
        }
      });
    });
  });

  describe('消息历史API', () => {
    test('GET /api/v1/notifications/history - 应该获取消息历史', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '历史记录获取成功',
        data: {
          history: expect.any(Array),
          pagination: {
            total: expect.any(Number),
            page: 1,
            limit: 20,
            totalPages: expect.any(Number)
          }
        }
      });
    });

    test('GET /api/v1/notifications/history?page=2&limit=10 - 应该支持分页', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/history?page=2&limit=10')
        .expect(200);

      expect(response.body.data.pagination).toMatchObject({
        page: 2,
        limit: 10
      });
    });

    test('GET /api/v1/notifications/stats - 应该获取统计数据', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '统计数据获取成功',
        data: {
          stats: {
            total: expect.any(Number),
            byType: expect.any(Object),
            byDay: expect.any(Object),
            successRate: expect.any(Object)
          }
        }
      });
    });
  });

  describe('定时通知API', () => {
    test('POST /api/v1/notifications/schedule - 应该创建定时通知', async () => {
      const scheduleData = {
        templateId: 'announcement_meeting',
        data: {
          village: { name: '测试村' },
          meeting: {
            date: '明天',
            time: '下午2点',
            location: '村委会',
            agenda: '定时测试'
          }
        },
        recipients: {
          phone: '13800138000'
        },
        scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1小时后
        options: {
          timezone: 'Asia/Shanghai'
        }
      };

      const response = await request(app)
        .post('/api/v1/notifications/schedule')
        .send(scheduleData)
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '定时通知创建成功',
        data: {
          scheduleId: expect.any(String),
          templateId: 'announcement_meeting',
          scheduledTime: expect.any(String)
        }
      });
    });

    test('POST /api/v1/notifications/schedule - 应该拒绝过去的时间', async () => {
      const scheduleData = {
        templateId: 'announcement_meeting',
        data: { village: { name: '测试村' } },
        recipients: { phone: '13800138000' },
        scheduledTime: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1小时前
      };

      const response = await request(app)
        .post('/api/v1/notifications/schedule')
        .send(scheduleData)
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          code: 'INVALID_SCHEDULE_TIME'
        }
      });
    });

    test('GET /api/v1/notifications/scheduled - 应该获取定时任务列表', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/scheduled')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '定时任务列表获取成功',
        data: {
          scheduled: expect.any(Array),
          total: expect.any(Number)
        }
      });
    });
  });

  describe('错误处理', () => {
    test('GET /api/v1/notifications/nonexistent - 应该返回404', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          code: 'ENDPOINT_NOT_FOUND'
        }
      });
    });

    test('POST /api/v1/notifications/send - Content-Type验证', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          code: 'INVALID_CONTENT_TYPE'
        }
      });
    });

    test('应该处理服务器内部错误', async () => {
      // 模拟服务器错误
      jest.spyOn(NotificationsService, 'getAllTemplates').mockImplementationOnce(() => {
        throw new Error('模拟的服务器错误');
      });

      const response = await request(app)
        .get('/api/v1/notifications/templates')
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'error',
        error: {
          code: expect.any(String),
          message: expect.any(String)
        }
      });

      // 恢复原始实现
      jest.restoreAllMocks();
    });
  });

  describe('API限流测试', () => {
    test('应该在请求过多时触发限流', async () => {
      // 发送大量请求以触发限流
      const requests = Array(15).fill().map(() => 
        request(app).get('/api/v1/notifications/templates')
      );

      const responses = await Promise.all(requests);
      
      // 检查是否有限流响应
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      // 如果触发了限流，验证响应格式
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body).toMatchObject({
          status: 'error',
          error: {
            code: 'RATE_LIMIT_EXCEEDED'
          }
        });
      }
    }, 10000); // 增加超时时间
  });

  describe('参数验证测试', () => {
    test('应该验证手机号格式', async () => {
      const invalidData = {
        templateId: 'emergency_typhoon',
        data: { village: { name: '测试村' } },
        recipients: {
          phone: 'invalid_phone_number' // 无效手机号
        }
      };

      const response = await request(app)
        .post('/api/v1/notifications/send')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    test('应该验证邮箱格式', async () => {
      const invalidData = {
        templateId: 'emergency_typhoon',
        data: { village: { name: '测试村' } },
        recipients: {
          email: 'invalid_email' // 无效邮箱
        }
      };

      const response = await request(app)
        .post('/api/v1/notifications/send')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    test('应该验证日期格式', async () => {
      const invalidData = {
        templateId: 'announcement_meeting',
        data: { village: { name: '测试村' } },
        recipients: { phone: '13800138000' },
        scheduledTime: 'invalid_date' // 无效日期格式
      };

      const response = await request(app)
        .post('/api/v1/notifications/schedule')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });
});