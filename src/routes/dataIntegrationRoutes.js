/**
 * 多源数据整合API路由
 * 整合村民行为数据、财务交易记录、村务处理日志、应急事件信息
 */

const express = require('express');
const router = express.Router();
const dataIntegrationService = require('../services/dataIntegrationService');
const BehaviorLog = require('../models/BehaviorLog');
const Resident = require('../models/Resident');
const auth = require('../middleware/auth');

/**
 * 获取多源数据整合报告
 * GET /api/v1/data-integration/report/:villageId
 */
router.get('/report/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      dataSources = 'behavior,finance,village_affairs,emergency',
      aggregationLevel = 'daily'
    } = req.query;

    const timeRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const integrationReport = await dataIntegrationService.integrateMultiSourceData(villageId, {
      timeRange,
      dataSources: dataSources.split(','),
      aggregationLevel
    });

    res.json({
      success: true,
      data: integrationReport,
      requestInfo: {
        villageId,
        timeRange,
        dataSources: dataSources.split(','),
        aggregationLevel,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('获取数据整合报告失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据整合报告失败',
      error: error.message
    });
  }
});

/**
 * 记录村民行为数据
 * POST /api/v1/data-integration/behavior
 */
router.post('/behavior', auth, async (req, res) => {
  try {
    const {
      residentId,
      action,
      category,
      context,
      metadata,
      metrics
    } = req.body;

    // 自动补充必要信息
    const behaviorData = {
      residentId,
      villageId: req.user.villageId,
      action,
      category,
      context: {
        ...context,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      },
      metadata: {
        ...metadata,
        device: {
          type: req.device?.type || 'desktop',
          os: req.device?.os,
          browser: req.device?.browser
        }
      },
      metrics,
      timestamp: new Date()
    };

    const behaviorLog = await BehaviorLog.logBehavior(behaviorData);

    res.status(201).json({
      success: true,
      data: behaviorLog,
      message: '行为数据记录成功'
    });

  } catch (error) {
    console.error('记录行为数据失败:', error);
    res.status(500).json({
      success: false,
      message: '记录行为数据失败',
      error: error.message
    });
  }
});

/**
 * 批量记录行为数据
 * POST /api/v1/data-integration/behavior/batch
 */
router.post('/behavior/batch', auth, async (req, res) => {
  try {
    const { behaviors } = req.body;

    if (!Array.isArray(behaviors) || behaviors.length === 0) {
      return res.status(400).json({
        success: false,
        message: '行为数据不能为空'
      });
    }

    // 补充批量数据
    const enrichedBehaviors = behaviors.map(behavior => ({
      ...behavior,
      villageId: req.user.villageId,
      context: {
        ...behavior.context,
        ip: behavior.ip || req.ip,
        userAgent: behavior.userAgent || req.get('User-Agent')
      },
      timestamp: new Date(behavior.timestamp || Date.now())
    }));

    const results = await Promise.all(
      enrichedBehaviors.map(behavior => BehaviorLog.logBehavior(behavior))
    );

    res.json({
      success: true,
      data: {
        processedCount: results.length,
        behaviors: results
      },
      message: `成功批量记录 ${results.length} 条行为数据`
    });

  } catch (error) {
    console.error('批量记录行为数据失败:', error);
    res.status(500).json({
      success: false,
      message: '批量记录行为数据失败',
      error: error.message
    });
  }
});

/**
 * 获取村民行为统计
 * GET /api/v1/data-integration/behavior/stats/:residentId
 */
router.get('/behavior/stats/:residentId', auth, async (req, res) => {
  try {
    const { residentId } = req.params;
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = req.query;

    const timeRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const stats = await BehaviorLog.getResidentBehaviorStats(residentId, timeRange);

    // 获取村民基本信息
    const resident = await Resident.findById(residentId).select('name gender age occupation');

    res.json({
      success: true,
      data: {
        resident,
        behaviorStats: stats[0] || {
          totalActions: 0,
          totalScore: 0,
          avgScore: 0,
          uniqueDaysCount: 0,
          avgActionsPerDay: 0
        },
        timeRange
      }
    });

  } catch (error) {
    console.error('获取行为统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取行为统计失败',
      error: error.message
    });
  }
});

/**
 * 获取村庄行为热力图
 * GET /api/v1/data-integration/behavior/heatmap/:villageId
 */
router.get('/behavior/heatmap/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = req.query;

    const timeRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const heatmap = await BehaviorLog.getVillageBehaviorHeatmap(villageId, timeRange);

    res.json({
      success: true,
      data: heatmap,
      timeRange,
      meta: {
        totalPoints: heatmap.length,
        maxIntensity: Math.max(...heatmap.map(p => p.intensity)),
        minIntensity: Math.min(...heatmap.map(p => p.intensity))
      }
    });

  } catch (error) {
    console.error('获取行为热力图失败:', error);
    res.status(500).json({
      success: false,
      message: '获取行为热力图失败',
      error: error.message
    });
  }
});

/**
 * 分析行为模式
 * GET /api/v1/data-integration/behavior/patterns/:villageId
 */
router.get('/behavior/patterns/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = req.query;

    const timeRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const patterns = await BehaviorLog.analyzeBehaviorPatterns(villageId, timeRange);

    res.json({
      success: true,
      data: patterns,
      timeRange,
      analysis: {
        timePatterns: patterns[0]?.timePatterns?.length || 0,
        sequencePatterns: patterns[0]?.sequencePatterns?.length || 0,
        modulePatterns: patterns[0]?.modulePatterns?.length || 0,
        activityPatterns: patterns[0]?.activityPatterns?.length || 0
      }
    });

  } catch (error) {
    console.error('分析行为模式失败:', error);
    res.status(500).json({
      success: false,
      message: '分析行为模式失败',
      error: error.message
    });
  }
});

/**
 * 获取村民综合数据画像
 * GET /api/v1/data-integration/profile/:residentId
 */
router.get('/profile/:residentId', auth, async (req, res) => {
  try {
    const { residentId } = req.params;
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = req.query;

    // 获取村民基础信息
    const resident = await Resident.findById(residentId)
      .populate('villageId', 'name code')
      .select('-idCard -phone -contacts');

    if (!resident) {
      return res.status(404).json({
        success: false,
        message: '村民不存在'
      });
    }

    // 获取行为数据
    const timeRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const behaviorStats = await BehaviorLog.getResidentBehaviorStats(residentId, timeRange);

    // 获取整合数据
    const integrationData = await dataIntegrationService.integrateMultiSourceData(
      resident.villageId._id,
      {
        timeRange,
        dataSources: ['behavior', 'finance', 'village_affairs', 'emergency']
      }
    );

    // 生成用户画像
    const userProfile = {
      basicInfo: resident,
      behaviorProfile: behaviorStats[0] || {
        totalActions: 0,
        totalScore: 0,
        avgScore: 0,
        uniqueDaysCount: 0,
        avgActionsPerDay: 0
      },
      integrationProfile: this.extractUserProfileFromIntegration(integrationData, residentId),
      insights: {
        engagementLevel: this.calculateEngagementLevel(behaviorStats[0]),
        activityScore: this.calculateActivityScore(behaviorStats[0]),
        communityImpact: this.calculateCommunityImpact(integrationData, residentId),
        recommendations: this.generatePersonalizedRecommendations(behaviorStats[0], integrationData)
      }
    };

    res.json({
      success: true,
      data: userProfile,
      timeRange
    });

  } catch (error) {
    console.error('获取用户画像失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户画像失败',
      error: error.message
    });
  }
});

/**
 * 获取数据源质量报告
 * GET /api/v1/data-integration/quality/:villageId
 */
router.get('/quality/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;

    const qualityReport = {
      villageId,
      generatedAt: new Date(),
      dataSources: {
        behavior: await this.getDataSourceQuality('behavior', villageId),
        finance: await this.getDataSourceQuality('finance', villageId),
        village_affairs: await this.getDataSourceQuality('village_affairs', villageId),
        emergency: await this.getDataSourceQuality('emergency', villageId)
      },
      overall: {
        completeness: 0,
        accuracy: 0,
        timeliness: 0,
        consistency: 0
      }
    };

    // 计算整体质量评分
    const sources = Object.values(qualityReport.dataSources);
    qualityReport.overall.completeness = sources.reduce((sum, s) => sum + s.completeness, 0) / sources.length;
    qualityReport.overall.accuracy = sources.reduce((sum, s) => sum + s.accuracy, 0) / sources.length;
    qualityReport.overall.timeliness = sources.reduce((sum, s) => sum + s.timeliness, 0) / sources.length;
    qualityReport.overall.consistency = sources.reduce((sum, s) => sum + s.consistency, 0) / sources.length;

    res.json({
      success: true,
      data: qualityReport
    });

  } catch (error) {
    console.error('获取数据质量报告失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据质量报告失败',
      error: error.message
    });
  }
});

/**
 * 清理数据整合缓存
 * DELETE /api/v1/data-integration/cache
 */
router.delete('/cache', auth, async (req, res) => {
  try {
    dataIntegrationService.clearCache();

    res.json({
      success: true,
      message: '数据整合缓存已清理'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '清理缓存失败',
      error: error.message
    });
  }
});

// 辅助方法
function extractUserProfileFromIntegration(integrationData, residentId) {
  const profile = {
    behavior: { score: 0, activities: 0 },
    finance: { score: 0, transactions: 0 },
    village_affairs: { score: 0, participation: 0 },
    emergency: { score: 0, involvement: 0 }
  };

  if (integrationData.detailedData.behavior) {
    profile.behavior.activities = integrationData.detailedData.behavior.reduce(
      (sum, period) => sum + period.eventCount, 0
    );
    profile.behavior.score = integrationData.detailedData.behavior.reduce(
      (sum, period) => sum + period.totalScore, 0
    );
  }

  if (integrationData.detailedData.finance) {
    profile.finance.transactions = integrationData.summary.finance?.totalTransactions || 0;
    profile.finance.score = integrationData.detailedData.finance.reduce(
      (sum, period) => sum + period.totalScore, 0
    );
  }

  if (integrationData.detailedData.village_affairs) {
    profile.village_affairs.participation = integrationData.summary.village_affairs?.totalActivities || 0;
    profile.village_affairs.score = integrationData.detailedData.village_affairs.reduce(
      (sum, period) => sum + period.totalScore, 0
    );
  }

  if (integrationData.detailedData.emergency) {
    profile.emergency.involvement = integrationData.summary.emergency?.totalEvents || 0;
    profile.emergency.score = integrationData.detailedData.emergency.reduce(
      (sum, period) => sum + period.totalScore, 0
    );
  }

  return profile;
}

function calculateEngagementLevel(behaviorStats) {
  if (!behaviorStats) return 'passive';

  const { totalActions, avgActionsPerDay, avgScore } = behaviorStats;

  if (totalActions > 100 && avgScore > 3) return 'leadership';
  if (totalActions > 50 && avgScore > 2) return 'proactive';
  if (totalActions > 20 && avgActionsPerDay > 1) return 'active';
  return 'passive';
}

function calculateActivityScore(behaviorStats) {
  if (!behaviorStats) return 0;

  const { totalActions, avgScore, uniqueDaysCount } = behaviorStats;
  return Math.round((totalActions * 0.3 + avgScore * 10 * 0.4 + uniqueDaysCount * 0.3) * 10) / 10;
}

function calculateCommunityImpact(integrationData, residentId) {
  const profile = extractUserProfileFromIntegration(integrationData, residentId);
  const totalScore = Object.values(profile).reduce((sum, p) => sum + p.score, 0);

  if (totalScore > 100) return 'village';
  if (totalScore > 50) return 'neighborhood';
  if (totalScore > 20) return 'family';
  return 'individual';
}

function generatePersonalizedRecommendations(behaviorStats, integrationData) {
  const recommendations = [];

  if (!behaviorStats || behaviorStats.totalActions < 10) {
    recommendations.push({
      type: 'engagement',
      priority: 'high',
      title: '提升平台参与度',
      description: '建议多参与村务活动，了解最新政策信息'
    });
  }

  if (integrationData.insights?.overall?.integrationScore < 2) {
    recommendations.push({
      type: 'participation',
      priority: 'medium',
      title: '增加社区贡献',
      description: '可以通过志愿服务或帮助他人来增加社区贡献'
    });
  }

  return recommendations;
}

async function getDataSourceQuality(source, villageId) {
  // 模拟数据质量评估
  const qualityLevels = ['excellent', 'good', 'fair', 'poor'];
  return {
    completeness: Math.floor(Math.random() * 40) + 60, // 60-100
    accuracy: Math.floor(Math.random() * 30) + 70, // 70-100
    timeliness: Math.floor(Math.random() * 20) + 80, // 80-100
    consistency: Math.floor(Math.random() * 25) + 75, // 75-100
    lastUpdated: new Date(),
    issues: []
  };
}

module.exports = router;