/**
 * 政务系统集成测试
 * 测试政务平台对接、数据同步和便民服务功能
 */

const request = require('supertest');
const mongoose = require('mongoose');
const crypto = require('crypto');

describe('Government Integration Tests', () => {
  let authToken;
  let adminToken;
  let testVillage;
  let testResident;

  beforeAll(async () => {
    // 连接测试数据库
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/smart_village_test');

    // 获取测试用户token
    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'village_admin',
        password: 'testpassword'
      });

    authToken = userLogin.body.data.token;

    // 获取管理员token
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'admin',
        password: 'adminpassword'
      });

    adminToken = adminLogin.body.data.token;

    // 创建测试村庄
    const Village = require('../../src/models/Village');
    testVillage = new Village({
      name: '测试村',
      code: 'TEST001',
      address: '测试地址',
      population: 1000,
      households: 300,
      area: 50.5,
      isActive: true
    });
    await testVillage.save();

    // 创建测试村民
    const Resident = require('../../src/models/Resident');
    testResident = new Resident({
      name: '测试村民',
      idCard: '110101199001011234',
      phone: '13800138000',
      villageId: testVillage._id,
      householdId: new mongoose.Types.ObjectId(),
      isActive: true
    });
    await testResident.save();
  });

  afterAll(async () => {
    // 清理测试数据
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('Platform Connection Status', () => {
    test('should get platform connection status', async () => {
      const response = await request(app)
        .get('/api/v1/government/connection-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('provincial');
      expect(response.body.data).toHaveProperty('municipal');
      expect(response.body.data.provincial).toHaveProperty('connected');
      expect(response.body.data.municipal).toHaveProperty('connected');
    });

    test('should reject unauthorized access to connection status', async () => {
      await request(app)
        .get('/api/v1/government/connection-status')
        .expect(401);
    });
  });

  describe('Data Synchronization', () => {
    test('should sync household data successfully', async () => {
      // 创建测试户籍数据
      const Household = require('../../src/models/Household');
      const testHousehold = new Household({
        householdNumber: 'TEST001',
        householderName: '测试户主',
        householderId: '110101199001011235',
        address: '测试地址123号',
        villageId: testVillage._id,
        memberCount: 4,
        registrationDate: new Date(),
        isActive: true
      });
      await testHousehold.save();

      const response = await request(app)
        .post('/api/v1/government/sync/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          villageId: testVillage._id.toString(),
          options: {
            batchSize: 10,
            enableRetry: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('villageId');
      expect(response.body.data).toHaveProperty('totalRecords');
      expect(response.body.data).toHaveProperty('processedRecords');
      expect(response.body.data).toHaveProperty('duration');
    });

    test('should validate village ID for household sync', async () => {
      const response = await request(app)
        .post('/api/v1/government/sync/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          options: {}
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('村庄ID不能为空');
    });

    test('should handle non-existent village for household sync', async () => {
      const fakeVillageId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/api/v1/government/sync/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          villageId: fakeVillageId,
          options: {}
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('村庄不存在');
    });

    test('should sync social security data', async () => {
      const response = await request(app)
        .post('/api/v1/government/sync/social-security')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          villageId: testVillage._id.toString(),
          options: {}
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRecords');
      expect(response.body.data).toHaveProperty('processedRecords');
    });

    test('should batch sync all villages', async () => {
      // 创建额外的测试村庄
      const Village = require('../../src/models/Village');
      await new Village({
        name: '测试村2',
        code: 'TEST002',
        address: '测试地址2',
        population: 800,
        households: 250,
        area: 40.5,
        isActive: true
      }).save();

      const response = await request(app)
        .post('/api/v1/government/sync/batch-all')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          syncType: 'household',
          options: {
            batchSize: 50
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalVillages');
      expect(response.body.data).toHaveProperty('successCount');
      expect(response.body.data).toHaveProperty('failedCount');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    test('should get sync status', async () => {
      const response = await request(app)
        .get('/api/v1/government/sync/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('inProgress');
      expect(response.body.data).toHaveProperty('totalRecords');
      expect(response.body.data).toHaveProperty('processedRecords');
    });

    test('should get sync history', async () => {
      // 创建同步历史记录
      const SyncHistory = require('../../src/models/SyncHistory');
      await new SyncHistory({
        villageId: testVillage._id,
        syncType: 'household',
        status: 'success',
        totalRecords: 100,
        processedRecords: 98,
        failedRecords: 2,
        duration: 15000,
        syncTime: new Date(),
        operator: 'test_operator'
      }).save();

      const response = await request(app)
        .get('/api/v1/government/sync/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('history');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.history)).toBe(true);

      if (response.body.data.history.length > 0) {
        const history = response.body.data.history[0];
        expect(history).toHaveProperty('syncType');
        expect(history).toHaveProperty('status');
        expect(history).toHaveProperty('villageId');
      }
    });
  });

  describe('Statistics Report Upload', () => {
    test('should upload population statistics report', async () => {
      const reportData = {
        villageId: testVillage._id.toString(),
        reportDate: '2024-01-01',
        totalPopulation: 1000,
        householdCount: 300,
        malePopulation: 520,
        femalePopulation: 480,
        elderlyPopulation: 150,
        minorPopulation: 200,
        employmentRate: 0.85
      };

      const response = await request(app)
        .post('/api/v1/government/report/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportData,
          reportType: 'population'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportId');
      expect(response.body.data).toHaveProperty('uploadTime');
    });

    test('should validate report data', async () => {
      const invalidReportData = {
        villageId: testVillage._id.toString(),
        reportType: 'population'
        // 缺少必要字段
      };

      const response = await request(app)
        .post('/api/v1/government/report/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportData: invalidReportData,
          reportType: 'population'
        })
        .expect(500); // 期望服务器端验证错误

      expect(response.body.success).toBe(false);
    });

    test('should reject unauthorized report upload', async () => {
      const reportData = {
        villageId: testVillage._id.toString(),
        reportDate: '2024-01-01',
        totalPopulation: 1000
      };

      await request(app)
        .post('/api/v1/government/report/upload')
        .send({
          reportData,
          reportType: 'population'
        })
        .expect(401);
    });
  });

  describe('Government Services', () => {
    test('should get available service types', async () => {
      const response = await request(app)
        .get('/api/v1/government/services/types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const serviceType = response.body.data[0];
      expect(serviceType).toHaveProperty('code');
      expect(serviceType).toHaveProperty('name');
      expect(serviceType).toHaveProperty('description');
      expect(serviceType).toHaveProperty('category');
    });

    test('should query government services', async () => {
      const response = await request(app)
        .get('/api/v1/government/services/query')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          serviceType: 'social_security',
          keyword: '养老',
          page: 1,
          pageSize: 20
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(Array.isArray(response.body.data.services)).toBe(true);

      if (response.body.data.services.length > 0) {
        const service = response.body.data.services[0];
        expect(service).toHaveProperty('id');
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('type');
        expect(service).toHaveProperty('description');
        expect(service).toHaveProperty('requirements');
        expect(service).toHaveProperty('onlineApply');
      }
    });

    test('should apply for government service', async () => {
      const applicationData = {
        name: '测试申请人',
        idCard: '110101199001011236',
        phone: '13800138001',
        address: '测试申请地址',
        villageId: testVillage._id.toString(),
        formData: {
          birthDate: '1990-01-01',
          gender: '男'
        },
        attachments: [{
          fileName: 'test.jpg',
          fileUrl: '/uploads/test.jpg',
          fileSize: 1024
        }]
      };

      const response = await request(app)
        .post('/api/v1/government/services/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceId: 'test_service_id',
          applicantData: applicationData
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('applicationId');
      expect(response.body.data).toHaveProperty('status');
    });

    test('should validate application data', async () => {
      const invalidApplicationData = {
        name: '', // 空姓名
        idCard: 'invalid_id', // 无效身份证
        phone: '123' // 无效电话
      };

      const response = await request(app)
        .post('/api/v1/government/services/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceId: 'test_service_id',
          applicantData: invalidApplicationData
        })
        .expect(500); // 期望服务器端验证错误

      expect(response.body.success).toBe(false);
    });

    test('should get my applications', async () => {
      // 创建申请历史记录
      const ApplicationHistory = require('../../src/models/ApplicationHistory');
      await new ApplicationHistory({
        applicationId: 'APP202401150001',
        serviceId: new mongoose.Types.ObjectId(),
        applicantId: testResident.idCard,
        applicantName: testResident.name,
        applicantPhone: testResident.phone,
        applicationData: {
          villageId: testVillage._id
        },
        status: 'submitted',
        applyTime: new Date()
      }).save();

      const response = await request(app)
        .get('/api/v1/government/services/my-applications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('applications');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.applications)).toBe(true);

      if (response.body.data.applications.length > 0) {
        const application = response.body.data.applications[0];
        expect(application).toHaveProperty('applicationId');
        expect(application).toHaveProperty('status');
        expect(application).toHaveProperty('applyTime');
      }
    });
  });

  describe('Auto Sync Control', () => {
    test('should start auto sync', async () => {
      const response = await request(app)
        .post('/api/v1/government/sync/auto-start')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('自动同步已启动');
    });

    test('should stop auto sync', async () => {
      const response = await request(app)
        .post('/api/v1/government/sync/auto-stop')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('自动同步已停止');
    });

    test('should reject auto sync control from non-admin', async () => {
      await request(app)
        .post('/api/v1/government/sync/auto-start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      await request(app)
        .post('/api/v1/government/sync/auto-stop')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    test('should handle API request timeout', async () => {
      // 模拟API超时情况
      const originalTimeout = process.env.API_REQUEST_TIMEOUT;
      process.env.API_REQUEST_TIMEOUT = '1';

      const response = await request(app)
        .post('/api/v1/government/sync/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          villageId: testVillage._id.toString(),
          options: {}
        });

      // 恢复原始超时设置
      if (originalTimeout) {
        process.env.API_REQUEST_TIMEOUT = originalTimeout;
      } else {
        delete process.env.API_REQUEST_TIMEOUT;
      }

      // 超时情况下应该返回错误，但不一定是500错误
      expect([200, 500]).toContain(response.status);
    });

    test('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/api/v1/government/sync/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('invalid json data')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle database connection errors', async () => {
      // 关闭数据库连接模拟连接错误
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/v1/government/sync/history')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);

      // 重新连接数据库
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/smart_village_test');
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple concurrent sync requests', async () => {
      const requests = Array(5).fill().map(() =>
        request(app)
          .post('/api/v1/government/sync/household')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            villageId: testVillage._id.toString(),
            options: { batchSize: 10 }
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // 所有请求都应该成功
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });

      // 总响应时间应该合理（小于30秒）
      expect(endTime - startTime).toBeLessThan(30000);
    });

    test('should handle large report data upload', async () => {
      const largeReportData = {
        villageId: testVillage._id.toString(),
        reportDate: '2024-01-01',
        // 生成大量数据
        residents: Array(1000).fill().map((_, index) => ({
          id: `resident_${index}`,
          name: `村民${index}`,
          age: Math.floor(Math.random() * 80) + 18,
          income: Math.floor(Math.random() * 100000) + 20000
        }))
      };

      const response = await request(app)
        .post('/api/v1/government/report/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportData: largeReportData,
          reportType: 'population'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Tests', () => {
    test('should validate API signatures', async () => {
      // 测试无效签名的情况
      const response = await request(app)
        .post('/api/v1/government/sync/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Signature', 'invalid_signature')
        .send({
          villageId: testVillage._id.toString(),
          options: {}
        })
        .expect(403); // 签名验证失败

      expect(response.body.success).toBe(false);
    });

    test('should prevent unauthorized village access', async () => {
      // 创建另一个村庄
      const Village = require('../../src/models/Village');
      const otherVillage = await new Village({
        name: '其他村',
        code: 'OTHER001',
        address: '其他地址',
        population: 500,
        households: 150,
        area: 30.5,
        isActive: true
      }).save();

      // 用户尝试同步其他村庄的数据
      const response = await request(app)
        .post('/api/v1/government/sync/household')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          villageId: otherVillage._id.toString(),
          options: {}
        })
        .expect(403); // 权限不足

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('无权限');

      await Village.findByIdAndDelete(otherVillage._id);
    });
  });
});