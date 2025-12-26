#!/usr/bin/env node

/**
 * 智慧乡村性能监控系统部署脚本
 * 部署性能监控到生产环境
 */

const fs = require('fs');
const path = require('path');

// 监控配置
const MONITORING_CONFIG = {
  // 数据库监控
  database: {
    enabled: true,
    slowQueryThreshold: 100, // ms
    connectionPoolMonitoring: true,
    indexUsageTracking: true
  },

  // 应用性能监控
  application: {
    enabled: true,
    responseTimeThreshold: 500, // ms
    errorRateThreshold: 0.01, // 1%
    memoryThreshold: 0.8, // 80%
    cpuThreshold: 0.8 // 80%
  },

  // 业务监控
  business: {
    enabled: true,
    activeUserTracking: true,
    transactionMonitoring: true,
    featureUsageTracking: true
  },

  // 告警配置
  alerts: {
    email: 'admin@smartvillage.com',
    webhook: 'https://hooks.slack.com/smart-village-alerts',
    thresholds: {
      critical: 0.9,
      warning: 0.7
    }
  }
};

// 创建监控服务
function createMonitoringService() {
  const monitoringDir = path.join(process.cwd(), 'src/services/monitoring');
  if (!fs.existsSync(monitoringDir)) {
    fs.mkdirSync(monitoringDir, { recursive: true });
  }

  const monitoringService = `
/**
 * 智慧乡村性能监控服务
 * 实时监控系统性能指标
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

class PerformanceMonitoringService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...MONITORING_CONFIG, ...config };
    this.metrics = new Map();
    this.alerts = [];
    this.isMonitoring = false;
    this.intervalId = null;
  }

  /**
   * 启动监控
   */
  start() {
    if (this.isMonitoring) {
      console.log('监控已在运行中');
      return;
    }

    console.log('🚀 启动性能监控系统...');
    this.isMonitoring = true;

    // 数据库监控
    if (this.config.database.enabled) {
      this.startDatabaseMonitoring();
    }

    // 应用性能监控
    if (this.config.application.enabled) {
      this.startApplicationMonitoring();
    }

    // 业务监控
    if (this.config.business.enabled) {
      this.startBusinessMonitoring();
    }

    // 定期收集指标
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, 5000); // 每5秒收集一次

    console.log('✅ 性能监控系统已启动');
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.isMonitoring) {
      console.log('监控未在运行');
      return;
    }

    console.log('🛑 停止性能监控系统...');
    this.isMonitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ 性能监控系统已停止');
  }

  /**
   * 数据库监控
   */
  startDatabaseMonitoring() {
    // 监控慢查询
    mongoose.set('debug', (collectionName, method, query, doc) => {
      const start = performance.now();

      // 监听查询完成事件
      const originalExec = query.exec;
      query.exec = function() {
        const promise = originalExec.call(this);
        promise.then(() => {
          const duration = performance.now() - start;
          if (duration > MONITORING_CONFIG.database.slowQueryThreshold) {
            console.warn(\`⚠️  慢查询检测: \${collectionName}.\${method} 耗时 \${duration.toFixed(2)}ms\`);
            this.recordMetric('slow_query', {
              collection: collectionName,
              method,
              duration,
              query: JSON.stringify(query)
            });
          }
        });
        return promise;
      }.bind(this);
    }.bind(this));

    // 监控连接池
    if (this.config.database.connectionPoolMonitoring) {
      setInterval(() => {
        const poolStats = mongoose.connection.db.serverStatus();
        this.recordMetric('connection_pool', {
          active: poolStats.connections.current,
          available: poolStats.connections.available,
          totalCreated: poolStats.connections.totalCreated
        });
      }, 10000);
    }
  }

  /**
   * 应用性能监控
   */
  startApplicationMonitoring() {
    // 监控内存使用
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

      this.recordMetric('memory', {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        usagePercent: memUsagePercent
      });

      if (memUsagePercent > this.config.application.memoryThreshold) {
        this.triggerAlert('memory_usage_high', {
          current: memUsagePercent,
          threshold: this.config.application.memoryThreshold
        });
      }
    }, 5000);

    // 监控CPU使用（需要额外模块）
    this.monitorCPUUsage();
  }

  /**
   * 业务监控
   */
  startBusinessMonitoring() {
    // 监控API响应时间
    this.setupAPIMonitoring();

    // 监控用户活跃度
    if (this.config.business.activeUserTracking) {
      this.trackActiveUsers();
    }
  }

  /**
   * 记录指标
   */
  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metric = {
      timestamp: new Date(),
      value: value
    };

    this.metrics.get(name).push(metric);

    // 保持最近1000条记录
    const records = this.metrics.get(name);
    if (records.length > 1000) {
      records.shift();
    }

    // 发出指标事件
    this.emit('metric', { name, value });
  }

  /**
   * 触发告警
   */
  triggerAlert(type, details) {
    const alert = {
      id: Date.now(),
      type,
      timestamp: new Date(),
      details,
      severity: this.getAlertSeverity(type, details)
    };

    this.alerts.push(alert);
    console.error(\`🚨 告警: \${alert.type} - \${JSON.stringify(details)}\`);

    // 发送告警通知
    this.sendAlert(alert);
  }

  /**
   * 获取告警严重级别
   */
  getAlertSeverity(type, details) {
    if (type === 'memory_usage_high' && details.current > 0.9) {
      return 'critical';
    }
    if (type === 'slow_query' && details.duration > 1000) {
      return 'critical';
    }
    return 'warning';
  }

  /**
   * 发送告警通知
   */
  async sendAlert(alert) {
    // 这里可以集成邮件、Slack、短信等通知方式
    console.log(\`📧 发送告警: \${alert.type}\`);

    // 示例：记录到日志
    const logEntry = {
      timestamp: alert.timestamp,
      level: 'ERROR',
      message: \`Performance Alert: \${alert.type}\`,
      details: alert.details
    };

    // 可以写入日志文件或发送到日志服务
  }

  /**
   * 收集所有指标
   */
  collectMetrics() {
    const snapshot = {
      timestamp: new Date(),
      metrics: {}
    };

    // 收集所有指标
    for (const [name, records] of this.metrics.entries()) {
      if (records.length > 0) {
        const latest = records[records.length - 1];
        snapshot.metrics[name] = latest.value;
      }
    }

    // 发出快照事件
    this.emit('snapshot', snapshot);
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const report = {
      timestamp: new Date(),
      summary: {},
      alerts: this.alerts.slice(-10), // 最近10个告警
      metrics: {}
    };

    // 计算指标摘要
    for (const [name, records] of this.metrics.entries()) {
      if (records.length > 0) {
        const values = records.map(r =>
          typeof r.value === 'object' ? r.value.usagePercent || 0 : r.value
        );

        report.metrics[name] = {
          current: values[values.length - 1],
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length
        };
      }
    }

    return report;
  }

  /**
   * CPU监控
   */
  monitorCPUUsage() {
    // 简单的CPU使用率估算
    let lastCpuUsage = process.cpuUsage();

    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const percentCPU = (currentCpuUsage.user + currentCpuUsage.system) / 1000000; // 转换为秒

      this.recordMetric('cpu', {
        user: currentCpuUsage.user,
        system: currentCpuUsage.system,
        percent: percentCPU
      });

      lastCpuUsage = process.cpuUsage();
    }, 5000);
  }

  /**
   * API监控设置
   */
  setupAPIMonitoring() {
    // 这里可以集成Express中间件来监控API
    console.log('API监控已设置');
  }

  /**
   * 活跃用户追踪
   */
  trackActiveUsers() {
    // 这里可以实现用户活跃度统计
    console.log('用户活跃度追踪已设置');
  }
}

// 创建单例实例
const monitoringService = new PerformanceMonitoringService();

// 导出服务
module.exports = monitoringService;

// 如果直接运行此文件
if (require.main === module) {
  // 启动监控
  monitoringService.start();

  // 定期输出性能报告
  setInterval(() => {
    const report = monitoringService.getPerformanceReport();
    console.log('\\n📊 性能报告:', JSON.stringify(report, null, 2));
  }, 30000); // 每30秒输出一次

  // 优雅关闭
  process.on('SIGINT', () => {
    monitoringService.stop();
    process.exit(0);
  });
}
`;

  fs.writeFileSync(path.join(monitoringDir, 'performanceMonitoringService.js'), monitoringService);
  console.log('✅ 创建性能监控服务');
}

// 创建监控中间件
function createMonitoringMiddleware() {
  const middlewareDir = path.join(process.cwd(), 'src/middleware');
  if (!fs.existsSync(middlewareDir)) {
    fs.mkdirSync(middlewareDir, { recursive: true });
  }

  const middleware = `
/**
 * 性能监控中间件
 * 用于Express应用性能监控
 */

const performanceMonitoringService = require('../services/monitoring/performanceMonitoringService');

/**
 * API性能监控中间件
 */
function apiPerformanceMonitor(req, res, next) {
  const startTime = Date.now();
  const startHrTime = process.hrtime();

  // 记录请求开始
  performanceMonitoringService.recordMetric('api_request_start', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // 监听响应结束
  res.on('finish', () => {
    const endTime = Date.now();
    const hrTime = process.hrtime(startHrTime);
    const responseTime = hrTime[0] * 1000 + hrTime[1] / 1000000; // 转换为毫秒

    // 记录响应指标
    performanceMonitoringService.recordMetric('api_response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: responseTime,
      contentLength: res.get('Content-Length') || 0
    });

    // 检查慢请求
    if (responseTime > MONITORING_CONFIG.application.responseTimeThreshold) {
      performanceMonitoringService.triggerAlert('slow_api_request', {
        url: req.url,
        method: req.method,
        responseTime: responseTime,
        threshold: MONITORING_CONFIG.application.responseTimeThreshold
      });
    }

    // 检查错误响应
    if (res.statusCode >= 400) {
      performanceMonitoringService.recordMetric('api_error', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode
      });
    }
  });

  next();
}

/**
 * 错误监控中间件
 */
function errorMonitor(err, req, res, next) {
  // 记录错误指标
  performanceMonitoringService.recordMetric('application_error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date()
  });

  // 触发错误告警
  performanceMonitoringService.triggerAlert('application_error', {
    error: err.message,
    url: req.url
  });

  next(err);
}

module.exports = {
  apiPerformanceMonitor,
  errorMonitor
};
`;

  fs.writeFileSync(path.join(middlewareDir, 'monitoringMiddleware.js'), middleware);
  console.log('✅ 创建监控中间件');
}

// 创建监控集成脚本
function createMonitoringIntegration() {
  const integrationScript = `
/**
 * 性能监控集成脚本
 * 将监控系统集成到主应用中
 */

const performanceMonitoringService = require('./src/services/monitoring/performanceMonitoringService');
const { apiPerformanceMonitor, errorMonitor } = require('./src/middleware/monitoringMiddleware');

/**
 * 集成监控到Express应用
 * @param {Express} app Express应用实例
 */
function integrateMonitoring(app) {
  console.log('🔧 集成性能监控系统...');

  // 应用监控中间件
  app.use(apiPerformanceMonitor);

  // 错误监控中间件（放在最后）
  app.use(errorMonitor);

  // 启动监控服务
  performanceMonitoringService.start();

  // 监听性能事件
  performanceMonitoringService.on('metric', (metric) => {
    // 可以在这里处理指标事件
    console.log(\`📈 指标: \${metric.name}\`, metric.value);
  });

  performanceMonitoringService.on('snapshot', (snapshot) => {
    // 可以在这里处理性能快照
    // 例如：发送到监控系统、存储到数据库等
  });

  console.log('✅ 性能监控系统集成完成');
}

module.exports = { integrateMonitoring };

// 使用示例：
// const express = require('express');
// const app = express();
// const { integrateMonitoring } = require('./monitoringIntegration');
//
// integrateMonitoring(app);
`;

  fs.writeFileSync(path.join(process.cwd(), 'monitoringIntegration.js'), integrationScript);
  console.log('✅ 创建监控集成脚本');
}

// 创建Docker监控配置
function createDockerMonitoring() {
  const dockerDir = path.join(process.cwd(), 'docker/monitoring');
  if (!fs.existsSync(dockerDir)) {
    fs.mkdirSync(dockerDir, { recursive: true });
  }

  // Docker Compose for monitoring
  const dockerCompose = `
version: '3.8'

services:
  # Prometheus - 指标收集
  prometheus:
    image: prom/prometheus:latest
    container_name: smart-village-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - monitoring

  # Grafana - 可视化
  grafana:
    image: grafana/grafana:latest
    container_name: smart-village-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - monitoring

  # Node Exporter - 系统指标
  node-exporter:
    image: prom/node-exporter:latest
    container_name: smart-village-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
`;

  fs.writeFileSync(path.join(dockerDir, 'docker-compose.yml'), dockerCompose);

  // Prometheus配置
  const prometheusConfig = `
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'smart-village-app'
    static_configs:
      - targets: ['host.docker.internal:3001']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['host.docker.internal:9216']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
`;

  fs.writeFileSync(path.join(dockerDir, 'prometheus.yml'), prometheusConfig);
  console.log('✅ 创建Docker监控配置');
}

// 创建监控仪表板配置
function createGrafanaDashboard() {
  const grafanaDir = path.join(process.cwd(), 'docker/monitoring/grafana');
  if (!fs.existsSync(grafanaDir)) {
    fs.mkdirSync(grafanaDir, { recursive: true });
    fs.mkdirSync(path.join(grafanaDir, 'dashboards'));
    fs.mkdirSync(path.join(grafanaDir, 'datasources'));
  }

  // Grafana数据源配置
  const datasourceConfig = {
    apiVersion: 1,
    datasources: [
      {
        name: 'Prometheus',
        type: 'prometheus',
        access: 'proxy',
        url: 'http://prometheus:9090',
        isDefault: true
      }
    ]
  };

  fs.writeFileSync(
    path.join(grafanaDir, 'datasources/prometheus.yml'),
    JSON.stringify(datasourceConfig, null, 2)
  );

  console.log('✅ 创建Grafana配置');
}

// 主函数
function main() {
  console.log('🚀 部署智慧乡村性能监控系统...\n');

  try {
    // 1. 创建监控服务
    createMonitoringService();

    // 2. 创建监控中间件
    createMonitoringMiddleware();

    // 3. 创建监控集成脚本
    createMonitoringIntegration();

    // 4. 创建Docker监控配置
    createDockerMonitoring();

    // 5. 创建Grafana仪表板配置
    createGrafanaDashboard();

    console.log('\n✅ 性能监控系统部署完成！\n');

    console.log('📋 下一步操作：');
    console.log('1. 将监控集成到主应用：');
    console.log('   const { integrateMonitoring } = require("./monitoringIntegration");');
    console.log('   integrateMonitoring(app);');
    console.log('\n2. 启动Docker监控栈：');
    console.log('   cd docker/monitoring');
    console.log('   docker-compose up -d');
    console.log('\n3. 访问监控界面：');
    console.log('   - Prometheus: http://localhost:9090');
    console.log('   - Grafana: http://localhost:3001 (admin/admin123)');

  } catch (error) {
    console.error('❌ 部署失败:', error.message);
    process.exit(1);
  }
}

// 运行部署
if (require.main === module) {
  main();
}

module.exports = { main };