/**
 * 权限管理控制器
 * 处理村级管理员认证、权限模板管理、审计日志查询等
 */

const { VillageAdminAuth, PermissionTemplate, AuditLog, PermissionLevels } = require('../models/Permission');
const { promisify } = require('util');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const randomBytesAsync = promisify(crypto.randomBytes);

// 文件上传配置
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 JPEG、JPG、PNG 和 PDF 格式的文件'));
    }
  }
});

/**
 * 申请村级管理员认证
 */
async function createVillageAdminAuth(req, res) {
  try {
    const {
      villageId,
      adminData,
      appointmentDocument
    } = req.body;

    // 验证必填字段
    if (!villageId || !adminData) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: '缺少必填字段'
      });
    }

    // 检查村庄是否已有激活的管理员
    const uniquenessCheck = await VillageAdminAuth.validateVillageAdminUniqueness(
      villageId,
      req.user._id
    );

    if (!uniquenessCheck.valid) {
      return res.status(409).json({
        success: false,
        error: 'ADMIN_ALREADY_EXISTS',
        message: uniquenessCheck.reason,
        existingAdmin: uniquenessCheck.existingAdmin
      });
    }

    // 处理任命文档上传
    let documentData = null;
    if (req.file) {
      const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
      const fileName = `appointment_${villageId}_${Date.now()}${path.extname(req.file.originalname)}`;
      const filePath = path.join(__dirname, '../uploads', fileName);

      // 确保上传目录存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, req.file.buffer);

      documentData = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/${fileName}`,
        uploadDate: new Date(),
        fileHash,
        ocrVerified: false,
        ocrResult: {}
      };
    }

    // 创建村级管理员认证记录
    const authRecord = await VillageAdminAuth.createVillageAdminAuth(
      { villageId },
      {
        ...adminData,
        appointmentDocument: documentData || appointmentDocument
      },
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: '村级管理员认证申请已提交',
      data: {
        authId: authRecord._id,
        villageId: authRecord.villageId,
        status: authRecord.status,
        adminInfo: {
          name: authRecord.currentAdmin.userName,
          role: authRecord.currentAdmin.role,
          phone: authRecord.currentAdmin.userPhone
        }
      }
    });
  } catch (error) {
    console.error('创建村级管理员认证失败:', error);
    res.status(500).json({
      success: false,
      error: 'CREATION_FAILED',
      message: '创建认证申请失败',
      details: error.message
    });
  }
}

/**
 * 审核村级管理员认证申请
 */
async function reviewVillageAdminAuth(req, res) {
  try {
    const { authId } = req.params;
    const { action, reason, additionalNotes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ACTION',
        message: '操作类型无效'
      });
    }

    const authRecord = await VillageAdminAuth.findById(authId);
    if (!authRecord) {
      return res.status(404).json({
        success: false,
        error: 'AUTH_NOT_FOUND',
        message: '认证记录不存在'
      });
    }

    if (authRecord.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: '该认证申请已被处理'
      });
    }

    // 更新认证状态
    authRecord.status = action === 'approve' ? 'active' : 'inactive';

    // 添加时间线记录
    authRecord.authTimeline.push({
      action: action === 'approve' ? 'approved' : 'rejected',
      operator: req.user._id,
      operatorName: req.user.name || req.user.username,
      description: action === 'approve' ? '认证申请已通过' : '认证申请已被拒绝',
      evidence: {
        reason: reason || '',
        additionalNotes: additionalNotes || '',
        reviewedAt: new Date()
      }
    });

    // 如果是激活状态，设置激活时间
    if (action === 'approve') {
      const activatedEntry = authRecord.authTimeline.find(t => t.action === 'activated');
      if (!activatedEntry) {
        authRecord.authTimeline.push({
          action: 'activated',
          operator: req.user._id,
          operatorName: req.user.name || req.user.username,
          description: '村级管理员账户已激活',
          timestamp: new Date()
        });
      }
    }

    await authRecord.save();

    res.json({
      success: true,
      message: `认证申请已${action === 'approve' ? '通过' : '拒绝'}`,
      data: {
        authId: authRecord._id,
        status: authRecord.status,
        reviewedAt: new Date()
      }
    });
  } catch (error) {
    console.error('审核村级管理员认证失败:', error);
    res.status(500).json({
      success: false,
      error: 'REVIEW_FAILED',
      message: '审核操作失败'
    });
  }
}

/**
 * 获取村级管理员认证信息
 */
async function getVillageAdminAuth(req, res) {
  try {
    const { villageId } = req.params;

    const authRecord = await VillageAdminAuth.findOne({ villageId })
      .populate('currentAdmin.userId', 'name username email phone avatar')
      .populate('authTimeline.operator', 'name username')
      .populate('permissionChanges.operator', 'name username')
      .populate('backupAdmins.userId', 'name username email phone');

    if (!authRecord) {
      return res.status(404).json({
        success: false,
        error: 'AUTH_NOT_FOUND',
        message: '该村庄没有管理员认证记录'
      });
    }

    // 数据脱敏处理
    const maskedAuth = maskAuthData(authRecord, req.user);

    res.json({
      success: true,
      data: maskedAuth
    });
  } catch (error) {
    console.error('获取村级管理员认证信息失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取认证信息失败'
    });
  }
}

/**
 * 创建权限模板
 */
async function createPermissionTemplate(req, res) {
  try {
    const templateData = req.body;

    // 验证必填字段
    if (!templateData.name || !templateData.applicableRoles || !templateData.permissions) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: '缺少必填字段'
      });
    }

    const template = new PermissionTemplate({
      ...templateData,
      metadata: {
        ...templateData.metadata,
        createdBy: req.user._id,
        createdAt: new Date()
      }
    });

    await template.save();

    res.status(201).json({
      success: true,
      message: '权限模板创建成功',
      data: template
    });
  } catch (error) {
    console.error('创建权限模板失败:', error);
    res.status(500).json({
      success: false,
      error: 'CREATION_FAILED',
      message: '创建权限模板失败'
    });
  }
}

/**
 * 获取权限模板列表
 */
async function getPermissionTemplates(req, res) {
  try {
    const { role, status, templateType } = req.query;
    const query = {};

    if (role) query.applicableRoles = role;
    if (status) query.status = status;
    if (templateType) query.templateType = templateType;

    const templates = await PermissionTemplate.find(query)
      .populate('metadata.createdBy', 'name username')
      .populate('inheritsFrom.templateId', 'name description')
      .sort({ 'metadata.createdAt': -1 });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('获取权限模板列表失败:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_FAILED',
      message: '获取权限模板列表失败'
    });
  }
}

/**
 * 应用权限模板
 */
async function applyPermissionTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const { userId, expiresAt } = req.body;

    const result = await PermissionTemplate.applyTemplate(templateId, userId, expiresAt);

    res.json({
      success: true,
      message: '权限模板应用成功',
      data: {
        template: result.template,
        appliedPermissions: result.permissions
      }
    });
  } catch (error) {
    console.error('应用权限模板失败:', error);
    res.status(500).json({
      success: false,
      error: 'APPLICATION_FAILED',
      message: '应用权限模板失败'
    });
  }
}

/**
 * 查询审计日志
 */
async function queryAuditLogs(req, res) {
  try {
    const filters = {
      userId: req.query.userId,
      operation: req.query.operation,
      resource: req.query.resource,
      status: req.query.status,
      sensitiveLevel: req.query.sensitiveLevel,
      dateRange: req.query.dateRange ? JSON.parse(req.query.dateRange) : undefined,
      keyword: req.query.keyword,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await AuditLog.queryLogs(filters);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('查询审计日志失败:', error);
    res.status(500).json({
      success: false,
      error: 'QUERY_FAILED',
      message: '查询审计日志失败'
    });
  }
}

/**
 * 获取审计日志统计
 */
async function getAuditLogStats(req, res) {
  try {
    const { timeRange = '30d' } = req.query;

    // 计算时间范围
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeRange));

    const stats = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$result.status', 'SUCCESS'] }, 1, 0] }
          },
          failureCount: {
            $sum: { $cond: [{ $eq: ['$result.status', 'FAILURE'] }, 1, 0] }
          },
          criticalOperations: {
            $sum: { $cond: [{ $eq: ['$privacy.sensitiveLevel', 'confidential'] }, 1, 0] }
          },
          avgDuration: { $avg: '$duration' },
          uniqueUsers: { $addToSet: '$actor.userId' }
        }
      },
      {
        $project: {
          totalLogs: 1,
          successCount: 1,
          failureCount: 1,
          criticalOperations: 1,
          avgDuration: { $round: ['$avgDuration', 2] },
          uniqueUsersCount: { $size: '$uniqueUsers' },
          successRate: {
            $round: [
              { $multiply: [{ $divide: ['$successCount', '$totalLogs'] }, 100] },
              2
            ]
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalLogs: 0,
      successCount: 0,
      failureCount: 0,
      criticalOperations: 0,
      avgDuration: 0,
      uniqueUsersCount: 0,
      successRate: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取审计日志统计失败:', error);
    res.status(500).json({
      success: false,
      error: 'STATS_FAILED',
      message: '获取审计日志统计失败'
    });
  }
}

/**
 * 管理员权限变更
 */
async function changeAdminPermissions(req, res) {
  try {
    const { villageId } = req.params;
    const { targetUserId, permissions, reason } = req.body;

    const authRecord = await VillageAdminAuth.findOne({ villageId, status: 'active' });
    if (!authRecord) {
      return res.status(404).json({
        success: false,
        error: 'AUTH_NOT_FOUND',
        message: '该村庄没有激活的管理员'
      });
    }

    // 添加权限变更记录
    authRecord.permissionChanges.push({
      changeType: 'permission_grant',
      operator: req.user._id,
      operatorName: req.user.name || req.user.username,
      targetUser: targetUserId,
      targetUserName: req.body.targetUserName || '未知用户',
      oldPermissions: req.body.oldPermissions || [],
      newPermissions: permissions,
      reason: reason || '权限调整',
      approvedBy: req.user._id,
      approvedAt: new Date()
    });

    // 如果是备份管理员权限，更新备份管理员列表
    const backupAdmin = authRecord.backupAdmins.find(ba =>
      ba.userId.toString() === targetUserId
    );

    if (backupAdmin) {
      backupAdmin.permissions = permissions;
      backupAdmin.expiresAt = req.body.expiresAt || backupAdmin.expiresAt;
    } else {
      // 添加新的备份管理员
      authRecord.backupAdmins.push({
        userId: targetUserId,
        userName: req.body.targetUserName || '未知用户',
        phone: req.body.targetPhone || '',
        email: req.body.targetEmail || '',
        role: req.body.targetRole || 'backup_admin',
        permissions,
        activatedAt: new Date(),
        expiresAt: req.body.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 默认30天
      });
    }

    await authRecord.save();

    res.json({
      success: true,
      message: '管理员权限变更成功',
      data: {
        targetUser: targetUserId,
        newPermissions: permissions,
        changedAt: new Date()
      }
    });
  } catch (error) {
    console.error('管理员权限变更失败:', error);
    res.status(500).json({
      success: false,
      error: 'PERMISSION_CHANGE_FAILED',
      message: '权限变更失败'
    });
  }
}

/**
 * 数据脱敏处理
 */
function maskAuthData(authRecord, user) {
  const masked = { ...authRecord.toObject() };

  // 非管理员只能看到基本信息
  if (!['super_admin', 'village_admin', 'department_head'].includes(user.role)) {
    // 脱敏身份证号
    if (masked.currentAdmin?.idCard) {
      masked.currentAdmin.idCard = `${masked.currentAdmin.idCard.substring(0, 6) 
      }********${ 
        masked.currentAdmin.idCard.substring(masked.currentAdmin.idCard.length - 4)}`;
    }

    // 脱敏手机号
    if (masked.currentAdmin?.userPhone) {
      masked.currentAdmin.userPhone = `${masked.currentAdmin.userPhone.substring(0, 3) 
      }****${ 
        masked.currentAdmin.userPhone.substring(7)}`;
    }

    // 移除敏感的安全设置
    if (masked.securitySettings) {
      delete masked.securitySettings.ipWhitelist;
      delete masked.securitySettings.deviceWhitelist;
    }

    // 移除备份管理员的详细信息
    if (masked.backupAdmins) {
      masked.backupAdmins = masked.backupAdmins.map(ba => ({
        ...ba,
        phone: ba.phone ? `${ba.phone.substring(0, 3)  }****${  ba.phone.substring(7)}` : '',
        email: ba.email ? ba.email.replace(/(.{2}).*(@.*)/, '$1***$2') : ''
      }));
    }
  }

  return masked;
}

module.exports = {
  createVillageAdminAuth: [upload.single('appointmentDocument'), createVillageAdminAuth],
  reviewVillageAdminAuth,
  getVillageAdminAuth,
  createPermissionTemplate,
  getPermissionTemplates,
  applyPermissionTemplate,
  queryAuditLogs,
  getAuditLogStats,
  changeAdminPermissions
};