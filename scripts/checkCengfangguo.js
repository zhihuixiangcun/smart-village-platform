/**
 * 检查用户 cengfangguo 的数据
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkUser() {
  const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');

  try {
    await client.connect();
    const dbName = process.env.MONGO_URI ? process.env.MONGO_URI.split('/').pop() : 'smart_village';
    const db = client.db(dbName);

    console.log('=== 检查用户 cengfangguo ===\n');

    const users = db.collection('users');
    const user = await users.findOne({ username: 'cengfangguo' });

    if (user) {
      console.log('✅ 用户存在:');
      console.log(`   ID: ${user._id}`);
      console.log(`   用户名: ${user.username}`);
      console.log(`   姓名: ${user.profile?.name || '未知'}`);
      console.log(`   householdId: ${user.householdId || '未绑定'}`);
      console.log(`   村庄ID: ${user.villageId || '未设置'}`);

      // 如果有 householdId，查询对应的户码信息
      if (user.householdId) {
        console.log('\n=== 查询对应的户码信息 ===');
        const households = db.collection('households');
        const household = await households.findOne({ _id: user.householdId });

        if (household) {
          console.log('✅ 找到对应的户码:');
          console.log(`   户码编号: ${household.codeId}`);
          console.log(`   户主: ${household.householder?.name}`);
          console.log(`   地址: ${household.address}`);
          console.log(`   成员数: ${household.memberCount}`);
        } else {
          console.log('❌ 未找到对应的户码信息');
        }
      } else {
        console.log('\n❌ 用户未绑定户码，需要绑定');
      }
    } else {
      console.log('❌ 用户 cengfangguo 不存在');
    }

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await client.close();
  }
}

checkUser();
