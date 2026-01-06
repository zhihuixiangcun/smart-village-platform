/**
 * permissionHelper.js - 权限工具类
 *
 * 提供权限检查、角色验证、数据范围控制等工具函数
 */

const { getRolePermissions, getRoleDataScope, checkApprovalRequired, isSensitiveOperation } = require('../config/permissions');

/**
 * PermissionHelper 类
 */
class PermissionHelper {
  /**
   * 检查用户是否有指定权限
   * @param {Object} userRole - 用户角色分配对象
   * @param {string} permission - 权限代码
   * @returns {boolean}
   */
  static hasPermission(userRole, permission) {
    if (!userRole || !permission) {
      return false;
    }

    // 获取所有权限（角色权限 + 自定义权限）
    const allPermissions = userRole.permissions || [];
    const customPerms = userRole.customPermissions || [];

    // 检查是否有通配符权限
    if (allPermissions.includes('*') || customPerms.includes('*')) {
      return true;
    }

    // 检查是否有特定权限
    return allPermissions.includes(permission) || customPerms.includes(permission);
  }

  /**
   * 检查用户是否有任一权限
   * @param {Object} userRole - 用户角色分配对象
   * @param {string[]} permissions - 权限代码数组
   * @returns {boolean}
   */
  static hasAnyPermission(userRole, permissions) {
    if (!userRole || !permissions || permissions.length === 0) {
      return false;
    }

    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  /**
   * 检查用户是否有所有权限
   * @param {Object} userRole - 用户角色分配对象
   * @param {string[]} permissions - 权限代码数组
   * @returns {boolean}
   */
  static hasAllPermissions(userRole, permissions) {
    if (!userRole || !permissions || permissions.length === 0) {
      return false;
    }

    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  /**
   * 检查操作是否需要审批
   * @param {Object} userRole - 用户角色分配对象
   * @param {string} permission - 权限代码
   * @param {Object} context - 上下文数据
   * @returns {Object} { required: boolean, config: Object|null }
   */
  static checkApprovalNeeded(userRole, permission, context = {}) {
    // 首先检查权限
    if (!this.hasPermission(userRole, permission)) {
      return {
        required: false,
        hasPermission: false,
        message: '权限不足'
      };
    }

    // 检查角色限制的审批要求
    if (userRole.restrictions && userRole.restrictions.approvalRequired) {
      if (userRole.restrictions.approvalRequired.includes(permission)) {
        return {
          required: true,
          hasPermission: true,
          reason: 'role_restriction',
          message: '该操作需要上级审批'
        };
      }
    }

    // 检查全局审批配置
    const approvalConfig = checkApprovalRequired(permission, context);
    if (approvalConfig) {
      return {
        required: true,
        hasPermission: true,
        reason: 'permission_config',
        config: approvalConfig,
        message: approvalConfig.reason || approvalConfig.condition?.message || '该操作需要审批'
      };
    }

    return {
      required: false,
      hasPermission: true
    };
  }

  /**
   * 检查数据访问权限
   * @param {Object} userRole - 用户角色分配对象
   * @param {string} targetUserId - 目标用户ID
   * @param {string} userUserId - 当前用户ID
   * @returns {boolean}
   */
  static canAccessData(userRole, targetUserId, userUserId) {
    if (!userRole) {
      return false;
    }

    const dataScope = userRole.restrictions?.dataScope || 'department';

    switch (dataScope) {
      case 'all':
        return true;
      case 'self':
        return targetUserId === userUserId;
      case 'department':
      default:
        // 部门级别需要根据具体业务逻辑判断
        // 这里默认返回true，实际应该检查是否同一村庄/部门
        return true;
    }
  }

  /**
   * 检查每日限额
   * @param {Object} userRole - 用户角色分配对象
   * @param {string} operation - 操作类型
   * @param {number} amount - 金额
   * @returns {Object} { allowed: boolean, remaining: number, limit: number }
   */
  static checkDailyLimit(userRole, operation, amount = 0) {
    if (!userRole || !userRole.restrictions || !userRole.restrictions.dailyLimit) {
      return { allowed: true, remaining: null };
    }

    const dailyLimit = userRole.restrictions.dailyLimit;

    if (dailyLimit.operation !== operation) {
      return { allowed: true, remaining: null };
    }

    // 重置每日计数（如果需要）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(dailyLimit.lastReset);
    lastReset.setHours(0, 0, 0, 0);

    if (lastReset < today) {
      dailyLimit.currentAmount = 0;
      dailyLimit.lastReset = new Date();
    }

    const limit = dailyLimit.amount;
    const current = dailyLimit.currentAmount;
    const remaining = limit - current;
    const allowed = (current + amount) <= limit;

    return { allowed, remaining, limit, current };
  }

  /**
   * 检查是否为敏感操作
   * @param {string} permission - 权限代码
   * @returns {boolean}
   */
  static isSensitivePermission(permission) {
    return isSensitiveOperation(permission);
  }

  /**
   * 过滤敏感字段
   * @param {Object} data - 原始数据
   * @param {Object} userRole - 用户角色
   * @param {Array} sensitiveFields - 敏感字段列表
   * @returns {Object} 过滤后的数据
   */
  static filterSensitiveFields(data, userRole, sensitiveFields = ['idCard', 'phone', 'bankAccount']) {
    if (!data || !userRole) {
      return data;
    }

    // 村支书、村主任可以查看完整数据
    if (['secretary', 'village_head'].includes(userRole.roleCode)) {
      return data;
    }

    // 其他角色需要脱敏
    const filteredData = { ...data };

    sensitiveFields.forEach(field => {
      if (filteredData[field]) {
        filteredData[field] = this.maskSensitiveData(field, filteredData[field]);
      }
    });

    return filteredData;
  }

  /**
   * 脱敏敏感数据
   * @param {string} fieldType - 字段类型
   * @param {string} value - 原始值
   * @returns {string} 脱敏后的值
   */
  static maskSensitiveData(fieldType, value) {
    if (!value) {
      return value;
    }

    switch (fieldType) {
      case 'idCard':
        // 身份证号：保留前6后4
        return value.replace(/^(.{6})(.*)(.{4})$/, '$1********$3');

      case 'phone':
        // 手机号：保留前3后4
        return value.replace(/^(.{3})(.*)(.{4})$/, '$1****$3');

      case 'bankAccount':
        // 银行卡号：保留前4后4
        return value.replace(/^(.{4})(.*)(.{4})$/, '$1********$3');

      case 'name':
        // 姓名：保留姓氏
        return value.replace(/^(.{1})(.*)$/, '$1**');

      default:
        return '****';
    }
  }

  /**
   * 构建权限查询条件
   * @param {Object} userRole - 用户角色
   * @param {string} resourceType - 资源类型
   * @returns {Object} MongoDB查询条件
   */
  static buildPermissionQuery(userRole, resourceType) {
    const query = {};

    if (!userRole) {
      return query;
    }

    const dataScope = userRole.restrictions?.dataScope || 'department';

    switch (dataScope) {
      case 'all':
        // 无限制
        break;

      case 'self':
        // 只能查询自己的数据
        query.userId = userRole.userId;
        break;

      case 'department':
      default:
        // 部门级别：限制在村庄内
        query.villageId = userRole.villageId;
        break;
    }

    return query;
  }

  /**
   * 获取用户权限摘要
   * @param {Object} userRole - 用户角色分配对象
   * @returns {Object} 权限摘要
   */
  static getPermissionSummary(userRole) {
    if (!userRole) {
      return {
        role: null,
        permissions: [],
        canApprove: false,
        canExport: false,
        dataScope: 'self'
      };
    }

    const permissions = userRole.permissions || [];
    const customPerms = userRole.customPermissions || [];
    const allPerms = [...new Set([...permissions, ...customPerms])];

    return {
      role: userRole.roleCode,
      permissions: allPerms,
      permissionCount: allPerms.length,
      canApprove: allPerms.some(p => p.includes(':approve')),
      canExport: allPerms.some(p => p.includes(':export')),
      canDelete: allPerms.some(p => p.includes(':delete')),
      dataScope: userRole.restrictions?.dataScope || 'department',
      hasDailyLimit: !!userRole.restrictions?.dailyLimit
    };
  }

  /**
   * 验证操作权限并返回错误信息
   * @param {Object} userRole - 用户角色
   * @param {string} permission - 所需权限
   * @param {Object} options - 验证选项
   * @returns {Object} { valid: boolean, error: string|null }
   */
  static validatePermission(userRole, permission, options = {}) {
    const {
      targetUserId = null,
      currentUserId = null,
      amount = 0,
      operation = null
    } = options;

    // 检查基础权限
    if (!this.hasPermission(userRole, permission)) {
      return {
        valid: false,
        error: '权限不足',
        code: 'PERMISSION_DENIED'
      };
    }

    // 检查数据访问范围
    if (targetUserId && currentUserId) {
      if (!this.canAccessData(userRole, targetUserId, currentUserId)) {
        return {
          valid: false,
          error: '无权访问该数据',
          code: 'ACCESS_DENIED'
        };
      }
    }

    // 检查每日限额
    if (operation && amount > 0) {
      const limitCheck = this.checkDailyLimit(userRole, operation, amount);
      if (!limitCheck.allowed) {
        return {
          valid: false,
          error: `已超过每日限额 ${limitCheck.limit}`,
          code: 'DAILY_LIMIT_EXCEEDED',
          limit: limitCheck.limit,
          current: limitCheck.current
        };
      }
    }

    return { valid: true, error: null };
  }

  /**
   * 格式化权限列表
   * @param {string[]} permissions - 权限代码数组
   * @returns {Array} 格式化后的权限列表
   */
  static formatPermissions(permissions) {
    const { getPermissionName, parsePermission } = require('../config/permissions');

    return permissions.map(permission => {
      const { module, action } = parsePermission(permission);
      return {
        code: permission,
        name: getPermissionName(permission),
        module,
        action,
        isSensitive: isSensitiveOperation(permission)
      };
    });
  }

  /**
   * 按模块分组权限
   * @param {string[]} permissions - 权限代码数组
   * @returns {Object} 分组后的权限
   */
  static groupPermissionsByModule(permissions) {
    const { PERMISSION_MODULES, parsePermission } = require('../config/permissions');

    const grouped = {};

    // 初始化分组
    Object.values(PERMISSION_MODULES).forEach(module => {
      grouped[module] = [];
    });

    // 分组
    permissions.forEach(permission => {
      const { module } = parsePermission(permission);
      if (grouped[module]) {
        grouped[module].push(permission);
      }
    });

    // 移除空分组
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) {
        delete grouped[key];
      }
    });

    return grouped;
  }
}

module.exports = PermissionHelper;
