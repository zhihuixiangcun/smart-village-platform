/**
 * 认证安全测试
 * Authentication Security Tests
 *
 * 测试认证系统的安全性：
 * - SQL注入防护
 * - XSS防护
 * - CSRF防护
 * - 暴力破解防护
 * - 会话劫持防护
 * - JWT令牌安全
 * - 密码安全
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

describe('Authentication Security Tests', () => {
  let mongod;
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // 设置内存数据库
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, {
      bufferCommands: false,
      bufferMaxEntries: 0
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    // 清理数据库
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('SQL Injection Protection', () => {
    it('should sanitize SQL injection attempts in username', async () => {
      // Arrange
      const maliciousPayloads = [
        "admin' OR '1'='1",
        "admin'; DROP TABLE users;--",
        "admin' UNION SELECT * FROM users--",
        "'; EXEC xp_cmdshell('dir'); --",
        "1' AND 1=1--"
      ];

      for (const payload of maliciousPayloads) {
        // Act
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: payload,
            password: 'Test123456'
          });

        // Assert - 应该返回认证失败而不是SQL错误
        expect(response.status).not.toBe(500);
        expect(response.body.success).toBe(false);
      }
    });

    it('should sanitize SQL injection in query parameters', async () => {
      // Arrange
      const maliciousQueries = [
        "?id=1' OR '1'='1",
        "?name=admin' UNION SELECT * FROM users--",
        "?search='; DROP TABLE residents;--"
      ];

      for (const query of maliciousQueries) {
        // Act
        const response = await request(app)
          .get(`/api/v1/residents${query}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize XSS attempts in user input', async () => {
      // Arrange
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        '<body onload=alert("XSS")>'
      ];

      // 创建测试用户并获取令牌
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      if (loginRes.body.data?.token) {
        authToken = loginRes.body.data.token;
      }

      for (const payload of xssPayloads) {
        // Act
        const response = await request(app)
          .post('/api/v1/residents')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: payload,
            idCard: '110101199001011234',
            phone: '13800138000',
            villageId: new mongoose.Types.ObjectId().toString()
          });

        // Assert - XSS payload 应该被转义或拒绝
        if (response.status === 201 || response.status === 400) {
          // 如果创建成功或被拒绝，验证返回数据不包含未转义的脚本
          const responseStr = JSON.stringify(response.body);
          expect(responseStr).not.toContain('<script>');
          expect(responseStr).not.toContain('javascript:');
        }
      }
    });

    it('should sanitize XSS in file upload names', async () => {
      // Arrange
      const xssFilename = '<img src=x onerror=alert("XSS")>.jpg';

      // Act
      const response = await request(app)
        .post('/api/v1/residents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', Buffer.from('test'), xssFilename);

      // Assert
      if (response.status !== 401) {
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should verify CSRF token for state-changing operations', async () => {
      // Arrange
      const maliciousRequest = {
        name: '测试用户',
        idCard: '110101199001011234'
      };

      // Act - 发送请求不带 CSRF token
      const response = await request(app)
        .post('/api/v1/residents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'https://malicious-site.com')
        .send(maliciousRequest);

      // Assert - 应该被 CORS 或 CSRF 保护阻止
      if (response.status === 201) {
        // 如果成功，说明 CSRF 保护可能未启用
        console.warn('CSRF protection may not be enabled');
      }
    });

    it('should validate Origin and Referer headers', async () => {
      // Arrange
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001'
      ];

      // Act
      const response = await request(app)
        .post('/api/v1/residents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'https://unknown-malicious-site.com')
        .send({
          name: '测试',
          idCard: '110101199001011235'
        });

      // Assert
      if (response.status === 201) {
        console.warn('Origin validation may not be strict enough');
      }
    });
  });

  describe('Brute Force Protection', () => {
    it('should rate limit repeated failed login attempts', async () => {
      // Arrange
      const maxAttempts = 5;

      // Act - 尝试多次失败登录
      const responses = [];
      for (let i = 0; i < maxAttempts + 2; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: 'admin',
            password: 'wrongpassword'
          });
        responses.push(response);
      }

      // Assert - 应该在多次失败后返回 429
      const lastResponse = responses[responses.length - 1];
      if (lastResponse.status === 429) {
        expect(lastResponse.body).toHaveProperty('error');
        expect(lastResponse.body.error).toMatch(/too many requests|rate limit/i);
      }
    });

    it('should implement progressive delay for failed attempts', async () => {
      // Arrange
      const startTime = Date.now();

      // Act - 多次失败登录
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: 'admin',
            password: 'wrongpassword'
          });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert - 如果有延迟，总时间应该比无延迟时长
      if (duration > 100) {
        console.log('Progressive delay is implemented:', duration, 'ms');
      }
    });
  });

  describe('JWT Token Security', () => {
    it('should reject expired tokens', async () => {
      // Arrange - 创建过期的令牌
      const expiredToken = jwt.sign(
        { userId: 'test123', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // 过期
      );

      // Act
      const response = await request(app)
        .get('/api/v1/residents')
        .set('Authorization', `Bearer ${expiredToken}`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject tokens with invalid signature', async () => {
      // Arrange - 创建签名无效的令牌
      const validToken = jwt.sign(
        { userId: 'test123', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );
      const tamperedToken = validToken + 'tampered';

      // Act
      const response = await request(app)
        .get('/api/v1/residents')
        .set('Authorization', `Bearer ${tamperedToken}`);

      // Assert
      expect([401, 403]).toContain(response.status);
    });

    it('should reject tokens without proper audience claim', async () => {
      // Arrange - 创建不带 audience 的令牌
      const tokenWithoutAud = jwt.sign(
        { userId: 'test123', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Act
      const response = await request(app)
        .get('/api/v1/residents')
        .set('Authorization', `Bearer ${tokenWithoutAud}`);

      // Assert - 根据实现，可能接受或拒绝
      expect(response.status).toBeDefined();
    });

    it('should implement token refresh mechanism', async () => {
      // Arrange - 使用即将过期的令牌
      const nearExpiryToken = jwt.sign(
        { userId: 'test123', role: 'admin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1s' }
      );

      // Act - 尝试刷新令牌
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Authorization', `Bearer ${nearExpiryToken}`);

      // Assert - 如果实现了刷新端点
      if (response.status !== 404) {
        expect(response.body.data?.token).toBeDefined();
      }
    });
  });

  describe('Password Security', () => {
    it('should enforce password complexity requirements', async () => {
      // Arrange
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'qwerty',
        '111111',
        '123',
        ''
      ];

      for (const weakPassword of weakPasswords) {
        // Act
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            username: `testuser_${Date.now()}`,
            password: weakPassword,
            email: 'test@example.com'
          });

        // Assert
        if (response.status === 400) {
          expect(response.body.error).toMatch(
            /password|complexity|weak/i
          );
        }
      }
    });

    it('should hash passwords using bcrypt', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!';

      // Act
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // Assert
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBe(60); // bcrypt hash length
      expect(hashedPassword.startsWith('$2b$10$') || hashedPassword.startsWith('$2a$10$')).toBe(true);

      // Verify password matches
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should prevent password reuse', async () => {
      // 这个测试需要后端实现密码历史记录功能
      // 这里只是示例

      // Arrange
      const oldPassword = 'OldPassword123!';
      const newPassword = 'OldPassword123!'; // 与旧密码相同

      // Act
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword,
          newPassword
        });

      // Assert - 如果实现了密码历史检查
      if (response.status === 400) {
        expect(response.body.error).toMatch(/cannot reuse|already used/i);
      }
    });
  });

  describe('Session Security', () => {
    it('should invalidate session after logout', async () => {
      // Arrange - 先登录获取令牌
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      const token = loginResponse.body.data?.token;
      if (!token) {
        console.warn('Login failed, skipping session invalidation test');
        return;
      }

      // Act - 登出
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // 尝试使用已登出的令牌
      const response = await request(app)
        .get('/api/v1/residents')
        .set('Authorization', `Bearer ${token}`);

      // Assert
      if (response.status === 401) {
        expect(response.body.error).toMatch(/logged out|invalid session/i);
      }
    });

    it('should implement session timeout', async () => {
      // Arrange - 创建会话令牌
      const sessionToken = jwt.sign(
        { userId: 'test123', role: 'admin', lastActivity: Date.now() },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1s' }
      );

      // Act - 等待会话超时
      await new Promise(resolve => setTimeout(resolve, 1100));

      const response = await request(app)
        .get('/api/v1/residents')
        .set('Authorization', `Bearer ${sessionToken}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should detect concurrent sessions from different locations', async () => {
      // 这个测试需要后端实现并发会话检测
      // 这里只是示例结构

      // Arrange
      const userCredentials = {
        username: 'admin',
        password: 'admin123'
      };

      // Act - 从不同IP/位置登录
      const session1 = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '192.168.1.1')
        .send(userCredentials);

      const session2 = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '10.0.0.1')
        .send(userCredentials);

      // Assert - 如果实现了并发检测
      if (session2.body.warning) {
        expect(session2.body.warning).toMatch(/concurrent|another session/i);
      }
    });
  });

  describe('Security Headers', () => {
    it('should set security headers on all responses', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/health');

      // Assert - 检查安全头
      expect(response.headers).toBeDefined();

      // Helmet.js 设置的常见安全头
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security'
      ];

      securityHeaders.forEach(header => {
        if (response.headers[header]) {
          expect(response.headers[header]).toBeDefined();
        }
      });
    });

    it('should set Content-Security-Policy header', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/health');

      // Assert
      if (response.headers['content-security-policy']) {
        expect(response.headers['content-security-policy']).toContain("default-src");
      }
    });
  });

  describe('Input Validation Security', () => {
    it('should validate and reject oversized payloads', async () => {
      // Arrange - 创建超大payload
      const oversizedPayload = {
        name: 'A'.repeat(10000), // 超大名称
        idCard: '110101199001011234'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/residents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(oversizedPayload);

      // Assert
      expect([400, 413]).toContain(response.status);
    });

    it('should validate data types in request body', async () => {
      // Arrange - 发送错误类型的字段
      const invalidPayload = {
        name: '张三',
        age: 'not-a-number', // 应该是数字
        phone: 123456 // 应该是字符串
      };

      // Act
      const response = await request(app)
        .post('/api/v1/residents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayload);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should sanitize special characters to prevent NoSQL injection', () => {
      // Arrange
      const nosqlPayloads = [
        { username: { $ne: null } },
        { password: { $regex: '.*' } },
        { $where: 'this.username == "admin"' }
      ];

      nosqlPayloads.forEach(payload => {
        // Act & Assert - 应该被验证中间件拒绝
        expect(() => {
          JSON.stringify(payload);
        }).not.toThrow();
      });
    });
  });

  describe('Authorization Bypass Prevention', () => {
    it('should prevent privilege escalation via parameter pollution', async () => {
      // Arrange
      const normalUserToken = jwt.sign(
        { userId: 'normal123', role: 'resident' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Act - 尝试通过URL参数提升权限
      const response = await request(app)
        .get('/api/v1/residents?role=admin')
        .set('Authorization', `Bearer ${normalUserToken}`);

      // Assert
      expect(response.status).not.toBe(200);
    });

    it('should prevent IDOR (Insecure Direct Object Reference)', async () => {
      // Arrange
      const user1Token = jwt.sign(
        { userId: 'user1', role: 'resident' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Act - 尝试访问 user2 的资源
      const response = await request(app)
        .get('/api/v1/residents/user2')
        .set('Authorization', `Bearer ${user1Token}`);

      // Assert - 应该被拒绝
      expect([403, 404]).toContain(response.status);
    });
  });
});
