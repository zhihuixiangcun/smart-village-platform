/**
 * 智慧村庄平台 - 审计日志系统
 * 记录所有敏感操作和数据访问，提供完整的操作轨迹
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * 操作类型定义
 */
const OPERATION_TYPES = {
  // 认证操作
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',

  // 数据操作
  DATA_CREATE: 'data_create',
  DATA_READ: 'data_read',
  DATA_UPDATE: 'data_update',
  DATA_DELETE: 'data_delete',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',

  // 权限操作
  ROLE_ASSIGN: 'role_assign',
  ROLE_REVOKE: 'role_revoke',
  PERMISSION_GRANT: 'permission_grant',
  PERMISSION_REVOKE: 'permission_revoke',

  // 系统操作
  SYSTEM_CONFIG: 'system_config',
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_RESTORE: 'system_restore',

  // 业务操作
  ANNOUNCEMENT_CREATE: 'announcement_create',
  ANNOUNCEMENT_UPDATE: 'announcement_update',
  ANNOUNCEMENT_DELETE: 'announcement_delete',

  FINANCE_TRANSACTION: 'finance_transaction',
  FINANCE_APPROVAL: 'finance_approval',

  EMERGENCY_REPORT: 'emergency_report',
  EMERGENCY_RESPONSE: 'emergency_response',

  VOTE_CREATE: 'vote_create',
  VOTE_PARTICIPATE: 'vote_participate',
  VOTE_COUNT: 'vote_count',

  // 安全操作
  SECURITY_BREACH: 'security_breach',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};

/**
 * 操作结果状态
 */
const OPERATION_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  WARNING: 'warning',
  BLOCKED: 'blocked'
};

/**
 * 数据敏感性级别
 */
const DATA_SENSITIVITY = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  SENSITIVE: 'sensitive',
  CONFIDENTIAL: 'confidential'
};

/**
 * 审计日志类
 */
class AuditLogger {
  constructor() {
    this.auditQueue = [];
    this.batchSize = 100;
    this.flushInterval = 5000; // 5秒
    this.maxRetries = 3;
    this.isProcessing = false;

    // 启动批量处理
    this.startBatchProcessor();
  }

  /**
   * 记录审计日志
   */
  log(operation, data) {
    try {
      const auditRecord = this.createAuditRecord(operation, data);

      // 立即处理高敏感度操作
      if (auditRecord.sensitivity === DATA_SENSITIVITY.CONFIDENTIAL ||
          auditRecord.type === OPERATION_TYPES.SECURITY_BREACH ||
          auditRecord.type === OPERATION_TYPES.UNAUTHORIZED_ACCESS) {
        this.processImmediately(auditRecord);
      } else {
        // 添加到队列等待批量处理
        this.auditQueue.push(auditRecord);

        // 队列满时立即处理
        if (this.auditQueue.length >= this.batchSize) {
          this.flushQueue();
        }
      }

    } catch (error) {
      logger.error('审计日志记录失败', {
        error: error.message,
        operation,
        data
      });
    }
  }

  /**
   * 创建审计记录
   */
  createAuditRecord(operation, data) {
    const now = new Date();

    return {
      // 基础信息
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      timestampUnix: Math.floor(now.getTime() / 1000),

      // 操作信息
      type: operation.type,
      action: operation.action,
      resource: operation.resource,
      resourceType: operation.resourceType,
      resourceId: operation.resourceId,

      // 用户信息
      userId: data.user?.id,
      userName: data.user?.name,
      userRole: data.user?.role,
      villageId: data.user?.villageId,
      departmentId: data.user?.departmentId,

      // 请求信息
      requestId: data.requestId,
      sessionId: data.sessionId,
      ip: data.ip,
      userAgent: data.userAgent,
      endpoint: data.endpoint,
      method: data.method,

      // 操作结果
      status: data.status || OPERATION_STATUS.SUCCESS,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,

      // 数据信息
      dataType: data.dataType,
      dataCount: data.dataCount || 1,
      dataSize: data.dataSize,
      sensitivity: data.sensitivity || DATA_SENSITIVITY.INTERNAL,

      // 变更信息（用于UPDATE/DELETE操作）
      beforeState: this.sanitizeState(data.beforeState),
      afterState: this.sanitizeState(data.afterState),
      changedFields: data.changedFields,

      // 权限信息
      requiredPermissions: data.requiredPermissions,
      grantedPermissions: data.grantedPermissions,
      permissionCheckResult: data.permissionCheckResult,

      // 安全信息
      securityEvent: data.securityEvent,
      riskLevel: data.riskLevel || 'low',
      threatDetected: data.threatDetected,

      // 额外元数据
      metadata: data.metadata || {},

      // 系统信息
      service: data.service || 'smart-village-platform',
      version: data.version || process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * 清理状态数据，避免记录敏感信息
   */
  sanitizeState(state) {
    if (!state) return null;

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'creditCard',
      'bankAccount', 'idCard', 'phone', 'email'
    ];

    const sanitized = { ...state };

    const sanitizeObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      const result = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        // 检查是否为敏感字段
        const isSensitive = sensitiveFields.some(field =>
          lowerKey.includes(field.toLowerCase())
        );

        if (isSensitive && value) {
          result[key] = this.maskValue(value);
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * 脱敏值
   */
  maskValue(value) {
    if (typeof value === 'string') {
      return value.length > 4 ? `***${  value.substring(value.length - 4)}` : '***';
    }
    return '***';
  }

  /**
   * 立即处理审计记录
   */
  async processImmediately(auditRecord) {
    try {
      await this.writeAuditLog([auditRecord]);

      // 对于高风险操作，记录到专门的告警日志
      if (auditRecord.riskLevel === 'high' || auditRecord.riskLevel === 'critical') {
        await this.logSecurityAlert(auditRecord);
      }

      logger.debug('审计记录立即处理完成', {
        recordId: auditRecord.id,
        type: auditRecord.type,
        riskLevel: auditRecord.riskLevel
      });

    } catch (error) {
      logger.error('审计记录立即处理失败', {
        error: error.message,
        recordId: auditRecord.id
      });

      // 添加到队列重试
      this.auditQueue.unshift(auditRecord);
    }
  }

  /**
   * 记录安全告警
   */
  async logSecurityAlert(auditRecord) {
    try {
      logger.warn('安全审计告警', {
        type: 'SECURITY_ALERT',
        recordId: auditRecord.id,
        userId: auditRecord.userId,
        operation: auditRecord.type,
        resource: auditRecord.resource,
        ip: auditRecord.ip,
        riskLevel: auditRecord.riskLevel,
        timestamp: auditRecord.timestamp,
        details: auditRecord.errorMessage || auditRecord.metadata
      });

      // 这里可以集成外部告警系统
      // await this.sendToSecuritySystem(auditRecord);

    } catch (error) {
      logger.error('安全告警记录失败', {
        error: error.message,
        recordId: auditRecord.id
      });
    }
  }

  /**
   * 启动批量处理器
   */
  startBatchProcessor() {
    setInterval(() => {
      if (this.auditQueue.length > 0 && !this.isProcessing) {
        this.flushQueue();
      }
    }, this.flushInterval);
  }

  /**
   * 刷新队列
   */
  async flushQueue() {
    if (this.isProcessing || this.auditQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.auditQueue.splice(0, this.batchSize);
      await this.writeAuditLog(batch);

      logger.debug('审计日志批量处理完成', {
        batchSize: batch.length,
        queueSize: this.auditQueue.length
      });

    } catch (error) {
      logger.error('审计日志批量处理失败', {
        error: error.message,
        queueSize: this.auditQueue.length
      });

      // 将失败的记录重新加入队列
      if (batch) {
        this.auditQueue.unshift(...batch);
      }

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 写入审计日志
   */
  async writeAuditLog(auditRecords) {
    try {
      // 写入专门的审计日志文件
      for (const record of auditRecords) {
        logger.logAudit(record);
      }

      // 这里也可以写入数据库
      // await this.saveToDatabase(auditRecords);

      // 或者发送到日志收集系统
      // await this.sendToLogCollector(auditRecords);

    } catch (error) {
      logger.error('审计日志写入失败', {
        error: error.message,
        recordCount: auditRecords.length
      });
      throw error;
    }
  }

  /**
   * 查询审计日志
   */
  async queryLogs(filters = {}) {
    try {
      const {
        userId,
        type,
        resourceType,
        status,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = filters;

      // 构建查询条件
      const query = {};

      if (userId) query.userId = userId;
      if (type) query.type = type;
      if (resourceType) query.resourceType = resourceType;
      if (status) query.status = status;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // 从数据库查询日志
      // const logs = await AuditLog.find(query)
      //   .sort({ timestamp: -1 })
      //   .limit(limit)
      //   .skip(offset);

      // 临时返回模拟数据
      const logs = [];

      return {
        success: true,
        data: logs,
        total: logs.length,
        filters
      };

    } catch (error) {
      logger.error('审计日志查询失败', {
        error: error.message,
        filters
      });

      return {
        success: false,
        error: '审计日志查询失败',
        message: error.message
      };
    }
  }

  /**
   * 生成审计报告
   */
  async generateReport(startDate, endDate, reportType = 'summary') {
    try {
      const filters = {
        startDate,
        endDate
      };

      const logs = await this.queryLogs(filters);

      switch (reportType) {
      case 'summary':
        return this.generateSummaryReport(logs.data, startDate, endDate);
      case 'security':
        return this.generateSecurityReport(logs.data, startDate, endDate);
      case 'compliance':
        return this.generateComplianceReport(logs.data, startDate, endDate);
      case 'detailed':
        return this.generateDetailedReport(logs.data, startDate, endDate);
      default:
        throw new Error(`未知的报告类型: ${reportType}`);
      }

    } catch (error) {
      logger.error('审计报告生成失败', {
        error: error.message,
        startDate,
        endDate,
        reportType
      });

      throw error;
    }
  }

  /**
   * 生成摘要报告
   */
  generateSummaryReport(logs, startDate, endDate) {
    const summary = {
      period: { startDate, endDate },
      totalOperations: logs.length,
      operationsByType: {},
      operationsByStatus: {},
      operationsByUser: {},
      operationsByHour: {},
      securityEvents: [],
      highRiskOperations: []
    };

    logs.forEach(log => {
      // 按类型统计
      summary.operationsByType[log.type] = (summary.operationsByType[log.type] || 0) + 1;

      // 按状态统计
      summary.operationsByStatus[log.status] = (summary.operationsByStatus[log.status] || 0) + 1;

      // 按用户统计
      if (log.userId) {
        summary.operationsByUser[log.userId] = (summary.operationsByUser[log.userId] || 0) + 1;
      }

      // 按小时统计
      const hour = new Date(log.timestamp).getHours();
      summary.operationsByHour[hour] = (summary.operationsByHour[hour] || 0) + 1;

      // 安全事件
      if (log.securityEvent) {
        summary.securityEvents.push(log);
      }

      // 高风险操作
      if (log.riskLevel === 'high' || log.riskLevel === 'critical') {
        summary.highRiskOperations.push(log);
      }
    });

    return summary;
  }

  /**
   * 生成安全报告
   */
  generateSecurityReport(logs, startDate, endDate) {
    const securityReport = {
      period: { startDate, endDate },
      totalEvents: 0,
      eventsByType: {},
      eventsByRisk: {},
      eventsByIP: {},
      blockedAttempts: 0,
      suspiciousActivities: [],
      recommendations: []
    };

    logs.forEach(log => {
      if (log.securityEvent || log.type === OPERATION_TYPES.UNAUTHORIZED_ACCESS) {
        securityReport.totalEvents++;

        // 按类型统计
        const eventType = log.type || log.securityEvent;
        securityReport.eventsByType[eventType] = (securityReport.eventsByType[eventType] || 0) + 1;

        // 按风险级别统计
        securityReport.eventsByRisk[log.riskLevel] = (securityReport.eventsByRisk[log.riskLevel] || 0) + 1;

        // 按IP统计
        if (log.ip) {
          securityReport.eventsByIP[log.ip] = (securityReport.eventsByIP[log.ip] || 0) + 1;
        }

        // 被阻止的尝试
        if (log.status === OPERATION_STATUS.BLOCKED) {
          securityReport.blockedAttempts++;
        }

        // 可疑活动
        if (log.riskLevel === 'high' || log.riskLevel === 'critical') {
          securityReport.suspiciousActivities.push({
            timestamp: log.timestamp,
            userId: log.userId,
            ip: log.ip,
            operation: log.type,
            resource: log.resource,
            riskLevel: log.riskLevel,
            details: log.errorMessage
          });
        }
      }
    });

    // 生成建议
    securityReport.recommendations = this.generateSecurityRecommendations(securityReport);

    return securityReport;
  }

  /**
   * 生成安全建议
   */
  generateSecurityRecommendations(securityReport) {
    const recommendations = [];

    if (securityReport.blockedAttempts > 10) {
      recommendations.push({
        priority: 'high',
        type: 'access_control',
        message: '检测到大量被阻止的访问尝试，建议加强访问控制策略'
      });
    }

    if (Object.keys(securityReport.eventsByIP).some(ip => securityReport.eventsByIP[ip] > 5)) {
      recommendations.push({
        priority: 'medium',
        type: 'ip_monitoring',
        message: '发现来自特定IP的异常活动，建议实施IP监控和限制'
      });
    }

    if (securityReport.suspiciousActivities.length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'behavior_analysis',
        message: '检测到可疑活动，建议进行用户行为分析和调查'
      });
    }

    return recommendations;
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return {
      queueSize: this.auditQueue.length,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval
    };
  }

  /**
   * 优雅关闭
   */
  async shutdown() {
    logger.info('正在关闭审计日志系统...');

    // 等待当前批次处理完成
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 处理剩余的日志
    if (this.auditQueue.length > 0) {
      logger.info(`处理剩余的 ${this.auditQueue.length} 条审计日志`);
      await this.flushQueue();
    }

    logger.info('审计日志系统已关闭');
  }
}

// 创建全局审计日志实例
const auditLogger = new AuditLogger();

// 添加审计日志方法到logger
logger.logAudit = (auditRecord) => {
  logger.info('AUDIT', auditRecord);
};

// 优雅关闭处理
process.on('SIGTERM', async () => {
  await auditLogger.shutdown();
});

process.on('SIGINT', async () => {
  await auditLogger.shutdown();
});

module.exports = {
  auditLogger,
  OPERATION_TYPES,
  OPERATION_STATUS,
  DATA_SENSITIVITY
};