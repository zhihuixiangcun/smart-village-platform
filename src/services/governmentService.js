/**
 * 政务管理服务层
 * 处理村民档案、证件办理、福利申请等政务服务
 */

const {
  VillagerDigitalProfile,
  DocumentApplication,
  WelfareApplication,
  GovernmentService,
  DocumentType,
  ApplicationStatus,
  WelfareType
} = require('../models/GovernmentService');
const { Resident } = require('../models/Resident');
const { Village } = require('../models/Village');
const webSocketService = require('./webSocketService');

// ==================== 村民数字档案 ====================

/**
 * 获取村民数字档案
 */
exports.getVillagerProfile = async (residentId, userId) => {
  const profile = await VillagerDigitalProfile.findOne({ residentId })
    .populate('residentId', 'name idNumber phone address')
    .populate('villageId', 'name')
    .populate('verification.verifiedBy', 'name')
    .lean();

  if (!profile) {
    // 尝试创建新档案
    const resident = await Resident.findById(residentId);
    if (!resident) {
      throw new Error('村民不存在');
    }

    return await this.createVillagerProfile(residentId, {
      villageId: resident.villageId,
      personalInfo: {
        name: resident.name,
        idNumber: resident.idNumber,
        phoneNumber: resident.phone
      }
    }, userId);
  }

  return profile;
};

/**
 * 创建村民数字档案
 */
exports.createVillagerProfile = async (residentId, profileData, userId) => {
  // 验证村民存在
  const resident = await Resident.findById(residentId);
  if (!resident) {
    throw new Error('村民不存在');
  }

  // 检查档案是否已存在
  const existing = await VillagerDigitalProfile.findOne({ residentId });
  if (existing) {
    throw new Error('档案已存在');
  }

  const profile = new VillagerDigitalProfile({
    ...profileData,
    residentId,
    createdBy: userId
  });

  await profile.save();

  return profile.populate('residentId villageId');
};

/**
 * 更新村民数字档案
 */
exports.updateVillagerProfile = async (residentId, updates, userId) => {
  const profile = await VillagerDigitalProfile.findOne({ residentId });

  if (!profile) {
    throw new Error('档案不存在');
  }

  // 更新字段
  Object.keys(updates).forEach(key => {
    if (typeof updates[key] === 'object' && updates[key] !== null) {
      profile[key] = { ...profile[key], ...updates[key] };
    } else {
      profile[key] = updates[key];
    }
  });

  profile.updatedBy = userId;
  await profile.save();

  return profile.populate('residentId villageId');
};

/**
 * 验证村民档案
 */
exports.verifyVillagerProfile = async (residentId, verificationData, userId) => {
  const profile = await VillagerDigitalProfile.findOne({ residentId });

  if (!profile) {
    throw new Error('档案不存在');
  }

  profile.verification = {
    isVerified: true,
    verifiedAt: new Date(),
    verifiedBy: userId,
    notes: verificationData.notes
  };

  await profile.save();

  return profile.populate('residentId villageId verification.verifiedBy');
};

/**
 * 获取村民档案列表
 */
exports.getVillagerProfiles = async (villageId, options = {}) => {
  const {
    keyword,
    specialGroup,
    status = 'active',
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId, status };

  if (keyword) {
    query.$or = [
      { 'personalInfo.name': { $regex: keyword, $options: 'i' } },
      { 'personalInfo.idNumber': { $regex: keyword, $options: 'i' } }
    ];
  }

  if (specialGroup) {
    query[`specialGroups.is${specialGroup.charAt(0).toUpperCase()}${specialGroup.slice(1)}`] = true;
  }

  const profiles = await VillagerDigitalProfile.find(query)
    .populate('residentId', 'name idNumber phone')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    profiles,
    total: await VillagerDigitalProfile.countDocuments(query)
  };
};

// ==================== 证件办理 ====================

/**
 * 创建证件办理申请
 */
exports.createDocumentApplication = async (applicationData, userId) => {
  const { applicantId, documentType, villageId } = applicationData;

  // 验证村民存在
  const resident = await Resident.findById(applicantId);
  if (!resident) {
    throw new Error('申请人不存在');
  }

  // 生成申请编号
  const applicationNumber = await DocumentApplication.generateApplicationNumber(
    documentType.toUpperCase().substring(0, 3)
  );

  const application = new DocumentApplication({
    ...applicationData,
    applicationNumber,
    applicantName: resident.name,
    applicantIdNumber: resident.idNumber,
    applicantPhone: resident.phone,
    status: 'draft',
    createdBy: userId
  });

  await application.save();

  return application;
};

/**
 * 提交证件办理申请
 */
exports.submitDocumentApplication = async (applicationId, userId) => {
  const application = await DocumentApplication.findById(applicationId);

  if (!application) {
    throw new Error('申请不存在');
  }

  if (application.status !== 'draft') {
    throw new Error('只能提交草稿状态的申请');
  }

  application.status = 'submitted';
  application.submittedAt = new Date();

  // 计算预计完成时间（15个工作日）
  const workDays = 15;
  const expectedDate = new Date();
  let count = 0;
  while (count < workDays) {
    expectedDate.setDate(expectedDate.getDate() + 1);
    const day = expectedDate.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
  }
  application.expectedCompletionDate = expectedDate;

  await application.save();

  // 通知村干部审核
  if (webSocketService) {
    webSocketService.notifyVillage(application.villageId.toString(), {
      type: 'document_application_pending',
      data: {
        applicationId: application._id,
        applicationNumber: application.applicationNumber,
        applicantName: application.applicantName,
        documentType: application.documentType
      }
    });
  }

  return application;
};

/**
 * 审核证件申请
 */
exports.reviewDocumentApplication = async (applicationId, reviewData, userId) => {
  const { User } = require('../models/User');
  const application = await DocumentApplication.findById(applicationId);

  if (!application) {
    throw new Error('申请不存在');
  }

  const reviewer = await User.findById(userId);
  if (!reviewer) {
    throw new Error('审核人不存在');
  }

  // 添加审核记录
  application.reviewProcess.push({
    step: application.currentReviewStep,
    reviewerId: userId,
    reviewerName: reviewer.name,
    reviewerRole: reviewer.role,
    status: reviewData.approved ? 'approved' : 'rejected',
    comment: reviewData.comment,
    reviewedAt: new Date(),
    attachments: reviewData.attachments || []
  });

  if (reviewData.approved) {
    // 审核通过，进入下一阶段
    const stepOrder = ['village_review', 'town_review', 'bureau_review', 'final_approval'];
    const currentIndex = stepOrder.indexOf(application.currentReviewStep);

    if (currentIndex < stepOrder.length - 1) {
      application.currentReviewStep = stepOrder[currentIndex + 1];
      application.status = 'under_review';
    } else {
      // 最终审核通过
      application.currentReviewStep = 'completed';
      application.status = 'approved';
      application.approvalResult.status = 'approved';
      application.approvalResult.approvedAt = new Date();
      application.approvalResult.approvedBy = userId;
      application.completedAt = new Date();
    }
  } else {
    // 审核拒绝
    application.status = 'rejected';
    application.approvalResult.status = 'rejected';
    application.approvalResult.rejectionReason = reviewData.comment;
  }

  await application.save();

  // 通知申请人
  if (webSocketService) {
    webSocketService.broadcastToUser(application.applicantId.toString(), {
      type: 'document_application_reviewed',
      data: {
        applicationId: application._id,
        status: application.status,
        comment: reviewData.comment
      }
    });
  }

  return application;
};

/**
 * 获取证件申请列表
 */
exports.getDocumentApplications = async (villageId, options = {}) => {
  const {
    applicantId,
    documentType,
    status,
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId };
  if (applicantId) query.applicantId = applicantId;
  if (documentType) query.documentType = documentType;
  if (status) query.status = status;

  const applications = await DocumentApplication.find(query)
    .populate('applicantId', 'name idNumber phone')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    applications,
    total: await DocumentApplication.countDocuments(query)
  };
};

/**
 * 获取证件申请详情
 */
exports.getDocumentApplicationDetail = async (applicationId) => {
  const application = await DocumentApplication.findById(applicationId)
    .populate('applicantId', 'name idNumber phone address')
    .populate('villageId', 'name')
    .populate('reviewProcess.reviewerId', 'name role')
    .populate('createdBy', 'name')
    .lean();

  if (!application) {
    throw new Error('申请不存在');
  }

  return application;
};

// ==================== 福利申请 ====================

/**
 * 创建福利申请
 */
exports.createWelfareApplication = async (applicationData, userId) => {
  const { applicantId, welfareType, villageId } = applicationData;

  // 验证村民存在
  const resident = await Resident.findById(applicantId);
  if (!resident) {
    throw new Error('申请人不存在');
  }

  // 生成申请编号
  const applicationNumber = await WelfareApplication.generateApplicationNumber(
    welfareType.toUpperCase().substring(0, 3)
  );

  const application = new WelfareApplication({
    ...applicationData,
    applicationNumber,
    applicantName: resident.name,
    applicantIdNumber: resident.idNumber,
    applicantPhone: resident.phone,
    status: 'draft',
    createdBy: userId
  });

  await application.save();

  return application;
};

/**
 * 提交福利申请
 */
exports.submitWelfareApplication = async (applicationId, userId) => {
  const application = await WelfareApplication.findById(applicationId);

  if (!application) {
    throw new Error('申请不存在');
  }

  if (application.status !== 'draft') {
    throw new Error('只能提交草稿状态的申请');
  }

  application.status = 'submitted';
  application.submittedAt = new Date();

  // 计算预计完成时间（30个工作日）
  const workDays = 30;
  const expectedDate = new Date();
  let count = 0;
  while (count < workDays) {
    expectedDate.setDate(expectedDate.getDate() + 1);
    const day = expectedDate.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
  }
  application.expectedCompletionDate = expectedDate;

  await application.save();

  // 通知村干部审核
  if (webSocketService) {
    webSocketService.notifyVillage(application.villageId.toString(), {
      type: 'welfare_application_pending',
      data: {
        applicationId: application._id,
        applicationNumber: application.applicationNumber,
        applicantName: application.applicantName,
        welfareType: application.welfareType
      }
    });
  }

  return application;
};

/**
 * 村级初审（含入户调查）
 */
exports.villageReviewWelfare = async (applicationId, reviewData, userId) => {
  const application = await WelfareApplication.findById(applicationId);

  if (!application) {
    throw new Error('申请不存在');
  }

  if (application.status !== 'submitted') {
    throw new Error('申请状态不正确');
  }

  // 更新村级初审信息
  application.villageReview = {
    ...application.villageReview,
    ...reviewData
  };

  await application.save();

  return application;
};

/**
 * 审核福利申请
 */
exports.reviewWelfareApplication = async (applicationId, reviewData, userId) => {
  const { User } = require('../models/User');
  const application = await WelfareApplication.findById(applicationId);

  if (!application) {
    throw new Error('申请不存在');
  }

  const reviewer = await User.findById(userId);
  if (!reviewer) {
    throw new Error('审核人不存在');
  }

  // 添加审核记录
  application.reviewProcess.push({
    level: application.currentReviewLevel,
    reviewerId: userId,
    reviewerName: reviewer.name,
    reviewerRole: reviewer.role,
    status: reviewData.approved ? 'approved' : (reviewData.returned ? 'returned' : 'rejected'),
    comment: reviewData.comment,
    reviewedAt: new Date(),
    attachments: reviewData.attachments || []
  });

  if (reviewData.returned) {
    // 退回修改
    application.status = 'additional_info';
  } else if (reviewData.approved) {
    // 审核通过，进入下一级别
    const levelOrder = ['village', 'town', 'county', 'city'];
    const currentIndex = levelOrder.indexOf(application.currentReviewLevel);

    if (currentIndex < levelOrder.length - 1) {
      application.currentReviewLevel = levelOrder[currentIndex + 1];
      application.status = 'under_review';
    } else {
      // 最终审核通过，进入公示期
      application.currentReviewLevel = 'completed';

      if (application.publicity.required) {
        application.status = 'under_review';
        // 开始公示
        application.publicity.startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + application.publicity.objectionPeriod);
        application.publicity.endDate = endDate;
      } else {
        application.status = 'approved';
        application.approvalResult.status = 'approved';
        application.approvalResult.approvedAt = new Date();
        application.approvalResult.approvedBy = userId;
        application.completedAt = new Date();
      }
    }
  } else {
    // 审核拒绝
    application.status = 'rejected';
    application.approvalResult.status = 'rejected';
    application.approvalResult.rejectionReason = reviewData.comment;
  }

  await application.save();

  // 通知申请人
  if (webSocketService) {
    webSocketService.broadcastToUser(application.applicantId.toString(), {
      type: 'welfare_application_reviewed',
      data: {
        applicationId: application._id,
        status: application.status,
        comment: reviewData.comment
      }
    });
  }

  return application;
};

/**
 * 提出异议
 */
exports.submitObjection = async (applicationId, objectionData) => {
  const application = await WelfareApplication.findById(applicationId);

  if (!application) {
    throw new Error('申请不存在');
  }

  if (!application.publicity.startDate || !application.publicity.endDate) {
    throw new Error('当前不在公示期');
  }

  const now = new Date();
  if (now < application.publicity.startDate || now > application.publicity.endDate) {
    throw new Error('当前不在公示期');
  }

  application.publicity.objections.push({
    ...objectionData,
    submittedAt: now
  });

  await application.save();

  return application;
};

/**
 * 处理公示结果
 */
exports.processPublicityResult = async (applicationId, resultData, userId) => {
  const application = await WelfareApplication.findById(applicationId);

  if (!application) {
    throw new Error('申请不存在');
  }

  application.publicity.publicityResult = resultData.result;

  if (resultData.result === 'no_objection' || resultData.result === 'objection_resolved') {
    // 无异议或异议已解决，批准申请
    application.status = 'approved';
    application.approvalResult.status = 'approved';
    application.approvalResult.approvedAt = new Date();
    application.approvalResult.approvedBy = userId;
    application.completedAt = new Date();
  } else {
    // 异议成立，拒绝申请
    application.status = 'rejected';
    application.approvalResult.status = 'rejected';
    application.approvalResult.rejectionReason = '公示期间有异议且经核查成立';
  }

  await application.save();

  return application;
};

/**
 * 发放福利金
 */
exports.disburseWelfare = async (applicationId, paymentData, userId) => {
  const application = await WelfareApplication.findById(applicationId);

  if (!application) {
    throw new Error('申请不存在');
  }

  if (application.status !== 'approved') {
    throw new Error('申请状态不正确');
  }

  application.paymentRecords.push({
    ...paymentData,
    paymentDate: new Date(),
    status: 'completed'
  });

  await application.save();

  return application;
};

/**
 * 获取福利申请列表
 */
exports.getWelfareApplications = async (villageId, options = {}) => {
  const {
    applicantId,
    welfareType,
    status,
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;

  const query = { villageId };
  if (applicantId) query.applicantId = applicantId;
  if (welfareType) query.welfareType = welfareType;
  if (status) query.status = status;

  const applications = await WelfareApplication.find(query)
    .populate('applicantId', 'name idNumber phone')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    applications,
    total: await WelfareApplication.countDocuments(query)
  };
};

/**
 * 获取福利申请详情
 */
exports.getWelfareApplicationDetail = async (applicationId) => {
  const application = await WelfareApplication.findById(applicationId)
    .populate('applicantId', 'name idNumber phone address')
    .populate('villageId', 'name')
    .populate('reviewProcess.reviewerId', 'name role')
    .populate('createdBy', 'name')
    .lean();

  if (!application) {
    throw new Error('申请不存在');
  }

  return application;
};

// ==================== 政务服务目录 ====================

/**
 * 获取服务目录
 */
exports.getGovernmentServices = async (villageId, options = {}) => {
  const {
    category,
    keyword,
    status = 'active',
    sort = 'sortOrder',
    limit = 100,
    skip = 0
  } = options;

  const query = { status };
  if (category) query.serviceCategory = category;
  if (keyword) {
    query.$or = [
      { serviceName: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ];
  }

  const services = await GovernmentService.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    services,
    total: await GovernmentService.countDocuments(query)
  };
};

/**
 * 获取服务详情
 */
exports.getGovernmentServiceDetail = async (serviceId) => {
  const service = await GovernmentService.findById(serviceId).lean();

  if (!service) {
    throw new Error('服务不存在');
  }

  return service;
};

/**
 * 创建服务目录
 */
exports.createGovernmentService = async (serviceData, userId) => {
  const service = new GovernmentService(serviceData);

  await service.save();

  return service;
};

// ==================== 统计信息 ====================

/**
 * 获取政务服务统计数据
 */
exports.getStatistics = async (villageId) => {
  const [
    totalProfiles,
    documentApplications,
    welfareApplications,
    pendingDocuments,
    pendingWelfare
  ] = await Promise.all([
    VillagerDigitalProfile.countDocuments({ villageId, status: 'active' }),
    DocumentApplication.countDocuments({ villageId }),
    WelfareApplication.countDocuments({ villageId }),
    DocumentApplication.countDocuments({
      villageId,
      status: { $in: ['submitted', 'under_review'] }
    }),
    WelfareApplication.countDocuments({
      villageId,
      status: { $in: ['submitted', 'under_review'] }
    })
  ]);

  // 特殊群体统计
  const specialGroups = await VillagerDigitalProfile.aggregate([
    { $match: { villageId: mongoose.Types.ObjectId(villageId), status: 'active' } },
    {
      $group: {
        _id: null,
        lowIncome: { $sum: { $cond: ['$specialGroups.isLowIncome', 1, 0] } },
        fiveGuarantee: { $sum: { $cond: ['$specialGroups.isFiveGuarantee', 1, 0] } },
        leftBehind: { $sum: { $cond: ['$specialGroups.isLeftBehind', 1, 0] } },
        disabled: { $sum: { $cond: ['$specialGroups.isDisabled', 1, 0] } },
        elderlyLivingAlone: { $sum: { $cond: ['$specialGroups.isElderlyLivingAlone', 1, 0] } }
      }
    }
  ]);

  return {
    profiles: {
      total: totalProfiles,
      specialGroups: specialGroups[0] || {}
    },
    documents: {
      total: documentApplications,
      pending: pendingDocuments
    },
    welfare: {
      total: welfareApplications,
      pending: pendingWelfare
    }
  };
};
