/**
 * 数据库索引创建脚本
 * 根据分析结果创建必要的索引以提升查询性能
 */

const mongoose = require('mongoose');

class IndexCreator {
  constructor() {
    this.indexConfigs = this.getIndexConfigs();
    this.results = [];
  }

  getIndexConfigs() {
    return {
      users: [
        { key: { username: 1 }, options: { unique: true, background: true } },
        { key: { email: 1 }, options: { unique: true, background: true } },
        { key: { villageId: 1, status: 1 }, options: { background: true } },
        { key: { 'profile.phone': 1 }, options: { background: true, sparse: true } },
        { key: { 'profile.firstName': 1, 'profile.lastName': 1 }, options: { background: true } },
        { key: { role: 1, status: 1 }, options: { background: true } },
        { key: { createdAt: -1 }, options: { background: true } },
        { key: { lastLoginAt: -1 }, options: { background: true } }
      ],
      households: [
        { key: { codeId: 1 }, options: { unique: true, background: true } },
        { key: { villageId: 1, status: 1 }, options: { background: true } },
        { key: { 'householder.userId': 1 }, options: { background: true } },
        { key: { 'householder.phone': 1 }, options: { background: true, sparse: true } },
        { key: { tags: 1 }, options: { background: true } },
        { key: { 'economics.povertyStatus.isPovertyHousehold': 1 }, options: { background: true } },
        { key: { createdAt: -1 }, options: { background: true } }
      ],
      transactions: [
        { key: { transactionNumber: 1 }, options: { unique: true, background: true } },
        { key: { villageId: 1, 'approval.status': 1 }, options: { background: true } },
        { key: { transactionDate: -1 }, options: { background: true } },
        { key: { 'relatedTo.householdId': 1 }, options: { background: true } },
        { key: { 'relatedTo.userId': 1 }, options: { background: true } },
        { key: { 'payment.status': 1 }, options: { background: true } },
        { key: { 'amount.value': 1 }, options: { background: true } },
        { key: { 'category.main': 1, 'category.sub': 1 }, options: { background: true } },
        { key: { villageId: 1, transactionDate: -1 }, options: { background: true } }
      ],
      residents: [
        { key: { householdId: 1 }, options: { background: true } },
        { key: { villageId: 1, status: 1 }, options: { background: true } },
        { key: { 'profile.firstName': 1, 'profile.lastName': 1 }, options: { background: true } },
        { key: { 'profile.phone': 1 }, options: { background: true, sparse: true } },
        { key: { 'profile.birthDate': -1 }, options: { background: true } }
      ],
      villages: [
        { key: { name: 1 }, options: { background: true } },
        { key: { 'location': '2dsphere' }, options: { background: true } },
        { key: { 'province': 1, 'city': 1, 'district': 1 }, options: { background: true } },
        { key: { createdAt: -1 }, options: { background: true } }
      ],
      financialreports: [
        { key: { villageId: 1, reportType: 1, period: -1 }, options: { background: true } },
        { key: { generatedAt: -1 }, options: { background: true } }
      ],
      emergencyevents: [
        { key: { villageId: 1, status: 1 }, options: { background: true } },
        { key: { eventType: 1, severity: 1 }, options: { background: true } },
        { key: { createdAt: -1 }, options: { background: true } },
        { key: { 'location.coordinates': '2dsphere' }, options: { background: true } }
      ],
      agriculturalproducts: [
        { key: { villageId: 1, category: 1 }, options: { background: true } },
        { key: { status: 1, availability: 1 }, options: { background: true } },
        { key: { price: 1 }, options: { background: true } }
      ],
      notifications: [
        { key: { userId: 1, isRead: 1 }, options: { background: true } },
        { key: { villageId: 1, type: 1 }, options: { background: true } },
        { key: { createdAt: -1 }, options: { background: true } }
      ]
    };
  }

  async createAllIndexes() {
    console.log('🚀 开始创建数据库索引...\n');

    try {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village');
      console.log('✅ 连接数据库成功\n');

      for (const [collectionName, indexes] of Object.entries(this.indexConfigs)) {
        await this.createCollectionIndexes(collectionName, indexes);
      }

      await this.verifyIndexes();
      await this.generateReport();

    } catch (error) {
      console.error('❌ 索引创建失败:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
    }
  }

  async createCollectionIndexes(collectionName, indexes) {
    console.log(`📁 处理集合: ${collectionName}`);

    try {
      // 检查集合是否存在
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionExists = collections.some(c => c.name === collectionName);

      if (!collectionExists) {
        console.log(`  ⚠️  集合 ${collectionName} 不存在，跳过`);
        return;
      }

      const collection = mongoose.connection.db.collection(collectionName);
      const existingIndexes = await collection.listIndexes().toArray();

      let createdCount = 0;

      for (const indexConfig of indexes) {
        const result = await this.createSingleIndex(collection, indexConfig, existingIndexes);
        if (result) {
          createdCount++;
        }
      }

      this.results.push({
        collection: collectionName,
        success: true,
        created: createdCount,
        total: indexes.length
      });

      console.log(`  ✅ 完成: 创建了 ${createdCount}/${indexes.length} 个索引\n`);

    } catch (error) {
      console.error(`  ❌ 失败: ${error.message}\n`);
      this.results.push({
        collection: collectionName,
        success: false,
        error: error.message
      });
    }
  }

  async createSingleIndex(collection, indexConfig, existingIndexes) {
    const { key, options } = indexConfig;

    // 检查索引是否已存在
    const existingIndex = existingIndexes.find(idx => {
      // 简单的键匹配检查
      return JSON.stringify(idx.key) === JSON.stringify(key);
    });

    if (existingIndex) {
      console.log(`    - 索引已存在: ${JSON.stringify(key)}`);
      return false;
    }

    try {
      const result = await collection.createIndex(key, options);
      console.log(`    ✓ 创建索引: ${JSON.stringify(key)} -> ${result}`);
      return true;
    } catch (error) {
      console.error(`    ✗ 创建失败: ${JSON.stringify(key)} - ${error.message}`);
      throw error;
    }
  }

  async verifyIndexes() {
    console.log('🔍 验证索引创建结果...\n');

    for (const [collectionName] of Object.entries(this.indexConfigs)) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const indexes = await collection.listIndexes().toArray();

        console.log(`📊 ${collectionName}: ${indexes.length} 个索引`);

        // 显示每个索引的信息
        indexes.forEach(idx => {
          const status = idx.unique ? '🔐' : '🔑';
          console.log(`  ${status} ${idx.name}: ${JSON.stringify(idx.key)}`);
        });

        console.log('');
      } catch (error) {
        console.error(`❌ 验证 ${collectionName} 失败:`, error.message);
      }
    }
  }

  async generateReport() {
    console.log('📋 生成创建报告...\n');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalCollections: Object.keys(this.indexConfigs).length,
        successCount: this.results.filter(r => r.success).length,
        failCount: this.results.filter(r => !r.success).length,
        totalIndexesCreated: this.results.reduce((sum, r) => sum + (r.created || 0), 0)
      },
      details: this.results,
      recommendations: this.getRecommendations()
    };

    // 保存报告
    const fs = require('fs');
    const reportPath = './index-creation-report.json';

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 详细报告已保存: ${reportPath}`);

    // 打印摘要
    this.printSummary(report);
  }

  getRecommendations() {
    const recommendations = [];

    this.results.forEach(result => {
      if (result.success && result.created < result.total) {
        recommendations.push(
          `部分索引已存在于 ${result.collection}，请检查具体原因`
        );
      }

      if (!result.success) {
        recommendations.push(
          `${result.collection} 索引创建失败，请检查错误: ${result.error}`
        );
      }
    });

    // 通用建议
    recommendations.push('建议在低峰期执行索引创建，避免影响正常业务');
    recommendations.push('创建索引后请测试查询性能，确保优化效果');
    recommendations.push('定期监控索引使用情况，删除未使用的索引');

    return recommendations;
  }

  printSummary(report) {
    console.log('📊 索引创建摘要:');
    console.log(`  总集合数: ${report.summary.totalCollections}`);
    console.log(`  成功创建: ${report.summary.successCount}`);
    console.log(`  创建失败: ${report.summary.failCount}`);
    console.log(`  总索引数: ${report.summary.totalIndexesCreated}\n`);

    if (report.recommendations.length > 0) {
      console.log('💡 优化建议:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const creator = new IndexCreator();

  // 询问用户确认
  console.log('⚠️  即将创建数据库索引，这可能需要一些时间...');
  console.log('⚠️  建议在维护窗口执行此操作\n');

  // 在生产环境中添加确认步骤
  if (process.env.NODE_ENV === 'production') {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('确认继续吗？(y/N): ', (answer) => {
      rl.close();

      if (answer.toLowerCase() === 'y') {
        creator.createAllIndexes()
          .then(() => {
            console.log('\n✅ 索引创建流程完成');
            process.exit(0);
          })
          .catch(error => {
            console.error('\n❌ 索引创建失败:', error);
            process.exit(1);
          });
      } else {
        console.log('操作已取消');
        process.exit(0);
      }
    });
  } else {
    // 开发环境直接执行
    creator.createAllIndexes()
      .then(() => {
        console.log('\n✅ 索引创建流程完成');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ 索引创建失败:', error);
        process.exit(1);
      });
  }
}

module.exports = IndexCreator;