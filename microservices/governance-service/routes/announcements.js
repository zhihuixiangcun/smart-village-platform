/**
 * 公告路由
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const AnnouncementService = require('../services/AnnouncementService');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const announcementService = new AnnouncementService();

// 创建公告
router.post('/',
  auth,
  [
    body('title').notEmpty().withMessage('标题不能为空'),
    body('content').notEmpty().withMessage('内容不能为空'),
    body('category').isIn(['政策宣传', '村务通知', '会议通知', '活动公告', '紧急通知', '财务公开', '项目公示', '其他']).withMessage('分类无效'),
    body('type').isIn(['普通公告', '重要公告', '紧急公告', '政策文件']).withMessage('类型无效'),
    body('targetAudience').optional().isIn(['全体村民', '党员', '村干部', '特定群体', '外部访问者']),
    body('priority').optional().isIn(['低', '中', '高', '紧急']),
    body('effectiveDate').optional().isISO8601().withMessage('生效日期格式错误'),
    body('expiryDate').optional().isISO8601().withMessage('过期日期格式错误')
  ],
  validate,
  async (req, res) => {
    try {
      const announcement = await announcementService.createAnnouncement(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: announcement,
        message: '公告创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 发布公告
router.post('/:id/publish',
  auth,
  param('id').isMongoId().withMessage('ID格式错误'),
  validate,
  async (req, res) => {
    try {
      const announcement = await announcementService.publishAnnouncement(req.params.id, req.user.id);
      res.json({
        success: true,
        data: announcement,
        message: '公告发布成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取公告列表
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('category').optional().isIn(['政策宣传', '村务通知', '会议通知', '活动公告', '紧急通知', '财务公开', '项目公示', '其他']),
    query('status').optional().isIn(['草稿', '待审核', '已发布', '已过期', '已撤回']),
    query('targetAudience').optional().isIn(['全体村民', '党员', '村干部', '特定群体', '外部访问者']),
    query('keyword').optional().isLength({ min: 1, max: 50 }).withMessage('关键词长度必须在1-50字符之间'),
    query('sortBy').optional().isIn(['publishDate', 'title', 'priority', 'views']),
    query('sortOrder').optional().isIn(['1', '-1'])
  ],
  validate,
  async (req, res) => {
    try {
      const result = await announcementService.getAnnouncements(req.query);
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

// 搜索公告
router.post('/search',
  [
    body('keyword').optional().isLength({ min: 1, max: 50 }),
    body('categories').optional().isArray(),
    body('types').optional().isArray(),
    body('targetAudience').optional().isString(),
    body('dateRange').optional().isObject(),
    body('page').optional().isInt({ min: 1 }),
    body('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  async (req, res) => {
    try {
      const result = await announcementService.searchAnnouncements(req.body);
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

// 获取公告详情
router.get('/:id',
  param('id').isMongoId().withMessage('ID格式错误'),
  validate,
  async (req, res) => {
    try {
      const announcement = await announcementService.getAnnouncementById(req.params.id, req.user?.id);
      res.json({
        success: true,
        data: announcement
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 添加评论
router.post('/:id/comments',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('content').notEmpty().withMessage('评论内容不能为空').isLength({ max: 1000 }).withMessage('评论内容不能超过1000字符'),
    body('parentId').optional().isMongoId().withMessage('父评论ID格式错误')
  ],
  validate,
  async (req, res) => {
    try {
      const comment = await announcementService.addComment(
        req.params.id,
        req.user.id,
        req.user.name,
        req.body.content,
        req.body.parentId
      );
      res.status(201).json({
        success: true,
        data: comment,
        message: '评论添加成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 点赞评论
router.post('/:id/comments/:commentId/like',
  auth,
  [
    param('id').isMongoId().withMessage('公告ID格式错误'),
    param('commentId').isMongoId().withMessage('评论ID格式错误')
  ],
  validate,
  async (req, res) => {
    try {
      const result = await announcementService.likeComment(req.params.id, req.params.commentId, req.user.id);
      res.json({
        success: true,
        data: result,
        message: result.liked ? '点赞成功' : '取消点赞成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 撤回公告
router.post('/:id/retract',
  auth,
  [
    param('id').isMongoId().withMessage('ID格式错误'),
    body('reason').optional().isLength({ max: 200 }).withMessage('撤回原因不能超过200字符')
  ],
  validate,
  async (req, res) => {
    try {
      const announcement = await announcementService.retractAnnouncement(
        req.params.id,
        req.user.id,
        req.body.reason
      );
      res.json({
        success: true,
        data: announcement,
        message: '公告撤回成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
);

// 获取公告统计
router.get('/stats/summary',
  [
    query('startDate').optional().isISO8601().withMessage('开始日期格式错误'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式错误'),
    query('category').optional().isString(),
    query('publisherId').optional().isMongoId().withMessage('发布者ID格式错误')
  ],
  validate,
  async (req, res) => {
    try {
      const stats = await announcementService.getAnnouncementStats(req.query);
      res.json({
        success: true,
        data: stats
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