/**
 * 快速索引检查脚本
 * 检查当前数据库的索引状态并提供优化建议
 */

const mongoose = require('mongoose');

class QuickIndexChecker {
  constructor() {
    this.collections = [];
    this.recommendations = [];
  }

  async check() {
    console.log('🔍 快速索引检查开始...\n');

    try {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village');
      console.log('✅ 数据库连接成功\n');

      await this.checkCollections();
      this.generateRecommendations();
      this.printSummary();

    } catch (error) {
      console.error('❌ 检查失败:', error.message);
      console.log('\n💡 建议:');
      console.log('1. 确保MongoDB服务已启动');
      console.log('2. 检查MONGO_URI环境变量');
      console.log('3. 验证网络连接');
    } finally {
      await mongoose.disconnect();
    }
  }

  async checkCollections() {
    const collections = await mongoose.connection.db.listCollections().toArray();

    console.log(`📊 发现 ${collections.length} 个集合:`);

    for (const collection of collections) {
      const stats = await mongoose.connection.db.collection(collection.name).stats();
      const indexes = await mongoose.connection.db.collection(collection.name).listIndexes().toArray();

      this.collections.push({
        name: collection.name,
        documentCount: stats.count,
        size: this.formatBytes(stats.size),
        indexCount: stats.nindexes,
        indexes: indexes.map(idx => ({
          name: idx.name,
          keys: idx.key,
          unique: idx.unique || false
        }))
      });

      console.log(`  📁 ${collection.name}`);
      console.log(`     文档数: ${stats.count.toLocaleString()}`);
      console.log(`     大小: ${this.formatBytes(stats.size)}`);
      console.log(`     索引数: ${stats.nindexes}`);
      console.log('');
    }
  }

  generateRecommendations() {
    console.log('💡 索引优化建议:\n');

    this.collections.forEach(collection => {
      const recommendations = this.getCollectionRecommendations(collection);

      if (recommendations.length > 0) {
        console.log(`🔸 ${collection.name}:`);
        recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
        console.log('');
      }
    });
  }

  getCollectionRecommendations(collection) {
    const recommendations = [];
    const { name, documentCount, indexes } = collection;

    // 基于集合名称和文档数量的推荐
    if (name.includes('users')) {
      if (documentCount > 1000 && !indexes.some(idx => idx.keys.username)) {
        recommendations.push('添加 username 索引: { username: 1 }');
      }
      if (!indexes.some(idx => idx.keys.email)) {
        recommendations.push('添加 email 索引: { email: 1 }');
      }
      if (!indexes.some(idx => idx.keys.villageId)) {
        recommendations.push('添加 villageId 索引: { villageId: 1 }');
      }
      if (!indexes.some(idx => idx.keys.role)) {
        recommendations.push('添加 role 复合索引: { role: 1, status: 1 }');
      }
    }

    if (name.includes('household')) {
      if (!indexes.some(idx => idx.keys.codeId)) {
        recommendations.push('添加 codeId 唯一索引: { codeId: 1 }');
      }
      if (!indexes.some(idx => idx.keys.villageId)) {
        recommendations.push('添加 villageId 索引: { villageId: 1 }');
      }
    }

    if (name.includes('transaction') || name.includes('finance')) {
      if (!indexes.some(idx => idx.keys.villageId)) {
        recommendations.push('添加 villageId 索引: { villageId: 1 }');
      }
      if (!indexes.some(idx => idx.keys.transactionDate)) {
        recommendations.push('添加日期索引: { transactionDate: -1 }');
      }
      if (!indexes.some(idx => idx.keys.amount)) {
        recommendations.push('添加金额索引: { amount.value: 1 }');
      }
    }

    if (name.includes('village')) {
      if (!indexes.some(idx => idx.keys.name)) {
        recommendations.push('添加名称索引: { name: 1 }');
      }
      if (!indexes.some(idx => idx.keys.location)) {
        recommendations.push('添加地理位置索引: { location: "2dsphere" }');
      }
    }

    // 通用建议
    if (documentCount > 10000 && indexes.length < 5) {
      recommendations.push('文档数较多，建议增加更多索引以提升查询性能');
    }

    if (indexes.length === 1 && indexes[0].name === '_id_') {
      recommendations.push('仅有默认索引，强烈建议添加业务相关索引');
    }

    return recommendations;
  }

  printSummary() {
    console.log('📋 检查摘要:');
    console.log('='.repeat(50));

    const totalCollections = this.collections.length;
    const totalDocuments = this.collections.reduce((sum, col) => sum + col.documentCount, 0);
    const totalIndexes = this.collections.reduce((sum, col) => sum + col.indexCount, 0);
    const recommendationsCount = this.recommendations.length;

    console.log(`总集合数: ${totalCollections}`);
    console.log(`总文档数: ${totalDocuments.toLocaleString()}`);
    console.log(`总索引数: ${totalIndexes}`);
    console.log(`优化建议数: ${recommendationsCount}`);

    console.log('\n🚀 下一步行动:');
    if (recommendationsCount === 0) {
      console.log('✅ 索引配置良好，无需额外优化');
    } else {
      console.log('1. 根据建议创建必要的索引');
      console.log('2. 执行: node scripts/createIndexes.js');
      console.log('3. 监控查询性能改善情况');
    }

    // 性能影响评估
    const avgDocsPerCollection = totalDocuments / totalCollections;
    let performanceImpact = 'low';

    if (totalDocuments > 100000) {
      performanceImpact = 'high';
    } else if (totalDocuments > 10000) {
      performanceImpact = 'medium';
    }

    console.log('\n📈 性能影响评估:', performanceImpact.toUpperCase());
    console.log(`- ${totalDocuments.toLocaleString()} 文档`);
    console.log(`- ${totalIndexes} 个索引`);
    console.log(`- 预期查询性能提升: ${this.estimatePerformanceImprovement()}`);
  }

  estimatePerformanceImprovement() {
    const totalRecommendations = this.collections.reduce((sum, col) => {
      return sum + this.getCollectionRecommendations(col).length;
    }, 0);

    if (totalRecommendations === 0) {
      return '当前已优化';
    } else if (totalRecommendations < 5) {
      return '10-30%';
    } else if (totalRecommendations < 15) {
      return '30-60%';
    } else {
      return '60-80%';
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 执行检查
const checker = new QuickIndexChecker();
checker.check();