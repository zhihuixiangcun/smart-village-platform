/**
 * AI分析服务
 * 提供任务智能分析、分类建议和优化推荐
 */

/**
 * 分析任务并分配象限
 * @param {Object} task - 任务对象
 * @returns {Object} 分析结果
 */
function analyzeTask(task) {
  const { title, description } = task;
  const text = `${title} ${description || ''}`.toLowerCase();

  // 第一象限关键词：重要且紧急
  const q1Keywords = ['紧急', '立即', '马上', '突发', '应急', '灾害', '事故', '隐患', '求助', '纠纷', '冲突', '上级交办', '截止', 'deadline', 'urgent'];

  // 第二象限关键词：重要不紧急
  const q2Keywords = ['计划', '规划', '筹备', '学习', '培训', '走访', '调研', '总结', '方案', '制度', '建设', '发展', '长期', 'strategic', 'planning'];

  // 第三象限关键词：紧急不重要
  const q3Keywords = ['会议', '电话', '接待', '咨询', '回复', '报表', '统计', '上报', '通知', '提醒', 'routine', 'meeting', 'call'];

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
    priority: calculatePriority(quadrant, importance, urgency),
    confidence: 0.85
  };
}

/**
 * 计算执行优先级
 */
function calculatePriority(quadrant, importance, urgency) {
  const quadrantPriority = {
    'Q1': 9,
    'Q2': 7,
    'Q3': 5,
    'Q4': 3
  };

  const basePriority = quadrantPriority[quadrant] || 5;
  return Math.min(10, Math.max(1, basePriority + Math.round((importance + urgency) / 10)));
}

/**
 * 批量分析任务
 * @param {Array} tasks - 任务数组
 * @returns {Array} 分析结果数组
 */
function analyzeTasks(tasks) {
  return tasks.map(task => analyzeTask(task));
}

/**
 * 生成工作优化建议
 * @param {Object} workPlan - 工作计划对象
 * @returns {Array} 建议数组
 */
function generateSuggestions(workPlan) {
  const suggestions = [];
  const { statistics, tasks } = workPlan;

  // 分析工作量
  const totalTasks = statistics?.totalTasks || 0;
  const q1Tasks = tasks?.Q1?.length || 0;

  if (totalTasks > 15) {
    suggestions.push('今日任务数量过多，建议适当减少或延期部分任务');
  }

  if (q1Tasks > 3) {
    suggestions.push('重要且紧急任务过多，建议委托或寻求协助');
  }

  // 分析第二象限任务占比
  const q2Tasks = tasks?.Q2?.length || 0;
  const q2Ratio = totalTasks > 0 ? q2Tasks / totalTasks : 0;

  if (q2Ratio < 0.3) {
    suggestions.push('重要不紧急的任务占比较少，建议增加长期规划性工作');
  }

  // 分析时间分配
  const q1Time = statistics?.timeByQuadrant?.Q1 || 0;
  const totalTime = statistics?.totalActualTime || statistics?.totalEstimatedTime || 0;

  if (totalTime > 0 && q1Time / totalTime > 0.6) {
    suggestions.push('第一象限任务耗时过多，建议优化应急响应机制');
  }

  return suggestions;
}

module.exports = {
  analyzeTask,
  analyzeTasks,
  generateSuggestions
};
