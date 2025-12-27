/**
 * 会议路由
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const MeetingService = require('../services/MeetingService');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const meetingService = new MeetingService();

// 创建会议
router.post('/',
  auth,
  [
    body('title').notEmpty().withMessage('会议标题不能为空'),
    body('type').isIn(['村委会议', '党员会议', '村民代表会议', '村民大会', '专题会议', '紧急会议', '听证会']).withMessage('会议类型无效'),
    body('scheduledTime').isISO8601().withMessage('会议时间格式错误'),
    body('estimatedDuration').isInt({ min: 15, max: 480 }).withMessage('会议时长必须在15-480分钟之间'),
    body('location.name').notEmpty().withMessage('会议地点不能为空'),
    body('location.type').isIn(['会议室', '广场', '线上会议', '其他']).withMessage('地点类型无效'),
    body('organizer.name').notEmpty().withMessage('组织者姓名不能为空'),
    body('organizer.position').notEmpty().withMessage('组织者职位不能为空'),
    body('participants.required').isArray().withMessage('参会人员列表不能为空')
  ],
  validate,
  async (req, res) => {
    try {
      const meeting = await meetingService.createMeeting(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: meeting,
        message: '会议创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 更新会议
router.put('/:id',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('title').optional().notEmpty().withMessage('会议标题不能为空'),
    body('scheduledTime').optional().isISO8601().withMessage('会议时间格式错误'),
    body('location.name').optional().notEmpty().withMessage('会议地点不能为空')
  ],
  validate,
  async (req, res) => {
    try {
      const meeting = await meetingService.updateMeeting(req.params.id, req.body, req.user.id);
      res.json({
        success: true,
        data: meeting,
        message: '会议更新成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 取消会议
router.post('/:id/cancel',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('reason').optional().isLength({ max: 500 }).withMessage('取消原因不能超过500字符')
  ],
  validate,
  async (req, res) => {
    try {
      const meeting = await meetingService.cancelMeeting(req.params.id, req.user.id, req.body.reason);
      res.json({
        success: true,
        data: meeting,
        message: '会议取消成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取会议列表
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('type').optional().isIn(['村委会议', '党员会议', '村民代表会议', '村民大会', '专题会议', '紧急会议', '听证会']),
    query('status').optional().isIn(['筹备中', '待召开', '进行中', '已结束', '已取消']),
    query('startDate').optional().isISO8601().withMessage('开始日期格式错误'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式错误'),
    query('organizerId').optional().isMongoId().withMessage('组织者ID格式错误'),
    query('userId').optional().isMongoId().withMessage('用户ID格式错误')
  ],
  validate,
  async (req, res) => {
    try {
      const result = await meetingService.getMeetings(req.query);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取会议详情
router.get('/:id',
  param('id').isMongoId().withMessage('ID格式错误'),
  validate,
  async (req, res) => {
    try {
      const meeting = await meetingService.getMeetingById(req.params.id);
      res.json({
        success: true,
        data: meeting
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 会议签到
router.post('/:id/checkin',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('method').optional().isIn(['人脸识别', '二维码', '手动签到', 'GPS定位']).withMessage('签到方式无效')
  ],
  validate,
  async (req, res) => {
    try {
      const meeting = await meetingService.checkIn(
        req.params.id,
        req.user.id,
        req.user.name,
        req.body.method || '手动签到'
      );
      res.json({
        success: true,
        data: meeting,
        message: '签到成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 开始会议
router.post('/:id/start',
  auth,
  param('id').isMongoId().withMessage('ID格式错误'),
  validate,
  async (req, res) => {
    try {
      const meeting = await meetingService.startMeeting(req.params.id, req.user.id);
      res.json({
        success: true,
        data: meeting,
        message: '会议开始'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 结束会议
router.post('/:id/end',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('minutes.content').optional().isString(),
    body('minutes.summary').optional().isString(),
    body('minutes.keyDecisions').optional().isArray(),
    body('minutes.actionItems').optional().isArray()
  ],
  validate,
  async (req, res) => {
    try {
      const meeting = await meetingService.endMeeting(req.params.id, req.user.id, req.body.minutes);
      res.json({
        success: true,
        data: meeting,
        message: '会议结束'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 进行表决
router.post('/:id/vote',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('agendaItem').isInt({ min: 1 }).withMessage('议程项必须是正整数'),
    body('voteOption').notEmpty().withMessage('表决选项不能为空')
  ],
  validate,
  async (req, res) => {
    try {
      const meeting = await meetingService.vote(
        req.params.id,
        req.user.id,
        req.body.agendaItem,
        req.body.voteOption
      );
      res.json({
        success: true,
        data: meeting,
        message: '表决成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取今日会议
router.get('/today/list',
  auth,
  query('userId').optional().isMongoId().withMessage('用户ID格式错误'),
  validate,
  async (req, res) => {
    try {
      const meetings = await meetingService.getTodayMeetings(req.query.userId || req.user.id);
      res.json({
        success: true,
        data: meetings
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取即将到来的会议
router.get('/upcoming/list',
  auth,
  [
    query('days').optional().isInt({ min: 1, max: 30 }).withMessage('天数必须在1-30之间'),
    query('userId').optional().isMongoId().withMessage('用户ID格式错误')
  ],
  validate,
  async (req, res) => {
    try {
      const meetings = await meetingService.getUpcomingMeetings(
        req.query.userId || req.user.id,
        parseInt(req.query.days) || 7
      );
      res.json({
        success: true,
        data: meetings
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

module.exports = router;