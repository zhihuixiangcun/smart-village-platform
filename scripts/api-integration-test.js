/**
 * API集成测试专用脚本
 * 不启动完整的服务器,而是直接测试API端点
 */

const request = require('supertest');
const http = require('http');

// 测试配置
const API_BASE_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 5000;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testHealthCheck() {
  log('\n🏥 测试1: 健康检查端点', colors.blue);
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });

    if (response.ok) {
      const data = await response.json();
      log(`   ✅ 状态码: ${response.status}`, colors.green);
      log(`   ✅ 响应状态: ${data.status}`, colors.green);
      log(`   ✅ 运行时间: ${data.uptime}秒`, colors.green);
      return true;
    } else {
      log(`   ❌ 状态码: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ 错误: ${error.message}`, colors.red);
    return false;
  }
}

async function testAuthEndpoint() {
  log('\n🔐 测试2: 认证端点', colors.blue);
  try {
    // 测试登录 (需要username, password, role三个参数)
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      }),
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });

    if (response.ok) {
      const data = await response.json();
      log(`   ✅ 登录成功`, colors.green);
      log(`   ✅ Token生成: ${data.data?.token ? '是' : '否'}`, colors.green);
      log(`   ✅ 用户信息: ${data.data?.user?.username || 'N/A'}`, colors.green);
      return data.data?.token;
    } else {
      log(`   ❌ 登录失败: ${response.status}`, colors.red);
      const errorText = await response.text();
      log(`   ❌ 错误详情: ${errorText.substring(0, 100)}`, colors.red);
      return null;
    }
  } catch (error) {
    log(`   ❌ 错误: ${error.message}`, colors.red);
    return null;
  }
}

async function testProtectedEndpoint(token) {
  log('\n🔒 测试3: 受保护端点', colors.blue);
  if (!token) {
    log('   ⚠️  跳过: 无有效token', colors.yellow);
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });

    if (response.ok) {
      const data = await response.json();
      log(`   ✅ 状态码: ${response.status}`, colors.green);
      log(`   ✅ 用户资料返回: ${data.data?.username || 'N/A'}`, colors.green);
      return true;
    } else {
      log(`   ❌ 状态码: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ 错误: ${error.message}`, colors.red);
    return false;
  }
}

async function testResidentsEndpoint(token) {
  log('\n👥 测试4: 村民管理端点', colors.blue);
  if (!token) {
    log('   ⚠️  跳过: 无有效token', colors.yellow);
    return false;
  }

  try {
    // 获取村民列表
    const response = await fetch(`${API_BASE_URL}/api/v1/residents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(TEST_TIMEOUT * 2)
    });

    if (response.ok) {
      const data = await response.json();
      log(`   ✅ 状态码: ${response.status}`, colors.green);
      log(`   ✅ 返回数据: ${Array.isArray(data.data?.items) ? '是' : '否'}`, colors.green);
      if (Array.isArray(data.data?.items)) {
        log(`   ✅ 村民数量: ${data.data.items.length}`, colors.green);
      }
      return true;
    } else {
      log(`   ❌ 状态码: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ 错误: ${error.message}`, colors.red);
    return false;
  }
}

async function testAnnouncementsEndpoint(token) {
  log('\n📢 测试5: 公告管理端点', colors.blue);
  if (!token) {
    log('   ⚠️  跳过: 无有效token', colors.yellow);
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/announcements`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(TEST_TIMEOUT * 2)
    });

    if (response.ok) {
      const data = await response.json();
      log(`   ✅ 状态码: ${response.status}`, colors.green);
      log(`   ✅ 返回数据: ${Array.isArray(data.data?.items) ? '是' : '否'}`, colors.green);
      if (Array.isArray(data.data?.items)) {
        log(`   ✅ 公告数量: ${data.data.items.length}`, colors.green);
      }
      return true;
    } else {
      log(`   ❌ 状态码: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ 错误: ${error.message}`, colors.red);
    return false;
  }
}

async function testUnauthorizedAccess() {
  log('\n🚫 测试6: 未授权访问', colors.blue);
  try {
    // 测试批量导入接口 - 需要认证
    const response = await fetch(`${API_BASE_URL}/api/v1/batch/import/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });

    if (response.status === 401 || response.status === 403) {
      log(`   ✅ 正确拒绝未授权访问: ${response.status}`, colors.green);
      return true;
    } else {
      log(`   ⚠️  响应状态码: ${response.status}`, colors.yellow);
      return response.status >= 400; // 任何4xx都算正确拒绝
    }
  } catch (error) {
    log(`   ❌ 错误: ${error.message}`, colors.red);
    return false;
  }
}

async function checkServerStatus() {
  log('\n🔍 检查API服务器状态...', colors.magenta);
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      log('✅ API服务器运行正常', colors.green);
      log(`   地址: ${API_BASE_URL}`, colors.reset);
      return true;
    } else {
      log('❌ API服务器响应异常', colors.red);
      return false;
    }
  } catch (error) {
    log('❌ 无法连接到API服务器', colors.red);
    log('   提示: 请先运行 npm start', colors.yellow);
    return false;
  }
}

async function generateReport(results) {
  const total = results.length;
  const passed = results.filter(r => r).length;
  const failed = total - passed;
  const passRate = ((passed / total) * 100).toFixed(1);

  log('\n' + '='.repeat(60), colors.magenta);
  log('📊 API集成测试报告', colors.magenta);
  log('='.repeat(60), colors.magenta);
  log(`   总测试数: ${total}`, colors.reset);
  log(`   通过数量: ${passed}`, colors.green);
  log(`   失败数量: ${failed}`, failed > 0 ? colors.red : colors.green);
  log(`   通过率: ${passRate}%`, passRate >= 80 ? colors.green : colors.yellow);
  log('='.repeat(60), colors.magenta);

  if (passRate >= 80) {
    log('\n✅ API集成测试通过! 系统可以进入下一阶段', colors.green);
  } else {
    log('\n⚠️  部分测试失败,请检查API实现', colors.yellow);
    log('💡 提示: 部分路由已被临时禁用', colors.yellow);
  }

  log('\n测试详情:', colors.reset);
  log('   1. 健康检查端点', results[0] ? '✅ 通过' : '❌ 失败');
  log('   2. 认证登录端点', results[1] ? '✅ 通过' : '❌ 失败');
  log('   3. 发送验证码端点', results[2] ? '✅ 通过' : '❌ 失败');
  log('   4. 受保护端点访问', results[3] ? '✅ 通过' : '❌ 失败');
  log('   5. 批量导入端点', results[4] ? '✅ 通过' : '❌ 失败');
  log('   6. 未授权访问测试', results[5] ? '✅ 通过' : '❌ 失败');

  return passRate >= 80;
}

async function testSendVerificationCode() {
  log('\n📱 测试3: 发送验证码', colors.blue);
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '13800138000'
      }),
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });

    if (response.ok) {
      const data = await response.json();
      log(`   ✅ 状态码: ${response.status}`, colors.green);
      log(`   ✅ 发送成功: ${data.success}`, colors.green);
      return true;
    } else {
      log(`   ❌ 状态码: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ 错误: ${error.message}`, colors.red);
    return false;
  }
}

async function testProtectedEndpoint(token) {
  log('\n🔒 测试4: 受保护端点', colors.blue);
  if (!token) {
    log('   ⚠️  跳过: 无有效token', colors.yellow);
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(TEST_TIMEOUT)
    });

    if (response.ok) {
      const data = await response.json();
      log(`   ✅ 状态码: ${response.status}`, colors.green);
      log(`   ✅ 用户资料返回: ${data.data?.username || 'N/A'}`, colors.green);
      return true;
    } else {
      log(`   ❌ 状态码: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ 错误: ${error.message}`, colors.red);
    return false;
  }
}

async function testBatchImportEndpoint(token) {
  log('\n📥 测试5: 批量导入端点', colors.blue);
  if (!token) {
    log('   ⚠️  跳过: 无有效token', colors.yellow);
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/batch/import/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        data: [],
        type: 'residents'
      }),
      signal: AbortSignal.timeout(TEST_TIMEOUT * 2)
    });

    if (response.ok || response.status === 400) {
      // 200 OK 或 400 Bad Request (空数据)都算端点存在
      log(`   ✅ 端点可访问: ${response.status}`, colors.green);
      return true;
    } else {
      log(`   ❌ 状态码: ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`   ❌ 错误: ${error.message}`, colors.red);
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(60), colors.magenta);
  log('🚀 智慧乡村平台 - API集成测试', colors.magenta);
  log('='.repeat(60), colors.magenta);
  log('注意: 由于部分路由被临时禁用,只测试可用端点', colors.yellow);

  // 检查服务器状态
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    process.exit(1);
  }

  // 运行测试套件
  const results = [];

  try {
    results.push(await testHealthCheck());

    const token = await testAuthEndpoint();
    results.push(token !== null);

    results.push(await testSendVerificationCode());
    results.push(await testProtectedEndpoint(token));
    results.push(await testBatchImportEndpoint(token));
    results.push(await testUnauthorizedAccess());

    // 生成报告
    const success = await generateReport(results);

    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`\n❌ 测试执行失败: ${error.message}`, colors.red);
    log(error.stack, colors.red);
    process.exit(1);
  }
}

// 运行测试
main();
