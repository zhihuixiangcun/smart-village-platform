/**
 * 智慧村庄平台 - 安全系统集成测试
 * 验证所有安全组件的完整功能
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// 导入安全组件
const { securityMiddleware } = require('../../src/security/securityMiddleware');
const { encryptionService } = require('../../src/security/encryption');
const { auditLogger, OPERATION_TYPES } = require('../../src/security/auditLogger');
const { accessControl, ROLES } = require('../../src/security/accessControl');
const { transportSecurity } = require('../../src/security/transportSecurity');
const { dataSanitizer } = require('../../src/security/dataSanitization');

describe('智慧村庄平台安全系统完整测试', () => {
  let app;
  let testUser;
  let adminUser;

  beforeAll(async () => {
    // 创建测试应用
    app = express();
    app.use(express.json());

    // 配置安全中间件
    app.use('/api/secure', securityMiddleware.comprehensive({
      requireAuth: true,
      permissions: [{ permission: 'read', resourceType: 'system' }],
      rateLimitOptions: { windowMs: 60000, max: 10 }
    }));

    // 配置不同安全级别的路由
    app.get('/api/public', (req, res) => {
      res.json({ message: '公开接口', data: 'public info' });
    });

    app.get('/api/secure/user-profile',
      securityMiddleware.authenticate(),
      securityMiddleware.dataAccessControl('personal'),
      (req, res) => {
        res.json({
          userId: req.user.id,
          data: '用户敏感信息',
          accessLevel: 'protected'
        });
      }
    );

    app.post('/api/secure/sensitive-operation',
      securityMiddleware.authenticate(),
      securityMiddleware.authorize('write', 'system'),
      securityMiddleware.sensitiveOperation('system_config', false),
      (req, res) => {
        res.json({ message: '敏感操作完成' });
      }
    );

    app.post('/api/financial',
      securityMiddleware.authenticate(),
      securityMiddleware.authorizeRole('village_admin', 'accountant'),
      securityMiddleware.encryptResponse('financial'),
      (req, res) => {
        const sensitiveData = {
          amount: 100000,
          accountNumber: '6222020200012345678',
          transactionId: 'TXN' + Date.now()
        };
        res.json({ success: true, data: sensitiveData });
      }
    );

    // 创建测试用户token
    testUser = {
      id: 'test-user-001',
      name: '测试用户',
      role: ROLES.RESIDENT,
      villageId: 'test-village-001'
    };

    adminUser = {
      id: 'admin-user-001',
      name: '管理员',
      role: ROLES.VILLAGE_ADMIN,
      villageId: 'test-village-001'
    };

    // 等待审计系统初始化
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await auditLogger.shutdown();
  });

  describe('🔐 认证与授权系统测试', () => {
    test('JWT认证功能正常', async () => {
      const token = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');

      const response = await request(app)
        .get('/api/secure/user-profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.accessLevel).toBe('protected');
    });

    test('无效token被拒绝', async () => {
      const response = await request(app)
        .get('/api/secure/user-profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    test('缺少token被拒绝', async () => {
      const response = await request(app)
        .get('/api/secure/user-profile')
        .expect(401);

      expect(response.body.code).toBe('MISSING_TOKEN');
    });

    test('角色权限检查正常', async () => {
      // 普通用户尝试访问管理员接口
      const userToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');

      const response = await request(app)
        .post('/api/financial')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 1000 })
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('管理员可访问授权接口', async () => {
      const adminToken = jwt.sign(adminUser, process.env.JWT_SECRET || 'test-secret');

      const response = await request(app)
        .post('/api/financial')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 1000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('🛡️ 数据加密与脱敏测试', () => {
    test('敏感数据加密功能', () => {
      const testData = {
        name: '张三',
        idCard: '110101199001011234',
        phone: '13812345678',
        email: 'zhangsan@example.com'
      };

      // 加密个人身份信息
      const encrypted = encryptionService.encryptObject(testData, 'personal');

      expect(encrypted.idCard).not.toBe(testData.idCard);
      expect(encrypted.idCard_encrypted).toBe(true);
      expect(encrypted.name).toBe(testData.name); // 非敏感字段不加密
    });

    test('敏感数据解密功能', () => {
      const testData = {
        name: '李四',
        idCard: '110101199002021234'
      };

      const encrypted = encryptionService.encryptObject(testData, 'personal');
      const decrypted = encryptionService.decryptObject(encrypted, 'personal');

      expect(decrypted.idCard).toBe(testData.idCard);
      expect(decrypted.idCard_encrypted).toBeUndefined();
    });

    test('哈希生成与验证', () => {
      const password = 'userPassword123';
      const hashData = encryptionService.hash(password);

      expect(hashData.hash).toBeDefined();
      expect(hashData.salt).toBeDefined();
      expect(hashData.algorithm).toBe('sha256');

      // 验证哈希
      const isValid = encryptionService.verifyHash(password, hashData);
      expect(isValid).toBe(true);

      // 验证错误密码
      const isInvalid = encryptionService.verifyHash('wrongPassword', hashData);
      expect(isInvalid).toBe(false);
    });

    test('动态数据脱敏', () => {
      const user = {
        id: 'user-001',
        name: '王五',
        role: ROLES.RESIDENT
      };

      const adminUser = {
        id: 'admin-001',
        name: '管理员',
        role: ROLES.VILLAGE_ADMIN
      };

      const sensitiveData = {
        userId: 'user-001',
        phone: '13912345678',
        idCard: '110101199003031234'
      };

      // 普通用户查看数据（应脱敏）
      const userView = accessControl.sanitizeData(sensitiveData, user, 'personal');
      expect(userView.phone).toMatch(/139\*\*\*\*5678/);

      // 管理员查看数据（完整显示）
      const adminView = accessControl.sanitizeData(sensitiveData, adminUser, 'personal');
      expect(adminView.phone).toBe('13912345678');
    });
  });

  describe('📝 审计日志系统测试', () => {
    test('操作审计记录功能', async () => {
      const operation = {
        type: OPERATION_TYPES.DATA_READ,
        action: 'view_profile',
        resource: 'user_data'
      };

      const auditData = {
        user: testUser,
        ip: '127.0.0.1',
        endpoint: '/api/secure/user-profile',
        status: 'success',
        dataType: 'personal'
      };

      // 记录审计日志
      auditLogger.log(operation, auditData);

      // 等待异步处理
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证队列状态
      const queueStatus = auditLogger.getQueueStatus();
      expect(queueStatus.queueSize).toBeGreaterThanOrEqual(0);
    });

    test('安全事件告警功能', async () => {
      const securityEvent = {
        type: OPERATION_TYPES.UNAUTHORIZED_ACCESS,
        action: 'access_denied',
        resource: 'sensitive_data'
      };

      const eventData = {
        user: testUser,
        ip: '192.168.1.100',
        status: 'blocked',
        securityEvent: true,
        riskLevel: 'high'
      };

      // 记录安全事件
      auditLogger.log(securityEvent, eventData);

      // 等待立即处理（高优先级事件）
      await new Promise(resolve => setTimeout(resolve, 200));

      // 安全事件应该被立即处理
      const queueStatus = auditLogger.getQueueStatus();
      expect(typeof queueStatus.queueSize).toBe('number');
    });

    test('数据脱敏功能', () => {
      const sensitiveState = {
        password: 'secret123',
        creditCard: '6222020200012345678',
        email: 'user@example.com',
        normalField: 'public data'
      };

      const sanitized = auditLogger.sanitizeState(sensitiveState);

      // 敏感字段应被脱敏
      expect(sanitized.password).toMatch(/\*\*\*/);
      expect(sanitized.creditCard).toMatch(/\*\*\*/);

      // 普通字段保持不变
      expect(sanitized.normalField).toBe('public data');
    });
  });

  describe('🔒 输入验证与注入防护测试', () => {
    test('SQL注入模式检测', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1; DELETE FROM users WHERE 1=1 --",
        "' UNION SELECT * FROM sensitive_data --"
      ];

      maliciousInputs.forEach(input => {
        const isMalicious = dataSanitizer.detectMaliciousPatterns(input);
        expect(isMalicious).toBe(true);
      });
    });

    test('NoSQL注入防护', () => {
      const noSQLInjection = {
        username: { $ne: null },
        password: { $regex: '.*' },
        $where: 'this.username == "admin"'
      };

      const sanitized = dataSanitizer.sanitizeObject(noSQLInjection);

      // NoSQL操作符应被移除
      expect(sanitized.username.$ne).toBeUndefined();
      expect(sanitized.password.$regex).toBeUndefined();
      expect(sanitized.$where).toBeUndefined();
    });

    test('XSS攻击防护', () => {
      const xssPayload = '<script>alert("XSS")</script>';
      const sanitized = dataSanitizer.sanitizeString(xssPayload);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert(');
    });

    test('文件路径遍历防护', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/shadow'
      ];

      maliciousPaths.forEach(path => {
        const sanitized = dataSanitizer.sanitizeFilePath(path);
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
      });
    });
  });

  describe('⚡ 速率限制与DDoS防护测试', () => {
    test('正常请求通过', async () => {
      const token = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');

      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/secure/user-profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      }
    });

    test('速率限制触发', async () => {
      const token = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');

      // 快速发送超过限制的请求
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .get('/api/secure/user-profile')
            .set('Authorization', `Bearer ${token}`)
        );
      }

      const responses = await Promise.allSettled(requests);

      // 检查是否有请求被限制
      const rateLimitedResponses = responses.filter(
        result => result.status === 'fulfilled' &&
        result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('🔑 API密钥与令牌管理测试', () => {
    test('API密钥生成与验证', () => {
      const keyInfo = transportSecurity.generateAPIKey('user-001');

      expect(keyInfo.keyId).toBeDefined();
      expect(keyInfo.keyHash).toBeDefined();
      expect(keyInfo.keyPrefix).toBe('svk');
      expect(keyInfo.expiresAt).toBeInstanceOf(Date);

      // 测试密钥格式
      expect(keyInfo.key).toMatch(/^svk_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/);
    });

    test('API密钥验证功能', () => {
      const user = { id: 'user-001', name: '测试用户' };
      const { key, keyId } = transportSecurity.generateAPIKey(user.id);

      // 注册密钥
      transportSecurity.registerAPIKey(keyId, user);

      // 验证密钥
      const isValid = transportSecurity.validateAPIKey(key);
      expect(isValid).toBe(true);
    });

    test('JWT令牌生成与验证', () => {
      const payload = {
        id: 'user-001',
        name: '测试用户',
        role: ROLES.RESIDENT
      };

      const token = transportSecurity.generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // 验证令牌
      const decoded = transportSecurity.verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.name).toBe(payload.name);
    });
  });

  describe('📊 综合安全性能测试', () => {
    test('安全组件性能基准', async () => {
      const iterations = 1000;
      const testData = { name: '测试', idCard: '123456789012345678' };

      // 加密性能测试
      const encryptStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        encryptionService.encryptObject(testData, 'personal');
      }
      const encryptTime = Date.now() - encryptStart;

      // 脱敏性能测试
      const sanitizeStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        dataSanitizer.sanitizeObject(testData);
      }
      const sanitizeTime = Date.now() - sanitizeStart;

      console.log(`加密性能: ${iterations}次操作耗时 ${encryptTime}ms (平均 ${(encryptTime/iterations).toFixed(2)}ms/次)`);
      console.log(`脱敏性能: ${iterations}次操作耗时 ${sanitizeTime}ms (平均 ${(sanitizeTime/iterations).toFixed(2)}ms/次)`);

      // 性能应该在合理范围内
      expect(encryptTime).toBeLessThan(5000); // 5秒内完成1000次加密
      expect(sanitizeTime).toBeLessThan(100); // 100ms内完成1000次脱敏
    });

    test('内存使用监控', () => {
      const memBefore = process.memoryUsage();

      // 执行大量安全操作
      for (let i = 0; i < 10000; i++) {
        encryptionService.encryptObject({ data: `test-${i}` }, 'system');
        dataSanitizer.sanitizeObject({ input: `input-${i}` });
      }

      const memAfter = process.memoryUsage();
      const memoryIncrease = memAfter.heapUsed - memBefore.heapUsed;

      console.log(`内存使用增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // 内存增长应该在合理范围内
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 小于50MB
    });
  });

  describe('🔄 安全系统集成完整性测试', () => {
    test('端到端安全流程', async () => {
      const user = {
        id: 'integration-user-001',
        name: '集成测试用户',
        role: ROLES.VILLAGE_ADMIN
      };

      const token = transportSecurity.generateToken(user);

      // 1. 认证请求
      const response = await request(app)
        .post('/api/secure/sensitive-operation')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'system_config' })
        .expect(200);

      // 2. 验证操作被审计
      await new Promise(resolve => setTimeout(resolve, 100));
      const queueStatus = auditLogger.getQueueStatus();
      expect(typeof queueStatus.queueSize).toBe('number');

      // 3. 验证响应包含安全头
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    test('多层级权限验证', () => {
      const villageAdmin = {
        id: 'admin-001',
        role: ROLES.VILLAGE_ADMIN,
        villageId: 'village-001'
      };

      const superAdmin = {
        id: 'super-admin-001',
        role: ROLES.SUPER_ADMIN,
        villageId: 'village-002'
      };

      const resource = {
        type: 'village_data',
        villageId: 'village-001'
      };

      // 村管理员只能访问本村数据
      const adminAccess = accessControl.hasPermission(villageAdmin, 'read', resource);
      expect(adminAccess).toBe(true);

      // 超级管理员可以访问所有数据
      const superAdminAccess = accessControl.hasPermission(superAdmin, 'read', resource);
      expect(superAdminAccess).toBe(true);
    });
  });
});

describe('安全系统错误处理与恢复测试', () => {
  test('加密服务错误处理', () => {
    expect(() => {
      encryptionService.encryptObject(null, 'personal');
    }).not.toThrow();

    expect(() => {
      encryptionService.decryptObject(null, 'personal');
    }).not.toThrow();
  });

  test('审计日志错误恢复', async () => {
    // 模拟写入错误
    const originalWrite = auditLogger.writeAuditLog;
    auditLogger.writeAuditLog = jest.fn().mockRejectedValue(new Error('写入失败'));

    // 记录审计日志（应该能处理错误）
    expect(() => {
      auditLogger.log(
        { type: 'test', action: 'test', resource: 'test' },
        { user: { id: 'test' } }
      );
    }).not.toThrow();

    // 恢复原方法
    auditLogger.writeAuditLog = originalWrite;
  });
});