/**
 * 权限管理路由
 * 处理村级管理员认证、权限模板管理、审计日志查询等
 */

const express = require('express');
const router = express.Router();

const {
  createVillageAdminAuth,
  reviewVillageAdminAuth,
  getVillageAdminAuth,
  createPermissionTemplate,
  getPermissionTemplates,
  applyPermissionTemplate,
  queryAuditLogs,
  getAuditLogStats,
  changeAdminPermissions
} = require('../controllers/permissionController');

const {
  auditLogger,
  requireVillageAdminAuth,
  requirePermission,
  dataMasking
} = require('../middleware/permissionMiddleware');

const { authenticateToken } = require('../middleware/auth');

// 身份认证中间件
router.use(authenticateToken);

// 权限管理操作审计日志
const permissionAudit = auditLogger({
  resource: 'permission',
  action: 'MANAGE_PERMISSION'
}, { sensitiveLevel: 'confidential', requiresArchival: true });

// 审计日志查询操作审计
const auditLogAudit = auditLogger({
  resource: 'audit_log',
  action: 'QUERY_AUDIT_LOG'
}, { sensitiveLevel: 'sensitive', requiresArchival: true });

/**
 * 村级管理员认证相关路由
 */

// 申请村级管理员认证
router.post('/village-admin/auth',
  permissionAudit,
  requirePermission('village_admin', 'create'),
  createVillageAdminAuth
);

// 审核村级管理员认证申请
router.put('/village-admin/auth/:authId/review',
  permissionAudit,
  requirePermission('village_admin', 'approve'),
  reviewVillageAdminAuth
);

// 获取村级管理员认证信息
router.get('/village-admin/auth/:villageId',
  auditLogger({
    resource: 'village_admin_auth',
    action: 'VIEW_AUTH_INFO'
  }, { sensitiveLevel: 'sensitive' }),
  requirePermission('village_admin', 'read'),
  dataMasking({ isOwner: false }),
  getVillageAdminAuth
);

/**
 * 权限模板管理路由
 */

// 创建权限模板
router.post('/templates',
  permissionAudit,
  requirePermission('permission_template', 'create'),
  createPermissionTemplate
);

// 获取权限模板列表
router.get('/templates',
  auditLogger({
    resource: 'permission_template',
    action: 'LIST_TEMPLATES'
  }, { sensitiveLevel: 'internal' }),
  requirePermission('permission_template', 'read'),
  getPermissionTemplates
);

// 应用权限模板
router.post('/templates/:templateId/apply',
  permissionAudit,
  requirePermission('permission_template', 'apply'),
  applyPermissionTemplate
);

/**
 * 审计日志查询路由
 */

// 查询审计日志
router.get('/audit-logs',
  auditLogAudit,
  requirePermission('audit_log', 'read'),
  dataMasking({ isOwner: false }),
  queryAuditLogs
);

// 获取审计日志统计
router.get('/audit-logs/stats',
  auditLogAudit,
  requirePermission('audit_log', 'stats'),
  getAuditLogStats
);

/**
 * 权限变更路由
 */

// 管理员权限变更
router.put('/village-admin/:villageId/permissions',
  permissionAudit,
  requireVillageAdminAuth(),
  requirePermission('admin_permission', 'manage'),
  changeAdminPermissions
);

/**
 * 权限验证路由
 */

// 验证用户权限
router.post('/verify',
  auditLogger({
    resource: 'permission',
    action: 'VERIFY_PERMISSION'
  }, { sensitiveLevel: 'internal' }),
  async (req, res) => {
    try {
      const { resource, action, scope } = req.body;
      const user = req.user;

      // 这里实现权限验证逻辑
      const hasPermission = await verifyUserPermission(user, resource, action, scope);

      res.json({
        success: true,
        data: {
          hasPermission,
          resource,
          action,
          scope
        }
      });
    } catch (error) {
      console.error('权限验证失败:', error);
      res.status(500).json({
        success: false,
        error: 'VERIFICATION_FAILED',
        message: '权限验证失败'
      });
    }
  }
);

// 获取用户权限列表
router.get('/user-permissions',
  auditLogger({
    resource: 'user_permission',
    action: 'VIEW_PERMISSIONS'
  }, { sensitiveLevel: 'internal' }),
  async (req, res) => {
    try {
      const user = req.user;
      const userPermissions = await getUserPermissions(user);

      res.json({
        success: true,
        data: userPermissions
      });
    } catch (error) {
      console.error('获取用户权限失败:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_PERMISSIONS_FAILED',
        message: '获取用户权限失败'
      });
    }
  }
);

/**
 * 权限模板预定义路由
 */

// 获取系统预定义权限模板
router.get('/templates/system',
  auditLogger({
    resource: 'system_template',
    action: 'VIEW_SYSTEM_TEMPLATES'
  }, { sensitiveLevel: 'public' }),
  async (req, res) => {
    try {
      const systemTemplates = await getSystemPermissionTemplates();

      res.json({
        success: true,
        data: systemTemplates
      });
    } catch (error) {
      console.error('获取系统权限模板失败:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_TEMPLATES_FAILED',
        message: '获取系统权限模板失败'
      });
    }
  }
);

/**
 * 权限级别和操作类型查询路由
 */

// 获取权限级别列表
router.get('/levels',
  auditLogger({
    resource: 'permission_level',
    action: 'VIEW_LEVELS'
  }, { sensitiveLevel: 'public' }),
  async (req, res) => {
    try {
      const { PermissionLevels, PermissionActions, DataSensitivity } = require('../models/Permission');

      res.json({
        success: true,
        data: {
          levels: Object.values(PermissionLevels),
          actions: Object.values(PermissionActions),
          sensitivities: Object.values(DataSensitivity)
        }
      });
    } catch (error) {
      console.error('获取权限级别失败:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_LEVELS_FAILED',
        message: '获取权限级别失败'
      });
    }
  }
);

/**
 * 权限监控和统计路由
 */

// 获取权限使用统计
router.get('/stats/usage',
  auditLogAudit,
  requirePermission('permission_stats', 'read'),
  async (req, res) => {
    try {
      const stats = await getPermissionUsageStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('获取权限使用统计失败:', error);
      res.status(500).json({
        success: false,
        error: 'FETCH_STATS_FAILED',
        message: '获取权限使用统计失败'
      });
    }
  }
);

/**
 * 权限健康检查路由
 */

// 权限系统健康检查
router.get('/health',
  auditLogger({
    resource: 'permission_health',
    action: 'HEALTH_CHECK'
  }, { sensitiveLevel: 'internal' }),
  async (req, res) => {
    try {
      const health = await checkPermissionSystemHealth();

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('权限系统健康检查失败:', error);
      res.status(500).json({
        success: false,
        error: 'HEALTH_CHECK_FAILED',
        message: '权限系统健康检查失败'
      });
    }
  }
);

// 辅助函数实现

/**
 * 验证用户权限
 */
async function verifyUserPermission(user, resource, action, scope = 'own') {
  try {
    const { VillageAdminAuth, PermissionTemplate } = require('../models/Permission');
    const { PermissionLevels } = require('../models/Permission');

    // 超级管理员拥有所有权限
    if (user.role === 'super_admin') {
      return true;
    }

    // 检查村级管理员权限
    if (user.role === 'village_admin' && user.villageId) {
      const authRecord = await VillageAdminAuth.findOne({
        villageId: user.villageId,
        status: 'active'
      });

      if (authRecord && authRecord.hasPermission(user._id, resource, action)) {
        return true;
      }
    }

    // 检查权限模板
    const template = await PermissionTemplate.getTemplateByRole(user.role);
    if (template) {
      const hasPermission = template.permissions.some(p =>
        p.resource === resource && p.actions.includes(action)
      );

      if (hasPermission) {
        // 检查作用域权限
        return await checkScopePermission(user, resource, action, scope);
      }
    }

    return false;
  } catch (error) {
    console.error('验证用户权限失败:', error);
    return false;
  }
}

/**
 * 获取用户权限列表
 */
async function getUserPermissions(user) {
  try {
    const { VillageAdminAuth, PermissionTemplate } = require('../models/Permission');

    const permissions = [];

    // 获取村级管理员权限
    if (user.role === 'village_admin' && user.villageId) {
      const authRecord = await VillageAdminAuth.findOne({
        villageId: user.villageId,
        status: 'active'
      });

      if (authRecord) {
        permissions.push(...authRecord.backupAdmins
          .filter(ba => ba.userId.toString() === user._id.toString())
          .flatMap(ba => ba.permissions));
      }
    }

    // 获取角色权限模板
    const template = await PermissionTemplate.getTemplateByRole(user.role);
    if (template) {
      permissions.push(...template.permissions.map(p => `${p.resource}:${p.actions[0]}`));
    }

    return {
      userId: user._id,
      role: user.role,
      permissions: [...new Set(permissions)], // 去重
      villageId: user.villageId
    };
  } catch (error) {
    console.error('获取用户权限失败:', error);
    throw error;
  }
}

/**
 * 获取系统预定义权限模板
 */
async function getSystemPermissionTemplates() {
  return {
    templates: [
      {
        name: '村支书模板',
        description: '村支书权限模板，包含村庄管理所有权限',
        applicableRoles: ['village_admin'],
        permissions: [
          { resource: 'village', actions: ['manage'], scope: 'all' },
          { resource: 'resident', actions: ['read', 'update'], scope: 'all' },
          { resource: 'announcement', actions: ['create', 'update', 'delete'], scope: 'all' },
          { resource: 'finance', actions: ['read', 'approve'], scope: 'all' },
          { resource: 'emergency', actions: ['manage', 'respond'], scope: 'all' }
        ]
      },
      {
        name: '会计模板',
        description: '会计权限模板，主要负责财务管理',
        applicableRoles: ['village_admin'],
        permissions: [
          { resource: 'finance', actions: ['create', 'read', 'update'], scope: 'all' },
          { resource: 'budget', actions: ['create', 'update', 'read'], scope: 'all' },
          { resource: 'audit', actions: ['read'], scope: 'all' }
        ]
      },
      {
        name: '人口主任模板',
        description: '人口主任权限模板，负责人口管理',
        applicableRoles: ['village_admin'],
        permissions: [
          { resource: 'resident', actions: ['create', 'read', 'update'], scope: 'all' },
          { resource: 'household', actions: ['create', 'read', 'update'], scope: 'all' },
          { resource: 'vital_event', actions: ['create', 'read', 'update'], scope: 'all' }
        ]
      }
    ]
  };
}

/**
 * 检查作用域权限
 */
async function checkScopePermission(user, resource, action, scope) {
  // 超级管理员拥有所有作用域权限
  if (user.role === 'super_admin') {
    return true;
  }

  // 村级管理员拥有全村作用域权限
  if (user.role === 'village_admin') {
    return ['own', 'village'].includes(scope);
  }

  // 其他角色只有自己的权限
  return scope === 'own';
}

/**
 * 获取权限使用统计
 */
async function getPermissionUsageStats() {
  const { VillageAdminAuth, PermissionTemplate, AuditLog } = require('../models/Permission');

  const [
    activeAdmins,
    activeTemplates,
    recentLogs
  ] = await Promise.all([
    VillageAdminAuth.countDocuments({ status: 'active' }),
    PermissionTemplate.countDocuments({ status: 'active' }),
    AuditLog.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
  ]);

  return {
    activeVillageAdmins: activeAdmins,
    activePermissionTemplates: activeTemplates,
    auditLogsLast24h: recentLogs,
    systemStatus: 'healthy'
  };
}

/**
 * 权限系统健康检查
 */
async function checkPermissionSystemHealth() {
  const { VillageAdminAuth, PermissionTemplate, AuditLog } = require('../models/Permission');

  const checks = [];

  try {
    // 检查数据库连接
    await VillageAdminAuth.findOne().limit(1);
    checks.push({ name: '数据库连接', status: 'healthy' });
  } catch (error) {
    checks.push({ name: '数据库连接', status: 'unhealthy', error: error.message });
  }

  try {
    // 检查权限模板数量
    const templateCount = await PermissionTemplate.countDocuments({ status: 'active' });
    checks.push({
      name: '权限模板',
      status: templateCount > 0 ? 'healthy' : 'warning',
      count: templateCount
    });
  } catch (error) {
    checks.push({ name: '权限模板', status: 'unhealthy', error: error.message });
  }

  try {
    // 检查审计日志系统
    const recentLog = await AuditLog.findOne().sort({ timestamp: -1 });
    checks.push({
      name: '审计日志',
      status: recentLog ? 'healthy' : 'warning',
      lastLogTime: recentLog?.timestamp
    });
  } catch (error) {
    checks.push({ name: '审计日志', status: 'unhealthy', error: error.message });
  }

  const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';

  return {
    status: overallStatus,
    checks,
    timestamp: new Date()
  };
}

module.exports = router;