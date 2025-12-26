/**
 * 数据库查询优化器
 * 提供查询优化、索引建议、性能分析等功能
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { performance } = require('perf_hooks');

class DatabaseOptimizer {
  constructor() {
    this.queryStats = new Map();
    this.slowQueries = [];
    this.indexSuggestions = new Map();
    this.optimizationHistory = [];
    this.performanceMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageExecutionTime: 0,
      cacheHitRate: 0
    };
  }

  /**
   * 查询性能监控中间件
   */
  queryMonitor() {
    return (req, res, next) => {
      const startTime = performance.now();
      const originalQuery = mongoose.Query.prototype.exec;

      // 重写exec方法以监控查询
      mongoose.Query.prototype.exec = function() {
        const queryStartTime = performance.now();
        const queryString = this.getQuery();
        const collection = this.model.collection.name;

        return originalQuery.call(this).then(result => {
          const executionTime = performance.now() - queryStartTime;
          this._recordQueryStats(collection, queryString, executionTime, 'success');
          return result;
        }).catch(error => {
          const executionTime = performance.now() - queryStartTime;
          this._recordQueryStats(collection, queryString, executionTime, 'error');
          throw error;
        });
      }.bind(this);

      res.on('finish', () => {
        const totalTime = performance.now() - startTime;
        this._updateMetrics(totalTime);
      });

      next();
    };
  }

  /**
   * 记录查询统计信息
   */
  _recordQueryStats(collection, query, executionTime, status) {
    const queryKey = `${collection}:${JSON.stringify(query)}`;

    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        collection,
        query,
        count: 0,
        totalTime: 0,
        averageTime: 0,
        slowCount: 0,
        status
      });
    }

    const stats = this.queryStats.get(queryKey);
    stats.count++;
    stats.totalTime += executionTime;
    stats.averageTime = stats.totalTime / stats.count;

    if (executionTime > 1000) { // 超过1秒的慢查询
      stats.slowCount++;
      this._recordSlowQuery(collection, query, executionTime);
    }

    this.performanceMetrics.totalQueries++;
    if (executionTime > 1000) {
      this.performanceMetrics.slowQueries++;
    }
  }

  /**
   * 记录慢查询
   */
  _recordSlowQuery(collection, query, executionTime) {
    this.slowQueries.push({
      collection,
      query,
      executionTime,
      timestamp: new Date(),
      explainPlan: null
    });

    // 保持慢查询历史在合理范围内
    if (this.slowQueries.length > 1000) {
      this.slowQueries = this.slowQueries.slice(-500);
    }
  }

  /**
   * 更新性能指标
   */
  _updateMetrics(totalTime) {
    this.performanceMetrics.averageExecutionTime =
      this.performanceMetrics.totalQueries > 0
        ? totalTime / this.performanceMetrics.totalQueries
        : 0;
  }

  /**
   * 分析查询并提供优化建议
   */
  async analyzeQuery(model, query, options = {}) {
    try {
      // 使用MongoDB的explain分析查询
      const explainResult = await model.find(query).explain('executionStats');

      const analysis = {
        collection: model.collection.name,
        query,
        executionStats: explainResult.executionStats,
        recommendations: [],
        indexUsage: explainResult.executionStats.executionStages?.indexName || 'COLLSCAN',
        documentsExamined: explainResult.executionStats.totalDocsExamined,
        documentsReturned: explainResult.executionStats.totalDocsExamined,
        efficiency: this._calculateQueryEfficiency(explainResult.executionStats)
      };

      // 生成优化建议
      this._generateOptimizationRecommendations(analysis);

      return analysis;
    } catch (error) {
      throw new Error(`查询分析失败: ${error.message}`);
    }
  }

  /**
   * 计算查询效率
   */
  _calculateQueryEfficiency(executionStats) {
    const { totalDocsExamined, totalDocsReturned } = executionStats;

    if (totalDocsReturned === 0) return 100;

    return Math.round((totalDocsReturned / totalDocsExamined) * 100);
  }

  /**
   * 生成优化建议
   */
  _generateOptimizationRecommendations(analysis) {
    const { executionStats, indexUsage, efficiency } = analysis;

    // 检查是否使用了集合扫描
    if (indexUsage === 'COLLSCAN') {
      analysis.recommendations.push({
        type: 'index',
        priority: 'high',
        message: '查询执行了集合扫描，建议创建合适的索引',
        suggestion: this._suggestIndex(analysis.query, analysis.collection)
      });
    }

    // 检查查询效率
    if (efficiency < 10) {
      analysis.recommendations.push({
        type: 'efficiency',
        priority: 'high',
        message: `查询效率仅为${efficiency}%，建议优化查询条件或索引`,
        suggestion: '检查查询字段是否建立了索引，或优化查询条件'
      });
    }

    // 检查执行时间
    if (executionStats.executionTimeMillis > 1000) {
      analysis.recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `查询执行时间过长: ${executionStats.executionTimeMillis}ms`,
        suggestion: '考虑添加复合索引或使用投影减少返回数据量'
      });
    }

    // 检查文档扫描量
    if (executionStats.totalDocsExamined > executionStats.totalDocsReturned * 10) {
      analysis.recommendations.push({
        type: 'scanning',
        priority: 'medium',
        message: '扫描了大量不必要的文档',
        suggestion: '优化查询条件，确保使用索引进行筛选'
      });
    }
  }

  /**
   * 建议索引
   */
  _suggestIndex(query, collection) {
    const queryFields = Object.keys(query);

    if (queryFields.length === 0) return '无特定查询字段';

    // 分析查询类型
    const indexFields = [];
    const sortFields = [];

    queryFields.forEach(field => {
      const value = query[field];
      if (typeof value === 'object' && value !== null) {
        if (value.$regex || value.$in || value.$nin) {
          indexFields.push(field);
        } else if (value.$gte || value.$lte || value.$gt || value.$lt) {
          indexFields.push(field);
        } else if (value.$eq) {
          indexFields.push(field);
        }
      } else {
        indexFields.push(field);
      }
    });

    if (indexFields.length === 0) return '查询字段类型不适合索引';

    return {
      fields: indexFields,
      type: indexFields.length > 1 ? 'compound' : 'single',
      definition: indexFields.map(field => ({ [field]: 1 }))
    };
  }

  /**
   * 创建推荐的索引
   */
  async createRecommendedIndex(model, indexDefinition) {
    try {
      const result = await model.createIndex(indexDefinition.definition);

      this.optimizationHistory.push({
        action: 'index_created',
        collection: model.collection.name,
        indexDefinition,
        result,
        timestamp: new Date()
      });

      return result;
    } catch (error) {
      throw new Error(`创建索引失败: ${error.message}`);
    }
  }

  /**
   * 批量优化慢查询
   */
  async optimizeSlowQueries() {
    const optimizations = [];

    for (const slowQuery of this.slowQueries.slice(0, 10)) { // 只处理前10个最慢的查询
      try {
        // 获取对应的模型
        const model = mongoose.model(slowQuery.collection);

        // 分析查询
        const analysis = await this.analyzeQuery(model, slowQuery.query);

        // 如果有高优先级建议，执行优化
        const highPriorityRecs = analysis.recommendations.filter(rec => rec.priority === 'high');

        if (highPriorityRecs.length > 0) {
          for (const rec of highPriorityRecs) {
            if (rec.type === 'index' && rec.suggestion && rec.suggestion.fields) {
              const indexResult = await this.createRecommendedIndex(model, rec.suggestion);
              optimizations.push({
                collection: slowQuery.collection,
                query: slowQuery.query,
                optimization: rec.suggestion,
                result: indexResult
              });
            }
          }
        }
      } catch (error) {
        logger.error(`优化查询失败: ${error.message}`);
      }
    }

    return optimizations;
  }

  /**
   * 获取数据库性能报告
   */
  async getPerformanceReport() {
    try {
      const db = mongoose.connection.db;
      const collections = await db.collections();

      const collectionStats = [];

      for (const collection of collections) {
        const stats = await collection.stats();
        const indexes = await collection.indexInformation();

        collectionStats.push({
          name: collection.collectionName,
          documents: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          indexCount: indexes.length,
          totalIndexSize: stats.totalIndexSize,
          indexes: indexes.map(index => ({
            name: index.name,
            fields: Object.keys(index.key)
          }))
        });
      }

      return {
        timestamp: new Date(),
        metrics: this.performanceMetrics,
        slowQueries: this.slowQueries.slice(0, 20), // 最近20个慢查询
        collectionStats,
        optimizationHistory: this.optimizationHistory.slice(-50),
        recommendations: this._generateSystemRecommendations(collectionStats)
      };
    } catch (error) {
      throw new Error(`生成性能报告失败: ${error.message}`);
    }
  }

  /**
   * 生成系统级优化建议
   */
  _generateSystemRecommendations(collectionStats) {
    const recommendations = [];

    // 检查大型集合
    const largeCollections = collectionStats.filter(col => col.documents > 100000);
    if (largeCollections.length > 0) {
      recommendations.push({
        type: 'data_management',
        priority: 'medium',
        message: `发现${largeCollections.length}个大型集合，建议考虑数据归档策略`,
        collections: largeCollections.map(col => col.name)
      });
    }

    // 检查缺少索引的集合
    const noIndexCollections = collectionStats.filter(col => col.indexCount <= 1);
    if (noIndexCollections.length > 0) {
      recommendations.push({
        type: 'indexing',
        priority: 'high',
        message: `发现${noIndexCollections.length}个集合缺少索引，影响查询性能`,
        collections: noIndexCollections.map(col => col.name)
      });
    }

    // 检查索引大小占比
    const highIndexCollections = collectionStats.filter(
      col => col.totalIndexSize > col.size * 0.5
    );
    if (highIndexCollections.length > 0) {
      recommendations.push({
        type: 'index_optimization',
        priority: 'low',
        message: `发现${highIndexCollections.length}个集合的索引占用空间过大`,
        collections: highIndexCollections.map(col => col.name),
        suggestion: '考虑清理不必要的索引或使用更高效的索引设计'
      });
    }

    return recommendations;
  }

  /**
   * 清理查询统计信息
   */
  clearStats() {
    this.queryStats.clear();
    this.slowQueries = [];
    this.performanceMetrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageExecutionTime: 0,
      cacheHitRate: 0
    };
  }

  /**
   * 导出优化配置
   */
  exportOptimizationConfig() {
    return {
      timestamp: new Date(),
      slowQueries: this.slowQueries,
      queryStats: Array.from(this.queryStats.entries()).map(([key, stats]) => ({
        key,
        ...stats
      })),
      optimizationHistory: this.optimizationHistory,
      recommendations: this.indexSuggestions
    };
  }

  /**
   * 导入优化配置
   */
  importOptimizationConfig(config) {
    if (config.slowQueries) {
      this.slowQueries = config.slowQueries;
    }

    if (config.optimizationHistory) {
      this.optimizationHistory = config.optimizationHistory;
    }
  }
}

// 单例模式
const databaseOptimizer = new DatabaseOptimizer();

module.exports = databaseOptimizer;