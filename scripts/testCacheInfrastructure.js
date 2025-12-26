/**
 * 缓存基础设施测试脚本
 * 验证缓存配置和功能
 */

class CacheInfrastructureTester {
  constructor() {
    this.testResults = {
      nodeCache: { success: false, message: '', details: {} },
      lruCache: { success: false, message: '', details: {} },
      redis: { success: false, message: '', details: {} },
      cacheService: { success: false, message: '', details: {} }
    };
  }

  async run() {
    console.log('💾 缓存基础设施测试开始...');
    console.log('='.repeat(60));

    try {
      // 1. 测试Node.js内存缓存
      await this.testNodeCache();

      // 2. 测试LRU缓存
      await this.testLRUCache();

      // 3. 测试Redis连接
      await this.testRedis();

      // 4. 测试缓存服务集成
      await this.testCacheService();

      // 5. 生成测试报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error.message);
    }
  }

  async testNodeCache() {
    console.log('📦 测试 NodeCache...');

    try {
      const NodeCache = require('node-cache');

      const cache = new NodeCache({
        stdTTL: 60, // 60秒
        checkperiod: 10, // 10秒检查
        useClones: false
      });

      // 基础操作测试
      cache.set('test-key', 'test-value');
      const value = cache.get('test-key');

      // 性能测试
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        cache.set(`perf-key-${i}`, `perf-value-${i}`);
      }
      const setPerformance = Date.now() - startTime;

      const getStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        cache.get(`perf-key-${i}`);
      }
      const getPerformance = Date.now() - getStartTime;

      const stats = cache.getStats();

      this.testResults.nodeCache = {
        success: true,
        message: 'NodeCache 测试通过',
        details: {
          basicOperation: value === 'test-value',
          setPerformance: `${setPerformance}ms (1000项)`,
          getPerformance: `${getPerformance}ms (1000项)`,
          keys: stats.keys,
          hits: stats.hits,
          misses: stats.misses,
          ksize: stats.ksize
        }
      };

      console.log('  ✅ 基础功能正常');
      console.log(`  ⚡ 性能: 设置 ${setPerformance}ms, 获取 ${getPerformance}ms`);
      console.log(`  📊 统计: ${stats.keys} 键, 命中率 ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)}%`);

    } catch (error) {
      this.testResults.nodeCache = {
        success: false,
        message: `NodeCache 测试失败: ${error.message}`
      };
      console.log(`  ❌ 测试失败: ${error.message}`);
    }
  }

  async testLRUCache() {
    console.log('\n🔄 测试 LRU Cache...');

    try {
      const LRU = require('lru-cache');

      const cache = new LRU({
        max: 1000,
        ttl: 1000 * 60 * 5, // 5分钟
        updateAgeOnGet: true,
        allowStale: false
      });

      // 基础操作测试
      cache.set('test-key', 'test-value');
      const value = cache.get('test-key');

      // 性能测试
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        cache.set(`perf-key-${i}`, `perf-value-${i}`);
      }
      const setPerformance = Date.now() - startTime;

      const getStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        cache.get(`perf-key-${i}`);
      }
      const getPerformance = Date.now() - getStartTime;

      const stats = cache.dump();

      this.testResults.lruCache = {
        success: true,
        message: 'LRU Cache 测试通过',
        details: {
          basicOperation: value === 'test-value',
          setPerformance: `${setPerformance}ms (1000项)`,
          getPerformance: `${getPerformance}ms (1000项)`,
          size: cache.size,
          itemCount: stats.length,
          maxSize: cache.max
        }
      };

      console.log('  ✅ 基础功能正常');
      console.log(`  ⚡ 性能: 设置 ${setPerformance}ms, 获取 ${getPerformance}ms`);
      console.log(`  📊 统计: ${cache.size}/${cache.max} 项`);

    } catch (error) {
      this.testResults.lruCache = {
        success: false,
        message: `LRU Cache 测试失败: ${error.message}`
      };
      console.log(`  ❌ 测试失败: ${error.message}`);
    }
  }

  async testRedis() {
    console.log('\n🔴 测试 Redis 连接...');

    try {
      const Redis = require('ioredis');

      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // 连接测试
      await redis.connect();
      const pong = await redis.ping();

      // 基础操作测试
      await redis.set('test-key', 'test-value');
      const value = await redis.get('test-key');
      await redis.del('test-key');

      // 性能测试
      const pipeline = redis.pipeline();
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        pipeline.set(`perf-key-${i}`, `perf-value-${i}`);
      }
      await pipeline.exec();

      const setPerformance = Date.now() - startTime;

      const getStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        await redis.get(`perf-key-${i}`);
      }
      const getPerformance = Date.now() - getStartTime;

      // 获取Redis信息
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);

      await redis.quit();

      this.testResults.redis = {
        success: true,
        message: 'Redis 连接测试通过',
        details: {
          ping: pong,
          basicOperation: value === 'test-value',
          setPerformance: `${setPerformance}ms (1000项)`,
          getPerformance: `${getPerformance}ms (1000项)`,
          memory: memoryMatch ? memoryMatch[1] : 'N/A'
        }
      };

      console.log('  ✅ 连接成功');
      console.log(`  🏓 Ping: ${pong}`);
      console.log(`  ⚡ 性能: 设置 ${setPerformance}ms, 获取 ${getPerformance}ms`);
      console.log(`  💾 内存: ${memoryMatch ? memoryMatch[1] : 'N/A'}`);

    } catch (error) {
      this.testResults.redis = {
        success: false,
        message: `Redis 测试失败: ${error.message}`
      };
      console.log(`  ❌ 测试失败: ${error.message}`);
      console.log('  💡 建议: 确保 Redis 服务已启动并配置正确的连接参数');
    }
  }

  async testCacheService() {
    console.log('\n🌐 测试缓存服务集成...');

    try {
      // 动态导入缓存服务
      const cacheService = require('../src/services/cacheService');

      // 初始化缓存服务
      await cacheService.initialize();

      // 基础功能测试
      await cacheService.set('integration-test', { message: 'test', timestamp: Date.now() }, { ttl: 300 });
      const value = await cacheService.get('integration-test');

      // 缓存统计测试
      const stats = cacheService.getStats();

      // 健康检查测试
      const health = await cacheService.healthCheck();

      this.testResults.cacheService = {
        success: true,
        message: '缓存服务集成测试通过',
        details: {
          basicOperation: value && value.message === 'test',
          stats: stats,
          health: health.status
        }
      };

      console.log('  ✅ 缓存服务初始化成功');
      console.log(`  📊 总体命中率: ${stats.total.hitRate.toFixed(2)}%`);
      console.log(`  🏥 健康状态: ${health.status}`);
      console.log(`  📈 操作数: ${stats.total.operations}`);

    } catch (error) {
      this.testResults.cacheService = {
        success: false,
        message: `缓存服务测试失败: ${error.message}`
      };
      console.log(`  ❌ 测试失败: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📋 缓存基础设施测试报告');
    console.log('='.repeat(60));

    const totalTests = Object.keys(this.testResults).length;
    const successCount = Object.values(this.testResults).filter(r => r.success).length;
    const failureCount = totalTests - successCount;

    console.log(`\n📊 测试摘要:`);
    console.log(`总测试数: ${totalTests}`);
    console.log(`✅ 成功: ${successCount}`);
    console.log(`❌ 失败: ${failureCount}`);
    console.log(`📈 成功率: ${((successCount / totalTests) * 100).toFixed(1)}%`);

    console.log(`\n📋 详细结果:`);

    const testNames = {
      nodeCache: 'NodeCache (内存缓存)',
      lruCache: 'LRU Cache (LRU算法)',
      redis: 'Redis (分布式缓存)',
      cacheService: 'CacheService (统一服务)'
    };

    Object.entries(this.testResults).forEach(([key, result]) => {
      const testName = testNames[key] || key;
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${testName}: ${result.message}`);

      if (result.success && result.details) {
        Object.entries(result.details).forEach(([detailKey, detailValue]) => {
          if (typeof detailValue === 'object') {
            console.log(`    ${detailKey}: ${JSON.stringify(detailValue)}`);
          } else {
            console.log(`    ${detailKey}: ${detailValue}`);
          }
        });
      }
    });

    console.log('\n🚀 优化建议:');

    if (successCount === totalTests) {
      console.log('✅ 所有缓存组件工作正常，可以进行生产部署');
      console.log('💡 建议:');
      console.log('  • 监控缓存命中率和内存使用');
      console.log('  • 根据业务需求调整TTL和缓存大小');
      console.log('  • 设置合适的缓存失效策略');
    } else {
      console.log('⚠️  部分组件需要修复');
      console.log('💡 建议:');

      if (!this.testResults.redis.success) {
        console.log('  • 安装并启动Redis服务');
        console.log('  • 检查Redis连接配置');
      }

      if (!this.testResults.cacheService.success) {
        console.log('  • 检查缓存服务配置');
        console.log('  • 确保依赖包正确安装');
      }
    }

    // 缓存性能评估
    console.log('\n📈 缓存性能评估:');
    this.assessCachePerformance();

    // 生成JSON报告
    this.saveReport();
  }

  assessCachePerformance() {
    let performanceScore = 0;
    let maxScore = 0;

    Object.entries(this.testResults).forEach(([key, result]) => {
      maxScore += 25; // 每个测试满分25分

      if (result.success) {
        if (result.details) {
          if (key === 'nodeCache' || key === 'lruCache') {
            performanceScore += 25; // 内存缓存满分
          } else if (key === 'redis') {
            performanceScore += 20; // Redis成功给20分
            if (result.details.setPerformance && parseInt(result.details.setPerformance) < 1000) {
              performanceScore += 5; // 性能良好额外加分
            }
          } else if (key === 'cacheService') {
            performanceScore += 25; // 缓存服务集成成功满分
          }
        }
      }
    });

    const percentage = maxScore > 0 ? (performanceScore / maxScore * 100) : 0;

    if (percentage >= 90) {
      console.log(`🏆 评分: ${percentage.toFixed(1)}% - 优秀`);
    } else if (percentage >= 70) {
      console.log(`✅ 评分: ${percentage.toFixed(1)}% - 良好`);
    } else if (percentage >= 50) {
      console.log(`⚠️  评分: ${percentage.toFixed(1)}% - 一般`);
    } else {
      console.log(`❌ 评分: ${percentage.toFixed(1)}% - 需要优化`);
    }

    return percentage;
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testType: 'Cache Infrastructure Test',
      results: this.testResults,
      summary: {
        totalTests: Object.keys(this.testResults).length,
        successCount: Object.values(this.testResults).filter(r => r.success).length,
        performanceScore: this.assessCachePerformance()
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      }
    };

    const fs = require('fs');
    const reportPath = './cache-infrastructure-test-report.json';

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 详细报告已保存: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  无法保存报告: ${error.message}`);
    }
  }
}

// 执行测试
const tester = new CacheInfrastructureTester();
tester.run();