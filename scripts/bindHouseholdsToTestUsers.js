/**
 * 为测试账号绑定家庭ID
 * 为4个测试村民账号创建对应的家庭档案
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// 测试账号映射
const testUsers = [
  {
    username: 'cengfangguo',
    name: '岑方国',
    phone: '13801234567',
    villageId: '695d2f0a1993c080b9fa520b', // 么扒村
    villageName: '么扒村',
    userId: '695e825d4769790a904c977e'
  },
  {
    username: 'wangdingquan',
    name: '王定权',
    phone: '13801234568',
    villageId: '695da4e954f6af867bebc416', // 弄洋村
    villageName: '弄洋村',
    userId: '695e825e4769790a904c977f'
  },
  {
    username: 'cengxiaoduo',
    name: '岑小多',
    phone: '13801234569',
    villageId: '695da4e954f6af867bebc418', // 者央村
    villageName: '者央村',
    userId: '695e825e4769790a904c9780'
  },
  {
    username: 'maoguangqing',
    name: '毛光情',
    phone: '13801234570',
    villageId: '695da4e954f6af867bebc417', // 林桃村
    villageName: '林桃村',
    userId: '695e825e4769790a904c9781'
  }
];

/**
 * 生成户码
 * 格式: XXXXXXHXXXXX
 * 例如: ABC123H0001A
 */
function generateHouseholdCode(villageName, index) {
  // 村庄拼音缩写（前6位）
  const villageMap = {
    '么扒村': 'MBAC01',
    '弄洋村': 'NYBC02',
    '者央村': 'ZYBC03',
    '林桃村': 'LTBC04'
  };

  const prefix = villageMap[villageName] || 'TEST01';
  const suffix = String(index).padStart(4, '0');
  const checksum = ['A', 'B', 'C', 'D', 'E', 'F'][index % 6];

  return `${prefix}H${suffix}${checksum}`;
}

/**
 * 创建家庭档案
 */
async function createHousehold(db, userData) {
  try {
    console.log(`📝 正在创建家庭: ${userData.name}`);

    const collection = db.collection('households');

    // 检查是否已存在家庭
    const existingHousehold = await collection.findOne({
      'householder.userId': new ObjectId(userData.userId)
    });

    if (existingHousehold) {
      console.log(`   ⚠️  家庭已存在: ${existingHousehold.codeId}`);
      return {
        success: true,
        exists: true,
        householdId: existingHousehold._id,
        codeId: existingHousehold.codeId
      };
    }

    // 生成户码
    const codeId = generateHouseholdCode(userData.villageName,
      testUsers.findIndex(u => u.username === userData.username) + 1);

    console.log(`   📍 户码: ${codeId}`);

    // 创建家庭文档
    const householdDoc = {
      codeId: codeId,
      villageId: userData.villageId,

      // 户主信息
      householder: {
        userId: new ObjectId(userData.userId),
        name: userData.name,
        idCard: `522633${1985 + testUsers.indexOf(userData) * 5}0101000${Math.floor(Math.random() * 1000)}`, // 模拟身份证号
        phone: userData.phone,
        isPartyMember: false,
        occupation: '村民'
      },

      // 家庭成员（初始只有户主）
      members: [
        {
          userId: new ObjectId(userData.userId),
          name: userData.name,
          idCard: `522633${1985 + testUsers.indexOf(userData) * 5}0101000${Math.floor(Math.random() * 1000)}`,
          relationship: '本人',
          relationshipType: 'self',
          gender: testUsers.indexOf(userData) % 2 === 0 ? 'male' : 'female',
          birthDate: new Date(`${1985 + testUsers.indexOf(userData) * 5}-01-01`),
          phone: userData.phone,
          education: '初中',
          isHead: true,
          residenceStatus: '在村',
          isInVillage: true
        }
      ],

      // 地址信息
      address: {
        province: '贵州省',
        city: '黔西南布依族苗族自治州',
        district: '贞丰县',
        town: '鲁贡镇',
        village: userData.villageName,
        detailAddress: `${userData.villageName}1组`,
        fullAddress: `贵州省黔西南布依族苗族自治州贞丰县鲁贡镇${userData.villageName}1组`
      },

      // 家庭类型
      householdType: {
        type: '一般户',
        isPoor: false,
        isKeyProtected: false,
        isSingleChild: false,
        isLeftBehind: false
      },

      // 住房信息
      housing: {
        type: '自建房',
        area: 120,
        buildYear: 2010,
        floors: 2,
        rooms: 4,
        isDangerous: false,
        hasToilet: true,
        hasKitchen: true
      },

      // 土地信息
      land: {
        cultivatedArea: 5, // 耕地面积（亩）
        forestArea: 2,     // 林地面积（亩）
        homesteadArea: 100 // 宅基地面积（平方米）
      },

      // 人口统计
      demographics: {
        totalMembers: 1,
        membersInVillage: 1,
        membersWorkingOutside: 0,
        averageAge: 35,
        elderlyCount: 0,
        childCount: 0
      },

      // 经济状况
      economics: {
        annualIncome: 5, // 年收入（万元）
        incomeSource: '农业+务工',
        hasDebt: false,
        povertyStatus: '非贫困户'
      },

      // 二维码信息
      qrCode: {
        codeId: codeId,
        imageUrl: null, // 稍后生成
        generatedAt: new Date(),
        expiryDate: null, // 永久有效
        status: 'active',
        printCount: 0,
        scanCount: 0
      },

      // 标签
      tags: [
        { name: '普通家庭', color: 'primary' }
      ],

      // 特殊标记
      specialFlags: {
        needsRegularVisit: false,
        priorityHelp: false,
        riskLevel: '低'
      },

      // 状态
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    };

    // 插入数据库
    const result = await collection.insertOne(householdDoc);
    console.log(`   ✅ 家庭创建成功: ${codeId} (ID: ${result.insertedId})`);

    return {
      success: true,
      householdId: result.insertedId,
      codeId: codeId
    };

  } catch (error) {
    console.error(`   ❌ 创建失败:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 更新用户账号，绑定家庭ID
 */
async function bindHouseholdToUser(db, userId, householdId, codeId) {
  try {
    console.log(`🔗 绑定用户到家庭: ${userId}`);

    const usersCollection = db.collection('users');
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          householdId: householdId,
          householdCodeId: codeId,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`   ✅ 绑定成功`);
      return { success: true };
    } else {
      console.log(`   ⚠️  用户不存在或未修改`);
      return { success: true, notModified: true };
    }

  } catch (error) {
    console.error(`   ❌ 绑定失败:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 主函数
 */
async function bindHouseholdsToTestUsers() {
  console.log('🚀 开始为测试账号绑定家庭ID...\n');

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

    // 逐个处理用户
    for (const user of testUsers) {
      // 1. 创建家庭
      const householdResult = await createHousehold(db, user);

      if (!householdResult.success && !householdResult.exists) {
        results.push({
          username: user.username,
          success: false,
          error: householdResult.error
        });
        continue;
      }

      const householdId = householdResult.householdId;
      const codeId = householdResult.codeId;

      // 2. 如果是新创建的家庭，绑定到用户
      if (!householdResult.exists) {
        const bindResult = await bindHouseholdToUser(
          db,
          user.userId,
          householdId,
          codeId
        );

        results.push({
          username: user.username,
          name: user.name,
          householdId: householdId,
          codeId: codeId,
          success: bindResult.success
        });

        if (bindResult.success) {
          successCount++;
        }
      } else {
        // 家庭已存在
        results.push({
          username: user.username,
          name: user.name,
          householdId: householdId,
          codeId: codeId,
          success: true,
          exists: true
        });
        successCount++;
      }

      console.log(''); // 空行分隔
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 绑定完成: ${successCount}/${testUsers.length} 个账号`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 绑定结果汇总:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';

      console.log(`${index + 1}. ${status} ${result.name} (${result.username})`);
      console.log(`   家庭ID: ${result.householdId}`);
      console.log(`   户码: ${result.codeId}`);

      if (result.exists) {
        console.log(`   状态: 家庭已存在`);
      } else if (!result.success) {
        console.log(`   状态: ${result.error || '绑定失败'}`);
      } else {
        console.log(`   状态: 绑定成功`);
      }
      console.log('');
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 保存结果
    const fs = require('fs');
    const resultPath = './test-household-binding-results.json';
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
bindHouseholdsToTestUsers();
