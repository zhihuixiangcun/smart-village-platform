/**
 * 通过注册API创建测试村民账号
 * 实现两步注册流程：1. 获取验证码 2. 使用验证码注册
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const SMS_ENDPOINT = `${API_BASE}/api/v1/auth/send-code`;
const AUTH_ENDPOINT = `${API_BASE}/api/v1/auth/register`;

// 测试村民数据
const testResidents = [
  {
    username: 'cengfangguo',
    password: 'Ceng@123456',
    name: '岑方国',
    phone: '13801234567',
    idCard: '522633198503151234',
    role: 'resident',
    email: 'cengfangguo@example.com'
  },
  {
    username: 'wangdingquan',
    password: 'Wang@123456',
    name: '王定权',
    phone: '13801234568',
    idCard: '522633197808201235',
    role: 'resident',
    email: 'wangdingquan@example.com'
  },
  {
    username: 'cengxiaoduo',
    password: 'Ceng@123456',
    name: '岑小多',
    phone: '13801234569',
    idCard: '522633199512105678',
    role: 'resident',
    email: 'cengxiaoduo@example.com'
  },
  {
    username: 'maoguangqing',
    password: 'Mao@123456',
    name: '毛光情',
    phone: '13801234570',
    idCard: '522633198807254567',
    role: 'resident',
    email: 'maoguangqing@example.com'
  }
];

/**
 * 发送验证码
 */
async function sendVerificationCode(phone) {
  try {
    console.log(`   📱 发送验证码到: ${phone}`);

    const response = await axios.post(SMS_ENDPOINT, { phone }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (response.data.success) {
      const code = response.data.code;
      console.log(`   ✅ 验证码已发送: ${code}`);
      return { success: true, code };
    } else {
      console.log(`   ❌ 验证码发送失败: ${response.data.error}`);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    console.log(`   ❌ 验证码发送失败: ${error.response?.data?.error || error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 注册用户（包含验证码）
 */
async function registerUser(userData) {
  try {
    console.log(`📝 正在注册用户: ${userData.name} (${userData.username})`);

    // 步骤1: 发送验证码
    const smsResult = await sendVerificationCode(userData.phone);
    if (!smsResult.success) {
      return { success: false, error: `获取验证码失败: ${smsResult.error}` };
    }

    const verifyCode = smsResult.code;

    // 等待500ms确保验证码已处理
    await new Promise(resolve => setTimeout(resolve, 500));

    // 步骤2: 使用验证码注册
    const registerData = {
      phone: userData.phone,
      verifyCode: verifyCode, // 必需：验证码
      username: userData.username,
      password: userData.password,
      role: userData.role
      // 注意：不需要 name, idCard, email 字段
      // controller会自动生成email: ${phone}@smart-village.temp
      // firstName设置为username
    };

    console.log(`   📤 提交注册请求...`);
    console.log(`   参数: username=${registerData.username}, phone=${registerData.phone}, role=${registerData.role}, verifyCode=${verifyCode}`);

    const response = await axios.post(AUTH_ENDPOINT, registerData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.success) {
      console.log(`✅ 注册成功: ${userData.name}`);
      console.log(`   用户ID: ${response.data.data.user?._id || response.data.data.id}`);
      console.log(`   Token: ${response.data.data.token?.substring(0, 20)}...`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ 注册失败: ${userData.name}`);
      console.log(`   错误: ${response.data.error || response.data.message}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log(`❌ 注册失败: ${userData.name}`);
    console.log(`   HTTP状态: ${error.response?.status}`);
    console.log(`   完整错误响应:`, JSON.stringify(error.response?.data, null, 2));

    // 检查是否是用户已存在错误
    if (error.response?.data?.error?.includes('已存在') ||
        error.response?.data?.error?.includes('already exists') ||
        error.response?.data?.error?.includes('用户名已存在') ||
        error.response?.data?.error?.includes('手机号已注册')) {
      return { success: true, exists: true }; // 用户已存在也算成功
    }

    return { success: false, error: error.response?.data || error.message };
  }
}

async function createTestResidents() {
  console.log('🚀 开始通过API注册测试村民账号...\n');
  console.log(`📡 API地址: ${AUTH_ENDPOINT}\n`);

  let successCount = 0;
  const results = [];

  for (const resident of testResidents) {
    const result = await registerUser(resident);
    results.push({ ...resident, result });

    if (result.success || result.exists) {
      successCount++;
    }

    console.log(''); // 空行分隔
    await new Promise(resolve => setTimeout(resolve, 500)); // 延迟500ms避免请求过快
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 注册完成: ${successCount}/${testResidents.length} 个账号`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 测试账号汇总:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  testResidents.forEach((resident, index) => {
    const result = results[index];
    const status = result.success ? '✅' : result.exists ? '⚠️' : '❌';

    console.log(`${index + 1}. ${status} ${resident.name}`);
    console.log(`   用户名: ${resident.username}`);
    console.log(`   密码: ${resident.password}`);
    console.log(`   电话: ${resident.phone}`);
    console.log(`   身份证: ${resident.idCard}`);
    if (result.exists) {
      console.log(`   状态: 用户已存在`);
    } else if (!result.success) {
      console.log(`   状态: ${result.error || '注册失败'}`);
    }
    console.log('');
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 保存结果到文件
  const fs = require('fs');
  const resultPath = './test-residents-results.json';
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log(`💾 注册结果已保存到: ${resultPath}`);
}

// 执行注册
createTestResidents().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
