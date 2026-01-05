/**
 * 创建测试采购商账号脚本
 * 运行: node scripts/create-test-purchaser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 连接MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village';

// 简单的用户模型
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  role: { type: String, default: 'purchaser' },
  status: { type: String, default: 'active' },
  profile: {
    phone: String,
    name: String
  },
  createdAt: { type: Date, default: Date.now }
});

// 密码哈希方法（使用bcrypt，与User模型一致）
userSchema.methods.setPassword = async function(password) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(password, salt);
};

const User = mongoose.model('User', userSchema);

async function createTestPurchaser() {
  try {
    console.log('连接MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB连接成功');

    // 测试账号数据
    const testPurchasers = [
      {
        username: '13800138000',
        phone: '13800138000',
        name: '测试采购商',
        password: '123456'
      },
      {
        username: '13900139000',
        phone: '13900139000',
        name: '张三采购',
        password: 'password'
      },
      {
        username: '13700137000',
        phone: '13700137000',
        name: '李四采购',
        password: '888888'
      }
    ];

    for (const purchaser of testPurchasers) {
      // 检查是否已存在
      const existing = await User.findOne({
        $or: [
          { username: purchaser.username },
          { phone: purchaser.phone }
        ]
      });

      if (existing) {
        // 更新现有用户的密码（使用bcrypt）
        await existing.setPassword(purchaser.password);
        await existing.save();
        console.log(`✅ 更新成功: ${purchaser.username} / ${purchaser.password}`);
        continue;
      }

      // 创建新用户
      const user = new User({
        username: purchaser.username,
        phone: purchaser.phone,
        name: purchaser.name,
        role: 'purchaser',
        status: 'active',
        profile: {
          phone: purchaser.phone,
          name: purchaser.name
        }
      });

      await user.setPassword(purchaser.password);
      await user.save();

      console.log(`✅ 创建成功: ${purchaser.username} / ${purchaser.password}`);
    }

    console.log('\n====================');
    console.log('测试采购商账号列表:');
    console.log('====================');
    testPurchasers.forEach(p => {
      console.log(`📱 手机号: ${p.username}`);
      console.log(`🔑 密码: ${p.password}`);
      console.log(`👤 姓名: ${p.name}`);
      console.log('---');
    });

    await mongoose.disconnect();
    console.log('\n✅ 脚本执行完成');
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

createTestPurchaser();
