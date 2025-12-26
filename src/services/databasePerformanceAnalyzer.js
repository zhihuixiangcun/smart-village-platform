/**
 * 数据库性能分析和监控工具
 * 提供慢查询分析、索引使用情况、性能指标统计等功能
 */

const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class DatabasePerformanceAnalyzer {
  constructor(options = {}) {
    this.options = {
      slowQueryThreshold: options.slowQueryThreshold || 100, // ms
      enableProfiling: options.enableProfiling !== false,
      logFile: options.logFile || './logs/db-performance.log',
      metricsRetentionDays: options.metricsRetentionDays || 30,
      ...options
    };

    this.metrics = {
      queries: [],
      slowQueries: [],
      indexUsage: {},
      collectionStats: {},
      performanceHistory: []
    };

    this.startTime = Date.now();
  }

  /**
   * 初始化性能监控
   */
  async initialize() {
    // 确保日志目录存在
    const logDir = path.dirname(this.options.logFile);
    await fs.mkdir(logDir, { recursive: true });

    // 设置Mongoose调试模式
    if (this.options.enableProfiling) {
      mongoose.set('debug', (collectionName, method, ...args) => {
        this._logQuery(collectionName, method, args);
      });
    }

    // 定期收集指标
    setInterval(() => {
      this._collectMetrics();
    }, 60000); // 每分钟收集一次

    // 清理过期指标
    setInterval(() => {
      this._cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000); // 每天清理一次

    logger.debug('数据库性能监控已启动');
  }

  /**
   * 分析查询性能
   */
  async analyzeQuery(collection, query, options = {}) {
    const startTime = performance.now();
    const explain = await mongoose.connection.db.collection(collection).find(query, options).explain('executionStats');
    const endTime = performance.now();

    const executionTime = endTime - startTime;
    const stats = explain.executionStats;

    const analysis = {
      collection,
      query,
      options,
      executionTime: Math.round(executionTime * 100) / 100,
      totalDocsExamined: stats.totalDocsExamined,
      totalDocsReturned: stats.totalDocsReturned,
      executionStages: stats.executionStages,
      indexesUsed: this._extractIndexesUsed(explain),
      efficiency: this._calculateEfficiency(stats),
      recommendations: this._generateRecommendations(explain)
    };

    // 记录慢查询
    if (executionTime > this.options.slowQueryThreshold) {
      analysis.isSlowQuery = true;
      this.metrics.slowQueries.push({
        ...analysis,
        timestamp: new Date()
      });

      await this._logSlowQuery(analysis);
    }

    return analysis;
  }

  /**
   * 分析索引使用情况
   */
  async analyzeIndexes(collectionName) {
    const collection = mongoose.connection.db.collection(collectionName);
    const indexes = await collection.indexes();
    const stats = await collection.aggregate([{ $indexStats: {} }]).toArray();

    const indexUsage = {};

    // 合并索引信息和统计
    indexes.forEach(index => {
      const name = index.name;
      const stat = stats.find(s => s.name === name);

      indexUsage[name] = {
        key: index.key,
        unique: index.unique || false,
        sparse: index.sparse || false,
        usage: stat ? {
          operations: stat.accesses.ops,
          since: stat.accesses.since
        } : null
      };
    });

    // 识别未使用的索引
    const unusedIndexes = Object.entries(indexUsage)
      .filter(([name, info]) => info.usage && info.usage.operations === 0)
      .map(([name]) => name);

    // 识别缺失的索引
    const missingIndexes = await this._suggestMissingIndexes(collectionName);

    return {
      collection: collectionName,
      indexes: indexUsage,
      unusedIndexes,
      missingIndexes,
      timestamp: new Date()
    };
  }

  /**
   * 分析集合统计信息
   */
  async analyzeCollection(collectionName) {
    const collection = mongoose.connection.db.collection(collectionName);
    const stats = await collection.stats();
    const indexStats = await this.analyzeIndexes(collectionName);

    // 分析文档大小分布
    const sizeDistribution = await collection.aggregate([
      { $project: { size: { $bsonSize: '$$ROOT' } } },
      { $group: {
        _id: null,
        avgSize: { $avg: '$size' },
        maxSize: { $max: '$size' },
        minSize: { $min: '$size' },
        totalSize: { $sum: '$size' }
      }}
    ]).toArray();

    // 分析数据分布
    const dataDistribution = await this._analyzeDataDistribution(collectionName);

    return {
      collection: collectionName,
      documentCount: stats.count,
      totalSize: stats.size,
      avgDocumentSize: stats.avgObjSize,
      indexSizes: stats.indexSizes,
      totalIndexSize: stats.totalIndexSize,
      storageSize: stats.storageSize,
      sizeDistribution: sizeDistribution[0] || {},
      indexStats,
      dataDistribution,
      timestamp: new Date()
    };
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport() {
    const collections = await mongoose.connection.db.collections();
    const collectionNames = collections.map(c => c.collectionName);

    const report = {
      timestamp: new Date(),
      summary: {
        totalCollections: collectionNames.length,
        totalQueries: this.metrics.queries.length,
        slowQueries: this.metrics.slowQueries.length,
        avgQueryTime: this._calculateAverageQueryTime(),
        uptime: Date.now() - this.startTime
      },
      collections: {},
      slowQueries: this.metrics.slowQueries.slice(-10), // 最近10个慢查询
      recommendations: []
    };

    // 分析每个集合
    for (const collectionName of collectionNames) {
      try {
        const [collectionStats, indexAnalysis] = await Promise.all([
          this.analyzeCollection(collectionName),
          this.analyzeIndexes(collectionName)
        ]);

        report.collections[collectionName] = {
          ...collectionStats,
          indexAnalysis
        };

        // 生成建议
        report.recommendations.push(...this._generateCollectionRecommendations(
          collectionName,
          collectionStats,
          indexAnalysis
        ));
      } catch (error) {
        logger.error(`分析集合 ${collectionName} 时出错:`, error);
      }
    }

    // 保存报告
    await this._savePerformanceReport(report);

    return report;
  }

  /**
   * 优化查询
   */
  async optimizeQuery(collectionName, query, options = {}) {
    const originalAnalysis = await this.analyzeQuery(collectionName, query, options);

    // 生成优化建议
    const optimizations = [];

    // 1. 检查是否可以使用索引
    if (originalAnalysis.efficiency < 0.8) {
      const indexSuggestion = await this._suggestOptimalIndex(collectionName, query);
      if (indexSuggestion) {
        optimizations.push({
          type: 'index',
          description: '添加索引以提高查询性能',
          suggestion: indexSuggestion
        });
      }
    }

    // 2. 检查投影优化
    if (!options.projection) {
      optimizations.push({
        type: 'projection',
        description: '使用投影减少返回数据量',
        suggestion: '只查询需要的字段'
      });
    }

    // 3. 检查分页优化
    if (options.skip && options.skip > 1000) {
      optimizations.push({
        type: 'pagination',
        description: '大偏移量分页性能差',
        suggestion: '使用基于游标的分页或range查询'
      });
    }

    // 4. 生成优化后的查询
    const optimizedQuery = this._applyOptimizations(query, options, optimizations);

    return {
      original: originalAnalysis,
      optimizations,
      optimizedQuery,
      estimatedImprovement: this._estimateImprovement(originalAnalysis, optimizations)
    };
  }

  /**
   * 创建推荐索引
   */
  async createRecommendedIndexes() {
    const collections = await mongoose.connection.db.collections();
    const recommendations = [];

    for (const collection of collections) {
      const collectionName = collection.collectionName;
      const indexAnalysis = await this.analyzeIndexes(collectionName);

      // 创建缺失的索引
      for (const missingIndex of indexAnalysis.missingIndexes) {
        try {
          await collection.createIndex(missingIndex.key, missingIndex.options);
          recommendations.push({
            collection: collectionName,
            action: 'created',
            index: missingIndex,
            timestamp: new Date()
          });
        } catch (error) {
          recommendations.push({
            collection: collectionName,
            action: 'failed',
            index: missingIndex,
            error: error.message,
            timestamp: new Date()
          });
        }
      }
    }

    return recommendations;
  }

  // 私有方法

  _logQuery(collectionName, method, args) {
    const timestamp = new Date();
    const query = {
      collection: collectionName,
      method,
      args,
      timestamp
    };

    this.metrics.queries.push(query);

    // 保持最近10000条查询记录
    if (this.metrics.queries.length > 10000) {
      this.metrics.queries = this.metrics.queries.slice(-10000);
    }
  }

  _extractIndexesUsed(explain) {
    const stages = explain.executionStats.executionStages;
    const indexes = [];

    const extractIndexes = (stage) => {
      if (stage.inputStage) {
        extractIndexes(stage.inputStage);
      }
      if (stage.indexName) {
        indexes.push(stage.indexName);
      }
    };

    extractIndexes(stages);
    return indexes;
  }

  _calculateEfficiency(stats) {
    if (stats.totalDocsExamined === 0) return 1;
    return stats.totalDocsReturned / stats.totalDocsExamined;
  }

  _generateRecommendations(explain) {
    const recommendations = [];
    const stats = explain.executionStats;

    // 扫描过多文档
    if (stats.totalDocsExamined > stats.totalDocsReturned * 10) {
      recommendations.push('查询扫描了过多文档，建议添加适当的索引');
    }

    // 执行时间过长
    if (stats.executionTimeMillis > 1000) {
      recommendations.push('查询执行时间过长，考虑优化或使用聚合管道');
    }

    // 全表扫描
    if (stats.executionStages.stage === 'COLLSCAN') {
      recommendations.push('执行了全表扫描，必须添加索引');
    }

    return recommendations;
  }

  async _suggestMissingIndexes(collectionName) {
    const missingIndexes = [];

    // 分析最近的慢查询模式
    const recentSlowQueries = this.metrics.slowQueries
      .filter(q => q.collection === collectionName)
      .slice(-50);

    // 常见查询模式
    const commonPatterns = {
      'villageId': { villageId: 1 },
      'villageId_status': { villageId: 1, status: 1 },
      'villageId_createdAt': { villageId: 1, createdAt: -1 },
      'phone': { phone: 1 },
      'idCard': { idCard: 1 },
      'location': { location: '2dsphere' },
      'name_search': { name: 'text', 'address.detailAddress': 'text' },
      'birthDate_age': { birthDate: -1, age: 1 },
      'specialIdentities': { 'specialIdentities.type': 1 }
    };

    for (const [name, key] of Object.entries(commonPatterns)) {
      // 检查是否需要这个索引（基于慢查询模式）
      const needsIndex = recentSlowQueries.some(query => {
        return JSON.stringify(query.query).includes(Object.keys(key)[0]);
      });

      if (needsIndex) {
        missingIndexes.push({
          name,
          key,
          options: typeof key === 'object' && Object.values(key).includes('2dsphere')
            ? {}
            : { background: true }
        });
      }
    }

    return missingIndexes;
  }

  async _analyzeDataDistribution(collectionName) {
    const collection = mongoose.connection.db.collection(collectionName);

    // 分析字段基数
    const pipeline = [
      { $project: {
        villageId: 1,
        status: 1,
        gender: 1,
        occupation: 1,
        createdAt: 1
      }},
      { $group: {
        _id: null,
        uniqueVillages: { $addToSet: '$villageId' },
        uniqueStatuses: { $addToSet: '$status' },
        uniqueGenders: { $addToSet: '$gender' },
        uniqueOccupations: { $addToSet: '$occupation' },
        dateRange: {
          min: { $min: '$createdAt' },
          max: { $max: '$createdAt' }
        }
      }},
      { $project: {
        _id: 0,
        villageIdCardinality: { $size: '$uniqueVillages' },
        statusCardinality: { $size: '$uniqueStatuses' },
        genderCardinality: { $size: '$uniqueGenders' },
        occupationCardinality: { $size: '$uniqueOccupations' },
        dateRange: 1
      }}
    ];

    const result = await collection.aggregate(pipeline).toArray();
    return result[0] || {};
  }

  _calculateAverageQueryTime() {
    if (this.metrics.queries.length === 0) return 0;

    const recentQueries = this.metrics.queries.slice(-1000);
    const totalTime = recentQueries.reduce((sum, q) => {
      return sum + (q.executionTime || 0);
    }, 0);

    return totalTime / recentQueries.length;
  }

  _generateCollectionRecommendations(collectionName, stats, indexAnalysis) {
    const recommendations = [];

    // 索引建议
    if (indexAnalysis.unusedIndexes.length > 0) {
      recommendations.push({
        type: 'index_cleanup',
        collection: collectionName,
        description: `删除未使用的索引: ${indexAnalysis.unusedIndexes.join(', ')}`,
        priority: 'medium'
      });
    }

    // 大小优化
    if (stats.avgDocumentSize > 10000) { // 10KB
      recommendations.push({
        type: 'document_size',
        collection: collectionName,
        description: '平均文档过大，考虑分离大字段到单独集合',
        priority: 'low'
      });
    }

    // 索引大小
    const totalDataSize = stats.totalSize;
    const totalIndexSize = stats.totalIndexSize;
    if (totalIndexSize > totalDataSize * 0.5) {
      recommendations.push({
        type: 'index_optimization',
        collection: collectionName,
        description: '索引总大小过大，审查索引的必要性',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  async _savePerformanceReport(report) {
    const reportPath = `./reports/performance-report-${Date.now()}.json`;
    await fs.mkdir('./reports', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    logger.debug(`性能报告已保存到: ${reportPath}`);
  }

  async _logSlowQuery(analysis) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      collection: analysis.collection,
      query: analysis.query,
      executionTime: analysis.executionTime,
      docsExamined: analysis.totalDocsExamined,
      docsReturned: analysis.totalDocsReturned,
      efficiency: analysis.efficiency
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    await fs.appendFile(this.options.logFile, logLine);
  }

  _collectMetrics() {
    // 收集系统性能指标
    const metrics = {
      timestamp: new Date(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      activeConnections: mongoose.connection.readyState === 1 ? 1 : 0
    };

    this.metrics.performanceHistory.push(metrics);

    // 保持最近24小时的指标
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.metrics.performanceHistory = this.metrics.performanceHistory
      .filter(m => m.timestamp > oneDayAgo);
  }

  _cleanupOldMetrics() {
    const cutoffDate = new Date(Date.now() - this.options.metricsRetentionDays * 24 * 60 * 60 * 1000);

    this.metrics.slowQueries = this.metrics.slowQueries
      .filter(q => q.timestamp > cutoffDate);
  }

  async _suggestOptimalIndex(collectionName, query) {
    // 分析查询字段并推荐最佳索引
    const fields = Object.keys(query);
    if (fields.length === 0) return null;

    // 常见索引模式
    const indexPatterns = {
      ['villageId']: { villageId: 1 },
      ['villageId', 'status']: { villageId: 1, status: 1 },
      ['phone']: { phone: 1 },
      ['idCard']: { idCard: 1 },
      ['location']: { location: '2dsphere' }
    };

    const key = fields.sort().join(',');
    return indexPatterns[key] || null;
  }

  _applyOptimizations(query, options, optimizations) {
    const optimizedQuery = { ...query };
    const optimizedOptions = { ...options };

    optimizations.forEach(opt => {
      switch (opt.type) {
        case 'projection':
          if (!optimizedOptions.projection) {
            optimizedOptions.projection = { _id: 1, name: 1 }; // 示例投影
          }
          break;
        case 'pagination':
          // 建议使用基于ID的分页
          if (optimizedOptions.skip > 1000) {
            optimizedOptions.hint = '_id_';
          }
          break;
      }
    });

    return { query: optimizedQuery, options: optimizedOptions };
  }

  _estimateImprovement(analysis, optimizations) {
    let estimatedImprovement = 0;

    optimizations.forEach(opt => {
      switch (opt.type) {
        case 'index':
          estimatedImprovement += 70; // 索引可显著提升性能
          break;
        case 'projection':
          estimatedImprovement += 20; // 减少数据传输
          break;
        case 'pagination':
          estimatedImprovement += 40; // 优化大偏移量
          break;
      }
    });

    return Math.min(estimatedImprovement, 90); // 最多提升90%
  }
}

module.exports = DatabasePerformanceAnalyzer;