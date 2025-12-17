/**
 * 实时计算系统配置
 * 统一管理实时引擎、流处理器和跟踪器的配置
 */

module.exports = {
  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'realtime:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  },

  // 实时引擎配置
  realtimeEngine: {
    // 数据保留时间
    dataRetention: {
      '1m': 60 * 1000,           // 1分钟
      '5m': 5 * 60 * 1000,       // 5分钟
      '15m': 15 * 60 * 1000,     // 15分钟
      '1h': 60 * 60 * 1000,      // 1小时
      '6h': 6 * 60 * 60 * 1000,  // 6小时
      '1d': 24 * 60 * 60 * 1000, // 1天
      '1w': 7 * 24 * 60 * 60 * 1000 // 1周
    },

    // 聚合窗口配置
    aggregationWindows: {
      sliding: {
        '1m': { size: 60, step: 1 },      // 60秒窗口，1秒步长
        '5m': { size: 300, step: 5 },     // 5分钟窗口，5秒步长
        '15m': { size: 900, step: 15 },   // 15分钟窗口，15秒步长
        '1h': { size: 3600, step: 60 }    // 1小时窗口，1分钟步长
      },
      tumbling: {
        '1m': 60,     // 1分钟翻滚窗口
        '5m': 300,    // 5分钟翻滚窗口
        '15m': 900,   // 15分钟翻滚窗口
        '1h': 3600    // 1小时翻滚窗口
      }
    },

    // 预计算配置
    precompute: {
      enabled: true,
      interval: 5000,                    // 5秒预计算一次
      priorityMetrics: [                 // 优先预计算的指标
        'response_time',
        'error_rate',
        'active_users',
        'throughput'
      ]
    },

    // 批处理配置
    batchProcessing: {
      enabled: true,
      batchSize: 100,                    // 批处理大小
      flushInterval: 1000,               // 1秒刷新间隔
      maxWaitTime: 5000                  // 最大等待时间
    },

    // 内存限制
    memory: {
      maxDataPoints: 10000,              // 内存中最大数据点数
      gcInterval: 60000,                 // 垃圾回收间隔
      memoryThreshold: 0.8               // 内存使用阈值
    },

    // 性能优化
    performance: {
      compressionEnabled: true,          // 启用数据压缩
      asyncProcessing: true,             // 异步处理
      cacheSize: 1000,                   // 缓存大小
      workerThreads: 4                   // 工作线程数
    }
  },

  // 流处理器配置
  streamProcessor: {
    // 处理器配置
    processors: {
      behavior: {
        enabled: true,
        bufferSize: 1000,
        flushInterval: 1000,
        batchSize: 50
      },
      finance: {
        enabled: true,
        bufferSize: 500,
        flushInterval: 2000,
        batchSize: 25
      },
      emergency: {
        enabled: true,
        bufferSize: 100,
        flushInterval: 500,
        batchSize: 10,
        priority: 'high'
      },
      system: {
        enabled: true,
        bufferSize: 2000,
        flushInterval: 500,
        batchSize: 100
      }
    },

    // 数据流配置
    dataStream: {
      defaultBufferSize: 1000,
      defaultFlushInterval: 1000,
      defaultBatchSize: 100,
      maxLatency: 5000,                  // 最大延迟时间
      backpressureThreshold: 0.8         // 背压阈值
    },

    // 过滤器配置
    filters: {
      dataValidation: {
        enabled: true,
        strict: false
      },
      duplicateFilter: {
        enabled: true,
        windowSize: 60000,               // 去重窗口时间
        maxCacheSize: 10000
      },
      rateLimit: {
        enabled: false,                  // 默认关闭
        windowSize: 60000,
        maxEvents: 1000
      }
    },

    // 转换器配置
    transformers: {
      geoCoder: {
        enabled: true,
        cacheEnabled: true,
        cacheSize: 1000,
        timeout: 5000
      },
      timeSeries: {
        enabled: true,
        timezone: 'Asia/Shanghai'
      },
      dataNormalization: {
        enabled: true,
        strict: false
      }
    },

    // 聚合器配置
    aggregators: {
      hourlyActivity: {
        enabled: true,
        windowSize: 3600000,             // 1小时
        persistent: true
      },
      dailySummary: {
        enabled: true,
        windowSize: 86400000,            // 1天
        persistent: true
      },
      userProfile: {
        enabled: true,
        persistent: true,
        updateInterval: 300000           // 5分钟更新一次
      }
    }
  },

  // 实时跟踪配置
  realtimeTracker: {
    // 跟踪开关
    enabled: true,

    // 路径配置
    excludePaths: [
      '/health',
      '/ping',
      '/favicon.ico',
      '/static',
      '/assets',
      '/css',
      '/js',
      '/images'
    ],

    includePaths: [
      '/api/v1/residents',
      '/api/v1/announcements',
      '/api/v1/finance',
      '/api/v1/votes',
      '/api/v1/help',
      '/api/v1/village-affairs',
      '/api/v1/emergency',
      '/api/v1/realtime',
      '/api/v1/data-integration'
    ],

    // 重要操作定义
    importantOperations: {
      methods: ['POST', 'PUT', 'DELETE'],
      endpoints: [
        '/api/v1/announcements',
        '/api/v1/finance',
        '/api/v1/votes',
        '/api/v1/emergency',
        '/api/v1/residents'
      ]
    },

    // 数据清理配置
    sanitize: {
      headers: {
        exclude: ['authorization', 'cookie', 'password'],
        maxLength: 100
      },
      businessData: {
        exclude: ['password', 'token', 'secret', 'key'],
        maxLength: 1000
      }
    },

    // 指标统计
    metrics: {
      requestCounter: true,
      responseTime: true,
      errorRate: true,
      throughput: true,
      activeUsers: true,
      businessOperations: true
    },

    // 阈值配置
    thresholds: {
      responseTime: {
        warning: 1000,                   // 1秒
        critical: 5000                   // 5秒
      },
      errorRate: {
        warning: 0.05,                   // 5%
        critical: 0.1                    // 10%
      },
      throughput: {
        min: 10                          // 最小吞吐量
      },
      memoryUsage: {
        warning: 0.8,                    // 80%
        critical: 0.9                    // 90%
      }
    },

    // 警报配置
    alerts: {
      enabled: true,
      channels: ['console', 'log', 'monitoring'],
      cooldown: {
        warning: 60000,                  // 1分钟
        critical: 30000                  // 30秒
      },
      escalation: {
        enabled: true,
        threshold: 3                     // 连续3次触发后升级
      }
    }
  },

  // API配置
  api: {
    // 订阅配置
    subscription: {
      enabled: true,
      maxConnections: 1000,              // 最大连接数
      heartbeatInterval: 30000,          // 心跳间隔
      reconnectInterval: 5000,           // 重连间隔
      maxRetries: 3                      // 最大重试次数
    },

    // 查询配置
    query: {
      defaultLimit: 100,                 // 默认查询限制
      maxLimit: 10000,                   // 最大查询限制
      timeout: 30000,                    // 查询超时时间
      cacheEnabled: true,                // 启用缓存
      cacheTimeout: 300                  // 缓存超时时间
    },

    // 批操作配置
    batch: {
      enabled: true,
      maxBatchSize: 1000,                // 最大批处理大小
      timeout: 60000,                    // 批处理超时
      concurrency: 5                     // 并发批处理数
    }
  },

  // 监控配置
  monitoring: {
    // 系统监控
    system: {
      enabled: true,
      interval: 5000,                    // 5秒监控间隔
      metrics: [
        'cpu',
        'memory',
        'disk',
        'network',
        'process'
      ]
    },

    // 应用监控
    application: {
      enabled: true,
      interval: 10000,                   // 10秒监控间隔
      metrics: [
        'requests',
        'errors',
        'response_time',
        'active_connections',
        'queue_size'
      ]
    },

    // 业务监控
    business: {
      enabled: true,
      interval: 30000,                   // 30秒监控间隔
      metrics: [
        'user_activity',
        'feature_usage',
        'conversion_rates',
        'business_operations'
      ]
    },

    // 健康检查
    healthCheck: {
      enabled: true,
      interval: 60000,                   // 1分钟检查间隔
      timeout: 5000,                     // 检查超时时间
      retries: 3                         // 重试次数
    }
  },

  // 日志配置
  logging: {
    enabled: true,
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    outputs: ['console', 'file'],
    file: {
      path: './logs/realtime.log',
      maxSize: '10MB',
      maxFiles: 5,
      rotateInterval: '1d'
    },
    structured: true,
    includeMetadata: true
  },

  // 安全配置
  security: {
    // 认证配置
    authentication: {
      enabled: true,
      tokenExpiry: 3600,                // 1小时
      refreshToken: true
    },

    // 授权配置
    authorization: {
      enabled: true,
      rbac: true,                        // 基于角色的访问控制
      resourceLevel: true                // 资源级权限控制
    },

    // 数据保护
    dataProtection: {
      encryption: {
        enabled: false,                  // 默认关闭加密
        algorithm: 'aes-256-gcm',
        keyRotation: true
      },
      masking: {
        enabled: true,
        fields: ['password', 'token', 'secret'],
        pattern: '***'
      }
    },

    // 速率限制
    rateLimit: {
      enabled: true,
      windowSize: 60000,                 // 1分钟窗口
      maxRequests: 1000,                 // 最大请求数
      perUser: true,                     // 按用户限制
      perIP: true                        // 按IP限制
    }
  },

  // 开发/调试配置
  development: {
    enabled: process.env.NODE_ENV !== 'production',
    debug: false,
    verboseLogging: false,
    mockData: false,
    hotReload: false,
    profiling: {
      enabled: false,
      interval: 60000,                   // 1分钟性能分析
      includeStack: true
    }
  },

  // 生产环境配置
  production: {
    enabled: process.env.NODE_ENV === 'production',
    clusterMode: true,
    gracefulShutdown: true,
    healthCheckEndpoint: '/health',
    metricsEndpoint: '/metrics',
    backupEnabled: true,
    disasterRecovery: {
      enabled: false,                    // 默认关闭灾备
      failover: false,
      dataReplication: false
    }
  }
};