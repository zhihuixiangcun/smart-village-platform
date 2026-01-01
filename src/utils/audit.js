/**
 * 审计日志工具
 * 用于记录系统关键操作的审计日志
 */

const mongoose = require('mongoose');

// 审计日志Schema
const AuditLogSchema = new mongoose.Schema({
  // 操作类型
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT',
      'APPROVE', 'REJECT', 'EXPORT', 'IMPORT', 'DOWNLOAD', 'UPLOAD',
      'ASSIGN', 'TRANSFER', 'CANCEL', 'ACTIVATE', 'DEACTIVATE'
    ]
  },

  // 模块
  module: {
    type: String,
    required: true,
    enum: [
      'resident', 'finance', 'emergency', 'ecommerce', 'governance',
      'user', 'meeting', 'task', 'announcement', 'feedback', 'system'
    ]
  },

  // 操作者信息
  operator: {
    userId: {
      type: mongoose.Schema.Types.ObjectId
      // ref: 'User' - 模型可能在schema定义时未注册，使用populate时手动指定
    },
    username: String,
    name: String,
    role: String,
    department: String,
    ip: String,
    userAgent: String
  },

  // 被操作对象
  target: {
    id: mongoose.Schema.Types.ObjectId,
    type: String,
    name: String
  },

  // 操作时间
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // 操作结果
  result: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'PARTIAL'],
    required: true
  },

  // 操作详情
  details: {
    description: String,
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed
    },
    fields: [String],
    reason: String,
    attachment: String
  },

  // 风险级别
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },

  // 是否需要审批
  requiresApproval: {
    type: Boolean,
    default: false
  },

  // 审批信息
  approval: {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId
      // ref: 'User' - 模型可能在schema定义时未注册
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId
      // ref: 'User' - 模型可能在schema定义时未注册
    },
    approvedAt: Date,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    comments: String
  },

  // 会话ID
  sessionId: String,

  // 请求ID（用于追踪）
  requestId: String,

  // 位置信息
  location: {
    country: String,
    province: String,
    city: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    }
  },

  // 额外元数据
  metadata: mongoose.Schema.Types.Mixed,

  // 村庄ID
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// 索引定义
AuditLogSchema.index({ operator: 1, timestamp: -1 });
AuditLogSchema.index({ module: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ villageId: 1, timestamp: -1 });
AuditLogSchema.index({ riskLevel: 1, timestamp: -1 });
AuditLogSchema.index({ 'approval.status': 1 });

class AuditUtil {
  /**
   * 创建审计日志
   * @param {Object} auditData - 审计数据
   */
  static async log(auditData) {
    try {
      const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
      const log = new AuditLog({
        ...auditData,
        timestamp: new Date()
      });

      await log.save();

      // 高风险操作触发实时告警
      if (auditData.riskLevel === 'CRITICAL') {
        await this.triggerCriticalAlert(log);
      }

      return log;
    } catch (error) {
      console.error('创建审计日志失败:', error);
      throw new Error('审计日志记录失败');
    }
  }

  /**
   * 记录操作日志
   * @param {string} action - 操作类型
   * @param {string} module - 模块
   * @param {Object} operator - 操作者
   * @param {Object} options - 其他选项
   */
  static async logOperation(action, module, operator, options = {}) {
    const auditData = {
      action,
      module,
      operator: {
        userId: operator.userId,
        username: operator.username,
        name: operator.name,
        role: operator.role,
        department: operator.department,
        ip: operator.ip,
        userAgent: operator.userAgent
      },
      target: options.target,
      result: options.result || 'SUCCESS',
      details: options.details,
      riskLevel: options.riskLevel || this.calculateRiskLevel(action, module),
      requiresApproval: options.requiresApproval || false,
      approval: options.approval,
      sessionId: options.sessionId,
      requestId: options.requestId,
      location: options.location,
      metadata: options.metadata,
      villageId: options.villageId
    };

    return this.log(auditData);
  }

  /**
   * 计算风险级别
   * @param {string} action - 操作类型
   * @param {string} module - 模块
   * @returns {string} 风险级别
   */
  static calculateRiskLevel(action, module) {
    const highRiskActions = ['DELETE', 'EXPORT', 'APPROVE', 'REJECT'];
    const criticalModules = ['finance', 'user'];

    if (highRiskActions.includes(action) && criticalModules.includes(module)) {
      return 'CRITICAL';
    } else if (highRiskActions.includes(action)) {
      return 'HIGH';
    } else if (criticalModules.includes(module)) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * 触发高风险告警
   * @param {Object} log - 审计日志
   */
  static async triggerCriticalAlert(log) {
    // 这里可以集成通知服务
    const notificationService = require('../services/notificationService');

    await notificationService.sendEmergencyNotification({
      type: 'critical_operation',
      title: '高风险操作告警',
      message: `${log.operator.name} 在 ${log.module} 模块执行了 ${log.action} 操作`,
      data: {
        auditLogId: log._id,
        operator: log.operator,
        action: log.action,
        module: log.module,
        timestamp: log.timestamp
      },
      channels: ['email', 'push'],
      priority: 'urgent'
    });
  }

  /**
   * 查询审计日志
   * @param {Object} query - 查询条件
   * @param {Object} options - 查询选项
   * @returns {Object} 查询结果
   */
  static async queryLogs(query = {}, options = {}) {
    try {
      const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

      const {
        page = 1,
        limit = 20,
        sort = { timestamp: -1 },
        ...filter
      } = options;

      // 构建查询条件
      const conditions = { ...filter };

      // 时间范围过滤
      if (query.startDate || query.endDate) {
        conditions.timestamp = {};
        if (query.startDate) {
          conditions.timestamp.$gte = new Date(query.startDate);
        }
        if (query.endDate) {
          conditions.timestamp.$lte = new Date(query.endDate);
        }
      }

      // 关键字搜索
      if (query.keyword) {
        conditions.$or = [
          { 'operator.name': { $regex: query.keyword, $options: 'i' } },
          { 'details.description': { $regex: query.keyword, $options: 'i' } },
          { 'target.name': { $regex: query.keyword, $options: 'i' } }
        ];
      }

      // 执行查询
      const logs = await AuditLog
        .find(conditions)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('operator.userId', 'name username')
        .populate('approval.requestedBy', 'name')
        .populate('approval.approvedBy', 'name')
        .lean();

      // 获取总数
      const total = await AuditLog.countDocuments(conditions);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('查询审计日志失败:', error);
      throw new Error('审计日志查询失败');
    }
  }

  /**
   * 生成审计报告
   * @param {Object} reportConfig - 报告配置
   * @returns {Object} 审计报告
   */
  static async generateReport(reportConfig) {
    try {
      const {
        startDate,
        endDate,
        villageId,
        module,
        action,
        groupBy = 'module'
      } = reportConfig;

      // 聚合查询
      const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

      const pipeline = [
        {
          $match: {
            timestamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
            ...(villageId && { villageId: mongoose.Types.ObjectId(villageId) }),
            ...(module && { module }),
            ...(action && { action })
          }
        }
      ];

      // 分组统计
      if (groupBy === 'module') {
        pipeline.push({
          $group: {
            _id: '$module',
            count: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$result', 'SUCCESS'] }, 1, 0] }
            },
            failureCount: {
              $sum: { $cond: [{ $eq: ['$result', 'FAILURE'] }, 1, 0] }
            },
            highRiskCount: {
              $sum: { $cond: [{ $in: ['$riskLevel', ['HIGH', 'CRITICAL']] }, 1, 0] }
            }
          }
        });
      } else if (groupBy === 'action') {
        pipeline.push({
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            moduleCount: { $addToSet: '$module' }
          }
        });
      } else if (groupBy === 'operator') {
        pipeline.push({
          $group: {
            _id: '$operator.userId',
            name: { $first: '$operator.name' },
            count: { $sum: 1 },
            actions: { $addToSet: '$action' }
          }
        });
      }

      // 排序
      pipeline.push({
        $sort: { count: -1 }
      });

      const report = await AuditLog.aggregate(pipeline);

      // 生成统计摘要
      const summary = await AuditLog.aggregate([
        {
          $match: {
            timestamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
            ...(villageId && { villageId: mongoose.Types.ObjectId(villageId) })
          }
        },
        {
          $group: {
            _id: null,
            totalOperations: { $sum: 1 },
            successRate: {
              $avg: { $cond: [{ $eq: ['$result', 'SUCCESS'] }, 1, 0] }
            },
            criticalOperations: {
              $sum: { $cond: [{ $eq: ['$riskLevel', 'CRITICAL'] }, 1, 0] }
            }
          }
        }
      ]);

      return {
        report,
        summary: summary[0] || {},
        period: { startDate, endDate }
      };
    } catch (error) {
      console.error('生成审计报告失败:', error);
      throw new Error('审计报告生成失败');
    }
  }

  /**
   * 导出审计日志
   * @param {Object} query - 查询条件
   * @param {string} format - 导出格式 (excel, csv, json)
   * @returns {Buffer} 导出文件
   */
  static async exportLogs(query, format = 'csv') {
    try {
      const { logs } = await this.queryLogs(query, { limit: 10000 });

      // 根据格式导出
      switch (format) {
      case 'csv':
        return this.exportToCSV(logs);
      case 'excel':
        return this.exportToExcel(logs);
      case 'json':
        return this.exportToJSON(logs);
      default:
        throw new Error('不支持的导出格式');
      }
    } catch (error) {
      console.error('导出审计日志失败:', error);
      throw new Error('审计日志导出失败');
    }
  }

  /**
   * 导出为CSV
   * @param {Array} logs - 日志数据
   * @returns {string} CSV字符串
   */
  static exportToCSV(logs) {
    const headers = [
      '操作时间', '操作类型', '模块', '操作者', '操作结果',
      '风险级别', '目标对象', '操作描述'
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.action,
      log.module,
      log.operator?.name || '',
      log.result,
      log.riskLevel,
      log.target?.name || '',
      log.details?.description || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * 导出为JSON
   * @param {Array} logs - 日志数据
   * @returns {string} JSON字符串
   */
  static exportToJSON(logs) {
    return JSON.stringify(logs, null, 2);
  }
}

module.exports = AuditUtil;