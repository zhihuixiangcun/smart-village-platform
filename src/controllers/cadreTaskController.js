/**
 * 村干部四象限任务管理控制器
 * 基于艾森豪威尔矩阵的任务优先级管理系统
 */

const CadreTask = require('../models/CadreTask');
const User = require('../models/User');
const logger = require('../utils/logger');

class CadreTaskController {
  /**
   * 获取任务列表
   * 支持分页、筛选和排序
   */
  async getTasks(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        quadrant,
        priority,
        assignee,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // 构建查询条件
      const query = { isDeleted: false };

      // 村级权限过滤
      if (req.user.villageId) {
        query.villageId = req.user.villageId;
      }

      // 状态筛选
      if (status) {
        query.status = status;
      }

      // 类别筛选
      if (category) {
        query.category = category;
      }

      // 象限筛选
      if (quadrant) {
        query.quadrant = quadrant;
      }

      // 优先级筛选
      if (priority) {
        query.priority = parseInt(priority);
      }

      // 负责人筛选
      if (assignee) {
        query.assignee = assignee;
      }

      // 搜索功能
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      // 排序
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // 分页查询
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [tasks, total] = await Promise.all([
        CadreTask.find(query)
          .populate('assignee', 'username profile.nickName profile.avatar')
          .populate('createdBy', 'username profile.nickName')
          .populate('collaborators.user', 'username profile.nickName')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        CadreTask.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });

    } catch (error) {
      logger.error('获取任务列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取任务列表失败',
        message: error.message
      });
    }
  }

  /**
   * 根据象限获取任务
   * 艾森豪威尔矩阵的四个象限
   */
  async getQuadrantTasks(req, res) {
    try {
      const { quadrant } = req.params;
      const { status, villageId } = req.query;

      // 验证象限参数
      const validQuadrants = [
        'urgent-important',
        'important-not-urgent',
        'urgent-not-important',
        'not-urgent-not-important'
      ];

      if (!validQuadrants.includes(quadrant)) {
        return res.status(400).json({
          success: false,
          error: '无效的象限参数',
          message: '象限必须是以下之一: urgent-important, important-not-urgent, urgent-not-important, not-urgent-not-important'
        });
      }

      // 确定村级ID
      const targetVillageId = villageId || req.user.villageId;
      if (!targetVillageId) {
        return res.status(400).json({
          success: false,
          error: '缺少村级ID',
          message: '请指定村级ID或确保用户已关联到村庄'
        });
      }

      // 构建查询选项
      const options = {};
      if (status) {
        options.status = status;
      }

      // 使用模型的静态方法
      const tasks = await CadreTask.getTasksByQuadrant(targetVillageId, quadrant, options);

      res.json({
        success: true,
        data: tasks,
        quadrant,
        count: tasks.length
      });

    } catch (error) {
      logger.error('获取象限任务失败:', error);
      res.status(500).json({
        success: false,
        error: '获取象限任务失败',
        message: error.message
      });
    }
  }

  /**
   * 获取我的任务
   * 包括作为负责人、协作者或创建者的任务
   */
  async getMyTasks(req, res) {
    try {
      const { status, villageId } = req.query;

      // 确定村级ID
      const targetVillageId = villageId || req.user.villageId;
      if (!targetVillageId) {
        return res.status(400).json({
          success: false,
          error: '缺少村级ID',
          message: '请指定村级ID或确保用户已关联到村庄'
        });
      }

      // 构建查询选项
      const options = {};
      if (status) {
        options.status = status;
      }

      // 使用模型的静态方法
      const tasks = await CadreTask.getMyTasks(req.user._id, targetVillageId, options);

      // 按象限分组
      const groupedTasks = {
        'urgent-important': [],
        'important-not-urgent': [],
        'urgent-not-important': [],
        'not-urgent-not-important': []
      };

      tasks.forEach(task => {
        if (groupedTasks[task.quadrant]) {
          groupedTasks[task.quadrant].push(task);
        }
      });

      res.json({
        success: true,
        data: tasks,
        grouped: groupedTasks,
        total: tasks.length
      });

    } catch (error) {
      logger.error('获取我的任务失败:', error);
      res.status(500).json({
        success: false,
        error: '获取我的任务失败',
        message: error.message
      });
    }
  }

  /**
   * 获取单个任务详情
   */
  async getTaskById(req, res) {
    try {
      const { id } = req.params;

      const task = await CadreTask.findOne({
        _id: id,
        isDeleted: false
      })
        .populate('assignee', 'username profile.nickName profile.avatar email phone')
        .populate('createdBy', 'username profile.nickName')
        .populate('collaborators.user', 'username profile.nickName profile.avatar')
        .populate('reviewers.user', 'username profile.nickName')
        .populate('comments.user', 'username profile.nickName profile.avatar');

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在',
          message: '未找到指定的任务'
        });
      }

      // 权限检查：只能查看自己村庄的任务
      if (req.user.villageId && task.villageId.toString() !== req.user.villageId.toString()) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          message: '您无权查看此任务'
        });
      }

      res.json({
        success: true,
        data: task
      });

    } catch (error) {
      logger.error('获取任务详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取任务详情失败',
        message: error.message
      });
    }
  }

  /**
   * 创建新任务
   */
  async createTask(req, res) {
    try {
      const {
        title,
        description,
        category,
        quadrant,
        priority,
        dueDate,
        startDate,
        estimatedHours,
        assignee,
        collaborators,
        tags,
        completionCriteria,
        villageId
      } = req.body;

      // 验证必填字段
      if (!title || !quadrant || !assignee) {
        return res.status(400).json({
          success: false,
          error: '缺少必填字段',
          message: '标题、象限和负责人为必填项'
        });
      }

      // 确定村级ID
      const targetVillageId = villageId || req.user.villageId;
      if (!targetVillageId) {
        return res.status(400).json({
          success: false,
          error: '缺少村级ID',
          message: '必须指定村级ID'
        });
      }

      // 验证负责人是否存在
      const assigneeUser = await User.findById(assignee);
      if (!assigneeUser) {
        return res.status(400).json({
          success: false,
          error: '无效的负责人',
          message: '指定的负责人不存在'
        });
      }

      // 处理协作者
      const processedCollaborators = [];
      if (collaborators && Array.isArray(collaborators)) {
        for (const collaborator of collaborators) {
          const user = await User.findById(collaborator.user);
          if (user) {
            processedCollaborators.push({
              user: user._id,
              userName: user.profile?.nickName || user.username,
              role: collaborator.role || 'contributor'
            });
          }
        }
      }

      // 创建任务
      const task = new CadreTask({
        title,
        description,
        category: category || 'governance',
        quadrant,
        priority: priority || 3,
        dueDate,
        startDate,
        estimatedHours,
        assignee,
        assigneeName: assigneeUser.profile?.nickName || assigneeUser.username,
        createdBy: req.user._id,
        creatorName: req.user.profile?.nickName || req.user.username,
        collaborators: processedCollaborators,
        tags: tags || [],
        completionCriteria,
        villageId: targetVillageId,
        status: 'pending',
        progress: 0
      });

      await task.save();

      // 记录日志
      logger.info('创建任务成功', {
        taskId: task._id,
        title: task.title,
        createdBy: req.user._id,
        villageId: targetVillageId
      });

      // 返回完整的任务信息
      const populatedTask = await CadreTask.findById(task._id)
        .populate('assignee', 'username profile.nickName profile.avatar')
        .populate('createdBy', 'username profile.nickName')
        .populate('collaborators.user', 'username profile.nickName');

      res.status(201).json({
        success: true,
        data: populatedTask,
        message: '任务创建成功'
      });

    } catch (error) {
      logger.error('创建任务失败:', error);
      res.status(500).json({
        success: false,
        error: '创建任务失败',
        message: error.message
      });
    }
  }

  /**
   * 更新任务信息
   */
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // 查找任务
      const task = await CadreTask.findOne({
        _id: id,
        isDeleted: false
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在',
          message: '未找到指定的任务'
        });
      }

      // 权限检查
      if (req.user.villageId && task.villageId.toString() !== req.user.villageId.toString()) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          message: '您无权修改此任务'
        });
      }

      // 如果更改了负责人，更新负责人名称
      if (updateData.assignee && updateData.assignee !== task.assignee.toString()) {
        const assigneeUser = await User.findById(updateData.assignee);
        if (assigneeUser) {
          updateData.assigneeName = assigneeUser.profile?.nickName || assigneeUser.username;
        }
      }

      // 处理协作者更新
      if (updateData.collaborators && Array.isArray(updateData.collaborators)) {
        const processedCollaborators = [];
        for (const collaborator of updateData.collaborators) {
          const user = await User.findById(collaborator.user);
          if (user) {
            processedCollaborators.push({
              user: user._id,
              userName: user.profile?.nickName || user.username,
              role: collaborator.role || 'contributor'
            });
          }
        }
        updateData.collaborators = processedCollaborators;
      }

      // 更新任务
      Object.assign(task, updateData);
      await task.save();

      logger.info('更新任务成功', {
        taskId: task._id,
        updatedBy: req.user._id
      });

      // 返回更新后的任务
      const updatedTask = await CadreTask.findById(task._id)
        .populate('assignee', 'username profile.nickName profile.avatar')
        .populate('createdBy', 'username profile.nickName')
        .populate('collaborators.user', 'username profile.nickName');

      res.json({
        success: true,
        data: updatedTask,
        message: '任务更新成功'
      });

    } catch (error) {
      logger.error('更新任务失败:', error);
      res.status(500).json({
        success: false,
        error: '更新任务失败',
        message: error.message
      });
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, progress, actualHours } = req.body;

      // 验证状态值
      const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: '无效的状态值',
          message: '状态必须是以下之一: pending, in-progress, completed, cancelled, on-hold'
        });
      }

      // 查找任务
      const task = await CadreTask.findOne({
        _id: id,
        isDeleted: false
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在',
          message: '未找到指定的任务'
        });
      }

      // 权限检查
      if (req.user.villageId && task.villageId.toString() !== req.user.villageId.toString()) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          message: '您无权修改此任务'
        });
      }

      // 更新状态
      if (status) {
        task.status = status;

        // 如果任务完成，记录完成时间
        if (status === 'completed' && !task.completedAt) {
          task.completedAt = new Date();
        }
      }

      // 更新进度
      if (progress !== undefined) {
        task.progress = Math.min(100, Math.max(0, parseInt(progress)));
      }

      // 更新实际工时
      if (actualHours !== undefined) {
        task.actualHours = parseFloat(actualHours);
      }

      await task.save();

      logger.info('更新任务状态成功', {
        taskId: task._id,
        status: task.status,
        progress: task.progress,
        updatedBy: req.user._id
      });

      res.json({
        success: true,
        data: task,
        message: '任务状态更新成功'
      });

    } catch (error) {
      logger.error('更新任务状态失败:', error);
      res.status(500).json({
        success: false,
        error: '更新任务状态失败',
        message: error.message
      });
    }
  }

  /**
   * 添加子任务
   */
  async addSubtask(req, res) {
    try {
      const { id } = req.params;
      const { title, dueDate } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          error: '缺少子任务标题',
          message: '子任务标题为必填项'
        });
      }

      // 查找任务
      const task = await CadreTask.findOne({
        _id: id,
        isDeleted: false
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在',
          message: '未找到指定的任务'
        });
      }

      // 权限检查
      if (req.user.villageId && task.villageId.toString() !== req.user.villageId.toString()) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          message: '您无权修改此任务'
        });
      }

      // 添加子任务
      task.subtasks.push({
        title,
        completed: false,
        dueDate
      });

      await task.save();

      logger.info('添加子任务成功', {
        taskId: task._id,
        subtaskTitle: title,
        addedBy: req.user._id
      });

      res.json({
        success: true,
        data: task,
        message: '子任务添加成功'
      });

    } catch (error) {
      logger.error('添加子任务失败:', error);
      res.status(500).json({
        success: false,
        error: '添加子任务失败',
        message: error.message
      });
    }
  }

  /**
   * 完成子任务
   */
  async completeSubtask(req, res) {
    try {
      const { id, subtaskId } = req.params;

      // 查找任务
      const task = await CadreTask.findOne({
        _id: id,
        isDeleted: false
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在',
          message: '未找到指定的任务'
        });
      }

      // 权限检查
      if (req.user.villageId && task.villageId.toString() !== req.user.villageId.toString()) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          message: '您无权修改此任务'
        });
      }

      // 查找子任务
      const subtask = task.subtasks.id(subtaskId);
      if (!subtask) {
        return res.status(404).json({
          success: false,
          error: '子任务不存在',
          message: '未找到指定的子任务'
        });
      }

      // 切换完成状态
      subtask.completed = !subtask.completed;
      if (subtask.completed) {
        subtask.completedAt = new Date();
      } else {
        subtask.completedAt = undefined;
      }

      // 更新主任务的进度
      const completedSubtasks = task.subtasks.filter(st => st.completed).length;
      const totalSubtasks = task.subtasks.length;
      task.progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

      await task.save();

      logger.info('更新子任务状态成功', {
        taskId: task._id,
        subtaskId,
        completed: subtask.completed,
        updatedBy: req.user._id
      });

      res.json({
        success: true,
        data: task,
        message: '子任务状态更新成功'
      });

    } catch (error) {
      logger.error('更新子任务状态失败:', error);
      res.status(500).json({
        success: false,
        error: '更新子任务状态失败',
        message: error.message
      });
    }
  }

  /**
   * 添加评论
   */
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content || content.trim() === '') {
        return res.status(400).json({
          success: false,
          error: '缺少评论内容',
          message: '评论内容不能为空'
        });
      }

      // 查找任务
      const task = await CadreTask.findOne({
        _id: id,
        isDeleted: false
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在',
          message: '未找到指定的任务'
        });
      }

      // 权限检查
      if (req.user.villageId && task.villageId.toString() !== req.user.villageId.toString()) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          message: '您无权评论此任务'
        });
      }

      // 添加评论
      task.comments.push({
        user: req.user._id,
        userName: req.user.profile?.nickName || req.user.username,
        content: content.trim(),
        createdAt: new Date()
      });

      await task.save();

      logger.info('添加评论成功', {
        taskId: task._id,
        commentBy: req.user._id
      });

      // 返回更新后的任务（包含新评论）
      const updatedTask = await CadreTask.findById(task._id)
        .populate('comments.user', 'username profile.nickName profile.avatar');

      res.json({
        success: true,
        data: updatedTask,
        message: '评论添加成功'
      });

    } catch (error) {
      logger.error('添加评论失败:', error);
      res.status(500).json({
        success: false,
        error: '添加评论失败',
        message: error.message
      });
    }
  }

  /**
   * 删除任务（软删除）
   */
  async deleteTask(req, res) {
    try {
      const { id } = req.params;

      // 查找任务
      const task = await CadreTask.findOne({
        _id: id,
        isDeleted: false
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: '任务不存在',
          message: '未找到指定的任务'
        });
      }

      // 权限检查
      if (req.user.villageId && task.villageId.toString() !== req.user.villageId.toString()) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          message: '您无权删除此任务'
        });
      }

      // 软删除
      task.isDeleted = true;
      task.deletedAt = new Date();
      task.deletedBy = req.user._id;
      await task.save();

      logger.info('删除任务成功', {
        taskId: task._id,
        deletedBy: req.user._id
      });

      res.json({
        success: true,
        message: '任务删除成功'
      });

    } catch (error) {
      logger.error('删除任务失败:', error);
      res.status(500).json({
        success: false,
        error: '删除任务失败',
        message: error.message
      });
    }
  }

  /**
   * 获取任务统计信息
   */
  async getStatistics(req, res) {
    try {
      const { villageId, startDate, endDate } = req.query;

      // 确定村级ID
      const targetVillageId = villageId || req.user.villageId;
      if (!targetVillageId) {
        return res.status(400).json({
          success: false,
          error: '缺少村级ID',
          message: '请指定村级ID或确保用户已关联到村庄'
        });
      }

      // 构建日期范围查询
      const dateQuery = {};
      if (startDate || endDate) {
        dateQuery.createdAt = {};
        if (startDate) {
          dateQuery.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          dateQuery.createdAt.$lte = new Date(endDate);
        }
      }

      // 基础查询条件
      const baseQuery = {
        villageId: targetVillageId,
        isDeleted: false,
        ...dateQuery
      };

      // 获取各状态任务数量
      const statusStats = await CadreTask.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // 获取各象限任务数量
      const quadrantStats = await CadreTask.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$quadrant',
            count: { $sum: 1 }
          }
        }
      ]);

      // 获取各类别任务数量
      const categoryStats = await CadreTask.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]);

      // 获取负责人任务统计（前10名）
      const assigneeStats = await CadreTask.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$assignee',
            assigneeName: { $first: '$assigneeName' },
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            },
            inProgressTasks: {
              $sum: {
                $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0]
              }
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ['$dueDate', new Date()] },
                      { $ne: ['$status', 'completed'] },
                      { $ne: ['$status', 'cancelled'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'assignee'
          }
        },
        {
          $project: {
            assigneeId: '$_id',
            assigneeName: 1,
            totalTasks: 1,
            completedTasks: 1,
            inProgressTasks: 1,
            overdueTasks: 1,
            completionRate: {
              $multiply: [
                {
                  $divide: ['$completedTasks', '$totalTasks']
                },
                100
              ]
            }
          }
        },
        { $sort: { totalTasks: -1 } },
        { $limit: 10 }
      ]);

      // 总体统计
      const totalTasks = await CadreTask.countDocuments(baseQuery);
      const completedTasks = await CadreTask.countDocuments({
        ...baseQuery,
        status: 'completed'
      });
      const inProgressTasks = await CadreTask.countDocuments({
        ...baseQuery,
        status: 'in-progress'
      });
      const overdueTasks = await CadreTask.countDocuments({
        ...baseQuery,
        dueDate: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] }
      });

      // 计算完成率
      const completionRate = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      // 格式化统计数据
      const formattedStatusStats = {};
      statusStats.forEach(stat => {
        formattedStatusStats[stat._id] = stat.count;
      });

      const formattedQuadrantStats = {};
      quadrantStats.forEach(stat => {
        formattedQuadrantStats[stat._id] = stat.count;
      });

      const formattedCategoryStats = {};
      categoryStats.forEach(stat => {
        formattedCategoryStats[stat._id] = stat.count;
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            completionRate
          },
          byStatus: formattedStatusStats,
          byQuadrant: formattedQuadrantStats,
          byCategory: formattedCategoryStats,
          topAssignees: assigneeStats
        }
      });

    } catch (error) {
      logger.error('获取任务统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取任务统计失败',
        message: error.message
      });
    }
  }
}

module.exports = new CadreTaskController();
