/**
 * 实时计算引擎
 * 支持流式数据处理、实时指标计算和动态阈值调整
 */

const EventEmitter = require('events');
const Redis = require('redis');
const mongoose = require('mongoose');

class RealtimeEngine extends EventEmitter {
  constructor() {
    super();

    this.redis = null;
    this.streamProcessors = new Map();
    this.metrics = new Map();
    this.thresholds = new Map();
    this.alertRules = new Map();
    this.subscribers = new Map();

    // 配置参数
    this.config = {
      windowSizes: {
        '1m': 60,      // 1分钟窗口
        '5m': 300,     // 5分钟窗口
        '15m': 900,    // 15分钟窗口
        '1h': 3600,    // 1小时窗口
        '1d': 86400    // 1天窗口
      },
      batchSize: 100,
      flushInterval: 1000, // 1秒
      maxHistoryPoints: 1000
    };

    this.isRunning = false;
    this.processingQueue = [];
    this.lastFlushTime = Date.now();

    this.init();
  }

  /**
   * 初始化实时引擎
   */
  async init() {
    try {
      // 检查是否启用Redis
      const redisEnabled = process.env.REDIS_ENABLED === 'true';

      if (redisEnabled) {
        // 连接Redis用于实时缓存
        this.redis = Redis.createClient({
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_DB || 2
        });

        this.redis.on('connect', () => {
          console.log('✅ 实时引擎Redis连接成功');
          this.emit('connected');
        });

        this.redis.on('error', (err) => {
          console.error('❌ 实时引擎Redis连接失败:', err);
          this.emit('error', err);
        });

        await this.redis.connect();
      } else {
        console.log('⚠️ Redis已禁用，使用内存模式运行实时引擎');
        this.redis = null;
      }

      // 启动处理循环
      this.startProcessingLoop();

      // 加载默认指标定义
      this.loadDefaultMetrics();

      // 加载默认阈值规则
      this.loadDefaultThresholds();

      console.log('🚀 实时计算引擎初始化完成');
    } catch (error) {
      console.error('实时引擎初始化失败:', error);
      throw error;
    }
  }

  /**
   * 启动处理循环
   */
  startProcessingLoop() {
    if (this.isRunning) return;

    this.isRunning = true;

    const processLoop = async () => {
      while (this.isRunning) {
        try {
          await this.flushProcessingQueue();
          await this.updateMetrics();
          await this.checkThresholds();

          await this.sleep(this.config.flushInterval);
        } catch (error) {
          console.error('处理循环错误:', error);
          await this.sleep(1000);
        }
      }
    };

    processLoop();
  }

  /**
   * 停止处理循环
   */
  stop() {
    this.isRunning = false;
    if (this.redis) {
      this.redis.quit();
    }
  }

  /**
   * 添加流数据
   */
  async addStreamData(dataType, data) {
    const streamData = {
      type: dataType,
      data,
      timestamp: Date.now(),
      id: this.generateId()
    };

    // 添加到处理队列
    this.processingQueue.push(streamData);

    // 立即处理高优先级数据
    if (this.isHighPriorityData(dataType, data)) {
      await this.processStreamData(streamData);
    }

    // 触发事件
    this.emit('dataAdded', streamData);

    return streamData.id;
  }

  /**
   * 注册流处理器
   */
  registerProcessor(dataType, processor) {
    if (!this.streamProcessors.has(dataType)) {
      this.streamProcessors.set(dataType, []);
    }

    this.streamProcessors.get(dataType).push(processor);
    console.log(`📝 注册流处理器: ${dataType}`);
  }

  /**
   * 注册指标定义
   */
  registerMetric(name, definition) {
    this.metrics.set(name, {
      name,
      type: definition.type, // 'counter', 'gauge', 'histogram', 'rate'
      unit: definition.unit,
      description: definition.description,
      tags: definition.tags || {},
      windows: definition.windows || ['1m', '5m', '15m', '1h'],
      aggregation: definition.aggregation || 'sum',
      currentValue: 0,
      history: {},
      lastUpdate: Date.now()
    });

    console.log(`📊 注册指标: ${name}`);
  }

  /**
   * 设置阈值规则
   */
  setThreshold(metricName, threshold) {
    this.thresholds.set(metricName, {
      metricName,
      type: threshold.type, // 'static', 'dynamic', 'adaptive'
      operator: threshold.operator, // '>', '<', '>=', '<=', '==', '!='
      value: threshold.value,
      adaptiveConfig: threshold.adaptiveConfig || {},
      currentThreshold: threshold.value,
      history: [],
      alertLevel: threshold.alertLevel || 'warning', // 'info', 'warning', 'critical'
      cooldown: threshold.cooldown || 60000, // 冷却时间(ms)
      lastAlertTime: 0,
      enabled: true
    });

    console.log(`⚠️ 设置阈值: ${metricName}`);
  }

  /**
   * 注册警报规则
   */
  registerAlertRule(ruleId, rule) {
    this.alertRules.set(ruleId, {
      id: ruleId,
      name: rule.name,
      description: rule.description,
      condition: rule.condition,
      action: rule.action,
      severity: rule.severity, // 'low', 'medium', 'high', 'critical'
      enabled: rule.enabled !== false,
      lastTriggered: 0,
      triggerCount: 0
    });

    console.log(`🚨 注册警报规则: ${ruleId}`);
  }

  /**
   * 订阅实时数据
   */
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    this.subscribers.get(eventType).push(callback);

    // 返回取消订阅函数
    return () => {
      const callbacks = this.subscribers.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 处理流数据
   */
  async processStreamData(streamData) {
    const { type, data, timestamp } = streamData;

    try {
      // 执行注册的处理器
      const processors = this.streamProcessors.get(type) || [];

      for (const processor of processors) {
        await processor(data, streamData);
      }

      // 更新相关指标
      await this.updateMetricsForData(type, data);

      // 检查警报规则
      await this.checkAlertRules(type, data);

      // 触发数据事件
      this.emit('dataProcessed', streamData);

    } catch (error) {
      console.error('处理流数据失败:', error);
      this.emit('processingError', { error, streamData });
    }
  }

  /**
   * 刷新处理队列
   */
  async flushProcessingQueue() {
    if (this.processingQueue.length === 0) return;

    const batchSize = Math.min(this.config.batchSize, this.processingQueue.length);
    const batch = this.processingQueue.splice(0, batchSize);

    // 并行处理批次
    await Promise.all(
      batch.map(streamData => this.processStreamData(streamData))
    );

    this.lastFlushTime = Date.now();
  }

  /**
   * 更新所有指标
   */
  async updateMetrics() {
    // 定期更新系统指标
    const now = Date.now();

    // 更新时间序列指标
    for (const [metricName, metric] of this.metrics) {
      if (metric.type === 'timeseries') {
        // 清理过期数据点
        if (metric.dataPoints.length > this.config.maxHistoryPoints) {
          metric.dataPoints = metric.dataPoints.slice(-this.config.maxHistoryPoints);
        }

        // 如果有Redis，同步到缓存
        if (this.redis) {
          try {
            await this.redis.set(
              `metric:${metricName}`,
              JSON.stringify(metric),
              { EX: 3600 } // 1小时过期
            );
          } catch (error) {
            console.error(`同步指标 ${metricName} 到Redis失败:`, error);
          }
        }
      }
    }
  }

  /**
   * 更新指标
   */
  async updateMetricsForData(dataType, data) {
    // 根据数据类型更新相关指标
    const metricUpdates = this.getMetricUpdatesForData(dataType, data);

    for (const [metricName, value] of metricUpdates) {
      await this.updateMetricValue(metricName, value, dataType);
    }
  }

  /**
   * 更新指标值
   */
  async updateMetricValue(metricName, value, dataType) {
    const metric = this.metrics.get(metricName);
    if (!metric) return;

    const timestamp = Date.now();
    metric.currentValue = value;
    metric.lastUpdate = timestamp;

    // 更新历史数据
    for (const windowSize of Object.values(this.config.windowSizes)) {
      if (!metric.history[windowSize]) {
        metric.history[windowSize] = [];
      }

      const windowKey = Math.floor(timestamp / (windowSize * 1000));

      // 查找或创建窗口数据点
      let dataPoint = metric.history[windowSize].find(point => point.windowKey === windowKey);

      if (!dataPoint) {
        dataPoint = {
          windowKey,
          timestamp: windowKey * windowSize * 1000,
          value: 0,
          count: 0,
          sum: 0,
          min: value,
          max: value
        };
        metric.history[windowSize].push(dataPoint);
      }

      // 根据指标类型聚合数据
      switch (metric.type) {
      case 'counter':
        dataPoint.value += value;
        dataPoint.sum += value;
        break;
      case 'gauge':
        dataPoint.value = value;
        dataPoint.sum += value;
        break;
      case 'histogram':
        dataPoint.value = Math.max(dataPoint.value, value);
        dataPoint.sum += value;
        break;
      case 'rate':
        dataPoint.value = value;
        dataPoint.sum += value;
        break;
      }

      dataPoint.count++;
      dataPoint.min = Math.min(dataPoint.min, value);
      dataPoint.max = Math.max(dataPoint.max, value);
    }

    // 保存到Redis
    await this.saveMetricToRedis(metricName, metric);

    // 触发指标更新事件
    this.emit('metricUpdated', { metricName, value, timestamp, dataType });
  }

  /**
   * 检查阈值
   */
  async checkThresholds() {
    const now = Date.now();

    for (const [metricName, threshold] of this.thresholds) {
      if (!threshold.enabled) continue;

      const metric = this.metrics.get(metricName);
      if (!metric) continue;

      // 冷却期检查
      if (now - threshold.lastAlertTime < threshold.cooldown) continue;

      // 获取当前值
      const currentValue = this.getMetricValue(metricName, threshold.adaptiveConfig?.window || '1m');

      if (currentValue === null) continue;

      // 动态调整阈值
      if (threshold.type === 'dynamic' || threshold.type === 'adaptive') {
        await this.adjustThreshold(metricName, threshold, metric);
      }

      // 检查阈值条件
      const isTriggered = this.evaluateThreshold(currentValue, threshold);

      if (isTriggered) {
        threshold.lastAlertTime = now;
        threshold.history.push({
          timestamp: now,
          value: currentValue,
          threshold: threshold.currentThreshold
        });

        // 触发警报事件
        this.emit('thresholdTriggered', {
          metricName,
          currentValue,
          threshold: threshold.currentThreshold,
          alertLevel: threshold.alertLevel
        });
      }
    }
  }

  /**
   * 动态调整阈值
   */
  async adjustThreshold(metricName, threshold, metric) {
    const config = threshold.adaptiveConfig;
    if (!config) return;

    const history = metric.history[config.window || '1h'] || [];
    if (history.length < config.minDataPoints || 10) return;

    // 计算统计指标
    const values = history.slice(-config.dataPoints || 100).map(point => point.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    // 根据策略调整阈值
    let newThreshold;
    switch (config.strategy) {
    case 'std_deviation':
      newThreshold = mean + (config.multiplier || 2) * stdDev;
      break;
    case 'percentile':
      const sorted = values.sort((a, b) => a - b);
      const percentileIndex = Math.floor(sorted.length * (config.percentile || 0.95));
      newThreshold = sorted[percentileIndex];
      break;
    case 'trend_based':
      newThreshold = await this.calculateTrendBasedThreshold(metricName, config);
      break;
    default:
      return;
    }

    // 应用调整因子
    if (config.adjustmentFactor) {
      newThreshold *= config.adjustmentFactor;
    }

    // 限制调整范围
    if (config.minThreshold !== undefined) {
      newThreshold = Math.max(newThreshold, config.minThreshold);
    }
    if (config.maxThreshold !== undefined) {
      newThreshold = Math.min(newThreshold, config.maxThreshold);
    }

    threshold.currentThreshold = newThreshold;
  }

  /**
   * 检查警报规则
   */
  async checkAlertRules(dataType, data) {
    const now = Date.now();

    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      // 冷却期检查
      if (now - rule.lastTriggered < rule.cooldown) continue;

      try {
        // 评估规则条件
        const condition = this.evaluateRuleCondition(rule.condition, { dataType, data, now });

        if (condition) {
          rule.lastTriggered = now;
          rule.triggerCount++;

          // 执行警报动作
          await this.executeAlertAction(rule, { dataType, data, now });

          // 触发警报事件
          this.emit('alertTriggered', {
            ruleId,
            ruleName: rule.name,
            severity: rule.severity,
            dataType,
            data
          });
        }
      } catch (error) {
        console.error(`警报规则评估失败 ${ruleId}:`, error);
      }
    }
  }

  /**
   * 获取指标值
   */
  getMetricValue(metricName, window = '1m') {
    const metric = this.metrics.get(metricName);
    if (!metric) return null;

    const history = metric.history[this.config.windowSizes[window]];
    if (!history || history.length === 0) return null;

    // 返回最新的值
    const latestPoint = history[history.length - 1];
    return latestPoint.value;
  }

  /**
   * 获取指标历史数据
   */
  getMetricHistory(metricName, window = '1h', limit = 100) {
    const metric = this.metrics.get(metricName);
    if (!metric) return [];

    const history = metric.history[this.config.windowSizes[window]] || [];
    return history.slice(-limit).map(point => ({
      timestamp: point.timestamp,
      value: point.value,
      count: point.count
    }));
  }

  /**
   * 获取所有指标
   */
  getAllMetrics() {
    const result = {};

    for (const [name, metric] of this.metrics) {
      result[name] = {
        name,
        type: metric.type,
        unit: metric.unit,
        currentValue: metric.currentValue,
        lastUpdate: metric.lastUpdate,
        description: metric.description
      };
    }

    return result;
  }

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    return {
      isRunning: this.isRunning,
      queueSize: this.processingQueue.length,
      lastFlushTime: this.lastFlushTime,
      metricsCount: this.metrics.size,
      thresholdsCount: this.thresholds.size,
      alertsCount: this.alertRules.size,
      subscribersCount: Array.from(this.subscribers.values()).reduce((sum, callbacks) => sum + callbacks.length, 0),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  // 私有方法

  generateId() {
    return `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isHighPriorityData(dataType, data) {
    const highPriorityTypes = ['emergency', 'critical', 'alert'];
    return highPriorityTypes.includes(dataType) ||
           (data.priority && ['high', 'critical'].includes(data.priority));
  }

  getMetricUpdatesForData(dataType, data) {
    const updates = new Map();

    // 根据数据类型生成指标更新
    switch (dataType) {
    case 'behavior':
      updates.set('behavior_count', 1);
      if (data.action === 'login') {
        updates.set('active_users', 1);
      }
      if (data.metrics?.score) {
        updates.set('engagement_score', data.metrics.score);
      }
      break;

    case 'finance':
      updates.set('transaction_count', 1);
      if (data.amount) {
        updates.set('transaction_amount', data.amount);
        if (data.action === 'income') {
          updates.set('income_total', data.amount);
        } else if (data.action === 'expense') {
          updates.set('expense_total', data.amount);
        }
      }
      break;

    case 'village_affairs':
      updates.set('affairs_count', 1);
      if (data.participants) {
        updates.set('participation_count', data.participants.length);
      }
      break;

    case 'emergency':
      updates.set('emergency_count', 1);
      if (data.metadata?.severity === 'critical') {
        updates.set('critical_emergency', 1);
      }
      break;

    default:
      updates.set('generic_event', 1);
    }

    return updates;
  }

  async saveMetricToRedis(metricName, metric) {
    if (!this.redis) return;

    try {
      const key = `realtime:metric:${metricName}`;
      const data = {
        currentValue: metric.currentValue,
        lastUpdate: metric.lastUpdate,
        history: Object.fromEntries(
          Object.entries(metric.history).map(([window, points]) => [
            window,
            points.slice(-10) // 只保存最近10个数据点
          ])
        )
      };

      await this.redis.setEx(key, 3600, JSON.stringify(data));
    } catch (error) {
      console.error('保存指标到Redis失败:', error);
    }
  }

  evaluateThreshold(value, threshold) {
    const { operator, currentThreshold } = threshold;

    switch (operator) {
    case '>': return value > currentThreshold;
    case '<': return value < currentThreshold;
    case '>=': return value >= currentThreshold;
    case '<=': return value <= currentThreshold;
    case '==': return value === currentThreshold;
    case '!=': return value !== currentThreshold;
    default: return false;
    }
  }

  evaluateRuleCondition(condition, context) {
    // 简化的条件评估器
    // 在实际项目中可以使用更复杂的表达式解析器
    try {
      const { field, operator, value } = condition;
      const contextValue = this.getNestedValue(context, field);

      switch (operator) {
      case 'eq': return contextValue === value;
      case 'ne': return contextValue !== value;
      case 'gt': return contextValue > value;
      case 'gte': return contextValue >= value;
      case 'lt': return contextValue < value;
      case 'lte': return contextValue <= value;
      case 'contains': return String(contextValue).includes(String(value));
      case 'regex': return new RegExp(value).test(String(contextValue));
      default: return false;
      }
    } catch (error) {
      console.error('规则条件评估失败:', error);
      return false;
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async executeAlertAction(rule, context) {
    const { action } = rule;

    try {
      switch (action.type) {
      case 'webhook':
        if (action.url) {
          // 发送webhook通知
          await this.sendWebhook(action.url, {
            rule: rule.name,
            severity: rule.severity,
            context,
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'email':
        // 发送邮件通知
        await this.sendEmailNotification(action.recipients, {
          subject: `智慧村庄警报: ${rule.name}`,
          body: rule.description,
          context
        });
        break;

      case 'log':
        // 记录到日志
        console.warn(`🚨 警报触发: ${rule.name}`, context);
        break;

      case 'function':
        if (action.handler && typeof action.handler === 'function') {
          await action.handler(rule, context);
        }
        break;
      }
    } catch (error) {
      console.error('执行警报动作失败:', error);
    }
  }

  async sendWebhook(url, data) {
    // 模拟webhook发送
    console.log(`📡 发送Webhook: ${url}`, data);
  }

  async sendEmailNotification(recipients, data) {
    // 模拟邮件发送
    console.log(`📧 发送邮件通知: ${recipients.join(', ')}`, data);
  }

  async calculateTrendBasedThreshold(metricName, config) {
    // 基于趋势计算阈值
    const history = this.getMetricHistory(metricName, config.window || '1h');
    if (history.length < 10) return 0;

    // 简单线性趋势计算
    const n = history.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = history.reduce((sum, point, index) => sum + point.value * index, 0);
    const sumXY = history.reduce((sum, point, index) => sum + point.value * index * index, 0);

    const slope = (n * sumXY - sumY * sumX) / (n * sumXY - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 预测下一个值
    const nextIndex = n;
    return slope * nextIndex + intercept;
  }

  loadDefaultMetrics() {
    // 加载默认指标定义
    this.registerMetric('active_users', {
      type: 'gauge',
      unit: 'count',
      description: '当前活跃用户数',
      windows: ['1m', '5m', '15m', '1h']
    });

    this.registerMetric('behavior_count', {
      type: 'counter',
      unit: 'count',
      description: '行为事件总数',
      windows: ['1m', '5m', '15m', '1h']
    });

    this.registerMetric('transaction_amount', {
      type: 'histogram',
      unit: 'amount',
      description: '交易金额',
      windows: ['1m', '5m', '15m', '1h']
    });

    this.registerMetric('response_time', {
      type: 'rate',
      unit: 'ms',
      description: 'API响应时间',
      windows: ['1m', '5m', '15m', '1h']
    });
  }

  loadDefaultThresholds() {
    // 加载默认阈值
    this.setThreshold('active_users', {
      type: 'dynamic',
      operator: '<',
      value: 10,
      alertLevel: 'warning',
      adaptiveConfig: {
        strategy: 'std_deviation',
        multiplier: 2,
        minDataPoints: 10,
        window: '1h'
      }
    });

    this.setThreshold('response_time', {
      type: 'adaptive',
      operator: '>',
      value: 1000,
      alertLevel: 'critical',
      adaptiveConfig: {
        strategy: 'percentile',
        percentile: 0.95,
        minDataPoints: 20,
        window: '5m'
      }
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new RealtimeEngine();