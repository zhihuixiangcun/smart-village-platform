/**
 * 语音识别服务使用示例
 * 演示如何使用语音识别服务进行方言识别
 */

const VoiceRecognitionService = require('./voiceRecognition');

// 创建服务实例
const voiceRecognition = new VoiceRecognitionService();

/**
 * 示例1：基本语音识别
 */
async function example1() {
  console.log('=== 示例1：基本语音识别 ===');

  try {
    // 使用音频文件路径
    const audioFilePath = './test-audio.wav';

    // 识别音频（默认普通话）
    const result = await voiceRecognition.speechToText(audioFilePath, {
      userId: 'user123'
    });

    if (result.success) {
      console.log('识别结果:', result.text);
      console.log('方言:', result.dialect);
      console.log('置信度:', result.confidence);
    } else {
      console.error('识别失败:', result.error);
    }
  } catch (error) {
    console.error('发生错误:', error);
  }

  console.log('\n');
}

/**
 * 示例2：指定方言识别
 */
async function example2() {
  console.log('=== 示例2：指定方言识别 ===');

  try {
    const audioFilePath = './cantonese-audio.wav';

    // 指定粤语识别
    const result = await voiceRecognition.speechToText(audioFilePath, {
      dialect: 'cantonese',
      userId: 'user456'
    });

    if (result.success) {
      console.log('粤语识别结果:', result.text);
    } else {
      console.error('粤语识别失败:', result.error);
    }
  } catch (error) {
    console.error('发生错误:', error);
  }

  console.log('\n');
}

/**
 * 示例3：使用音频Buffer识别
 */
async function example3() {
  console.log('=== 示例3：使用音频Buffer识别 ===');

  try {
    const fs = require('fs');

    // 读取音频数据
    const audioBuffer = fs.readFileSync('./test-audio.wav');

    // 直接使用Buffer识别
    const result = await voiceRecognition.speechToText(audioBuffer, {
      dialect: 'mandarin',
      userId: 'user789'
    });

    if (result.success) {
      console.log('识别结果:', result.text);
    } else {
      console.error('识别失败:', result.error);
    }
  } catch (error) {
    console.error('发生错误:', error);
  }

  console.log('\n');
}

/**
 * 示例4：获取支持的方言列表
 */
async function example4() {
  console.log('=== 示例4：获取支持的方言列表 ===');

  const dialects = voiceRecognition.getSupportedDialects();

  console.log(`支持的方言数量: ${dialects.length}`);
  console.log('方言列表:');
  dialects.forEach((dialect, index) => {
    console.log(`${index + 1}. ${dialect.name} (${dialect.key})`);
  });

  console.log('\n');
}

/**
 * 示例5：查看服务统计信息
 */
async function example5() {
  console.log('=== 示例5：查看服务统计信息 ===');

  const stats = voiceRecognition.getStats();

  console.log('总请求数:', stats.totalRequests);
  console.log('成功请求数:', stats.successfulRequests);
  console.log('失败请求数:', stats.failedRequests);
  console.log('重试次数:', stats.retryCount);
  console.log('成功率:', stats.successRate);
  console.log('平均重试次数:', stats.averageRetries);
  console.log('\n方言使用统计:');
  console.log(stats.dialectUsage);

  console.log('\n');
}

/**
 * 示例6：健康检查
 */
async function example6() {
  console.log('=== 示例6：健康检查 ===');

  const health = await voiceRecognition.healthCheck();

  if (health.status === 'healthy') {
    console.log('服务状态: 健康');
    console.log('消息:', health.message);
    console.log('配置信息:', health.config);
  } else {
    console.error('服务状态: 异常');
    console.error('错误:', health.message);
  }

  console.log('\n');
}

/**
 * 示例7：清理临时文件
 */
async function example7() {
  console.log('=== 示例7：清理临时文件 ===');

  const result = await voiceRecognition.cleanupTempFiles();

  if (result.success) {
    console.log('清理成功');
    console.log('删除的文件数量:', result.deletedCount);
  } else {
    console.error('清理失败:', result.error);
  }

  console.log('\n');
}

/**
 * 示例8：批量识别（模拟）
 */
async function example8() {
  console.log('=== 示例8：批量识别 ===');

  const audioFiles = [
    './audio1.wav',
    './audio2.wav',
    './audio3.wav'
  ];

  const results = [];

  for (const file of audioFiles) {
    console.log(`正在识别: ${file}`);

    const result = await voiceRecognition.speechToText(file, {
      dialect: 'mandarin',
      userId: 'batch_user'
    });

    results.push({
      file,
      success: result.success,
      text: result.success ? result.text : result.error
    });
  }

  console.log('\n批量识别结果:');
  results.forEach((item, index) => {
    console.log(`${index + 1}. ${item.file}`);
    console.log(`   状态: ${item.success ? '成功' : '失败'}`);
    console.log(`   结果: ${item.text}`);
  });

  console.log('\n');
}

/**
 * 示例9：错误处理和重试演示
 */
async function example9() {
  console.log('=== 示例9：错误处理和重试演示 ===');

  try {
    // 尝试识别不存在的文件
    const result = await voiceRecognition.speechToText('./nonexistent.wav', {
      userId: 'error_test'
    });

    if (result.success) {
      console.log('识别成功');
    } else {
      console.log('识别失败:', result.error);
      console.log('失败原因已捕获，可以继续执行其他操作');
    }

    // 查看重试统计
    const stats = voiceRecognition.getStats();
    console.log('总重试次数:', stats.retryCount);

  } catch (error) {
    console.error('未捕获的错误:', error);
  }

  console.log('\n');
}

/**
 * 示例10：使用不同方言识别
 */
async function example10() {
  console.log('=== 示例10：使用不同方言识别 ===');

  const testCases = [
    { dialect: 'mandarin', name: '普通话' },
    { dialect: 'cantonese', name: '粤语' },
    { dialect: 'sichuanese', name: '四川话' },
    { dialect: 'hakka', name: '客家话' }
  ];

  const testAudio = './test-audio.wav';

  for (const testCase of testCases) {
    console.log(`测试${testCase.name}识别...`);

    const result = await voiceRecognition.speechToText(testAudio, {
      dialect: testCase.dialect,
      userId: 'dialect_test'
    });

    if (result.success) {
      console.log(`${testCase.name}识别成功:`, result.text);
    } else {
      console.log(`${testCase.name}识别失败:`, result.error);
    }
  }

  console.log('\n');
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('========================================');
  console.log('  语音识别服务使用示例');
  console.log('========================================\n');

  // 示例4（获取方言列表）不需要API配置
  await example4();

  // 示例6（健康检查）
  await example6();

  // 其他示例需要音频文件，注释掉以避免错误
  // await example1();
  // await example2();
  // await example3();
  // await example5();
  // await example7();
  // await example8();
  // await example9();
  // await example10();

  console.log('========================================');
  console.log('  示例运行完成');
  console.log('========================================');
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples().catch(console.error);
}

module.exports = {
  runAllExamples,
  example1,
  example2,
  example3,
  example4,
  example5,
  example6,
  example7,
  example8,
  example9,
  example10
};
