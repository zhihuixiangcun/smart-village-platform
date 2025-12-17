/**
 * 智慧乡村平台综合性能测试脚本
 * 测试API响应时间、并发处理能力、数据库性能、内存使用等
 */

const axios = require('axios').default;
const os = require('os');
const fs = require('fs');

console.log('⚡ 开始智慧乡村平台综合性能测试\n');

// 测试配置
const config = {
  baseUrl: process.env.SERVER_URL || 'http://localhost:3001',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 10,
  testDuration: parseInt(process.env.TEST_DURATION) || 30000, // 30秒
  requestTimeout: 10000,
  endpoints: [
    { name: '健康检查', path: '/health', method: 'GET', weight: 1 },
    { name: '系统监控', path: '/api/monitoring/health', method: 'GET', weight: 1 },
    { name: '稳定性状态', path: '/api/stability/status', method: 'GET', weight: 1 },
    { name: 'SQLite测试', path: '/api/sqlite-test', method: 'GET', weight: 0.5 }
  ]
};

// 性能测试结果
const performanceReport = {
  timestamp: new Date().toISOString(),
  config: {
    concurrentUsers: config.concurrentUsers,
    testDuration: config.testDuration,
    totalEndpoints: config.endpoints.length
  },
  systemMetrics: {
    initial: {},
    final: {},
    peak: {}
  },
  results: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    requestsPerSecond: 0,
    errorRate: 0,
    endpointResults: {},
    responseTimeDistribution: {
      '< 100ms': 0,
      '100-500ms': 0,
      '500ms-1s': 0,
      '1s-3s': 0,
      '> 3s': 0
    }
  },
  errors: [],
  recommendations: []
};

// 获取系统指标
function getSystemMetrics() {
  const used = process.memoryUsage();
  
  return {
    timestamp: Date.now(),
    memory: {
      rss: used.rss,
      heapTotal: used.heapTotal, 
      heapUsed: used.heapUsed,
      external: used.external
    },
    system: {
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuLoad: os.loadavg()[0],
      uptime: process.uptime()
    }
  };
}

// 格式化内存大小
function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// 记录响应时间分布
function recordResponseTime(responseTime) {
  if (responseTime < 100) {
    performanceReport.results.responseTimeDistribution['< 100ms']++;
  } else if (responseTime < 500) {
    performanceReport.results.responseTimeDistribution['100-500ms']++;
  } else if (responseTime < 1000) {
    performanceReport.results.responseTimeDistribution['500ms-1s']++;
  } else if (responseTime < 3000) {
    performanceReport.results.responseTimeDistribution['1s-3s']++;
  } else {
    performanceReport.results.responseTimeDistribution['> 3s']++;
  }
}

// 执行单个请求
async function executeRequest(endpoint) {
  const startTime = Date.now();
  
  try {
    const response = await axios({
      method: endpoint.method,
      url: `${config.baseUrl}${endpoint.path}`,
      timeout: config.requestTimeout,
      validateStatus: () => true
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const isSuccess = response.status >= 200 && response.status < 300;
    
    return {
      success: isSuccess,
      responseTime,
      statusCode: response.status,
      endpoint: endpoint.name,
      timestamp: startTime
    };
    
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      success: false,
      responseTime,
      error: error.message,
      endpoint: endpoint.name,
      timestamp: startTime
    };
  }
}

// 模拟用户会话
async function simulateUserSession(userId, duration) {
  const sessionResults = [];
  const startTime = Date.now();
  
  while (Date.now() - startTime < duration) {
    // 随机选择一个端点（基于权重）
    const totalWeight = config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    let selectedEndpoint = config.endpoints[0];
    for (const endpoint of config.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        selectedEndpoint = endpoint;
        break;
      }
    }
    
    // 执行请求
    const result = await executeRequest(selectedEndpoint);
    sessionResults.push(result);
    
    // 随机等待时间（模拟真实用户行为）
    const thinkTime = Math.random() * 2000 + 500; // 0.5-2.5秒
    await new Promise(resolve => setTimeout(resolve, thinkTime));
  }
  
  return sessionResults;
}

// 运行负载测试
async function runLoadTest() {
  console.log('🚀 开始负载测试...');
  console.log(`   并发用户: ${config.concurrentUsers}`);
  console.log(`   测试时长: ${config.testDuration / 1000} 秒`);
  console.log(`   测试端点: ${config.endpoints.length} 个`);
  console.log('');
  
  // 记录初始系统指标
  performanceReport.systemMetrics.initial = getSystemMetrics();
  
  console.log('   📊 初始系统状态:');
  console.log(`      进程内存: ${formatBytes(performanceReport.systemMetrics.initial.memory.heapUsed)}`);
  console.log(`      系统可用内存: ${formatBytes(performanceReport.systemMetrics.initial.system.freeMemory)}`);
  console.log(`      CPU负载: ${performanceReport.systemMetrics.initial.system.cpuLoad.toFixed(2)}`);
  console.log('');
  
  const allResults = [];
  const userSessions = [];
  
  // 启动并发用户会话
  for (let i = 0; i < config.concurrentUsers; i++) {
    const sessionPromise = simulateUserSession(i, config.testDuration);
    userSessions.push(sessionPromise);
  }
  
  // 监控系统指标
  const metricsInterval = setInterval(() => {
    const currentMetrics = getSystemMetrics();
    
    // 更新峰值指标
    if (!performanceReport.systemMetrics.peak.memory || 
        currentMetrics.memory.heapUsed > performanceReport.systemMetrics.peak.memory.heapUsed) {
      performanceReport.systemMetrics.peak = currentMetrics;
    }
  }, 1000);
  
  console.log('   ⏳ 测试进行中...');
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - performanceReport.systemMetrics.initial.timestamp;
    const progress = Math.min((elapsed / config.testDuration) * 100, 100);
    process.stdout.write(`\r   进度: ${progress.toFixed(1)}% `);
  }, 1000);
  
  // 等待所有用户会话完成
  const sessionResults = await Promise.all(userSessions);
  
  clearInterval(metricsInterval);
  clearInterval(progressInterval);
  console.log('\n');
  
  // 合并所有结果
  sessionResults.forEach(sessionResult => {
    allResults.push(...sessionResult);
  });
  
  // 记录最终系统指标
  performanceReport.systemMetrics.final = getSystemMetrics();
  
  return allResults;
}

// 分析测试结果
function analyzeResults(results) {
  console.log('📈 分析测试结果...');
  
  const totalRequests = results.length;
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = totalRequests - successfulRequests;
  
  const responseTimes = results.map(r => r.responseTime);
  const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  
  const testDurationSeconds = config.testDuration / 1000;
  const requestsPerSecond = totalRequests / testDurationSeconds;
  const errorRate = (failedRequests / totalRequests) * 100;
  
  // 更新性能报告
  performanceReport.results = {
    totalRequests,
    successfulRequests,
    failedRequests,
    averageResponseTime: Math.round(averageResponseTime),
    minResponseTime,
    maxResponseTime,
    requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    endpointResults: {},
    responseTimeDistribution: {
      '< 100ms': 0,
      '100-500ms': 0,
      '500ms-1s': 0,
      '1s-3s': 0,
      '> 3s': 0
    }
  };
  
  // 记录响应时间分布
  results.forEach(result => {
    recordResponseTime(result.responseTime);
  });
  
  // 按端点分析
  config.endpoints.forEach(endpoint => {
    const endpointResults = results.filter(r => r.endpoint === endpoint.name);
    
    if (endpointResults.length > 0) {
      const endpointResponseTimes = endpointResults.map(r => r.responseTime);
      const endpointSuccessful = endpointResults.filter(r => r.success).length;
      
      performanceReport.results.endpointResults[endpoint.name] = {
        totalRequests: endpointResults.length,
        successfulRequests: endpointSuccessful,
        failedRequests: endpointResults.length - endpointSuccessful,
        averageResponseTime: Math.round(endpointResponseTimes.reduce((sum, time) => sum + time, 0) / endpointResults.length),
        minResponseTime: Math.min(...endpointResponseTimes),
        maxResponseTime: Math.max(...endpointResponseTimes),
        successRate: Math.round((endpointSuccessful / endpointResults.length) * 10000) / 100
      };
    }
  });
  
  // 收集错误信息
  const errors = results.filter(r => !r.success);
  performanceReport.errors = errors.slice(0, 10).map(error => ({
    endpoint: error.endpoint,
    error: error.error || `HTTP ${error.statusCode}`,
    timestamp: new Date(error.timestamp).toISOString()
  }));
  
  // 生成性能建议
  generatePerformanceRecommendations();
  
  return performanceReport.results;
}

// 生成性能建议
function generatePerformanceRecommendations() {
  const results = performanceReport.results;
  const systemMetrics = performanceReport.systemMetrics;
  
  // 响应时间建议
  if (results.averageResponseTime > 1000) {
    performanceReport.recommendations.push('平均响应时间超过1秒，建议优化API性能');
  }
  
  // 错误率建议
  if (results.errorRate > 5) {
    performanceReport.recommendations.push(`错误率较高(${results.errorRate}%)，需要检查系统稳定性`);
  } else if (results.errorRate > 1) {
    performanceReport.recommendations.push(`错误率偏高(${results.errorRate}%)，建议进一步优化`);
  }
  
  // 吞吐量建议
  if (results.requestsPerSecond < 10) {
    performanceReport.recommendations.push('吞吐量较低，考虑优化并发处理能力');
  }
  
  // 内存使用建议
  const memoryIncrease = systemMetrics.final.memory.heapUsed - systemMetrics.initial.memory.heapUsed;
  if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
    performanceReport.recommendations.push('测试期间内存使用增长较大，注意内存泄漏');
  }
  
  // 响应时间分布建议
  const slowRequests = results.responseTimeDistribution['1s-3s'] + results.responseTimeDistribution['> 3s'];
  const totalDistribution = Object.values(results.responseTimeDistribution).reduce((sum, count) => sum + count, 0);
  
  if (slowRequests / totalDistribution > 0.1) {
    performanceReport.recommendations.push('有较多慢请求，建议优化数据库查询和缓存策略');
  }
}

// 生成性能报告
function generatePerformanceReport() {
  console.log('='.repeat(70));
  console.log('⚡ 智慧乡村平台性能测试报告');
  console.log('='.repeat(70));
  
  const results = performanceReport.results;
  const systemMetrics = performanceReport.systemMetrics;
  
  console.log('📊 测试配置:');
  console.log(`   并发用户数: ${config.concurrentUsers}`);
  console.log(`   测试时长: ${config.testDuration / 1000} 秒`);
  console.log(`   测试端点: ${config.endpoints.length} 个`);
  console.log('');
  
  console.log('🎯 整体性能指标:');
  console.log(`   总请求数: ${results.totalRequests.toLocaleString()}`);
  console.log(`   成功请求: ${results.successfulRequests.toLocaleString()} (${((results.successfulRequests/results.totalRequests)*100).toFixed(1)}%)`);
  console.log(`   失败请求: ${results.failedRequests.toLocaleString()} (${results.errorRate}%)`);
  console.log(`   平均响应时间: ${results.averageResponseTime} ms`);
  console.log(`   最快响应: ${results.minResponseTime} ms`);
  console.log(`   最慢响应: ${results.maxResponseTime} ms`);
  console.log(`   吞吐量: ${results.requestsPerSecond} 请求/秒`);
  console.log('');
  
  console.log('⏱️ 响应时间分布:');
  Object.entries(results.responseTimeDistribution).forEach(([range, count]) => {
    const percentage = ((count / results.totalRequests) * 100).toFixed(1);
    console.log(`   ${range}: ${count} 次 (${percentage}%)`);
  });
  console.log('');
  
  console.log('🌐 端点性能详情:');
  Object.entries(results.endpointResults).forEach(([endpoint, stats]) => {
    console.log(`   ${endpoint}:`);
    console.log(`      请求数: ${stats.totalRequests}`);
    console.log(`      成功率: ${stats.successRate}%`);
    console.log(`      平均响应时间: ${stats.averageResponseTime} ms`);
    console.log(`      响应时间范围: ${stats.minResponseTime}-${stats.maxResponseTime} ms`);
  });
  console.log('');
  
  console.log('💾 系统资源使用:');
  console.log(`   初始内存: ${formatBytes(systemMetrics.initial.memory.heapUsed)}`);
  console.log(`   峰值内存: ${formatBytes(systemMetrics.peak.memory.heapUsed)}`);
  console.log(`   最终内存: ${formatBytes(systemMetrics.final.memory.heapUsed)}`);
  console.log(`   内存增长: ${formatBytes(systemMetrics.final.memory.heapUsed - systemMetrics.initial.memory.heapUsed)}`);
  console.log('');
  
  if (performanceReport.errors.length > 0) {
    console.log('❌ 错误示例:');
    performanceReport.errors.slice(0, 5).forEach((error, index) => {
      console.log(`   ${index + 1}. [${error.endpoint}] ${error.error}`);
    });
    if (performanceReport.errors.length > 5) {
      console.log(`   ... 还有 ${performanceReport.errors.length - 5} 个错误`);
    }
    console.log('');
  }
  
  if (performanceReport.recommendations.length > 0) {
    console.log('💡 性能优化建议:');
    performanceReport.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log('');
  }
  
  // 性能等级评估
  let performanceGrade = 'A';
  let gradeReason = [];
  
  if (results.errorRate > 5) {
    performanceGrade = 'D';
    gradeReason.push('错误率过高');
  } else if (results.averageResponseTime > 2000) {
    performanceGrade = 'D';
    gradeReason.push('响应时间过慢');
  } else if (results.errorRate > 1 || results.averageResponseTime > 1000) {
    performanceGrade = 'C';
    gradeReason.push('性能有待提升');
  } else if (results.requestsPerSecond < 20) {
    performanceGrade = 'B';
    gradeReason.push('吞吐量中等');
  }
  
  console.log(`🏆 性能等级: ${performanceGrade}`);
  if (gradeReason.length > 0) {
    console.log(`   评级原因: ${gradeReason.join('、')}`);
  }
  console.log('');
  
  console.log(`⏰ 测试时间: ${new Date().toLocaleString()}`);
  console.log('='.repeat(70));
  
  // 保存详细报告
  try {
    const reportFile = `logs/performance-report-${new Date().toISOString().slice(0, 10)}.json`;
    
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(performanceReport, null, 2));
    console.log(`📁 详细报告已保存至: ${reportFile}`);
    
  } catch (error) {
    console.log('❌ 保存报告失败:', error.message);
  }
}

// 运行完整的性能测试
async function runPerformanceTest() {
  try {
    console.log('🚀 启动智慧乡村平台性能测试...\n');
    
    // 运行负载测试
    const results = await runLoadTest();
    
    // 分析结果
    const analysis = analyzeResults(results);
    
    // 生成报告
    generatePerformanceReport();
    
    // 根据性能等级设置退出码
    if (analysis.errorRate > 10) {
      process.exit(1); // 严重性能问题
    } else if (analysis.errorRate > 5 || analysis.averageResponseTime > 2000) {
      process.exit(2); // 性能问题
    } else {
      process.exit(0); // 性能良好
    }
    
  } catch (error) {
    console.error('❌ 性能测试执行失败:', error.message);
    console.error(error.stack);
    process.exit(3);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runPerformanceTest();
}

module.exports = {
  runPerformanceTest,
  runLoadTest,
  analyzeResults,
  generatePerformanceReport
};