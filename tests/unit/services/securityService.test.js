/**
 * 安全服务单元测试
 */

const securityService = require('../../../src/services/securityService');
const crypto = require('crypto');

// Mock dependencies
jest.mock('crypto');

describe('SecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Encryption Service', () => {
    describe('encryptData', () => {
      it('应该使用AES-256-GCM加密数据', async () => {
        const data = 'sensitive information';
        const key = '32-character-long-encryption-key-here';
        const algorithm = 'aes-256-gcm';

        const mockIV = Buffer.from('initialization-vector-16');
        const mockEncrypted = Buffer.from('encrypted-data');
        const mockTag = Buffer.from('authentication-tag');

        crypto.randomBytes.mockReturnValue(mockIV);
        crypto.createCipheriv.mockReturnValue({
          update: jest.fn().mockReturnValue(mockEncrypted),
          final: jest.fn().mockReturnValue(Buffer.from('')),
          getAuthTag: jest.fn().mockReturnValue(mockTag)
        });

        const result = await securityService.encryptData(data, key, algorithm);

        expect(crypto.randomBytes).toHaveBeenCalledWith(16);
        expect(crypto.createCipheriv).toHaveBeenCalledWith(
          algorithm,
          Buffer.from(key, 'utf8'),
          mockIV
        );
        expect(result).toEqual({
          algorithm,
          iv: mockIV.toString('base64'),
          encrypted: mockEncrypted.toString('base64'),
          tag: mockTag.toString('base64')
        });
      });

      it('应该使用国密SM4算法', async () => {
        const data = 'sensitive data';
        const key = '16-byte-sm4-key-here';
        const algorithm = 'sm4-gcm';

        const mockIV = Buffer.from('16-byte-iv-here');
        const mockEncrypted = Buffer.from('sm4-encrypted');
        const mockTag = Buffer.from('sm4-tag');

        crypto.randomBytes.mockReturnValue(mockIV);
        crypto.createCipheriv.mockReturnValue({
          update: jest.fn().mockReturnValue(mockEncrypted),
          final: jest.fn().mockReturnValue(Buffer.from('')),
          getAuthTag: jest.fn().mockReturnValue(mockTag)
        });

        const result = await securityService.encryptData(data, key, algorithm);

        expect(result.algorithm).toBe('sm4-gcm');
      });
    });

    describe('decryptData', () => {
      it('应该解密AES加密的数据', async () => {
        const encryptedData = {
          algorithm: 'aes-256-gcm',
          iv: Buffer.from('iv-data').toString('base64'),
          encrypted: Buffer.from('encrypted-data').toString('base64'),
          tag: Buffer.from('auth-tag').toString('base64')
        };
        const key = '32-character-long-encryption-key-here';

        const mockDecrypted = Buffer.from('original data');

        crypto.createDecipheriv.mockReturnValue({
          setAuthTag: jest.fn(),
          update: jest.fn().mockReturnValue(mockDecrypted),
          final: jest.fn().mockReturnValue(Buffer.from(''))
        });

        const result = await securityService.decryptData(encryptedData, key);

        expect(crypto.createDecipheriv).toHaveBeenCalledWith(
          'aes-256-gcm',
          Buffer.from(key, 'utf8'),
          Buffer.from(encryptedData.iv, 'base64')
        );
        expect(result).toBe('original data');
      });

      it('应该在解密失败时抛出错误', async () => {
        const encryptedData = {
          algorithm: 'aes-256-gcm',
          iv: 'invalid-base64',
          encrypted: 'invalid-base64',
          tag: 'invalid-base64'
        };
        const key = 'valid-key';

        crypto.createDecipheriv.mockImplementation(() => {
          throw new Error('Invalid IV length');
        });

        await expect(securityService.decryptData(encryptedData, key))
          .rejects.toThrow('解密失败');
      });
    });

    describe('hashPassword', () => {
      it('应该使用PBKDF2哈希密码', async () => {
        const password = 'userPassword123';
        const salt = 'random-salt';
        const iterations = 100000;
        const keylen = 32;
        const digest = 'sha256';

        const mockHashedPassword = Buffer.from('hashed-password-result');

        crypto.pbkdf2.mockImplementation((password, salt, iterations, keylen, digest, callback) => {
          callback(null, mockHashedPassword);
        });

        const result = await securityService.hashPassword(password, salt, iterations, keylen, digest);

        expect(crypto.pbkdf2).toHaveBeenCalledWith(
          password,
          salt,
          iterations,
          keylen,
          digest,
          expect.any(Function)
        );
        expect(result).toBe(mockHashedPassword.toString('hex'));
      });
    });

    describe('verifyPassword', () => {
      it('应该验证密码正确性', async () => {
        const password = 'userPassword123';
        const hashedPassword = 'hashed-password-hex';
        const salt = 'random-salt';

        const mockHashedPassword = Buffer.from('hashed-password-result');
        const mockNewHash = Buffer.from('hashed-password-result'); // 相同结果

        crypto.pbkdf2.mockImplementation((password, salt, iterations, keylen, digest, callback) => {
          callback(null, mockNewHash);
        });

        const result = await securityService.verifyPassword(password, hashedPassword, salt);

        expect(result).toBe(true);
      });

      it('应该在密码不匹配时返回false', async () => {
        const password = 'wrongPassword';
        const hashedPassword = 'hashed-password-hex';
        const salt = 'random-salt';

        const mockNewHash = Buffer.from('different-hashed-result');

        crypto.pbkdf2.mockImplementation((password, salt, iterations, keylen, digest, callback) => {
          callback(null, mockNewHash);
        });

        const result = await securityService.verifyPassword(password, hashedPassword, salt);

        expect(result).toBe(false);
      });
    });
  });

  describe('Data Masking Service', () => {
    describe('maskSensitiveData', () => {
      it('应该脱敏身份证号', () => {
        const idCard = '330106199001011234';
        const result = securityService.maskSensitiveData(idCard, 'idCard');
        expect(result).toBe('3301********1234');
      });

      it('应该脱敏手机号码', () => {
        const phone = '13800138001';
        const result = securityService.maskSensitiveData(phone, 'phone');
        expect(result).toBe('138****8001');
      });

      it('应该脱敏银行卡号', () => {
        const bankCard = '6222021234567890123';
        const result = securityService.maskSensitiveData(bankCard, 'bankCard');
        expect(result).toBe('6222**********0123');
      });

      it('应该脱敏邮箱地址', () => {
        const email = 'zhangsan@example.com';
        const result = securityService.maskSensitiveData(email, 'email');
        expect(result).toBe('zh***@example.com');
      });

      it('应该脱敏姓名', () => {
        const name = '张三';
        const result = securityService.maskSensitiveData(name, 'name');
        expect(result).toBe('张*');
      });

      it('应该处理不支持的脱敏类型', () => {
        const data = 'sensitive data';
        const result = securityService.maskSensitiveData(data, 'unsupported');
        expect(result).toBe('***');
      });
    });

    describe('maskJSONObject', () => {
      it('应该脱敏JSON对象中的敏感字段', () => {
        const data = {
          name: '张三',
          idCard: '330106199001011234',
          phone: '13800138001',
          address: '浙江省杭州市',
          age: 35
        };

        const result = securityService.maskJSONObject(data);

        expect(result.name).toBe('张*');
        expect(result.idCard).toBe('3301********1234');
        expect(result.phone).toBe('138****8001');
        expect(result.address).toBe('浙江省杭州市'); // 非敏感字段保持不变
        expect(result.age).toBe(35);
      });

      it('应该处理嵌套对象', () => {
        const data = {
          user: {
            name: '李四',
            idCard: '330106199002022345',
            contact: {
              phone: '13900139001',
              email: 'lisi@example.com'
            }
          },
          orders: [{
            orderId: 'ORDER123',
            amount: 100
          }]
        };

        const result = securityService.maskJSONObject(data);

        expect(result.user.name).toBe('李*');
        expect(result.user.idCard).toBe('3301********2345');
        expect(result.user.contact.phone).toBe('139****9001');
        expect(result.user.contact.email).toBe('li***@example.com');
      });
    });
  });

  describe('Fraud Detection Service', () => {
    describe('analyzeTransaction', () => {
      it('应该检测高风险交易', async () => {
        const transaction = {
          userId: 'user123',
          amount: 50000, // 大额交易
          device: 'new_device',
          location: 'foreign_country',
          time: '03:00', // 异常时间
          frequency: 10 // 短时间内多次交易
        };

        const mockRiskScore = 85;
        const mockRiskFactors = [
          { factor: 'large_amount', weight: 30, score: 30 },
          { factor: 'new_device', weight: 20, score: 20 },
          { factor: 'unusual_location', weight: 25, score: 25 },
          { factor: 'unusual_time', weight: 10, score: 10 }
        ];

        jest.spyOn(securityService, 'calculateRiskScore').mockResolvedValue({
          score: mockRiskScore,
          factors: mockRiskFactors,
          level: 'high'
        });

        const result = await securityService.analyzeTransaction(transaction);

        expect(result.riskScore).toBe(mockRiskScore);
        expect(result.riskLevel).toBe('high');
        expect(result.shouldBlock).toBe(true);
        expect(result.riskFactors).toHaveLength(4);
      });

      it('应该检测低风险交易', async () => {
        const transaction = {
          userId: 'user456',
          amount: 100,
          device: 'trusted_device',
          location: 'home_location',
          time: '14:00',
          frequency: 1
        };

        jest.spyOn(securityService, 'calculateRiskScore').mockResolvedValue({
          score: 15,
          factors: [],
          level: 'low'
        });

        const result = await securityService.analyzeTransaction(transaction);

        expect(result.riskLevel).toBe('low');
        expect(result.shouldBlock).toBe(false);
      });
    });

    describe('checkFraudPatterns', () => {
      it('应该检测电信诈骗模式', () => {
        const patterns = [
          {
            type: 'impersonation',
            indicators: ['自称公检法', '要求转账', '声称账户冻结'],
            confidence: 0.85
          },
          {
            type: 'investment_scam',
            indicators: ['高回报承诺', '短期暴富', '内幕消息'],
            confidence: 0.75
          }
        ];

        const message = '您好，我是公安局的张警官，您的账户涉嫌洗钱，需要立即转账到安全账户';

        const result = securityService.checkFraudPatterns(message, patterns);

        expect(result.detected).toBe(true);
        expect(result.patterns).toHaveLength(1);
        expect(result.patterns[0].type).toBe('impersonation');
        expect(result.confidence).toBeGreaterThan(0.8);
      });

      it('应该处理无诈骗模式的消息', () => {
        const patterns = [];
        const message = '今天天气真好，适合出去散步';

        const result = securityService.checkFraudPatterns(message, patterns);

        expect(result.detected).toBe(false);
        expect(result.confidence).toBe(0);
      });
    });
  });

  describe('Access Control Service', () => {
    describe('checkPermission', () => {
      it('应该验证管理员权限', () => {
        const userRole = 'admin';
        const requiredPermission = 'user_management';

        const result = securityService.checkPermission(userRole, requiredPermission);

        expect(result).toBe(true);
      });

      it('应该拒绝普通用户的管理员权限', () => {
        const userRole = 'villager';
        const requiredPermission = 'system_admin';

        const result = securityService.checkPermission(userRole, requiredPermission);

        expect(result).toBe(false);
      });

      it('应该验证村委权限', () => {
        const userRole = 'village_committee';
        const requiredPermission = 'village_management';

        const result = securityService.checkPermission(userRole, requiredPermission);

        expect(result).toBe(true);
      });
    });

    describe('checkDataAccess', () => {
      it('应该允许用户访问自己的数据', () => {
        const userId = 'user123';
        const dataOwnerId = 'user123';
        const userRole = 'villager';

        const result = securityService.checkDataAccess(userId, dataOwnerId, userRole);

        expect(result).toBe(true);
      });

      it('应该允许管理员访问所有数据', () => {
        const userId = 'admin123';
        const dataOwnerId = 'user456';
        const userRole = 'admin';

        const result = securityService.checkDataAccess(userId, dataOwnerId, userRole);

        expect(result).toBe(true);
      });

      it('应该拒绝普通用户访问他人数据', () => {
        const userId = 'user123';
        const dataOwnerId = 'user456';
        const userRole = 'villager';

        const result = securityService.checkDataAccess(userId, dataOwnerId, userRole);

        expect(result).toBe(false);
      });
    });
  });

  describe('Audit Logging Service', () => {
    describe('logSecurityEvent', () => {
      it('应该记录安全事件', async () => {
        const eventData = {
          eventType: 'login_attempt',
          userId: 'user123',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          result: 'success',
          timestamp: new Date()
        };

        const mockLogEntry = {
          _id: 'log123',
          ...eventData,
          riskScore: 10
        };

        // Mock database save
        const mockSave = jest.fn().mockResolvedValue(mockLogEntry);
        jest.doMock('../../../src/models/SecurityLog', () => {
          return jest.fn().mockImplementation(() => ({
            save: mockSave
          }));
        });

        const result = await securityService.logSecurityEvent(eventData);

        expect(result).toBeDefined();
        expect(result.eventType).toBe('login_attempt');
      });

      it('应该记录高风险事件', async () => {
        const eventData = {
          eventType: 'multiple_failed_logins',
          userId: 'user123',
          ip: '192.168.1.100',
          result: 'failed',
          riskScore: 80
        };

        const mockSave = jest.fn().mockResolvedValue({});
        jest.doMock('../../../src/models/SecurityLog', () => {
          return jest.fn().mockImplementation(() => ({
            save: mockSave
          }));
        });

        await securityService.logSecurityEvent(eventData);

        expect(eventData.priority).toBe('high');
      });
    });
  });

  describe('Security Assessment Service', () => {
    describe('performSecurityAssessment', () => {
      it('应该执行完整的安全评估', async () => {
        const assessmentConfig = {
          encryptionCheck: true,
          permissionCheck: true,
          vulnerabilityCheck: true,
          auditCheck: true
        };

        const mockResults = {
          encryption: { status: 'compliant', score: 95 },
          permissions: { status: 'compliant', score: 88 },
          vulnerabilities: { status: 'warning', score: 75 },
          audit: { status: 'compliant', score: 92 },
          overall: { score: 87.5, status: 'compliant' }
        };

        jest.spyOn(securityService, 'checkEncryptionCompliance').mockResolvedValue(mockResults.encryption);
        jest.spyOn(securityService, 'checkPermissionCompliance').mockResolvedValue(mockResults.permissions);
        jest.spyOn(securityService, 'checkVulnerabilities').mockResolvedValue(mockResults.vulnerabilities);
        jest.spyOn(securityService, 'checkAuditCompliance').mockResolvedValue(mockResults.audit);

        const result = await securityService.performSecurityAssessment(assessmentConfig);

        expect(result.overall.score).toBe(87.5);
        expect(result.overall.status).toBe('compliant');
        expect(result.recommendations).toBeDefined();
      });

      it('应该识别安全问题并提供修复建议', async () => {
        const assessmentConfig = {};

        jest.spyOn(securityService, 'checkVulnerabilities').mockResolvedValue({
          status: 'non_compliant',
          score: 45,
          issues: [
            { type: 'weak_password', severity: 'high', description: '密码强度不足' },
            { type: 'outdated_ssl', severity: 'medium', description: 'SSL证书过期' }
          ]
        });

        const result = await securityService.performSecurityAssessment(assessmentConfig);

        expect(result.recommendations).toHaveLength(2);
        expect(result.recommendations[0]).toContain('密码强度');
      });
    });
  });
});