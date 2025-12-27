/**
 * 增强权限管理服务
 * 基于现有系统进行功能增强，支持RBAC、ABAC、动态权限、权限继承等
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');
const EventEmitter = require('events');
const logger = require('../config/logger');
const {
  VillageAdminAuth,
  PermissionTemplate,
  AuditLog,
  PermissionLevels,
  PermissionActions,
  DataSensitivity
} = require('../models/Permission');
const User = require('../models/User');

class EnhancedPermissionService extends EventEmitter {
  constructor() {
    super();

    // 多层缓存系统
    this.permissionCache = new NodeCache({ stdTTL: 300 }); // 5分钟
    this.roleCache = new NodeCache({ stdTTL: 600 }); // 10分钟
    this.userSessionCache = new NodeCache({ stdTTL: 1800 }); // 30分钟

    // 权限策略配置
    this.policyConfig = {
      // 密码策略
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventReuse: 5,
        maxAge: 90 * 24 * 60 * 60 * 1000 // 90天
      },

      // 会话策略
      sessionPolicy: {
        maxConcurrentSessions: 3,
        idleTimeout: 30 * 60 * 1000, // 30分钟
        absoluteTimeout: 8 * 60 * 60 * 1000, // 8小时
        requireReauth: ['sensitive_operations', 'role_change']
      },

      // 访问控制策略
      accessPolicy: {
        maxFailedAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15分钟
        ipWhitelist: [],
        deviceTrust: true,
        geoFencing: false
      },

      // 审计策略
      auditPolicy: {
        logLevel: 'detailed',
        retentionPeriod: 365 * 24 * 60 * 60 * 1000, // 1年
        realTimeAlerts: true,
        suspiciousActivityThreshold: 10
      }
    };

    // 权限继承规则
    this.inheritanceRules = {
      // 村级管理员继承所有下级权限
      [PermissionLevels.VILLAGE_ADMIN]: {
        inheritsFrom: [PermissionLevels.DEPARTMENT_HEAD],
        additionalPermissions: ['village:*', 'system:config', 'emergency:*']
      },

      // 部门主管继承工作人员权限
      [PermissionLevels.DEPARTMENT_HEAD]: {
        inheritsFrom: [PermissionLevels.STAFF],
        additionalPermissions: ['staff:*', 'report:*', 'task:assign']
      },

      // 工作人员继承村民权限
      [PermissionLevels.STAFF]: {
        inheritsFrom: [PermissionLevels.VILLAGER],
        additionalPermissions: ['resident:*', 'service:*']
      }
    };

    // 动态权限规则
    this.dynamicPermissionRules = new Map();
    this.setupDynamicRules();
  }

  /**
   * 设置动态权限规则
   */
  setupDynamicRules() {
    // 基于时间的权限规则
    this.dynamicPermissionRules.set('time_based', {
      name: '时间访问控制',
      description: '基于时间段限制访问权限',
      evaluate: (user, resource, action, context) => {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();

        // 工作时间限制（周一至周五 8:00-18:00）
        if (resource.startsWith('finance:') && action === 'approve') {
          const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;
          const isWorkHours = hour >= 8 && hour < 18;
          return isWorkday && isWorkHours;
        }

        return true;
      }
    });

    // 基于位置的权限规则
    this.dynamicPermissionRules.set('location_based', {
      name: '位置访问控制',
      description: '基于地理位置限制访问权限',
      evaluate: (user, resource, action, context) => {
        if (!context.location || !user.village) {
          return true;
        }

        // 只能在本村内访问敏感资源
        if (resource.startsWith('resident:') || resource.startsWith('household:')) {
          const isInVillage = context.location.villageId === user.village.villageId;
          return isInVillage;
        }

        return true;
      }
    });

    // 基于设备信任的权限规则
    this.dynamicPermissionRules.set('device_trust', {
      name: '设备信任控制',
      description: '基于设备信任级别限制权限',
      evaluate: (user, resource, action, context) => {
        if (!context.device || !context.device.trustLevel) {
          return resource === 'read' ? true : false;
        }

        // 高敏感操作需要可信设备
        const highSensitiveResources = [
          'system:config', 'user:delete', 'finance:approve',
          'village:delete', 'emergency:dispatch'
        ];

        if (highSensitiveResources.some(r => resource.startsWith(r.split(':')[0]))) {
          return context.device.trustLevel === 'trusted';
        }

        return true;
      }
    });

    // 基于操作频率的权限规则
    this.dynamicPermissionRules.set('rate_limit', {
      name: '操作频率限制',
      description: '基于操作频率限制权限',
      evaluate: (user, resource, action, context) => {
        const cacheKey = `rate_limit_${user._id}_${resource}_${action}`;
        const recentOperations = this.userSessionCache.get(cacheKey) || [];
        const now = Date.now();

        // 清理过期记录（1小时内）
        const validOperations = recentOperations.filter(
          timestamp => now - timestamp < 60 * 60 * 1000
        );

        // 普通操作限制：每小时100次
        if (validOperations.length >= 100) {
          return false;
        }

        // 敏感操作限制：每小时10次
        const sensitiveOperations = ['create', 'delete', 'approve'];
        if (sensitiveOperations.includes(action) && validOperations.length >= 10) {
          return false;
        }

        // 记录当前操作
        validOperations.push(now);
        this.userSessionCache.set(cacheKey, validOperations);

        return true;
      }
    });
  }

  /**
   * 增强的用户认证
   * @param {Object} authData - 认证数据
   * @returns {Promise<Object>} 认证结果
   */
  async enhancedAuthenticate(authData) {
    try {
      const {
        username,
        password,
        deviceId,
        deviceFingerprint,
        ipAddress,
        userAgent,
        location,
        mfaToken = null
      } = authData;

      // 1. 基础身份验证
      const user = await this.validateUserCredentials(username, password);
      if (!user) {
        await this.handleAuthenticationFailure(username, ipAddress, deviceId);
        throw new Error('用户名或密码错误');
      }

      // 2. 检查账户状态
      if (!this.isAccountActive(user)) {
        throw new Error('账户已被禁用或锁定');
      }

      // 3. 多因素认证验证（如果启用）
      if (user.mfaEnabled) {
        if (!mfaToken) {
          return {
            success: false,
            requiresMFA: true,
            mfaMethods: user.mfaMethods || ['totp']
          };
        }

        const mfaValid = await this.validateMFA(user, mfaToken);
        if (!mfaValid) {
          throw new Error('多因素认证失败');
        }
      }

      // 4. 设备信任验证
      const deviceTrust = await this.evaluateDeviceTrust(user, deviceId, deviceFingerprint);

      // 5. 地理位置验证（如果启用）
      if (this.policyConfig.accessPolicy.geoFencing) {
        const locationValid = await this.validateLocation(user, location);
        if (!locationValid) {
          throw new Error('访问位置不被允许');
        }
      }

      // 6. 创建会话
      const session = await this.createSecureSession(user, {
        deviceId,
        deviceFingerprint,
        ipAddress,
        userAgent,
        location,
        deviceTrust,
        loginTime: new Date()
      });

      // 7. 记录成功登录
      await this.recordAuthenticationEvent({
        user,
        event: 'LOGIN_SUCCESS',
        context: {
          deviceId,
          ipAddress,
          userAgent,
          location,
          deviceTrust
        }
      });

      // 8. 清理失败登录记录
      await this.clearFailedLoginAttempts(username);

      return {
        success: true,
        user,
        session,
        permissions: await this.getEnhancedUserPermissions(user),
        deviceTrust
      };

    } catch (error) {
      logger.error('增强认证失败:', error);
      await this.recordAuthenticationEvent({
        user: { username: authData.username },
        event: 'LOGIN_FAILED',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 增强的权限检查
   * @param {Object} user - 用户对象
   * @param {String} resource - 资源
   * @param {String} action - 操作
   * @param {Object} context - 上下文
   * @returns {Promise<Object>} 权限检查结果
   */
  async enhancedPermissionCheck(user, resource, action, context = {}) {
    try {
      const startTime = Date.now();

      // 1. 基础权限检查
      const basePermissions = await this.getUserPermissions(user);
      const hasBasePermission = this.checkBasePermissions(basePermissions, resource, action);

      if (!hasBasePermission) {
        await this.recordPermissionEvent({
          user,
          resource,
          action,
          result: 'DENIED',
          reason: 'BASE_PERMISSION_MISSING',
          context,
          duration: Date.now() - startTime
        });

        return {
          allowed: false,
          reason: 'BASE_PERMISSION_MISSING',
          policyApplied: []
        };
      }

      // 2. 动态权限规则检查
      const appliedPolicies = [];
      for (const [policyId, policy] of this.dynamicPermissionRules) {
        try {
          const policyResult = policy.evaluate(user, resource, action, context);
          if (!policyResult) {
            appliedPolicies.push({
              policyId,
              policyName: policy.name,
              decision: 'DENIED',
              reason: '动态权限规则拒绝'
            });

            await this.recordPermissionEvent({
              user,
              resource,
              action,
              result: 'DENIED',
              reason: `DYNAMIC_POLICY_${policyId}`,
              appliedPolicies,
              context,
              duration: Date.now() - startTime
            });

            return {
              allowed: false,
              reason: `DYNAMIC_POLICY_${policyId}`,
              policyApplied: appliedPolicies
            };
          } else {
            appliedPolicies.push({
              policyId,
              policyName: policy.name,
              decision: 'ALLOWED'
            });
          }
        } catch (error) {
          logger.error(`动态权限规则 ${policyId} 执行失败:`, error);
        }
      }

      // 3. 权限继承检查
      const inheritedPermissions = await this.getInheritedPermissions(user);
      const hasInheritedPermission = this.checkBasePermissions(inheritedPermissions, resource, action);

      // 4. 最终权限决定
      const allowed = hasBasePermission || hasInheritedPermission;

      await this.recordPermissionEvent({
        user,
        resource,
        action,
        result: allowed ? 'ALLOWED' : 'DENIED',
        basePermissions: hasBasePermission,
        inheritedPermissions: hasInheritedPermission,
        policyApplied: appliedPolicies,
        context,
        duration: Date.now() - startTime
      });

      return {
        allowed,
        basePermissions: hasBasePermission,
        inheritedPermissions: hasInheritedPermission,
        policyApplied: appliedPolicies
      };

    } catch (error) {
      logger.error('增强权限检查失败:', error);
      return {
        allowed: false,
        reason: 'PERMISSION_CHECK_ERROR',
        error: error.message
      };
    }
  }

  /**
   * 获取增强的用户权限（包括继承权限）
   * @param {Object} user - 用户对象
   * @returns {Promise<Array>} 权限列表
   */
  async getEnhancedUserPermissions(user) {
    try {
      const cacheKey = `enhanced_permissions_${user._id}`;

      // 检查缓存
      if (this.permissionCache.has(cacheKey)) {
        return this.permissionCache.get(cacheKey);
      }

      // 获取基础权限
      const basePermissions = await this.getUserPermissions(user);

      // 获取继承权限
      const inheritedPermissions = await this.getInheritedPermissions(user);

      // 合并权限
      const allPermissions = [...new Set([...basePermissions, ...inheritedPermissions])];

      // 缓存结果
      this.permissionCache.set(cacheKey, allPermissions);

      return allPermissions;

    } catch (error) {
      logger.error('获取增强用户权限失败:', error);
      return [];
    }
  }

  /**
   * 获取继承权限
   * @param {Object} user - 用户对象
   * @returns {Promise<Array>} 继承权限列表
   */
  async getInheritedPermissions(user) {
    try {
      const inheritedPermissions = [];
      const userRole = user.role;

      // 检查是否有继承规则
      const inheritanceRule = this.inheritanceRules[userRole];
      if (!inheritanceRule) {
        return inheritedPermissions;
      }

      // 递归获取继承权限
      for (const parentRole of inheritanceRule.inheritsFrom) {
        const mockParentUser = { ...user, role: parentRole };
        const parentPermissions = await this.getUserPermissions(mockParentUser);
        inheritedPermissions.push(...parentPermissions);
      }

      // 添加额外权限
      inheritedPermissions.push(...inheritanceRule.additionalPermissions);

      return inheritedPermissions;

    } catch (error) {
      logger.error('获取继承权限失败:', error);
      return [];
    }
  }

  /**
   * 创建权限策略
   * @param {Object} policyData - 策略数据
   * @returns {Promise<Object>} 创建结果
   */
  async createPermissionPolicy(policyData) {
    try {
      const {
        name,
        description,
        rules,
        conditions,
        targetRoles,
        priority = 'medium',
        enabled = true
      } = policyData;

      // 验证规则
      for (const rule of rules) {
        if (!this.dynamicPermissionRules.has(rule.type)) {
          throw new Error(`不支持的规则类型: ${rule.type}`);
        }
      }

      // 创建策略对象
      const policy = {
        id: crypto.randomUUID(),
        name,
        description,
        rules,
        conditions,
        targetRoles,
        priority,
        enabled,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 保存策略（这里应该保存到数据库）
      await this.savePermissionPolicy(policy);

      // 清除相关缓存
      this.clearPermissionCache();

      logger.info('权限策略创建成功:', policy.id);

      return {
        success: true,
        policy
      };

    } catch (error) {
      logger.error('创建权限策略失败:', error);
      throw error;
    }
  }

  /**
   * 权限继承配置
   * @param {Object} config - 继承配置
   * @returns {Promise<Object>} 配置结果
   */
  async configurePermissionInheritance(config) {
    try {
      const { role, inheritsFrom, additionalPermissions, conditions } = config;

      // 验证角色存在
      if (!Object.values(PermissionLevels).includes(role)) {
        throw new Error(`无效的角色: ${role}`);
      }

      // 验证继承角色
      for (const parentRole of inheritsFrom) {
        if (!Object.values(PermissionLevels).includes(parentRole)) {
          throw new Error(`无效的继承角色: ${parentRole}`);
        }
      }

      // 更新继承规则
      this.inheritanceRules[role] = {
        inheritsFrom,
        additionalPermissions: additionalPermissions || [],
        conditions: conditions || {}
      };

      // 清除权限缓存
      this.clearPermissionCache();

      logger.info('权限继承配置更新:', role);

      return {
        success: true,
        message: `角色 ${role} 的权限继承配置已更新`
      };

    } catch (error) {
      logger.error('配置权限继承失败:', error);
      throw error;
    }
  }

  /**
   * 会话管理
   * @param {String} sessionId - 会话ID
   * @param {Object} sessionData - 会话数据
   * @returns {Promise<Object>} 会话结果
   */
  async manageSession(sessionId, sessionData) {
    try {
      const session = this.userSessionCache.get(sessionId);

      if (!session) {
        throw new Error('会话不存在或已过期');
      }

      // 检查会话有效性
      const now = Date.now();
      const idleTime = now - session.lastActivity;
      const totalTime = now - session.createdAt;

      // 检查空闲超时
      if (idleTime > this.policyConfig.sessionPolicy.idleTimeout) {
        this.userSessionCache.del(sessionId);
        throw new Error('会话因空闲时间过长已过期');
      }

      // 检查绝对超时
      if (totalTime > this.policyConfig.sessionPolicy.absoluteTimeout) {
        this.userSessionCache.del(sessionId);
        throw new Error('会话已过期');
      }

      // 更新会话活动时间
      session.lastActivity = now;
      session.data = { ...session.data, ...sessionData };
      this.userSessionCache.set(sessionId, session);

      return {
        valid: true,
        session,
        remainingTime: this.policyConfig.sessionPolicy.absoluteTimeout - totalTime
      };

    } catch (error) {
      logger.error('会话管理失败:', error);
      throw error;
    }
  }

  /**
   * 实时权限更新
   * @param {String} userId - 用户ID
   * @param {Array} newPermissions - 新权限
   * @returns {Promise<Object>} 更新结果
   */
  async updatePermissionsRealtime(userId, newPermissions) {
    try {
      // 更新数据库中的权限
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      user.permissions = newPermissions;
      await user.save();

      // 清除用户权限缓存
      const cacheKeys = [
        `user_permissions_${userId}`,
        `enhanced_permissions_${userId}`
      ];

      cacheKeys.forEach(key => {
        this.permissionCache.del(key);
      });

      // 通知其他服务实例权限更新
      this.emit('permission_update', {
        userId,
        permissions: newPermissions,
        timestamp: new Date()
      });

      logger.info('用户权限实时更新成功:', userId);

      return {
        success: true,
        message: '权限更新成功'
      };

    } catch (error) {
      logger.error('实时权限更新失败:', error);
      throw error;
    }
  }

  /**
   * 权限审计报告
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 审计报告
   */
  async generatePermissionAuditReport(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        userId,
        resource,
        action,
        result
      } = filters;

      // 构建查询条件
      const query = {
        operation: 'PERMISSION_CHECK',
        timestamp: {
          $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate || new Date()
        }
      };

      if (userId) query['actor.userId'] = userId;
      if (resource) query.resource = resource;
      if (action) query.action = action;
      if (result) query.result = result;

      // 查询审计日志
      const auditLogs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(10000);

      // 生成报告
      const report = {
        summary: {
          totalChecks: auditLogs.length,
          allowedCount: auditLogs.filter(log => log.result === 'ALLOWED').length,
          deniedCount: auditLogs.filter(log => log.result === 'DENIED').length,
          averageResponseTime: auditLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / auditLogs.length
        },
        resources: this.groupByResource(auditLogs),
        users: this.groupByUser(auditLogs),
        policies: this.groupByPolicy(auditLogs),
        timeDistribution: this.groupByTime(auditLogs),
        topDenials: this.getTopDenials(auditLogs),
        suspiciousActivity: this.detectSuspiciousActivity(auditLogs)
      };

      return {
        success: true,
        report,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('生成权限审计报告失败:', error);
      throw error;
    }
  }

  // ========== 私有方法 ==========

  /**
   * 验证用户凭证
   */
  async validateUserCredentials(username, password) {
    try {
      const user = await User.findOne({
        $or: [
          { 'auth.username': username },
          { email: username },
          { phone: username }
        ]
      }).populate('village');

      if (!user || !user.auth) {
        return null;
      }

      // 验证密码
      const bcrypt = require('bcrypt');
      const passwordMatch = await bcrypt.compare(password, user.auth.password);

      return passwordMatch ? user : null;

    } catch (error) {
      logger.error('验证用户凭证失败:', error);
      return null;
    }
  }

  /**
   * 检查账户状态
   */
  isAccountActive(user) {
    return user.status === 'active' && !user.lockedUntil;
  }

  /**
   * 验证多因素认证
   */
  async validateMFA(user, mfaToken) {
    // 这里应该集成真实的MFA验证服务
    // 简化实现
    return true;
  }

  /**
   * 评估设备信任
   */
  async evaluateDeviceTrust(user, deviceId, deviceFingerprint) {
    try {
      const deviceKey = `device_trust_${user._id}_${deviceId}`;
      const cachedDevice = this.userSessionCache.get(deviceKey);

      if (cachedDevice) {
        return {
          trustLevel: cachedDevice.trustLevel,
          lastUsed: cachedDevice.lastUsed
        };
      }

      // 新设备评估
      const trustLevel = deviceFingerprint ? 'trusted' : 'unknown';

      const deviceInfo = {
        trustLevel,
        lastUsed: new Date(),
        firstSeen: new Date()
      };

      this.userSessionCache.set(deviceKey, deviceInfo);

      return deviceInfo;

    } catch (error) {
      logger.error('评估设备信任失败:', error);
      return { trustLevel: 'unknown' };
    }
  }

  /**
   * 验证地理位置
   */
  async validateLocation(user, location) {
    // 简化实现，实际应该与用户注册位置进行比较
    return true;
  }

  /**
   * 创建安全会话
   */
  async createSecureSession(user, sessionData) {
    const sessionId = crypto.randomUUID();
    const sessionToken = jwt.sign(
      {
        userId: user._id,
        sessionId,
        createdAt: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const session = {
      sessionId,
      token: sessionToken,
      userId: user._id,
      deviceData: sessionData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      permissions: await this.getEnhancedUserPermissions(user)
    };

    this.userSessionCache.set(sessionId, session);

    return session;
  }

  /**
   * 基础权限检查
   */
  checkBasePermissions(permissions, resource, action) {
    return permissions.includes(`${resource}:${action}`) ||
           permissions.includes(`*:${action}`) ||
           permissions.includes(`${resource}:*`) ||
           permissions.some(permission => {
             const [res, acts] = permission.split(':');
             return (res === resource || res === '*') &&
                    acts.split(',').includes(action);
           });
  }

  /**
   * 记录认证事件
   */
  async recordAuthenticationEvent(eventData) {
    try {
      await AuditLog.logOperation({
        operation: 'AUTHENTICATION',
        resource: 'USER_SESSION',
        action: eventData.event,
        actor: eventData.user,
        system: 'authentication',
        ipAddress: eventData.context?.ipAddress,
        userAgent: eventData.context?.userAgent,
        deviceId: eventData.context?.deviceId,
        result: {
          status: eventData.event === 'LOGIN_SUCCESS' ? 'SUCCESS' : 'FAILED'
        },
        error: eventData.error
      });
    } catch (error) {
      logger.error('记录认证事件失败:', error);
    }
  }

  /**
   * 记录权限事件
   */
  async recordPermissionEvent(eventData) {
    try {
      await AuditLog.logOperation({
        operation: 'PERMISSION_CHECK',
        resource: eventData.resource,
        action: eventData.action,
        actor: eventData.user,
        result: {
          status: eventData.result,
          basePermissions: eventData.basePermissions,
          inheritedPermissions: eventData.inheritedPermissions,
          appliedPolicies: eventData.policyApplied
        },
        context: eventData.context,
        duration: eventData.duration
      });
    } catch (error) {
      logger.error('记录权限事件失败:', error);
    }
  }

  /**
   * 清理权限缓存
   */
  clearPermissionCache() {
    this.permissionCache.flushAll();
    this.roleCache.flushAll();
    this.emit('cache_cleared');
  }

  /**
   * 审计报告辅助方法
   */
  groupByResource(logs) {
    const grouped = {};
    logs.forEach(log => {
      if (!grouped[log.resource]) {
        grouped[log.resource] = { total: 0, allowed: 0, denied: 0 };
      }
      grouped[log.resource].total++;
      grouped[log.resource][log.result.toLowerCase() === 'allowed' ? 'allowed' : 'denied']++;
    });
    return grouped;
  }

  groupByUser(logs) {
    const grouped = {};
    logs.forEach(log => {
      const userId = log.actor?.userId || 'unknown';
      if (!grouped[userId]) {
        grouped[userId] = { total: 0, allowed: 0, denied: 0 };
      }
      grouped[userId].total++;
      grouped[userId][log.result.toLowerCase() === 'allowed' ? 'allowed' : 'denied']++;
    });
    return grouped;
  }

  groupByPolicy(logs) {
    const grouped = {};
    logs.forEach(log => {
      if (log.result?.policyApplied) {
        log.result.policyApplied.forEach(policy => {
          if (!grouped[policy.policyId]) {
            grouped[policy.policyId] = { name: policy.policyName, count: 0 };
          }
          grouped[policy.policyId].count++;
        });
      }
    });
    return grouped;
  }

  groupByTime(logs) {
    const hourly = {};
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    });
    return hourly;
  }

  getTopDenials(logs) {
    const denials = logs.filter(log => log.result === 'DENIED');
    const reasons = {};

    denials.forEach(log => {
      const reason = log.reason || 'UNKNOWN';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });

    return Object.entries(reasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
  }

  detectSuspiciousActivity(logs) {
    const suspicious = [];

    // 检测频繁拒绝
    const userDenials = {};
    logs.forEach(log => {
      if (log.result === 'DENIED') {
        const userId = log.actor?.userId || 'unknown';
        userDenials[userId] = (userDenials[userId] || 0) + 1;
      }
    });

    Object.entries(userDenials).forEach(([userId, count]) => {
      if (count >= this.policyConfig.auditPolicy.suspiciousActivityThreshold) {
        suspicious.push({
          type: 'FREquent_Denials',
          userId,
          count,
          threshold: this.policyConfig.auditPolicy.suspiciousActivityThreshold
        });
      }
    });

    return suspicious;
  }
}

module.exports = EnhancedPermissionService;