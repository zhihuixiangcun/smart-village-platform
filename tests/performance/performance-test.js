/**
 * 智慧乡村微服务性能测试
 * 测试系统的负载能力、响应时间和稳定性
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

class PerformanceTest {
  constructor(options = {}) {
    this.config = {
      baseURL: options.baseURL || 'http://localhost:8080',
      concurrentUsers: options.concurrentUsers || 50,
      requestsPerUser: options.requestsPerUser || 20,
      rampUpTime: options.rampUpTime || 10, // 秒
      testDuration: options.testDuration || 60, // 秒
      timeout: options.timeout || 5000,
      ...options
    };

    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      errors: new Map(),
      responseCodes: new Map(),
      timestamps: []
    };

    this.isRunning = false;
  }

  // 发送HTTP请求
  async sendRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const url = new URL(path, this.config.baseURL);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SmartVillage-PerformanceTest/1.0'
        },
        timeout: this.config.timeout
      };

      const req = httpModule.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;

          resolve({
            statusCode: res.statusCode,
            responseTime,
            data: responseData
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        reject({ error, responseTime });
      });

      req.on('timeout', () => {
        req.destroy();
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        reject({ error: new Error('Request timeout'), responseTime });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  // 单用户测试
  async runUserTest(userId, testPaths) {
    const userResults = {
      userId,
      requests: 0,
      successful: 0,
      failed: 0,
      totalResponseTime: 0,
      startTime: performance.now()
    };

    const endTime = userResults.startTime + (this.config.testDuration * 1000);
    let requestIndex = 0;

    while (performance.now() < endTime && !this.isRunning === false) {
      const path = testPaths[requestIndex % testPaths.length];

      try {
        const result = await this.sendRequest(path);

        // 更新全局结果
        this.results.totalRequests++;
        this.results.successfulRequests++;
        this.results.totalResponseTime += result.responseTime;
        this.results.minResponseTime = Math.min(this.results.minResponseTime, result.responseTime);
        this.results.maxResponseTime = Math.max(this.results.maxResponseTime, result.responseTime);

        // 更新状态码统计
        const statusCode = result.statusCode;
        this.results.responseCodes.set(statusCode, (this.results.responseCodes.get(statusCode) || 0) + 1);

        // 更新用户结果
        userResults.requests++;
        userResults.successful++;
        userResults.totalResponseTime += result.responseTime;

        // 记录时间戳
        this.results.timestamps.push({
          timestamp: Date.now(),
          responseTime: result.responseTime,
          statusCode: result.statusCode,
          userId
        });

      } catch (error) {
        // 更新全局结果
        this.results.totalRequests++;
        this.results.failedRequests++;

        // 记录错误
        const errorMessage = error.error?.message || error.message || 'Unknown error';
        this.results.errors.set(errorMessage, (this.results.errors.get(errorMessage) || 0) + 1);

        // 更新用户结果
        userResults.requests++;
        userResults.failed++;
      }

      requestIndex++;

      // 简单的请求间隔
      await this.sleep(100 + Math.random() * 400); // 100-500ms间隔
    }

    return userResults;
  }

  // 延迟函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 运行性能测试
  async runPerformanceTest() {
    console.log('🚀 开始性能测试');
    console.log(`配置: ${this.config.concurrentUsers}个并发用户, 每用户${this.config.requestsPerUser}个请求, 持续${this.config.testDuration}秒`);
    console.log('==========================================');

    this.isRunning = true;

    // 定义测试路径
    const testPaths = [
      '/health',
      '/monitoring/health',
      '/aiops/health',
      '/gateway/services'
    ];

    // 启动并发用户
    const userPromises = [];
    const rampUpDelay = (this.config.rampUpTime * 1000) / this.config.concurrentUsers;

    for (let i = 1; i <= this.config.concurrentUsers; i++) {
      const userPromise = this.sleep((i - 1) * rampUpDelay).then(() => {
        return this.runUserTest(i, testPaths);
      });

      userPromises.push(userPromise);
    }

    try {
      // 等待所有用户完成测试
      const userResults = await Promise.all(userPromises);

      // 停止测试
      this.isRunning = false;

      // 分析结果
      this.analyzeResults();

      // 输出报告
      this.printReport(userResults);

      return {
        summary: this.getSummary(),
        userResults,
        detailedResults: this.results
      };

    } catch (error) {
      this.isRunning = false;
      console.error('性能测试失败:', error);
      throw error;
    }
  }

  // 分析结果
  analyzeResults() {
    if (this.results.totalRequests === 0) {
      console.warn('没有请求被执行');
      return;
    }

    // 计算统计数据
    this.results.averageResponseTime = this.results.totalResponseTime / this.results.totalRequests;
    this.results.successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    this.results.requestsPerSecond = this.results.totalRequests / this.config.testDuration;

    // 计算响应时间分布
    const sortedTimes = this.results.timestamps
      .map(t => t.responseTime)
      .sort((a, b) => a - b);

    this.results.responseTimePercentiles = {
      p50: this.calculatePercentile(sortedTimes, 50),
      p90: this.calculatePercentile(sortedTimes, 90),
      p95: this.calculatePercentile(sortedTimes, 95),
      p99: this.calculatePercentile(sortedTimes, 99)
    };
  }

  // 计算百分位数
  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  // 获取摘要
  getSummary() {
    return {
      totalRequests: this.results.totalRequests,
      successfulRequests: this.results.successfulRequests,
      failedRequests: this.results.failedRequests,
      successRate: this.results.successRate.toFixed(2) + '%',
      requestsPerSecond: this.results.requestsPerSecond.toFixed(2),
      averageResponseTime: this.results.averageResponseTime?.toFixed(2) + 'ms',
      minResponseTime: this.results.minResponseTime.toFixed(2) + 'ms',
      maxResponseTime: this.results.maxResponseTime.toFixed(2) + 'ms',
      responseTimePercentiles: {
        p50: this.results.responseTimePercentiles.p50.toFixed(2) + 'ms',
        p90: this.results.responseTimePercentiles.p90.toFixed(2) + 'ms',
        p95: this.results.responseTimePercentiles.p95.toFixed(2) + 'ms',
        p99: this.results.responseTimePercentiles.p99.toFixed(2) + 'ms'
      }
    };
  }

  // 打印报告
  printReport(userResults) {
    console.log('\n==========================================');
    console.log('📊 性能测试报告');
    console.log('==========================================');

    const summary = this.getSummary();

    console.log('📈 总体统计:');
    console.log(`   总请求数: ${summary.totalRequests}`);
    console.log(`   成功请求: ${summary.successfulRequests}`);
    console.log(`   失败请求: ${summary.failedRequests}`);
    console.log(`   成功率: ${summary.successRate}`);
    console.log(`   每秒请求数: ${summary.requestsPerSecond}`);

    console.log('\n⏱️ 响应时间:');
    console.log(`   平均响应时间: ${summary.averageResponseTime}`);
    console.log(`   最小响应时间: ${summary.minResponseTime}`);
    console.log(`   最大响应时间: ${summary.maxResponseTime}`);

    console.log('\n📊 响应时间分布:');
    console.log(`   50% 请求: ${summary.responseTimePercentiles.p50}`);
    console.log(`   90% 请求: ${summary.responseTimePercentiles.p90}`);
    console.log(`   95% 请求: ${summary.responseTimePercentiles.p95}`);
    console.log(`   99% 请求: ${summary.responseTimePercentiles.p99}`);

    // 状态码分布
    if (this.results.responseCodes.size > 0) {
      console.log('\n📋 状态码分布:');
      for (const [code, count] of this.results.responseCodes) {
        const percentage = ((count / this.results.totalRequests) * 100).toFixed(2);
        console.log(`   ${code}: ${count} (${percentage}%)`);
      }
    }

    // 错误统计
    if (this.results.errors.size > 0) {
      console.log('\n❌ 错误统计:');
      for (const [error, count] of this.results.errors) {
        console.log(`   ${error}: ${count}次`);
      }
    }

    // 用户统计
    if (userResults.length > 0) {
      console.log('\n👥 用户统计:');
      const avgUserRequests = userResults.reduce((sum, user) => sum + user.requests, 0) / userResults.length;
      const avgUserSuccessRate = userResults.reduce((sum, user) =>
        sum + (user.requests > 0 ? (user.successful / user.requests) * 100 : 0), 0) / userResults.length;

      console.log(`   平均每用户请求数: ${avgUserRequests.toFixed(2)}`);
      console.log(`   平均用户成功率: ${avgUserSuccessRate.toFixed(2)}%`);
    }

    // 性能评估
    console.log('\n🎯 性能评估:');
    if (summary.successRate >= 99) {
      console.log('   ✅ 成功率优秀 (>99%)');
    } else if (summary.successRate >= 95) {
      console.log('   ⚠️ 成功率良好 (95-99%)');
    } else {
      console.log('   ❌ 成功率需要改进 (<95%)');
    }

    const avgResponseTimeNum = parseFloat(summary.averageResponseTime);
    if (avgResponseTimeNum <= 200) {
      console.log('   ✅ 响应时间优秀 (<200ms)');
    } else if (avgResponseTimeNum <= 1000) {
      console.log('   ⚠️ 响应时间良好 (200-1000ms)');
    } else {
      console.log('   ❌ 响应时间需要改进 (>1000ms)');
    }

    const rpsNum = parseFloat(summary.requestsPerSecond);
    if (rpsNum >= 100) {
      console.log('   ✅ 吞吐量优秀 (>100 RPS)');
    } else if (rpsNum >= 50) {
      console.log('   ⚠️ 吞吐量良好 (50-100 RPS)');
    } else {
      console.log('   ❌ 吞吐量需要改进 (<50 RPS)');
    }
  }

  // 生成详细报告
  generateDetailedReport() {
    return {
      testConfig: this.config,
      testResults: this.results,
      summary: this.getSummary(),
      timestamp: new Date().toISOString()
    };
  }
}

// 主函数
async function main() {
  const testConfig = {
    baseURL: 'http://localhost:8080',
    concurrentUsers: 20,
    testDuration: 30,
    rampUpTime: 5
  };

  const tester = new PerformanceTest(testConfig);

  try {
    const results = await tester.runPerformanceTest();

    // 保存详细报告
    const fs = require('fs');
    const reportPath = './tests/performance-report.json';
    const detailedReport = tester.generateDetailedReport();
    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(`\n📄 详细性能报告已保存到: ${reportPath}`);

  } catch (error) {
    console.error('\n💥 性能测试失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceTest;