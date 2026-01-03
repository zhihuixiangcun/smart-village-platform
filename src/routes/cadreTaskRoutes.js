/**
 * 村干部四象限任务管理路由
 * 基于艾森豪威尔矩阵的任务优先级管理API
 */

const express = require('express');
const router = express.Router();
const cadreTaskController = require('../controllers/cadreTaskController');
const auth = require('../middleware/auth');

/**
 * 村干部任务管理路由配置
 * 所有路由都需要身份认证
 */

// 应用认证中间件到所有路由
router.use(auth.authenticate);

/**
 * @route   GET /api/v1/cadre-tasks
 * @desc    获取任务列表
 * @access  Private
 * @query   page - 页码（默认1）
 * @query   limit - 每页数量（默认20）
 * @query   status - 任务状态筛选
 * @query   category - 类别筛选
 * @query   quadrant - 象限筛选
 * @query   priority - 优先级筛选
 * @query   assignee - 负责人筛选
 * @query   search - 搜索关键词
 * @query   sortBy - 排序字段（默认createdAt）
 * @query   sortOrder - 排序方向（asc/desc，默认desc）
 */
router.get('/', cadreTaskController.getTasks);

/**
 * @route   GET /api/v1/cadre-tasks/quadrant/:quadrant
 * @desc    根据象限获取任务
 * @access  Private
 * @param   quadrant - 象限标识
 *          - urgent-important: 紧急且重要
 *          - important-not-urgent: 重要但不紧急
 *          - urgent-not-important: 紧急但不重要
 *          - not-urgent-not-important: 不紧急且不重要
 * @query   status - 任务状态筛选（可选）
 * @query   villageId - 村级ID（可选，默认使用用户的村庄）
 */
router.get('/quadrant/:quadrant', cadreTaskController.getQuadrantTasks);

/**
 * @route   GET /api/v1/cadre-tasks/my-tasks
 * @desc    获取我的任务
 * @access  Private
 * @desc    包括作为负责人、协作者或创建者的所有任务
 * @query   status - 任务状态筛选（可选）
 * @query   villageId - 村级ID（可选，默认使用用户的村庄）
 */
router.get('/my-tasks', cadreTaskController.getMyTasks);

/**
 * @route   GET /api/v1/cadre-tasks/statistics
 * @desc    获取任务统计信息
 * @access  Private
 * @query   villageId - 村级ID（可选，默认使用用户的村庄）
 * @query   startDate - 开始日期（可选）
 * @query   endDate - 结束日期（可选）
 * @return  包含以下统计信息：
 *          - 总体统计：总任务数、完成数、进行中、逾期、完成率
 *          - 按状态统计
 *          - 按象限统计
 *          - 按类别统计
 *          - 前10名负责人统计
 */
router.get('/statistics', cadreTaskController.getStatistics);

/**
 * @route   GET /api/v1/cadre-tasks/:id
 * @desc    获取单个任务详情
 * @access  Private
 * @param   id - 任务ID
 */
router.get('/:id', cadreTaskController.getTaskById);

/**
 * @route   POST /api/v1/cadre-tasks
 * @desc    创建新任务
 * @access  Private
 * @body    title - 任务标题（必填）
 * @body    description - 任务描述
 * @body    category - 类别（默认governance）
 * @body    quadrant - 象限（必填）
 * @body    priority - 优先级1-5（默认3）
 * @body    dueDate - 截止日期
 * @body    startDate - 开始日期
 * @body    estimatedHours - 预估工时
 * @body    assignee - 负责人ID（必填）
 * @body    collaborators - 协作者数组 [{user, role}]
 * @body    tags - 标签数组
 * @body    completionCriteria - 完成标准
 * @body    villageId - 村级ID
 */
router.post('/', cadreTaskController.createTask);

/**
 * @route   PUT /api/v1/cadre-tasks/:id
 * @desc    更新任务信息
 * @access  Private
 * @param   id - 任务ID
 * @body    可更新的字段：title, description, category, quadrant,
 *          priority, dueDate, startDate, estimatedHours,
 *          assignee, collaborators, tags, completionCriteria等
 */
router.put('/:id', cadreTaskController.updateTask);

/**
 * @route   PUT /api/v1/cadre-tasks/:id/status
 * @desc    更新任务状态
 * @access  Private
 * @param   id - 任务ID
 * @body    status - 状态值（pending/in-progress/completed/cancelled/on-hold）
 * @body    progress - 进度0-100
 * @body    actualHours - 实际工时
 */
router.put('/:id/status', cadreTaskController.updateTaskStatus);

/**
 * @route   POST /api/v1/cadre-tasks/:id/subtasks
 * @desc    添加子任务
 * @access  Private
 * @param   id - 任务ID
 * @body    title - 子任务标题（必填）
 * @body    dueDate - 子任务截止日期
 */
router.post('/:id/subtasks', cadreTaskController.addSubtask);

/**
 * @route   PUT /api/v1/cadre-tasks/:id/subtasks/:subtaskId/complete
 * @desc    完成/取消完成子任务
 * @access  Private
 * @param   id - 任务ID
 * @param   subtaskId - 子任务ID
 */
router.put('/:id/subtasks/:subtaskId/complete', cadreTaskController.completeSubtask);

/**
 * @route   POST /api/v1/cadre-tasks/:id/comments
 * @desc    添加任务评论
 * @access  Private
 * @param   id - 任务ID
 * @body    content - 评论内容（必填）
 */
router.post('/:id/comments', cadreTaskController.addComment);

/**
 * @route   DELETE /api/v1/cadre-tasks/:id
 * @desc    删除任务（软删除）
 * @access  Private
 * @param   id - 任务ID
 */
router.delete('/:id', cadreTaskController.deleteTask);

module.exports = router;
