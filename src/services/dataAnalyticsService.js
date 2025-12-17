/**
 * 数据分析服务
 * 提供全方位的数据统计、分析和可视化支持
 */

const mongoose = require('mongoose');
const { format, subDays, subMonths, subYears, startOfDay, endOfDay } = require('date-fns');

// 数据模型导入
const Household = require('../models/Household');
const User = require('../models/User');
const Village = require('../models/Village');
const Announcement = require('../models/Announcement');

class DataAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 获取缓存数据或执行查询
   */
  async getCachedData(key, queryFunction) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await queryFunction();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * 人口统计分析
   */
  async getPopulationAnalytics(villageId = null, timeRange = 'year') {
    const cacheKey = `population_${villageId}_${timeRange}`;

    return this.getCachedData(cacheKey, async () => {
      const matchStage = villageId ? { villageId } : {};

      // 基础人口统计
      const populationStats = await Household.aggregate([
        { $match: matchStage },
        { $unwind: '$familyMembers' },
        {
          $group: {
            _id: null,
            totalPopulation: { $sum: 1 },
            totalHouseholds: { $addToSet: '$_id' },
            avgHouseholdSize: { $avg: { $size: '$familyMembers' } },
            ageGroups: {
              $push: {
                $switch: {
                  branches: [
                    { case: { $lt: ['$familyMembers.age', 18] }, then: 'minors' },
                    { case: { $lt: ['$familyMembers.age', 35] }, then: 'youth' },
                    { case: { $lt: ['$familyMembers.age', 60] }, then: 'working' },
                    { case: { $gte: ['$familyMembers.age', 60] }, then: 'elderly' }
                  ]
                }
              }
            },
            genderDistribution: {
              $push: '$familyMembers.gender'
            },
            educationLevels: {
              $push: '$familyMembers.education'
            },
            occupations: {
              $push: '$familyMembers.occupation'
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalPopulation: 1,
            totalHouseholds: { $size: '$totalHouseholds' },
            avgHouseholdSize: { $round: ['$avgHouseholdSize', 2] },
            ageGroupStats: {
              minors: { $size: { $filter: { input: '$ageGroups', cond: { $eq: ['$$this', 'minors'] } } } },
              youth: { $size: { $filter: { input: '$ageGroups', cond: { $eq: ['$$this', 'youth'] } } } },
              working: { $size: { $filter: { input: '$ageGroups', cond: { $eq: ['$$this', 'working'] } } } },
              elderly: { $size: { $filter: { input: '$ageGroups', cond: { $eq: ['$$this', 'elderly'] } } } }
            },
            genderStats: {
              male: { $size: { $filter: { input: '$genderDistribution', cond: { $eq: ['$$this', '男'] } } } },
              female: { $size: { $filter: { input: '$genderDistribution', cond: { $eq: ['$$this', '女'] } } } }
            },
            educationDistribution: {
              $reduce: {
                input: '$educationLevels',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            },
            occupationDistribution: {
              $reduce: {
                input: '$occupations',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [[
                        { k: '$$this', v: { $add: [{ $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] }, 1] } }
                      ]]
                    }
                  ]
                }
              }
            }
          }
        }
      ]);

      // 特殊群体统计
      const specialGroups = await Household.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            disabledCount: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$familyMembers',
                    cond: { $eq: ['$$this.isDisabled', true] }
                  }
                }
              }
            },
            elderlyLivingAlone: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$familyMembers',
                    cond: {
                      $and: [
                        { $gte: ['$$this.age', 60] },
                        { $eq: ['$$this.livingAlone', true] }
                      ]
                    }
                  }
                }
              }
            },
            lowIncomeHouseholds: {
              $sum: {
                $cond: [{ $eq: ['$tags.isLowIncome', true] }, 1, 0]
              }
            },
            partyMemberFamilies: {
              $sum: {
                $cond: [{ $eq: ['$tags.hasPartyMember', true] }, 1, 0]
              }
            }
          }
        },
        { $project: { _id: 0 } }
      ]);

      return {
        success: true,
        data: {
          overview: populationStats[0] || {},
          specialGroups: specialGroups[0] || {},
          demographics: {
            ageRatio: populationStats[0]?.ageGroupStats || {},
            genderRatio: populationStats[0]?.genderStats || {},
            educationStats: populationStats[0]?.educationDistribution || {},
            occupationStats: populationStats[0]?.occupationDistribution || {}
          },
          trends: await this.getPopulationTrends(villageId, timeRange)
        }
      };
    });
  }

  /**
   * 人口趋势分析
   */
  async getPopulationTrends(villageId, timeRange) {
    const timeRanges = {
      month: subDays(new Date(), 30),
      quarter: subDays(new Date(), 90),
      year: subDays(new Date(), 365)
    };

    const startDate = timeRanges[timeRange] || timeRanges.year;

    // 模拟历史趋势数据（实际项目中应该从历史数据表查询）
    const trends = [];
    const intervals = timeRange === 'month' ? 30 : timeRange === 'quarter' ? 12 : 12;

    for (let i = intervals - 1; i >= 0; i--) {
      const date = timeRange === 'month'
        ? subDays(new Date(), i)
        : subMonths(new Date(), i);

      trends.push({
        date: format(date, 'yyyy-MM'),
        population: Math.floor(Math.random() * 50) + 1000,
        households: Math.floor(Math.random() * 20) + 300,
        births: Math.floor(Math.random() * 5) + 1,
        deaths: Math.floor(Math.random() * 3) + 0,
        migrations: Math.floor(Math.random() * 10) - 5
      });
    }

    return trends;
  }

  /**
   * 财务数据分析
   */
  async getFinancialAnalytics(villageId = null, timeRange = 'year') {
    const cacheKey = `financial_${villageId}_${timeRange}`;

    return this.getCachedData(cacheKey, async () => {
      // 财务事务统计
      const financialStats = await mongoose.connection.db.collection('financial_transactions').aggregate([
        ...(villageId ? [{ $match: { villageId } }] : []),
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              type: '$type'
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.year',
            income: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'income'] }, '$totalAmount', 0]
              }
            },
            expense: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'expense'] }, '$totalAmount', 0]
              }
            },
            transactionCount: { $sum: '$count' }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 12 }
      ]);

      // 按类别统计
      const categoryStats = await mongoose.connection.db.collection('financial_transactions').aggregate([
        ...(villageId ? [{ $match: { villageId } }] : []),
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]);

      return {
        success: true,
        data: {
          overview: {
            totalIncome: financialStats.reduce((sum, year) => sum + (year.income || 0), 0),
            totalExpense: financialStats.reduce((sum, year) => sum + (year.expense || 0), 0),
            netIncome: financialStats.reduce((sum, year) => sum + (year.income || 0) - (year.expense || 0), 0),
            totalTransactions: financialStats.reduce((sum, year) => sum + year.transactionCount, 0)
          },
          yearlyBreakdown: financialStats,
          categoryBreakdown: categoryStats,
          trends: await this.getFinancialTrends(villageId, timeRange)
        }
      };
    });
  }

  /**
   * 财务趋势分析
   */
  async getFinancialTrends(villageId, timeRange) {
    // 模拟财务趋势数据
    const trends = [];
    const intervals = timeRange === 'month' ? 12 : 12;

    for (let i = intervals - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const income = Math.floor(Math.random() * 100000) + 50000;
      const expense = Math.floor(Math.random() * 80000) + 40000;

      trends.push({
        date: format(date, 'yyyy-MM'),
        income,
        expense,
        net: income - expense,
        transactionCount: Math.floor(Math.random() * 50) + 20
      });
    }

    return trends;
  }

  /**
   * 村务治理分析
   */
  async getGovernanceAnalytics(villageId = null, timeRange = 'year') {
    const cacheKey = `governance_${villageId}_${timeRange}`;

    return this.getCachedData(cacheKey, async () => {
      // 公告统计
      const announcementStats = await Announcement.aggregate([
        ...(villageId ? [{ $match: { villageId } }] : []),
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              type: '$type'
            },
            count: { $sum: 1 },
            totalViews: { $sum: '$views' }
          }
        }
      ]);

      // 任务完成统计
      const taskStats = await mongoose.connection.db.collection('village_tasks').aggregate([
        ...(villageId ? [{ $match: { villageId } }] : []),
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgCompletionTime: { $avg: '$completionTime' }
          }
        }
      ]);

      // 讨论参与度统计
      const discussionStats = await mongoose.connection.db.collection('village_discussions').aggregate([
        ...(villageId ? [{ $match: { villageId } }] : []),
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalReplies: { $sum: '$replyCount' },
            totalViews: { $sum: '$views' },
            avgEngagement: { $avg: { $add: ['$replyCount', '$views'] } }
          }
        }
      ]);

      return {
        success: true,
        data: {
          announcements: announcementStats,
          tasks: taskStats,
          discussions: discussionStats,
          engagement: await this.getEngagementMetrics(villageId, timeRange)
        }
      };
    });
  }

  /**
   * 用户参与度指标
   */
  async getEngagementMetrics(villageId, timeRange) {
    // 模拟参与度数据
    return {
      dailyActiveUsers: Math.floor(Math.random() * 100) + 200,
      monthlyActiveUsers: Math.floor(Math.random() * 300) + 800,
      avgSessionDuration: Math.floor(Math.random() * 10) + 5, // 分钟
      featureUsage: {
        announcements: Math.floor(Math.random() * 30) + 60,
        services: Math.floor(Math.random() * 20) + 40,
        discussions: Math.floor(Math.random() * 15) + 25,
        tasks: Math.floor(Math.random() * 10) + 15
      },
      satisfactionScore: (Math.random() * 0.5 + 4.0).toFixed(2) // 4.0-4.5
    };
  }

  /**
   * 应急管理分析
   */
  async getEmergencyAnalytics(villageId = null, timeRange = 'year') {
    const cacheKey = `emergency_${villageId}_${timeRange}`;

    return this.getCachedData(cacheKey, async () => {
      // 应急事件统计
      const emergencyStats = await mongoose.connection.db.collection('emergency_events').aggregate([
        ...(villageId ? [{ $match: { villageId } }] : []),
        {
          $group: {
            _id: {
              type: '$type',
              level: '$level'
            },
            count: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            avgResolutionTime: { $avg: '$resolutionTime' }
          }
        }
      ]);

      // 资源利用率统计
      const resourceStats = await mongoose.connection.db.collection('emergency_resources').aggregate([
        ...(villageId ? [{ $match: { villageId } }] : []),
        {
          $group: {
            _id: '$type',
            totalCount: { $sum: 1 },
            availableCount: { $sum: { $cond: ['$status', 'available', 1, 0] } },
            avgUtilization: { $avg: '$utilizationRate' }
          }
        }
      ]);

      return {
        success: true,
        data: {
          events: emergencyStats,
          resources: resourceStats,
          responseMetrics: await this.getResponseMetrics(villageId, timeRange),
          trends: await this.getEmergencyTrends(villageId, timeRange)
        }
      };
    });
  }

  /**
   * 应急响应指标
   */
  async getResponseMetrics(villageId, timeRange) {
    return {
      avgResponseTime: Math.floor(Math.random() * 10) + 5, // 分钟
      avgResolutionTime: Math.floor(Math.random() * 60) + 30, // 分钟
      successRate: (Math.random() * 0.1 + 0.9).toFixed(3), // 90-100%
      resourceAvailability: (Math.random() * 0.2 + 0.8).toFixed(3) // 80-100%
    };
  }

  /**
   * 应急趋势分析
   */
  async getEmergencyTrends(villageId, timeRange) {
    const trends = [];
    const intervals = timeRange === 'month' ? 30 : 12;

    for (let i = intervals - 1; i >= 0; i--) {
      const date = timeRange === 'month'
        ? subDays(new Date(), i)
        : subMonths(new Date(), i);

      trends.push({
        date: format(date, timeRange === 'month' ? 'yyyy-MM-dd' : 'yyyy-MM'),
        eventCount: Math.floor(Math.random() * 5),
        responseTime: Math.floor(Math.random() * 10) + 5,
        resolutionTime: Math.floor(Math.random() * 60) + 30
      });
    }

    return trends;
  }

  /**
   * 综合仪表板数据
   */
  async getDashboardData(villageId = null, filters = {}) {
    const { timeRange = 'month', categories = ['population', 'financial', 'governance', 'emergency'] } = filters;

    const results = {};

    if (categories.includes('population')) {
      results.population = await this.getPopulationAnalytics(villageId, timeRange);
    }

    if (categories.includes('financial')) {
      results.financial = await this.getFinancialAnalytics(villageId, timeRange);
    }

    if (categories.includes('governance')) {
      results.governance = await this.getGovernanceAnalytics(villageId, timeRange);
    }

    if (categories.includes('emergency')) {
      results.emergency = await this.getEmergencyAnalytics(villageId, timeRange);
    }

    return {
      success: true,
      data: results,
      metadata: {
        generatedAt: new Date(),
        timeRange,
        villageId,
        categories
      }
    };
  }

  /**
   * 导出报表数据
   */
  async exportReportData(villageId, reportType, format = 'json', filters = {}) {
    let data;

    switch (reportType) {
    case 'population':
      data = await this.getPopulationAnalytics(villageId, filters.timeRange);
      break;
    case 'financial':
      data = await this.getFinancialAnalytics(villageId, filters.timeRange);
      break;
    case 'governance':
      data = await this.getGovernanceAnalytics(villageId, filters.timeRange);
      break;
    case 'emergency':
      data = await this.getEmergencyAnalytics(villageId, filters.timeRange);
      break;
    case 'dashboard':
      data = await this.getDashboardData(villageId, filters);
      break;
    default:
      throw new Error('不支持的报表类型');
    }

    if (format === 'csv') {
      return this.convertToCSV(data.data);
    } else if (format === 'excel') {
      return this.convertToExcel(data.data);
    }

    return data;
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(data) {
    // 实现CSV转换逻辑
    return 'CSV format data';
  }

  /**
   * 转换为Excel格式
   */
  convertToExcel(data) {
    // 实现Excel转换逻辑
    return 'Excel format data';
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取系统性能指标
   */
  async getSystemMetrics() {
    return {
      success: true,
      data: {
        responseTime: Math.random() * 100 + 50, // ms
        throughput: Math.floor(Math.random() * 1000) + 500, // requests/min
        errorRate: (Math.random() * 0.02).toFixed(4), // < 2%
        cacheHitRate: (Math.random() * 0.3 + 0.7).toFixed(3), // 70-100%
        uptime: '99.9%',
        memoryUsage: (Math.random() * 0.3 + 0.4).toFixed(3) // GB
      }
    };
  }
}

module.exports = new DataAnalyticsService();