/**
 * 为测试账号绑定家庭ID (简化版 - 使用Mongoose)
 */

require('dotenv').config();
const mongoose = require('mongoose');

// 加载所有模型
require('../src/models');
const Household = mongoose.model('Household');

// 测试账号映射
const testUsers = [
  {
    username: 'cengfangguo',
    name: '岑方国',
    phone: '13801234567',
    villageId: '695d2f0a1993c080b9fa520b',
    villageName: '么扒村',
    userId: '695e825d4769790a904c977e'
  },
  {
    username: 'wangdingquan',
    name: '王定权',
    phone: '13801234568',
    villageId: '695da4e954f6af867bebc416',
    villageName: '弄洋村',
    userId: '695e825e4769790a904c977f'
  },
  {
    username: 'cengxiaoduo',
    name: '岑小多',
    phone: '13801234569',
    villageId: '695da4e954f6af867bebc418',
    villageName: '者央村',
    userId: '695e825e4769790a904c9780'
  },
  {
    username: 'maoguangqing',
    name: '毛光情',
    phone: '13801234570',
    villageId: '695da4e954f6af867bebc417',
    villageName: '林桃村',
    userId: '695e825e4769790a904c9781'
  }
];

/**
 * 生成户码
 */
function generateHouseholdCode(index) {
  const codes = ['MBAC01H0001A', 'NYBC02H0002B', 'ZYBC03H0003C', 'LTBC04H0004D'];
  return codes[index % codes.length];
}

/**
 * 主函数
 */
async function bindHouseholdsToTestUsers() {
  console.log('🚀 开始为测试账号绑定家庭ID...\n');

  try {
    // 连接数据库
    console.log('📡 连接数据库...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功\n');

    const User = mongoose.model('User');
    const results = [];
    let successCount = 0;

    // 逐个处理用户
    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      console.log(`📝 处理: ${user.name} (${user.username})`);

      try {
        // 1. 查找用户
        const userData = await User.findById(user.userId);
        if (!userData) {
          console.log(`   ⚠️  用户不存在\n`);
          continue;
        }

        // 2. 检查是否已有家庭
        if (userData.householdId) {
          const existingHousehold = await Household.findById(userData.householdId);
          console.log(`   ℹ️  已绑定家庭: ${existingHousehold?.codeId || userData.householdId}\n`);
          results.push({
            username: user.username,
            name: user.name,
            householdId: userData.householdId,
            codeId: existingHousehold?.codeId,
            success: true,
            alreadyBound: true
          });
          successCount++;
          continue;
        }

        // 3. 创建家庭
        const codeId = generateHouseholdCode(i);
        console.log(`   📍 生成户码: ${codeId}`);

        const householdData = {
          codeId: codeId,
          villageId: user.villageId,
          householder: {
            userId: user.userId,
            name: user.name,
            idCard: `522633${1985 + i * 5}0101${String(i + 1).padStart(4, '0')}`,
            phone: user.phone,
            isPartyMember: false,
            occupation: '村民'
          },
          members: [
            {
              userId: user.userId,
              name: user.name,
              idCard: `522633${1985 + i * 5}0101${String(i + 1).padStart(4, '0')}`,
              relationship: '其他',
              phone: user.phone,
              gender: i % 2 === 0 ? '男' : '女',
              education: '初中',
              isActive: true
            }
          ],
          address: {
            province: '贵州省',
            city: '黔西南布依族苗族自治州',
            county: '贞丰县',
            township: '鲁贡镇',
            village: user.villageName,
            detailed: `${user.villageName}1组`
          },
          householdRegistration: {
            type: '农业户口',
            landArea: 5,
            houseArea: 120
          },
          privacySettings: {
            allowPublicView: false,
            allowNeighborView: true,
            allowRelativeView: true
          },
          demographics: {
            totalMembers: 1,
            workingAgeMembers: 1,
            elderlyMembers: 0,
            minorMembers: 0,
            disabledMembers: 0
          },
          status: 'active'
        };

        const household = await Household.create(householdData);
        console.log(`   ✅ 家庭创建成功: ${household._id}`);

        // 4. 绑定到用户
        userData.householdId = household._id;
        await userData.save();
        console.log(`   🔗 用户绑定成功\n`);

        results.push({
          username: user.username,
          name: user.name,
          householdId: household._id,
          codeId: codeId,
          success: true
        });
        successCount++;

      } catch (error) {
        console.error(`   ❌ 失败:`, error.message);
        console.log(`   详细信息:`, error.message?.substring(0, 100));
        console.log('');

        results.push({
          username: user.username,
          name: user.name,
          success: false,
          error: error.message
        });
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 绑定完成: ${successCount}/${testUsers.length} 个账号`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 绑定结果汇总:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name} (${result.username})`);
      if (result.success) {
        console.log(`   家庭ID: ${result.householdId}`);
        console.log(`   户码: ${result.codeId}`);
        if (result.alreadyBound) {
          console.log(`   状态: 已绑定`);
        } else {
          console.log(`   状态: 绑定成功`);
        }
      } else {
        console.log(`   错误: ${result.error}`);
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
    await mongoose.disconnect();
    console.log('\n👋 脚本执行完毕');
  }
}

// 执行
bindHouseholdsToTestUsers();
