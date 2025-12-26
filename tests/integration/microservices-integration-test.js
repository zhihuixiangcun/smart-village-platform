/**
 * 智慧乡村微服务集成测试
 * 测试各微服务之间的通信和功能
 */

const assert = require('assert');
const axios = require('axios');

// 测试配置
const config = {
  gateway: 'http://localhost:8080',
  monitoring: 'http://localhost:3001',
  aiops: 'http://localhost:7000',
  timeout: 10000
};

class MicroservicesIntegrationTest {
  constructor() {
    this.testResults = [];
    this.passedTests = 0;
    this.failedTests = 0;
  }

  // 测试方法
  async test(name, testFn) {
    try {
      console.log(`\n🧪 测试: ${name}`);
      await testFn();
      console.log(`✅ 通过: ${name}`);
      this.testResults.push({ name, status: 'passed', error: null });
      this.passedTests++;
    } catch (error) {
      console.log(`❌ 失败: ${name}`);
      console.log(`   错误: ${error.message}`);
      this.testResults.push({ name, status: 'failed', error: error.message });
      this.failedTests++;
    }
  }

  // 测试API网关健康状态
  async testGatewayHealth() {
    const response = await axios.get(`${config.gateway}/health`, { timeout: config.timeout });
    assert.equal(response.status, 200);
    assert.ok(response.data.status);
    assert.equal(response.data.status, 'healthy');
  }

  // 测试监控服务健康状态
  async testMonitoringHealth() {
    const response = await axios.get(`${config.monitoring}/health`, { timeout: config.timeout });
    assert.equal(response.status, 200);
    assert.ok(response.data.status);
  }

  // 测试AIOps服务健康状态
  async testAIOpsHealth() {
    const response = await axios.get(`${config.aiops}/health`, { timeout: config.timeout });
    assert.equal(response.status, 200);
    assert.ok(response.data.status);
  }

  // 测试API网关路由
  async testGatewayRouting() {
    // 测试不存在的路由应该返回404
    try {
      await axios.get(`${config.gateway}/api/v1/nonexistent`, { timeout: config.timeout });
      assert.fail('应该返回404错误');
    } catch (error) {
      assert.equal(error.response.status, 404);
    }

    // 测试网关服务列表
    const response = await axios.get(`${config.gateway}/gateway/services`, { timeout: config.timeout });
    assert.equal(response.status, 200);
    assert.ok(response.data.services);
  }

  // 测试监控服务指标收集
  async testMonitoringMetrics() {
    const response = await axios.get(`${config.monitoring}/api/overview`, { timeout: config.timeout });
    assert.equal(response.status, 200);
    assert.ok(typeof response.data.metrics === 'object');
  }

  // 测试AIOps异常检测
  async testAIOpsAnomalyDetection() {
    const testData = {
      metricName: 'response_time',
      value: 1500,
      serviceName: 'test-service'
    };

    const response = await axios.post(`${config.aiops}/api/anomaly/detect`, testData, {
      timeout: config.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    assert.equal(response.status, 200);
    assert.ok(typeof response.data.anomaly === 'boolean');
  }

  // 测试AIOps预测扩容
  async testAIOpsPredictiveScaling() {
    const testData = {
      serviceName: 'test-service'
    };

    const response = await axios.post(`${config.aiops}/api/scaling/trigger`, testData, {
      timeout: config.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    assert.equal(response.status, 200);
    assert.ok(response.data.recommendation);
  }

  // 测试AIOps自动恢复
  async testAIOpsAutoHealing() {
    const testData = {
      serviceName: 'test-service'
    };

    const response = await axios.post(`${config.aiops}/api/healing/trigger`, testData, {
      timeout: config.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    assert.equal(response.status, 200);
    assert.ok(response.data.strategies);
  }

  // 测试AIOps容量规划
  async testAIOpsCapacityPlanning() {
    const response = await axios.post(`${config.aiops}/api/planning/trigger`, {}, {
      timeout: config.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    assert.equal(response.status, 200);
    assert.ok(response.data.recommendations);
  }

  // 测试服务间通信
  async testServiceCommunication() {
    // 测试网关到监控服务的通信
    const response = await axios.get(`${config.gateway}/monitoring/health`, { timeout: config.timeout });
    assert.equal(response.status, 200);

    // 测试网关到AIOps服务的通信
    const aiopsResponse = await axios.get(`${config.gateway}/aiops/health`, { timeout: config.timeout });
    assert.equal(aiopsResponse.status, 200);
  }

  // 测试错误处理
  async testErrorHandling() {
    // 测试无效JSON
    try {
      await axios.post(`${config.aiops}/api/anomaly/detect`, 'invalid json', {
        timeout: config.timeout,
        headers: { 'Content-Type': 'application/json' }
      });
      assert.fail('应该返回400错误');
    } catch (error) {
      assert.equal(error.response.status, 400);
    }

    // 测试超时处理
    try {
      await axios.get(`${config.gateway}/api/v1/users/slow`, { timeout: 1000 });
      assert.fail('应该超时');
    } catch (error) {
      assert.equal(error.code, 'ECONNABORTED');
    }
  }

  // 测试并发请求
  async testConcurrentRequests() {
    const requests = [];
    const concurrency = 10;

    for (let i = 0; i < concurrency; i++) {
      requests.push(
        axios.get(`${config.gateway}/health`, { timeout: config.timeout })
      );
    }

    const responses = await Promise.all(requests);

    assert.equal(responses.length, concurrency);
    responses.forEach(response => {
      assert.equal(response.status, 200);
    });
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始智慧乡村微服务集成测试');
    console.log('==========================================');

    // 健康检查测试
    await this.test('API网关健康检查', () => this.testGatewayHealth());
    await this.test('监控服务健康检查', () => this.testMonitoringHealth());
    await this.test('AIOps服务健康检查', () => this.testAIOpsHealth());

    // 功能测试
    await this.test('API网关路由测试', () => this.testGatewayRouting());
    await this.test('监控服务指标收集', () => this.testMonitoringMetrics());

    // AIOps功能测试
    await this.test('AIOps异常检测', () => this.testAIOpsAnomalyDetection());
    await this.test('AIOps预测扩容', () => this.testAIOpsPredictiveScaling());
    await this.test('AIOps自动恢复', () => this.testAIOpsAutoHealing());
    await this.test('AIOps容量规划', () => this.testAIOpsCapacityPlanning());

    // 通信测试
    await this.test('服务间通信测试', () => this.testServiceCommunication());

    // 错误处理测试
    await this.test('错误处理测试', () => this.testErrorHandling());

    // 性能测试
    await this.test('并发请求测试', () => this.testConcurrentRequests());

    // 输出测试结果
    this.printResults();
  }

  // 输出测试结果
  printResults() {
    console.log('\n==========================================');
    console.log('📊 测试结果汇总');
    console.log('==========================================');

    console.log(`✅ 通过: ${this.passedTests}`);
    console.log(`❌ 失败: ${this.failedTests}`);
    console.log(`📈 成功率: ${((this.passedTests / this.testResults.length) * 100).toFixed(2)}%`);

    if (this.failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }

    console.log('\n📋 详细结果:');
    this.testResults.forEach(test => {
      const icon = test.status === 'passed' ? '✅' : '❌';
      console.log(`   ${icon} ${test.name}`);
    });
  }

  // 生成测试报告
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.passedTests,
        failed: this.failedTests,
        successRate: ((this.passedTests / this.testResults.length) * 100).toFixed(2)
      },
      results: this.testResults
    };

    return report;
  }
}

// 主函数
async function main() {
  const tester = new MicroservicesIntegrationTest();

  try {
    await tester.runAllTests();

    // 生成报告
    const report = tester.generateReport();

    // 保存报告到文件
    const fs = require('fs');
    const reportPath = './tests/test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 测试报告已保存到: ${reportPath}`);

    // 根据测试结果设置退出码
    process.exit(tester.failedTests > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n💥 测试运行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = MicroservicesIntegrationTest;