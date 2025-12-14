/**
 * 性能优化配置
 * 统一管理所有性能相关的配置参数
 */

module.exports = {
  // 数据库优化配置
  database: {
    // 连接池配置
    connectionPool: {
      primary: {
        maxPoolSize: process.env.DB_MAX_POOL_SIZE || 50,
        minPoolSize: process.env.DB_MIN_POOL_SIZE || 5,
        maxIdleTimeMS: process.env.DB_MAX_IDLE_TIME || 30000,
        serverSelectionTimeoutMS: process.env.DB_SERVER_SELECTION_TIMEOUT || 5000,
        socketTimeoutMS: process.env.DB_SOCKET_TIMEOUT || 45000,
        connectTimeoutMS: process.env.DB_CONNECT_TIMEOUT || 10000
      },
      secondary: {
        maxPoolSize: process.env.DB_SECONDARY_MAX_POOL_SIZE || 20,
        minPoolSize: process.env.DB_SECONDARY_MIN_POOL_SIZE || 2
      }
    },

    // 查询优化配置
    queryOptimization: {
      slowQueryThreshold: process.env.SLOW_QUERY_THRESHOLD || 1000,
      enableAutoIndex: process.env.ENABLE_AUTO_INDEX === 'true',
      enableQueryPlanCache: process.env.ENABLE_QUERY_PLAN_CACHE !== 'false',
      maxQueryPlanCacheSize: process.env.MAX_QUERY_PLAN_CACHE_SIZE || 1000
    },

    // 监控配置
    monitoring: {
      enabled: process.env.DB_MONITORING_ENABLED !== 'false',
      metricsInterval: process.env.DB_METRICS_INTERVAL || 30000,
      healthCheckInterval: process.env.DB_HEALTH_CHECK_INTERVAL || 60000
    }
  },

  // 缓存配置
  cache: {
    // L1 内存缓存
    l1: {
      max: process.env.L1_CACHE_MAX || 1000,
      maxSize: process.env.L1_CACHE_MAX_SIZE || 100 * 1024 * 1024, // 100MB
      ttl: process.env.L1_CACHE_TTL || 1000 * 60 * 5, // 5分钟
      enableStats: process.env.ENABLE_CACHE_STATS !== 'false'
    },

    // L2 Redis缓存
    l2: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'village:',
      ttl: process.env.REDIS_TTL || 1000 * 60 * 30, // 30分钟
      maxRetries: process.env.REDIS_MAX_RETRIES || 3,
      retryDelay: process.env.REDIS_RETRY_DELAY || 100
    },

    // L3 持久化缓存
    l3: {
      ttl: process.env.L3_CACHE_TTL || 1000 * 60 * 60 * 24, // 24小时
      compressionEnabled: process.env.L3_COMPRESSION_ENABLED !== 'false',
      encryptionEnabled: process.env.L3_ENCRYPTION_ENABLED === 'true'
    },

    // 缓存策略
    strategies: {
      // 用户资料缓存
      user_profile: {
        l1: true,
        l2: true,
        l3: true,
        ttl: 1000 * 60 * 30, // 30分钟
        priority: 'high'
      },

      // 产品列表缓存
      product_list: {
        l1: true,
        l2: true,
        l3: false,
        ttl: 1000 * 60 * 10, // 10分钟
        priority: 'medium'
      },

      // 村务数据缓存
      village_data: {
        l1: false,
        l2: true,
        l3: true,
        ttl: 1000 * 60 * 60, // 1小时
        priority: 'high'
      },

      // 系统配置缓存
      system_config: {
        l1: true,
        l2: true,
        l3: true,
        ttl: 1000 * 60 * 60 * 2, // 2小时
        priority: 'high'
      },

      // 搜索结果缓存
      search_result: {
        l1: true,
        l2: true,
        l3: false,
        ttl: 1000 * 60 * 2, // 2分钟
        priority: 'low'
      },

      // 分析数据缓存
      analytics_data: {
        l1: false,
        l2: true,
        l3: true,
        ttl: 1000 * 60 * 60 * 6, // 6小时
        priority: 'medium'
      }
    }
  },

  // API性能配置
  api: {
    // 限流配置
    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW || 1000 * 60 * 15, // 15分钟
      max: process.env.RATE_LIMIT_MAX || 1000, // 每个IP最多1000个请求
      standardHeaders: process.env.RATE_LIMIT_STANDARD_HEADERS !== 'false',
      legacyHeaders: process.env.RATE_LIMIT_LEGACY_HEADERS !== 'false'
    },

    // 响应缓存配置
    responseCache: {
      enabled: process.env.RESPONSE_CACHE_ENABLED !== 'false',
      defaultTTL: process.env.RESPONSE_CACHE_TTL || 1000 * 60 * 5, // 5分钟
      maxSize: process.env.RESPONSE_CACHE_MAX_SIZE || 50 * 1024 * 1024, // 50MB
      excludePaths: ['/api/v1/auth', '/api/v1/upload', '/api/v1/webhook'],
      maxResponseSize: process.env.RESPONSE_CACHE_MAX_SIZE || 1024 * 1024 // 1MB
    },

    // 压缩配置
    compression: {
      enabled: process.env.COMPRESSION_ENABLED !== 'false',
      threshold: process.env.COMPRESSION_THRESHOLD || 1024, // 1KB以上才压缩
      level: process.env.COMPRESSION_LEVEL || 6,
      memLevel: process.env.COMPRESSION_MEM_LEVEL || 8
    }
  },

  // 性能监控配置
  monitoring: {
    enabled: process.env.PERFORMANCE_MONITORING_ENABLED !== 'false',

    // 查询监控
    queryMonitoring: {
      enabled: process.env.QUERY_MONITORING_ENABLED !== 'false',
      slowQueryThreshold: process.env.SLOW_QUERY_THRESHOLD || 1000,
      verySlowQueryThreshold: process.env.VERY_SLOW_QUERY_THRESHOLD || 5000,
      criticalQueryThreshold: process.env.CRITICAL_QUERY_THRESHOLD || 10000,
      maxHistory: process.env.QUERY_HISTORY_MAX || 10000
    },

    // 指标收集
    metrics: {
      interval: process.env.METRICS_INTERVAL || 30000, // 30秒
      retentionPeriod: process.env.METRICS_RETENTION_PERIOD || 24 * 60 * 60 * 1000, // 24小时
      aggregationWindow: process.env.METRICS_AGGREGATION_WINDOW || 60000 // 1分钟
    },

    // 告警配置
    alerts: {
      enabled: process.env.ALERTS_ENABLED !== 'false',
      slowQueryCount: process.env.ALERT_SLOW_QUERY_COUNT || 10,
      averageResponseTime: process.env.ALERT_AVG_RESPONSE_TIME || 2000,
      errorRate: process.env.ALERT_ERROR_RATE || 0.05,
      memoryUsage: process.env.ALERT_MEMORY_USAGE || 90,
      cpuUsage: process.env.ALERT_CPU_USAGE || 80
    },

    // 报告配置
    reports: {
      enabled: process.env.REPORTS_ENABLED !== 'false',
      schedule: process.env.REPORTS_SCHEDULE || '0 0 * * *', // 每天午夜
      emailRecipients: process.env.REPORTS_EMAIL_RECIPIENTS?.split(',') || [],
      includeSlowQueries: process.env.REPORTS_INCLUDE_SLOW_QUERIES !== 'false',
      includeOptimizationSuggestions: process.env.REPORTS_INCLUDE_OPTIMIZATION !== 'false'
    }
  },

  // 优化策略配置
  optimization: {
    // 自动优化
    autoOptimization: {
      enabled: process.env.AUTO_OPTIMIZATION_ENABLED === 'true',
      schedule: process.env.AUTO_OPTIMIZATION_SCHEDULE || '0 2 * * *', // 每天凌晨2点
      indexCreationThreshold: process.env.INDEX_CREATION_THRESHOLD || 100,
      cleanupThreshold: process.env.CLEANUP_THRESHOLD || 30 // 30天
    },

    // 连接优化
    connection: {
      keepAlive: process.env.KEEP_ALIVE !== 'false',
      keepAliveInitialDelay: process.env.KEEP_ALIVE_INITIAL_DELAY || 0,
      maxSockets: process.env.MAX_SOCKETS || Infinity,
      maxFreeSockets: process.env.MAX_FREE_SOCKETS || 256,
      timeout: process.env.SOCKET_TIMEOUT || 60000
    },

    // 内存优化
    memory: {
      gcInterval: process.env.GC_INTERVAL || 60000, // 1分钟
      maxOldSpaceSize: process.env.MAX_OLD_SPACE_SIZE || 2048, // MB
      maxNewGenerationSize: process.env.MAX_NEW_GENERATION_SIZE || 512, // MB
      enableCompaction: process.env.ENABLE_COMPACTION !== 'false'
    }
  },

  // 负载均衡配置
  loadBalancing: {
    enabled: process.env.LOAD_BALANCING_ENABLED === 'true',
    strategy: process.env.LOAD_BALANCING_STRATEGY || 'round_robin', // round_robin, least_connections, weighted
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      interval: process.env.HEALTH_CHECK_INTERVAL || 30000,
      timeout: process.env.HEALTH_CHECK_TIMEOUT || 5000,
      retries: process.env.HEALTH_CHECK_RETRIES || 3
    }
  },

  // CDN配置
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    domain: process.env.CDN_DOMAIN,
    cacheTTL: process.env.CDN_CACHE_TTL || 86400, // 24小时
    compressionEnabled: process.env.CDN_COMPRESSION_ENABLED !== 'false'
  },

  // 环境特定配置
  environments: {
    development: {
      database: {
        connectionPool: {
          maxPoolSize: 5,
          minPoolSize: 1
        }
      },
      cache: {
        l1: {
          max: 100
        }
      },
      monitoring: {
        enabled: false
      },
      optimization: {
        autoOptimization: {
          enabled: false
        }
      }
    },

    staging: {
      database: {
        connectionPool: {
          maxPoolSize: 20,
          minPoolSize: 2
        }
      },
      cache: {
        l1: {
          max: 500
        }
      },
      monitoring: {
        enabled: true
      },
      optimization: {
        autoOptimization: {
          enabled: false
        }
      }
    },

    production: {
      database: {
        connectionPool: {
          maxPoolSize: 50,
          minPoolSize: 5
        }
      },
      cache: {
        l1: {
          max: 1000
        }
      },
      monitoring: {
        enabled: true
      },
      optimization: {
        autoOptimization: {
          enabled: true
        }
      }
    }
  }
};