/**
 * 智能值班表系统初始化数据脚本
 * 创建示例数据用于测试和演示
 */

const mongoose = require('mongoose');
const DutySchedule = require('./DutySchedule');
const DutyShift = require('./DutyShift');
const DutyPersonnel = require('./DutyPersonnel');
const Village = require('./Village');
const User = require('./User');

async function initializeDutyData() {
  try {
    console.log('开始初始化智能值班表系统数据...');

    // 查找第一个村庄作为示例
    const village = await Village.findOne();
    if (!village) {
      throw new Error('请先创建村庄数据');
    }
    console.log(`使用村庄: ${village.name}`);

    // 1. 创建示例班次配置
    console.log('\n创建班次配置...');
    const shifts = await createSampleShifts(village._id);

    // 2. 创建示例值班人员
    console.log('\n创建值班人员...');
    const personnel = await createSamplePersonnel(village._id);

    // 3. 创建当前月份的值班表
    console.log('\n创建值班表...');
    const now = new Date();
    const schedule = await createSampleSchedule(village._id, now.getFullYear(), now.getMonth() + 1, shifts, personnel);

    console.log('\n✓ 初始化完成！');
    console.log(`- 创建了 ${shifts.length} 个班次配置`);
    console.log(`- 创建了 ${personnel.length} 个值班人员`);
    console.log(`- 创建了值班表: ${schedule.scheduleId}`);

    return {
      shifts,
      personnel,
      schedule
    };

  } catch (error) {
    console.error('初始化数据时出错:', error);
    throw error;
  }
}

// 创建示例班次配置
async function createSampleShifts(villageId) {
  const shiftData = [
    {
      name: '早班',
      code: 'MORNING',
      shiftType: 'morning',
      startTime: '08:00',
      endTime: '16:00',
      duration: 480, // 8小时
      isOvernight: false,
      minPersonnel: 2,
      maxPersonnel: 4,
      priority: 1,
      weight: 1.0,
      description: '日常工作班次，负责接待、咨询和一般事务处理',
      villageId: villageId
    },
    {
      name: '午班',
      code: 'AFTERNOON',
      shiftType: 'afternoon',
      startTime: '16:00',
      endTime: '24:00',
      duration: 480,
      isOvernight: false,
      minPersonnel: 1,
      maxPersonnel: 2,
      priority: 2,
      weight: 0.8,
      description: '下午到晚上班次，负责晚间值班和应急响应',
      villageId: villageId
    },
    {
      name: '晚班',
      code: 'NIGHT',
      shiftType: 'night',
      startTime: '00:00',
      endTime: '08:00',
      duration: 480,
      isOvernight: true,
      minPersonnel: 1,
      maxPersonnel: 2,
      priority: 3,
      weight: 1.2,
      description: '夜间值班班次，负责夜间安全和紧急事件处理',
      requirements: {
        skills: ['应急处理', '夜间巡逻'],
        physicalRequirements: ['good_health']
      },
      villageId: villageId
    },
    {
      name: '应急班',
      code: 'EMERGENCY',
      shiftType: 'emergency',
      startTime: '00:00',
      endTime: '23:59',
      duration: 1440, // 24小时待命
      isOvernight: false,
      minPersonnel: 1,
      maxPersonnel: 3,
      priority: 10,
      weight: 2.0,
      description: '应急响应班次，随时准备处理突发事件',
      requirements: {
        skills: ['急救', '消防知识', '应急处理'],
        physicalRequirements: ['good_health', 'special_training']
      },
      villageId: villageId
    }
  ];

  // 删除已存在的班次
  await DutyShift.deleteMany({ villageId });

  const shifts = await DutyShift.create(shiftData);
  console.log(`  ✓ 创建了 ${shifts.length} 个班次配置`);

  return shifts;
}

// 创建示例值班人员
async function createSamplePersonnel(villageId) {
  // 查找或创建示例用户
  let users = await User.find({ role: 'village_admin' }).limit(5);
  if (users.length < 5) {
    // 如果用户不足，创建示例用户
    const sampleUsers = [
      {
        username: 'zhangsan',
        email: 'zhangsan@village.com',
        password: '123456',
        role: 'village_admin',
        profile: {
          firstName: '张',
          lastName: '三',
          phone: '13800138001'
        },
        villageId: villageId
      },
      {
        username: 'lisi',
        email: 'lisi@village.com',
        password: '123456',
        role: 'village_admin',
        profile: {
          firstName: '李',
          lastName: '四',
          phone: '13800138002'
        },
        villageId: villageId
      },
      {
        username: 'wangwu',
        email: 'wangwu@village.com',
        password: '123456',
        role: 'user',
        profile: {
          firstName: '王',
          lastName: '五',
          phone: '13800138003'
        },
        villageId: villageId
      }
    ];

    users = await User.create(sampleUsers);
  }

  const personnelData = users.map((user, index) => ({
    personnelId: user._id,
    name: user.profile.firstName + user.profile.lastName,
    phone: user.profile.phone,
    email: user.email,
    position: index === 0 ? '村主任' : index === 1 ? '副主任' : '工作人员',
    department: index === 0 ? '村委会' : '综合办公室',
    employeeId: `V${String(index + 1).padStart(4, '0')}`,
    villageId: villageId,
    capabilities: {
      availableShiftTypes: index === 0 ? ['morning', 'afternoon', 'night', 'emergency'] :
                              index === 1 ? ['morning', 'afternoon', 'emergency'] :
                              ['morning', 'afternoon'],
      skills: index === 0 ? ['行政管理', '应急指挥', '群众工作'] :
             index === 1 ? ['财务管理', '文书处理'] :
             ['日常接待', '信息录入'],
      languages: ['zh-CN'],
      specialAbilities: index === 0 ? ['村级事务管理'] : []
    },
    preferences: {
      preferredShifts: index === 0 ? ['morning'] : ['afternoon'],
      preferredDays: [1, 2, 3, 4, 5], // 工作日
      maxDutyDaysPerMonth: 22,
      maxConsecutiveDays: 5
    },
    emergencyContact: {
      name: index === 0 ? '张三配偶' : index === 1 ? '李四父母' : '王五配偶',
      relationship: index === 0 ? '配偶' : '父母',
      phone: `1390013900${index + 1}`
    }
  }));

  // 删除已存在的人员
  await DutyPersonnel.deleteMany({ villageId });

  const personnel = await DutyPersonnel.create(personnelData);
  console.log(`  ✓ 创建了 ${personnel.length} 个值班人员`);

  return personnel;
}

// 创建示例值班表
async function createSampleSchedule(villageId, year, month, shifts, personnel) {
  // 生成唯一的排班编号
  const scheduleId = `SCH-${year}-${String(month).padStart(2, '0')}-${villageId.toString().slice(-6).toUpperCase()}`;

  // 删除已存在的值班表
  await DutySchedule.deleteOne({ scheduleId });

  const schedule = new DutySchedule({
    scheduleId,
    year,
    month,
    villageId,
    status: 'published',
    createdBy: personnel[0].personnelId, // 使用第一个人员的创建者ID
    publishedBy: personnel[0].personnelId,
    publishedAt: new Date(),
    schedulingRules: {
      algorithm: 'balanced',
      fairnessWeight: 0.7,
      maxConsecutiveDays: 5,
      minRestDays: 1
    },
    backupPersonnel: [
      {
        personnelId: personnel[2]._id,
        priority: 1
      }
    ]
  });

  // 生成前7天的排班作为示例
  const daysInMonth = 7; // 只生成前7天作为示例
  const shiftIndex = { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 3 }; // 简单的轮班方案

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();

    // 工作日安排正常班次，周末可能安排不同的班次
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // 周一到周五
      // 早班
      schedule.dutyRecords.push({
        date,
        shiftId: shifts[0]._id, // 早班
        personnelId: personnel[day % 3]._id,
        status: 'scheduled'
      });

      // 午班
      if (day % 2 === 0) { // 隔天安排午班
        schedule.dutyRecords.push({
          date,
          shiftId: shifts[1]._id, // 午班
          personnelId: personnel[(day + 1) % 3]._id,
          status: 'scheduled'
        });
      }
    } else { // 周末
      // 安排晚班
      schedule.dutyRecords.push({
        date,
        shiftId: shifts[2]._id, // 晚班
        personnelId: personnel[0]._id,
        status: 'scheduled'
      });
    }
  }

  // 更新统计信息
  schedule.statistics.totalScheduledDays = schedule.dutyRecords.length;

  await schedule.save();
  console.log(`  ✓ 创建了值班表 ${scheduleId}，包含 ${schedule.dutyRecords.length} 条值班记录`);

  return schedule;
}

// 如果直接运行此脚本
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village')
    .then(async () => {
      console.log('已连接到数据库');
      await initializeDutyData();
      console.log('\n初始化完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('数据库连接失败:', error);
      process.exit(1);
    });
}

module.exports = initializeDutyData;