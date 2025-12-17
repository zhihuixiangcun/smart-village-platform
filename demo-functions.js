/**
 * 智慧村庄平台功能演示脚本
 * 演示各种API功能和使用方法
 */

const http = require('http');

// 发送HTTP请求的辅助函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 演示函数
async function demonstrateFeatures() {
  console.log('🚀 智慧村庄平台功能演示开始\n');

  let adminToken = null;
  let userToken = null;

  try {
    // 1. 系统健康检查
    console.log('📊 1. 系统健康检查');
    console.log('=' .repeat(50));

    const health = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    });

    console.log('✅ 主API服务状态:', health.data.success ? '正常' : '异常');
    console.log('📋 服务详情:', JSON.stringify(health.data.services, null, 2));
    console.log('');

    // 2. 系统信息获取
    console.log('ℹ️ 2. 系统信息');
    console.log('=' .repeat(50));

    const info = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/info',
      method: 'GET'
    });

    console.log('🌐 系统信息:', JSON.stringify(info.data, null, 2));
    console.log('');

    // 3. 管理员登录演示
    console.log('👑 3. 管理员登录演示');
    console.log('=' .repeat(50));

    const adminLogin = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'admin',
      password: 'admin123'
    });

    if (adminLogin.data.success) {
      adminToken = adminLogin.data.data.token;
      console.log('✅ 管理员登录成功!');
      console.log('👤 用户信息:', adminLogin.data.data.user.profile.name);
      console.log('🔑 角色:', adminLogin.data.data.user.role);
      console.log('🏘️ 管理范围:', adminLogin.data.data.user.village.name);
    }
    console.log('');

    // 4. 村民登录演示
    console.log('👥 4. 村民登录演示');
    console.log('=' .repeat(50));

    const userLogin = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'villager01',
      password: 'user123'
    });

    if (userLogin.data.success) {
      userToken = userLogin.data.data.token;
      console.log('✅ 村民登录成功!');
      console.log('👤 用户信息:', userLogin.data.data.user.profile.name);
      console.log('🔑 角色:', userLogin.data.data.user.role);
      console.log('🏘️ 所属村庄:', userLogin.data.data.user.village.name);
    }
    console.log('');

    // 5. 获取用户信息演示
    if (adminToken) {
      console.log('🔐 5. 获取管理员用户信息');
      console.log('=' .repeat(50));

      const adminProfile = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/auth/profile',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (adminProfile.data.success) {
        console.log('✅ 用户信息获取成功!');
        console.log('📋 详细信息:', JSON.stringify(adminProfile.data.data, null, 2));
      }
      console.log('');
    }

    // 6. 村务公告演示
    console.log('📢 6. 村务公告获取');
    console.log('=' .repeat(50));

    const announcements = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/announcements',
      method: 'GET'
    });

    if (announcements.data.success) {
      console.log('✅ 公告获取成功!');
      announcements.data.data.forEach(announcement => {
        console.log('📝 标题:', announcement.title);
        console.log('📄 内容:', announcement.content);
        console.log('🏷️ 类型:', announcement.type);
        console.log('⏰ 时间:', announcement.timestamp);
        console.log('');
      });
    }

    // 7. 服务列表演示
    console.log('🛠️ 7. 服务列表获取');
    console.log('=' .repeat(50));

    const services = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/services',
      method: 'GET'
    });

    if (services.data.success) {
      console.log('✅ 服务列表获取成功!');
      services.data.data.forEach(service => {
        console.log('🔧 服务名称:', service.name);
        console.log('📊 状态:', service.status === 'active' ? '✅ 运行中' : '❌ 停止');
        console.log('');
      });
    }

    // 8. 系统状态演示
    console.log('📈 8. 系统状态监控');
    console.log('=' .repeat(50));

    const status = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/status',
      method: 'GET'
    });

    if (status.data.success) {
      console.log('✅ 系统状态获取成功!');
      console.log('🟢 状态:', status.data.data.status);
      console.log('⏱️ 运行时间:', Math.floor(status.data.data.uptime / 60), '分钟');
      console.log('🕐 更新时间:', status.data.data.timestamp);
    }

    console.log('\n🎉 功能演示完成!');
    console.log('\n📋 接下来您可以:');
    console.log('1. 访问 http://localhost:3000 体验前端界面');
    console.log('2. 使用管理员账号 (admin/admin123) 登录管理系统');
    console.log('3. 使用村民账号 (villager01/user123) 体验村民功能');
    console.log('4. 测试实时通信和紧急广播功能');

  } catch (error) {
    console.error('❌ 演示过程中出现错误:', error.message);
  }
}

// 运行演示
if (require.main === module) {
  demonstrateFeatures();
}

module.exports = demonstrateFeatures;