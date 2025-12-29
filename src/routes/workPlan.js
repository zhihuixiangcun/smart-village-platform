/**
 * 村干部工作规划API路由
 * 基于四象限法则的工作规划、执行跟踪、汇总接口
 */

const express = require('express');
const router = express.Router();
const workPlanController = require('../controllers/workPlanController');
const { authenticate, authorize } = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validation');

// ==================== 工作规划管理 ====================

/**
 * @route   POST /api/v1/work-plans
 * @desc    创建工作规划
 * @access  Private (村干部)
 */
router.post('/',
  authenticate,
  authorize(['admin', 'committee']),
  [
    body('villageId').notEmpty().withMessage('村庄ID不能为空'),
    body('tasks').isArray().withMessage('任务列表必须是数组'),
    body('tasks.*.title').notEmpty().withMessage('任务标题不能为空'),
  ],
  validate,
  workPlanController.createWorkPlan
);

/**
 * @route   GET /api/v1/work-plans/today
 * @desc    获取今日工作规划
 * @access  Private (村干部)
 */
router.get('/today',
  authenticate,
  authorize(['admin', 'committee']),
  [
    query('villageId').notEmpty().withMessage('村庄ID不能为空'),
  ],
  validate,
  workPlanController.getTodayWorkPlan
);

/**
 * @route   PUT /api/v1/work-plans/:planId
 * @desc    更新工作规划
 * @access  Private
 */
router.put('/:planId',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
  ],
  validate,
  workPlanController.updateWorkPlan
);

/**
 * @route   POST /api/v1/work-plans/:planId/confirm
 * @desc    确认工作规划
 * @access  Private
 */
router.post('/:planId/confirm',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
  ],
  validate,
  workPlanController.confirmWorkPlan
);

/**
 * @route   POST /api/v1/work-plans/:planId/summary
 * @desc    生成工作汇总
 * @access  Private
 */
router.post('/:planId/summary',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
  ],
  validate,
  workPlanController.generateDailySummary
);

/**
 * @route   POST /api/v1/work-plans/:planId/next-day
 * @desc    创建次日工作规划
 * @access  Private
 */
router.post('/:planId/next-day',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
    body('tasks').isArray().withMessage('任务列表必须是数组'),
  ],
  validate,
  workPlanController.createNextDayPlan
);

/**
 * @route   GET /api/v1/work-plans/statistics
 * @desc    获取工作统计数据
 * @access  Private
 */
router.get('/statistics',
  authenticate,
  workPlanController.getWorkStatistics
);

/**
 * @route   GET /api/v1/work-plans/history
 * @desc    获取工作历史记录
 * @access  Private
 */
router.get('/history',
  authenticate,
  workPlanController.getWorkHistory
);

/**
 * @route   GET /api/v1/work-plans/reports/monthly
 * @desc    获取月度报告
 * @access  Private
 */
router.get('/reports/monthly',
  authenticate,
  [
    query('year').isInt().withMessage('年份必须是整数'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('月份必须是1-12之间的整数'),
  ],
  validate,
  workPlanController.getMonthlyReport
);

/**
 * @route   GET /api/v1/work-plans/team/:villageId
 * @desc    获取团队工作统计（村支书）
 * @access  Private (村支书)
 */
router.get('/team/:villageId',
  authenticate,
  authorize(['admin', 'secretary']),
  [
    param('villageId').isMongoId().withMessage('村庄ID格式不正确'),
  ],
  validate,
  workPlanController.getTeamStatistics
);

// ==================== 任务管理 ====================

/**
 * @route   POST /api/v1/work-plans/:planId/tasks
 * @desc    添加任务
 * @access  Private
 */
router.post('/:planId/tasks',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
    body('title').notEmpty().withMessage('任务标题不能为空'),
  ],
  validate,
  workPlanController.addTask
);

/**
 * @route   PUT /api/v1/work-plans/:planId/tasks/:quadrant/:taskId
 * @desc    更新任务
 * @access  Private
 */
router.put('/:planId/tasks/:quadrant/:taskId',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
    param('taskId').isMongoId().withMessage('任务ID格式不正确'),
    param('quadrant').isIn(['Q1', 'Q2', 'Q3', 'Q4']).withMessage('象限必须是Q1/Q2/Q3/Q4'),
  ],
  validate,
  workPlanController.updateTask
);

/**
 * @route   POST /api/v1/work-plans/:planId/tasks/:quadrant/:taskId/start
 * @desc    开始任务
 * @access  Private
 */
router.post('/:planId/tasks/:quadrant/:taskId/start',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
    param('taskId').isMongoId().withMessage('任务ID格式不正确'),
    param('quadrant').isIn(['Q1', 'Q2', 'Q3', 'Q4']).withMessage('象限必须是Q1/Q2/Q3/Q4'),
  ],
  validate,
  workPlanController.startTask
);

/**
 * @route   POST /api/v1/work-plans/:planId/tasks/:quadrant/:taskId/progress
 * @desc    更新任务进度
 * @access  Private
 */
router.post('/:planId/tasks/:quadrant/:taskId/progress',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
    param('taskId').isMongoId().withMessage('任务ID格式不正确'),
    param('quadrant').isIn(['Q1', 'Q2', 'Q3', 'Q4']).withMessage('象限必须是Q1/Q2/Q3/Q4'),
    body('progress').isInt({ min: 0, max: 100 }).withMessage('进度必须是0-100之间的整数'),
  ],
  validate,
  workPlanController.updateTaskProgress
);

/**
 * @route   POST /api/v1/work-plans/:planId/tasks/:quadrant/:taskId/complete
 * @desc    完成任务
 * @access  Private
 */
router.post('/:planId/tasks/:quadrant/:taskId/complete',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
    param('taskId').isMongoId().withMessage('任务ID格式不正确'),
    param('quadrant').isIn(['Q1', 'Q2', 'Q3', 'Q4']).withMessage('象限必须是Q1/Q2/Q3/Q4'),
  ],
  validate,
  workPlanController.completeTask
);

/**
 * @route   POST /api/v1/work-plans/:planId/tasks/:quadrant/:taskId/postpone
 * @desc    延期任务
 * @access  Private
 */
router.post('/:planId/tasks/:quadrant/:taskId/postpone',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
    param('taskId').isMongoId().withMessage('任务ID格式不正确'),
    param('quadrant').isIn(['Q1', 'Q2', 'Q3', 'Q4']).withMessage('象限必须是Q1/Q2/Q3/Q4'),
  ],
  validate,
  workPlanController.postponeTask
);

/**
 * @route   DELETE /api/v1/work-plans/:planId/tasks/:quadrant/:taskId
 * @desc    删除任务
 * @access  Private
 */
router.delete('/:planId/tasks/:quadrant/:taskId',
  authenticate,
  [
    param('planId').isMongoId().withMessage('规划ID格式不正确'),
    param('taskId').isMongoId().withMessage('任务ID格式不正确'),
    param('quadrant').isIn(['Q1', 'Q2', 'Q3', 'Q4']).withMessage('象限必须是Q1/Q2/Q3/Q4'),
  ],
  validate,
  workPlanController.deleteTask
);

// ==================== AI分析 ====================

/**
 * @route   POST /api/v1/work-plans/ai/suggest
 * @desc    AI任务分类建议
 * @access  Private
 */
router.post('/ai/suggest',
  authenticate,
  [
    body('tasks').isArray().withMessage('任务列表必须是数组'),
    body('tasks.*.title').notEmpty().withMessage('任务标题不能为空'),
  ],
  validate,
  workPlanController.getAISuggestions
);

module.exports = router;
