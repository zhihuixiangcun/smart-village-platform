/**
 * 检查测试用户状态
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkTestUsers() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('smart-village');
    const users = db.collection('users');

    const testUsernames = ['wangdingquan', 'cengxiaoduo', 'cenfangguo', 'maoguangqing'];
    console.log('检查测试用户是否存在:\n');

    for (const username of testUsernames) {
      const user = await users.findOne({ username });
      if (user) {
        console.log(`✅ ${username}: 存在`);
        console.log(`   ID: ${user._id}`);
        console.log(`   姓名: ${user.profile?.name || '未知'}`);
        console.log(`   householdId: ${user.householdId || '未绑定'}`);
      } else {
        console.log(`❌ ${username}: 不存在`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await client.close();
  }
}

checkTestUsers();
