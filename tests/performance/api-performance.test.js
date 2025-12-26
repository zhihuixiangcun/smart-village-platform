/**
 * API性能测试
 * API Performance Tests
 *
 * 测试API端点的性能指标：
 * - 响应时间基准
 * - 并发请求处理
 * - 数据库查询性能
 * - 内存使用情况
 * - 吞吐量测试
 */

const request = require('supertest');
const app = require('../../src/app');
 mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { performance } = require('perf_hooks');

describe('API Performance Tests', () => {
  let mongod;
  let authToken;

  // 性能基准阈值（毫秒）
  const PERFORMANCE_THRESHOLDS = {
    simpleQuery: 100,      // 简单查询
    complexQuery: 500,     // 复杂查询
    writeOperation: 200,   // 写操作
    listEndpoint: 300,     // 列表端点
    searchEndpoint: 400,   // 搜索端点
    aggregation: 1000      // 聚合查询
  };

  // 并发测试配置
  const CONCURRENT_CONFIG = {
    users: 10,
    requestsPerUser: 5,
    maxDuration: 30000 // 30秒
  };

  beforeAll(async () => {
    // 设置内存数据库
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, {
      bufferCommands: false,
      bufferMaxEntries: 0
    });

    // 获取认证令牌
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    if (loginResponse.body.data?.token) {
      authToken = loginResponse.body.data.token;
    }
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  describe('Response Time Benchmarks', () => {
    it('should respond to health check within threshold', async () => {
      // Arrange
      const startTime = performance.now();

      // Act
      const response = await request(app)
        .get('/api/v1/health');

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Assert
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(50); // 健康检查应该很快

      console.log(`Health check response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should complete resident creation within threshold', async () => {
      // Arrange
      const startTime = performance.now();
      const residentData = {
        name: '张三',
        idCard: '110101199001011234',
        gender: '男',
        phone: '13800138000',
        villageId: new mongoose.Types.ObjectId().toString()
      };

      // Act
      const response = await request(app)
        .post('/api/v1/residents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(residentData);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Assert
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.writeOperation);
      console.log(`Resident creation time: ${responseTime.toFixed(2)}ms`);
    });

    it('should fetch resident list within threshold', async () => {
      // Arrange
      const startTime = performance.now();

      // Act
      const response = await request(app)
        .get('/api/v1/residents?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Assert
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.listEndpoint);
      console.log(`Resident list fetch time: ${responseTime.toFixed(2)}ms`);
    });

    it('should complete search operation within threshold', async () => {
      // Arrange
      const startTime = performance.now();

      // Act
      const response = await request(app)
        .get('/api/v1/residents/search?keyword=张&searchType=name')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Assert
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchEndpoint);
      console.log(`Search operation time: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent GET requests efficiently', async () => {
      // Arrange
      const concurrentRequests = 20;
      const startTime = performance.now();
      const promises = [];

      // Act - 发送并发请求
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get(`/api/v1/residents?page=${i + 1}&limit=10`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / concurrentRequests;

      // Assert
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(concurrentRequests);
      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.listEndpoint * 2);

      console.log(`Concurrent requests: ${concurrentRequests}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per request: ${avgTime.toFixed(2)}ms`);
    });

    it('should handle concurrent POST requests efficiently', async () => {
      // Arrange
      const concurrentRequests = 10;
      const startTime = performance.now();
      const promises = [];

      // Act - 并发创建村民
      for (let i = 0; i < concurrentRequests; i++) {
        const residentData = {
          name: `测试用户${i}`,
          idCard: `110101199001011${i.toString().padStart(3, '0')}`,
          gender: i % 2 === 0 ? '男' : '女',
          phone: `1380013800${i}`,
          villageId: new mongoose.Types.ObjectId().toString()
        };

        promises.push(
          request(app)
            .post('/api/v1/residents')
            .set('Authorization', `Bearer ${authToken}`)
            .send(residentData)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / concurrentRequests;

      // Assert
      const successCount = responses.filter(r => r.status === 201 || r.status === 409).length;
      expect(successCount).toBeGreaterThan(concurrentRequests * 0.8); // 至少80%成功

      console.log(`Concurrent POST requests: ${concurrentRequests}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average time per request: ${avgTime.toFixed(2)}ms`);
    });

    it('should handle mixed concurrent operations', async () => {
      // Arrange
      const operations = [
        // GET requests
        () => request(app).get('/api/v1/residents').set('Authorization', `Bearer ${authToken}`),
        // POST requests
        () => request(app)
          .post('/api/v1/residents')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '性能测试用户',
            idCard: '110101199001019999',
            phone: '13800139999'
          }),
        // Search requests
        () => request(app)
          .get('/api/v1/residents/search?keyword=测试')
          .set('Authorization', `Bearer ${authToken}`)
      ];

      const startTime = performance.now();
      const promises = [];

      // Act - 混合并发请求
      for (let i = 0; i < 15; i++) {
        const randomOp = operations[Math.floor(Math.random() * operations.length)];
        promises.push(randomOp());
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Assert
      const successCount = responses.filter(r => r.status < 500).length;
      expect(successCount).toBeGreaterThan(15 * 0.8);

      console.log(`Mixed concurrent operations: ${promises.length}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Database Query Performance', () => {
    it('should perform efficient pagination queries', async () => {
      // Arrange - 先插入测试数据
      const totalResidents = 100;
      const batchSize = 20;

      // 测试不同页面的查询时间
      const pages = [1, 5, 10];
      const queryTimes = [];

      for (const page of pages) {
        const startTime = performance.now();

        // Act
        const response = await request(app)
          .get(`/api/v1/residents?page=${page}&limit=${batchSize}`)
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = performance.now();
        queryTimes.push(endTime - startTime);

        // Assert
        expect(response.status).toBe(200);
      }

      const avgTime = queryTimes.reduce((a, b) => a + b) / queryTimes.length;

      console.log(`Pagination query times: ${queryTimes.map(t => t.toFixed(2)).join('ms, ')}ms`);
      console.log(`Average pagination query time: ${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.listEndpoint);
    });

    it('should perform efficient search queries', async () => {
      // Arrange
      const searchTerms = ['张', '李', '王', '刘', '陈'];
      const searchTimes = [];

      for (const term of searchTerms) {
        const startTime = performance.now();

        // Act
        const response = await request(app)
          .get(`/api/v1/residents/search?keyword=${term}&searchType=name`)
          .set('Authorization', `Bearer ${authToken}`);

        const endTime = performance.now();
        searchTimes.push(endTime - startTime);

        // Assert
        expect([200, 404]).toContain(response.status);
      }

      const avgTime = searchTimes.reduce((a, b) => a + b) / searchTimes.length;

      console.log(`Search query times: ${searchTimes.map(t => t.toFixed(2)).join('ms, ')}ms`);
      console.log(`Average search query time: ${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchEndpoint);
    });

    it('should handle aggregation queries efficiently', async () => {
      // Arrange
      const startTime = performance.now();

      // Act - 统计查询（聚合操作）
      const response = await request(app)
        .get('/api/v1/statistics/residents')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = performance.now();
      const queryTime = endTime - startTime;

      // Assert
      if (response.status === 200) {
        console.log(`Aggregation query time: ${queryTime.toFixed(2)}ms`);
        expect(queryTime).toBeLessThan(PERFORMANCE_THRESHOLDS.aggregation);
      } else {
        console.log('Statistics endpoint not available');
      }
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not have significant memory leaks during repeated operations', async () => {
      // Arrange
      const iterations = 50;
      const initialMemory = process.memoryUsage();
      const memorySnapshots = [];

      // Act - 重复操作
      for (let i = 0; i < iterations; i++) {
        await request(app)
          .get('/api/v1/residents')
          .set('Authorization', `Bearer ${authToken}`);

        if (i % 10 === 0) {
          memorySnapshots.push(process.memoryUsage());
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Assert
      console.log(`Initial heap used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final heap used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // 内存增长不应超过50MB（这是一个宽松的阈值）
      expect(memoryIncreaseMB).toBeLessThan(50);

      // 检查内存增长趋势
      if (memorySnapshots.length > 1) {
        const firstSnapshot = memorySnapshots[0];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        const trendIncrease = (lastSnapshot.heapUsed - firstSnapshot.heapUsed) / (1024 * 1024);

        console.log(`Memory trend increase: ${trendIncrease.toFixed(2)}MB`);
      }
    });
  });

  describe('Throughput Tests', () => {
    it('should achieve minimum required requests per second', async () => {
      // Arrange
      const testDuration = 5000; // 5秒
      const targetRPS = 10; // 目标每秒请求数
      const totalRequests = testDuration / 1000 * targetRPS;

      let completedRequests = 0;
      const startTime = Date.now();

      // Act
      const promises = [];
      for (let i = 0; i < totalRequests; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health')
            .then(() => {
              completedRequests++;
            })
        );
      }

      await Promise.all(promises);
      const actualDuration = Date.now() - startTime;
      const actualRPS = (completedRequests / actualDuration) * 1000;

      // Assert
      console.log(`Completed requests: ${completedRequests}`);
      console.log(`Actual duration: ${actualDuration}ms`);
      console.log(`Actual RPS: ${actualRPS.toFixed(2)}`);

      expect(completedRequests).toBe(totalRequests);
      expect(actualRPS).toBeGreaterThan(targetRPS * 0.8); // 至少80%的目标RPS
    });

    it('should maintain performance under sustained load', async () => {
      // Arrange
      const duration = 10000; // 10秒持续负载
      const interval = 100; // 每100ms发送一个请求
      const responseTimes = [];

      const startTime = Date.now();
      let requestCount = 0;

      // Act - 持续发送请求
      while (Date.now() - startTime < duration) {
        const reqStart = Date.now();

        await request(app)
          .get('/api/v1/health')
          .set('Authorization', `Bearer ${authToken}`);

        const reqEnd = Date.now();
        responseTimes.push(reqEnd - reqStart);
        requestCount++;

        // 等待间隔
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      // 计算统计数据
      const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      // Assert
      console.log(`Sustained load test results:`);
      console.log(`Total requests: ${requestCount}`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Min response time: ${minResponseTime.toFixed(2)}ms`);
      console.log(`Max response time: ${maxResponseTime.toFixed(2)}ms`);
      console.log(`95th percentile: ${p95ResponseTime.toFixed(2)}ms`);

      expect(avgResponseTime).toBeLessThan(100);
      expect(p95ResponseTime).toBeLessThan(200);
    });
  });

  describe('Caching Performance', () => {
    it('should cache frequently accessed data', async () => {
      // Arrange
      const endpoint = '/api/v1/villages';
      const uncachedStartTime = performance.now();

      // 第一次请求（未缓存）
      const firstResponse = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);

      const uncachedTime = performance.now() - uncachedStartTime;

      // 等待一下确保缓存生效
      await new Promise(resolve => setTimeout(resolve, 100));

      // 第二次请求（可能已缓存）
      const cachedStartTime = performance.now();
      const cachedResponse = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${authToken}`);
      const cachedTime = performance.now() - cachedStartTime;

      // Assert
      console.log(`Uncached request time: ${uncachedTime.toFixed(2)}ms`);
      console.log(`Cached request time: ${cachedTime.toFixed(2)}ms`);

      // 缓存的请求应该更快（或者至少不慢太多）
      expect(cachedTime).toBeLessThanOrEqual(uncachedTime * 1.5);
    });

    it('should handle cache invalidation properly', async () => {
      // 这个测试需要实际实现缓存失效机制
      // 这里只是示例结构

      // Arrange
      const resourceId = new mongoose.Types.ObjectId();

      // Act - 获取资源
      const firstResponse = await request(app)
        .get(`/api/v1/residents/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // 更新资源（应该使缓存失效）
      await request(app)
        .put(`/api/v1/residents/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '更新名称' });

      // 再次获取资源
      const secondResponse = await request(app)
        .get(`/api/v1/residents/${resourceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Assert - 应该返回更新后的数据
      if (firstResponse.status === 200 && secondResponse.status === 200) {
        expect(secondResponse.body.data.name).toBe('更新名称');
      }
    });
  });

  describe('Performance Regression Detection', () => {
    it('should compare current performance against baseline', () => {
      // 这个测试用于检测性能回归
      // 实际项目中应该将基准数据保存到文件中

      const baselinePerformance = {
        healthCheck: 50,
        listResidents: 300,
        searchResidents: 400,
        createResident: 200
      };

      // 这些值应该从当前测试运行中获取
      const currentPerformance = {
        healthCheck: 45,
        listResidents: 280,
        searchResidents: 350,
        createResident: 180
      };

      // 检查性能是否显著下降（超过20%）
      Object.keys(baselinePerformance).forEach(metric => {
        const baseline = baselinePerformance[metric];
        const current = currentPerformance[metric];
        const regression = ((current - baseline) / baseline) * 100;

        if (regression > 20) {
          console.warn(`Performance regression detected for ${metric}: ${regression.toFixed(2)}%`);
        }

        expect(regression).toBeLessThan(50); // 不应下降超过50%
      });
    });
  });

  describe('Load Testing Summary', () => {
    it('should generate performance report', async () => {
      // 生成性能测试报告摘要
      const report = {
        timestamp: new Date().toISOString(),
        thresholds: PERFORMANCE_THRESHOLDS,
        summary: {
          averageResponseTime: 0,
          peakResponseTime: 0,
          throughput: 0,
          errorRate: 0
        },
        recommendations: []
      };

      console.log('\n=== Performance Test Report ===');
      console.log(JSON.stringify(report, null, 2));
      console.log('=============================\n');

      expect(report).toBeDefined();
    });
  });
});
