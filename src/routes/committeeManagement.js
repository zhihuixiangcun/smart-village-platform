/**
 * 村干部管理路由
 * 处理村干部账号申请、审核、角色分配、权限管理等功能
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, auditLog } = require('../middleware/newPermissionMiddleware');

// 引入模型
const CommitteeApplication = require('../models/CommitteeApplication');
const CommitteeRoleAssignment = require('../models/CommitteeRoleAssignment');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// 所有路由需要认证
router.use(authenticateToken);

/**
 * @route   POST /api/committee/applications
 * @desc    提交村干部账号申请
 * @access  Private (需要登录)
 */
router.post('/applications', async (req, res) => {
  try {
    const {
      applicationType,
      applicantInfo,
      targetRole,
      targetVillageId,
      documents,
      reason
    } = req.body;

    // 验证申请类型
    const validTypes = ['new_account', 'role_change', 'permission_grant', 'role_resign'];
    if (!validTypes.includes(applicationType)) {
      return res.status(400).json({
        success: false,
        message: '无效的申请类型'
      });
    }

    // 验证目标角色
    const validRoles = ['secretary', 'village_head', 'accountant', 'population_admin', 'security_director'];
    if (targetRole && !validRoles.includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: '无效的目标角色'
      });
    }

    // 检查是否已存在待审核的申请
    const existingApplication = await CommitteeApplication.findOne({
      'applicant.userId': req.user._id,
      targetVillageId,
      status: { $in: ['pending', 'under_review'] }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: '您已有待审核的申请，请等待审核完成'
      });
    }

    // 创建申请
    const application = new CommitteeApplication({
      applicationId: `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      applicationType,
      applicant: {
        userId: req.user._id,
        name: req.user.name,
        phone: req.user.phone,
        idCard: req.user.idCard,
        currentPosition: req.user.position
      },
      targetRole,
      targetVillageId,
      documents: documents || [],
      reason,
      status: 'pending',
      submittedAt: new Date()
    });

    // 根据申请类型设置审批工作流
    const role = await Role.findOne({ code: targetRole });
    if (role) {
      // 设置审批流程：需要村支书最终审批
      application.approvalWorkflow = [
        {
          step: 1,
          role: 'village_head',
          status: 'pending',
          required: role.level < 5
        },
        {
          step: 2,
          role: 'secretary',
          status: 'pending',
          required: true
        }
      ];
    }

    await application.save();

    // 记录审计日志
    await AuditLog.create({
      operatorId: req.user._id,
      operatorName: req.user.name,
      operatorRole: req.user.role,
      action: 'submit_committee_application',
      resourceType: 'CommitteeApplication',
      resourceId: application._id,
      details: {
        applicationId: application.applicationId,
        applicationType,
        targetRole,
        targetVillageId
      },
      isSensitive: true,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: '申请提交成功，等待审核',
      data: {
        applicationId: application.applicationId,
        status: application.status,
        currentStep: 1
      }
    });
  } catch (error) {
    logger.error('提交村干部申请失败:', error);
    res.status(500).json({
      success: false,
      message: '提交申请失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/committee/applications
 * @desc    获取村干部申请列表
 * @access  Private (村干部权限)
 */
router.get('/applications', checkPermission(['committee:read', 'committee:approve']), async (req, res) => {
  try {
    const { status, villageId, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (villageId) query.targetVillageId = villageId;

    // 如果不是村支书，只能看到自己村的数据
    if (req.user.role !== 'secretary' && req.user.villageId) {
      query.targetVillageId = req.user.villageId;
    }

    const total = await CommitteeApplication.countDocuments(query);
    const applications = await CommitteeApplication.find(query)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取申请列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取申请列表失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/committee/applications/:applicationId
 * @desc    获取单个申请详情
 * @access  Private
 */
router.get('/applications/:applicationId', async (req, res) => {
  try {
    const application = await CommitteeApplication.findOne({
      applicationId: req.params.applicationId
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    // 检查权限：只能查看自己的申请或作为审批人查看
    const isApplicant = application.applicant.userId.toString() === req.user._id.toString();
    const isApprover = req.user.role === 'secretary' || req.user.role === 'village_head';

    if (!isApplicant && !isApprover) {
      return res.status(403).json({
        success: false,
        message: '无权查看此申请'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    logger.error('获取申请详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取申请详情失败',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/committee/applications/:applicationId/review
 * @desc    审核村干部申请
 * @access  Private (仅村支书和村主任)
 */
router.put('/applications/:applicationId/review',
  checkPermission(['committee:approve']),
  auditLog('审核村干部申请', true),
  async (req, res) => {
    try {
      const { decision, comments } = req.body;
      const application = await CommitteeApplication.findOne({
        applicationId: req.params.applicationId
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: '申请不存在'
        });
      }

      // 检查权限
      const currentStep = application.approvalWorkflow.findIndex(
        step => step.role === req.user.role && step.status === 'pending'
      );

      if (currentStep === -1) {
        return res.status(403).json({
          success: false,
          message: '您无权审核此申请或申请已被审核'
        });
      }

      // 更新审批流程
      if (decision === 'approve') {
        application.approvalWorkflow[currentStep].status = 'approved';
        application.approvalWorkflow[currentStep].approverId = req.user._id;
        application.approvalWorkflow[currentStep].approvedAt = new Date();
        application.approvalWorkflow[currentStep].comments = comments;

        // 检查是否还有下一步
        const nextStep = application.approvalWorkflow.findIndex(
          (step, index) => index > currentStep && step.required
        );

        if (nextStep !== -1) {
          // 还有下一步审批
          application.status = 'under_review';
          application.currentStep = nextStep + 1;
        } else {
          // 审批完成
          application.status = 'approved';
          application.approvedAt = new Date();

          // 如果是新账号申请，自动创建角色分配
          if (application.applicationType === 'new_account') {
            const assignment = new CommitteeRoleAssignment({
              userId: application.applicant.userId,
              villageId: application.targetVillageId,
              roleCode: application.targetRole,
              assignedBy: req.user._id,
              assignedAt: new Date(),
              status: 'active'
            });
            await assignment.save();

            // 更新用户角色信息
            await User.findByIdAndUpdate(application.applicant.userId, {
              $set: {
                role: application.targetRole,
                villageId: application.targetVillageId,
                position: application.targetRole
              }
            });
          }
        }
      } else if (decision === 'reject') {
        application.status = 'rejected';
        application.approvalWorkflow[currentStep].status = 'rejected';
        application.approvalWorkflow[currentStep].approverId = req.user._id;
        application.approvalWorkflow[currentStep].rejectedAt = new Date();
        application.approvalWorkflow[currentStep].comments = comments;
      }

      await application.save();

      // 记录审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.name,
        operatorRole: req.user.role,
        action: decision === 'approve' ? 'approve_committee_application' : 'reject_committee_application',
        resourceType: 'CommitteeApplication',
        resourceId: application._id,
        details: {
          applicationId: application.applicationId,
          applicationType: application.applicationType,
          targetRole: application.targetRole,
          decision,
          comments
        },
        changes: {
          before: { status: application.status },
          after: { status: decision === 'approve' ? 'approved' : 'rejected' }
        },
        isSensitive: true,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: decision === 'approve' ? '审核通过' : '已驳回',
        data: {
          applicationId: application.applicationId,
          status: application.status,
          currentStep: application.currentStep
        }
      });
    } catch (error) {
      logger.error('审核申请失败:', error);
      res.status(500).json({
        success: false,
        message: '审核失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   PUT /api/committee/applications/:applicationId/cancel
 * @desc    取消申请
 * @access  Private (仅申请人本人)
 */
router.put('/applications/:applicationId/cancel', async (req, res) => {
  try {
    const application = await CommitteeApplication.findOne({
      applicationId: req.params.applicationId
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    // 检查是否为申请人
    if (application.applicant.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权取消此申请'
      });
    }

    // 只有待审核状态才能取消
    if (!['pending', 'under_review'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: '当前状态无法取消申请'
      });
    }

    application.status = 'cancelled';
    application.cancelledAt = new Date();
    await application.save();

    res.json({
      success: true,
      message: '申请已取消'
    });
  } catch (error) {
    logger.error('取消申请失败:', error);
    res.status(500).json({
      success: false,
      message: '取消申请失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/committee/roles
 * @desc    获取村干部角色列表
 * @access  Private (需要登录)
 */
router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.find({
      code: { $in: ['secretary', 'village_head', 'accountant', 'population_admin', 'security_director'] }
    }).sort({ level: -1 });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    logger.error('获取角色列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取角色列表失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/committee/members
 * @desc    获取村干部成员列表
 * @access  Private (村干部权限)
 */
router.get('/members', checkPermission(['committee:read']), async (req, res) => {
  try {
    const { villageId, role, status = 'active' } = req.query;

    const query = { status };
    if (villageId) query.villageId = villageId;
    if (role) query.roleCode = role;

    const assignments = await CommitteeRoleAssignment.find(query)
      .populate('userId', 'name phone idCard villageId')
      .populate('assignedBy', 'name')
      .sort({ assignedAt: -1 });

    // 获取角色详细信息
    const roleCodes = assignments.map(a => a.roleCode);
    const roles = await Role.find({ code: { $in: roleCodes } });
    const roleMap = new Map(roles.map(r => [r.code, r]));

    const members = assignments.map(assignment => ({
      _id: assignment._id,
      userId: assignment.userId._id,
      name: assignment.userId.name,
      phone: assignment.userId.phone,
      idCard: assignment.userId.idCard,
      roleCode: assignment.roleCode,
      roleName: roleMap.get(assignment.roleCode)?.name || assignment.roleCode,
      roleLevel: roleMap.get(assignment.roleCode)?.level || 0,
      villageId: assignment.villageId,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy,
      customPermissions: assignment.customPermissions,
      restrictions: assignment.restrictions
    }));

    res.json({
      success: true,
      data: members
    });
  } catch (error) {
    logger.error('获取成员列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取成员列表失败',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/committee/members/:memberId
 * @desc    更新村干部成员信息
 * @access  Private (仅村支书)
 */
router.put('/members/:memberId',
  checkPermission(['committee:manage']),
  auditLog('更新村干部信息', true),
  async (req, res) => {
    try {
      const { customPermissions, restrictions } = req.body;

      const assignment = await CommitteeRoleAssignment.findById(req.params.memberId);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: '成员不存在'
        });
      }

      // 记录变更前状态
      const beforeState = {
        customPermissions: assignment.customPermissions,
        restrictions: assignment.restrictions
      };

      // 更新权限和限制
      if (customPermissions) {
        assignment.customPermissions = customPermissions;
      }

      if (restrictions) {
        assignment.restrictions = {
          ...assignment.restrictions,
          ...restrictions
        };
      }

      assignment.updatedAt = new Date();
      await assignment.save();

      // 记录审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.name,
        operatorRole: req.user.role,
        action: 'update_committee_member',
        resourceType: 'CommitteeRoleAssignment',
        resourceId: assignment._id,
        details: {
          memberUserId: assignment.userId,
          villageId: assignment.villageId,
          roleCode: assignment.roleCode
        },
        changes: {
          before: beforeState,
          after: {
            customPermissions: assignment.customPermissions,
            restrictions: assignment.restrictions
          }
        },
        isSensitive: true,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: '更新成功',
        data: assignment
      });
    } catch (error) {
      logger.error('更新成员信息失败:', error);
      res.status(500).json({
        success: false,
        message: '更新失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/committee/members/:memberId
 * @desc    移除村干部成员
 * @access  Private (仅村支书)
 */
router.delete('/members/:memberId',
  checkPermission(['committee:manage']),
  auditLog('移除村干部成员', true),
  async (req, res) => {
    try {
      const assignment = await CommitteeRoleAssignment.findById(req.params.memberId);

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: '成员不存在'
        });
      }

      // 软删除：标记为非活跃状态
      assignment.status = 'inactive';
      assignment.removedAt = new Date();
      assignment.removedBy = req.user._id;
      await assignment.save();

      // 更新用户角色信息
      await User.findByIdAndUpdate(assignment.userId, {
        $set: { role: 'resident' }
      });

      // 记录审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.name,
        operatorRole: req.user.role,
        action: 'remove_committee_member',
        resourceType: 'CommitteeRoleAssignment',
        resourceId: assignment._id,
        details: {
          memberUserId: assignment.userId,
          villageId: assignment.villageId,
          roleCode: assignment.roleCode
        },
        changes: {
          before: { status: 'active' },
          after: { status: 'inactive' }
        },
        isSensitive: true,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: '成员已移除'
      });
    } catch (error) {
      logger.error('移除成员失败:', error);
      res.status(500).json({
        success: false,
        message: '移除失败',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/committee/statistics
 * @desc    获取村干部管理统计数据
 * @access  Private (村干部权限)
 */
router.get('/statistics', checkPermission(['committee:read']), async (req, res) => {
  try {
    const { villageId } = req.query;

    const matchQuery = villageId ? { villageId } : {};

    // 统计申请数量
    const applicationStats = await CommitteeApplication.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 统计各角色人数
    const roleStats = await CommitteeRoleAssignment.aggregate([
      { $match: { ...matchQuery, status: 'active' } },
      {
        $group: {
          _id: '$roleCode',
          count: { $sum: 1 }
        }
      }
    ]);

    // 转换为易读格式
    const roleMap = {
      secretary: '村支书',
      village_head: '村主任',
      accountant: '会计',
      population_admin: '人口主任',
      security_director: '治保主任'
    };

    const statistics = {
      applications: {
        pending: applicationStats.find(s => s._id === 'pending')?.count || 0,
        under_review: applicationStats.find(s => s._id === 'under_review')?.count || 0,
        approved: applicationStats.find(s => s._id === 'approved')?.count || 0,
        rejected: applicationStats.find(s => s._id === 'rejected')?.count || 0
      },
      members: roleStats.map(stat => ({
        roleCode: stat._id,
        roleName: roleMap[stat._id] || stat._id,
        count: stat.count
      })),
      totalMembers: roleStats.reduce((sum, stat) => sum + stat.count, 0)
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/committee/audit-logs
 * @desc    获取村干部操作审计日志
 * @access  Private (仅村支书)
 */
router.get('/audit-logs',
  checkPermission(['audit:read']),
  async (req, res) => {
    try {
      const {
        villageId,
        action,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;

      const query = {};

      if (action) query.action = action;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // 如果不是村支书，只能查看自己村的日志
      if (req.user.role !== 'secretary' && req.user.villageId) {
        query.details = { ...query.details, villageId: req.user.villageId };
      }

      const total = await AuditLog.countDocuments(query);
      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('获取审计日志失败:', error);
      res.status(500).json({
        success: false,
        message: '获取审计日志失败',
        error: error.message
      });
    }
  }
);

// 错误处理中间件
router.use((error, req, res, next) => {
  logger.error('村干部管理路由错误:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user ? req.user.id : 'anonymous'
  });

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: `参数验证失败: ${error.message}`
    });
  }

  if (error.status === 403) {
    return res.status(403).json({
      success: false,
      message: '权限不足'
    });
  }

  if (error.status === 401) {
    return res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }

  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

module.exports = router;
