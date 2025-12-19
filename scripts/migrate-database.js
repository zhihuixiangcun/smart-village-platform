/**
 * 智慧乡村数据库迁移脚本
 *
 * 功能：
 * 1. 版本化数据库迁移管理
 * 2. 支持向前和向后迁移
 * 3. 数据结构变更处理
 * 4. 索引优化迁移
 * 5. 数据迁移和转换
 * 6. 迁移回滚功能
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class DatabaseMigrator {
  constructor() {
    this.client = null;
    this.db = null;
    this.config = {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
      dbName: process.env.DB_NAME || 'smart_village',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    };
    this.migrationsPath = path.join(__dirname, 'migrations');
    this.migrationCollection = 'migrations';
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
    } catch (error) {
      console.error('✗ 数据库连接失败:', error.message);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('✓ 数据库连接已关闭');
    }
  }

  /**
   * 初始化迁移系统
   */
  async initMigrationSystem() {
    try {
      const exists = await this.db.listCollections({ name: this.migrationCollection }).hasNext();

      if (!exists) {
        await this.db.createCollection(this.migrationCollection);
        await this.db.collection(this.migrationCollection).createIndex({ version: 1 }, { unique: true });
        console.log('✓ 创建迁移记录集合');
      }
    } catch (error) {
      console.error('✗ 初始化迁移系统失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取当前数据库版本
   */
  async getCurrentVersion() {
    try {
      const latestMigration = await this.db.collection(this.migrationCollection)
        .findOne({}, { sort: { version: -1 } });

      return latestMigration ? latestMigration.version : '0.0.0';
    } catch (error) {
      console.error('✗ 获取当前版本失败:', error.message);
      return '0.0.0';
    }
  }

  /**
   * 记录迁移
   */
  async recordMigration(migration, direction = 'up') {
    try {
      const record = {
        version: migration.version,
        name: migration.name,
        description: migration.description,
        direction,
        executedAt: new Date(),
        duration: migration.duration || 0,
        success: true
      };

      if (direction === 'down') {
        await this.db.collection(this.migrationCollection).deleteOne({ version: migration.version });
      } else {
        await this.db.collection(this.migrationCollection).updateOne(
          { version: migration.version },
          { $set: record },
          { upsert: true }
        );
      }

      console.log(`✓ 记录迁移: ${migration.version} - ${direction}`);
    } catch (error) {
      console.error('✗ 记录迁移失败:', error.message);
      throw error;
    }
  }

  /**
   * 加载迁移文件
   */
  async loadMigrations() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const migrationFiles = files.filter(file =>
        file.endsWith('.js') && file.match(/^\d{4}_.*\.js$/)
      );

      const migrations = [];
      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsPath, file);
        const migrationModule = require(filePath);

        migrations.push({
          filename: file,
          version: file.substring(0, 4).replace(/_/g, '.'),
          name: file.substring(5, file.length - 3),
          ...migrationModule
        });
      }

      // 按版本号排序
      migrations.sort((a, b) => this.compareVersions(a.version, b.version));

      return migrations;
    } catch (error) {
      console.error('✗ 加载迁移文件失败:', error.message);
      return [];
    }
  }

  /**
   * 比较版本号
   */
  compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }

    return 0;
  }

  /**
   * 执行迁移
   */
  async executeMigration(migration, direction = 'up') {
    const startTime = Date.now();

    try {
      console.log(`🔄 执行迁移: ${migration.version} - ${migration.name} (${direction})`);

      // 执行迁移函数
      if (direction === 'up' && migration.up) {
        await migration.up(this.db);
      } else if (direction === 'down' && migration.down) {
        await migration.down(this.db);
      } else {
        throw new Error(`迁移 ${direction} 方法未定义`);
      }

      // 记录执行时间
      migration.duration = Date.now() - startTime;

      // 记录迁移
      await this.recordMigration(migration, direction);

      console.log(`✅ 迁移完成: ${migration.version} (${migration.duration}ms)`);

    } catch (error) {
      migration.duration = Date.now() - startTime;
      console.error(`❌ 迁移失败: ${migration.version} - ${error.message}`);
      throw error;
    }
  }

  /**
   * 升级数据库
   */
  async migrateUp(targetVersion = null) {
    try {
      console.log('🚀 开始数据库升级...');

      // 获取当前版本
      const currentVersion = await this.getCurrentVersion();
      console.log(`当前版本: ${currentVersion}`);

      // 加载所有迁移
      const migrations = await this.loadMigrations();

      // 过滤需要执行的迁移
      const pendingMigrations = migrations.filter(migration => {
        if (targetVersion) {
          return this.compareVersions(migration.version, currentVersion) > 0 &&
                 this.compareVersions(migration.version, targetVersion) <= 0;
        }
        return this.compareVersions(migration.version, currentVersion) > 0;
      });

      if (pendingMigrations.length === 0) {
        console.log('✨ 数据库已是最新版本');
        return;
      }

      console.log(`发现 ${pendingMigrations.length} 个待执行的迁移`);

      // 逐个执行迁移
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration, 'up');
      }

      console.log('🎉 数据库升级完成！');

    } catch (error) {
      console.error('💥 数据库升级失败:', error.message);
      throw error;
    }
  }

  /**
   * 降级数据库
   */
  async migrateDown(targetVersion) {
    try {
      console.log('🔙 开始数据库降级...');

      const currentVersion = await this.getCurrentVersion();
      console.log(`当前版本: ${currentVersion}`);

      if (this.compareVersions(currentVersion, targetVersion) <= 0) {
        console.log('✨ 数据库已是目标版本或更低版本');
        return;
      }

      // 加载所有迁移
      const migrations = await this.loadMigrations();

      // 过滤需要回滚的迁移
      const rollbackMigrations = migrations.filter(migration => {
        return this.compareVersions(migration.version, targetVersion) > 0 &&
               this.compareVersions(migration.version, currentVersion) <= 0;
      }).reverse(); // 逆序执行降级

      console.log(`将回滚 ${rollbackMigrations.length} 个迁移`);

      // 逐个执行降级
      for (const migration of rollbackMigrations) {
        await this.executeMigration(migration, 'down');
      }

      console.log('🎉 数据库降级完成！');

    } catch (error) {
      console.error('💥 数据库降级失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建迁移文件
   */
  async createMigrationFile(name, description) {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
      const version = timestamp.substring(0, 4) + '_' + timestamp.substring(4, 6) + '_' + timestamp.substring(6, 8);
      const filename = `${timestamp.replace(/:/g, '_')}_${name}.js`;
      const filePath = path.join(this.migrationsPath, filename);

      const template = `/**
 * 迁移: ${name}
 * 描述: ${description}
 * 版本: ${version}
 * 创建时间: ${new Date().toLocaleString()}
 */

module.exports = {
  version: '${version}',
  name: '${name}',
  description: '${description}',

  /**
   * 向上迁移
   * @param {Db} db - 数据库实例
   */
  async up(db) {
    // TODO: 实现向上迁移逻辑
    console.log('执行向上迁移...');
  },

  /**
   * 向下迁移
   * @param {Db} db - 数据库实例
   */
  async down(db) {
    // TODO: 实现向下迁移逻辑
    console.log('执行向下迁移...');
  }
};
`;

      // 确保迁移目录存在
      await fs.mkdir(this.migrationsPath, { recursive: true });

      // 写入文件
      await fs.writeFile(filePath, template, 'utf8');

      console.log(`✓ 创建迁移文件: ${filename}`);
      return filePath;

    } catch (error) {
      console.error('✗ 创建迁移文件失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证迁移
   */
  async validateMigrations() {
    try {
      console.log('🔍 验证迁移文件...');

      const migrations = await this.loadMigrations();
      const currentVersion = await this.getCurrentVersion();

      for (const migration of migrations) {
        // 检查必需属性
        if (!migration.version || !migration.name || !migration.description) {
          throw new Error(`迁移文件 ${migration.filename} 缺少必需属性`);
        }

        // 检查up方法
        if (typeof migration.up !== 'function') {
          throw new Error(`迁移文件 ${migration.filename} 缺少up方法`);
        }

        // 检查版本号格式
        if (!/^\d+\.\d+\.\d+$/.test(migration.version)) {
          throw new Error(`迁移文件 ${migration.filename} 版本号格式错误`);
        }
      }

      console.log('✅ 所有迁移文件验证通过');

    } catch (error) {
      console.error('❌ 迁移验证失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取迁移状态
   */
  async getMigrationStatus() {
    try {
      const migrations = await this.loadMigrations();
      const currentVersion = await this.getCurrentVersion();
      const appliedMigrations = await this.db.collection(this.migrationCollection).find().toArray();

      const status = {
        currentVersion,
        totalMigrations: migrations.length,
        appliedMigrations: appliedMigrations.length,
        pendingMigrations: 0,
        migrations: []
      };

      for (const migration of migrations) {
        const applied = appliedMigrations.find(m => m.version === migration.version);
        const state = applied ? 'applied' : 'pending';

        if (state === 'pending') {
          status.pendingMigrations++;
        }

        status.migrations.push({
          version: migration.version,
          name: migration.name,
          description: migration.description,
          state,
          appliedAt: applied ? applied.executedAt : null
        });
      }

      return status;

    } catch (error) {
      console.error('✗ 获取迁移状态失败:', error.message);
      return null;
    }
  }

  /**
   * 数据备份
   */
  async backupDatabase() {
    try {
      console.log('📦 开始备份数据库...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(process.cwd(), 'backups', timestamp);

      // 创建备份目录
      await fs.mkdir(backupDir, { recursive: true });

      // 获取所有集合
      const collections = await this.db.listCollections().toArray();

      for (const collection of collections) {
        const collectionName = collection.name;
        if (collectionName === this.migrationCollection) continue;

        console.log(`备份集合: ${collectionName}`);

        // 导出集合数据
        const documents = await this.db.collection(collectionName).find({}).toArray();
        const backupFile = path.join(backupDir, `${collectionName}.json`);

        await fs.writeFile(backupFile, JSON.stringify(documents, null, 2), 'utf8');
      }

      // 备份索引信息
      const indexInfo = {};
      for (const collection of collections) {
        if (collection.name === this.migrationCollection) continue;

        const indexes = await this.db.collection(collection.name).listIndexes().toArray();
        indexInfo[collection.name] = indexes;
      }

      await fs.writeFile(
        path.join(backupDir, 'indexes.json'),
        JSON.stringify(indexInfo, null, 2),
        'utf8'
      );

      console.log(`✅ 数据库备份完成: ${backupDir}`);
      return backupDir;

    } catch (error) {
      console.error('❌ 数据库备份失败:', error.message);
      throw error;
    }
  }

  /**
   * 数据恢复
   */
  async restoreDatabase(backupPath) {
    try {
      console.log('📥 开始恢复数据库...');

      // 验证备份路径
      const stats = await fs.stat(backupPath);
      if (!stats.isDirectory()) {
        throw new Error('备份路径不是有效目录');
      }

      // 获取备份文件列表
      const files = await fs.readdir(backupPath);

      for (const file of files) {
        if (file === 'indexes.json') continue;
        if (!file.endsWith('.json')) continue;

        const collectionName = file.slice(0, -5);
        console.log(`恢复集合: ${collectionName}`);

        // 读取备份数据
        const backupData = await fs.readFile(path.join(backupPath, file), 'utf8');
        const documents = JSON.parse(backupData);

        if (documents.length > 0) {
          // 清空现有集合
          await this.db.collection(collectionName).deleteMany({});

          // 插入备份数据
          await this.db.collection(collectionName).insertMany(documents);
        }
      }

      // 恢复索引
      const indexFile = path.join(backupPath, 'indexes.json');
      try {
        const indexData = await fs.readFile(indexFile, 'utf8');
        const indexInfo = JSON.parse(indexData);

        for (const [collectionName, indexes] of Object.entries(indexInfo)) {
          console.log(`恢复索引: ${collectionName}`);

          // 删除现有索引（除了_id）
          await this.db.collection(collectionName).dropIndexes();

          // 重建索引
          for (const index of indexes) {
            if (index.name === '_id_') continue;

            const options = {
              name: index.name,
              unique: index.unique || false,
              sparse: index.sparse || false,
              expireAfterSeconds: index.expireAfterSeconds
            };

            await this.db.collection(collectionName).createIndex(index.key, options);
          }
        }
      } catch (error) {
        console.warn('索引恢复失败:', error.message);
      }

      console.log('✅ 数据库恢复完成');

    } catch (error) {
      console.error('❌ 数据库恢复失败:', error.message);
      throw error;
    }
  }
}

// 命令行接口
async function main() {
  const migrator = new DatabaseMigrator();

  try {
    await migrator.connect();
    await migrator.initMigrationSystem();

    const command = process.argv[2];
    const args = process.argv.slice(3);

    switch (command) {
      case 'up':
        const targetVersion = args[0];
        await migrator.migrateUp(targetVersion);
        break;

      case 'down':
        const downVersion = args[0];
        if (!downVersion) {
          console.error('请指定目标版本');
          process.exit(1);
        }
        await migrator.migrateDown(downVersion);
        break;

      case 'create':
        const migrationName = args[0];
        const description = args[1] || '';
        if (!migrationName) {
          console.error('请指定迁移名称');
          process.exit(1);
        }
        await migrator.createMigrationFile(migrationName, description);
        break;

      case 'status':
        const status = await migrator.getMigrationStatus();
        if (status) {
          console.log('\n迁移状态:');
          console.log(`当前版本: ${status.currentVersion}`);
          console.log(`总迁移数: ${status.totalMigrations}`);
          console.log(`已应用: ${status.appliedMigrations}`);
          console.log(`待执行: ${status.pendingMigrations}\n`);

          console.log('迁移列表:');
          status.migrations.forEach(m => {
            const icon = m.state === 'applied' ? '✅' : '⏳';
            console.log(`${icon} ${m.version} - ${m.name}`);
          });
        }
        break;

      case 'validate':
        await migrator.validateMigrations();
        break;

      case 'backup':
        const backupPath = await migrator.backupDatabase();
        console.log(`备份路径: ${backupPath}`);
        break;

      case 'restore':
        const restorePath = args[0];
        if (!restorePath) {
          console.error('请指定备份路径');
          process.exit(1);
        }
        await migrator.restoreDatabase(restorePath);
        break;

      default:
        console.log(`
使用方法:
  node migrate-database.js <command> [args]

命令:
  up [version]     升级到最新版本或指定版本
  down version     降级到指定版本
  create name [desc] 创建新的迁移文件
  status           显示迁移状态
  validate         验证迁移文件
  backup           备份数据库
  restore path     从指定路径恢复数据库

示例:
  node migrate-database.js up
  node migrate-database.js up 1.2.0
  node migrate-database.js down 1.1.0
  node migrate-database.js create add_user_biometrics
  node migrate-database.js status
        `);
    }

  } catch (error) {
    console.error('操作失败:', error.message);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;