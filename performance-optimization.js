/**
 * 智慧村庄平台性能优化模块
 * 实现缓存、负载均衡和性能监控功能
 */

const Redis = require('ioredis');
const NodeCache = require('node-cache');
const cluster = require('cluster');
const os = require('os');

// Redis配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
};

// 内存缓存配置
const memoryCacheConfig = {
  stdTTL: 600, // 10分钟缓存时间
  checkperiod: 120, // 2分钟检查一次过期缓存
  useClones: false
};

class PerformanceOptimizer {
  constructor() {
    this.redis = null;
    this.memoryCache = new NodeCache(memoryCacheConfig);
    this.isRedisAvailable = false;
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      apiResponseTime: [],
      systemLoad: []
    };

    this.initRedis();
    this.setupCaching();
  }

  // 初始化Redis连接
  async initRedis() {
    try {
      this.redis = new Redis(redisConfig);

      this.redis.on('connect', () => {
        console.log('🔗 Redis连接成功');
        this.isRedisAvailable = true;
      });

      this.redis.on('error', (err) => {
        console.log('⚠️ Redis连接失败，使用内存缓存:', err.message);
        this.isRedisAvailable = false;
      });

      await this.redis.connect();
    } catch (error) {
      console.log('📝 使用内存缓存模式');
      this.isRedisAvailable = false;
    }
  }

  // 设置缓存中间件
  setupCaching() {
    // 缓存中间件
    this.cacheMiddleware = (req, res, next) => {
      const cacheKey = this.generateCacheKey(req);
      const ttl = this.getCacheTTL(req);

      this.getCache(cacheKey)
        .then(cachedData => {
          if (cachedData) {
            this.metrics.cacheHits++;
            console.log(`🎯 缓存命中: ${cacheKey}`);
            return res.json(cachedData);
          }

          this.metrics.cacheMisses++;

          // 拦截res.json以缓存响应
          const originalJson = res.json;
          res.json = (data) => {
            if (res.statusCode === 200 && data.success) {
              this.setCache(cacheKey, data, ttl);
            }
            return originalJson.call(res, data);
          };

          next();
        })
        .catch(err => {
          console.error('❌ 缓存错误:', err);
          next();
        });
    };
  }

  // 生成缓存键
  generateCacheKey(req) {
    const { method, originalUrl, query } = req;
    const keyPrefix = method === 'GET' ? 'cache' : 'data';
    const queryString = Object.keys(query).length > 0 ?
      JSON.stringify(query) : '';

    return `${keyPrefix}:${originalUrl}:${queryString}`;
  }

  // 获取缓存过期时间
  getCacheTTL(req) {
    const { originalUrl } = req;

    // 不同API路径的缓存时间
    const cacheTimes = {
      '/api/v1/projects': 300,      // 5分钟
      '/api/v1/finance/overview': 600,  // 10分钟
      '/api/v1/agriculture/products': 180, // 3分钟
      '/api/v1/emergency/events': 60,     // 1分钟
      '/api/v1/services': 1200,      // 20分钟
      '/health': 30,               // 30秒
      '/api/health': 30            // 30秒
    };

    for (const [path, ttl] of Object.entries(cacheTimes)) {
      if (originalUrl.includes(path)) {
        return ttl;
      }
    }

    return 300; // 默认5分钟
  }

  // 获取缓存数据
  async getCache(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const cached = await this.redis.get(key);
        return cached ? JSON.parse(cached) : null;
      } else {
        return this.memoryCache.get(key);
      }
    } catch (error) {
      console.error('❌ 获取缓存失败:', error);
      return null;
    }
  }

  // 设置缓存数据
  async setCache(key, data, ttl = 300) {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(data));
      } else {
        this.memoryCache.set(key, data, ttl);
      }
    } catch (error) {
      console.error('❌ 设置缓存失败:', error);
    }
  }

  // 删除缓存
  async deleteCache(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryCache.del(key);
      }
    } catch (error) {
      console.error('❌ 删除缓存失败:', error);
    }
  }

  // 清除所有缓存
  async clearCache() {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.flushdb();
      } else {
        this.memoryCache.flushAll();
      }
      console.log('🧹 缓存已清空');
    } catch (error) {
      console.error('❌ 清空缓存失败:', error);
    }
  }

  // 数据库查询缓存
  async cachedQuery(queryKey, queryFunction, ttl = 300) {
    const cacheKey = `query:${queryKey}`;

    try {
      // 尝试从缓存获取
      let result = await this.getCache(cacheKey);

      if (result) {
        this.metrics.cacheHits++;
        return result;
      }

      // 缓存未命中，执行查询
      this.metrics.cacheMisses++;
      result = await queryFunction();

      // 缓存结果
      await this.setCache(cacheKey, result, ttl);

      return result;
    } catch (error) {
      console.error('❌ 缓存查询失败:', error);
      return await queryFunction(); // 直接执行查询
    }
  }

  // API响应时间监控
  responseTimeMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.metrics.apiResponseTime.push({
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date()
        });

        // 只保留最近1000条记录
        if (this.metrics.apiResponseTime.length > 1000) {
          this.metrics.apiResponseTime = this.metrics.apiResponseTime.slice(-1000);
        }
      });

      next();
    };
  }

  // 系统负载监控
  startSystemMonitoring() {
    setInterval(() => {
      const load = os.loadavg()[0]; // 1分钟平均负载
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();

      this.metrics.systemLoad.push({
        timestamp: new Date(),
        loadAverage: load,
        cpuUsage: cpuUsage,
        memoryUsage: memoryUsage,
        freeMemory: os.freemem(),
        totalMemory: os.totalmem()
      });

      // 只保留最近100条记录
      if (this.metrics.systemLoad.length > 100) {
        this.metrics.systemLoad = this.metrics.systemLoad.slice(-100);
      }
    }, 30000); // 每30秒记录一次
  }

  // 获取性能指标
  getMetrics() {
    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 ?
      (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2) : 0;

    const recentResponseTimes = this.metrics.apiResponseTime.slice(-100);
    const avgResponseTime = recentResponseTimes.length > 0 ?
      (recentResponseTimes.reduce((sum, item) => sum + item.responseTime, 0) / recentResponseTimes.length).toFixed(2) : 0;

    return {
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: `${cacheHitRate}%`,
        isRedisAvailable: this.isRedisAvailable
      },
      api: {
        averageResponseTime: `${avgResponseTime}ms`,
        totalRequests: this.metrics.apiResponseTime.length
      },
      system: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        uptime: `${Math.floor(process.uptime())}s`,
        memory: process.memoryUsage(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length
      }
    };
  }

  // 负载均衡配置
  getLoadBalancerConfig() {
    const numCPUs = os.cpus().length;
    return {
      workers: numCPUs,
      ports: [3001, 3002, 3003, 3004],
      algorithm: 'round-robin', // 轮询算法
      healthCheck: {
        interval: 30000, // 30秒
        timeout: 5000,   // 5秒
        retries: 3
      }
    };
  }

  // 启动负载均衡集群
  startCluster(app) {
    const config = this.getLoadBalancerConfig();

    if (cluster.isMaster) {
      console.log(`🖥️ 主进程 ${process.pid} 正在启动`);
      console.log(`📊 系统CPU核心数: ${config.workers}`);

      // 启动工作进程
      for (let i = 0; i < config.workers; i++) {
        const worker = cluster.fork();
        worker.port = config.ports[i];

        worker.on('exit', (code, signal) => {
          console.log(`⚠️ 工作进程 ${worker.process.pid} 退出`);
          cluster.fork(); // 重启工作进程
        });
      }

      // 设置负载均衡器
      this.setupLoadBalancer(config);

    } else {
      console.log(`🔧 工作进程 ${process.pid} 启动`);

      // 每个工作进程监听不同端口
      const port = cluster.worker.port || 3001;
      app.listen(port, () => {
        console.log(`🚀 工作进程 ${process.pid} 监听端口 ${port}`);
      });
    }
  }

  // 设置负载均衡器
  setupLoadBalancer(config) {
    const http = require('http');
    const currentPort = 0; // 负载均衡器端口

    let workerIndex = 0;
    const workers = Object.values(cluster.workers);

    const server = http.createServer((req, res) => {
      // 选择工作进程
      const worker = workers[workerIndex];
      const workerPort = worker.port;

      // 转发请求到工作进程
      const proxy = http.request({
        hostname: 'localhost',
        port: workerPort,
        path: req.url,
        method: req.method,
        headers: req.headers
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      req.pipe(proxy);

      // 轮询到下一个工作进程
      workerIndex = (workerIndex + 1) % workers.length;
    });

    server.listen(currentPort, () => {
      console.log(`⚖️ 负载均衡器运行在端口 ${currentPort}`);
      console.log(`🔄 后端服务端口: ${config.ports.join(', ')}`);
    });
  }

  // 数据库连接池优化
  getMongoDBConfig() {
    return {
      maxPoolSize: 50,          // 最大连接数
      minPoolSize: 5,           // 最小连接数
      maxIdleTimeMS: 30000,     // 连接空闲时间
      serverSelectionTimeoutMS: 5000, // 服务器选择超时
      socketTimeoutMS: 45000,   // Socket超时
      bufferMaxEntries: 0,      // 禁用mongoose缓冲
      bufferCommands: false     // 禁用mongoose命令缓冲
    };
  }

  // 静态资源优化
  setupStaticOptimization(app) {
    const express = require('express');
    const path = require('path');

    // 设置缓存头
    const oneDay = 86400000; // 24小时
    const oneWeek = 604800000; // 7天

    // 静态文件缓存
    app.use('/static', express.static(path.join(__dirname, 'public'), {
      maxAge: oneWeek,
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=86400'); // 1天
        }
      }
    }));

    // Gzip压缩
    const compression = require('compression');
    app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024,
      chunkSize: 16 * 1024
    }));
  }

  // API限流优化
  setupRateLimiting() {
    const rateLimit = require('express-rate-limit');

    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 1000, // 限制每个IP 15分钟内最多1000个请求
      message: {
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // 跳过健康检查和静态资源
        return req.url.includes('/health') ||
               req.url.includes('/static') ||
               req.url.includes('/favicon.ico');
      }
    });
  }
}

module.exports = PerformanceOptimizer;