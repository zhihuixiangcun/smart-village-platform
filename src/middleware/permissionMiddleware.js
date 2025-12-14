/**
 * 权限管理中间件
 * 实现村级管理员唯一认证、分级权限控制、操作审计日志和数据脱敏
 */

const { VillageAdminAuth, PermissionTemplate, AuditLog } = require('../models/Permission');
const { promisify } = require('util');
const crypto = require('crypto');

const randomBytesAsync = promisify(crypto.randomBytes);

/**
 * 记录审计日志中间件
 */
const auditLogger = (operation = {}, options = {}) => {
  return async (req, res, next) => {
    const startTime = Date.now();

    // 生成审计日志ID
    const auditId = crypto.randomUUID();

    // 将审计信息附加到请求对象
    req.auditId = auditId;
    req.auditOperation = {
      type: operation.type || req.method,
      resource: operation.resource || req.path,
      action: operation.action || 'UNKNOWN',
      description: operation.description || `${req.method} ${req.path}`,
      sensitiveLevel: options.sensitiveLevel || 'internal',
      requiresArchival: options.requiresArchival || false
    };

    // 在响应结束时记录审计日志
    const originalSend = res.send;
    res.send = function(data) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 异步记录审计日志（不阻塞响应）
      setImmediate(async () => {
        try {
          await logOperation(req, res, duration, data);
        } catch (error) {
          console.error('审计日志记录失败:', error);
        }
      });

      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * 记录操作审计日志
 */
async function logOperation(req, res, duration, responseData) {
  try {
    // 获取用户信息
    const user = req.user;
    if (!user) return;

    // 解析响应数据
    let parsedResponse = responseData;
    if (typeof responseData === 'string') {
      try {
        parsedResponse = JSON.parse(responseData);
      } catch (e) {
        parsedResponse = { message: responseData };
      }
    }

    // 确定操作结果状态
    const resultStatus = res.statusCode >= 200 && res.statusCode < 300 ? 'SUCCESS' : 'FAILURE';
    const errorMessage = parsedResponse?.error || parsedResponse?.message || null;

    // 构建审计日志数据
    const auditLogData = {
      logId: req.auditId,
      operation: {
        type: req.auditOperation.type,
        resource: req.auditOperation.resource,
        action: req.auditOperation.action,
        description: req.auditOperation.description
      },
      actor: {
        userId: user._id,
        userName: user.name || user.username,
        userRole: user.role || 'user',
        userPhone: user.phone || null,
        userEmail: user.email || null,
        userVillageId: user.villageId || null
      },
      result: {
        status: resultStatus,
        errorMessage: errorMessage,
        errorCode: parsedResponse?.errorCode || null,
        affectedRecords: getAffectedRecords(req, parsedResponse)
      },
      dataChange: getDataChangeInfo(req, parsedResponse),
      privacy: {
        sensitiveLevel: req.auditOperation.sensitiveLevel,
        accessReason: getAccessReason(req),
        legalBasis: getLegalBasis(user.role, req.auditOperation.resource),
        dataMinimized: isDataMinimized(req.auditOperation.sensitiveLevel)
      },
      system: {
        platform: req.headers['x-platform'] || 'api',
        userAgent: req.headers['user-agent'],
        ipAddress: getClientIP(req),
        deviceId: req.headers['x-device-id'],
        sessionId: req.sessionID
      },
      timestamp: new Date(),
      duration: duration,
      risk: {
        level: assessRiskLevel(req, user),
        score: calculateRiskScore(req, user),
        indicators: getRiskIndicators(req, user),
        mitigation: getMitigationStrategy(req.auditOperation.sensitiveLevel)
      },
      compliance: {
        regulations: getApplicableRegulations(req.auditOperation.resource),
        retentionPeriod: 10 * 365 * 24 * 60 * 60 * 1000, // 10年
        requiresArchival: req.auditOperation.requiresArchival,
        encrypted: true,
        signed: false
      },
      metadata: {
        correlationId: req.headers['x-correlation-id'],
        requestId: req.id,
        tags: getAuditTags(req, user),
        notes: getAuditNotes(req, parsedResponse)
      }
    };

    await AuditLog.logOperation(auditLogData);
  } catch (error) {
    console.error('记录审计日志失败:', error);
  }
}

/**
 * 村级管理员唯一认证中间件
 */
const requireVillageAdminAuth = (villageIdParam = 'villageId') => {
  return async (req, res, next) => {
    try {
      const villageId = req.params[villageIdParam] || req.body.villageId || req.user.villageId;

      if (!villageId) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_VILLAGE_ID',
          message: '缺少村庄ID'
        });
      }

      // 查找村级管理员认证记录
      const authRecord = await VillageAdminAuth.findOne({
        villageId: villageId,
        status: 'active'
      }).populate('currentAdmin.userId', 'name username email phone');

      if (!authRecord) {
        return res.status(403).json({
          success: false,
          error: 'VILLAGE_ADMIN_NOT_FOUND',
          message: '该村庄没有激活的管理员'
        });
      }

      // 检查当前用户是否是管理员
      const currentUserId = req.user._id.toString();
      if (authRecord.currentAdmin.userId._id.toString() !== currentUserId) {
        // 检查是否是备份管理员
        const isBackupAdmin = authRecord.backupAdmins.some(backup =>
          backup.userId.toString() === currentUserId &&
          new Date(backup.expiresAt) > new Date() &&
          backup.permissions.includes(`${req.auditOperation.resource}:${req.auditOperation.action}`)
        );

        if (!isBackupAdmin) {
          return res.status(403).json({
            success: false,
            error: 'NOT_VILLAGE_ADMIN',
            message: '您不是该村庄的管理员'
          });
        }
      }

      // IP白名单检查
      if (!authRecord.isIPAllowed(getClientIP(req))) {
        return res.status(403).json({
          success: false,
          error: 'IP_NOT_ALLOWED',
          message: '您的IP地址不在允许的范围内'
        });
      }

      // 设备白名单检查
      const deviceId = req.headers['x-device-id'];
      const deviceFingerprint = req.headers['x-device-fingerprint'];
      if (!authRecord.isDeviceAllowed(deviceId, deviceFingerprint)) {
        return res.status(403).json({
          success: false,
          error: 'DEVICE_NOT_ALLOWED',
          message: '您的设备未在授权设备列表中'
        });
      }

      // 更新最后登录时间和统计信息
      authRecord.statistics.totalLogins += 1;
      authRecord.statistics.lastLoginAt = new Date();
      authRecord.statistics.successfulLogins += 1;

      if (req.path === '/api/auth/login') {
        authRecord.statistics.totalLogins += 1;
      }

      if (req.path.includes('/export')) {
        authRecord.statistics.dataExports += 1;
      }

      if (req.auditOperation.resource === 'permission') {
        authRecord.statistics.permissionChanges += 1;
      }

      await authRecord.save();

      // 将认证信息附加到请求对象
      req.villageAdminAuth = authRecord;
      next();
    } catch (error) {
      console.error('村级管理员认证失败:', error);
      return res.status(500).json({
        success: false,
        error: 'AUTHENTICATION_ERROR',
        message: '认证过程中发生错误'
      });
    }
  };
};

/**
 * 权限检查中间件
 */
const requirePermission = (resource, action, scope = 'own') => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '未认证的用户'
        });
      }

      // 如果是村级管理员，检查管理员权限
      if (req.villageAdminAuth) {
        const hasPermission = req.villageAdminAuth.hasPermission(
          user._id,
          resource,
          action
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: 'INSUFFICIENT_PERMISSION',
            message: '您没有执行此操作的权限'
          });
        }
        return next();
      }

      // 对于普通用户，检查权限模板
      const permissionKey = `${resource}:${action}`;
      let userPermissions = [];

      // 获取用户角色权限
      if (user.role) {
        const template = await PermissionTemplate.getTemplateByRole(user.role);
        if (template) {
          userPermissions = template.permissions.map(p => `${p.resource}:${p.actions[0]}`);
        }
      }

      // 检查用户自定义权限
      if (user.permissions && Array.isArray(user.permissions)) {
        userPermissions = userPermissions.concat(user.permissions);
      }

      // 检查权限
      if (!userPermissions.includes(permissionKey)) {
        return res.status(403).json({
          success: false,
          error: 'PERMISSION_DENIED',
          message: '您没有执行此操作的权限'
        });
      }

      // 检查作用域权限
      const hasScopePermission = await checkScopePermission(req, user, resource, action, scope);
      if (!hasScopePermission) {
        return res.status(403).json({
          success: false,
          error: 'SCOPE_PERMISSION_DENIED',
          message: '您没有在此作用域执行操作的权限'
        });
      }

      next();
    } catch (error) {
      console.error('权限检查失败:', error);
      return res.status(500).json({
        success: false,
        error: 'PERMISSION_CHECK_ERROR',
        message: '权限检查过程中发生错误'
      });
    }
  };
};

/**
 * 数据脱敏中间件
 */
const dataMasking = (options = {}) => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      try {
        // 解析响应数据
        let responseData = data;
        if (typeof data === 'string') {
          try {
            responseData = JSON.parse(data);
          } catch (e) {
            responseData = { message: data };
          }
        }

        // 应用数据脱敏
        const maskedData = maskSensitiveData(responseData, req.user, options);

        // 发送脱敏后的数据
        originalSend.call(this, typeof data === 'string' ? JSON.stringify(maskedData) : maskedData);
      } catch (error) {
        console.error('数据脱敏失败:', error);
        originalSend.call(this, data);
      }
    };
    next();
  };
};

/**
 * 数据脱敏处理
 */
function maskSensitiveData(data, user, options) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const maskedData = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveFields = [
    'idCard', 'idNumber', 'bankAccount', 'bankCard', 'phone', 'email',
    'address', 'details', 'remark', 'notes', 'description'
  ];

  // 递归脱敏处理
  function recursiveMask(obj, path = '') {
    if (Array.isArray(obj)) {
      return obj.map((item, index) => recursiveMask(item, `${path}[${index}]`));
    }

    if (obj && typeof obj === 'object') {
      const result = {};

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        // 检查是否为敏感字段
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          result[key] = maskFieldValue(key, value, user, options);
        } else if (typeof value === 'object' && value !== null) {
          result[key] = recursiveMask(value, currentPath);
        } else {
          result[key] = value;
        }
      }

      return result;
    }

    return obj;
  }

  return recursiveMask(maskedData);
}

/**
 * 字段值脱敏
 */
function maskFieldValue(fieldName, value, user, options) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  // 管理员可以查看完整信息
  if (user && user.role && ['super_admin', 'village_admin'].includes(user.role)) {
    return value;
  }

  // 本人可以查看自己的完整信息
  if (options.isOwner && options.isOwner === true) {
    return value;
  }

  // 根据字段类型进行脱敏
  const field = fieldName.toLowerCase();

  if (field.includes('idcard') || field.includes('idnumber')) {
    // 身份证脱敏
    return value.length > 8 ? value.substring(0, 6) + '********' + value.substring(value.length - 4) : '********';
  }

  if (field.includes('phone')) {
    // 手机号脱敏
    return value.length === 11 ? value.substring(0, 3) + '****' + value.substring(7) : '********';
  }

  if (field.includes('email')) {
    // 邮箱脱敏
    const [local, domain] = value.split('@');
    if (local && domain) {
      const maskedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***';
      return maskedLocal + '@' + domain;
    }
    return '***@***.***';
  }

  if (field.includes('bank')) {
    // 银行卡脱敏
    return value.length > 8 ? '**** **** **** ' + value.substring(value.length - 4) : '****';
  }

  if (field.includes('address')) {
    // 地址脱敏 - 只显示省份和城市
    return value.length > 6 ? value.substring(0, 6) + '***' : '***';
  }

  // 默认脱敏
  return value.length > 4 ? value.substring(0, 2) + '***' + value.substring(value.length - 2) : '***';
}

/**
 * 检查作用域权限
 */
async function checkScopePermission(req, user, resource, action, requiredScope) {
  // 超级管理员拥有所有权限
  if (user.role === 'super_admin') {
    return true;
  }

  // 村级管理员可以管理全村数据
  if (user.role === 'village_admin' && req.villageAdminAuth) {
    return true;
  }

  // 检查数据所有权
  switch (requiredScope) {
    case 'own':
      return checkOwnership(req, user);
    case 'village':
      return checkVillageAccess(req, user);
    case 'all':
      return user.role === 'super_admin' || user.role === 'department_head';
    default:
      return false;
  }
}

/**
 * 检查数据所有权
 */
function checkOwnership(req, user) {
  const targetUserId = req.params.userId || req.body.targetUserId || req.query.userId;
  return !targetUserId || targetUserId === user._id.toString();
}

/**
 * 检查村庄访问权限
 */
function checkVillageAccess(req, user) {
  const targetVillageId = req.params.villageId || req.body.villageId || req.query.villageId;
  return !targetVillageId || targetVillageId === user.villageId;
}

/**
 * 辅助函数
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip;
}

function getAffectedRecords(req, responseData) {
  if (responseData && responseData.data) {
    if (Array.isArray(responseData.data)) {
      return responseData.data.length;
    }
    return 1;
  }
  return 0;
}

function getDataChangeInfo(req, responseData) {
  // 这里可以根据具体的请求类型和响应数据来构建变更信息
  return {
    oldValue: req.body?.oldValue || null,
    newValue: req.body?.newValue || null,
    sensitiveFields: req.body?.sensitiveFields || [],
    maskedFields: req.body?.maskedFields || [],
    changeType: req.method.toLowerCase() === 'post' ? 'create' : 'update'
  };
}

function getAccessReason(req) {
  switch (req.path) {
    case '/api/auth/login': return '用户登录';
    case '/api/users/profile': return '查看个人信息';
    default: return '系统操作';
  }
}

function getLegalBasis(userRole, resource) {
  if (['super_admin', 'village_admin'].includes(userRole)) {
    return 'legal_obligation';
  }
  return 'consent';
}

function isDataMinimized(sensitiveLevel) {
  return ['sensitive', 'confidential'].includes(sensitiveLevel);
}

function assessRiskLevel(req, user) {
  // 根据操作类型和用户角色评估风险等级
  if (['delete', 'export', 'approve'].includes(req.auditOperation.action)) {
    return user.role === 'super_admin' ? 'low' : 'medium';
  }
  return 'low';
}

function calculateRiskScore(req, user) {
  let score = 0;
  score += req.auditOperation.sensitiveLevel === 'confidential' ? 30 : 0;
  score += req.auditOperation.action === 'delete' ? 20 : 0;
  score += !['super_admin', 'village_admin'].includes(user.role) ? 15 : 0;
  return Math.min(score, 100);
}

function getRiskIndicators(req, user) {
  const indicators = [];
  if (req.auditOperation.sensitiveLevel === 'confidential') indicators.push('HIGH_SENSITIVITY');
  if (req.auditOperation.action === 'delete') indicators.push('DESTRUCTIVE_OPERATION');
  if (!['super_admin', 'village_admin'].includes(user.role)) indicators.push('ELEVATED_PRIVILEGE');
  return indicators;
}

function getMitigationStrategy(sensitiveLevel) {
  if (sensitiveLevel === 'confidential') {
    return 'Requires multi-factor authentication and admin approval';
  }
  return 'Standard access controls apply';
}

function getApplicableRegulations(resource) {
  return ['GDPR', '个人信息保护法', '网络安全法'];
}

function getAuditTags(req, user) {
  const tags = [];
  tags.push(user.role || 'user');
  tags.push(req.auditOperation.resource);
  tags.push(req.auditOperation.action);
  return tags;
}

function getAuditNotes(req, responseData) {
  const notes = [];
  if (req.body.reason) notes.push(`操作原因: ${req.body.reason}`);
  if (responseData?.warning) notes.push(`警告: ${responseData.warning}`);
  return notes.join('; ');
}

module.exports = {
  auditLogger,
  requireVillageAdminAuth,
  requirePermission,
  dataMasking
};