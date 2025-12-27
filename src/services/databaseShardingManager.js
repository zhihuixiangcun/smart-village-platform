/**
 * 数据库分片管理器
 * 为智慧乡村项目实现水平分片策略
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const logger = require('../utils/logger');

class DatabaseShardingManager {
  constructor(config = {}) {
    this.config = {
      // 分片配置
      shardKey: config.shardKey || 'villageId', // 默认按村庄ID分片
      numberOfShards: config.numberOfShards || 4,
      replicaSetName: config.replicaSetName || 'smartVillageRS',

      // 分片算法
      shardAlgorithm: config.shardAlgorithm || 'hash', // hash, range, geoHash

      // 连接配置
      shardServers: config.shardServers || [
        'mongodb://localhost:27017/shard1',
        'mongodb://localhost:27018/shard2',
        'mongodb://localhost:27019/shard3',
        'mongodb://localhost:27020/shard4'
      ],

      configServer: config.configServer || 'mongodb://localhost:27019/config',
      mongos: config.mongos || 'mongodb://localhost:27017/smartvillage',

      ...config
    };

    this.connections = new Map();
    this.shardMap = new Map();
    this.setupComplete = false;
  }

  /**
   * 初始化分片集群
   */
  async initializeSharding() {
    logger.debug('初始化分片集群...');
    try {
      // 1. 连接到Config Server
      const configClient = new MongoClient(this.config.configServer);
      await configClient.connect();
      logger.debug('✓ Config Server连接成功');
      // 2. 连接到Mongos
      const mongosClient = new MongoClient(this.config.mongos);
      await mongosClient.connect();
      logger.debug('✓ Mongos连接成功');
      // 3. 启用分片
      const admin = mongosClient.db('admin');
      await admin.command({ enableSharding: 'smartvillage' });
      logger.debug('✓ 分片已启用');
      // 4. 配置分片键
      const collections = this.getShardableCollections();
      for (const collection of collections) {
        await this.configureShardKey(admin, collection);
      }

      // 5. 添加分片
      await this.addShards(admin);

      // 6. 初始化分片映射
      await this.initializeShardMap();

      this.setupComplete = true;
      logger.debug('分片集群初始化完成');
      return {
        success: true,
        message: '分片集群配置成功',
        shardCount: this.config.numberOfShards
      };

    } catch (error) {
      logger.error('分片集群初始化失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取需要分片的集合
   */
  getShardableCollections() {
    return [
      {
        name: 'residents',
        shardKey: { villageId: 1 },
        unique: false
      },
      {
        name: 'users',
        shardKey: { villageId: 1 },
        unique: false
      },
      {
        name: 'finances',
        shardKey: { villageId: 1, transactionDate: 1 },
        unique: false
      },
      {
        name: 'villagecollaborations',
        shardKey: { villageId: 1, createdAt: 1 },
        unique: false
      },
      {
        name: 'emergencybroadcasts',
        shardKey: { villageId: 1, createdAt: -1 },
        unique: false
      },
      {
        name: 'orders',
        shardKey: { villageId: 1, createdAt: -1 },
        unique: false
      },
      {
        name: 'messagelogs',
        shardKey: { villageId: 1, createdAt: -1 },
        unique: false
      },
      {
        name: 'auditlogs',
        shardKey: { villageId: 1, timestamp: -1 },
        unique: false
      },
      {
        name: 'behaviorlogs',
        shardKey: { userId: 1, timestamp: -1 },
        unique: false
      }
    ];
  }

  /**
   * 配置集合的分片键
   */
  async configureShardKey(admin, collection) {
    try {
      const db = admin.db('smartvillage');

      logger.debug(`配置集合 ${collection.name} 的分片键...`);
      // 设置分片键
      await db.command({
        shardCollection: `smartvillage.${collection.name}`,
        key: collection.shardKey
      });

      // 如果是唯一索引，创建唯一索引
      if (collection.unique) {
        await db.collection(collection.name).createIndex(
          collection.shardKey,
          { unique: true }
        );
      }

      logger.debug(`✓ 集合 ${collection.name} 分片键配置成功`);
    } catch (error) {
      logger.error(`✗ 配置集合 ${collection.name} 分片键失败:`, error.message);
      throw error;
    }
  }

  /**
   * 添加分片到集群
   */
  async addShards(admin) {
    for (let i = 0; i < this.config.shardServers.length; i++) {
      const shardServer = this.config.shardServers[i];
      const shardName = `shard${i + 1}`;

      try {
        // 检查分片是否已存在
        const shards = await admin.command({ listShards: 1 });
        const exists = shards.shards.some(shard => shard._id === shardName);

        if (!exists) {
          await admin.command({
            addShard: shardServer,
            name: shardName
          });
          logger.debug(`✓ 分片 ${shardName} 添加成功`);
        } else {
          logger.debug(`分片 ${shardName} 已存在`);
        }
      } catch (error) {
        logger.error(`✗ 添加分片 ${shardName} 失败:`, error.message);
      }
    }
  }

  /**
   * 初始化分片映射
   */
  async initializeShardMap() {
    // 预计算常见村庄ID的分片映射
    const villageIds = await this.getAllVillageIds();

    for (const villageId of villageIds) {
      const shardId = this.calculateShard(villageId);
      this.shardMap.set(villageId.toString(), shardId);
    }

    logger.debug(`✓ 初始化了 ${this.shardMap.size} 个村庄的分片映射`);
  }

  /**
   * 计算文档属于哪个分片
   */
  calculateShard(shardKeyValue) {
    switch (this.config.shardAlgorithm) {
    case 'hash':
      return this.hashSharding(shardKeyValue);
    case 'range':
      return this.rangeSharding(shardKeyValue);
    case 'geoHash':
      return this.geoHashSharding(shardKeyValue);
    default:
      return this.hashSharding(shardKeyValue);
    }
  }

  /**
   * 哈希分片算法
   */
  hashSharding(value) {
    const hash = crypto.createHash('md5').update(value.toString()).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    return hashInt % this.config.numberOfShards;
  }

  /**
   * 范围分片算法
   */
  rangeSharding(value) {
    // 基于值范围分配分片
    const numValue = parseInt(value.toString()) || 0;
    const rangeSize = Math.ceil(100000 / this.config.numberOfShards);
    return Math.floor(numValue / rangeSize) % this.config.numberOfShards;
  }

  /**
   * 地理哈希分片算法
   */
  geoHashSharding(coordinates) {
    if (!coordinates || coordinates.length !== 2) {
      return 0;
    }

    // 简化的GeoHash实现
    const [lng, lat] = coordinates;
    const hash = `${Math.floor(lat * 100)}_${Math.floor(lng * 100)}`;
    return this.hashSharding(hash);
  }

  /**
   * 获取指定分片的连接
   */
  async getShardConnection(shardId) {
    if (this.connections.has(shardId)) {
      return this.connections.get(shardId);
    }

    const serverUrl = this.config.shardServers[shardId];
    const client = new MongoClient(serverUrl);
    await client.connect();

    this.connections.set(shardId, client);
    return client;
  }

  /**
   * 在指定分片上执行查询
   */
  async queryOnShard(collectionName, query, options = {}) {
    if (!this.setupComplete) {
      throw new Error('分片集群未初始化');
    }

    // 确定查询需要访问的分片
    const shardIds = await this.getShardsForQuery(collectionName, query);

    const results = [];

    // 在每个相关分片上执行查询
    for (const shardId of shardIds) {
      const client = await this.getShardConnection(shardId);
      const db = client.db('smartvillage');
      const collection = db.collection(collectionName);

      try {
        const shardResults = await collection.find(query, options).toArray();
        results.push(...shardResults);
      } catch (error) {
        logger.error(`分片 ${shardId} 查询失败:`, error.message);
      }
    }

    // 合并和排序结果
    return this.mergeResults(results, options.sort);
  }

  /**
   * 确定查询需要访问的分片
   */
  async getShardsForQuery(collectionName, query) {
    // 如果查询包含分片键，可以定位到特定分片
    if (query.villageId) {
      const shardId = this.calculateShard(query.villageId);
      return [shardId];
    }

    // 否则需要查询所有分片
    return Array.from({ length: this.config.numberOfShards }, (_, i) => i);
  }

  /**
   * 合并多分片查询结果
   */
  mergeResults(results, sort) {
    // 移除重复结果
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex(r => r._id.toString() === result._id.toString())
    );

    // 应用排序
    if (sort) {
      uniqueResults.sort((a, b) => {
        for (const [field, direction] of Object.entries(sort)) {
          const aVal = this.getNestedValue(a, field);
          const bVal = this.getNestedValue(b, field);

          if (aVal !== bVal) {
            return direction === 1 ? aVal - bVal : bVal - aVal;
          }
        }
        return 0;
      });
    }

    return uniqueResults;
  }

  /**
   * 获取嵌套对象值
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 重新平衡数据
   */
  async rebalanceData() {
    logger.debug('开始重新平衡数据...');
    try {
      const admin = new MongoClient(this.config.mongos).db('admin');

      // 运行Balancer
      await admin.command({ balancerStart: 1 });

      // 检查平衡状态
      const balancerStatus = await admin.command({ balancerStatus: 1 });
      logger.debug('Balancer状态:', balancerStatus);
      // 等待平衡完成
      let isInProgress = true;
      while (isInProgress) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const status = await admin.command({ balancerStatus: 1 });
        isInProgress = status.inBalancerRound;
      }

      logger.debug('✓ 数据重新平衡完成');
      return true;
    } catch (error) {
      logger.error('数据重新平衡失败:', error.message);
      return false;
    }
  }

  /**
   * 获取分片统计信息
   */
  async getShardStatistics() {
    const statistics = {
      shards: [],
      collections: []
    };

    // 获取分片信息
    try {
      const admin = new MongoClient(this.config.mongos).db('admin');
      const shardsResult = await admin.command({ listShards: 1 });

      for (const shard of shardsResult.shards) {
        const shardClient = new MongoClient(shard.host);
        await shardClient.connect();

        const dbStats = await shardClient.db('smartvillage').stats();

        statistics.shards.push({
          id: shard._id,
          host: shard.host,
          state: shard.state,
          size: dbStats.dataSize,
          documentCount: dbStats.objects,
          indexSize: dbStats.indexSize,
          storageSize: dbStats.storageSize
        });

        await shardClient.close();
      }

      // 获取集合分片信息
      const db = new MongoClient(this.config.mongos).db('smartvillage');
      const collections = await db.listCollections().toArray();

      for (const collection of collections) {
        try {
          const collStats = await db.collection(collection.name).stats();
          statistics.collections.push({
            name: collection.name,
            sharded: collStats.sharded,
            count: collStats.count,
            size: collStats.size,
            avgObjSize: collStats.avgObjSize,
            shardDistribution: collStats.shardDistribution
          });
        } catch (error) {
          // 忽略无法获取统计的集合
        }
      }

    } catch (error) {
      logger.error('获取分片统计失败:', error.message);
    }

    return statistics;
  }

  /**
   * 优化分片键
   */
  async optimizeShardKey(collectionName, newShardKey) {
    logger.debug(`优化集合 ${collectionName} 的分片键...`);
    try {
      // 1. 创建临时集合
      const tempCollectionName = `${collectionName}_temp_${Date.now()}`;
      const db = new MongoClient(this.config.mongos).db('smartvillage');

      // 2. 复制数据到临时集合
      await db.collection(collectionName).aggregate([
        { $out: tempCollectionName }
      ]).toArray();

      // 3. 删除原集合
      await db.collection(collectionName).drop();

      // 4. 重新创建集合并设置新的分片键
      await db.command({
        shardCollection: `smartvillage.${collectionName}`,
        key: newShardKey
      });

      // 5. 将数据从临时集合移回
      await db.collection(tempCollectionName).aggregate([
        { $out: collectionName }
      ]).toArray();

      // 6. 删除临时集合
      await db.collection(tempCollectionName).drop();

      logger.debug(`✓ 集合 ${collectionName} 分片键优化完成`);
      return true;
    } catch (error) {
      logger.error(`优化集合 ${collectionName} 分片键失败:`, error.message);
      return false;
    }
  }

  /**
   * 监控分片健康状态
   */
  async monitorShardHealth() {
    const health = {
      overall: 'healthy',
      shards: [],
      issues: []
    };

    try {
      const admin = new MongoClient(this.config.mongos).db('admin');

      // 检查所有分片状态
      const shardsResult = await admin.command({ listShards: 1 });

      for (const shard of shardsResult.shards) {
        try {
          const shardClient = new MongoClient(shard.host);
          await shardClient.connect();

          // 检查分片响应时间
          const start = Date.now();
          await shardClient.db('smartvillage').admin({ ping: 1 });
          const responseTime = Date.now() - start;

          const shardHealth = {
            id: shard._id,
            host: shard.host,
            status: responseTime < 1000 ? 'healthy' : 'slow',
            responseTime
          };

          health.shards.push(shardHealth);

          if (shardHealth.status !== 'healthy') {
            health.issues.push(`分片 ${shard._id} 响应缓慢: ${responseTime}ms`);
          }

          await shardClient.close();
        } catch (error) {
          health.shards.push({
            id: shard._id,
            host: shard.host,
            status: 'unreachable',
            error: error.message
          });
          health.issues.push(`分片 ${shard._id} 不可达`);
        }
      }

      // 检查数据分布
      const stats = await this.getShardStatistics();
      const totalDocs = stats.collections.reduce((sum, coll) => sum + coll.count, 0);
      const avgDocsPerShard = totalDocs / stats.shards.length;

      for (const shard of stats.shards) {
        const deviation = Math.abs(shard.documentCount - avgDocsPerShard) / avgDocsPerShard;
        if (deviation > 0.3) { // 超过30%的偏差
          health.issues.push(`分片 ${shard.id} 数据分布不均衡`);
        }
      }

      if (health.issues.length > 0) {
        health.overall = 'warning';
      }

    } catch (error) {
      health.overall = 'error';
      health.issues.push(`监控失败: ${error.message}`);
    }

    return health;
  }

  /**
   * 获取所有村庄ID（用于初始化分片映射）
   */
  async getAllVillageIds() {
    try {
      const db = new MongoClient(this.config.mongos).db('smartvillage');
      const villages = await db.collection('villages').find({}, { _id: 1 }).toArray();
      return villages.map(v => v._id);
    } catch (error) {
      logger.error('获取村庄ID失败:', error.message);
      return [];
    }
  }
}

module.exports = DatabaseShardingManager;