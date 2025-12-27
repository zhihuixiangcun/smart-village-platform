/**
 * 智能缓存策略
 * 实现动态TTL调整和预测性缓存
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');
const logger = require('../utils/logger');

class SmartCache extends EventEmitter {
  constructor(options = {}) {
    super();

    // 配置选项
    this.config = {
      // TTL阈值（毫秒）
      ttlThresholds: {
        high: 3600000,    // 1小时
        medium: 600000,   // 10分钟
        low: 60000        // 1分钟
      },
      // 命中率阈值
      hitRateThresholds: {
        high: 0.8,        // 80%
        medium: 0.5,      // 50%
        low: 0.2          // 20%
      },
      // 预测配置
      prediction: {
        enabled: options.predictionEnabled !== false,
        windowSize: options.predictionWindowSize || 100,  // 预测窗口大小
        confidenceThreshold: options.confidenceThreshold || 0.7  // 置信度阈值
      },
      // 调整策略
      adjustment: {
        enabled: options.adjustmentEnabled !== false,
        interval: options.adjustmentInterval || 300000,  // 5分钟调整一次
        aggressiveness: options.adjustmentAggressiveness || 0.2  // 调整幅度
      }
    };

    // 访问模式跟踪
    this.accessPatterns = new Map();

    // 命中率统计
    this.hitRates = new Map();

    // 预测模型
    this.predictionModel = {
      sequences: new Map(),
      frequencies: new Map()
    };

    // 调整历史
    this.adjustmentHistory = new Map();

    // 启动自动调整
    if (this.config.adjustment.enabled) {
      this.startAutoAdjustment();
    }

    // 启动预测性缓存
    if (this.config.prediction.enabled) {
      this.startPredictiveCaching();
    }
  }

  /**
   * 记录访问
   * @param {string} key - 缓存键
   * @param {boolean} hit - 是否命中
   * @param {Object} metadata - 元数据
   */
  recordAccess(key, hit, metadata = {}) {
    const now = Date.now();

    // 更新访问模式
    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, {
        accesses: [],
        hits: 0,
        misses: 0,
        lastAccess: now,
        created: now,
        frequency: 0,
        recency: 0
      });
    }

    const pattern = this.accessPatterns.get(key);

    // 记录访问
    pattern.accesses.push({
      timestamp: now,
      hit,
      metadata
    });

    // 保持窗口大小
    if (pattern.accesses.length > this.config.prediction.windowSize) {
      pattern.accesses.shift();
    }

    // 更新统计
    if (hit) {
      pattern.hits++;
    } else {
      pattern.misses++;
    }

    pattern.lastAccess = now;

    // 计算频率和近期性
    this.updatePatternMetrics(key, pattern);

    // 更新命中率
    this.updateHitRate(key);

    // 记录访问序列用于预测
    if (this.config.prediction.enabled) {
      this.recordAccessSequence(key, hit);
    }
  }

  /**
   * 更新模式指标
   * @param {string} key - 键
   * @param {Object} pattern - 访问模式
   */
  updatePatternMetrics(key, pattern) {
    const now = Date.now();
    const timeWindow = 3600000; // 1小时窗口

    // 计算频率（每分钟访问次数）
    const recentAccesses = pattern.accesses.filter(
      access => now - access.timestamp < timeWindow
    );
    pattern.frequency = recentAccesses.length / (timeWindow / 60000);

    // 计算近期性（最近访问时间距现在的分钟数）
    pattern.recency = (now - pattern.lastAccess) / 60000;

    // 标记热点数据
    pattern.isHot = pattern.frequency > 10 && pattern.recency < 60;

    // 标记冷数据
    pattern.isCold = pattern.frequency < 0.1 && pattern.recency > 1440; // 24小时
  }

  /**
   * 更新命中率
   * @param {string} key - 键
   */
  updateHitRate(key) {
    const pattern = this.accessPatterns.get(key);
    if (!pattern) return;

    const total = pattern.hits + pattern.misses;
    const hitRate = total > 0 ? pattern.hits / total : 0;

    this.hitRates.set(key, {
      rate: hitRate,
      total,
      lastUpdate: Date.now()
    });
  }

  /**
   * 动态调整TTL
   * @param {string} key - 键
   * @param {number} currentTtl - 当前TTL
   * @returns {number} 调整后的TTL
   */
  async adjustTTL(key, currentTtl) {
    if (!this.config.adjustment.enabled) {
      return currentTtl;
    }

    const pattern = this.accessPatterns.get(key);
    if (!pattern || pattern.accesses.length < 10) {
      return currentTtl; // 数据不足，不调整
    }

    const hitRate = this.hitRates.get(key)?.rate || 0;
    let newTtl = currentTtl;
    let adjustmentReason = '';

    // 基于命中率调整
    if (hitRate > this.config.hitRateThresholds.high) {
      // 高命中率，延长TTL
      newTtl = Math.min(
        currentTtl * (1 + this.config.adjustment.aggressiveness),
        this.config.ttlThresholds.high
      );
      adjustmentReason = 'high hit rate';
    } else if (hitRate < this.config.hitRateThresholds.low) {
      // 低命中率，缩短TTL
      newTtl = Math.max(
        currentTtl * (1 - this.config.adjustment.aggressiveness),
        this.config.ttlThresholds.low
      );
      adjustmentReason = 'low hit rate';
    }

    // 基于访问频率调整
    if (pattern.isHot) {
      // 热点数据，延长TTL
      newTtl = Math.min(newTtl * 1.5, this.config.ttlThresholds.high);
      adjustmentReason += ' + hot data';
    } else if (pattern.isCold) {
      // 冷数据，大幅缩短TTL
      newTtl = Math.max(newTtl * 0.5, this.config.ttlThresholds.low);
      adjustmentReason += ' + cold data';
    }

    // 基于访问模式调整
    const accessPattern = this.analyzeAccessPattern(pattern.accesses);
    if (accessPattern.regular) {
      // 规律访问，优化TTL
      const optimalInterval = accessPattern.avgInterval * 2;
      newTtl = Math.max(newTtl, optimalInterval);
      adjustmentReason += ' + regular pattern';
    }

    // 记录调整历史
    this.recordAdjustment(key, currentTtl, newTtl, adjustmentReason);

    if (Math.abs(newTtl - currentTtl) > 1000) { // 变化超过1秒才记录
      logger.debug('TTL动态调整', {
        key: this.maskKey(key),
        oldTtl: `${currentTtl}ms`,
        newTtl: `${newTtl}ms`,
        hitRate: `${(hitRate * 100).toFixed(2)}%`,
        reason: adjustmentReason
      });

      this.emit('ttlAdjusted', {
        key,
        oldTtl: currentTtl,
        newTtl,
        reason: adjustmentReason
      });
    }

    return Math.round(newTtl);
  }

  /**
   * 分析访问模式
   * @param {Array} accesses - 访问记录
   * @returns {Object} 访问模式分析
   */
  analyzeAccessPattern(accesses) {
    if (accesses.length < 3) {
      return { regular: false };
    }

    // 计算访问间隔
    const intervals = [];
    for (let i = 1; i < accesses.length; i++) {
      intervals.push(accesses[i].timestamp - accesses[i - 1].timestamp);
    }

    // 计算平均间隔和标准差
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // 判断是否规律（标准差小于平均值的30%）
    const regular = stdDev < avgInterval * 0.3;

    return {
      regular,
      avgInterval,
      stdDev,
      intervals
    };
  }

  /**
   * 记录访问序列
   * @param {string} key - 键
   * @param {boolean} hit - 是否命中
   */
  recordAccessSequence(key, hit) {
    // 创建序列键
    const sequenceKey = hit ? `hit:${key}` : `miss:${key}`;

    // 获取当前序列
    const sequence = this.predictionModel.sequences.get('current') || [];

    // 添加到序列
    sequence.push(sequenceKey);

    // 保持序列长度
    if (sequence.length > 20) {
      sequence.shift();
    }

    this.predictionModel.sequences.set('current', sequence);

    // 更新频率统计
    const count = this.predictionModel.frequencies.get(sequenceKey) || 0;
    this.predictionModel.frequencies.set(sequenceKey, count + 1);
  }

  /**
   * 预测下一个访问
   * @returns {Array} 预测的键列表
   */
  predictNextAccess() {
    const currentSequence = this.predictionModel.sequences.get('current') || [];
    if (currentSequence.length < 3) {
      return [];
    }

    // 获取最近的3个访问作为模式
    const pattern = currentSequence.slice(-3);
    const predictions = [];

    // 查找相似的历史序列
    for (let i = 0; i < currentSequence.length - 3; i++) {
      const historicalPattern = currentSequence.slice(i, i + 3);

      // 检查模式匹配度
      const matchScore = this.calculatePatternMatch(pattern, historicalPattern);

      if (matchScore > 0.8) {
        // 获取模式后的访问
        const nextAccess = currentSequence[i + 3];
        if (nextAccess) {
          predictions.push({
            key: nextAccess.replace(/^(hit|miss):/, ''),
            confidence: matchScore,
            type: nextAccess.startsWith('hit:') ? 'hit' : 'miss'
          });
        }
      }
    }

    // 按置信度排序
    predictions.sort((a, b) => b.confidence - a.confidence);

    // 返回高置信度的预测
    return predictions.filter(p => p.confidence > this.config.prediction.confidenceThreshold);
  }

  /**
   * 计算模式匹配度
   * @param {Array} pattern1 - 模式1
   * @param {Array} pattern2 - 模式2
   * @returns {number} 匹配度（0-1）
   */
  calculatePatternMatch(pattern1, pattern2) {
    if (pattern1.length !== pattern2.length) {
      return 0;
    }

    let matches = 0;
    for (let i = 0; i < pattern1.length; i++) {
      if (pattern1[i] === pattern2[i]) {
        matches++;
      }
    }

    return matches / pattern1.length;
  }

  /**
   * 预测性缓存
   */
  async predictiveCache() {
    try {
      const predictions = this.predictNextAccess();

      for (const prediction of predictions) {
        if (prediction.type === 'miss') {
          // 预测到未命中，尝试预加载
          this.emit('preloadRequest', {
            key: prediction.key,
            confidence: prediction.confidence
          });
        }
      }

      if (predictions.length > 0) {
        logger.debug('预测性缓存执行', {
          predictions: predictions.length,
          keys: predictions.map(p => this.maskKey(p.key))
        });
      }

    } catch (error) {
      logger.error('预测性缓存失败', error);
    }
  }

  /**
   * 获取智能缓存策略
   * @param {string} key - 键
   * @returns {Object} 缓存策略
   */
  getCacheStrategy(key) {
    const pattern = this.accessPatterns.get(key);
    const hitRate = this.hitRates.get(key)?.rate || 0;

    if (!pattern) {
      return {
        ttl: this.config.ttlThresholds.medium,
        priority: 'normal',
        preload: false
      };
    }

    const strategy = {
      ttl: this.config.ttlThresholds.medium,
      priority: 'normal',
      preload: false,
      compression: false,
      persistent: true
    };

    // 基于命中率调整
    if (hitRate > this.config.hitRateThresholds.high) {
      strategy.priority = 'high';
      strategy.ttl = this.config.ttlThresholds.high;
    } else if (hitRate < this.config.hitRateThresholds.low) {
      strategy.priority = 'low';
      strategy.ttl = this.config.ttlThresholds.low;
    }

    // 基于访问模式调整
    if (pattern.isHot) {
      strategy.priority = 'critical';
      strategy.preload = true;
      strategy.persistent = true;
    } else if (pattern.isCold) {
      strategy.priority = 'low';
      strategy.persistent = false;
    }

    // 基于数据大小调整
    if (pattern.averageSize > 1024 * 100) { // 100KB
      strategy.compression = true;
    }

    return strategy;
  }

  /**
   * 启动自动调整
   */
  startAutoAdjustment() {
    setInterval(async () => {
      await this.performAutoAdjustment();
    }, this.config.adjustment.interval);
  }

  /**
   * 执行自动调整
   */
  async performAutoAdjustment() {
    try {
      const adjustments = [];

      for (const [key, pattern] of this.accessPatterns.entries()) {
        if (pattern.accesses.length < 10) continue;

        const hitRate = this.hitRates.get(key)?.rate || 0;
        const currentTtl = this.getCurrentTTL(key);

        if (currentTtl && hitRate > 0) {
          const newTtl = await this.adjustTTL(key, currentTtl);

          if (Math.abs(newTtl - currentTtl) > 1000) {
            adjustments.push({
              key: this.maskKey(key),
              oldTtl: currentTtl,
              newTtl,
              hitRate: `${(hitRate * 100).toFixed(2)}%`
            });
          }
        }
      }

      if (adjustments.length > 0) {
        logger.info('自动TTL调整完成', {
          adjusted: adjustments.length,
          adjustments
        });

        this.emit('autoAdjustmentComplete', adjustments);
      }

    } catch (error) {
      logger.error('自动调整失败', error);
    }
  }

  /**
   * 启动预测性缓存
   */
  startPredictiveCaching() {
    setInterval(async () => {
      await this.predictiveCache();
    }, 60000); // 每分钟预测一次
  }

  /**
   * 记录调整历史
   * @param {string} key - 键
   * @param {number} oldTtl - 旧TTL
   * @param {number} newTtl - 新TTL
   * @param {string} reason - 调整原因
   */
  recordAdjustment(key, oldTtl, newTtl, reason) {
    if (!this.adjustmentHistory.has(key)) {
      this.adjustmentHistory.set(key, []);
    }

    const history = this.adjustmentHistory.get(key);
    history.push({
      timestamp: Date.now(),
      oldTtl,
      newTtl,
      reason,
      change: newTtl - oldTtl
    });

    // 保留最近10次调整记录
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * 获取当前TTL（需要从具体缓存实现获取）
   * @param {string} key - 键
   * @returns {number} TTL值
   */
  getCurrentTTL(key) {
    // 这里需要根据实际的缓存实现来获取TTL
    // 返回null表示未知
    return null;
  }

  /**
   * 遮蔽键名用于日志
   * @param {string} key - 原始键
   * @returns {string} 遮蔽后的键
   */
  maskKey(key) {
    if (!key || typeof key !== 'string') {
      return key;
    }

    if (key.length <= 8) {
      return `${key.substring(0, 2)  }***`;
    }

    return `${key.substring(0, 4)  }***${  key.substring(key.length - 4)}`;
  }

  /**
   * 获取缓存统计报告
   * @returns {Object} 统计报告
   */
  getReport() {
    const report = {
      timestamp: new Date(),
      totalKeys: this.accessPatterns.size,
      hitRateStats: this.calculateHitRateStats(),
      accessPatternStats: this.calculateAccessPatternStats(),
      adjustmentStats: this.calculateAdjustmentStats(),
      topHotKeys: this.getTopHotKeys(10),
      topColdKeys: this.getTopColdKeys(10)
    };

    return report;
  }

  /**
   * 计算命中率统计
   * @returns {Object} 命中率统计
   */
  calculateHitRateStats() {
    const hitRates = Array.from(this.hitRates.values());

    if (hitRates.length === 0) {
      return { avg: 0, min: 0, max: 0 };
    }

    const rates = hitRates.map(h => h.rate);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);

    return {
      avg: `${(avg * 100).toFixed(2)  }%`,
      min: `${(min * 100).toFixed(2)  }%`,
      max: `${(max * 100).toFixed(2)  }%`
    };
  }

  /**
   * 计算访问模式统计
   * @returns {Object} 访问模式统计
   */
  calculateAccessPatternStats() {
    const patterns = Array.from(this.accessPatterns.values());
    const hotCount = patterns.filter(p => p.isHot).length;
    const coldCount = patterns.filter(p => p.isCold).length;

    return {
      total: patterns.length,
      hot: hotCount,
      cold: coldCount,
      hotRate: patterns.length > 0 ? `${(hotCount / patterns.length * 100).toFixed(2)  }%` : '0%',
      coldRate: patterns.length > 0 ? `${(coldCount / patterns.length * 100).toFixed(2)  }%` : '0%'
    };
  }

  /**
   * 计算调整统计
   * @returns {Object} 调整统计
   */
  calculateAdjustmentStats() {
    let totalAdjustments = 0;
    let increaseCount = 0;
    let decreaseCount = 0;

    for (const history of this.adjustmentHistory.values()) {
      totalAdjustments += history.length;
      history.forEach(adj => {
        if (adj.change > 0) increaseCount++;
        else if (adj.change < 0) decreaseCount++;
      });
    }

    return {
      total: totalAdjustments,
      increases: increaseCount,
      decreases: decreaseCount
    };
  }

  /**
   * 获取热点键
   * @param {number} limit - 限制数量
   * @returns {Array} 热点键列表
   */
  getTopHotKeys(limit = 10) {
    const keys = Array.from(this.accessPatterns.entries())
      .filter(([_, pattern]) => pattern.isHot)
      .map(([key, pattern]) => ({
        key: this.maskKey(key),
        frequency: pattern.frequency,
        hitRate: this.hitRates.get(key)?.rate || 0
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);

    return keys;
  }

  /**
   * 获取冷点键
   * @param {number} limit - 限制数量
   * @returns {Array} 冷点键列表
   */
  getTopColdKeys(limit = 10) {
    const keys = Array.from(this.accessPatterns.entries())
      .filter(([_, pattern]) => pattern.isCold)
      .map(([key, pattern]) => ({
        key: this.maskKey(key),
        frequency: pattern.frequency,
        lastAccess: pattern.lastAccess
      }))
      .sort((a, b) => a.lastAccess - b.lastAccess)
      .slice(0, limit);

    return keys;
  }

  /**
   * 重置统计数据
   */
  reset() {
    this.accessPatterns.clear();
    this.hitRates.clear();
    this.predictionModel.sequences.clear();
    this.predictionModel.frequencies.clear();
    this.adjustmentHistory.clear();

    logger.info('智能缓存统计数据已重置');
  }
}

// 单例模式
const smartCache = new SmartCache();

module.exports = smartCache;