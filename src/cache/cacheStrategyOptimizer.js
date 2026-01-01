/**
 * 缓存策略优化器
 * 智能分析访问模式，优化缓存策略
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

class CacheStrategyOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      analysisInterval: options.analysisInterval || 1000 * 60 * 5,  // 5分钟分析间隔
      learningThreshold: options.learningThreshold || 100,          // 学习阈值
      hotDataThreshold: options.hotDataThreshold || 50,             // 热点数据阈值
      coldDataThreshold: options.coldDataThreshold || 10,           // 冷数据阈值
      historyRetention: options.historyRetention || 1000 * 60 * 60 * 24 * 7, // 保留7天历史
      adaptiveEnabled: options.adaptiveEnabled !== false,           // 自适应开关
      predictionEnabled: options.predictionEnabled !== false        // 预测开关
    };

    // 访问模式数据
    this.accessPatterns = new Map(); // key -> pattern data
    this.strategyProfiles = new Map(); // key -> strategy profile
    this.globalStats = {
      totalAccess: 0,
      uniqueKeys: 0,
      avgAccessFrequency: 0,
      hotDataCount: 0,
      coldDataCount: 0
    };

    // 缓存策略模板
    this.strategyTemplates = {
      // 高频访问数据
      high_frequency: {
        l1Ttl: 1000 * 60 * 10,      // L1 10分钟
        l2Ttl: 1000 * 60 * 30,      // L2 30分钟
        l3Ttl: 1000 * 60 * 60 * 2,  // L3 2小时
        preload: true,
        compression: false,
        priority: 'high'
      },

      // 中频访问数据
      medium_frequency: {
        l1Ttl: 1000 * 60 * 5,       // L1 5分钟
        l2Ttl: 1000 * 60 * 15,      // L2 15分钟
        l3Ttl: 1000 * 60 * 60,      // L3 1小时
        preload: false,
        compression: false,
        priority: 'medium'
      },

      // 低频访问数据
      low_frequency: {
        l1Ttl: 1000 * 60 * 2,       // L1 2分钟
        l2Ttl: 1000 * 60 * 10,      // L2 10分钟
        l3Ttl: 1000 * 60 * 30,      // L3 30分钟
        preload: false,
        compression: true,
        priority: 'low'
      },

      // 大文件数据
      large_file: {
        l1Ttl: 0,                   // 跳过L1
        l2Ttl: 1000 * 60 * 60,      // L2 1小时
        l3Ttl: 1000 * 60 * 60 * 24, // L3 24小时
        preload: false,
        compression: true,
        priority: 'low'
      },

      // 实时数据
      realtime: {
        l1Ttl: 1000 * 30,           // L1 30秒
        l2Ttl: 1000 * 60,           // L2 1分钟
        l3Ttl: 0,                   // 跳过L3
        preload: false,
        compression: false,
        priority: 'high'
      },

      // 静态资源
      static_resource: {
        l1Ttl: 1000 * 60 * 30,      // L1 30分钟
        l2Ttl: 1000 * 60 * 60 * 2,  // L2 2小时
        l3Ttl: 1000 * 60 * 60 * 24 * 7, // L3 7天
        preload: true,
        compression: true,
        priority: 'medium'
      }
    };

    // 机器学习模型（简化版）
    this.mlModel = {
      patterns: [],
      accuracy: 0,
      lastTraining: 0
    };

    // 启动分析任务
    this.startAnalysisTasks();
  }

  /**
   * 记录访问事件
   * @param {string} key - 缓存键
   * @param {Object} metadata - 访问元数据
   */
  recordAccess(key, metadata = {}) {
    const timestamp = Date.now();
    const hour = new Date(timestamp).getHours();
    const dayOfWeek = new Date(timestamp).getDay();

    // 获取或创建访问模式
    let pattern = this.accessPatterns.get(key);
    if (!pattern) {
      pattern = {
        key,
        firstAccess: timestamp,
        lastAccess: timestamp,
        accessCount: 0,
        totalResponseTime: 0,
        hitCount: 0,
        missCount: 0,
        hourlyAccess: new Array(24).fill(0),
        dailyAccess: new Array(7).fill(0),
        size: metadata.size || 0,
        dataType: metadata.dataType || 'unknown',
        accessPattern: 'random',
        seasonality: 'none',
        trend: 'stable'
      };
      this.accessPatterns.set(key, pattern);
    }

    // 更新访问统计
    pattern.accessCount++;
    pattern.lastAccess = timestamp;
    pattern.hourlyAccess[hour]++;
    pattern.dailyAccess[dayOfWeek]++;
    pattern.totalResponseTime += metadata.responseTime || 0;

    if (metadata.hit) {
      pattern.hitCount++;
    } else {
      pattern.missCount++;
    }

    // 更新全局统计
    this.globalStats.totalAccess++;
    this.globalStats.uniqueKeys = this.accessPatterns.size;

    // 发送事件
    this.emit('access:recorded', { key, pattern, metadata });

    // 如果启用预测，尝试预加载
    if (this.config.predictionEnabled) {
      this.predictAndPreload(key);
    }
  }

  /**
   * 获取优化策略
   * @param {string} key - 缓存键
   * @param {Object} metadata - 元数据
   * @returns {Object} 优化策略
   */
  getOptimizedStrategy(key, metadata = {}) {
    // 获取访问模式
    const pattern = this.accessPatterns.get(key);
    if (!pattern || pattern.accessCount < this.config.learningThreshold) {
      // 数据不足，使用默认策略
      return this.getDefaultStrategy(key, metadata);
    }

    // 分析数据特征
    const features = this.extractFeatures(pattern, metadata);

    // 应用机器学习模型
    if (this.config.adaptiveEnabled && this.mlModel.accuracy > 0.7) {
      return this.predictStrategy(features);
    }

    // 基于规则优化
    return this.ruleBasedOptimization(features);
  }

  /**
   * 批量优化策略
   * @returns {Object} 优化报告
   */
  optimizeAllStrategies() {
    const startTime = Date.now();
    const optimizedStrategies = new Map();
    const recommendations = [];

    logger.info('开始批量缓存策略优化', { keys: this.accessPatterns.size });

    for (const [key, pattern] of this.accessPatterns.entries()) {
      if (pattern.accessCount >= this.config.learningThreshold) {
        const currentStrategy = this.strategyProfiles.get(key);
        const optimizedStrategy = this.getOptimizedStrategy(key, {
          size: pattern.size,
          dataType: pattern.dataType
        });

        // 比较策略差异
        if (!currentStrategy || this.strategyDiffers(currentStrategy, optimizedStrategy)) {
          optimizedStrategies.set(key, optimizedStrategy);
          this.strategyProfiles.set(key, optimizedStrategy);

          recommendations.push({
            key,
            current: currentStrategy,
            recommended: optimizedStrategy,
            reason: this.getOptimizationReason(pattern, optimizedStrategy)
          });
        }
      }
    }

    // 训练机器学习模型
    if (this.config.adaptiveEnabled) {
      this.trainMLModel();
    }

    const duration = Date.now() - startTime;
    logger.info('缓存策略优化完成', {
      optimized: optimizedStrategies.size,
      recommendations: recommendations.length,
      duration
    });

    this.emit('optimization:completed', {
      strategies: optimizedStrategies,
      recommendations,
      duration
    });

    return {
      optimizedCount: optimizedStrategies.size,
      recommendations,
      globalStats: this.globalStats,
      duration
    };
  }

  /**
   * 获取热点数据
   * @param {number} limit - 限制数量
   * @returns {Array} 热点数据列表
   */
  getHotData(limit = 50) {
    const patterns = Array.from(this.accessPatterns.values())
      .filter(p => p.accessCount >= this.config.hotDataThreshold)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return patterns.map(pattern => ({
      key: pattern.key,
      accessCount: pattern.accessCount,
      hitRate: pattern.hitCount / pattern.accessCount,
      avgResponseTime: pattern.totalResponseTime / pattern.accessCount,
      size: pattern.size,
      dataType: pattern.dataType,
      strategy: this.strategyProfiles.get(pattern.key)
    }));
  }

  /**
   * 获取冷数据
   * @param {number} limit - 限制数量
   * @returns {Array} 冷数据列表
   */
  getColdData(limit = 50) {
    const patterns = Array.from(this.accessPatterns.values())
      .filter(p => p.accessCount <= this.config.coldDataThreshold && p.accessCount > 0)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return patterns.map(pattern => ({
      key: pattern.key,
      accessCount: pattern.accessCount,
      lastAccess: pattern.lastAccess,
      size: pattern.size,
      dataType: pattern.dataType,
      recommendation: 'consider_removing_or_extending_ttl'
    }));
  }

  /**
   * 预测并预加载
   * @param {string} currentKey - 当前访问的键
   */
  predictAndPreload(currentKey) {
    // 基于访问模式预测可能的下一个访问
    const predictions = this.predictNextAccess(currentKey);

    for (const prediction of predictions) {
      if (prediction.confidence > 0.7) {
        this.emit('preload:recommended', {
          key: prediction.key,
          confidence: prediction.confidence,
          reason: 'sequential_access_pattern'
        });
      }
    }
  }

  /**
   * 预测下一个访问
   * @param {string} currentKey - 当前键
   * @returns {Array} 预测结果
   */
  predictNextAccess(currentKey) {
    const predictions = [];
    const currentPattern = this.accessPatterns.get(currentKey);

    if (!currentPattern) return predictions;

    // 基于历史访问序列预测
    for (const [key, pattern] of this.accessPatterns.entries()) {
      if (key === currentKey) continue;

      // 计算访问时间相关性
      const timeCorrelation = this.calculateTimeCorrelation(currentPattern, pattern);

      // 计算访问模式相似性
      const patternSimilarity = this.calculatePatternSimilarity(currentPattern, pattern);

      // 综合置信度
      const confidence = (timeCorrelation + patternSimilarity) / 2;

      if (confidence > 0.5) {
        predictions.push({
          key,
          confidence,
          reason: 'temporal_pattern_match'
        });
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * 提取特征
   * @param {Object} pattern - 访问模式
   * @param {Object} metadata - 元数据
   * @returns {Object} 特征向量
   */
  extractFeatures(pattern, metadata) {
    const accessFrequency = pattern.accessCount / (Date.now() - pattern.firstAccess) * 1000 * 60;
    const hitRate = pattern.hitCount / pattern.accessCount;
    const avgResponseTime = pattern.totalResponseTime / pattern.accessCount;

    // 时间特征
    const peakHour = this.findPeakHour(pattern.hourlyAccess);
    const peakDay = this.findPeakDay(pattern.dailyAccess);
    const accessPattern = this.detectAccessPattern(pattern.hourlyAccess);

    // 季节性特征
    const seasonality = this.detectSeasonality(pattern.dailyAccess);

    // 趋势特征
    const trend = this.detectTrend(pattern);

    return {
      accessFrequency,
      hitRate,
      avgResponseTime,
      size: pattern.size || metadata.size || 0,
      dataType: pattern.dataType || metadata.dataType,
      peakHour,
      peakDay,
      accessPattern,
      seasonality,
      trend,
      age: Date.now() - pattern.firstAccess
    };
  }

  /**
   * 基于规则的优化
   * @param {Object} features - 特征向量
   * @returns {Object} 优化策略
   */
  ruleBasedOptimization(features) {
    let strategy = { ...this.strategyTemplates.medium_frequency };

    // 基于访问频率
    if (features.accessFrequency > 10) {
      strategy = { ...this.strategyTemplates.high_frequency };
    } else if (features.accessFrequency < 1) {
      strategy = { ...this.strategyTemplates.low_frequency };
    }

    // 基于数据大小
    if (features.size > 1024 * 1024) { // 1MB
      strategy = { ...this.strategyTemplates.large_file };
    }

    // 基于数据类型
    if (features.dataType === 'realtime' || features.dataType === 'emergency') {
      strategy = { ...this.strategyTemplates.realtime };
    } else if (features.dataType === 'static' || features.dataType === 'image') {
      strategy = { ...this.strategyTemplates.static_resource };
    }

    // 基于命中率
    if (features.hitRate < 0.3) {
      strategy.l1Ttl = Math.max(strategy.l1Ttl * 0.5, 1000 * 60); // 减少L1 TTL
      strategy.l2Ttl = Math.max(strategy.l2Ttl * 0.7, 1000 * 60 * 5); // 减少L2 TTL
    }

    // 基于访问模式
    if (features.accessPattern === 'burst') {
      strategy.preload = true;
      strategy.l1Ttl *= 1.5;
    }

    return strategy;
  }

  /**
   * 训练机器学习模型
   */
  trainMLModel() {
    // 准备训练数据
    const trainingData = [];
    for (const [key, pattern] of this.accessPatterns.entries()) {
      if (pattern.accessCount >= this.config.learningThreshold) {
        const features = this.extractFeatures(pattern);
        const strategy = this.ruleBasedOptimization(features);

        trainingData.push({
          features,
          strategy,
          key
        });
      }
    }

    if (trainingData.length < 100) {
      logger.debug('训练数据不足，跳过ML模型训练');
      return;
    }

    // 简化的机器学习模型训练
    // 实际应用中应该使用更复杂的算法
    this.mlModel.patterns = trainingData;
    this.mlModel.accuracy = 0.75; // 模拟准确率
    this.mlModel.lastTraining = Date.now();

    logger.info('ML模型训练完成', {
      samples: trainingData.length,
      accuracy: this.mlModel.accuracy
    });

    this.emit('model:trained', {
      accuracy: this.mlModel.accuracy,
      samples: trainingData.length
    });
  }

  /**
   * 获取性能报告
   * @returns {Object} 性能报告
   */
  getPerformanceReport() {
    const now = Date.now();
    const report = {
      timestamp: now,
      summary: {
        totalKeys: this.accessPatterns.size,
        totalAccess: this.globalStats.totalAccess,
        avgAccessFrequency: this.globalStats.totalAccess / this.accessPatterns.size,
        hotDataCount: 0,
        coldDataCount: 0
      },
      distribution: {
        high_frequency: 0,
        medium_frequency: 0,
        low_frequency: 0
      },
      efficiency: {
        avgHitRate: 0,
        avgResponseTime: 0,
        cacheUtilization: 0
      },
      recommendations: []
    };

    let totalHitRate = 0;
    let totalResponseTime = 0;
    let analyzedCount = 0;

    for (const pattern of this.accessPatterns.values()) {
      const hitRate = pattern.hitCount / pattern.accessCount;
      const avgResponseTime = pattern.totalResponseTime / pattern.accessCount;

      totalHitRate += hitRate;
      totalResponseTime += avgResponseTime;
      analyzedCount++;

      // 分类统计
      const frequency = pattern.accessCount / (now - pattern.firstAccess) * 1000 * 60;
      if (frequency > 10) {
        report.distribution.high_frequency++;
        report.summary.hotDataCount++;
      } else if (frequency < 1) {
        report.distribution.low_frequency++;
        report.summary.coldDataCount++;
      } else {
        report.distribution.medium_frequency++;
      }
    }

    // 计算平均值
    if (analyzedCount > 0) {
      report.efficiency.avgHitRate = totalHitRate / analyzedCount;
      report.efficiency.avgResponseTime = totalResponseTime / analyzedCount;
    }

    // 生成建议
    if (report.efficiency.avgHitRate < 0.7) {
      report.recommendations.push({
        type: 'performance',
        message: '整体缓存命中率偏低，建议优化缓存策略或增加缓存容量'
      });
    }

    if (report.efficiency.avgResponseTime > 100) {
      report.recommendations.push({
        type: 'performance',
        message: '平均响应时间偏高，建议优化数据获取或压缩传输'
      });
    }

    if (report.summary.coldDataCount > report.summary.totalKeys * 0.3) {
      report.recommendations.push({
        type: 'cleanup',
        message: '冷数据比例过高，建议清理或延长TTL以减少缓存抖动'
      });
    }

    return report;
  }

  // 私有辅助方法

  /**
   * 获取默认策略
   */
  getDefaultStrategy(key, metadata) {
    const dataType = metadata.dataType || 'unknown';

    switch (dataType) {
    case 'realtime':
    case 'emergency':
      return { ...this.strategyTemplates.realtime };
    case 'static':
    case 'image':
    case 'css':
    case 'js':
      return { ...this.strategyTemplates.static_resource };
    default:
      return { ...this.strategyTemplates.medium_frequency };
    }
  }

  /**
   * 计算时间相关性
   */
  calculateTimeCorrelation(pattern1, pattern2) {
    // 简化的相关性计算
    const timeDiff = Math.abs(pattern1.lastAccess - pattern2.lastAccess);
    const maxDiff = 1000 * 60 * 5; // 5分钟内认为是相关的

    return Math.max(0, 1 - timeDiff / maxDiff);
  }

  /**
   * 计算模式相似性
   */
  calculatePatternSimilarity(pattern1, pattern2) {
    // 计算小时访问模式的相似性
    let similarity = 0;
    for (let i = 0; i < 24; i++) {
      similarity += Math.abs(pattern1.hourlyAccess[i] - pattern2.hourlyAccess[i]);
    }

    return 1 - similarity / (24 * Math.max(pattern1.accessCount, pattern2.accessCount));
  }

  /**
   * 检测访问模式
   */
  detectAccessPattern(hourlyAccess) {
    const max = Math.max(...hourlyAccess);
    const min = Math.min(...hourlyAccess.filter(h => h > 0));

    if (max > min * 10) {
      return 'burst'; // 突发访问
    } else if (hourlyAccess.slice(8, 18).reduce((a, b) => a + b, 0) >
               hourlyAccess.slice(0, 8).reduce((a, b) => a + b, 0) * 2) {
      return 'business_hours'; // 工作时间访问
    } else {
      return 'random'; // 随机访问
    }
  }

  /**
   * 检测季节性
   */
  detectSeasonality(dailyAccess) {
    const avg = dailyAccess.reduce((a, b) => a + b, 0) / 7;
    const variance = dailyAccess.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / 7;

    if (variance > avg * avg) {
      return 'weekly'; // 周期性
    } else {
      return 'none'; // 无明显季节性
    }
  }

  /**
   * 检测趋势
   */
  detectTrend(pattern) {
    const recentAccess = pattern.accessCount / 2; // 假设后一半时间访问量
    const trend = recentAccess > pattern.accessCount * 0.6 ? 'increasing' : 'stable';
    return trend;
  }

  /**
   * 查找峰值小时
   */
  findPeakHour(hourlyAccess) {
    return hourlyAccess.indexOf(Math.max(...hourlyAccess));
  }

  /**
   * 查找峰值日期
   */
  findPeakDay(dailyAccess) {
    return dailyAccess.indexOf(Math.max(...dailyAccess));
  }

  /**
   * 比较策略差异
   */
  strategyDiffers(strategy1, strategy2) {
    return JSON.stringify(strategy1) !== JSON.stringify(strategy2);
  }

  /**
   * 获取优化原因
   */
  getOptimizationReason(pattern, strategy) {
    const reasons = [];

    if (pattern.accessCount > 100) {
      reasons.push('high_access_frequency');
    }

    if (pattern.hitCount / pattern.accessCount < 0.5) {
      reasons.push('low_hit_rate');
    }

    if (pattern.size > 1024 * 1024) {
      reasons.push('large_file_size');
    }

    return reasons.join(', ');
  }

  /**
   * 启动分析任务
   */
  startAnalysisTasks() {
    // 定期分析任务
    setInterval(() => {
      this.cleanupOldPatterns();
      this.globalStats = this.calculateGlobalStats();
    }, this.config.analysisInterval);

    // 定期优化任务
    setInterval(() => {
      this.optimizeAllStrategies();
    }, this.config.analysisInterval * 2);
  }

  /**
   * 清理旧模式
   */
  cleanupOldPatterns() {
    const cutoff = Date.now() - this.config.historyRetention;
    let removed = 0;

    for (const [key, pattern] of this.accessPatterns.entries()) {
      if (pattern.lastAccess < cutoff) {
        this.accessPatterns.delete(key);
        this.strategyProfiles.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info('清理旧访问模式', { removed });
    }
  }

  /**
   * 计算全局统计
   */
  calculateGlobalStats() {
    const patterns = Array.from(this.accessPatterns.values());

    return {
      totalAccess: patterns.reduce((sum, p) => sum + p.accessCount, 0),
      uniqueKeys: patterns.length,
      avgAccessFrequency: patterns.length > 0 ?
        patterns.reduce((sum, p) => sum + p.accessCount, 0) / patterns.length : 0,
      hotDataCount: patterns.filter(p => p.accessCount >= this.config.hotDataThreshold).length,
      coldDataCount: patterns.filter(p => p.accessCount <= this.config.coldDataThreshold).length
    };
  }
}

module.exports = CacheStrategyOptimizer;