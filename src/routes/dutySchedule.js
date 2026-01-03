const express = require('express');
const router = express.Router();
const DutyScheduleController = require('../controllers/dutyScheduleController');
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// 创建控制器实例
const dutyController = new DutyScheduleController();

// 限流配置
const emergencyCallLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 3, // 每分钟最多3次紧急呼叫
  message: {
    success: false,
    message: '紧急呼叫过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const attendanceLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 5, // 每分钟最多5次签到/签退
  message: {
    success: false,
    message: '签到/签退过于频繁，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 验证中间件
const handleValidationErrors = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

// 路由定义

/**
 * @swagger
 * components:
 *   schemas:
 *     DutySchedule:
 *       type: object
 *       required:
 *         - villageId
 *         - scheduleName
 *         - shifts
 *       properties:
 *         villageId:
 *           type: string
 *           description: 村庄ID
 *         scheduleName:
 *           type: string
 *           description: 值班表名称
 *         scheduleType:
 *           type: string
 *           enum: [daily, weekly, monthly, emergency]
 *           description: 值班表类型
 *         shifts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               shiftName:
 *                 type: string
 *                 description: 班次名称
 *               startTime:
 *                 type: string
 *                 description: 开始时间
 *               endTime:
 *                 type: string
 *                 description: 结束时间
 *               requiredStaff:
 *                 type: number
 *                 description: 需要人员数量
 *               duties:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 值班职责
 */

/**
 * @swagger
 * /api/duty-schedule:
 *   post:
 *     summary: 创建值班表
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleName
 *               - shifts
 *             properties:
 *               scheduleName:
 *                 type: string
 *               scheduleType:
 *                 type: string
 *                 enum: [daily, weekly, monthly, emergency]
 *               shifts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     shiftName:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     requiredStaff:
 *                       type: number
 *                     duties:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       201:
 *         description: 值班表创建成功
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.post('/', auth.authenticate, [
  body('scheduleName')
    .notEmpty()
    .withMessage('值班表名称不能为空')
    .isLength({ max: 100 })
    .withMessage('值班表名称不能超过100个字符'),
  body('scheduleType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'emergency'])
    .withMessage('值班表类型无效'),
  body('shifts')
    .isArray({ min: 1 })
    .withMessage('至少需要定义一个班次'),
  body('shifts.*.shiftName')
    .notEmpty()
    .withMessage('班次名称不能为空'),
  body('shifts.*.startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('开始时间格式错误，应为 HH:MM'),
  body('shifts.*.endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('结束时间格式错误，应为 HH:MM'),
  body('shifts.*.requiredStaff')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('需要人员数量必须在1-10之间'),
  body('shifts.*.duties')
    .optional()
    .isArray()
    .withMessage('值班职责必须为数组'),
  handleValidationErrors
], dutyController.createSchedule);

/**
 * @swagger
 * /api/duty-schedule:
 *   get:
 *     summary: 获取值班表列表
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否激活
 *       - in: query
 *         name: scheduleType
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, emergency]
 *         description: 值班表类型
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序方向
 *     responses:
 *       200:
 *         description: 值班表列表
 *       500:
 *         description: 服务器错误
 */
router.get('/', auth.authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须为正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive必须为布尔值'),
  query('scheduleType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'emergency'])
    .withMessage('值班表类型无效'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'scheduleName', 'scheduleType'])
    .withMessage('排序字段无效'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('排序方向无效'),
  handleValidationErrors
], dutyController.getSchedules);

/**
 * @swagger
 * /api/duty-schedule/current:
 *   get:
 *     summary: 获取当前值班信息
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 当前值班信息
 *       500:
 *         description: 服务器错误
 */
router.get('/current', auth.authenticate,dutyController.getCurrentDuty);

/**
 * @swagger
 * /api/duty-schedule/my:
 *   get:
 *     summary: 获取我的值班安排
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, on_duty, completed, absent, late]
 *         description: 状态过滤
 *     responses:
 *       200:
 *         description: 我的值班安排
 *       500:
 *         description: 服务器错误
 */
router.get('/my', auth.authenticate,dutyController.getMySchedule);

/**
 * @swagger
 * /api/duty-schedule/emergency-call:
 *   post:
 *     summary: 扫码紧急呼叫
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCodeData
 *             properties:
 *               qrCodeData:
 *                 type: string
 *                 description: 二维码数据
 *               emergencyType:
 *                 type: string
 *                 enum: [general, fire, medical, security, accident, flood, weather, power_outage, gas_leak]
 *                 default: general
 *               latitude:
 *                 type: number
 *                 description: 纬度
 *               longitude:
 *                 type: number
 *                 description: 经度
 *               address:
 *                 type: string
 *                 description: 详细地址
 *     responses:
 *       200:
 *         description: 紧急呼叫已发送
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.post('/emergency-call', auth.authenticate,emergencyCallLimit, [
  body('qrCodeData')
    .notEmpty()
    .withMessage('二维码数据不能为空')
    .isJSON()
    .withMessage('二维码数据格式错误'),
  body('emergencyType')
    .optional()
    .isIn(['general', 'fire', 'medical', 'security', 'accident', 'flood', 'weather', 'power_outage', 'gas_leak'])
    .withMessage('紧急类型无效'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('纬度必须在-90到90之间'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('经度必须在-180到180之间'),
  body('address')
    .optional()
    .isString()
    .withMessage('地址必须为字符串'),
  handleValidationErrors
], dutyController.emergencyCall);

/**
 * @swagger
 * /api/duty-schedule/validate-qr:
 *   post:
 *     summary: 验证值班二维码
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCodeData
 *             properties:
 *               qrCodeData:
 *                 type: string
 *                 description: 二维码数据
 *     responses:
 *       200:
 *         description: 二维码验证成功
 *       400:
 *         description: 二维码无效或过期
 *       404:
 *         description: 值班表不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/validate-qr', auth.authenticate, [
  body('qrCodeData')
    .notEmpty()
    .withMessage('二维码数据不能为空')
    .isJSON()
    .withMessage('二维码数据格式错误'),
  handleValidationErrors
], dutyController.validateQRCode);

/**
 * @swagger
 * /api/duty-schedule/statistics:
 *   get:
 *     summary: 获取值班统计
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [attendance, performance, emergency, comprehensive]
 *           default: comprehensive
 *         description: 报表类型
 *     responses:
 *       200:
 *         description: 值班统计报表
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.get('/statistics', auth.authenticate, [
  query('startDate')
    .notEmpty()
    .withMessage('开始日期不能为空')
    .isISO8601()
    .withMessage('开始日期格式错误'),
  query('endDate')
    .notEmpty()
    .withMessage('结束日期不能为空')
    .isISO8601()
    .withMessage('结束日期格式错误'),
  query('reportType')
    .optional()
    .isIn(['attendance', 'performance', 'emergency', 'comprehensive'])
    .withMessage('报表类型无效'),
  handleValidationErrors
], dutyController.getDutyStatistics);

/**
 * @swagger
 * /api/duty-schedule/export:
 *   get:
 *     summary: 导出值班报表
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [excel, pdf, csv]
 *           default: excel
 *         description: 导出格式
 *     responses:
 *       200:
 *         description: 报表导出成功
 *       400:
 *         description: 参数验证失败
 *       500:
 *         description: 服务器错误
 */
router.get('/export', auth.authenticate,dutyController.exportDutyReport);

/**
 * @swagger
 * /api/duty-schedule/{scheduleId}/smart-schedule:
 *   post:
 *     summary: 生成智能排班
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 值班表ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: 排班开始日期
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: 排班结束日期
 *               balanceWorkload:
 *                 type: boolean
 *                 default: true
 *                 description: 是否平衡工作量
 *               considerPreferences:
 *                 type: boolean
 *                 default: true
 *                 description: 是否考虑个人偏好
 *               enforceRestTime:
 *                 type: boolean
 *                 default: true
 *                 description: 是否强制休息时间
 *     responses:
 *       200:
 *         description: 智能排班生成成功
 *       404:
 *         description: 值班表不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/:scheduleId/smart-schedule', auth.authenticate, [
  param('scheduleId')
    .isMongoId()
    .withMessage('值班表ID格式错误'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式错误'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式错误'),
  body('balanceWorkload')
    .optional()
    .isBoolean()
    .withMessage('balanceWorkload必须为布尔值'),
  body('considerPreferences')
    .optional()
    .isBoolean()
    .withMessage('considerPreferences必须为布尔值'),
  body('enforceRestTime')
    .optional()
    .isBoolean()
    .withMessage('enforceRestTime必须为布尔值'),
  handleValidationErrors
], dutyController.generateSmartSchedule);

/**
 * @swagger
 * /api/duty-schedule/{scheduleId}:
 *   get:
 *     summary: 获取值班表详情
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 值班表ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: includeLogs
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含值班日志
 *     responses:
 *       200:
 *         description: 值班表详情
 *       404:
 *         description: 值班表不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:scheduleId', auth.authenticate, [
  param('scheduleId')
    .isMongoId()
    .withMessage('值班表ID格式错误'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式错误'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式错误'),
  query('includeLogs')
    .optional()
    .isBoolean()
    .withMessage('includeLogs必须为布尔值'),
  handleValidationErrors
], dutyController.getScheduleDetail);

/**
 * @swagger
 * /api/duty-schedule/{scheduleId}:
 *   put:
 *     summary: 更新值班表
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 值班表ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduleName:
 *                 type: string
 *               scheduleType:
 *                 type: string
 *                 enum: [daily, weekly, monthly, emergency]
 *               isActive:
 *                 type: boolean
 *               shifts:
 *                 type: array
 *     responses:
 *       200:
 *         description: 值班表更新成功
 *       404:
 *         description: 值班表不存在
 *       500:
 *         description: 服务器错误
 */
router.put('/:scheduleId', auth.authenticate, [
  param('scheduleId')
    .isMongoId()
    .withMessage('值班表ID格式错误'),
  body('scheduleName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('值班表名称不能超过100个字符'),
  body('scheduleType')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'emergency'])
    .withMessage('值班表类型无效'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive必须为布尔值'),
  handleValidationErrors
], dutyController.updateSchedule);

/**
 * @swagger
 * /api/duty-schedule/{scheduleId}:
 *   delete:
 *     summary: 删除值班表
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 值班表ID
 *     responses:
 *       200:
 *         description: 值班表删除成功
 *       404:
 *         description: 值班表不存在
 *       500:
 *         description: 服务器错误
 */
router.delete('/:scheduleId', auth.authenticate, [
  param('scheduleId')
    .isMongoId()
    .withMessage('值班表ID格式错误'),
  handleValidationErrors
], dutyController.deleteSchedule);

/**
 * @swagger
 * /api/duty-schedule/{scheduleId}/qrcode:
 *   get:
 *     summary: 生成值班表二维码
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 值班表ID
 *     responses:
 *       200:
 *         description: 二维码生成成功
 *       404:
 *         description: 值班表不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:scheduleId/qrcode', auth.authenticate, [
  param('scheduleId')
    .isMongoId()
    .withMessage('值班表ID格式错误'),
  handleValidationErrors
], dutyController.generateQRCode);

/**
 * @swagger
 * /api/duty-schedule/{scheduleId}/attendance:
 *   post:
 *     summary: 签到/签退
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 值班表ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - latitude
 *               - longitude
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [checkin, checkout]
 *                 description: 动作类型
 *               latitude:
 *                 type: number
 *                 description: 纬度
 *               longitude:
 *                 type: number
 *                 description: 经度
 *               address:
 *                 type: string
 *                 description: 详细地址
 *     responses:
 *       200:
 *         description: 签到/签退成功
 *       400:
 *         description: 参数验证失败
 *       404:
 *         description: 值班安排不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/:scheduleId/attendance', auth.authenticate,attendanceLimit, [
  param('scheduleId')
    .isMongoId()
    .withMessage('值班表ID格式错误'),
  body('action')
    .isIn(['checkin', 'checkout'])
    .withMessage('动作类型必须是checkin或checkout'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('纬度必须在-90到90之间'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('经度必须在-180到180之间'),
  body('address')
    .optional()
    .isString()
    .withMessage('地址必须为字符串'),
  handleValidationErrors
], dutyController.handleAttendance);

/**
 * @swagger
 * /api/duty-schedule/{scheduleId}/work-record:
 *   post:
 *     summary: 添加工作记录
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 值班表ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recordType
 *               - title
 *               - description
 *             properties:
 *               recordType:
 *                 type: string
 *                 enum: [patrol, visitor, incident, maintenance, emergency, report, handover, weather, other]
 *                 description: 记录类型
 *               title:
 *                 type: string
 *                 description: 标题
 *               description:
 *                 type: string
 *                 description: 描述
 *               longitude:
 *                 type: number
 *                 description: 经度
 *               latitude:
 *                 type: number
 *                 description: 纬度
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *                 description: 优先级
 *     responses:
 *       200:
 *         description: 工作记录添加成功
 *       400:
 *         description: 参数验证失败
 *       404:
 *         description: 值班记录不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/:scheduleId/work-record', auth.authenticate, [
  param('scheduleId')
    .isMongoId()
    .withMessage('值班表ID格式错误'),
  body('recordType')
    .isIn(['patrol', 'visitor', 'incident', 'maintenance', 'emergency', 'report', 'handover', 'weather', 'other'])
    .withMessage('记录类型无效'),
  body('title')
    .notEmpty()
    .withMessage('标题不能为空'),
  body('description')
    .notEmpty()
    .withMessage('描述不能为空'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('经度必须在-180到180之间'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('纬度必须在-90到90之间'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('优先级无效'),
  handleValidationErrors
], dutyController.addWorkRecord);

/**
 * @swagger
 * /api/duty-schedule/{scheduleId}/logs/{logId}/attachment:
 *   post:
 *     summary: 上传工作记录附件
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 值班表ID
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: 日志ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 上传的文件
 *     responses:
 *       200:
 *         description: 文件上传成功
 *       400:
 *         description: 文件类型不支持或过大
 *       404:
 *         description: 值班记录不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/:scheduleId/logs/:logId/attachment', auth.authenticate, [
  param('scheduleId')
    .isMongoId()
    .withMessage('值班表ID格式错误'),
  param('logId')
    .isMongoId()
    .withMessage('日志ID格式错误')
], dutyController.uploadWorkRecordAttachment);

/**
 * @swagger
 * /api/duty-schedule/{scheduleId}/shift-change:
 *   post:
 *     summary: 交接班
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: 值班表ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toOfficer
 *             properties:
 *               toOfficer:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   userName:
 *                     type: string
 *                   userPhone:
 *                     type: string
 *               handoverContent:
 *                 type: object
 *                 properties:
 *                   pendingTasks:
 *                     type: array
 *                     items:
 *                       type: string
 *                   specialNotes:
 *                     type: string
 *                   equipmentStatus:
 *                     type: array
 *                     items:
 *                       type: object
 *                   weatherCondition:
 *                     type: string
 *                   securityStatus:
 *                     type: string
 *     responses:
 *       200:
 *         description: 交接班成功
 *       400:
 *         description: 参数验证失败
 *       404:
 *         description: 值班记录不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/:scheduleId/shift-change', auth.authenticate, [
  param('scheduleId')
    .isMongoId()
    .withMessage('值班表ID格式错误'),
  body('toOfficer.userId')
    .notEmpty()
    .withMessage('接班人员ID不能为空'),
  body('toOfficer.userName')
    .notEmpty()
    .withMessage('接班人员姓名不能为空'),
  body('toOfficer.userPhone')
    .notEmpty()
    .withMessage('接班人员电话不能为空'),
  handleValidationErrors
], dutyController.handleShiftChange);

/**
 * @swagger
 * /api/duty-schedule/history:
 *   get:
 *     summary: 获取值班历史
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID（可选，默认为当前用户）
 *     responses:
 *       200:
 *         description: 值班历史
 *       500:
 *         description: 服务器错误
 */
router.get('/history', auth.authenticate, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须为正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式错误'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('结束日期格式错误'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('用户ID格式错误'),
  handleValidationErrors
], dutyController.getDutyHistory);

// ============================================
// 新增P1功能路由
// ============================================

/**
 * @swagger
 * /api/v1/duty-schedule/calendar:
 *   get:
 *     summary: 获取日历视图数据
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: 年份
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: 月份(1-12)
 *     responses:
 *       200:
 *         description: 日历数据
 *       400:
 *         description: 参数错误
 */
router.get('/calendar', auth.authenticate,dutyController.getCalendarData);

/**
 * @swagger
 * /api/v1/duty-schedule/scan-call:
 *   post:
 *     summary: 扫码呼叫值班人员
 *     tags: [Duty Schedule]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCodeData
 *             properties:
 *               qrCodeData:
 *                 type: string
 *                 description: 二维码数据
 *               urgency:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *                 default: LOW
 *               content:
 *                 type: string
 *                 description: 呼叫内容
 *               location:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       200:
 *         description: 呼叫成功
 *       400:
 *         description: 参数错误
 */
router.post('/scan-call', dutyController.scanAndCall);

/**
 * @swagger
 * /api/v1/duty-schedule/public/today/:villageId:
 *   get:
 *     summary: 获取今日值班信息（公开接口）
 *     tags: [Duty Schedule]
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *         description: 村庄ID
 *     responses:
 *       200:
 *         description: 今日值班信息
 *       404:
 *         description: 村庄不存在
 */
router.get('/public/today/:villageId', dutyController.getTodayDutyPublic);

module.exports = router;