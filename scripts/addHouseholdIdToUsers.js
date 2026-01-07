/**
 * 简化版：直接为用户添加householdId字段
 * 跳过Household模型验证，直接在users集合中添加字段
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const testUsers = [
  {
    username: 'cengfangguo',
    name: '岑方国',
    userId: '695e825d4769790a904c977e',
    householdId: new ObjectId('675f1234567890abcdef0001'),
    codeId: 'MBAC01H0001A'
  },
  {
    username: 'wangdingquan',
    name: '王定权',
    userId: '695e825e4769790a904c977f',
    householdId: new ObjectId('675f1234567890abcdef0002'),
    codeId: 'NYBC02H0002B'
  },
  {
    username: 'cengxiaoduo',
    name: '岑小多',
    userId: '695e825e4769790a904c9780',
    householdId: new ObjectId('675f1234567890abcdef0003'),
    codeId: 'ZYBC03H0003C'
  },
  {
    username: 'maoguangqing',
    name: '毛光情',
    userId: '695e825e4769790a904c9781',
    householdId: new ObjectId('675f1234567890abcdef0004'),
    codeId: 'LTBC04H0004D'
  }
];

async function addHouseholdIdToUsers() {
  console.log('🚀 开始为测试账号添加家庭ID...\n');

  let client;

  try {
    console.log('📡 连接数据库...');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';
    client = await MongoClient.connect(mongoUri);
    const db = client.db();
    console.log('✅ 数据库连接成功\n');

    const usersCollection = db.collection('users');
    const results = [];
    let successCount = 0;

    for (const user of testUsers) {
      console.log(`📝 处理: ${user.name} (${user.username})`);

      try {
        // 检查用户是否存在
        const existingUser = await usersCollection.findOne({
          _id: new ObjectId(user.userId)
        });

        if (!existingUser) {
          console.log(`   ⚠️  用户不存在\n`);
          results.push({
            username: user.username,
            name: user.name,
            success: false,
            error: '用户不存在'
          });
          continue;
        }

        // 检查是否已有householdId
        if (existingUser.householdId) {
          console.log(`   ℹ️  已有家庭ID: ${existingUser.householdId}\n`);
          results.push({
            username: user.username,
            name: user.name,
            householdId: existingUser.householdId,
            success: true,
            alreadyBound: true
          });
          successCount++;
          continue;
        }

        // 添加householdId和codeId
        const updateResult = await usersCollection.updateOne(
          { _id: new ObjectId(user.userId) },
          {
            $set: {
              householdId: user.householdId,
              householdCodeId: user.codeId,
              updatedAt: new Date()
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`   ✅ 添加成功`);
          console.log(`   家庭ID: ${user.householdId}`);
          console.log(`   户码: ${user.codeId}\n`);

          results.push({
            username: user.username,
            name: user.name,
            householdId: user.householdId,
            codeId: user.codeId,
            success: true
          });
          successCount++;
        } else {
          console.log(`   ⚠️  未修改\n`);
          results.push({
            username: user.username,
            name: user.name,
            success: false,
            error: '未修改'
          });
        }

      } catch (error) {
        console.error(`   ❌ 失败:`, error.message);
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
    console.log(`📊 完成: ${successCount}/${testUsers.length} 个账号`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 绑定结果汇总:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name} (${result.username})`);

      if (result.success) {
        console.log(`   家庭ID: ${result.householdId}`);
        console.log(`   户码: ${result.codeId || result.householdCodeId}`);
        console.log(`   状态: ${result.alreadyBound ? '已存在' : '添加成功'}`);
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

    // 显示登录信息
    console.log('\n📱 测试账号登录信息:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.filter(r => r.success).forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}`);
      console.log(`   用户名: ${result.username}`);
      console.log(`   密码: ${result.username === 'cengfangguo' ? 'Ceng@123456' : result.username === 'wangdingquan' ? 'Wang@123456' : result.username === 'cengxiaoduo' ? 'Ceng@123456' : 'Mao@123456'}`);
      console.log(`   家庭ID: ${result.householdId}`);
      console.log(`   户码: ${result.codeId || result.householdCodeId}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
  } finally {
    if (client) {
      await client.close();
    }
    console.log('\n👋 脚本执行完毕');
  }
}

addHouseholdIdToUsers();
