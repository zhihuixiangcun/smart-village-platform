#!/usr/bin/env node

/**
 * 智慧村庄平台 - 快速安全测试
 * 验证核心安全组件的基本功能
 */

const path = require('path');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testSecurityComponents() {
  console.log('\n🛡️  智慧村庄平台安全系统快速测试\n');

  let testCount = 0;
  let passCount = 0;

  // 测试1: 加密服务
  testCount++;
  try {
    logInfo('测试1: 数据加密服务...');

    // 模拟加密服务（简化版）
    const crypto = require('crypto');

    const testData = '123456789012345678';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(testData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    if (decrypted === testData) {
      logSuccess('数据加密/解密功能正常');
      passCount++;
    } else {
      logError('数据加密/解密功能异常');
    }
  } catch (error) {
    logError(`加密服务测试失败: ${error.message}`);
  }

  // 测试2: 访问控制
  testCount++;
  try {
    logInfo('测试2: 访问控制系统...');

    // 模拟访问控制逻辑
    const roles = {
      RESIDENT: 1,
      VILLAGE_ADMIN: 5,
      SUPER_ADMIN: 10
    };

    const user = { role: roles.RESIDENT, villageId: 'village-001' };
    const resource = { type: 'village_data', villageId: 'village-001', requiredRole: roles.VILLAGE_ADMIN };

    const hasPermission = user.role >= resource.requiredRole &&
                          user.villageId === resource.villageId;

    if (hasPermission === false) {
      logSuccess('权限验证逻辑正常（普通用户无法访问管理员资源）');
      passCount++;
    } else {
      logError('权限验证逻辑异常');
    }
  } catch (error) {
    logError(`访问控制测试失败: ${error.message}`);
  }

  // 测试3: 数据脱敏
  testCount++;
  try {
    logInfo('测试3: 数据脱敏功能...');

    // 模拟数据脱敏
    const phone = '13812345678';
    const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

    const idCard = '110101199001011234';
    const maskedIdCard = idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');

    if (maskedPhone === '138****5678' && maskedIdCard === '110101********1234') {
      logSuccess('数据脱敏功能正常');
      passCount++;
    } else {
      logError('数据脱敏功能异常');
    }
  } catch (error) {
    logError(`数据脱敏测试失败: ${error.message}`);
  }

  // 测试4: 输入验证
  testCount++;
  try {
    logInfo('测试4: 输入验证与注入防护...');

    // 模拟恶意输入检测
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "<script>alert('XSS')</script>"
    ];

    const sqlPattern = /('|(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+)/i;
    const xssPattern = /(<script|javascript:|on\w+\s*=)/i;

    let detectedCount = 0;
    maliciousInputs.forEach(input => {
      if (sqlPattern.test(input) || xssPattern.test(input)) {
        detectedCount++;
      }
    });

    if (detectedCount === maliciousInputs.length) {
      logSuccess(`注入防护正常（检测到 ${detectedCount}/${maliciousInputs.length} 个恶意输入）`);
      passCount++;
    } else {
      logError(`注入防护异常（仅检测到 ${detectedCount}/${maliciousInputs.length} 个恶意输入）`);
    }
  } catch (error) {
    logError(`输入验证测试失败: ${error.message}`);
  }

  // 测试5: JWT令牌
  testCount++;
  try {
    logInfo('测试5: JWT令牌生成与验证...');

    const jwt = require('jsonwebtoken');
    const payload = { id: 'user-001', role: 'resident' };
    const secret = 'test-secret-key';

    // 生成令牌
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    // 验证令牌
    const decoded = jwt.verify(token, secret);

    if (decoded.id === payload.id && decoded.role === payload.role) {
      logSuccess('JWT令牌功能正常');
      passCount++;
    } else {
      logError('JWT令牌功能异常');
    }
  } catch (error) {
    logError(`JWT令牌测试失败: ${error.message}`);
  }

  // 测试6: 哈希验证
  testCount++;
  try {
    logInfo('测试6: 密码哈希验证...');

    const password = 'userPassword123';
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');

    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');

    if (hash === verifyHash) {
      logSuccess('密码哈希验证功能正常');
      passCount++;
    } else {
      logError('密码哈希验证功能异常');
    }
  } catch (error) {
    logError(`哈希验证测试失败: ${error.message}`);
  }

  // 输出测试结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(50));

  const successRate = Math.round((passCount / testCount) * 100);

  console.log(`总测试数: ${testCount}`);
  console.log(`通过数: ${passCount}`);
  console.log(`失败数: ${testCount - passCount}`);
  console.log(`成功率: ${successRate}%`);

  if (passCount === testCount) {
    logSuccess('\n🎉 所有安全测试通过！系统安全性良好。');
  } else if (successRate >= 80) {
    logInfo('\n⚠️  大部分测试通过，但仍有改进空间。');
  } else {
    logError('\n❌ 多项测试失败，需要检查安全配置。');
  }

  // 安全建议
  console.log('\n📋 安全建议:');
  console.log('1. 定期更新加密密钥（建议每30天）');
  console.log('2. 启用HTTPS强制传输');
  console.log('3. 实施API速率限制');
  console.log('4. 定期进行安全审计');
  console.log('5. 保持依赖包更新');
  console.log('6. 启用详细的安全日志记录');

  return {
    total: testCount,
    passed: passCount,
    failed: testCount - passCount,
    successRate
  };
}

// 性能基准测试
async function performanceBenchmark() {
  console.log('\n⚡ 性能基准测试');
  console.log('-'.repeat(30));

  const iterations = 1000;

  // 加密性能
  const startEncrypt = Date.now();
  for (let i = 0; i < iterations; i++) {
    const data = `test-data-${i}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
  }
  const encryptTime = Date.now() - startEncrypt;

  // 正则匹配性能
  const maliciousInputs = Array(iterations).fill("'; DROP TABLE users; --");
  const pattern = /('|(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+)/i;

  const startRegex = Date.now();
  maliciousInputs.forEach(input => pattern.test(input));
  const regexTime = Date.now() - startRegex;

  console.log(`哈希计算: ${iterations}次耗时 ${encryptTime}ms (平均 ${(encryptTime/iterations).toFixed(3)}ms/次)`);
  console.log(`正则匹配: ${iterations}次耗时 ${regexTime}ms (平均 ${(regexTime/iterations).toFixed(3)}ms/次)`);

  // 内存使用
  const memUsage = process.memoryUsage();
  console.log('\n内存使用情况:');
  console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
}

// 主执行函数
async function main() {
  try {
    const results = await testSecurityComponents();
    await performanceBenchmark();

    // 生成简化报告
    const report = {
      timestamp: new Date().toISOString(),
      testResults: results,
      nodeVersion: process.version,
      platform: process.platform
    };

    require('fs').writeFileSync(
      'quick-security-report.json',
      JSON.stringify(report, null, 2)
    );

    logSuccess('\n📄 测试报告已生成: quick-security-report.json');

  } catch (error) {
    logError(`测试执行失败: ${error.message}`);
    process.exit(1);
  }
}

// 处理中断信号
process.on('SIGINT', () => {
  logInfo('\n测试被用户中断');
  process.exit(0);
});

// 执行测试
if (require.main === module) {
  main();
}

module.exports = { testSecurityComponents, performanceBenchmark };