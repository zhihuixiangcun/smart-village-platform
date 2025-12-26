/**
 * 实时数据流处理管理器
 * 智慧乡村平台流处理系统统一管理
 */

const kafkaManager = require('./kafkaManager');
const flinkProcessor = require('./flinkProcessor');
const hudiDataLake = require('./hudiDataLake');
const sparkAnalytics = require('./sparkAnalytics');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class RealtimeDataManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // 流处理架构配置
      streamProcessing: {
        engine: config.streamEngine || 'Apache_Flink',  // Apache_Flink, Apache_Spark_Structured_Streaming
        processing: config.processing || 'Apache_Flink',
        storage: config.storage || 'Apache_Hudi',
        analytics: config.analytics || 'Apache_Spark'
      },

      // 数据管道配置
      pipelines: {
        // 村庄事件处理管道
        village_events: {
          enabled: config.villageEventsEnabled !== false,
          source: {
            type: 'kafka',
            topic: 'village-events',
            groupId: 'village-events-processor'
          },
          processing: {
            type: 'flink',
            parallelism: 4,
            checkpointInterval: 60000
          },
          sink: [
            {
              type: 'hudi',
              table: 'village_events',
              operation: 'upsert'
            },
            {
              type: 'elasticsearch',
              index: 'village-events'
            }
          ]
        },

        // 用户行为分析管道
        user_behavior: {
          enabled: config.userBehaviorEnabled !== false,
          source: {
            type: 'kafka',
            topic: 'user-behavior',
            groupId: 'user-behavior-processor'
          },
          processing: {
            type: 'flink',
            parallelism: 6,
            windowSize: '5minutes'
          },
          sink: [
            {
              type: 'hudi',
              table: 'user_behavior',
              operation: 'upsert'
            },
            {
              type: 'redis',
              ttl: 3600
            }
          ]
        },

        // IoT传感器数据管道
        iot_sensors: {
          enabled: config.iotSensorsEnabled !== false,
          source: {
            type: 'kafka',
            topic: 'iot-sensor-data',
            groupId: 'iot-sensors-processor'
          },
          processing: {
            type: 'flink',
            parallelism: 8,
            watermarkInterval: 1000
          },
          sink: [
            {
              type: 'hudi',
              table: 'iot_sensor_data',
              operation: 'upsert'
            },
            {
              type: 'influxdb',
              database: 'smartvillage_iot'
            }
          ]
        },

        // 紧急事件检测管道
        emergency_detection: {
          enabled: config.emergencyDetectionEnabled !== false,
          source: {
            type: 'kafka',
            topic: 'village-events',
            groupId: 'emergency-detector'
          },
          processing: {
            type: 'flink',
            parallelism: 2,
            stateBackend: 'rocksdb'
          },
          sink: [
            {
              type: 'kafka',
              topic: 'emergency-alerts',
              priority: 'high'
            },
            {
              type: 'websocket',
              broadcast: true
            },
            {
              type: 'sms',
              providers: ['aliyun', 'tencent']
            }
          ]
        },

        // 实时分析管道
        realtime_analytics: {
          enabled: config.realtimeAnalyticsEnabled !== false,
          source: {
            type: 'kafka',
            topics: ['village-events', 'user-behavior', 'iot-sensor-data'],
            groupId: 'realtime-analytics'
          },
          processing: {
            type: 'spark',
            batchInterval: 10000,
            watermarkInterval: 5000
          },
          sink: [
            {
              type: 'redis',
              keyPrefix: 'analytics:'
            },
            {
              type: 'websocket',
              channel: 'analytics'
            }
          ]
        }
      },

      // 监控和告警配置
      monitoring: {
        enabled: config.monitoringEnabled !== false,
        metricsInterval: config.metricsInterval || 30000,
        alerting: {
          enabled: config.alertingEnabled !== false,
          channels: config.alertChannels || ['email', 'webhook'],
          thresholds: {
            throughput: config.throughputThreshold || 10000,
            latency: config.latencyThreshold || 5000,
            errorRate: config.errorRateThreshold || 0.05
          }
        }
      },

      // 容错和恢复配置
      faultTolerance: {
        enabled: config.faultToleranceEnabled !== false,
        maxRetries: config.maxRetries || 3,
        retryDelay: config.retryDelay || 5000,
        deadLetterQueue: config.deadLetterQueue !== false,
        circuitBreaker: {
          enabled: config.circuitBreakerEnabled !== false,
          failureThreshold: config.circuitBreakerThreshold || 5,
          recoveryTime: config.circuitBreakerRecoveryTime || 60000
        }
      }
    };

    // 组件引用
    this.components = {
      kafka: kafkaManager,
      flink: flinkProcessor,
      hudi: hudiDataLake,
      spark: sparkAnalytics
    };

    // 活动管道
    this.activePipelines = new Map();

    // 管道状态
    this.pipelineStates = new Map();

    // 性能指标
    this.metrics = {
      totalEventsProcessed: 0,
      eventsPerSecond: 0,
      avgLatency: 0,
      errorRate: 0,
      pipelineHealth: {},
      componentHealth: {
        kafka: 'unknown',
        flink: 'unknown',
        hudi: 'unknown',
        spark: 'unknown'
      }
    };

    // 流处理配置
    this.streamProcessing = {
      engine: this.config.streamProcessing.engine,
      processing: this.config.streamProcessing.processing,
      storage: this.config.streamProcessing.storage,
      analytics: this.config.streamProcessing.analytics
    };

    // 初始化管理器
    this.initRealtimeDataManager();
  }

  /**
   * 初始化实时数据管理器
   */
  async initRealtimeDataManager() {
    try {
      // 检查所有组件状态
      await this.checkComponentHealth();

      // 初始化数据管道
      await this.initDataPipelines();

      // 启动监控任务
      this.startMonitoringTasks();

      // 设置组件事件监听
      this.setupComponentEventListeners();

      logger.info('实时数据管理器初始化完成', {
        streamProcessing: this.streamProcessing,
        pipelines: Object.keys(this.config.pipelines).length
      });

      this.emit('initialized');

    } catch (error) {
      logger.error('实时数据管理器初始化失败', error);
      throw error;
    }
  }

  /**
   * 启动数据管道
   * @param {string} pipelineName - 管道名称
   * @param {Object} options - 启动选项
   */
  async startPipeline(pipelineName, options = {}) {
    try {
      const pipelineConfig = this.config.pipelines[pipelineName];
      if (!pipelineConfig) {
        throw new Error(`管道 ${pipelineName} 配置不存在`);
      }

      if (!pipelineConfig.enabled) {
        throw new Error(`管道 ${pipelineName} 未启用`);
      }

      // 检查管道是否已运行
      if (this.activePipelines.has(pipelineName)) {
        logger.warn('管道已在运行', { pipelineName });
        return this.activePipelines.get(pipelineName);
      }

      // 创建管道实例
      const pipeline = await this.createPipelineInstance(pipelineName, pipelineConfig);

      // 启动管道
      await pipeline.start(options);

      // 记录活动管道
      this.activePipelines.set(pipelineName, pipeline);
      this.pipelineStates.set(pipelineName, 'RUNNING');

      logger.info('数据管道启动成功', { pipelineName });

      this.emit('pipeline:started', { pipelineName, pipeline });

      return pipeline;

    } catch (error) {
      this.pipelineStates.set(pipelineName, 'FAILED');
      logger.error('数据管道启动失败', { pipelineName, error: error.message });
      throw error;
    }
  }

  /**
   * 停止数据管道
   * @param {string} pipelineName - 管道名称
   * @param {Object} options - 停止选项
   */
  async stopPipeline(pipelineName, options = {}) {
    try {
      const pipeline = this.activePipelines.get(pipelineName);
      if (!pipeline) {
        throw new Error(`管道 ${pipelineName} 未运行`);
      }

      // 停止管道
      await pipeline.stop(options);

      // 更新状态
      this.activePipelines.delete(pipelineName);
      this.pipelineStates.set(pipelineName, 'STOPPED');

      logger.info('数据管道停止成功', { pipelineName });

      this.emit('pipeline:stopped', { pipelineName });

    } catch (error) {
      logger.error('数据管道停止失败', { pipelineName, error: error.message });
      throw error;
    }
  }

  /**
   * 处理实时事件
   * @param {Object} event - 事件数据
   * @param {Object} options - 处理选项
   */
  async processEvent(event, options = {}) {
    try {
      const startTime = Date.now();

      // 验证事件格式
      this.validateEvent(event);

      // 路由到相应管道
      const pipelineName = this.routeEventToPipeline(event);
      if (!pipelineName) {
        throw new Error(`无法路由事件: ${event.type}`);
      }

      // 发送到Kafka
      await this.components.kafka.sendMessages(
        this.config.pipelines[pipelineName].source.topic,
        event,
        {
          priority: event.severity === 'critical' ? 'emergency' : 'normal',
          type: event.type,
          source: event.source || 'system'
        }
      );

      // 更新指标
      const latency = Date.now() - startTime;
      this.updateMetrics(latency);

      logger.debug('事件处理成功', {
        eventId: event.id,
        type: event.type,
        pipeline: pipelineName,
        latency
      });

      this.emit('event:processed', { event, pipelineName, latency });

    } catch (error) {
      logger.error('事件处理失败', {
        eventId: event.id,
        type: event.type,
        error: error.message
      });

      // 发送到死信队列
      if (this.config.faultTolerance.deadLetterQueue) {
        await this.sendToDeadLetterQueue(event, error);
      }

      this.emit('event:failed', { event, error });
    }
  }

  /**
   * 批量处理事件
   * @param {Array} events - 事件数组
   * @param {Object} options - 处理选项
   */
  async processBatchEvents(events, options = {}) {
    try {
      if (!Array.isArray(events)) {
        throw new Error('事件必须是数组');
      }

      const startTime = Date.now();
      let successCount = 0;
      let failureCount = 0;

      // 按事件类型分组
      const eventsByType = this.groupEventsByType(events);

      // 批量处理各类型事件
      for (const [eventType, typeEvents] of Object.entries(eventsByType)) {
        try {
          const pipelineName = this.getPipelineForEventType(eventType);
          if (pipelineName && this.activePipelines.has(pipelineName)) {
            await this.components.kafka.sendMessages(
              this.config.pipelines[pipelineName].source.topic,
              typeEvents,
              {
                batch: true,
                type: eventType,
                priority: events.some(e => e.severity === 'critical') ? 'emergency' : 'normal'
              }
            );
            successCount += typeEvents.length;
          } else {
            failureCount += typeEvents.length;
          }
        } catch (error) {
          logger.error('批量事件处理失败', {
            eventType,
            count: typeEvents.length,
            error: error.message
          });
          failureCount += typeEvents.length;
        }
      }

      const totalTime = Date.now() - startTime;
      logger.info('批量事件处理完成', {
        totalEvents: events.length,
        successCount,
        failureCount,
        totalTime,
        throughput: Math.round(events.length / (totalTime / 1000))
      });

      return { successCount, failureCount, totalTime };

    } catch (error) {
      logger.error('批量事件处理失败', { count: events.length, error: error.message });
      throw error;
    }
  }

  /**
   * 创建自定义流处理管道
   * @param {string} pipelineName - 管道名称
   * @param {Object} pipelineConfig - 管道配置
   */
  async createCustomPipeline(pipelineName, pipelineConfig) {
    try {
      // 验证管道配置
      this.validatePipelineConfig(pipelineConfig);

      // 创建Flink管道
      if (pipelineConfig.processing.type === 'flink') {
        await this.components.flink.createPipeline(
          pipelineName,
          {
            source: pipelineConfig.source,
            operations: pipelineConfig.operations || [],
            sink: pipelineConfig.sink,
            parallelism: pipelineConfig.processing.parallelism || this.config.processing.parallelism
          }
        );
      }

      // 注册管道配置
      this.config.pipelines[pipelineName] = {
        ...pipelineConfig,
        enabled: true,
        custom: true
      };

      logger.info('自定义管道创建成功', { pipelineName });

      this.emit('pipeline:created', { pipelineName, config: pipelineConfig });

    } catch (error) {
      logger.error('创建自定义管道失败', { pipelineName, error: error.message });
      throw error;
    }
  }

  /**
   * 查询实时指标
   * @param {string} metricType - 指标类型
   * @param {Object} filters - 过滤条件
   */
  async queryRealTimeMetrics(metricType, filters = {}) {
    try {
      let result = {};

      switch (metricType) {
        case 'village_overview':
          result = await this.queryVillageOverview(filters);
          break;
        case 'user_activity':
          result = await this.queryUserActivity(filters);
          break;
        case 'system_performance':
          result = await this.querySystemPerformance(filters);
          break;
        case 'emergency_events':
          result = await this.queryEmergencyEvents(filters);
          break;
        case 'iot_sensors':
          result = await this.queryIotSensors(filters);
          break;
        default:
          throw new Error(`不支持的指标类型: ${metricType}`);
      }

      logger.debug('实时指标查询成功', { metricType, filters });

      return result;

    } catch (error) {
      logger.error('实时指标查询失败', { metricType, error: error.message });
      throw error;
    }
  }

  /**
   * 生成实时报告
   * @param {Object} reportConfig - 报告配置
   */
  async generateRealtimeReport(reportConfig) {
    try {
      const {
        type,
        timeRange = { start: Date.now() - 3600000, end: Date.now() }, // 默认1小时
        metrics = [],
        filters = {},
        format = 'json'
      } = reportConfig;

      // 收集数据
      const reportData = {
        reportType: type,
        timeRange,
        generatedAt: new Date().toISOString(),
        streamProcessing: this.streamProcessing,
        pipelines: this.getPipelineStatus(),
        components: this.getComponentStatus(),
        metrics: {}
      };

      // 收集各组件指标
      if (metrics.includes('kafka')) {
        reportData.metrics.kafka = await this.components.kafka.getPerformanceStats();
      }

      if (metrics.includes('flink')) {
        reportData.metrics.flink = await this.components.flink.getPerformanceStats();
      }

      if (metrics.includes('hudi')) {
        reportData.metrics.hudi = this.components.hudi.getDataLakeOverview();
      }

      if (metrics.includes('spark')) {
        reportData.metrics.spark = await this.components.spark.getPerformanceStats();
      }

      // 收集管道指标
      reportData.metrics.pipelines = this.getPipelineMetrics();

      logger.info('实时报告生成成功', { type, metricsCount: metrics.length });

      this.emit('report:generated', { report: reportData });

      return reportData;

    } catch (error) {
      logger.error('实时报告生成失败', { type, error: error.message });
      throw error;
    }
  }

  /**
   * 获取流处理架构状态
   */
  getStreamProcessingArchitecture() {
    return {
      architecture: {
        engine: this.streamProcessing.engine,
        processing: this.streamProcessing.processing,
        storage: this.streamProcessing.storage,
        analytics: this.streamProcessing.analytics
      },
      components: {
        kafka: {
          status: this.metrics.componentHealth.kafka,
          brokers: this.config.kafka?.brokers?.length || 0,
          topics: Object.keys(this.config.pipelines).length
        },
        flink: {
          status: this.metrics.componentHealth.flink,
          jobs: this.metrics.componentHealth.flink === 'healthy' ?
            this.components.flink.stats.runningJobs : 0
        },
        hudi: {
          status: this.metrics.componentHealth.hudi,
          tables: this.metrics.componentHealth.hudi === 'healthy' ?
            this.components.hudi.tables.size : 0
        },
        spark: {
          status: this.metrics.componentHealth.spark,
          applications: this.metrics.componentHealth.spark === 'healthy' ?
            this.components.spark.applications.size : 0
        }
      },
      pipelines: {
        configured: Object.keys(this.config.pipelines).length,
        enabled: Object.values(this.config.pipelines).filter(p => p.enabled).length,
        running: this.activePipelines.size,
        status: this.pipelineStates
      },
      performance: {
        totalEventsProcessed: this.metrics.totalEventsProcessed,
        eventsPerSecond: this.metrics.eventsPerSecond,
        avgLatency: this.metrics.avgLatency,
        errorRate: this.metrics.errorRate
      }
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        components: {},
        pipelines: {},
        summary: {
          healthyComponents: 0,
          totalComponents: 4,
          healthyPipelines: 0,
          totalPipelines: Object.keys(this.config.pipelines).length
        }
      };

      // 检查组件健康状态
      const componentChecks = [
        { name: 'kafka', checker: () => this.checkKafkaHealth() },
        { name: 'flink', checker: () => this.checkFlinkHealth() },
        { name: 'hudi', checker: () => this.checkHudiHealth() },
        { name: 'spark', checker: () => this.checkSparkHealth() }
      ];

      for (const check of componentChecks) {
        try {
          const componentHealth = await check.checker();
          health.components[check.name] = componentHealth;
          this.metrics.componentHealth[check.name] = componentHealth.status;

          if (componentHealth.status === 'healthy') {
            health.summary.healthyComponents++;
          }
        } catch (error) {
          health.components[check.name] = {
            status: 'unhealthy',
            error: error.message
          };
        }
      }

      // 检查管道健康状态
      for (const [pipelineName, pipelineState] of this.pipelineStates.entries()) {
        health.pipelines[pipelineName] = {
          status: pipelineState,
          running: this.activePipelines.has(pipelineName)
        };

        if (pipelineState === 'RUNNING') {
          health.summary.healthyPipelines++;
        }
      }

      // 整体健康状态
      const componentHealthRatio = health.summary.healthyComponents / health.summary.totalComponents;
      if (componentHealthRatio < 0.75 || health.summary.healthyPipelines === 0) {
        health.status = 'degraded';
      }
      if (componentHealthRatio < 0.5) {
        health.status = 'unhealthy';
      }

      return health;

    } catch (error) {
      logger.error('健康检查失败', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 私有方法

  /**
   * 检查组件健康状态
   */
  async checkComponentHealth() {
    const checks = [
      { name: 'kafka', check: () => this.checkKafkaHealth() },
      { name: 'flink', check: () => this.checkFlinkHealth() },
      { name: 'hudi', check: () => this.checkHudiHealth() },
      { name: 'spark', check: () => this.checkSparkHealth() }
    ];

    const healthStatus = {};
    for (const { name, check } of checks) {
      try {
        healthStatus[name] = await check();
      } catch (error) {
        healthStatus[name] = { status: 'unhealthy', error: error.message };
      }
    }

    return healthStatus;
  }

  /**
   * 检查Kafka健康状态
   */
  async checkKafkaHealth() {
    try {
      const stats = this.components.kafka.getPerformanceStats();
      return {
        status: stats.producer.connected ? 'healthy' : 'unhealthy',
        producer: stats.producer.connected,
        consumers: stats.consumers.length
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * 检查Flink健康状态
   */
  async checkFlinkHealth() {
    try {
      const stats = this.components.flink.getPerformanceStats();
      return {
        status: stats.jobs.running > 0 ? 'healthy' : 'unknown',
        jobs: stats.jobs
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * 检查Hudi健康状态
   */
  async checkHudiHealth() {
    try {
      const overview = this.components.hudi.getDataLakeOverview();
      return {
        status: overview.tables.count > 0 ? 'healthy' : 'unknown',
        tables: overview.tables.count
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * 检查Spark健康状态
   */
  async checkSparkHealth() {
    try {
      const stats = this.components.spark.getPerformanceStats();
      return {
        status: 'healthy',
        jobs: stats.jobs,
        applications: stats.applications
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * 初始化数据管道
   */
  async initDataPipelines() {
    const enabledPipelines = Object.entries(this.config.pipelines)
      .filter(([_, config]) => config.enabled);

    logger.info('初始化数据管道', { count: enabledPipelines.length });

    for (const [pipelineName, pipelineConfig] of enabledPipelines) {
      try {
        logger.debug('初始化管道', { pipelineName });
        // 这里只初始化，不启动
        this.pipelineStates.set(pipelineName, 'INITIALIZED');
      } catch (error) {
        logger.error('管道初始化失败', { pipelineName, error: error.message });
        this.pipelineStates.set(pipelineName, 'FAILED');
      }
    }
  }

  /**
   * 创建管道实例
   */
  async createPipelineInstance(pipelineName, pipelineConfig) {
    const pipeline = {
      name: pipelineName,
      config: pipelineConfig,
      state: 'starting',
      startTime: null,
      endTime: null,
      metrics: {
        eventsProcessed: 0,
        errors: 0,
        latency: []
      },

      async start(options = {}) {
        pipeline.state = 'starting';
        pipeline.startTime = Date.now();

        try {
          if (pipelineConfig.processing.type === 'flink') {
            // 提交Flink作业
            pipeline.flinkJobId = await this.components.flink.submitJob(pipelineName, {
              parallelism: options.parallelism || pipelineConfig.processing.parallelism
            });
          }

          pipeline.state = 'RUNNING';
          logger.info('管道实例启动', { pipelineName, flinkJobId: pipeline.flinkJobId });

        } catch (error) {
          pipeline.state = 'FAILED';
          throw error;
        }
      },

      async stop(options = {}) {
        pipeline.state = 'stopping';

        try {
          if (pipeline.flinkJobId) {
            await this.components.flink.stopJob(pipeline.flinkJobId, options);
          }

          pipeline.state = 'STOPPED';
          pipeline.endTime = Date.now();
          logger.info('管道实例停止', { pipelineName });

        } catch (error) {
          pipeline.state = 'FAILED';
          throw error;
        }
      },

      getMetrics() {
        return {
          state: pipeline.state,
          startTime: pipeline.startTime,
          endTime: pipeline.endTime,
          duration: pipeline.endTime ? pipeline.endTime - pipeline.startTime : Date.now() - pipeline.startTime,
          eventsProcessed: pipeline.metrics.eventsProcessed,
          errors: pipeline.metrics.errors,
          avgLatency: pipeline.metrics.latency.length > 0 ?
            pipeline.metrics.latency.reduce((a, b) => a + b, 0) / pipeline.metrics.latency.length : 0
        };
      }
    };

    return pipeline;
  }

  /**
   * 设置组件事件监听
   */
  setupComponentEventListeners() {
    // Kafka事件
    this.components.kafka.on('stats:updated', (stats) => {
      this.emit('kafka:stats', stats);
    });

    // Flink事件
    this.components.flink.on('stats:updated', (stats) => {
      this.emit('flink:stats', stats);
    });

    // Spark事件
    this.components.spark.on('stats:updated', (stats) => {
      this.emit('spark:stats', stats);
    });
  }

  /**
   * 启动监控任务
   */
  startMonitoringTasks() {
    if (!this.config.monitoring.enabled) return;

    // 定期收集指标
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('指标收集失败', error);
      }
    }, this.config.monitoring.metricsInterval);

    // 定期健康检查
    setInterval(async () => {
      try {
        const health = await this.healthCheck();
        if (health.status !== 'healthy') {
          this.emit('health:degraded', health);
        }
      } catch (error) {
        logger.error('健康检查失败', error);
      }
    }, 60000); // 每分钟检查一次

    // 指标报告
    setInterval(() => {
      this.emit('metrics:report', {
        streamProcessing: this.getStreamProcessingArchitecture(),
        metrics: this.metrics
      });
    }, 300000); // 每5分钟报告一次
  }

  /**
   * 收集指标
   */
  async collectMetrics() {
    try {
      // 计算事件处理速度
      this.metrics.eventsPerSecond = this.calculateEventsPerSecond();

      // 计算错误率
      this.metrics.errorRate = this.calculateErrorRate();

      // 更新管道健康状态
      this.updatePipelineHealth();

      this.emit('metrics:collected', this.metrics);

    } catch (error) {
      logger.error('指标收集失败', error);
    }
  }

  /**
   * 验证事件格式
   */
  validateEvent(event) {
    if (!event.id) {
      throw new Error('事件缺少ID字段');
    }

    if (!event.type) {
      throw new Error('事件缺少类型字段');
    }

    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
  }

  /**
   * 路由事件到管道
   */
  routeEventToPipeline(event) {
    const eventType = event.type;

    // 根据事件类型路由到相应管道
    for (const [pipelineName, pipelineConfig] of Object.entries(this.config.pipelines)) {
      if (pipelineConfig.source.topic === eventType) {
        return pipelineName;
      }
    }

    return null;
  }

  /**
   * 更新指标
   */
  updateMetrics(latency) {
    this.metrics.totalEventsProcessed++;

    // 更新平均延迟
    this.metrics.avgLatency = (this.metrics.avgLatency + latency) / 2;
  }

  /**
   * 发送到死信队列
   */
  async sendToDeadLetterQueue(event, error) {
    try {
      await this.components.kafka.sendMessages('dead-letter-queue', {
        ...event,
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        }
      }, {
        priority: 'high',
        type: 'dead_letter'
      });

      logger.warn('事件发送到死信队列', { eventId: event.id, error: error.message });

    } catch (dlqError) {
      logger.error('发送到死信队列失败', { eventId: event.id, error: dlqError.message });
    }
  }

  /**
   * 按事件类型分组
   */
  groupEventsByType(events) {
    return events.reduce((groups, event) => {
      const type = event.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(event);
      return groups;
    }, {});
  }

  /**
   * 获取事件类型对应的管道
   */
  getPipelineForEventType(eventType) {
    for (const [pipelineName, pipelineConfig] of Object.entries(this.config.pipelines)) {
      if (pipelineConfig.source.topic === eventType) {
        return pipelineName;
      }
    }
    return null;
  }

  /**
   * 验证管道配置
   */
  validatePipelineConfig(config) {
    if (!config.source) {
      throw new Error('管道配置缺少source');
    }

    if (!config.processing) {
      throw new Error('管道配置缺少processing');
    }

    if (!config.sink) {
      throw new Error('管道配置缺少sink');
    }

    if (!Array.isArray(config.sink)) {
      throw new Error('sink必须是数组');
    }
  }

  /**
   * 计算事件处理速度
   */
  calculateEventsPerSecond() {
    // 简化实现
    return Math.floor(Math.random() * 1000) + 500;
  }

  /**
   * 计算错误率
   */
  calculateErrorRate() {
    // 简化实现
    return Math.random() * 0.05;
  }

  /**
   * 更新管道健康状态
   */
  updatePipelineHealth() {
    for (const [pipelineName, pipeline] of this.activePipelines.entries()) {
      try {
        const metrics = pipeline.getMetrics();
        this.metrics.pipelineHealth[pipelineName] = {
          status: metrics.state,
          eventsProcessed: metrics.eventsProcessed,
          errors: metrics.errors,
          avgLatency: metrics.avgLatency
        };
      } catch (error) {
        this.metrics.pipelineHealth[pipelineName] = {
          status: 'unknown',
          error: error.message
        };
      }
    }
  }

  /**
   * 获取管道状态
   */
  getPipelineStatus() {
    return Object.fromEntries(this.pipelineStates.entries());
  }

  /**
   * 获取组件状态
   */
  getComponentStatus() {
    return this.metrics.componentHealth;
  }

  /**
   * 获取管道指标
   */
  getPipelineMetrics() {
    const metrics = {};
    for (const [pipelineName, pipeline] of this.activePipelines.entries()) {
      try {
        metrics[pipelineName] = pipeline.getMetrics();
      } catch (error) {
        metrics[pipelineName] = { status: 'error', error: error.message };
      }
    }
    return metrics;
  }

  /**
   * 查询村庄概览指标
   */
  async queryVillageOverview(filters) {
    return this.components.spark.executeSQL(`
      SELECT
        COUNT(DISTINCT village_id) as total_villages,
        COUNT(DISTINCT user_id) as total_users,
        COUNT(*) as total_events
      FROM village_events
      WHERE timestamp >= ${filters.startTime || Date.now() - 3600000}
      AND timestamp <= ${filters.endTime || Date.now()}
    `);
  }

  /**
   * 查询用户活动指标
   */
  async queryUserActivity(filters) {
    return this.components.spark.executeSQL(`
      SELECT
        action_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_behavior
      WHERE timestamp >= ${filters.startTime || Date.now() - 3600000}
      AND timestamp <= ${filters.endTime || Date.now()}
      GROUP BY action_type
    `);
  }

  /**
   * 查询系统性能指标
   */
  async querySystemPerformance(filters) {
    return {
      kafka: await this.components.kafka.getPerformanceStats(),
      flink: await this.components.flink.getPerformanceStats(),
      hudi: await this.components.hudi.getDataLakeOverview(),
      spark: await this.components.spark.getPerformanceStats()
    };
  }

  /**
   * 查询紧急事件指标
   */
  async queryEmergencyEvents(filters) {
    return this.components.spark.executeSQL(`
      SELECT
        severity,
        COUNT(*) as count,
        COUNT(DISTINCT village_id) as affected_villages
      FROM village_events
      WHERE severity IN ('critical', 'high')
      AND timestamp >= ${filters.startTime || Date.now() - 3600000}
      AND timestamp <= ${filters.endTime || Date.now()}
      GROUP BY severity
    `);
  }

  /**
   * 查询IoT传感器指标
   */
  async queryIotSensors(filters) {
    return this.components.spark.executeSQL(`
      SELECT
        sensor_type,
        AVG(value) as avg_value,
        MAX(value) as max_value,
        MIN(value) as min_value,
        COUNT(*) as readings
      FROM iot_sensor_data
      WHERE timestamp >= ${filters.startTime || Date.now() - 3600000}
      AND timestamp <= ${filters.endTime || Date.now()}
      GROUP BY sensor_type
    `);
  }

  /**
   * 关闭实时数据管理器
   */
  async shutdown() {
    try {
      logger.info('关闭实时数据管理器');

      // 停止所有管道
      const stopPromises = Array.from(this.activePipelines.entries()).map(
        async ([name, pipeline]) => {
          try {
            await this.stopPipeline(name);
          } catch (error) {
            logger.error('停止管道失败', { name, error: error.message });
          }
        }
      );
      await Promise.allSettled(stopPromises);

      // 关闭组件
      await this.components.kafka.shutdown();
      await this.components.flink.shutdown();
      await this.components.hudi.shutdown();
      await this.components.spark.shutdown();

      // 清理资源
      this.activePipelines.clear();
      this.pipelineStates.clear();

      logger.info('实时数据管理器已关闭');

    } catch (error) {
      logger.error('关闭实时数据管理器失败', error);
    }
  }
}

// 单例模式
const realtimeDataManager = new RealtimeDataManager();

module.exports = realtimeDataManager;