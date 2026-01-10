# 角色系统数据迁移指南

## 概述

本文档说明如何将原有账号迁移到新的角色系统，确保原有数据不丢失，新角色正常工作。

## 角色映射关系

### 原有角色 → 新角色

| 原有角色 | 新角色 | 说明 |
|---------|-------|------|
| resident | resident | 村民（保持不变）|
| village_head | village_official | 村书记 → 村干部 |
| village_director | village_official | 村主任 → 村干部 |
| deputy_director | village_official | 副主任 → 村干部 |
| accountant | village_official | 会计 → 村干部 |
| committee_member | village_official | 村委成员 → 村干部 |
| staff | village_official | 村工作人员 → 村干部 |
| volunteer | resident | 志愿者 → 村民（或根据实际情况调整）|
| village_admin | village_official | 村领导 → 村干部（或升级为乡镇干部）|
| system_admin | admin | 系统管理员 → 管理员 |

## 迁移步骤

### 1. 数据备份

在执行迁移前，务必备份数据库：

```bash
# MongoDB 数据备份
mongodump --db=smart-village --out=backup-$(date +%Y%m%d)

# 或使用 mongodump 导出特定集合
mongodump --db=smart-village --collection=users --out=backup-users-$(date +%Y%m%d)
mongodump --db=smart-village --collection=villageUsers --out=backup-village-users-$(date +%Y%m%d)
```

### 2. 创建迁移脚本

创建 `migrate-roles.js` 脚本：

```javascript
const mongoose = require('mongoose');
const User = require('./src/models/User');
const VillageUser = require('./src/models/VillageUser');

// 角色映射表
const roleMapping = {
  'village_head': 'village_official',
  'village_director': 'village_official',
  'deputy_director': 'village_official',
  'accountant': 'village_official',
  'committee_member': 'village_official',
  'staff': 'village_official',
  'volunteer': 'resident',
  'village_admin': 'village_official',
  'system_admin': 'admin'
};

async function migrateUserRoles() {
  try {
    console.log('开始迁移 User 表角色数据...');

    const users = await User.find({ role: { $ne: 'resident' } });
    console.log(`找到 ${users.length} 个需要迁移的用户`);

    let migratedCount = 0;

    for (const user of users) {
      const newRole = roleMapping[user.role];

      if (newRole) {
        user.role = newRole;
        await user.save();
        migratedCount++;
        console.log(`用户 ${user.username} 的角色已从 ${user.role} 更新为 ${newRole}`);
      }
    }

    console.log(`User 表迁移完成，共迁移 ${migratedCount} 个用户`);
  } catch (error) {
    console.error('User 表迁移失败:', error);
    throw error;
  }
}

async function migrateVillageUserRoles() {
  try {
    console.log('开始迁移 VillageUser 表角色数据...');

    const villageUsers = await VillageUser.find({
      role: { $nin: ['resident', 'village_official', 'township_official', 'purchaser', 'admin'] }
    });
    console.log(`找到 ${villageUsers.length} 个需要迁移的村委用户`);

    let migratedCount = 0;

    for (const villageUser of villageUsers) {
      const newRole = roleMapping[villageUser.role];

      if (newRole) {
        villageUser.role = newRole;
        await villageUser.save();
        migratedCount++;
        console.log(`用户 ${villageUser.name} 的角色已从 ${villageUser.role} 更新为 ${newRole}`);
      }
    }

    console.log(`VillageUser 表迁移完成，共迁移 ${migratedCount} 个用户`);
  } catch (error) {
    console.error('VillageUser 表迁移失败:', error);
    throw error;
  }
}

async function migrateAll() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('数据库连接成功');

    // 执行迁移
    await migrateUserRoles();
    await migrateVillageUserRoles();

    console.log('所有角色数据迁移完成！');

    // 关闭连接
    await mongoose.connection.close();
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

// 执行迁移
migrateAll();
```

### 3. 执行迁移

```bash
# 备份数据
npm run backup-db

# 执行迁移脚本
node scripts/migrate-roles.js

# 验证迁移结果
npm run verify-migration
```

### 4. 验证迁移结果

创建验证脚本 `verify-migration.js`：

```javascript
const mongoose = require('mongoose');
const User = require('./src/models/User');
const VillageUser = require('./src/models/VillageUser');

async function verifyMigration() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('验证 User 表...');
    const userRoles = await User.distinct('role');
    console.log('User 表中的角色:', userRoles);

    console.log('\n验证 VillageUser 表...');
    const villageUserRoles = await VillageUser.distinct('role');
    console.log('VillageUser 表中的角色:', villageUserRoles);

    // 检查是否有无效角色
    const validRoles = ['resident', 'village_official', 'township_official', 'purchaser', 'admin'];
    const invalidUserRoles = userRoles.filter(role => !validRoles.includes(role));
    const invalidVillageUserRoles = villageUserRoles.filter(role => !validRoles.includes(role));

    if (invalidUserRoles.length > 0) {
      console.warn('⚠️ User 表中发现无效角色:', invalidUserRoles);
    } else {
      console.log('✅ User 表角色验证通过');
    }

    if (invalidVillageUserRoles.length > 0) {
      console.warn('⚠️ VillageUser 表中发现无效角色:', invalidVillageUserRoles);
    } else {
      console.log('✅ VillageUser 表角色验证通过');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  }
}

verifyMigration();
```

## 特殊情况处理

### 1. 村领导升级为乡镇干部

如果原有的 `village_admin` 需要升级为 `township_official`：

```javascript
// 查询所有村领导
const villageAdmins = await VillageUser.find({ role: 'village_admin' });

// 手动确认哪些需要升级
for (const admin of villageAdmins) {
  // 这里需要管理员手动判断
  if (admin.level === 'township' || admin.committeeLevel === 'township') {
    admin.role = 'township_official';
    await admin.save();
  }
}
```

### 2. 志愿者处理

志愿者可以：
- 保持为村民（resident）
- 如果已经成为村委成员，升级为村干部（village_official）

### 3. 村委成员职务保留

迁移后，原来的职务信息可以保留在 `position` 字段中：

```javascript
// 迁移时保留职务信息
if (roleMapping[user.role]) {
  user.role = roleMapping[user.role];

  // 保留原职务信息
  if (!user.position) {
    user.position = {
      village_head: '村书记',
      village_director: '村主任',
      deputy_director: '副主任',
      accountant: '会计',
      committee_member: '村委成员'
    }[user.role];
  }

  await user.save();
}
```

## 回滚方案

如果迁移出现问题，可以回滚：

```bash
# 恢复备份
mongorestore --db=smart-village backup-20240109

# 或恢复特定集合
mongorestore --db=smart-village --collection=users backup-users-20240109/users.bson
mongorestore --db=smart-village --collection=villageUsers backup-village-users-20240109/villageUsers.bson
```

## 迁移后检查清单

- [ ] 所有用户都能正常登录
- [ ] 角色权限正确
- [ ] 村民可以访问村民功能
- [ ] 村干部可以访问管理功能
- [ ] 乡镇干部可以访问多村管理
- [ ] 采购商可以访问采购功能
- [ ] 管理员可以访问系统管理
- [ ] 原有数据完整性检查
- [ ] 功能模块访问正常
- [ ] 权限控制正确

## 常见问题

### Q: 迁移后用户登录失败怎么办？
A: 检查用户密码是否正确，确认角色是否正确设置。

### Q: 原有用户的工号需要更新吗？
A: 系统会自动更新工号格式，包含角色代码。

### Q: 迁移后用户的统计数据会丢失吗？
A: 不会，所有统计数据都会保留。

### Q: 可以部分迁移吗？
A: 可以，可以按角色分批迁移，降低风险。

## 技术支持

如有问题请联系：
- 技术支持：support@smartvillage.com
- 系统管理员：admin@smartvillage.com

## 注意事项

1. **备份优先**: 务必在执行迁移前完整备份数据库
2. **测试环境**: 建议先在测试环境执行迁移，验证无误后再在生产环境执行
3. **分批迁移**: 如果用户量大，可以分批迁移，降低风险
4. **监控日志**: 迁移过程中密切关注系统日志，及时发现问题
5. **用户通知**: 迁移前通知用户可能出现的服务中断
6. **验证完整**: 迁移完成后务必进行全面的功能测试

---

**更新时间**: 2024-01-09
**版本**: v2.1
