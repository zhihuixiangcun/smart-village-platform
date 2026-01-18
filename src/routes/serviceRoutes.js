/**
 * Service Routes
 * 服务申请路由
 *
 * 提供 RESTful API 接口：
 * - 创建、查询、更新、删除服务申请
 * - 提交、审批、取消申请
 * - 获取统计数据
 */

const express = require('express');
const router = express.Router();
const {
  createServiceApplication,
  getServiceApplications,
  getServiceApplicationById,
  updateServiceApplication,
  submitServiceApplication,
  approveServiceApplication,
  cancelServiceApplication,
  deleteServiceApplication,
  getServiceTypes,
  getUserApplicationStats,
  getVillageApplicationStats,
  getPendingApplications,
  ServiceTypes,
  ApplicationStatus
} = require('../controllers/serviceController');

/**
 * 中间件：从请求中获取用户信息
 */
const getUserFromRequest = (req) => {
  return {
    userId: req.user?.id || req.user?._id,
    name: req.user?.name,
    role: req.user?.role,
    villageId: req.user?.villageId
  };
};

/**
 * 中间件：检查管理员权限
 */
const requireAdmin = (req, res, next) => {
  const userRole = req.user?.role;
  if (!['village_admin', 'super_admin', 'admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: '需要管理员权限',
      code: 'PERMISSION_DENIED'
    });
  }
  next();
};

/**
 * 中间件：验证申请数据
 */
const validateApplicationData = (req, res, next) => {
  const { serviceType, title, description } = req.body;

  if (!serviceType || !Object.values(ServiceTypes).includes(serviceType)) {
    return res.status(400).json({
      success: false,
      error: '无效的服务类型',
      code: 'INVALID_SERVICE_TYPE'
    });
  }

  if (!title || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: '申请标题不能为空',
      code: 'MISSING_TITLE'
    });
  }

  if (!description || description.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: '申请描述不能为空',
      code: 'MISSING_DESCRIPTION'
    });
  }

  next();
};

// ==================== 公开接口 ====================

/**
 * GET /api/v1/services/types
 * 获取所有服务类型列表
 */
router.get('/types', (req, res) => {
  try {
    const types = getServiceTypes();

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_SERVICE_TYPES_ERROR'
    });
  }
});

// ==================== 用户接口 ====================

/**
 * GET /api/v1/services
 * 获取服务申请列表
 * 查询参数：page, limit, serviceType, status, keyword, startDate, endDate
 */
router.get('/', async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    const filters = {
      userId: user.role === 'admin' ? undefined : user.userId,
      villageId: user.villageId,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      serviceType: req.query.serviceType,
      status: req.query.status,
      keyword: req.query.keyword,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      priority: req.query.priority
    };

    // 移除 undefined 的过滤器
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) delete filters[key];
    });

    const result = await getServiceApplications(filters);

    res.json({
      success: true,
      data: result.results,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_APPLICATIONS_ERROR'
    });
  }
});

/**
 * GET /api/v1/services/stats
 * 获取用户申请统计
 */
router.get('/stats', async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    let stats;
    if (['village_admin', 'super_admin', 'admin'].includes(user.role)) {
      // 管理员获取村庄统计
      stats = await getVillageApplicationStats(
        user.villageId,
        req.query.startDate,
        req.query.endDate
      );
    } else {
      // 普通用户获取个人统计
      stats = await getUserApplicationStats(user.userId);
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_STATS_ERROR'
    });
  }
});

/**
 * GET /api/v1/services/pending
 * 获取待处理申请列表（管理员专用）
 */
router.get('/pending', requireAdmin, async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const limit = parseInt(req.query.limit) || 50;

    const applications = await getPendingApplications(user.villageId, limit);

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'GET_PENDING_ERROR'
    });
  }
});

/**
 * GET /api/v1/services/:id
 * 获取单个申请详情
 */
router.get('/:id', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const application = await getServiceApplicationById(req.params.id, user.userId);

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    const statusCode = error.message.includes('不存在') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'GET_APPLICATION_ERROR'
    });
  }
});

/**
 * POST /api/v1/services
 * 创建新的服务申请
 */
router.post('/', validateApplicationData, async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    const applicationData = {
      applicant: {
        userId: user.userId,
        name: req.body.applicantName || user.name,
        phone: req.body.applicantPhone,
        idCard: req.body.applicantIdCard,
        address: req.body.applicantAddress
      },
      serviceType: req.body.serviceType,
      title: req.body.title,
      description: req.body.description,
      formData: req.body.formData || {},
      attachments: req.body.attachments || [],
      villageId: user.villageId,
      priority: req.body.priority || 'normal',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        source: req.body.source || 'web'
      }
    };

    const application = await createServiceApplication(applicationData);

    res.status(201).json({
      success: true,
      data: application,
      message: '申请创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'CREATE_APPLICATION_ERROR'
    });
  }
});

/**
 * PUT /api/v1/services/:id
 * 更新服务申请（仅草稿状态可编辑）
 */
router.put('/:id', async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      formData: req.body.formData,
      attachments: req.body.attachments,
      priority: req.body.priority
    };

    // 移除 undefined 的字段
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const application = await updateServiceApplication(req.params.id, updateData, user.userId);

    res.json({
      success: true,
      data: application,
      message: '申请更新成功'
    });
  } catch (error) {
    const statusCode = error.message.includes('无权') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'UPDATE_APPLICATION_ERROR'
    });
  }
});

/**
 * POST /api/v1/services/:id/submit
 * 提交服务申请
 */
router.post('/:id/submit', async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    const application = await submitServiceApplication(req.params.id, user.userId);

    res.json({
      success: true,
      data: application,
      message: '申请提交成功'
    });
  } catch (error) {
    const statusCode = error.message.includes('无权') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'SUBMIT_APPLICATION_ERROR'
    });
  }
});

/**
 * POST /api/v1/services/:id/approve
 * 审批服务申请（管理员专用）
 */
router.post('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    const approvalData = {
      status: req.body.status,
      comments: req.body.comments,
      reviewer: {
        userId: user.userId,
        name: user.name,
        role: user.role
      },
      expectedCompletionDate: req.body.expectedCompletionDate
    };

    // 验证状态
    if (!Object.values(ApplicationStatus).includes(approvalData.status)) {
      return res.status(400).json({
        success: false,
        error: '无效的审批状态',
        code: 'INVALID_STATUS'
      });
    }

    const application = await approveServiceApplication(req.params.id, approvalData);

    res.json({
      success: true,
      data: application,
      message: '审批成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'APPROVE_APPLICATION_ERROR'
    });
  }
});

/**
 * POST /api/v1/services/:id/cancel
 * 取消服务申请
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const { reason } = req.body;

    const application = await cancelServiceApplication(req.params.id, user.userId, reason);

    res.json({
      success: true,
      data: application,
      message: '申请已取消'
    });
  } catch (error) {
    const statusCode = error.message.includes('无权') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'CANCEL_APPLICATION_ERROR'
    });
  }
});

/**
 * DELETE /api/v1/services/:id
 * 删除服务申请（仅草稿状态可删除）
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = getUserFromRequest(req);

    await deleteServiceApplication(req.params.id, user.userId);

    res.json({
      success: true,
      message: '申请删除成功'
    });
  } catch (error) {
    const statusCode = error.message.includes('无权') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'DELETE_APPLICATION_ERROR'
    });
  }
});

/**
 * GET /api/v1/services/status/list
 * 获取所有申请状态列表
 */
router.get('/status/list', (req, res) => {
  const statusList = Object.entries(ApplicationStatus).map(([key, value]) => ({
    key,
    value,
    label: getStatusLabel(value)
  }));

  res.json({
    success: true,
    data: statusList
  });
});

/**
 * 获取状态标签
 */
const getStatusLabel = (status) => {
  const labels = {
    [ApplicationStatus.DRAFT]: '草稿',
    [ApplicationStatus.SUBMITTED]: '已提交',
    [ApplicationStatus.UNDER_REVIEW]: '审核中',
    [ApplicationStatus.APPROVED]: '已批准',
    [ApplicationStatus.REJECTED]: '已拒绝',
    [ApplicationStatus.PROCESSING]: '处理中',
    [ApplicationStatus.COMPLETED]: '已完成',
    [ApplicationStatus.CANCELLED]: '已取消'
  };
  return labels[status] || status;
};

module.exports = router;
