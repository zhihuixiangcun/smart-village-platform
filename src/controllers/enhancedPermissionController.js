/**
 * 增强权限管理控制器
 * 提供RBAC权限管理、动态权限策略、权限继承等功能
 */

const EnhancedPermissionService = require('../services/enhancedPermissionService');
const logger = require('../config/logger');
const auditMiddleware = require('../middleware/auditMiddleware');

// 初始化增强权限服务
const enhancedPermissionService = new EnhancedPermissionService();

class EnhancedPermissionController {
  /**
   * 增强用户认证
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async enhancedAuthenticate(req, res) {
    try {
      const {
        username,
        password,
        deviceId,
        deviceFingerprint,
        mfaToken
      } = req.body;

      const authData = {
        username,
        password,
        deviceId,
        deviceFingerprint,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        location: req.body.location,
        mfaToken
      };

      const result = await enhancedPermissionService.enhancedAuthenticate(authData);

      if (result.success) {
        res.json({
          success: true,
          data: {
            user: {
              id: result.user._id,
              username: result.user.auth?.username || result.user.email,
              role: result.user.role,
              displayName: result.user.profile?.displayName,
              village: result.user.village
            },
            session: {
              sessionId: result.session.sessionId,
              token: result.session.token,
              expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
            },
            permissions: result.permissions,
            deviceTrust: result.deviceTrust
          },
          message: '认证成功'
        });
      } else if (result.requiresMFA) {
        res.status(200).json({
          success: false,
          requiresMFA: true,
          mfaMethods: result.mfaMethods,
          message: '需要多因素认证'
        });
      }

    } catch (error) {
      logger.error('增强认证失败:', error);
      res.status(401).json({
        success: false,
        message: error.message || '认证失败'
      });
    }
  }

  /**
   * 权限检查
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async checkPermission(req, res) {
    try {
      const { resource, action, context = {} } = req.body;
      const user = req.user;

      if (!resource || !action) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: resource 和 action'
        });
      }

      // 添加请求上下文
      const enhancedContext = {
        ...context,
        deviceId: req.get('X-Device-Id'),
        deviceFingerprint: req.get('X-Device-Fingerprint'),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        location: req.body.location
      };

      const result = await enhancedPermissionService.enhancedPermissionCheck(
        user,
        resource,
        action,
        enhancedContext
      );

      res.json({
        success: true,
        data: result,
        message: result.allowed ? '权限验证通过' : '权限验证失败'
      });

    } catch (error) {
      logger.error('权限检查失败:', error);
      res.status(500).json({
        success: false,
        message: '权限检查失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户权限
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getUserPermissions(req, res) {
    try {
      const user = req.user;
      const permissions = await enhancedPermissionService.getEnhancedUserPermissions(user);

      res.json({
        success: true,
        data: {
          userId: user._id,
          role: user.role,
          permissions,
          count: permissions.length
        },
        message: '获取用户权限成功'
      });

    } catch (error) {
      logger.error('获取用户权限失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户权限失败',
        error: error.message
      });
    }
  }

  /**
   * 创建权限策略
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async createPermissionPolicy(req, res) {
    try {
      // 检查管理员权限
      if (!req.user.hasPermission('system:config')) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const {
        name,
        description,
        rules,
        conditions,
        targetRoles,
        priority,
        enabled
      } = req.body;

      if (!name || !rules || !Array.isArray(rules)) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: name 和 rules'
        });
      }

      const result = await enhancedPermissionService.createPermissionPolicy({
        name,
        description,
        rules,
        conditions,
        targetRoles,
        priority,
        enabled
      });

      res.json({
        success: result.success,
        data: result.policy,
        message: result.success ? '权限策略创建成功' : '权限策略创建失败'
      });

    } catch (error) {
      logger.error('创建权限策略失败:', error);
      res.status(500).json({
        success: false,
        message: '创建权限策略失败',
        error: error.message
      });
    }
  }

  /**
   * 配置权限继承
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async configurePermissionInheritance(req, res) {
    try {
      // 检查管理员权限
      if (!req.user.hasPermission('system:config')) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const {
        role,
        inheritsFrom,
        additionalPermissions,
        conditions
      } = req.body;

      if (!role || !inheritsFrom) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: role 和 inheritsFrom'
        });
      }

      const result = await enhancedPermissionService.configurePermissionInheritance({
        role,
        inheritsFrom,
        additionalPermissions,
        conditions
      });

      res.json({
        success: result.success,
        message: result.message
      });

    } catch (error) {
      logger.error('配置权限继承失败:', error);
      res.status(500).json({
        success: false,
        message: '配置权限继承失败',
        error: error.message
      });
    }
  }

  /**
   * 会话管理
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async manageSession(req, res) {
    try {
      const sessionId = req.get('X-Session-Id') || req.body.sessionId;
      const sessionData = req.body.sessionData || {};

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: '缺少会话ID'
        });
      }

      const result = await enhancedPermissionService.manageSession(sessionId, sessionData);

      if (result.valid) {
        res.json({
          success: true,
          data: {
            valid: true,
            remainingTime: result.remainingTime,
            lastActivity: result.session.lastActivity
          },
          message: '会话有效'
        });
      } else {
        res.status(401).json({
          success: false,
          message: '会话无效或已过期'
        });
      }

    } catch (error) {
      logger.error('会话管理失败:', error);
      res.status(500).json({
        success: false,
        message: '会话管理失败',
        error: error.message
      });
    }
  }

  /**
   * 实时更新权限
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async updatePermissionsRealtime(req, res) {
    try {
      // 检查管理员权限
      if (!req.user.hasPermission('user:manage')) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const { userId, permissions } = req.body;

      if (!userId || !permissions) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: userId 和 permissions'
        });
      }

      const result = await enhancedPermissionService.updatePermissionsRealtime(userId, permissions);

      res.json({
        success: result.success,
        message: result.message
      });

    } catch (error) {
      logger.error('实时更新权限失败:', error);
      res.status(500).json({
        success: false,
        message: '实时更新权限失败',
        error: error.message
      });
    }
  }

  /**
   * 生成权限审计报告
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async generatePermissionAuditReport(req, res) {
    try {
      // 检查审计权限
      if (!req.user.hasPermission('system:audit')) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const {
        startDate,
        endDate,
        userId,
        resource,
        action,
        result
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        userId,
        resource,
        action,
        result
      };

      const reportResult = await enhancedPermissionService.generatePermissionAuditReport(filters);

      res.json({
        success: reportResult.success,
        data: reportResult.report,
        generatedAt: reportResult.generatedAt,
        message: '审计报告生成成功'
      });

    } catch (error) {
      logger.error('生成权限审计报告失败:', error);
      res.status(500).json({
        success: false,
        message: '生成权限审计报告失败',
        error: error.message
      });
    }
  }

  /**
   * 获取权限策略列表
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getPermissionPolicies(req, res) {
    try {
      // 这里应该从数据库获取策略列表
      // 简化实现，返回动态权限规则
      const policies = Array.from(enhancedPermissionService.dynamicPermissionRules.entries()).map(([id, policy]) => ({
        id,
        name: policy.name,
        description: policy.description,
        enabled: true,
        type: 'dynamic'
      }));

      res.json({
        success: true,
        data: policies,
        message: '获取权限策略成功'
      });

    } catch (error) {
      logger.error('获取权限策略失败:', error);
      res.status(500).json({
        success: false,
        message: '获取权限策略失败',
        error: error.message
      });
    }
  }

  /**
   * 获取权限继承配置
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getPermissionInheritanceConfig(req, res) {
    try {
      res.json({
        success: true,
        data: enhancedPermissionService.inheritanceRules,
        message: '获取权限继承配置成功'
      });

    } catch (error) {
      logger.error('获取权限继承配置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取权限继承配置失败',
        error: error.message
      });
    }
  }

  /**
   * 清理权限缓存
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async clearPermissionCache(req, res) {
    try {
      // 检查管理员权限
      if (!req.user.hasPermission('system:config')) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      enhancedPermissionService.clearPermissionCache();

      res.json({
        success: true,
        message: '权限缓存清理成功'
      });

    } catch (error) {
      logger.error('清理权限缓存失败:', error);
      res.status(500).json({
        success: false,
        message: '清理权限缓存失败',
        error: error.message
      });
    }
  }

  /**
   * 批量权限检查
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async batchCheckPermissions(req, res) {
    try {
      const { permissions } = req.body;
      const user = req.user;

      if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: '缺少权限列表参数'
        });
      }

      if (permissions.length > 100) {
        return res.status(400).json({
          success: false,
          message: '批量检查最多支持100个权限'
        });
      }

      const results = [];
      const enhancedContext = {
        deviceId: req.get('X-Device-Id'),
        deviceFingerprint: req.get('X-Device-Fingerprint'),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      for (const perm of permissions) {
        try {
          const result = await enhancedPermissionService.enhancedPermissionCheck(
            user,
            perm.resource,
            perm.action,
            { ...enhancedContext, ...perm.context }
          );

          results.push({
            resource: perm.resource,
            action: perm.action,
            allowed: result.allowed,
            reason: result.reason,
            policyApplied: result.policyApplied
          });
        } catch (error) {
          results.push({
            resource: perm.resource,
            action: perm.action,
            allowed: false,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          total: permissions.length,
          results
        },
        message: '批量权限检查完成'
      });

    } catch (error) {
      logger.error('批量权限检查失败:', error);
      res.status(500).json({
        success: false,
        message: '批量权限检查失败',
        error: error.message
      });
    }
  }

  /**
   * 获取权限统计
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getPermissionStats(req, res) {
    try {
      // 检查管理员权限
      if (!req.user.hasPermission('system:audit')) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      // 这里应该从数据库获取真实统计数据
      // 简化实现，返回模拟数据
      const stats = {
        totalUsers: 1250,
        totalRoles: 6,
        totalPolicies: 8,
        activeSessions: 342,
        dailyPermissionChecks: 15420,
        weeklyDeniedAttempts: 234,
        permissionDistribution: {
          [PermissionLevels.SUPER_ADMIN]: 1,
          [PermissionLevels.VILLAGE_ADMIN]: 45,
          [PermissionLevels.DEPARTMENT_HEAD]: 23,
          [PermissionLevels.STAFF]: 156,
          [PermissionLevels.VILLAGER]: 1025
        },
        topResources: [
          { resource: 'user', checks: 3421, denials: 45 },
          { resource: 'resident', checks: 2890, denials: 23 },
          { resource: 'finance', checks: 1876, denials: 67 },
          { resource: 'household', checks: 1654, denials: 12 }
        ]
      };

      res.json({
        success: true,
        data: stats,
        message: '获取权限统计成功'
      });

    } catch (error) {
      logger.error('获取权限统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取权限统计失败',
        error: error.message
      });
    }
  }
}

module.exports = new EnhancedPermissionController();