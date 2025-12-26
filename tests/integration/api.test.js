/**
 * API集成测试
 */

require('../setup/integration');

describe('API Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // 获取认证token
    const authResponse = await global.createAuthenticatedRequest('admin')
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });

    authToken = authResponse.body.token;
  });

  describe('Health Check API', () => {
    test('GET /health - 应该返回健康状态', async () => {
      const response = await global.createTestApp()
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Villager Management API', () => {
    test('GET /api/v1/residents - 应该返回村民列表', async () => {
      const response = await global.createAuthenticatedRequest()
        .get('/api/v1/residents')
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    test('POST /api/v1/residents - 应该创建新村民', async () => {
      const newResident = global.createTestResident();

      const response = await global.createAuthenticatedRequest()
        .post('/api/v1/residents')
        .send(newResident)
        .expect(201);

      global.expectSuccess(response, 201);
      expect(response.body.data).toHaveProperty('name', newResident.name);
      expect(response.body.data).toHaveProperty('idCard', newResident.idCard);
    });

    test('GET /api/v1/residents/search - 应该搜索村民', async () => {
      const response = await global.createAuthenticatedRequest()
        .get('/api/v1/residents/search')
        .query({ q: '张', limit: 10 })
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('items');
    });
  });

  describe('Village Governance API', () => {
    test('GET /api/v1/announcements - 应该返回公告列表', async () => {
      const response = await global.createAuthenticatedRequest()
        .get('/api/v1/announcements')
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('items');
    });

    test('POST /api/v1/announcements - 应该创建新公告', async () => {
      const newAnnouncement = global.createTestAnnouncement();

      const response = await global.createAuthenticatedRequest()
        .post('/api/v1/announcements')
        .send(newAnnouncement)
        .expect(201);

      global.expectSuccess(response, 201);
      expect(response.body.data).toHaveProperty('title', newAnnouncement.title);
    });

    test('GET /api/v1/meetings - 应该返回会议列表', async () => {
      const response = await global.createAuthenticatedRequest()
        .get('/api/v1/meetings')
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('items');
    });
  });

  describe('Emergency Management API', () => {
    test('GET /api/v1/emergency/reports - 应该返回应急报告列表', async () => {
      const response = await global.createAuthenticatedRequest()
        .get('/api/v1/emergency/reports')
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('items');
    });

    test('POST /api/v1/emergency/reports - 应该创建应急报告', async () => {
      const emergencyReport = global.createTestEmergency();

      const response = await global.createAuthenticatedRequest()
        .post('/api/v1/emergency/reports')
        .send(emergencyReport)
        .expect(201);

      global.expectSuccess(response, 201);
      expect(response.body.data).toHaveProperty('type', emergencyReport.type);
    });

    test('GET /api/v1/emergency/resources - 应该返回应急资源列表', async () => {
      const response = await global.createAuthenticatedRequest()
        .get('/api/v1/emergency/resources')
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('items');
    });
  });

  describe('OCR Integration API', () => {
    test('POST /api/v1/ocr/id-card - 应该识别身份证', async () => {
      const mockFile = global.mockFileUpload;

      const response = await global.createAuthenticatedRequest()
        .post('/api/v1/ocr/id-card')
        .attach('image', mockFile.buffer, mockFile.originalname)
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('idCard');
    });

    test('POST /api/v1/ocr/invoice - 应该识别发票', async () => {
      const mockFile = global.mockFileUpload;

      const response = await global.createAuthenticatedRequest()
        .post('/api/v1/ocr/invoice')
        .attach('image', mockFile.buffer, mockFile.originalname)
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('invoiceCode');
      expect(response.body.data).toHaveProperty('totalAmount');
    });
  });

  describe('Authentication Tests', () => {
    test('POST /api/v1/auth/login - 应该验证用户登录', async () => {
      const response = await global.createTestApp()
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        })
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
    });

    test('GET /api/v1/auth/profile - 应该返回用户资料', async () => {
      const response = await global.createAuthenticatedRequest()
        .get('/api/v1/auth/profile')
        .expect(200);

      global.expectSuccess(response);
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data).toHaveProperty('role');
    });

    test('应该拒绝未授权的请求', async () => {
      const response = await global.createTestApp()
        .get('/api/v1/residents')
        .expect(401);

      global.expectError(response, 401);
    });
  });

  describe('Rate Limiting Tests', () => {
    test('应该限制API请求频率', async () => {
      const responses = await global.testRateLimit('/api/v1/residents/search', 15);

      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Error Handling', () => {
    test('应该处理无效的请求参数', async () => {
      const response = await global.createAuthenticatedRequest()
        .post('/api/v1/residents')
        .send({ invalid: 'data' })
        .expect(400);

      global.expectError(response, 400);
      expect(response.body.message).toBeDefined();
    });

    test('应该处理不存在的资源', async () => {
      const response = await global.createAuthenticatedRequest()
        .get('/api/v1/residents/507f1f77bcf86cd799439999')
        .expect(404);

      global.expectError(response, 404);
    });
  });
});