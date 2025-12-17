/**
 * 实时计算系统集成器
 * 统一管理和协调实时引擎、流处理器、跟踪器的集成
 */

const EventEmitter = require('events');
const realtimeEngine = require('../services/realtimeEngine');
const streamProcessor = require('../services/streamProcessor');
const realtimeTracker = require('../middleware/realtimeTracker');
const config = require('../config/realtimeConfig');

class RealtimeIntegrator extends EventEmitter {
  constructor() {
    super();

    this.components = {
      engine: realtimeEngine,
      processor: streamProcessor,
      tracker: realtimeTracker
    };

    this.status = {
      initialized: false,
      started: false,
      healthy: false,
      lastError: null
    };

    this.metrics = {
      totalProcessed: 0,
      totalErrors: 0,
      startTime: null,
      lastActivity: null
    };

    this.healthCheckInterval = null;
    this.cleanupInterval = null;
  }

  /**
   * 初始化集成系统
   */
  async initialize() {
    try {
      console.log('🚀 初始化实时计算集成系统...');

      // 1. 初始化实时引擎
      await this.initializeEngine();

      // 2. 初始化流处理器
      await this.initializeProcessor();

      // 3. 初始化跟踪器
      await this.initializeTracker();

      // 4. 设置组件间事件通信
      this.setupEventBridge();

      // 5. 注册系统级指标
      await this.registerSystemMetrics();

      // 6. 设置健康检查
      this.setupHealthCheck();

      // 7. 设置清理任务
      this.setupCleanupTasks();

      this.status.initialized = true;
      console.log('✅ 实时计算集成系统初始化完成');

      this.emit('initialized');

    } catch (error) {
      console.error('❌ 实时计算集成系统初始化失败:', error);
      this.status.lastError = error;
      throw error;
    }
  }

  /**
   * 启动集成系统
   */
  async start() {
    try {
      if (!this.status.initialized) {
        throw new Error('系统未初始化，请先调用 initialize()');
      }

      console.log('🚀 启动实时计算集成系统...');

      // 1. 启动实时引擎
      await this.components.engine.start();

      // 2. 启动流处理器
      this.components.processor.start();

      // 3. 启用跟踪器
      this.components.tracker.enable();

      this.status.started = true;
      this.status.healthy = true;
      this.metrics.startTime = Date.now();

      console.log('✅ 实时计算集成系统启动完成');

      this.emit('started');

    } catch (error) {
      console.error('❌ 实时计算集成系统启动失败:', error);
      this.status.lastError = error;
      throw error;
    }
  }

  /**
   * 停止集成系统
   */
  async stop() {
    try {
      console.log('🛑 停止实时计算集成系统...');

      // 1. 停止健康检查
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // 2. 停止清理任务
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // 3. 停止跟踪器
      this.components.tracker.disable();

      // 4. 停止流处理器
      this.components.processor.stop();

      // 5. 停止实时引擎
      await this.components.engine.stop();

      this.status.started = false;
      this.status.healthy = false;

      console.log('✅ 实时计算集成系统停止完成');

      this.emit('stopped');

    } catch (error) {
      console.error('❌ 实时计算集成系统停止失败:', error);
      this.status.lastError = error;
      throw error;
    }
  }

  /**
   * 处理实时数据
   */
  async processRealtimeData(dataType, data, options = {}) {
    try {
      this.metrics.totalProcessed++;
      this.metrics.lastActivity = Date.now();

      // 1. 通过流处理器处理数据
      const processedData = await this.components.processor.processData(
        dataType,
        data,
        options
      );

      // 2. 添加到实时引擎
      await this.components.engine.addStreamData(dataType, processedData);

      // 3. 发出处理完成事件
      this.emit('dataProcessed', {
        dataType,
        originalData: data,
        processedData,
        options,
        timestamp: Date.now()
      });

      return processedData;

    } catch (error) {
      this.metrics.totalErrors++;
      console.error(`处理实时数据失败 [${dataType}]:`, error);

      this.emit('processingError', {
        error,
        dataType,
        data,
        options,
        timestamp: Date.now()
      });

      throw error;
    }
  }

  /**
   * 批量处理数据
   */
  async processBatch(dataList, options = {}) {
    try {
      const results = [];
      const batchSize = options.batchSize || 50;

      for (let i = 0; i < dataList.length; i += batchSize) {
        const batch = dataList.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(item =>
            this.processRealtimeData(item.type, item.data, options)
              .catch(error => ({ error, item }))
          )
        );

        results.push(...batchResults);
      }

      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.length - successCount;

      console.log(`批处理完成: 总计 ${results.length}, 成功 ${successCount}, 失败 ${errorCount}`);

      return {
        total: results.length,
        successCount,
        errorCount,
        results
      };

    } catch (error) {
      console.error('批量处理失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    const now = Date.now();
    const uptime = this.status.started ? now - this.metrics.startTime : 0;

    return {
      status: this.status,
      metrics: this.metrics,
      uptime,
      components: {
        engine: {
          status: this.components.engine.getStatus(),
          metrics: this.components.engine.getMetrics(),
          cacheSize: this.components.engine.getCacheSize()
        },
        processor: {
          status: 'running',
          processorsCount: this.components.processor.processors.size,
          filtersCount: this.components.processor.filters.size,
          transformersCount: this.components.processor.transforms.size
        },
        tracker: {
          enabled: this.components.tracker.trackingEnabled,
          stats: this.components.tracker.getTrackingStats()
        }
      },
      health: {
        healthy: this.status.healthy,
        lastCheck: this.lastHealthCheck,
        checks: this.healthChecks || {}
      }
    };
  }

  /**
   * 获取综合指标
   */
  async getIntegratedMetrics(options = {}) {
    const {
      timeRange = '1h',
      includeDetails = false,
      includePredictions = false
    } = options;

    try {
      // 获取引擎指标
      const engineMetrics = this.components.engine.getAllMetrics();

      // 获取系统性能指标
      const performanceMetrics = {
        processing: {
          totalProcessed: this.metrics.totalProcessed,
          totalErrors: this.metrics.totalErrors,
          errorRate: this.metrics.totalProcessed > 0
            ? this.metrics.totalErrors / this.metrics.totalProcessed
            : 0,
          throughput: this.calculateThroughput()
        },
        latency: {
          avg: await this.components.engine.getMetricValue('response_time', timeRange),
          p95: await this.getPercentile('response_time', 0.95, timeRange),
          p99: await this.getPercentile('response_time', 0.99, timeRange)
        }
      };

      // 获取业务指标
      const businessMetrics = {
        users: {
          active: await this.components.engine.getMetricValue('active_users', timeRange),
          total: await this.components.engine.getMetricValue('total_users', timeRange)
        },
        engagement: {
          score: await this.components.engine.getMetricValue('engagement_score', timeRange),
          interactions: await this.components.engine.getMetricValue('user_interactions', timeRange)
        }
      };

      const integratedData = {
        timestamp: new Date().toISOString(),
        timeRange,
        performance: performanceMetrics,
        business: businessMetrics,
        alerts: {
          active: await this.components.engine.getActiveAlerts(),
          recent: await this.components.engine.getRecentAlerts(24)
        }
      };

      // 添加详细信息
      if (includeDetails) {
        integratedData.details = {
          engine: engineMetrics,
          processor: {
            processors: Array.from(this.components.processor.processors.keys()),
            filters: Array.from(this.components.processor.filters.keys()),
            transformers: Array.from(this.components.processor.transforms.keys())
          }
        };
      }

      // 添加预测数据
      if (includePredictions) {
        integratedData.predictions = await this.generatePredictions();
      }

      return integratedData;

    } catch (error) {
      console.error('获取综合指标失败:', error);
      throw error;
    }
  }

  /**
   * 初始化实时引擎
   */
  async initializeEngine() {
    // 设置Redis配置
    if (config.redis) {
      await this.components.engine.configureRedis(config.redis);
    }

    // 设置数据保留策略
    for (const [window, ttl] of Object.entries(config.realtimeEngine.dataRetention)) {
      this.components.engine.setDataRetention(window, ttl);
    }

    // 设置聚合窗口
    this.components.engine.configureAggregationWindows(
      config.realtimeEngine.aggregationWindows
    );

    console.log('✅ 实时引擎初始化完成');
  }

  /**
   * 初始化流处理器
   */
  async initializeProcessor() {
    // 配置数据流参数
    this.components.processor.configureDataStream({
      defaultBufferSize: config.streamProcessor.dataStream.defaultBufferSize,
      defaultFlushInterval: config.streamProcessor.dataStream.defaultFlushInterval,
      defaultBatchSize: config.streamProcessor.dataStream.defaultBatchSize
    });

    console.log('✅ 流处理器初始化完成');
  }

  /**
   * 初始化跟踪器
   */
  async initializeTracker() {
    // 配置跟踪参数
    this.components.tracker.configure({
      excludePaths: config.realtimeTracker.excludePaths,
      includePaths: config.realtimeTracker.includePaths,
      importantOperations: config.realtimeTracker.importantOperations
    });

    console.log('✅ 实时跟踪器初始化完成');
  }

  /**
   * 设置组件间事件通信
   */
  setupEventBridge() {
    // 引擎事件转发
    this.components.engine.on('metricUpdated', (event) => {
      this.emit('metricUpdated', event);
    });

    this.components.engine.on('alertTriggered', (alert) => {
      this.emit('alertTriggered', alert);
    });

    this.components.engine.on('thresholdTriggered', (alert) => {
      this.emit('thresholdTriggered', alert);
    });

    // 处理器事件转发
    this.components.processor.on('dataProcessed', (event) => {
      this.emit('streamDataProcessed', event);
    });

    this.components.processor.on('processingError', (error) => {
      this.emit('streamProcessingError', error);
    });

    // 跟踪器事件转发
    this.components.tracker.on('requestTracked', (event) => {
      // 将跟踪数据转换为流数据进行处理
      this.processRealtimeData('system', event.data);
    });

    console.log('✅ 组件事件桥接设置完成');
  }

  /**
   * 注册系统级指标
   */
  async registerSystemMetrics() {
    const metrics = config.realtimeTracker.metrics;

    if (metrics.responseTime) {
      await this.components.engine.registerMetric('system_response_time', {
        type: 'histogram',
        unit: 'ms',
        description: '系统响应时间',
        windows: ['1m', '5m', '15m', '1h']
      });
    }

    if (metrics.errorRate) {
      await this.components.engine.registerMetric('system_error_rate', {
        type: 'gauge',
        unit: 'percentage',
        description: '系统错误率',
        windows: ['1m', '5m', '15m']
      });
    }

    if (metrics.throughput) {
      await this.components.engine.registerMetric('system_throughput', {
        type: 'rate',
        unit: 'req/s',
        description: '系统吞吐量',
        windows: ['1m', '5m', '15m']
      });
    }

    console.log('✅ 系统指标注册完成');
  }

  /**
   * 设置健康检查
   */
  setupHealthCheck() {
    const interval = config.monitoring.healthCheck.interval || 60000;

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);

    console.log('✅ 健康检查设置完成');
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    try {
      this.healthChecks = {};
      let overallHealthy = true;

      // 检查实时引擎
      try {
        const engineStatus = this.components.engine.getStatus();
        this.healthChecks.engine = {
          status: 'healthy',
          responseTime: Date.now() - this.lastHealthCheck,
          details: engineStatus
        };
      } catch (error) {
        this.healthChecks.engine = {
          status: 'unhealthy',
          error: error.message
        };
        overallHealthy = false;
      }

      // 检查流处理器
      try {
        this.healthChecks.processor = {
          status: 'healthy',
          processorsCount: this.components.processor.processors.size
        };
      } catch (error) {
        this.healthChecks.processor = {
          status: 'unhealthy',
          error: error.message
        };
        overallHealthy = false;
      }

      // 检查跟踪器
      try {
        const trackerStats = this.components.tracker.getTrackingStats();
        this.healthChecks.tracker = {
          status: 'healthy',
          enabled: trackerStats.enabled,
          errorRate: trackerStats.errorRate
        };
      } catch (error) {
        this.healthChecks.tracker = {
          status: 'unhealthy',
          error: error.message
        };
        overallHealthy = false;
      }

      // 检查内存使用
      const memUsage = process.memoryUsage();
      const memoryUsageRatio = memUsage.heapUsed / memUsage.heapTotal;

      this.healthChecks.memory = {
        status: memoryUsageRatio < 0.9 ? 'healthy' : 'warning',
        usage: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
          ratio: Math.round(memoryUsageRatio * 100 * 100) / 100
        }
      };

      if (memoryUsageRatio >= 0.9) {
        overallHealthy = false;
      }

      this.status.healthy = overallHealthy;
      this.lastHealthCheck = Date.now();

      if (!overallHealthy) {
        this.emit('healthCheckFailed', this.healthChecks);
      }

    } catch (error) {
      console.error('健康检查执行失败:', error);
      this.status.healthy = false;
      this.healthChecks = { overall: { status: 'error', error: error.message } };
    }
  }

  /**
   * 设置清理任务
   */
  setupCleanupTasks() {
    const interval = config.realtimeEngine.memory.gcInterval || 60000;

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, interval);

    console.log('✅ 清理任务设置完成');
  }

  /**
   * 执行清理任务
   */
  performCleanup() {
    try {
      // 清理引擎缓存
      this.components.engine.clearExpiredCache();

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      // 重置统计计数器（如果需要）
      if (this.metrics.totalProcessed > 1000000) {
        this.metrics.totalProcessed = 0;
        this.metrics.totalErrors = 0;
      }

      console.log('🧹 系统清理完成');

    } catch (error) {
      console.error('系统清理失败:', error);
    }
  }

  /**
   * 计算吞吐量
   */
  calculateThroughput() {
    if (!this.metrics.startTime) return 0;

    const duration = (Date.now() - this.metrics.startTime) / 1000; // 秒
    return duration > 0 ? this.metrics.totalProcessed / duration : 0;
  }

  /**
   * 获取百分位数
   */
  async getPercentile(metricName, percentile, window) {
    try {
      const history = this.components.engine.getMetricHistory(metricName, window, 1000);
      if (history.length === 0) return 0;

      const values = history.map(point => point.value).sort((a, b) => a - b);
      const index = Math.ceil(values.length * percentile) - 1;
      return values[index] || 0;

    } catch (error) {
      console.error(`获取百分位数失败 [${metricName}]:`, error);
      return 0;
    }
  }

  /**
   * 生成预测数据
   */
  async generatePredictions() {
    try {
      // 简单的线性预测（实际应用中可使用更复杂的算法）
      const currentMetrics = await this.components.engine.getAllMetrics();
      const predictions = {};

      for (const [metricName, metric] of Object.entries(currentMetrics)) {
        const history = this.components.engine.getMetricHistory(metricName, '1h', 60);
        if (history.length < 10) continue;

        // 简单线性回归预测
        const trend = this.calculateTrend(history);
        const currentValue = history[history.length - 1].value;
        const predictedValue = currentValue + trend * 60; // 预测1小时后

        predictions[metricName] = {
          current: currentValue,
          predicted: predictedValue,
          trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
          confidence: 0.7 // 简化置信度
        };
      }

      return predictions;

    } catch (error) {
      console.error('生成预测数据失败:', error);
      return {};
    }
  }

  /**
   * 计算趋势
   */
  calculateTrend(history) {
    if (history.length < 2) return 0;

    const n = history.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += history[i].value;
      sumXY += i * history[i].value;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }
}

module.exports = new RealtimeIntegrator();