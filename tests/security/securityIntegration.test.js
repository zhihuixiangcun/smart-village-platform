/**
 * 安全模块集成测试
 * 测试安全综合管理平台的完整功能
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app'); // 需要根据实际路径调整

describe('Security Management Integration Tests', () => {
  let authToken;
  let adminToken;

  beforeAll(async () => {
    // 连接测试数据库
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/smart_village_test');

    // 获取测试用户token
    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
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
  });

  afterAll(async () => {
    // 清理测试数据
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('Security Dashboard', () => {
    test('should return security dashboard data', async () => {
      const response = await request(app)
        .get('/api/v1/security/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallSecurityScore');
      expect(response.body.data).toHaveProperty('modules');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('recentActivities');

      // 验证模块结构
      const modules = response.body.data.modules;
      expect(modules).toHaveProperty('compliance');
      expect(modules).toHaveProperty('encryption');
      expect(modules).toHaveProperty('antiFraud');
      expect(modules).toHaveProperty('privacy');
    });

    test('should reject unauthorized access', async () => {
      await request(app)
        .get('/api/v1/security/dashboard')
        .expect(401);

      await request(app)
        .get('/api/v1/security/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('MLPS Compliance Management', () => {
    test('should perform compliance assessment', async () => {
      const response = await request(app)
        .post('/api/v1/security/compliance-assessment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          protectionLevel: 'L2'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('protectionLevel', 'L2');
      expect(response.body.data).toHaveProperty('overallScore');
      expect(response.body.data).toHaveProperty('domainScores');
      expect(response.body.data).toHaveProperty('isCompliant');

      // 验证7个安全域
      const domainScores = response.body.data.domainScores;
      const expectedDomains = ['physical', 'network', 'host', 'application', 'data', 'management', 'recovery'];
      expectedDomains.forEach(domain => {
        expect(domainScores).toHaveProperty(domain);
      });
    });

    test('should generate remediation plan', async () => {
      const response = await request(app)
        .post('/api/v1/security/generate-remediation-plan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          protectionLevel: 'L2'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tasks');
      expect(Array.isArray(response.body.data.tasks)).toBe(true);
    });

    test('should start continuous monitoring', async () => {
      const response = await request(app)
        .get('/api/v1/security/continuous-compliance-monitoring')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('monitoringStatus');
      expect(response.body.data).toHaveProperty('lastCheck');
    });
  });

  describe('Data Encryption Service', () => {
    test('should encrypt sensitive data', async () => {
      const sensitiveData = {
        idCard: '110101199001011234',
        name: '张三',
        phone: '13800138000'
      };

      const response = await request(app)
        .post('/api/v1/security/encrypt')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: sensitiveData,
          dataType: 'personal_info',
          maskingLevel: 'standard'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('encryptedData');
      expect(response.body.data.metadata).toHaveProperty('algorithm');
      expect(response.body.data.metadata).toHaveProperty('keyId');
    });

    test('should decrypt encrypted data', async () => {
      // 首先加密数据
      const originalData = { secret: 'confidential information' };

      const encryptResponse = await request(app)
        .post('/api/v1/security/encrypt')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: originalData
        })
        .expect(200);

      // 然后解密数据
      const decryptResponse = await request(app)
        .post('/api/v1/security/decrypt')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          encryptedData: encryptResponse.body.data.encryptedData
        })
        .expect(200);

      expect(decryptResponse.body.success).toBe(true);
      expect(decryptResponse.body.data).toEqual(originalData);
    });

    test('should batch encrypt multiple records', async () => {
      const records = [
        { id: 1, data: 'record 1' },
        { id: 2, data: 'record 2' },
        { id: 3, data: 'record 3' }
      ];

      const response = await request(app)
        .post('/api/v1/security/batch-encrypt')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          records,
          dataType: 'test_data'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('encryptedRecords');
      expect(response.body.data.encryptedRecords).toHaveLength(3);
    });

    test('should manage encryption keys', async () => {
      // 生成新密钥
      const generateResponse = await request(app)
        .post('/api/v1/security/manage-key')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operation: 'generate',
          algorithm: 'AES-256-GCM',
          keyLength: 256
        })
        .expect(200);

      expect(generateResponse.body.success).toBe(true);
      expect(generateResponse.body.data).toHaveProperty('keyId');

      const keyId = generateResponse.body.data.keyId;

      // 轮换密钥
      const rotateResponse = await request(app)
        .post('/api/v1/security/manage-key')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operation: 'rotate',
          keyId
        })
        .expect(200);

      expect(rotateResponse.body.success).toBe(true);
    });

    test('should get encryption statistics', async () => {
      const response = await request(app)
        .get('/api/v1/security/encryption/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('keyCount');
      expect(response.body.data).toHaveProperty('encryptedFiles');
      expect(response.body.data).toHaveProperty('algorithms');
    });
  });

  describe('Anti-Fraud System', () => {
    test('should detect phone fraud', async () => {
      const response = await request(app)
        .post('/api/v1/security/detect-fraud')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: 'phone',
          data: {
            phoneNumber: '13800138000',
            content: '您好，我是公安局的，您的账户涉嫌洗钱，请立即转账到安全账户'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('riskScore');
      expect(response.body.data).toHaveProperty('riskLevel');
      expect(response.body.data).toHaveProperty('reasons');
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(response.body.data.riskLevel);
    });

    test('should detect SMS fraud', async () => {
      const response = await request(app)
        .post('/api/v1/security/detect-fraud')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: 'sms',
          data: {
            content: '恭喜您中奖了！请点击链接领取奖金 http://fake-prize.com',
            senderNumber: '10688888',
            links: ['http://fake-prize.com']
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('riskScore');
      expect(response.body.data.riskScore).toBeGreaterThan(0);
    });

    test('should detect phishing website', async () => {
      const response = await request(app)
        .post('/api/v1/security/detect-fraud')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: 'website',
          data: {
            url: 'http://fake-bank.com/login',
            content: '银行登录页面 - 请输入您的账户信息'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isPhishing');
    });

    test('should submit fraud report', async () => {
      const response = await request(app)
        .post('/api/v1/security/report-fraud')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reporter: 'user001',
          type: 'phone',
          contact: '13800138000',
          description: '接到冒充公检法的诈骗电话',
          evidence: ['audio_recording.mp3']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportId');
    });

    test('should get fraud trend analysis', async () => {
      const response = await request(app)
        .get('/api/v1/security/fraud-trend-analysis')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ timeRange: 'month' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('trends');
    });
  });

  describe('Privacy Protection', () => {
    test('should mask sensitive data', async () => {
      const sensitiveData = {
        idCard: '110101199001011234',
        phone: '13800138000',
        email: 'user@example.com',
        bankCard: '6225880123456789'
      };

      const response = await request(app)
        .post('/api/v1/security/manage-privacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operation: 'maskData',
          dataType: 'personal_info',
          maskingLevel: 'standard',
          consentData: sensitiveData
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('maskedData');

      // 验证数据已被脱敏
      const maskedData = response.body.data.maskedData;
      expect(maskedData.idCard).toBe('1101********1234');
      expect(maskedData.phone).toBe('138****8000');
      expect(maskedData.bankCard).toBe('6225****6789');
    });

    test('should manage user consent', async () => {
      // 添加用户同意
      const addResponse = await request(app)
        .post('/api/v1/security/manage-privacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operation: 'consent',
          userId: 'user001',
          consentData: {
            consentType: 'dataCollection',
            scope: '个人基本信息收集',
            expiresAt: '2025-12-31'
          }
        })
        .expect(200);

      expect(addResponse.body.success).toBe(true);

      // 检查同意状态
      const checkResponse = await request(app)
        .post('/api/v1/security/manage-privacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operation: 'checkConsent',
          userId: 'user001',
          consentData: {
            consentType: 'dataCollection',
            scope: '个人基本信息收集'
          }
        })
        .expect(200);

      expect(checkResponse.body.success).toBe(true);
      expect(checkResponse.body.data).toHaveProperty('hasConsent');

      // 撤销同意
      const revokeResponse = await request(app)
        .post('/api/v1/security/manage-privacy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          operation: 'revokeConsent',
          userId: 'user001',
          consentData: {
            consentId: addResponse.body.data.consentId
          }
        })
        .expect(200);

      expect(revokeResponse.body.success).toBe(true);
    });

    test('should perform privacy impact assessment', async () => {
      const response = await request(app)
        .post('/api/v1/security/privacy-impact-assessment')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dataProcess: {
            processingActivity: '用户行为分析',
            dataTypes: ['personalIdentity', 'contactInfo', 'locationData'],
            purpose: '个性化服务推荐',
            legalBasis: 'consent'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('riskLevel');
      expect(response.body.data).toHaveProperty('riskScore');
      expect(response.body.data).toHaveProperty('necessity');
      expect(response.body.data).toHaveProperty('proportionality');
    });

    test('should get audit logs', async () => {
      const response = await request(app)
        .get('/api/v1/security/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ days: 7 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('dateRange');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Security Reports', () => {
    test('should generate comprehensive security report', async () => {
      const response = await request(app)
        .post('/api/v1/security/generate-report')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: 'comprehensive',
          format: 'json'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportType', 'comprehensive_security_report');
      expect(response.body.data).toHaveProperty('sections');
      expect(response.body.data).toHaveProperty('executiveSummary');
      expect(response.body.data).toHaveProperty('recommendations');
    });

    test('should export report in different formats', async () => {
      const formats = ['json', 'pdf', 'excel'];

      for (const format of formats) {
        const response = await request(app)
          .post('/api/v1/security/generate-report')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reportType: 'compliance',
            format
          })
          .expect(200);

        expect(response.body.success).toBe(true);

        if (format === 'json') {
          expect(response.body.data).toHaveProperty('protectionLevel');
        } else {
          expect(response.headers['content-type']).toMatch(/application\/(pdf|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)/);
        }
      }
    });
  });

  describe('Security Configuration', () => {
    test('should get security configuration', async () => {
      const response = await request(app)
        .get('/api/v1/security/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('encryption');
      expect(response.body.data).toHaveProperty('compliance');
      expect(response.body.data).toHaveProperty('fraudDetection');
      expect(response.body.data).toHaveProperty('privacy');
    });

    test('should update security configuration', async () => {
      const response = await request(app)
        .put('/api/v1/security/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          module: 'encryption',
          config: {
            defaultAlgorithm: 'AES-256-GCM',
            keyRotationInterval: 90
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('已更新');
    });

    test('should validate security configuration', async () => {
      // 测试无效配置
      const response = await request(app)
        .put('/api/v1/security/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          module: 'compliance',
          config: {
            protectionLevel: 'INVALID_LEVEL'
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('验证失败');
    });
  });

  describe('Security Incident Response', () => {
    test('should handle data breach incident', async () => {
      const response = await request(app)
        .post('/api/v1/security/incident-response')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          incidentType: 'dataBreach',
          severity: 'high',
          description: '检测到异常数据访问',
          action: 'investigate'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('incidentType', 'dataBreach');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.response).toHaveProperty('action');
    });

    test('should handle fraud detected incident', async () => {
      const response = await request(app)
        .post('/api/v1/security/incident-response')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          incidentType: 'fraudDetected',
          severity: 'critical',
          description: '检测到大规模诈骗活动',
          action: 'block'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.response.action).toBe('block');
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent encryption requests', async () => {
      const requests = Array(10).fill().map(() =>
        request(app)
          .post('/api/v1/security/encrypt')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            data: { test: 'performance test data' }
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // 总响应时间应该合理（小于5秒）
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should handle large data encryption', async () => {
      const largeData = {
        content: 'x'.repeat(10000), // 10KB数据
        metadata: {
          type: 'large_file',
          size: 10000
        }
      };

      const response = await request(app)
        .post('/api/v1/security/encrypt')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: largeData
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid encryption data', async () => {
      const response = await request(app)
        .post('/api/v1/security/encrypt')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: null
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle invalid fraud detection request', async () => {
      const response = await request(app)
        .post('/api/v1/security/detect-fraud')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: 'invalid_type',
          data: {}
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle invalid report type', async () => {
      const response = await request(app)
        .post('/api/v1/security/generate-report')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reportType: 'invalid_type',
          format: 'json'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});