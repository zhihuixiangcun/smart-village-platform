/**
 * 检查并修复用户role字段
 */
const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_village';

async function fixUserRoles() {
  try {
    console.log('========================================');
    console.log('🔧 检查并修复用户role字段');
    console.log('========================================\n');

    // 连接数据库
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功\n');

    // 查看所有用户
    const users = await User.find();
    console.log(`👥 找到 ${users.length} 个用户\n`);

    console.log('用户列表:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Status: ${user.status}`);
      console.log('');
    });

    // 修复没有role的用户
    console.log('🔄 修复role字段...');
    let fixedCount = 0;
    for (const user of users) {
      if (!user.role) {
        const result = await User.findByIdAndUpdate(user._id, {
          role: 'resident' // 默认设为村民
        });
        if (result) {
          console.log(`  ✅ ${user.username}: 设置 role = resident`);
          fixedCount++;
        }
      }
    }

    if (fixedCount === 0) {
      console.log('  ℹ️  所有用户都有role，无需修复\n');
    } else {
      console.log(`\n✅ 修复了 ${fixedCount} 个用户的role字段\n`);
    }

    // 确保admin用户有admin角色
    console.log('👑 检查admin用户...');
    const adminUser = await User.findOne({ username: 'admin' });
    if (adminUser) {
      console.log(`  找到admin用户，当前role: ${adminUser.role}`);

      if (adminUser.role !== 'admin') {
        await User.findByIdAndUpdate(adminUser._id, { role: 'admin' });
        console.log(`  ✅ 已更新admin用户的role为admin\n`);
      } else {
        console.log(`  ℹ️  admin用户的role已经是admin\n`);
      }
    } else {
      console.log('  ⚠️  未找到admin用户\n');
    }

    console.log('========================================');
    console.log('✅ 修复完成');
    console.log('========================================\n');

    return true;

  } catch (error) {
    console.error('❌ 修复失败:', error);
    return false;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭\n');
  }
}

// 执行修复
fixUserRoles().then(success => {
  if (success) {
    console.log('🎉 用户role字段修复成功！\n');
    console.log('💡 现在可以重新运行登录测试了\n');
    process.exit(0);
  } else {
    console.log('❌ 用户role字段修复失败\n');
    process.exit(1);
  }
});
