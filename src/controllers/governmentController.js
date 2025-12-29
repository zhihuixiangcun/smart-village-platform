/**
 * 政务管理控制器
 * 处理村民档案、证件办理、福利申请等HTTP请求
 */

const governmentService = require('../services/governmentService');
const { successResponse, errorResponse } = require('../utils/response');

// ==================== 村民数字档案 ====================

/**
 * 获取村民数字档案
 */
exports.getVillagerProfile = async (req, res) => {
  try {
    const { residentId } = req.params;
    const userId = req.user?.id;

    const profile = await governmentService.getVillagerProfile(residentId, userId);

    return successResponse(res, profile);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建村民数字档案
 */
exports.createVillagerProfile = async (req, res) => {
  try {
    const { residentId } = req.params;
    const userId = req.user.id;

    const profile = await governmentService.createVillagerProfile(residentId, req.body, userId);

    return successResponse(res, profile, '档案创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 更新村民数字档案
 */
exports.updateVillagerProfile = async (req, res) => {
  try {
    const { residentId } = req.params;
    const userId = req.user.id;

    const profile = await governmentService.updateVillagerProfile(residentId, req.body, userId);

    return successResponse(res, profile, '档案更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 验证村民档案
 */
exports.verifyVillagerProfile = async (req, res) => {
  try {
    const { residentId } = req.params;
    const userId = req.user.id;

    const profile = await governmentService.verifyVillagerProfile(residentId, req.body, userId);

    return successResponse(res, profile, '档案验证成功');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取村民档案列表
 */
exports.getVillagerProfiles = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      keyword: req.query.keyword,
      specialGroup: req.query.specialGroup,
      status: req.query.status,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await governmentService.getVillagerProfiles(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 证件办理 ====================

/**
 * 创建证件办理申请
 */
exports.createDocumentApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const application = await governmentService.createDocumentApplication(req.body, userId);

    return successResponse(res, application, '申请创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 提交证件办理申请
 */
exports.submitDocumentApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const application = await governmentService.submitDocumentApplication(applicationId, userId);

    return successResponse(res, application, '申请已提交');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 审核证件申请
 */
exports.reviewDocumentApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const application = await governmentService.reviewDocumentApplication(
      applicationId,
      req.body,
      userId
    );

    return successResponse(res, application, '审核完成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取证件申请列表
 */
exports.getDocumentApplications = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      applicantId: req.query.applicantId,
      documentType: req.query.documentType,
      status: req.query.status,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await governmentService.getDocumentApplications(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取证件申请详情
 */
exports.getDocumentApplicationDetail = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await governmentService.getDocumentApplicationDetail(applicationId);

    return successResponse(res, application);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 福利申请 ====================

/**
 * 创建福利申请
 */
exports.createWelfareApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const application = await governmentService.createWelfareApplication(req.body, userId);

    return successResponse(res, application, '申请创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 提交福利申请
 */
exports.submitWelfareApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const application = await governmentService.submitWelfareApplication(applicationId, userId);

    return successResponse(res, application, '申请已提交');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 村级初审
 */
exports.villageReviewWelfare = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const application = await governmentService.villageReviewWelfare(
      applicationId,
      req.body,
      userId
    );

    return successResponse(res, application, '初审完成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 审核福利申请
 */
exports.reviewWelfareApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const application = await governmentService.reviewWelfareApplication(
      applicationId,
      req.body,
      userId
    );

    return successResponse(res, application, '审核完成');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 提出异议
 */
exports.submitObjection = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await governmentService.submitObjection(applicationId, req.body);

    return successResponse(res, application, '异议已提交');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 处理公示结果
 */
exports.processPublicityResult = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const application = await governmentService.processPublicityResult(
      applicationId,
      req.body,
      userId
    );

    return successResponse(res, application, '公示结果已处理');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 发放福利金
 */
exports.disburseWelfare = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    const application = await governmentService.disburseWelfare(applicationId, req.body, userId);

    return successResponse(res, application, '福利金已发放');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取福利申请列表
 */
exports.getWelfareApplications = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      applicantId: req.query.applicantId,
      welfareType: req.query.welfareType,
      status: req.query.status,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await governmentService.getWelfareApplications(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取福利申请详情
 */
exports.getWelfareApplicationDetail = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await governmentService.getWelfareApplicationDetail(applicationId);

    return successResponse(res, application);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 政务服务目录 ====================

/**
 * 获取服务目录
 */
exports.getGovernmentServices = async (req, res) => {
  try {
    const { villageId } = req.params;
    const options = {
      category: req.query.category,
      keyword: req.query.keyword,
      status: req.query.status,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0
    };

    const result = await governmentService.getGovernmentServices(villageId, options);

    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 获取服务详情
 */
exports.getGovernmentServiceDetail = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await governmentService.getGovernmentServiceDetail(serviceId);

    return successResponse(res, service);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 创建服务目录
 */
exports.createGovernmentService = async (req, res) => {
  try {
    const userId = req.user.id;

    const service = await governmentService.createGovernmentService(req.body, userId);

    return successResponse(res, service, '服务创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// ==================== 统计信息 ====================

/**
 * 获取政务服务统计数据
 */
exports.getStatistics = async (req, res) => {
  try {
    const { villageId } = req.params;

    const statistics = await governmentService.getStatistics(villageId);

    return successResponse(res, statistics);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};
