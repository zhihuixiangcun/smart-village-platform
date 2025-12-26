/**
 * 查询优化器
 * 提供自动索引建议、查询计划分析和慢查询优化
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const { CacheUtil } = require('../../utils/cache');
const logger = require('../utils/logger');

class QueryOptimizer extends EventEmitter {
  constructor() {
    super();

    // 慢查询阈值（毫秒）
    this.slowQueryThreshold = 1000;

    // 索引建议缓存
    this.indexSuggestions = new Map();

    // 查询计划缓存
    this.queryPlanCache = new Map();

    // 监控的集合
    this.monitoredCollections = new Set([
      'residents',
      'villages',
      'announcements',
      'servicerequests',
      'users',
      'audits',
      'notifications'
    ]);

    // 慢查询记录
    this.slowQueries = [];

    // 索引使用统计
    this.indexUsageStats = new Map();

    // 启动监控任务
    this.startMonitoringTasks();
  }

  /**
   * 分析查询并生成优化建议
   * @param {string} collection - 集合名称
   * @param {Object} query - 查询条件
   * @param {Object} options - 查询选项
   * @returns {Object} 优化建议
   */
  async analyzeQuery(collection, query, options = {}) {
    const start = performance.now();

    try {
      // 获取查询计划
      const explainPlan = await this.getQueryPlan(collection, query, options);

      // 分析查询性能
      const analysis = await this.analyzeQueryPerformance(collection, query, explainPlan);

      // 生成索引建议
      const indexSuggestions = await this.generateIndexSuggestions(collection, query, analysis);

      // 识别性能问题
      const performanceIssues = this.identifyPerformanceIssues(explainPlan, analysis);

      // 生成优化建议
      const optimizationSuggestions = this.generateOptimizationSuggestions(
        collection,
        query,
        explainPlan,
        indexSuggestions,
        performanceIssues
      );

      const duration = performance.now() - start;

      return {
        collection,
        query,
        analysis,
        explainPlan,
        indexSuggestions,
        performanceIssues,
        optimizationSuggestions,
        analysisDuration: duration,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('查询分析失败', {
        collection,
        query,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 获取查询执行计划
   * @param {string} collection - 集合名称
   * @param {Object} query - 查询条件
   * @param {Object} options - 查询选项
   * @returns {Object} 查询执行计划
   */
  async getQueryPlan(collection, query, options = {}) {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const coll = db.collection(collection);

    // 构建查询管道
    let pipeline = [{ $match: query }];

    // 添加排序
    if (options.sort) {
      pipeline.push({ $sort: options.sort });
    }

    // 添加限制
    if (options.limit) {
      pipeline.push({ $limit: options.limit });
    }

    // 添加跳过
    if (options.skip) {
      pipeline.push({ $skip: options.skip });
    }

    // 获取执行计划
    const explain = await coll.aggregate(pipeline).explain('executionStats');

    return explain;
  }

  /**
   * 分析查询性能
   * @param {string} collection - 集合名称
   * @param {Object} query - 查询条件
   * @param {Object} explainPlan - 查询计划
   * @returns {Object} 性能分析结果
   */
  async analyzeQueryPerformance(collection, query, explainPlan) {
    const stats = explainPlan.executionStats;

    // 提取关键指标
    const totalDocs = stats.totalDocsExamined;
    const returnedDocs = stats.totalDocsReturned;
    const executionTime = stats.executionTimeMillis;
    const indexUsed = this.extractUsedIndex(explainPlan);

    // 计算效率指标
    const efficiency = {
      scanRatio: totalDocs > 0 ? returnedDocs / totalDocs : 1,
      docsPerMs: executionTime > 0 ? totalDocs / executionTime : 0,
      indexEfficiency: indexUsed ? 'good' : 'poor'
    };

    // 性能评级
    let performanceGrade = 'excellent';
    if (executionTime > this.slowQueryThreshold) performanceGrade = 'poor';
    else if (executionTime > 500) performanceGrade = 'fair';
    else if (executionTime > 100) performanceGrade = 'good';

    return {
      executionTime,
      totalDocs,
      returnedDocs,
      indexUsed,
      efficiency,
      performanceGrade,
      isSlowQuery: executionTime > this.slowQueryThreshold
    };
  }

  /**
   * 生成索引建议
   * @param {string} collection - 集合名称
   * @param {Object} query - 查询条件
   * @param {Object} analysis - 性能分析
   * @returns {Array} 索引建议列表
   */
  async generateIndexSuggestions(collection, query, analysis) {
    const suggestions = [];

    // 分析查询字段
    const queryFields = this.extractQueryFields(query);

    // 为每个字段生成索引建议
    for (const field of queryFields) {
      const suggestion = await this.createIndexSuggestion(collection, field, query[field]);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // 复合索引建议
    if (queryFields.length > 1) {
      const compoundSuggestion = await this.createCompoundIndexSuggestion(collection, queryFields, query);
      if (compoundSuggestion) {
        suggestions.unshift(compoundSuggestion); // 复合索引优先级更高
      }
    }

    // 排序索引建议
    const sortSuggestion = await this.createSortIndexSuggestion(collection, query);
    if (sortSuggestion) {
      suggestions.push(sortSuggestion);
    }

    // 过滤重复建议
    const uniqueSuggestions = this.deduplicateIndexSuggestions(suggestions);

    // 评估建议优先级
    return uniqueSuggestions.map(suggestion => ({
      ...suggestion,
      priority: this.calculateIndexPriority(suggestion, analysis),
      estimatedImprovement: this.estimateIndexImprovement(suggestion, analysis)
    }));
  }

  /**
   * 创建单个字段索引建议
   * @param {string} collection - 集合名称
   * @param {string} field - 字段名
   * @param {*} value - 字段值
   * @returns {Object|null} 索引建议
   */
  async createIndexSuggestion(collection, field, value) {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const coll = db.collection(collection);

    // 检查索引是否已存在
    const existingIndexes = await coll.indexInformation();
    const indexExists = existingIndexes.some(idx =>
      idx.key && Object.keys(idx.key).includes(field)
    );

    if (indexExists) {
      return null;
    }

    // 确定索引类型
    let indexType = 1; // 默认升序
    let indexOptions = {};

    if (typeof value === 'object') {
      if (value.$regex) {
        // 正则表达式查询，建议文本索引
        indexType = 'text';
        indexOptions = { weights: { [field]: 10 } };
      } else if (value.$in || value.$nin) {
        // 包含查询，普通索引
        indexType = 1;
      } else if (value.$gte || value.$lte || value.$gt || value.$lt) {
        // 范围查询，普通索引
        indexType = 1;
      } else if (value.$exists !== undefined) {
        // 存在性查询，稀疏索引
        indexType = 1;
        indexOptions.sparse = true;
      }
    }

    return {
      collection,
      type: 'single',
      fields: { [field]: indexType },
      options: indexOptions,
      reason: this.getIndexSuggestionReason(field, value)
    };
  }

  /**
   * 创建复合索引建议
   * @param {string} collection - 集合名称
   * @param {Array} fields - 字段列表
   * @param {Object} query - 查询条件
   * @returns {Object|null} 复合索引建议
   */
  async createCompoundIndexSuggestion(collection, fields, query) {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const coll = db.collection(collection);

    // 构建复合索引定义
    const indexDef = {};
    const fieldOrder = this.determineOptimalFieldOrder(fields, query);

    for (const field of fieldOrder) {
      indexDef[field] = 1;
    }

    // 检查是否已存在类似的复合索引
    const existingIndexes = await coll.indexInformation();
    const exists = existingIndexes.some(idx => {
      if (!idx.key || Object.keys(idx.key).length !== fieldOrder.length) {
        return false;
      }
      return fieldOrder.every(field => idx.key.hasOwnProperty(field));
    });

    if (exists) {
      return null;
    }

    return {
      collection,
      type: 'compound',
      fields: indexDef,
      options: { background: true },
      reason: `复合索引可优化多字段查询性能`,
      fieldOrder
    };
  }

  /**
   * 创建排序索引建议
   * @param {string} collection - 集合名称
   * @param {Object} query - 查询条件
   * @returns {Object|null} 排序索引建议
   */
  async createSortIndexSuggestion(collection, query) {
    // 这里需要从查询选项中获取排序字段
    // 简化处理，实际使用时需要传入sort参数
    return null;
  }

  /**
   * 提取查询中的字段
   * @param {Object} query - 查询条件
   * @returns {Array} 字段列表
   */
  extractQueryFields(query, prefix = '') {
    const fields = [];

    for (const [key, value] of Object.entries(query)) {
      if (key.startsWith('$')) {
        // 操作符，递归处理内嵌对象
        if (typeof value === 'object' && value !== null) {
          fields.push(...this.extractQueryFields(value, prefix));
        }
      } else if (key !== '_id') {
        // 普通字段
        const fullKey = prefix ? `${prefix}.${key}` : key;
        fields.push(fullKey);

        // 递归处理嵌套对象
        if (typeof value === 'object' && value !== null && !value.$regex) {
          fields.push(...this.extractQueryFields(value, fullKey));
        }
      }
    }

    return [...new Set(fields)]; // 去重
  }

  /**
   * 提取使用的索引
   * @param {Object} explainPlan - 查询计划
   * @returns {Object|null} 使用的索引信息
   */
  extractUsedIndex(explainPlan) {
    const stages = explainPlan.stages || [];

    for (const stage of stages) {
      if (stage.$cursor && stage.$cursor.indexName) {
        return {
          name: stage.$cursor.indexName,
          keys: stage.$cursor.indexBounds
        };
      }
    }

    return null;
  }

  /**
   * 确定最优字段顺序
   * @param {Array} fields - 字段列表
   * @param {Object} query - 查询条件
   * @returns {Array} 排序后的字段列表
   */
  determineOptimalFieldOrder(fields, query) {
    // 基于选择性的字段排序
    const fieldScores = new Map();

    fields.forEach(field => {
      let score = 1;

      const value = this.getNestedValue(query, field);
      if (value) {
        // 精确匹配优先级最高
        if (typeof value === 'string' || typeof value === 'number') {
          score += 10;
        }
        // 范围查询次之
        else if (value.$gte || value.$lte) {
          score += 5;
        }
        // 正则表达式优先级较低
        else if (value.$regex) {
          score += 1;
        }
      }

      fieldScores.set(field, score);
    });

    return fields.sort((a, b) => fieldScores.get(b) - fieldScores.get(a));
  }

  /**
   * 获取嵌套对象的值
   * @param {Object} obj - 对象
   * @param {string} path - 路径
   * @returns {*} 值
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * 获取索引建议原因
   * @param {string} field - 字段名
   * @param {*} value - 字段值
   * @returns {string} 原因
   */
  getIndexSuggestionReason(field, value) {
    if (value.$regex) {
      return `字段 ${field} 用于正则表达式查询，需要文本索引`;
    } else if (value.$in || value.$nin) {
      return `字段 ${field} 用于包含查询，添加索引可提升性能`;
    } else if (value.$gte || value.$lte) {
      return `字段 ${field} 用于范围查询，索引可显著提升性能`;
    } else if (typeof value === 'string' || typeof value === 'number') {
      return `字段 ${field} 用于精确匹配，添加索引可避免全表扫描`;
    } else {
      return `字段 ${field} 经常用于查询条件，建议添加索引`;
    }
  }

  /**
   * 计算索引优先级
   * @param {Object} suggestion - 索引建议
   * @param {Object} analysis - 性能分析
   * @returns {number} 优先级（1-10）
   */
  calculateIndexPriority(suggestion, analysis) {
    let priority = 5; // 基础优先级

    // 基于查询性能调整
    if (analysis.isSlowQuery) {
      priority += 3;
    } else if (analysis.executionTime > 500) {
      priority += 2;
    } else if (analysis.executionTime > 100) {
      priority += 1;
    }

    // 基于扫描效率调整
    if (analysis.efficiency.scanRatio < 0.1) {
      priority += 2;
    } else if (analysis.efficiency.scanRatio < 0.5) {
      priority += 1;
    }

    // 基于索引类型调整
    if (suggestion.type === 'compound') {
      priority += 1;
    }

    return Math.min(priority, 10);
  }

  /**
   * 估算索引性能提升
   * @param {Object} suggestion - 索引建议
   * @param {Object} analysis - 性能分析
   * @returns {number} 预估提升百分比
   */
  estimateIndexImprovement(suggestion, analysis) {
    let improvement = 20; // 基础提升

    // 基于当前性能调整
    if (analysis.isSlowQuery) {
      improvement = 80;
    } else if (analysis.executionTime > 1000) {
      improvement = 70;
    } else if (analysis.executionTime > 500) {
      improvement = 50;
    }

    // 基于扫描效率调整
    if (analysis.efficiency.scanRatio < 0.01) {
      improvement += 15;
    } else if (analysis.efficiency.scanRatio < 0.1) {
      improvement += 10;
    }

    return Math.min(improvement, 95);
  }

  /**
   * 去重索引建议
   * @param {Array} suggestions - 建议列表
   * @returns {Array} 去重后的建议
   */
  deduplicateIndexSuggestions(suggestions) {
    const seen = new Set();
    const unique = [];

    for (const suggestion of suggestions) {
      const key = JSON.stringify({
        collection: suggestion.collection,
        fields: suggestion.fields
      });

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      }
    }

    return unique;
  }

  /**
   * 识别性能问题
   * @param {Object} explainPlan - 查询计划
   * @param {Object} analysis - 性能分析
   * @returns {Array} 性能问题列表
   */
  identifyPerformanceIssues(explainPlan, analysis) {
    const issues = [];

    // 检查是否全表扫描
    if (!analysis.indexUsed && analysis.totalDocs > 1000) {
      issues.push({
        type: 'full_collection_scan',
        severity: 'high',
        description: '查询执行了全集合扫描，建议添加索引',
        impact: 'high'
      });
    }

    // 检查扫描效率
    if (analysis.efficiency.scanRatio < 0.1) {
      issues.push({
        type: 'low_scan_efficiency',
        severity: 'medium',
        description: `扫描效率过低 (${(analysis.efficiency.scanRatio * 100).toFixed(2)}%)`,
        impact: 'medium'
      });
    }

    // 检查执行时间
    if (analysis.isSlowQuery) {
      issues.push({
        type: 'slow_query',
        severity: 'high',
        description: `查询执行时间过长 (${analysis.executionTime}ms)`,
        impact: 'high'
      });
    }

    // 检查文档扫描数量
    if (analysis.totalDocs > analysis.returnedDocs * 10) {
      issues.push({
        type: 'excessive_document_scan',
        severity: 'medium',
        description: `扫描了过多文档 (${analysis.totalDocs}/${analysis.returnedDocs})`,
        impact: 'medium'
      });
    }

    return issues;
  }

  /**
   * 生成优化建议
   * @param {string} collection - 集合名称
   * @param {Object} query - 查询条件
   * @param {Object} explainPlan - 查询计划
   * @param {Array} indexSuggestions - 索引建议
   * @param {Array} performanceIssues - 性能问题
   * @returns {Array} 优化建议列表
   */
  generateOptimizationSuggestions(collection, query, explainPlan, indexSuggestions, performanceIssues) {
    const suggestions = [];

    // 索引优化建议
    if (indexSuggestions.length > 0) {
      suggestions.push({
        type: 'index_optimization',
        priority: 'high',
        description: '创建建议的索引以提升查询性能',
        actions: indexSuggestions.map(s => ({
          command: `db.${collection}.createIndex(${JSON.stringify(s.fields)}, ${JSON.stringify(s.options)})`,
          description: s.reason,
          estimatedImprovement: s.estimatedImprovement
        }))
      });
    }

    // 查询优化建议
    if (performanceIssues.some(i => i.type === 'full_collection_scan')) {
      suggestions.push({
        type: 'query_optimization',
        priority: 'high',
        description: '优化查询条件以利用索引',
        actions: [
          {
            command: '使用精确匹配而非正则表达式',
            description: '将正则表达式查询改为精确匹配或前缀匹配'
          },
          {
            command: '添加更多筛选条件',
            description: '增加查询条件以提高选择性'
          }
        ]
      });
    }

    // 分页优化建议
    if (query.skip && query.skip > 10000) {
      suggestions.push({
        type: 'pagination_optimization',
        priority: 'medium',
        description: '使用基于游标的分页而非偏移分页',
        actions: [
          {
            command: '使用_id或时间戳进行范围查询',
            description: '避免大偏移量的skip操作'
          }
        ]
      });
    }

    // 投影优化建议
    if (!query.select || Object.keys(query.select).length < 5) {
      suggestions.push({
        type: 'projection_optimization',
        priority: 'low',
        description: '只返回需要的字段以减少网络传输',
        actions: [
          {
            command: '添加字段投影',
            description: '使用select参数只返回必要字段'
          }
        ]
      });
    }

    return suggestions;
  }

  /**
   * 自动创建缺失的索引
   * @param {Array} suggestions - 索引建议列表
   * @param {Object} options - 选项
   * @returns {Object} 创建结果
   */
  async createMissingIndexes(suggestions, options = {}) {
    const { autoCreate = false, dryRun = true, priorityThreshold = 8 } = options;

    const results = {
      total: suggestions.length,
      created: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    // 过滤高优先级建议
    const highPrioritySuggestions = suggestions.filter(s =>
      s.priority >= priorityThreshold
    );

    for (const suggestion of highPrioritySuggestions) {
      try {
        const shouldCreate = autoCreate && !dryRun;

        if (shouldCreate) {
          const mongoose = require('mongoose');
          const db = mongoose.connection.db;
          const coll = db.collection(suggestion.collection);

          await coll.createIndex(suggestion.fields, suggestion.options);
          results.created++;
        } else {
          results.skipped++;
        }

        results.details.push({
          collection: suggestion.collection,
          fields: suggestion.fields,
          priority: suggestion.priority,
          estimatedImprovement: suggestion.estimatedImprovement,
          created: shouldCreate,
          reason: suggestion.reason
        });

      } catch (error) {
        results.errors++;
        results.details.push({
          collection: suggestion.collection,
          fields: suggestion.fields,
          error: error.message,
          created: false
        });

        logger.error('创建索引失败', {
          collection: suggestion.collection,
          fields: suggestion.fields,
          error: error.message
        });
      }
    }

    logger.info('索引创建完成', {
      total: results.total,
      created: results.created,
      skipped: results.skipped,
      errors: results.errors,
      dryRun
    });

    return results;
  }

  /**
   * 启动监控任务
   */
  startMonitoringTasks() {
    // 每小时分析慢查询
    setInterval(async () => {
      await this.analyzeSlowQueries();
    }, 60 * 60 * 1000);

    // 每天生成索引报告
    setInterval(async () => {
      await this.generateIndexReport();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * 分析慢查询
   */
  async analyzeSlowQueries() {
    const analysis = {
      timestamp: new Date(),
      totalQueries: this.slowQueries.length,
      collections: {},
      recommendations: []
    };

    // 按集合分组
    const groupedByCollection = new Map();
    for (const query of this.slowQueries) {
      if (!groupedByCollection.has(query.collection)) {
        groupedByCollection.set(query.collection, []);
      }
      groupedByCollection.get(query.collection).push(query);
    }

    // 分析每个集合
    for (const [collection, queries] of groupedByCollection.entries()) {
      analysis.collections[collection] = {
        count: queries.length,
        avgExecutionTime: queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length,
        maxExecutionTime: Math.max(...queries.map(q => q.executionTime)),
        commonPatterns: this.identifyCommonPatterns(queries)
      };

      // 生成建议
      if (queries.length > 10) {
        analysis.recommendations.push({
          collection,
          type: 'high_frequency_slow_queries',
          message: `${collection}集合有${queries.length}个慢查询，建议优化索引或查询结构`,
          priority: 'high'
        });
      }
    }

    // 缓存分析结果
    await CacheUtil.set('query:slow_analysis', analysis, 3600);

    // 清理旧的慢查询记录（保留最近1000条）
    if (this.slowQueries.length > 1000) {
      this.slowQueries = this.slowQueries.slice(-1000);
    }

    return analysis;
  }

  /**
   * 识别查询模式
   * @param {Array} queries - 查询列表
   * @returns {Array} 查询模式
   */
  identifyCommonPatterns(queries) {
    const patterns = new Map();

    for (const query of queries) {
      const fields = Object.keys(query.query).sort().join(',');
      const pattern = patterns.get(fields) || { count: 0, totalExecutionTime: 0 };

      pattern.count++;
      pattern.totalExecutionTime += query.executionTime;
      patterns.set(fields, pattern);
    }

    return Array.from(patterns.entries())
      .map(([fields, stats]) => ({
        fields,
        count: stats.count,
        avgExecutionTime: stats.totalExecutionTime / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * 生成索引报告
   */
  async generateIndexReport() {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    const report = {
      timestamp: new Date(),
      collections: {},
      totalIndexes: 0,
      unusedIndexes: []
    };

    for (const collection of this.monitoredCollections) {
      try {
        const coll = db.collection(collection);
        const indexes = await coll.indexInformation();

        report.collections[collection] = {
          count: indexes.length,
          indexes: indexes.map(idx => ({
            name: idx.name,
            fields: idx.key,
            unique: !!idx.unique,
            sparse: !!idx.sparse
          }))
        };

        report.totalIndexes += indexes.length;

      } catch (error) {
        logger.warn('获取集合索引失败', { collection, error: error.message });
      }
    }

    return report;
  }

  /**
   * 记录慢查询
   * @param {string} collection - 集合名称
   * @param {Object} query - 查询条件
   * @param {Object} options - 查询选项
   * @param {number} executionTime - 执行时间
   */
  recordSlowQuery(collection, query, options, executionTime) {
    this.slowQueries.push({
      timestamp: new Date(),
      collection,
      query,
      options,
      executionTime
    });

    // 发出慢查询事件
    this.emit('slowQuery', {
      collection,
      query,
      options,
      executionTime
    });

    // 如果执行时间过长，立即触发分析
    if (executionTime > this.slowQueryThreshold * 5) {
      this.analyzeQuery(collection, query, options).then(analysis => {
        this.emit('criticalSlowQuery', analysis);
      }).catch(error => {
        logger.error('分析关键慢查询失败', error);
      });
    }
  }
}

// 单例模式
const queryOptimizer = new QueryOptimizer();

module.exports = queryOptimizer;