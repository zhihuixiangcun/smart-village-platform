/**
 * 数据分析控制器
 * 处理数据分析、报表生成和可视化数据接口
 */

const dataAnalyticsService = require('../services/dataAnalyticsService');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;

/**
 * 获取仪表板数据
 */
exports.getDashboard = async (req, res) => {
  try {
    const { villageId } = req.query;
    const filters = {
      timeRange: req.query.timeRange || 'month',
      categories: req.query.categories ? req.query.categories.split(',') : ['population', 'financial', 'governance', 'emergency']
    };

    const result = await dataAnalyticsService.getDashboardData(villageId, filters);

    res.json({
      success: true,
      data: result.data,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('获取仪表板数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败',
      error: error.message
    });
  }
};

/**
 * 获取人口分析数据
 */
exports.getPopulationAnalytics = async (req, res) => {
  try {
    const { villageId, timeRange = 'year' } = req.query;

    const result = await dataAnalyticsService.getPopulationAnalytics(villageId, timeRange);

    res.json(result);

  } catch (error) {
    console.error('获取人口分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取人口分析数据失败',
      error: error.message
    });
  }
};

/**
 * 获取财务分析数据
 */
exports.getFinancialAnalytics = async (req, res) => {
  try {
    const { villageId, timeRange = 'year' } = req.query;

    const result = await dataAnalyticsService.getFinancialAnalytics(villageId, timeRange);

    res.json(result);

  } catch (error) {
    console.error('获取财务分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取财务分析数据失败',
      error: error.message
    });
  }
};

/**
 * 获取村务治理分析数据
 */
exports.getGovernanceAnalytics = async (req, res) => {
  try {
    const { villageId, timeRange = 'year' } = req.query;

    const result = await dataAnalyticsService.getGovernanceAnalytics(villageId, timeRange);

    res.json(result);

  } catch (error) {
    console.error('获取村务治理分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取村务治理分析数据失败',
      error: error.message
    });
  }
};

/**
 * 获取应急管理分析数据
 */
exports.getEmergencyAnalytics = async (req, res) => {
  try {
    const { villageId, timeRange = 'year' } = req.query;

    const result = await dataAnalyticsService.getEmergencyAnalytics(villageId, timeRange);

    res.json(result);

  } catch (error) {
    console.error('获取应急管理分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取应急管理分析数据失败',
      error: error.message
    });
  }
};

/**
 * 导出报表
 */
exports.exportReport = async (req, res) => {
  try {
    const { villageId } = req.query;
    const { reportType, format = 'json', filters = {} } = req.body;

    const result = await dataAnalyticsService.exportReportData(
      villageId,
      reportType,
      format,
      filters
    );

    if (format === 'json') {
      res.json({
        success: true,
        data: result,
        filename: `${reportType}_report_${new Date().toISOString().split('T')[0]}.json`
      });
    } else if (format === 'csv') {
      // CSV导出
      const filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    } else if (format === 'excel') {
      // Excel导出
      const filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      const filePath = await generateExcelFile(result, reportType);

      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('文件下载失败:', err);
        }
        // 清理临时文件
        fs.unlink(filePath).catch(() => {});
      });
    } else {
      res.status(400).json({
        success: false,
        message: '不支持的导出格式'
      });
    }

  } catch (error) {
    console.error('导出报表失败:', error);
    res.status(500).json({
      success: false,
      message: '导出报表失败',
      error: error.message
    });
  }
};

/**
 * 获取实时数据流
 */
exports.getRealTimeData = async (req, res) => {
  try {
    const { category = 'all' } = req.query;

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 发送实时数据
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

        res.write(`data: ${JSON.stringify(data)}\n\n`);

      } catch (error) {
        console.error('发送实时数据失败:', error);
        res.write(`data: ${JSON.stringify({ success: false, error: error.message })}\n\n`);
      }
    };

    // 立即发送一次数据
    await sendRealTimeData();

    // 每30秒发送一次更新
    const interval = setInterval(sendRealTimeData, 30000);

    // 客户端断开连接时清理
    req.on('close', () => {
      clearInterval(interval);
    });

  } catch (error) {
    console.error('实时数据流初始化失败:', error);
    res.status(500).json({
      success: false,
      message: '实时数据流初始化失败',
      error: error.message
    });
  }
};

/**
 * 获取系统性能指标
 */
exports.getSystemMetrics = async (req, res) => {
  try {
    const result = await dataAnalyticsService.getSystemMetrics();

    res.json(result);

  } catch (error) {
    console.error('获取系统性能指标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统性能指标失败',
      error: error.message
    });
  }
};

/**
 * 自定义报表查询
 */
exports.customReportQuery = async (req, res) => {
  try {
    const {
      collections, // 要查询的集合
      pipeline,    // MongoDB聚合管道
      timeRange,   // 时间范围
      filters      // 额外过滤条件
    } = req.body;

    // 验证查询参数
    if (!collections || !Array.isArray(collections)) {
      return res.status(400).json({
        success: false,
        message: '请提供要查询的集合'
      });
    }

    const results = {};

    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);

        // 构建聚合管道
        const finalPipeline = [];

        // 时间范围过滤
        if (timeRange) {
          const startDate = new Date();
          switch (timeRange) {
          case 'day':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          }

          finalPipeline.push({
            $match: {
              createdAt: { $gte: startDate }
            }
          });
        }

        // 额外过滤条件
        if (filters && Object.keys(filters).length > 0) {
          finalPipeline.push({
            $match: filters
          });
        }

        // 用户自定义管道
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
        console.error(`查询集合 ${collectionName} 失败:`, collectionError);
        results[collectionName] = {
          success: false,
          error: collectionError.message
        };
      }
    }

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
    console.error('自定义报表查询失败:', error);
    res.status(500).json({
      success: false,
      message: '自定义报表查询失败',
      error: error.message
    });
  }
};

/**
 * 生成Excel文件
 */
async function generateExcelFile(data, reportType) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(reportType);

  // 根据报表类型创建不同的工作表
  if (reportType === 'population') {
    worksheet.columns = [
      { header: '指标', key: 'metric', width: 20 },
      { header: '数值', key: 'value', width: 15 },
      { header: '描述', key: 'description', width: 30 }
    ];

    // 添加人口统计数据
    worksheet.addRows([
      { metric: '总人口', value: data.overview?.totalPopulation || 0, description: '村中常住人口总数' },
      { metric: '总户数', value: data.overview?.totalHouseholds || 0, description: '村中总户数' },
      { metric: '平均家庭规模', value: data.overview?.avgHouseholdSize || 0, description: '平均每户人口数' }
    ]);

  } else if (reportType === 'financial') {
    worksheet.columns = [
      { header: '财务指标', key: 'metric', width: 20 },
      { header: '金额', key: 'amount', width: 15 },
      { header: '描述', key: 'description', width: 30 }
    ];

    worksheet.addRows([
      { metric: '总收入', value: data.overview?.totalIncome || 0, description: '期间总收入' },
      { metric: '总支出', value: data.overview?.totalExpense || 0, description: '期间总支出' },
      { metric: '净收入', value: data.overview?.netIncome || 0, description: '收入减去支出' }
    ]);
  }

  // 保存文件
  const tempDir = path.join(__dirname, '../temp');
  await fs.mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, `${reportType}_${Date.now()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

/**
 * 清理分析缓存
 */
exports.clearCache = async (req, res) => {
  try {
    dataAnalyticsService.clearCache();

    res.json({
      success: true,
      message: '缓存已清理'
    });

  } catch (error) {
    console.error('清理缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清理缓存失败',
      error: error.message
    });
  }
};

/**
 * 获取报表模板
 */
exports.getReportTemplates = async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('获取报表模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报表模板失败',
      error: error.message
    });
  }
};