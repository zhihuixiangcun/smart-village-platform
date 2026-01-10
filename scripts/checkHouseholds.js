/**
 * 检查户码数据
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkHouseholds() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('smart-village');
    const households = db.collection('households');

    console.log('检查户码数据:\n');

    const householdCodes = ['NYBC02H0002B', 'MBAC01H0001A', 'ZYBC03H0003C', 'LTBC04H0004D'];

    for (const codeId of householdCodes) {
      const household = await households.findOne({ codeId });
      if (household) {
        console.log(`✅ ${codeId}: 存在`);
        console.log(`   ID: ${household._id}`);
        console.log(`   户主: ${household.householder?.name || '未知'}`);
        console.log(`   地址: ${household.address || '未知'}`);
        console.log(`   村庄ID: ${household.villageId}`);
      } else {
        console.log(`❌ ${codeId}: 不存在`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await client.close();
  }
}

checkHouseholds();
