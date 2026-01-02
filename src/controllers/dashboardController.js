/**
 * Dashboard控制器
 * 整合所有模块的统计数据，为前端Dashboard提供统一接口
 */

const Resident = require('../models/Resident');
const User = require('../models/User');
const Announcement = require('../models/Announcement');
const Governance = require('../models/Governance');
const Finance = require('../models/Finance');
const Emergency = require('../models/Emergency');
const ServiceRequest = require('../models/ServiceRequest');
const logger = require('../utils/logger');

/**
 * 获取综合统计数据
 */
async function getStatistics(req, res) {
  try {
    const villageId = req.query.villageId || null;
    const userId = req.user?.id;

    // 并行获取所有统计数据
    const [
      residentStats,
      userStats,
      announcementStats,
      governanceStats,
      financeStats,
      emergencyStats,
      serviceStats
    ] = await Promise.all([
      getResidentStatistics(villageId),
      getUserStatistics(villageId),
      getAnnouncementStatistics(villageId),
      getGovernanceStatistics(villageId),
      getFinanceStatistics(villageId),
      getEmergencyStatistics(villageId),
      getServiceStatistics(villageId)
    ]);

    res.json({
      success: true,
      data: {
        residents: residentStats,
        users: userStats,
        announcements: announcementStats,
        governance: governanceStats,
        finance: financeStats,
        emergency: emergencyStats,
        services: serviceStats,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    logger.error('获取Dashboard统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败: ' + error.message
    });
  }
}

/**
 * 获取村民统计
 */
async function getResidentStatistics(villageId) {
  const matchCondition = villageId ? { villageId } : {};

  const total = await Resident.countDocuments({ ...matchCondition, status: 'active' });

  // 性别分布
  const genderStats = await Resident.aggregate([
    { $match: { ...matchCondition, status: 'active' } },
    {
      $group: {
        _id: '$gender',
        count: { $sum: 1 }
      }
    }
  ]);

  // 年龄分布
  const ageStats = await Resident.aggregate([
    { $match: { ...matchCondition, status: 'active' } },
    {
      $bucket: {
        groupBy: '$age',
        boundaries: [0, 18, 35, 60, 120],
        default: 'unknown',
        output: {
          count: { $sum: 1 }
        }
      }
    }
  ]);

  // 特殊群体
  const specialGroups = await Resident.aggregate([
    { $match: { ...matchCondition, status: 'active' } },
    {
      $group: {
        _id: null,
        lowIncome: { $sum: { $cond: ['$isLowIncome', 1, 0] } },
        elderly: { $sum: { $cond: [{ $gte: ['$age', 65] }, 1, 0] } },
        disabled: { $sum: { $cond: ['$isDisabled', 1, 0] } }
      }
    }
  ]);

  // 本月新增
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const newThisMonth = await Resident.countDocuments({
    ...matchCondition,
    createdAt: { $gte: thisMonth }
  });

  return {
    total,
    online: Math.floor(total * 0.1), // 模拟在线人数
    newThisMonth,
    genderDistribution: genderStats.map(s => ({
      gender: s._id || '未知',
      count: s.count
    })),
    ageDistribution: ageStats.map(s => ({
      range: getAgeRangeLabel(s._id),
      count: s.count
    })),
    specialGroups: specialGroups[0] || { lowIncome: 0, elderly: 0, disabled: 0 }
  };
}

/**
 * 获取用户统计
 */
async function getUserStatistics(villageId) {
  const matchCondition = villageId ? { villageId } : {};

  const total = await User.countDocuments(matchCondition);

  // 角色分布
  const roleStats = await User.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  // 活跃用户（最近7天登录）
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const active = await User.countDocuments({
    ...matchCondition,
    lastLoginAt: { $gte: sevenDaysAgo }
  });

  return {
    total,
    active,
    roleDistribution: roleStats.map(s => ({
      role: s._id || '未知',
      count: s.count
    }))
  };
}

/**
 * 获取公告统计
 */
async function getAnnouncementStatistics(villageId) {
  const matchCondition = villageId ? { villageId } : {};

  const total = await Announcement.countDocuments(matchCondition);

  // 未读公告（模拟）
  const unread = Math.floor(total * 0.2);

  // 按状态分组
  const statusStats = await Announcement.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // 按类型分组
  const typeStats = await Announcement.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);

  // 本周发布
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const publishedThisWeek = await Announcement.countDocuments({
    ...matchCondition,
    createdAt: { $gte: weekAgo }
  });

  return {
    total,
    unread,
    publishedThisWeek,
    statusDistribution: statusStats.map(s => ({
      status: s._id || '未知',
      count: s.count
    })),
    typeDistribution: typeStats.map(s => ({
      type: s._id || '未知',
      count: s.count
    }))
  };
}

/**
 * 获取村务统计
 */
async function getGovernanceStatistics(villageId) {
  const matchCondition = villageId ? { villageId } : {};

  const total = await Governance.countDocuments(matchCondition);

  // 待处理事项
  const pending = await Governance.countDocuments({
    ...matchCondition,
    status: 'pending'
  });

  // 进行中
  const inProgress = await Governance.countDocuments({
    ...matchCondition,
    status: 'in_progress'
  });

  // 已完成
  const completed = await Governance.countDocuments({
    ...matchCondition,
    status: 'completed'
  });

  return {
    total,
    pending,
    inProgress,
    completed,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%'
  };
}

/**
 * 获取财务统计
 */
async function getFinanceStatistics(villageId) {
  const matchCondition = villageId ? { villageId } : {};

  // 本月财务数据
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const monthlyMatchCondition = {
    ...matchCondition,
    createdAt: { $gte: thisMonth }
  };

  // 总收支
  const totals = await Finance.aggregate([
    { $match: monthlyMatchCondition },
    {
      $group: {
        _id: null,
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
      }
    }
  ]);

  // 本年累计
  const thisYear = new Date();
  thisYear.setMonth(0, 1);
  thisYear.setHours(0, 0, 0, 0);

  const yearlyTotals = await Finance.aggregate([
    {
      $match: {
        ...matchCondition,
        createdAt: { $gte: thisYear }
      }
    },
    {
      $group: {
        _id: null,
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } }
      }
    }
  ]);

  const monthlyData = totals[0] || { income: 0, expense: 0 };
  const yearlyData = yearlyTotals[0] || { income: 0, expense: 0 };

  return {
    monthly: {
      income: monthlyData.income,
      expense: monthlyData.expense,
      balance: monthlyData.income - monthlyData.expense
    },
    yearly: {
      income: yearlyData.income,
      expense: yearlyData.expense,
      balance: yearlyData.income - yearlyData.expense
    },
    transactionCount: await Finance.countDocuments(monthlyMatchCondition)
  };
}

/**
 * 获取应急事件统计
 */
async function getEmergencyStatistics(villageId) {
  const matchCondition = villageId ? { villageId } : {};

  const total = await Emergency.countDocuments(matchCondition);

  // 活跃事件
  const active = await Emergency.countDocuments({
    ...matchCondition,
    status: { $in: ['pending', 'in_progress'] }
  });

  // 已解决
  const resolved = await Emergency.countDocuments({
    ...matchCondition,
    status: 'resolved'
  });

  // 按严重程度分组
  const severityStats = await Emergency.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 }
      }
    }
  ]);

  // 按类型分组
  const typeStats = await Emergency.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    total,
    active,
    resolved,
      resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) + '%' : '0%',
    severityDistribution: severityStats.map(s => ({
      severity: s._id || '未知',
      count: s.count
    })),
    typeDistribution: typeStats.map(s => ({
      type: s._id || '未知',
      count: s.count
    }))
  };
}

/**
 * 获取服务统计
 */
async function getServiceStatistics(villageId) {
  const matchCondition = villageId ? { villageId } : {};

  const total = await ServiceRequest.countDocuments(matchCondition);

  // 待处理
  const pending = await ServiceRequest.countDocuments({
    ...matchCondition,
    status: 'pending'
  });

  // 处理中
  const processing = await ServiceRequest.countDocuments({
    ...matchCondition,
    status: 'processing'
  });

  // 已完成
  const completed = await ServiceRequest.countDocuments({
    ...matchCondition,
    status: 'completed'
  });

  // 按服务类型分组
  const typeStats = await ServiceRequest.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$serviceType',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    total,
    pending,
    processing,
    completed,
    completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%',
    typeDistribution: typeStats.map(s => ({
      type: s._id || '未知',
      count: s.count
    }))
  };
}

/**
 * 辅助函数：获取年龄范围标签
 */
function getAgeRangeLabel(key) {
  const labels = {
    0: '0-18岁',
    18: '18-35岁',
    35: '35-60岁',
    60: '60岁以上',
    unknown: '未知'
  };
  return labels[key] || '未知';
}

// 导出控制器函数
module.exports = {
  getStatistics,
  getResidentStatistics,
  getUserStatistics,
  getAnnouncementStatistics,
  getGovernanceStatistics,
  getFinanceStatistics,
  getEmergencyStatistics,
  getServiceStatistics
};
