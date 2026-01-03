/**
 * Create Family Collection Indexes
 * 创建家庭集合索引
 *
 * 提高查询性能的数据库索引
 */

const mongoose = require('mongoose');
const Family = require('./Family');
const FamilyMember = require('./FamilyMember');

/**
 * 创建所有家庭相关索引
 */
async function createFamilyIndexes() {
  try {
    console.log('开始创建家庭管理相关索引...');

    // Family 索引已在模型定义中自动创建
    // 这里确保索引被创建
    await Family.createIndexes();
    console.log('✓ Family 索引创建成功');

    // FamilyMember 索引
    await FamilyMember.createIndexes();
    console.log('✓ FamilyMember 索引创建成功');

    // 创建复合索引以提高常用查询性能
    await Family.collection.createIndex(
      { villageId: 1, 'specialFlags.needsRegularVisit': 1, 'specialFlags.helpPriority': -1 },
      { name: 'village_visit_priority' }
    );
    console.log('✓ 创建 village_visit_priority 复合索引');

    await Family.collection.createIndex(
      { villageId: 1, familyTypes: 1, createdAt: -1 },
      { name: 'village_type_date' }
    );
    console.log('✓ 创建 village_type_date 复合索引');

    await FamilyMember.collection.createIndex(
      { familyId: 1, specialTags: 1, isDeleted: 1 },
      { name: 'family_tags_deleted' }
    );
    console.log('✓ 创建 family_tags_deleted 复合索引');

    // 文本索引用于全文搜索
    await Family.collection.createIndex(
      {
        'headOfHousehold.name': 'text',
        'address.detail': 'text',
        houseNumber: 'text'
      },
      { name: 'family_text_search' }
    );
    console.log('✓ 创建 family_text_search 文本索引');

    console.log('所有索引创建完成!');
    return true;
  } catch (error) {
    console.error('创建索引失败:', error);
    throw error;
  }
}

/**
 * 删除所有家庭相关索引
 */
async function dropFamilyIndexes() {
  try {
    console.log('开始删除家庭管理相关索引...');

    await Family.collection.dropIndexes();
    console.log('✓ Family 索引删除成功');

    await FamilyMember.collection.dropIndexes();
    console.log('✓ FamilyMember 索引删除成功');

    console.log('所有索引删除完成!');
    return true;
  } catch (error) {
    console.error('删除索引失败:', error);
    throw error;
  }
}

/**
 * 显示索引信息
 */
async function showIndexInfo() {
  try {
    console.log('\n=== Family 索引信息 ===');
    const familyIndexes = await Family.collection.getIndexes();
    console.log('Family 索引:', Object.keys(familyIndexes));

    console.log('\n=== FamilyMember 索引信息 ===');
    const memberIndexes = await FamilyMember.collection.getIndexes();
    console.log('FamilyMember 索引:', Object.keys(memberIndexes));

    return {
      family: familyIndexes,
      member: memberIndexes
    };
  } catch (error) {
    console.error('获取索引信息失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  require('dotenv').config();

  const args = process.argv.slice(2);
  const command = args[0] || 'create';

  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(async () => {
    console.log('✓ 数据库连接成功');

    try {
      switch (command) {
        case 'create':
          await createFamilyIndexes();
          break;
        case 'drop':
          await dropFamilyIndexes();
          break;
        case 'show':
          await showIndexInfo();
          break;
        default:
          console.log('用法: node createFamilyIndexes.js [create|drop|show]');
      }
    } catch (error) {
      console.error('执行失败:', error);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('数据库连接已关闭');
    }
  }).catch(error => {
    console.error('数据库连接失败:', error);
    process.exit(1);
  });
}

module.exports = {
  createFamilyIndexes,
  dropFamilyIndexes,
  showIndexInfo
};
