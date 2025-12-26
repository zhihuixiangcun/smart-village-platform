/**
 * 数据库索引分析脚本
 * 分析现有索引并识别需要优化的地方
 */

const mongoose = require('mongoose');

class IndexAnalyzer {
  constructor() {
    this.collections = [];
    this.recommendations = [];
  }

  async analyzeAllCollections() {
    console.log('🔍 开始分析数据库索引...\n');

    try {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village');
      console.log('✅ 连接数据库成功\n');

      // 获取所有集合
      const collections = await mongoose.connection.db.listCollections().toArray();

      for (const collection of collections) {
        const analysis = await this.analyzeCollection(collection.name);
        this.collections.push(analysis);
        this.printCollectionAnalysis(analysis);
      }

      // 生成优化建议
      this.generateRecommendations();

      // 生成报告
      await this.generateReport();

    } catch (error) {
      console.error('❌ 分析失败:', error.message);
    } finally {
      await mongoose.disconnect();
    }
  }

  async analyzeCollection(collectionName) {
    console.log(`📊 分析集合: ${collectionName}`);

    const stats = await mongoose.connection.db.collection(collectionName).stats();
    const indexes = await mongoose.connection.db.collection(collectionName).listIndexes().toArray();

    // 计算索引使用情况
    const indexUsage = await this.getIndexUsage(collectionName);

    const analysis = {
      collection: collectionName,
      documentCount: stats.count,
      size: this.formatBytes(stats.size),
      avgObjSize: Math.round(stats.avgObjSize),
      indexCount: stats.nindexes,
      totalIndexSize: this.formatBytes(stats.totalIndexSize),
      indexes: indexes.map(idx => ({
        name: idx.name,
        keys: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false,
        usage: indexUsage[idx.name] || 0
      })),
      issues: [],
      recommendations: []
    };

    // 检查问题
    this.checkCollectionIssues(analysis);

    return analysis;
  }

  async getIndexUsage(collectionName) {
    try {
      // MongoDB 5.0+ 支持索引使用统计
      const stats = await mongoose.connection.db.collection(collectionName)
        .aggregate([{ $indexStats: {} }])
        .toArray();

      const usage = {};
      stats.forEach(stat => {
        usage[stat.name] = stat.accesses.ops || 0;
      });

      return usage;
    } catch (error) {
      console.warn(`⚠️  无法获取 ${collectionName} 索引使用统计`);
      return {};
    }
  }

  checkCollectionIssues(analysis) {
    const { collection, documentCount, indexes } = analysis;

    // 检查是否有_id索引
    const hasIdIndex = indexes.some(idx => idx.name === '_id_');
    if (!hasIdIndex) {
      analysis.issues.push('缺少_id索引');
    }

    // 检查未使用的索引
    const unusedIndexes = indexes.filter(idx =>
      idx.name !== '_id_' && idx.usage === 0
    );

    if (unusedIndexes.length > 0) {
      analysis.issues.push(`发现 ${unusedIndexes.length} 个未使用的索引`);
      analysis.recommendations.push('考虑删除未使用的索引以提高写入性能');
    }

    // 检查集合特定的索引需求
    this.checkSpecificCollectionRequirements(analysis);
  }

  checkSpecificCollectionRequirements(analysis) {
    const { collection } = analysis;

    switch (collection) {
      case 'users':
        this.checkUserIndexes(analysis);
        break;
      case 'households':
        this.checkHouseholdIndexes(analysis);
        break;
      case 'transactions':
        this.checkTransactionIndexes(analysis);
        break;
      case 'villages':
        this.checkVillageIndexes(analysis);
        break;
      case 'residents':
        this.checkResidentIndexes(analysis);
        break;
    }
  }

  checkUserIndexes(analysis) {
    const requiredIndexes = [
      { keys: { username: 1 }, unique: true },
      { keys: { email: 1 }, unique: true },
      { keys: { villageId: 1, status: 1 } },
      { keys: { 'profile.phone': 1 } },
      { keys: { role: 1, status: 1 } },
      { keys: { createdAt: -1 } }
    ];

    this.checkRequiredIndexes(analysis, requiredIndexes);
  }

  checkHouseholdIndexes(analysis) {
    const requiredIndexes = [
      { keys: { codeId: 1 }, unique: true },
      { keys: { villageId: 1, status: 1 } },
      { keys: { 'householder.userId': 1 } },
      { keys: { tags: 1 } },
      { keys: { 'economics.povertyStatus.isPovertyHousehold': 1 } }
    ];

    this.checkRequiredIndexes(analysis, requiredIndexes);
  }

  checkTransactionIndexes(analysis) {
    const requiredIndexes = [
      { keys: { transactionNumber: 1 }, unique: true },
      { keys: { villageId: 1, 'approval.status': 1 } },
      { keys: { transactionDate: -1 } },
      { keys: { 'relatedTo.householdId': 1 } },
      { keys: { 'relatedTo.userId': 1 } },
      { keys: { 'amount.value': 1 } },
      { keys: { 'category.main': 1, 'category.sub': 1 } }
    ];

    this.checkRequiredIndexes(analysis, requiredIndexes);
  }

  checkVillageIndexes(analysis) {
    const requiredIndexes = [
      { keys: { name: 1 } },
      { keys: { 'location': '2dsphere' } },
      { keys: { 'province': 1, 'city': 1, 'district': 1 } }
    ];

    this.checkRequiredIndexes(analysis, requiredIndexes);
  }

  checkResidentIndexes(analysis) {
    const requiredIndexes = [
      { keys: { householdId: 1 } },
      { keys: { villageId: 1, status: 1 } },
      { keys: { 'profile.firstName': 1, 'profile.lastName': 1 } }
    ];

    this.checkRequiredIndexes(analysis, requiredIndexes);
  }

  checkRequiredIndexes(analysis, requiredIndexes) {
    const { indexes } = analysis;

    requiredIndexes.forEach(required => {
      const exists = indexes.some(idx =>
        this.indexesMatch(idx.keys, required.keys) &&
        (idx.unique === required.unique || !required.unique)
      );

      if (!exists) {
        analysis.recommendations.push(
          `添加索引: ${JSON.stringify(required.keys)}${required.unique ? ' (唯一)' : ''}`
        );
      }
    });
  }

  indexesMatch(idx1, idx2) {
    return JSON.stringify(idx1) === JSON.stringify(idx2);
  }

  generateRecommendations() {
    console.log('\n📋 优化建议总结:');

    this.collections.forEach(collection => {
      if (collection.issues.length > 0 || collection.recommendations.length > 0) {
        console.log(`\n🔸 ${collection.collection}:`);

        collection.issues.forEach(issue => {
          console.log(`  ❌ ${issue}`);
        });

        collection.recommendations.forEach(rec => {
          console.log(`  💡 ${rec}`);
        });
      }
    });
  }

  printCollectionAnalysis(analysis) {
    console.log(`  文档数: ${analysis.documentCount.toLocaleString()}`);
    console.log(`  数据大小: ${analysis.size}`);
    console.log(`  索引数: ${analysis.indexCount}`);
    console.log(`  索引大小: ${analysis.totalIndexSize}`);
    console.log(`  平均文档大小: ${analysis.avgObjSize} bytes`);
    console.log('');
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCollections: this.collections.length,
        totalDocuments: this.collections.reduce((sum, col) => sum + col.documentCount, 0),
        totalIndexes: this.collections.reduce((sum, col) => sum + col.indexCount, 0)
      },
      collections: this.collections,
      recommendations: this.generateCreateIndexScript()
    };

    // 保存报告
    const fs = require('fs');
    const reportPath = './database-index-analysis-report.json';

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 详细报告已生成: ${reportPath}`);
  }

  generateCreateIndexScript() {
    const script = [];
    script.push('// 自动生成的索引创建脚本');
    script.push('// 请在执行前备份您的数据\n');

    this.collections.forEach(collection => {
      collection.recommendations.forEach(rec => {
        if (rec.startsWith('添加索引:')) {
          const keysStr = rec.match(/添加索引: (.+)/)[1];
          const isUnique = keysStr.includes('(唯一)');
          const keys = JSON.parse(keysStr.replace(' (唯一)', ''));

          script.push(`db.${collection.collection}.createIndex(${JSON.stringify(keys)}, {`);
          if (isUnique) {
            script.push('  unique: true,');
          }
          script.push('  background: true');
          script.push('});');
          script.push('');
        }
      });
    });

    return script.join('\n');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const analyzer = new IndexAnalyzer();
  analyzer.analyzeAllCollections()
    .then(() => {
      console.log('\n✅ 索引分析完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 索引分析失败:', error);
      process.exit(1);
    });
}

module.exports = IndexAnalyzer;