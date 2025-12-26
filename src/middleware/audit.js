/**
 * 人脸识别审计中间件
 * 记录所有API请求和操作的审计日志
 */

const { FaceRecognitionAudit } = require('../models/FaceRecognition');
const crypto = require('crypto');
const logger = require('../utils/logger');

class AuditMiddleware {
  constructor() {
    // 敏感字段列表，需要脱敏处理
    this.sensitiveFields = [
      'password', 'idCard', 'bankAccount', 'phoneNumber',
      'email', 'address', 'image', 'frames'
    ];

    // 需要额外监控的操作类型
    this.monitoredOperations = [
      'face_register', 'face_verify', 'face_identify',
      'relation_create', 'face_delete', 'config_update'
    ];
  }

  /**
   * 记录请求审计日志
   */
  logRequest = async (req, res, next) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // 生成请求ID并添加到请求对象
    req.requestId = requestId;

    // 监听响应结束事件
    res.on('finish', async () => {
      try {
        await this.recordAuditLog(req, res, startTime);
      } catch (error) {
        logger.error('记录审计日志失败:', error);
      }
    });

    next();
  };

  /**
   * 记录审计日志
   */
  async recordAuditLog(req, res, startTime) {
    try {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 确定操作类型
      const operationType = this.determineOperationType(req);

      // 脱敏处理请求参数
      const sanitizedParams = this.sanitizeData(req.body);

      // 检测异常行为
      const securityAnalysis = await this.analyzeSecurity(req, res);

      // 构建审计日志
      const auditLog = new FaceRecognitionAudit({
        operationType,
        userId: req.user?.id || null,
        targetUserId: this.extractTargetUserId(req),
        villageId: this.extractVillageId(req),
        result: this.determineResult(res.statusCode),
        details: {
          requestParams: sanitizedParams,
          responseResult: this.sanitizeData(res.locals.responseData || {}),
          processingTime,
          requestId: req.requestId
        },
        deviceInfo: this.extractDeviceInfo(req),
        security: securityAnalysis,
        timestamp: new Date(startTime),
        sessionId: req.sessionID,
        requestId: req.requestId
      });

      // 异步保存审计日志
      setImmediate(async () => {
        try {
          await auditLog.save();
        } catch (error) {
          logger.error('保存审计日志失败:', error);
        }
      });

      // 异常行为告警
      if (securityAnalysis.isAnomalous) {
        await this.triggerSecurityAlert(req, securityAnalysis);
      }

    } catch (error) {
      logger.error('构建审计日志失败:', error);
    }
  }

  /**
   * 确定操作类型
   */
  determineOperationType(req) {
    const path = req.path;
    const method = req.method;

    // 根据路径和方法确定操作类型
    if (path.includes('/detect')) {
      return 'face_detect';
    } else if (path.includes('/register')) {
      return 'face_register';
    } else if (path.includes('/verify')) {
      return 'face_verify';
    } else if (path.includes('/identify')) {
      return 'face_identify';
    } else if (path.includes('/liveness')) {
      return 'liveness_detect';
    } else if (path.includes('/family-relation')) {
      if (method === 'POST') return 'relation_create';
      if (method === 'PUT') return 'relation_update';
      if (method === 'DELETE') return 'relation_delete';
    } else if (path.includes('/compare')) {
      return 'face_compare';
    } else if (path.includes('/config')) {
      if (method === 'PUT') return 'config_update';
    } else if (path.includes('/audit/logs')) {
      return 'audit_access';
    } else if (method === 'DELETE') {
      return 'face_delete';
    }

    return 'system_access';
  }

  /**
   * 提取目标用户ID
   */
  extractTargetUserId(req) {
    // 从请求参数中提取目标用户ID
    if (req.body?.userId) return req.body.userId;
    if (req.body?.principalUserId) return req.body.principalUserId;
    if (req.body?.targetUserId) return req.body.targetUserId;
    if (req.params?.userId) return req.params.userId;
    if (req.query?.userId) return req.query.userId;
    return null;
  }

  /**
   * 提取村庄ID
   */
  extractVillageId(req) {
    if (req.body?.villageId) return req.body.villageId;
    if (req.query?.villageId) return req.query.villageId;
    if (req.params?.villageId) return req.params.villageId;
    return null;
  }

  /**
   * 确定操作结果
   */
  determineResult(statusCode) {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 400 && statusCode < 500) return 'failure';
    if (statusCode >= 500) return 'error';
    return 'unknown';
  }

  /**
   * 数据脱敏处理
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      if (this.sensitiveFields.includes(key.toLowerCase())) {
        // 脱敏敏感字段
        sanitized[key] = this.maskSensitiveValue(value);
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 脱敏敏感值
   */
  maskSensitiveValue(value) {
    if (!value) return value;

    const str = String(value);

    if (str.length <= 4) {
      return '****';
    }

    const start = str.substring(0, 2);
    const end = str.substring(str.length - 2);
    const middle = '*'.repeat(Math.max(str.length - 4, 4));

    return start + middle + end;
  }

  /**
   * 提取设备信息
   */
  extractDeviceInfo(req) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      deviceId: req.get('X-Device-ID'),
      platform: req.get('X-Platform'),
      browser: req.get('X-Browser'),
      location: {
        // 如果有地理位置信息
        country: req.get('X-Country'),
        province: req.get('X-Province'),
        city: req.get('X-City')
      }
    };
  }

  /**
   * 安全分析
   */
  async analyzeSecurity(req, res) {
    const analysis = {
      isAnomalous: false,
      anomalyTypes: [],
      securityScore: 100,
      riskLevel: 'low',
      triggeredAlert: false
    };

    try {
      // 1. 检查异常请求频率
      const frequencyAnomaly = await this.checkFrequencyAnomaly(req);
      if (frequencyAnomaly.isAnomalous) {
        analysis.isAnomalous = true;
        analysis.anomalyTypes.push('high_frequency');
        analysis.securityScore -= 20;
      }

      // 2. 检查异常IP地址
      const ipAnomaly = await this.checkIPAnomaly(req);
      if (ipAnomaly.isAnomalous) {
        analysis.isAnomalous = true;
        analysis.anomalyTypes.push('suspicious_ip');
        analysis.securityScore -= 30;
      }

      // 3. 检查异常时间访问
      const timeAnomaly = this.checkTimeAnomaly(req);
      if (timeAnomaly.isAnomalous) {
        analysis.isAnomalous = true;
        analysis.anomalyTypes.push('unusual_time');
        analysis.securityScore -= 15;
      }

      // 4. 检查异常操作模式
      const patternAnomaly = await this.checkPatternAnomaly(req);
      if (patternAnomaly.isAnomalous) {
        analysis.isAnomalous = true;
        analysis.anomalyTypes.push('unusual_pattern');
        analysis.securityScore -= 25;
      }

      // 5. 检查敏感操作
      if (this.monitoredOperations.includes(this.determineOperationType(req))) {
        analysis.securityScore -= 5;
      }

      // 计算风险等级
      if (analysis.securityScore >= 80) {
        analysis.riskLevel = 'low';
      } else if (analysis.securityScore >= 60) {
        analysis.riskLevel = 'medium';
      } else if (analysis.securityScore >= 40) {
        analysis.riskLevel = 'high';
      } else {
        analysis.riskLevel = 'critical';
        analysis.triggeredAlert = true;
      }

    } catch (error) {
      logger.error('安全分析失败:', error);
    }

    return analysis;
  }

  /**
   * 检查频率异常
   */
  async checkFrequencyAnomaly(req) {
    try {
      const { FaceRecognitionAudit } = require('../models/FaceRecognition');
      const userId = req.user?.id;
      const ip = req.ip;

      if (!userId && !ip) {
        return { isAnomalous: false };
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // 检查最近一小时的请求数
      const recentRequests = await FaceRecognitionAudit.countDocuments({
        $or: userId ? [{ userId }] : [],
        $and: ip ? [{ 'deviceInfo.ipAddress': ip }] : [],
        timestamp: { $gte: oneHourAgo }
      });

      // 阈值：正常用户每小时不超过100次请求
      const threshold = req.user ? 100 : 50;

      return {
        isAnomalous: recentRequests > threshold,
        requestCount: recentRequests,
        threshold
      };

    } catch (error) {
      logger.error('频率异常检查失败:', error);
      return { isAnomalous: false };
    }
  }

  /**
   * 检查IP异常
   */
  async checkIPAnomaly(req) {
    try {
      const ip = req.ip;
      const { FaceRecognitionAudit } = require('../models/FaceRecognition');

      // 检查黑名单IP
      const blacklistedIPs = process.env.BLACKLISTED_IPS?.split(',') || [];
      if (blacklistedIPs.includes(ip)) {
        return { isAnomalous: true, reason: 'blacklisted_ip' };
      }

      // 检查新IP的用户行为
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const ipHistory = await FaceRecognitionAudit.find({
        'deviceInfo.ipAddress': ip,
        timestamp: { $gte: oneDayAgo }
      }).distinct('userId');

      // 如果一个IP在一天内关联超过10个不同用户，可能是异常
      if (ipHistory.length > 10) {
        return { isAnomalous: true, reason: 'multiple_users', userCount: ipHistory.length };
      }

      return { isAnomalous: false };

    } catch (error) {
      logger.error('IP异常检查失败:', error);
      return { isAnomalous: false };
    }
  }

  /**
   * 检查时间异常
   */
  checkTimeAnomaly(req) {
    const hour = new Date().getHours();
    const operationType = this.determineOperationType(req);

    // 定义异常时间段（凌晨2-5点）
    const unusualHours = [2, 3, 4, 5];

    // 敏感操作在异常时间段的访问
    const sensitiveOperations = ['face_register', 'face_delete', 'relation_create'];

    return {
      isAnomalous: unusualHours.includes(hour) && sensitiveOperations.includes(operationType),
      hour,
      operationType
    };
  }

  /**
   * 检查操作模式异常
   */
  async checkPatternAnomaly(req) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { isAnomalous: false };
      }

      const { FaceRecognitionAudit } = require('../models/FaceRecognition');
      const operationType = this.determineOperationType(req);

      // 检查用户是否经常执行失败的操作
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentFailures = await FaceRecognitionAudit.countDocuments({
        userId,
        operationType,
        result: 'failure',
        timestamp: { $gte: oneHourAgo }
      });

      const recentSuccesses = await FaceRecognitionAudit.countDocuments({
        userId,
        operationType,
        result: 'success',
        timestamp: { $gte: oneHourAgo }
      });

      const totalRecent = recentFailures + recentSuccesses;

      // 如果失败率超过70%，认为异常
      if (totalRecent >= 10 && (recentFailures / totalRecent) > 0.7) {
        return {
          isAnomalous: true,
          reason: 'high_failure_rate',
          failureRate: recentFailures / totalRecent
        };
      }

      return { isAnomalous: false };

    } catch (error) {
      logger.error('操作模式异常检查失败:', error);
      return { isAnomalous: false };
    }
  }

  /**
   * 触发安全告警
   */
  async triggerSecurityAlert(req, securityAnalysis) {
    try {
      const alert = {
        type: 'security_anomaly',
        level: securityAnalysis.riskLevel,
        timestamp: new Date(),
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        anomalyTypes: securityAnalysis.anomalyTypes,
        securityScore: securityAnalysis.securityScore
      };

      // 记录安全告警
      logger.warn('安全告警触发:', alert);

      // 发送通知（邮件、短信、钉钉等）
      await this.sendSecurityNotification(alert);

      // 可以添加更多告警处理逻辑
      // - 临时锁定账户
      // - 要求额外验证
      // - 通知管理员

    } catch (error) {
      logger.error('安全告警处理失败:', error);
    }
  }

  /**
   * 发送安全通知
   */
  async sendSecurityNotification(alert) {
    try {
      // 根据告警级别选择通知方式
      if (alert.level === 'critical') {
        // 立即通知管理员
        // await notificationService.sendCriticalAlert(alert);
      } else if (alert.level === 'high') {
        // 邮件通知
        // await notificationService.sendEmailAlert(alert);
      }

      // 记录到专门的安全日志
      const securityLog = {
        timestamp: alert.timestamp,
        level: alert.level,
        type: alert.type,
        details: alert
      };

      // 保存安全日志
      // await SecurityLog.create(securityLog);

    } catch (error) {
      logger.error('发送安全通知失败:', error);
    }
  }

  /**
   * 数据完整性检查中间件
   */
  checkDataIntegrity = (req, res, next) => {
    // 计算请求体的哈希值
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyHash = crypto.createHash('sha256')
        .update(JSON.stringify(req.body))
        .digest('hex');

      req.bodyHash = bodyHash;
    }

    next();
  };

  /**
   * GDPR合规检查中间件
   */
  checkGDPRCompliance = (req, res, next) => {
    // 检查是否包含欧盟用户数据
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI', 'GR', 'PT', 'IE', 'LU'];
    const userCountry = req.get('X-Country');

    if (userCountry && euCountries.includes(userCountry.toUpperCase())) {
      // 标记为需要GDPR合规处理
      req.gdprApplicable = true;
    }

    next();
  };
}

// 创建单例实例
const auditMiddleware = new AuditMiddleware();

module.exports = auditMiddleware;