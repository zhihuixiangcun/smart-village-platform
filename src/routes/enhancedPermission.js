/**
 * 增强权限管理路由
 * 提供RBAC权限管理、动态权限策略、权限继承等功能
 */

const express = require('express');
const router = express.Router();
const enhancedPermissionController = require('../controllers/enhancedPermissionController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');
const auditMiddleware = require('../middleware/auditMiddleware');

// 应用中间件
router.use(authMiddleware); // 需要认证
router.use(auditMiddleware); // 审计日志
router.use(rateLimitMiddleware.auth); // 认证相关API限流

/**
 * @api {POST} /api/v1/enhanced-permissions/authenticate 增强认证
 * @apiName EnhancedAuthenticate
 * @apiGroup EnhancedPermissions
 * @apiDescription 增强用户认证，支持MFA、设备信任、地理位置验证
 * @apiPermission public
 *
 * @apiParam {String} username 用户名/邮箱/手机号
 * @apiParam {String} password 密码
 * @apiParam {String} deviceId 设备ID
 * @apiParam {String} deviceFingerprint 设备指纹
 * @apiParam {String} [mfaToken] 多因素认证令牌
 * @apiParam {Object} [location] 地理位置信息
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 认证结果
 * @apiSuccess {Object} data.user 用户信息
 * @apiSuccess {Object} data.session 会话信息
 * @apiSuccess {Array} data.permissions 权限列表
 * @apiSuccess {Object} data.deviceTrust 设备信任信息
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (401) {Boolean} success 认证失败
 * @apiError (401) {String} message 错误消息
 */
router.post('/authenticate', enhancedPermissionController.enhancedAuthenticate);

/**
 * @api {POST} /api/v1/enhanced-permissions/check 权限检查
 * @apiName CheckPermission
 * @apiGroup EnhancedPermissions
 * @apiDescription 增强权限检查，支持动态权限规则
 * @apiPermission user
 *
 * @apiParam {String} resource 资源标识
 * @apiParam {String} action 操作类型
 * @apiParam {Object} [context] 上下文信息
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 权限检查结果
 * @apiSuccess {Boolean} data.allowed 是否允许
 * @apiSuccess {String} [data.reason] 拒绝原因
 * @apiSuccess {Array} data.policyApplied 应用的策略
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 */
router.post('/check', enhancedPermissionController.checkPermission);

/**
 * @api {GET} /api/v1/enhanced-permissions/user/permissions 获取用户权限
 * @apiName GetUserPermissions
 * @apiGroup EnhancedPermissions
 * @apiDescription 获取当前用户的完整权限列表（包括继承权限）
 * @apiPermission user
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 权限信息
 * @apiSuccess {String} data.userId 用户ID
 * @apiSuccess {String} data.role 用户角色
 * @apiSuccess {Array} data.permissions 权限列表
 * @apiSuccess {Number} data.count 权限数量
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/user/permissions', enhancedPermissionController.getUserPermissions);

/**
 * @api {POST} /api/v1/enhanced-permissions/policies 创建权限策略
 * @apiName CreatePermissionPolicy
 * @apiGroup EnhancedPermissions
 * @apiDescription 创建动态权限策略
 * @apiPermission admin
 *
 * @apiParam {String} name 策略名称
 * @apiParam {String} description 策略描述
 * @apiParam {Array} rules 规则列表
 * @apiParam {Object} [conditions] 条件配置
 * @apiParam {Array} targetRoles 目标角色
 * @apiParam {String} [priority] 优先级
 * @apiParam {Boolean} [enabled] 是否启用
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 策略信息
 * @apiSuccess {String} data.id 策略ID
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (403) {String} message 错误消息
 */
router.post('/policies', enhancedPermissionController.createPermissionPolicy);

/**
 * @api {GET} /api/v1/enhanced-permissions/policies 获取权限策略列表
 * @apiName GetPermissionPolicies
 * @apiGroup EnhancedPermissions
 * @apiDescription 获取所有权限策略列表
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Array} data 策略列表
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/policies', enhancedPermissionController.getPermissionPolicies);

/**
 * @api {POST} /api/v1/enhanced-permissions/inheritance/configure 配置权限继承
 * @apiName ConfigurePermissionInheritance
 * @apiGroup EnhancedPermissions
 * @apiDescription 配置角色权限继承关系
 * @apiPermission admin
 *
 * @apiParam {String} role 角色名称
 * @apiParam {Array} inheritsFrom 继承的角色列表
 * @apiParam {Array} [additionalPermissions] 额外权限
 * @apiParam {Object} [conditions] 继承条件
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 配置结果
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (403) {String} message 错误消息
 */
router.post('/inheritance/configure', enhancedPermissionController.configurePermissionInheritance);

/**
 * @api {GET} /api/v1/enhanced-permissions/inheritance/config 获取权限继承配置
 * @apiName GetPermissionInheritanceConfig
 * @apiGroup EnhancedPermissions
 * @apiDescription 获取权限继承配置信息
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 继承配置
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/inheritance/config', enhancedPermissionController.getPermissionInheritanceConfig);

/**
 * @api {POST} /api/v1/enhanced-permissions/sessions/manage 会话管理
 * @apiName ManageSession
 * @apiGroup EnhancedPermissions
 * @apiDescription 管理用户会话，检查会话有效性
 * @apiPermission user
 *
 * @apiParam {String} sessionId 会话ID
 * @apiParam {Object} [sessionData] 会话数据
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 会话信息
 * @apiSuccess {Boolean} data.valid 会话是否有效
 * @apiSuccess {Number} data.remainingTime 剩余时间
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (401) {Boolean} success 会话无效
 * @apiError (401) {String} message 错误消息
 */
router.post('/sessions/manage', enhancedPermissionController.manageSession);

/**
 * @api {PUT} /api/v1/enhanced-permissions/users/:userId/permissions 实时更新权限
 * @apiName UpdatePermissionsRealtime
 * @apiGroup EnhancedPermissions
 * @apiDescription 实时更新用户权限并通知所有服务实例
 * @apiPermission admin
 *
 * @apiParam {String} userId 用户ID
 * @apiParam {Array} permissions 新权限列表
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 更新结果
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (403) {String} message 错误消息
 */
router.put('/users/:userId/permissions', enhancedPermissionController.updatePermissionsRealtime);

/**
 * @api {GET} /api/v1/enhanced-permissions/audit/report 生成权限审计报告
 * @apiName GeneratePermissionAuditReport
 * @apiGroup EnhancedPermissions
 * @apiDescription 生成权限审计报告
 * @apiPermission admin
 *
 * @apiParam {String} [startDate] 开始日期
 * @apiParam {String} [endDate] 结束日期
 * @apiParam {String} [userId] 用户ID
 * @apiParam {String} [resource] 资源
 * @apiParam {String} [action] 操作
 * @apiParam {String} [result] 结果
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 审计报告
 * @apiSuccess {Object} data.summary 摘要信息
 * @apiSuccess {Object} data.resources 资源统计
 * @apiSuccess {Object} data.users 用户统计
 * @apiSuccess {Object} data.policies 策略统计
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/audit/report', enhancedPermissionController.generatePermissionAuditReport);

/**
 * @api {DELETE} /api/v1/enhanced-permissions/cache 清理权限缓存
 * @apiName ClearPermissionCache
 * @apiGroup EnhancedPermissions
 * @apiDescription 清理权限缓存
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {String} message 清理结果
 *
 * @apiError (403) {Boolean} success 权限不足
 * @apiError (403) {String} message 错误消息
 */
router.delete('/cache', enhancedPermissionController.clearPermissionCache);

/**
 * @api {POST} /api/v1/enhanced-permissions/batch-check 批量权限检查
 * @apiName BatchCheckPermissions
 * @apiGroup EnhancedPermissions
 * @apiDescription 批量检查多个权限
 * @apiPermission user
 *
 * @apiParam {Array} permissions 权限检查列表
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 检查结果
 * @apiSuccess {Number} data.total 总数
 * @apiSuccess {Array} data.results 结果列表
 *
 * @apiError (400) {Boolean} success 失败
 * @apiError (400) {String} message 错误消息
 */
router.post('/batch-check', enhancedPermissionController.batchCheckPermissions);

/**
 * @api {GET} /api/v1/enhanced-permissions/stats 获取权限统计
 * @apiName GetPermissionStats
 * @apiGroup EnhancedPermissions
 * @apiDescription 获取权限管理统计信息
 * @apiPermission admin
 *
 * @apiSuccess {Boolean} success 是否成功
 * @apiSuccess {Object} data 统计信息
 * @apiSuccess {Number} data.totalUsers 用户总数
 * @apiSuccess {Number} data.totalRoles 角色总数
 * @apiSuccess {Number} data.activeSessions 活跃会话数
 * @apiSuccess {Object} data.permissionDistribution 权限分布
 *
 * @apiError (500) {Boolean} success 服务器错误
 * @apiError (500) {String} message 错误消息
 */
router.get('/stats', enhancedPermissionController.getPermissionStats);

// 错误处理中间件
router.use((error, req, res, next) => {
  const logger = require('../config/logger');

  logger.error('增强权限路由错误:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user ? req.user.id : 'anonymous'
  });

  // 参数验证错误
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: `参数验证失败: ${error.message}`
    });
  }

  // 权限错误
  if (error.status === 403) {
    return res.status(403).json({
      success: false,
      message: '权限不足'
    });
  }

  // 认证错误
  if (error.status === 401) {
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }

  // 默认错误处理
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

module.exports = router;