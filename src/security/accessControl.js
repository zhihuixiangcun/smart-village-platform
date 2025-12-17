/**
 * 智慧村庄平台 - 访问控制系统
 * 基于角色的访问控制 (RBAC) 和数据权限管理
 */

const logger = require('../utils/logger');

/**
 * 角色权限定义
 */
const ROLES = {
  SUPER_ADMIN: 'super_admin',        // 超级管理员
  VILLAGE_ADMIN: 'village_admin',    // 村庄管理员
  PARTY_SECRETARY: 'party_secretary', // 村支书
  COMMITTEE_MEMBER: 'committee_member', // 村委会成员
  VILLAGE_OFFICER: 'village_officer', // 村务人员
  ACCOUNTANT: 'accountant',          // 会计
  GRID_MANAGER: 'grid_manager',      // 网格员
  VOLUNTEER: 'volunteer',            // 志愿者
  RESIDENT: 'resident',              // 村民
  GUEST: 'guest'                     // 访客
};

/**
 * 权限级别定义
 */
const PERMISSION_LEVELS = {
  READ: 'read',           // 只读权限
  WRITE: 'write',         // 写入权限
  DELETE: 'delete',       // 删除权限
  APPROVE: 'approve',     // 审批权限
  EXPORT: 'export',       // 导出权限
  ADMIN: 'admin'          // 管理权限
};

/**
 * 数据权限范围
 */
const DATA_SCOPES = {
  ALL: 'all',                   // 全部数据
  VILLAGE: 'village',           // 村庄数据
  DEPARTMENT: 'department',     // 部门数据
  GRID: 'grid',                 // 网格数据
  TEAM: 'team',                 // 团队数据
  PERSONAL: 'personal'           // 个人数据
};

/**
 * 角色权限映射表
 */
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    [DATA_SCOPES.ALL]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE,
      PERMISSION_LEVELS.DELETE,
      PERMISSION_LEVELS.APPROVE,
      PERMISSION_LEVELS.EXPORT,
      PERMISSION_LEVELS.ADMIN
    ],
    description: '超级管理员，拥有所有权限'
  },

  [ROLES.VILLAGE_ADMIN]: {
    [DATA_SCOPES.VILLAGE]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE,
      PERMISSION_LEVELS.DELETE,
      PERMISSION_LEVELS.APPROVE,
      PERMISSION_LEVELS.EXPORT
    ],
    [DATA_SCOPES.DEPARTMENT]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE,
      PERMISSION_LEVELS.DELETE,
      PERMISSION_LEVELS.APPROVE
    ],
    description: '村庄管理员，拥有村庄内所有权限'
  },

  [ROLES.PARTY_SECRETARY]: {
    [DATA_SCOPES.VILLAGE]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE,
      PERMISSION_LEVELS.APPROVE
    ],
    [DATA_SCOPES.DEPARTMENT]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE
    ],
    description: '村支书，拥有村庄主要管理权限'
  },

  [ROLES.COMMITTEE_MEMBER]: {
    [DATA_SCOPES.VILLAGE]: [
      PERMISSION_LEVELS.READ
    ],
    [DATA_SCOPES.DEPARTMENT]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE
    ],
    [DATA_SCOPES.TEAM]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE,
      PERMISSION_LEVELS.DELETE
    ],
    description: '村委会成员，拥有部门管理权限'
  },

  [ROLES.VILLAGE_OFFICER]: {
    [DATA_SCOPES.DEPARTMENT]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE
    ],
    [DATA_SCOPES.TEAM]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE
    ],
    description: '村务人员，拥有部门业务权限'
  },

  [ROLES.ACCOUNTANT]: {
    [DATA_SCOPES.DEPARTMENT]: {
      permissions: [
        PERMISSION_LEVELS.READ,
        PERMISSION_LEVELS.WRITE,
        PERMISSION_LEVELS.EXPORT
      ],
      dataTypes: ['finance', 'accounting', 'budget']
    },
    description: '会计，拥有财务数据管理权限'
  },

  [ROLES.GRID_MANAGER]: {
    [DATA_SCOPES.GRID]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE
    ],
    [DATA_SCOPES.TEAM]: [
      PERMISSION_LEVELS.READ
    ],
    description: '网格员，拥有网格内管理权限'
  },

  [ROLES.VOLUNTEER]: {
    [DATA_SCOPES.TEAM]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE
    ],
    [DATA_SCOPES.PERSONAL]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE,
      PERMISSION_LEVELS.DELETE
    ],
    description: '志愿者，拥有个人和团队数据权限'
  },

  [ROLES.RESIDENT]: {
    [DATA_SCOPES.PERSONAL]: [
      PERMISSION_LEVELS.READ,
      PERMISSION_LEVELS.WRITE,
      PERMISSION_LEVELS.DELETE
    ],
    [DATA_SCOPES.VILLAGE]: {
      permissions: [PERMISSION_LEVELS.READ],
      dataTypes: ['announcements', 'public_info']
    },
    description: '村民，拥有个人数据权限和公共信息查看权限'
  },

  [ROLES.GUEST]: {
    [DATA_SCOPES.VILLAGE]: {
      permissions: [PERMISSION_LEVELS.READ],
      dataTypes: ['announcements', 'public_info']
    },
    description: '访客，只有公共信息查看权限'
  }
};

/**
 * 数据类型敏感性分类
 */
const DATA_SENSITIVITY = {
  PUBLIC: 'public',           // 公开数据
  INTERNAL: 'internal',       // 内部数据
  SENSITIVE: 'sensitive',     // 敏感数据
  CONFIDENTIAL: 'confidential' // 机密数据
};

/**
 * 敏感数据字段定义
 */
const SENSITIVE_FIELDS = {
  [DATA_SENSITIVITY.PUBLIC]: [
    'name', 'gender', 'age_range', 'avatar', 'status'
  ],

  [DATA_SENSITIVITY.INTERNAL]: [
    'phone', 'address', 'id_card_partial', 'family_size', 'occupation'
  ],

  [DATA_SENSITIVITY.SENSITIVE]: [
    'id_card', 'bank_account', 'salary', 'medical_info', 'family_relationship'
  ],

  [DATA_SENSITIVITY.CONFIDENTIAL]: [
    'password', 'secret_key', 'encryption_key', 'private_key', 'token'
  ]
};

/**
 * 访问控制类
 */
class AccessControl {
  constructor() {
    this.roleHierarchy = this.buildRoleHierarchy();
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 构建角色层级关系
   */
  buildRoleHierarchy() {
    return {
      [ROLES.SUPER_ADMIN]: 9,
      [ROLES.VILLAGE_ADMIN]: 8,
      [ROLES.PARTY_SECRETARY]: 7,
      [ROLES.COMMITTEE_MEMBER]: 6,
      [ROLES.VILLAGE_OFFICER]: 5,
      [ROLES.ACCOUNTANT]: 5,
      [ROLES.GRID_MANAGER]: 4,
      [ROLES.VOLUNTEER]: 3,
      [ROLES.RESIDENT]: 2,
      [ROLES.GUEST]: 1
    };
  }

  /**
   * 检查用户是否有权限
   */
  hasPermission(user, permission, resource, dataType = null) {
    try {
      const cacheKey = `${user.id}_${permission}_${resource}_${dataType || 'all'}`;

      // 检查缓存
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.result;
        }
      }

      const result = this.checkPermissionInternal(user, permission, resource, dataType);

      // 缓存结果
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      logger.error('权限检查失败', {
        error: error.message,
        userId: user.id,
        permission,
        resource
      });
      return false;
    }
  }

  /**
   * 内部权限检查逻辑
   */
  checkPermissionInternal(user, permission, resource, dataType) {
    const role = user.role;
    const villageId = user.villageId;
    const departmentId = user.departmentId;
    const gridId = user.gridId;
    const teamId = user.teamId;

    // 获取角色权限配置
    const rolePermissions = ROLE_PERMISSIONS[role];
    if (!rolePermissions) {
      logger.warn('未知角色', { role, userId: user.id });
      return false;
    }

    // 检查各数据范围的权限
    for (const [scope, permissions] of Object.entries(rolePermissions)) {
      if (this.checkScopePermission(
        permissions, permission, resource, dataType,
        { villageId, departmentId, gridId, teamId, user }
      )) {
        return true;
      }
    }

    // 检查角色层级权限（高级角色可以访问低级角色的资源）
    if (this.checkHierarchyPermission(role, permission)) {
      return true;
    }

    return false;
  }

  /**
   * 检查特定数据范围的权限
   */
  checkScopePermission(permissions, requiredPermission, resource, dataType, context) {
    // 如果是字符串，转换为对象格式
    if (typeof permissions === 'string') {
      permissions = { permissions: [permissions] };
    }

    const { permissions: allowedPermissions, dataTypes: allowedDataTypes } = permissions;

    // 检查权限级别
    if (!allowedPermissions.includes(requiredPermission)) {
      return false;
    }

    // 检查数据类型限制
    if (allowedDataTypes && dataType && !allowedDataTypes.includes(dataType)) {
      return false;
    }

    // 检查数据范围权限
    return this.checkDataScopeAccess(resource, context);
  }

  /**
   * 检查数据范围访问权限
   */
  checkDataScopeAccess(resource, context) {
    const { user, villageId, departmentId, gridId, teamId } = context;

    // 检查村庄级别数据
    if (resource.villageId && resource.villageId !== villageId) {
      // 只有高级角色可以跨村庄访问
      return this.roleHierarchy[user.role] >= this.roleHierarchy[ROLES.VILLAGE_ADMIN];
    }

    // 检查部门级别数据
    if (resource.departmentId && resource.departmentId !== departmentId) {
      return this.roleHierarchy[user.role] >= this.roleHierarchy[ROLES.COMMITTEE_MEMBER];
    }

    // 检查网格级别数据
    if (resource.gridId && resource.gridId !== gridId) {
      return this.roleHierarchy[user.role] >= this.roleHierarchy[ROLES.GRID_MANAGER];
    }

    // 检查团队级别数据
    if (resource.teamId && resource.teamId !== teamId) {
      return this.roleHierarchy[user.role] >= this.roleHierarchy[ROLES.VOLUNTEER];
    }

    // 检查个人数据
    if (resource.userId && resource.userId !== user.id) {
      return this.roleHierarchy[user.role] >= this.roleHierarchy[ROLES.GRID_MANAGER];
    }

    return true;
  }

  /**
   * 检查角色层级权限
   */
  checkHierarchyPermission(role, permission) {
    // 高级角色拥有基础读取权限
    if (permission === PERMISSION_LEVELS.READ) {
      return this.roleHierarchy[role] >= this.roleHierarchy[ROLES.COMMITTEE_MEMBER];
    }

    // 只有超级管理员拥有完整管理权限
    if (permission === PERMISSION_LEVELS.ADMIN) {
      return role === ROLES.SUPER_ADMIN;
    }

    return false;
  }

  /**
   * 脱敏数据
   */
  sanitizeData(data, userRole, sensitivity = DATA_SENSITIVITY.INTERNAL) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    const roleLevel = this.roleHierarchy[userRole];

    // 根据角色级别确定可以访问的数据敏感性
    let accessibleSensitivity = DATA_SENSITIVITY.PUBLIC;
    if (roleLevel >= this.roleHierarchy[ROLES.GUEST]) {
      accessibleSensitivity = DATA_SENSITIVITY.PUBLIC;
    }
    if (roleLevel >= this.roleHierarchy[ROLES.RESIDENT]) {
      accessibleSensitivity = DATA_SENSITIVITY.INTERNAL;
    }
    if (roleLevel >= this.roleHierarchy[ROLES.VILLAGE_OFFICER]) {
      accessibleSensitivity = DATA_SENSITIVITY.SENSITIVE;
    }
    if (roleLevel >= this.roleHierarchy[ROLES.SUPER_ADMIN]) {
      accessibleSensitivity = DATA_SENSITIVITY.CONFIDENTIAL;
    }

    // 脱敏超出访问级别的字段
    for (const [level, fields] of Object.entries(SENSITIVE_FIELDS)) {
      if (this.compareSensitivityLevel(level, accessibleSensitivity) > 0) {
        fields.forEach(field => {
          if (sanitized[field]) {
            sanitized[field] = this.maskField(field, sanitized[field]);
          }
        });
      }
    }

    return sanitized;
  }

  /**
   * 比较数据敏感性级别
   */
  compareSensitivityLevel(level1, level2) {
    const levels = {
      [DATA_SENSITIVITY.PUBLIC]: 1,
      [DATA_SENSITIVITY.INTERNAL]: 2,
      [DATA_SENSITIVITY.SENSITIVE]: 3,
      [DATA_SENSITIVITY.CONFIDENTIAL]: 4
    };
    return levels[level1] - levels[level2];
  }

  /**
   * 字段脱敏处理
   */
  maskField(fieldName, value) {
    if (typeof value !== 'string') {
      return '***';
    }

    switch (fieldName) {
    case 'id_card':
      return value.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
    case 'phone':
      return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    case 'bank_account':
      return value.replace(/(\d{4})\d*(\d{4})/, '$1****$2');
    case 'email':
      return value.replace(/(.{2}).*(@.*)/, '$1****$2');
    case 'address':
      return value.length > 10 ? `${value.substring(0, 10)  }***` : '***';
    case 'name':
      return value.length > 1 ? `${value[0]  }**` : '***';
    default:
      return '***';
    }
  }

  /**
   * 创建访问控制中间件
   */
  createMiddleware(permission, resourceType) {
    return (req, res, next) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            success: false,
            error: '用户未登录',
            code: 'USER_NOT_AUTHENTICATED'
          });
        }

        // 构建资源对象
        const resource = {
          type: resourceType,
          villageId: req.params.villageId || user.villageId,
          departmentId: req.params.departmentId || user.departmentId,
          gridId: req.params.gridId || user.gridId,
          teamId: req.params.teamId || user.teamId,
          userId: req.params.userId
        };

        // 检查权限
        if (!this.hasPermission(user, permission, resource)) {
          logger.warn('权限不足', {
            userId: user.id,
            role: user.role,
            permission,
            resource,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          return res.status(403).json({
            success: false,
            error: '权限不足',
            code: 'INSUFFICIENT_PERMISSIONS',
            requiredPermission: permission,
            resource
          });
        }

        // 添加权限检查标记
        req.permissionChecked = true;
        next();

      } catch (error) {
        logger.error('权限检查中间件错误', {
          error: error.message,
          userId: req.user?.id,
          permission,
          resourceType
        });

        return res.status(500).json({
          success: false,
          error: '权限检查失败',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * 数据脱敏中间件
   */
  createSanitizationMiddleware(defaultSensitivity = DATA_SENSITIVITY.INTERNAL) {
    return (req, res, next) => {
      const originalJson = res.json;

      res.json = function(data) {
        if (req.user && data.success && data.data) {
          try {
            // 根据角色脱敏响应数据
            const sanitizedData = accessControl.sanitizeData(
              data.data,
              req.user.role,
              defaultSensitivity
            );
            data.data = sanitizedData;
          } catch (error) {
            logger.error('数据脱敏失败', {
              error: error.message,
              userId: req.user.id,
              role: req.user.role
            });
          }
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
    logger.info('访问控制缓存已清理');
  }

  /**
   * 获取用户权限信息
   */
  getUserPermissions(user) {
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    if (!rolePermissions) {
      return { permissions: [], scopes: [] };
    }

    return {
      role: user.role,
      permissions: rolePermissions,
      roleLevel: this.roleHierarchy[user.role],
      description: rolePermissions.description
    };
  }
}

// 创建全局访问控制实例
const accessControl = new AccessControl();

module.exports = {
  accessControl,
  ROLES,
  PERMISSION_LEVELS,
  DATA_SCOPES,
  DATA_SENSITIVITY,
  SENSITIVE_FIELDS
};