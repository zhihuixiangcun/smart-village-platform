/**
 * 创建测试用户 - 直接使用Mongodb native
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village';

async function createTestUsers() {
  let client;
  try {
    console.log('正在连接数据库...');
    client = await mongoose.connect(MONGO_URI);
    console.log('数据库连接成功');

    const db = client.connection.db;
    const usersCollection = db.collection('users');

    // 删除现有测试用户
    await usersCollection.deleteMany({
      username: { $in: ['testadmin', 'testcadre', 'testresident'] }
    });
    console.log('已清理旧测试用户');

    // 创建测试用户
    const now = new Date();
    const testUsers = [
      {
        username: 'testadmin',
        email: 'testadmin@example.com',
        password: await bcrypt.hash('Admin123456!', 10),
        role: 'admin',
        status: 'active',
        profile: {
          firstName: '测试',
          lastName: '管理员',
          phone: '13800000001'
        },
        permissions: ['*'],
        voiceSettings: { enabled: true, dialect: 'mandarin' },
        notificationPreferences: {
          email: true, sms: false, push: true, voice: true,
          categories: { announcements: true, financial: true, emergency: true, duties: true }
        },
        offlineSettings: { enabled: true, pendingSync: false },
        securitySettings: {
          twoFactorEnabled: false,
          loginNotifications: true,
          sensitiveOperationVerification: 'password'
        },
        faceSettings: { enabled: false, faceVerified: false },
        createdAt: now,
        updatedAt: now,
        loginCount: 0
      },
      {
        username: 'testcadre',
        email: 'testcadre@example.com',
        password: await bcrypt.hash('Cadre123456!', 10),
        role: 'village_admin',
        status: 'active',
        profile: {
          firstName: '测试',
          lastName: '村委',
          phone: '13800000002'
        },
        permissions: ['village:manage', 'committee:access', 'residents:view', 'announcements:create'],
        committeeProfile: {
          isOnDuty: true,
          committeeLevel: 'village'
        },
        voiceSettings: { enabled: true, dialect: 'mandarin' },
        notificationPreferences: {
          email: true, sms: false, push: true, voice: true,
          categories: { announcements: true, financial: true, emergency: true, duties: true }
        },
        offlineSettings: { enabled: true, pendingSync: false },
        securitySettings: {
          twoFactorEnabled: false,
          loginNotifications: true,
          sensitiveOperationVerification: 'password'
        },
        faceSettings: { enabled: false, faceVerified: false },
        createdAt: now,
        updatedAt: now,
        loginCount: 0
      },
      {
        username: 'testresident',
        email: 'testresident@example.com',
        password: await bcrypt.hash('Resident123456!', 10),
        role: 'resident',
        status: 'active',
        profile: {
          firstName: '测试',
          lastName: '村民',
          phone: '13800000003'
        },
        permissions: ['resident:access'],
        voiceSettings: { enabled: true, dialect: 'mandarin' },
        notificationPreferences: {
          email: true, sms: false, push: true, voice: true,
          categories: { announcements: true, financial: true, emergency: true, duties: true }
        },
        offlineSettings: { enabled: true, pendingSync: false },
        securitySettings: {
          twoFactorEnabled: false,
          loginNotifications: true,
          sensitiveOperationVerification: 'password'
        },
        faceSettings: { enabled: false, faceVerified: false },
        createdAt: now,
        updatedAt: now,
        loginCount: 0
      }
    ];

    const result = await usersCollection.insertMany(testUsers);
    console.log(`✓ 成功创建 ${result.insertedCount} 个测试用户`);

    console.log('\n========================================');
    console.log('测试账号创建成功！');
    console.log('========================================');
    console.log('管理员登录:');
    console.log('  用户名: testadmin');
    console.log('  密码: Admin123456!');
    console.log('  角色: admin');
    console.log('----------------------------------------');
    console.log('村干部登录:');
    console.log('  用户名: testcadre');
    console.log('  密码: Cadre123456!');
    console.log('  角色: village_admin (前端显示为 cadre)');
    console.log('----------------------------------------');
    console.log('村民登录:');
    console.log('  用户名: testresident');
    console.log('  密码: Resident123456!');
    console.log('  角色: resident');
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
