/**
 * 权限管理服务
 * 提供村级管理员唯一认证、分级权限管理、操作审计等功能
 */

const {
  VillageAdminAuth,
  PermissionTemplate,
  AuditLog,
  PermissionLevels,
  PermissionActions,
  DataSensitivity
} = require('../models/Permission');
const User = require('../models/User');
const crypto = require('crypto');
const logger = require('../config/logger');

class PermissionService {
  constructor() {
    this.cache = new Map(); // 简单的内存缓存
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 村级管理员唯一认证
   * @param {Object} authData - 认证数据
   * @param {Object} adminData - 管理员数据
   * @returns {Promise<Object>} 认证结果
   */
  async authenticateVillageAdmin(authData, adminData) {
    try {
      logger.info('开始村级管理员认证', { villageId: authData.villageId });

      // 1. 验证认证数据
      if (!authData.villageId || !authData.token) {
        throw new Error('缺少必要的认证信息');
      }

      // 2. 查找管理员认证记录
      const authRecord = await VillageAdminAuth.findOne({
        villageId: authData.villageId,
        status: 'active'
      }).populate('currentAdmin.userId');

      if (!authRecord) {
        throw new Error('未找到该村庄的管理员认证记录');
      }

      // 3. 验证用户身份
      const user = await User.findById(authRecord.currentAdmin.userId);
      if (!user || user.status !== 'active') {
        throw new Error('管理员账号不存在或已停用');
      }

      // 4. 验证令牌（实际项目中使用JWT验证）
      // 这里简化处理，实际需要验证token签名和有效期
      const tokenValid = await this.validateAuthToken(authData.token, user);
      if (!tokenValid) {
        // 记录失败登录
        await this.recordAuthFailure(authRecord, authData);
        throw new Error('认证令牌无效');
      }

      // 5. 检查IP白名单（如果启用）
      if (!authRecord.isIPAllowed(authData.ipAddress)) {
        throw new Error('IP地址不在白名单中');
      }

      // 6. 检查设备白名单（如果启用）
      if (!authRecord.isDeviceAllowed(authData.deviceId, authData.fingerprint)) {
        throw new Error('设备未授权');
      }

      // 7. 更新登录统计
      await this.updateAuthStatistics(authRecord, authData);

      // 8. 记录审计日志
      await this.logOperation({
        operation: 'LOGIN',
        resource: 'VILLAGE_ADMIN_AUTH',
        action: 'authenticate',
        actor: {
          userId: user._id,
          userName: user.profile.displayName,
          userRole: user.role,
          userPhone: user.phone,
          userVillageId: user.village.villageId
        },
        system: authData.system || 'web',
        ipAddress: authData.ipAddress,
        userAgent: authData.userAgent,
        deviceId: authData.deviceId,
        result: {
          status: 'SUCCESS'
        },
        privacy: {
          sensitiveLevel: DataSensitivity.CONFIDENTIAL,
          accessReason: '村级管理员登录',
          legalBasis: 'contract'
        }
      });

      logger.info('村级管理员认证成功', {
        villageId: authData.villageId,
        adminId: user._id
      });

      return {
        success: true,
        user,
        permissions: await this.getUserPermissions(user),
        authRecord,
        sessionTimeout: authRecord.securitySettings.sessionTimeout
      };

    } catch (error) {
      logger.error('村级管理员认证失败:', error);
      throw error;
    }
  }

  /**
   * 申请村级管理员认证
   * @param {Object} villageData - 村庄数据
   * @param {Object} adminData - 管理员数据
   * @param {Object} documentData - 文档数据
   * @param {String} operatorId - 操作者ID
   * @returns {Promise<Object>} 申请结果
   */
  async applyVillageAdminAuth(villageData, adminData, documentData, operatorId) {
    try {
      logger.info('申请村级管理员认证', { villageId: villageData.villageId });

      // 1. 验证村庄唯一性
      const uniquenessCheck = await VillageAdminAuth.validateVillageAdminUniqueness(
        villageData.villageId,
        adminData.userId
      );

      if (!uniquenessCheck.valid) {
        throw new Error(uniquenessCheck.reason);
      }

      // 2. OCR验证证件（如果有上传）
      let ocrResult = null;
      if (documentData) {
        ocrResult = await this.validateAppointmentDocument(documentData);
        if (!ocrResult.verified) {
          throw new Error(`证件验证失败：${  ocrResult.reason}`);
        }
      }

      // 3. 创建管理员认证记录
      const authRecord = await VillageAdminAuth.createVillageAdminAuth(
        villageData,
        {
          ...adminData,
          appointmentDocument: {
            ...documentData,
            ocrVerified: true,
            ocrResult
          }
        },
        operatorId
      );

      // 4. 通知上级审核（实际项目中）
      await this.notifyApprovalNeeded(authRecord);

      // 5. 记录审计日志
      await this.logOperation({
        operation: 'CREATE',
        resource: 'VILLAGE_ADMIN_AUTH',
        action: 'apply',
        actor: {
          userId: operatorId,
          userName: '', // 需要从用户表获取
          userRole: 'system'
        },
        target: {
          userId: adminData.userId,
          userName: adminData.userName
        },
        result: {
          status: 'SUCCESS',
          affectedRecords: 1
        },
        privacy: {
          sensitiveLevel: DataSensitivity.CONFIDENTIAL,
          accessReason: '村级管理员认证申请',
          legalBasis: 'contract'
        }
      });

      logger.info('村级管理员认证申请成功', {
        villageId: villageData.villageId,
        applicantId: adminData.userId
      });

      return {
        success: true,
        authRecord,
        message: '认证申请已提交，请等待上级审核'
      };

    } catch (error) {
      logger.error('村级管理员认证申请失败:', error);
      throw error;
    }
  }

  /**
   * 审核村级管理员认证
   * @param {String} authId - 认证记录ID
   * @param {String} decision - 审核决定 (approve/reject)
   * @param {Object} reviewData - 审核数据
   * @param {String} reviewerId - 审核人ID
   * @returns {Promise<Object>} 审核结果
   */
  async reviewVillageAdminAuth(authId, decision, reviewData, reviewerId) {
    try {
      logger.info('审核村级管理员认证', { authId, decision });

      // 1. 查找认证记录
      const authRecord = await VillageAdminAuth.findById(authId);
      if (!authRecord) {
        throw new Error('认证记录不存在');
      }

      // 2. 验证审核权限
      const reviewer = await User.findById(reviewerId);
      if (!reviewer || !reviewer.hasPermission('approve_village_admin')) {
        throw new Error('无权审核村级管理员认证');
      }

      // 3. 执行审核操作
      let statusUpdate;
      if (decision === 'approve') {
        authRecord.status = 'active';
        statusUpdate = 'approved';

        // 添加认证时间线记录
        authRecord.authTimeline.push({
          action: 'approved',
          operator: reviewerId,
          operatorName: reviewer.profile.displayName,
          description: reviewData.reason || '审核通过',
          evidence: {
            reviewerRole: reviewer.role,
            reviewDate: new Date()
          }
        });

        // 发送激活通知
        await this.sendActivationNotification(authRecord);

      } else if (decision === 'reject') {
        authRecord.status = 'inactive';
        statusUpdate = 'rejected';

        authRecord.authTimeline.push({
          action: 'rejected',
          operator: reviewerId,
          operatorName: reviewer.profile.displayName,
          description: reviewData.reason || '审核拒绝',
          evidence: {
            reviewerRole: reviewer.role,
            reviewDate: new Date(),
            rejectionReason: reviewData.reason
          }
        });

        // 发送拒绝通知
        await this.sendRejectionNotification(authRecord, reviewData.reason);

      } else {
        throw new Error('无效的审核决定');
      }

      // 4. 记录权限变更
      authRecord.permissionChanges.push({
        changeType: 'role_change',
        operator: reviewerId,
        operatorName: reviewer.profile.displayName,
        targetUser: authRecord.currentAdmin.userId,
        targetUserName: authRecord.currentAdmin.userName,
        oldPermissions: [],
        newPermissions: ['village_admin'],
        reason: `村级管理员${statusUpdate === 'approved' ? '激活' : '拒绝'}`,
        approvedBy: reviewerId,
        approvedAt: new Date()
      });

      await authRecord.save();

      // 5. 记录审计日志
      await this.logOperation({
        operation: 'APPROVE',
        resource: 'VILLAGE_ADMIN_AUTH',
        action: 'review',
        actor: {
          userId: reviewerId,
          userName: reviewer.profile.displayName,
          userRole: reviewer.role,
          userVillageId: reviewer.village?.villageId
        },
        target: {
          userId: authRecord.currentAdmin.userId,
          userName: authRecord.currentAdmin.userName
        },
        result: {
          status: statusUpdate === 'approved' ? 'SUCCESS' : 'SUCCESS',
          affectedRecords: 1
        },
        dataChange: {
          changeType: 'status',
          oldValue: 'pending',
          newValue: authRecord.status
        },
        privacy: {
          sensitiveLevel: DataSensitivity.CONFIDENTIAL,
          accessReason: '村级管理员认证审核',
          legalBasis: 'legal_obligation'
        }
      });

      logger.info('村级管理员认证审核完成', {
        authId,
        decision,
        reviewerId
      });

      return {
        success: true,
        authRecord,
        message: `认证${statusUpdate === 'approved' ? '激活' : '拒绝'}成功`
      };

    } catch (error) {
      logger.error('村级管理员认证审核失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户权限
   * @param {Object} user - 用户对象
   * @returns {Promise<Array>} 权限列表
   */
  async getUserPermissions(user) {
    try {
      // 检查缓存
      const cacheKey = `user_permissions_${user._id}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.permissions;
        }
      }

      // 如果是超级管理员，返回所有权限
      if (user.role === PermissionLevels.SUPER_ADMIN) {
        const allPermissions = Object.values(PermissionActions).map(action => `*:${action}`);
        this.cache.set(cacheKey, { permissions: allPermissions, timestamp: Date.now() });
        return allPermissions;
      }

      // 如果是村级管理员，获取完整权限
      if (user.role === PermissionLevels.VILLAGE_ADMIN) {
        const villagePermissions = this.getVillageAdminPermissions();
        this.cache.set(cacheKey, { permissions: villagePermissions, timestamp: Date.now() });
        return villagePermissions;
      }

      // 其他角色获取基于模板的权限
      const template = await PermissionTemplate.getTemplateByRole(user.role);
      if (!template) {
        this.cache.set(cacheKey, { permissions: [], timestamp: Date.now() });
        return [];
      }

      // 应用权限模板
      const result = await PermissionTemplate.applyTemplate(template._id, user._id);
      const permissions = result.permissions.map(p => `${p.resource}:${p.actions.join(',')}`);

      this.cache.set(cacheKey, { permissions, timestamp: Date.now() });
      return permissions;

    } catch (error) {
      logger.error('获取用户权限失败:', error);
      return [];
    }
  }

  /**
   * 检查用户权限
   * @param {Object} user - 用户对象
   * @param {String} resource - 资源
   * @param {String} action - 操作
   * @param {Object} options - 选项
   * @returns {Promise<boolean>} 是否有权限
   */
  async checkPermission(user, resource, action, options = {}) {
    try {
      // 超级管理员拥有所有权限
      if (user.role === PermissionLevels.SUPER_ADMIN) {
        return true;
      }

      // 获取用户权限
      const permissions = await this.getUserPermissions(user);

      // 检查具体权限
      const hasDirectPermission = permissions.includes(`${resource}:${action}`);
      if (hasDirectPermission) {
        return true;
      }

      // 检查通配符权限
      const hasWildcardPermission = permissions.includes(`*:${action}`);
      if (hasWildcardPermission) {
        return true;
      }

      // 检查资源级权限
      const hasResourcePermission = permissions.some(permission => {
        const [resourcePattern, actions] = permission.split(':');
        const actionList = actions.split(',');
        return (
          resourcePattern === resource &&
          actionList.includes(action)
        );
      });

      return hasResourcePermission;

    } catch (error) {
      logger.error('权限检查失败:', error);
      return false;
    }
  }

  /**
   * 权限脱敏处理
   * @param {Object} data - 原始数据
   * @param {Object} user - 用户对象
   * @param {String} context - 脱上下文
   * @returns {Object} 脱敏后数据
   */
  sanitizeData(data, user, context = 'default') {
    const sanitized = { ...data };

    // 根据用户角色和上下文确定脱敏规则
    const rules = this.getDataSanitizationRules(user.role, context);

    rules.forEach(rule => {
      if (rule.field in sanitized) {
        sanitized[rule.field] = rule.apply(sanitized[rule.field]);
      }
    });

    return sanitized;
  }

  /**
   * 记录操作审计日志
   * @param {Object} logData - 日志数据
   * @returns {Promise<Object>} 日志记录
   */
  async logOperation(logData) {
    try {
      const log = await AuditLog.logOperation(logData);

      // 关联日志
      if (logData.relatedLogs && logData.relatedLogs.length > 0) {
        for (const relatedLog of logData.relatedLogs) {
          await AuditLog.updateOne(
            { logId: relatedLog.logId },
            {
              $push: {
                relatedLogs: [{
                  logId: log.logId,
                  relationship: relatedLog.relationship,
                  description: relatedLog.description
                }]
              }
            }
          );
        }
      }

      return log;

    } catch (error) {
      logger.error('记录审计日志失败:', error);
      return null;
    }
  }

  /**
   * 查询审计日志
   * @param {Object} filters - 过滤条件
   * @param {Object} pagination - 分页参数
   * @returns {Promise<Object>} 查询结果
   */
  async queryAuditLogs(filters = {}, pagination = {}) {
    try {
      return await AuditLog.queryLogs(filters, pagination);

    } catch (error) {
      logger.error('查询审计日志失败:', error);
      throw error;
    }
  }

  /**
   * 数据脱敏规则
   * @param {String} role - 用户角色
   * @param {String} context - 使用上下文
   * @returns {Array} 脱敏规则
   */
  getDataSanitizationRules(role, context = 'default') {
    const rules = [];

    // 基础规则（适用于所有角色）
    rules.push(
      { field: 'password', apply: (value) => '***' },
      { field: 'salt', apply: (value) => '***' },
      { field: 'secret', apply: (value) => '***' }
    );

    // 根据角色添加规则
    switch (role) {
    case PermissionLevels.VILLAGER:
      rules.push(
        { field: 'idCard', apply: (value) => this.maskIdCard(value) },
        { field: 'phone', apply: (value) => this.maskPhone(value) },
        { field: 'bankAccount', apply: (value) => this.maskBankAccount(value) }
      );
      break;

    case PermissionLevels.STAFF:
      rules.push(
        { field: 'idCard', apply: (value) => this.maskIdCard(value) },
        { field: 'phone', apply: (value) => this.maskPhone(value) }
      );
      break;

    case PermissionLevels.VILLAGER:
      rules.push(
        { field: 'idCard', apply: (value) => this.maskIdCard(value) },
        { field: 'phone', apply: (value) => this.maskPhone(value) }
      );
      break;

    case PermissionLevels.GUEST:
      rules.push(
        { field: 'idCard', apply: (value) => this.maskIdCard(value) },
        { field: 'phone', apply: (value) => this.maskPhone(value) },
        { field: 'email', apply: (value) => this.maskEmail(value) },
        { field: 'address', apply: (value) => this.maskAddress(value) }
      );
      break;
    }

    // 根据上下文添加规则
    if (context === 'export') {
      rules.push(
        { field: 'all', apply: (value) => '数据导出已脱敏处理' }
      );
    }

    return rules;
  }

  /**
   * 身份证脱敏
   * @param {String} idCard - 身份证号
   * @returns {String} 脱敏后的身份证号
   */
  maskIdCard(idCard) {
    if (!idCard || idCard.length !== 18) return idCard;
    return `${idCard.substring(0, 6)  }********${  idCard.substring(14)}`;
  }

  /**
   * 手机号脱敏
   * @param {String} phone - 手机号
   * @returns {String} 脱敏后的手机号
   */
  maskPhone(phone) {
    if (!phone || phone.length !== 11) return phone;
    return `${phone.substring(0, 3)  }****${  phone.substring(7)}`;
  }

  /**
   * 银行账号脱敏
   * @param {String} account - 银行账号
   * @returns {String} 脱敏后的银行账号
   */
  maskBankAccount(account) {
    if (!account || account.length < 10) return account;
    return `${account.substring(0, 4)  }****${  account.substring(account.length - 4)}`;
  }

  /**
   * 邮箱脱敏
   * @param {String} email - 邮箱
   * @returns {String} 脱敏后的邮箱
   */
  maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [username, domain] = email.split('@');
    const maskedUsername = `${username.substring(0, 2)  }***`;
    return `${maskedUsername}@${domain}`;
  }

  /**
   * 地址脱敏
   * @param {String} address - 地址
   * @returns {String} 脱敏后的地址
   */
  maskAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)  }***${  address.substring(address.length - 6)}`;
  }

  /**
   * 获取村级管理员权限
   * @returns {Array} 权限列表
   */
  getVillageAdminPermissions() {
    return [
      'user:create',
      'user:read',
      'user:update',
      'user:delete',
      'user:manage',
      'household:create',
      'household:read',
      'household:update',
      'household:delete',
      'household:export',
      'household:audit',
      'village:create',
      'village:read',
      'village:update',
      'village:delete',
      'village:manage',
      'announcement:create',
      'announcement:read',
      'announcement:update',
      'announcement:delete',
      'announcement:publish',
      'discussion:create',
      'discussion:read',
      'discussion:update',
      'discussion:delete',
      'discussion:manage',
      'task:create',
      'task:read',
      'task:update',
      'task:delete',
      'task:assign',
      'task:audit',
      'emergency:create',
      'emergency:read',
      'emergency:update',
      'emergency:dispatch',
      'emergency:audit',
      'finance:create',
      'finance:read',
      'finance:update',
      'finance:delete',
      'finance:approve',
      'finance:export',
      'system:config',
      'system:audit',
      'system:backup',
      'system:restore',
      'data:export',
      'data:import'
    ];
  }

  /**
   * 验证认证令牌
   * @param {String} token - 令牌
   * @param {Object} user - 用户对象
   * @returns {Promise<Boolean>} 是否有效
   */
  async validateAuthToken(token, user) {
    try {
      // 实际项目中应该验证JWT签名和有效期
      // 这里简化处理
      if (!token || !user.token) {
        return false;
      }

      // 检查token是否匹配（简化验证）
      return token === user.token;

    } catch (error) {
      logger.error('令牌验证失败:', error);
      return false;
    }
  }

  /**
   * 更新认证统计信息
   * @param {Object} authRecord - 认证记录
   * @param {Object} authData - 认证数据
   */
  async updateAuthStatistics(authRecord, authData) {
    authRecord.statistics.totalLogins += 1;
    authRecord.statistics.lastLoginAt = new Date();
    authRecord.statistics.successfulLogins += 1;

    // 更新最后登录设备
    if (authData.deviceId) {
      const existingDevice = authRecord.securitySettings.deviceWhitelist.find(
        d => d.deviceId === authData.deviceId
      );

      if (!existingDevice) {
        authRecord.securitySettings.deviceWhitelist.push({
          deviceId: authData.deviceId,
          deviceName: authData.deviceName || 'Unknown Device',
          platform: authData.platform || 'unknown',
          lastUsed: new Date(),
          fingerprint: authData.fingerprint || ''
        });
      }
    }

    await authRecord.save();
  }

  /**
   * 记录认证失败
   * @param {Object} authRecord - 认证记录
   * @param {Object} authData - 认证数据
   */
  async recordAuthFailure(authRecord, authData) {
    authRecord.statistics.failedLogins += 1;
    authRecord.statistics.lastFailedLoginAt = new Date();

    await authRecord.save();

    // 检查是否需要锁定账户
    if (authRecord.statistics.failedLogins >= 5) {
      authRecord.status = 'suspended';
      authRecord.authTimeline.push({
        action: 'suspended',
        timestamp: new Date(),
        description: '多次登录失败，账户已锁定',
        evidence: {
          failedCount: authRecord.statistics.failedLogins,
          lastFailureIP: authData.ipAddress
        }
      });

      await authRecord.save();
    }
  }

  /**
   * 验证证件文件
   * @param {Object} documentData - 文档数据
   * @returns {Promise<Object>} 验证结果
   */
  async validateAppointmentDocument(documentData) {
    try {
      // 这里应该调用OCR服务进行证件验证
      // 简化实现，实际项目中需要集成真实的OCR服务

      const validationRules = {
        fileName: {
          required: true,
          pattern: /\.(jpg|jpeg|png|pdf)$/i
        },
        fileSize: {
          max: 10 * 1024 * 1024, // 10MB
          min: 10 * 1024 // 10KB
        },
        documentType: {
          required: true,
          allowed: ['身份证', '任命书', '授权书']
        }
      };

      // 验证规则
      if (!validationRules.fileName.pattern.test(documentData.fileName)) {
        return {
          verified: false,
          reason: '文件格式不支持，仅支持JPG、PNG、PDF格式'
        };
      }

      if (documentData.size > validationRules.fileSize.max ||
          documentData.size < validationRules.fileSize.min) {
        return {
          verified: false,
          reason: `文件大小应在${validationRules.fileSize.min}B-${validationRules.fileSize.max}B之间`
        };
      }

      // 模拟OCR验证
      const mockOCRResult = {
        verified: true,
        confidence: 0.95,
        extractedText: '身份证姓名：张三\n身份证号：370102199001010001\n住址：...',
        riskLevel: 'low'
      };

      return mockOCRResult;

    } catch (error) {
      logger.error('证件验证失败:', error);
      return {
        verified: false,
        reason: '证件验证过程中发生错误'
      };
    }
  }

  /**
   * 发送审核通知
   * @param {Object} authRecord - 认证记录
   */
  async notifyApprovalNeeded(authRecord) {
    try {
      // 实际项目中应该发送邮件、短信或系统通知
      logger.info('发送村级管理员认证审核通知', {
        authId: authRecord._id,
        applicantId: authRecord.currentAdmin.userId,
        villageId: authRecord.villageId
      });

      // 这里应该调用通知服务
      // await notificationService.sendApprovalNotification(authRecord);

    } catch (error) {
      logger.error('发送审核通知失败:', error);
    }
  }

  /**
   * 发送激活通知
   * @param {Object} authRecord - 认证记录
   */
  async sendActivationNotification(authRecord) {
    try {
      logger.info('发送村级管理员激活通知', {
        authId: authRecord._id,
        adminId: authRecord.currentAdmin.userId
      });

      // 这里应该调用通知服务
      // await notificationService.sendActivationNotification(authRecord);

    } catch (error) {
      logger.error('发送激活通知失败:', error);
    }
  }

  /**
   * 发送拒绝通知
   * @param {Object} authRecord - 认证记录
   * @param {String} reason - 拒绝原因
   */
  async sendRejectionNotification(authRecord, reason) {
    try {
      logger.info('发送村级管理员拒绝通知', {
        authId: authRecord._id,
        applicantId: authRecord.currentAdmin.userId,
        reason
      });

      // 这里应该调用通知服务
      // await notificationService.sendRejectionNotification(authRecord, reason);

    } catch (error) {
      logger.error('发送拒绝通知失败:', error);
    }
  }

  /**
   * 清理过期缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = PermissionService;