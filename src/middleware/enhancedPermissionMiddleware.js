/**
 * 增强权限中间件
 * 提供动态权限验证、继承权限检查等功能
 */

const EnhancedPermissionService = require('../services/enhancedPermissionService')
const logger = require('../config/logger')

const enhancedPermissionService = new EnhancedPermissionService()

/**
 * 权限验证中间件
 * @param {String|Array} permissions - 需要的权限
 * @param {Object} options - 选项
 * @returns {Function} 中间件函数
 */
const requirePermissions = (permissions, options = {}) => {
  const {
    requireAll = true, // 是否需要所有权限
    allowSelf = true, // 是否允许用户操作自己的资源
    resourceParam = 'id' // 资源ID参数名
  } = options

  return async (req, res, next) => {
    try {
      // 检查用户是否已认证
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          message: '未认证用户',
          code: 'UNAUTHORIZED'
        })
      }

      // 如果是操作自己的资源
      if (allowSelf && req.params[resourceParam] === req.user._id.toString()) {
        return next()
      }

      // 转换权限为数组
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions]

      // 权限检查结果
      const permissionResults = []

      // 批量检查权限
      for (const permission of requiredPermissions) {
        const [resource, action] = permission.split(':')

        if (!resource || !action) {
          permissionResults.push({
            permission,
            allowed: false,
            reason: 'INVALID_PERMISSION_FORMAT'
          })
          continue
        }

        try {
          const result = await enhancedPermissionService.enhancedPermissionCheck(
            req.user,
            resource,
            action,
            {
              method: req.method,
              url: req.originalUrl,
              deviceId: req.get('X-Device-Id'),
              deviceFingerprint: req.get('X-Device-Fingerprint'),
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            }
          )

          permissionResults.push({
            permission,
            allowed: result.allowed,
            reason: result.reason,
            policyApplied: result.policyApplied
          })

        } catch (error) {
          logger.error('权限检查失败:', error)
          permissionResults.push({
            permission,
            allowed: false,
            reason: 'PERMISSION_CHECK_ERROR',
            error: error.message
          })
        }
      }

      // 判断是否允许访问
      let allowed = false
      if (requireAll) {
        // 需要所有权限
        allowed = permissionResults.every(result => result.allowed)
      } else {
        // 只需要其中一个权限
        allowed = permissionResults.some(result => result.allowed)
      }

      if (!allowed) {
        const deniedPermissions = permissionResults.filter(result => !result.allowed)

        return res.status(403).json({
          success: false,
          message: '权限不足',
          code: 'PERMISSION_DENIED',
          data: {
            requiredPermissions,
            deniedPermissions: deniedPermissions.map(result => ({
              permission: result.permission,
              reason: result.reason
            }))
          }
        })
      }

      // 将权限检查结果添加到请求对象
      req.permissionCheck = {
        permissions: requiredPermissions,
        results: permissionResults
      }

      next()

    } catch (error) {
      logger.error('权限中间件错误:', error)
      res.status(500).json({
        success: false,
        message: '权限验证失败',
        code: 'PERMISSION_MIDDLEWARE_ERROR'
      })
    }
  }
}

/**
 * 角色验证中间件
 * @param {String|Array} roles - 允许的角色
 * @param {Object} options - 选项
 * @returns {Function} 中间件函数
 */
const requireRoles = (roles, options = {}) => {
  const {
    requireAll = false // 是否需要匹配所有角色
  } = options

  return (req, res, next) => {
    try {
      // 检查用户是否已认证
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          message: '未认证用户',
          code: 'UNAUTHORIZED'
        })
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles]
      const userRole = req.user.role

      let hasRole = false
      if (requireAll) {
        // 需要匹配所有角色
        hasRole = allowedRoles.every(role => userRole === role)
      } else {
        // 只需要匹配其中一个角色
        hasRole = allowedRoles.includes(userRole)
      }

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: '角色权限不足',
          code: 'ROLE_PERMISSION_DENIED',
          data: {
            requiredRoles: allowedRoles,
            userRole
          }
        })
      }

      next()

    } catch (error) {
      logger.error('角色验证中间件错误:', error)
      res.status(500).json({
        success: false,
        message: '角色验证失败',
        code: 'ROLE_MIDDLEWARE_ERROR'
      })
    }
  }
}

/**
 * 超级管理员验证中间件
 */
const requireSuperAdmin = requireRoles(['super_admin'])

/**
 * 村管理员验证中间件
 */
const requireVillageAdmin = requireRoles(['super_admin', 'village_admin'], { requireAll: false })

/**
 * 工作人员验证中间件
 */
const requireStaff = requireRoles(['super_admin', 'village_admin', 'department_head', 'staff'], { requireAll: false })

/**
 * 村民验证中间件
 */
const requireVillager = requireRoles(['super_admin', 'village_admin', 'department_head', 'staff', 'villager'], { requireAll: false })

/**
 * 资源所有者验证中间件
 * @param {String} userIdField - 用户ID字段名
 * @param {Object} options - 选项
 * @returns {Function} 中间件函数
 */
const requireResourceOwner = (userIdField = 'userId', options = {}) => {
  const {
    allowAdmin = true, // 是否允许管理员访问
    strict = false // 是否严格模式（只有所有者可以访问）
  } = options

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          message: '未认证用户',
          code: 'UNAUTHORIZED'
        })
      }

      const resourceUserId = req.body[userIdField] || req.params[userIdField] || req.query[userIdField]
      const currentUserId = req.user._id.toString()

      // 检查是否是资源所有者
      const isOwner = resourceUserId && resourceUserId.toString() === currentUserId

      // 检查是否是管理员
      const isAdmin = allowAdmin && (
        req.user.role === 'super_admin' ||
        req.user.role === 'village_admin'
      )

      // 允许访问的条件
      const allowed = isOwner || (!strict && isAdmin)

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: '无权访问该资源',
          code: 'RESOURCE_ACCESS_DENIED',
          data: {
            isOwner,
            isAdmin,
            resourceUserId,
            currentUserId
          }
        })
      }

      // 标记为资源所有者访问
      req.isResourceOwner = isOwner

      next()

    } catch (error) {
      logger.error('资源所有者验证中间件错误:', error)
      res.status(500).json({
        success: false,
        message: '资源访问验证失败',
        code: 'RESOURCE_OWNER_MIDDLEWARE_ERROR'
      })
    }
  }
}

/**
 * 会话验证中间件
 */
const validateSession = async (req, res, next) => {
  try {
    const sessionId = req.get('X-Session-Id')

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: '缺少会话ID',
        code: 'MISSING_SESSION_ID'
      })
    }

    const sessionResult = await enhancedPermissionService.manageSession(sessionId, {
      lastActivity: new Date(),
      endpoint: req.originalUrl
    })

    if (!sessionResult.valid) {
      return res.status(401).json({
        success: false,
        message: '会话无效或已过期',
        code: 'INVALID_SESSION'
      })
    }

    // 添加会话信息到请求对象
    req.sessionInfo = {
      sessionId,
      remainingTime: sessionResult.remainingTime,
      lastActivity: sessionResult.session.lastActivity
    }

    next()

  } catch (error) {
    logger.error('会话验证中间件错误:', error)
    res.status(500).json({
      success: false,
      message: '会话验证失败',
      code: 'SESSION_VALIDATION_ERROR'
    })
  }
}

/**
 * 权限缓存刷新中间件
 * @param {String} userId - 用户ID（可选）
 */
const refreshPermissionCache = (userId = null) => {
  return async (req, res, next) => {
    try {
      // 如果指定了用户ID，只刷新该用户的权限缓存
      if (userId) {
        const cacheKey = `enhanced_permissions_${userId}`
        enhancedPermissionService.permissionCache.del(cacheKey)
      } else {
        // 否则刷新所有权限缓存
        enhancedPermissionService.clearPermissionCache()
      }

      next()

    } catch (error) {
      logger.error('权限缓存刷新失败:', error)
      // 缓存刷新失败不应该影响正常流程
      next()
    }
  }
}

/**
 * 操作审计中间件
 * @param {Object} options - 选项
 * @returns {Function} 中间件函数
 */
const auditOperation = (options = {}) => {
  const {
    resource,
    action,
    sensitiveLevel = 'normal',
    logResponse = false,
    logRequestBody = true
  } = options

  return (req, res, next) => {
    // 记录请求开始时间
    req.auditStartTime = Date.now()
    req.auditData = {
      resource: resource || req.route?.path,
      action: action || req.method.toLowerCase(),
      sensitiveLevel,
      method: req.method,
      url: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?._id,
      userRole: req.user?.role
    }

    // 记录请求体（如果不包含敏感信息）
    if (logRequestBody && req.body && sensitiveLevel !== 'high') {
      req.auditData.requestBody = JSON.parse(JSON.stringify(req.body))
    }

    // 修改res.end以记录响应
    const originalEnd = res.end
    res.end = function(chunk, encoding) {
      if (logResponse && sensitiveLevel !== 'high') {
        req.auditData.responseBody = chunk ? chunk.toString() : null
      }

      req.auditData.responseStatus = res.statusCode
      req.auditData.duration = Date.now() - req.auditStartTime

      // 异步记录审计日志
      setImmediate(() => {
        try {
          enhancedPermissionService.logOperation({
            operation: 'API_ACCESS',
            resource: req.auditData.resource,
            action: req.auditData.action,
            actor: req.user ? {
              userId: req.user._id,
              userName: req.user.profile?.displayName || req.user.auth?.username,
              userRole: req.user.role
            } : null,
            system: 'api',
            method: req.auditData.method,
            url: req.auditData.url,
            ipAddress: req.auditData.ipAddress,
            userAgent: req.auditData.userAgent,
            result: {
              status: res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
              statusCode: res.statusCode,
              duration: req.auditData.duration
            },
            dataChange: {
              requestBody: req.auditData.requestBody,
              responseBody: req.auditData.responseBody
            },
            privacy: {
              sensitiveLevel,
              accessReason: 'API操作',
              legalBasis: 'legitimate_interest'
            }
          })
        } catch (error) {
          logger.error('记录审计日志失败:', error)
        }
      })

      originalEnd.call(this, chunk, encoding)
    }

    next()
  }
}

module.exports = {
  requirePermissions,
  requireRoles,
  requireSuperAdmin,
  requireVillageAdmin,
  requireStaff,
  requireVillager,
  requireResourceOwner,
  validateSession,
  refreshPermissionCache,
  auditOperation,
  enhancedPermissionService
}