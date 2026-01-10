/**
 * 检查现有数据
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkExistingData() {
  const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');

  try {
    await client.connect();
    const dbName = process.env.MONGO_URI ? process.env.MONGO_URI.split('/').pop() : 'smart_village';
    const db = client.db(dbName);

    console.log('=== 用户数据 ===');
    const users = db.collection('users');
    const userCount = await users.countDocuments();
    console.log(`用户总数: ${userCount}\n`);

    const userSample = await users.find({}).limit(3).toArray();
    console.log('用户样例:');
    userSample.forEach(user => {
      console.log(`- ${user.username} (${user.profile?.name})`);
      console.log(`  ID: ${user._id}`);
      console.log(`  householdId: ${user.householdId || '未绑定'}`);
    });

    console.log('\n=== 检查特定用户 ===');
    const targetUser = await users.findOne({ username: 'cengxiaoduo' });
    if (targetUser) {
      console.log('✅ 用户 cengxiaoduo 存在:');
      console.log(`   ID: ${targetUser._id}`);
      console.log(`   用户名: ${targetUser.username}`);
      console.log(`   姓名: ${targetUser.profile?.name || '未知'}`);
      console.log(`   householdId: ${targetUser.householdId || '未绑定'}`);
    } else {
      console.log('❌ 用户 cengxiaoduo 不存在');
      console.log('\n所有用户列表:');
      const allUsers = await users.find({}).toArray();
      allUsers.forEach(u => {
        console.log(`- ${u.username} (${u.profile?.name}) - householdId: ${u.householdId || '未绑定'}`);
      });
    }

    console.log('\n=== 户码数据 ===');
    const households = db.collection('households');
    const householdCount = await households.countDocuments();
    console.log(`户码总数: ${householdCount}\n`);

    const householdSample = await households.find({}).limit(3).toArray();
    console.log('户码样例:');
    householdSample.forEach(household => {
      console.log(`- ${household.codeId}`);
      console.log(`  ID: ${household._id}`);
      console.log(`  户主: ${household.householder?.name}`);
      console.log(`  地址: ${household.address}`);
    });

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await client.close();
  }
}

checkExistingData();
