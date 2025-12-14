/**
 * 性能和负载测试
 */

const { performance } = require('perf_hooks');
const request = require('supertest');
const app = require('../../src/app');
const { connectDB, closeDB } = require('../../src/config/database');

describe('Performance and Load Tests', () => {
  const baseUrl = 'http://localhost:3001';
  const concurrentUsers = 50;
  const requestsPerUser = 10;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  describe('API响应时间测试', () => {
    it('登录API应该在500ms内响应', async () => {
      const startTime = performance.now();

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500);
    });

    it('产品列表API应该在1000ms内响应', async () => {
      const startTime = performance.now();

      await request(app)
        .get('/api/v1/ecommerce/agricultural/products')
        .query({ page: 1, limit: 20 });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
    });

    it('用户信息API应该在300ms内响应', async () => {
      const startTime = performance.now();

      await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer valid-token');

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(300);
    });

    it('OCR识别API应该在5秒内完成', async () => {
      const startTime = performance.now();

      await request(app)
        .post('/api/v1/computer-vision/ocr')
        .attach('image', 'tests/fixtures/sample-id-card.jpg')
        .field('type', 'id_card');

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(5000);
    });
  });

  describe('数据库查询性能测试', () => {
    it('产品搜索查询性能测试', async () => {
      const searchTerms = ['有机', '化肥', '种子', '农药', '工具'];
      const queryTimes = [];

      for (const term of searchTerms) {
        const startTime = performance.now();

        await request(app)
          .get('/api/v1/ecommerce/agricultural/products/search')
          .query({ keyword: term });

        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      }

      const averageTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      expect(averageTime).toBeLessThan(800);
    });

    it('订单查询性能测试', async () => {
      const userId = 'testUser123';
      const queryTimes = [];

      // 测试不同页数的查询性能
      for (let page = 1; page <= 5; page++) {
        const startTime = performance.now();

        await request(app)
          .get('/api/v1/ecommerce/orders')
          .query({ userId, page, limit: 20 });

        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      }

      const averageTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      expect(averageTime).toBeLessThan(600);
    });

    it('村民信息查询性能测试', async () => {
      const villageId = 'testVillage123';
      const queryTimes = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        await request(app)
          .get('/api/v1/villagers')
          .query({ villageId, page: 1, limit: 50 });

        const endTime = performance.now();
        queryTimes.push(endTime - startTime);
      }

      const averageTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      expect(averageTime).toBeLessThan(400);
    });
  });

  describe('并发负载测试', () => {
    it('应该支持50个并发用户同时登录', async () => {
      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < concurrentUsers; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              username: `user${i}`,
              password: 'password123'
            })
        );
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 验证所有请求都得到响应
      results.forEach((response, index) => {
        expect(response.status).to.be.oneOf([200, 401]); // 200成功或401用户不存在
      });

      // 验证平均响应时间
      const averageTime = totalTime / concurrentUsers;
      expect(averageTime).toBeLessThan(1000);
    });

    it('应该支持并发产品浏览', async () => {
      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < concurrentUsers; i++) {
        promises.push(
          request(app)
            .get('/api/v1/ecommerce/agricultural/products')
            .query({ page: 1, limit: 10 })
        );
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 验证所有请求都成功
      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // 验证平均响应时间
      const averageTime = totalTime / concurrentUsers;
      expect(averageTime).toBeLessThan(1500);
    });

    it('应该支持并发订单创建', async () => {
      const promises = [];
      const authToken = 'valid-test-token';

      for (let i = 0; i < 20; i++) { // 减少并发数，因为订单创建更复杂
        const orderData = {
          type: 'agricultural_purchase',
          items: [{
            productId: 'product123',
            quantity: 1,
            price: 120
          }],
          shipping: {
            recipient: { name: `用户${i}`, phone: '13800138001' },
            address: {
              province: '浙江省',
              city: '杭州市',
              district: '余杭区',
              detail: `测试地址${i}`
            }
          }
        };

        promises.push(
          request(app)
            .post('/api/v1/ecommerce/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send(orderData)
        );
      }

      const results = await Promise.all(promises);

      // 验证大部分请求成功（可能有部分因为库存不足失败）
      const successCount = results.filter(r => r.status === 201).length;
      expect(successCount).to.be.at.least(10);
    });
  });

  describe('内存使用测试', () => {
    it('应该在大量请求后保持内存稳定', async () => {
      const initialMemory = process.memoryUsage();

      // 执行大量请求
      for (let i = 0; i < 1000; i++) {
        await request(app)
          .get('/api/v1/ecommerce/agricultural/products')
          .query({ page: 1, limit: 20 });
      }

      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('应该在长时间运行后不出现内存泄漏', async () => {
      const measurements = [];

      // 测试5个周期的内存使用
      for (let cycle = 0; cycle < 5; cycle++) {
        const startTime = performance.now();

        // 执行100个请求
        for (let i = 0; i < 100; i++) {
          await request(app)
            .get('/api/v1/ecommerce/agricultural/products')
            .query({ page: (i % 5) + 1, limit: 20 });
        }

        const endTime = performance.now();
        const memory = process.memoryUsage();

        measurements.push({
          cycle: cycle + 1,
          responseTime: endTime - startTime,
          memory: memory.heapUsed
        });

        // 强制垃圾回收
        if (global.gc) {
          global.gc();
        }

        // 等待一段时间
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 验证响应时间稳定
      const responseTimes = measurements.map(m => m.responseTime);
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const responseTimeVariation = (maxResponseTime - minResponseTime) / minResponseTime;

      expect(responseTimeVariation).toBeLessThan(0.5); // 变化不超过50%

      // 验证内存使用稳定
      const memoryUsages = measurements.map(m => m.memory);
      const maxMemory = Math.max(...memoryUsages);
      const minMemory = Math.min(...memoryUsages);
      const memoryVariation = (maxMemory - minMemory) / minMemory;

      expect(memoryVariation).toBeLessThan(0.3); // 变化不超过30%
    });
  });

  describe('CPU使用率测试', () => {
    it('应该在高负载下保持CPU使用率合理', async () => {
      const initialCpuUsage = process.cpuUsage();
      const startTime = performance.now();

      // 执行CPU密集型操作
      const promises = [];
      for (let i = 0; i < 200; i++) {
        promises.push(
          request(app)
            .post('/api/v1/computer-vision/ocr')
            .attach('image', 'tests/fixtures/sample-document.jpg')
            .field('type', 'general')
        );
      }

      await Promise.all(promises);

      const endTime = performance.now();
      const finalCpuUsage = process.cpuUsage(initialCpuUsage);
      const totalTime = endTime - startTime;

      // 计算CPU使用率
      const cpuPercent = ((finalCpuUsage.user + finalCpuUsage.system) / 1000) / totalTime * 100;

      // CPU使用率应该在合理范围内（单核测试）
      expect(cpuPercent).toBeLessThan(200); // 200%表示满载双核
    });
  });

  describe('网络吞吐量测试', () => {
    it('应该支持高并发文件上传', async () => {
      const uploadPromises = [];
      const fileSize = 1024 * 1024; // 1MB文件
      const fileBuffer = Buffer.alloc(fileSize, 'x');

      for (let i = 0; i < 20; i++) {
        uploadPromises.push(
          request(app)
            .post('/api/v1/upload')
            .attach('file', fileBuffer, `test-${i}.jpg`)
            .field('type', 'document')
        );
      }

      const startTime = performance.now();
      const results = await Promise.all(uploadPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const totalBytes = fileSize * 20;
      const throughput = totalBytes / (totalTime / 1000) / (1024 * 1024); // MB/s

      // 验证大部分上传成功
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).to.be.at.least(15);

      // 验证吞吐量合理
      expect(throughput).toBeGreaterThan(1); // 至少1MB/s
    });
  });

  describe('缓存性能测试', () => {
    it('应该有效利用缓存提升响应速度', async () => {
      const uncachedTimes = [];
      const cachedTimes = [];

      // 首次请求（无缓存）
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await request(app).get('/api/v1/system/config');
        const endTime = performance.now();
        uncachedTimes.push(endTime - startTime);
      }

      // 缓存请求
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await request(app).get('/api/v1/system/config');
        const endTime = performance.now();
        cachedTimes.push(endTime - startTime);
      }

      const avgUncachedTime = uncachedTimes.reduce((sum, time) => sum + time, 0) / uncachedTimes.length;
      const avgCachedTime = cachedTimes.reduce((sum, time) => sum + time, 0) / cachedTimes.length;
      const speedImprovement = (avgUncachedTime - avgCachedTime) / avgUncachedTime;

      // 缓存应该显著提升性能
      expect(speedImprovement).toBeGreaterThan(0.3); // 至少30%的性能提升
    });
  });

  describe('错误恢复性能测试', () => {
    it('应该在数据库连接失败时快速响应', async () => {
      // 模拟数据库连接失败
      jest.doMock('../../src/config/database', () => ({
        connectDB: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }));

      const startTime = performance.now();

      try {
        await request(app)
          .get('/api/v1/ecommerce/agricultural/products')
          .expect(500);
      } catch (error) {
        // 忽略错误，我们只关心响应时间
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // 即使在错误情况下，也应该快速响应
      expect(responseTime).toBeLessThan(500);
    });

    it('应该在外部服务不可用时快速超时', async () => {
      // 模拟外部API调用超时
      jest.doMock('axios', () => ({
        post: jest.fn().mockImplementation(() =>
          new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 10000);
          })
        )
      }));

      const startTime = performance.now();

      try {
        await request(app)
          .post('/api/v1/computer-vision/ocr')
          .attach('image', Buffer.from('test'))
          .field('type', 'id_card')
          .expect(504);
      } catch (error) {
        // 忽略错误
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // 应该在合理时间内超时
      expect(responseTime).toBeLessThan(8000);
    });
  });
});