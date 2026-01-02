/**
 * 用户注册审批控制器
 *
 * 处理注册申请的HTTP请求：
 * - 提交注册申请
 * - 查询申请状态
 * - 审批申请（管理员）
 * - 获取待审批列表
 */

const registrationWorkflowService = require('../services/registrationWorkflowService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * 提交注册申请
 * POST /api/v1/registration/submit
 */
exports.submitApplication = async (req, res) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '请求数据验证失败',
        errors: errors.array()
      });
    }

    const { applicationType, applicant, residentInfo, villageAdminInfo, townshipAdminInfo } = req.body;

    // 获取上传的文件（如果有）
    const files = {
      idCardFront: req.files?.idCardFront,
      idCardBack: req.files?.idCardBack,
      householdBook: req.files?.householdBook,
      appointmentLetter: req.files?.appointmentLetter
    };

    // 构建申请数据
    const applicationData = {
      applicationType,
      applicant: {
        name: applicant.name,
        phone: applicant.phone,
        idCard: applicant.idCard,
        idCardFront: files.idCardFront ? {
          fileName: files.idCardFront.name,
          fileUrl: files.idCardFront.path || files.idCardFront.location
        } : undefined,
        idCardBack: files.idCardBack ? {
          fileName: files.idCardBack.name,
          fileUrl: files.idCardBack.path || files.idCardBack.location
        } : undefined
      },
      residentInfo: applicationType === 'resident' ? {
        villageId: residentInfo?.villageId,
        householdBookUrl: files.householdBook?.path || files.householdBook?.location,
        isNonLocal: residentInfo?.isNonLocal || false,
        nonLocalReason: residentInfo?.nonLocalReason,
        otherReasonDetails: residentInfo?.otherReasonDetails
      } : undefined,
      villageAdminInfo: applicationType === 'village_admin' ? {
        villageId: villageAdminInfo?.villageId,
        position: villageAdminInfo?.position,
        appointmentLetterUrl: files.appointmentLetter?.path || files.appointmentLetter?.location
      } : undefined,
      townshipAdminInfo: applicationType === 'township_admin' ? {
        townshipId: townshipAdminInfo?.townshipId,
        position: townshipAdminInfo?.position,
        appointmentLetterUrl: files.appointmentLetter?.path || files.appointmentLetter?.location
      } : undefined,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        submittedFrom: req.get('origin')?.includes('mobile') ? 'mobile' : 'web'
      }
    };

    // 提交申请
    const result = await registrationWorkflowService.submitApplication(applicationData, files);

    res.status(201).json({
      success: true,
      message: '注册申请已提交，请等待审核',
      data: result
    });

  } catch (error) {
    logger.error('提交注册申请失败:', error);

    // 处理特定错误
    if (error.message.includes('您已有待审核的申请')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('缺少必填字段')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '提交申请失败，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取申请状态
 * GET /api/v1/registration/status/:id
 */
exports.getApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await registrationWorkflowService.getApplicationStatus(id);

    res.json({
      success: true,
      data: result.application
    });

  } catch (error) {
    logger.error('获取申请状态失败:', error);

    if (error.message === '申请不存在') {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    res.status(500).json({
      success: false,
      message: '获取状态失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取待审批列表（管理员）
 * GET /api/v1/registration/pending
 */
exports.getPendingApplications = async (req, res) => {
  try {
    // 验证管理员权限
    if (!req.user || !['village_admin', 'township_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '无权访问'
      });
    }

    // 构建过滤条件
    const filters = {};

    // 只显示本村/本乡镇的申请
    if (req.user.role === 'village_admin' && req.user.villageId) {
      filters.villageId = req.user.villageId;
    }

    if (req.user.role === 'township_admin' && req.user.townshipId) {
      filters.townshipId = req.user.townshipId;
    }

    // 根据用户角色过滤当前阶段
    if (req.user.role === 'village_admin') {
      filters.currentStage = 'village_review';
    } else if (req.user.role === 'township_admin') {
      filters.currentStage = 'township_review';
    } else if (req.user.role === 'super_admin') {
      filters.currentStage = 'super_admin_review';
    }

    // 可选：按申请类型过滤
    if (req.query.type) {
      filters.applicationType = req.query.type;
    }

    const applications = await registrationWorkflowService.getPendingApplications(filters);

    res.json({
      success: true,
      data: {
        count: applications.length,
        applications
      }
    });

  } catch (error) {
    logger.error('获取待审批列表失败:', error);

    res.status(500).json({
      success: false,
      message: '获取待审批列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 审批申请（管理员）
 * POST /api/v1/registration/:id/review
 */
exports.reviewApplication = async (req, res) => {
  try {
    // 验证管理员权限
    if (!req.user || !['village_admin', 'township_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '无权执行此操作'
      });
    }

    const { id } = req.params;
    const { decision, comments } = req.body;

    // 验证决策
    if (!['approved', 'rejected', 'request_info'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: '无效的审批决策'
      });
    }

    const reviewData = {
      reviewerId: req.user._id,
      reviewerName: req.user.name,
      reviewerRole: req.user.role,
      decision,
      comments
    };

    const result = await registrationWorkflowService.reviewApplication(id, reviewData);

    res.json({
      success: true,
      message: decision === 'approved' ? '申请已批准' : decision === 'rejected' ? '申请已拒绝' : '已要求补充信息',
      data: result
    });

  } catch (error) {
    logger.error('审批申请失败:', error);

    if (error.message === '申请不存在') {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    if (error.message.includes('无权限审批')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '审批失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取我的申请列表（申请人）
 * GET /api/v1/registration/my-applications
 */
exports.getMyApplications = async (req, res) => {
  try {
    const RegistrationApplication = require('../models/RegistrationApplication');

    // 根据登录方式查询申请（手机号或身份证）
    const query = {
      $or: [
        { 'applicant.phone': req.user.phone },
        { 'applicant.idCard': req.user.idCard }
      ]
    };

    const applications = await RegistrationApplication.find(query)
      .populate('residentInfo.villageId', 'name')
      .populate('villageAdminInfo.villageId', 'name')
      .sort({ createdAt: -1 });

    // 脱敏处理
    const sanitizedApps = applications.map(app => ({
      id: app._id,
      type: app.applicationType,
      status: app.approval.status,
      currentStage: app.approval.currentStage,
      submittedAt: app.approval.submittedAt,
      applicant: {
        name: app.applicant.name,
        phone: app.applicant.phone
      },
      ocrVerification: {
        idCardVerified: app.ocrVerification?.idCardVerified,
        confidenceScore: app.ocrVerification?.confidenceScore
      }
    }));

    res.json({
      success: true,
      data: {
        count: sanitizedApps.length,
        applications: sanitizedApps
      }
    });

  } catch (error) {
    logger.error('获取我的申请列表失败:', error);

    res.status(500).json({
      success: false,
      message: '获取申请列表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 补充申请信息
 * POST /api/v1/registration/:id/supplement
 */
exports.supplementApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const RegistrationApplication = require('../models/RegistrationApplication');

    const application = await RegistrationApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    // 验证所有权
    const isOwner = application.applicant.phone === req.user.phone ||
                   (application.applicant.idCard && application.applicant.idCard === req.user.idCard);

    if (!isOwner && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '无权修改此申请'
      });
    }

    // 验证状态
    if (application.approval.status !== 'requires_info') {
      return res.status(400).json({
        success: false,
        message: '当前状态不允许补充信息'
      });
    }

    // 更新申请信息
    const { additionalInfo, attachments } = req.body;

    if (additionalInfo) {
      application.additionalInfo = additionalInfo;
    }

    if (attachments && Array.isArray(attachments)) {
      application.attachments.push(...attachments);
    }

    // 重置状态为待审核
    application.approval.status = 'pending';
    application.statusHistory.push({
      status: 'pending',
      changedBy: req.user._id,
      comments: '申请人已补充信息'
    });

    await application.save();

    // 通知审批人
    await registrationWorkflowService._notifyReviewers(application);

    res.json({
      success: true,
      message: '补充信息已提交',
      data: {
        applicationId: application._id,
        status: application.approval.status
      }
    });

  } catch (error) {
    logger.error('补充申请信息失败:', error);

    res.status(500).json({
      success: false,
      message: '提交补充信息失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 获取申请详情（管理员）
 * GET /api/v1/registration/:id/details
 */
exports.getApplicationDetails = async (req, res) => {
  try {
    // 验证管理员权限
    if (!req.user || !['village_admin', 'township_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '无权访问'
      });
    }

    const { id } = req.params;
    const RegistrationApplication = require('../models/RegistrationApplication');

    const application = await RegistrationApplication.findById(id)
      .populate('residentInfo.villageId', 'name location')
      .populate('villageAdminInfo.villageId', 'name location')
      .populate('approval.reviewedBy.reviewerId', 'name phone role')
      .populate('approval.finalDecision.decisionBy', 'name role');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    // 验证审批权限
    const hasPermission = await registrationWorkflowService._validateReviewPermission(application, req.user._id);
    if (!hasPermission && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '无权查看此申请'
      });
    }

    // 脱敏处理身份证号
    const sanitizedApp = application.toObject();
    if (sanitizedApp.applicant.idCard) {
      sanitizedApp.applicant.idCard = '******************'; // 完全隐藏
    }

    res.json({
      success: true,
      data: sanitizedApp
    });

  } catch (error) {
    logger.error('获取申请详情失败:', error);

    res.status(500).json({
      success: false,
      message: '获取申请详情失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 撤销申请（申请人）
 * DELETE /api/v1/registration/:id
 */
exports.cancelApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const RegistrationApplication = require('../models/RegistrationApplication');

    const application = await RegistrationApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: '申请不存在'
      });
    }

    // 验证所有权
    const isOwner = application.applicant.phone === req.user.phone;
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: '无权撤销此申请'
      });
    }

    // 只有待审核状态可以撤销
    if (!['pending', 'under_review', 'requires_info'].includes(application.approval.status)) {
      return res.status(400).json({
        success: false,
        message: '当前状态不允许撤销申请'
      });
    }

    application.approval.status = 'cancelled';
    application.statusHistory.push({
      status: 'cancelled',
      changedBy: req.user._id,
      comments: '申请人主动撤销'
    });

    await application.save();

    logger.info('申请已撤销', {
      applicationId: id,
      phone: req.user.phone
    });

    res.json({
      success: true,
      message: '申请已撤销'
    });

  } catch (error) {
    logger.error('撤销申请失败:', error);

    res.status(500).json({
      success: false,
      message: '撤销申请失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
