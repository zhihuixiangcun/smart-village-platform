/**
 * 数据库连接和查询性能优化脚本
 * 优化MongoDB连接配置、创建索引、查询优化等
 */

const mongoose = require('mongoose');
const fs = require('fs');

console.log('🗄️ 开始数据库性能优化\n');

// 优化配置
const optimizationConfig = {
  mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_village_platform',
  connectionOptions: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    bufferCommands: false,
    bufferMaxEntries: 0
  }
};

// 优化报告
const optimizationReport = {
  timestamp: new Date().toISOString(),
  connection: {},
  indexes: {},
  queries: {},
  recommendations: [],
  applied: []
};

// 测试数据库连接性能
async function testConnectionPerformance() {
  console.log('🔌 测试数据库连接性能...');
  
  const startTime = Date.now();
  
  try {
    await mongoose.connect(optimizationConfig.mongoUrl, optimizationConfig.connectionOptions);
    
    const connectionTime = Date.now() - startTime;
    
    console.log(`   ✅ 连接成功，耗时: ${connectionTime}ms`);
    
    // 测试ping延迟
    const pingStart = Date.now();
    await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - pingStart;
    
    console.log(`   📡 Ping延迟: ${pingTime}ms`);
    
    // 获取连接池状态
    const connectionStatus = {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
    
    console.log(`   🔗 连接状态: ${getReadyStateText(connectionStatus.readyState)}`);
    console.log(`   🏠 主机: ${connectionStatus.host}:${connectionStatus.port}`);
    console.log(`   📂 数据库: ${connectionStatus.name}`);
    console.log('');
    
    optimizationReport.connection = {
      status: 'success',
      connectionTime,
      pingTime,
      details: connectionStatus
    };
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ 连接失败: ${error.message}`);
    
    optimizationReport.connection = {
      status: 'error',
      error: error.message
    };
    
    return false;
  }
}

// 获取连接状态文本
function getReadyStateText(state) {
  const states = {
    0: '断开连接',
    1: '已连接',
    2: '正在连接',
    3: '正在断开'
  };
  return states[state] || '未知状态';
}

// 分析现有索引
async function analyzeIndexes() {
  console.log('📊 分析现有索引...');
  
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const indexReport = {};
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`   🔍 检查集合: ${collectionName}`);
      
      try {
        const indexes = await mongoose.connection.db.collection(collectionName).indexes();
        const indexStats = await mongoose.connection.db.collection(collectionName).aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        indexReport[collectionName] = {
          indexes: indexes.map(idx => ({
            name: idx.name,
            keys: idx.key,
            unique: idx.unique || false,
            sparse: idx.sparse || false
          })),
          stats: indexStats.map(stat => ({
            name: stat.name,
            accesses: stat.accesses
          }))
        };
        
        console.log(`      索引数量: ${indexes.length}`);
        
        // 检查未使用的索引
        const unusedIndexes = indexStats.filter(stat => 
          stat.accesses.ops === 0 && stat.name !== '_id_'
        );
        
        if (unusedIndexes.length > 0) {
          console.log(`      ⚠️ 未使用索引: ${unusedIndexes.map(idx => idx.name).join(', ')}`);
        }
        
      } catch (error) {
        console.log(`      ❌ 分析失败: ${error.message}`);
        indexReport[collectionName] = { error: error.message };
      }
    }
    
    console.log('');
    
    optimizationReport.indexes = {
      status: 'success',
      collections: indexReport
    };
    
    return indexReport;
    
  } catch (error) {
    console.log(`   ❌ 索引分析失败: ${error.message}`);
    optimizationReport.indexes = { status: 'error', error: error.message };
    return {};
  }
}

// 创建推荐索引
async function createRecommendedIndexes() {
  console.log('⚡ 创建推荐索引...');
  
  // 推荐的索引配置
  const recommendedIndexes = [
    {
      collection: 'users',
      indexes: [
        { keys: { email: 1 }, options: { unique: true } },
        { keys: { phone: 1 }, options: { unique: true } },
        { keys: { villageId: 1, role: 1 }, options: {} },
        { keys: { isActive: 1, createdAt: -1 }, options: {} }
      ]
    },
    {
      collection: 'agriculturalinfos',
      indexes: [
        { keys: { villageId: 1, recordType: 1, createdAt: -1 }, options: {} },
        { keys: { farmerId: 1, 'cropInfo.cropType': 1 }, options: {} },
        { keys: { 'farmlandInfo.plotId': 1 }, options: {} },
        { keys: { 'cropInfo.plantingDate': 1 }, options: {} },
        { keys: { tags: 1 }, options: {} },
        { keys: { status: 1, isPublic: 1 }, options: {} },
        { keys: { verified: 1, verificationDate: -1 }, options: {} }
      ]
    },
    {
      collection: 'announcements',
      indexes: [
        { keys: { villageId: 1, category: 1, publishDate: -1 }, options: {} },
        { keys: { isPublished: 1, publishDate: -1 }, options: {} },
        { keys: { targetAudience: 1, priority: -1 }, options: {} }
      ]
    },
    {
      collection: 'villageVotings',
      indexes: [
        { keys: { villageId: 1, status: 1, createDate: -1 }, options: {} },
        { keys: { votingEndDate: 1 }, options: {} },
        { keys: { 'votes.userId': 1 }, options: {} }
      ]
    },
    {
      collection: 'financialApprovalWorkflows',
      indexes: [
        { keys: { villageId: 1, status: 1, createdAt: -1 }, options: {} },
        { keys: { applicantId: 1, status: 1 }, options: {} },
        { keys: { 'currentStep.assignedTo': 1, status: 1 }, options: {} },
        { keys: { workflowType: 1, amount: -1 }, options: {} }
      ]
    }
  ];
  
  const createdIndexes = [];
  const skippedIndexes = [];
  const failedIndexes = [];
  
  for (const collectionConfig of recommendedIndexes) {
    const collectionName = collectionConfig.collection;
    
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      
      for (const indexConfig of collectionConfig.indexes) {
        try {
          // 检查索引是否已存在
          const existingIndexes = await collection.indexes();
          const indexName = Object.keys(indexConfig.keys).join('_') + '_1';
          
          const exists = existingIndexes.some(idx => 
            JSON.stringify(idx.key) === JSON.stringify(indexConfig.keys)
          );
          
          if (exists) {
            skippedIndexes.push({
              collection: collectionName,
              keys: indexConfig.keys,
              reason: '索引已存在'
            });
            continue;
          }
          
          // 创建索引
          await collection.createIndex(indexConfig.keys, indexConfig.options);
          
          createdIndexes.push({
            collection: collectionName,
            keys: indexConfig.keys,
            options: indexConfig.options
          });
          
          console.log(`   ✅ ${collectionName}: ${JSON.stringify(indexConfig.keys)}`);
          
        } catch (error) {
          failedIndexes.push({
            collection: collectionName,
            keys: indexConfig.keys,
            error: error.message
          });
          
          console.log(`   ❌ ${collectionName}: ${JSON.stringify(indexConfig.keys)} - ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ 集合 ${collectionName} 不存在或无法访问`);
    }
  }
  
  console.log('');
  console.log(`   📊 索引创建结果:`);
  console.log(`      新建: ${createdIndexes.length} 个`);
  console.log(`      跳过: ${skippedIndexes.length} 个`);
  console.log(`      失败: ${failedIndexes.length} 个`);
  console.log('');
  
  optimizationReport.indexes.optimization = {
    created: createdIndexes,
    skipped: skippedIndexes,
    failed: failedIndexes
  };
  
  optimizationReport.applied.push(`创建了 ${createdIndexes.length} 个新索引`);
  
  return {
    created: createdIndexes.length,
    skipped: skippedIndexes.length,
    failed: failedIndexes.length
  };
}

// 优化连接池配置
async function optimizeConnectionPool() {
  console.log('🏊 优化连接池配置...');
  
  const currentConfig = {
    maxPoolSize: mongoose.connection.options.maxPoolSize || 'default',
    minPoolSize: mongoose.connection.options.minPoolSize || 'default',
    maxIdleTimeMS: mongoose.connection.options.maxIdleTimeMS || 'default',
    waitQueueTimeoutMS: mongoose.connection.options.waitQueueTimeoutMS || 'default'
  };
  
  console.log('   📊 当前连接池配置:');
  Object.entries(currentConfig).forEach(([key, value]) => {
    console.log(`      ${key}: ${value}`);
  });
  
  // 推荐的连接池配置
  const recommendedConfig = {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 2500,
    serverSelectionTimeoutMS: 5000
  };
  
  console.log('   💡 推荐连接池配置:');
  Object.entries(recommendedConfig).forEach(([key, value]) => {
    console.log(`      ${key}: ${value}`);
  });
  
  optimizationReport.connection.poolOptimization = {
    current: currentConfig,
    recommended: recommendedConfig
  };
  
  optimizationReport.recommendations.push('根据推荐配置更新连接池设置');
  
  console.log('');
  
  return recommendedConfig;
}

// 查询性能分析
async function analyzeQueryPerformance() {
  console.log('🔍 分析查询性能...');
  
  try {
    // 启用查询分析器（如果支持）
    const queryAnalysis = {};
    
    // 分析慢查询（简化版）
    const collections = ['users', 'agriculturalinfos', 'announcements'];
    
    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        
        // 测试简单查询性能
        const startTime = Date.now();
        const count = await collection.countDocuments({});
        const queryTime = Date.now() - startTime;
        
        queryAnalysis[collectionName] = {
          documentCount: count,
          simpleQueryTime: queryTime,
          performanceLevel: queryTime < 100 ? 'excellent' : 
                          queryTime < 500 ? 'good' : 
                          queryTime < 1000 ? 'acceptable' : 'poor'
        };
        
        console.log(`   📊 ${collectionName}:`);
        console.log(`      文档数量: ${count.toLocaleString()}`);
        console.log(`      查询时间: ${queryTime}ms (${queryAnalysis[collectionName].performanceLevel})`);
        
      } catch (error) {
        queryAnalysis[collectionName] = {
          error: error.message
        };
      }
    }
    
    console.log('');
    
    optimizationReport.queries = {
      status: 'success',
      analysis: queryAnalysis
    };
    
    // 生成查询优化建议
    Object.entries(queryAnalysis).forEach(([collection, analysis]) => {
      if (analysis.performanceLevel === 'poor') {
        optimizationReport.recommendations.push(`${collection} 集合查询性能较差，考虑添加索引或分页`);
      }
    });
    
    return queryAnalysis;
    
  } catch (error) {
    console.log(`   ❌ 查询性能分析失败: ${error.message}`);
    optimizationReport.queries = { status: 'error', error: error.message };
    return {};
  }
}

// 生成优化建议
function generateOptimizationRecommendations() {
  console.log('💡 生成优化建议...');
  
  const recommendations = [
    '定期清理未使用的索引以节省存储空间',
    '为高频查询字段创建复合索引',
    '使用分页查询避免大量数据传输',
    '启用查询计划缓存提高重复查询性能',
    '考虑使用聚合管道优化复杂查询',
    '定期监控慢查询日志并优化',
    '为生产环境配置适当的读写关注点',
    '使用连接池减少连接开销'
  ];
  
  recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
  
  optimizationReport.recommendations.push(...recommendations);
  
  console.log('');
  
  return recommendations;
}

// 生成优化报告
function generateOptimizationReport() {
  console.log('='.repeat(70));
  console.log('🗄️ 数据库性能优化报告');
  console.log('='.repeat(70));
  
  console.log('📊 连接性能:');
  if (optimizationReport.connection.status === 'success') {
    console.log(`   连接时间: ${optimizationReport.connection.connectionTime}ms`);
    console.log(`   Ping延迟: ${optimizationReport.connection.pingTime}ms`);
    console.log(`   连接状态: ${getReadyStateText(optimizationReport.connection.details.readyState)}`);
  } else {
    console.log(`   ❌ 连接失败: ${optimizationReport.connection.error}`);
  }
  console.log('');
  
  if (optimizationReport.indexes.optimization) {
    console.log('⚡ 索引优化结果:');
    const opt = optimizationReport.indexes.optimization;
    console.log(`   新建索引: ${opt.created.length} 个`);
    console.log(`   跳过索引: ${opt.skipped.length} 个`);
    console.log(`   失败索引: ${opt.failed.length} 个`);
    console.log('');
  }
  
  if (optimizationReport.queries.status === 'success') {
    console.log('🔍 查询性能分析:');
    Object.entries(optimizationReport.queries.analysis).forEach(([collection, analysis]) => {
      if (!analysis.error) {
        console.log(`   ${collection}: ${analysis.documentCount.toLocaleString()} 文档, ${analysis.simpleQueryTime}ms (${analysis.performanceLevel})`);
      }
    });
    console.log('');
  }
  
  if (optimizationReport.applied.length > 0) {
    console.log('✅ 应用的优化:');
    optimizationReport.applied.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item}`);
    });
    console.log('');
  }
  
  if (optimizationReport.recommendations.length > 0) {
    console.log('💡 优化建议:');
    optimizationReport.recommendations.slice(0, 10).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log('');
  }
  
  console.log(`⏰ 优化时间: ${new Date().toLocaleString()}`);
  console.log('='.repeat(70));
  
  // 保存优化报告
  try {
    const reportFile = `logs/db-optimization-report-${new Date().toISOString().slice(0, 10)}.json`;
    
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(optimizationReport, null, 2));
    console.log(`📁 详细报告已保存至: ${reportFile}`);
    
  } catch (error) {
    console.log('❌ 保存报告失败:', error.message);
  }
}

// 运行完整的数据库优化
async function runDatabaseOptimization() {
  try {
    console.log('🚀 启动数据库性能优化...\n');
    
    // 测试连接性能
    const connected = await testConnectionPerformance();
    
    if (!connected) {
      console.log('❌ 数据库连接失败，无法继续优化');
      process.exit(1);
    }
    
    // 分析现有索引
    await analyzeIndexes();
    
    // 创建推荐索引
    await createRecommendedIndexes();
    
    // 优化连接池配置
    await optimizeConnectionPool();
    
    // 分析查询性能
    await analyzeQueryPerformance();
    
    // 生成优化建议
    generateOptimizationRecommendations();
    
    // 生成最终报告
    generateOptimizationReport();
    
    // 关闭数据库连接
    await mongoose.connection.close();
    
    console.log('✅ 数据库优化完成');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 数据库优化失败:', error.message);
    console.error(error.stack);
    
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      // 忽略关闭错误
    }
    
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runDatabaseOptimization();
}

module.exports = {
  runDatabaseOptimization,
  testConnectionPerformance,
  analyzeIndexes,
  createRecommendedIndexes,
  optimizeConnectionPool,
  analyzeQueryPerformance
};