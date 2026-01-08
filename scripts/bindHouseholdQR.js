/**
 * 为现有测试用户绑定户码数据
 * 创建一户一码信息，用于测试"我的二维码"功能
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Household = require('../src/models/Household');

// 村庄ID映射
const VILLAGE_MAP = {
  '么扒村': '695d2f0a1993c080b9fa520b',
  '弄洋村': '695da4e954f6af867bebc416',
  '林桃村': '695da4e954f6af867bebc417',
  '者央村': '695da4e954f6af867bebc418'
};

// 测试用户的户码数据
const householdData = [
  {
    username: 'cengfangguo',
    householder: {
      name: '岑方国',
      idCard: '522325198001011234',
      phone: '13801234567',
      isPartyMember: true,
      occupation: '村民'
    },
    address: '贵州省贞丰县鲁贡镇么扒村1组',
    memberCount: 4,
    members: [
      { name: '岑小多', idCard: '522325201001011235', relationship: 'parent_child', phone: '13801234569' },
      { name: '李秀英', idCard: '522325197505121236', relationship: 'spouse', phone: '13801234571' },
      { name: '岑小明', idCard: '522325201505151237', relationship: 'parent_child', phone: '' }
    ]
  },
  {
    username: 'wangdingquan',
    householder: {
      name: '王定权',
      idCard: '522325197802021234',
      phone: '13801234568',
      isPartyMember: false,
      occupation: '农民'
    },
    address: '贵州省贞丰县鲁贡镇弄洋村2组',
    memberCount: 3,
    members: [
      { name: '王小花', idCard: '522325201002021235', relationship: 'parent_child', phone: '13801234572' },
      { name: '张丽', idCard: '522325198008081236', relationship: 'spouse', phone: '13801234573' }
    ]
  },
  {
    username: 'cengxiaoduo',
    householder: {
      name: '岑小多',
      idCard: '522325201001011235',
      phone: '13801234569',
      isPartyMember: false,
      occupation: '学生'
    },
    address: '贵州省贞丰县鲁贡镇者央村3组',
    memberCount: 2,
    members: [
      { name: '岑方国', idCard: '522325198001011234', relationship: 'parent_child', phone: '13801234567' }
    ]
  },
  {
    username: 'maoguangqing',
    householder: {
      name: '毛光情',
      idCard: '522325198503031234',
      phone: '13801234570',
      isPartyMember: true,
      occupation: '村干部'
    },
    address: '贵州省贞丰县鲁贡镇林桃村4组',
    memberCount: 5,
    members: [
      { name: '毛大明', idCard: '522325201003031235', relationship: 'parent_child', phone: '13801234574' },
      { name: '毛小红', idCard: '522325201206061236', relationship: 'parent_child', phone: '' },
      { name: '刘芳', idCard: '522325198707071237', relationship: 'spouse', phone: '13801234575' },
      { name: '毛老三', idCard: '522325195109091238', relationship: 'parent_child', phone: '13801234576' }
    ]
  }
];

/**
 * 生成户码ID
 * 格式: 6位大写字母+数字 + H + 4位数字 + 1位大写字母
 * 例如: ABC123H0001X
 */
function generateCodeId(villageName) {
  const villageCode = villageName.substring(0, 2).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const checkChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));

  return `${villageCode}${randomPart}H${sequence}${checkChar}`;
}

/**
 * 创建或更新户码数据
 */
async function createHouseholdQR(data) {
  try {
    console.log(`\n📝 正在处理: ${data.householder.name} (${data.username})`);

    // 查找用户
    const user = await User.findOne({ username: data.username });
    if (!user) {
      console.log(`   ⚠️  用户不存在: ${data.username}`);
      return { success: false, error: '用户不存在' };
    }

    console.log(`   👤 用户ID: ${user._id}`);

    // 获取村庄ID
    const villageId = user.villageId || VILLAGE_MAP[user.profile?.address?.split('镇')[1]?.split('村')[0] + '村'];
    if (!villageId) {
      console.log(`   ⚠️  无法确定村庄ID`);
      return { success: false, error: '无法确定村庄ID' };
    }

    console.log(`   📍 村庄ID: ${villageId}`);

    // 检查是否已存在户码
    let household = await Household.findOne({ 'householder.userId': user._id });

    if (household) {
      console.log(`   ✅ 户码已存在: ${household.codeId}`);
      return {
        success: true,
        exists: true,
        codeId: household.codeId,
        message: '户码已存在'
      };
    }

    // 生成唯一的户码ID
    let codeId;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      codeId = generateCodeId(user.profile?.address || '默认村庄');
      const existing = await Household.findOne({ codeId });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return { success: false, error: '无法生成唯一户码ID' };
    }

    console.log(`   🆔 户码ID: ${codeId}`);

    // 创建户码数据
    household = new Household({
      codeId: codeId,
      villageId: villageId,
      householder: {
        userId: user._id,
        name: data.householder.name,
        idCard: data.householder.idCard,
        phone: data.householder.phone,
        isPartyMember: data.householder.isPartyMember,
        occupation: data.householder.occupation
      },
      address: data.address,
      memberCount: data.memberCount,
      members: data.members.map(member => ({
        userId: null, // 暂时不关联用户ID
        name: member.name,
        idCard: member.idCard,
        relationship: member.relationship,
        phone: member.phone,
        isPartyMember: false
      })),
      // 家庭类型标签
      householdType: {
        isLowIncome: false,
        isOnlyChild: false,
        isOldAgeSupport: false,
        isFiveGuarantee: false
      },
      // 联系方式
      contact: {
        phone: data.householder.phone,
        emergencyContact: data.members[0]?.name || '',
        emergencyPhone: data.members[0]?.phone || ''
      },
      // 状态
      status: 'active',
      qrCodeUrl: `/api/qrcode/${codeId}`,
      lastUpdated: new Date(),
      changeHistory: [{
        action: 'create',
        timestamp: new Date(),
        operator: user._id,
        details: '创建户码'
      }]
    });

    await household.save();
    console.log(`   ✅ 户码创建成功!`);
    console.log(`   📊 家庭成员数: ${data.memberCount}`);
    console.log(`   🏠 地址: ${data.address}`);

    return {
      success: true,
      codeId: codeId,
      householdId: household._id,
      data: household
    };

  } catch (error) {
    console.error(`   ❌ 创建失败:`, error.message);

    if (error.code === 11000) {
      return { success: false, error: '户码ID重复' };
    }

    return { success: false, error: error.message };
  }
}

/**
 * 主函数
 */
async function bindHouseholdQRCodes() {
  console.log('🚀 开始为测试用户绑定户码...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 连接数据库
    console.log('📡 连接数据库...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功\n');

    const results = [];
    let successCount = 0;
    let existsCount = 0;

    // 逐个处理
    for (const data of householdData) {
      const result = await createHouseholdQR(data);
      results.push({
        username: data.username,
        name: data.householder.name,
        result: result
      });

      if (result.success) {
        if (result.exists) {
          existsCount++;
        } else {
          successCount++;
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 绑定完成统计:');
    console.log(`   ✅ 新创建: ${successCount} 个户码`);
    console.log(`   ℹ️  已存在: ${existsCount} 个户码`);
    console.log(`   ❌ 失败: ${householdData.length - successCount - existsCount} 个`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 户码信息汇总:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    results.forEach((item, index) => {
      const status = item.result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${item.name} (${item.username})`);

      if (item.result.success) {
        console.log(`   户码: ${item.result.codeId}`);
        console.log(`   状态: ${item.result.exists ? '已存在' : '新创建'}`);
      } else {
        console.log(`   错误: ${item.result.error}`);
      }
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 保存结果
    const fs = require('fs');
    const resultPath = './test-household-qr-results.json';
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
    console.log(`💾 结果已保存到: ${resultPath}\n`);

    console.log('🎉 户码绑定完成！');
    console.log('\n💡 提示:');
    console.log('   1. 现在可以使用测试账号登录');
    console.log('   2. 进入"村务公开"页面');
    console.log('   3. 点击"我的二维码"查看户码信息');
    console.log('   4. 或直接访问: http://localhost:3007/qrcode\n');

  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 脚本执行完毕\n');
  }
}

// 执行
bindHouseholdQRCodes();
