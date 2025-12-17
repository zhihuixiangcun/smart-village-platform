/**
 * 村民行为分析服务
 * 分析村民行为模式、活动轨迹、偏好预测等
 */

const mongoose = require('mongoose');
const { format, subDays, startOfDay, endOfDay, eachDayOfInterval } = require('date-fns');

class BehaviorAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10分钟缓存
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
   * 村民活跃度分析
   */
  async getVillagerActivityAnalysis(villageId = null, timeRange = 'week') {
    const cacheKey = `villager_activity_${villageId}_${timeRange}`;

    return this.getCachedData(cacheKey, async () => {
      const timeRanges = {
        day: subDays(new Date(), 1),
        week: subDays(new Date(), 7),
        month: subDays(new Date(), 30),
        quarter: subDays(new Date(), 90)
      };

      const startDate = timeRanges[timeRange] || timeRanges.week;

      // 模拟用户活动数据
      const activityData = await this.generateUserActivityData(startDate, villageId);

      return {
        success: true,
        data: {
          overview: {
            totalUsers: activityData.totalUsers,
            activeUsers: activityData.activeUsers,
            newUsers: activityData.newUsers,
            retentionRate: activityData.retentionRate,
            avgSessionDuration: activityData.avgSessionDuration,
            peakActiveHour: activityData.peakActiveHour
          },
          dailyTrends: activityData.dailyTrends,
          hourlyDistribution: activityData.hourlyDistribution,
          userSegments: activityData.userSegments,
          featureUsage: activityData.featureUsage,
          activityPatterns: await this.analyzeActivityPatterns(activityData)
        }
      };
    });
  }

  /**
   * 生成用户活动数据
   */
  async generateUserActivityData(startDate, villageId) {
    const days = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));

    // 模拟数据生成
    const totalUsers = Math.floor(Math.random() * 500) + 1000;
    const activeUsers = Math.floor(totalUsers * (0.6 + Math.random() * 0.3));
    const newUsers = Math.floor(Math.random() * 50) + 10;
    const retentionRate = (Math.random() * 0.3 + 0.7).toFixed(3);
    const avgSessionDuration = Math.floor(Math.random() * 10) + 5;

    // 生成每日趋势数据
    const dailyTrends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      dailyTrends.push({
        date: format(date, 'yyyy-MM-dd'),
        activeUsers: Math.floor(activeUsers * (0.8 + Math.random() * 0.4)),
        newUsers: Math.floor(Math.random() * 10) + 1,
        sessionCount: Math.floor(Math.random() * 1000) + 500,
        avgDuration: Math.floor(Math.random() * 15) + 5
      });
    }

    // 生成小时分布数据
    const hourlyDistribution = [];
    for (let hour = 0; hour < 24; hour++) {
      let activityLevel = 0.1; // 基础活跃度

      // 模拟日常作息模式
      if (hour >= 7 && hour <= 9) activityLevel = 0.8; // 早上高峰
      else if (hour >= 12 && hour <= 14) activityLevel = 0.6; // 午休
      else if (hour >= 18 && hour <= 21) activityLevel = 0.9; // 晚上高峰
      else if (hour >= 22 || hour <= 6) activityLevel = 0.1; // 夜间

      hourlyDistribution.push({
        hour,
        activityCount: Math.floor(activeUsers * activityLevel),
        peak: activityLevel > 0.7
      });
    }

    // 用户分群
    const userSegments = [
      { segment: '高频用户', count: Math.floor(activeUsers * 0.2), percentage: 20, characteristics: ['每日登录', '高互动', '多功能使用'] },
      { segment: '中频用户', count: Math.floor(activeUsers * 0.5), percentage: 50, characteristics: ['每周登录', '中等互动', '核心功能使用'] },
      { segment: '低频用户', count: Math.floor(activeUsers * 0.3), percentage: 30, characteristics: ['偶尔登录', '低互动', '基础功能使用'] }
    ];

    // 功能使用统计
    const featureUsage = [
      { feature: '公告查看', usage: Math.floor(Math.random() * 1000) + 2000, trend: 'up' },
      { feature: '服务办理', usage: Math.floor(Math.random() * 500) + 800, trend: 'stable' },
      { feature: '费用缴纳', usage: Math.floor(Math.random() * 300) + 400, trend: 'up' },
      { feature: '信息查询', usage: Math.floor(Math.random() * 800) + 1200, trend: 'up' },
      { feature: '投诉建议', usage: Math.floor(Math.random() * 200) + 100, trend: 'down' },
      { feature: '村务参与', usage: Math.floor(Math.random() * 100) + 150, trend: 'up' }
    ];

    // 找出最活跃的小时
    const peakHour = hourlyDistribution.reduce((max, curr) =>
      curr.activityCount > max.activityCount ? curr : max
    ).hour;

    return {
      totalUsers,
      activeUsers,
      newUsers,
      retentionRate,
      avgSessionDuration,
      peakActiveHour: peakHour,
      dailyTrends,
      hourlyDistribution,
      userSegments,
      featureUsage
    };
  }

  /**
   * 分析活动模式
   */
  async analyzeActivityPatterns(activityData) {
    const patterns = {
      timePatterns: this.analyzeTimePatterns(activityData.hourlyDistribution),
      behaviorPatterns: this.analyzeBehaviorPatterns(activityData.userSegments),
      usagePatterns: this.analyzeUsagePatterns(activityData.featureUsage),
      retentionPatterns: this.analyzeRetentionPatterns(activityData.dailyTrends)
    };

    return patterns;
  }

  /**
   * 分析时间模式
   */
  analyzeTimePatterns(hourlyData) {
    const peakHours = hourlyData
      .filter(h => h.peak)
      .map(h => h.hour);

    const lowActivityHours = hourlyData
      .filter(h => h.activityCount < Math.max(...hourlyData.map(d => d.activityCount)) * 0.3)
      .map(h => h.hour);

    return {
      peakHours,
      lowActivityHours,
      recommendedPushTimes: [8, 12, 19], // 推荐推送时间
      bestEngagementWindow: '18:00-21:00'
    };
  }

  /**
   * 分析行为模式
   */
  analyzeBehaviorPatterns(userSegments) {
    const highFreqSegment = userSegments.find(s => s.segment === '高频用户');
    const lowFreqSegment = userSegments.find(s => s.segment === '低频用户');

    return {
      highFrequencyTraits: highFreqSegment?.characteristics || [],
      lowFrequencyTraits: lowFreqSegment?.characteristics || [],
      conversionOpportunities: [
        '功能引导教程',
        '个性化推荐',
        '社区互动激励'
      ],
      churnRisks: [
        '连续7天未登录',
        '功能使用单一',
        '反馈未回复'
      ]
    };
  }

  /**
   * 分析使用模式
   */
  analyzeUsagePatterns(featureUsage) {
    const mostUsedFeatures = featureUsage
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 3)
      .map(f => f.feature);

    const decliningFeatures = featureUsage
      .filter(f => f.trend === 'down')
      .map(f => f.feature);

    return {
      mostUsedFeatures,
      decliningFeatures,
      featureCorrelation: this.calculateFeatureCorrelation(),
      recommendedFeatures: ['智能推荐', '在线客服', '便民服务']
    };
  }

  /**
   * 分析留存模式
   */
  analyzeRetentionPatterns(dailyTrends) {
    const recentData = dailyTrends.slice(-7);
    const avgActiveUsers = recentData.reduce((sum, d) => sum + d.activeUsers, 0) / recentData.length;

    const dayToDayRetention = [];
    for (let i = 1; i < dailyTrends.length; i++) {
      const retention = dailyTrends[i].activeUsers / dailyTrends[i - 1].activeUsers;
      dayToDayRetention.push(retention);
    }

    const avgRetention = dayToDayRetention.reduce((sum, r) => sum + r, 0) / dayToDayRetention.length;

    return {
      averageRetentionRate: avgRetention,
      retentionStability: this.calculateRetentionStability(dayToDayRetention),
      criticalRetentionPoints: this.identifyRetentionDropPoints(dayToDayRetention),
      predictedRetention: this.predictRetention(dayToDayRetention)
    };
  }

  /**
   * 计算功能相关性
   */
  calculateFeatureCorrelation() {
    // 模拟功能使用相关性分析
    return {
      '公告查看': { '信息查询': 0.8, '服务办理': 0.6, '村务参与': 0.7 },
      '服务办理': { '费用缴纳': 0.9, '信息查询': 0.5, '投诉建议': 0.3 },
      '费用缴纳': { '服务办理': 0.9, '信息查询': 0.4, '公告查看': 0.2 }
    };
  }

  /**
   * 计算留存稳定性
   */
  calculateRetentionStability(retentionData) {
    const variance = retentionData.reduce((sum, r) => {
      const mean = retentionData.reduce((s, val) => s + val, 0) / retentionData.length;
      return sum + Math.pow(r - mean, 2);
    }, 0) / retentionData.length;

    const stdDev = Math.sqrt(variance);

    if (stdDev < 0.05) return 'high';
    if (stdDev < 0.1) return 'medium';
    return 'low';
  }

  /**
   * 识别留存下降点
   */
  identifyRetentionDropPoints(retentionData) {
    const dropPoints = [];
    const threshold = 0.8; // 80%以下视为下降

    retentionData.forEach((retention, index) => {
      if (retention < threshold) {
        dropPoints.push({
          day: index + 1,
          retentionRate: retention,
          severity: retention < 0.6 ? 'high' : 'medium'
        });
      }
    });

    return dropPoints;
  }

  /**
   * 预测留存率
   */
  predictRetention(retentionData) {
    // 简单的线性预测模型
    const recentData = retentionData.slice(-7);
    const trend = (recentData[recentData.length - 1] - recentData[0]) / recentData.length;
    const prediction = recentData[recentData.length - 1] + trend;

    return Math.max(0.5, Math.min(1, prediction));
  }

  /**
   * 村民偏好分析
   */
  async getVillagerPreferenceAnalysis(villageId = null) {
    const cacheKey = `villager_preference_${villageId}`;

    return this.getCachedData(cacheKey, async () => {
      // 模拟偏好分析数据
      const preferenceData = {
        contentPreferences: {
          announcementTypes: [
            { type: '政策通知', interest: 0.85, engagement: 'high' },
            { type: '村务公告', interest: 0.72, engagement: 'medium' },
            { type: '活动通知', interest: 0.68, engagement: 'medium' },
            { type: '便民信息', interest: 0.45, engagement: 'low' }
          ],
          serviceCategories: [
            { category: '证件办理', usage: 0.78, satisfaction: 4.2 },
            { category: '费用缴纳', usage: 0.65, satisfaction: 3.8 },
            { category: '信息查询', usage: 0.82, satisfaction: 4.5 },
            { category: '投诉建议', usage: 0.35, satisfaction: 3.2 }
          ],
          communicationChannels: [
            { channel: 'APP推送', effectiveness: 0.88, openRate: 0.75 },
            { channel: '短信通知', effectiveness: 0.92, openRate: 0.98 },
            { channel: '村务公告栏', effectiveness: 0.65, openRate: 0.45 },
            { channel: '微信群', effectiveness: 0.78, openRate: 0.82 }
          ]
        },
        demographicPreferences: {
          ageGroups: {
            '18-30岁': { preferredFeatures: ['移动支付', '在线办事', '社区互动'], engagementTime: 'evening' },
            '31-50岁': { preferredFeatures: ['证件办理', '信息查询', '费用缴纳'], engagementTime: 'noon' },
            '51-65岁': { preferredFeatures: ['公告查看', '电话服务', '线下办理'], engagementTime: 'morning' },
            '65岁以上': { preferredFeatures: ['便民服务', '健康咨询', '村务参与'], engagementTime: 'morning' }
          },
          occupations: {
            '务农': { preferredServices: ['农业政策', '天气预报', '农技指导'], seasonalPattern: true },
            '务工': { preferredServices: ['就业信息', '技能培训', '社保查询'], seasonalPattern: false },
            '经商': { preferredServices: ['营业执照', '税收政策', '市场信息'], seasonalPattern: false },
            '退休': { preferredServices: ['健康医疗', '文化活动', '养老服务'], seasonalPattern: false }
          }
        },
        behavioralInsights: {
          peakUsageTimes: ['08:00-09:00', '12:00-13:00', '19:00-21:00'],
          preferredContentLength: { min: 100, max: 500, optimal: 200 },
          interactionPatterns: {
            passiveUsers: { percentage: 35, preferredContent: 'informative' },
            interactiveUsers: { percentage: 45, preferredContent: 'participatory' },
            contributiveUsers: { percentage: 20, preferredContent: 'creative' }
          },
          seasonalTrends: {
            spring: ['春耕指导', '农资信息', '劳务输出'],
            summer: ['防汛防暑', '夏收指导', '农机服务'],
            autumn: ['秋收信息', '销售渠道', '政策补贴'],
            winter: ['冬储指导', '技能培训', '文化活动']
          }
        }
      };

      return {
        success: true,
        data: preferenceData,
        recommendations: this.generatePreferenceRecommendations(preferenceData)
      };
    });
  }

  /**
   * 生成偏好推荐
   */
  generatePreferenceRecommendations(preferenceData) {
    const recommendations = {
      contentStrategy: [
        '根据年龄群体定制内容形式和推送时间',
        '增加短视频和图文结合的内容形式',
        '提供个性化内容推荐算法'
      ],
      serviceOptimization: [
        '优化高频服务的用户体验',
        '简化老年人操作流程',
        '增加语音导航和客服支持'
      ],
      communicationImprovement: [
        '多渠道推送策略',
        '根据用户活跃时间定制推送',
        '提供消息订阅管理功能'
      ],
      seasonalCampaigns: [
        '春季：春耕备耕主题活动',
        '夏季：防汛抗旱宣传周',
        '秋季：丰收成果展示',
        '冬季：技能培训月'
      ]
    };

    return recommendations;
  }

  /**
   * 村民行为预测
   */
  async getBehaviorPredictionAnalysis(villageId = null, predictionType = 'engagement') {
    const cacheKey = `behavior_prediction_${villageId}_${predictionType}`;

    return this.getCachedData(cacheKey, async () => {
      let predictionData = {};

      switch (predictionType) {
      case 'engagement':
        predictionData = await this.predictEngagement(villageId);
        break;
      case 'churn':
        predictionData = await this.predictChurn(villageId);
        break;
      case 'feature_adoption':
        predictionData = await this.predictFeatureAdoption(villageId);
        break;
      case 'service_demand':
        predictionData = await this.predictServiceDemand(villageId);
        break;
      default:
        predictionData = await this.predictEngagement(villageId);
      }

      return {
        success: true,
        data: predictionData,
        metadata: {
          predictionType,
          confidence: predictionData.confidence || 0.85,
          modelVersion: '1.0.0',
          generatedAt: new Date()
        }
      };
    });
  }

  /**
   * 预测用户参与度
   */
  async predictEngagement(villageId) {
    // 模拟机器学习预测结果
    const predictions = [];
    const startDate = new Date();

    for (let i = 1; i <= 30; i++) {
      const futureDate = new Date(startDate);
      futureDate.setDate(startDate.getDate() + i);

      const baseEngagement = 0.7;
      const seasonalFactor = Math.sin((i / 30) * Math.PI * 2) * 0.1;
      const randomFactor = (Math.random() - 0.5) * 0.1;

      const predictedEngagement = Math.max(0.3, Math.min(1,
        baseEngagement + seasonalFactor + randomFactor
      ));

      predictions.push({
        date: format(futureDate, 'yyyy-MM-dd'),
        predictedEngagement,
        confidence: 0.8 + Math.random() * 0.15,
        factors: ['历史参与度', '季节性因素', '节假日影响']
      });
    }

    return {
      type: 'engagement_prediction',
      predictions,
      insights: {
        trend: 'stable',
        keyDrivers: ['内容相关性', '推送时效', '用户体验'],
        recommendations: [
          '在预测低参与度前增加互动活动',
          '优化推送内容和时间',
          '提升核心功能体验'
        ]
      },
      confidence: 0.82
    };
  }

  /**
   * 预测用户流失
   */
  async predictChurn(villageId) {
    // 模拟流失风险预测
    const riskSegments = [
      { segment: '高风险用户', count: 50, riskLevel: 'high', characteristics: ['30天未登录', '功能使用单一', '无互动'] },
      { segment: '中风险用户', count: 120, riskLevel: 'medium', characteristics: ['14天未登录', '低频使用', '反馈未回复'] },
      { segment: '低风险用户', count: 800, riskLevel: 'low', characteristics: ['活跃使用', '多功能', '高互动'] }
    ];

    const churnFactors = [
      { factor: '登录频率下降', weight: 0.35, impact: 'high' },
      { factor: '功能使用减少', weight: 0.25, impact: 'medium' },
      { factor: '互动减少', weight: 0.20, impact: 'medium' },
      { factor: '负面反馈增加', weight: 0.15, impact: 'high' },
      { factor: '竞品吸引力', weight: 0.05, impact: 'low' }
    ];

    return {
      type: 'churn_prediction',
      riskSegments,
      churnFactors,
      predictedChurnRate: 0.08,
      retentionStrategies: [
        '个性化推送和内容推荐',
        '优化用户体验和功能',
        '增加社区互动和激励机制',
        '主动客服和问题解决'
      ],
      confidence: 0.78
    };
  }

  /**
   * 预测功能采用率
   */
  async predictFeatureAdoption(villageId) {
    const features = [
      { name: '智能客服', currentAdoption: 0.15, predictedAdoption: 0.35, timeToAdoption: '3个月' },
      { name: '在线投票', currentAdoption: 0.08, predictedAdoption: 0.25, timeToAdoption: '6个月' },
      { name: '移动支付', currentAdoption: 0.45, predictedAdoption: 0.70, timeToAdoption: '2个月' },
      { name: '视频会议', currentAdoption: 0.05, predictedAdoption: 0.20, timeToAdoption: '8个月' },
      { name: 'AI助手', currentAdoption: 0.02, predictedAdoption: 0.40, timeToAdoption: '12个月' }
    ];

    return {
      type: 'feature_adoption_prediction',
      features,
      adoptionDrivers: [
        '功能易用性',
        '实际需求',
        '推广力度',
        '用户教育'
      ],
      recommendations: [
        '重点推广移动支付和智能客服',
        '简化视频会议操作流程',
        '加强AI助手功能宣传'
      ],
      confidence: 0.75
    };
  }

  /**
   * 预测服务需求
   */
  async predictServiceDemand(villageId) {
    const services = [
      { name: '证件办理', currentDemand: 150, predictedDemand: 180, trend: 'increasing' },
      { name: '费用缴纳', currentDemand: 80, predictedDemand: 120, trend: 'increasing' },
      { name: '信息查询', currentDemand: 300, predictedDemand: 280, trend: 'stable' },
      { name: '投诉建议', currentDemand: 25, predictedDemand: 35, trend: 'increasing' },
      { name: '技术支持', currentDemand: 40, predictedDemand: 60, trend: 'increasing' }
    ];

    return {
      type: 'service_demand_prediction',
      services,
      seasonalFactors: [
        { season: '春季', factor: 1.2, services: ['证件办理', '劳务输出'] },
        { season: '夏季', factor: 0.9, services: ['费用缴纳', '信息查询'] },
        { season: '秋季', factor: 1.1, services: ['证件办理', '费用缴纳'] },
        { season: '冬季', factor: 0.8, services: ['信息查询', '技术支持'] }
      ],
      resourcePlanning: {
        staffNeeded: 15,
        systemLoad: 'medium',
        recommendedScaling: '增加20%处理能力'
      },
      confidence: 0.80
    };
  }

  /**
   * 生成行为分析报告
   */
  async generateBehaviorReport(villageId = null, reportType = 'comprehensive') {
    const cacheKey = `behavior_report_${villageId}_${reportType}`;

    return this.getCachedData(cacheKey, async () => {
      const reportData = {
        activity: await this.getVillagerActivityAnalysis(villageId),
        preference: await this.getVillagerPreferenceAnalysis(villageId),
        prediction: await this.getBehaviorPredictionAnalysis(villageId, 'engagement')
      };

      const report = {
        title: `村民行为分析报告 - ${reportType === 'comprehensive' ? '综合版' : '简要版'}`,
        generatedAt: new Date(),
        period: {
          start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
          end: format(new Date(), 'yyyy-MM-dd')
        },
        summary: this.generateReportSummary(reportData),
        sections: reportType === 'comprehensive' ? [
          {
            title: '村民活跃度分析',
            data: reportData.activity.data,
            keyInsights: [
              '村民整体活跃度呈上升趋势',
              '晚间19-21点为最佳互动时间',
              '高频用户贡献了80%的互动'
            ]
          },
          {
            title: '偏好特征分析',
            data: reportData.preference.data,
            keyInsights: [
              '政策通知和便民信息最受欢迎',
              '移动支付成为主要交易方式',
              '年龄群体偏好差异明显'
            ]
          },
          {
            title: '行为预测分析',
            data: reportData.prediction.data,
            keyInsights: [
              '预计未来30天参与度保持稳定',
              '需要关注用户流失风险',
              '新功能采用率有望提升'
            ]
          }
        ] : [
          {
            title: '核心指标概览',
            data: {
              activeUsers: reportData.activity.data.overview.activeUsers,
              retentionRate: reportData.activity.data.overview.retentionRate,
              avgSessionDuration: reportData.activity.data.overview.avgSessionDuration
            },
            keyInsights: [
              '村民参与度整体良好',
              '用户体验持续优化',
              '留存率保持稳定'
            ]
          }
        ],
        recommendations: this.generateActionableRecommendations(reportData),
        appendix: {
          methodology: '基于用户行为数据分析和机器学习预测',
          dataSources: ['用户登录记录', '功能使用数据', '交互日志', '反馈数据'],
          confidenceLevel: '85%'
        }
      };

      return {
        success: true,
        data: report
      };
    });
  }

  /**
   * 生成报告摘要
   */
  generateReportSummary(reportData) {
    const activity = reportData.activity.data.overview;
    const preference = reportData.preference.data.contentPreferences;
    const prediction = reportData.prediction.data;

    return {
      keyMetrics: {
        activeUsers: activity.activeUsers,
        retentionRate: activity.retentionRate,
        avgSessionDuration: activity.avgSessionDuration,
        userSatisfaction: 4.2
      },
      topFindings: [
        `村民整体活跃度为${(activity.activeUsers / activity.totalUsers * 100).toFixed(1)}%`,
        `用户留存率达到${(activity.retentionRate * 100).toFixed(1)}%`,
        '晚间19-21点为用户活跃高峰期',
        '政策通知类内容最受关注',
        '移动支付功能使用率持续增长'
      ],
      riskFactors: [
        '低频用户需要更多引导',
        '部分功能用户体验有待提升',
        '节假日期间活跃度下降'
      ],
      opportunities: [
        '智能客服功能有较大推广空间',
        '个性化内容推荐可提升参与度',
        '社区互动功能有待加强'
      ]
    };
  }

  /**
   * 生成可操作建议
   */
  generateActionableRecommendations(reportData) {
    return {
      shortTerm: [
        '优化晚间19-21点推送策略',
        '简化高频服务操作流程',
        '增加新功能使用引导'
      ],
      mediumTerm: [
        '实施个性化内容推荐系统',
        '加强低频用户激活计划',
        '完善用户反馈处理机制'
      ],
      longTerm: [
        '建立完整的用户画像系统',
        '开发AI驱动的行为预测模型',
        '构建智能化的运营决策支持系统'
      ],
      priorityMatrix: [
        { action: '优化核心服务体验', priority: 'high', effort: 'medium', impact: 'high' },
        { action: '个性化推送优化', priority: 'high', effort: 'low', impact: 'medium' },
        { action: '低频用户激活', priority: 'medium', effort: 'high', impact: 'medium' },
        { action: 'AI客服推广', priority: 'medium', effort: 'medium', impact: 'high' },
        { action: '社区互动增强', priority: 'low', effort: 'high', impact: 'medium' }
      ]
    };
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new BehaviorAnalyticsService();