/**
 * Service Controller
 * 服务申请控制器
 *
 * 功能：
 * - 处理服务申请的 CRUD 操作
 * - 管理申请审批流程
 * - 提供统计和搜索功能
 */

const ServiceApplication = require('../models/ServiceApplication');
const { ServiceTypes, ApplicationStatus } = ServiceApplication;
const logger = require('../utils/logger');

/**
 * 创建服务申请
 * @param {Object} applicationData - 申请数据
 * @returns {Promise<Object>} 创建的申请
 */
const createServiceApplication = async (applicationData) => {
  try {
    const application = new ServiceApplication(applicationData);
    await application.save();

    // 添加创建记录
    await application.addProcessHistory(
      'created',
      {
        userId: application.applicant.userId,
        name: application.applicant.name,
        role: 'applicant'
      },
      '申请创建'
    );

    logger.info(`服务申请创建成功: ${application.applicationNumber}`);

    return await ServiceApplication.findById(application._id)
      .populate('applicant.userId', 'name phone')
      .lean();
  } catch (error) {
    logger.error('创建服务申请失败:', error);
    throw new Error(`创建服务申请失败: ${error.message}`);
  }
};

/**
 * 获取服务申请列表
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Object>} 申请列表和分页信息
 */
const getServiceApplications = async (filters = {}) => {
  try {
    const result = await ServiceApplication.searchApplications(filters);

    logger.info(`获取服务申请列表成功，共 ${result.pagination.total} 条`);

    return result;
  } catch (error) {
    logger.error('获取服务申请列表失败:', error);
    throw new Error(`获取服务申请列表失败: ${error.message}`);
  }
};

/**
 * 获取单个服务申请详情
 * @param {String} applicationId - 申请ID
 * @param {String} userId - 用户ID（用于权限检查）
 * @returns {Promise<Object>} 申请详情
 */
const getServiceApplicationById = async (applicationId, userId) => {
  try {
    const application = await ServiceApplication.findById(applicationId)
      .populate('applicant.userId', 'name phone')
      .populate('approval.reviewer.userId', 'name role')
      .populate('villageId', 'name')
      .lean();

    if (!application) {
      throw new Error('申请不存在');
    }

    // 权限检查：只能查看自己的申请或管理员可以查看所有
    if (application.applicant.userId._id.toString() !== userId && !isAdmin(userId)) {
      throw new Error('无权查看此申请');
    }

    logger.info(`获取服务申请详情成功: ${application.applicationNumber}`);

    return application;
  } catch (error) {
    logger.error('获取服务申请详情失败:', error);
    throw new Error(`获取服务申请详情失败: ${error.message}`);
  }
};

/**
 * 更新服务申请
 * @param {String} applicationId - 申请ID
 * @param {Object} updateData - 更新数据
 * @param {String} userId - 操作用户ID
 * @returns {Promise<Object>} 更新后的申请
 */
const updateServiceApplication = async (applicationId, updateData, userId) => {
  try {
    const application = await ServiceApplication.findById(applicationId);

    if (!application) {
      throw new Error('申请不存在');
    }

    // 只能更新草稿状态的申请
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new Error('只能编辑草稿状态的申请');
    }

    // 权限检查
    if (application.applicant.userId.toString() !== userId) {
      throw new Error('无权编辑此申请');
    }

    // 更新允许的字段
    const allowedUpdates = ['title', 'description', 'formData', 'attachments', 'priority'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        application[field] = updateData[field];
      }
    });

    await application.save();

    logger.info(`更新服务申请成功: ${application.applicationNumber}`);

    return await ServiceApplication.findById(applicationId)
      .populate('applicant.userId', 'name phone')
      .lean();
  } catch (error) {
    logger.error('更新服务申请失败:', error);
    throw new Error(`更新服务申请失败: ${error.message}`);
  }
};

/**
 * 提交服务申请
 * @param {String} applicationId - 申请ID
 * @param {String} userId - 用户ID
 * @returns {Promise<Object>} 更新后的申请
 */
const submitServiceApplication = async (applicationId, userId) => {
  try {
    const application = await ServiceApplication.findById(applicationId);

    if (!application) {
      throw new Error('申请不存在');
    }

    if (application.status !== ApplicationStatus.DRAFT) {
      throw new Error('只能提交草稿状态的申请');
    }

    if (application.applicant.userId.toString() !== userId) {
      throw new Error('无权提交此申请');
    }

    await application.updateStatus(
      ApplicationStatus.SUBMITTED,
      {
        userId: application.applicant.userId,
        name: application.applicant.name,
        role: 'applicant'
      },
      '提交申请'
    );

    logger.info(`提交服务申请成功: ${application.applicationNumber}`);

    return await ServiceApplication.findById(applicationId)
      .populate('applicant.userId', 'name phone')
      .lean();
  } catch (error) {
    logger.error('提交服务申请失败:', error);
    throw new Error(`提交服务申请失败: ${error.message}`);
  }
};

/**
 * 审批服务申请
 * @param {String} applicationId - 申请ID
 * @param {Object} approvalData - 审批数据
 * @returns {Promise<Object>} 更新后的申请
 */
const approveServiceApplication = async (applicationId, approvalData) => {
  const { status, comments, reviewer, expectedCompletionDate } = approvalData;

  try {
    const application = await ServiceApplication.findById(applicationId);

    if (!application) {
      throw new Error('申请不存在');
    }

    if (application.status === ApplicationStatus.COMPLETED ||
        application.status === ApplicationStatus.CANCELLED) {
      throw new Error('该申请已结束，无法审批');
    }

    // 设置预计完成时间
    if (expectedCompletionDate) {
      application.approval.expectedCompletionDate = new Date(expectedCompletionDate);
    }

    await application.updateStatus(status, reviewer, comments);

    logger.info(`审批服务申请成功: ${application.applicationNumber}, 状态: ${status}`);

    return await ServiceApplication.findById(applicationId)
      .populate('applicant.userId', 'name phone')
      .populate('approval.reviewer.userId', 'name role')
      .lean();
  } catch (error) {
    logger.error('审批服务申请失败:', error);
    throw new Error(`审批服务申请失败: ${error.message}`);
  }
};

/**
 * 取消服务申请
 * @param {String} applicationId - 申请ID
 * @param {String} userId - 用户ID
 * @param {String} reason - 取消原因
 * @returns {Promise<Object>} 更新后的申请
 */
const cancelServiceApplication = async (applicationId, userId, reason) => {
  try {
    const application = await ServiceApplication.findById(applicationId);

    if (!application) {
      throw new Error('申请不存在');
    }

    // 只能取消自己提交的申请
    if (application.applicant.userId.toString() !== userId) {
      throw new Error('无权取消此申请');
    }

    // 只能取消未完成或未审批的申请
    if ([ApplicationStatus.COMPLETED, ApplicationStatus.CANCELLED].includes(application.status)) {
      throw new Error('该申请已结束，无法取消');
    }

    await application.updateStatus(
      ApplicationStatus.CANCELLED,
      {
        userId: application.applicant.userId,
        name: application.applicant.name,
        role: 'applicant'
      },
      reason || '用户主动取消'
    );

    logger.info(`取消服务申请成功: ${application.applicationNumber}`);

    return await ServiceApplication.findById(applicationId)
      .populate('applicant.userId', 'name phone')
      .lean();
  } catch (error) {
    logger.error('取消服务申请失败:', error);
    throw new Error(`取消服务申请失败: ${error.message}`);
  }
};

/**
 * 删除服务申请（软删除）
 * @param {String} applicationId - 申请ID
 * @param {String} userId - 用户ID
 * @returns {Promise<Boolean>} 删除结果
 */
const deleteServiceApplication = async (applicationId, userId) => {
  try {
    const application = await ServiceApplication.findById(applicationId);

    if (!application) {
      throw new Error('申请不存在');
    }

    // 只能删除草稿状态的申请
    if (application.status !== ApplicationStatus.DRAFT) {
      throw new Error('只能删除草稿状态的申请');
    }

    if (application.applicant.userId.toString() !== userId) {
      throw new Error('无权删除此申请');
    }

    application.isDeleted = true;
    await application.save();

    logger.info(`删除服务申请成功: ${application.applicationNumber}`);

    return true;
  } catch (error) {
    logger.error('删除服务申请失败:', error);
    throw new Error(`删除服务申请失败: ${error.message}`);
  }
};

/**
 * 获取服务类型列表
 * @returns {Array} 服务类型列表
 */
const getServiceTypes = () => {
  return Object.entries(ServiceTypes).map(([key, value]) => ({
    key,
    value,
    label: getServiceTypeLabel(value),
    description: getServiceTypeDescription(value)
  }));
};

/**
 * 获取服务类型标签
 */
const getServiceTypeLabel = (type) => {
  const labels = {
    [ServiceTypes.IDENTITY_CERTIFICATE]: '身份证明',
    [ServiceTypes.RESIDENCE_CERTIFICATE]: '居住证明',
    [ServiceTypes.INCOME_CERTIFICATE]: '收入证明',
    [ServiceTypes.MARRIAGE_CERTIFICATE]: '婚姻证明',
    [ServiceTypes.BIRTH_CERTIFICATE]: '出生证明',
    [ServiceTypes.PROPERTY_CERTIFICATE]: '财产证明',
    [ServiceTypes.AGRICULTURE_SUBSIDY]: '农业补贴',
    [ServiceTypes.POVERTY_AID]: '困难救助',
    [ServiceTypes.HOUSING_APPLICATION]: '住房申请',
    [ServiceTypes.LAND_USE]: '土地使用',
    [ServiceTypes.BUSINESS_LICENSE]: '营业执照',
    [ServiceTypes.OTHER]: '其他'
  };
  return labels[type] || type;
};

/**
 * 获取服务类型描述
 */
const getServiceTypeDescription = (type) => {
  const descriptions = {
    [ServiceTypes.IDENTITY_CERTIFICATE]: '用于证明个人身份的各类证明文件',
    [ServiceTypes.RESIDENCE_CERTIFICATE]: '用于证明居住地址的证明文件',
    [ServiceTypes.INCOME_CERTIFICATE]: '用于证明收入情况的证明文件',
    [ServiceTypes.MARRIAGE_CERTIFICATE]: '婚姻状况相关证明',
    [ServiceTypes.BIRTH_CERTIFICATE]: '出生证明相关文件',
    [ServiceTypes.PROPERTY_CERTIFICATE]: '财产权属证明文件',
    [ServiceTypes.AGRICULTURE_SUBSIDY]: '农业生产相关补贴申请',
    [ServiceTypes.POVERTY_AID]: '困难家庭救助申请',
    [ServiceTypes.HOUSING_APPLICATION]: '住房相关申请',
    [ServiceTypes.LAND_USE]: '土地使用权相关申请',
    [ServiceTypes.BUSINESS_LICENSE]: '营业执照办理申请',
    [ServiceTypes.OTHER]: '其他服务申请'
  };
  return descriptions[type] || '';
};

/**
 * 获取用户申请统计
 * @param {String} userId - 用户ID
 * @returns {Promise<Object>} 统计数据
 */
const getUserApplicationStats = async (userId) => {
  try {
    const stats = await ServiceApplication.getApplicantStats(userId);

    const result = {
      total: Object.values(stats).reduce((sum, count) => sum + count, 0),
      draft: stats[ApplicationStatus.DRAFT] || 0,
      submitted: stats[ApplicationStatus.SUBMITTED] || 0,
      underReview: stats[ApplicationStatus.UNDER_REVIEW] || 0,
      approved: stats[ApplicationStatus.APPROVED] || 0,
      rejected: stats[ApplicationStatus.REJECTED] || 0,
      processing: stats[ApplicationStatus.PROCESSING] || 0,
      completed: stats[ApplicationStatus.COMPLETED] || 0,
      cancelled: stats[ApplicationStatus.CANCELLED] || 0
    };

    logger.info(`获取用户申请统计成功: ${userId}`);

    return result;
  } catch (error) {
    logger.error('获取用户申请统计失败:', error);
    throw new Error(`获取用户申请统计失败: ${error.message}`);
  }
};

/**
 * 获取村庄申请统计
 * @param {String} villageId - 村庄ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Promise<Object>} 统计数据
 */
const getVillageApplicationStats = async (villageId, startDate, endDate) => {
  try {
    const stats = await ServiceApplication.getVillageStats(villageId, startDate, endDate);

    const result = {
      total: stats.reduce((sum, stat) => sum + stat.total, 0),
      completed: stats.reduce((sum, stat) => sum + stat.completed, 0),
      pending: stats.reduce((sum, stat) => sum + stat.pending, 0),
      byType: stats.map(stat => ({
        type: stat._id,
        label: getServiceTypeLabel(stat._id),
        total: stat.total,
        completed: stat.completed,
        pending: stat.pending
      }))
    };

    logger.info(`获取村庄申请统计成功: ${villageId}`);

    return result;
  } catch (error) {
    logger.error('获取村庄申请统计失败:', error);
    throw new Error(`获取村庄申请统计失败: ${error.message}`);
  }
};

/**
 * 获取待处理申请列表（管理员用）
 * @param {String} villageId - 村庄ID
 * @param {Number} limit - 限制数量
 * @returns {Promise<Array>} 待处理申请列表
 */
const getPendingApplications = async (villageId, limit = 50) => {
  try {
    const applications = await ServiceApplication.getPendingApplications(villageId, limit);

    logger.info(`获取待处理申请成功: ${applications.length} 条`);

    return applications;
  } catch (error) {
    logger.error('获取待处理申请失败:', error);
    throw new Error(`获取待处理申请失败: ${error.message}`);
  }
};

/**
 * 判断用户是否为管理员
 * @param {String} userId - 用户ID
 * @returns {Boolean} 是否为管理员
 */
const isAdmin = (userId) => {
  // 这里应该从数据库或 token 中获取用户角色
  // 简化处理，实际项目中需要完善
  return false;
};

module.exports = {
  // 创建和查询
  createServiceApplication,
  getServiceApplications,
  getServiceApplicationById,
  updateServiceApplication,
  submitServiceApplication,

  // 审批和取消
  approveServiceApplication,
  cancelServiceApplication,
  deleteServiceApplication,

  // 统计和工具
  getServiceTypes,
  getUserApplicationStats,
  getVillageApplicationStats,
  getPendingApplications,

  // 常量导出
  ServiceTypes,
  ApplicationStatus
};
