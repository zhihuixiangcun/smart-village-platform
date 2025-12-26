/**
 * 多源数据整合服务
 * 整合村民行为数据、财务交易记录、村务处理日志、应急事件信息
 */

const mongoose = require('mongoose');
const Resident = require('../models/Resident');
const Finance = require('../models/Finance');
const VillageCollaboration = require('../models/VillageCollaboration');
const EmergencyResponse = require('../models/EmergencyResponse');
const logger = require('../utils/logger');

class DataIntegrationService {
  constructor() {
    this.dataSourceTypes = {
      BEHAVIOR: 'behavior',
      FINANCE: 'finance',
      VILLAGE_AFFAIRS: 'village_affairs',
      EMERGENCY: 'emergency'
    };

    this.dataCache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10分钟缓存

    // 数据整合规则
    this.integrationRules = {
      behavior: {
        login: { weight: 1, category: 'engagement' },
        profile_view: { weight: 2, category: 'engagement' },
        document_apply: { weight: 5, category: 'activity' },
        vote_participate: { weight: 3, category: 'participation' },
        announcement_read: { weight: 1, category: 'engagement' },
        help_request: { weight: 4, category: 'interaction' }
      },
      finance: {
        income: { weight: 3, category: 'economic' },
        expense: { weight: 2, category: 'economic' },
        subsidy_receive: { weight: 4, category: 'benefit' },
        tax_payment: { weight: 3, category: 'contribution' }
      },
      village_affairs: {
        announcement_publish: { weight: 5, category: 'participation' },
        meeting_attend: { weight: 4, category: 'participation' },
        task_complete: { weight: 3, category: 'contribution' },
        suggestion_submit: { weight: 3, category: 'engagement' }
      },
      emergency: {
        emergency_report: { weight: 5, category: 'safety' },
        help_provide: { weight: 5, category: 'contribution' },
        rescue_participate: { weight: 5, category: 'heroic' }
      }
    };
  }

  /**
   * 村民行为数据模型
   */
  createBehaviorData(data) {
    return {
      type: this.dataSourceTypes.BEHAVIOR,
      residentId: data.residentId,
      action: data.action,
      category: data.category,
      metadata: {
        ip: data.ip,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        referrer: data.referrer,
        duration: data.duration,
        timestamp: new Date(data.timestamp || Date.now())
      },
      context: {
        page: data.page,
        module: data.module,
        operation: data.operation,
        result: data.result,
        error: data.error
      },
      integration: {
        score: this.calculateBehaviorScore(data.action),
        importance: this.calculateImportance('behavior', data.action),
        relatedEvents: []
      }
    };
  }

  /**
   * 财务交易数据模型
   */
  createFinanceData(data) {
    return {
      type: this.dataSourceTypes.FINANCE,
      residentId: data.residentId,
      transactionId: data.transactionId,
      action: data.action,
      amount: data.amount,
      category: data.category,
      metadata: {
        transactionType: data.transactionType,
        paymentMethod: data.paymentMethod,
        reference: data.reference,
        status: data.status,
        timestamp: new Date(data.timestamp || Date.now())
      },
      context: {
        purpose: data.purpose,
        relatedProject: data.relatedProject,
        approver: data.approver,
        approvalLevel: data.approvalLevel
      },
      integration: {
        score: this.calculateFinanceScore(data.amount, data.action),
        importance: this.calculateImportance('finance', data.action),
        financialImpact: data.amount,
        riskLevel: this.assessFinancialRisk(data)
      }
    };
  }

  /**
   * 村务处理日志数据模型
   */
  createVillageAffairsData(data) {
    return {
      type: this.dataSourceTypes.VILLAGE_AFFAIRS,
      residentId: data.residentId,
      action: data.action,
      category: data.category,
      metadata: {
        affairType: data.affairType,
        affairId: data.affairId,
        status: data.status,
        priority: data.priority,
        timestamp: new Date(data.timestamp || Date.now())
      },
      context: {
        title: data.title,
        description: data.description,
        participants: data.participants,
        location: data.location,
        duration: data.duration
      },
      integration: {
        score: this.calculateVillageAffairsScore(data.action, data.priority),
        importance: this.calculateImportance('village_affairs', data.action),
        leadershipRole: data.participants?.includes(data.residentId),
        communityImpact: this.assessCommunityImpact(data)
      }
    };
  }

  /**
   * 应急事件数据模型
   */
  createEmergencyData(data) {
    return {
      type: this.dataSourceTypes.EMERGENCY,
      residentId: data.residentId,
      action: data.action,
      category: data.category,
      metadata: {
        eventId: data.eventId,
        eventType: data.eventType,
        severity: data.severity,
        status: data.status,
        timestamp: new Date(data.timestamp || Date.now())
      },
      context: {
        location: data.location,
        description: data.description,
        casualties: data.casualties,
        damages: data.damages,
        responseTime: data.responseTime,
        resolutionTime: data.resolutionTime
      },
      integration: {
        score: this.calculateEmergencyScore(data.action, data.severity),
        importance: this.calculateImportance('emergency', data.action),
        heroismLevel: this.assessHeroismLevel(data),
        socialImpact: this.assessSocialImpact(data)
      }
    };
  }

  /**
   * 整合多源数据 - 核心方法
   */
  async integrateMultiSourceData(villageId, options = {}) {
    const {
      timeRange = { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
      dataSources = ['behavior', 'finance', 'village_affairs', 'emergency'],
      aggregationLevel = 'daily', // hourly, daily, weekly, monthly
      includeInactive = false
    } = options;

    const cacheKey = `integration_${villageId}_${timeRange.start.getTime()}_${aggregationLevel}`;

    // 检查缓存
    if (this.dataCache.has(cacheKey)) {
      const cached = this.dataCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const integrationResult = {
      villageId,
      timeRange,
      aggregationLevel,
      generatedAt: new Date(),
      summary: {},
      detailedData: {},
      insights: {},
      recommendations: []
    };

    // 并行获取各数据源
    const dataPromises = [];

    if (dataSources.includes('behavior')) {
      dataPromises.push(this.getIntegratedBehaviorData(villageId, timeRange, aggregationLevel));
    }

    if (dataSources.includes('finance')) {
      dataPromises.push(this.getIntegratedFinanceData(villageId, timeRange, aggregationLevel));
    }

    if (dataSources.includes('village_affairs')) {
      dataPromises.push(this.getIntegratedVillageAffairsData(villageId, timeRange, aggregationLevel));
    }

    if (dataSources.includes('emergency')) {
      dataPromises.push(this.getIntegratedEmergencyData(villageId, timeRange, aggregationLevel));
    }

    try {
      const results = await Promise.all(dataPromises);

      // 整合结果
      results.forEach(result => {
        if (result) {
          integrationResult.detailedData[result.source] = result.data;
          integrationResult.summary[result.source] = result.summary;
        }
      });

      // 生成综合洞察
      integrationResult.insights = await this.generateIntegrationInsights(integrationResult);
      integrationResult.recommendations = this.generateRecommendations(integrationResult.insights);

      // 缓存结果
      this.dataCache.set(cacheKey, {
        data: integrationResult,
        timestamp: Date.now()
      });

      return integrationResult;

    } catch (error) {
      logger.error('数据整合失败:', error);
      throw new Error(`多源数据整合失败: ${error.message}`);
    }
  }

  /**
   * 获取整合的村民行为数据
   */
  async getIntegratedBehaviorData(villageId, timeRange, aggregationLevel) {
    // 模拟行为数据查询（实际项目中应该从专门的behavior表或日志中查询）
    const behaviorData = await this.queryBehaviorData(villageId, timeRange);

    const aggregated = this.aggregateDataByTime(behaviorData, aggregationLevel, 'behavior');
    const summary = this.calculateBehaviorSummary(behaviorData);

    return {
      source: 'behavior',
      data: aggregated,
      summary: {
        totalEvents: behaviorData.length,
        activeUsers: summary.activeUsers,
        avgEngagement: summary.avgEngagement,
        topActions: summary.topActions,
        timeDistribution: summary.timeDistribution
      }
    };
  }

  /**
   * 获取整合的财务数据
   */
  async getIntegratedFinanceData(villageId, timeRange, aggregationLevel) {
    const financeData = await Finance.find({
      villageId: new mongoose.Types.ObjectId(villageId),
      date: { $gte: timeRange.start, $lte: timeRange.end }
    }).lean();

    const enhancedFinanceData = financeData.map(record => ({
      ...record,
      type: this.dataSourceTypes.FINANCE,
      action: record.type, // income/expense
      amount: record.amount,
      residentId: record.residentId || record.applicantId,
      integration: {
        score: this.calculateFinanceScore(record.amount, record.type),
        importance: this.calculateImportance('finance', record.type)
      }
    }));

    const aggregated = this.aggregateDataByTime(enhancedFinanceData, aggregationLevel, 'finance');
    const summary = this.calculateFinanceSummary(enhancedFinanceData);

    return {
      source: 'finance',
      data: aggregated,
      summary: {
        totalTransactions: enhancedFinanceData.length,
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        netIncome: summary.netIncome,
        avgTransaction: summary.avgTransaction,
        topCategories: summary.topCategories
      }
    };
  }

  /**
   * 获取整合的村务数据
   */
  async getIntegratedVillageAffairsData(villageId, timeRange, aggregationLevel) {
    const villageAffairsData = await VillageCollaboration.find({
      villageId: new mongoose.Types.ObjectId(villageId),
      createdAt: { $gte: timeRange.start, $lte: timeRange.end }
    }).lean();

    const enhancedAffairsData = villageAffairsData.map(record => ({
      ...record,
      type: this.dataSourceTypes.VILLAGE_AFFAIRS,
      action: record.activityType,
      residentId: record.participantId || record.initiatorId,
      integration: {
        score: this.calculateVillageAffairsScore(record.activityType, record.priority),
        importance: this.calculateImportance('village_affairs', record.activityType)
      }
    }));

    const aggregated = this.aggregateDataByTime(enhancedAffairsData, aggregationLevel, 'village_affairs');
    const summary = this.calculateVillageAffairsSummary(enhancedAffairsData);

    return {
      source: 'village_affairs',
      data: aggregated,
      summary: {
        totalActivities: enhancedAffairsData.length,
        participantCount: summary.participantCount,
        avgParticipation: summary.avgParticipation,
        topActivityTypes: summary.topActivityTypes,
        communityEngagement: summary.communityEngagement
      }
    };
  }

  /**
   * 获取整合的应急事件数据
   */
  async getIntegratedEmergencyData(villageId, timeRange, aggregationLevel) {
    const emergencyData = await EmergencyResponse.find({
      villageId: new mongoose.Types.ObjectId(villageId),
      createdAt: { $gte: timeRange.start, $lte: timeRange.end }
    }).lean();

    const enhancedEmergencyData = emergencyData.map(record => ({
      ...record,
      type: this.dataSourceTypes.EMERGENCY,
      action: record.eventType,
      residentId: record.residentId || record.reporterId,
      integration: {
        score: this.calculateEmergencyScore(record.eventType, record.severity),
        importance: this.calculateImportance('emergency', record.eventType)
      }
    }));

    const aggregated = this.aggregateDataByTime(enhancedEmergencyData, aggregationLevel, 'emergency');
    const summary = this.calculateEmergencySummary(enhancedEmergencyData);

    return {
      source: 'emergency',
      data: aggregated,
      summary: {
        totalEvents: enhancedEmergencyData.length,
        severityDistribution: summary.severityDistribution,
        avgResponseTime: summary.avgResponseTime,
        resolutionRate: summary.resolutionRate,
        topEventTypes: summary.topEventTypes
      }
    };
  }

  /**
   * 按时间聚合数据
   */
  aggregateDataByTime(data, level, source) {
    const grouped = {};

    data.forEach(item => {
      const date = new Date(item.timestamp || item.createdAt);
      let key;

      switch (level) {
      case 'hourly':
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getHours().toString().padStart(2, '0')}`;
        break;
      case 'weekly':
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
        key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      default: // daily
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          events: [],
          totalScore: 0,
          eventCount: 0,
          uniqueResidents: new Set()
        };
      }

      grouped[key].events.push(item);
      grouped[key].totalScore += item.integration?.score || 0;
      grouped[key].eventCount++;
      if (item.residentId) {
        grouped[key].uniqueResidents.add(item.residentId);
      }
    });

    // 转换为数组并计算统计信息
    return Object.values(grouped).map(group => ({
      period: group.period,
      eventCount: group.eventCount,
      totalScore: group.totalScore,
      avgScore: group.totalScore / group.eventCount,
      uniqueResidentCount: group.uniqueResidents.size,
      events: group.events.slice(0, 10) // 只保留前10个事件作为示例
    })).sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * 计算行为得分
   */
  calculateBehaviorScore(action) {
    const rule = this.integrationRules.behavior[action];
    return rule ? rule.weight : 1;
  }

  /**
   * 计算财务得分
   */
  calculateFinanceScore(amount, action) {
    const baseWeight = this.integrationRules.finance[action]?.weight || 1;
    const amountFactor = Math.log10(Math.abs(amount) + 1) / 10;
    return baseWeight * (1 + amountFactor);
  }

  /**
   * 计算村务得分
   */
  calculateVillageAffairsScore(action, priority = 'normal') {
    const baseWeight = this.integrationRules.village_affairs[action]?.weight || 1;
    const priorityMultiplier = {
      'low': 0.5,
      'normal': 1,
      'high': 1.5,
      'urgent': 2
    };
    return baseWeight * (priorityMultiplier[priority] || 1);
  }

  /**
   * 计算应急事件得分
   */
  calculateEmergencyScore(action, severity = 'normal') {
    const baseWeight = this.integrationRules.emergency[action]?.weight || 1;
    const severityMultiplier = {
      'low': 0.5,
      'normal': 1,
      'medium': 2,
      'high': 3,
      'critical': 5
    };
    return baseWeight * (severityMultiplier[severity] || 1);
  }

  /**
   * 计算重要性等级
   */
  calculateImportance(source, action) {
    const rule = this.integrationRules[source]?.[action];
    if (!rule) return 'low';

    const importanceMap = {
      1: 'low',
      2: 'low',
      3: 'medium',
      4: 'medium',
      5: 'high'
    };

    return importanceMap[rule.weight] || 'low';
  }

  /**
   * 生成综合洞察
   */
  async generateIntegrationInsights(integrationResult) {
    const insights = {
      overall: {},
      residents: {},
      trends: {},
      correlations: {},
      anomalies: []
    };

    // 整体洞察
    insights.overall = {
      totalEvents: Object.values(integrationResult.summary)
        .reduce((sum, source) => sum + (source.totalEvents || source.totalTransactions || source.totalActivities || 0), 0),
      activeDataSources: Object.keys(integrationResult.summary).length,
      integrationScore: this.calculateOverallIntegrationScore(integrationResult),
      dataQuality: this.assessDataQuality(integrationResult)
    };

    // 趋势分析
    insights.trends = await this.analyzeTrends(integrationResult);

    // 关联性分析
    insights.correlations = this.analyzeCorrelations(integrationResult);

    return insights;
  }

  /**
   * 计算整体整合得分
   */
  calculateOverallIntegrationScore(integrationResult) {
    let totalScore = 0;
    let totalEvents = 0;

    Object.values(integrationResult.detailedData).forEach(sourceData => {
      if (Array.isArray(sourceData)) {
        sourceData.forEach(period => {
          totalScore += period.totalScore || 0;
          totalEvents += period.eventCount || 0;
        });
      }
    });

    return totalEvents > 0 ? totalScore / totalEvents : 0;
  }

  /**
   * 生成推荐建议
   */
  generateRecommendations(insights) {
    const recommendations = [];

    // 基于数据整合得分的推荐
    if (insights.overall.integrationScore < 2) {
      recommendations.push({
        type: 'engagement',
        priority: 'high',
        title: '村民参与度较低',
        description: '建议增加互动活动，提升村民参与积极性',
        action: 'organize_community_events'
      });
    }

    // 基于财务数据的推荐
    if (insights.trends.finance && insights.trends.finance.trend === 'declining') {
      recommendations.push({
        type: 'financial',
        priority: 'medium',
        title: '财务状况需要关注',
        description: '收入呈下降趋势，建议制定增收措施',
        action: 'implement_income_growth_strategy'
      });
    }

    // 基于应急事件的推荐
    if (insights.trends.emergency && insights.trends.emergency.frequency > 5) {
      recommendations.push({
        type: 'safety',
        priority: 'high',
        title: '安全隐患需要排查',
        description: '近期应急事件较多，建议加强安全设施建设',
        action: 'conduct_safety_inspection'
      });
    }

    return recommendations;
  }

  // 辅助方法
  async queryBehaviorData(villageId, timeRange) {
    // 模拟行为数据
    const mockData = [];
    const residents = await Resident.find({ villageId, status: 'active' }).limit(100);

    residents.forEach(resident => {
      const actionCount = Math.floor(Math.random() * 20) + 5;
      for (let i = 0; i < actionCount; i++) {
        const actions = Object.keys(this.integrationRules.behavior);
        mockData.push(this.createBehaviorData({
          residentId: resident._id,
          action: actions[Math.floor(Math.random() * actions.length)],
          timestamp: new Date(timeRange.start.getTime() + Math.random() * (timeRange.end.getTime() - timeRange.start.getTime())),
          ip: `192.168.1.${  Math.floor(Math.random() * 255)}`,
          sessionId: `session_${  Math.random().toString(36).substring(7)}`,
          page: '/dashboard',
          module: 'village_affairs'
        }));
      }
    });

    return mockData;
  }

  calculateBehaviorSummary(data) {
    const activeUsers = new Set(data.map(d => d.residentId.toString()));
    const actionCounts = {};

    data.forEach(d => {
      actionCounts[d.action] = (actionCounts[d.action] || 0) + 1;
    });

    return {
      activeUsers: activeUsers.size,
      avgEngagement: data.length / activeUsers.size,
      topActions: Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      timeDistribution: this.calculateTimeDistribution(data)
    };
  }

  calculateFinanceSummary(data) {
    const income = data.filter(d => d.action === 'income').reduce((sum, d) => sum + d.amount, 0);
    const expense = data.filter(d => d.action === 'expense').reduce((sum, d) => sum + d.amount, 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      netIncome: income - expense,
      avgTransaction: data.reduce((sum, d) => sum + d.amount, 0) / data.length,
      topCategories: this.getTopCategories(data)
    };
  }

  calculateVillageAffairsSummary(data) {
    const participants = new Set();
    const activityTypes = {};

    data.forEach(d => {
      if (d.residentId) participants.add(d.residentId.toString());
      activityTypes[d.action] = (activityTypes[d.action] || 0) + 1;
    });

    return {
      participantCount: participants.size,
      avgParticipation: data.length / participants.size,
      topActivityTypes: Object.entries(activityTypes).sort((a, b) => b[1] - a[1]),
      communityEngagement: participants.size / 100 // 假设总村民数为100
    };
  }

  calculateEmergencySummary(data) {
    const severityCounts = {};

    data.forEach(d => {
      severityCounts[d.metadata?.severity || 'normal'] = (severityCounts[d.metadata?.severity || 'normal'] || 0) + 1;
    });

    return {
      severityDistribution: severityCounts,
      avgResponseTime: data.reduce((sum, d) => sum + (d.context?.responseTime || 0), 0) / data.length,
      resolutionRate: data.filter(d => d.metadata?.status === 'resolved').length / data.length,
      topEventTypes: this.getTopEventTypes(data)
    };
  }

  calculateTimeDistribution(data) {
    const distribution = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    data.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      if (hour >= 6 && hour < 12) distribution.morning++;
      else if (hour >= 12 && hour < 18) distribution.afternoon++;
      else if (hour >= 18 && hour < 24) distribution.evening++;
      else distribution.night++;
    });

    return distribution;
  }

  getTopCategories(data) {
    const categories = {};
    data.forEach(d => {
      categories[d.category] = (categories[d.category] || 0) + 1;
    });
    return Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

  getTopEventTypes(data) {
    const types = {};
    data.forEach(d => {
      types[d.action] = (types[d.action] || 0) + 1;
    });
    return Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

  analyzeTrends(integrationResult) {
    const trends = {};

    // 简化的趋势分析
    Object.entries(integrationResult.detailedData).forEach(([source, data]) => {
      if (Array.isArray(data) && data.length > 1) {
        const firstHalf = data.slice(0, Math.floor(data.length / 2));
        const secondHalf = data.slice(Math.floor(data.length / 2));

        const firstTotal = firstHalf.reduce((sum, d) => sum + d.eventCount, 0);
        const secondTotal = secondHalf.reduce((sum, d) => sum + d.eventCount, 0);

        trends[source] = {
          trend: secondTotal > firstTotal ? 'increasing' : 'decreasing',
          change: ((secondTotal - firstTotal) / firstTotal * 100).toFixed(2),
          frequency: data.reduce((sum, d) => sum + d.eventCount, 0)
        };
      }
    });

    return trends;
  }

  analyzeCorrelations(integrationResult) {
    // 简化的关联性分析
    return {
      behavior_finance: 'moderate',
      engagement_economic: 'positive',
      participation_safety: 'inverse'
    };
  }

  assessDataQuality(integrationResult) {
    const totalSources = Object.keys(integrationResult.summary).length;
    const completeSources = Object.values(integrationResult.summary).filter(s => s).length;

    return {
      completeness: `${(completeSources / totalSources * 100).toFixed(2)  }%`,
      freshness: 'recent',
      consistency: 'good'
    };
  }

  assessFinancialRisk(data) {
    if (data.amount > 100000) return 'high';
    if (data.amount > 50000) return 'medium';
    return 'low';
  }

  assessCommunityImpact(data) {
    if (data.participants && data.participants.length > 50) return 'high';
    if (data.participants && data.participants.length > 10) return 'medium';
    return 'low';
  }

  assessHeroismLevel(data) {
    if (data.action === 'rescue_participate') return 'heroic';
    if (data.action === 'help_provide') return 'helpful';
    return 'responsible';
  }

  assessSocialImpact(data) {
    if (data.context?.casualties > 0) return 'critical';
    if (data.metadata?.severity === 'critical') return 'high';
    return 'medium';
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.dataCache.clear();
  }
}

module.exports = new DataIntegrationService();