/**
 * 优化的缓存配置系统
 * 解决缓存穿透、缓存雪崩、缓存失效等问题
 * 提供分层缓存策略、TTL优化和监控指标
 */

const crypto = require('crypto');

/**
 * 缓存配置常量
 */
const CACHE_CONSTANTS = {
  // TTL 配置（毫秒）
  TTL: {
    REALTIME: 60 * 1000,              // 实时数据: 1分钟
    SHORT: 5 * 60 * 1000,             // 短期: 5分钟
    MEDIUM: 15 * 60 * 1000,           // 中期: 15分钟
    LONG: 60 * 60 * 1000,             // 长期: 1小时
    EXTENDED: 4 * 60 * 60 * 1000,     // 扩展: 4小时
    STATIC: 24 * 60 * 60 * 1000,      // 静态: 24小时
    WEEKLY: 7 * 24 * 60 * 60 * 1000   // 周期: 7天
  },

  // 缓存大小限制
  SIZE_LIMITS: {
    L1_MAX_ITEMS: 2000,               // L1最大条目数
    L1_MAX_BYTES: 100 * 1024 * 1024,  // L1最大100MB
    L2_MAX_BYTES: 500 * 1024 * 1024,  // L2最大500MB
    COMPRESSION_THRESHOLD: 10240,      // 10KB以上压缩
    MAX_VALUE_SIZE: 10 * 1024 * 1024  // 单值最大10MB
  },

  // 缓存层级
  LEVELS: {
    L1_MEMORY: 'l1',
    L2_REDIS: 'l2',
    L3_FILE: 'l3',
    L4_CDN: 'l4'
  },

  // 缓存策略
  STRATEGIES: {
    WRITE_THROUGH: 'write_through',    // 写透策略
    WRITE_BACK: 'write_back',          // 写回策略
    WRITE_AROUND: 'write_around',      // 绕写策略
    REFRESH_AHEAD: 'refresh_ahead'     // 预刷新策略
  }
};

/**
 * 业务类型缓存配置
 * 针对智慧乡村不同业务场景优化
 */
const BUSINESS_CACHE_CONFIG = {
  // 村庄信息
  village: {
    ttl: CACHE_CONSTANTS.TTL.EXTENDED,
    strategy: CACHE_CONSTANTS.STRATEGIES.WRITE_THROUGH,
    levels: [CACHE_CONSTANTS.LEVELS.L1_MEMORY, CACHE_CONSTANTS.LEVELS.L2_REDIS],
    preload: true,
    compression: false,
    tags: ['village', 'geographic', 'metadata'],
    invalidation: {
      on: ['create', 'update', 'delete'],
      cascade: ['village:*', 'village_residents:*', 'village_announcements:*']
    }
  },

  // 村民信息
  resident: {
    ttl: CACHE_CONSTANTS.TTL.LONG,
    strategy: CACHE_CONSTANTS.STRATEGIES.WRITE_THROUGH,
    levels: [CACHE_CONSTANTS.LEVELS.L1_MEMORY, CACHE_CONSTANTS.LEVELS.L2_REDIS],
    preload: false,
    compression: true,
    tags: ['resident', 'personal', 'sensitive'],
    invalidation: {
      on: ['create', 'update', 'delete'],
      cascade: ['resident:*', 'family:*']
    },
    privacy: {
      enabled: true,
      maskFields: ['idCard', 'phone', 'bankAccount']
    }
  },

  // 公告信息
  announcement: {
    ttl: CACHE_CONSTANTS.TTL.MEDIUM,
    strategy: CACHE_CONSTANTS.STRATEGIES.REFRESH_AHEAD,
    levels: [CACHE_CONSTANTS.LEVELS.L1_MEMORY, CACHE_CONSTANTS.LEVELS.L2_REDIS],
    preload: true,
    compression: false,
    tags: ['announcement', 'news', 'notification'],
    invalidation: {
      on: ['create', 'update', 'delete', 'publish'],
      cascade: ['announcement:*', 'home:*']
    },
    refresh: {
      enabled: true,
      beforeExpiry: 0.2  // 提前20%刷新
    }
  },

  // 政策信息
  policy: {
    ttl: CACHE_CONSTANTS.TTL.STATIC,
    strategy: CACHE_CONSTANTS.STRATEGIES.WRITE_BACK,
    levels: [CACHE_CONSTANTS.LEVELS.L2_REDIS, CACHE_CONSTANTS.LEVELS.L3_FILE],
    preload: true,
    compression: true,
    tags: ['policy', 'document', 'reference'],
    versioning: true
  },

  // 紧急事件
  emergency: {
    ttl: CACHE_CONSTANTS.TTL.REALTIME,
    strategy: CACHE_CONSTANTS.STRATEGIES.WRITE_THROUGH,
    levels: [CACHE_CONSTANTS.LEVELS.L1_MEMORY, CACHE_CONSTANTS.LEVELS.L2_REDIS],
    preload: false,
    compression: false,
    tags: ['emergency', 'urgent', 'broadcast'],
    broadcast: true,
    priority: 'critical'
  },

  // 村务管理
  governance: {
    ttl: CACHE_CONSTANTS.TTL.MEDIUM,
    strategy: CACHE_CONSTANTS.STRATEGIES.WRITE_BACK,
    levels: [CACHE_CONSTANTS.LEVELS.L1_MEMORY, CACHE_CONSTANTS.LEVELS.L2_REDIS],
    preload: false,
    compression: true,
    tags: ['governance', 'management', 'financial']
  },

  // 用户会话
  session: {
    ttl: CACHE_CONSTANTS.TTL.LONG,
    strategy: CACHE_CONSTANTS.STRATEGIES.WRITE_THROUGH,
    levels: [CACHE_CONSTANTS.LEVELS.L1_MEMORY, CACHE_CONSTANTS.LEVELS.L2_REDIS],
    preload: false,
    compression: false,
    tags: ['session', 'auth', 'user'],
    sliding: true  // 滑动过期
  },

  // 静态资源
  static: {
    ttl: CACHE_CONSTANTS.TTL.WEEKLY,
    strategy: CACHE_CONSTANTS.STRATEGIES.WRITE_AROUND,
    levels: [CACHE_CONSTANTS.LEVELS.L2_REDIS, CACHE_CONSTANTS.LEVELS.L4_CDN],
    preload: true,
    compression: true,
    tags: ['static', 'asset', 'media']
  },

  // API响应
  api: {
    ttl: CACHE_CONSTANTS.TTL.SHORT,
    strategy: CACHE_CONSTANTS.STRATEGIES.REFRESH_AHEAD,
    levels: [CACHE_CONSTANTS.LEVELS.L1_MEMORY, CACHE_CONSTANTS.LEVELS.L2_REDIS],
    preload: false,
    compression: true,
    tags: ['api', 'response', 'data']
  },

  // 搜索结果
  search: {
    ttl: CACHE_CONSTANTS.TTL.MEDIUM,
    strategy: CACHE_CONSTANTS.STRATEGIES.WRITE_BACK,
    levels: [CACHE_CONSTANTS.LEVELS.L1_MEMORY, CACHE_CONSTANTS.LEVELS.L2_REDIS],
    preload: false,
    compression: true,
    tags: ['search', 'query', 'result']
  }
};

/**
 * 缓存键生成器
 * 支持智能键生成和版本控制
 */
class CacheKeyGenerator {
  constructor(options = {}) {
    this.options = {
      prefix: options.prefix || 'sv',
      version: options.version || 'v1',
      separator: options.separator || ':',
      hashLength: options.hashLength || 8
    };
  }

  /**
   * 生成缓存键
   * @param {string} businessType - 业务类型
   * @param {string} identifier - 标识符
   * @param {Object} params - 参数
   * @returns {string} 缓存键
   */
  generate(businessType, identifier, params = {}) {
    const parts = [
      this.options.prefix,
      this.options.version,
      businessType,
      identifier
    ];

    // 添加参数哈希
    if (Object.keys(params).length > 0) {
      const paramHash = this.hashParams(params);
      parts.push(paramHash);
    }

    return parts.join(this.options.separator);
  }

  /**
   * 生成模式匹配键
   * @param {string} businessType - 业务类型
   * @param {string} pattern - 模式
   * @returns {string} 模式键
   */
  generatePattern(businessType, pattern = '*') {
    return [
      this.options.prefix,
      this.options.version,
      businessType,
      pattern
    ].join(this.options.separator);
  }

  /**
   * 生成标签键
   * @param {string} tag - 标签
   * @returns {string} 标签键
   */
  generateTagKey(tag) {
    return [
      this.options.prefix,
      this.options.version,
      'tag',
      tag
    ].join(this.options.separator);
  }

  /**
   * 生成锁键（防止缓存击穿）
   * @param {string} key - 原始键
   * @returns {string} 锁键
   */
  generateLockKey(key) {
    return `${key}:lock`;
  }

  /**
   * 哈希参数
   * @param {Object} params - 参数
   * @returns {string} 哈希值
   */
  hashParams(params) {
    const sorted = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(sorted))
      .digest('hex');

    return hash.substring(0, this.options.hashLength);
  }

  /**
   * 解析缓存键
   * @param {string} key - 缓存键
   * @returns {Object} 解析结果
   */
  parse(key) {
    const parts = key.split(this.options.separator);
    return {
      prefix: parts[0],
      version: parts[1],
      businessType: parts[2],
      identifier: parts[3],
      params: parts[4]
    };
  }
}

/**
 * 缓存监控指标
 * 收集和报告缓存性能指标
 */
class CacheMetrics {
  constructor() {
    this.metrics = {
      // 操作计数
      operations: {
        gets: 0,
        sets: 0,
        deletes: 0,
        updates: 0,
        misses: 0
      },

      // 命中率
      hitRate: {
        l1: { hits: 0, misses: 0 },
        l2: { hits: 0, misses: 0 },
        overall: { hits: 0, misses: 0 }
      },

      // 响应时间
      latency: {
        gets: [],
        sets: [],
        deletes: []
      },

      // 大小统计
      size: {
        l1: { current: 0, max: 0 },
        l2: { current: 0, max: 0 },
        l3: { current: 0, max: 0 }
      },

      // 错误统计
      errors: {
        l1: 0,
        l2: 0,
        l3: 0,
        total: 0
      },

      // 业务指标
      business: {},

      // 时间戳
      lastReset: Date.now(),
      lastReport: Date.now()
    };

    // 响应时间样本保留数量
    this.maxSamples = 1000;
  }

  /**
   * 记录获取操作
   * @param {string} level - 缓存层级
   * @param {boolean} hit - 是否命中
   * @param {number} latency - 延迟
   */
  recordGet(level, hit, latency) {
    this.metrics.operations.gets++;
    this.metrics.hitRate[level].hits += hit ? 1 : 0;
    this.metrics.hitRate[level].misses += hit ? 0 : 1;
    this.metrics.hitRate.overall.hits += hit ? 1 : 0;
    this.metrics.hitRate.overall.misses += hit ? 0 : 1;

    if (!hit) {
      this.metrics.operations.misses++;
    }

    this.addLatencySample('gets', latency);
  }

  /**
   * 记录设置操作
   * @param {number} latency - 延迟
   * @param {number} size - 大小
   */
  recordSet(latency, size) {
    this.metrics.operations.sets++;
    this.addLatencySample('sets', latency);
  }

  /**
   * 记录删除操作
   * @param {number} latency - 延迟
   */
  recordDelete(latency) {
    this.metrics.operations.deletes++;
    this.addLatencySample('deletes', latency);
  }

  /**
   * 记录错误
   * @param {string} level - 缓存层级
   */
  recordError(level) {
    this.metrics.errors[level]++;
    this.metrics.errors.total++;
  }

  /**
   * 记录业务指标
   * @param {string} businessType - 业务类型
   * @param {Object} data - 数据
   */
  recordBusiness(businessType, data) {
    if (!this.metrics.business[businessType]) {
      this.metrics.business[businessType] = {
        requests: 0,
        hits: 0,
        avgLatency: 0,
        dataSize: 0
      };
    }

    const metrics = this.metrics.business[businessType];
    metrics.requests++;
    metrics.hits += data.hit ? 1 : 0;
    metrics.avgLatency = (metrics.avgLatency * (metrics.requests - 1) + data.latency) / metrics.requests;
    metrics.dataSize += data.size || 0;
  }

  /**
   * 添加延迟样本
   * @param {string} operation - 操作类型
   * @param {number} latency - 延迟
   */
  addLatencySample(operation, latency) {
    const samples = this.metrics.latency[operation];
    samples.push(latency);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  /**
   * 计算命中率
   * @param {string} level - 层级
   * @returns {number} 命中率
   */
  calculateHitRate(level = 'overall') {
    const stats = this.metrics.hitRate[level];
    const total = stats.hits + stats.misses;
    return total > 0 ? stats.hits / total : 0;
  }

  /**
   * 计算延迟统计
   * @param {string} operation - 操作类型
   * @returns {Object} 延迟统计
   */
  calculateLatencyStats(operation) {
    const samples = this.metrics.latency[operation];
    if (samples.length === 0) {
      return { avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    return {
      avg: samples.reduce((a, b) => a + b, 0) / samples.length,
      p50: sorted[Math.floor(samples.length * 0.5)],
      p95: sorted[Math.floor(samples.length * 0.95)],
      p99: sorted[Math.floor(samples.length * 0.99)]
    };
  }

  /**
   * 获取快照
   * @returns {Object} 指标快照
   */
  getSnapshot() {
    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.metrics.lastReset,
      operations: { ...this.metrics.operations },
      hitRates: {
        l1: this.calculateHitRate('l1'),
        l2: this.calculateHitRate('l2'),
        overall: this.calculateHitRate('overall')
      },
      latency: {
        gets: this.calculateLatencyStats('gets'),
        sets: this.calculateLatencyStats('sets'),
        deletes: this.calculateLatencyStats('deletes')
      },
      size: { ...this.metrics.size },
      errors: { ...this.metrics.errors },
      business: { ...this.metrics.business }
    };
  }

  /**
   * 重置指标
   */
  reset() {
    this.metrics.lastReset = Date.now();
    this.metrics.operations = {
      gets: 0,
      sets: 0,
      deletes: 0,
      updates: 0,
      misses: 0
    };
    this.metrics.hitRate = {
      l1: { hits: 0, misses: 0 },
      l2: { hits: 0, misses: 0 },
      overall: { hits: 0, misses: 0 }
    };
    this.metrics.latency = {
      gets: [],
      sets: [],
      deletes: []
    };
    this.metrics.errors = {
      l1: 0,
      l2: 0,
      l3: 0,
      total: 0
    };
  }
}

/**
 * 缓存预热配置
 * 定义热点数据和预热策略
 */
const CACHE_WARMUP_CONFIG = {
  // 预热开关
  enabled: true,

  // 预热策略
  strategy: 'intelligent', // 'aggressive', 'conservative', 'intelligent'

  // 预热时机
  triggers: {
    onStartup: true,
    onSchedule: true,
    onDemand: true,
    interval: 6 * 60 * 60 * 1000 // 6小时
  },

  // 热点数据定义
  hotData: [
    {
      type: 'village',
      pattern: 'village:active',
      priority: 'high',
      count: 100
    },
    {
      type: 'announcement',
      pattern: 'announcement:latest',
      priority: 'high',
      count: 50
    },
    {
      type: 'policy',
      pattern: 'policy:active',
      priority: 'medium',
      count: 20
    }
  ],

  // 预热并发控制
  concurrency: {
    maxParallel: 10,
    batchSize: 50,
    timeout: 30000
  }
};

/**
 * 缓存防穿透配置
 */
const CACHE_PENETRATION_DEFENSE = {
  // 空值缓存
  nullCaching: {
    enabled: true,
    ttl: 60 * 1000, // 1分钟
    prefix: 'null:'
  },

  // 布隆过滤器
  bloomFilter: {
    enabled: true,
    falsePositiveRate: 0.01,
    expectedItems: 100000
  },

  // 互斥锁
  mutexLock: {
    enabled: true,
    timeout: 10000,
    waitTime: 3000
  }
};

/**
 * 缓存防雪崩配置
 */
const CACHE_AVALANCHE_DEFENSE = {
  // TTL 随机化
  ttlRandomization: {
    enabled: true,
    range: 0.1 // +/- 10%
  },

  // 缓存分片
  sharding: {
    enabled: true,
    shards: 3
  },

  // 限流
  rateLimiting: {
    enabled: true,
    maxRequests: 1000,
    windowMs: 60000
  }
};

/**
 * 缓存失效策略配置
 */
const CACHE_INVALIDATION_CONFIG = {
  // 主动失效
  active: {
    enabled: true,
    strategies: [
      'time_based',      // 基于时间
      'event_based',     // 基于事件
      'version_based',   // 基于版本
      'tag_based'        // 基于标签
    ]
  },

  // 级联失效
  cascade: {
    enabled: true,
    maxDepth: 3
  },

  // 批量失效
  batch: {
    enabled: true,
    maxBatchSize: 1000,
    timeout: 5000
  }
};

/**
 * 导出配置
 */
module.exports = {
  CACHE_CONSTANTS,
  BUSINESS_CACHE_CONFIG,
  CACHE_WARMUP_CONFIG,
  CACHE_PENETRATION_DEFENSE,
  CACHE_AVALANCHE_DEFENSE,
  CACHE_INVALIDATION_CONFIG,
  CacheKeyGenerator,
  CacheMetrics
};
