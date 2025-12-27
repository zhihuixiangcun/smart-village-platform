
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
    console.log(`📈 指标: ${metric.name}`, metric.value);
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
