/**
 * 智能村庄平台负载和压力测试
 * 测试系统在高负载下的性能表现和稳定性
 */

const loadtest = require('loadtest');
const autocannon = require('autocannon');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const VillageManagementApp = require('../../examples/errorHandlingIntegration');

describe('智能村庄平台 - 负载和压力测试', () => {
  let app;
  let server;
  let serverUrl;
  let authToken;

  beforeAll(async () => {
    // 初始化测试应用
    app = new VillageManagementApp();
    server = await app.start(0);
    const address = server.address();
    serverUrl = `http://localhost:${address.port}`;

    // 生成测试token
    authToken = jwt.sign({
      id: 'load_test_user',
      name: '负载测试用户',
      position: 'village_admin',
      villageId: 'test_village',
      permissions: ['*']
    }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });

    console.log(`🚀 负载测试服务器启动: ${serverUrl}`);
  }, 30000);

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await app.stop();
  });

  describe('1. 基础性能基准测试', () => {
    test('健康检查端点性能基准', async () => {
      const result = await performLoadTest({
        url: `${serverUrl}/health`,
        method: 'GET',
        maxRequests: 1000,
        concurrency: 50,
        timeout: 10000
      });

      expect(result.totalRequests).toBeGreaterThan(900);
      expect(result.meanLatencyMs).toBeLessThan(100);
      expect(result.errorRate).toBeLessThan(0.01); // 小于1%错误率
    });

    test('村民列表查询性能基准', async () => {
      const result = await performLoadTest({
        url: `${serverUrl}/api/v1/residents`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        maxRequests: 500,
        concurrency: 25,
        timeout: 15000
      });

      expect(result.totalRequests).toBeGreaterThan(450);
      expect(result.meanLatencyMs).toBeLessThan(500);
      expect(result.rps).toBeGreaterThan(20); // 每秒至少20个请求
    });

    test('单个村民信息查询性能', async () => {
      const result = await performLoadTest({
        url: `${serverUrl}/api/v1/residents/test_resident_001`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        maxRequests: 1000,
        concurrency: 100,
        timeout: 10000
      });

      expect(result.meanLatencyMs).toBeLessThan(200);
      expect(result.rps).toBeGreaterThan(50);
    });
  });

  describe('2. 高并发场景测试', () => {
    test('高并发读取操作', async () => {
      const result = await runAutocannonTest({
        url: `${serverUrl}/api/v1/residents`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        connections: 100,
        duration: 30 // 30秒
      });

      expect(result.requests.average).toBeGreaterThan(50);
      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
    });

    test('高并发写入操作', async () => {
      const result = await runAutocannonTest({
        url: `${serverUrl}/api/v1/residents`,
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          realName: '负载测试用户',
          idCard: '110101199001010000',
          phone: '13800138000',
          villageId: 'test_village'
        }),
        connections: 50,
        duration: 20
      });

      expect(result.requests.average).toBeGreaterThan(10);
      expect(result.errors).toBeLessThan(result.requests.total * 0.05); // 小于5%错误率
    });

    test('混合读写负载测试', async () => {
      const readTest = runAutocannonTest({
        url: `${serverUrl}/api/v1/residents`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        connections: 50,
        duration: 30
      });

      const writeTest = runAutocannonTest({
        url: `${serverUrl}/api/v1/residents`,
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          realName: '混合测试用户',
          idCard: '110101199001010001',
          phone: '13800138001',
          villageId: 'test_village'
        }),
        connections: 25,
        duration: 30
      });

      const [readResult, writeResult] = await Promise.all([readTest, writeTest]);

      expect(readResult.requests.average + writeResult.requests.average).toBeGreaterThan(50);
    });
  });

  describe('3. 压力测试和极限测试', () => {
    test('渐进式压力测试', async () => {
      const results = [];
      const concurrencyLevels = [10, 25, 50, 100, 200, 500];

      for (const concurrency of concurrencyLevels) {
        console.log(`🧪 测试并发级别: ${concurrency}`);
        
        const result = await performLoadTest({
          url: `${serverUrl}/api/v1/residents`,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` },
          maxRequests: concurrency * 10,
          concurrency,
          timeout: 20000
        });

        results.push({
          concurrency,
          rps: result.rps,
          meanLatency: result.meanLatencyMs,
          errorRate: result.errorRate,
          successful: result.errorRate < 0.1 // 小于10%错误率视为成功
        });

        // 如果错误率过高，停止测试
        if (result.errorRate > 0.2) {
          console.log(`⚠️ 错误率过高 (${result.errorRate}), 停止压力测试`);
          break;
        }
      }

      // 找到最大可承受并发量
      const maxStableConcurrency = results
        .filter(r => r.successful)
        .reduce((max, r) => r.concurrency > max ? r.concurrency : max, 0);

      console.log(`📊 最大稳定并发量: ${maxStableConcurrency}`);
      expect(maxStableConcurrency).toBeGreaterThan(50);
    });

    test('长时间稳定性测试', async () => {
      const result = await runAutocannonTest({
        url: `${serverUrl}/health`,
        method: 'GET',
        connections: 20,
        duration: 120 // 2分钟持续测试
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.requests.average).toBeGreaterThan(100);
    });

    test('内存泄漏检测', async () => {
      const initialMemory = process.memoryUsage();
      
      // 执行大量请求
      await performLoadTest({
        url: `${serverUrl}/api/v1/residents`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        maxRequests: 5000,
        concurrency: 100,
        timeout: 60000
      });

      // 等待垃圾回收
      if (global.gc) {
        global.gc();
      }
      await new Promise(resolve => setTimeout(resolve, 5000));

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      console.log(`📈 内存使用变化: ${memoryIncreasePercent.toFixed(2)}%`);
      expect(memoryIncreasePercent).toBeLessThan(50); // 内存增长不应超过50%
    });
  });

  describe('4. 特定场景性能测试', () => {
    test('数据库查询密集场景', async () => {
      const result = await performLoadTest({
        url: `${serverUrl}/api/v1/residents?limit=100&sort=createdAt&order=desc`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        maxRequests: 200,
        concurrency: 50,
        timeout: 15000
      });

      expect(result.meanLatencyMs).toBeLessThan(1000);
      expect(result.errorRate).toBeLessThan(0.05);
    });

    test('复杂查询性能测试', async () => {
      const result = await performLoadTest({
        url: `${serverUrl}/api/v1/residents?searchTerm=测试&villageId=test_village&householdType=普通户`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        maxRequests: 300,
        concurrency: 30,
        timeout: 20000
      });

      expect(result.meanLatencyMs).toBeLessThan(2000);
      expect(result.rps).toBeGreaterThan(10);
    });

    test('文件上传性能测试', async () => {
      // 模拟文件上传
      const result = await performLoadTest({
        url: `${serverUrl}/api/v1/upload`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: Buffer.alloc(1024 * 100), // 100KB 文件
        maxRequests: 50,
        concurrency: 10,
        timeout: 30000
      });

      expect(result.meanLatencyMs).toBeLessThan(5000);
      expect(result.errorRate).toBeLessThan(0.1);
    });

    test('认证密集场景测试', async () => {
      // 测试大量认证请求
      const result = await performLoadTest({
        url: `${serverUrl}/api/v1/residents`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        maxRequests: 1000,
        concurrency: 200, // 高并发认证
        timeout: 15000
      });

      expect(result.meanLatencyMs).toBeLessThan(500);
      expect(result.errorRate).toBeLessThan(0.05);
    });
  });

  describe('5. 错误处理性能测试', () => {
    test('错误处理系统负载测试', async () => {
      // 故意触发错误以测试错误处理性能
      const result = await performLoadTest({
        url: `${serverUrl}/api/v1/residents/non_existent_id`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        maxRequests: 500,
        concurrency: 50,
        timeout: 10000
      });

      // 虽然都是错误请求，但应该能快速响应
      expect(result.meanLatencyMs).toBeLessThan(200);
      expect(result.totalRequests).toBeGreaterThan(450);
    });

    test('熔断器性能影响测试', async () => {
      // 先触发熔断器
      await performLoadTest({
        url: `${serverUrl}/api/v1/external-service-test`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        maxRequests: 10,
        concurrency: 5,
        timeout: 5000
      });

      // 测试熔断器激活后的性能
      const result = await performLoadTest({
        url: `${serverUrl}/api/v1/external-service-test`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` },
        maxRequests: 100,
        concurrency: 20,
        timeout: 5000
      });

      // 熔断器应该让响应更快
      expect(result.meanLatencyMs).toBeLessThan(50);
    });
  });

  // 辅助函数
  async function performLoadTest(options) {
    return new Promise((resolve, reject) => {
      const loadOptions = {
        url: options.url,
        method: options.method || 'GET',
        maxRequests: options.maxRequests || 1000,
        concurrency: options.concurrency || 50,
        timeout: options.timeout || 10000,
        headers: options.headers || {},
        body: options.body
      };

      loadtest.loadTest(loadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  async function runAutocannonTest(options) {
    return new Promise((resolve, reject) => {
      const instance = autocannon({
        url: options.url,
        method: options.method || 'GET',
        connections: options.connections || 10,
        duration: options.duration || 10,
        headers: options.headers || {},
        body: options.body
      }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
});

/**
 * 性能测试报告生成器
 */
class PerformanceTestReporter {
  constructor() {
    this.testResults = [];
    this.benchmarks = {
      responseTime: {
        excellent: 100,  // ms
        good: 500,
        fair: 1000,
        poor: 2000
      },
      throughput: {
        excellent: 100,  // requests/sec
        good: 50,
        fair: 20,
        poor: 10
      },
      errorRate: {
        excellent: 0.001, // 0.1%
        good: 0.01,       // 1%
        fair: 0.05,       // 5%
        poor: 0.1         // 10%
      }
    };
  }

  recordResult(testName, metrics) {
    this.testResults.push({
      testName,
      metrics,
      timestamp: new Date(),
      score: this.calculateScore(metrics)
    });
  }

  calculateScore(metrics) {
    const scores = {
      responseTime: this.getBenchmarkScore(metrics.meanLatencyMs, this.benchmarks.responseTime, true),
      throughput: this.getBenchmarkScore(metrics.rps, this.benchmarks.throughput, false),
      errorRate: this.getBenchmarkScore(metrics.errorRate, this.benchmarks.errorRate, true)
    };

    return {
      overall: (scores.responseTime + scores.throughput + scores.errorRate) / 3,
      breakdown: scores
    };
  }

  getBenchmarkScore(value, benchmark, lowerIsBetter) {
    const keys = ['excellent', 'good', 'fair', 'poor'];
    
    for (let i = 0; i < keys.length; i++) {
      const threshold = benchmark[keys[i]];
      const condition = lowerIsBetter ? value <= threshold : value >= threshold;
      
      if (condition) {
        return 100 - (i * 25); // 100, 75, 50, 25
      }
    }
    
    return 0; // 低于poor标准
  }

  generateReport() {
    const overallScore = this.testResults.reduce((sum, result) => 
      sum + result.score.overall, 0) / this.testResults.length;

    return {
      summary: {
        totalTests: this.testResults.length,
        overallScore: Math.round(overallScore),
        grade: this.getGrade(overallScore)
      },
      results: this.testResults,
      recommendations: this.generateRecommendations()
    };
  }

  getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }

  generateRecommendations() {
    const recommendations = [];
    
    const avgResponseTime = this.testResults.reduce((sum, r) => 
      sum + r.metrics.meanLatencyMs, 0) / this.testResults.length;
    
    if (avgResponseTime > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: '平均响应时间过长，建议优化数据库查询和缓存策略'
      });
    }

    const avgErrorRate = this.testResults.reduce((sum, r) => 
      sum + r.metrics.errorRate, 0) / this.testResults.length;
    
    if (avgErrorRate > 0.05) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: '错误率过高，建议加强错误处理和系统稳定性'
      });
    }

    return recommendations;
  }

  printReport() {
    const report = this.generateReport();
    
    console.log('\n🚀 性能测试报告');
    console.log('================');
    console.log(`总体评分: ${report.summary.overallScore}/100 (${report.summary.grade})`);
    console.log(`测试数量: ${report.summary.totalTests}`);
    
    console.log('\n📊 详细结果:');
    report.results.forEach(result => {
      console.log(`  ${result.testName}:`);
      console.log(`    响应时间: ${result.metrics.meanLatencyMs}ms`);
      console.log(`    吞吐量: ${result.metrics.rps} req/s`);
      console.log(`    错误率: ${(result.metrics.errorRate * 100).toFixed(2)}%`);
      console.log(`    评分: ${Math.round(result.score.overall)}/100`);
    });

    if (report.recommendations.length > 0) {
      console.log('\n💡 优化建议:');
      report.recommendations.forEach(rec => {
        console.log(`  ${rec.priority.toUpperCase()}: ${rec.message}`);
      });
    }

    return report;
  }
}

module.exports = {
  PerformanceTestReporter
};