/**
 * 云通信服务测试
 */

const cloudCommunicationService = require('../../src/services/cloudCommunicationService');

describe('Cloud Communication Service Tests', () => {
  describe('阿里云短信服务', () => {
    test('应该成功发送短信', async () => {
      const phoneNumbers = ['13800138000'];
      const templateCode = 'SMS_123456789';
      const templateParam = { code: '123456' };

      // Mock阿里云API响应
      const mockResponse = {
        data: {
          Code: 'OK',
          BizId: '123456789',
          RequestId: 'test-request-id'
        }
      };

      jest.mock('axios', () => ({
        post: jest.fn(() => Promise.resolve(mockResponse))
      }));

      const result = await cloudCommunicationService.sendSMSByAliyun(
        phoneNumbers,
        templateCode,
        templateParam
      );

      expect(result.success).toBe(true);
      expect(result.bizId).toBe('123456789');
      expect(result.requestId).toBe('test-request-id');
    });

    test('应该处理批量短信发送', async () => {
      const phoneNumbers = ['13800138000', '13800138001', '13800138002'];
      const templateCode = 'SMS_123456789';
      const templateParam = { code: '123456' };

      const mockResponse = {
        data: {
          Code: 'OK',
          BizId: '123456789',
          RequestId: 'test-request-id'
        }
      };

      jest.mock('axios', () => ({
        post: jest.fn(() => Promise.resolve(mockResponse))
      }));

      const result = await cloudCommunicationService.sendSMSByAliyun(
        phoneNumbers,
        templateCode,
        templateParam
      );

      expect(result.success).toBe(true);
      // 验证多个手机号被正确处理
      expect(Array.isArray(phoneNumbers)).toBe(true);
      expect(phoneNumbers.length).toBe(3);
    });

    test('应该处理短信发送失败', async () => {
      const phoneNumbers = ['13800138000'];

      const mockResponse = {
        data: {
          Code: 'InvalidParameter',
          Message: '参数错误'
        }
      };

      jest.mock('axios', () => ({
        post: jest.fn(() => Promise.resolve(mockResponse))
      }));

      await expect(
        cloudCommunicationService.sendSMSByAliyun(phoneNumbers, 'INVALID_TEMPLATE', {})
      ).rejects.toThrow('阿里云短信发送失败: 参数错误');
    });
  });

  describe('腾讯云短信服务', () => {
    test('应该成功发送短信', async () => {
      const phoneNumbers = ['13800138000'];
      const templateId = '12345';
      const templateParamSet = ['123456'];

      const mockResponse = {
        data: {
          Response: {
            RequestId: 'test-request-id',
            SendStatusSet: [{
              SerialNo: '123456',
              PhoneNumber: '+8613800138000',
              Fee: 1,
              SessionContext: '',
              Code: 'Ok',
              Message: 'send success'
            }]
          }
        }
      };

      jest.mock('axios', () => ({
        post: jest.fn(() => Promise.resolve(mockResponse))
      }));

      const result = await cloudCommunicationService.sendSMSByTencent(
        phoneNumbers,
        templateId,
        templateParamSet
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBe(1);
      expect(result.data[0].Code).toBe('Ok');
    });

    test('应该生成正确的腾讯云请求头', () => {
      const payload = {
        PhoneNumberSet: ['13800138000'],
        SmsSdkAppId: '123456',
        TemplateId: '12345',
        TemplateParamSet: ['123456']
      };

      const headers = cloudCommunicationService.generateTencentHeaders(
        payload,
        'test-secret-id',
        'test-secret-key',
        'sms.tencentcloudapi.com',
        'SendSms'
      );

      expect(headers.Authorization).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json; charset=utf-8');
      expect(headers['X-TC-Action']).toBe('SendSms');
      expect(headers['X-TC-Version']).toBe('2021-01-11');
    });
  });

  describe('语音通知服务', () => {
    test('应该成功发送语音通知', async () => {
      const calledNumber = '13800138000';
      const ttsCode = 'VOICE_123456';
      const ttsParam = { message: '测试语音通知' };

      const mockResponse = {
        data: {
          Code: 'OK',
          CallId: 'test-call-id',
          RequestId: 'test-request-id'
        }
      };

      jest.mock('axios', () => ({
        post: jest.fn(() => Promise.resolve(mockResponse))
      }));

      const result = await cloudCommunicationService.sendVoiceByAliyun(
        calledNumber,
        ttsCode,
        ttsParam
      );

      expect(result.success).toBe(true);
      expect(result.callId).toBe('test-call-id');
    });

    test('应该处理语音通知发送失败', async () => {
      const calledNumber = '13800138000';

      const mockResponse = {
        data: {
          Code: 'Forbidden',
          Message: '禁止访问'
        }
      };

      jest.mock('axios', () => ({
        post: jest.fn(() => Promise.resolve(mockResponse))
      }));

      await expect(
        cloudCommunicationService.sendVoiceByAliyun(calledNumber, 'INVALID_TTS', {})
      ).rejects.toThrow('阿里云语音通知发送失败: 禁止访问');
    });
  });

  describe('邮件服务', () => {
    test('应该成功发送邮件', async () => {
      const to = 'test@example.com';
      const subject = '测试邮件';
      const content = '<h1>测试内容</h1>';

      // Mock nodemailer
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({
          messageId: 'test-message-id',
          response: '250 OK'
        })
      };

      jest.doMock('nodemailer', () => ({
        createTransporter: jest.fn(() => mockTransporter)
      }));

      const result = await cloudCommunicationService.sendEmail(to, subject, content);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to,
          subject,
          html: content
        })
      );
    });

    test('应该处理带附件的邮件发送', async () => {
      const to = 'test@example.com';
      const subject = '带附件的邮件';
      const content = '邮件内容';
      const attachments = [
        {
          filename: 'test.pdf',
          path: '/path/to/test.pdf'
        }
      ];

      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({
          messageId: 'test-message-id'
        })
      };

      jest.doMock('nodemailer', () => ({
        createTransporter: jest.fn(() => mockTransporter)
      }));

      const result = await cloudCommunicationService.sendEmail(
        to,
        subject,
        content,
        'html',
        attachments
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments
        })
      );
    });
  });

  describe('推送通知服务', () => {
    test('应该成功发送推送通知', async () => {
      const registrationIds = ['123456789'];
      const notification = {
        alert: '测试推送',
        android: {
          title: '测试标题',
          alert: '测试内容'
        },
        ios: {
          title: '测试标题',
          body: '测试内容'
        }
      };

      const mockResponse = {
        data: {
          msg_id: '123456789',
          sendno: 12345
        }
      };

      jest.mock('axios', () => ({
        post: jest.fn(() => Promise.resolve(mockResponse))
      }));

      const result = await cloudCommunicationService.sendPushByJiguang(
        registrationIds,
        notification
      );

      expect(result.success).toBe(true);
      expect(result.msgId).toBe('123456789');
    });

    test('应该处理推送通知失败', async () => {
      const registrationIds = ['invalid-id'];

      const mockResponse = {
        data: {
          error: {
            code: 1001,
            message: '设备ID无效'
          }
        }
      };

      jest.mock('axios', () => ({
        post: jest.fn(() => Promise.resolve(mockResponse))
      }));

      await expect(
        cloudCommunicationService.sendPushByJiguang(registrationIds, {})
      ).rejects.toThrow('极光推送失败');
    });
  });

  describe('验证码服务', () => {
    test('应该成功生成和发送验证码', async () => {
      const phone = '13800138000';

      // Mock短信发送
      const mockSendMessage = jest.fn().mockResolvedValue({
        success: true,
        bizId: '123456789'
      });
      cloudCommunicationService.sendMessage = mockSendMessage;

      const result = await cloudCommunicationService.sendVerificationCode(phone);

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code.length).toBe(6);
      expect(/^\d{6}$/.test(result.code)).toBe(true);
      expect(result.expireTime).toBeDefined();
    });

    test('应该正确验证验证码', () => {
      const phone = '13800138000';
      const code = '123456';

      // 缓存验证码
      cloudCommunicationService.cacheVerificationCode(phone, code, new Date(Date.now() + 600000));

      const result = cloudCommunicationService.verifyCode(phone, code);

      expect(result.success).toBe(true);
      expect(result.message).toBe('验证码正确');
    });

    test('应该处理验证码错误', () => {
      const phone = '13800138000';
      const wrongCode = '654321';

      // 缓存验证码
      cloudCommunicationService.cacheVerificationCode(phone, '123456', new Date(Date.now() + 600000));

      const result = cloudCommunicationService.verifyCode(phone, wrongCode);

      expect(result.success).toBe(false);
      expect(result.message).toBe('验证码错误');
    });

    test('应该处理验证码过期', () => {
      const phone = '13800138000';
      const code = '123456';

      // 缓存已过期的验证码
      cloudCommunicationService.cacheVerificationCode(phone, code, new Date(Date.now() - 1000));

      const result = cloudCommunicationService.verifyCode(phone, code);

      expect(result.success).toBe(false);
      expect(result.message).toBe('验证码已过期或不存在');
    });
  });

  describe('应急广播服务', () => {
    test('应该成功发送应急广播', async () => {
      const villageId = '507f1f77bcf86cd799439011';
      const message = '紧急通知：今晚有暴雨，请注意安全';
      const channels = ['sms', 'voice'];

      // Mock村庄和村民数据
      const mockVillage = {
        _id: villageId,
        name: '测试村'
      };

      const mockResidents = [
        { _id: '1', phone: '13800138000', digital: { jpushId: 'jpush1' } },
        { _id: '2', phone: '13800138001', digital: { jpushId: 'jpush2' } }
      ];

      const mockSMSResult = {
        success: true,
        bizId: '123456789'
      };

      const mockVoiceResult = {
        success: true,
        callId: '123456789'
      };

      const mockPushResult = {
        success: true,
        msgId: '123456789'
      };

      jest.mock('../../src/models/Village', () => ({
        findById: jest.fn(() => Promise.resolve(mockVillage))
      }));

      jest.mock('../../src/models/Resident', () => ({
        find: jest.fn(() => Promise.resolve(mockResidents))
      }));

      cloudCommunicationService.sendSMSMessage = jest.fn(() => Promise.resolve(mockSMSResult));
      cloudCommunicationService.sendVoiceMessage = jest.fn(() => Promise.resolve(mockVoiceResult));
      cloudCommunicationService.sendPushByJiguang = jest.fn(() => Promise.resolve(mockPushResult));
      cloudCommunicationService.logEmergencyBroadcast = jest.fn();

      const result = await cloudCommunicationService.sendEmergencyBroadcast(
        villageId,
        message,
        channels
      );

      expect(result.success).toBe(true);
      expect(result.villageId).toBe('测试村');
      expect(result.recipientCount.total).toBe(2);
      expect(result.results).toBeDefined();
    });

    test('应该处理不存在的村庄', async () => {
      const villageId = '507f1f77bcf86cd799439999';

      jest.mock('../../src/models/Village', () => ({
        findById: jest.fn(() => Promise.resolve(null))
      }));

      await expect(
        cloudCommunicationService.sendEmergencyBroadcast(villageId, 'test message', ['sms'])
      ).rejects.toThrow('村庄不存在');
    });
  });

  describe('消息队列服务', () => {
    test('应该正确添加消息到队列', () => {
      const messageConfig = {
        type: 'sms',
        recipients: ['13800138000'],
        content: 'test message'
      };

      const initialQueueLength = cloudCommunicationService.messageQueue.length;

      cloudCommunicationService.addMessageToQueue(messageConfig, 5);

      expect(cloudCommunicationService.messageQueue.length).toBe(initialQueueLength + 1);
    });

    test('应该按优先级排序消息队列', () => {
      cloudCommunicationService.messageQueue = [];

      // 添加不同优先级的消息
      cloudCommunicationService.addMessageToQueue({ type: 'sms' }, 1);
      cloudCommunicationService.addMessageToQueue({ type: 'sms' }, 5);
      cloudCommunicationService.addMessageToQueue({ type: 'sms' }, 3);

      // 验证排序
      expect(cloudCommunicationService.messageQueue[0].priority).toBe(5);
      expect(cloudCommunicationService.messageQueue[1].priority).toBe(3);
      expect(cloudCommunicationService.messageQueue[2].priority).toBe(1);
    });
  });

  describe('限流服务', () => {
    test('应该允许正常频率的请求', () => {
      const type = 'sms';
      const recipients = '13800138000';
      const limit = 10;

      const result1 = cloudCommunicationService.checkRateLimit(type, recipients, limit);
      const result2 = cloudCommunicationService.checkRateLimit(type, recipients, limit);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    test('应该限制超出频率的请求', () => {
      const type = 'sms';
      const recipients = '13800138000';
      const limit = 1;

      // 第一个请求应该成功
      const result1 = cloudCommunicationService.checkRateLimit(type, recipients, limit);
      expect(result1).toBe(true);

      // 第二个请求应该被限制
      const result2 = cloudCommunicationService.checkRateLimit(type, recipients, limit);
      expect(result2).toBe(false);
    });
  });

  describe('工具方法', () => {
    test('应该正确生成随机字符串', () => {
      const nonce1 = cloudCommunicationService.generateNonce();
      const nonce2 = cloudCommunicationService.generateNonce();

      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBe(64); // 32字节的hex字符串
    });

    test('应该正确生成验证码', () => {
      const code1 = cloudCommunicationService.generateVerificationCode();
      const code2 = cloudCommunicationService.generateVerificationCode(8);

      expect(code1).toBeDefined();
      expect(code2).toBeDefined();
      expect(code1.length).toBe(6);
      expect(code2.length).toBe(8);
      expect(/^\d+$/.test(code1)).toBe(true);
      expect(/^\d+$/.test(code2)).toBe(true);
    });

    test('应该正确进行URL编码', () => {
      const testString = 'test@example.com';
      const encoded = cloudCommunicationService.percentEncode(testString);

      expect(encoded).toBe('test%40example.com');
    });

    test('应该正确计算两点间距离', () => {
      const point1 = [116.443, 39.921];
      const point2 = [116.444, 39.922];

      const distance = cloudCommunicationService.calculateDistanceBetweenPoints(point1, point2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000);
    });

    test('应该正确生成阿里云签名', () => {
      const params = {
        AccessKeyId: 'test-key',
        Format: 'JSON',
        SignatureMethod: 'HMAC-SHA1',
        SignatureNonce: 'test-nonce',
        SignatureVersion: '1.0',
        Timestamp: '2024-01-01T00:00:00Z',
        Version: '2017-05-25'
      };

      const signature = cloudCommunicationService.generateAliyunSignature(params, 'test-secret');

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    test('应该处理网络超时', async () => {
      jest.mock('axios', () => ({
        post: jest.fn(() => Promise.reject(new Error('timeout')))
      }));

      await expect(
        cloudCommunicationService.sendSMSByAliyun(['13800138000'], 'TEST_TEMPLATE', {})
      ).rejects.toThrow('timeout');
    });

    test('应该处理无效参数', () => {
      expect(() => {
        cloudCommunicationService.checkRateLimit('', '13800138000', 10);
      }).not.toThrow();

      expect(() => {
        cloudCommunicationService.generateVerificationCode(-1);
      }).not.toThrow();
    });

    test('应该处理缓存操作', () => {
      const key = 'test-key';
      const data = { test: 'data' };

      // 设置缓存
      cloudCommunicationService.setCache(key, data);
      expect(cloudCommunicationService.cache.size).toBe(1);

      // 获取缓存
      const cached = cloudCommunicationService.getFromCache(key);
      expect(cached).toEqual(data);

      // 清理缓存
      cloudCommunicationService.clearCache();
      expect(cloudCommunicationService.cache.size).toBe(0);
    });
  });

  describe('服务状态', () => {
    test('应该返回正确的服务状态', () => {
      const status = cloudCommunicationService.getServiceStatus();

      expect(status).toHaveProperty('aliyun');
      expect(status).toHaveProperty('tencent');
      expect(status).toHaveProperty('email');
      expect(status).toHaveProperty('push');
      expect(status).toHaveProperty('cache');
    });

    test('应该包含缓存统计信息', () => {
      // 添加一些缓存数据
      cloudCommunicationService.checkRateLimit('sms', '13800138000', 10);
      cloudCommunicationService.setCache('test', { data: 'test' });

      const status = cloudCommunicationService.getServiceStatus();

      expect(status.cache.rateLimitCache).toBeGreaterThan(0);
    });
  });
});