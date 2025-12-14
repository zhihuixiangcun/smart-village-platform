/**
 * 云通信服务
 * 集成阿里云、腾讯云、华为云等主流云通信平台
 * 提供短信、语音、邮件、推送等通信能力
 */

const crypto = require('crypto');
const axios = require('axios');
const qs = require('querystring');

class CloudCommunicationService {
  constructor() {
    this.config = {
      // 阿里云短信服务配置
      aliyun: {
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
        endpoint: 'dysmsapi.aliyuncs.com',
        apiVersion: '2017-05-25',
        signName: process.env.ALIYUN_SMS_SIGN_NAME,
        region: 'cn-hangzhou'
      },

      // 腾讯云短信服务配置
      tencent: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
        sdkAppId: process.env.TENCENT_SMS_SDK_APP_ID,
        endpoint: 'sms.tencentcloudapi.com',
        region: 'ap-beijing'
      },

      // 华为云短信服务配置
      huawei: {
        appKey: process.env.HUAWEI_SMS_APP_KEY,
        appSecret: process.env.HUAWEI_SMS_APP_SECRET,
        sender: process.env.HUAWEI_SMS_SENDER,
        endpoint: 'https://api.rtc.huawei.com'
      },

      // 邮件服务配置
      email: {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM
      },

      // 推送服务配置
      push: {
        jiguang: {
          appKey: process.env.JIGUANG_APP_KEY,
          masterSecret: process.env.JIGUANG_MASTER_SECRET
        },
        xiaomi: {
          appSecret: process.env.XIAOMI_APP_SECRET,
          package: process.env.XIAOMI_PACKAGE
        }
      }
    };

    // 缓存和限流
    this.rateLimitCache = new Map();
    this.templateCache = new Map();
    this.messageQueue = [];
    this.isProcessingQueue = false;

    // 初始化消息队列处理
    this.initMessageQueueProcessor();
  }

  /**
   * 发送短信（阿里云）
   */
  async sendSMSByAliyun(phoneNumbers, templateCode, templateParam = {}) {
    try {
      const { accessKeyId, accessKeySecret, endpoint, signName } = this.config.aliyun;

      const params = {
        PhoneNumbers: Array.isArray(phoneNumbers) ? phoneNumbers.join(',') : phoneNumbers,
        SignName: signName,
        TemplateCode: templateCode,
        TemplateParam: JSON.stringify(templateParam),
        Format: 'JSON',
        Version: this.config.aliyun.apiVersion,
        AccessKeyId: accessKeyId,
        SignatureMethod: 'HMAC-SHA1',
        Timestamp: new Date().toISOString(),
        SignatureVersion: '1.0',
        SignatureNonce: this.generateNonce()
      };

      // 生成签名
      params.Signature = this.generateAliyunSignature(params, accessKeySecret);

      const response = await axios.post(`https://${endpoint}/`, qs.stringify(params), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.Code === 'OK') {
        return {
          success: true,
          bizId: response.data.BizId,
          requestId: response.data.RequestId
        };
      } else {
        throw new Error(`阿里云短信发送失败: ${response.data.Message}`);
      }
    } catch (error) {
      console.error('阿里云短信发送失败:', error);
      throw error;
    }
  }

  /**
   * 发送短信（腾讯云）
   */
  async sendSMSByTencent(phoneNumbers, templateId, templateParamSet = []) {
    try {
      const { secretId, secretKey, sdkAppId, endpoint, region } = this.config.tencent;

      const payload = {
        PhoneNumberSet: Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers],
        SmsSdkAppId: sdkAppId,
        TemplateId: templateId,
        TemplateParamSet: templateParamSet
      };

      const headers = this.generateTencentHeaders(payload, secretId, secretKey, endpoint, 'SendSms');

      const response = await axios.post(`https://${endpoint}/`, payload, { headers });

      if (response.data.Response && response.data.Response.SendStatusSet) {
        return {
          success: true,
          data: response.data.Response.SendStatusSet,
          requestId: response.data.Response.RequestId
        };
      } else {
        throw new Error(`腾讯云短信发送失败: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error('腾讯云短信发送失败:', error);
      throw error;
    }
  }

  /**
   * 发送语音通知（阿里云）
   */
  async sendVoiceByAliyun(calledNumber, ttsCode, ttsParam = {}) {
    try {
      const { accessKeyId, accessKeySecret, endpoint } = this.config.aliyun;

      const params = {
        CalledNumber: calledNumber,
        TtsCode: ttsCode,
        TtsParam: JSON.stringify(ttsParam),
        Format: 'JSON',
        Version: '2019-04-18',
        AccessKeyId: accessKeyId,
        SignatureMethod: 'HMAC-SHA1',
        Timestamp: new Date().toISOString(),
        SignatureVersion: '1.0',
        SignatureNonce: this.generateNonce(),
        Action: 'SingleCallByTts'
      };

      params.Signature = this.generateAliyunSignature(params, accessKeySecret);

      const response = await axios.post(`https://${endpoint}/`, qs.stringify(params), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.Code === 'OK') {
        return {
          success: true,
          callId: response.data.CallId,
          requestId: response.data.RequestId
        };
      } else {
        throw new Error(`阿里云语音通知发送失败: ${response.data.Message}`);
      }
    } catch (error) {
      console.error('阿里云语音通知发送失败:', error);
      throw error;
    }
  }

  /**
   * 发送邮件
   */
  async sendEmail(to, subject, content, type = 'html', attachments = []) {
    try {
      const nodemailer = require('nodemailer');
      const { host, port, secure, user, password, from } = this.config.email;

      // 创建传输器
      const transporter = nodemailer.createTransporter({
        host,
        port,
        secure,
        auth: {
          user,
          pass: password
        }
      });

      const mailOptions = {
        from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        [type]: content
      };

      if (attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('邮件发送失败:', error);
      throw error;
    }
  }

  /**
   * 发送推送通知（极光推送）
   */
  async sendPushByJiguang(registrationIds, notification, options = {}) {
    try {
      const { appKey, masterSecret } = this.config.push.jiguang;

      const payload = {
        audience: {
          registration_id: registrationIds
        },
        notification: {
          alert: notification.alert,
          android: notification.android,
          ios: notification.ios
        },
        options: {
          time_to_live: options.timeToLive || 86400,
          apns_production: options.production || false,
          ...options
        }
      };

      const auth = 'Basic ' + Buffer.from(appKey + ':' + masterSecret).toString('base64');

      const response = await axios.post('https://api.jpush.cn/v3/push', payload, {
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        msgId: response.data.msg_id,
        sendno: response.data.sendno
      };
    } catch (error) {
      console.error('极光推送失败:', error);
      throw error;
    }
  }

  /**
   * 统一发送接口
   */
  async sendMessage(messageConfig) {
    const {
      type, // sms, voice, email, push
      provider, // aliyun, tencent, huawei, jiguang
      recipients,
      content,
      template,
      options = {}
    } = messageConfig;

    try {
      // 限流检查
      if (!this.checkRateLimit(type, recipients, options.rateLimit)) {
        throw new Error('发送频率超限，请稍后重试');
      }

      let result;

      switch (type) {
        case 'sms':
          result = await this.sendSMSMessage(provider, recipients, template, content);
          break;
        case 'voice':
          result = await this.sendVoiceMessage(provider, recipients, template, content);
          break;
        case 'email':
          result = await this.sendEmailMessage(recipients, content);
          break;
        case 'push':
          result = await this.pushNotification(provider, recipients, content);
          break;
        default:
          throw new Error(`不支持的消息类型: ${type}`);
      }

      // 记录发送日志
      await this.logMessage(messageConfig, result);

      return result;
    } catch (error) {
      // 记录错误日志
      await this.logMessageError(messageConfig, error);
      throw error;
    }
  }

  /**
   * 发送短信消息
   */
  async sendSMSMessage(provider, recipients, template, content) {
    switch (provider) {
      case 'aliyun':
        return await this.sendSMSByAliyun(recipients, template.code, template.params);
      case 'tencent':
        return await this.sendSMSByTencent(recipients, template.id, template.params);
      case 'huawei':
        return await this.sendSMSByHuawei(recipients, template);
      default:
        throw new Error(`不支持的短信服务商: ${provider}`);
    }
  }

  /**
   * 发送语音消息
   */
  async sendVoiceMessage(provider, recipients, template, content) {
    switch (provider) {
      case 'aliyun':
        return await this.sendVoiceByAliyun(recipients, template.code, template.params);
      default:
        throw new Error(`不支持的语音服务商: ${provider}`);
    }
  }

  /**
   * 发送邮件消息
   */
  async sendEmailMessage(recipients, content) {
    return await this.sendEmail(
      recipients,
      content.subject,
      content.body,
      content.type || 'html',
      content.attachments || []
    );
  }

  /**
   * 推送通知
   */
  async pushNotification(provider, recipients, content) {
    switch (provider) {
      case 'jiguang':
        return await this.sendPushByJiguang(recipients, content);
      case 'xiaomi':
        return await this.sendPushByXiaomi(recipients, content);
      default:
        throw new Error(`不支持的推送服务商: ${provider}`);
    }
  }

  /**
   * 批量发送消息
   */
  async sendBatchMessages(messageConfigs) {
    const results = [];
    const errors = [];

    for (const config of messageConfigs) {
      try {
        const result = await this.sendMessage(config);
        results.push({
          config,
          success: true,
          result
        });
      } catch (error) {
        errors.push({
          config,
          error: error.message
        });
      }
    }

    return {
      total: messageConfigs.length,
      success: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(phone, type = 'sms') {
    const code = this.generateVerificationCode();
    const expireTime = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

    // 缓存验证码
    this.cacheVerificationCode(phone, code, expireTime);

    const messageConfig = {
      type,
      provider: 'aliyun',
      recipients: phone,
      template: {
        code: 'SMS_123456789', // 替换为实际的验证码模板
        params: { code }
      }
    };

    try {
      await this.sendMessage(messageConfig);
      return {
        success: true,
        code,
        expireTime
      };
    } catch (error) {
      // 清理缓存的验证码
      this.clearVerificationCode(phone);
      throw error;
    }
  }

  /**
   * 验证验证码
   */
  verifyCode(phone, code) {
    const cached = this.getVerificationCode(phone);
    if (!cached) {
      return {
        success: false,
        message: '验证码已过期或不存在'
      };
    }

    if (cached.code !== code) {
      return {
        success: false,
        message: '验证码错误'
      };
    }

    // 验证成功，清理缓存
    this.clearVerificationCode(phone);

    return {
      success: true,
      message: '验证码正确'
    };
  }

  /**
   * 应急广播
   */
  async sendEmergencyBroadcast(villageId, message, channels = ['sms', 'voice', 'push']) {
    try {
      const Village = require('../models/Village');
      const Resident = require('../models/Resident');

      // 获取村庄信息
      const village = await Village.findById(villageId);
      if (!village) {
        throw new Error('村庄不存在');
      }

      // 获取所有村民
      const residents = await Resident.find({
        villageId,
        status: 'active',
        phone: { $exists: true, $ne: '' }
      });

      const phoneNumbers = residents.map(r => r.phone).filter(Boolean);
      const pushTokens = residents
        .filter(r => r.digital && r.digital.jpushId)
        .map(r => r.digital.jpushId);

      const results = {};

      // 发送短信
      if (channels.includes('sms') && phoneNumbers.length > 0) {
        try {
          results.sms = await this.sendSMSMessage('aliyun', phoneNumbers, {
            code: 'SMS_EMERGENCY_BROADCAST',
            params: { message, village: village.name }
          }, {});
        } catch (error) {
          results.sms = { error: error.message };
        }
      }

      // 发送语音通知
      if (channels.includes('voice') && phoneNumbers.length > 0) {
        try {
          results.voice = await this.sendVoiceMessage('aliyun', phoneNumbers.slice(0, 100), {
            code: 'VOICE_EMERGENCY_BROADCAST',
            params: { message }
          }, {});
        } catch (error) {
          results.voice = { error: error.message };
        }
      }

      // 发送推送通知
      if (channels.includes('push') && pushTokens.length > 0) {
        try {
          results.push = await this.pushNotification('jiguang', pushTokens, {
            alert: `${village.name}应急广播: ${message}`,
            android: {
              title: '应急广播',
              alert: message,
              priority: 2
            },
            ios: {
              title: '应急广播',
              body: message,
              badge: 1,
              sound: 'default'
            }
          });
        } catch (error) {
          results.push = { error: error.message };
        }
      }

      // 记录应急广播日志
      await this.logEmergencyBroadcast(villageId, message, channels, results);

      return {
        success: true,
        villageId: village.name,
        recipientCount: {
          total: residents.length,
          sms: phoneNumbers.length,
          push: pushTokens.length
        },
        results
      };
    } catch (error) {
      console.error('应急广播发送失败:', error);
      throw error;
    }
  }

  /**
   * 生成阿里云签名
   */
  generateAliyunSignature(params, secret) {
    const sortedKeys = Object.keys(params).sort();
    let canonicalizedResource = '/';

    let canonicalizedQueryString = sortedKeys
      .map(key => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
      .join('&');

    let stringToSign = [
      'POST',
      'application/x-www-form-urlencoded',
      canonicalizedQueryString
    ].join('\n');

    return crypto
      .createHmac('sha1', secret)
      .update(stringToSign)
      .digest('base64');
  }

  /**
   * 生成腾讯云请求头
   */
  generateTencentHeaders(payload, secretId, secretKey, endpoint, action) {
    const service = endpoint.split('.')[0];
    const version = '2021-01-11'; // SMS API版本
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().substr(0, 10);

    // 创建 Canonical Request
    const httpRequestMethod = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${endpoint}\n`;
    const signedHeaders = 'content-type;host';
    const hashedRequestPayload = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const canonicalRequest = [
      httpRequestMethod,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      hashedRequestPayload
    ].join('\n');

    // 创建 String to Sign
    const algorithm = 'TC3-HMAC-SHA256';
    const credentialScope = `${date}/${service}/tc3_request`;
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const stringToSign = [
      algorithm,
      timestamp,
      credentialScope,
      hashedCanonicalRequest
    ].join('\n');

    // 计算签名
    const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
    const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
    const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      Authorization: authorization,
      'Content-Type': 'application/json; charset=utf-8',
      Host: endpoint,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Region': this.config.tencent.region,
      'X-TC-Timestamp': timestamp
    };
  }

  /**
   * URL编码
   */
  percentEncode(str) {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  /**
   * 生成随机字符串
   */
  generateNonce(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成验证码
   */
  generateVerificationCode(length = 6) {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 缓存验证码
   */
  cacheVerificationCode(phone, code, expireTime) {
    this.verificationCache = this.verificationCache || new Map();
    this.verificationCache.set(phone, {
      code,
      expireTime
    });
  }

  /**
   * 获取验证码
   */
  getVerificationCode(phone) {
    const cached = this.verificationCache?.get(phone);
    if (!cached) return null;

    if (Date.now() > cached.expireTime) {
      this.verificationCache.delete(phone);
      return null;
    }

    return cached;
  }

  /**
   * 清理验证码
   */
  clearVerificationCode(phone) {
    this.verificationCache?.delete(phone);
  }

  /**
   * 限流检查
   */
  checkRateLimit(type, recipients, limit = 10) {
    const key = `${type}_${Array.isArray(recipients) ? recipients.join('_') : recipients}`;
    const now = Date.now();
    const window = 60 * 1000; // 1分钟窗口

    if (!this.rateLimitCache.has(key)) {
      this.rateLimitCache.set(key, []);
    }

    const requests = this.rateLimitCache.get(key);

    // 清理过期请求
    const validRequests = requests.filter(time => now - time < window);

    if (validRequests.length >= limit) {
      return false;
    }

    validRequests.push(now);
    this.rateLimitCache.set(key, validRequests);

    return true;
  }

  /**
   * 初始化消息队列处理器
   */
  initMessageQueueProcessor() {
    setInterval(async () => {
      if (this.isProcessingQueue || this.messageQueue.length === 0) {
        return;
      }

      this.isProcessingQueue = true;

      try {
        const message = this.messageQueue.shift();
        if (message) {
          await this.sendMessage(message.config);
        }
      } catch (error) {
        console.error('消息队列处理失败:', error);
      } finally {
        this.isProcessingQueue = false;
      }
    }, 1000); // 每秒处理一条消息
  }

  /**
   * 添加消息到队列
   */
  addMessageToQueue(config, priority = 0) {
    this.messageQueue.push({ config, priority, timestamp: Date.now() });

    // 按优先级排序
    this.messageQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 记录消息日志
   */
  async logMessage(config, result) {
    try {
      const MessageLog = require('../models/MessageLog');
      await new MessageLog({
        type: config.type,
        provider: config.provider,
        recipients: config.recipients,
        content: config.content,
        template: config.template,
        status: 'success',
        result,
        createdAt: new Date()
      }).save();
    } catch (error) {
      console.error('消息日志记录失败:', error);
    }
  }

  /**
   * 记录消息错误日志
   */
  async logMessageError(config, error) {
    try {
      const MessageLog = require('../models/MessageLog');
      await new MessageLog({
        type: config.type,
        provider: config.provider,
        recipients: config.recipients,
        content: config.content,
        template: config.template,
        status: 'failed',
        error: error.message,
        createdAt: new Date()
      }).save();
    } catch (logError) {
      console.error('消息错误日志记录失败:', logError);
    }
  }

  /**
   * 记录应急广播日志
   */
  async logEmergencyBroadcast(villageId, message, channels, results) {
    try {
      const EmergencyBroadcast = require('../models/EmergencyBroadcast');
      await new EmergencyBroadcast({
        villageId,
        message,
        channels,
        results,
        createdAt: new Date()
      }).save();
    } catch (error) {
      console.error('应急广播日志记录失败:', error);
    }
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    return {
      aliyun: {
        sms: !!this.config.aliyun.accessKeyId,
        voice: !!this.config.aliyun.accessKeyId
      },
      tencent: {
        sms: !!this.config.tencent.secretId
      },
      email: {
        enabled: !!this.config.email.user
      },
      push: {
        jiguang: !!this.config.push.jiguang.appKey,
        xiaomi: !!this.config.push.xiaomi.appSecret
      },
      cache: {
        verificationCache: this.verificationCache?.size || 0,
        rateLimitCache: this.rateLimitCache.size,
        messageQueue: this.messageQueue.length
      }
    };
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.rateLimitCache.clear();
    this.templateCache.clear();
    if (this.verificationCache) {
      this.verificationCache.clear();
    }
  }
}

module.exports = new CloudCommunicationService();