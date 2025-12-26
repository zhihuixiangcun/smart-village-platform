/**
 * Smart Village Platform - Data Analytics Service
 * 智慧乡村综合服务平台 - 数据分析服务
 *
 * Features:
 * - System overview statistics
 * - Population demographics analysis
 * - Financial statistics and trends
 * - User activity tracking
 * - Predictive analytics
 * - Real-time data aggregation
 */

const getClusterCacheManager = require('../../cache/clusterCacheManager').getClusterCacheManager;

/**
 * Data Analytics Service Class
 */
class DataAnalyticsService {
  constructor() {
    this.redis = getClusterCacheManager();
    this.cachePrefix = 'analytics:';
    this.defaultCacheTTL = 300; // 5 minutes
  }

  /**
   * Get system overview statistics
   */
  async getOverviewStats(villageId = null, timeRange = '24h') {
    const cacheKey = `${this.cachePrefix}overview:${villageId || 'all'}:${timeRange}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database for stats
    const stats = {
      timestamp: new Date(),
      timeRange,
      villageId,
      users: await this.getUserStats(villageId, timeRange),
      residents: await this.getResidentStats(villageId, timeRange),
      finance: await this.getFinanceStats(villageId, timeRange),
      system: await this.getSystemStats(timeRange)
    };

    // Cache the result
    await this.redis.set(cacheKey, JSON.stringify(stats), this.defaultCacheTTL);

    return stats;
  }

  /**
   * Get user statistics
   */
  async getUserStats(villageId, timeRange) {
    const User = require('../models/User');
    const AuditLog = require('../models/AuditLog');
    const { startDate, endDate } = this.getDateRange(timeRange);

    const totalUsers = await User.countDocuments(
      villageId ? { villageId } : {}
    );

    const activeUsers = await AuditLog.distinct('userId', {
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // User role distribution
    const roleDistribution = await User.aggregate([
      ...(villageId ? [{ $match: { villageId } }] : []),
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      total: totalUsers,
      active: activeUsers.length,
      roleDistribution: roleDistribution.map(item => ({
        role: item._id,
        count: item.count
      }))
    };
  }

  /**
   * Get resident statistics
   */
  async getResidentStats(villageId, timeRange) {
    const Resident = require('../models/Resident');

    const totalResidents = await Resident.countDocuments(
      villageId ? { villageId } : {}
    );

    // Age distribution
    const ageDistribution = await Resident.aggregate([
      ...(villageId ? [{ $match: { villageId } }] : []),
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$age', 18] }, then: '0-18岁' },
                { case: { $lt: ['$age', 35] }, then: '18-35岁' },
                { case: { $lt: ['$age', 60] }, then: '35-60岁' },
                { case: { $gte: ['$age', 60] }, then: '60岁以上' }
              ],
              default: '未知'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Gender distribution
    const genderDistribution = await Resident.aggregate([
      ...(villageId ? [{ $match: { villageId } }] : []),
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Special groups (low income, elderly, disabled)
    const specialGroups = await Resident.aggregate([
      ...(villageId ? [{ $match: { villageId } }] : []),
      {
        $group: {
          _id: null,
          lowIncome: { $sum: { $cond: ['$isLowIncome', 1, 0] } },
          elderly: { $sum: { $cond: [{ $gte: ['$age', 65] }, 1, 0] } },
          disabled: { $sum: { $cond: ['$isDisabled', 1, 0] } }
        }
      }
    ]);

    return {
      total: totalResidents,
      ageDistribution: ageDistribution.map(item => ({
        ageGroup: item._id,
        count: item.count
      })),
      genderDistribution: genderDistribution.map(item => ({
        gender: item._id || '未知',
        count: item.count
      })),
      specialGroups: specialGroups[0] || { lowIncome: 0, elderly: 0, disabled: 0 }
    };
  }

  /**
   * Get finance statistics
   */
  async getFinanceStats(villageId, timeRange) {
    const Finance = require('../models/Finance');
    const { startDate, endDate } = this.getDateRange(timeRange);

    const matchCondition = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (villageId) {
      matchCondition.villageId = villageId;
    }

    // Total income and expense
    const totals = await Finance.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          },
          totalExpense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          }
        }
      }
    ]);

    // Category breakdown
    const categoryBreakdown = await Finance.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    // Daily trend
    const dailyTrend = await Finance.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          income: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          },
          expense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          }
        }
      },
      { $sort: { '_id': 1 } },
      { $limit: 30 }
    ]);

    const totalData = totals[0] || { totalIncome: 0, totalExpense: 0 };

    return {
      totalIncome: totalData.totalIncome,
      totalExpense: totalData.totalExpense,
      balance: totalData.totalIncome - totalData.totalExpense,
      categoryBreakdown: categoryBreakdown.map(item => ({
        category: item._id,
        total: item.total,
        count: item.count
      })),
      dailyTrend: dailyTrend.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        income: item.income,
        expense: item.expense
      }))
    };
  }

  /**
   * Get system statistics
   */
  async getSystemStats(timeRange) {
    const AuditLog = require('../models/AuditLog');
    const { startDate, endDate } = this.getDateRange(timeRange);

    const totalRequests = await AuditLog.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // API endpoint usage
    const apiUsage = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Error rate
    const errors = await AuditLog.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate },
      status: { $gte: 400 }
    });

    return {
      totalRequests,
      errorRate: totalRequests > 0 ? (errors / totalRequests * 100).toFixed(2) + '%' : '0%',
      apiUsage: apiUsage.map(item => ({
        endpoint: item._id,
        count: item.count
      }))
    };
  }

  /**
   * Get population statistics with trends
   */
  async getPopulationStats(villageId, options = {}) {
    const { groupBy = 'age', includeTrends = true, timeRange = '90d' } = options;

    const cacheKey = `${this.cachePrefix}population:${villageId || 'all'}:${groupBy}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const Resident = require('../models/Resident');
    const matchCondition = villageId ? { villageId } : {};

    const stats = {
      total: await Resident.countDocuments({
        ...matchCondition,
        status: 'active'
      })
    };

    // Group by age
    if (groupBy === 'age') {
      stats.byAge = await Resident.aggregate([
        { $match: matchCondition },
        {
          $bucket: {
            groupBy: '$age',
            boundaries: [0, 18, 35, 60, 120],
            default: 'unknown',
            output: {
              count: { $sum: 1 },
              males: {
                $sum: { $cond: [{ $eq: ['$gender', '男'] }, 1, 0] }
              },
              females: {
                $sum: { $cond: [{ $eq: ['$gender', '女'] }, 1, 0] }
              }
            }
          }
        }
      ]);
    }

    // Gender distribution
    stats.byGender = await Resident.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Education level
    stats.byEducation = await Resident.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$education.level',
          count: { $sum: 1 }
        }
      }
    ]);

    // Trends
    if (includeTrends) {
      stats.trends = await this.getPopulationTrends(villageId, timeRange);
    }

    // Cache for 10 minutes
    await this.redis.set(cacheKey, JSON.stringify(stats), 600);

    return stats;
  }

  /**
   * Get population trends over time
   */
  async getPopulationTrends(villageId, timeRange = '90d') {
    const Resident = require('../models/Resident');
    const { startDate, endDate } = this.getDateRange(timeRange);

    return Resident.aggregate([
      {
        $match: {
          ...(villageId ? { villageId } : {}),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
  }

  /**
   * Get user activity statistics
   */
  async getUserActivityStats(timeRange = '7d') {
    const AuditLog = require('../models/AuditLog');
    const { startDate, endDate } = this.getDateRange(timeRange);

    const stats = {
      total: 0,
      uniqueUsers: 0,
      byRole: {},
      byAction: {},
      hourly: []
    };

    // Total operations
    stats.total = await AuditLog.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Unique users
    stats.uniqueUsers = await AuditLog.distinct('userId', {
      timestamp: { $gte: startDate, $lte: endDate }
    }).then(users => users.length);

    // By role (join with User collection)
    stats.byRole = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $group: {
          _id: '$user.role',
          count: { $sum: 1 }
        }
      }
    ]);

    // By action type
    stats.byAction = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Hourly distribution
    stats.hourly = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    return stats;
  }

  /**
   * Get predictions for future trends
   */
  async getPredictions(type, villageId) {
    const predictions = {
      type,
      villageId,
      generatedAt: new Date(),
      data: [],
      confidence: 0.85
    };

    switch (type) {
      case 'population':
        predictions.data = await this.predictPopulation(villageId);
        break;
      case 'finance':
        predictions.data = await this.predictFinance(villageId);
        break;
      case 'emergency':
        predictions.data = await this.predictEmergency(villageId);
        break;
      default:
        throw new Error(`Unknown prediction type: ${type}`);
    }

    return predictions;
  }

  /**
   * Predict population growth (simple linear regression)
   */
  async predictPopulation(villageId) {
    const Resident = require('../models/Resident');

    // Get historical data - last 12 months
    const monthlyData = await Resident.aggregate([
      ...(villageId ? [{ $match: { villageId } }] : []),
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } },
      { $limit: 12 }
    ]);

    if (monthlyData.length < 3) {
      return [{ message: 'Insufficient data for prediction' }];
    }

    // Simple linear regression
    const n = monthlyData.length;
    const sums = monthlyData.reduce((acc, item, i) => ({
      x: acc.x + i,
      y: acc.y + item.count,
      xy: acc.xy + i * item.count,
      xx: acc.xx + i * i
    }), { x: 0, y: 0, xy: 0, xx: 0 });

    const slope = (n * sums.xy - sums.x * sums.y) / (n * sums.xx - sums.x * sums.x);
    const intercept = (sums.y - slope * sums.x) / n;

    // Predict next 6 months
    const predictions = [];
    const lastMonth = monthlyData[monthlyData.length - 1]._id;

    for (let i = 1; i <= 6; i++) {
      const predictedMonth = lastMonth.month + i;
      const predictedYear = lastMonth.year + Math.floor((predictedMonth - 1) / 12);
      const normalizedMonth = ((predictedMonth - 1) % 12) + 1;

      const x = n + i - 1;
      const predicted = Math.round(Math.max(0, slope * x + intercept));

      predictions.push({
        date: `${predictedYear}-${String(normalizedMonth).padStart(2, '0')}`,
        predicted,
        trend: slope > 0 ? '增长' : '下降',
        changeRate: slope > 0 ? `+${slope.toFixed(1)}/月` : `${slope.toFixed(1)}/月`
      });
    }

    return predictions;
  }

  /**
   * Predict finance trends
   */
  async predictFinance(villageId) {
    const Finance = require('../models/Finance');

    const monthlyData = await Finance.aggregate([
      ...(villageId ? [{ $match: { villageId } }] : []),
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          income: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
          },
          expense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
          }
        }
      },
      { $sort: { '_id': 1 } },
      { $limit: 12 }
    ]);

    if (monthlyData.length < 3) {
      return [{ message: 'Insufficient data for prediction' }];
    }

    // Predict next 3 months
    const predictions = [];
    const lastMonth = monthlyData[monthlyData.length - 1]._id;

    for (let i = 1; i <= 3; i++) {
      const predictedMonth = lastMonth.month + i;
      const predictedYear = lastMonth.year + Math.floor((predictedMonth - 1) / 12);
      const normalizedMonth = ((predictedMonth - 1) % 12) + 1;

      // Use moving average for prediction
      const recentMonths = monthlyData.slice(-3);
      const avgIncome = recentMonths.reduce((sum, m) => sum + m.income, 0) / recentMonths.length;
      const avgExpense = recentMonths.reduce((sum, m) => sum + m.expense, 0) / recentMonths.length;

      predictions.push({
        date: `${predictedYear}-${String(normalizedMonth).padStart(2, '0')}`,
        predictedIncome: Math.round(avgIncome),
        predictedExpense: Math.round(avgExpense),
        predictedBalance: Math.round(avgIncome - avgExpense)
      });
    }

    return predictions;
  }

  /**
   * Predict emergency events based on historical patterns
   */
  async predictEmergency(villageId) {
    const Emergency = require('../models/Emergency');

    const stats = await Emergency.aggregate([
      ...(villageId ? [{ $match: { villageId } }] : []),
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgSeverity: { $avg: '$severity' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return stats.map(item => ({
      type: item._id,
      historicalCount: item.count,
      avgSeverity: item.avgSeverity?.toFixed(1) || 0,
      riskLevel: item.count > 10 ? '高' : item.count > 5 ? '中' : '低'
    }));
  }

  /**
   * Get date range based on time range string
   */
  getDateRange(timeRange) {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
  }

  /**
   * Clear analytics cache
   */
  async clearCache(pattern = '*') {
    const keys = await this.redis.keys(`${this.cachePrefix}${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    return keys.length;
  }
}

// Export singleton instance
module.exports = new DataAnalyticsService();
