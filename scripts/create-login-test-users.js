/**
 * 创建登录测试用户 - 与前端登录页面显示的测试账号一致
 * testadmin / Test123456! / admin
 * testcadre / Cadre123456! / village_admin
 * testresident / Resident123456! / resident
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village';

// 简单的 User Schema（仅用于创建用户）
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, default: 'active' },
  profile: {
    firstName: String,
    lastName: String,
    phone: String
  }
}, { collection: 'users', timestamps: true });

const User = mongoose.model('User', userSchema);

async function createLoginTestUsers() {
  try {
    console.log('正在连接数据库...');
    await mongoose.connect(MONGO_URI);
    console.log('数据库连接成功');

    // 删除现有测试用户
    const existingUsers = await User.find({
      username: { $in: ['testadmin', 'testcadre', 'testresident'] }
    });

    if (existingUsers.length > 0) {
      const ids = existingUsers.map(u => u._id);
      await User.deleteMany({ _id: { $in: ids } });
      console.log('已清理旧测试用户');
    }

    // 创建测试用户（密码未加密，实际使用应该用bcrypt）
    const testUsers = [
      {
        username: 'testadmin',
        email: 'testadmin@example.com',
        password: 'Test123456!',
        role: 'admin',
        status: 'active',
        profile: {
          firstName: '测试',
          lastName: '管理员',
          phone: '13800000001'
        }
      },
      {
        username: 'testcadre',
        email: 'testcadre@example.com',
        password: 'Cadre123456!',
        role: 'village_admin',
        status: 'active',
        profile: {
          firstName: '测试',
          lastName: '村委',
          phone: '13800000002'
        }
      },
      {
        username: 'testresident',
        email: 'testresident@example.com',
        password: 'Resident123456!',
        role: 'resident',
        status: 'active',
        profile: {
          firstName: '测试',
          lastName: '村民',
          phone: '13800000003'
        }
      }
    ];

    for (const userData of testUsers) {
      // Hash the password with bcrypt
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      userData.password = hashedPassword;

      const user = new User(userData);
      await user.save();
      console.log(`✓ 创建用户: ${userData.username} (${userData.role})`);
    }

    console.log('\n========================================');
    console.log('测试账号创建成功！');
    console.log('========================================');
    console.log('用户名: testadmin');
    console.log('密码: Test123456!');
    console.log('角色: admin');
    console.log('----------------------------------------');
    console.log('用户名: testcadre');
    console.log('密码: Cadre123456!');
    console.log('角色: village_admin (前端显示为 cadre)');
    console.log('----------------------------------------');
    console.log('用户名: testresident');
    console.log('密码: Resident123456!');
    console.log('角色: resident');
    console.log('========================================');

  } catch (error) {
    console.error('创建测试用户失败:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

createLoginTestUsers();
