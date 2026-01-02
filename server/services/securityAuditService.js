/**
 * 安全审计服务
 * 提供操作日志记录、异常检测、告警推送、报告生成等功能
 */

const SecurityAudit = require('../models/SecurityAudit');

class SecurityAuditService {
  constructor() {
    // 异常检测配置
    this.anomalyConfig = {
      // 操作频率阈值（每小时）
      thresholds: {
        view_sensitive_data: 50,
        export_sensitive_data: 10,
        query_sensitive_data: 100,
        login: 20,
        login_failed: 5
      },
      // 异常分数权重
      weights: {
        frequency: 0.4,
        time: 0.3,
        location: 0.2,
        pattern: 0.1
      },
      // 告警分数阈值
      alertThreshold: 70
    };

    // 告警处理器
    this.alertHandlers = [];
    this.registerDefaultAlertHandlers();
  }

  /**
   * 注册默认告警处理器
   */
  registerDefaultAlertHandlers() {
    // 示例：可以添加邮件、短信、WebSocket等告警方式
    // this.alertHandlers.push(this.sendEmailAlert.bind(this));
    // this.alertHandlers.push(this.sendSmsAlert.bind(this));
    // this.alertHandlers.push(this.sendWebSocketAlert.bind(this));
  }

  /**
   * 记录审计日志
   * @param {Object} auditData - 审计数据
   * @returns {Object} 记录结果
   */
  async log(auditData) {
    try {
      // 1. 检测异常行为
      const anomalyDetection = await this.detectAnomaly(
        auditData.operator?.userId,
        auditData.operationType
      );

      // 2. 如果检测到异常，添加到审计数据
      if (anomalyDetection.isAnomaly) {
        auditData.isAnomaly = true;
        auditData.anomalyScore = anomalyDetection.anomalyScore;
        auditData.anomalyReasons = anomalyDetection.reasons;
        auditData.requireAlert = anomalyDetection.anomalyScore >= this.anomalyConfig.alertThreshold;
      }

      // 3. 创建审计记录
      const audit = await SecurityAudit.log(auditData);

      // 4. 如果需要告警，触发告警
      if (audit && audit.requireAlert) {
        await this.triggerAlert(audit);
      }

      return {
        success: true,
        audit
      };
    } catch (error) {
      console.error('Error creating security audit:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检测异常行为
   * @param {String} userId - 用户ID
   * @param {String} operationType - 操作类型
   * @returns {Object} 检测结果
   */
  async detectAnomaly(userId, operationType) {
    if (!userId || !operationType) {
      return { isAnomaly: false };
    }

    try {
      // 1. 检查操作频率
      const frequencyAnomaly = await this.checkFrequencyAnomaly(userId, operationType);

      // 2. 检查时间异常
      const timeAnomaly = await this.checkTimeAnomaly(userId, operationType);

      // 3. 检查位置异常（如果有的话）
      const locationAnomaly = await this.checkLocationAnomaly(userId, operationType);

      // 4. 检查行为模式异常
      const patternAnomaly = await this.checkPatternAnomaly(userId, operationType);

      // 5. 计算综合异常分数
      const anomalyScore = this.calculateAnomalyScore({
        frequency: frequencyAnomaly,
        time: timeAnomaly,
        location: locationAnomaly,
        pattern: patternAnomaly
      });

      // 6. 汇总异常原因
      const reasons = [];
      if (frequencyAnomaly.isAnomaly) reasons.push(...frequencyAnomaly.reasons);
      if (timeAnomaly.isAnomaly) reasons.push(...timeAnomaly.reasons);
      if (locationAnomaly.isAnomaly) reasons.push(...locationAnomaly.reasons);
      if (patternAnomaly.isAnomaly) reasons.push(...patternAnomaly.reasons);

      const isAnomaly = anomalyScore >= this.anomalyConfig.alertThreshold;

      return {
        isAnomaly,
        anomalyScore,
        reasons
      };
    } catch (error) {
      console.error('Error detecting anomaly:', error);
      return { isAnomaly: false };
    }
  }

  /**
   * 检查频率异常
   * @param {String} userId - 用户ID
   * @param {String} operationType - 操作类型
   * @returns {Object} 检测结果
   */
  async checkFrequencyAnomaly(userId, operationType) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await SecurityAudit.countDocuments({
      'operator.userId': userId,
      operationType,
      createdAt: { $gte: oneHourAgo }
    });

    const threshold = this.anomalyConfig.thresholds[operationType] || 100;
    const isAnomaly = recentCount > threshold;

    return {
      isAnomaly,
      score: isAnomaly ? Math.min(100, (recentCount / threshold) * 40) : 0,
      reasons: isAnomaly ? [`最近1小时操作${recentCount}次，超过阈值${threshold}次`] : []
    };
  }

  /**
   * 检查时间异常
   * @param {String} userId - 用户ID
   * @param {String} operationType - 操作类型
   * @returns {Object} 检测结果
   */
  async checkTimeAnomaly(userId, operationType) {
    const now = new Date();
    const currentHour = now.getHours();

    // 获取用户通常的操作时间段
    const userPattern = await this.getUserTimePattern(userId, operationType);

    if (!userPattern || userPattern.length === 0) {
      return { isAnomaly: false, score: 0, reasons: [] };
    }

    // 检查当前时间是否在常用时间段内
    const isInNormalTime = userPattern.some(hour => Math.abs(hour - currentHour) <= 1);

    if (!isInNormalTime) {
      return {
        isAnomaly: true,
        score: 30,
        reasons: [`操作时间${currentHour}点不在常用时间段内`]
      };
    }

    return { isAnomaly: false, score: 0, reasons: [] };
  }

  /**
   * 获取用户操作时间模式
   * @param {String} userId - 用户ID
   * @param {String} operationType - 操作类型
   * @returns {Array} 常用小时列表
   */
  async getUserTimePattern(userId, operationType) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await SecurityAudit.aggregate([
      {
        $match: {
          'operator.userId': userId,
          operationType,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    return result.map(r => r._id);
  }

  /**
   * 检查位置异常
   * @param {String} userId - 用户ID
   * @param {String} operationType - 操作类型
   * @returns {Object} 检测结果
   */
  async checkLocationAnomaly(userId, operationType) {
    // 获取最近的操作位置
    const recentAudits = await SecurityAudit.find({
      'operator.userId': userId,
      operationType,
      'location.city': { $exists: true }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (recentAudits.length < 3) {
      return { isAnomaly: false, score: 0, reasons: [] };
    }

    // 检查最近的位置变化
    // 这里可以实现更复杂的地理位置分析
    return { isAnomaly: false, score: 0, reasons: [] };
  }

  /**
   * 检查行为模式异常
   * @param {String} userId - 用户ID
   * @param {String} operationType - 操作类型
   * @returns {Object} 检测结果
   */
  async checkPatternAnomaly(userId, operationType) {
    // 检查是否有连续失败的操作
    const recentFailed = await SecurityAudit.countDocuments({
      'operator.userId': userId,
      operationType,
      result: 'failed',
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });

    if (recentFailed >= 3) {
      return {
        isAnomaly: true,
        score: 20,
        reasons: [`最近10分钟内连续失败${recentFailed}次`]
      };
    }

    return { isAnomaly: false, score: 0, reasons: [] };
  }

  /**
   * 计算综合异常分数
   * @param {Object} anomalies - 各类异常结果
   * @returns {Number} 异常分数
   */
  calculateAnomalyScore(anomalies) {
    const weights = this.anomalyConfig.weights;

    return Math.min(100,
      (anomalies.frequency.score * weights.frequency) +
      (anomalies.time.score * weights.time) +
      (anomalies.location.score * weights.location) +
      (anomalies.pattern.score * weights.pattern)
    );
  }

  /**
   * 触发告警
   * @param {Object} audit - 审计记录
   */
  async triggerAlert(audit) {
    try {
      // 调用所有告警处理器
      for (const handler of this.alertHandlers) {
        try {
          await handler(audit);
        } catch (error) {
          console.error('Error in alert handler:', error);
        }
      }

      // 更新告警状态
      audit.alertStatus = 'sent';
      await audit.save();
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  /**
   * 查询审计日志
   * @param {Object} filters - 过滤条件
   * @returns {Object} 查询结果
   */
  async queryAudits(filters = {}) {
    try {
      const {
        userId,
        operationType,
        sensitivityLevel,
        isAnomaly,
        requireAlert,
        startDate,
        endDate,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const query = {};

      if (userId) query['operator.userId'] = userId;
      if (operationType) query.operationType = operationType;
      if (sensitivityLevel) query.sensitivityLevel = sensitivityLevel;
      if (isAnomaly !== undefined) query.isAnomaly = isAnomaly;
      if (requireAlert !== undefined) query.requireAlert = requireAlert;

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [audits, total] = await Promise.all([
        SecurityAudit.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        SecurityAudit.countDocuments(query)
      ]);

      return {
        success: true,
        data: audits,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '查询失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户审计历史
   * @param {String} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Object} 查询结果
   */
  async getUserHistory(userId, options = {}) {
    try {
      const history = await SecurityAudit.getUserAuditHistory(userId, options);

      return {
        success: true,
        data: history
      };
    } catch (error) {
      return {
        success: false,
        message: '查询失败',
        error: error.message
      };
    }
  }

  /**
   * 获取敏感操作统计
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Object} 统计数据
   */
  async getSensitiveStats(startDate, endDate) {
    try {
      const stats = await SecurityAudit.getSensitiveStats(startDate, endDate);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: '获取统计失败',
        error: error.message
      };
    }
  }

  /**
   * 获取异常行为报告
   * @param {Number} days - 天数
   * @returns {Object} 异常报告
   */
  async getAnomalyReport(days = 7) {
    try {
      const report = await SecurityAudit.getAnomalyReport(days);

      return {
        success: true,
        data: report
      };
    } catch (error) {
      return {
        success: false,
        message: '获取报告失败',
        error: error.message
      };
    }
  }

  /**
   * 获取访问热力图数据
   * @param {Number} days - 天数
   * @returns {Object} 热力图数据
   */
  async getAccessHeatmap(days = 30) {
    try {
      const heatmap = await SecurityAudit.getAccessHeatmap(days);

      return {
        success: true,
        data: heatmap
      };
    } catch (error) {
      return {
        success: false,
        message: '获取热力图失败',
        error: error.message
      };
    }
  }

  /**
   * 获取用户活跃度
   * @param {Number} days - 天数
   * @returns {Object} 活跃度数据
   */
  async getUserActivity(days = 30) {
    try {
      const activity = await SecurityAudit.getUserActivity(days);

      return {
        success: true,
        data: activity
      };
    } catch (error) {
      return {
        success: false,
        message: '获取活跃度失败',
        error: error.message
      };
    }
  }

  /**
   * 检查合规性
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Object} 合规性报告
   */
  async checkCompliance(startDate, endDate) {
    try {
      const compliance = await SecurityAudit.checkCompliance(startDate, endDate);

      return {
        success: true,
        data: compliance
      };
    } catch (error) {
      return {
        success: false,
        message: '合规性检查失败',
        error: error.message
      };
    }
  }

  /**
   * 生成安全审计报告
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Object} 审计报告
   */
  async generateReport(startDate, endDate) {
    try {
      // 获取各项统计数据
      const [
        sensitiveStats,
        anomalyReport,
        userActivity,
        compliance,
        accessHeatmap
      ] = await Promise.all([
        this.getSensitiveStats(startDate, endDate),
        this.getAnomalyReport(7),
        this.getUserActivity(30),
        this.checkCompliance(startDate, endDate),
        this.getAccessHeatmap(30)
      ]);

      // 汇总报告
      const report = {
        period: { startDate, endDate },
        summary: {
          sensitiveOperations: sensitiveStats.data?.length || 0,
          anomalyCount: anomalyReport.data?.length || 0,
          activeUsers: userActivity.data?.length || 0,
          isCompliant: compliance.data?.isCompliant || false
        },
        details: {
          sensitiveStats: sensitiveStats.data,
          anomalyReport: anomalyReport.data,
          userActivity: userActivity.data,
          compliance: compliance.data,
          accessHeatmap: accessHeatmap.data
        },
        generatedAt: new Date()
      };

      return {
        success: true,
        report
      };
    } catch (error) {
      return {
        success: false,
        message: '生成报告失败',
        error: error.message
      };
    }
  }

  /**
   * 导出审计日志
   * @param {Object} filters - 过滤条件
   * @param {String} format - 导出格式
   * @returns {Object} 导出结果
   */
  async exportAudits(filters = {}, format = 'csv') {
    try {
      // 查询数据
      const { data } = await this.queryAudits({
        ...filters,
        limit: 10000 // 限制导出数量
      });

      if (format === 'csv') {
        // 转换为CSV
        const csv = this.convertToCSV(data);
        return {
          success: true,
          format: 'csv',
          data: csv,
          filename: `security_audit_${Date.now()}.csv`
        };
      } else if (format === 'json') {
        return {
          success: true,
          format: 'json',
          data: JSON.stringify(data, null, 2),
          filename: `security_audit_${Date.now()}.json`
        };
      } else {
        return {
          success: false,
          message: '不支持的导出格式'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: '导出失败',
        error: error.message
      };
    }
  }

  /**
   * 转换为CSV格式
   * @param {Array} data - 数据
   * @returns {String} CSV字符串
   */
  convertToCSV(data) {
    if (data.length === 0) return '';

    // 获取所有字段
    const fields = [
      'createdAt',
      'operationType',
      'operationName',
      'operator.userName',
      'operator.userRole',
      'ipAddress',
      'sensitivityLevel',
      'result',
      'isAnomaly',
      'anomalyScore'
    ];

    // 构建CSV头部
    const headers = fields.join(',');

    // 构建CSV数据
    const rows = data.map(audit => {
      return fields.map(field => {
        const value = this.getNestedValue(audit, field);
        return this.escapeCsvValue(value);
      }).join(',');
    });

    return headers + '\n' + rows.join('\n');
  }

  /**
   * 获取嵌套对象的值
   * @param {Object} obj - 对象
   * @param {String} path - 路径
   * @returns {*} 值
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 转义CSV值
   * @param {*} value - 值
   * @returns {String} 转义后的值
   */
  escapeCsvValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * 清理旧审计日志
   * @param {Number} days - 保留天数
   * @returns {Object} 清理结果
   */
  async cleanupOldLogs(days = 90) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const result = await SecurityAudit.deleteMany({
        createdAt: { $lt: cutoffDate },
        // 保留重要记录
        sensitivityLevel: { $nin: ['high', 'critical'] },
        isAnomaly: false,
        requireAlert: false
      });

      return {
        success: true,
        message: `成功清理${result.deletedCount}条旧日志`,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      return {
        success: false,
        message: '清理失败',
        error: error.message
      };
    }
  }
}

// 导出单例
module.exports = new SecurityAuditService();
