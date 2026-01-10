/**
 * 创建测试用户 - 符合MongoDB JSON Schema验证
 * 需要的字段: username, email, phone, villageId
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village';

async function createTestUsers() {
  let client;
  try {
    console.log('正在连接数据库...');
    client = await mongoose.connect(MONGO_URI);
    console.log('数据库连接成功');

    const db = client.connection.db;
    const usersCollection = db.collection('users');
    const villagesCollection = db.collection('villages');

    // 获取或创建默认村庄
    let village = await villagesCollection.findOne({ name: '测试村' });
    if (!village) {
      // code格式: ^[A-Z0-9]{6}V[0-9]{3}[A-Z]$ 例如: TEST001V01A
      const villageResult = await villagesCollection.insertOne({
        name: '测试村',
        code: 'TEST01V001A',
        address: '测试地址',
        province: '测试省',
        city: '测试市',
        district: '测试区',
        location: {
          type: 'Point',
          coordinates: [120.0, 30.0] // 经度, 纬度
        },
        population: 1000,
        households: 300,
        area: 10.5,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      village = { _id: villageResult.insertedId };
      console.log('✓ 创建默认村庄');
    }

    const villageId = village._id;

    // 删除现有测试用户
    await usersCollection.deleteMany({
      username: { $in: ['testadmin', 'testcadre', 'testofficial', 'testresident'] }
    });
    console.log('已清理旧测试用户');

    // 创建测试用户 - 符合JSON Schema要求
    const now = new Date();
    const testUsers = [
      {
        // 必填字段
        username: 'testadmin',
        email: 'testadmin@example.com',
        phone: '13800000001',
        villageId: villageId,

        // 其他字段
        password: await bcrypt.hash('Admin123456!', 10),
        role: 'admin',
        profile: {
          firstName: '测试',
          lastName: '管理员',
          phone: '13800000001'
        },
        status: 'active',
        account: 'active',

        // 符合Schema的roles数组
        roles: [{
          type: 'system_admin',
          villageId: villageId,
          permissions: ['*'],
          assignedAt: now
        }],

        permissions: ['*'],
        loginCount: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        // 村干部
        username: 'testcadre',
        email: 'testcadre@example.com',
        phone: '13800000002',
        villageId: villageId,

        password: await bcrypt.hash('Cadre123456!', 10),
        role: 'village_admin',
        profile: {
          firstName: '测试',
          lastName: '村委',
          phone: '13800000002'
        },
        status: 'active',
        account: 'active',

        roles: [{
          type: 'village_admin',
          villageId: villageId,
          permissions: ['village:manage', 'committee:access'],
          assignedAt: now
        }],

        permissions: ['village:manage', 'committee:access', 'residents:view'],
        committeeProfile: {
          isOnDuty: true,
          committeeLevel: 'village'
        },
        loginCount: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        // 乡镇官员
        username: 'testofficial',
        email: 'testofficial@example.com',
        phone: '13800000003',
        villageId: villageId,

        password: await bcrypt.hash('Official123456!', 10),
        role: 'village_official',
        profile: {
          firstName: '测试',
          lastName: '乡镇官员',
          phone: '13800000003'
        },
        status: 'active',
        account: 'active',

        roles: [{
          type: 'system_admin',
          villageId: villageId,
          permissions: ['township:manage', 'villages:supervise'],
          assignedAt: now
        }],

        permissions: ['township:manage', 'villages:supervise', 'committees:view'],
        loginCount: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        // 村民
        username: 'testresident',
        email: 'testresident@example.com',
        phone: '13800000004',
        villageId: villageId,

        password: await bcrypt.hash('Resident123456!', 10),
        role: 'resident',
        profile: {
          firstName: '测试',
          lastName: '村民',
          phone: '13800000004'
        },
        status: 'active',
        account: 'active',

        roles: [{
          type: 'villager',
          villageId: villageId,
          permissions: ['resident:access'],
          assignedAt: now
        }],

        permissions: ['resident:access'],
        loginCount: 0,
        createdAt: now,
        updatedAt: now
      }
    ];

    const result = await usersCollection.insertMany(testUsers);
    console.log(`✓ 成功创建 ${result.insertedCount} 个测试用户`);

    console.log('\n========================================');
    console.log('测试账号创建成功！');
    console.log('========================================');
    console.log('1. 管理员登录:');
    console.log('   用户名: testadmin');
    console.log('   密码: Admin123456!');
    console.log('   角色: admin');
    console.log('----------------------------------------');
    console.log('2. 村干部登录:');
    console.log('   用户名: testcadre');
    console.log('   密码: Cadre123456!');
    console.log('   角色: village_admin (前端显示为 cadre)');
    console.log('----------------------------------------');
    console.log('3. 乡镇官员登录:');
    console.log('   用户名: testofficial');
    console.log('   密码: Official123456!');
    console.log('   角色: village_official (前端显示为 official)');
    console.log('----------------------------------------');
    console.log('4. 村民登录:');
    console.log('   用户名: testresident');
    console.log('   密码: Resident123456!');
    console.log('   角色: resident');
    console.log('========================================');

  } catch (error) {
    console.error('创建测试用户失败:', error.message);
    if (error.errInfo) {
      console.error('验证错误详情:', JSON.stringify(error.errInfo, null, 2));
    }
  } finally {
    if (client) {
      await mongoose.connection.close();
      console.log('\n数据库连接已关闭');
    }
  }
}

createTestUsers();
