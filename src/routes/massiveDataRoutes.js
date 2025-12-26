/**
 * 海量数据API路由
 * 支持百万级数据的高性能查询和分页
 */

const express = require('express');
const router = express.Router();
const massiveDataService = require('../services/massiveDataService');
const Resident = require('../models/Resident');
const Finance = require('../models/Finance');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * 高性能分页查询村民数据
 * GET /api/v1/massive-data/residents
 */
router.get('/residents', auth, async (req, res) => {
  try {
    const {
      villageId,
      page = 1,
      pageSize = 50,
      cursor = null,
      search = '',
      gender = '',
      ageRange = '',
      occupation = '',
      education = '',
      povertyStatus = '',
      specialIdentity = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query = { villageId, status: 'active' };

    // 搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { idCard: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'address.detailAddress': { $regex: search, $options: 'i' } }
      ];
    }

    // 过滤条件
    if (gender) query.gender = gender;
    if (occupation) query.occupation = occupation;
    if (education) query['education.degree'] = education;
    if (povertyStatus) query['poverty.isPovertyHousehold'] = povertyStatus === 'true';
    if (specialIdentity) query['specialIdentities.type'] = specialIdentity;

    // 年龄范围过滤
    if (ageRange) {
      const [minAge, maxAge] = ageRange.split(',').map(Number);
      const currentYear = new Date().getFullYear();
      const minBirthYear = currentYear - maxAge;
      const maxBirthYear = currentYear - minAge;

      query.birthDate = {
        $gte: new Date(`${minBirthYear}-01-01`),
        $lte: new Date(`${maxBirthYear}-12-31`)
      };
    }

    // 排序配置
    const sortField = sortBy === 'name' ? 'name' : sortBy;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // 执行分页查询
    const result = await massiveDataService.cursorBasedPagination(
      Resident,
      query,
      {
        pageSize: Math.min(parseInt(pageSize), 500), // 限制最大页面大小
        cursor,
        sortField,
        sortDirection
      }
    );

    // 获取总数（用于显示，不用于分页逻辑）
    const totalCount = await Resident.countDocuments(query);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        currentPageSize: result.pageSize,
        totalCount,
        estimatedTotalPages: Math.ceil(totalCount / pageSize)
      },
      query: {
        search,
        filters: { gender, ageRange, occupation, education, povertyStatus, specialIdentity },
        sort: { sortBy, sortOrder }
      }
    });

  } catch (error) {
    logger.error('分页查询村民数据失败:', error);
    res.status(500).json({
      success: false,
      message: '查询失败',
      error: error.message
    });
  }
});

/**
 * 批量导出村民数据
 * POST /api/v1/massive-data/export/residents
 */
router.post('/export/residents', auth, async (req, res) => {
  try {
    const {
      villageId,
      filters = {},
      fields = [
        'name', 'idCard', 'phone', 'gender', 'age',
        'address', 'occupation', 'education.degree',
        'annualIncome', 'specialIdentities', 'createdAt'
      ],
      format = 'json'
    } = req.body;

    // 构建查询条件
    const query = { villageId, status: 'active', ...filters };

    // 设置响应头
    res.writeHead(200, {
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
      'Content-Disposition': `attachment; filename="residents_${Date.now()}.${format}"`
    });

    // 开始导出
    const exportStream = await massiveDataService.exportMassiveData(
      Resident,
      query,
      {
        fields,
        format,
        progressCallback: (progress) => {
          // 可以通过WebSocket实时推送进度
          logger.debug(`导出进度: ${progress.progress}%`);
        }
      }
    );

    if (format === 'csv' && exportStream.data.length > 0) {
      // CSV格式处理
      const headers = fields.map(field => {
        const fieldMap = {
          'name': '姓名',
          'idCard': '身份证号',
          'phone': '电话',
          'gender': '性别',
          'age': '年龄',
          'address': '地址',
          'occupation': '职业',
          'education.degree': '教育程度',
          'annualIncome': '年收入',
          'specialIdentities': '特殊身份',
          'createdAt': '创建时间'
        };
        return fieldMap[field] || field;
      }).join(',');

      res.write(`${headers  }\n`);

      exportStream.data.forEach(row => {
        const csvRow = fields.map(field => {
          let value = field.split('.').reduce((obj, key) => obj?.[key], row) || '';
          value = String(value).replace(/"/g, '""'); // 转义双引号
          if (value.includes(',') || value.includes('"')) {
            value = `"${value}"`; // 用引号包围包含逗号的字段
          }
          return value;
        }).join(',');
        res.write(`${csvRow  }\n`);
      });
    } else {
      // JSON格式处理
      res.write(JSON.stringify({
        success: true,
        data: exportStream.data,
        summary: {
          totalExported: exportStream.totalExported,
          totalCount: exportStream.totalCount,
          exportTime: new Date().toISOString()
        }
      }, null, 2));
    }

    res.end();

  } catch (error) {
    logger.error('导出数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: error.message
    });
  }
});

/**
 * 获取村庄统计大数据分析
 * GET /api/v1/massive-data/analytics/:villageId
 */
router.get('/analytics/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;
    const { forceRefresh = 'false' } = req.query;

    // 如果强制刷新，清理缓存
    if (forceRefresh === 'true') {
      massiveDataService.clearCache();
    }

    const analytics = await massiveDataService.getVillageMassiveStats(villageId);

    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取统计分析失败:', error);
    res.status(500).json({
      success: false,
      message: '统计分析失败',
      error: error.message
    });
  }
});

/**
 * 获取财务大数据分析
 * GET /api/v1/massive-data/financial-analytics/:villageId
 */
router.get('/financial-analytics/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;
    const {
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 默认最近一年
      endDate = new Date()
    } = req.query;

    const analytics = await massiveDataService.getFinanceMassiveAnalytics(villageId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    });

    res.json({
      success: true,
      data: analytics[0], // aggregation返回数组
      timeRange: { startDate, endDate },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取财务分析失败:', error);
    res.status(500).json({
      success: false,
      message: '财务分析失败',
      error: error.message
    });
  }
});

/**
 * 实时数据流 - 用于监控大屏
 * GET /api/v1/massive-data/realtime/:villageId
 */
router.get('/realtime/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;
    const realtimeData = await massiveDataService.getRealTimeDataStream(villageId);

    res.json({
      success: true,
      data: realtimeData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取实时数据失败:', error);
    res.status(500).json({
      success: false,
      message: '实时数据获取失败',
      error: error.message
    });
  }
});

/**
 * 地理位置数据分析
 * GET /api/v1/massive-data/geospatial/:villageId
 */
router.get('/geospatial/:villageId', auth, async (req, res) => {
  try {
    const { villageId } = req.params;
    const {
      southwest_lat, southwest_lng,
      northeast_lat, northeast_lng
    } = req.query;

    let bounds = null;
    if (southwest_lat && southwest_lng && northeast_lat && northeast_lng) {
      bounds = {
        southwest: { lat: parseFloat(southwest_lat), lng: parseFloat(southwest_lng) },
        northeast: { lat: parseFloat(northeast_lat), lng: parseFloat(northeast_lng) }
      };
    }

    const geospatialData = await massiveDataService.getGeospatialAnalytics(villageId, bounds);

    res.json({
      success: true,
      data: geospatialData[0], // aggregation返回数组
      bounds,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('获取地理数据分析失败:', error);
    res.status(500).json({
      success: false,
      message: '地理数据分析失败',
      error: error.message
    });
  }
});

/**
 * 批量数据处理任务
 * POST /api/v1/massive-data/batch-process
 */
router.post('/batch-process', auth, async (req, res) => {
  try {
    const {
      taskType,
      villageId,
      filters = {},
      options = {}
    } = req.body;

    const query = { villageId, status: 'active', ...filters };
    let processor;
    let taskName;

    // 根据任务类型选择处理函数
    switch (taskType) {
    case 'update_age':
      processor = (doc) => {
        const currentYear = new Date().getFullYear();
        const age = currentYear - new Date(doc.birthDate).getFullYear();
        return Resident.findByIdAndUpdate(doc._id, { age });
      };
      taskName = '年龄批量更新';
      break;

    case 'generate_qr_code':
      processor = (doc) => {
        const qrCode = `QR_${doc.villageId}_${doc._id}`;
        return Resident.findByIdAndUpdate(doc._id, { 'digital.qrCode': qrCode });
      };
      taskName = '二维码批量生成';
      break;

    case 'calculate_income_stats':
      processor = (doc) => {
        // 复杂的统计计算逻辑
        return Promise.resolve({ processed: true, docId: doc._id });
      };
      taskName = '收入统计计算';
      break;

    default:
      throw new Error('不支持的任务类型');
    }

    // 启动批处理任务（异步）
    massiveDataService.batchProcess(
      Resident,
      query,
      processor,
      {
        batchSize: options.batchSize || 1000,
        maxConcurrency: options.maxConcurrency || 5,
        progressCallback: (progress) => {
          // 这里可以通过WebSocket或Redis发布进度
          console.log(`${taskName}进度: ${progress.progress}% (${progress.processed}/${progress.total})`);
        }
      }
    ).then((result) => {
      logger.debug(`${taskName}完成:`, result);
    }).catch((error) => {
      logger.error(`${taskName}失败:`, error);
    });

    res.json({
      success: true,
      message: `${taskName}任务已启动`,
      taskId: `batch_${taskType}_${Date.now()}`
    });

  } catch (error) {
    logger.error('批处理任务失败:', error);
    res.status(500).json({
      success: false,
      message: '批处理任务失败',
      error: error.message
    });
  }
});

/**
 * 缓存管理
 * GET /api/v1/massive-data/cache/stats
 */
router.get('/cache/stats', auth, async (req, res) => {
  try {
    const stats = massiveDataService.getCacheStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 清理缓存
 * DELETE /api/v1/massive-data/cache
 */
router.delete('/cache', auth, async (req, res) => {
  try {
    massiveDataService.clearCache();
    res.json({
      success: true,
      message: '缓存已清理'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;