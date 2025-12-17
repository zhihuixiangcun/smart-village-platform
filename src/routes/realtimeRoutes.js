/**
 * 实时计算引擎API路由
 * 提供实时指标计算、流数据处理和动态阈值调整的接口
 */

const express = require('express');
const router = express.Router();
const realtimeEngine = require('../services/realtimeEngine');
const streamProcessor = require('../services/streamProcessor');
const auth = require('../middleware/auth');

/**
 * 获取实时系统状态
 * GET /api/v1/realtime/status
 */
router.get('/status', auth, async (req, res) => {
  try {
    const status = realtimeEngine.getSystemStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取实时系统状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取实时系统状态失败',
      error: error.message
    });
  }
});

/**
 * 获取所有实时指标
 * GET /api/v1/realtime/metrics
 */
router.get('/metrics', auth, async (req, res) => {
  try {
    const {
      types,
      windows,
      includeHistory = false,
      limit = 100
    } = req.query;

    const metrics = realtimeEngine.getAllMetrics();
    const response = { metrics };

    // 如果需要历史数据
    if (includeHistory === 'true') {
      const history = {};
      const window = windows || '1h';
      const limitNum = parseInt(limit) || 100;

      for (const metricName of Object.keys(metrics)) {
        history[metricName] = realtimeEngine.getMetricHistory(metricName, window, limitNum);
      }

      response.history = history;
    }

    // 过滤指标类型
    if (types) {
      const typeList = types.split(',');
      const filteredMetrics = {};

      Object.keys(metrics).forEach(name => {
        if (typeList.includes(metrics[name].type)) {
          filteredMetrics[name] = metrics[name];
        }
      });

      response.metrics = filteredMetrics;
    }

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取实时指标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取实时指标失败',
      error: error.message
    });
  }
});

/**
 * 获取特定指标详情
 * GET /api/v1/realtime/metrics/:metricName
 */
router.get('/metrics/:metricName', auth, async (req, res) => {
  try {
    const { metricName } = req.params;
    const {
      window = '1h',
      limit = 100,
      includeStatistics = false
    } = req.query;

    const currentValue = realtimeEngine.getMetricValue(metricName, window);
    const history = realtimeEngine.getMetricHistory(metricName, window, parseInt(limit));

    const response = {
      metricName,
      currentValue,
      history,
      statistics: null
    };

    // 计算统计信息
    if (includeStatistics === 'true' && history.length > 0) {
      const values = history.map(point => point.value);
      response.statistics = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        sum: values.reduce((sum, val) => sum + val, 0),
        trend: this.calculateTrend(history)
      };
    }

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取指标详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取指标详情失败',
      error: error.message
    });
  }
});

/**
 * 添加实时数据
 * POST /api/v1/realtime/data
 */
router.post('/data', auth, async (req, res) => {
  try {
    const { dataType, data } = req.body;

    if (!dataType || !data) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数: dataType 和 data'
      });
    }

    const dataId = await realtimeEngine.addStreamData(dataType, {
      ...data,
      userId: req.user?.id,
      villageId: req.user?.villageId,
      source: 'api'
    });

    res.status(201).json({
      success: true,
      data: { dataId, dataType },
      message: '实时数据添加成功'
    });

  } catch (error) {
    console.error('添加实时数据失败:', error);
    res.status(500).json({
      success: false,
      message: '添加实时数据失败',
      error: error.message
    });
  }
});

/**
 * 批量添加实时数据
 * POST /api/v1/realtime/data/batch
 */
router.post('/data/batch', auth, async (req, res) => {
  try {
    const { dataList } = req.body;

    if (!Array.isArray(dataList) || dataList.length === 0) {
      return res.status(400).json({
        success: false,
        message: '数据列表不能为空'
      });
    }

    const results = [];
    const batchSize = 50;

    for (let i = 0; i < dataList.length; i += batchSize) {
      const batch = dataList.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const dataId = await realtimeEngine.addStreamData(item.type, {
              ...item.data,
              userId: req.user?.id,
              villageId: req.user?.villageId,
              source: 'batch_api'
            });
            return { success: true, dataId, type: item.type };
          } catch (error) {
            return { success: false, error: error.message, type: item.type };
          }
        })
      );

      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total: results.length,
        successCount,
        errorCount,
        results: results.slice(0, 100) // 只返回前100个结果
      },
      message: `批量处理完成: 成功 ${successCount}, 失败 ${errorCount}`
    });

  } catch (error) {
    console.error('批量添加实时数据失败:', error);
    res.status(500).json({
      success: false,
      message: '批量添加实时数据失败',
      error: error.message
    });
  }
});

/**
 * 注册新指标
 * POST /api/v1/realtime/metrics
 */
router.post('/metrics', auth, async (req, res) => {
  try {
    const { name, definition } = req.body;

    if (!name || !definition) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数: name 和 definition'
      });
    }

    realtimeEngine.registerMetric(name, definition);

    res.status(201).json({
      success: true,
      data: { name, definition },
      message: '指标注册成功'
    });

  } catch (error) {
    console.error('注册指标失败:', error);
    res.status(500).json({
      success: false,
      message: '注册指标失败',
      error: error.message
    });
  }
});

/**
 * 设置阈值规则
 * POST /api/v1/realtime/thresholds
 */
router.post('/thresholds', auth, async (req, res) => {
  try {
    const { metricName, threshold } = req.body;

    if (!metricName || !threshold) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数: metricName 和 threshold'
      });
    }

    realtimeEngine.setThreshold(metricName, threshold);

    res.status(201).json({
      success: true,
      data: { metricName, threshold },
      message: '阈值设置成功'
    });

  } catch (error) {
    console.error('设置阈值失败:', error);
    res.status(500).json({
      success: false,
      message: '设置阈值失败',
      error: error.message
    });
  }
});

/**
 * 注册警报规则
 * POST /api/v1/realtime/alerts
 */
router.post('/alerts', auth, async (req, res) => {
  try {
    const { ruleId, rule } = req.body;

    if (!ruleId || !rule) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数: ruleId 和 rule'
      });
    }

    realtimeEngine.registerAlertRule(ruleId, rule);

    res.status(201).json({
      success: true,
      data: { ruleId, rule },
      message: '警报规则注册成功'
    });

  } catch (error) {
    console.error('注册警报规则失败:', error);
    res.status(500).json({
      success: false,
      message: '注册警报规则失败',
      error: error.message
    });
  }
});

/**
 * 创建数据流
 * POST /api/v1/realtime/streams
 */
router.post('/streams', auth, async (req, res) => {
  try {
    const { streamId, options = {} } = req.body;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数: streamId'
      });
    }

    const stream = streamProcessor.createStream(streamId, options);

    res.status(201).json({
      success: true,
      data: {
        streamId: stream.streamId,
        options: stream.options
      },
      message: '数据流创建成功'
    });

  } catch (error) {
    console.error('创建数据流失败:', error);
    res.status(500).json({
      success: false,
      message: '创建数据流失败',
      error: error.message
    });
  }
});

/**
 * 向数据流添加数据
 * POST /api/v1/realtime/streams/:streamId/data
 */
router.post('/streams/:streamId/data', auth, async (req, res) => {
  try {
    const { streamId } = req.params;
    const { dataType, data } = req.body;

    if (!dataType || !data) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数: dataType 和 data'
      });
    }

    // 获取数据流
    const stream = streamProcessor.streams?.get(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        message: '数据流不存在'
      });
    }

    await stream.add(dataType, data);

    res.json({
      success: true,
      data: { streamId, dataType },
      message: '数据添加到流成功'
    });

  } catch (error) {
    console.error('添加数据到流失败:', error);
    res.status(500).json({
      success: false,
      message: '添加数据到流失败',
      error: error.message
    });
  }
});

/**
 * 获取数据流统计
 * GET /api/v1/realtime/streams/:streamId/stats
 */
router.get('/streams/:streamId/stats', auth, async (req, res) => {
  try {
    const { streamId } = req.params;

    // 这里需要维护一个数据流实例的引用
    // 在实际实现中，可能需要一个管理器来维护所有活跃的数据流

    res.json({
      success: true,
      data: {
        streamId,
        status: 'active',
        message: '数据流统计获取功能需要实现流管理器'
      }
    });

  } catch (error) {
    console.error('获取数据流统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取数据流统计失败',
      error: error.message
    });
  }
});

/**
 * 实时分析村庄数据
 * GET /api/v1/realtime/analysis/:villageId
 */
router.get('/analysis/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;
    const {
      timeRange = '1h',
      metrics = 'all',
      includeInsights = true
    } = req.query;

    // 获取村庄相关的实时指标
    const villageMetrics = realtimeEngine.getAllMetrics();
    const filteredMetrics = {};

    // 过滤村庄相关指标
    Object.keys(villageMetrics).forEach(metricName => {
      if (metricName.includes('village') || metricName.includes('resident') ||
          metricName.includes('active_users') || metricName.includes('engagement')) {
        filteredMetrics[metricName] = {
          ...villageMetrics[metricName],
          currentValue: realtimeEngine.getMetricValue(metricName),
          history: realtimeEngine.getMetricHistory(metricName, timeRange, 50)
        };
      }
    });

    // 生成实时洞察
    let insights = {};
    if (includeInsights === 'true') {
      insights = await this.generateVillageInsights(villageId, filteredMetrics, timeRange);
    }

    res.json({
      success: true,
      data: {
        villageId,
        timeRange,
        metrics: filteredMetrics,
        insights,
        analysisTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('实时分析失败:', error);
    res.status(500).json({
      success: false,
      message: '实时分析失败',
      error: error.message
    });
  }
});

/**
 * 实时仪表板数据
 * GET /api/v1/realtime/dashboard/:villageId
 */
router.get('/dashboard/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;
    const {
      refreshInterval = 30, // 秒
      includePredictions = false
    } = req.query;

    // 获取仪表板数据
    const dashboardData = {
      overview: await this.getDashboardOverview(villageId),
      activity: await this.getActivityMetrics(villageId),
      performance: await this.getPerformanceMetrics(villageId),
      alerts: await this.getActiveAlerts(villageId),
      trends: await this.getTrendData(villageId)
    };

    // 添加预测数据
    if (includePredictions === 'true') {
      dashboardData.predictions = await this.getPredictions(villageId);
    }

    res.json({
      success: true,
      data: dashboardData,
      meta: {
        refreshInterval,
        lastUpdate: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + refreshInterval * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('获取仪表板数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败',
      error: error.message
    });
  }
});

/**
 * 清理缓存
 * DELETE /api/v1/realtime/cache
 */
router.delete('/cache', auth, async (req, res) => {
  try {
    // 清理实时引擎缓存
    realtimeEngine.clearCache();

    res.json({
      success: true,
      message: '实时计算缓存已清理'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '清理缓存失败',
      error: error.message
    });
  }
});

/**
 * 实时数据订阅
 * GET /api/v1/realtime/subscribe/:eventType
 */
router.get('/subscribe/:eventType', (req, res) => {
  try {
    const { eventType } = req.params;

    // 设置Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // 订阅事件
    const unsubscribe = realtimeEngine.subscribe(eventType, (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    // 客户端断开连接时取消订阅
    req.on('close', () => {
      unsubscribe();
    });

    // 发送连接确认
    res.write(`data: ${JSON.stringify({ type: 'connected', message: '订阅成功' })}\n\n`);

  } catch (error) {
    console.error('订阅失败:', error);
    res.status(500).json({
      success: false,
      message: '订阅失败',
      error: error.message
    });
  }
});

// 辅助方法
function calculateTrend(history) {
  if (history.length < 2) return 'insufficient_data';

  const values = history.map(point => point.value);
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  const change = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

async function generateVillageInsights(villageId, metrics, timeRange) {
  const insights = [];

  // 分析活跃度
  const activeUsers = realtimeEngine.getMetricValue('active_users', '1m');
  if (activeUsers) {
    if (activeUsers < 10) {
      insights.push({
        type: 'warning',
        title: '活跃用户数偏低',
        description: '当前活跃用户数较少，建议增加互动活动',
        recommendation: 'organize_community_events'
      });
    }
  }

  // 分析行为参与度
  const engagementScore = realtimeEngine.getMetricValue('engagement_score', '1h');
  if (engagementScore && engagementScore < 2) {
    insights.push({
      type: 'info',
      title: '参与度有待提升',
      description: '村民参与度较低，可以通过激励机制提升',
      recommendation: 'implement_engagement_program'
    });
  }

  return insights;
}

async function getDashboardOverview(villageId) {
  return {
    totalResidents: await realtimeEngine.getMetricValue('total_residents', '1h'),
    activeUsers: await realtimeEngine.getMetricValue('active_users', '1m'),
    todayEvents: await realtimeEngine.getMetricValue('events_today', '1d'),
    systemHealth: 'good'
  };
}

async function getActivityMetrics(villageId) {
  return {
    behaviorCount: await realtimeEngine.getMetricValue('behavior_count', '1h'),
    pageViews: await realtimeEngine.getMetricValue('page_views', '1h'),
    interactions: await realtimeEngine.getMetricValue('interactions', '1h')
  };
}

async function getPerformanceMetrics(villageId) {
  return {
    responseTime: await realtimeEngine.getMetricValue('response_time', '5m'),
    errorRate: await realtimeEngine.getMetricValue('error_rate', '5m'),
    throughput: await realtimeEngine.getMetricValue('throughput', '1m')
  };
}

async function getActiveAlerts(villageId) {
  return {
    critical: 0,
    warning: 0,
    info: 0
  };
}

async function getTrendData(villageId) {
  return {
    daily: realtimeEngine.getMetricHistory('daily_activity', '7d', 7),
    weekly: realtimeEngine.getMetricHistory('weekly_activity', '4w', 4)
  };
}

async function getPredictions(villageId) {
  return {
    nextDayActivity: {
      predicted: 150,
      confidence: 0.85
    },
    weeklyTrend: {
      direction: 'increasing',
      confidence: 0.75
    }
  };
}

module.exports = router;