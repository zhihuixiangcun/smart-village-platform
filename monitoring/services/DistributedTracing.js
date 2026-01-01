/**
 * 分布式链路追踪服务
 * 负责智慧乡村平台的请求链路追踪、性能分析和问题定位
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const logger = require('./../../src/services/performanceMonitor').logger;

class DistributedTracing extends EventEmitter {
  constructor() {
    super();
    this.spans = new Map();
    this.traces = new Map();
    this.isRunning = false;
    this.samplingRate = 0.1; // 10% 采样率

    // 链路追踪配置
    this.config = {
      serviceName: 'smart-village',
      serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      maxSpansPerTrace: 1000,
      traceTimeout: 300000, // 5分钟
      batchSize: 100,
      flushInterval: 5000 // 5秒
    };

    // Jaeger配置
    this.jaegerConfig = {
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
      agentPort: parseInt(process.env.JAEGER_AGENT_PORT) || 6831
    };
  }

  /**
   * 启动链路追踪服务
   */
  async start() {
    if (this.isRunning) {
      logger.warn('链路追踪服务已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('启动分布式链路追踪服务');

    // 启动定期刷新
    this.startPeriodicFlush();

    // 启动清理过期数据
    this.startCleanup();

    logger.info('链路追踪服务启动成功', {
      serviceName: this.config.serviceName,
      samplingRate: this.samplingRate,
      jaegerEndpoint: this.jaegerConfig.endpoint
    });
  }

  /**
   * 停止链路追踪服务
   */
  async stop() {
    this.isRunning = false;

    // 刷新所有待发送的链路
    await this.flushAll();

    logger.info('链路追踪服务已停止');
  }

  /**
   * 创建或获取链路
   */
  getOrCreateTrace(traceId, options = {}) {
    if (!traceId) {
      traceId = this.generateTraceId();
    }

    let trace = this.traces.get(traceId);
    if (!trace) {
      trace = {
        traceId,
        spans: [],
        startTime: options.startTime || Date.now(),
        tags: {
          'service.name': this.config.serviceName,
          'service.version': this.config.serviceVersion,
          'environment': this.config.environment,
          ...options.tags
        },
        process: {
          serviceName: this.config.serviceName,
          tags: {
            'hostname': require('os').hostname(),
            'pid': process.pid
          }
        }
      };
      this.traces.set(traceId, trace);
    }

    return trace;
  }

  /**
   * 创建Span
   */
  createSpan(operationName, options = {}) {
    const traceId = options.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const parentSpanId = options.parentSpanId;

    const trace = this.getOrCreateTrace(traceId, {
      tags: options.traceTags
    });

    const span = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: options.startTime || Date.now(),
      duration: 0,
      tags: {
        'span.kind': options.kind || 'server',
        'component': options.component || 'unknown',
        ...options.tags
      },
      logs: [],
      status: {
        code: options.status?.code || 0,
        message: options.status?.message || 'OK'
      },
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion
    };

    // 添加到链路
    trace.spans.push(span);
    this.spans.set(spanId, span);

    // 检查链路长度限制
    if (trace.spans.length > this.config.maxSpansPerTrace) {
      logger.warn(`链路 ${traceId} 超过最大Span数量限制`);
      this.finishTrace(traceId);
    }

    return {
      spanId,
      traceId,
      finish: (finishOptions = {}) => this.finishSpan(spanId, finishOptions),
      setTag: (key, value) => this.setTag(spanId, key, value),
      setTags: (tags) => this.setTags(spanId, tags),
      log: (fields, timestamp) => this.logSpan(spanId, fields, timestamp),
      setError: (error) => this.setError(spanId, error),
      getContext: () => ({
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId
      })
    };
  }

  /**
   * 完成Span
   */
  finishSpan(spanId, options = {}) {
    const span = this.spans.get(spanId);
    if (!span) {
      logger.warn(`Span不存在: ${spanId}`);
      return;
    }

    span.endTime = options.endTime || Date.now();
    span.duration = span.endTime - span.startTime;

    if (options.status) {
      span.status = { ...span.status, ...options.status };
    }

    if (options.tags) {
      span.tags = { ...span.tags, ...options.tags };
    }

    // 发出完成事件
    this.emit('span_finished', span);

    // 检查是否完成整个链路
    this.checkTraceCompletion(span.traceId);
  }

  /**
   * 设置Span标签
   */
  setTag(spanId, key, value) {
    const span = this.spans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * 设置多个Span标签
   */
  setTags(spanId, tags) {
    const span = this.spans.get(spanId);
    if (span) {
      Object.assign(span.tags, tags);
    }
  }

  /**
   * 记录Span日志
   */
  logSpan(spanId, fields, timestamp) {
    const span = this.spans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: timestamp || Date.now(),
        fields
      });
    }
  }

  /**
   * 设置Span错误
   */
  setError(spanId, error) {
    const span = this.spans.get(spanId);
    if (span) {
      span.status = {
        code: 1,
        message: error.message || 'Unknown error'
      };
      span.tags['error'] = true;
      span.tags['error.message'] = error.message;
      if (error.stack) {
        span.tags['error.stack'] = error.stack;
      }
    }
  }

  /**
   * 创建HTTP请求Span
   */
  createHttpSpan(req, res, options = {}) {
    const operationName = `${req.method} ${req.route?.path || req.path}`;
    const span = this.createSpan(operationName, {
      kind: 'server',
      component: 'http',
      tags: {
        'http.method': req.method,
        'http.url': req.url,
        'http.host': req.headers.host,
        'http.user_agent': req.headers['user-agent'],
        'http.remote_addr': req.ip || req.connection.remoteAddress,
        'http.version': req.httpVersion,
        ...options.tags
      }
    });

    // 记录请求开始
    this.logSpan(span.spanId, {
      event: 'request_started',
      message: 'HTTP请求开始'
    });

    // 监听响应完成
    res.on('finish', () => {
      span.setTag('http.status_code', res.statusCode);

      if (res.statusCode >= 400) {
        span.setTag('error', true);
        span.setStatus({
          code: 1,
          message: `HTTP ${res.statusCode}`
        });
      }

      this.logSpan(span.spanId, {
        event: 'request_completed',
        message: 'HTTP请求完成',
        'http.status_code': res.statusCode
      });

      span.finish();
    });

    return span;
  }

  /**
   * 创建数据库查询Span
   */
  createDbSpan(operation, collection, query = {}, options = {}) {
    const operationName = `db.${collection}.${operation}`;
    const span = this.createSpan(operationName, {
      kind: 'client',
      component: 'database',
      tags: {
        'db.system': 'mongodb',
        'db.operation': operation,
        'db.collection': collection,
        'db.query_size': JSON.stringify(query).length,
        ...options.tags
      }
    });

    this.logSpan(span.spanId, {
      event: 'db_query_started',
      message: '数据库查询开始'
    });

    return span;
  }

  /**
   * 创建消息队列Span
   */
  createMessageSpan(operation, queue, message = {}, options = {}) {
    const operationName = `mq.${queue}.${operation}`;
    const span = this.createSpan(operationName, {
      kind: 'client',
      component: 'message_queue',
      tags: {
        'mq.system': 'rabbitmq',
        'mq.operation': operation,
        'mq.queue': queue,
        'mq.message_size': JSON.stringify(message).length,
        ...options.tags
      }
    });

    this.logSpan(span.spanId, {
      event: 'mq_operation_started',
      message: '消息队列操作开始'
    });

    return span;
  }

  /**
   * 创建缓存Span
   */
  createCacheSpan(operation, key, options = {}) {
    const operationName = `cache.${operation}`;
    const span = this.createSpan(operationName, {
      kind: 'client',
      component: 'cache',
      tags: {
        'cache.system': 'redis',
        'cache.operation': operation,
        'cache.key': key,
        ...options.tags
      }
    });

    this.logSpan(span.spanId, {
      event: 'cache_operation_started',
      message: '缓存操作开始'
    });

    return span;
  }

  /**
   * 获取链路上下文
   */
  getTraceContext(req) {
    // 从HTTP头获取链路上下文
    const traceId = req.headers['x-trace-id'] || req.headers['uber-trace-id'];
    const parentSpanId = req.headers['x-parent-span-id'] || req.headers['uber-trace-id'];
    const spanId = req.headers['x-span-id'];

    return {
      traceId: traceId || this.generateTraceId(),
      parentSpanId,
      spanId,
      sampled: this.shouldSample()
    };
  }

  /**
   * 注入链路上下文到HTTP头
   */
  injectTraceContext(headers, traceContext) {
    headers['x-trace-id'] = traceContext.traceId;
    if (traceContext.spanId) {
      headers['x-span-id'] = traceContext.spanId;
    }
    if (traceContext.parentSpanId) {
      headers['x-parent-span-id'] = traceContext.parentSpanId;
    }
    headers['x-sampled'] = traceContext.sampled ? '1' : '0';
  }

  /**
   * 检查链路是否完成
   */
  checkTraceCompletion(traceId) {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    // 检查是否所有Span都已完成
    const unfinishedSpans = trace.spans.filter(span => !span.endTime);
    if (unfinishedSpans.length === 0) {
      this.finishTrace(traceId);
    }

    // 检查超时
    if (Date.now() - trace.startTime > this.config.traceTimeout) {
      logger.warn(`链路 ${traceId} 超时，强制完成`);
      this.finishTrace(traceId);
    }
  }

  /**
   * 完成链路
   */
  finishTrace(traceId) {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;

    // 发出链路完成事件
    this.emit('trace_finished', trace);

    // 发送到追踪系统
    this.sendTrace(trace);

    // 移除内存中的链路
    this.traces.delete(traceId);

    logger.debug(`链路完成: ${traceId}, 持续时间: ${trace.duration}ms`);
  }

  /**
   * 发送链路数据到Jaeger
   */
  async sendTrace(trace) {
    try {
      const jaegerTrace = this.convertToJaegerFormat(trace);

      // 发送HTTP请求到Jaeger Collector
      const response = await fetch(this.jaegerConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jaegerTrace)
      });

      if (!response.ok) {
        throw new Error(`Jaeger API响应错误: ${response.status} ${response.statusText}`);
      }

      logger.debug(`链路数据发送成功: ${trace.traceId}`);
    } catch (error) {
      logger.error(`发送链路数据到Jaeger失败: ${error.message}`);
    }
  }

  /**
   * 转换为Jaeger格式
   */
  convertToJaegerFormat(trace) {
    return {
      data: [{
        traceID: trace.traceId.replace(/-/g, ''),
        spans: trace.spans.map(span => ({
          traceID: span.traceId.replace(/-/g, ''),
          spanID: span.spanId.replace(/-/g, ''),
          parentSpanID: span.parentSpanId?.replace(/-/g, '') || '0',
          operationName: span.operationName,
          startTime: span.startTime * 1000, // 转换为微秒
          duration: span.duration * 1000, // 转换为微秒
          tags: Object.entries(span.tags).map(([key, value]) => ({
            key,
            value: value.toString(),
            type: typeof value === 'boolean' ? 'bool' : 'string'
          })),
          logs: span.logs.map(log => ({
            timestamp: log.timestamp * 1000, // 转换为微秒
            fields: Object.entries(log.fields).map(([key, value]) => ({
              key,
              value: value.toString()
            }))
          })),
          status: span.status,
          process: trace.process
        }))
      }]
    };
  }

  /**
   * 启动定期刷新
   */
  startPeriodicFlush() {
    setInterval(() => {
      if (this.isRunning) {
        this.flushAll();
      }
    }, this.config.flushInterval);
  }

  /**
   * 刷新所有待发送的链路
   */
  async flushAll() {
    // 这里可以实现批量发送逻辑
    // 当前实现为实时发送，此函数为扩展预留
  }

  /**
   * 启动清理过期数据
   */
  startCleanup() {
    setInterval(() => {
      if (this.isRunning) {
        this.cleanupExpiredTraces();
      }
    }, 60000); // 1分钟清理一次
  }

  /**
   * 清理过期链路
   */
  cleanupExpiredTraces() {
    const now = Date.now();
    const timeout = this.config.traceTimeout;

    for (const [traceId, trace] of this.traces) {
      if (now - trace.startTime > timeout) {
        logger.warn(`清理过期链路: ${traceId}`);
        this.finishTrace(traceId);
      }
    }
  }

  /**
   * 生成链路ID
   */
  generateTraceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 生成Span ID
   */
  generateSpanId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * 决定是否采样
   */
  shouldSample() {
    return Math.random() < this.samplingRate;
  }

  /**
   * 设置采样率
   */
  setSamplingRate(rate) {
    if (rate >= 0 && rate <= 1) {
      this.samplingRate = rate;
      logger.info(`采样率已更新: ${rate}`);
    }
  }

  /**
   * 获取链路统计信息
   */
  getTraceStats() {
    const stats = {
      activeTraces: this.traces.size,
      activeSpans: this.spans.size,
      samplingRate: this.samplingRate,
      config: this.config
    };

    // 计算平均Span数量
    if (this.traces.size > 0) {
      const totalSpans = Array.from(this.traces.values())
        .reduce((sum, trace) => sum + trace.spans.length, 0);
      stats.averageSpansPerTrace = Math.round(totalSpans / this.traces.size);
    }

    return stats;
  }

  /**
   * 获取活跃链路
   */
  getActiveTraces() {
    return Array.from(this.traces.values()).map(trace => ({
      traceId: trace.traceId,
      startTime: trace.startTime,
      duration: Date.now() - trace.startTime,
      spanCount: trace.spans.length,
      serviceName: trace.process.serviceName
    }));
  }

  /**
   * 创建中间件
   */
  middleware() {
    return (req, res, next) => {
      // 获取或创建链路上下文
      const traceContext = this.getTraceContext(req);

      // 决定是否追踪
      if (!traceContext.sampled) {
        return next();
      }

      // 创建HTTP Span
      const span = this.createHttpSpan(req, res, {
        traceId: traceContext.traceId,
        parentSpanId: traceContext.parentSpanId
      });

      // 将链路上下文注入到请求对象
      req.traceContext = {
        ...traceContext,
        span: span
      };

      // 注入响应头
      this.injectTraceContext(res.headers, {
        traceId: traceContext.traceId,
        spanId: span.spanId,
        sampled: true
      });

      next();
    };
  }

  /**
   * 创建包装函数
   */
  wrapFunction(fn, options = {}) {
    return (...args) => {
      const operationName = options.operationName || fn.name || 'anonymous';
      const span = this.createSpan(operationName, {
        kind: 'internal',
        component: 'function',
        ...options
      });

      try {
        const result = fn.apply(this, args);

        // 处理Promise
        if (result && typeof result.then === 'function') {
          return result
            .then(value => {
              span.finish();
              return value;
            })
            .catch(error => {
              span.setError(error);
              span.finish();
              throw error;
            });
        }

        // 同步函数
        span.finish();
        return result;
      } catch (error) {
        span.setError(error);
        span.finish();
        throw error;
      }
    };
  }
}

module.exports = DistributedTracing;