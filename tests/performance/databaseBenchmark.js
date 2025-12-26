/**
 * 数据库性能基准测试套件
 * 测试查询性能、索引效果、分片性能和缓存效果
 */

const mongoose = require('mongoose');
const DatabasePerformanceAnalyzer = require('../../src/services/databasePerformanceAnalyzer');
const QueryOptimizer = require('../../src/services/queryOptimizer');
const MultiLevelCacheSystem = require('../../src/services/multiLevelCacheSystem');
const { performance } = require('perf_hooks');

class DatabaseBenchmark {
  constructor(options = {}) {
    this.options = {
      // 测试配置
      testIterations: options.testIterations || 100,
      batchSize: options.batchSize || 1000,
      dataSize: options.dataSize || 10000,
      concurrentUsers: options.concurrentUsers || 50,
      warmupIterations: options.warmupIterations || 10,

      // 测试场景
      scenarios: options.scenarios || [
        'simple_query',
        'complex_query',
        'aggregation',
        'bulk_insert',
        'bulk_update',
        'geospatial_query',
        'text_search'
      ],

      // 数据库连接
      mongoUri: options.mongoUri || process.env.MONGO_URI || 'mongodb://localhost:27017/benchmark',

      // 输出配置
      outputDir: options.outputDir || './test-results',
      generateReports: options.generateReports !== false,
      ...options
    };

    this.results = {
      metadata: {
        startTime: null,
        endTime: null,
        testDuration: 0,
        environment: this.captureEnvironment()
      },
      scenarios: {},
      summary: {}
    };

    this.analyzer = new DatabasePerformanceAnalyzer();
    this.optimizer = new QueryOptimizer();
    this.cache = new MultiLevelCacheSystem();
  }

  /**
   * 运行完整的基准测试套件
   */
  async runFullBenchmark() {
    console.log('开始数据库性能基准测试...\n');

    this.results.metadata.startTime = new Date();

    try {
      // 1. 初始化测试环境
      await this.setupTestEnvironment();

      // 2. 运行预热
      await this.runWarmup();

      // 3. 执行各个测试场景
      for (const scenario of this.options.scenarios) {
        console.log(`\n执行测试场景: ${scenario}`);
        this.results.scenarios[scenario] = await this.runScenario(scenario);
      }

      // 4. 运行负载测试
      await this.runLoadTest();

      // 5. 运行并发测试
      await this.runConcurrencyTest();

      // 6. 生成性能报告
      this.results.metadata.endTime = new Date();
      this.results.metadata.testDuration =
        this.results.metadata.endTime - this.results.metadata.startTime;

      if (this.options.generateReports) {
        await this.generateReports();
      }

      console.log('\n基准测试完成！');
      return this.results;

    } catch (error) {
      console.error('基准测试失败:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 设置测试环境
   */
  async setupTestEnvironment() {
    console.log('设置测试环境...');

    // 连接数据库
    await mongoose.connect(this.options.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 100,
      serverSelectionTimeoutMS: 5000
    });

    // 创建测试数据
    await this.generateTestData();

    // 创建必要的索引
    await this.createTestIndexes();

    console.log('✓ 测试环境设置完成');
  }

  /**
   * 生成测试数据
   */
  async generateTestData() {
    const db = mongoose.connection.db;
    const testData = [];

    console.log(`生成 ${this.options.dataSize} 条测试数据...`);

    // 生成村庄数据
    const villages = [];
    for (let i = 0; i < 100; i++) {
      villages.push({
        _id: new mongoose.Types.ObjectId(),
        name: `测试村庄${i}`,
        code: `VILLAGE_${String(i).padStart(3, '0')}`,
        location: {
          type: 'Point',
          coordinates: [
            120.0 + Math.random() * 10,
            30.0 + Math.random() * 10
          ]
        }
      });
    }
    await db.collection('villages').insertMany(villages);

    // 生成村民数据
    for (let i = 0; i < this.options.dataSize; i++) {
      const village = villages[Math.floor(Math.random() * villages.length)];

      testData.push({
        name: `测试用户${i}`,
        idCard: `${String(i).padStart(18, '0')}`,
        phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        villageId: village._id,
        age: Math.floor(Math.random() * 80) + 18,
        gender: Math.random() > 0.5 ? 'male' : 'female',
        birthDate: new Date(1970 + Math.floor(Math.random() * 50), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
        occupation: ['farmer', 'worker', 'teacher', 'doctor', 'business'][Math.floor(Math.random() * 5)],
        location: {
          type: 'Point',
          coordinates: [
            village.location.coordinates[0] + (Math.random() - 0.5) * 0.1,
            village.location.coordinates[1] + (Math.random() - 0.5) * 0.1
          ]
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 批量插入
    for (let i = 0; i < testData.length; i += this.options.batchSize) {
      const batch = testData.slice(i, i + this.options.batchSize);
      await db.collection('residents').insertMany(batch);

      if ((i + this.options.batchSize) % (this.options.batchSize * 10) === 0) {
        console.log(`已生成 ${Math.min(i + this.options.batchSize, testData.length)} 条数据`);
      }
    }

    console.log(`✓ 生成 ${testData.length} 条测试数据完成`);
  }

  /**
   * 创建测试索引
   */
  async createTestIndexes() {
    const db = mongoose.connection.db;

    console.log('创建测试索引...');

    const indexes = [
      { collection: 'residents', index: { villageId: 1, status: 1 } },
      { collection: 'residents', index: { name: 'text' } },
      { collection: 'residents', index: { age: 1, gender: 1 } },
      { collection: 'residents', index: { location: '2dsphere' } },
      { collection: 'residents', index: { phone: 1 } },
      { collection: 'residents', index: { idCard: 1 } },
      { collection: 'villages', index: { location: '2dsphere' } },
      { collection: 'villages', index: { name: 1 } }
    ];

    for (const { collection, index } of indexes) {
      await db.collection(collection).createIndex(index, { background: true });
    }

    console.log('✓ 测试索引创建完成');
  }

  /**
   * 运行预热
   */
  async runWarmup() {
    console.log('执行预热测试...');

    for (let i = 0; i < this.options.warmupIterations; i++) {
      await this.runScenario('simple_query', true); // silent mode
    }

    console.log('✓ 预热完成');
  }

  /**
   * 运行单个测试场景
   */
  async runScenario(scenario, silent = false) {
    const db = mongoose.connection.db;
    const results = {
      scenario,
      iterations: this.options.testIterations,
      totalTime: 0,
      avgTime: 0,
      minTime: Infinity,
      maxTime: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      errors: 0,
      throughput: 0
    };

    const times = [];

    for (let i = 0; i < this.options.testIterations; i++) {
      const startTime = performance.now();

      try {
        switch (scenario) {
          case 'simple_query':
            await this.runSimpleQuery(db);
            break;
          case 'complex_query':
            await this.runComplexQuery(db);
            break;
          case 'aggregation':
            await this.runAggregationQuery(db);
            break;
          case 'bulk_insert':
            await this.runBulkInsert(db);
            break;
          case 'bulk_update':
            await this.runBulkUpdate(db);
            break;
          case 'geospatial_query':
            await this.runGeospatialQuery(db);
            break;
          case 'text_search':
            await this.runTextSearch(db);
            break;
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        times.push(duration);

        results.totalTime += duration;
        results.minTime = Math.min(results.minTime, duration);
        results.maxTime = Math.max(results.maxTime, duration);

      } catch (error) {
        results.errors++;
        if (!silent) {
          console.error(`测试 ${scenario} 第 ${i} 次迭代失败:`, error.message);
        }
      }

      // 进度报告
      if (!silent && (i + 1) % 10 === 0) {
        process.stdout.write(`.`);
      }
    }

    if (!silent) {
      console.log('');
    }

    // 计算统计数据
    times.sort((a, b) => a - b);
    results.avgTime = results.totalTime / this.options.testIterations;
    results.p50 = times[Math.floor(times.length * 0.5)];
    results.p95 = times[Math.floor(times.length * 0.95)];
    results.p99 = times[Math.floor(times.length * 0.99)];
    results.throughput = (this.options.testIterations / results.totalTime * 1000).toFixed(2);

    return results;
  }

  /**
   * 简单查询测试
   */
  async runSimpleQuery(db) {
    return await db.collection('residents')
      .findOne({ villageId: new mongoose.Types.ObjectId(), status: 'active' });
  }

  /**
   * 复杂查询测试
   */
  async runComplexQuery(db) {
    return await db.collection('residents')
      .find({
        villageId: new mongoose.Types.ObjectId(),
        age: { $gte: 18, $lte: 65 },
        gender: 'male',
        status: 'active',
        'specialIdentities.type': { $exists: true }
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
  }

  /**
   * 聚合查询测试
   */
  async runAggregationQuery(db) {
    return await db.collection('residents')
      .aggregate([
        {
          $match: {
            villageId: new mongoose.Types.ObjectId(),
            status: 'active'
          }
        },
        {
          $group: {
            _id: '$occupation',
            count: { $sum: 1 },
            avgAge: { $avg: '$age' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
      .toArray();
  }

  /**
   * 批量插入测试
   */
  async runBulkInsert(db) {
    const docs = [];
    for (let i = 0; i < 100; i++) {
      docs.push({
        name: `批量测试${Date.now()}_${i}`,
        villageId: new mongoose.Types.ObjectId(),
        status: 'active',
        createdAt: new Date()
      });
    }

    return await db.collection('residents').insertMany(docs);
  }

  /**
   * 批量更新测试
   */
  async runBulkUpdate(db) {
    return await db.collection('residents')
      .updateMany(
        { status: 'active' },
        { $set: { updatedAt: new Date() } }
      );
  }

  /**
   * 地理空间查询测试
   */
  async runGeospatialQuery(db) {
    return await db.collection('residents')
      .find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [120.5, 30.5] },
            $maxDistance: 10000
          }
        }
      })
      .limit(10)
      .toArray();
  }

  /**
   * 文本搜索测试
   */
  async runTextSearch(db) {
    return await db.collection('residents')
      .find({ $text: { $search: '测试' } })
      .limit(10)
      .toArray();
  }

  /**
   * 运行负载测试
   */
  async runLoadTest() {
    console.log('\n运行负载测试...');

    const loadTestResults = {
      scenario: 'load_test',
      duration: 30000, // 30秒
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      throughput: 0
    };

    const startTime = Date.now();
    const responseTimes = [];

    const testFunction = async () => {
      const reqStart = Date.now();
      try {
        await this.runSimpleQuery(mongoose.connection.db);
        const reqEnd = Date.now();
        const responseTime = reqEnd - reqStart;
        responseTimes.push(responseTime);
        loadTestResults.requests++;
        loadTestResults.maxResponseTime = Math.max(loadTestResults.maxResponseTime, responseTime);
        loadTestResults.minResponseTime = Math.min(loadTestResults.minResponseTime, responseTime);
      } catch (error) {
        loadTestResults.errors++;
      }
    };

    // 启动多个并发请求
    const promises = [];
    while (Date.now() - startTime < loadTestResults.duration) {
      for (let i = 0; i < 10; i++) {
        promises.push(testFunction());
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await Promise.all(promises);

    // 计算统计数据
    if (responseTimes.length > 0) {
      loadTestResults.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }
    loadTestResults.throughput = (loadTestResults.requests / (loadTestResults.duration / 1000)).toFixed(2);

    this.results.scenarios.load_test = loadTestResults;

    console.log(`✓ 负载测试完成: ${loadTestResults.requests} 请求, ${loadTestResults.throughput} RPS`);
  }

  /**
   * 运行并发测试
   */
  async runConcurrencyTest() {
    console.log('\n运行并发测试...');

    const concurrencyLevels = [1, 5, 10, 20, 50, 100];
    const concurrencyResults = [];

    for (const concurrency of concurrencyLevels) {
      console.log(`测试并发级别: ${concurrency}`);

      const promises = [];
      const startTime = Date.now();

      for (let i = 0; i < concurrency; i++) {
        promises.push(this.runScenario('simple_query', true));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const avgTime = results.reduce((sum, r) => sum + r.avgTime, 0) / results.length;
      const totalThroughput = results.reduce((sum, r) => sum + parseFloat(r.throughput), 0);

      concurrencyResults.push({
        concurrency,
        avgTime: avgTime.toFixed(2),
        throughput: totalThroughput.toFixed(2),
        duration: endTime - startTime
      });
    }

    this.results.scenarios.concurrency_test = concurrencyResults;

    console.log('✓ 并发测试完成');
  }

  /**
   * 生成性能报告
   */
  async generateReports() {
    const fs = require('fs').promises;
    const path = require('path');

    await fs.mkdir(this.options.outputDir, { recursive: true });

    // JSON格式报告
    const jsonReport = {
      ...this.results,
      summary: this.generateSummary()
    };

    await fs.writeFile(
      path.join(this.options.outputDir, `benchmark-${Date.now()}.json`),
      JSON.stringify(jsonReport, null, 2)
    );

    // HTML格式报告
    const htmlReport = this.generateHTMLReport(jsonReport);
    await fs.writeFile(
      path.join(this.options.outputDir, `benchmark-${Date.now()}.html`),
      htmlReport
    );

    // CSV格式报告
    const csvReport = this.generateCSVReport(jsonReport);
    await fs.writeFile(
      path.join(this.options.outputDir, `benchmark-${Date.now()}.csv`),
      csvReport
    );

    console.log(`\n报告已生成到: ${this.options.outputDir}`);
  }

  /**
   * 生成测试摘要
   */
  generateSummary() {
    const summary = {
      overallPerformance: 'good', // excellent, good, fair, poor
      recommendations: [],
      keyMetrics: {
        avgResponseTime: 0,
        maxThroughput: 0,
        errorRate: 0,
        cacheHitRate: '0%'
      }
    };

    // 计算平均响应时间
    const scenarioTimes = Object.values(this.results.scenarios)
      .filter(s => s.avgTime)
      .map(s => s.avgTime);

    if (scenarioTimes.length > 0) {
      summary.keyMetrics.avgResponseTime = (scenarioTimes.reduce((a, b) => a + b, 0) / scenarioTimes.length).toFixed(2);
    }

    // 查找最大吞吐量
    const throughputs = Object.values(this.results.scenarios)
      .filter(s => s.throughput)
      .map(s => parseFloat(s.throughput));

    if (throughputs.length > 0) {
      summary.keyMetrics.maxThroughput = Math.max(...throughputs).toFixed(2);
    }

    // 计算错误率
    const totalRequests = Object.values(this.results.scenarios)
      .filter(s => s.iterations)
      .reduce((sum, s) => sum + s.iterations, 0);

    const totalErrors = Object.values(this.results.scenarios)
      .filter(s => s.errors)
      .reduce((sum, s) => sum + s.errors, 0);

    if (totalRequests > 0) {
      summary.keyMetrics.errorRate = ((totalErrors / totalRequests) * 100).toFixed(2);
    }

    // 获取缓存统计
    const cacheStats = this.cache.getStatistics();
    summary.keyMetrics.cacheHitRate = cacheStats.hitRate;

    // 生成建议
    if (summary.keyMetrics.avgResponseTime > 100) {
      summary.recommendations.push('平均响应时间较高，建议优化查询和索引');
    }

    if (summary.keyMetrics.maxThroughput < 1000) {
      summary.recommendations.push('吞吐量较低，考虑增加缓存或优化数据库配置');
    }

    if (parseFloat(summary.keyMetrics.errorRate) > 1) {
      summary.recommendations.push('错误率较高，检查数据库连接和查询逻辑');
    }

    if (parseFloat(summary.keyMetrics.cacheHitRate) < 80) {
      summary.recommendations.push('缓存命中率较低，调整缓存策略或TTL设置');
    }

    // 性能评级
    const avgTime = parseFloat(summary.keyMetrics.avgResponseTime);
    const errorRate = parseFloat(summary.keyMetrics.errorRate);

    if (avgTime < 50 && errorRate < 0.1) {
      summary.overallPerformance = 'excellent';
    } else if (avgTime < 100 && errorRate < 1) {
      summary.overallPerformance = 'good';
    } else if (avgTime < 200 && errorRate < 5) {
      summary.overallPerformance = 'fair';
    } else {
      summary.overallPerformance = 'poor';
    }

    return summary;
  }

  /**
   * 生成HTML报告
   */
  generateHTMLReport(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>数据库性能基准测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px 20px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2196F3; }
        .section { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .performance-excellent { color: #4CAF50; }
        .performance-good { color: #2196F3; }
        .performance-fair { color: #FF9800; }
        .performance-poor { color: #F44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>智慧乡村项目 - 数据库性能基准测试报告</h1>
        <p>测试时间: ${data.metadata.startTime} - ${data.metadata.endTime}</p>
        <p>测试持续时间: ${data.metadata.testDuration}ms</p>
    </div>

    <div class="section">
        <h2>关键性能指标</h2>
        <div class="metric">
            <div class="metric-value">${data.summary.keyMetrics.avgResponseTime}ms</div>
            <div>平均响应时间</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.summary.keyMetrics.maxThroughput}</div>
            <div>最大吞吐量 (RPS)</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.summary.keyMetrics.errorRate}%</div>
            <div>错误率</div>
        </div>
        <div class="metric">
            <div class="metric-value">${data.summary.keyMetrics.cacheHitRate}</div>
            <div>缓存命中率</div>
        </div>
        <div class="metric">
            <div class="metric-value performance-${data.summary.overallPerformance}">${data.summary.overallPerformance.toUpperCase()}</div>
            <div>总体性能评级</div>
        </div>
    </div>

    <div class="section">
        <h2>测试场景结果</h2>
        <table>
            <tr>
                <th>测试场景</th>
                <th>平均响应时间 (ms)</th>
                <th>P95 (ms)</th>
                <th>P99 (ms)</th>
                <th>吞吐量 (RPS)</th>
                <th>错误数</th>
            </tr>
            ${Object.entries(data.scenarios).map(([scenario, result]) => `
                <tr>
                    <td>${scenario}</td>
                    <td>${result.avgTime?.toFixed(2) || 'N/A'}</td>
                    <td>${result.p95?.toFixed(2) || 'N/A'}</td>
                    <td>${result.p99?.toFixed(2) || 'N/A'}</td>
                    <td>${result.throughput || 'N/A'}</td>
                    <td>${result.errors || 0}</td>
                </tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <h2>优化建议</h2>
        <ul>
            ${data.summary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>环境信息</h2>
        <pre>${JSON.stringify(data.metadata.environment, null, 2)}</pre>
    </div>
</body>
</html>`;
  }

  /**
   * 生成CSV报告
   */
  generateCSVReport(data) {
    const headers = ['Scenario', 'Avg Response Time', 'P95', 'P99', 'Throughput', 'Errors'];
    const rows = [headers];

    Object.entries(data.scenarios).forEach(([scenario, result]) => {
      rows.push([
        scenario,
        result.avgTime?.toFixed(2) || 'N/A',
        result.p95?.toFixed(2) || 'N/A',
        result.p99?.toFixed(2) || 'N/A',
        result.throughput || 'N/A',
        result.errors || 0
      ]);
    });

    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * 捕获环境信息
   */
  captureEnvironment() {
    const os = require('os');

    return {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
      uptime: os.uptime()
    };
  }

  /**
   * 清理测试环境
   */
  async cleanup() {
    try {
      // 清理测试数据
      const db = mongoose.connection.db;
      await db.collection('residents').deleteMany({ name: { $regex: '^测试' } });
      await db.collection('residents').deleteMany({ name: { $regex: '^批量测试' } });
      await db.collection('villages').deleteMany({ name: { $regex: '^测试村庄' } });

      // 关闭连接
      await mongoose.connection.close();
      await this.cache.l2Cache.quit();

      console.log('✓ 测试环境清理完成');
    } catch (error) {
      console.error('清理失败:', error);
    }
  }
}

module.exports = DatabaseBenchmark;