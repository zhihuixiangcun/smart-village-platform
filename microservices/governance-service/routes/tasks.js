/**
 * 任务路由
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const TaskService = require('../services/TaskService');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const taskService = new TaskService();

// 创建任务
router.post('/',
  auth,
  [
    body('title').notEmpty().withMessage('任务标题不能为空'),
    body('description').notEmpty().withMessage('任务描述不能为空'),
    body('type').isIn([
      '安全生产检查', '疫情防控', '环境整治', '民生服务', '政策宣传',
      '数据收集', '应急响应', '设施维护', '财务管理', '项目监督', '其他'
    ]).withMessage('任务类型无效'),
    body('category').isIn(['日常工作', '专项任务', '紧急任务', '临时任务', '长期任务']).withMessage('任务分类无效'),
    body('priority').isIn(['低', '中', '高', '紧急']).withMessage('优先级无效'),
    body('scheduledTime').isISO8601().withMessage('计划时间格式错误'),
    body('deadline').isISO8601().withMessage('截止时间格式错误'),
    body('estimatedDuration').isInt({ min: 5, max: 1440 }).withMessage('预计时长必须在5-1440分钟之间'),
    body('creator.name').notEmpty().withMessage('创建者姓名不能为空'),
    body('creator.position').notEmpty().withMessage('创建者职位不能为空')
  ],
  validate,
  async (req, res) => {
    try {
      const task = await taskService.createTask(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: task,
        message: '任务创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 分配任务
router.post('/:id/assign',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('assignees').isArray({ min: 1 }).withMessage('执行人员不能为空'),
    body('assignees.*.userId').isMongoId().withMessage('执行人员ID格式错误'),
    body('assignees.*.name').notEmpty().withMessage('执行人员姓名不能为空'),
    body('assignees.*.role').isIn(['主要负责人', '协作人员', '监督人员', '报告人员']).withMessage('角色无效')
  ],
  validate,
  async (req, res) => {
    try {
      const task = await taskService.assignTask(req.params.id, req.body.assignees, req.user.id);
      res.json({
        success: true,
        data: task,
        message: '任务分配成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 开始任务
router.post('/:id/start',
  auth,
  param('id').isMongoId().withMessage('ID格式错误'),
  validate,
  async (req, res) => {
    try {
      const task = await taskService.startTask(req.params.id, req.user.id);
      res.json({
        success: true,
        data: task,
        message: '任务开始成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 更新任务进度
router.post('/:id/progress',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('progress').isInt({ min: 0, max: 100 }).withMessage('进度必须在0-100之间'),
    body('note').optional().isLength({ max: 500 }).withMessage('备注不能超过500字符')
  ],
  validate,
  async (req, res) => {
    try {
      const task = await taskService.updateTaskProgress(
        req.params.id,
        req.body.progress,
        req.user.id,
        req.body.note
      );
      res.json({
        success: true,
        data: task,
        message: '进度更新成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 完成任务
router.post('/:id/complete',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('result.summary').optional().isString(),
    body('result.completion').optional().isIn(['全部完成', '部分完成', '未完成']),
    body('result.quality').optional().isIn(['优秀', '良好', '合格', '需改进'])
  ],
  validate,
  async (req, res) => {
    try {
      const task = await taskService.completeTask(req.params.id, req.user.id, req.body.result);
      res.json({
        success: true,
        data: task,
        message: '任务完成成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 暂停任务
router.post('/:id/pause',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('reason').optional().isLength({ max: 500 }).withMessage('暂停原因不能超过500字符')
  ],
  validate,
  async (req, res) => {
    try {
      const task = await taskService.pauseTask(req.params.id, req.user.id, req.body.reason);
      res.json({
        success: true,
        data: task,
        message: '任务暂停成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 取消任务
router.post('/:id/cancel',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('reason').optional().isLength({ max: 500 }).withMessage('取消原因不能超过500字符')
  ],
  validate,
  async (req, res) => {
    try {
      const task = await taskService.cancelTask(req.params.id, req.user.id, req.body.reason);
      res.json({
        success: true,
        data: task,
        message: '任务取消成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取任务列表
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['待分配', '已分配', '进行中', '暂停', '已完成', '已取消', '已超时']),
    query('priority').optional().isIn(['低', '中', '高', '紧急']),
    query('type').optional().isIn([
      '安全生产检查', '疫情防控', '环境整治', '民生服务', '政策宣传',
      '数据收集', '应急响应', '设施维护', '财务管理', '项目监督', '其他'
    ]),
    query('creatorId').optional().isMongoId().withMessage('创建者ID格式错误'),
    query('assigneeId').optional().isMongoId().withMessage('执行人ID格式错误'),
    query('startDate').optional().isISO8601().withMessage('开始日期格式错误'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式错误'),
    query('keyword').optional().isLength({ min: 1, max: 50 }).withMessage('关键词长度必须在1-50字符之间')
  ],
  validate,
  async (req, res) => {
    try {
      const result = await taskService.getTasks(req.query);
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

// 获取任务详情
router.get('/:id',
  param('id').isMongoId().withMessage('ID格式错误'),
  validate,
  async (req, res) => {
    try {
      const task = await taskService.getTaskById(req.params.id);
      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 完成检查点
router.post('/:id/checkpoints/:checkpointId/complete',
  auth,
  [
    param('id').isMongoId().withMessage('任务ID格式错误'),
    param('checkpointId').isMongoId().withMessage('检查点ID格式错误'),
    body('notes').optional().isLength({ max: 500 }).withMessage('备注不能超过500字符'),
    body('attachments').optional().isArray()
  ],
  validate,
  async (req, res) => {
    try {
      const task = await taskService.completeCheckpoint(
        req.params.id,
        req.params.checkpointId,
        req.user.id,
        req.body.notes,
        req.body.attachments
      );
      res.json({
        success: true,
        data: task,
        message: '检查点完成成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取今日任务
router.get('/today/list',
  auth,
  query('userId').optional().isMongoId().withMessage('用户ID格式错误'),
  validate,
  async (req, res) => {
    try {
      const tasks = await taskService.getTodayTasks(req.query.userId || req.user.id);
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取即将到来的任务
router.get('/upcoming/list',
  auth,
  [
    query('days').optional().isInt({ min: 1, max: 30 }).withMessage('天数必须在1-30之间'),
    query('userId').optional().isMongoId().withMessage('用户ID格式错误')
  ],
  validate,
  async (req, res) => {
    try {
      const tasks = await taskService.getUpcomingTasks(
        req.query.userId || req.user.id,
        parseInt(req.query.days) || 7
      );
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取超时任务
router.get('/overdue/list',
  auth,
  query('assigneeId').optional().isMongoId().withMessage('执行人ID格式错误'),
  validate,
  async (req, res) => {
    try {
      const tasks = await taskService.getOverdueTasks(req.query.assigneeId);
      res.json({
        success: true,
        data: tasks
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