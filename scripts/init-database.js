/**
 * 智慧乡村数据库初始化脚本
 *
 * 功能：
 * 1. 创建数据库和集合
 * 2. 创建索引（复合索引、地理索引、全文索引）
 * 3. 配置分片策略
 * 4. 插入初始数据
 * 5. 设置数据验证规则
 * 6. 配置安全策略
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

class DatabaseInitializer {
  constructor() {
    this.client = null;
    this.db = null;
    this.config = {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
      dbName: process.env.DB_NAME || 'smart_village',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      }
    };
  }

  /**
   * 连接数据库
   */
  async connect() {
    try {
      this.client = new MongoClient(this.config.uri, this.config.options);
      await this.client.connect();
      this.db = this.client.db(this.config.dbName);
      console.log('✓ 数据库连接成功');
      return true;
    } catch (error) {
      console.error('✗ 数据库连接失败:', error.message);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✓ 数据库连接已关闭');
    }
  }

  /**
   * 创建集合
   */
  async createCollections() {
    const collections = [
      // 用户和权限
      { name: 'users', validator: this.getUserValidator() },
      { name: 'user_sessions' },
      { name: 'user_preferences' },
      { name: 'roles' },
      { name: 'permissions' },

      // 村庄管理
      { name: 'villages', validator: this.getVillageValidator() },
      { name: 'village_settings' },
      { name: 'village_statistics' },

      // 家庭管理
      { name: 'households', validator: this.getHouseholdValidator() },
      { name: 'family_members' },
      { name: 'family_relationships' },

      // 村务管理
      { name: 'announcements', validator: this.getAnnouncementValidator() },
      { name: 'meetings' },
      { name: 'meeting_attendees' },
      { name: 'suggestions' },
      { name: 'suggestions_feedback' },

      // 财务管理
      { name: 'financial_transactions', validator: this.getTransactionValidator() },
      { name: 'budgets' },
      { name: 'invoices' },
      { name: 'contracts' },
      { name: 'financial_reports' },

      // 应急管理
      { name: 'emergency_events' },
      { name: 'emergency_resources' },
      { name: 'emergency_broadcasts' },
      { name: 'emergency_contacts' },

      // 农业管理
      { name: 'agricultural_products' },
      { name: 'production_records' },
      { name: 'farm_equipment' },
      { name: 'weather_data' },

      // 系统管理
      { name: 'audit_logs' },
      { name: 'system_logs' },
      { name: 'operation_logs' },
      { name: 'error_logs' },

      // 配置管理
      { name: 'system_config' },
      { name: 'app_config' },
      { name: 'feature_flags' }
    ];

    for (const collection of collections) {
      try {
        const exists = await this.db.listCollections({ name: collection.name }).hasNext();

        if (!exists) {
          const options = {};
          if (collection.validator) {
            options.validator = collection.validator;
            options.validationLevel = 'strict';
            options.validationAction = 'error';
          }

          await this.db.createCollection(collection.name, options);
          console.log(`✓ 创建集合: ${collection.name}`);
        } else {
          console.log(`- 集合已存在: ${collection.name}`);
        }
      } catch (error) {
        console.error(`✗ 创建集合失败 ${collection.name}:`, error.message);
      }
    }
  }

  /**
   * 创建索引
   */
  async createIndexes() {
    // 用户相关索引
    const userIndexes = [
      { collection: 'users', index: { username: 1 }, options: { unique: true } },
      { collection: 'users', index: { email: 1 }, options: { unique: true } },
      { collection: 'users', index: { phone: 1 }, options: { unique: true } },
      { collection: 'users', index: { villageId: 1, 'status.account': 1 } },
      { collection: 'users', index: { roles: 1, villageId: 1 } },
      { collection: 'users', index: { householdId: 1 } },
      { collection: 'users', index: { 'location.home': '2dsphere' } },
      { collection: 'users', index: { createdAt: -1 } },
      { collection: 'users', index: { 'points.total': -1 } },
      { collection: 'users', index: { 'profile.encrypted.idCard': 1 } }
    ];

    // 家庭相关索引
    const householdIndexes = [
      { collection: 'households', index: { householdCode: 1 }, options: { unique: true } },
      { collection: 'households', index: { villageId: 1, status: 1 } },
      { collection: 'households', index: { 'householder.phone': 1 } },
      { collection: 'households', index: { 'economics.povertyStatus.isPovertyHousehold': 1 } },
      { collection: 'households', index: { tags: 1 } },
      { collection: 'households', index: { 'address.coordinates': '2dsphere' } },
      { collection: 'households', index: { 'address.geohash': 1 } },
      { collection: 'households', index: { createdAt: -1 } },
      { collection: 'households', index: { 'housing.safety.structureStatus': 1 } }
    ];

    // 村庄相关索引
    const villageIndexes = [
      { collection: 'villages', index: { code: 1 }, options: { unique: true } },
      { collection: 'villages', index: { name: 1 } },
      { collection: 'villages', index: { 'administration.province': 1 } },
      { collection: 'villages', index: { 'administration.city': 1 } },
      { collection: 'villages', index: { 'administration.district': 1 } },
      { collection: 'villages', index: { 'location.center': '2dsphere' } },
      { collection: 'villages', index: { 'location.boundary': '2dsphere' } },
      { collection: 'villages', index: { status: 1 } },
      { collection: 'villages', index: { tags: 1 } }
    ];

    // 公告相关索引
    const announcementIndexes = [
      { collection: 'announcements', index: { villageId: 1, status: 1 } },
      { collection: 'announcements', index: { category: 1, 'priority.level': -1 } },
      { collection: 'announcements', index: { 'schedule.publishTime': -1 } },
      { collection: 'announcements', index: { publisher: 1 } },
      { collection: 'announcements', index: { 'target.villages.villageId': 1 } },
      { collection: 'announcements', index: { tags: 1 } },
      { collection: 'announcements', index: { 'statistics.totalViews': -1 } },
      { collection: 'announcements', index: { 'approval.status': 1 } },
      { collection: 'announcements', index: { createdAt: -1 } }
    ];

    // 财务相关索引
    const financialIndexes = [
      { collection: 'financial_transactions', index: { transactionNumber: 1 }, options: { unique: true } },
      { collection: 'financial_transactions', index: { villageId: 1, 'category.main': 1 } },
      { collection: 'financial_transactions', index: { 'approval.status': 1, createdAt: -1 } },
      { collection: 'financial_transactions', index: { transactionDate: -1 } },
      { collection: 'financial_transactions', index: { 'relatedTo.householdId': 1 } },
      { collection: 'financial_transactions', index: { 'relatedTo.userId': 1 } },
      { collection: 'financial_transactions', index: { 'blockchain.transactionHash': 1 }, options: { sparse: true } },
      { collection: 'financial_transactions', index: { createdAt: -1 } },
      { collection: 'financial_transactions', index: { 'analytics.fiscalYear': 1, 'analytics.month': 1 } }
    ];

    // 应急相关索引
    const emergencyIndexes = [
      { collection: 'emergency_resources', index: { villageId: 1, type: 1 } },
      { collection: 'emergency_resources', index: { location: '2dsphere' } },
      { collection: 'emergency_events', index: { villageId: 1, status: 1 } },
      { collection: 'emergency_events', index: { 'location.coordinates': '2dsphere' } },
      { collection: 'emergency_events', index: { createdAt: -1 } },
      { collection: 'emergency_broadcasts', index: { villageId: 1, 'broadcastTime': -1 } }
    ];

    // 日志相关索引
    const logIndexes = [
      { collection: 'audit_logs', index: { userId: 1, timestamp: -1 } },
      { collection: 'audit_logs', index: { action: 1, timestamp: -1 } },
      { collection: 'audit_logs', index: { resourceType: 1, resourceId: 1 } },
      { collection: 'audit_logs', index: { timestamp: -1 } },
      { collection: 'system_logs', index: { level: 1, timestamp: -1 } },
      { collection: 'system_logs', index: { service: 1, timestamp: -1 } },
      { collection: 'system_logs', index: { timestamp: -1 } }
    ];

    // 批量创建索引
    const allIndexes = [
      ...userIndexes,
      ...householdIndexes,
      ...villageIndexes,
      ...announcementIndexes,
      ...financialIndexes,
      ...emergencyIndexes,
      ...logIndexes
    ];

    for (const { collection, index, options = {} } of allIndexes) {
      try {
        await this.db.collection(collection).createIndex(index, options);
        console.log(`✓ 创建索引: ${collection}.${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code !== 85) { // 忽略索引已存在的错误
          console.error(`✗ 创建索引失败 ${collection}:`, error.message);
        }
      }
    }
  }

  /**
   * 创建全文搜索索引
   */
  async createTextIndexes() {
    const textIndexes = [
      {
        collection: 'announcements',
        fields: {
          title: 10,
          summary: 5,
          content: 1
        },
        name: 'announcement_search'
      },
      {
        collection: 'users',
        fields: {
          'profile.masked.name': 10,
          'searchKeywords': 5
        },
        name: 'user_search'
      },
      {
        collection: 'households',
        fields: {
          'householder.name': 10,
          'address.full': 5,
          'tags': 5
        },
        name: 'household_search'
      }
    ];

    for (const { collection, fields, name } of textIndexes) {
      try {
        await this.db.collection(collection).createIndex(
          { $text: fields },
          {
            name,
            default_language: 'none',  // 支持中文搜索
            language_override: 'language'
          }
        );
        console.log(`✓ 创建全文索引: ${name}`);
      } catch (error) {
        console.error(`✗ 创建全文索引失败 ${name}:`, error.message);
      }
    }
  }

  /**
   * 插入初始数据
   */
  async insertInitialData() {
    try {
      // 插入系统配置
      await this.insertSystemConfig();

      // 插入默认角色和权限
      await this.insertRolesAndPermissions();

      // 插入示例村庄数据
      await this.insertSampleVillage();

      // 插入系统管理员账户
      await this.insertSystemAdmin();

      console.log('✓ 初始数据插入完成');
    } catch (error) {
      console.error('✗ 初始数据插入失败:', error.message);
      throw error;
    }
  }

  /**
   * 插入系统配置
   */
  async insertSystemConfig() {
    const configs = [
      {
        _id: 'app_settings',
        name: '应用设置',
        settings: {
          languages: ['zh-CN', 'pcc', 'pcc-qn'],
          defaultLanguage: 'zh-CN',
          timezone: 'Asia/Shanghai',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: 'HH:mm:ss',
          currency: 'CNY'
        }
      },
      {
        _id: 'security_settings',
        name: '安全设置',
        settings: {
          passwordMinLength: 8,
          passwordRequireSpecial: true,
          sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
          maxLoginAttempts: 5,
          lockoutDuration: 15 * 60 * 1000, // 15分钟
          enableTwoFactor: false
        }
      },
      {
        _id: 'notification_settings',
        name: '通知设置',
        settings: {
          pushEnabled: true,
          smsEnabled: true,
          emailEnabled: true,
          voiceEnabled: true,
          defaultChannels: ['push', 'sms']
        }
      }
    ];

    await this.db.collection('system_config').insertMany(configs);
  }

  /**
   * 插入角色和权限
   */
  async insertRolesAndPermissions() {
    const roles = [
      {
        _id: 'system_admin',
        name: '系统管理员',
        description: '系统最高权限管理员',
        permissions: ['*'],
        level: 0,
        isSystem: true
      },
      {
        _id: 'village_admin',
        name: '村管理员',
        description: '村庄管理权限',
        permissions: [
          'user:read', 'user:update', 'user:create',
          'household:read', 'household:create', 'household:update',
          'announcement:*',
          'financial:read', 'financial:create',
          'emergency:read', 'emergency:update'
        ],
        level: 1,
        isSystem: false
      },
      {
        _id: 'villager',
        name: '普通村民',
        description: '普通村民权限',
        permissions: [
          'profile:read', 'profile:update:self',
          'household:read:own',
          'announcement:read',
          'financial:read:public'
        ],
        level: 5,
        isSystem: false
      }
    ];

    await this.db.collection('roles').insertMany(roles);
  }

  /**
   * 插入示例村庄
   */
  async insertSampleVillage() {
    const village = {
      _id: new mongoose.Types.ObjectId(),
      code: 'ZJHSSV001A',
      name: '绿水村',
      alias: ['绿水青山村'],
      location: {
        center: {
          type: 'Point',
          coordinates: [120.123456, 30.654321]
        },
        boundary: {
          type: 'Polygon',
          coordinates: [[
            [120.120, 30.650],
            [120.130, 30.650],
            [120.130, 30.660],
            [120.120, 30.660],
            [120.120, 30.650]
          ]]
        },
        area: 15.6
      },
      administration: {
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        town: '双浦镇',
        level: 'village'
      },
      overview: {
        population: {
          total: 1250,
          households: 420,
          adults: 890,
          children: 360,
          elderly: 180
        },
        economy: {
          mainIndustries: ['生态农业', '乡村旅游', '农产品加工'],
          annualIncome: 56000000,
          perCapitaIncome: 44800
        }
      },
      status: 'active',
      createdAt: new Date()
    };

    await this.db.collection('villages').insertOne(village);
    return village._id;
  }

  /**
   * 插入系统管理员
   */
  async insertSystemAdmin() {
    const admin = {
      username: 'admin',
      email: 'admin@smartvillage.com',
      phone: '13800138000',
      auth: {
        passwordHash: this.hashPassword('admin123'),
        salt: this.generateSalt(),
        mfaEnabled: false
      },
      roles: [{ role: 'system_admin', villageId: null }],
      profile: {
        masked: {
          name: '系统管理员',
          phone: '138****8000',
          email: 'admin***@smartvillage.com'
        }
      },
      villageId: null,
      status: {
        account: 'active',
        verification: {
          identity: true,
          phone: true,
          email: true
        }
      },
      createdAt: new Date()
    };

    await this.db.collection('users').insertOne(admin);
  }

  /**
   * 配置分片（如果启用分片集群）
   */
  async configureSharding() {
    try {
      const admin = this.db.admin();

      // 检查是否启用分片
      const shardingStatus = await admin.command({ listShards: 1 });
      if (shardingStatus.shards.length === 0) {
        console.log('- 未检测到分片集群，跳过分片配置');
        return;
      }

      // 启用数据库分片
      await admin.command({ enableSharding: this.config.dbName });

      // 配置集合分片
      const shardCollections = [
        { collection: 'users', key: { villageId: 1 } },
        { collection: 'households', key: { villageId: 1 } },
        { collection: 'financial_transactions', key: { villageId: 1, transactionDate: 1 } },
        { collection: 'announcements', key: { villageId: 1, 'schedule.publishTime': 1 } },
        { collection: 'audit_logs', key: { timestamp: 1 } }
      ];

      for (const { collection, key } of shardCollections) {
        try {
          await admin.command({
            shardCollection: `${this.config.dbName}.${collection}`,
            key
          });
          console.log(`✓ 配置分片集合: ${collection}`);
        } catch (error) {
          if (error.code !== 23) { // 忽略已分片的错误
            console.error(`✗ 配置分片失败 ${collection}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.log('- 分片配置跳过:', error.message);
    }
  }

  /**
   * 数据验证规则
   */
  getUserValidator() {
    return {
      $jsonSchema: {
        bsonType: 'object',
        required: ['username', 'email', 'phone', 'villageId'],
        properties: {
          username: {
            bsonType: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '^[a-zA-Z0-9_]+$'
          },
          email: {
            bsonType: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          },
          phone: {
            bsonType: 'string',
            pattern: '^1[3-9]\\d{9}$'
          },
          roles: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['type', 'villageId'],
              properties: {
                type: {
                  enum: ['system_admin', 'village_admin', 'committee_member', 'finance_officer', 'grid_worker', 'volunteer', 'villager', 'guest']
                }
              }
            }
          },
          'status.account': {
            enum: ['active', 'inactive', 'suspended', 'pending_verification']
          }
        }
      }
    };
  }

  getVillageValidator() {
    return {
      $jsonSchema: {
        bsonType: 'object',
        required: ['code', 'name', 'location'],
        properties: {
          code: {
            bsonType: 'string',
            pattern: '^[A-Z0-9]{6}V[0-9]{3}[A-Z]$'
          },
          name: {
            bsonType: 'string',
            minLength: 2,
            maxLength: 100
          },
          'location.center': {
            bsonType: 'object',
            required: ['type', 'coordinates'],
            properties: {
              type: { enum: ['Point'] },
              coordinates: {
                bsonType: 'array',
                minItems: 2,
                maxItems: 2,
                items: { bsonType: 'number' }
              }
            }
          }
        }
      }
    };
  }

  getHouseholdValidator() {
    return {
      $jsonSchema: {
        bsonType: 'object',
        required: ['householdCode', 'villageId', 'householder'],
        properties: {
          householdCode: {
            bsonType: 'string',
            pattern: '^[A-Z0-9]{6}H[0-9]{4}[A-Z]$'
          },
          'address.coordinates': {
            bsonType: 'object',
            required: ['type', 'coordinates'],
            properties: {
              type: { enum: ['Point'] },
              coordinates: {
                bsonType: 'array',
                minItems: 2,
                maxItems: 2,
                items: { bsonType: 'number' }
              }
            }
          }
        }
      }
    };
  }

  getAnnouncementValidator() {
    return {
      $jsonSchema: {
        bsonType: 'object',
        required: ['title', 'content', 'category', 'publisher'],
        properties: {
          title: {
            bsonType: 'string',
            minLength: 1,
            maxLength: 200
          },
          content: {
            bsonType: 'string',
            minLength: 1
          },
          category: {
            enum: ['policy', 'meeting', 'activity', 'emergency', 'financial', 'construction', 'agriculture', 'welfare', 'education', 'health', 'security', 'other']
          },
          'priority.level': {
            enum: ['low', 'normal', 'high', 'urgent', 'critical']
          }
        }
      }
    };
  }

  getTransactionValidator() {
    return {
      $jsonSchema: {
        bsonType: 'object',
        required: ['transactionNumber', 'villageId', 'category', 'amount', 'transactionDate'],
        properties: {
          transactionNumber: {
            bsonType: 'string',
            pattern: '^TXN[0-9]{14}[A-Z0-9]{6}$'
          },
          'amount.value': {
            bsonType: 'number',
            minimum: 0
          },
          'category.main': {
            enum: ['income', 'expense', 'transfer', 'adjustment']
          },
          'approval.status': {
            enum: ['pending', 'approved', 'rejected', 'processing']
          }
        }
      }
    };
  }

  /**
   * 工具函数
   */
  hashPassword(password) {
    const salt = this.generateSalt();
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash;
  }

  generateSalt() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 初始化数据库
   */
  async initialize() {
    try {
      console.log('🚀 开始初始化数据库...');

      // 连接数据库
      await this.connect();

      // 创建集合
      await this.createCollections();

      // 创建索引
      await this.createIndexes();

      // 创建全文索引
      await this.createTextIndexes();

      // 配置分片
      await this.configureSharding();

      // 插入初始数据
      await this.insertInitialData();

      console.log('✅ 数据库初始化完成！');

    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const initializer = new DatabaseInitializer();
  initializer.initialize()
    .then(() => {
      console.log('初始化成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}

module.exports = DatabaseInitializer;