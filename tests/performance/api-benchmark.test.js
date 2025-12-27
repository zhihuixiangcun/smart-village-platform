/**
 * API性能基准测试
 * 测试关键API端点的响应时间和吞吐量
 */

const request = require('supertest');
const { app } = require('../../src/app');

describe('API性能基准测试', () => {
  let server;
  const performanceThresholds = {
    healthCheck: 100,      // 健康检查 < 100ms
    simpleQuery: 500,      // 简单查询 < 500ms
    complexQuery: 1000,    // 复杂查询 < 1000ms
    writeOperation: 800,   // 写操作 < 800ms
    batchOperation: 3000   // 批量操作 < 3000ms
  };

  beforeAll(() => {
    server = app.listen(0); // 随机端口
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('健康检查性能', () => {
    test('GET /health 响应时间应该 < 100ms', async () => {
      const iterations = 100;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app).get('/health');
        responseTimes.push(Date.now() - start);
      }

      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...responseTimes);
      const p95Time = responseTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

      console.log('健康检查性能 (' + iterations + '次请求):');
      console.log('  平均响应时间: ' + avgTime.toFixed(2) + 'ms');
      console.log('  最大响应时间: ' + maxTime + 'ms');
      console.log('  P95响应时间: ' + p95Time + 'ms');

      expect(avgTime).toBeLessThan(performanceThresholds.healthCheck);
      expect(p95Time).toBeLessThan(performanceThresholds.healthCheck * 2);
    });
  });

  describe('村民查询性能', () => {
    test('GET /api/v1/residents 响应时间应该 < 500ms', async () => {
      const iterations = 50;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .get('/api/v1/residents')
          .query({ page: 1, limit: 20 });
        responseTimes.push(Date.now() - start);
      }

      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;
      const p95Time = responseTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

      console.log('村民列表查询性能 (' + iterations + '次请求):');
      console.log('  平均响应时间: ' + avgTime.toFixed(2) + 'ms');
      console.log('  P95响应时间: ' + p95Time + 'ms');

      expect(avgTime).toBeLessThan(performanceThresholds.simpleQuery);
    });
  });

  describe('认证服务性能', () => {
    test('POST /api/v1/auth/login 响应时间应该 < 500ms', async () => {
      const iterations = 30;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            username: 'testuser',
            password: 'password123'
          });
        responseTimes.push(Date.now() - start);
      }

      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;
      const p95Time = responseTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];

      console.log('用户登录性能 (' + iterations + '次请求):');
      console.log('  平均响应时间: ' + avgTime.toFixed(2) + 'ms');
      console.log('  P95响应时间: ' + p95Time + 'ms');

      expect(avgTime).toBeLessThan(performanceThresholds.simpleQuery);
    });
  });

  describe('系统监控性能', () => {
    test('GET /api/monitoring/metrics 响应时间应该 < 200ms', async () => {
      const iterations = 100;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app).get('/api/monitoring/metrics');
        responseTimes.push(Date.now() - start);
      }

      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...responseTimes);

      console.log('系统监控性能 (' + iterations + '次请求):');
      console.log('  平均响应时间: ' + avgTime.toFixed(2) + 'ms');
      console.log('  最大响应时间: ' + maxTime + 'ms');

      expect(avgTime).toBeLessThan(200);
    });
  });

  describe('并发请求性能', () => {
    test('应该能够处理50个并发请求', async () => {
      const concurrency = 50;
      const startTime = Date.now();

      const promises = Array(concurrency).fill(null).map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / concurrency;
      const requestsPerSecond = (concurrency / totalTime) * 1000;

      console.log('并发请求性能 (' + concurrency + '个并发):');
      console.log('  总耗时: ' + totalTime + 'ms');
      console.log('  平均响应时间: ' + avgTime.toFixed(2) + 'ms');
      console.log('  每秒请求数: ' + requestsPerSecond.toFixed(2));

      responses.forEach(response => {
        expect([200, 304]).toContain(response.status);
      });

      expect(requestsPerSecond).toBeGreaterThan(100); // 至少100 req/s
    });
  });
});
