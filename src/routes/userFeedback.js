/**
 * 用户反馈路由
 * 定义反馈管理的API端点
 */

const express = require('express')
const router = express.Router()
const UserFeedbackController = require('../controllers/userFeedbackController')

// 实例化控制器
const feedbackController = new UserFeedbackController()

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedback:
 *       type: object
 *       required:
 *         - category
 *         - title
 *         - description
 *       properties:
 *         feedbackId:
 *           type: string
 *           description: 反馈唯一标识
 *         category:
 *           type: string
 *           enum: [bug_report, feature_request, improvement, complaint, compliment, question, usage_difficulty]
 *           description: 反馈分类
 *         title:
 *           type: string
 *           maxLength: 100
 *           description: 反馈标题
 *         description:
 *           type: string
 *           maxLength: 2000
 *           description: 反馈描述
 *         severity:
 *           type: string
 *           enum: [low, medium, high, critical]
 *           description: 严重程度
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           description: 优先级
 *         status:
 *           type: string
 *           enum: [pending, in_review, in_progress, resolved, closed, rejected]
 *           description: 处理状态
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [image, video, file, screenshot]
 *               url:
 *                 type: string
 *               filename:
 *                 type: string
 *               size:
 *                 type: number
 *         satisfaction:
 *           type: object
 *           properties:
 *             rating:
 *               type: integer
 *               minimum: 1
 *               maximum: 5
 *             comment:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/feedback:
 *   post:
 *     summary: 提交用户反馈
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - title
 *               - description
 *             properties:
 *               category:
 *                 $ref: '#/components/schemas/Feedback/properties/category'
 *               title:
 *                 $ref: '#/components/schemas/Feedback/properties/title'
 *               description:
 *                 $ref: '#/components/schemas/Feedback/properties/description'
 *               severity:
 *                 $ref: '#/components/schemas/Feedback/properties/severity'
 *               priority:
 *                 $ref: '#/components/schemas/Feedback/properties/priority'
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               context:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: string
 *                   action:
 *                     type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: 反馈提交成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedbackId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     estimatedResponseTime:
 *                       type: string
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post(
  '/',
  UserFeedbackController.uploadMiddleware(),
  UserFeedbackController.validateFeedbackSubmission,
  feedbackController.submitFeedback
)

/**
 * @swagger
 * /api/v1/feedback:
 *   get:
 *     summary: 获取反馈列表
 *     tags: [Feedback]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: 用户ID（管理员可查看所有，普通用户只能查看自己的）
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 反馈分类筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 状态筛选
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: 优先级筛选
 *       - in: query
 *         name: assignedTeam
 *         schema:
 *           type: string
 *         description: 分配团队筛选
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 标签筛选（逗号分隔）
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *         description: 日期范围（JSON格式）
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
 *           default: 20
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedbacks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Feedback'
 *                     pagination:
 *                       type: object
 *       500:
 *         description: 服务器错误
 */
router.get('/', feedbackController.getFeedbackList)

/**
 * @swagger
 * /api/v1/feedback/categories/stats:
 *   get:
 *     summary: 获取反馈分类统计
 *     tags: [Feedback]
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       count:
 *                         type: integer
 *       500:
 *         description: 服务器错误
 */
router.get('/categories/stats', feedbackController.getCategoryStats)

/**
 * @swagger
 * /api/v1/feedback/stats:
 *   get:
 *     summary: 获取反馈统计数据
 *     tags: [Feedback]
 *     parameters:
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *         description: 日期范围（JSON格式）
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *         description: 团队筛选
 *     responses:
 *       200:
 *         description: 获取成功
 *       500:
 *         description: 服务器错误
 */
router.get('/stats',
  UserFeedbackController.requirePermission('feedback:stats'),
  feedbackController.getFeedbackStats
)

/**
 * @swagger
 * /api/v1/feedback/analyze/trends:
 *   get:
 *     summary: AI分析反馈趋势
 *     tags: [Feedback]
 *     responses:
 *       200:
 *         description: 分析成功
 *       500:
 *         description: 服务器错误
 */
router.get('/analyze/trends',
  UserFeedbackController.requirePermission('feedback:analyze'),
  feedbackController.analyzeFeedbackTrends
)

/**
 * @swagger
 * /api/v1/feedback/recommend/improvements:
 *   post:
 *     summary: 推荐改进方案
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - problemArea
 *             properties:
 *               problemArea:
 *                 type: string
 *                 description: 问题领域
 *     responses:
 *       200:
 *         description: 推荐成功
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/recommend/improvements',
  UserFeedbackController.requirePermission('feedback:recommend'),
  feedbackController.recommendImprovements
)

/**
 * @swagger
 * /api/v1/feedback/export:
 *   get:
 *     summary: 导出反馈数据
 *     tags: [Feedback]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, excel]
 *           default: json
 *         description: 导出格式
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *         description: 日期范围（JSON格式）
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: 分类筛选（逗号分隔）
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: 状态筛选（逗号分隔）
 *       - in: query
 *         name: includeAttachments
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含附件
 *     responses:
 *       200:
 *         description: 导出成功
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/export',
  UserFeedbackController.validateExportPermission,
  feedbackController.exportFeedbackData
)

/**
 * @swagger
 * /api/v1/feedback/batch:
 *   post:
 *     summary: 批量处理反馈
 *     tags: [Feedback]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feedbackIds
 *               - processAction
 *             properties:
 *               feedbackIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 反馈ID列表
 *               processAction:
 *                 type: string
 *                 enum: [assign, update_status]
 *                 description: 处理动作
 *               processData:
 *                 type: object
 *                 description: 处理数据
 *     responses:
 *       200:
 *         description: 处理成功
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.post('/batch',
  UserFeedbackController.validateProcessPermission,
  feedbackController.batchProcessFeedback
)

/**
 * @swagger
 * /api/v1/feedback/{feedbackId}:
 *   get:
 *     summary: 获取反馈详情
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: 反馈ID
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Feedback'
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 反馈不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:feedbackId', feedbackController.getFeedbackDetail)

/**
 * @swagger
 * /api/v1/feedback/{feedbackId}:
 *   put:
 *     summary: 处理反馈
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: 反馈ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 $ref: '#/components/schemas/Feedback/properties/status'
 *               assignedTo:
 *                 type: string
 *                 description: 分配给谁
 *               assignedTeam:
 *                 type: string
 *                 description: 分配团队
 *               response:
 *                 type: string
 *                 description: 处理回复
 *               isInternal:
 *                 type: boolean
 *                 default: false
 *                 description: 是否为内部处理记录
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 处理成功
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.put('/:feedbackId',
  UserFeedbackController.validateProcessPermission,
  feedbackController.processFeedback
)

/**
 * @swagger
 * /api/v1/feedback/{feedbackId}/satisfaction:
 *   post:
 *     summary: 添加满意度评价
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: feedbackId
 *         required: true
 *         schema:
 *           type: string
 *         description: 反馈ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: 评分（1-5）
 *               comment:
 *                 type: string
 *                 description: 评价评论
 *     responses:
 *       200:
 *         description: 评价成功
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/:feedbackId/satisfaction', feedbackController.addSatisfactionRating)

/**
 * @swagger
 * /api/v1/feedback/user/{userId}:
 *   get:
 *     summary: 获取用户反馈历史
 *     tags: [Feedback]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
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
 *     responses:
 *       200:
 *         description: 获取成功
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/user/:userId', feedbackController.getUserFeedbackHistory)

module.exports = router