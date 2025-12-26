/**
 * 查询优化器
 * 优化MongoDB查询和聚合管道性能
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

class QueryOptimizer {
  constructor(options = {}) {
    this.options = {
      enableProfiling: options.enableProfiling || true,
      slowQueryThreshold: options.slowQueryThreshold || 100, // ms
      cacheSize: options.cacheSize || 1000,
      ...options
    };

    this.queryCache = new Map();
    this.performanceMetrics = new Map();
  }

  /**
   * 优化查询
   */
  async optimizeQuery(collection, query, options = {}) {
    const startTime = Date.now();
    const queryHash = this.generateQueryHash(collection, query, options);

    // 检查缓存
    if (this.queryCache.has(queryHash)) {
      const cached = this.queryCache.get(queryHash);
      if (Date.now() - cached.timestamp < 300000) { // 5分钟缓存
        return cached.result;
      }
    }

    // 分析查询计划
    const analysis = await this.analyzeQueryPlan(collection, query, options);

    // 应用优化
    const optimizedQuery = await this.applyOptimizations(collection, query, options, analysis);

    // 执行查询
    const result = await this.executeQuery(collection, optimizedQuery.query, optimizedQuery.options);

    // 记录性能指标
    const executionTime = Date.now() - startTime;
    this.recordMetrics(collection, query, executionTime, analysis);

    // 缓存结果
    this.queryCache.set(queryHash, {
      result,
      timestamp: Date.now(),
      executionTime
    });

    // 清理过期缓存
    if (this.queryCache.size > this.options.cacheSize) {
      this.cleanupCache();
    }

    return result;
  }

  /**
   * 优化聚合管道
   */
  async optimizeAggregation(collection, pipeline) {
    logger.debug('优化聚合管道...');
    const optimizedPipeline = await this.optimizePipelineStages(collection, pipeline);
    const performanceAnalysis = await this.analyzePipelinePerformance(collection, optimizedPipeline);

    return {
      originalPipeline: pipeline,
      optimizedPipeline,
      performanceAnalysis,
      recommendations: this.generatePipelineRecommendations(performanceAnalysis)
    };
  }

  /**
   * 优化管道阶段
   */
  async optimizePipelineStages(collection, pipeline) {
    const optimized = [...pipeline];
    let stageIndex = 0;

    // 1. 移动$match阶段到管道开始
    optimized.sort((a, b) => {
      if (a.$match && !b.$match) return -1;
      if (!a.$match && b.$match) return 1;
      return 0;
    });

    // 2. 合并相邻的$match阶段
    for (let i = 0; i < optimized.length - 1; i++) {
      if (optimized[i].$match && optimized[i + 1].$match) {
        optimized[i].$match = { $and: [optimized[i].$match, optimized[i + 1].$match] };
        optimized.splice(i + 1, 1);
        i--;
      }
    }

    // 3. 优化$group阶段
    for (let i = 0; i < optimized.length; i++) {
      if (optimized[i].$group) {
        optimized[i] = await this.optimizeGroupStage(collection, optimized[i], i, optimized);
      }
    }

    // 4. 优化$lookup阶段
    for (let i = 0; i < optimized.length; i++) {
      if (optimized[i].$lookup) {
        optimized[i] = await this.optimizeLookupStage(optimized[i]);
      }
    }

    // 5. 优化$project阶段
    for (let i = 0; i < optimized.length; i++) {
      if (optimized[i].$project) {
        optimized[i] = await this.optimizeProjectStage(optimized[i]);
      }
    }

    // 6. 添加必要的索引提示
    const hint = await this.generateIndexHint(collection, optimized[0]?.$match || {});
    if (hint) {
      optimized.unshift({ $hint: hint });
    }

    return optimized;
  }

  /**
   * 优化$group阶段
   */
  async optimizeGroupStage(collection, groupStage, index, pipeline) {
    const optimized = { ...groupStage };

    // 1. 优化累加器操作
    if (optimized.$group) {
      for (const [field, accumulator] of Object.entries(optimized.$group)) {
        if (field !== '_id') {
          optimized.$group[field] = this.optimizeAccumulator(accumulator);
        }
      }
    }

    // 2. 添加早期投影减少数据传输
    if (index > 0 && pipeline[index - 1].$match) {
      const requiredFields = this.extractRequiredFields(optimized);
      if (requiredFields.length > 0) {
        // 在$group之前插入$project
        const projectStage = this.createProjectStage(requiredFields);
        pipeline.splice(index, 0, projectStage);
        index++;
      }
    }

    return optimized;
  }

  /**
   * 优化$lookup阶段
   */
  async optimizeLookupStage(lookupStage) {
    const optimized = { ...lookupStage };

    // 1. 添加let和pipeline优化子查询
    if (!optimized.$lookup.pipeline) {
      optimized.$lookup.let = {};
      optimized.$lookup.pipeline = [
        {
          $match: {
            $expr: {
              $eq: [`$${optimized.$lookup.localField}`, `$$${optimized.$lookup.foreignField}`]
            }
          }
        }
      ];
      delete optimized.$lookup.localField;
      delete optimized.$lookup.foreignField;
    }

    // 2. 添加索引提示到子管道
    if (optimized.$lookup.pipeline && !optimized.$lookup.pipeline.some(s => s.$hint)) {
      optimized.$lookup.pipeline.unshift({ $hint: optimized.$lookup.as });
    }

    return optimized;
  }

  /**
   * 优化$project阶段
   */
  async optimizeProjectStage(projectStage) {
    const optimized = { ...projectStage };

    // 1. 移除未使用的字段
    if (optimized.$project) {
      // 检查是否是包含型投影
      const hasInclusion = Object.values(optimized.$project).some(v => v === 1);
      if (hasInclusion) {
        // 移除隐式排除的_id
        if (optimized.$project._id !== 1) {
          delete optimized.$project._id;
        }
      }
    }

    // 2. 优化计算字段
    for (const [field, expression] of Object.entries(optimized.$project || {})) {
      if (typeof expression === 'object' && !Array.isArray(expression)) {
        optimized.$project[field] = this.optimizeExpression(expression);
      }
    }

    return optimized;
  }

  /**
   * 分析查询计划
   */
  async analyzeQueryPlan(collection, query, options) {
    const Collection = mongoose.connection.db.collection(collection);

    try {
      const explain = await Collection.find(query, options).explain('executionStats');

      return {
        executionTimeMillis: explain.executionStats.executionTimeMillis,
        totalDocsExamined: explain.executionStats.totalDocsExamined,
        totalDocsReturned: explain.executionStats.totalDocsReturned,
        indexesUsed: this.extractIndexesFromExplain(explain),
        stage: explain.executionStats.executionStages.stage,
        efficiency: this.calculateQueryEfficiency(explain),
        recommendations: this.generateQueryRecommendations(explain)
      };
    } catch (error) {
      logger.error('查询计划分析失败:', error);
      return null;
    }
  }

  /**
   * 应用查询优化
   */
  async applyOptimizations(collection, query, options, analysis) {
    const optimizedQuery = { ...query };
    const optimizedOptions = { ...options };

    // 1. 添加索引提示
    if (analysis && analysis.indexesUsed.length === 0) {
      const suggestedIndex = await this.suggestOptimalIndex(collection, query);
      if (suggestedIndex) {
        optimizedOptions.hint = suggestedIndex;
      }
    }

    // 2. 优化投影
    if (!optimizedOptions.projection) {
      optimizedOptions.projection = this.generateOptimalProjection(query);
    }

    // 3. 优化分页
    if (optimizedOptions.skip && optimizedOptions.skip > 1000) {
      const rangeQuery = await this.optimizeSkipQuery(collection, query, optimizedOptions);
      if (rangeQuery) {
        optimizedQuery._id = rangeQuery;
        delete optimizedOptions.skip;
      }
    }

    // 4. 添加查询批处理优化
    if (optimizedOptions.limit && optimizedOptions.limit > 1000) {
      optimizedOptions.batchSize = Math.min(optimizedOptions.limit, 1000);
    }

    return {
      query: optimizedQuery,
      options: optimizedOptions
    };
  }

  /**
   * 优化大偏移量查询
   */
  async optimizeSkipQuery(collection, query, options) {
    // 获取最后一页的ID范围
    const Collection = mongoose.connection.db.collection(collection);
    const lastDoc = await Collection.find(query)
      .sort({ _id: 1 })
      .skip(options.skip - 1)
      .limit(1)
      .next();

    if (lastDoc) {
      return { $gt: lastDoc._id };
    }
    return null;
  }

  /**
   * 执行查询
   */
  async executeQuery(collection, query, options) {
    const Collection = mongoose.connection.db.collection(collection);

    try {
      const result = await Collection.find(query, options).toArray();
      return result;
    } catch (error) {
      logger.error('查询执行失败:', error);
      throw error;
    }
  }

  /**
   * 执行聚合管道
   */
  async executeAggregation(collection, pipeline, options = {}) {
    const Collection = mongoose.connection.db.collection(collection);

    try {
      // 使用allowDiskUse选项处理大数据集
      const result = await Collection.aggregate(pipeline, {
        allowDiskUse: true,
        ...options
      }).toArray();

      return result;
    } catch (error) {
      logger.error('聚合执行失败:', error);
      throw error;
    }
  }

  /**
   * 生成查询哈希
   */
  generateQueryHash(collection, query, options) {
    const hash = JSON.stringify({
      collection,
      query,
      options: {
        projection: options.projection,
        sort: options.sort,
        limit: options.limit,
        skip: options.skip
      }
    });

    // 简单哈希函数
    let hashValue = 0;
    for (let i = 0; i < hash.length; i++) {
      const char = hash.charCodeAt(i);
      hashValue = ((hashValue << 5) - hashValue) + char;
      hashValue = hashValue & hashValue; // 转换为32位整数
    }
    return hashValue.toString();
  }

  /**
   * 生成索引建议
   */
  async suggestOptimalIndex(collection, query) {
    const fields = Object.keys(query);

    // 常见索引模式
    const commonPatterns = {
      ['villageId']: { villageId: 1 },
      ['villageId', 'status']: { villageId: 1, status: 1 },
      ['villageId', 'createdAt']: { villageId: 1, createdAt: -1 },
      ['phone']: { phone: 1 },
      ['idCard']: { idCard: 1 },
      ['location']: { location: '2dsphere' }
    };

    const sortedFields = fields.sort();
    const key = sortedFields.join(',');

    return commonPatterns[key] || null;
  }

  /**
   * 生成优化投影
   */
  generateOptimalProjection(query) {
    const projection = { _id: 1 };

    // 包含查询中使用的字段
    Object.keys(query).forEach(field => {
      if (field !== '_id') {
        projection[field] = 1;
      }
    });

    // 添加常用字段
    const commonFields = ['name', 'status', 'createdAt', 'updatedAt'];
    commonFields.forEach(field => {
      if (!projection[field]) {
        projection[field] = 1;
      }
    });

    return projection;
  }

  /**
   * 提取累加器中使用的字段
   */
  extractRequiredFields(groupStage) {
    const fields = new Set();

    function traverseExpression(expr) {
      if (typeof expr === 'string' && expr.startsWith('$')) {
        fields.add(expr.substring(1));
      } else if (typeof expr === 'object') {
        Object.values(expr).forEach(traverseExpression);
      }
    }

    Object.values(groupStage.$group || {}).forEach(traverseExpression);
    return Array.from(fields);
  }

  /**
   * 创建投影阶段
   */
  createProjectStage(fields) {
    const projection = { _id: 1 };
    fields.forEach(field => {
      projection[field] = 1;
    });
    return { $project: projection };
  }

  /**
   * 优化表达式
   */
  optimizeExpression(expression) {
    // 递归优化表达式树
    if (typeof expression !== 'object' || expression === null) {
      return expression;
    }

    const optimized = { ...expression };

    // 优化$cond操作
    if (optimized.$cond) {
      if (Array.isArray(optimized.$cond)) {
        // 优化三元组形式的$cond
        optimized.$cond = [
          optimized.$cond[0], // if
          this.optimizeExpression(optimized.$cond[1]), // then
          this.optimizeExpression(optimized.$cond[2])  // else
        ];
      } else {
        optimized.$cond = this.optimizeExpression(optimized.$cond);
      }
    }

    // 优化$and/$or操作
    if (optimized.$and || optimized.$or) {
      const operator = optimized.$and ? '$and' : '$or';
      optimized[operator] = optimized[operator].map(expr => this.optimizeExpression(expr));
    }

    return optimized;
  }

  /**
   * 优化累加器
   */
  optimizeAccumulator(accumulator) {
    // 优化常见的累加器模式
    if (accumulator.$sum && accumulator.$sum === 1) {
      return { $sum: 1 }; // 计数
    }

    if (accumulator.$avg && typeof accumulator.$avg === 'string') {
      // 尝试使用更高效的计数和求和
      return {
        $avg: accumulator.$avg
      };
    }

    return accumulator;
  }

  /**
   * 提取索引信息
   */
  extractIndexesFromExplain(explain) {
    const indexes = [];

    function extractFromStage(stage) {
      if (stage.indexName) {
        indexes.push(stage.indexName);
      }
      if (stage.inputStage) {
        extractFromStage(stage.inputStage);
      }
      if (stage.inputStages) {
        stage.inputStages.forEach(extractFromStage);
      }
    }

    extractFromStage(explain.executionStats.executionStages);
    return indexes;
  }

  /**
   * 计算查询效率
   */
  calculateQueryEfficiency(explain) {
    const stats = explain.executionStats;
    if (stats.totalDocsExamined === 0) return 1;
    return stats.totalDocsReturned / stats.totalDocsExamined;
  }

  /**
   * 生成查询建议
   */
  generateQueryRecommendations(explain) {
    const recommendations = [];
    const stats = explain.executionStats;

    // 全表扫描
    if (stats.executionStages.stage === 'COLLSCAN') {
      recommendations.push('查询执行了全表扫描，建议添加适当的索引');
    }

    // 扫描过多文档
    if (stats.totalDocsExamined > stats.totalDocsReturned * 10) {
      recommendations.push('查询扫描了过多文档，考虑优化索引或查询条件');
    }

    // 执行时间过长
    if (stats.executionTimeMillis > this.options.slowQueryThreshold) {
      recommendations.push(`查询执行时间过长 (${stats.executionTimeMillis}ms)，考虑使用聚合管道或优化`);
    }

    return recommendations;
  }

  /**
   * 生成管道性能分析
   */
  async analyzePipelinePerformance(collection, pipeline) {
    try {
      const Collection = mongoose.connection.db.collection(collection);
      const explain = await Collection.aggregate(pipeline).explain('executionStats');

      return {
        totalExecutionTimeMillis: explain.executionStats.totalDocsExamined,
        totalDocsExamined: explain.executionStats.totalDocsExamined,
        stages: explain.executionStats.stages.map(stage => ({
          stageName: Object.keys(stage)[0],
          executionTimeMillis: stage[Object.keys(stage)[0]].executionTimeMillis || 0,
          docsExamined: stage[Object.keys(stage)[0]].totalDocsExamined || 0,
          docsProduced: stage[Object.keys(stage)[0]].nReturned || 0
        }))
      };
    } catch (error) {
      logger.error('管道性能分析失败:', error);
      return null;
    }
  }

  /**
   * 生成管道优化建议
   */
  generatePipelineRecommendations(performance) {
    const recommendations = [];

    if (!performance) return recommendations;

    // 分析每个阶段的性能
    performance.stages.forEach(stage => {
      if (stage.executionTimeMillis > 100) {
        recommendations.push(`${stage.stageName} 阶段执行时间过长，考虑优化`);
      }

      if (stage.docsExamined > stage.docsProduced * 10) {
        recommendations.push(`${stage.stageName} 阶段效率低，考虑添加过滤条件`);
      }
    });

    return recommendations;
  }

  /**
   * 记录性能指标
   */
  recordMetrics(collection, query, executionTime, analysis) {
    const key = `${collection}_${JSON.stringify(query)}`;

    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, {
        collection,
        query,
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0
      });
    }

    const metrics = this.performanceMetrics.get(key);
    metrics.count++;
    metrics.totalTime += executionTime;
    metrics.avgTime = metrics.totalTime / metrics.count;
    metrics.minTime = Math.min(metrics.minTime, executionTime);
    metrics.maxTime = Math.max(metrics.maxTime, executionTime);
    metrics.lastExecution = Date.now();

    // 标记为慢查询
    if (executionTime > this.options.slowQueryThreshold) {
      metrics.isSlowQuery = true;
      logger.warn(`慢查询检测: ${collection} - ${executionTime}ms`);
    }
  }

  /**
   * 清理缓存
   */
  cleanupCache() {
    const entries = Array.from(this.queryCache.entries());

    // 删除最旧的条目
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toDelete = entries.slice(0, Math.floor(this.options.cacheSize * 0.2));
    toDelete.forEach(([key]) => this.queryCache.delete(key));
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const report = {
      totalQueries: this.performanceMetrics.size,
      slowQueries: 0,
      avgExecutionTime: 0,
      cacheHitRate: this.queryCache.size / Math.max(this.performanceMetrics.size, 1),
      topSlowQueries: []
    };

    let totalTime = 0;
    const slowQueries = [];

    for (const [key, metrics] of this.performanceMetrics) {
      totalTime += metrics.avgTime;

      if (metrics.isSlowQuery) {
        report.slowQueries++;
        slowQueries.push({
          query: metrics.query,
          collection: metrics.collection,
          avgTime: metrics.avgTime,
          maxTime: metrics.maxTime,
          count: metrics.count
        });
      }
    }

    report.avgExecutionTime = totalTime / Math.max(report.totalQueries, 1);

    // 排序慢查询
    slowQueries.sort((a, b) => b.avgTime - a.avgTime);
    report.topSlowQueries = slowQueries.slice(0, 10);

    return report;
  }
}

module.exports = QueryOptimizer;