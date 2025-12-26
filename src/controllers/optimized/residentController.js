/**
 * 优化的村民控制器
 * 提供高性能的村民管理API
 */

const { performance } = require('perf_hooks');
const { Transform } = require('stream');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-writer');
const { CacheUtil } = require('../../utils/cache');
const { Resident } = require('../../models/Resident');
const { Village } = require('../../models/Village');
const { AuditUtil } = require('../../utils/audit');
const logger = require('../utils/logger');

class OptimizedResidentController {
  constructor() {
    this.batchSize = 100;
    this.maxExportRecords = 100000;
  }

  /**
   * 获取村民列表（优化版）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getResidents(req, res) {
    const start = performance.now();
    const requestId = req.id || this.generateRequestId();

    try {
      // 构建缓存键
      const cacheKey = this.buildCacheKey('residents', req.query);

      // 尝试从缓存获取
      let cachedData = await CacheUtil.get(cacheKey);

      if (cachedData && !req.query.noCache) {
        const duration = performance.now() - start;
        logger.info('缓存命中', { requestId, duration });

        return res.json({
          success: true,
          data: cachedData,
          performance: {
            duration,
            cached: true
          }
        });
      }

      // 构建聚合查询
      const aggregatePipeline = this.buildAggregatePipeline(req.query);

      // 执行聚合查询
      const residents = await Resident.aggregate(aggregatePipeline);

      // 处理响应数据
      const processedData = await this.processResidentsData(residents);

      // 缓存5分钟
      if (!req.query.noCache) {
        await CacheUtil.set(cacheKey, processedData, 300);
      }

      const duration = performance.now() - start;

      // 记录性能日志
      this.logPerformance('getResidents', duration, {
        recordCount: residents.length,
        cached: false
      });

      res.json({
        success: true,
        data: processedData,
        pagination: {
          total: req.query.total || residents.length,
          page: req.query.page || 1,
          limit: req.query.limit || 20
        },
        performance: {
          duration,
          cached: false,
          recordCount: residents.length
        }
      });

    } catch (error) {
      const duration = performance.now() - start;
      logger.error('获取村民列表失败:', {
        requestId,
        error: error.message,
        duration,
        stack: error.stack
      });

      this.handleError(res, error, 'getResidents');
    }
  }

  /**
   * 获取单个村民信息（优化版）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getResident(req, res) {
    const start = performance.now();
    const { id } = req.params;
    const requestId = req.id || this.generateRequestId();

    try {
      // 使用聚合查询优化
      const resident = await Resident.aggregate([
        { $match: { _id: this.toObjectId(id) } },
        {
          $lookup: {
            from: 'villages',
            localField: 'villageId',
            foreignField: '_id',
            as: 'village',
            pipeline: [
              { $project: { name: 1, code: 1, address: 1 } }
            ]
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            phone: {
              $concat: [
                { $substr: ['$phone', 0, 3] },
                '****',
                { $substr: ['$phone', -4, 4] }
              ]
            },
            idCard: {
              $concat: [
                { $substr: ['$idCard', 0, 6] },
                '********',
                { $substr: ['$idCard', -4, 4] }
              ]
            },
            age: {
              $dateDiff: [
                { $dateFromString: new Date().toISOString() },
                '$birthday'
              ]
            },
            gender: 1,
            education: 1,
            address: 1,
            status: 1,
            village: '$village',
            createdAt: 1,
            updatedAt: 1
          }
        }
      ]);

      if (!resident || resident.length === 0) {
        return res.status(404).json({
          success: false,
          error: '村民信息不存在',
          code: 'RESIDENT_NOT_FOUND'
        });
      }

      const duration = performance.now() - start;

      res.json({
        success: true,
        data: resident[0],
        performance: {
          duration
        }
      });

    } catch (error) {
      logger.error('获取村民信息失败:', error);
      this.handleError(res, error, 'getResident');
    }
  }

  /**
   * 创建村民信息（批量优化版）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createResident(req, res) {
    const start = performance.now();
    const residents = Array.isArray(req.body) ? req.body : [req.body];

    try {
      // 数据验证
      const validationErrors = this.validateResidentsData(residents);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: '数据验证失败',
          details: validationErrors,
          code: 'VALIDATION_ERROR'
        });
      }

      // 批量插入优化
      const results = await this.batchInsertResidents(residents);

      const duration = performance.now() - start;

      // 清除相关缓存
      await this.clearResidentCache();

      res.json({
        success: true,
        data: results,
        summary: {
          total: residents.length,
          success: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          performance: {
            duration,
            avgTimePerRecord: duration / residents.length
          }
        }
      });

    } catch (error) {
      logger.error('创建村民信息失败:', error);
      this.handleError(res, error, 'createResident');
    }
  }

  /**
   * 导出村民数据（流式处理优化版）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async exportResidents(req, res) {
    const start = performance.now();
    const requestId = req.id || this.generateRequestId();

    try {
      // 设置响应头
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="residents_${Date.now()}.csv"`,
        'Transfer-Encoding': 'chunked'
      });

      // 创建CSV写入器
      const csvWriter = csv.createObjectCsvWriter({
        headers: [
          'ID',
          '姓名',
          '手机号',
          '身份证号',
          '性别',
          '年龄',
          '教育程度',
          '地址',
          '村庄',
          '状态',
          '创建时间'
        ],
        encoding: 'utf8'
      });

      // 创建转换流
      const transformStream = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          if (chunk) {
            const csvRow = [
              chunk._id?.toString() || '',
              chunk.name || '',
              chunk.phone || '',
              chunk.idCard || '',
              chunk.gender || '',
              chunk.age || '',
              chunk.education || '',
              chunk.address || '',
              chunk.village?.name || '',
              chunk.status || '',
              chunk.createdAt?.toISOString() || ''
            ];
            callback(null, csvRow.join(',') + '\n');
          } else {
            callback();
          }
        }
      });

      // 创建查询流
      const queryStream = Resident.find()
        .populate('villageId', 'name')
        .cursor({ batchSize: 1000 });

      // 管道：查询 → 转换 → CSV
      queryStream
        .pipe(transformStream)
        .pipe(csvWriter)
        .pipe(res);

      // 错误处理
      queryStream.on('error', (error) => {
        logger.error('导出数据失败:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: '导出失败',
            message: error.message
          });
        }
      });

      queryStream.on('end', () => {
        const duration = performance.now() - start;
        logger.info('数据导出完成', {
          requestId,
          duration
        });
      });

    } catch (error) {
      logger.error('导出村民数据失败:', error);
      this.handleError(res, error, 'exportResidents');
    }
  }

  /**
   * 获取村民统计信息（聚合查询优化）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getResidentStats(req, res) {
    const start = performance.now();
    const { villageId } = req.query;

    try {
      // 缓存键
      const cacheKey = `resident_stats:${villageId || 'all'}`;

      // 尝试从缓存获取
      let cachedStats = await CacheUtil.get(cacheKey);

      if (cachedStats && !req.query.noCache) {
        return res.json({
          success: true,
          data: cachedStats,
          cached: true
        });
      }

      // 构建聚合查询
      const matchStage = villageId ? { villageId: this.toObjectId(villageId) } : {};

      const stats = await Resident.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            genderStats: {
              $push: '$gender'
            },
            ageGroups: {
              $push: {
                $cond: {
                  if: { $lte: ['$age', 18] },
                  then: '0-18',
                  elseif: { $lte: ['$age', 35] },
                  elseif: { $lte: ['$age', 50] },
                  elseif: { $lte: ['$age', 65] },
                  else: '65+'
                }
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            total: 1,
            genderDistribution: {
              $arrayToObject: {
                input: '$genderStats',
                as: 'gender',
                in: { $reduce: { $sum: 1 } }
              }
            },
            ageDistribution: {
              $arrayToObject: {
                input: '$ageGroups',
                as: 'ageGroup',
                in: { $reduce: { $sum: 1 } }
              }
            }
          }
        }
      ]);

      // 获取各村统计
      const villageStats = villageId ? null : await this.getVillageDistribution();

      const processedStats = {
        ...stats[0],
        villageDistribution: villageStats
      };

      // 缓存10分钟
      await CacheUtil.set(cacheKey, processedStats, 600);

      const duration = performance.now() - start;

      res.json({
        success: true,
        data: processedStats,
        performance: {
          duration,
          cached: false
        }
      });

    } catch (error) {
      logger.error('获取统计信息失败:', error);
      this.handleError(res, error, 'getResidentStats');
    }
  }

  /**
   * 搜索村民（全文搜索优化）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async searchResidents(req, res) {
    const start = performance.now();
    const { q, villageId, limit = 20, page = 1 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: '搜索关键词不能为空',
        code: 'MISSING_QUERY'
      });
    }

    try {
      // 创建索引搜索查询
      const searchQuery = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { phone: { $regex: q } },
          { address: { $regex: q, $options: 'i' } },
          { idCard: { $regex: q } }
        ]
      };

      if (villageId) {
        searchQuery.villageId = this.toObjectId(villageId);
      }

      // 执行搜索
      const residents = await Resident
        .find(searchQuery)
        .populate('villageId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const duration = performance.now() - start;

      res.json({
        success: true,
        data: residents,
        search: {
          query: q,
          total: residents.length,
          duration
        },
        pagination: {
          page,
          limit
        }
      });

    } catch (error) {
      logger.error('搜索村民失败:', error);
      this.handleError(res, error, 'searchResidents');
    }
  }

  /**
   * 构建聚合查询管道
   * @param {Object} query - 查询参数
   * @returns {Array} 聚合管道
   */
  buildAggregatePipeline(query) {
    const pipeline = [];

    // 匹配条件
    const matchStage = {};

    if (query.villageId) {
      matchStage.villageId = this.toObjectId(query.villageId);
    }

    if (query.status) {
      matchStage.status = query.status;
    }

    if (query.gender) {
      matchStage.gender = query.gender;
    }

    if (query.minAge || query.maxAge) {
      matchStage.age = {};
      if (query.minAge) matchStage.age.$gte = parseInt(query.minAge);
      if (query.maxAge) matchStage.age.$lte = parseInt(query.maxAge);
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // 关联村庄信息
    pipeline.push({
      $lookup: {
        from: 'villages',
        localField: 'villageId',
        foreignField: '_id',
        as: 'village',
        pipeline: [
          { $project: { name: 1, code: 1, address: 1 } }
        ]
      }
    });

    // 投影字段
    const projectFields = {
      _id: 1,
      name: 1,
      phone: {
        $concat: [
          { $substr: ['$phone', 0, 3] },
          '****',
          { $substr: ['$phone', -4, 4] }
        ]
      },
      idCard: {
        $concat: [
          { $substr: ['$idCard', 0, 6] },
          '********',
          { $substr: ['$idCard', -4, 4] }
        ]
      },
      age: 1,
      gender: 1,
      education: 1,
      address: 1,
      status: 1,
      village: '$village',
      createdAt: 1,
      updatedAt: 1
    };

    // 只返回需要的字段
    pipeline.push({ $project: projectFields });

    // 排序
    if (query.sortBy) {
      const sortField = this.getSortField(query.sortBy);
      const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
      pipeline.push({ $sort: { [sortField, sortOrder] } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // 分页
    const limit = parseInt(query.limit) || 20;
    const skip = (parseInt(query.page) - 1) * limit;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    return pipeline;
  }

  /**
   * 处理村民数据
   * @param {Array} residents - 村民数据
   * @returns {Array} 处理后的数据
   */
  async processResidentsData(residents) {
    return residents.map(resident => ({
      id: resident._id,
      name: resident.name,
      phone: resident.phone,
      idCard: resident.idCard,
      age: resident.age,
      gender: resident.gender,
      education: resident.education,
      address: resident.address,
      status: resident.status,
      village: resident.village,
      createdAt: resident.createdAt,
      updatedAt: resident.updatedAt
    }));
  }

  /**
   * 验证村民数据
   * @param {Array} residents - 村民数据数组
   * @returns {Array} 验证错误
   */
  validateResidentsData(residents) {
    const errors = [];

    residents.forEach((resident, index) => {
      if (!resident.name || resident.name.trim() === '') {
        errors.push({
          index,
          field: 'name',
          message: '姓名不能为空'
        });
      }

      if (!resident.phone || !/^1[3-9]\d{9}$/.test(resident.phone)) {
        errors.push({
          index,
          field: 'phone',
          message: '手机号格式不正确'
        });
      }

      if (!resident.villageId) {
        errors.push({
          index,
          field: 'villageId',
          message: '村庄ID不能为空'
        });
      }
    });

    return errors;
  }

  /**
   * 批量插入村民
   * @param {Array} residents - 村民数据数组
   * @returns {Array} 插入结果
   */
  async batchInsertResidents(residents) {
    try {
      // 预处理数据
      const processedResidents = residents.map(resident => ({
        ...resident,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // 批量插入
      const results = await Resident.insertMany(processedResidents);

      // 记录审计日志
      await Promise.all(residents.map(resident =>
        AuditUtil.logOperation('CREATE', 'resident', {
          name: resident.name,
          phone: this.maskPhone(resident.phone)
        }, {
          result: 'SUCCESS',
          details: {
            residentId: results.insertedIds[residents.indexOf(resident)]
          }
        })
      ));

      return residents.map((resident, index) => ({
        ...resident,
        _id: results.insertedIds[index],
        success: true
      }));

    } catch (error) {
      logger.error('批量插入失败:', error);
      return residents.map(resident => ({
        ...resident,
        success: false,
        error: error.message
      }));
    }
  }

  /**
   * 获取村庄分布统计
   * @returns {Array} 村庄统计数据
   */
  async getVillageDistribution() {
    return await Resident.aggregate([
      {
        $group: {
          _id: '$villageId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'villages',
          localField: '_id',
          foreignField: '_id',
          as: 'village'
        }
      },
      {
        $project: {
          village: '$village.name',
          count: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
  }

  /**
   * 构建缓存键
   * @param {string} prefix - 前缀
   * @param {Object} params - 参数对象
   * @returns {string} 缓存键
   */
  buildCacheKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');

    return `${prefix}:${sortedParams}`;
  }

  /**
   * 清除村民相关缓存
   */
  async clearResidentCache() {
    const patterns = [
      'residents:*',
      'resident_stats:*',
      'village_stats:*'
    ];

    await Promise.all(
      patterns.map(pattern => CacheUtil.delPattern(pattern))
    );
  }

  /**
   * 记录性能日志
   * @param {string} operation - 操作名称
   * @param {number} duration - 持续时间（毫秒）
   * @param {Object} metadata - 元数据
   */
  logPerformance(operation, duration, metadata = {}) {
    const perfData = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    // 记录慢查询
    if (duration > 1000) {
      logger.warn('慢查询警告', perfData);
    }

    // 发送到监控系统
    this.emit('performance', perfData);
  }

  /**
   * 处理错误
   * @param {Object} res - 响应对象
   * @param {Error} error - 错误对象
   * @param {string} operation - 操作名称
   */
  handleError(res, error, operation) {
    logger.error(`${operation}失败:`, {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_ERROR',
      operation
    });
  }

  /**
   * 生成请求ID
   * @returns {string} 请求ID
   */
  generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 获取排序字段
   * @param {string} sortBy - 排序字段
   * @returns {string} 排序字段
   */
  getSortField(sortBy) {
    const fieldMap = {
      'name': 'name',
      'createdAt': 'createdAt',
      'updatedAt': 'updatedAt',
      'age': 'age'
    };

    return fieldMap[sortBy] || 'createdAt';
  }

  /**
   * 脱敏手机号
   * @param {string} phone - 手机号
   * @returns {string} 脱敏后的手机号
   */
  maskPhone(phone) {
    if (!phone || phone.length < 7) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * 转换ObjectId
   * @param {string} id - ID字符串
   * @returns {ObjectId} ObjectId
   */
  toObjectId(id) {
    try {
      return new require('mongoose').Types.ObjectId(id);
    } catch (error) {
      return null;
    }
  }
}

module.exports = new OptimizedResidentController();