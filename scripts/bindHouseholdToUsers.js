/**
 * 为测试用户绑定户码数据
 * 解决用户点击"我的二维码"后无法显示的问题
 */

require('dotenv').config();
const mongoose = require('mongoose');

// 检查模型文件是否存在
let Household, User;
try {
  Household = mongoose.model('Household');
  User = mongoose.model('User');
  console.log('✅ 模型已加载');
} catch (error) {
  // 如果模型不存在，尝试从文件加载
  try {
    Household = require('../src/models/Household');
    User = require('../src/models/User');
    console.log('✅ 从文件加载模型');
  } catch (err) {
    console.log('⚠️  模型文件不存在，将使用动态创建的模型');
    // 创建简单的 Schema
    const householdSchema = new mongoose.Schema({
      codeId: String,
      villageId: String,
      householder: {
        name: String,
        userId: mongoose.Schema.Types.ObjectId
      },
      address: String,
      memberCount: Number,
      status: String
    }, { collection: 'households' });

    const userSchema = new mongoose.Schema({
      username: String,
      password: String,
      profile: {
        name: String,
        phone: String,
        role: String
      },
      villageId: String,
      householdId: mongoose.Schema.Types.ObjectId,
      isActive: Boolean
    }, { collection: 'users' });

    Household = mongoose.model('Household', householdSchema);
    User = mongoose.model('User', userSchema);
  }
}

const testUsersData = [
  {
    username: 'wangdingquan',
    password: '$2b$10$abcdef1234567890', // 需要使用真实的bcrypt哈希
    name: '王定权',
    phone: '13801234568',
    role: 'resident',
    villageId: '695da4e954f6af867bebc416', // 弄洋村
    householdCodeId: 'NYBC02H0002B'
  },
  {
    username: 'cenfangguo',
    password: '$2b$10$abcdef1234567890',
    name: '岑方国',
    phone: '13801234566',
    role: 'resident',
    villageId: '695da4e954f6af867bebc413', // 么扒村
    householdCodeId: 'MBAC01H0001A'
  },
  {
    username: 'cenxiaoduo',
    password: '$2b$10$abcdef1234567890',
    name: '岑小多',
    phone: '13801234567',
    role: 'resident',
    villageId: '695da4e954f6af867bebc419', // 者央村
    householdCodeId: 'ZYBC03H0003C'
  },
  {
    username: 'maoguangqing',
    password: '$2b$10$abcdef1234567890',
    name: '毛光情',
    phone: '13801234569',
    role: 'resident',
    villageId: '695da4e954f6af867bebc422', // 林桃村
    householdCodeId: 'LTBC04H0004D'
  }
];

async function bindHouseholdToUsers() {
  try {
    console.log('🚀 开始为测试用户绑定户码数据...\n');

    // 连接数据库
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village');
    console.log('✅ 数据库连接成功\n');

    let successCount = 0;
    let failCount = 0;

    for (const userData of testUsersData) {
      try {
        console.log(`\n处理用户: ${userData.name} (${userData.username})`);

        // 1. 查找户码
        const household = await Household.findOne({ codeId: userData.householdCodeId });

        if (!household) {
          console.log(`⚠️  户码 ${userData.householdCodeId} 不存在，跳过`);
          failCount++;
          continue;
        }

        console.log(`  ✅ 找到户码: ${household.codeId}`);

        // 2. 查找或创建用户
        let user = await User.findOne({ username: userData.username });

        if (user) {
          console.log(`  ✅ 用户已存在: ${user.username}`);
        } else {
          // 创建新用户（使用简单的密码哈希）
          const bcrypt = require('bcrypt');
          const hashedPassword = await bcrypt.hash('123456', 10);

          user = new User({
            username: userData.username,
            password: hashedPassword,
            profile: {
              name: userData.name,
              phone: userData.phone,
              role: userData.role
            },
            villageId: userData.villageId,
            isActive: true
          });

          await user.save();
          console.log(`  ✅ 创建新用户: ${user.username} (密码: 123456)`);
        }

        // 3. 更新用户的 householdId
        user.householdId = household._id;
        await user.save();

        console.log(`  ✅ 成功绑定户码: ${household.codeId}`);
        console.log(`  📋 用户ID: ${user._id}`);
        console.log(`  🏠 户码ID: ${household._id}`);

        successCount++;

      } catch (error) {
        console.error(`  ❌ 处理失败:`, error.message);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 绑定结果统计:');
    console.log(`  ✅ 成功: ${successCount} 个`);
    console.log(`  ❌ 失败: ${failCount} 个`);
    console.log('='.repeat(50));

    // 显示所有用户及其 householdId
    console.log('\n📋 所有测试用户列表:');
    const allUsers = await User.find({
      username: { $in: testUsersData.map(u => u.username) }
    });

    for (const user of allUsers) {
      const household = await Household.findById(user.householdId);
      console.log(`\n  👤 ${user.profile?.name || user.username}`);
      console.log(`     用户ID: ${user._id}`);
      console.log(`     用户名: ${user.username}`);
      console.log(`     密码: 123456`);
      console.log(`     户码ID: ${user.householdId || '未绑定'}`);
      console.log(`     户码编号: ${household?.codeId || '未找到'}`);
    }

  } catch (error) {
    console.error('\n❌ 脚本执行失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 数据库连接已关闭');
  }
}

// 运行脚本
bindHouseholdToUsers();
