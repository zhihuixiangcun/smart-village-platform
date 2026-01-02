/**
 * 内容审核控制器
 * 处理农业知识、朋友圈动态、公告、村务、财务等内容的审核流程
 */

const AgriculturePost = require('../models/AgriculturePost');
const SocialPost = require('../models/SocialPost');
const Announcement = require('../models/Announcement');
const logger = require('../utils/logger');

/**
 * 内容类型与模型映射
 */
const CONTENT_MODELS = {
  agriculture: AgriculturePost,
  social: SocialPost,
  announcement: Announcement,
  governance: Announcement, // 村务公开使用 Announcement 模型
  finance: require('../models/FinancialTransaction') // 财务公开
};

/**
 * 获取待审核列表
 */
const getPendingItems = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      villageId,
      keyword
    } = req.query;

    const pendingItems = [];
    const types = type ? [type] : ['agriculture', 'social', 'announcement', 'governance', 'finance'];

    // 并行查询各类型的待审核内容
    await Promise.all(types.map(async (contentType) => {
      try {
        const Model = CONTENT_MODELS[contentType];
        if (!Model) return;

        const query = { status: 'pending' };

        if (villageId) query.villageId = villageId;
        if (keyword) {
          query.$or = [
            { title: { $regex: keyword, $options: 'i' } },
            { content: { $regex: keyword, $options: 'i' } },
            { text: { $regex: keyword, $options: 'i' } }
          ];
        }

        const items = await Model.find(query)
          .populate('author', 'name avatar phone')
          .populate('villageId', 'name')
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit))
          .lean();

        items.forEach(item => {
          pendingItems.push({
            ...item,
            type: contentType
          });
        });
      } catch (error) {
        logger.error(`获取${contentType}待审核内容失败:`, error);
      }
    }));

    // 按创建时间排序
    pendingItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = pendingItems.length;

    res.json({
      success: true,
      data: pendingItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('获取待审核列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取待审核列表失败'
    });
  }
};

/**
 * 审核通过
 */
const approveContent = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { reviewedBy, reviewNote = '审核通过' } = req.body;
    const userId = req.user.id;

    const Model = CONTENT_MODELS[type];
    if (!Model) {
      return res.status(400).json({
        success: false,
        error: '不支持的内容类型'
      });
    }

    const content = await Model.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: '内容不存在'
      });
    }

    if (content.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '内容不是待审核状态'
      });
    }

    // 更新状态为已发布
    content.status = 'published';
    content.reviewedBy = userId;
    content.reviewNote = reviewNote;
    content.reviewedAt = new Date();
    await content.save();

    // 发送通知给作者
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.createNotification({
        recipient: content.author,
        type: 'content_approved',
        title: '内容审核通过',
        message: `您发布的${getTypeLabel(type)}已通过审核并发布`,
        relatedId: content._id,
        relatedType: type
      });
    } catch (notifError) {
      logger.error('发送审核通过通知失败:', notifError);
    }

    res.json({
      success: true,
      message: '审核通过',
      data: content
    });
  } catch (error) {
    logger.error('审核通过失败:', error);
    res.status(500).json({
      success: false,
      error: '审核通过失败'
    });
  }
};

/**
 * 审核拒绝
 */
const rejectContent = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { reason, reviewNote } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: '请提供拒绝原因'
      });
    }

    const Model = CONTENT_MODELS[type];
    if (!Model) {
      return res.status(400).json({
        success: false,
        error: '不支持的内容类型'
      });
    }

    const content = await Model.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        error: '内容不存在'
      });
    }

    if (content.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '内容不是待审核状态'
      });
    }

    // 更新状态为已拒绝
    content.status = 'rejected';
    content.rejectedReason = reason;
    content.reviewedBy = userId;
    content.reviewNote = reviewNote || reason;
    content.reviewedAt = new Date();
    await content.save();

    // 发送通知给作者
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.createNotification({
        recipient: content.author,
        type: 'content_rejected',
        title: '内容审核未通过',
        message: `您发布的${getTypeLabel(type)}未通过审核。原因：${reason}`,
        relatedId: content._id,
        relatedType: type
      });
    } catch (notifError) {
      logger.error('发送审核拒绝通知失败:', notifError);
    }

    res.json({
      success: true,
      message: '已拒绝该内容',
      data: content
    });
  } catch (error) {
    logger.error('审核拒绝失败:', error);
    res.status(500).json({
      success: false,
      error: '审核拒绝失败'
    });
  }
};

/**
 * 批量审核
 */
const batchReview = async (req, res) => {
  try {
    const { items } = req.body; // [{ type, id, action, reason }]
    const userId = req.user.id;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要审核的内容列表'
      });
    }

    const results = [];
    const errors = [];

    await Promise.all(items.map(async (item) => {
      try {
        const { type, id, action, reason } = item;

        const Model = CONTENT_MODELS[type];
        if (!Model) {
          errors.push({ item, error: '不支持的内容类型' });
          return;
        }

        const content = await Model.findById(id);
        if (!content) {
          errors.push({ item, error: '内容不存在' });
          return;
        }

        if (content.status !== 'pending') {
          errors.push({ item, error: '内容不是待审核状态' });
          return;
        }

        if (action === 'approve') {
          content.status = 'published';
          content.reviewNote = '批量审核通过';
        } else if (action === 'reject') {
          content.status = 'rejected';
          content.rejectedReason = reason || '批量审核拒绝';
          content.reviewNote = reason || '批量审核拒绝';
        } else {
          errors.push({ item, error: '无效的审核操作' });
          return;
        }

        content.reviewedBy = userId;
        content.reviewedAt = new Date();
        await content.save();

        results.push({ type, id, action, status: 'success' });

        // 发送通知
        try {
          const notificationService = require('../services/notificationService');
          await notificationService.createNotification({
            recipient: content.author,
            type: action === 'approve' ? 'content_approved' : 'content_rejected',
            title: action === 'approve' ? '内容审核通过' : '内容审核未通过',
            message: action === 'approve'
              ? `您发布的${getTypeLabel(type)}已通过审核并发布`
              : `您发布的${getTypeLabel(type)}未通过审核`,
            relatedId: content._id,
            relatedType: type
          });
        } catch (notifError) {
          logger.error('发送审核通知失败:', notifError);
        }
      } catch (error) {
        errors.push({ item, error: error.message });
      }
    }));

    res.json({
      success: true,
      message: `批量审核完成，成功${results.length}条，失败${errors.length}条`,
      data: {
        results,
        errors
      }
    });
  } catch (error) {
    logger.error('批量审核失败:', error);
    res.status(500).json({
      success: false,
      error: '批量审核失败'
    });
  }
};

/**
 * 获取审核统计
 */
const getReviewStats = async (req, res) => {
  try {
    const { villageId, startDate, endDate } = req.query;

    const baseQuery = {};
    if (villageId) baseQuery.villageId = villageId;
    if (startDate || endDate) {
      baseQuery.createdAt = {};
      if (startDate) baseQuery.createdAt.$gte = new Date(startDate);
      if (endDate) baseQuery.createdAt.$lte = new Date(endDate);
    }

    const types = ['agriculture', 'social', 'announcement', 'governance', 'finance'];
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      byType: {}
    };

    await Promise.all(types.map(async (type) => {
      try {
        const Model = CONTENT_MODELS[type];
        if (!Model) return;

        const [pending, approved, rejected] = await Promise.all([
          Model.countDocuments({ ...baseQuery, status: 'pending' }),
          Model.countDocuments({ ...baseQuery, status: 'published' }),
          Model.countDocuments({ ...baseQuery, status: 'rejected' })
        ]);

        const typeTotal = pending + approved + rejected;
        stats.byType[type] = {
          pending,
          approved,
          rejected,
          total: typeTotal
        };

        stats.total += typeTotal;
        stats.pending += pending;
        stats.approved += approved;
        stats.rejected += rejected;
      } catch (error) {
        logger.error(`获取${type}统计失败:`, error);
      }
    }));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取审核统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取审核统计失败'
    });
  }
};

/**
 * 获取审核历史
 */
const getReviewHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      villageId,
      reviewerId,
      action
    } = req.query;

    const query = { status: { $in: ['published', 'rejected'] } };

    if (villageId) query.villageId = villageId;
    if (reviewerId) query.reviewedBy = reviewerId;
    if (action === 'approved') query.status = 'published';
    if (action === 'rejected') query.status = 'rejected';

    const historyItems = [];
    const types = type ? [type] : ['agriculture', 'social', 'announcement', 'governance', 'finance'];

    await Promise.all(types.map(async (contentType) => {
      try {
        const Model = CONTENT_MODELS[contentType];
        if (!Model) return;

        const items = await Model.find(query)
          .populate('reviewedBy', 'name')
          .populate('author', 'name')
          .sort({ reviewedAt: -1 })
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit))
          .lean();

        items.forEach(item => {
          historyItems.push({
            ...item,
            type: contentType
          });
        });
      } catch (error) {
        logger.error(`获取${contentType}审核历史失败:`, error);
      }
    }));

    historyItems.sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt));

    res.json({
      success: true,
      data: historyItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: historyItems.length
      }
    });
  } catch (error) {
    logger.error('获取审核历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取审核历史失败'
    });
  }
};

/**
 * 获取内容类型标签
 */
function getTypeLabel(type) {
  const labels = {
    agriculture: '农业知识',
    social: '朋友圈动态',
    announcement: '公告',
    governance: '村务公开',
    finance: '财务公开'
  };
  return labels[type] || type;
}

module.exports = {
  getPendingItems,
  approveContent,
  rejectContent,
  batchReview,
  getReviewStats,
  getReviewHistory
};
