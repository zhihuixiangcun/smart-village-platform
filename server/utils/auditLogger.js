const { AuditLog } = require('../models/audit');
const logger = require('./logger');

/**
 * 审计日志工具
 */
class AuditLogService {
  /**
   * 记录审计日志
   * @param {Object} params - 日志参数
   * @param {String} params.userId - 用户ID
   * @param {String} params.action - 操作类型
   * @param {String} params.resource - 资源ID
   * @param {Object} params.details - 操作详情
   */
  static async log(params) {
    try {
      const auditLog = new AuditLog({
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        details: params.details || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      });

      await auditLog.save();
      logger.info('审计日志记录成功', params);

    } catch (error) {
      logger.error('记录审计日志失败', error);
      // 审计日志失败不应该影响主业务流程
    }
  }

  /**
   * 查询审计日志
   * @param {Object} filters - 过滤条件
   * @param {Object} pagination - 分页参数
   */
  static async query(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10 } = pagination;

      const auditLogs = await AuditLog.find(filters)
        .populate('userId', 'name username')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await AuditLog.countDocuments(filters);

      return {
        logs: auditLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('查询审计日志失败', error);
      throw error;
    }
  }
}

module.exports = { AuditLog: AuditLogService };