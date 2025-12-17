/**
 * 村务协同平台API路由
 * 提供在线讨论、任务调度等协同功能的RESTful接口
 */

const express = require('express');
const router = express.Router();
const { VillageDiscussion, VillageTask } = require('../models/VillageCollaboration');
const VillageCollaborationService = require('../services/villageCollaborationService');
const { authenticate, authorize } = require('../middleware/auth');
const { validateDiscussion, validateTask } = require('../middleware/validation');
const upload = require('../middleware/upload');
const logger = require('../config/logger');

const collaborationService = new VillageCollaborationService();

/**
 * @route   POST /api/v1/collaboration/discussions
 * @desc    创建村务讨论
 * @access  Private
 */
router.post('/discussions', authenticate, validateDiscussion, async (req, res) => {
  try {
    const discussionData = {
      ...req.body,
      initiator: {
        userId: req.user._id,
        userName: req.user.profile.displayName,
        userRole: req.user.role,
        avatar: req.user.profile.avatar
      }
    };

    const result = await collaborationService.createDiscussion(
      discussionData,
      {
        operatorId: req.user._id,
        ipAddress: req.ip
      }
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.discussion
    });

  } catch (error) {
    logger.error('创建讨论失败:', error);
    res.status(500).json({
      success: false,
      message: '创建讨论失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/collaboration/discussions
 * @desc    获取讨论列表
 * @access  Private
 */
router.get('/discussions', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      villageId,
      type,
      status = 'active',
      sortBy = 'recent',
      search,
      tags
    } = req.query;

    // 构建过滤条件
    const filters = { status };

    if (villageId) {
      // 权限检查
      if (req.user.role !== 'super_admin' && req.user.village.villageId !== villageId) {
        return res.status(403).json({
          success: false,
          message: '无权访问该村庄的讨论'
        });
      }
      filters.villageId = villageId;
    } else {
      // 默认只显示用户所在村庄的讨论
      filters.villageId = req.user.village.villageId;
    }

    if (type) {
      filters.type = type;
    }

    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filters.tags = { $in: tagArray };
    }

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await collaborationService.getDiscussions(
      filters.villageId,
      filters,
      pagination
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取讨论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取讨论列表失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/collaboration/discussions/:id
 * @desc    获取讨论详情
 * @access  Private
 */
router.get('/discussions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const discussion = await VillageDiscussion.findById(id)
      .populate('initiator.userId', 'userName avatar')
      .populate('participants.userId', 'userName avatar')
      .populate('replies.author.userId', 'userName avatar');

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: '讨论不存在'
      });
    }

    // 权限检查
    if (req.user.role !== 'super_admin' && discussion.villageId !== req.user.village.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该讨论'
      });
    }

    // 增加浏览次数
    discussion.statistics.viewCount += 1;
    await discussion.save();

    res.json({
      success: true,
      data: {
        discussion
      }
    });

  } catch (error) {
    logger.error('获取讨论详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取讨论详情失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/collaboration/discussions/:id/replies
 * @desc    回复讨论
 * @access  Private
 */
router.post('/discussions/:id/replies', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentReply } = req.body;

    const attachments = req.files ? req.files.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'image' : 'document',
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      size: file.size
    })) : [];

    const replyData = {
      content,
      author: {
        userId: req.user._id,
        userName: req.user.profile.displayName,
        avatar: req.user.profile.avatar
      },
      attachments,
      parentReply: parentReply || null
    };

    const result = await collaborationService.replyToDiscussion(
      id,
      replyData,
      {
        operatorId: req.user._id,
        ipAddress: req.ip
      }
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.reply
    });

  } catch (error) {
    logger.error('回复讨论失败:', error);
    res.status(500).json({
      success: false,
      message: '回复讨论失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/collaboration/discussions/:id/vote
 * @desc    讨论投票
 * @access  Private
 */
router.post('/discussions/:id/vote', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex } = req.body;

    const discussion = await VillageDiscussion.findById(id);

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: '讨论不存在'
      });
    }

    // 检查投票是否开启
    if (!discussion.voting.enabled) {
      return res.status(400).json({
        success: false,
        message: '该讨论未开启投票'
      });
    }

    // 检查投票是否已过期
    if (new Date() > discussion.voting.deadline) {
      return res.status(400).json({
        success: false,
        message: '投票已过期'
      });
    }

    // 检查选项索引
    if (optionIndex < 0 || optionIndex >= discussion.voting.options.length) {
      return res.status(400).json({
        success: false,
        message: '无效的投票选项'
      });
    }

    // 检查是否已投票
    const hasVoted = discussion.voting.options.some(option =>
      option.voters.some(voter => voter.userId.toString() === req.user._id.toString())
    );

    if (hasVoted && !discussion.voting.allowMultipleChoice) {
      return res.status(400).json({
        success: false,
        message: '您已经投过票了'
      });
    }

    // 添加投票
    discussion.voting.options[optionIndex].votes += 1;
    discussion.voting.options[optionIndex].voters.push({
      userId: req.user._id,
      votedAt: new Date()
    });

    await discussion.save();

    res.json({
      success: true,
      message: '投票成功',
      data: {
        totalVotes: discussion.voting.options.reduce((sum, option) => sum + option.votes, 0),
        votes: discussion.voting.options
      }
    });

  } catch (error) {
    logger.error('投票失败:', error);
    res.status(500).json({
      success: false,
      message: '投票失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/collaboration/tasks
 * @desc    创建村务任务
 * @access  Private
 */
router.post('/tasks', authenticate, validateTask, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      creator: {
        userId: req.user._id,
        userName: req.user.profile.displayName,
        department: req.user.professional.department,
        position: req.user.professional.position
      }
    };

    const result = await collaborationService.createTask(
      taskData,
      {
        operatorId: req.user._id,
        ipAddress: req.ip
      }
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.task
    });

  } catch (error) {
    logger.error('创建任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建任务失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/collaboration/tasks
 * @desc    获取任务列表
 * @access  Private
 */
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      villageId,
      status,
      type,
      priority,
      assignee,
      sortBy = 'created',
      search
    } = req.query;

    // 构建过滤条件
    const filters = {};

    if (villageId) {
      // 权限检查
      if (req.user.role !== 'super_admin' && req.user.village.villageId !== villageId) {
        return res.status(403).json({
          success: false,
          message: '无权访问该村庄的任务'
        });
      }
      filters.villageId = villageId;
    } else {
      // 默认只显示用户所在村庄的任务
      filters.villageId = req.user.village.villageId;
    }

    if (status) {
      filters.status = status;
    }

    if (type) {
      filters.type = type;
    }

    if (priority) {
      filters.priority = priority;
    }

    if (assignee) {
      filters['assignees.userId'] = assignee;
    }

    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy
    };

    const result = await collaborationService.getTasks(
      filters.villageId,
      filters,
      pagination
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/collaboration/tasks/my-tasks
 * @desc    获取我的待办任务
 * @access  Private
 */
router.get('/tasks/my-tasks', authenticate, async (req, res) => {
  try {
    const {
      status,
      priority,
      type,
      sortBy = 'priority'
    } = req.query;

    const filters = {};

    if (status) {
      filters.status = status;
    }

    if (priority) {
      filters.priority = priority;
    }

    if (type) {
      filters.type = type;
    }

    const result = await collaborationService.getMyTasks(
      req.user._id,
      filters
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('获取我的任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的任务失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/collaboration/tasks/:id
 * @desc    获取任务详情
 * @access  Private
 */
router.get('/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await VillageTask.findById(id)
      .populate('creator.userId', 'userName avatar')
      .populate('assignees.userId', 'userName avatar')
      .populate('collaborators.userId', 'userName avatar')
      .populate('updates.author.userId', 'userName avatar');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    // 权限检查
    if (req.user.role !== 'super_admin' && task.villageId !== req.user.village.villageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该任务'
      });
    }

    // 检查用户是否是相关人员
    const isRelated = task.creator.userId.toString() === req.user._id.toString() ||
      task.assignees.some(a => a.userId.toString() === req.user._id.toString()) ||
      task.collaborators.some(c => c.userId.toString() === req.user._id.toString());

    if (!isRelated && req.user.role === 'villager') {
      return res.status(403).json({
        success: false,
        message: '无权访问该任务'
      });
    }

    res.json({
      success: true,
      data: {
        task
      }
    });

  } catch (error) {
    logger.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务详情失败',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/v1/collaboration/tasks/:id/status
 * @desc    更新任务状态
 * @access  Private
 */
router.put('/tasks/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completion } = req.body;

    const updateData = {
      author: {
        userId: req.user._id,
        userName: req.user.profile.displayName,
        avatar: req.user.profile.avatar
      },
      completion
    };

    const result = await collaborationService.updateTaskStatus(
      id,
      status,
      updateData,
      {
        operatorId: req.user._id
      }
    );

    res.json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    logger.error('更新任务状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新任务状态失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/collaboration/tasks/:id/updates
 * @desc    添加任务更新
 * @access  Private
 */
router.post('/tasks/:id/updates', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, content, progress, milestoneIndex } = req.body;

    const attachments = req.files ? req.files.map(file => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      type: file.mimetype.startsWith('image/') ? 'image' : 'document'
    })) : [];

    const updateData = {
      type,
      content,
      author: {
        userId: req.user._id,
        userName: req.user.profile.displayName,
        avatar: req.user.profile.avatar
      },
      attachments,
      progress: progress ? parseInt(progress) : undefined,
      milestoneIndex: milestoneIndex ? parseInt(milestoneIndex) : undefined
    };

    const result = await collaborationService.addTaskUpdate(
      id,
      updateData,
      {
        operatorId: req.user._id
      }
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: result
    });

  } catch (error) {
    logger.error('添加任务更新失败:', error);
    res.status(500).json({
      success: false,
      message: '添加任务更新失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/collaboration/statistics
 * @desc    获取协同平台统计信息
 * @access  Private
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const { villageId } = req.query;

    // 权限检查
    if (villageId && req.user.role !== 'super_admin' && req.user.village.villageId !== villageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该村庄的统计信息'
      });
    }

    const targetVillageId = villageId || req.user.village.villageId;

    // 获取讨论统计
    const discussionStats = await VillageDiscussion.aggregate([
      { $match: { villageId: targetVillageId } },
      {
        $group: {
          _id: null,
          totalDiscussions: { $sum: 1 },
          activeDiscussions: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalReplies: { $sum: '$statistics.replyCount' },
          totalViews: { $sum: '$statistics.viewCount' }
        }
      }
    ]);

    // 获取任务统计
    const taskStats = await VillageTask.aggregate([
      { $match: { villageId: targetVillageId } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'completed'] },
                    { $lt: ['$schedule.endDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 按类型统计
    const tasksByType = await VillageTask.aggregate([
      { $match: { villageId: targetVillageId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const statistics = {
      discussions: discussionStats[0] || {
        totalDiscussions: 0,
        activeDiscussions: 0,
        totalReplies: 0,
        totalViews: 0
      },
      tasks: taskStats[0] || {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0
      },
      tasksByType,
      completionRate: taskStats[0] ?
        Math.round((taskStats[0].completedTasks / taskStats[0].totalTasks) * 100) : 0
    };

    res.json({
      success: true,
      data: {
        statistics,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/collaboration/hot-discussions
 * @desc    获取热门讨论
 * @access  Private
 */
router.get('/hot-discussions', authenticate, async (req, res) => {
  try {
    const { villageId, limit = 10 } = req.query;

    // 权限检查
    const targetVillageId = villageId || req.user.village.villageId;

    if (req.user.role !== 'super_admin' && req.user.village.villageId !== targetVillageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该村庄的热门讨论'
      });
    }

    const hotDiscussions = await VillageDiscussion.getHotDiscussions(
      targetVillageId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        discussions: hotDiscussions,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('获取热门讨论失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门讨论失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/v1/collaboration/pending-tasks
 * @desc    获取待处理任务
 * @access  Private
 */
router.get('/pending-tasks', authenticate, async (req, res) => {
  try {
    const { villageId, limit = 20 } = req.query;

    // 权限检查
    const targetVillageId = villageId || req.user.village.villageId;

    if (req.user.role !== 'super_admin' && req.user.village.villageId !== targetVillageId) {
      return res.status(403).json({
        success: false,
        message: '无权访问该村庄的待处理任务'
      });
    }

    const pendingTasks = await VillageTask.getPendingTasks(
      targetVillageId,
      req.user._id
    );

    res.json({
      success: true,
      data: {
        tasks: pendingTasks.slice(0, parseInt(limit)),
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('获取待处理任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取待处理任务失败',
      error: error.message
    });
  }
});

module.exports = router;