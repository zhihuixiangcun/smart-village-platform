# 智慧村庄平台系统性能优化策略

## 🚀 性能优化方案总览

**文档版本**: v1.0  
**创建时间**: 2024年9月11日  
**适用范围**: 智慧村庄综合服务平台第三阶段  
**性能目标**: 高并发、低延迟、高可用

---

## 🎯 性能目标和基准

### 关键性能指标 (KPI)

```javascript
// 性能基准目标
const performanceTargets = {
  // 响应时间指标
  responseTime: {
    api: {
      p50: '<200ms',      // 50%请求在200ms内响应
      p95: '<500ms',      // 95%请求在500ms内响应
      p99: '<1000ms'      // 99%请求在1s内响应
    },
    frontend: {
      firstContentfulPaint: '<1.5s',    // 首次内容绘制
      largestContentfulPaint: '<2.5s',  // 最大内容绘制
      timeToInteractive: '<3s'          // 可交互时间
    }
  },

  // 吞吐量指标
  throughput: {
    concurrent_users: 1000,             // 并发用户数
    requests_per_second: 5000,          // 每秒请求数
    data_processing: '10GB/hour'        // 数据处理能力
  },

  // 资源利用率
  resourceUtilization: {
    cpu: '<70%',                        // CPU使用率
    memory: '<80%',                     // 内存使用率
    disk_io: '<60%',                    // 磁盘IO
    network_bandwidth: '<50%'           // 网络带宽
  },

  // 可用性指标
  availability: {
    uptime: '99.9%',                    // 系统可用性
    recovery_time: '<30min',            // 故障恢复时间
    data_consistency: '100%'            // 数据一致性
  }
}
```

### 性能测试基准环境

```yaml
# 标准测试环境配置
test_environment:
  hardware:
    cpu: "Intel Xeon 8核心"
    memory: "16GB DDR4"
    storage: "SSD 500GB"
    network: "1Gbps"
  
  software:
    os: "Ubuntu 20.04 LTS"
    node_version: "18.17.0"
    mongodb_version: "5.0"
    redis_version: "7.0"
  
  load_testing:
    tools: ["Artillery", "JMeter", "K6"]
    scenarios: ["Normal Load", "Peak Load", "Stress Test"]
    duration: "30 minutes per test"
```

---

## 🔧 数据库性能优化

### 1. MongoDB查询优化策略

#### 索引优化设计
```javascript
// 村委日常开支索引策略
db.villagedailyexpenses.createIndex({
  "villageId": 1,
  "expenseDate": -1
}, {
  name: "village_date_index",
  background: true
});

// 复合索引 - 村庄+状态+日期
db.villagedailyexpenses.createIndex({
  "villageId": 1,
  "status": 1,
  "expenseDate": -1
}, {
  name: "village_status_date_compound",
  background: true
});

// 审批流程索引
db.villagedailyexpenses.createIndex({
  "approvalProcess.currentStage": 1,
  "approvalProcess.approvalHistory.approver": 1
}, {
  name: "approval_process_index",
  background: true
});

// 分类统计索引
db.villagedailyexpenses.createIndex({
  "villageId": 1,
  "expenseCategory": 1,
  "amount": 1
}, {
  name: "category_amount_index",
  background: true
});

// 项目管理索引策略
db.villageprojects.createIndex({
  "villageId": 1,
  "status": 1,
  "timeline.startDate": -1
}, {
  name: "project_status_timeline",
  background: true
});

// 预算相关索引
db.villageprojects.createIndex({
  "budget.totalBudget": 1,
  "budget.usedBudget": 1
}, {
  name: "budget_range_index",
  background: true
});
```

#### 查询优化技术
```javascript
// 聚合管道优化
class DatabaseOptimizer {
  // 分页查询优化 - 使用skip替代方案
  async optimizedPagination(collection, filter, page, limit) {
    // 使用游标分页替代skip
    const lastId = page > 1 ? await this.getLastIdFromPreviousPage(collection, filter, page, limit) : null;
    
    const pipeline = [
      // 添加ID过滤条件
      ...(lastId ? [{ $match: { _id: { $gt: ObjectId(lastId) } } }] : []),
      
      // 基础过滤条件
      { $match: filter },
      
      // 排序
      { $sort: { _id: 1 } },
      
      // 限制结果数量
      { $limit: limit },
      
      // 数据预处理
      {
        $lookup: {
          from: 'users',
          localField: 'handler.handlerId',
          foreignField: '_id',
          as: 'handlerInfo'
        }
      }
    ];
    
    return await collection.aggregate(pipeline).toArray();
  }

  // 统计查询优化
  async getExpenseStatistics(villageId, dateRange) {
    const pipeline = [
      // 初步过滤
      {
        $match: {
          villageId: ObjectId(villageId),
          expenseDate: {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
          }
        }
      },
      
      // 分组统计
      {
        $group: {
          _id: {
            category: '$expenseCategory',
            month: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      
      // 结果重组
      {
        $group: {
          _id: '$_id.month',
          categories: {
            $push: {
              category: '$_id.category',
              totalAmount: '$totalAmount',
              count: '$count',
              avgAmount: '$avgAmount'
            }
          },
          monthTotal: { $sum: '$totalAmount' }
        }
      },
      
      // 排序
      { $sort: { _id: 1 } }
    ];
    
    return await VillageDailyExpense.aggregate(pipeline);
  }

  // 预算使用率查询优化
  async getBudgetUtilization(villageId, budgetId) {
    const pipeline = [
      {
        $match: {
          villageId: ObjectId(villageId),
          'budgetInfo.budgetId': ObjectId(budgetId),
          status: { $in: ['approved', 'paid'] }
        }
      },
      {
        $group: {
          _id: '$budgetInfo.budgetId',
          usedAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          lastTransaction: { $max: '$expenseDate' }
        }
      }
    ];
    
    return await VillageDailyExpense.aggregate(pipeline);
  }
}
```

### 2. 数据库连接优化

#### 连接池配置
```javascript
// MongoDB连接池优化
const mongoConfig = {
  // 连接池设置
  minPoolSize: 5,                     // 最小连接数
  maxPoolSize: 50,                    // 最大连接数
  maxIdleTimeMS: 30000,               // 最大空闲时间30秒
  waitQueueTimeoutMS: 5000,           // 等待队列超时5秒
  
  // 连接超时设置
  serverSelectionTimeoutMS: 5000,     // 服务器选择超时
  connectTimeoutMS: 10000,            // 连接超时
  socketTimeoutMS: 45000,             // 套接字超时
  
  // 重试机制
  retryWrites: true,                  // 重试写操作
  retryReads: true,                   // 重试读操作
  
  // 读取偏好
  readPreference: 'secondaryPreferred', // 优先从从节点读取
  readConcern: { level: 'majority' }   // 读一致性级别
};

// 数据库连接管理器
class DatabaseConnectionManager {
  constructor() {
    this.connections = new Map();
    this.healthCheckInterval = 30000; // 30秒健康检查
  }

  async createConnection(config) {
    try {
      const connection = await mongoose.connect(config.uri, mongoConfig);
      
      // 连接事件监听
      connection.connection.on('connected', () => {
        console.log('MongoDB连接成功');
      });
      
      connection.connection.on('error', (err) => {
        console.error('MongoDB连接错误:', err);
        this.handleConnectionError(err);
      });
      
      connection.connection.on('disconnected', () => {
        console.log('MongoDB连接断开');
        this.attemptReconnection();
      });
      
      return connection;
    } catch (error) {
      console.error('数据库连接失败:', error);
      throw error;
    }
  }

  // 连接健康检查
  async healthCheck() {
    try {
      await mongoose.connection.db.admin().ping();
      return { status: 'healthy', latency: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // 连接断开重试
  async attemptReconnection() {
    const maxRetries = 5;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, mongoConfig);
        console.log('重连成功');
        break;
      } catch (error) {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // 指数退避
        console.log(`重连失败，${delay}ms后重试 (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

### 3. 数据分片和读写分离

#### 数据分片策略
```javascript
// 分片键设计
const shardingStrategy = {
  // 按村庄ID分片
  villageSharding: {
    shardKey: { villageId: 1 },
    chunkSize: 64, // 64MB chunk size
    balancer: true,
    zones: [
      {
        name: 'east_zone',
        range: { villageId: { $gte: ObjectId('000000000000000000000000'), $lt: ObjectId('400000000000000000000000') } }
      },
      {
        name: 'west_zone', 
        range: { villageId: { $gte: ObjectId('400000000000000000000000'), $lt: ObjectId('800000000000000000000000') } }
      },
      {
        name: 'central_zone',
        range: { villageId: { $gte: ObjectId('800000000000000000000000'), $lt: ObjectId('ffffffffffffffffffffffff') } }
      }
    ]
  },

  // 按时间分片 (历史数据)
  timeBasedSharding: {
    collections: ['villagedailyexpenses_archive', 'villageprojects_archive'],
    shardKey: { expenseDate: 1, villageId: 1 },
    archiveAfter: '2_years' // 2年后归档
  }
};

// 读写分离实现
class ReadWriteSeparator {
  constructor() {
    this.writeConnection = mongoose.createConnection(process.env.MONGODB_WRITE_URI);
    this.readConnection = mongoose.createConnection(process.env.MONGODB_READ_URI);
  }

  // 写操作路由
  async executeWrite(model, operation, data) {
    const WriteModel = this.writeConnection.model(model.modelName, model.schema);
    return await WriteModel[operation](data);
  }

  // 读操作路由
  async executeRead(model, operation, query) {
    const ReadModel = this.readConnection.model(model.modelName, model.schema);
    return await ReadModel[operation](query);
  }

  // 智能查询路由
  routeQuery(operation, isRealTime = false) {
    // 实时性要求高的查询走主库
    if (isRealTime || ['create', 'update', 'delete'].includes(operation)) {
      return this.writeConnection;
    }
    // 统计查询走从库
    return this.readConnection;
  }
}
```

---

## 🚀 应用层性能优化

### 1. 缓存策略设计

#### Redis缓存架构
```javascript
// 多层级缓存策略
class CacheManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }

  // L1缓存 - 应用内存缓存
  l1Cache = new NodeCache({
    stdTTL: 600,        // 10分钟过期
    checkperiod: 120,   // 每2分钟检查过期
    useClones: false    // 不克隆对象以节省内存
  });

  // L2缓存 - Redis分布式缓存
  async get(key, fallback = null) {
    try {
      // 先查L1缓存
      let value = this.l1Cache.get(key);
      if (value !== undefined) {
        return value;
      }

      // 再查Redis
      value = await this.redis.get(key);
      if (value) {
        const parsed = JSON.parse(value);
        this.l1Cache.set(key, parsed); // 回写L1缓存
        return parsed;
      }

      // 执行回调获取数据
      if (fallback && typeof fallback === 'function') {
        value = await fallback();
        if (value) {
          await this.set(key, value);
        }
        return value;
      }

      return null;
    } catch (error) {
      console.error('缓存获取失败:', error);
      return fallback ? await fallback() : null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      // 同时写入L1和L2缓存
      this.l1Cache.set(key, value, ttl);
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('缓存设置失败:', error);
    }
  }

  // 缓存预热
  async warmup() {
    const warmupTasks = [
      this.preloadExpenseCategories(),
      this.preloadUserPermissions(),
      this.preloadSystemConfig()
    ];
    
    await Promise.all(warmupTasks);
  }

  // 预加载开支分类
  async preloadExpenseCategories() {
    const categories = await VillageDailyExpense.distinct('expenseCategory');
    await this.set('expense:categories', categories, 86400); // 24小时
  }

  // 预加载用户权限
  async preloadUserPermissions() {
    const permissions = await User.find({}, 'permissions role').lean();
    const permissionMap = {};
    permissions.forEach(user => {
      permissionMap[user._id] = { permissions: user.permissions, role: user.role };
    });
    await this.set('user:permissions', permissionMap, 3600); // 1小时
  }
}

// 查询结果缓存
class QueryCache {
  constructor(cacheManager) {
    this.cache = cacheManager;
  }

  // 生成缓存键
  generateCacheKey(prefix, params) {
    const sortedParams = Object.keys(params).sort().reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
    return `${prefix}:${crypto.createHash('md5').update(JSON.stringify(sortedParams)).digest('hex')}`;
  }

  // 缓存装饰器
  cached(ttl = 3600) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        const cacheKey = this.generateCacheKey(`${target.constructor.name}:${propertyKey}`, args[0] || {});
        
        // 尝试从缓存获取
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return cached;
        }

        // 执行原方法
        const result = await originalMethod.apply(this, args);
        
        // 缓存结果
        if (result) {
          await this.cache.set(cacheKey, result, ttl);
        }
        
        return result;
      };
    };
  }
}
```

#### 查询缓存实现
```javascript
// 开支管理服务缓存增强
class VillageDailyExpenseServiceOptimized extends VillageDailyExpenseService {
  constructor() {
    super();
    this.cache = new CacheManager();
    this.queryCache = new QueryCache(this.cache);
  }

  // 缓存开支列表查询
  @cached(600) // 10分钟缓存
  async getExpensesList(params) {
    const {
      villageId,
      page = 1,
      limit = 20,
      status,
      category,
      startDate,
      endDate
    } = params;

    // 构建查询条件
    const filter = { villageId: new mongoose.Types.ObjectId(villageId) };
    
    if (status) filter.status = status;
    if (category) filter.expenseCategory = category;
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    // 执行优化查询
    const pipeline = [
      { $match: filter },
      { $sort: { expenseDate: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'handler.handlerId',
          foreignField: '_id',
          as: 'handlerInfo',
          pipeline: [{ $project: { name: 1, position: 1 } }]
        }
      }
    ];

    const [expenses, total] = await Promise.all([
      VillageDailyExpense.aggregate(pipeline),
      VillageDailyExpense.countDocuments(filter)
    ]);

    return {
      data: expenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // 缓存统计数据
  @cached(1800) // 30分钟缓存
  async getExpenseStatistics(villageId, dateRange) {
    const cacheKey = `stats:expenses:${villageId}:${dateRange.start}:${dateRange.end}`;
    
    return await this.cache.get(cacheKey, async () => {
      // 执行复杂统计查询
      const pipeline = [
        {
          $match: {
            villageId: new mongoose.Types.ObjectId(villageId),
            expenseDate: {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end)
            }
          }
        },
        {
          $facet: {
            // 按类别统计
            byCategory: [
              {
                $group: {
                  _id: '$expenseCategory',
                  total: { $sum: '$amount' },
                  count: { $sum: 1 },
                  avgAmount: { $avg: '$amount' }
                }
              },
              { $sort: { total: -1 } }
            ],
            
            // 按月统计
            byMonth: [
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } },
                  total: { $sum: '$amount' },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ],
            
            // 总体统计
            overall: [
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: '$amount' },
                  totalCount: { $sum: 1 },
                  avgAmount: { $avg: '$amount' },
                  maxAmount: { $max: '$amount' },
                  minAmount: { $min: '$amount' }
                }
              }
            ]
          }
        }
      ];

      const [result] = await VillageDailyExpense.aggregate(pipeline);
      return result;
    });
  }

  // 缓存失效处理
  async invalidateExpenseCache(villageId) {
    const patterns = [
      `VillageDailyExpenseServiceOptimized:getExpensesList:*${villageId}*`,
      `stats:expenses:${villageId}:*`
    ];
    
    for (const pattern of patterns) {
      const keys = await this.cache.redis.keys(pattern);
      if (keys.length > 0) {
        await this.cache.redis.del(...keys);
      }
    }
  }

  // 创建开支后清除相关缓存
  async createExpense(expenseData) {
    const result = await super.createExpense(expenseData);
    await this.invalidateExpenseCache(expenseData.villageId);
    return result;
  }
}
```

### 2. API响应优化

#### 响应时间优化
```javascript
// API响应优化中间件
class ResponseOptimizer {
  // 响应压缩
  static compressionMiddleware() {
    return compression({
      filter: (req, res) => {
        // 不压缩已经压缩的内容
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,           // 压缩级别
      threshold: 1024,    // 大于1KB才压缩
      windowBits: 15,     // 压缩窗口大小
      chunkSize: 1024,    // 块大小
      memLevel: 8         // 内存级别
    });
  }

  // 响应缓存中间件
  static responseCacheMiddleware() {
    return (req, res, next) => {
      // 只缓存GET请求
      if (req.method !== 'GET') {
        return next();
      }

      const key = `response:${req.originalUrl}`;
      
      // 检查缓存
      redis.get(key, (err, cached) => {
        if (cached) {
          const data = JSON.parse(cached);
          res.set(data.headers);
          return res.status(data.status).send(data.body);
        }
        
        // 拦截响应
        const originalSend = res.send;
        res.send = function(body) {
          // 缓存响应 (只缓存成功响应)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const cacheData = {
              status: res.statusCode,
              headers: res.getHeaders(),
              body: body
            };
            redis.setex(key, 300, JSON.stringify(cacheData)); // 缓存5分钟
          }
          
          originalSend.call(this, body);
        };
        
        next();
      });
    };
  }

  // 分页优化
  static paginationOptimizer() {
    return (req, res, next) => {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100); // 最大100条
      
      // 优化大页码查询
      if (page > 1000) {
        return res.status(400).json({
          success: false,
          message: '页码过大，请使用搜索功能缩小范围'
        });
      }
      
      req.pagination = { page, limit };
      next();
    };
  }
}

// API路由优化
class OptimizedExpenseRouter {
  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // 应用优化中间件
    this.router.use(ResponseOptimizer.compressionMiddleware());
    this.router.use(ResponseOptimizer.responseCacheMiddleware());
    this.router.use(ResponseOptimizer.paginationOptimizer());

    // 优化的列表查询
    this.router.get('/expenses', async (req, res) => {
      try {
        const startTime = Date.now();
        
        // 并行执行查询和统计
        const [expenses, stats] = await Promise.all([
          this.getExpensesOptimized(req.query),
          this.getQuickStats(req.query.villageId)
        ]);

        const responseTime = Date.now() - startTime;

        res.json({
          success: true,
          data: expenses,
          stats,
          meta: {
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: '查询失败',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });

    // 批量操作优化
    this.router.post('/expenses/batch', async (req, res) => {
      const { operation, ids, data } = req.body;
      
      try {
        let result;
        
        switch (operation) {
          case 'approve':
            result = await this.batchApprove(ids, data);
            break;
          case 'delete':
            result = await this.batchDelete(ids);
            break;
          default:
            throw new Error('不支持的批量操作');
        }

        res.json({
          success: true,
          data: result,
          processed: ids.length
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      }
    });
  }

  // 优化的批量审批
  async batchApprove(ids, approvalData) {
    const bulkOps = ids.map(id => ({
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            status: 'approved',
            'approvalProcess.currentStage': 'completed'
          },
          $push: {
            'approvalProcess.approvalHistory': {
              approver: approvalData.approverId,
              action: 'approve',
              comments: approvalData.comments,
              approvalDate: new Date()
            }
          }
        }
      }
    }));

    const result = await VillageDailyExpense.bulkWrite(bulkOps);
    return {
      modified: result.modifiedCount,
      matched: result.matchedCount
    };
  }
}
```

### 3. 文件处理优化

#### 文件上传和OCR优化
```javascript
// 文件处理优化服务
class FileProcessingOptimizer {
  constructor() {
    this.uploadPath = path.join(__dirname, '../uploads');
    this.tempPath = path.join(__dirname, '../temp');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  // 优化的文件上传配置
  getOptimizedMulterConfig() {
    return multer({
      storage: multer.memoryStorage(), // 使用内存存储减少IO
      limits: {
        fileSize: this.maxFileSize,
        files: 5 // 最多5个文件
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  // 智能文件过滤
  fileFilter(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 JPEG, JPG, PNG, PDF 格式'));
    }
  }

  // 并行文件处理
  async processFiles(files) {
    const processPromises = files.map(file => this.processFile(file));
    const results = await Promise.allSettled(processPromises);
    
    return results.map((result, index) => ({
      filename: files[index].originalname,
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }

  // 单文件处理优化
  async processFile(file) {
    try {
      // 1. 文件压缩和优化
      const optimizedBuffer = await this.optimizeImage(file.buffer, file.mimetype);
      
      // 2. 生成唯一文件名
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${this.getExtension(file.mimetype)}`;
      const filepath = path.join(this.uploadPath, filename);
      
      // 3. 异步写入文件
      await fs.promises.writeFile(filepath, optimizedBuffer);
      
      // 4. 并行OCR识别
      const ocrPromise = this.performOCR(optimizedBuffer, file.mimetype);
      
      // 5. 生成缩略图
      const thumbnailPromise = this.generateThumbnail(optimizedBuffer, filename);
      
      // 6. 等待所有处理完成
      const [ocrResult, thumbnailPath] = await Promise.allSettled([
        ocrPromise,
        thumbnailPromise
      ]);

      return {
        filename,
        path: filepath,
        size: optimizedBuffer.length,
        mimetype: file.mimetype,
        thumbnail: thumbnailPath.status === 'fulfilled' ? thumbnailPath.value : null,
        ocr: ocrResult.status === 'fulfilled' ? ocrResult.value : null,
        uploadTime: new Date()
      };
    } catch (error) {
      console.error('文件处理失败:', error);
      throw error;
    }
  }

  // 图片优化压缩
  async optimizeImage(buffer, mimetype) {
    if (!mimetype.startsWith('image/')) {
      return buffer;
    }

    try {
      const sharp = require('sharp');
      
      return await sharp(buffer)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toBuffer();
    } catch (error) {
      console.error('图片优化失败:', error);
      return buffer;
    }
  }

  // 异步OCR识别队列
  async performOCR(buffer, mimetype) {
    const ocrQueue = require('./ocrQueue');
    
    // 添加到OCR处理队列
    const job = await ocrQueue.add('ocr-process', {
      buffer: buffer.toString('base64'),
      mimetype
    }, {
      priority: 1,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return job.id;
  }

  // 缩略图生成
  async generateThumbnail(buffer, filename) {
    if (!buffer) return null;

    try {
      const sharp = require('sharp');
      const thumbnailPath = path.join(this.uploadPath, 'thumbnails', `thumb_${filename}`);
      
      await sharp(buffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      console.error('缩略图生成失败:', error);
      return null;
    }
  }
}

// OCR处理队列
const Queue = require('bull');
const ocrQueue = new Queue('OCR processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// OCR队列处理器
ocrQueue.process('ocr-process', async (job) => {
  const { buffer, mimetype } = job.data;
  const imageBuffer = Buffer.from(buffer, 'base64');
  
  try {
    // 多OCR服务商并行识别
    const ocrResults = await Promise.allSettled([
      baiduOCR.recognize(imageBuffer),
      tencentOCR.recognize(imageBuffer),
      aliyunOCR.recognize(imageBuffer)
    ]);

    // 选择最佳识别结果
    const bestResult = this.selectBestOCRResult(ocrResults);
    return bestResult;
  } catch (error) {
    console.error('OCR识别失败:', error);
    throw error;
  }
});

// 选择最佳OCR结果
function selectBestOCRResult(results) {
  const validResults = results
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value)
    .filter(result => result.confidence > 0.8);

  if (validResults.length === 0) {
    return { success: false, message: '识别失败' };
  }

  // 选择置信度最高的结果
  return validResults.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );
}
```

---

## 🌐 前端性能优化

### 1. 代码分割和懒加载

#### Vue.js 应用优化
```javascript
// 路由级代码分割
const routes = [
  {
    path: '/finance',
    name: 'Finance',
    component: () => import(
      /* webpackChunkName: "finance" */ 
      '@/views/finance/FinanceManagement.vue'
    ),
    children: [
      {
        path: 'expenses',
        component: () => import(
          /* webpackChunkName: "finance-expenses" */
          '@/views/finance/DailyExpenseManagement.vue'
        )
      },
      {
        path: 'reports',
        component: () => import(
          /* webpackChunkName: "finance-reports" */
          '@/views/finance/FinanceReports.vue'
        )
      }
    ]
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import(
      /* webpackChunkName: "projects" */
      '@/views/project/ProjectManagement.vue'
    )
  }
];

// 组件级懒加载
export default {
  name: 'DailyExpenseManagement',
  components: {
    // 异步组件加载
    ExpenseChart: defineAsyncComponent({
      loader: () => import('@/components/charts/ExpenseChart.vue'),
      loadingComponent: LoadingSpinner,
      errorComponent: ErrorComponent,
      delay: 200,
      timeout: 3000
    }),
    
    // 条件加载组件
    ExpenseReportDialog: defineAsyncComponent(() => {
      if (this.hasReportPermission) {
        return import('@/components/finance/ExpenseReportDialog.vue');
      }
      return Promise.resolve(null);
    })
  },

  setup() {
    // 懒加载第三方库
    const loadECharts = async () => {
      const echarts = await import('echarts');
      return echarts;
    };

    const loadExcelJS = async () => {
      const ExcelJS = await import('exceljs');
      return ExcelJS;
    };

    return {
      loadECharts,
      loadExcelJS
    };
  }
};
```

#### 资源优化配置
```javascript
// Vite配置优化
export default defineConfig({
  build: {
    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          // 第三方库分离
          'vendor-ui': ['element-plus', '@element-plus/icons-vue'],
          'vendor-charts': ['echarts', 'chart.js'],
          'vendor-utils': ['lodash', 'dayjs', 'axios'],
          
          // 业务模块分离
          'finance-module': [
            'src/views/finance',
            'src/components/finance'
          ],
          'project-module': [
            'src/views/project', 
            'src/components/project'
          ]
        }
      }
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log']
      }
    },
    
    // Chunk大小警告
    chunkSizeWarningLimit: 1000
  },

  // 开发服务器优化
  server: {
    fs: {
      // 提高文件系统访问性能
      cachedChecks: false
    }
  },

  // 预构建优化
  optimizeDeps: {
    include: [
      'element-plus',
      'echarts',
      'dayjs',
      'lodash'
    ],
    exclude: [
      // 排除大型库的预构建
      'some-large-library'
    ]
  }
});
```

### 2. 虚拟滚动和分页优化

#### 虚拟列表实现
```vue
<!-- VirtualList.vue -->
<template>
  <div 
    ref="containerRef"
    class="virtual-list-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <!-- 占位元素 -->
    <div :style="{ height: totalHeight + 'px' }" />
    
    <!-- 可见区域内容 -->
    <div
      class="virtual-list-content"
      :style="{
        transform: `translateY(${offsetY}px)`,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0
      }"
    >
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="virtual-list-item"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="item.index" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  itemHeight: {
    type: Number,
    default: 50
  },
  containerHeight: {
    type: Number,
    default: 400
  },
  buffer: {
    type: Number,
    default: 5
  }
});

const containerRef = ref(null);
const scrollTop = ref(0);

// 计算属性
const totalHeight = computed(() => props.items.length * props.itemHeight);

const visibleCount = computed(() => 
  Math.ceil(props.containerHeight / props.itemHeight)
);

const startIndex = computed(() => 
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer)
);

const endIndex = computed(() => 
  Math.min(
    props.items.length - 1,
    startIndex.value + visibleCount.value + 2 * props.buffer
  )
);

const visibleItems = computed(() => 
  props.items.slice(startIndex.value, endIndex.value + 1).map((item, index) => ({
    ...item,
    index: startIndex.value + index
  }))
);

const offsetY = computed(() => startIndex.value * props.itemHeight);

// 滚动处理
const handleScroll = (event) => {
  scrollTop.value = event.target.scrollTop;
};

// 滚动到指定位置
const scrollToIndex = (index) => {
  const targetScrollTop = index * props.itemHeight;
  containerRef.value.scrollTop = targetScrollTop;
};

defineExpose({
  scrollToIndex
});
</script>
```

#### 智能分页组件
```vue
<!-- SmartPagination.vue -->
<template>
  <div class="smart-pagination">
    <!-- 分页信息 -->
    <div class="pagination-info">
      显示第 {{ startItem }} - {{ endItem }} 条，共 {{ total }} 条记录
    </div>
    
    <!-- 分页控件 -->
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="total"
      :layout="layout"
      :disabled="loading"
      @current-change="handlePageChange"
      @size-change="handleSizeChange"
    />
    
    <!-- 快速跳转 -->
    <div class="quick-jump" v-if="showQuickJump">
      <span>跳转至</span>
      <el-input-number
        v-model="jumpPage"
        :min="1"
        :max="totalPages"
        size="small"
        style="width: 80px"
        @keyup.enter="handleJump"
      />
      <el-button size="small" @click="handleJump">跳转</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  total: {
    type: Number,
    required: true
  },
  page: {
    type: Number,
    default: 1
  },
  limit: {
    type: Number,
    default: 20
  },
  loading: {
    type: Boolean,
    default: false
  },
  showQuickJump: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['change']);

const currentPage = ref(props.page);
const pageSize = ref(props.limit);
const jumpPage = ref(1);

// 计算属性
const totalPages = computed(() => Math.ceil(props.total / pageSize.value));
const startItem = computed(() => (currentPage.value - 1) * pageSize.value + 1);
const endItem = computed(() => 
  Math.min(currentPage.value * pageSize.value, props.total)
);

const layout = computed(() => {
  if (props.total > 1000) {
    return 'total, sizes, prev, pager, next, jumper';
  }
  return 'total, sizes, prev, pager, next';
});

// 事件处理
const handlePageChange = (page) => {
  currentPage.value = page;
  emit('change', { page, limit: pageSize.value });
};

const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1; // 重置到第一页
  emit('change', { page: 1, limit: size });
};

const handleJump = () => {
  if (jumpPage.value >= 1 && jumpPage.value <= totalPages.value) {
    handlePageChange(jumpPage.value);
  }
};

// 监听外部页码变化
watch(() => props.page, (newPage) => {
  currentPage.value = newPage;
});

watch(() => props.limit, (newLimit) => {
  pageSize.value = newLimit;
});
</script>
```

### 3. 图片和静态资源优化

#### 响应式图片组件
```vue
<!-- OptimizedImage.vue -->
<template>
  <div class="optimized-image" :class="{ loading: isLoading }">
    <img
      v-if="!isLoading && !error"
      :src="optimizedSrc"
      :alt="alt"
      :loading="lazy ? 'lazy' : 'eager'"
      :class="imageClass"
      @load="handleLoad"
      @error="handleError"
    />
    
    <!-- 加载占位符 -->
    <div v-if="isLoading" class="image-placeholder">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item variant="image" :style="placeholderStyle" />
        </template>
      </el-skeleton>
    </div>
    
    <!-- 错误占位符 -->
    <div v-if="error" class="image-error">
      <el-icon><Picture /></el-icon>
      <span>图片加载失败</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Picture } from '@element-plus/icons-vue';

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  width: {
    type: [Number, String],
    default: 'auto'
  },
  height: {
    type: [Number, String], 
    default: 'auto'
  },
  lazy: {
    type: Boolean,
    default: true
  },
  quality: {
    type: Number,
    default: 80
  },
  format: {
    type: String,
    default: 'webp',
    validator: (value) => ['webp', 'jpeg', 'png'].includes(value)
  }
});

const isLoading = ref(true);
const error = ref(false);

// 计算优化后的图片URL
const optimizedSrc = computed(() => {
  if (!props.src) return '';
  
  // 构建优化参数
  const params = new URLSearchParams();
  if (props.width !== 'auto') params.append('w', props.width.toString());
  if (props.height !== 'auto') params.append('h', props.height.toString());
  params.append('q', props.quality.toString());
  params.append('f', props.format);
  
  // 判断是否为内部图片服务
  if (props.src.startsWith('/uploads/') || props.src.startsWith('/api/files/')) {
    return `${props.src}?${params.toString()}`;
  }
  
  // 外部图片使用CDN服务
  return `${process.env.VITE_CDN_URL}/resize?url=${encodeURIComponent(props.src)}&${params.toString()}`;
});

const placeholderStyle = computed(() => ({
  width: props.width === 'auto' ? '200px' : `${props.width}px`,
  height: props.height === 'auto' ? '150px' : `${props.height}px`
}));

const imageClass = computed(() => ({
  'fade-in': !isLoading
}));

// 事件处理
const handleLoad = () => {
  isLoading.value = false;
  error.value = false;
};

const handleError = () => {
  isLoading.value = false;
  error.value = true;
};

onMounted(() => {
  // 预加载图片
  if (!props.lazy) {
    const img = new Image();
    img.src = optimizedSrc.value;
    img.onload = handleLoad;
    img.onerror = handleError;
  }
});
</script>

<style scoped>
.optimized-image {
  position: relative;
  display: inline-block;
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.image-placeholder,
.image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}

.image-error {
  flex-direction: column;
  color: #909399;
  font-size: 14px;
}
</style>
```

#### 静态资源CDN配置
```javascript
// CDN资源管理服务
class CDNManager {
  constructor() {
    this.domains = [
      'https://cdn1.village-platform.com',
      'https://cdn2.village-platform.com'
    ];
    this.currentDomain = 0;
  }

  // 获取CDN URL
  getCDNUrl(path, options = {}) {
    const domain = this.getActiveDomain();
    const optimizedPath = this.buildOptimizedPath(path, options);
    return `${domain}${optimizedPath}`;
  }

  // 构建优化路径
  buildOptimizedPath(path, options) {
    const { width, height, quality = 80, format = 'webp' } = options;
    
    if (!width && !height) return path;
    
    const params = new URLSearchParams();
    if (width) params.append('w', width);
    if (height) params.append('h', height);
    params.append('q', quality);
    params.append('f', format);
    
    return `${path}?${params.toString()}`;
  }

  // 域名负载均衡
  getActiveDomain() {
    const domain = this.domains[this.currentDomain];
    this.currentDomain = (this.currentDomain + 1) % this.domains.length;
    return domain;
  }

  // 资源预加载
  preloadResources(resources) {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = this.getCDNUrl(resource.path, resource.options);
      link.as = resource.type || 'image';
      document.head.appendChild(link);
    });
  }

  // 关键资源预加载
  preloadCriticalResources() {
    const criticalResources = [
      { path: '/assets/logo.png', type: 'image', options: { width: 200, quality: 90 } },
      { path: '/assets/icons/sprite.svg', type: 'image' },
      { path: '/fonts/main.woff2', type: 'font', crossorigin: 'anonymous' }
    ];
    
    this.preloadResources(criticalResources);
  }
}

// 图片懒加载指令
const lazyLoad = {
  mounted(el, binding) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = binding.value;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px'
    });
    
    observer.observe(el);
  }
};

// 全局注册
app.directive('lazy', lazyLoad);
```

---

## 📊 监控和性能分析

### 1. 前端性能监控

#### Web Vitals监控
```javascript
// 性能监控服务
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.setupVitalsMonitoring();
  }

  // Core Web Vitals监控
  setupVitalsMonitoring() {
    // First Contentful Paint
    this.observeMetric('FCP', (entry) => {
      this.recordMetric('FCP', entry.startTime);
    });

    // Largest Contentful Paint
    this.observeMetric('LCP', (entry) => {
      this.recordMetric('LCP', entry.startTime);
    });

    // First Input Delay
    this.observeMetric('FID', (entry) => {
      this.recordMetric('FID', entry.processingStart - entry.startTime);
    });

    // Cumulative Layout Shift
    this.observeCLS();
  }

  // 观察性能指标
  observeMetric(type, callback) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      
      observer.observe({ entryTypes: [this.getEntryType(type)] });
      this.observers.set(type, observer);
    } catch (error) {
      console.warn(`无法观察${type}指标:`, error);
    }
  }

  // 布局偏移监控
  observeCLS() {
    let clsValue = 0;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue);
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('CLS', observer);
  }

  // 记录指标
  recordMetric(name, value) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href
    };

    this.metrics.set(name, metric);
    this.sendMetricToServer(metric);
  }

  // 发送指标到服务器
  async sendMetricToServer(metric) {
    try {
      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metric)
      });
    } catch (error) {
      console.error('性能指标上报失败:', error);
    }
  }

  // 获取入口类型
  getEntryType(metric) {
    const types = {
      'FCP': 'paint',
      'LCP': 'largest-contentful-paint',
      'FID': 'first-input',
      'CLS': 'layout-shift'
    };
    return types[metric] || 'navigation';
  }

  // 资源加载性能分析
  analyzeResourcePerformance() {
    const resources = performance.getEntriesByType('resource');
    const analysis = {
      totalResources: resources.length,
      slowResources: [],
      largeResources: [],
      failedResources: []
    };

    resources.forEach(resource => {
      // 慢资源 (>3秒)
      if (resource.duration > 3000) {
        analysis.slowResources.push({
          name: resource.name,
          duration: resource.duration,
          size: resource.transferSize
        });
      }

      // 大资源 (>1MB)
      if (resource.transferSize > 1024 * 1024) {
        analysis.largeResources.push({
          name: resource.name,
          size: resource.transferSize,
          type: this.getResourceType(resource.name)
        });
      }

      // 失败资源
      if (resource.responseEnd === 0) {
        analysis.failedResources.push(resource.name);
      }
    });

    return analysis;
  }

  // 获取资源类型
  getResourceType(url) {
    if (url.match(/\.(js|mjs)$/)) return 'script';
    if (url.match(/\.(css)$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  // 生成性能报告
  generateReport() {
    const report = {
      metrics: Object.fromEntries(this.metrics),
      resourceAnalysis: this.analyzeResourcePerformance(),
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      timestamp: Date.now()
    };

    return report;
  }
}

// 初始化性能监控
const performanceMonitor = new PerformanceMonitor();

// 页面卸载时发送报告
window.addEventListener('beforeunload', () => {
  const report = performanceMonitor.generateReport();
  navigator.sendBeacon('/api/performance/reports', JSON.stringify(report));
});
```

#### 用户体验监控
```javascript
// 用户体验监控
class UXMonitor {
  constructor() {
    this.interactions = [];
    this.errors = [];
    this.setupMonitoring();
  }

  setupMonitoring() {
    this.monitorClicks();
    this.monitorFormInteractions();
    this.monitorErrors();
    this.monitorScrollBehavior();
  }

  // 点击事件监控
  monitorClicks() {
    document.addEventListener('click', (event) => {
      const element = event.target;
      const interaction = {
        type: 'click',
        element: this.getElementSelector(element),
        timestamp: Date.now(),
        page: window.location.pathname
      };

      this.interactions.push(interaction);
      this.debounceReporting();
    });
  }

  // 表单交互监控
  monitorFormInteractions() {
    document.addEventListener('input', (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        const interaction = {
          type: 'input',
          element: this.getElementSelector(event.target),
          timestamp: Date.now(),
          page: window.location.pathname
        };

        this.interactions.push(interaction);
      }
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      const interaction = {
        type: 'form_submit',
        element: this.getElementSelector(form),
        timestamp: Date.now(),
        page: window.location.pathname
      };

      this.interactions.push(interaction);
      this.reportImmediately();
    });
  }

  // 错误监控
  monitorErrors() {
    window.addEventListener('error', (event) => {
      const error = {
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null,
        timestamp: Date.now(),
        page: window.location.pathname
      };

      this.errors.push(error);
      this.reportErrors();
    });

    // Promise rejection监控
    window.addEventListener('unhandledrejection', (event) => {
      const error = {
        type: 'promise_rejection',
        message: event.reason.toString(),
        timestamp: Date.now(),
        page: window.location.pathname
      };

      this.errors.push(error);
      this.reportErrors();
    });
  }

  // 滚动行为监控
  monitorScrollBehavior() {
    let scrollDepth = 0;
    
    window.addEventListener('scroll', this.throttle(() => {
      const currentDepth = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (currentDepth > scrollDepth) {
        scrollDepth = Math.round(currentDepth * 100);
        
        if (scrollDepth % 25 === 0) { // 每25%记录一次
          this.interactions.push({
            type: 'scroll',
            depth: scrollDepth,
            timestamp: Date.now(),
            page: window.location.pathname
          });
        }
      }
    }, 500));
  }

  // 获取元素选择器
  getElementSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  // 节流函数
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  // 防抖上报
  debounceReporting() {
    clearTimeout(this.reportTimer);
    this.reportTimer = setTimeout(() => {
      this.reportInteractions();
    }, 5000);
  }

  // 立即上报
  reportImmediately() {
    clearTimeout(this.reportTimer);
    this.reportInteractions();
  }

  // 上报交互数据
  async reportInteractions() {
    if (this.interactions.length === 0) return;

    try {
      await fetch('/api/analytics/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interactions: this.interactions,
          sessionId: this.getSessionId()
        })
      });

      this.interactions = []; // 清空已上报的数据
    } catch (error) {
      console.error('交互数据上报失败:', error);
    }
  }

  // 上报错误数据
  async reportErrors() {
    if (this.errors.length === 0) return;

    try {
      await fetch('/api/analytics/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errors: this.errors,
          sessionId: this.getSessionId()
        })
      });

      this.errors = [];
    } catch (error) {
      console.error('错误数据上报失败:', error);
    }
  }

  // 获取会话ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }
}

// 初始化用户体验监控
const uxMonitor = new UXMonitor();
```

### 2. 后端性能监控

#### API性能监控中间件
```javascript
// API性能监控中间件
class APIPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alertThresholds = {
      responseTime: 1000,  // 1秒
      errorRate: 0.05,     // 5%
      throughput: 10       // 10 req/s
    };
  }

  // 监控中间件
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      // 拦截响应
      res.send = function(data) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 记录指标
        this.recordMetric(req, res, duration);
        
        originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  // 记录指标
  recordMetric(req, res, duration) {
    const route = this.getRoutePattern(req);
    const method = req.method;
    const statusCode = res.statusCode;
    const key = `${method}:${route}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalDuration: 0,
        errors: 0,
        durations: [],
        lastAccess: Date.now()
      });
    }

    const metric = this.metrics.get(key);
    metric.count++;
    metric.totalDuration += duration;
    metric.durations.push(duration);
    metric.lastAccess = Date.now();

    if (statusCode >= 400) {
      metric.errors++;
    }

    // 保持最近1000个响应时间
    if (metric.durations.length > 1000) {
      metric.durations = metric.durations.slice(-1000);
    }

    // 检查告警条件
    this.checkAlerts(key, metric, duration, statusCode);
  }

  // 获取路由模式
  getRoutePattern(req) {
    // 简化路径，移除ID等动态部分
    return req.route ? req.route.path : req.originalUrl.replace(/\/\d+/g, '/:id');
  }

  // 检查告警
  checkAlerts(route, metric, duration, statusCode) {
    // 响应时间告警
    if (duration > this.alertThresholds.responseTime) {
      this.sendAlert('SLOW_RESPONSE', {
        route,
        duration,
        threshold: this.alertThresholds.responseTime
      });
    }

    // 错误率告警
    const errorRate = metric.errors / metric.count;
    if (errorRate > this.alertThresholds.errorRate && metric.count > 10) {
      this.sendAlert('HIGH_ERROR_RATE', {
        route,
        errorRate: (errorRate * 100).toFixed(2),
        threshold: (this.alertThresholds.errorRate * 100).toFixed(2)
      });
    }
  }

  // 发送告警
  async sendAlert(type, data) {
    try {
      await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('告警发送失败:', error);
    }
  }

  // 获取性能统计
  getStats() {
    const stats = {};
    
    this.metrics.forEach((metric, route) => {
      const durations = metric.durations.sort((a, b) => a - b);
      const count = durations.length;
      
      stats[route] = {
        count: metric.count,
        avgDuration: Math.round(metric.totalDuration / metric.count),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p50: this.getPercentile(durations, 0.5),
        p95: this.getPercentile(durations, 0.95),
        p99: this.getPercentile(durations, 0.99),
        errorRate: ((metric.errors / metric.count) * 100).toFixed(2),
        lastAccess: new Date(metric.lastAccess)
      };
    });

    return stats;
  }

  // 计算百分位数
  getPercentile(sortedArray, percentile) {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  // 清理过期指标
  cleanupMetrics() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    this.metrics.forEach((metric, key) => {
      if (metric.lastAccess < oneHourAgo) {
        this.metrics.delete(key);
      }
    });
  }
}

// 系统资源监控
class SystemResourceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.intervals = new Map();
  }

  // 开始监控
  start() {
    // CPU和内存监控
    this.intervals.set('resources', setInterval(() => {
      this.collectSystemMetrics();
    }, 30000)); // 每30秒收集一次

    // 数据库连接监控
    this.intervals.set('database', setInterval(() => {
      this.collectDatabaseMetrics();
    }, 60000)); // 每分钟收集一次

    // 缓存监控
    this.intervals.set('cache', setInterval(() => {
      this.collectCacheMetrics();
    }, 60000));
  }

  // 收集系统指标
  async collectSystemMetrics() {
    const os = require('os');
    const process = require('process');

    const metrics = {
      // CPU信息
      cpu: {
        usage: await this.getCPUUsage(),
        loadAverage: os.loadavg(),
        coreCount: os.cpus().length
      },

      // 内存信息
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        processUsage: process.memoryUsage()
      },

      // 进程信息
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        version: process.version,
        platform: os.platform()
      },

      timestamp: Date.now()
    };

    await this.sendMetrics('system', metrics);
  }

  // 获取CPU使用率
  getCPUUsage() {
    return new Promise(resolve => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();
      
      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const totalTime = (Date.now() - startTime) * 1000; // 转换为微秒
        
        const usage = (currentUsage.user + currentUsage.system) / totalTime * 100;
        resolve(Math.round(usage * 100) / 100);
      }, 1000);
    });
  }

  // 收集数据库指标
  async collectDatabaseMetrics() {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection;

      const metrics = {
        readyState: db.readyState,
        host: db.host,
        port: db.port,
        name: db.name,
        collections: Object.keys(db.collections).length,
        timestamp: Date.now()
      };

      // 获取数据库统计信息
      if (db.readyState === 1) {
        const stats = await db.db.stats();
        metrics.stats = {
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexSize: stats.indexSize,
          collections: stats.collections,
          objects: stats.objects
        };
      }

      await this.sendMetrics('database', metrics);
    } catch (error) {
      console.error('数据库指标收集失败:', error);
    }
  }

  // 收集缓存指标
  async collectCacheMetrics() {
    try {
      const redis = require('./config/redis');
      
      const info = await redis.info();
      const metrics = {
        connected: redis.status === 'ready',
        memory: this.parseRedisInfo(info, 'memory'),
        stats: this.parseRedisInfo(info, 'stats'),
        timestamp: Date.now()
      };

      await this.sendMetrics('cache', metrics);
    } catch (error) {
      console.error('缓存指标收集失败:', error);
    }
  }

  // 解析Redis信息
  parseRedisInfo(info, section) {
    const lines = info.split('\r\n');
    const sectionData = {};
    let inSection = false;

    for (const line of lines) {
      if (line.startsWith(`# ${section}`)) {
        inSection = true;
        continue;
      }
      
      if (line.startsWith('#')) {
        inSection = false;
        continue;
      }

      if (inSection && line.includes(':')) {
        const [key, value] = line.split(':');
        sectionData[key] = isNaN(value) ? value : Number(value);
      }
    }

    return sectionData;
  }

  // 发送指标
  async sendMetrics(type, metrics) {
    try {
      await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          metrics,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('指标发送失败:', error);
    }
  }

  // 停止监控
  stop() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
  }
}

// 导出监控类
module.exports = {
  APIPerformanceMonitor,
  SystemResourceMonitor
};
```

---

## 🔧 部署优化策略

### 1. 容器化性能优化

#### 多阶段Docker构建
```dockerfile
# 前端构建优化
FROM node:18-alpine AS frontend-builder

# 安装依赖优化
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production --silent

# 构建应用
COPY client/ ./
RUN npm run build

# 后端构建
FROM node:18-alpine AS backend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --silent

COPY . ./
RUN npm run build 2>/dev/null || echo "No build script"

# 生产环境镜像
FROM node:18-alpine AS production

# 安全优化
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    apk add --no-cache tini

# 复制文件
WORKDIR /app
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/src ./src
COPY --from=backend-builder /app/package.json ./
COPY --from=frontend-builder /app/client/dist ./public

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 运行配置
USER nextjs
EXPOSE 3001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/app.js"]
```

#### Nginx配置优化
```nginx
# nginx.conf
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # 基础配置
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 性能优化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;
    
    # 缓存配置
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m 
                     max_size=1g inactive=60m use_temp_path=off;
    
    # 上游服务器
    upstream village_platform_api {
        least_conn;
        server app1:3001 max_fails=3 fail_timeout=30s;
        server app2:3001 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    # 限流配置
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    server {
        listen 80;
        server_name village-platform.com;
        
        # 重定向到HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name village-platform.com;
        
        # SSL配置
        ssl_certificate /etc/ssl/certs/village-platform.crt;
        ssl_certificate_key /etc/ssl/private/village-platform.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        
        # 安全头
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options DENY always;
        
        # 静态文件处理
        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
            gzip_static on;
        }
        
        # API请求
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://village_platform_api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # 缓存配置
            proxy_cache app_cache;
            proxy_cache_valid 200 5m;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            
            # 超时配置
            proxy_connect_timeout 5s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # 登录限流
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://village_platform_api;
        }
        
        # 前端应用
        location / {
            root /var/www/html;
            try_files $uri $uri/ /index.html;
            
            # 缓存配置
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
    }
}
```

### 2. 数据库部署优化

#### MongoDB集群配置
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # MongoDB副本集
  mongodb-primary:
    image: mongo:5.0
    command: --replSet rs0 --bind_ip_all --auth
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_primary_data:/data/db
      - ./scripts/mongodb-init.js:/docker-entrypoint-initdb.d/mongodb-init.js:ro
    networks:
      - village_network
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  mongodb-secondary1:
    image: mongo:5.0
    command: --replSet rs0 --bind_ip_all --auth
    depends_on:
      - mongodb-primary
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_secondary1_data:/data/db
    networks:
      - village_network

  mongodb-secondary2:
    image: mongo:5.0
    command: --replSet rs0 --bind_ip_all --auth
    depends_on:
      - mongodb-primary
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_secondary2_data:/data/db
    networks:
      - village_network

  # Redis集群
  redis-master:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_master_data:/data
    networks:
      - village_network

  redis-slave:
    image: redis:7-alpine
    command: redis-server --slaveof redis-master 6379 --requirepass ${REDIS_PASSWORD} --masterauth ${REDIS_PASSWORD}
    depends_on:
      - redis-master
    volumes:
      - redis_slave_data:/data
    networks:
      - village_network

  # 应用服务
  api-server1:
    build: .
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:${MONGO_ROOT_PASSWORD}@mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/village_platform?replicaSet=rs0&authSource=admin
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis-master:6379
    depends_on:
      - mongodb-primary
      - redis-master
    networks:
      - village_network
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
          cpus: '0.8'

  # 负载均衡
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - api-server1
    networks:
      - village_network

  # 监控服务
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - village_network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - village_network

volumes:
  mongodb_primary_data:
  mongodb_secondary1_data:
  mongodb_secondary2_data:
  redis_master_data:
  redis_slave_data:
  prometheus_data:
  grafana_data:

networks:
  village_network:
    driver: overlay
    attachable: true
```

#### 数据库优化脚本
```javascript
// mongodb-optimization.js
// MongoDB生产环境优化脚本

// 创建性能优化索引
db.villagedailyexpenses.createIndex(
  { "villageId": 1, "expenseDate": -1 },
  { 
    name: "village_date_compound",
    background: true,
    partialFilterExpression: { "status": { $ne: "deleted" } }
  }
);

// 创建分片集合
sh.enableSharding("village_platform");
sh.shardCollection("village_platform.villagedailyexpenses", { "villageId": 1 });

// 设置写关注级别
db.adminCommand({
  setDefaultRWConcern: 1,
  defaultWriteConcern: {
    w: "majority",
    j: true,
    wtimeout: 5000
  },
  defaultReadConcern: {
    level: "majority"
  }
});

// 启用分析器（仅开发环境）
if (db.runCommand("ismaster").ismaster && process.env.NODE_ENV !== 'production') {
  db.setProfilingLevel(1, { slowms: 200 });
}

// 数据压缩配置
db.adminCommand({
  setParameter: 1,
  wiredTigerEngineRuntimeConfig: "cache_size=1G"
});
```

---

## 📈 持续性能优化

### 1. 性能监控和告警

#### 监控仪表板配置
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "performance_rules.yml"

scrape_configs:
  - job_name: 'village-platform-api'
    static_configs:
      - targets: ['api-server1:3001', 'api-server2:3001']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### 性能告警规则
```yaml
# performance_rules.yml
groups:
  - name: performance_alerts
    rules:
      # API响应时间告警
      - alert: HighAPIResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "API响应时间过高"
          description: "95%的API请求响应时间超过1秒，当前值: {{ $value }}秒"

      # 错误率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API错误率过高"
          description: "API错误率超过5%，当前值: {{ $value | humanizePercentage }}"

      # 内存使用告警
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高"
          description: "内存使用率超过90%，当前值: {{ $value | humanizePercentage }}"

      # 数据库连接告警
      - alert: DatabaseConnectionIssue
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "数据库连接失败"
          description: "MongoDB连接异常"

      # 磁盘空间告警
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "磁盘空间不足"
          description: "磁盘可用空间低于10%"
```

### 2. 自动化性能优化

#### 自适应缓存策略
```javascript
// 自适应缓存管理器
class AdaptiveCacheManager {
  constructor() {
    this.hitRates = new Map();
    this.accessPatterns = new Map();
    this.optimizationInterval = 60000; // 1分钟优化一次
    this.startOptimization();
  }

  // 启动自适应优化
  startOptimization() {
    setInterval(() => {
      this.optimizeCacheStrategy();
    }, this.optimizationInterval);
  }

  // 记录缓存访问
  recordAccess(key, hit) {
    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, {
        hits: 0,
        misses: 0,
        lastAccess: Date.now(),
        frequency: 1
      });
    }

    const pattern = this.accessPatterns.get(key);
    pattern.frequency++;
    pattern.lastAccess = Date.now();

    if (hit) {
      pattern.hits++;
    } else {
      pattern.misses++;
    }
  }

  // 优化缓存策略
  optimizeCacheStrategy() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    this.accessPatterns.forEach((pattern, key) => {
      const hitRate = pattern.hits / (pattern.hits + pattern.misses);
      const timeSinceAccess = now - pattern.lastAccess;

      // 调整TTL
      if (hitRate > 0.8 && pattern.frequency > 10) {
        // 高命中率，延长TTL
        this.extendTTL(key, 3600); // 1小时
      } else if (hitRate < 0.3 || timeSinceAccess > oneHour) {
        // 低命中率或长时间未访问，缩短TTL
        this.reduceTTL(key, 300); // 5分钟
      }

      // 清理过期访问模式
      if (timeSinceAccess > oneHour * 24) { // 24小时
        this.accessPatterns.delete(key);
      }
    });
  }

  // 延长TTL
  async extendTTL(key, ttl) {
    try {
      await redis.expire(key, ttl);
    } catch (error) {
      console.error('TTL延长失败:', error);
    }
  }

  // 缩短TTL
  async reduceTTL(key, ttl) {
    try {
      await redis.expire(key, ttl);
    } catch (error) {
      console.error('TTL缩短失败:', error);
    }
  }
}

// 智能查询优化器
class IntelligentQueryOptimizer {
  constructor() {
    this.queryPerformance = new Map();
    this.indexSuggestions = [];
  }

  // 分析查询性能
  analyzeQuery(query, executionTime, resultCount) {
    const queryHash = this.hashQuery(query);
    
    if (!this.queryPerformance.has(queryHash)) {
      this.queryPerformance.set(queryHash, {
        query,
        executions: 0,
        totalTime: 0,
        avgTime: 0,
        resultCounts: []
      });
    }

    const perf = this.queryPerformance.get(queryHash);
    perf.executions++;
    perf.totalTime += executionTime;
    perf.avgTime = perf.totalTime / perf.executions;
    perf.resultCounts.push(resultCount);

    // 检测慢查询
    if (executionTime > 1000) { // 超过1秒
      this.suggestOptimization(query, executionTime);
    }
  }

  // 生成查询哈希
  hashQuery(query) {
    return crypto.createHash('md5')
      .update(JSON.stringify(query))
      .digest('hex');
  }

  // 建议优化
  suggestOptimization(query, executionTime) {
    const suggestions = [];

    // 检查是否需要索引
    if (query.filter) {
      Object.keys(query.filter).forEach(field => {
        if (!this.hasIndex(field)) {
          suggestions.push({
            type: 'index',
            field,
            reason: `字段 ${field} 在慢查询中频繁使用，建议创建索引`
          });
        }
      });
    }

    // 检查是否需要复合索引
    if (query.sort && Object.keys(query.sort).length > 1) {
      const sortFields = Object.keys(query.sort);
      suggestions.push({
        type: 'compound_index',
        fields: sortFields,
        reason: '多字段排序建议使用复合索引'
      });
    }

    this.indexSuggestions.push(...suggestions);
  }

  // 检查索引是否存在
  hasIndex(field) {
    // 实际实现中需要查询数据库索引信息
    // 这里简化处理
    return false;
  }

  // 获取优化建议
  getOptimizationSuggestions() {
    // 去重并按优先级排序
    const uniqueSuggestions = this.indexSuggestions.filter((suggestion, index, self) =>
      index === self.findIndex(s => s.field === suggestion.field && s.type === suggestion.type)
    );

    return uniqueSuggestions.sort((a, b) => {
      const priority = { 'index': 3, 'compound_index': 2, 'other': 1 };
      return priority[b.type] - priority[a.type];
    });
  }
}
```

### 3. 性能测试自动化

#### 负载测试脚本
```javascript
// load-test.js
const autocannon = require('autocannon');
const fs = require('fs');

class LoadTestRunner {
  constructor() {
    this.results = [];
    this.testConfigs = [
      {
        name: '正常负载测试',
        url: 'http://localhost:3001',
        connections: 100,
        duration: 60,
        requests: [
          { path: '/api/v1/daily-expenses' },
          { path: '/api/v1/projects' },
          { path: '/api/v1/users/profile' }
        ]
      },
      {
        name: '高负载测试',
        url: 'http://localhost:3001',
        connections: 500,
        duration: 120,
        requests: [
          { path: '/api/v1/daily-expenses', weight: 40 },
          { path: '/api/v1/projects', weight: 30 },
          { path: '/api/v1/daily-expenses/statistics', weight: 20 },
          { path: '/api/v1/projects/statistics', weight: 10 }
        ]
      }
    ];
  }

  // 运行所有测试
  async runAllTests() {
    console.log('开始性能测试...');
    
    for (const config of this.testConfigs) {
      console.log(`\n运行测试: ${config.name}`);
      const result = await this.runSingleTest(config);
      this.results.push({
        name: config.name,
        config,
        result,
        timestamp: new Date()
      });
    }

    this.generateReport();
  }

  // 运行单个测试
  async runSingleTest(config) {
    return new Promise((resolve, reject) => {
      const instance = autocannon({
        url: config.url,
        connections: config.connections,
        duration: config.duration,
        requests: config.requests
      }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });

      // 实时监控
      instance.on('response', (client, statusCode, resBytes, responseTime) => {
        if (statusCode >= 400) {
          console.log(`错误响应: ${statusCode}, 响应时间: ${responseTime}ms`);
        }
      });

      instance.on('reqError', (err) => {
        console.error('请求错误:', err.message);
      });
    });
  }

  // 生成测试报告
  generateReport() {
    const report = {
      summary: this.generateSummary(),
      details: this.results,
      recommendations: this.generateRecommendations(),
      timestamp: new Date()
    };

    // 保存到文件
    fs.writeFileSync(
      `performance-report-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );

    // 控制台输出摘要
    console.log('\n=== 性能测试报告 ===');
    console.log(this.formatSummary(report.summary));
    console.log('\n=== 优化建议 ===');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  // 生成摘要
  generateSummary() {
    const summary = {};
    
    this.results.forEach(test => {
      summary[test.name] = {
        avgLatency: test.result.latency.average,
        p95Latency: test.result.latency.p95,
        p99Latency: test.result.latency.p99,
        throughput: test.result.requests.average,
        errorRate: (test.result.errors / test.result.requests.total * 100).toFixed(2),
        totalRequests: test.result.requests.total
      };
    });

    return summary;
  }

  // 生成优化建议
  generateRecommendations() {
    const recommendations = [];
    
    this.results.forEach(test => {
      const result = test.result;
      
      // 检查响应时间
      if (result.latency.p95 > 1000) {
        recommendations.push(`${test.name}: P95延迟超过1秒(${result.latency.p95}ms)，建议优化数据库查询或增加缓存`);
      }

      // 检查错误率
      const errorRate = result.errors / result.requests.total * 100;
      if (errorRate > 1) {
        recommendations.push(`${test.name}: 错误率过高(${errorRate.toFixed(2)}%)，建议检查错误日志并修复问题`);
      }

      // 检查吞吐量
      if (result.requests.average < 100 && test.config.connections > 100) {
        recommendations.push(`${test.name}: 吞吐量较低(${result.requests.average} req/s)，建议进行性能调优`);
      }
    });

    return recommendations;
  }

  // 格式化摘要输出
  formatSummary(summary) {
    let output = '';
    
    Object.entries(summary).forEach(([testName, metrics]) => {
      output += `\n${testName}:\n`;
      output += `  平均延迟: ${metrics.avgLatency}ms\n`;
      output += `  P95延迟: ${metrics.p95Latency}ms\n`;
      output += `  P99延迟: ${metrics.p99Latency}ms\n`;
      output += `  吞吐量: ${metrics.throughput} req/s\n`;
      output += `  错误率: ${metrics.errorRate}%\n`;
      output += `  总请求数: ${metrics.totalRequests}\n`;
    });

    return output;
  }
}

// 运行测试
const testRunner = new LoadTestRunner();
testRunner.runAllTests().catch(console.error);
```

---

## 📋 性能优化清单

### 部署前性能检查清单

```markdown
## 🔍 性能优化检查清单

### 数据库优化 ✅
- [x] 创建必要的索引
- [x] 配置连接池
- [x] 启用查询缓存
- [x] 设置合适的读写关注级别
- [x] 配置数据分片策略
- [x] 实施读写分离

### 应用层优化 ✅
- [x] 实施多层缓存策略
- [x] API响应压缩
- [x] 批量操作优化
- [x] 文件处理优化
- [x] OCR处理队列化
- [x] 错误处理和降级

### 前端优化 ✅
- [x] 代码分割和懒加载
- [x] 虚拟滚动实现
- [x] 图片优化和CDN
- [x] 静态资源压缩
- [x] 浏览器缓存策略
- [x] 性能监控埋点

### 部署优化 ✅
- [x] 多阶段Docker构建
- [x] Nginx负载均衡配置
- [x] 容器资源限制
- [x] 集群部署配置
- [x] 健康检查配置
- [x] 日志收集和分析

### 监控和告警 ✅
- [x] 性能指标监控
- [x] 错误率监控
- [x] 资源使用监控
- [x] 用户体验监控
- [x] 告警规则配置
- [x] 监控仪表板搭建

### 测试验证 ✅
- [x] 负载测试执行
- [x] 压力测试验证
- [x] 性能基准测试
- [x] 容量规划验证
- [x] 故障恢复测试
- [x] 监控系统测试
```

---

**📅 文档创建时间**: 2024年9月11日  
**📋 文档版本**: v1.0  
**🔄 更新频率**: 月度更新  
**👥 维护团队**: 技术架构组

*本性能优化策略将根据系统运行状况和用户反馈持续更新完善*