/**
 * 村干部工作规划控制器
 * 处理基于四象限法则的工作规划、执行跟踪、汇总的HTTP请求
 */

const { WorkPlan, QuadrantType, PlanStatus, TaskStatus } = require('../models/WorkPlan');
const { successResponse, errorResponse } = require('../utils/response');
const aiAnalysisService = require('../services/aiAnalysisService');

// ==================== 工作规划管理 ====================

/**
 * 创建工作规划
 */
exports.createWorkPlan = async (req, res) => {
  try {
    const { villageId, tasks, notes } = req.body;
    const userId = req.user.id;
    const userName = req.user.name || req.user.username;

    // 检查今日是否已有规划
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingPlan = await WorkPlan.getTodayPlan(userId, villageId);
    if (existingPlan) {
      return errorResponse(res, '今日已创建工作规划，请更新现有规划', 400);
    }

    // AI分析任务并分配象限
    const analyzedTasks = await analyzeAndClassifyTasks(tasks);

    const workPlan = new WorkPlan({
      villageId,
      userId,
      userName,
      planDate: today,
      planStatus: PlanStatus.DRAFT,
      tasks: {
        Q1: analyzedTasks.filter(t => t.quadrant === 'Q1'),
        Q2: analyzedTasks.filter(t => t.quadrant === 'Q2'),
        Q3: analyzedTasks.filter(t => t.quadrant === 'Q3'),
        Q4: analyzedTasks.filter(t => t.quadrant === 'Q4')
      },
      notes,
      statistics: {
        totalTasks: tasks.length,
        completedTasks: 0,
        completionRate: 0
      }
    });

    await workPlan.save();
    await workPlan.generateAISuggestions();

    return successResponse(res, workPlan, '工作规划创建成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 获取今日工作规划
 */
exports.getTodayWorkPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { villageId } = req.query;

    if (!villageId) {
      return errorResponse(res, '请提供村庄ID', 400);
    }

    let workPlan = await WorkPlan.getTodayPlan(userId, villageId);

    // 如果今日没有规划，创建空规划
    if (!workPlan) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      workPlan = new WorkPlan({
        villageId,
        userId,
        userName: req.user.name || req.user.username,
        planDate: today,
        planStatus: PlanStatus.DRAFT,
        tasks: { Q1: [], Q2: [], Q3: [], Q4: [] },
        statistics: {
          totalTasks: 0,
          completedTasks: 0,
          completionRate: 0
        }
      });

      await workPlan.save();
    }

    return successResponse(res, workPlan);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 更新工作规划
 */
exports.updateWorkPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    // 只有草稿状态可以修改基本信息
    if (workPlan.planStatus !== PlanStatus.DRAFT && updates.notes !== undefined) {
      return errorResponse(res, '只有草稿状态的工作规划可以修改备注', 400);
    }

    Object.assign(workPlan, updates);
    await workPlan.save();

    return successResponse(res, workPlan, '工作规划更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 确认工作规划
 */
exports.confirmWorkPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    await workPlan.confirm();

    return successResponse(res, workPlan, '工作规划已确认，开始执行');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

/**
 * 生成工作汇总
 */
exports.generateDailySummary = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    const { insights } = req.body;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    await workPlan.generateDailySummary();

    // 添加用户感悟
    if (insights && Array.isArray(inssights)) {
      workPlan.dailySummary.insights = insights;
    }

    await workPlan.save();

    return successResponse(res, workPlan, '工作汇总生成成功');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 创建次日工作规划
 */
exports.createNextDayPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    const { tasks, notes } = req.body;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    // 分析并分类次日任务
    const analyzedTasks = await analyzeAndClassifyTasks(tasks);

    await workPlan.createNextDayPlan(analyzedTasks, notes);

    return successResponse(res, workPlan, '次日工作规划创建成功');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 获取工作统计数据
 */
exports.getWorkStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { villageId, startDate, endDate } = req.query;

    const statistics = await WorkPlan.getStatistics(userId, {
      villageId,
      startDate,
      endDate
    });

    return successResponse(res, statistics[0] || {});
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 获取工作历史记录
 */
exports.getWorkHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { villageId, startDate, endDate, status, limit, skip } = req.query;

    const history = await WorkPlan.getUserHistory(userId, {
      villageId,
      startDate,
      endDate,
      status,
      limit: parseInt(limit) || 30,
      skip: parseInt(skip) || 0
    });

    return successResponse(res, history);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 获取月度报告
 */
exports.getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month, villageId } = req.query;

    if (!year || !month) {
      return errorResponse(res, '请提供年份和月份', 400);
    }

    const report = await WorkPlan.getMonthlyReport(
      userId,
      parseInt(year),
      parseInt(month),
      villageId
    );

    return successResponse(res, report);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 获取团队工作统计（村支书视角）
 */
exports.getTeamStatistics = async (req, res) => {
  try {
    const { villageId } = req.params;
    const { startDate, endDate } = req.query;
    const currentUserRole = req.user.role;

    // 只有村支书可以查看团队统计
    if (currentUserRole !== 'admin' && currentUserRole !== 'secretary') {
      return errorResponse(res, '无权查看团队统计数据', 403);
    }

    const teamStats = await WorkPlan.getTeamStatistics(villageId, {
      startDate,
      endDate
    });

    return successResponse(res, teamStats);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ==================== 任务管理 ====================

/**
 * 添加任务
 */
exports.addTask = async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.id;
    const taskData = req.body;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    // 如果未提供象限，使用AI分析
    if (!taskData.quadrant) {
      const analyzed = await analyzeSingleTask(taskData);
      taskData.quadrant = analyzed.quadrant;
      taskData.importance = analyzed.importance;
      taskData.urgency = analyzed.urgency;
      taskData.priority = analyzed.priority;
    }

    taskData.createdBy = userId;

    await workPlan.addTask(taskData);

    return successResponse(res, workPlan, '任务添加成功', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 更新任务
 */
exports.updateTask = async (req, res) => {
  try {
    const { planId, quadrant, taskId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    updates.updatedBy = userId;

    await workPlan.updateTask(quadrant, taskId, updates);

    return successResponse(res, workPlan, '任务更新成功');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 开始任务
 */
exports.startTask = async (req, res) => {
  try {
    const { planId, quadrant, taskId } = req.params;
    const userId = req.user.id;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    await workPlan.startTask(quadrant, taskId);

    return successResponse(res, workPlan, '任务已开始');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 更新任务进度
 */
exports.updateTaskProgress = async (req, res) => {
  try {
    const { planId, quadrant, taskId } = req.params;
    const userId = req.user.id;
    const { progress, note, attachments } = req.body;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    await workPlan.updateTaskProgress(quadrant, taskId, progress, note, userId, attachments);

    return successResponse(res, workPlan, '任务进度已更新');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 完成任务
 */
exports.completeTask = async (req, res) => {
  try {
    const { planId, quadrant, taskId } = req.params;
    const userId = req.user.id;
    const { summary } = req.body;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    await workPlan.completeTask(quadrant, taskId, summary, userId);

    return successResponse(res, workPlan, '任务已完成');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 延期任务
 */
exports.postponeTask = async (req, res) => {
  try {
    const { planId, quadrant, taskId } = req.params;
    const userId = req.user.id;
    const { reason, plannedTime } = req.body;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    await workPlan.postponeTask(quadrant, taskId, reason, plannedTime);

    return successResponse(res, workPlan, '任务已延期');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * 删除任务
 */
exports.deleteTask = async (req, res) => {
  try {
    const { planId, quadrant, taskId } = req.params;
    const userId = req.user.id;

    const workPlan = await WorkPlan.findOne({ _id: planId, userId });

    if (!workPlan) {
      return errorResponse(res, '工作规划不存在或无权访问', 404);
    }

    await workPlan.deleteTask(quadrant, taskId);

    return successResponse(res, workPlan, '任务已删除');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ==================== AI分析 ====================

/**
 * AI任务分类建议
 */
exports.getAISuggestions = async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return errorResponse(res, '请提供任务列表', 400);
    }

    const analyzedTasks = await analyzeAndClassifyTasks(tasks);

    return successResponse(res, {
      tasks: analyzedTasks,
      summary: {
        totalTasks: tasks.length,
        Q1: analyzedTasks.filter(t => t.quadrant === 'Q1').length,
        Q2: analyzedTasks.filter(t => t.quadrant === 'Q2').length,
        Q3: analyzedTasks.filter(t => t.quadrant === 'Q3').length,
        Q4: analyzedTasks.filter(t => t.quadrant === 'Q4').length
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// ==================== 辅助函数 ====================

/**
 * 分析并分类任务列表
 */
async function analyzeAndClassifyTasks(tasks) {
  const analyzedTasks = [];

  for (const task of tasks) {
    const analyzed = await analyzeSingleTask(task);
    analyzedTasks.push(analyzed);
  }

  return analyzedTasks;
}

/**
 * 分析单个任务并分配象限
 */
async function analyzeSingleTask(task) {
  const { title, description, quadrant, importance, urgency, estimatedTime } = task;

  // 如果已提供象限，直接使用
  if (quadrant) {
    return {
      ...task,
      quadrant,
      importance: importance || calculateImportance(title, description),
      urgency: urgency || calculateUrgency(title, description),
      priority: calculatePriority(quadrant, importance, urgency),
      estimatedTime: estimatedTime || 30
    };
  }

  // AI分析任务关键词
  const analysis = analyzeTaskKeywords(title, description || '');

  return {
    ...task,
    quadrant: analysis.quadrant,
    importance: analysis.importance,
    urgency: analysis.urgency,
    priority: analysis.priority,
    estimatedTime: estimatedTime || 30
  };
}

/**
 * 分析任务关键词确定象限
 */
function analyzeTaskKeywords(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // 第一象限关键词：重要且紧急
  const q1Keywords = ['紧急', '立即', '马上', '突发', '应急', '灾害', '事故', '隐患', '求助', '纠纷', '冲突', '上级交办', '截止', 'deadline', 'urgent'];

  // 第二象限关键词：重要不紧急
  const q2Keywords = ['计划', '规划', '筹备', '学习', '培训', '走访', '调研', '总结', '方案', '制度', '建设', '发展', '长期', 'strategic', 'planning'];

  // 第三象限关键词：紧急不重要
  const q3Keywords = ['会议', '电话', '接待', '咨询', '回复', '报表', '统计', '上报', '通知', '提醒', 'routine', 'meeting', 'call'];

  // 检查关键词
  let quadrant = 'Q4';
  let importance = 3;
  let urgency = 3;

  if (q1Keywords.some(kw => text.includes(kw))) {
    quadrant = 'Q1';
    importance = 5;
    urgency = 5;
  } else if (q2Keywords.some(kw => text.includes(kw))) {
    quadrant = 'Q2';
    importance = 5;
    urgency = 2;
  } else if (q3Keywords.some(kw => text.includes(kw))) {
    quadrant = 'Q3';
    importance = 2;
    urgency = 4;
  }

  return {
    quadrant,
    importance,
    urgency,
    priority: calculatePriority(quadrant, importance, urgency)
  };
}

/**
 * 计算重要性
 */
function calculateImportance(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();

  // 高重要性关键词
  const highImportance = ['安全', '生命', '财产', '政策', '发展', '建设', '重要', '核心', '关键'];
  // 低重要性关键词
  const lowImportance = ['闲聊', '应酬', '琐碎', '日常', '常规'];

  if (highImportance.some(kw => text.includes(kw))) {
    return 5;
  } else if (lowImportance.some(kw => text.includes(kw))) {
    return 2;
  }

  return 3;
}

/**
 * 计算紧急性
 */
function calculateUrgency(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();

  // 高紧急性关键词
  const highUrgency = ['紧急', '立即', '马上', '今天', '截止', 'deadline', 'urgent', 'today', 'now'];
  // 低紧急性关键词
  const lowUrgency = ['下周', '下月', '以后', '慢慢', '不急', 'later', 'next week'];

  if (highUrgency.some(kw => text.includes(kw))) {
    return 5;
  } else if (lowUrgency.some(kw => text.includes(kw))) {
    return 2;
  }

  return 3;
}

/**
 * 计算执行优先级（1-10，同象限内排序）
 */
function calculatePriority(quadrant, importance, urgency) {
  const quadrantPriority = {
    'Q1': 9,  // 重要且紧急 - 最高优先级
    'Q2': 7,  // 重要不紧急 - 高优先级
    'Q3': 5,  // 紧急不重要 - 中等优先级
    'Q4': 3   // 不重要不紧急 - 低优先级
  };

  const basePriority = quadrantPriority[quadrant] || 5;

  // 根据重要性和紧急性微调
  const adjustedPriority = basePriority + Math.round((importance + urgency) / 10);

  return Math.min(10, Math.max(1, adjustedPriority));
}
