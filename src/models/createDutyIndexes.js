/**
 * 智能值班表系统索引创建脚本
 * 用于优化数据库查询性能
 */

const mongoose = require('mongoose');
const DutySchedule = require('./DutySchedule');
const DutyShift = require('./DutyShift');
const DutyPersonnel = require('./DutyPersonnel');

async function createIndexes() {
  try {
    console.log('开始创建智能值班表系统索引...');

    // DutySchedule 索引
    console.log('创建 DutySchedule 索引...');
    await DutySchedule.createIndexes();
    console.log('✓ DutySchedule 索引创建完成');

    // DutyShift 索引
    console.log('创建 DutyShift 索引...');
    await DutyShift.createIndexes();
    console.log('✓ DutyShift 索引创建完成');

    // DutyPersonnel 索引
    console.log('创建 DutyPersonnel 索引...');
    await DutyPersonnel.createIndexes();
    console.log('✓ DutyPersonnel 索引创建完成');

    // 创建复合查询优化索引
    console.log('创建复合查询优化索引...');

    // 值班表复合索引（用于快速查找某村庄某月的值班表）
    await DutySchedule.collection.createIndex(
      { villageId: 1, year: 1, month: 1 },
      { unique: true, name: 'idx_schedule_village_year_month' }
    );

    // 值班记录复合索引（用于快速查找某天的值班）
    await DutySchedule.collection.createIndex(
      { 'dutyRecords.date': 1, 'dutyRecords.shiftId': 1 },
      { name: 'idx_schedule_date_shift' }
    );

    // 班次查询复合索引
    await DutyShift.collection.createIndex(
      { villageId: 1, shiftType: 1, status: 1 },
      { name: 'idx_shift_village_type_status' }
    );

    // 人员查询复合索引
    await DutyPersonnel.collection.createIndex(
      { villageId: 1, status: 1, 'capabilities.availableShiftTypes': 1 },
      { name: 'idx_personnel_village_status_shifts' }
    );

    // 二维码查询索引
    await DutyPersonnel.collection.createIndex(
      { 'qrCode.content': 1, 'qrCode.expiresAt': 1 },
      { name: 'idx_personnel_qrcode_expiry' }
    );

    console.log('✓ 所有索引创建完成');

    // 显示所有索引
    const collections = ['dutyschedules', 'dutyshifts', 'dutypersonnels'];
    for (const collectionName of collections) {
      const db = mongoose.connection.db;
      const indexes = await db.collection(collectionName).listIndexes().toArray();
      console.log(`\n${collectionName} 集合的索引:`);
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }

  } catch (error) {
    console.error('创建索引时出错:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village')
    .then(async () => {
      console.log('已连接到数据库');
      await createIndexes();
      console.log('\n索引创建任务完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('数据库连接失败:', error);
      process.exit(1);
    });
}

module.exports = createIndexes;