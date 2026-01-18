const dataAnalyticsService = require('../services/dataAnalyticsService');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 180, checkperiod: 120 });

function convertToCSV(data) {
  const result = [];
  const flattenObject = (obj, prefix = '') => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          flattenObject(obj[key], newKey);
        } else if (Array.isArray(obj[key])) {
          const value = JSON.stringify(obj[key]);
          result.push([newKey, value].join(','));
        } else {
          result.push([newKey, obj[key]].join(','));
        }
      }
    }
  };

  flattenObject(data);
  const header = Object.keys(data).join(',') + '\n';
  return header + result.join('\n');
}

const buildOperator = (req) => ({
  userId: req.user?.userId || req.headers['x-user-id'],
  username: req.user?.username || 'system',
  name: req.user?.name || '系统',
  role: req.user?.role || 'admin',
  villageId: req.user?.villageId,
  sessionId: req.headers['x-session-id'] || `session_${Date.now()}`
});

exports.getDashboard = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId } = req.query;
    const filters = {
      timeRange: req.query.timeRange || 'month',
      categories: req.query.categories ? req.query.categories.split(',') : ['population', 'financial', 'governance', 'emergency']
    };

    const operator = buildOperator(req);
    const queryVillageId = villageId || operator.villageId;

    const cacheKey = `dashboard:${queryVillageId || 'all'}:${filters.timeRange}:${filters.categories.join(',')}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData.data,
        metadata: cachedData.metadata,
        cached: true
      });
    }

    const result = await dataAnalyticsService.getDashboardData(queryVillageId, filters);
    cache.set(cacheKey, result, 60);

    logger.info(`获取仪表板数据成功`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: result.data,
      metadata: result.metadata
    });

  } catch (error) {
    logger.error('获取仪表板数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getPopulationAnalytics = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId, timeRange = 'year' } = req.query;
    
    const operator = buildOperator(req);
    const queryVillageId = villageId || operator.villageId;

    const cacheKey = `analytics:population:${queryVillageId || 'all'}:${timeRange}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        ...cachedData,
        cached: true
      });
    }

    const result = await dataAnalyticsService.getPopulationAnalytics(queryVillageId, timeRange);
    cache.set(cacheKey, result, 300);

    logger.info(`获取人口分析数据成功`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json(result);

  } catch (error) {
    logger.error('获取人口分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取人口分析数据失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getFinancialAnalytics = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId, timeRange = 'year' } = req.query;
    
    const operator = buildOperator(req);
    const queryVillageId = villageId || operator.villageId;

    const cacheKey = `analytics:financial:${queryVillageId || 'all'}:${timeRange}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        ...cachedData,
        cached: true
      });
    }

    const result = await dataAnalyticsService.getFinancialAnalytics(queryVillageId, timeRange);
    cache.set(cacheKey, result, 300);

    logger.info(`获取财务分析数据成功`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json(result);

  } catch (error) {
    logger.error('获取财务分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取财务分析数据失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getGovernanceAnalytics = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId, timeRange = 'year' } = req.query;
    
    const operator = buildOperator(req);
    const queryVillageId = villageId || operator.villageId;

    const cacheKey = `analytics:governance:${queryVillageId || 'all'}:${timeRange}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        ...cachedData,
        cached: true
      });
    }

    const result = await dataAnalyticsService.getGovernanceAnalytics(queryVillageId, timeRange);
    cache.set(cacheKey, result, 300);

    logger.info(`获取村务治理分析数据成功`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json(result);

  } catch (error) {
    logger.error('获取村务治理分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取村务治理分析数据失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getEmergencyAnalytics = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId, timeRange = 'year' } = req.query;
    
    const operator = buildOperator(req);
    const queryVillageId = villageId || operator.villageId;

    const cacheKey = `analytics:emergency:${queryVillageId || 'all'}:${timeRange}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        ...cachedData,
        cached: true
      });
    }

    const result = await dataAnalyticsService.getEmergencyAnalytics(queryVillageId, timeRange);
    cache.set(cacheKey, result, 180);

    logger.info(`获取应急管理分析数据成功`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json(result);

  } catch (error) {
    logger.error('获取应急管理分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急管理分析数据失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.exportReport = async (req, res) => {
  const startTime = Date.now();
  try {
    const { villageId } = req.query;
    const { reportType, format = 'json', filters = {} } = req.body;

    const operator = buildOperator(req);
    const queryVillageId = villageId || operator.villageId;

    if (!reportType) {
      return res.status(400).json({
        success: false,
        message: '请指定报表类型'
      });
    }

    const supportedFormats = ['json', 'csv', 'excel'];
    if (!supportedFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `不支持的导出格式，支持格式: ${supportedFormats.join(', ')}`
      });
    }

    const result = await dataAnalyticsService.exportReportData(
      queryVillageId,
      reportType,
      format,
      filters
    );

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'json') {
      res.json({
        success: true,
        data: result,
        filename: `${reportType}_report_${timestamp}.json`
      });

    } else if (format === 'csv') {
      const filename = `${reportType}_report_${timestamp}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURI(filename)}"`);
      
      const csvContent = convertToCSV(result);
      res.send(csvContent);

    } else if (format === 'excel') {
      const filename = `${reportType}_report_${timestamp}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURI(filename)}"`);
      
      logger.warn('Excel导出暂不支持，降级为JSON格式');
      res.json({
        success: true,
        data: result,
        message: 'Excel导出暂不支持，已导出为JSON格式'
      });
    }

    logger.info(`导出报表成功: ${reportType}`, { 
      userId: operator.userId,
      format,
      duration: Date.now() - startTime 
    });

  } catch (error) {
    logger.error('导出报表失败:', error);
    res.status(500).json({
      success: false,
      message: '导出报表失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getRealTimeData = async (req, res) => {
  try {
    const { category = 'all' } = req.query;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no'
    });

    const sendRealTimeData = async () => {
      try {
        let data;

        switch (category) {
        case 'population':
          data = await dataAnalyticsService.getPopulationAnalytics(null, 'day');
          break;
        case 'financial':
          data = await dataAnalyticsService.getFinancialAnalytics(null, 'day');
          break;
        case 'governance':
          data = await dataAnalyticsService.getGovernanceAnalytics(null, 'day');
          break;
        case 'emergency':
          data = await dataAnalyticsService.getEmergencyAnalytics(null, 'day');
          break;
        default:
          data = await dataAnalyticsService.getDashboardData(null, { timeRange: 'day' });
        }

        const payload = JSON.stringify(data);
        res.write(`data: ${payload}\n\n`);

      } catch (error) {
        logger.error('发送实时数据失败:', error);
        res.write(`data: ${JSON.stringify({ success: false, error: error.message })}\n\n`);
      }
    };

    await sendRealTimeData();

    const interval = setInterval(sendRealTimeData, 30000);

    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(interval);
      clearInterval(heartbeat);
    });

    req.on('error', (error) => {
      logger.error('SSE连接错误:', error);
      clearInterval(interval);
      clearInterval(heartbeat);
    });

  } catch (error) {
    logger.error('实时数据流初始化失败:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '实时数据流初始化失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

exports.getSystemMetrics = async (req, res) => {
  const startTime = Date.now();
  try {
    const operator = buildOperator(req);
    
    const cacheKey = 'system:metrics';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        ...cachedData,
        cached: true
      });
    }

    const result = await dataAnalyticsService.getSystemMetrics();
    cache.set(cacheKey, result, 30);

    logger.info(`获取系统性能指标成功`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json(result);

  } catch (error) {
    logger.error('获取系统性能指标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统性能指标失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.customReportQuery = async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      collections,
      pipeline,
      timeRange,
      filters
    } = req.body;

    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要查询的集合'
      });
    }

    if (collections.length > 10) {
      return res.status(400).json({
        success: false,
        message: '单次查询最多支持10个集合'
      });
    }

    const operator = buildOperator(req);
    const mongoose = require('mongoose');

    const results = {};

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);

        const finalPipeline = [];

        if (timeRange) {
          const startDate = new Date();
          const timeRangeMap = {
            'day': 1,
            'week': 7,
            'month': 30,
            'quarter': 90,
            'year': 365
          };
          
          const days = timeRangeMap[timeRange] || 1;
          startDate.setDate(startDate.getDate() - days);

          finalPipeline.push({
            $match: {
              createdAt: { $gte: startDate }
            }
          });
        }

        if (filters && Object.keys(filters).length > 0) {
          finalPipeline.push({ $match: filters });
        }

        if (pipeline && Array.isArray(pipeline)) {
          finalPipeline.push(...pipeline);
        }

        const data = await collection.aggregate(finalPipeline).toArray();
        
        results[collectionName] = {
          success: true,
          count: data.length,
          data
        };

      } catch (collectionError) {
        logger.error(`查询集合 ${collectionName} 失败:`, collectionError);
        results[collectionName] = {
          success: false,
          error: collectionError.message
        };
      }
    }

    logger.info(`自定义报表查询成功`, { 
      userId: operator.userId,
      collections: collections.length,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: results,
      metadata: {
        queryTime: new Date(),
        collections,
        timeRange,
        filters
      }
    });

  } catch (error) {
    logger.error('自定义报表查询失败:', error);
    res.status(500).json({
      success: false,
      message: '自定义报表查询失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.clearCache = async (req, res) => {
  const startTime = Date.now();
  try {
    const operator = buildOperator(req);

    if (operator.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    dataAnalyticsService.clearCache();
    cache.flushAll();

    logger.info(`缓存清理成功`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      message: '缓存已清理'
    });

  } catch (error) {
    logger.error('清理缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清理缓存失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getReportTemplates = async (req, res) => {
  const startTime = Date.now();
  try {
    const operator = buildOperator(req);

    const cacheKey = 'report:templates';
    const cachedTemplates = cache.get(cacheKey);
    
    if (cachedTemplates) {
      return res.json({
        success: true,
        data: cachedTemplates,
        cached: true
      });
    }

    const templates = {
      population: {
        name: '人口统计分析',
        description: '分析村中人口结构、年龄分布、教育水平等',
        categories: ['demographics', 'ageGroups', 'education', 'occupation'],
        charts: ['pie', 'bar', 'line'],
        exportFormats: ['json', 'csv', 'excel']
      },
      financial: {
        name: '财务收支分析',
        description: '分析村财务收入、支出、预算执行情况',
        categories: ['income', 'expense', 'budget', 'categories'],
        charts: ['line', 'bar', 'pie', 'area'],
        exportFormats: ['json', 'csv', 'excel']
      },
      governance: {
        name: '村务治理分析',
        description: '分析公告发布、任务完成、村民参与度等',
        categories: ['announcements', 'tasks', 'discussions', 'engagement'],
        charts: ['bar', 'line', 'radar'],
        exportFormats: ['json', 'csv', 'excel']
      },
      emergency: {
        name: '应急管理分析',
        description: '分析应急事件响应时间、资源利用、处理效果等',
        categories: ['events', 'responseTime', 'resources', 'trends'],
        charts: ['line', 'bar', 'scatter', 'heatmap'],
        exportFormats: ['json', 'csv', 'excel']
      }
    };

    cache.set(cacheKey, templates, 3600);

    logger.info(`获取报表模板成功`, { 
      userId: operator.userId,
      duration: Date.now() - startTime 
    });

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    logger.error('获取报表模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报表模板失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
