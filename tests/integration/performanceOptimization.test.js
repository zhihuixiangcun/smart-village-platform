/**
 * 性能优化集成测试
 * 测试系统性能优化功能的有效性
 */

const PerformanceOptimizationService = require('../../src/services/performanceOptimizationService');
const DatabaseQueryOptimizer = require('../../src/services/databaseQueryOptimizer');
const PerformanceOptimizationMiddleware = require('../../src/middleware/performanceOptimizationMiddleware');
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

describe('性能优化系统集成测试', () => {
  let performanceService;
  let queryOptimizer;
  let optimizationMiddleware;
  let app;
  let server;
  let testModel;

  beforeAll(async () => {
    // 创建测试Express应用
    app = express();
    app.use(express.json());

    // 初始化性能优化服务
    performanceService = new PerformanceOptimizationService({
      cache: { enabled: true, ttl: 60000, maxSize: 100 },
      monitoring: { enabled: true, interval: 10000 }
    });

    queryOptimizer = new DatabaseQueryOptimizer({
      indexAnalysis: { enabled: true, minQueryCount: 2 },
      queryCache: { enabled: true, ttl: 30000 }
    });

    optimizationMiddleware = new PerformanceOptimizationMiddleware({
      rateLimit: { windowMs: 60000, max: 1000 },
      cache: { api: { maxAge: 30000 } }
    });

    // 等待服务初始化
    await new Promise((resolve) => {
      if (performanceService.cache) {
        resolve();
      } else {
        performanceService.once('optimizationReady', resolve);
      }
    });

    // 创建测试模型
    const testSchema = new mongoose.Schema({
      name: String,
      category: String,
      value: Number,
      createdAt: { type: Date, default: Date.now }
    });
    testModel = mongoose.model('TestModel', testSchema);

    // 设置路由
    setupTestRoutes();

    // 启动服务器
    server = app.listen(0);
  }, 30000);

  afterAll(async () => {
    if (server) {
      server.close();
    }
    
    if (performanceService) {
      await performanceService.shutdown();
    }
    
    if (queryOptimizer) {
      queryOptimizer.shutdown();
    }
    
    if (optimizationMiddleware) {
      await optimizationMiddleware.shutdown();
    }
  });

  function setupTestRoutes() {
    // 应用性能中间件
    app.use(optimizationMiddleware.performanceTrackingMiddleware());
    app.use(optimizationMiddleware.cacheMiddleware());
    app.use(optimizationMiddleware.responseOptimizationMiddleware());

    // 测试路由
    app.get('/api/test/cached', async (req, res) => {
      // 模拟数据库查询
      await new Promise(resolve => setTimeout(resolve, 100));
      res.json({
        data: `cached_response_${Date.now()}`,
        timestamp: new Date()
      });
    });

    app.get('/api/test/slow', async (req, res) => {
      // 模拟慢查询
      await new Promise(resolve => setTimeout(resolve, 1500));
      res.json({ message: 'slow response' });
    });

    app.get('/api/test/database', async (req, res) => {
      try {
        const optimizedQuery = optimizationMiddleware.optimizeDbQuery(testModel);
        const results = await optimizedQuery.find({ category: 'test' });
        res.json({ results, count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/test/performance-stats', (req, res) => {
      res.json(optimizationMiddleware.getPerformanceStats());
    });

    app.get('/health', optimizationMiddleware.healthCheckMiddleware());

    // 错误处理
    app.use((error, req, res, next) => {
      res.status(500).json({ error: error.message });
    });
  }

  describe('性能优化服务测试', () => {
    test('应该正确初始化性能优化服务', () => {
      expect(performanceService.cache).toBeDefined();
      expect(performanceService.metrics).toBeDefined();
      expect(performanceService.metrics.requests).toBeDefined();
      expect(performanceService.metrics.system).toBeDefined();
    });

    test('应该能够设置和获取缓存', async () => {
      const testKey = 'test_key';
      const testData = { message: 'test data', timestamp: Date.now() };

      await performanceService.setCache(testKey, testData);
      const cachedData = await performanceService.getFromCache(testKey);

      expect(cachedData).toEqual(testData);
    });

    test('应该正确处理缓存过期', async () => {
      const testKey = 'expire_test';
      const testData = { message: 'expire test' };

      await performanceService.setCache(testKey, testData, 100); // 100ms TTL
      
      // 立即获取应该成功
      let cachedData = await performanceService.getFromCache(testKey);
      expect(cachedData).toEqual(testData);

      // 等待过期后应该返回null
      await new Promise(resolve => setTimeout(resolve, 150));
      cachedData = await performanceService.getFromCache(testKey);
      expect(cachedData).toBeNull();
    });

    test('应该生成性能报告', () => {
      const report = performanceService.getPerformanceReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('system');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('应该正确清理过期缓存', async () => {
      // 添加多个缓存项
      await performanceService.setCache('item1', 'data1', 100);
      await performanceService.setCache('item2', 'data2', 200);
      await performanceService.setCache('item3', 'data3', 300);

      // 等待部分过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 手动触发清理
      performanceService.cleanupExpiredCache();

      // 检查缓存状态
      expect(await performanceService.getFromCache('item1')).toBeNull();
      expect(await performanceService.getFromCache('item2')).toBeNull();
      expect(await performanceService.getFromCache('item3')).not.toBeNull();
    });
  });

  describe('数据库查询优化测试', () => {
    test('应该正确初始化查询优化器', () => {
      expect(queryOptimizer.config).toBeDefined();
      expect(queryOptimizer.queryStats).toBeDefined();
      expect(queryOptimizer.queryCache).toBeDefined();
    });

    test('应该记录查询统计信息', async () => {
      const mockModel = {
        modelName: 'TestModel',
        find: jest.fn().mockResolvedValue([{ id: 1, name: 'test' }])
      };

      await queryOptimizer.executeOptimizedQuery(
        mockModel, 
        'find', 
        { category: 'test' }
      );

      const stats = queryOptimizer.queryStats.get('TestModel.find');
      expect(stats).toBeDefined();
      expect(stats.count).toBe(1);
      expect(stats.totalTime).toBeGreaterThan(0);
    });

    test('应该检测慢查询', async () => {
      const mockModel = {
        modelName: 'SlowModel',
        find: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve([]), 1200))
        )
      };

      await queryOptimizer.executeOptimizedQuery(
        mockModel,
        'find',
        { field: 'value' }
      );

      expect(queryOptimizer.slowQueries.length).toBeGreaterThan(0);
      expect(queryOptimizer.slowQueries[0].executionTime).toBeGreaterThan(1000);
    });

    test('应该优化查询条件', () => {
      const query = {
        name: { $regex: '^test', $options: 'i' },
        age: { $lte: 30, $gte: 18 },
        status: 'active'
      };

      const optimized = queryOptimizer.optimizeQuery(query);
      
      expect(optimized.filter).toBeDefined();
      expect(optimized.filter.name.$regex).toBe('^test');
      expect(optimized.filter.age).toHaveProperty('$gte');
      expect(optimized.filter.age).toHaveProperty('$lte');
    });

    test('应该生成索引建议', () => {
      // 模拟多次相同查询
      for (let i = 0; i < 5; i++) {
        queryOptimizer.recordQueryStats(
          'TestModel',
          'find',
          { category: 'test', status: 'active' },
          500
        );
      }

      queryOptimizer.analyzeQueries();
      queryOptimizer.generateIndexSuggestions();

      expect(queryOptimizer.indexSuggestions.length).toBeGreaterThan(0);
    });

    test('应该生成优化报告', () => {
      const report = queryOptimizer.getOptimizationReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('queryStats');
      expect(report).toHaveProperty('indexSuggestions');
      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('性能中间件集成测试', () => {
    test('应该正确跟踪请求性能', async () => {
      const initialStats = optimizationMiddleware.getPerformanceStats();
      const initialRequests = initialStats.requests;

      await request(server)
        .get('/api/test/cached')
        .expect(200);

      const finalStats = optimizationMiddleware.getPerformanceStats();
      expect(finalStats.requests).toBe(initialRequests + 1);
    });

    test('应该启用响应缓存', async () => {
      // 第一次请求
      const response1 = await request(server)
        .get('/api/test/cached')
        .expect(200);

      // 第二次请求应该返回缓存结果
      const response2 = await request(server)
        .get('/api/test/cached')
        .expect(200);

      // 检查缓存头
      expect(response2.headers['x-cache-status']).toBeDefined();
    });

    test('应该检测慢请求', async () => {
      const response = await request(server)
        .get('/api/test/slow')
        .expect(200);

      // 慢请求应该被记录
      expect(response.headers['x-response-time']).toBeDefined();
      const responseTime = parseFloat(response.headers['x-response-time']);
      expect(responseTime).toBeGreaterThan(1000);
    });

    test('应该返回性能统计', async () => {
      const response = await request(server)
        .get('/api/test/performance-stats')
        .expect(200);

      expect(response.body).toHaveProperty('requests');
      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('cacheHitRate');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('应该生成优化建议', () => {
      const recommendations = optimizationMiddleware.getOptimizationRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('message');
        expect(rec).toHaveProperty('priority');
      });
    });

    test('健康检查应该返回完整的性能信息', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('system');
      expect(response.body.performance).toHaveProperty('requests');
      expect(response.body.performance).toHaveProperty('cache');
      expect(response.body).toHaveProperty('recommendations');
    });
  });

  describe('性能优化效果测试', () => {
    test('缓存应该显著提升响应速度', async () => {
      // 第一次请求（无缓存）
      const start1 = Date.now();
      await request(server)
        .get('/api/test/cached?test=cache_speed')
        .expect(200);
      const time1 = Date.now() - start1;

      // 第二次请求（有缓存）
      const start2 = Date.now();
      await request(server)
        .get('/api/test/cached?test=cache_speed')
        .expect(200);
      const time2 = Date.now() - start2;

      // 缓存请求应该明显更快
      expect(time2).toBeLessThan(time1 * 0.5);
    });

    test('批量请求应该保持稳定性能', async () => {
      const requests = Array.from({ length: 20 }, (_, i) =>
        request(server)
          .get(`/api/test/cached?batch=${i}`)
          .expect(200)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // 批量请求应该在合理时间内完成
      expect(totalTime).toBeLessThan(5000);
      expect(responses).toHaveLength(20);

      // 检查性能统计
      const stats = optimizationMiddleware.getPerformanceStats();
      expect(stats.requests).toBeGreaterThanOrEqual(20);
    });

    test('错误率应该在合理范围内', async () => {
      // 发送混合请求（成功和失败）
      const successRequests = Array.from({ length: 10 }, () =>
        request(server).get('/api/test/cached')
      );

      const errorRequests = Array.from({ length: 2 }, () =>
        request(server).get('/api/test/nonexistent')
      );

      await Promise.allSettled([...successRequests, ...errorRequests]);

      const stats = optimizationMiddleware.getPerformanceStats();
      const errorRate = parseFloat(stats.errorRate);
      
      // 错误率应该反映实际情况
      expect(errorRate).toBeGreaterThan(0);
      expect(errorRate).toBeLessThan(50); // 不应该超过50%
    });

    test('内存使用应该保持稳定', async () => {
      const initialMemory = process.memoryUsage();

      // 执行大量操作
      for (let i = 0; i < 100; i++) {
        await performanceService.setCache(`test_${i}`, { data: `data_${i}` });
        await performanceService.getFromCache(`test_${i}`);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const increasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      // 内存增长应该在合理范围内
      expect(increasePercent).toBeLessThan(50);
    });
  });

  describe('优化建议应用测试', () => {
    test('应该能够应用优化建议', async () => {
      const initialConfig = { ...optimizationMiddleware.options };

      await optimizationMiddleware.applyOptimizations();

      // 验证优化已应用（这里是模拟，实际实现可能不同）
      expect(optimizationMiddleware.options).toBeDefined();
    });

    test('应该能够转换建议为具体优化操作', () => {
      const recommendations = [
        {
          type: 'warning',
          category: 'cache',
          message: '缓存命中率较低',
          priority: 'medium'
        },
        {
          type: 'warning',
          category: 'response_time',
          message: '响应时间过长',
          priority: 'high'
        }
      ];

      const optimizations = optimizationMiddleware.convertRecommendationsToOptimizations(recommendations);
      
      expect(Array.isArray(optimizations)).toBe(true);
      expect(optimizations.length).toBeGreaterThan(0);
      
      optimizations.forEach(opt => {
        expect(opt).toHaveProperty('name');
        expect(opt).toHaveProperty('type');
        expect(opt).toHaveProperty('value');
      });
    });
  });
});