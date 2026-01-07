/**
 * permissions.js - 权限配置文件
 *
 * 定义系统所有权限模块和预定义权限
 * 用于初始化权限数据和权限检查
 */

/**
 * 权限模块定义
 */
const PERMISSION_MODULES = {
  RESIDENT: 'resident',
  POPULATION: 'population',
  FINANCE: 'finance',
  SECURITY: 'security',
  EMERGENCY: 'emergency',
  ANNOUNCEMENT: 'announcement',
  TASK: 'task',
  GROUP: 'group',
  AUDIT: 'audit',
  COMMITTEE: 'committee',
  PROFILE: 'profile',
  SERVICE: 'service',
  RESOURCE: 'resource'
};

/**
 * 操作类型定义
 */
const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  MANAGE: 'manage',
  EXPORT: 'export',
  ALL: '*'
};

/**
 * 角色定义
 */
const ROLES = {
  SECRETARY: 'secretary',           // 村支书
  VILLAGE_HEAD: 'village_head',     // 村主任
  ACCOUNTANT: 'accountant',         // 会计
  POPULATION_ADMIN: 'population_admin',  // 人口主任
  SECURITY_DIRECTOR: 'security_director', // 治保主任
  RESIDENT: 'resident'              // 普通村民
};

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS = {
  [ROLES.SECRETARY]: [
    '*',  // 村支书拥有所有权限
  ],

  [ROLES.VILLAGE_HEAD]: [
    // 村民管理
    `${PERMISSION_MODULES.RESIDENT}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.RESIDENT}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.RESIDENT}:${ACTIONS.UPDATE}`,

    // 财务管理
    `${PERMISSION_MODULES.FINANCE}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.FINANCE}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.FINANCE}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.FINANCE}:${ACTIONS.APPROVE}`,

    // 公告管理
    `${PERMISSION_MODULES.ANNOUNCEMENT}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.ANNOUNCEMENT}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.ANNOUNCEMENT}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.ANNOUNCEMENT}:${ACTIONS.DELETE}`,

    // 任务管理
    `${PERMISSION_MODULES.TASK}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.TASK}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.TASK}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.TASK}:${ACTIONS.CREATE}`,  // 分配任务

    // 安全管理
    `${PERMISSION_MODULES.SECURITY}:${ACTIONS.READ}`,

    // 审计日志
    `${PERMISSION_MODULES.AUDIT}:${ACTIONS.READ}`
  ],

  [ROLES.ACCOUNTANT]: [
    // 财务管理
    `${PERMISSION_MODULES.FINANCE}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.FINANCE}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.FINANCE}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.FINANCE}:${ACTIONS.MANAGE}`,  // 财务报表
    `${PERMISSION_MODULES.FINANCE}:${ACTIONS.EXPORT}`,

    // 审计日志
    `${PERMISSION_MODULES.AUDIT}:${ACTIONS.READ}`
  ],

  [ROLES.POPULATION_ADMIN]: [
    // 村民管理
    `${PERMISSION_MODULES.RESIDENT}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.RESIDENT}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.RESIDENT}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.RESIDENT}:${ACTIONS.DELETE}`,

    // 人口管理
    `${PERMISSION_MODULES.POPULATION}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.POPULATION}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.POPULATION}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.POPULATION}:${ACTIONS.DELETE}`,
    `${PERMISSION_MODULES.POPULATION}:${ACTIONS.EXPORT}`,

    // 分组管理
    `${PERMISSION_MODULES.GROUP}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.GROUP}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.GROUP}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.GROUP}:${ACTIONS.DELETE}`
  ],

  [ROLES.SECURITY_DIRECTOR]: [
    // 安全管理
    `${PERMISSION_MODULES.SECURITY}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.SECURITY}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.SECURITY}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.SECURITY}:${ACTIONS.DELETE}`,

    // 应急管理
    `${PERMISSION_MODULES.EMERGENCY}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.EMERGENCY}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.EMERGENCY}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.EMERGENCY}:${ACTIONS.APPROVE}`,  // 启动预案

    // 事件管理
    `${PERMISSION_MODULES.SECURITY}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.SECURITY}:${ACTIONS.CREATE}`,
    `${PERMISSION_MODULES.SECURITY}:${ACTIONS.UPDATE}`,
    `${PERMISSION_MODULES.SECURITY}:${ACTIONS.APPROVE}`,  // 解决事件

    // 资源管理
    `${PERMISSION_MODULES.RESOURCE}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.RESOURCE}:${ACTIONS.UPDATE}`
  ],

  [ROLES.RESIDENT]: [
    // 普通村民基础权限
    `${PERMISSION_MODULES.ANNOUNCEMENT}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.SERVICE}:${ACTIONS.READ}`,
    `${PERMISSION_MODULES.PROFILE}:${ACTIONS.UPDATE}`  // 只能修改自己的资料
  ]
};

/**
 * 权限等级定义
 */
const PERMISSION_LEVELS = {
  LOW: 1,      // 低敏感度（公开信息）
  MEDIUM: 2,   // 中敏感度（内部信息）
  HIGH: 3,     // 高敏感度（重要信息）
  CRITICAL: 4, // 严重敏感度（敏感信息）
  RESTRICTED: 5 // 限制级（核心机密）
};

/**
 * 需要审批的权限配置
 */
const APPROVAL_REQUIRED_PERMISSIONS = {
  // 村民删除需要审批
  [`${PERMISSION_MODULES.RESIDENT}:${ACTIONS.DELETE}`]: {
    required: true,
    approverRole: ROLES.POPULATION_ADMIN,
    reason: '删除村民信息影响档案完整性'
  },

  // 财务大额支出需要审批
  [`${PERMISSION_MODULES.FINANCE}:${ACTIONS.APPROVE}`]: {
    required: true,
    approverRole: ROLES.VILLAGE_HEAD,
    condition: {
      amountThreshold: 50000,
      message: '超过5万元的支出需要村主任审批'
    }
  },

  // 财务数据导出需要审批
  [`${PERMISSION_MODULES.FINANCE}:${ACTIONS.EXPORT}`]: {
    required: true,
    approverRole: ROLES.VILLAGE_HEAD,
    reason: '财务数据导出涉及敏感信息'
  },

  // 人口数据导出需要审批
  [`${PERMISSION_MODULES.POPULATION}:${ACTIONS.EXPORT}`]: {
    required: true,
    approverRole: ROLES.POPULATION_ADMIN,
    reason: '人口数据导出涉及个人隐私'
  },

  // 村干部账号创建需要审批
  [`${PERMISSION_MODULES.COMMITTEE}:${ACTIONS.CREATE}`]: {
    required: true,
    approverRole: ROLES.SECRETARY,
    reason: '新增村干部需要村支书审核'
  },

  // 应急预案启动需要审批
  [`${PERMISSION_MODULES.EMERGENCY}:${ACTIONS.APPROVE}`]: {
    required: true,
    approverRole: ROLES.VILLAGE_HEAD,
    reason: '启动应急预案影响重大'
  }
};

/**
 * 数据访问范围定义
 */
const DATA_SCOPES = {
  ALL: 'all',           // 所有数据
  DEPARTMENT: 'department',  // 部门数据
  SELF: 'self'          // 仅本人数据
};

/**
 * 角色数据访问范围
 */
const ROLE_DATA_SCOPES = {
  [ROLES.SECRETARY]: DATA_SCOPES.ALL,
  [ROLES.VILLAGE_HEAD]: DATA_SCOPES.ALL,
  [ROLES.ACCOUNTANT]: DATA_SCOPES.DEPARTMENT,
  [ROLES.POPULATION_ADMIN]: DATA_SCOPES.DEPARTMENT,
  [ROLES.SECURITY_DIRECTOR]: DATA_SCOPES.DEPARTMENT,
  [ROLES.RESIDENT]: DATA_SCOPES.SELF
};

/**
 * 敏感操作定义
 */
const SENSITIVE_OPERATIONS = [
  `${PERMISSION_MODULES.RESIDENT}:${ACTIONS.DELETE}`,
  `${PERMISSION_MODULES.POPULATION}:${ACTIONS.DELETE}`,
  `${PERMISSION_MODULES.FINANCE}:${ACTIONS.DELETE}`,
  `${PERMISSION_MODULES.FINANCE}:${ACTIONS.APPROVE}`,
  `${PERMISSION_MODULES.FINANCE}:${ACTIONS.EXPORT}`,
  `${PERMISSION_MODULES.POPULATION}:${ACTIONS.EXPORT}`,
  `${PERMISSION_MODULES.COMMITTEE}:${ACTIONS.CREATE}`,
  `${PERMISSION_MODULES.COMMITTEE}:${ACTIONS.UPDATE}`,
  `${PERMISSION_MODULES.COMMITTEE}:${ACTIONS.DELETE}`,
  `${PERMISSION_MODULES.EMERGENCY}:${ACTIONS.APPROVE}`
];

/**
 * 检查权限是否需要审批
 * @param {string} permission - 权限代码
 * @param {Object} context - 上下文数据
 * @returns {Object|null}
 */
function checkApprovalRequired(permission, context = {}) {
  const approvalConfig = APPROVAL_REQUIRED_PERMISSIONS[permission];

  if (!approvalConfig || !approvalConfig.required) {
    return null;
  }

  // 检查审批条件
  if (approvalConfig.condition) {
    const { amountThreshold } = approvalConfig.condition;
    if (amountThreshold && context.amount) {
      if (context.amount < amountThreshold) {
        return null;  // 金额未超过阈值，不需要审批
      }
    }
  }

  return approvalConfig;
}

/**
 * 检查是否为敏感操作
 * @param {string} permission - 权限代码
 * @returns {boolean}
 */
function isSensitiveOperation(permission) {
  return SENSITIVE_OPERATIONS.includes(permission);
}

/**
 * 获取角色的所有权限
 * @param {string} role - 角色代码
 * @returns {string[]}
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * 获取角色的数据访问范围
 * @param {string} role - 角色代码
 * @returns {string}
 */
function getRoleDataScope(role) {
  return ROLE_DATA_SCOPES[role] || DATA_SCOPES.SELF;
}

/**
 * 解析权限代码
 * @param {string} permission - 权限代码 (如 "resident:read")
 * @returns {Object} { module, action }
 */
function parsePermission(permission) {
  const [module, action] = permission.split(':');
  return { module, action };
}

/**
 * 构建权限代码
 * @param {string} module - 模块名
 * @param {string} action - 操作名
 * @returns {string}
 */
function buildPermission(module, action) {
  return `${module}:${action}`;
}

/**
 * 权限代码验证
 * @param {string} permission - 权限代码
 * @returns {boolean}
 */
function isValidPermission(permission) {
  const parts = permission.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [module, action] = parts;

  // 检查模块是否有效
  const validModules = Object.values(PERMISSION_MODULES);
  if (!validModules.includes(module)) {
    return false;
  }

  // 检查操作是否有效
  const validActions = Object.values(ACTIONS);
  if (!validActions.includes(action)) {
    return false;
  }

  return true;
}

/**
 * 获取权限的中文名称
 * @param {string} permission - 权限代码
 * @returns {string}
 */
function getPermissionName(permission) {
  const { module, action } = parsePermission(permission);

  const moduleNames = {
    [PERMISSION_MODULES.RESIDENT]: '村民管理',
    [PERMISSION_MODULES.POPULATION]: '人口管理',
    [PERMISSION_MODULES.FINANCE]: '财务管理',
    [PERMISSION_MODULES.SECURITY]: '安全管理',
    [PERMISSION_MODULES.EMERGENCY]: '应急管理',
    [PERMISSION_MODULES.ANNOUNCEMENT]: '公告管理',
    [PERMISSION_MODULES.TASK]: '任务管理',
    [PERMISSION_MODULES.GROUP]: '分组管理',
    [PERMISSION_MODULES.AUDIT]: '审计日志',
    [PERMISSION_MODULES.COMMITTEE]: '村委管理',
    [PERMISSION_MODULES.PROFILE]: '个人资料',
    [PERMISSION_MODULES.SERVICE]: '便民服务',
    [PERMISSION_MODULES.RESOURCE]: '资源管理'
  };

  const actionNames = {
    [ACTIONS.READ]: '查看',
    [ACTIONS.CREATE]: '创建',
    [ACTIONS.UPDATE]: '修改',
    [ACTIONS.DELETE]: '删除',
    [ACTIONS.APPROVE]: '审批',
    [ACTIONS.MANAGE]: '管理',
    [ACTIONS.EXPORT]: '导出',
    [ACTIONS.ALL]: '所有操作'
  };

  return `${moduleNames[module] || module} - ${actionNames[action] || action}`;
}

module.exports = {
  PERMISSION_MODULES,
  ACTIONS,
  ROLES,
  ROLE_PERMISSIONS,
  PERMISSION_LEVELS,
  APPROVAL_REQUIRED_PERMISSIONS,
  DATA_SCOPES,
  ROLE_DATA_SCOPES,
  SENSITIVE_OPERATIONS,
  checkApprovalRequired,
  isSensitiveOperation,
  getRolePermissions,
  getRoleDataScope,
  parsePermission,
  buildPermission,
  isValidPermission,
  getPermissionName
};
