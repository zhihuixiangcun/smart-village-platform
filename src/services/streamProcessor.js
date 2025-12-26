/**
 * 流式数据处理器
 * 处理各种类型的实时数据流
 */

const EventEmitter = require('events');
const realtimeEngine = require('./realtimeEngine');
const logger = require('../utils/logger');

class StreamProcessor extends EventEmitter {
  constructor() {
    super();

    this.processors = new Map();
    this.aggregations = new Map();
    this.filters = new Map();
    this.transforms = new Map();

    this.initDefaultProcessors();
  }

  /**
   * 注册数据处理器
   */
  registerProcessor(dataType, processor) {
    this.processors.set(dataType, processor);
    logger.debug(`📝 注册流处理器: ${dataType}`);
  }

  /**
   * 注册数据聚合器
   */
  registerAggregator(aggregationName, aggregator) {
    this.aggregations.set(aggregationName, aggregator);
    logger.debug(`📊 注册聚合器: ${aggregationName}`);
  }

  /**
   * 注册数据过滤器
   */
  registerFilter(filterName, filter) {
    this.filters.set(filterName, filter);
    logger.debug(`🔍 注册过滤器: ${filterName}`);
  }

  /**
   * 注册数据转换器
   */
  registerTransformer(transformerName, transformer) {
    this.transforms.set(transformerName, transformer);
    logger.debug(`🔄 注册转换器: ${transformerName}`);
  }

  /**
   * 处理流数据
   */
  async processData(dataType, data, options = {}) {
    try {
      let processedData = { ...data };

      // 1. 应用过滤器
      if (options.filters) {
        for (const filterName of options.filters) {
          const filter = this.filters.get(filterName);
          if (filter) {
            const result = await filter(processedData);
            if (result === false) {
              // 过滤器拒绝了数据
              return null;
            }
            if (result !== true) {
              processedData = result;
            }
          }
        }
      }

      // 2. 应用转换器
      if (options.transforms) {
        for (const transformerName of options.transforms) {
          const transformer = this.transforms.get(transformerName);
          if (transformer) {
            processedData = await transformer(processedData);
          }
        }
      }

      // 3. 应用处理器
      const processor = this.processors.get(dataType);
      if (processor) {
        const result = await processor(processedData);
        if (result) {
          processedData = { ...processedData, ...result };
        }
      }

      // 4. 应用聚合器
      if (options.aggregations) {
        for (const aggregationName of options.aggregations) {
          const aggregator = this.aggregations.get(aggregationName);
          if (aggregator) {
            await aggregator(processedData);
          }
        }
      }

      // 5. 发送到实时引擎
      if (options.sendToEngine !== false) {
        await realtimeEngine.addStreamData(dataType, processedData);
      }

      // 触发处理完成事件
      this.emit('dataProcessed', {
        dataType,
        originalData: data,
        processedData,
        options
      });

      return processedData;

    } catch (error) {
      logger.error('流数据处理失败:', error);
      this.emit('processingError', { error, dataType, data, options });
      throw error;
    }
  }

  /**
   * 批量处理数据
   */
  async processBatch(dataList, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 100;

    for (let i = 0; i < dataList.length; i += batchSize) {
      const batch = dataList.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(item =>
          this.processData(item.type, item.data, { ...options, sendToEngine: false })
            .catch(error => ({ error, item }))
        )
      );

      // 过滤掉处理失败的数据
      const validResults = batchResults.filter(result => !result.error);

      // 批量发送到实时引擎
      if (validResults.length > 0 && options.sendToEngine !== false) {
        await Promise.all(
          validResults.map(result =>
            realtimeEngine.addStreamData(result.type, result)
          )
        );
      }

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 创建数据流
   */
  createStream(streamId, options = {}) {
    return new DataStream(streamId, this, options);
  }

  /**
   * 初始化默认处理器
   */
  initDefaultProcessors() {
    // 村民行为数据处理器
    this.registerProcessor('behavior', async (data) => {
      const processed = {
        ...data,
        processedAt: Date.now(),
        sessionMetrics: this.calculateSessionMetrics(data),
        engagementLevel: this.calculateEngagementLevel(data)
      };

      return processed;
    });

    // 财务数据处理器
    this.registerProcessor('finance', async (data) => {
      const processed = {
        ...data,
        processedAt: Date.now(),
        financialMetrics: this.calculateFinancialMetrics(data),
        riskScore: this.calculateFinancialRisk(data),
        categoryLevel: this.categorizeTransaction(data)
      };

      return processed;
    });

    // 应急事件处理器
    this.registerProcessor('emergency', async (data) => {
      const processed = {
        ...data,
        processedAt: Date.now(),
        severityLevel: this.calculateSeverity(data),
        urgencyScore: this.calculateUrgency(data),
        responseRequired: this.determineResponseRequired(data)
      };

      return processed;
    });

    // 系统性能数据处理器
    this.registerProcessor('system', async (data) => {
      const processed = {
        ...data,
        processedAt: Date.now(),
        performanceLevel: this.calculatePerformanceLevel(data),
        resourceUtilization: this.calculateResourceUtilization(data)
      };

      return processed;
    });

    // 注册默认过滤器
    this.registerFilter('dataValidation', async (data) => {
      // 数据验证过滤器
      if (!data || typeof data !== 'object') {
        return false;
      }

      // 检查必需字段
      if (!data.timestamp) {
        data.timestamp = Date.now();
      }

      return true;
    });

    this.registerFilter('duplicateFilter', async (data) => {
      // 去重过滤器
      const key = `${data.type}_${data.residentId}_${data.action}_${Math.floor(data.timestamp / 60000)}`;
      // 这里可以使用Redis来存储去重状态
      return true; // 暂时返回true
    });

    // 注册默认转换器
    this.registerTransformer('geoCoder', async (data) => {
      // 地理位置编码转换器
      if (data.location && data.location.coordinates) {
        data.geocoded = {
          address: await this.reverseGeocode(data.location.coordinates),
          district: await this.getDistrict(data.location.coordinates),
          weather: await this.getWeather(data.location.coordinates)
        };
      }
      return data;
    });

    this.registerTransformer('timeSeries', async (data) => {
      // 时间序列转换器
      const timestamp = new Date(data.timestamp);
      data.timeSeries = {
        timestamp: timestamp.getTime(),
        hour: timestamp.getHours(),
        dayOfWeek: timestamp.getDay(),
        month: timestamp.getMonth(),
        year: timestamp.getFullYear(),
        isWeekend: timestamp.getDay() === 0 || timestamp.getDay() === 6,
        isBusinessHours: timestamp.getHours() >= 9 && timestamp.getHours() <= 17
      };
      return data;
    });

    // 注册默认聚合器
    this.registerAggregator('hourlyActivity', async (data) => {
      // 小时活动聚合
      const hour = new Date(data.timestamp).getHours();
      const key = `hourly_activity_${hour}`;

      // 这里可以使用Redis来维护聚合状态
      logger.debug(`📊 聚合小时活动: ${hour}`);
    });

    this.registerAggregator('dailySummary', async (data) => {
      // 日度汇总聚合
      const date = new Date(data.timestamp).toISOString().split('T')[0];
      const key = `daily_summary_${date}`;

      logger.debug(`📊 聚合日度汇总: ${date}`);
    });

    this.registerAggregator('userProfile', async (data) => {
      // 用户画像聚合
      if (data.residentId) {
        const key = `user_profile_${data.residentId}`;

        // 更新用户画像数据
        logger.debug(`👤 聚合用户画像: ${data.residentId}`);
      }
    });
  }

  // 辅助方法

  calculateSessionMetrics(data) {
    return {
      sessionDuration: data.sessionInfo?.sessionDuration || 0,
      pagesViewed: data.sessionInfo?.pagesViewed || 0,
      actionsInSession: data.sessionInfo?.actionsInSession || 0,
      deviceUsage: data.metadata?.device?.type || 'unknown'
    };
  }

  calculateEngagementLevel(data) {
    let score = 0;

    // 根据行为类型计算参与度
    const highEngagementActions = ['vote_participate', 'help_provide', 'announcement_create'];
    const mediumEngagementActions = ['comment_post', 'suggestion_submit', 'document_apply'];

    if (highEngagementActions.includes(data.action)) {
      score += 3;
    } else if (mediumEngagementActions.includes(data.action)) {
      score += 2;
    } else {
      score += 1;
    }

    // 根据操作时长调整
    if (data.context?.duration > 5000) {
      score += 1;
    }

    return {
      level: score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low',
      score
    };
  }

  calculateFinancialMetrics(data) {
    return {
      amountRange: this.getAmountRange(data.amount),
      transactionCategory: this.getTransactionCategory(data.category),
      frequency: this.getTransactionFrequency(data),
      riskIndicator: this.getFinancialRiskIndicator(data)
    };
  }

  calculateFinancialRisk(data) {
    let riskScore = 0;

    // 基于金额的风险评估
    if (data.amount > 100000) {
      riskScore += 3;
    } else if (data.amount > 50000) {
      riskScore += 2;
    } else if (data.amount > 10000) {
      riskScore += 1;
    }

    // 基于交易类型的风险评估
    const highRiskTypes = ['cash_withdrawal', 'large_transfer'];
    if (highRiskTypes.includes(data.action)) {
      riskScore += 2;
    }

    return {
      score: Math.min(riskScore, 5),
      level: riskScore >= 3 ? 'high' : riskScore >= 2 ? 'medium' : 'low'
    };
  }

  categorizeTransaction(data) {
    const categories = {
      '日常收支': 'routine',
      '基础设施': 'infrastructure',
      '福利补贴': 'benefit',
      '应急支出': 'emergency',
      '大额支出': 'major'
    };

    // 基于金额和类型分类
    if (data.amount > 50000) {
      return categories['大额支出'];
    } else if (data.category?.includes('福利') || data.category?.includes('补贴')) {
      return categories['福利补贴'];
    } else if (data.category?.includes('应急') || data.category?.includes('紧急')) {
      return categories['应急支出'];
    } else {
      return categories['日常收支'];
    }
  }

  calculateSeverity(data) {
    let severity = 'normal';

    if (data.metadata?.severity === 'critical') {
      severity = 'critical';
    } else if (data.metadata?.severity === 'high') {
      severity = 'high';
    } else if (data.metadata?.severity === 'medium') {
      severity = 'medium';
    }

    // 基于影响人数调整
    if (data.context?.casualties > 0) {
      severity = 'critical';
    } else if (data.context?.damages && data.context.damages > 10000) {
      severity = 'high';
    }

    return severity;
  }

  calculateUrgency(data) {
    let urgencyScore = 1;

    // 基于事件类型
    const urgentEvents = ['fire', 'drowning', 'medical_emergency'];
    if (urgentEvents.some(event => data.action?.includes(event))) {
      urgencyScore = 5;
    } else if (data.action?.includes('accident')) {
      urgencyScore = 4;
    } else if (data.action?.includes('distress')) {
      urgencyScore = 3;
    }

    // 基于时间因素
    const hour = new Date(data.timestamp).getHours();
    if (hour < 6 || hour > 22) {
      urgencyScore += 1;
    }

    return urgencyScore;
  }

  determineResponseRequired(data) {
    return {
      immediate: data.metadata?.severity === 'critical',
      within_5min: data.metadata?.severity === 'high',
      within_30min: data.metadata?.severity === 'medium',
      within_2hour: data.metadata?.severity === 'low',
      escalated: data.context?.casualties > 0
    };
  }

  calculatePerformanceLevel(data) {
    const { cpu, memory, responseTime, errorRate } = data.metrics || {};

    let level = 'good';

    if (errorRate > 0.1 || cpu > 0.8 || memory > 0.8 || responseTime > 5000) {
      level = 'critical';
    } else if (errorRate > 0.05 || cpu > 0.6 || memory > 0.6 || responseTime > 2000) {
      level = 'warning';
    } else if (cpu > 0.4 || memory > 0.4 || responseTime > 1000) {
      level = 'degraded';
    }

    return level;
  }

  calculateResourceUtilization(data) {
    const { cpu = 0, memory = 0, disk = 0, network = 0 } = data.metrics || {};

    return {
      cpu: Math.round(cpu * 100),
      memory: Math.round(memory * 100),
      disk: Math.round(disk * 100),
      network: Math.round(network * 100),
      overall: Math.round(((cpu + memory + disk + network) / 4) * 100)
    };
  }

  getAmountRange(amount) {
    if (amount < 100) return 'small';
    if (amount < 1000) return 'medium';
    if (amount < 10000) return 'large';
    return 'very_large';
  }

  getTransactionCategory(category) {
    return category || 'other';
  }

  getTransactionFrequency(data) {
    // 这里可以基于历史数据计算频率
    return 'unknown';
  }

  getFinancialRiskIndicator(data) {
    // 基于多个因素的风险指标
    return 'low';
  }

  async reverseGeocode(coordinates) {
    // 模拟反向地理编码
    return '测试地址';
  }

  async getDistrict(coordinates) {
    // 模拟获取行政区信息
    return '测试区';
  }

  async getWeather(coordinates) {
    // 模拟获取天气信息
    return {
      temperature: 25,
      humidity: 60,
      condition: 'sunny'
    };
  }
}

/**
 * 数据流类
 */
class DataStream extends EventEmitter {
  constructor(streamId, processor, options = {}) {
    super();

    this.streamId = streamId;
    this.processor = processor;
    this.options = {
      bufferSize: options.bufferSize || 1000,
      flushInterval: options.flushInterval || 1000,
      batchSize: options.batchSize || 100,
      ...options
    };

    this.buffer = [];
    this.isRunning = false;
    this.processedCount = 0;
    this.errorCount = 0;

    this.stats = {
      processedCount: 0,
      errorCount: 0,
      averageLatency: 0,
      throughput: 0
    };

    this.startProcessingLoop();
  }

  /**
   * 添加数据到流
   */
  async add(dataType, data) {
    if (this.buffer.length >= this.options.bufferSize) {
      throw new Error('Stream buffer overflow');
    }

    const startTime = Date.now();
    this.buffer.push({ dataType, data, startTime });

    if (this.options.autoFlush) {
      await this.flush();
    }
  }

  /**
   * 刷新缓冲区
   */
  async flush() {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.options.batchSize);
    const startTime = Date.now();

    try {
      await this.processor.processBatch(batch.map(item => ({
        type: item.dataType,
        data: item.data
      })), this.options);

      // 更新统计信息
      const latency = Date.now() - startTime;
      batch.forEach(item => {
        this.stats.processedCount++;
        this.stats.averageLatency =
          (this.stats.averageLatency * (this.stats.processedCount - 1) + latency) / this.stats.processedCount;
      });

      this.emit('flushed', { count: batch.length, latency });

    } catch (error) {
      this.stats.errorCount += batch.length;
      this.emit('error', { error, batch });
    }
  }

  /**
   * 启动处理循环
   */
  startProcessingLoop() {
    this.isRunning = true;

    const loop = async () => {
      while (this.isRunning) {
        try {
          await this.flush();
          await this.sleep(this.options.flushInterval);
        } catch (error) {
          logger.error(`流处理错误 ${this.streamId}:`, error);
          await this.sleep(1000);
        }
      }
    };

    loop();
  }

  /**
   * 停止流
   */
  stop() {
    this.isRunning = false;
    return this.flush();
  }

  /**
   * 获取流统计
   */
  getStats() {
    return {
      streamId: this.streamId,
      isRunning: this.isRunning,
      bufferSize: this.buffer.length,
      maxBufferSize: this.options.bufferSize,
      ...this.stats
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = StreamProcessor;