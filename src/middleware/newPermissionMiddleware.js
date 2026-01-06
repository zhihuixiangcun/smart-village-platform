/**
 * enhancedPermissionMiddleware.js - 增强型权限验证中间件
 *
 * 基于新的权限模型实现的权限验证中间件
 * 提供基于角色的权限验证、审批流程检查、敏感操作二次确认等功能
 */

const CommitteeRoleAssignment = require('../models/CommitteeRoleAssignment');
const CommitteeApplication = require('../models/CommitteeApplication');
const PermissionHelper = require('../utils/permissionHelper');
const AuditLog = require('../models/AuditLog');
const { buildPermission, PERMISSION_MODULES, ACTIONS } = require('../config/permissions');

/**
 * 权限验证中间件工厂函数
 * @param {string|string[]} permissions - 所需权限（支持多个）
 * @param {Object} options - 配置选项
 * @returns {Function} Express中间件
 */
const checkPermission = (permissions, options = {}) => {
  const {
    checkApproval = false,
    checkDataScope = false,
    requireSecondaryAuth = false,
    allowSelf = true
  } = options;

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          code: 401,
          message: '未授权访问',
          error: 'UNAUTHORIZED'
        });
      }

      // 获取用户角色分配
      const assignment = await CommitteeRoleAssignment.getUserRole(
        user._id || user.userId,
        req.villageId || req.body.villageId || req.query.villageId
      );

      if (!assignment) {
        return res.status(403).json({
          success: false,
          code: 403,
          message: '未分配角色',
          error: 'NO_ROLE_ASSIGNED'
        });
      }

      // 检查角色有效性
      if (!assignment.isValid) {
        return res.status(403).json({
          success: false,
          code: 403,
          message: '角色已过期或被停用',
          error: 'ROLE_INVALID'
        });
      }

      // 权限数组化
      const permArray = Array.isArray(permissions) ? permissions : [permissions];

      // 检查权限
      const hasPermission = PermissionHelper.hasAnyPermission(assignment, permArray);

      if (!hasPermission) {
        await AuditLog.log({
          operatorId: user._id || user.userId,
          operatorName: user.name,
          operatorRole: assignment.roleCode,
          villageId: assignment.villageId,
          action: 'unauthorized_access',
          actionName: '未授权的访问尝试',
          result: 'failure',
          errorMessage: `缺少权限: ${permArray.join(', ')}`,
          context: {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            url: req.originalUrl
          }
        });

        return res.status(403).json({
          success: false,
          code: 403,
          message: '权限不足',
          error: 'PERMISSION_DENIED',
          requiredPermissions: permArray
        });
      }

      // 检查审批要求
      if (checkApproval) {
        const context = {
          amount: req.body.amount,
          resourceType: req.params.resource
        };

        for (const perm of permArray) {
          const approvalCheck = PermissionHelper.checkApprovalNeeded(assignment, perm, context);

          if (approvalCheck.required) {
            return res.status(403).json({
              success: false,
              code: 403,
              message: approvalCheck.message || '该操作需要审批',
              error: 'APPROVAL_REQUIRED',
              requiresApproval: true,
              approvalConfig: approvalCheck.config
            });
          }
        }
      }

      // 注入用户角色到请求
      req.userRole = assignment;
      req.userPermissions = await assignment.getAllPermissions();

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        code: 500,
        message: '权限检查失败',
        error: error.message
      });
    }
  };
};

/**
 * 角色验证中间件
 */
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: '未授权访问' });
      }

      const assignment = await CommitteeRoleAssignment.getUserRole(
        user._id || user.userId,
        req.villageId || req.body.villageId || req.query.villageId
      );

      if (!assignment) {
        return res.status(403).json({ success: false, message: '未分配角色' });
      }

      const roleArray = Array.isArray(roles) ? roles : [roles];
      if (!roleArray.includes(assignment.roleCode)) {
        return res.status(403).json({
          success: false,
          message: '角色不符',
          requiredRoles: roleArray,
          currentRole: assignment.roleCode
        });
      }

      req.userRole = assignment;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ success: false, message: '角色检查失败' });
    }
  };
};

/**
 * 村支书专用中间件
 */
const requireSecretary = checkRole(['secretary']);

/**
 * 村主任专用中间件
 */
const requireVillageHead = checkRole(['secretary', 'village_head']);

/**
 * 会计专用中间件
 */
const requireAccountant = checkRole(['secretary', 'accountant']);

/**
 * 人口主任专用中间件
 */
const requirePopulationAdmin = checkRole(['secretary', 'population_admin']);

/**
 * 治保主任专用中间件
 */
const requireSecurityDirector = checkRole(['secretary', 'security_director']);

/**
 * 村干部专用中间件
 */
const requireCommitteeMember = checkRole([
  'secretary',
  'village_head',
  'accountant',
  'population_admin',
  'security_director'
]);

/**
 * 审计日志中间件
 */
const auditLog = (actionName, isSensitive = false) => {
  return async (req, res, next) => {
    const user = req.user;
    const userRole = req.userRole;

    if (user && userRole) {
      res.on('finish', async () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 500) {
            await AuditLog.log({
              operatorId: user._id || user.userId,
              operatorName: user.name,
              operatorRole: userRole.roleCode,
              villageId: userRole.villageId,
              action: `${req.method.toLowerCase()}:${req.route?.path || req.originalUrl}`,
              actionName,
              resourceType: req.params.resource,
              resourceId: req.params.id,
              details: { method: req.method, path: req.originalUrl },
              isSensitive,
              result: res.statusCode < 300 ? 'success' : 'failure',
              context: {
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                statusCode: res.statusCode
              }
            });
          }
        } catch (error) {
          console.error('Audit log error:', error);
        }
      });
    }

    next();
  };
};

module.exports = {
  checkPermission,
  checkRole,
  requireSecretary,
  requireVillageHead,
  requireAccountant,
  requirePopulationAdmin,
  requireSecurityDirector,
  requireCommitteeMember,
  auditLog
};
