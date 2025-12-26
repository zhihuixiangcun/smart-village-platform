/**
 * 优化的查询服务
 * 提供智能查询优化和自动索引建议
 */

const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');
const { CacheUtil } = require('../../utils/cache');
const logger = require('../utils/logger');

class OptimizedQueryService extends EventEmitter {
  constructor() {
    super();

    // 慢查询阈值（毫秒）
    this.slowQueryThreshold = 1000;

    // 查询统计
    this.queryStats = new Map();

    // 索引建议缓存
    this.indexSuggestions = new Map();

    // 查询计划缓存
    this.queryPlanCache = new Map();

    // 监控的集合
    this.monitoredCollections = [
      'residents',
      'villages',
      'announcements',
      'servicerequests',
      'users'
    ];

    // 初始化查询监控
    this.initQueryMonitoring();
  }

  /**
   * 初始化查询监控
   */
  initQueryMonitoring() {
    // 定期分析慢查询
    setInterval(async () => {
      await this.analyzeSlowQueries();
    }, 10 * 60 * 1000); // 每10分钟分析一次

    // 定期清理过期数据
    setInterval(async () => {
      await this.cleanupExpiredData();
    }, 60 * 60 * 1000); // 每小时清理一次
  }

  /**
   * 执行优化的聚合查询
   * @param {Object} Model - Mongoose模型
   * @param {Array} pipeline - 聚合管道
   * @param {Object} options - 选项
   * @returns {Promise} 查询结果
   */
  async optimizedAggregate(Model, pipeline, options = {}) {
    const start = performance.now();
    const collectionName = Model.collection.name;

    try {
      // 优化查询管道
      const optimizedPipeline = await this.optimizePipeline(pipeline, collectionName);

      // 执行查询
      const result = await Model.aggregate(optimizedPipeline).allowDiskUse(true);

      const duration = performance.now() - start;

      // 记录查询统计
      this.recordQueryStats(collectionName, 'aggregate', pipeline, duration);

      // 检查是否为慢查询
      if (duration > this.slowQueryThreshold) {
        this.handleSlowQuery(collectionName, 'aggregate', pipeline, duration);
      }

      // 生成索引建议
      await this.generateIndexSuggestion(collectionName, pipeline, duration);

      return result;

    } catch (error) {
      const duration = performance.now() - start;
      logger.error('聚合查询失败', {
        collection: collectionName,
        duration,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 执行优化的查询
   * @param {Object} Model - Mongoose模型
   * @param {Object} filter - 查询条件
   * @param {Object} options - 查询选项
   * @returns {Promise} 查询结果
   */
  async optimizedFind(Model, filter = {}, options = {}) {
    const start = performance.now();
    const collectionName = Model.collection.name;

    try {
      // 优化查询条件
      const optimizedFilter = await this.optimizeFilter(filter, collectionName);

      // 构建查询选项
      const queryOptions = {
        ...options,
        // 优化查询选项
        maxTimeMS: options.maxTimeMS || 30000, // 30秒超时
        hint: options.hint || await this.getOptimalIndex(collectionName, optimizedFilter)
      };

      // 执行查询
      let query = Model.find(optimizedFilter, null, queryOptions);

      // 添加字段投影
      if (options.select) {
        query = query.select(options.select);
      }

      // 添加排序
      if (options.sort) {
        query = query.sort(options.sort);
      }

      // 添加分页
      if (options.skip) {
        query = query.skip(options.skip);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const result = await query.lean(); // 返回普通对象以提高性能

      const duration = performance.now() - start;

      // 记录查询统计
      this.recordQueryStats(collectionName, 'find', filter, duration);

      // 检查是否为慢查询
      if (duration > this.slowQueryThreshold) {
        this.handleSlowQuery(collectionName, 'find', filter, duration);
      }

      // 生成索引建议
      await this.generateIndexSuggestion(collectionName, filter, duration);

      return result;

    } catch (error) {
      const duration = performance.now() - start;
      logger.error('查询失败', {
        collection: collectionName,
        filter,
        duration,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 优化聚合管道
   * @param {Array} pipeline - 原始管道
   * @param {string} collectionName - 集合名称
   * @returns {Array} 优化后的管道
   */
  async optimizePipeline(pipeline, collectionName) {
    const optimized = [...pipeline];

    // 1. 确保$match在管道开始
    const firstMatchIndex = optimized.findIndex(stage => stage.$match);
    if (firstMatchIndex > 0) {
      // 将$match阶段移到最前面
      const matchStage = optimized.splice(firstMatchIndex, 1)[0];
      optimized.unshift(matchStage);
    }

    // 2. 优化$project阶段
    optimized.forEach((stage, index) => {
      if (stage.$project) {
        // 优化投影，移除不必要的字段
        optimized[index] = {
          $project: this.optimizeProjection(stage.$project)
        };
      }
    });

    // 3. 添加采样优化（仅在大数据量时）
    if (await this.estimateCollectionSize(collectionName) > 100000) {
      // 在$match后添加$sample以提高性能
      const matchIndex = optimized.findIndex(stage => stage.$match);
      if (matchIndex !== -1 && !optimized.some(stage => stage.$sample)) {
        optimized.splice(matchIndex + 1, 0, {
          $sample: { size: Math.min(10000, await this.getOptimalSampleSize(collectionName)) }
        });
      }
    }

    return optimized;
  }

  /**
   * 优化查询条件
   * @param {Object} filter - 原始查询条件
   * @param {string} collectionName - 集合名称
   * @returns {Object} 优化后的查询条件
   */
  async optimizeFilter(filter, collectionName) {
    const optimized = { ...filter };

    // 1. 优化正则表达式
    Object.keys(optimized).forEach(key => {
      if (typeof optimized[key] === 'object' && optimized[key].$regex) {
        // 优化正则表达式
        const regex = optimized[key].$regex;
        if (typeof regex === 'string') {
          // 添加锚点以提高性能
          if (!regex.startsWith('^')) {
            optimized[key].$regex = '^' + regex;
          }
          // 设置为不区分大小写（如果需要）
          if (!optimized[key].$options) {
            optimized[key].$options = 'i';
          }
        }
      }
    });

    // 2. 添加隐式索引提示
    const indexHint = await this.getOptimalIndex(collectionName, optimized);
    if (indexHint) {
      optimized._hint = indexHint;
    }

    return optimized;
  }

  /**
   * 优化投影
   * @param {Object} projection - 原始投影
   * @returns {Object} 优化后的投影
   */
  optimizeProjection(projection) {
    const optimized = { ...projection };

    // 移除不必要的字段
    const unnecessaryFields = ['__v', 'updatedAt'];
    unnecessaryFields.forEach(field => {
      if (optimized[field] === undefined) {
        optimized[field] = 0; // 排除字段
      }
    });

    // 优化嵌入式文档投影
    Object.keys(optimized).forEach(key => {
      if (key.includes('.')) {
        // 只保留必要的嵌套字段
        const parts = key.split('.');
        if (parts.length > 3) {
          // 过深的嵌套投影可能影响性能
          delete optimized[key];
        }
      }
    });

    return optimized;
  }

  /**
   * 获取最佳索引
   * @param {string} collectionName - 集合名称
   * @param {Object} filter - 查询条件
   * @returns {Object} 索引提示
   */
  async getOptimalIndex(collectionName, filter) {
    // 从缓存获取索引建议
    const cacheKey = `index:${collectionName}:${JSON.stringify(filter)}`;
    let indexHint = await CacheUtil.get(cacheKey);

    if (indexHint) {
      return indexHint;
    }

    // 分析查询条件，生成索引建议
    const suggestedIndex = this.analyzeQueryForIndex(filter);

    // 缓存索引建议
    await CacheUtil.set(cacheKey, suggestedIndex, 3600);

    return suggestedIndex;
  }

  /**
   * 分析查询条件生成索引建议
   * @param {Object} filter - 查询条件
   * @returns {Object} 索引建议
   */
  analyzeQueryForIndex(filter) {
    const indexFields = [];

    // 分析查询字段
    Object.keys(filter).forEach(key => {
      if (key === '_id') return; // _id已有索引

      const value = filter[key];

      if (typeof value === 'object') {
        // 处理操作符
        if (value.$regex) {
          // 正则表达式需要文本索引
          indexFields.push(key);
        } else if (value.$in || value.$nin) {
          // 包含查询需要单字段索引
          indexFields.push(key);
        } else if (value.$gte || value.$lte || value.$gt || value.$lt) {
          // 范围查询需要单字段索引
          indexFields.push(key);
        }
      } else {
        // 精确匹配
        indexFields.push(key);
      }
    });

    if (indexFields.length === 0) {
      return null;
    }

    // 构建索引对象
    const index = {};
    indexFields.forEach(field => {
      index[field] = 1; // 升序索引
    });

    return index;
  }

  /**
   * 生成索引建议
   * @param {string} collectionName - 集合名称
   * @param {Object|Array} query - 查询条件或管道
   * @param {number} duration - 查询时间
   */
  async generateIndexSuggestion(collectionName, query, duration) {
    // 只有慢查询才生成索引建议
    if (duration < this.slowQueryThreshold) {
      return;
    }

    const key = `suggestions:${collectionName}`;
    let suggestions = this.indexSuggestions.get(key) || [];

    // 分析查询生成索引建议
    const suggestedIndex = this.analyzeQueryForIndex(query);

    if (suggestedIndex && !suggestions.some(s => JSON.stringify(s.index) === JSON.stringify(suggestedIndex))) {
      suggestions.push({
        index: suggestedIndex,
        query,
        duration,
        timestamp: new Date(),
        improvement: this.estimateImprovement(duration)
      });

      // 保留最近10个建议
      if (suggestions.length > 10) {
        suggestions = suggestions.slice(-10);
      }

      this.indexSuggestions.set(key, suggestions);

      // 记录索引建议
      logger.info('生成索引建议', {
        collection: collectionName,
        index: suggestedIndex,
        duration: `${duration.toFixed(2)}ms`,
        estimatedImprovement: `${this.estimateImprovement(duration)}%`
      });
    }
  }

  /**
   * 估算性能提升百分比
   * @param {number} duration - 当前查询时间
   * @returns {number} 预估提升百分比
   */
  estimateImprovement(duration) {
    if (duration < 100) return 10;
    if (duration < 500) return 30;
    if (duration < 2000) return 60;
    if (duration < 5000) return 80;
    return 90;
  }

  /**
   * 估算集合大小
   * @param {string} collectionName - 集合名称
   * @returns {number} 文档数量
   */
  async estimateCollectionSize(collectionName) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const stats = await db.collection(collectionName).estimatedDocumentCount();
      return stats;
    } catch (error) {
      logger.warn('估算集合大小失败', { collection: collectionName, error: error.message });
      return 0;
    }
  }

  /**
   * 获取最优采样大小
   * @param {string} collectionName - 集合名称
   * @returns {number} 采样大小
   */
  async getOptimalSampleSize(collectionName) {
    const size = await this.estimateCollectionSize(collectionName);

    // 根据集合大小返回采样比例
    if (size < 1000) return size;
    if (size < 10000) return 1000;
    if (size < 100000) return 5000;
    if (size < 1000000) return 10000;
    return 50000;
  }

  /**
   * 记录查询统计
   * @param {string} collectionName - 集合名称
   * @param {string} type - 查询类型
   * @param {Object|Array} query - 查询条件
   * @param {number} duration - 执行时间
   */
  recordQueryStats(collectionName, type, query, duration) {
    const key = `${collectionName}:${type}`;
    const stats = this.queryStats.get(key) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      slowQueries: []
    };

    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);

    // 记录慢查询
    if (duration > this.slowQueryThreshold) {
      stats.slowQueries.push({
        query,
        duration,
        timestamp: new Date()
      });

      // 保留最近20个慢查询
      if (stats.slowQueries.length > 20) {
        stats.slowQueries = stats.slowQueries.slice(-20);
      }
    }

    this.queryStats.set(key, stats);
  }

  /**
   * 处理慢查询
   * @param {string} collectionName - 集合名称
   * @param {string} type - 查询类型
   * @param {Object|Array} query - 查询条件
   * @param {number} duration - 执行时间
   */
  handleSlowQuery(collectionName, type, query, duration) {
    logger.warn('慢查询检测', {
      collection: collectionName,
      type,
      duration: `${duration.toFixed(2)}ms`,
      threshold: `${this.slowQueryThreshold}ms`,
      query
    });

    // 发出慢查询事件
    this.emit('slowQuery', {
      collectionName,
      type,
      query,
      duration
    });
  }

  /**
   * 分析慢查询
   */
  async analyzeSlowQueries() {
    const analysis = {
      timestamp: new Date(),
      collections: {},
      recommendations: []
    };

    for (const [key, stats] of this.queryStats.entries()) {
      const [collectionName, type] = key.split(':');

      if (stats.slowQueries.length > 0) {
        analysis.collections[collectionName] = {
          type,
          totalQueries: stats.count,
          slowQueries: stats.slowQueries.length,
          slowQueryRate: (stats.slowQueries.length / stats.count * 100).toFixed(2) + '%',
          avgDuration: stats.avgDuration.toFixed(2) + 'ms'
        };

        // 生成优化建议
        if (stats.slowQueryRate > '10%') {
          analysis.recommendations.push({
            collection: collectionName,
            type: 'performance',
            message: `${collectionName}集合的${type}操作慢查询率过高（${stats.slowQueryRate}），建议优化查询或添加索引`,
            priority: 'high'
          });
        }
      }
    }

    // 缓存分析结果
    await CacheUtil.set('query:analysis', analysis, 3600);

    return analysis;
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData() {
    // 清理查询计划缓存（超过1小时）
    const now = Date.now();
    for (const [key, data] of this.queryPlanCache.entries()) {
      if (now - data.timestamp > 3600000) {
        this.queryPlanCache.delete(key);
      }
    }

    // 清理旧的索引建议（超过24小时）
    for (const [key, suggestions] of this.indexSuggestions.entries()) {
      const filtered = suggestions.filter(s => now - s.timestamp.getTime() < 86400000);
      if (filtered.length === 0) {
        this.indexSuggestions.delete(key);
      } else {
        this.indexSuggestions.set(key, filtered);
      }
    }

    logger.debug('清理过期查询数据完成');
  }

  /**
   * 获取查询统计报告
   * @returns {Object} 查询统计报告
   */
  getQueryStatsReport() {
    const report = {
      timestamp: new Date(),
      totalQueries: 0,
      totalSlowQueries: 0,
      avgResponseTime: 0,
      collections: {},
      recommendations: []
    };

    let totalDuration = 0;
    let queryCount = 0;

    for (const [key, stats] of this.queryStats.entries()) {
      const [collectionName, type] = key.split(':');

      report.totalQueries += stats.count;
      report.totalSlowQueries += stats.slowQueries.length;
      totalDuration += stats.totalDuration;
      queryCount += stats.count;

      report.collections[collectionName] = {
        type,
        queries: stats.count,
        avgDuration: stats.avgDuration.toFixed(2) + 'ms',
        slowQueries: stats.slowQueries.length,
        slowQueryRate: (stats.slowQueries.length / stats.count * 100).toFixed(2) + '%'
      };
    }

    if (queryCount > 0) {
      report.avgResponseTime = (totalDuration / queryCount).toFixed(2) + 'ms';
    }

    return report;
  }

  /**
   * 获取索引建议报告
   * @returns {Object} 索引建议报告
   */
  getIndexSuggestionsReport() {
    const report = {
      timestamp: new Date(),
      collections: {},
      totalSuggestions: 0
    };

    for (const [key, suggestions] of this.indexSuggestions.entries()) {
      const collectionName = key.replace('suggestions:', '');
      report.collections[collectionName] = suggestions;
      report.totalSuggestions += suggestions.length;
    }

    return report;
  }
}

// 单例模式
const optimizedQueryService = new OptimizedQueryService();

module.exports = optimizedQueryService;