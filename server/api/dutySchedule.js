const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const dutyController = require('../controllers/dutyController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// 排班相关API限流
const dutyApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});

// 应用限流
router.use(dutyApiLimiter);

/**
 * @route   POST /api/duty/schedule
 * @desc    创建月度值班表
 * @access  Private (需要管理员权限)
 */
router.post('/schedule',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    body('villageId').notEmpty().withMessage('村庄ID不能为空'),
    body('year').isInt({ min: 2020, max: 2030 }).withMessage('年份无效'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('月份无效'),
    body('algorithm').isIn(['rotation', 'balanced', 'priority', 'custom']).withMessage('排班算法无效'),
    body('shifts').isArray({ min: 1 }).withMessage('至少需要一个班次'),
    body('shifts.*.name').notEmpty().withMessage('班次名称不能为空'),
    body('shifts.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开始时间格式无效'),
    body('shifts.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('结束时间格式无效'),
    body('shifts.*.requiredStaffCount').isInt({ min: 1 }).withMessage('所需人员数必须大于0'),
    body('parameters').optional().isObject().withMessage('参数必须是对象')
  ],
  dutyController.createSchedule
);

/**
 * @route   PUT /api/duty/schedule/:scheduleId/publish
 * @desc    发布值班表
 * @access  Private (需要管理员权限)
 */
router.put('/schedule/:scheduleId/publish',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    param('scheduleId').isMongoId().withMessage('值班表ID无效')
  ],
  dutyController.publishSchedule
);

/**
 * @route   GET /api/duty/schedule
 * @desc    获取月度值班表
 * @access  Private
 */
router.get('/schedule',
  authenticate,
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    query('year').isInt({ min: 2020, max: 2030 }).withMessage('年份无效'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('月份无效')
  ],
  dutyController.getMonthlySchedule
);

/**
 * @route   GET /api/duty/schedules
 * @desc    获取值班表列表
 * @access  Private
 */
router.get('/schedules',
  authenticate,
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    query('year').optional().isInt({ min: 2020, max: 2030 }),
    query('status').optional().isIn(['draft', 'published', 'active', 'archived']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  dutyController.getScheduleList
);

/**
 * @route   GET /api/duty/schedule/:scheduleId
 * @desc    获取值班表详情
 * @access  Private
 */
router.get('/schedule/:scheduleId',
  authenticate,
  [
    param('scheduleId').isMongoId().withMessage('值班表ID无效')
  ],
  dutyController.getScheduleDetail
);

/**
 * @route   POST /api/duty/schedule/swap
 * @desc    申请调班
 * @access  Private
 */
router.post('/schedule/swap',
  authenticate,
  [
    body('scheduleId').isMongoId().withMessage('值班表ID无效'),
    body('date').isISO8601().withMessage('日期格式无效'),
    body('shiftName').notEmpty().withMessage('班次名称不能为空'),
    body('originalStaffId').isMongoId().withMessage('原值班人员ID无效'),
    body('newStaffId').isMongoId().withMessage('新值班人员ID无效'),
    body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('调班原因长度必须在1-500字符之间'),
    body('isTemporary').optional().isBoolean().withMessage('是否临时调班必须是布尔值'),
    body('temporaryUntil').optional().isISO8601().withMessage('临时调班结束日期格式无效')
  ],
  dutyController.applyShiftSwap
);

/**
 * @route   POST /api/duty/schedule/swap/emergency
 * @desc    紧急调班
 * @access  Private (需要管理员权限)
 */
router.post('/schedule/swap/emergency',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    body('scheduleId').isMongoId().withMessage('值班表ID无效'),
    body('date').isISO8601().withMessage('日期格式无效'),
    body('shiftName').notEmpty().withMessage('班次名称不能为空'),
    body('originalStaffId').isMongoId().withMessage('原值班人员ID无效'),
    body('newStaffId').isMongoId().withMessage('新值班人员ID无效'),
    body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('紧急调班原因长度必须在1-500字符之间')
  ],
  dutyController.handleEmergencySwap
);

/**
 * @route   PUT /api/duty/schedule/swap/:swapId/approve
 * @desc    批准调班
 * @access  Private (需要管理员权限)
 */
router.put('/schedule/swap/:swapId/approve',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    param('swapId').isMongoId().withMessage('调班记录ID无效')
  ],
  dutyController.approveSwap
);

/**
 * @route   PUT /api/duty/schedule/swap/:swapId/reject
 * @desc    拒绝调班
 * @access  Private (需要管理员权限)
 */
router.put('/schedule/swap/:swapId/reject',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    param('swapId').isMongoId().withMessage('调班记录ID无效'),
    body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('拒绝原因长度必须在1-500字符之间')
  ],
  dutyController.rejectSwap
);

/**
 * @route   GET /api/duty/swaps/pending
 * @desc    获取待处理调班申请
 * @access  Private (需要管理员权限)
 */
router.get('/swaps/pending',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  dutyController.getPendingSwaps
);

/**
 * @route   POST /api/duty/handover
 * @desc    创建交接班记录
 * @access  Private
 */
router.post('/handover',
  authenticate,
  [
    body('scheduleId').isMongoId().withMessage('值班表ID无效'),
    body('date').isISO8601().withMessage('日期格式无效'),
    body('shiftName').notEmpty().withMessage('班次名称不能为空'),
    body('fromStaffId').isMongoId().withMessage('交班人员ID无效'),
    body('toStaffId').isMongoId().withMessage('接班人员ID无效'),
    body('handoverContent').optional().isObject(),
    body('handoverContent.ongoingTasks').optional().isArray(),
    body('handoverContent.completedTasks').optional().isArray(),
    body('handoverContent.pendingIssues').optional().isArray(),
    body('handoverContent.importantNotes').optional().isString().isLength({ max: 1000 }),
    body('photos').optional().isArray()
  ],
  dutyController.createHandover
);

/**
 * @route   PUT /api/duty/handover/:handoverId/confirm
 * @desc    确认交接班
 * @access  Private
 */
router.put('/handover/:handoverId/confirm',
  authenticate,
  [
    param('handoverId').isMongoId().withMessage('交接班记录ID无效')
  ],
  dutyController.confirmHandover
);

/**
 * @route   GET /api/duty/handover
 * @desc    获取交接班记录列表
 * @access  Private
 */
router.get('/handover',
  authenticate,
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
    query('staffId').optional().isMongoId().withMessage('人员ID无效'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  dutyController.getHandoverList
);

/**
 * @route   GET /api/duty/staff/:staffId/history
 * @desc    获取人员值班历史
 * @access  Private
 */
router.get('/staff/:staffId/history',
  authenticate,
  [
    param('staffId').isMongoId().withMessage('人员ID无效'),
    query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  dutyController.getStaffHistory
);

/**
 * @route   GET /api/duty/report
 * @desc    生成值班统计报表
 * @access  Private
 */
router.get('/report',
  authenticate,
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    query('startDate').isISO8601().withMessage('开始日期格式无效'),
    query('endDate').isISO8601().withMessage('结束日期格式无效'),
    query('staffId').optional().isMongoId().withMessage('人员ID无效'),
    query('reportType').isIn(['summary', 'staff', 'shift', 'detail']).withMessage('报表类型无效')
  ],
  dutyController.generateReport
);

/**
 * @route   GET /api/duty/suggestion
 * @desc    获取排班建议
 * @access  Private (需要管理员权限)
 */
router.get('/suggestion',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空')
  ],
  dutyController.getSuggestion
);

/**
 * @route   GET /api/duty/export
 * @desc    导出排班数据
 * @access  Private (需要管理员权限)
 */
router.get('/export',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    query('startDate').isISO8601().withMessage('开始日期格式无效'),
    query('endDate').isISO8601().withMessage('结束日期格式无效'),
    query('format').isIn(['excel', 'csv', 'pdf']).withMessage('导出格式无效'),
    query('dataTypes').optional().isString().withMessage('数据类型必须是字符串')
  ],
  dutyController.exportData
);

/**
 * @route   POST /api/duty/staff
 * @desc    添加值班人员
 * @access  Private (需要管理员权限)
 */
router.post('/staff',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    body('userId').isMongoId().withMessage('用户ID无效'),
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('姓名长度必须在2-50字符之间'),
    body('position').trim().isLength({ min: 2, max: 50 }).withMessage('职务长度必须在2-50字符之间'),
    body('department').trim().isLength({ min: 2, max: 50 }).withMessage('部门长度必须在2-50字符之间'),
    body('contact.phone').optional().matches(/^1[3-9]\d{9}$/).withMessage('手机号格式无效'),
    body('contact.email').optional().isEmail().withMessage('邮箱格式无效'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('优先级必须在1-10之间'),
    body('maxDutyPerMonth').optional().isInt({ min: 1, max: 31 }).withMessage('月度最大值班次数必须在1-31之间'),
    body('villageId').isMongoId().withMessage('村庄ID无效')
  ],
  dutyController.addStaff
);

/**
 * @route   PUT /api/duty/staff/:staffId
 * @desc    更新值班人员信息
 * @access  Private (需要管理员权限)
 */
router.put('/staff/:staffId',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    param('staffId').isMongoId().withMessage('人员ID无效'),
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('姓名长度必须在2-50字符之间'),
    body('position').optional().trim().isLength({ min: 2, max: 50 }).withMessage('职务长度必须在2-50字符之间'),
    body('department').optional().trim().isLength({ min: 2, max: 50 }).withMessage('部门长度必须在2-50字符之间'),
    body('contact.phone').optional().matches(/^1[3-9]\d{9}$/).withMessage('手机号格式无效'),
    body('contact.email').optional().isEmail().withMessage('邮箱格式无效'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('优先级必须在1-10之间'),
    body('maxDutyPerMonth').optional().isInt({ min: 1, max: 31 }).withMessage('月度最大值班次数必须在1-31之间'),
    body('isActive').optional().isBoolean().withMessage('状态必须是布尔值')
  ],
  dutyController.updateStaff
);

/**
 * @route   DELETE /api/duty/staff/:staffId
 * @desc    删除值班人员
 * @access  Private (需要管理员权限)
 */
router.delete('/staff/:staffId',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    param('staffId').isMongoId().withMessage('人员ID无效')
  ],
  dutyController.deleteStaff
);

/**
 * @route   GET /api/duty/staff
 * @desc    获取值班人员列表
 * @access  Private
 */
router.get('/staff',
  authenticate,
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
    query('isActive').optional().isBoolean().withMessage('状态必须是布尔值'),
    query('department').optional().trim().withMessage('部门不能为空'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  dutyController.getStaffList
);

/**
 * @route   POST /api/duty/batch
 * @desc    批量操作
 * @access  Private (需要管理员权限)
 */
router.post('/batch',
  authenticate,
  authorize(['admin', 'village_manager']),
  [
    body('operation').isIn(['publish_schedules', 'approve_swaps', 'archive_schedules', 'notify_staff']).withMessage('批量操作类型无效'),
    body('items').isArray({ min: 1 }).withMessage('至少需要一个操作项'),
    body('items.*.id').isMongoId().withMessage('ID无效')
  ],
  dutyController.batchOperation
);

// 验证中间件
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

// 应用验证中间件
router.use(validateRequest);

module.exports = router;