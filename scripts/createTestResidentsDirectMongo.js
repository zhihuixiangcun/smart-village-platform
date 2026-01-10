/**
 * 使用原生MongoDB直接插入测试用户账号
 * 完全绕过Mongoose模型和验证
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// 村庄ID映射
const VILLAGE_MAP = {
  '么扒村': '695d2f0a1993c080b9fa520b',
  '弄洋村': '695da4e954f6af867bebc416',
  '林桃村': '695da4e954f6af867bebc417',
  '者央村': '695da4e954f6af867bebc418'
};

// 测试村民数据
const testResidents = [
  {
    username: 'cengfangguo',
    password: 'Ceng@123456',
    name: '岑方国',
    phone: '13801234567',
    villageName: '么扒村'
  },
  {
    username: 'wangdingquan',
    password: 'Wang@123456',
    name: '王定权',
    phone: '13801234568',
    villageName: '弄洋村'
  },
  {
    username: 'cengxiaoduo',
    password: 'Ceng@123456',
    name: '岑小多',
    phone: '13801234569',
    villageName: '者央村'
  },
  {
    username: 'maoguangqing',
    password: 'Mao@123456',
    name: '毛光情',
    phone: '13801234570',
    villageName: '林桃村'
  }
];

/**
 * 创建测试用户
 */
async function createTestUser(db, residentData) {
  try {
    console.log(`📝 正在创建: ${residentData.name} (${residentData.username})`);

    const collection = db.collection('users');

    // 检查用户名是否已存在
    const existingUser = await collection.findOne({ username: residentData.username });
    if (existingUser) {
      console.log(`   ⚠️  用户名已存在: ${residentData.username}`);
      return { success: true, exists: true, message: '用户名已存在' };
    }

    // 检查手机号是否已存在
    const existingPhone = await collection.findOne({ phone: residentData.phone });
    if (existingPhone) {
      console.log(`   ⚠️  手机号已注册: ${residentData.phone}`);
      return { success: true, exists: true, message: '手机号已注册' };
    }

    // 获取村庄ID
    const villageId = VILLAGE_MAP[residentData.villageName];
    if (!villageId) {
      return { success: false, error: `未找到村庄: ${residentData.villageName}` };
    }

    console.log(`   📍 村庄ID: ${villageId}`);

    // 加密密码
    const hashedPassword = await bcrypt.hash(residentData.password, 10);

    // 创建用户文档(完全模仿现有用户结构)
    const userDoc = {
      username: residentData.username,
      email: `${residentData.phone}@smart-village.temp`,
      phone: residentData.phone, // 顶层phone字段
      password: hashedPassword,
      role: 'resident',
      profile: {
        firstName: residentData.name,
        lastName: '',
        phone: residentData.phone,
        address: residentData.villageName
      },
      villageId: villageId,
      status: 'active',
      account: 'active',
      // 添加所有必需的嵌套对象
      committeeProfile: {
        committeeLevel: 'village',
        dutySchedule: [],
        isOnDuty: false
      },
      faceSettings: {
        enabled: false,
        faceVerified: false
      },
      notificationPreferences: {
        email: true,
        sms: false,
        push: true,
        voice: true,
        categories: {
          announcements: true,
          duties: true,
          emergency: true,
          financial: true
        }
      },
      offlineSettings: {
        enabled: true,
        pendingSync: false
      },
      securitySettings: {
        twoFactorEnabled: false,
        loginNotifications: true,
        sensitiveOperationVerification: 'password'
      },
      voiceSettings: {
        enabled: true,
        dialect: 'mandarin',
        autoPlay: false,
        voiceSpeed: 1,
        voicePitch: 1,
        preferredSpeaker: 'female',
        voiceCommandsEnabled: true
      },
      loginCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    };

    // 直接插入数据库
    const result = await collection.insertOne(userDoc);
    console.log(`   ✅ 用户账号创建成功: ${residentData.username} (ID: ${result.insertedId})`);

    return {
      success: true,
      data: {
        userId: result.insertedId,
        username: residentData.username,
        name: residentData.name,
        villageId: villageId
      }
    };

  } catch (error) {
    console.error(`   ❌ 创建失败:`, error.message);

    // 输出详细的验证错误
    if (error.errInfo && error.errInfo.details) {
      console.error(`   验证错误详情:`, JSON.stringify(error.errInfo.details, null, 2));
    }

    // 检查是否是唯一键冲突
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return { success: true, exists: true, message: `${field} 已存在` };
    }

    return { success: false, error: error.message, details: error.errInfo || error };
  }
}

/**
 * 主函数
 */
async function createTestResidents() {
  console.log('🚀 开始创建测试村民账号...\n');

  let client;

  try {
    // 连接数据库
    console.log('📡 连接数据库...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';
    client = await MongoClient.connect(mongoUri);
    const db = client.db();
    console.log('✅ 数据库连接成功\n');

    const results = [];
    let successCount = 0;

    // 逐个创建
    for (const resident of testResidents) {
      const result = await createTestUser(db, resident);
      results.push({ ...resident, result });

      if (result.success || result.exists) {
        successCount++;
      }

      console.log(''); // 空行分隔
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 创建完成: ${successCount}/${testResidents.length} 个账号`);
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
      console.log(`   村庄: ${resident.villageName}`);

      if (result.exists) {
        console.log(`   状态: 账号已存在`);
      } else if (!result.success) {
        console.log(`   状态: ${result.error || '创建失败'}`);
      } else {
        console.log(`   用户ID: ${result.data.userId}`);
        console.log(`   村庄ID: ${result.data.villageId}`);
      }
      console.log('');
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 保存结果
    const fs = require('fs');
    const resultPath = './test-residents-results.json';
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
    console.log(`💾 结果已保存到: ${resultPath}`);

  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  } finally {
    if (client) {
      await client.close();
    }
    console.log('\n👋 脚本执行完毕');
  }
}

// 执行
createTestResidents();
