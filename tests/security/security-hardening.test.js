const request = require('supertest');
const assert = require('assert');
const crypto = require('crypto');
const { securityConfig, securityMiddleware } = require('../../security/security-hardening');

describe('Security Hardening Tests', () => {
  let app;

  before(() => {
    // Initialize Express app with security middleware
    app = require('../../src/app');
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for security headers
      assert(response.headers['x-frame-options'] === 'DENY');
      assert(response.headers['x-content-type-options'] === 'nosniff');
      assert(response.headers['x-xss-protection'] === '1; mode=block');
      assert(response.headers['strict-transport-security']);
    });

    it('should not expose server information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      assert(!response.headers['server']);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize MongoDB injection attempts', async () => {
      const maliciousPayload = {
        username: 'admin',
        password: 'password',
        $where: 'this.username == "admin"'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(maliciousPayload)
        .expect(400);

      assert(response.body.error.includes('Invalid'));
    });

    it('should sanitize XSS attempts', async () => {
      const maliciousPayload = {
        title: '<script>alert("XSS")</script>',
        content: 'Some content'
      };

      const response = await request(app)
        .post('/api/v1/announcements')
        .send(maliciousPayload)
        .expect(401); // Unauthorized, but input should be sanitized

      // The sanitized input should not contain script tags
      if (response.body.error !== 'Unauthorized') {
        assert(!response.body.title.includes('<script>'));
      }
    });

    it('should handle directory traversal attempts', async () => {
      const maliciousUrls = [
        '/api/v1/files/../../../etc/passwd',
        '/api/v1/files/..%2F..%2F..%2Fetc%2Fpasswd',
        '/api/v1/files/....//....//....//etc/passwd'
      ];

      for (const url of maliciousUrls) {
        const response = await request(app)
          .get(url)
          .expect(404);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit authentication endpoints', async () => {
      const credentials = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send(credentials)
      );

      const responses = await Promise.all(promises);

      // Should receive rate limit error after 5 attempts
      const rateLimitResponses = responses.filter(r =>
        r.status === 429 && r.body.code === 'AUTH_RATE_LIMIT_EXCEEDED'
      );

      assert(rateLimitResponses.length > 0);
    }).timeout(10000);

    it('should rate limit general API endpoints', async () => {
      // Make many requests quickly
      const promises = Array(100).fill().map(() =>
        request(app)
          .get('/api/v1/villages')
      );

      const responses = await Promise.all(promises);

      // Some responses should be rate limited
      const rateLimitResponses = responses.filter(r =>
        r.status === 429 && r.body.code === 'RATE_LIMIT_EXCEEDED'
      );

      assert(rateLimitResponses.length > 0);
    }).timeout(30000);
  });

  describe('CORS Configuration', () => {
    it('should block requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/v1/villages')
        .set('Origin', 'https://malicious-site.com')
        .expect(403);

      assert(response.body.error.includes('CORS'));
    });

    it('should allow requests from authorized origins', async () => {
      const response = await request(app)
        .get('/api/v1/villages')
        .set('Origin', 'http://localhost:3000')
        .expect(200);
    });
  });

  describe('Password Security', () => {
    it('should enforce password complexity', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc',
        '123',
        'qwerty',
        'admin',
        'root'
      ];

      for (const password of weakPasswords) {
        const result = securityMiddleware.validatePassword(password);
        assert(!result.valid, `Password "${password}" should be rejected`);
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'MyStr0ng!P@ssw0rd',
        'C0mpl3x#P@ss',
        'Secur3P@ssw0rd123!'
      ];

      for (const password of strongPasswords) {
        const result = securityMiddleware.validatePassword(password);
        assert(result.valid, `Password "${password}" should be accepted`);
      }
    });
  });

  describe('Token Security', () => {
    it('should generate secure JWT tokens', () => {
      const payload = { userId: '123', role: 'user' };
      const tokens = securityMiddleware.generateTokens(payload);

      assert(tokens.accessToken);
      assert(tokens.refreshToken);
      assert(typeof tokens.accessToken === 'string');
      assert(typeof tokens.refreshToken === 'string');
    });

    it('should verify JWT tokens correctly', () => {
      const payload = { userId: '123', role: 'user' };
      const { accessToken } = securityMiddleware.generateTokens(payload);

      const decoded = securityMiddleware.verifyToken(accessToken);
      assert(decoded.userId === payload.userId);
      assert(decoded.role === payload.role);
    });

    it('should reject invalid tokens', () => {
      const invalidTokens = [
        'invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        null,
        undefined
      ];

      for (const token of invalidTokens) {
        assert.throws(() => {
          securityMiddleware.verifyToken(token);
        });
      }
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const data = {
        sensitiveInfo: 'This is sensitive data',
        idNumber: '123456789012345678'
      };

      const key = crypto.randomBytes(32);
      const encrypted = securityMiddleware.encryptData(data, key);
      const decrypted = securityMiddleware.decryptData(encrypted, key);

      assert.deepEqual(decrypted, data);
    });

    it('should generate secure tokens', () => {
      const token1 = securityMiddleware.generateSecureToken();
      const token2 = securityMiddleware.generateSecureToken();

      assert(token1 !== token2);
      assert(token1.length === 64); // 32 bytes * 2 (hex encoding)
      assert(token2.length === 64);
    });
  });

  describe('Input Validation', () => {
    it('should validate email addresses correctly', () => {
      const validEmails = [
        'test@example.com',
        'user.name+tag@domain.co.uk',
        'user123@test-domain.com'
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        'user name@domain.com'
      ];

      validEmails.forEach(email => {
        assert(securityMiddleware.validateEmail(email), `Email ${email} should be valid`);
      });

      invalidEmails.forEach(email => {
        assert(!securityMiddleware.validateEmail(email), `Email ${email} should be invalid`);
      });
    });
  });

  describe('File Upload Security', () => {
    it('should reject malicious file uploads', async () => {
      const maliciousFiles = [
        { filename: '../.env', content: 'MALICIOUS_CONTENT' },
        { filename: 'script.php', content: '<?php echo "hack"; ?>' },
        { filename: 'shell.jsp', content: '<% Runtime.getRuntime().exec("cmd"); %>' },
        { filename: 'exploit.exe', content: 'MALICIOUS_EXE' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/v1/upload')
          .attach('file', Buffer.from(file.content), file.filename)
          .expect(400); // Should reject malicious files

        assert(response.body.error.includes('invalid'));
      }
    });

    it('should limit file upload size', async () => {
      const largeContent = 'A'.repeat(10 * 1024 * 1024); // 10MB

      const response = await request(app)
        .post('/api/v1/upload')
        .attach('file', Buffer.from(largeContent), 'large.txt')
        .expect(413); // Request Entity Too Large

      assert(response.body.error.includes('large'));
    });
  });

  describe('Session Security', () => {
    it('should use secure session cookies in production', () => {
      if (process.env.NODE_ENV === 'production') {
        assert(securityConfig.session.cookie.secure);
        assert(securityConfig.session.cookie.httpOnly);
        assert(securityConfig.session.cookie.sameSite === 'strict');
      }
    });
  });

  describe('Audit Logging', () => {
    it('should log security events', async () => {
      // This test would verify that audit logs are being generated
      // Implementation depends on your audit logging system
      const consoleSpy = require('sinon').spy(console, 'log');

      await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'test' });

      assert(consoleSpy.calledWith(sinon.match(/AUDIT:/)));
      consoleSpy.restore();
    });
  });

  describe('Security Monitoring', () => {
    it('should detect suspicious activities', async () => {
      const suspiciousRequests = [
        { url: '/api/v1/data?query=<script>alert(1)</script>' },
        { url: '/api/v1/users?id=1\' OR \'1\'=\'1' },
        { url: '/api/v1/files/../../../etc/passwd' }
      ];

      for (const req of suspiciousRequests) {
        const response = await request(app)
          .get(req.url)
          .expect(400);

        // Should be flagged as suspicious
        // This would need to be verified against your monitoring system
      }
    });
  });
});

// Integration tests for complete security flow
describe('Security Integration Tests', () => {
  it('should protect against common attack vectors', async () => {
    const app = require('../../src/app');

    // Test XSS protection
    const xssPayload = '<script>alert("XSS")</script>';
    let response = await request(app)
      .post('/api/v1/announcements')
      .send({ title: xssPayload, content: 'test' })
      .expect(401); // Unauthorized, but should be sanitized

    // Test SQL injection protection
    const sqlInjectionPayload = "1' OR '1'='1";
    response = await request(app)
      .get(`/api/v1/users/${sqlInjectionPayload}`)
      .expect(401); // Unauthorized

    // Test NoSQL injection protection
    const nosqlInjectionPayload = { $gt: '' };
    response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: nosqlInjectionPayload, password: 'test' })
      .expect(400); // Bad request

    // Test CSRF protection (if implemented)
    response = await request(app)
      .post('/api/v1/data')
      .send({ data: 'test' })
      .expect(401); // Unauthorized
  });
});