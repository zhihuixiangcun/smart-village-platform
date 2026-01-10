/**
 * 智谱AI集成测试脚本
 * 测试智谱AI服务的各项功能
 */

const ZhipuAIService = require('../../src/services/zhipuAIService');
const logger = require('../../src/utils/logger');

// 测试配置
const testConfig = {
  apiKey: '87ea9eec688e4ee38d7b58adf81a3199.E35iML7oTzUy6Aq4',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
  model: 'glm-4.6'
};

async function runTests() {
  console.log('🚀 开始测试智谱AI集成...\n');
  
  const zhipuService = new ZhipuAIService(testConfig);
  let passedTests = 0;
  let totalTests = 0;

  // 测试1: 基础连接测试
  totalTests++;
  console.log('📋 测试1: 基础连接测试');
  try {
    const healthCheck = await zhipuService.healthCheck();
    if (healthCheck.status === 'healthy') {
      console.log('✅ 基础连接测试通过');
      console.log(`   响应时间: ${Date.now() - healthCheck.responseTime}ms`);
      passedTests++;
    } else {
      console.log('❌ 基础连接测试失败:', healthCheck.error);
    }
  } catch (error) {
    console.log('❌ 基础连接测试异常:', error.message);
  }
  console.log('');

  // 测试2: 简单对话测试
  totalTests++;
  console.log('📋 测试2: 简单对话测试');
  try {
    const result = await zhipuService.chat([
      { role: 'user', content: '你好，请简单介绍一下你自己。' }
    ]);
    
    if (result.success && result.content) {
      console.log('✅ 简单对话测试通过');
      console.log(`   AI回复: ${result.content.substring(0, 100)}...`);
      console.log(`   Token使用: ${JSON.stringify(result.usage)}`);
      passedTests++;
    } else {
      console.log('❌ 简单对话测试失败:', result.error);
    }
  } catch (error) {
    console.log('❌ 简单对话测试异常:', error.message);
  }
  console.log('');

  // 测试3: 智慧乡村专用问答测试
  totalTests++;
  console.log('📋 测试3: 智慧乡村专用问答测试');
  try {
    const villageContext = {
      location: '河南省',
      userInfo: { age: 45 }
    };
    
    const result = await zhipuService.villageChat(
      '我想申请农业补贴，需要什么条件？',
      villageContext
    );
    
    if (result.answer && result.provider === 'zhipuai') {
      console.log('✅ 智慧乡村问答测试通过');
      console.log(`   回答长度: ${result.answer.length} 字符`);
      console.log(`   相关话题: ${result.relatedTopics.join(', ')}`);
      console.log(`   信息来源: ${result.source.length > 0 ? result.source.join(', ') : '无'}`);
      passedTests++;
    } else {
      console.log('❌ 智慧乡村问答测试失败');
    }
  } catch (error) {
    console.log('❌ 智慧乡村问答测试异常:', error.message);
  }
  console.log('');

  // 测试4: 农业技术问题测试
  totalTests++;
  console.log('📋 测试4: 农业技术问题测试');
  try {
    const result = await zhipuService.villageChat(
      '玉米苗期发黄是什么原因？怎么防治？',
      { location: '山东省' }
    );
    
    if (result.answer && result.relatedTopics.length > 0) {
      console.log('✅ 农业技术问题测试通过');
      console.log(`   涉及话题: ${result.relatedTopics.join(', ')}`);
      console.log(`   回答片段: ${result.answer.substring(0, 150)}...`);
      passedTests++;
    } else {
      console.log('❌ 农业技术问题测试失败');
    }
  } catch (error) {
    console.log('❌ 农业技术问题测试异常:', error.message);
  }
  console.log('');

  // 测试5: 缓存功能测试
  totalTests++;
  console.log('📋 测试5: 缓存功能测试');
  try {
    const message = '今年小麦价格怎么样？';
    const context = { location: '河北省' };
    
    // 第一次请求
    const result1 = await zhipuService.villageChat(message, context);
    const startTime = Date.now();
    
    // 第二次相同请求（应该从缓存返回）
    const result2 = await zhipuService.villageChat(message, context);
    const endTime = Date.now();
    
    if (result2.cached && (endTime - startTime) < 100) {
      console.log('✅ 缓存功能测试通过');
      console.log(`   缓存响应时间: ${endTime - startTime}ms`);
      passedTests++;
    } else {
      console.log('❌ 缓存功能测试失败');
      console.log(`   是否缓存: ${result2.cached}`);
      console.log(`   响应时间: ${endTime - startTime}ms`);
    }
  } catch (error) {
    console.log('❌ 缓存功能测试异常:', error.message);
  }
  console.log('');

  // 测试6: 错误处理测试
  totalTests++;
  console.log('📋 测试6: 错误处理测试');
  try {
    // 使用错误的API密钥
    const badService = new ZhipuAIService({
      apiKey: 'invalid_key',
      baseURL: testConfig.baseURL,
      model: testConfig.model
    });
    
    const result = await badService.chat([
      { role: 'user', content: '测试消息' }
    ]);
    
    if (!result.success && result.error) {
      console.log('✅ 错误处理测试通过');
      console.log(`   错误信息: ${result.error}`);
      passedTests++;
    } else {
      console.log('❌ 错误处理测试失败');
    }
  } catch (error) {
    console.log('✅ 错误处理测试通过（异常被正确捕获）');
    console.log(`   错误信息: ${error.message}`);
    passedTests++;
  }
  console.log('');

  // 输出测试结果
  console.log('📊 测试结果汇总:');
  console.log(`   通过: ${passedTests}/${totalTests}`);
  console.log(`   成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！智谱AI集成成功！');
  } else {
    console.log('⚠️  部分测试失败，请检查配置和网络连接。');
  }

  // 输出缓存统计
  const cacheStats = zhipuService.getCacheStats();
  console.log('\n💾 缓存统计:');
  console.log(`   缓存键数量: ${cacheStats.keys}`);
  console.log(`   命中次数: ${cacheStats.hits}`);
  console.log(`   未命中次数: ${cacheStats.misses}`);
  console.log(`   命中率: ${cacheStats.hits > 0 ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) : 0}%`);

  process.exit(passedTests === totalTests ? 0 : 1);
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = { runTests };