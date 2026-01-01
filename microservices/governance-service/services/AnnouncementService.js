/**
 * 公告服务
 * 提供公告管理、发布、审核、推送等功能
 */

const Announcement = require('../models/Announcement');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const MessageQueueManager = require('../../../src/messaging/MessageQueueManager');

class AnnouncementService {
  constructor() {
    this.messageQueue = null;
    this.initMessageQueue();
  }

  async initMessageQueue() {
    try {
      this.messageQueue = new MessageQueueManager();
      await this.messageQueue.initialize();
    } catch (error) {
      logger.error('初始化消息队列失败:', error);
    }
  }

  /**
   * 创建公告
   */
  async createAnnouncement(announcementData, creatorId) {
    try {
      // 验证输入数据
      const errors = validationResult(announcementData);
      if (!errors.isEmpty()) {
        throw new Error('数据验证失败: ' + errors.array().map(err => err.msg).join(', '));
      }

      // 设置发布者信息
      announcementData.publisher = {
        userId: creatorId,
        ...announcementData.publisher
      };

      // 根据类型设置默认值
      if (announcementData.type === '紧急公告') {
        announcementData.priority = '紧急';
      }

      const announcement = new Announcement(announcementData);
      await announcement.save();

      // 发送创建事件
      await this.sendEvent('announcement.created', {
        announcementId: announcement._id,
        title: announcement.title,
        type: announcement.type,
        category: announcement.category,
        creator: creatorId
      });

      logger.info('公告创建成功:', announcement._id);
      return announcement;
    } catch (error) {
      logger.error('创建公告失败:', error);
      throw error;
    }
  }

  /**
   * 发布公告
   */
  async publishAnnouncement(announcementId, publisherId) {
    try {
      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        throw new Error('公告不存在');
      }

      // 检查权限
      if (announcement.publisher.userId.toString() !== publisherId.toString()) {
        // 这里应该添加权限检查逻辑
        throw new Error('无权限发布此公告');
      }

      // 检查状态
      if (announcement.status !== '草稿' && announcement.status !== '待审核') {
        throw new Error('公告状态不允许发布');
      }

      announcement.publish(publisherId);

      // 发送发布通知
      await this.sendNotification('announcement_published', {
        title: announcement.title,
        content: announcement.summary || announcement.content.substring(0, 100),
        targetAudience: announcement.targetAudience,
        targetGroups: announcement.targetGroups,
        announcementId: announcement._id
      });

      // 安排语音播报
      if (announcement.voiceBroadcast.enabled) {
        await this.scheduleVoiceBroadcast(announcement);
      }

      logger.info('公告发布成功:', announcementId);
      return announcement;
    } catch (error) {
      logger.error('发布公告失败:', error);
      throw error;
    }
  }

  /**
   * 获取公告列表
   */
  async getAnnouncements(queryOptions = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        status = '已发布',
        targetAudience,
        keyword,
        sortBy = 'publishDate',
        sortOrder = -1
      } = queryOptions;

      const filter = {};

      if (category) filter.category = category;
      if (status) filter.status = status;
      if (targetAudience) filter.targetAudience = targetAudience;
      if (keyword) {
        filter.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { content: { $regex: keyword, $options: 'i' } }
        ];
      }

      // 只显示有效期的公告
      const now = new Date();
      filter.$and = [
        { effectiveDate: { $lte: now } },
        { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] }
      ];

      const announcements = await Announcement.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('publisher.userId', 'name avatar')
        .lean();

      const total = await Announcement.countDocuments(filter);

      return {
        announcements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取公告列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取公告详情
   */
  async getAnnouncementById(announcementId, userId) {
    try {
      const announcement = await Announcement.findById(announcementId)
        .populate('publisher.userId', 'name avatar position')
        .populate('comments.userId', 'name avatar')
        .populate('reviewProcess.reviewerId', 'name position');

      if (!announcement) {
        throw new Error('公告不存在');
      }

      // 增加浏览量
      if (userId) {
        await announcement.incrementView(userId);
      }

      return announcement;
    } catch (error) {
      logger.error('获取公告详情失败:', error);
      throw error;
    }
  }

  /**
   * 添加评论
   */
  async addComment(announcementId, userId, userName, content, parentId = null) {
    try {
      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        throw new Error('公告不存在');
      }

      // 检查公告是否允许评论
      if (announcement.status !== '已发布') {
        throw new Error('公告未发布，无法评论');
      }

      const comment = await announcement.addComment(userId, userName, content, parentId);

      // 发送评论通知
      await this.sendNotification('announcement_commented', {
        announcementId: announcement._id,
        announcementTitle: announcement.title,
        commenter: userName,
        comment: content,
        publisher: announcement.publisher.userId
      });

      logger.info('评论添加成功:', announcementId, userId);
      return comment;
    } catch (error) {
      logger.error('添加评论失败:', error);
      throw error;
    }
  }

  /**
   * 点赞评论
   */
  async likeComment(announcementId, commentId, userId) {
    try {
      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        throw new Error('公告不存在');
      }

      const comment = announcement.comments.id(commentId);
      if (!comment) {
        throw new Error('评论不存在');
      }

      // 切换点赞状态
      const likeIndex = comment.likes.indexOf(userId);
      if (likeIndex === -1) {
        comment.likes.push(userId);
      } else {
        comment.likes.splice(likeIndex, 1);
      }

      await announcement.save();

      return { liked: likeIndex === -1, likes: comment.likes.length };
    } catch (error) {
      logger.error('点赞评论失败:', error);
      throw error;
    }
  }

  /**
   * 撤回公告
   */
  async retractAnnouncement(announcementId, operatorId, reason = '') {
    try {
      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        throw new Error('公告不存在');
      }

      // 检查权限
      if (announcement.publisher.userId.toString() !== operatorId.toString()) {
        throw new Error('无权限撤回此公告');
      }

      announcement.status = '已撤回';

      // 添加撤回记录
      announcement.reviewProcess.push({
        reviewerId: operatorId,
        action: '撤回',
        comment: reason,
        timestamp: new Date()
      });

      await announcement.save();

      // 发送撤回通知
      await this.sendNotification('announcement_retracted', {
        announcementId: announcement._id,
        title: announcement.title,
        reason: reason
      });

      logger.info('公告撤回成功:', announcementId);
      return announcement;
    } catch (error) {
      logger.error('撤回公告失败:', error);
      throw error;
    }
  }

  /**
   * 获取公告统计
   */
  async getAnnouncementStats(queryOptions = {}) {
    try {
      const { startDate, endDate, category, publisherId } = queryOptions;

      const matchStage = { status: '已发布' };

      if (startDate || endDate) {
        matchStage.publishDate = {};
        if (startDate) matchStage.publishDate.$gte = new Date(startDate);
        if (endDate) matchStage.publishDate.$lte = new Date(endDate);
      }

      if (category) matchStage.category = category;
      if (publisherId) matchStage['publisher.userId'] = publisherId;

      const stats = await Announcement.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              category: '$category',
              type: '$type',
              priority: '$priority'
            },
            count: { $sum: 1 },
            totalViews: { $sum: '$metrics.views' },
            totalLikes: { $sum: '$metrics.likes' },
            totalShares: { $sum: '$metrics.shares' },
            avgReadRate: { $avg: { $multiply: [{ $divide: [{ $size: '$metrics.readReceipts' }, '$metrics.views'] }, 100] } }
          }
        },
        {
          $group: {
            _id: '$_id.category',
            types: {
              $push: {
                type: '$_id.type',
                count: '$count',
                views: '$totalViews',
                likes: '$totalLikes'
              }
            },
            totalCount: { $sum: '$count' },
            totalViews: { $sum: '$totalViews' },
            totalLikes: { $sum: '$totalLikes' },
            totalShares: { $sum: '$totalShares' }
          }
        }
      ]);

      return stats;
    } catch (error) {
      logger.error('获取公告统计失败:', error);
      throw error;
    }
  }

  /**
   * 搜索公告
   */
  async searchAnnouncements(searchOptions) {
    try {
      const {
        keyword,
        categories,
        types,
        targetAudience,
        dateRange,
        page = 1,
        limit = 20
      } = searchOptions;

      const filter = { status: '已发布' };

      // 关键词搜索
      if (keyword) {
        filter.$text = { $search: keyword };
      }

      // 分类过滤
      if (categories && categories.length > 0) {
        filter.category = { $in: categories };
      }

      // 类型过滤
      if (types && types.length > 0) {
        filter.type = { $in: types };
      }

      // 目标受众过滤
      if (targetAudience) {
        filter.targetAudience = targetAudience;
      }

      // 日期范围过滤
      if (dateRange) {
        filter.publishDate = {};
        if (dateRange.start) filter.publishDate.$gte = new Date(dateRange.start);
        if (dateRange.end) filter.publishDate.$lte = new Date(dateRange.end);
      }

      // 只显示有效期的公告
      const now = new Date();
      filter.$and = [
        { effectiveDate: { $lte: now } },
        { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] }
      ];

      const announcements = await Announcement.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, publishDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('publisher.userId', 'name avatar')
        .lean();

      const total = await Announcement.countDocuments(filter);

      return {
        announcements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('搜索公告失败:', error);
      throw error;
    }
  }

  /**
   * 发送事件消息
   */
  async sendEvent(eventType, eventData) {
    try {
      if (this.messageQueue) {
        await this.messageQueue.sendMessage('village_events', {
          event_type: eventType,
          data: eventData,
          timestamp: new Date(),
          source: 'governance-service'
        });
      }
    } catch (error) {
      logger.error('发送事件消息失败:', error);
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(type, data) {
    try {
      if (this.messageQueue) {
        await this.messageQueue.sendMessage('notifications', {
          type,
          data,
          timestamp: new Date(),
          source: 'governance-service'
        });
      }
    } catch (error) {
      logger.error('发送通知失败:', error);
    }
  }

  /**
   * 安排语音播报
   */
  async scheduleVoiceBroadcast(announcement) {
    try {
      if (!announcement.voiceBroadcast.enabled) return;

      const broadcastTimes = announcement.voiceBroadcast.broadcastTimes
        .filter(bt => bt.enabled);

      for (const broadcastTime of broadcastTimes) {
        // 这里应该集成语音播报服务
        await this.messageQueue.sendMessage('tasks', {
          taskType: 'voice_broadcast',
          data: {
            announcementId: announcement._id,
            audioText: announcement.voiceBroadcast.audioText || announcement.content,
            targetGroups: announcement.voiceBroadcast.targetGroups,
            broadcastTime: broadcastTime.time,
            repeat: broadcastTime.repeat
          },
          scheduledAt: this.getNextBroadcastTime(broadcastTime.time)
        });
      }
    } catch (error) {
      logger.error('安排语音播报失败:', error);
    }
  }

  /**
   * 获取下次播报时间
   */
  getNextBroadcastTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    let broadcastTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // 如果今天的时间已过，则安排到明天
    if (broadcastTime <= now) {
      broadcastTime.setDate(broadcastTime.getDate() + 1);
    }

    return broadcastTime;
  }
}

module.exports = AnnouncementService;