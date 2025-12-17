# MongoDB连接池配置指南

## 1. 数据库连接配置

### src/config/database.js
```javascript
const mongoose = require('mongoose');
const logger = require('../middleware/logging');

class DatabaseConnection {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const options = {
        // 连接池配置
        maxPoolSize: 50,        // 最大连接数
        minPoolSize: 5,         // 最小连接数
        maxIdleTimeMS: 30000,   // 连接空闲时间30秒
        waitQueueTimeoutMS: 5000, // 等待超时5秒
        serverSelectionTimeoutMS: 5000, // 服务器选择超时

        // 性能优化
        bufferMaxEntries: 0,    // 禁用缓冲
        bufferCommands: false,  // 禁用命令缓冲

        // 调试选项
        debug: process.env.NODE_ENV === 'development',

        // 其他配置
        useNewUrlParser: true,
        useUnifiedTopology: true
      };

      this.connection = await mongoose.connect(
        process.env.MONGO_URI,
        options
      );

      this.isConnected = true;
      logger.info('MongoDB connected successfully');

      // 监听连接事件
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected');
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

// 创建单例实例
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;
```

## 2. 数据库初始化脚本

### scripts/init-database.js
```javascript
const mongoose = require('mongoose');
const dbConnection = require('../src/config/database');

async function initializeDatabase() {
  try {
    console.log('🗄️ Initializing MongoDB database...');

    // 连接数据库
    await dbConnection.connect();

    // 创建必要的索引
    await createIndexes();

    // 插入初始数据
    await insertInitialData();

    console.log('✅ Database initialized successfully');

    // 关闭连接
    await dbConnection.disconnect();
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

async function createIndexes() {
  const collections = mongoose.connection.collections;

  // 村民集合索引
  await collections.residents.createIndex(
    { villageId: 1, phone: 1 },
    { unique: true }
  );
  await collections.residents.createIndex(
    { villageId: 1, householdId: 1 }
  );
  await collections.residents.createIndex(
    { villageId: 1, idCard: 1 },
    { unique: true, sparse: true }
  );

  // 财务记录索引
  await collections.expenses.createIndex(
    { villageId: 1, expenseDate: -1 }
  );
  await collections.expenses.createIndex(
    { status: 1, 'approvalProcess.currentStage': 1 }
  );
  await collections.expenses.createIndex(
    { expenseCategory: 1, amount: 1 }
  );

  // 项目索引
  await collections.projects.createIndex(
    { villageId: 1, status: 1 }
  );
  await collections.projects.createIndex(
    { projectType: 1, 'timeline.startDate': -1 }
  );

  console.log('📊 Database indexes created');
}

async function insertInitialData() {
  const Village = require('../src/models/Village');
  const User = require('../src/models/User');

  // 创建默认村庄
  const defaultVillage = await Village.findOneAndUpdate(
    { code: 'DEMO001' },
    {
      name: '示范村',
      code: 'DEMO001',
      address: '示范省示范市示范县示范镇示范村',
      population: 1000,
      households: 300,
      area: 10.5,
      contacts: {
        phone: '0571-12345678',
        email: 'demovillage@example.com'
      }
    },
    { upsert: true, new: true }
  );

  // 创建默认管理员用户
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('admin123456', 12);

  const defaultAdmin = await User.findOneAndUpdate(
    { username: 'admin' },
    {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      profile: {
        name: '系统管理员',
        phone: '13800138000',
        email: 'admin@village.com'
      },
      villageId: defaultVillage._id,
      isActive: true,
      permissions: ['*']
    },
    { upsert: true, new: true }
  );

  console.log('👥 Initial data inserted');
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
```

## 3. 数据模型定义

### src/models/Resident.js
```javascript
const mongoose = require('mongoose');

const residentSchema = new mongoose.Schema({
  // 基础信息
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  idCard: {
    type: String,
    required: true,
    unique: true,
    match: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/
  },
  phone: {
    type: String,
    required: true,
    match: /^1[3-9]\d{9}$/
  },

  // 村庄信息
  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true,
    index: true
  },
  householdId: {
    type: String,
    required: true,
    index: true
  },

  // 家庭关系
  familyRole: {
    type: String,
    enum: ['户主', '配偶', '子女', '父母', '其他'],
    default: '其他'
  },
  familyMembers: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resident'
    },
    relationship: String
  }],

  // 人口信息
  gender: {
    type: String,
    enum: ['男', '女'],
    required: true
  },
  birthDate: {
    type: Date,
    required: true
  },
  education: {
    type: String,
    enum: ['文盲', '小学', '初中', '高中', '中专', '大专', '本科', '研究生']
  },
  occupation: String,

  // 地址信息
  address: {
    permanent: String,  // 户籍地址
    current: String,    // 现住址
    isSame: {          // 是否与户籍地址一致
      type: Boolean,
      default: true
    }
  },

  // 特殊标记
  tags: [{
    type: String,
    enum: ['低保户', '独生户', '五保户', '残疾人', '党员', '退役军人', '独居老人']
  }],

  // 健康信息
  health: {
    bloodType: String,
    allergies: [String],
    chronicDiseases: [String],
    medication: [String]
  },

  // 系统字段
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 虚拟字段：年龄
residentSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
});

// 更新时间中间件
residentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 索引
residentSchema.index({ villageId: 1, phone: 1 }, { unique: true });
residentSchema.index({ villageId: 1, householdId: 1 });
residentSchema.index({ villageId: 1, tags: 1 });

module.exports = mongoose.model('Resident', residentSchema);
```

## 4. Redis缓存配置

### src/config/redis.js
```javascript
const redis = require('redis');
const logger = require('../middleware/logging');

class RedisConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,

        // 连接池配置
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        },

        // 重连配置
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis retry attempts exhausted');
            return undefined;
          }
          // 重试间隔：min(尝试次数 * 100, 3000)
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // 错误处理
      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  // 缓存操作封装
  async set(key, value, ttl = 3600) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache set');
        return false;
      }

      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache get');
        return null;
      }

      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }
}

// 创建单例实例
const redisConnection = new RedisConnection();

module.exports = redisConnection;
```

## 5. 数据库服务封装

### src/services/databaseService.js
```javascript
const dbConnection = require('../config/database');
const redisConnection = require('../config/redis');
const logger = require('../middleware/logging');

class DatabaseService {
  static async transaction(callback) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async cacheOrFetch(cacheKey, fetchFunction, ttl = 300) {
    // 尝试从缓存获取
    const cached = await redisConnection.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for key: ${cacheKey}`);
      return cached;
    }

    // 从数据库获取
    const data = await fetchFunction();

    // 存入缓存
    await redisConnection.set(cacheKey, data, ttl);
    logger.debug(`Cache set for key: ${cacheKey}`);

    return data;
  }

  static async invalidateCache(pattern) {
    try {
      const keys = await redisConnection.client.keys(pattern);
      if (keys.length > 0) {
        await redisConnection.client.del(keys);
        logger.info(`Invalidated ${keys.length} cache entries matching: ${pattern}`);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }
}

module.exports = DatabaseService;
```

## 6. 测试连接

### scripts/test-connection.js
```javascript
const dbConnection = require('../src/config/database');
const redisConnection = require('../src/config/redis');

async function testConnections() {
  try {
    console.log('🔍 Testing database connections...');

    // 测试MongoDB
    console.log('📦 Testing MongoDB connection...');
    await dbConnection.connect();
    const mongoStatus = dbConnection.getConnectionStatus() ? '✅ Connected' : '❌ Failed';
    console.log(`MongoDB: ${mongoStatus}`);

    // 测试Redis
    console.log('🔴 Testing Redis connection...');
    await redisConnection.connect();
    await redisConnection.set('test', 'success', 10);
    const redisTest = await redisConnection.get('test');
    const redisStatus = redisTest === 'success' ? '✅ Connected' : '❌ Failed';
    console.log(`Redis: ${redisStatus}`);

    console.log('✅ All connections tested successfully');

    // 清理测试数据
    await redisConnection.del('test');
    await dbConnection.disconnect();
    await redisConnection.disconnect();

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testConnections();
}

module.exports = { testConnections };
```

## 使用说明

```bash
# 1. 初始化数据库
npm run init-db

# 2. 测试连接
node scripts/test-connection.js

# 3. 查看连接状态（在应用运行时）
curl http://localhost:3001/api/v1/monitoring/database-status
```

## 性能优化建议

1. **连接池大小**：根据服务器配置调整 `maxPoolSize`
2. **索引优化**：确保查询字段都有合适的索引
3. **读写分离**：使用MongoDB副本集实现读写分离
4. **分片策略**：大数据量时启用分片
5. **缓存策略**：热点数据使用Redis缓存