/**
 * 创建管理员账号脚本
 * 运行此脚本来创建系统默认管理员账号
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 连接MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';

// 用户Schema（简化版）
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'village_admin', 'user'], default: 'user' },
  profile: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    avatar: { type: String, default: '' }
  },
  village: {
    id: { type: String, default: 'default' },
    name: { type: String, default: '默认村庄' }
  },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    console.log('🔗 正在连接MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB连接成功');

    // 检查是否已存在管理员账号
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  管理员账号已存在：', existingAdmin.username);
      console.log('💡 如需重置，请先删除现有管理员账号');
      await mongoose.disconnect();
      return;
    }

    // 创建管理员账号
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = new User({
      username: 'admin',
      email: 'admin@smartvillage.com',
      password: hashedPassword,
      role: 'admin',
      profile: {
        name: '系统管理员',
        phone: '13800138000'
      },
      village: {
        id: 'admin',
        name: '系统管理'
      },
      status: 'active'
    });

    await admin.save();
    console.log('✅ 管理员账号创建成功！');
    console.log('\n📋 登录信息：');
    console.log('用户名：admin');
    console.log('邮箱：admin@smartvillage.com');
    console.log('密码：admin123');
    console.log('角色：系统管理员');
    console.log('\n🌐 请访问 http://localhost:3000 进行登录');

    // 创建一个示例村民账号
    const userPassword = await bcrypt.hash('user123', 10);
    const sampleUser = new User({
      username: 'villager01',
      email: 'villager01@smartvillage.com',
      password: userPassword,
      role: 'user',
      profile: {
        name: '张三',
        phone: '13900139000'
      },
      village: {
        id: 'village001',
        name: '智慧示范村'
      },
      status: 'active'
    });

    await sampleUser.save();
    console.log('\n✅ 示例村民账号创建成功！');
    console.log('\n📋 示例村民登录信息：');
    console.log('用户名：villager01');
    console.log('邮箱：villager01@smartvillage.com');
    console.log('密码：user123');
    console.log('角色：普通村民');

  } catch (error) {
    console.error('❌ 创建管理员账号失败：', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 已断开MongoDB连接');
    process.exit(0);
  }
}

// 运行脚本
createAdmin();